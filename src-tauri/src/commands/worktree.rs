use tauri::command;
use crate::error::{AppError, AppResult};
use crate::git::{
    repo::open_repository as git_open_repo,
    worktree::{add_worktree as git_add_worktree, list_worktrees as git_list_worktrees, remove_worktree as git_remove_worktree, WorktreeInfo},
};

#[command]
pub async fn list_worktrees(path: String) -> AppResult<Vec<WorktreeInfo>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_list_worktrees(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn create_worktree(
    path: String,
    name: String,
    target_path: String,
    branch_name: Option<String>,
) -> AppResult<WorktreeInfo> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_add_worktree(&repo, &name, &target_path, branch_name.as_deref())
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn delete_worktree(
    path: String,
    name: String,
) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_remove_worktree(&repo, &name)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
