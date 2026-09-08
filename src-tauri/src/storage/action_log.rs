use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use chrono::Utc;
use git2::{build::CheckoutBuilder, Oid, Repository};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionRecord {
    pub id: i64,
    pub repo_path: String,
    pub action_type: String, // "commit", "reset_hard", "rebase", "cherry_pick", "merge", "discard", "stash", "branch_delete"
    pub description: String,
    pub previous_head: String,
    pub new_head: String,
    pub branch_name: Option<String>,
    pub severity: String, // "safe", "moderate", "destructive"
    pub timestamp: i64,
    pub is_undone: bool,
}

pub struct ActionLogStore {
    conn: Mutex<Connection>,
}

impl ActionLogStore {
    pub fn new(db_path: &Path) -> AppResult<Self> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let conn = Self::open_with_integrity_check(db_path)?;

        // Configure optimal PRAGMAs for concurrency & resilience
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA busy_timeout = 5000;",
        )
        .map_err(|e| AppError::Internal(format!("Failed to configure action log pragmas: {e}")))?;

        // Schema initialization with composite indexes
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS action_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                repo_path TEXT NOT NULL,
                action_type TEXT NOT NULL,
                description TEXT NOT NULL,
                previous_head TEXT NOT NULL,
                new_head TEXT NOT NULL,
                branch_name TEXT,
                severity TEXT NOT NULL DEFAULT 'safe',
                timestamp INTEGER NOT NULL,
                is_undone INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_action_repo ON action_history(repo_path);
            CREATE INDEX IF NOT EXISTS idx_action_time ON action_history(timestamp);
            CREATE INDEX IF NOT EXISTS idx_action_repo_undone_id ON action_history(repo_path, is_undone, id DESC);",
        )
        .map_err(|e| AppError::Internal(format!("Failed to init action schema: {e}")))?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
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
        path.push("actions_history.db");
        Self::new(&path)
    }

    pub fn record_action(
        &self,
        repo_path: &str,
        action_type: &str,
        description: &str,
        previous_head: &str,
        new_head: &str,
        branch_name: Option<&str>,
        severity: &str,
    ) -> AppResult<i64> {
        let now = Utc::now().timestamp();
        let conn = self.get_conn();

        conn.execute(
            "INSERT INTO action_history (repo_path, action_type, description, previous_head, new_head, branch_name, severity, timestamp, is_undone)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0)",
            params![
                repo_path,
                action_type,
                description,
                previous_head,
                new_head,
                branch_name,
                severity,
                now
            ],
        )
        .map_err(|e| AppError::Internal(format!("Failed to record action: {e}")))?;

        let action_id = conn.last_insert_rowid();

        // Pin previous_head in Git to protect the commit from git gc / git prune
        if !previous_head.is_empty() && !previous_head.chars().all(|c| c == '0') {
            if let Ok(repo) = Repository::open(repo_path) {
                if let Ok(oid) = Oid::from_str(previous_head) {
                    let pin_ref = format!("refs/flowgit/pins/{action_id}");
                    let _ = repo.reference(&pin_ref, oid, true, "FlowGit Undo Protection Pin");
                }
            }
        }

        Ok(action_id)
    }

    pub fn list_actions(&self, repo_path: &str, limit: usize) -> AppResult<Vec<ActionRecord>> {
        let conn = self.get_conn();

        let mut stmt = conn
            .prepare(
                "SELECT id, repo_path, action_type, description, previous_head, new_head, branch_name, severity, timestamp, is_undone
                 FROM action_history
                 WHERE repo_path = ?1
                 ORDER BY id DESC
                 LIMIT ?2",
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let rows = stmt
            .query_map(params![repo_path, limit as i64], |row| {
                Ok(ActionRecord {
                    id: row.get(0)?,
                    repo_path: row.get(1)?,
                    action_type: row.get(2)?,
                    description: row.get(3)?,
                    previous_head: row.get(4)?,
                    new_head: row.get(5)?,
                    branch_name: row.get(6)?,
                    severity: row.get(7)?,
                    timestamp: row.get(8)?,
                    is_undone: row.get::<_, i64>(9)? != 0,
                })
            })
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let mut list = Vec::new();
        for r in rows {
            if let Ok(rec) = r {
                list.push(rec);
            }
        }
        Ok(list)
    }

    pub fn undo_action(&self, repo: &Repository) -> AppResult<ActionRecord> {
        let repo_path = repo
            .workdir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| repo.path().to_string_lossy().to_string());

        let conn = self.get_conn();

        // Optimized query leveraging composite index (repo_path, is_undone, id DESC)
        let mut stmt = conn
            .prepare(
                "SELECT id, repo_path, action_type, description, previous_head, new_head, branch_name, severity, timestamp, is_undone
                 FROM action_history
                 WHERE repo_path = ?1 AND is_undone = 0
                 ORDER BY id DESC
                 LIMIT 1",
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let mut rows = stmt
            .query(params![repo_path])
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if let Some(row) = rows.next().map_err(|e| AppError::Internal(e.to_string()))? {
            let record = ActionRecord {
                id: row.get(0).map_err(|e| AppError::Internal(e.to_string()))?,
                repo_path: row.get(1).map_err(|e| AppError::Internal(e.to_string()))?,
                action_type: row.get(2).map_err(|e| AppError::Internal(e.to_string()))?,
                description: row.get(3).map_err(|e| AppError::Internal(e.to_string()))?,
                previous_head: row.get(4).map_err(|e| AppError::Internal(e.to_string()))?,
                new_head: row.get(5).map_err(|e| AppError::Internal(e.to_string()))?,
                branch_name: row.get(6).map_err(|e| AppError::Internal(e.to_string()))?,
                severity: row.get(7).map_err(|e| AppError::Internal(e.to_string()))?,
                timestamp: row.get(8).map_err(|e| AppError::Internal(e.to_string()))?,
                is_undone: true,
            };

            // Restore HEAD to previous_head
            restore_head_ref(repo, &record.previous_head, record.branch_name.as_deref())?;

            // Mark undone in SQLite
            conn.execute(
                "UPDATE action_history SET is_undone = 1 WHERE id = ?1",
                params![record.id],
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;

            // Clean up the GC protection pin reference for this undone action
            let pin_ref = format!("refs/flowgit/pins/{}", record.id);
            if let Ok(mut r) = repo.find_reference(&pin_ref) {
                let _ = r.delete();
            }

            Ok(record)
        } else {
            Err(AppError::Internal("No actions available to undo".into()))
        }
    }

    pub fn redo_action(&self, repo: &Repository) -> AppResult<ActionRecord> {
        let repo_path = repo
            .workdir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| repo.path().to_string_lossy().to_string());

        let conn = self.get_conn();

        // Find oldest action that is marked undone
        let mut stmt = conn
            .prepare(
                "SELECT id, repo_path, action_type, description, previous_head, new_head, branch_name, severity, timestamp, is_undone
                 FROM action_history
                 WHERE repo_path = ?1 AND is_undone = 1
                 ORDER BY id ASC
                 LIMIT 1",
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let mut rows = stmt
            .query(params![repo_path])
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if let Some(row) = rows.next().map_err(|e| AppError::Internal(e.to_string()))? {
            let record = ActionRecord {
                id: row.get(0).map_err(|e| AppError::Internal(e.to_string()))?,
                repo_path: row.get(1).map_err(|e| AppError::Internal(e.to_string()))?,
                action_type: row.get(2).map_err(|e| AppError::Internal(e.to_string()))?,
                description: row.get(3).map_err(|e| AppError::Internal(e.to_string()))?,
                previous_head: row.get(4).map_err(|e| AppError::Internal(e.to_string()))?,
                new_head: row.get(5).map_err(|e| AppError::Internal(e.to_string()))?,
                branch_name: row.get(6).map_err(|e| AppError::Internal(e.to_string()))?,
                severity: row.get(7).map_err(|e| AppError::Internal(e.to_string()))?,
                timestamp: row.get(8).map_err(|e| AppError::Internal(e.to_string()))?,
                is_undone: false,
            };

            // Restore HEAD to new_head
            restore_head_ref(repo, &record.new_head, record.branch_name.as_deref())?;

            // Mark not undone
            conn.execute(
                "UPDATE action_history SET is_undone = 0 WHERE id = ?1",
                params![record.id],
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;

            // Re-pin if previous head exists
            if !record.previous_head.is_empty() && !record.previous_head.chars().all(|c| c == '0') {
                if let Ok(oid) = Oid::from_str(&record.previous_head) {
                    let pin_ref = format!("refs/flowgit/pins/{}", record.id);
                    let _ = repo.reference(&pin_ref, oid, true, "FlowGit Undo Protection Pin");
                }
            }

            Ok(record)
        } else {
            Err(AppError::Internal("No actions available to redo".into()))
        }
    }

    pub fn time_travel_to(&self, repo: &Repository, action_id: i64) -> AppResult<ActionRecord> {
        let conn = self.get_conn();

        let mut stmt = conn
            .prepare(
                "SELECT id, repo_path, action_type, description, previous_head, new_head, branch_name, severity, timestamp, is_undone
                 FROM action_history
                 WHERE id = ?1",
            )
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let mut rows = stmt
            .query(params![action_id])
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if let Some(row) = rows.next().map_err(|e| AppError::Internal(e.to_string()))? {
            let record = ActionRecord {
                id: row.get(0).map_err(|e| AppError::Internal(e.to_string()))?,
                repo_path: row.get(1).map_err(|e| AppError::Internal(e.to_string()))?,
                action_type: row.get(2).map_err(|e| AppError::Internal(e.to_string()))?,
                description: row.get(3).map_err(|e| AppError::Internal(e.to_string()))?,
                previous_head: row.get(4).map_err(|e| AppError::Internal(e.to_string()))?,
                new_head: row.get(5).map_err(|e| AppError::Internal(e.to_string()))?,
                branch_name: row.get(6).map_err(|e| AppError::Internal(e.to_string()))?,
                severity: row.get(7).map_err(|e| AppError::Internal(e.to_string()))?,
                timestamp: row.get(8).map_err(|e| AppError::Internal(e.to_string()))?,
                is_undone: row.get::<_, i64>(9)? != 0,
            };

            restore_head_ref(repo, &record.previous_head, record.branch_name.as_deref())?;

            Ok(record)
        } else {
            Err(AppError::NotFound(format!("Action {action_id} not found")))
        }
    }
}

fn restore_head_ref(repo: &Repository, target_sha: &str, branch_name: Option<&str>) -> AppResult<()> {
    let oid = Oid::from_str(target_sha)
        .map_err(|e| AppError::Internal(format!("Invalid commit SHA {target_sha}: {e}")))?;

    // Attempt to locate commit; inform if object was pruned by git gc
    let commit = repo.find_commit(oid).map_err(|e| {
        AppError::NotFound(format!(
            "Commit {target_sha} không tồn tại hoặc đã bị Git Garbage Collection (gc) dọn sạch khỏi kho lưu trữ (lỗi: {e})"
        ))
    })?;

    // If on a specific branch, move the branch reference target
    if let Some(branch) = branch_name {
        let refname = format!("refs/heads/{branch}");
        if let Ok(mut reference) = repo.find_reference(&refname) {
            reference.set_target(oid, &format!("Time machine rollback to {target_sha}"))?;
            repo.set_head(&refname)?;
        } else {
            repo.set_head_detached(oid)?;
        }
    } else {
        repo.set_head_detached(oid)?;
    }

    // Reset working tree
    let mut builder = CheckoutBuilder::new();
    builder.force();
    repo.checkout_tree(commit.as_object(), Some(&mut builder))?;

    Ok(())
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
    fn test_action_log_lifecycle() {
        let tmp = NamedTempFile::new().unwrap();
        let store = ActionLogStore::new(tmp.path()).unwrap();

        let id = store
            .record_action(
                "f:/repo",
                "commit",
                "Created initial commit",
                "0000000000000000000000000000000000000000",
                "1111111111111111111111111111111111111111",
                Some("main"),
                "safe",
            )
            .unwrap();

        assert!(id > 0);
        let list = store.list_actions("f:/repo", 10).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].action_type, "commit");
        assert_eq!(list[0].severity, "safe");
        assert!(!list[0].is_undone);
    }
}
