use tauri::command;
use crate::error::{AppError, AppResult};
use crate::git::{
    hooks::{list_git_hooks, save_git_hook as git_save_hook, toggle_git_hook as git_toggle_hook, GitHookInfo},
    repo::open_repository as git_open_repo,
};

#[command]
pub async fn get_git_hooks(repo_path: String) -> AppResult<Vec<GitHookInfo>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&repo_path)?;
        list_git_hooks(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn save_git_hook(
    repo_path: String,
    name: String,
    content: String,
    enabled: bool,
) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&repo_path)?;
        git_save_hook(&repo, &name, &content, enabled)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn toggle_git_hook(
    repo_path: String,
    name: String,
    enabled: bool,
) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&repo_path)?;
        git_toggle_hook(&repo, &name, enabled)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
