use std::path::{Path, PathBuf};
use std::sync::Mutex;
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashSnapshotItem {
    pub id: i64,
    pub repo_path: String,
    pub file_path: String,
    pub diff_preview: String,
    pub created_at: i64,
    pub head_commit_sha: Option<String>,
    pub file_size: usize,
}

pub struct TrashStore {
    conn: Mutex<Connection>,
}

impl TrashStore {
    pub fn new(db_path: &Path) -> AppResult<Self> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let conn = Connection::open(db_path)
            .map_err(|e| AppError::Internal(format!("Failed to open SQLite database: {e}")))?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS trash_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                repo_path TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_content BLOB NOT NULL,
                diff_preview TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                head_commit_sha TEXT,
                file_size INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_trash_repo ON trash_snapshots(repo_path);
            CREATE INDEX IF NOT EXISTS idx_trash_created ON trash_snapshots(created_at);",
        )
        .map_err(|e| AppError::Internal(format!("Failed to init trash schema: {e}")))?;

        let store = Self {
            conn: Mutex::new(conn),
        };

        // Auto evict older than 48 hours (48 * 3600 seconds)
        let _ = store.evict_expired(48 * 3600);

        Ok(store)
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
        let now = Utc::now().timestamp();
        let conn = self.conn.lock().map_err(|_| AppError::Internal("DB lock poisoned".into()))?;

        conn.execute(
            "INSERT INTO trash_snapshots (repo_path, file_path, file_content, diff_preview, created_at, head_commit_sha, file_size)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                repo_path,
                file_path,
                content,
                diff_preview,
                now,
                head_commit_sha,
                content.len() as i64
            ],
        )
        .map_err(|e| AppError::Internal(format!("Failed to save trash snapshot: {e}")))?;

        Ok(conn.last_insert_rowid())
    }

    pub fn list_snapshots(&self, repo_path: &str) -> AppResult<Vec<TrashSnapshotItem>> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("DB lock poisoned".into()))?;

        // Evict expired entries first
        let cutoff = Utc::now().timestamp() - (48 * 3600);
        let _ = conn.execute("DELETE FROM trash_snapshots WHERE created_at < ?1", params![cutoff]);

        let mut stmt = conn
            .prepare(
                "SELECT id, repo_path, file_path, diff_preview, created_at, head_commit_sha, file_size
                 FROM trash_snapshots
                 WHERE repo_path = ?1
                 ORDER BY created_at DESC
                 LIMIT 200",
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let rows = stmt
            .query_map(params![repo_path], |row| {
                Ok(TrashSnapshotItem {
                    id: row.get(0)?,
                    repo_path: row.get(1)?,
                    file_path: row.get(2)?,
                    diff_preview: row.get(3)?,
                    created_at: row.get(4)?,
                    head_commit_sha: row.get(5)?,
                    file_size: row.get::<_, i64>(6)? as usize,
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
        let conn = self.conn.lock().map_err(|_| AppError::Internal("DB lock poisoned".into()))?;

        let mut stmt = conn
            .prepare("SELECT repo_path, file_path, file_content FROM trash_snapshots WHERE id = ?1")
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let mut rows = stmt
            .query(params![id])
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if let Some(row) = rows.next().map_err(|e| AppError::Internal(e.to_string()))? {
            let repo_path: String = row.get(0).map_err(|e| AppError::Internal(e.to_string()))?;
            let file_path: String = row.get(1).map_err(|e| AppError::Internal(e.to_string()))?;
            let content: Vec<u8> = row.get(2).map_err(|e| AppError::Internal(e.to_string()))?;
            Ok((repo_path, file_path, content))
        } else {
            Err(AppError::NotFound(format!("Trash snapshot {id} not found")))
        }
    }

    pub fn delete_snapshot(&self, id: i64) -> AppResult<()> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("DB lock poisoned".into()))?;
        conn.execute("DELETE FROM trash_snapshots WHERE id = ?1", params![id])
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(())
    }

    pub fn evict_expired(&self, max_age_seconds: i64) -> AppResult<usize> {
        let cutoff = Utc::now().timestamp() - max_age_seconds;
        let conn = self.conn.lock().map_err(|_| AppError::Internal("DB lock poisoned".into()))?;
        let count = conn
            .execute("DELETE FROM trash_snapshots WHERE created_at < ?1", params![cutoff])
            .map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(count)
    }
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

        let (r_repo, r_file, r_content) = store.get_snapshot_content(id).unwrap();
        assert_eq!(r_repo, repo);
        assert_eq!(r_file, file);
        assert_eq!(r_content, content);

        store.delete_snapshot(id).unwrap();
        let list_after = store.list_snapshots(repo).unwrap();
        assert_eq!(list_after.len(), 0);
    }
}
