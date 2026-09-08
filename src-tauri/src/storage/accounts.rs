use std::path::{Path, PathBuf};
use std::sync::Mutex;
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

use crate::git::identity::GitIdentity;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountProfile {
    pub id: String,
    pub username: String,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub provider: String, // "github" | "gitlab"
    pub token: String,
    pub auth_method: String, // "oauth" | "pat" | "ssh"
    pub is_active: bool,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoBinding {
    pub repo_path: String,
    pub project_type: String, // "work" | "personal" | "client" | "opensource" | "other"
    pub account_id: Option<String>,
    pub identity_id: Option<String>,
    pub updated_at: i64,
}

pub struct AccountStore {
    conn: Mutex<Connection>,
}

impl AccountStore {
    pub fn new(db_path: &Path) -> AppResult<Self> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let conn = Connection::open(db_path)
            .map_err(|e| AppError::Internal(format!("Failed to open accounts SQLite: {e}")))?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                name TEXT,
                avatar_url TEXT,
                provider TEXT NOT NULL,
                token TEXT NOT NULL,
                auth_method TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);
            CREATE TABLE IF NOT EXISTS git_identities (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                signing_key TEXT
            );
            CREATE TABLE IF NOT EXISTS repo_bindings (
                repo_path TEXT PRIMARY KEY,
                project_type TEXT NOT NULL,
                account_id TEXT,
                identity_id TEXT,
                updated_at INTEGER NOT NULL
            );",
        )
        .map_err(|e| AppError::Internal(format!("Failed to init accounts schema: {e}")))?;


        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn default_store() -> AppResult<Self> {
        let mut path = dirs_or_local();
        path.push("flowgit");
        path.push("accounts.db");
        Self::new(&path)
    }

    pub fn save_account(&self, profile: &AccountProfile) -> AppResult<()> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("Database mutex poisoned".into()))?;
        
        // Deactivate other accounts if setting this one active
        if profile.is_active {
            let _ = conn.execute("UPDATE accounts SET is_active = 0 WHERE provider = ?1", params![profile.provider]);
        }

        conn.execute(
            "INSERT OR REPLACE INTO accounts (id, username, name, avatar_url, provider, token, auth_method, is_active, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                profile.id,
                profile.username,
                profile.name,
                profile.avatar_url,
                profile.provider,
                profile.token,
                profile.auth_method,
                if profile.is_active { 1 } else { 0 },
                if profile.created_at == 0 { Utc::now().timestamp() } else { profile.created_at }
            ],
        )
        .map_err(|e| AppError::Internal(format!("Failed to save account: {e}")))?;

        Ok(())
    }

    pub fn get_active_account(&self, provider: Option<&str>) -> AppResult<Option<AccountProfile>> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("Database mutex poisoned".into()))?;
        
        let query = if provider.is_some() {
            "SELECT id, username, name, avatar_url, provider, token, auth_method, is_active, created_at
             FROM accounts WHERE is_active = 1 AND provider = ?1 LIMIT 1"
        } else {
            "SELECT id, username, name, avatar_url, provider, token, auth_method, is_active, created_at
             FROM accounts WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1"
        };

        let mut stmt = conn.prepare(query)
            .map_err(|e| AppError::Internal(format!("SQLite prepare error: {e}")))?;

        let mut rows = if let Some(p) = provider {
            stmt.query(params![p])
        } else {
            stmt.query(params![])
        }
        .map_err(|e| AppError::Internal(format!("SQLite query error: {e}")))?;

        if let Some(row) = rows.next().map_err(|e| AppError::Internal(format!("SQLite row error: {e}")))? {
            let is_active_int: i64 = row.get(7)?;
            Ok(Some(AccountProfile {
                id: row.get(0)?,
                username: row.get(1)?,
                name: row.get(2)?,
                avatar_url: row.get(3)?,
                provider: row.get(4)?,
                token: row.get(5)?,
                auth_method: row.get(6)?,
                is_active: is_active_int == 1,
                created_at: row.get(8)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn list_accounts(&self) -> AppResult<Vec<AccountProfile>> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("Database mutex poisoned".into()))?;
        let mut stmt = conn.prepare(
            "SELECT id, username, name, avatar_url, provider, token, auth_method, is_active, created_at
             FROM accounts ORDER BY created_at DESC"
        )
        .map_err(|e| AppError::Internal(format!("SQLite prepare error: {e}")))?;

        let account_iter = stmt.query_map([], |row| {
            let is_active_int: i64 = row.get(7)?;
            Ok(AccountProfile {
                id: row.get(0)?,
                username: row.get(1)?,
                name: row.get(2)?,
                avatar_url: row.get(3)?,
                provider: row.get(4)?,
                token: row.get(5)?,
                auth_method: row.get(6)?,
                is_active: is_active_int == 1,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("SQLite query error: {e}")))?;

        let mut accounts = Vec::new();
        for acc in account_iter {
            if let Ok(a) = acc {
                accounts.push(a);
            }
        }
        Ok(accounts)
    }

    pub fn delete_account(&self, id: &str) -> AppResult<()> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("Database mutex poisoned".into()))?;
        conn.execute("DELETE FROM accounts WHERE id = ?1", params![id])
            .map_err(|e| AppError::Internal(format!("Failed to delete account: {e}")))?;
        Ok(())
    }

    pub fn list_identities(&self) -> AppResult<Vec<GitIdentity>> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("Database mutex poisoned".into()))?;
        let mut stmt = conn
            .prepare("SELECT id, label, name, email, signing_key FROM git_identities ORDER BY label ASC")
            .map_err(|e| AppError::Internal(format!("SQLite prepare error: {e}")))?;

        let iter = stmt
            .query_map([], |row| {
                Ok(GitIdentity {
                    id: row.get(0)?,
                    label: row.get(1)?,
                    name: row.get(2)?,
                    email: row.get(3)?,
                    signing_key: row.get(4)?,
                })
            })
            .map_err(|e| AppError::Internal(format!("SQLite query error: {e}")))?;

        let mut list = Vec::new();
        for item in iter.flatten() {
            list.push(item);
        }
        Ok(list)
    }

    pub fn save_identity(&self, iden: GitIdentity) -> AppResult<()> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("Database mutex poisoned".into()))?;
        conn.execute(
            "INSERT INTO git_identities (id, label, name, email, signing_key)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET
                label = excluded.label,
                name = excluded.name,
                email = excluded.email,
                signing_key = excluded.signing_key",
            params![iden.id, iden.label, iden.name, iden.email, iden.signing_key],
        )
        .map_err(|e| AppError::Internal(format!("Failed to save identity: {e}")))?;
        Ok(())
    }

    pub fn delete_identity(&self, id: &str) -> AppResult<()> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("Database mutex poisoned".into()))?;
        conn.execute("DELETE FROM git_identities WHERE id = ?1", params![id])
            .map_err(|e| AppError::Internal(format!("Failed to delete identity: {e}")))?;
        Ok(())
    }

    pub fn get_account_by_id(&self, id: &str) -> AppResult<Option<AccountProfile>> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("Database mutex poisoned".into()))?;
        let mut stmt = conn.prepare(
            "SELECT id, username, name, avatar_url, provider, token, auth_method, is_active, created_at
             FROM accounts WHERE id = ?1 LIMIT 1"
        )
        .map_err(|e| AppError::Internal(format!("SQLite prepare error: {e}")))?;

        let mut rows = stmt.query(params![id])
            .map_err(|e| AppError::Internal(format!("SQLite query error: {e}")))?;

        if let Some(row) = rows.next().map_err(|e| AppError::Internal(format!("SQLite row error: {e}")))? {
            let is_active_int: i64 = row.get(7)?;
            Ok(Some(AccountProfile {
                id: row.get(0)?,
                username: row.get(1)?,
                name: row.get(2)?,
                avatar_url: row.get(3)?,
                provider: row.get(4)?,
                token: row.get(5)?,
                auth_method: row.get(6)?,
                is_active: is_active_int == 1,
                created_at: row.get(8)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_repo_binding(&self, repo_path: &str) -> AppResult<Option<RepoBinding>> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("Database mutex poisoned".into()))?;
        let mut stmt = conn.prepare(
            "SELECT repo_path, project_type, account_id, identity_id, updated_at
             FROM repo_bindings WHERE repo_path = ?1 LIMIT 1"
        )
        .map_err(|e| AppError::Internal(format!("SQLite prepare error: {e}")))?;

        let mut rows = stmt.query(params![repo_path])
            .map_err(|e| AppError::Internal(format!("SQLite query error: {e}")))?;

        if let Some(row) = rows.next().map_err(|e| AppError::Internal(format!("SQLite row error: {e}")))? {
            Ok(Some(RepoBinding {
                repo_path: row.get(0)?,
                project_type: row.get(1)?,
                account_id: row.get(2)?,
                identity_id: row.get(3)?,
                updated_at: row.get(4)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn save_repo_binding(&self, binding: &RepoBinding) -> AppResult<()> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("Database mutex poisoned".into()))?;
        conn.execute(
            "INSERT INTO repo_bindings (repo_path, project_type, account_id, identity_id, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(repo_path) DO UPDATE SET
                project_type = excluded.project_type,
                account_id = excluded.account_id,
                identity_id = excluded.identity_id,
                updated_at = excluded.updated_at",
            params![
                binding.repo_path,
                binding.project_type,
                binding.account_id,
                binding.identity_id,
                if binding.updated_at == 0 { Utc::now().timestamp() } else { binding.updated_at }
            ],
        )
        .map_err(|e| AppError::Internal(format!("Failed to save repo binding: {e}")))?;
        Ok(())
    }

    pub fn list_repo_bindings(&self) -> AppResult<Vec<RepoBinding>> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("Database mutex poisoned".into()))?;
        let mut stmt = conn.prepare(
            "SELECT repo_path, project_type, account_id, identity_id, updated_at
             FROM repo_bindings ORDER BY updated_at DESC"
        )
        .map_err(|e| AppError::Internal(format!("SQLite prepare error: {e}")))?;

        let binding_iter = stmt.query_map([], |row| {
            Ok(RepoBinding {
                repo_path: row.get(0)?,
                project_type: row.get(1)?,
                account_id: row.get(2)?,
                identity_id: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| AppError::Internal(format!("SQLite query error: {e}")))?;

        let mut list = Vec::new();
        for b in binding_iter {
            if let Ok(item) = b {
                list.push(item);
            }
        }
        Ok(list)
    }

    pub fn delete_repo_binding(&self, repo_path: &str) -> AppResult<()> {
        let conn = self.conn.lock().map_err(|_| AppError::Internal("Database mutex poisoned".into()))?;
        conn.execute("DELETE FROM repo_bindings WHERE repo_path = ?1", params![repo_path])
            .map_err(|e| AppError::Internal(format!("Failed to delete repo binding: {e}")))?;
        Ok(())
    }
}

fn dirs_or_local() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            return PathBuf::from(appdata);
        }
    }
    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join("Library").join("Application Support");
        }
    }
    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join(".config");
        }
    }
    PathBuf::from(".")
}
