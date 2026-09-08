use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

/// Maximum file size preserved as raw BLOB in trash snapshots (20 MB).
pub const MAX_TRASH_FILE_SIZE: usize = 20 * 1024 * 1024;
/// Maximum total size of all trash snapshots before auto-eviction triggers (500 MB).
pub const MAX_TOTAL_TRASH_QUOTA: i64 = 500 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashSnapshotItem {
    pub id: i64,
    pub repo_path: String,
    pub file_path: String,
    pub diff_preview: String,
    pub created_at: i64,
    pub head_commit_sha: Option<String>,
    pub file_size: usize,
    pub batch_id: Option<String>,
    pub is_oversized: bool,
}

#[derive(Debug, Clone)]
pub struct NewTrashSnapshot<'a> {
    pub file_path: &'a str,
    pub content: &'a [u8],
    pub diff_preview: &'a str,
    pub head_commit_sha: Option<&'a str>,
    pub batch_id: Option<&'a str>,
    pub is_oversized: bool,
}

pub struct TrashStore {
    conn: Mutex<Connection>,
}

impl TrashStore {
    pub fn new(db_path: &Path) -> AppResult<Self> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let conn = Self::open_with_integrity_check(db_path)?;

        // Configure optimal PRAGMAs for high-concurrency and resilience
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA busy_timeout = 5000;
             PRAGMA auto_vacuum = INCREMENTAL;",
        )
        .map_err(|e| AppError::Internal(format!("Failed to configure SQLite pragmas: {e}")))?;

        // Schema initialization with composite indexes and batch support
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS trash_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                repo_path TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_content BLOB NOT NULL,
                diff_preview TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                head_commit_sha TEXT,
                file_size INTEGER NOT NULL DEFAULT 0,
                batch_id TEXT,
                is_oversized INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_trash_repo ON trash_snapshots(repo_path);
            CREATE INDEX IF NOT EXISTS idx_trash_created ON trash_snapshots(created_at);
            CREATE INDEX IF NOT EXISTS idx_trash_repo_created ON trash_snapshots(repo_path, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_trash_batch ON trash_snapshots(batch_id);",
        )
        .map_err(|e| AppError::Internal(format!("Failed to init trash schema: {e}")))?;

        // Idempotent column migrations for backward compatibility
        let _ = conn.execute("ALTER TABLE trash_snapshots ADD COLUMN batch_id TEXT;", []);
        let _ = conn.execute("ALTER TABLE trash_snapshots ADD COLUMN is_oversized INTEGER NOT NULL DEFAULT 0;", []);

        let store = Self {
            conn: Mutex::new(conn),
        };

        // Auto evict older than 48 hours (48 * 3600 seconds)
        let _ = store.evict_expired(48 * 3600);

        Ok(store)
    }

    /// Open SQLite connection with PRAGMA quick_check; auto-recreates if corrupted.
    fn open_with_integrity_check(db_path: &Path) -> AppResult<Connection> {
        match Connection::open(db_path) {
            Ok(c) => {
                let is_ok = c
                    .query_row("PRAGMA quick_check;", [], |r| r.get::<_, String>(0))
                    .map(|res| res.to_lowercase() == "ok")
                    .unwrap_or(false);

                if !is_ok {
                    drop(c);
                    Self::backup_corrupted_db(db_path);
                    Connection::open(db_path)
                        .map_err(|e| AppError::Internal(format!("Failed to recreate database after corruption: {e}")))
                } else {
                    Ok(c)
                }
            }
            Err(_) => {
                Self::backup_corrupted_db(db_path);
                Connection::open(db_path)
                    .map_err(|e| AppError::Internal(format!("Failed to open SQLite database: {e}")))
            }
        }
    }

    fn backup_corrupted_db(db_path: &Path) {
        if db_path.exists() {
            let timestamp = Utc::now().timestamp();
            let corrupted_path = db_path.with_extension(format!("corrupt.{timestamp}"));
            let _ = std::fs::rename(db_path, corrupted_path);
        }
    }

    /// Mutex lock helper with poisoning recovery to prevent persistent app freeze
    fn get_conn(&self) -> MutexGuard<'_, Connection> {
        self.conn.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn default_store() -> AppResult<Self> {
        let mut path = dirs_or_local();
        path.push("flowgit");
        path.push("trash_cache.db");
        Self::new(&path)
    }

    pub fn save_snapshot(
        &self,
        repo_path: &str,
        file_path: &str,
        content: &[u8],
        diff_preview: &str,
        head_commit_sha: Option<&str>,
    ) -> AppResult<i64> {
        let snapshot = NewTrashSnapshot {
            file_path,
            content,
            diff_preview,
            head_commit_sha,
            batch_id: None,
            is_oversized: content.len() > MAX_TRASH_FILE_SIZE,
        };
        let ids = self.save_snapshots_batch(repo_path, &[snapshot])?;
        ids.into_iter()
            .next()
            .ok_or_else(|| AppError::Internal("Failed to get insert id".into()))
    }

    /// Save multiple snapshots atomically in a single SQLite transaction
    pub fn save_snapshots_batch(
        &self,
        repo_path: &str,
        snapshots: &[NewTrashSnapshot<'_>],
    ) -> AppResult<Vec<i64>> {
        if snapshots.is_empty() {
            return Ok(Vec::new());
        }

        let now = Utc::now().timestamp();
        let mut conn = self.get_conn();
        let normalized = normalize_repo_path(repo_path);

        let tx = conn
            .transaction()
            .map_err(|e| AppError::Internal(format!("Failed to begin SQLite transaction: {e}")))?;

        let mut inserted_ids = Vec::with_capacity(snapshots.len());
        {
            let mut stmt = tx
                .prepare(
                    "INSERT INTO trash_snapshots (
                        repo_path, file_path, file_content, diff_preview, created_at, head_commit_sha, file_size, batch_id, is_oversized
                    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                )
                .map_err(|e| AppError::Internal(e.to_string()))?;

            for item in snapshots {
                // Guard: if oversized, don't write large BLOB into SQLite
                let (store_content, size, oversized) = if item.content.len() > MAX_TRASH_FILE_SIZE || item.is_oversized {
                    (&[][..], item.content.len() as i64, 1)
                } else {
                    (item.content, item.content.len() as i64, 0)
                };

                stmt.execute(params![
                    normalized,
                    item.file_path,
                    store_content,
                    item.diff_preview,
                    now,
                    item.head_commit_sha,
                    size,
                    item.batch_id,
                    oversized,
                ])
                .map_err(|e| AppError::Internal(format!("Failed to insert trash snapshot: {e}")))?;

                inserted_ids.push(tx.last_insert_rowid());
            }
        }

        tx.commit()
            .map_err(|e| AppError::Internal(format!("Failed to commit trash batch: {e}")))?;

        Ok(inserted_ids)
    }

    pub fn list_snapshots(&self, repo_path: &str) -> AppResult<Vec<TrashSnapshotItem>> {
        let conn = self.get_conn();
        let normalized = normalize_repo_path(repo_path);

        // Evict expired entries first
        let cutoff = Utc::now().timestamp() - (48 * 3600);
        let _ = conn.execute("DELETE FROM trash_snapshots WHERE created_at < ?1", params![cutoff]);

        let mut stmt = conn
            .prepare(
                "SELECT id, repo_path, file_path, diff_preview, created_at, head_commit_sha, file_size, batch_id, is_oversized
                 FROM trash_snapshots
                 WHERE repo_path = ?1
                 ORDER BY created_at DESC
                 LIMIT 200",
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let rows = stmt
            .query_map(params![normalized], |row| {
                Ok(TrashSnapshotItem {
                    id: row.get(0)?,
                    repo_path: row.get(1)?,
                    file_path: row.get(2)?,
                    diff_preview: row.get(3)?,
                    created_at: row.get(4)?,
                    head_commit_sha: row.get(5)?,
                    file_size: row.get::<_, i64>(6)? as usize,
                    batch_id: row.get(7)?,
                    is_oversized: row.get::<_, i64>(8)? != 0,
                })
            })
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let mut items = Vec::new();
        for item in rows {
            if let Ok(it) = item {
                items.push(it);
            }
        }
        Ok(items)
    }

    pub fn get_snapshot_content(&self, id: i64) -> AppResult<(String, String, Vec<u8>)> {
        let conn = self.get_conn();

        let mut stmt = conn
            .prepare("SELECT repo_path, file_path, file_content, is_oversized FROM trash_snapshots WHERE id = ?1")
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let mut rows = stmt
            .query(params![id])
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if let Some(row) = rows.next().map_err(|e| AppError::Internal(e.to_string()))? {
            let repo_path: String = row.get(0).map_err(|e| AppError::Internal(e.to_string()))?;
            let file_path: String = row.get(1).map_err(|e| AppError::Internal(e.to_string()))?;
            let content: Vec<u8> = row.get(2).map_err(|e| AppError::Internal(e.to_string()))?;
            let is_oversized: bool = row.get::<_, i64>(3).map(|v| v != 0).unwrap_or(false);

            if is_oversized && content.is_empty() {
                return Err(AppError::Internal(format!(
                    "File '{file_path}' was larger than {MAX_TRASH_FILE_SIZE} bytes and its raw content was not retained in snapshot."
                )));
            }

            Ok((repo_path, file_path, content))
        } else {
            Err(AppError::NotFound(format!("Trash snapshot {id} not found")))
        }
    }

    pub fn get_batch_snapshots(&self, batch_id: &str) -> AppResult<Vec<TrashSnapshotItem>> {
        let conn = self.get_conn();

        let mut stmt = conn
            .prepare(
                "SELECT id, repo_path, file_path, diff_preview, created_at, head_commit_sha, file_size, batch_id, is_oversized
                 FROM trash_snapshots
                 WHERE batch_id = ?1
                 ORDER BY id ASC",
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let rows = stmt
            .query_map(params![batch_id], |row| {
                Ok(TrashSnapshotItem {
                    id: row.get(0)?,
                    repo_path: row.get(1)?,
                    file_path: row.get(2)?,
                    diff_preview: row.get(3)?,
                    created_at: row.get(4)?,
                    head_commit_sha: row.get(5)?,
                    file_size: row.get::<_, i64>(6)? as usize,
                    batch_id: row.get(7)?,
                    is_oversized: row.get::<_, i64>(8)? != 0,
                })
            })
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let mut items = Vec::new();
        for item in rows {
            if let Ok(it) = item {
                items.push(it);
            }
        }
        Ok(items)
    }

    pub fn delete_snapshot(&self, id: i64) -> AppResult<()> {
        let conn = self.get_conn();
        conn.execute("DELETE FROM trash_snapshots WHERE id = ?1", params![id])
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let _ = conn.execute_batch("PRAGMA wal_checkpoint(PASSIVE);");
        Ok(())
    }

    pub fn delete_batch_snapshots(&self, batch_id: &str) -> AppResult<usize> {
        let conn = self.get_conn();
        let count = conn
            .execute("DELETE FROM trash_snapshots WHERE batch_id = ?1", params![batch_id])
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let _ = conn.execute_batch("PRAGMA wal_checkpoint(PASSIVE);");
        Ok(count)
    }

    /// Evict expired entries and enforce quota limits, followed by WAL checkpoint and incremental vacuum
    pub fn evict_expired(&self, max_age_seconds: i64) -> AppResult<usize> {
        let cutoff = Utc::now().timestamp() - max_age_seconds;
        let conn = self.get_conn();

        let count = conn
            .execute("DELETE FROM trash_snapshots WHERE created_at < ?1", params![cutoff])
            .map_err(|e| AppError::Internal(e.to_string()))?;

        // Enforce total storage quota limit
        let total_size: i64 = conn
            .query_row("SELECT COALESCE(SUM(file_size), 0) FROM trash_snapshots", [], |r| r.get(0))
            .unwrap_or(0);

        if total_size > MAX_TOTAL_TRASH_QUOTA {
            // Delete oldest 100 entries if over total quota
            let _ = conn.execute(
                "DELETE FROM trash_snapshots WHERE id IN (
                    SELECT id FROM trash_snapshots ORDER BY created_at ASC LIMIT 100
                 )",
                [],
            );
        }

        // Periodic maintenance: truncate WAL log and vacuum free pages
        let _ = conn.execute_batch(
            "PRAGMA wal_checkpoint(TRUNCATE);
             PRAGMA incremental_vacuum;",
        );

        Ok(count)
    }
}

pub fn normalize_repo_path(path: &str) -> String {
    let mut s = path.replace('\\', "/");
    while s.ends_with('/') {
        s.pop();
    }
    if s.len() >= 2 && s.as_bytes()[1] == b':' {
        let first = s.chars().next().unwrap().to_lowercase().to_string();
        s = format!("{}{}", first, &s[1..]);
    }
    s
}

fn dirs_or_local() -> PathBuf {
    if let Some(cache_dir) = std::env::var_os("LOCALAPPDATA").map(PathBuf::from) {
        cache_dir
    } else if let Some(home) = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")).map(PathBuf::from) {
        home.join(".flowgit")
    } else {
        PathBuf::from("./.flowgit")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_trash_store_lifecycle() {
        let tmp_file = NamedTempFile::new().unwrap();
        let store = TrashStore::new(tmp_file.path()).unwrap();

        let repo = "f:/test/repo";
        let file = "src/main.rs";
        let content = b"fn main() { println!(\"hello\"); }";
        let diff = "+fn main() { println!(\"hello\"); }";

        let id = store.save_snapshot(repo, file, content, diff, Some("abc1234")).unwrap();
        assert!(id > 0);

        let list = store.list_snapshots(repo).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].file_path, file);
        assert_eq!(list[0].file_size, content.len());
        assert!(!list[0].is_oversized);

        let (r_repo, r_file, r_content) = store.get_snapshot_content(id).unwrap();
        assert_eq!(r_repo, repo);
        assert_eq!(r_file, file);
        assert_eq!(r_content, content);

        store.delete_snapshot(id).unwrap();
        let list_after = store.list_snapshots(repo).unwrap();
        assert_eq!(list_after.len(), 0);
    }

    #[test]
    fn test_trash_batch_save() {
        let tmp_file = NamedTempFile::new().unwrap();
        let store = TrashStore::new(tmp_file.path()).unwrap();

        let repo = "f:/test/repo";
        let snapshots = vec![
            NewTrashSnapshot {
                file_path: "file1.txt",
                content: b"content 1",
                diff_preview: "+file1",
                head_commit_sha: Some("sha1"),
                batch_id: Some("batch_test_1"),
                is_oversized: false,
            },
            NewTrashSnapshot {
                file_path: "file2.txt",
                content: b"content 2",
                diff_preview: "+file2",
                head_commit_sha: Some("sha1"),
                batch_id: Some("batch_test_1"),
                is_oversized: false,
            },
        ];

        let ids = store.save_snapshots_batch(repo, &snapshots).unwrap();
        assert_eq!(ids.len(), 2);

        let batch_items = store.get_batch_snapshots("batch_test_1").unwrap();
        assert_eq!(batch_items.len(), 2);

        store.delete_batch_snapshots("batch_test_1").unwrap();
        let batch_after = store.get_batch_snapshots("batch_test_1").unwrap();
        assert_eq!(batch_after.len(), 0);
    }
}
