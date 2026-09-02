use git2::Repository;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::git::auth::GitCredentials;
use crate::git::sync::smart_sync_upstream;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteInfo {
    pub name: String,
    pub fetch_url: Option<String>,
    pub push_url: Option<String>,
}

/// List all remotes in the repository with their fetch and push URLs
pub fn get_remotes(repo: &Repository) -> AppResult<Vec<RemoteInfo>> {
    let mut result = Vec::new();
    let remote_names = repo.remotes()?;

    for name_opt in remote_names.iter() {
        if let Some(name) = name_opt {
            if let Ok(remote) = repo.find_remote(name) {
                let fetch_url = remote.url().map(|s| s.to_string());
                let push_url = remote.pushurl().map(|s| s.to_string()).or_else(|| fetch_url.clone());
                result.push(RemoteInfo {
                    name: name.to_string(),
                    fetch_url,
                    push_url,
                });
            }
        }
    }

    Ok(result)
}

/// Add a new remote (git remote add <name> <url>)
pub fn add_remote(repo: &Repository, name: &str, url: &str) -> AppResult<RemoteInfo> {
    let name = name.trim();
    let url = url.trim();

    if name.is_empty() {
        return Err(AppError::InvalidRepo("Tên remote không được để trống.".into()));
    }
    if url.is_empty() {
        return Err(AppError::InvalidRepo("URL remote không được để trống.".into()));
    }

    let remote = repo.remote(name, url)?;
    let fetch_url = remote.url().map(|s| s.to_string());
    let push_url = remote.pushurl().map(|s| s.to_string()).or_else(|| fetch_url.clone());

    Ok(RemoteInfo {
        name: name.to_string(),
        fetch_url,
        push_url,
    })
}

/// Remove an existing remote (git remote remove <name>)
pub fn remove_remote(repo: &Repository, name: &str) -> AppResult<()> {
    repo.remote_delete(name)?;
    Ok(())
}

/// Set URL for an existing remote (git remote set-url <name> <new_url>)
pub fn set_remote_url(repo: &Repository, name: &str, new_url: &str) -> AppResult<()> {
    let new_url = new_url.trim();
    if new_url.is_empty() {
        return Err(AppError::InvalidRepo("URL remote không được để trống.".into()));
    }
    repo.remote_set_url(name, new_url)?;
    Ok(())
}

/// Fetch a specific remote
pub fn fetch_specific_remote(
    repo: &Repository,
    name: &str,
    credentials: Option<GitCredentials>,
) -> AppResult<String> {
    let res = smart_sync_upstream(repo, Some(name), None, credentials)?;
    Ok(res.status)
}
