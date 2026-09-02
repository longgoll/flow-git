use git2::Repository;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitIdentity {
    pub id: String,
    pub label: String, // e.g. "Work (Công ty)", "Personal (Cá nhân)"
    pub name: String,
    pub email: String,
    pub signing_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentRepoIdentity {
    pub name: Option<String>,
    pub email: Option<String>,
    pub is_local: bool,
}

/// Read the current active Git author identity for this repository
pub fn get_current_repo_identity(repo: &Repository) -> AppResult<CurrentRepoIdentity> {
    let config = repo.config()?;

    // Check if configured locally in .git/config
    let local_name = config.get_string("user.name").ok();
    let local_email = config.get_string("user.email").ok();

    // Check if it's explicitly in the local config file
    let is_local = if let Ok(entry) = config.get_entry("user.name") {
        entry.level() == git2::ConfigLevel::Local
    } else {
        false
    };

    Ok(CurrentRepoIdentity {
        name: local_name,
        email: local_email,
        is_local,
    })
}

/// Configure the Git author name & email for this repository (or globally)
pub fn set_repo_identity(
    repo: &Repository,
    name: &str,
    email: &str,
    is_global: bool,
) -> AppResult<()> {
    let name = name.trim();
    let email = email.trim();

    if name.is_empty() {
        return Err(AppError::InvalidRepo("Tên tác giả không được để trống.".into()));
    }
    if email.is_empty() {
        return Err(AppError::InvalidRepo("Email tác giả không được để trống.".into()));
    }

    if is_global {
        let mut global_cfg = repo.config()?.open_global()?;
        global_cfg.set_str("user.name", name)?;
        global_cfg.set_str("user.email", email)?;
    } else {
        let mut cfg = repo.config()?;
        cfg.set_str("user.name", name)?;
        cfg.set_str("user.email", email)?;
    }

    Ok(())
}
