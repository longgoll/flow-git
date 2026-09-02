use tauri::command;
use crate::error::{AppError, AppResult};
use crate::git::{
    auth::GitCredentials,
    remote_ops::{
        add_remote as git_add_remote, fetch_specific_remote as git_fetch_remote,
        get_remotes as git_get_remotes, remove_remote as git_remove_remote,
        set_remote_url as git_set_remote_url, RemoteInfo,
    },
    repo::open_repository as git_open_repo,
};

#[command]
pub async fn get_remotes(path: String) -> AppResult<Vec<RemoteInfo>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_remotes(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn add_remote(path: String, name: String, url: String) -> AppResult<RemoteInfo> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_add_remote(&repo, &name, &url)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn remove_remote(path: String, name: String) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_remove_remote(&repo, &name)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn set_remote_url(path: String, name: String, new_url: String) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_set_remote_url(&repo, &name, &new_url)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn fetch_remote(
    path: String,
    name: String,
    credentials: Option<GitCredentials>,
) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_fetch_remote(&repo, &name, credentials)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
