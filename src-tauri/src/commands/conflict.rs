use tauri::command;
use crate::error::{AppError, AppResult};
use crate::git::{
    conflict::{
        abort_merge_or_rebase as git_abort_merge, get_conflict_details as git_get_conflict_details,
        get_conflicted_files as git_get_conflicted_files, resolve_conflict_file as git_resolve_conflict,
        ConflictFileDetail,
    },
    repo::open_repository as git_open_repo,
};

#[command]
pub async fn get_conflicted_files(path: String) -> AppResult<Vec<String>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_conflicted_files(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_conflict_details(path: String, file_path: String) -> AppResult<ConflictFileDetail> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_conflict_details(&repo, &file_path)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn resolve_conflict_file(
    path: String,
    file_path: String,
    resolved_content: String,
) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_resolve_conflict(&repo, &file_path, &resolved_content)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn abort_merge_or_rebase(path: String) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_abort_merge(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
