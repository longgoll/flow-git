use tauri::{command, State};
use crate::commands::state::AppState;
use crate::error::{AppError, AppResult};
use crate::git::{
    edge_cases::{
        check_file_locks as git_check_file_locks, clear_index_lock as git_clear_index_lock,
        is_index_locked as git_is_index_locked, scan_heavy_files as git_scan_heavy_files,
        shelve_untracked_files as git_shelve_untracked, HeavyFileInfo, LockedFileInfo,
    },
    repo::open_repository as git_open_repo,
};

#[command]
pub async fn is_index_locked(path: String) -> AppResult<bool> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        Ok(git_is_index_locked(&repo))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn clear_index_lock(path: String) -> AppResult<bool> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_clear_index_lock(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn check_file_locks(
    path: String,
    file_paths: Vec<String>,
) -> AppResult<Vec<LockedFileInfo>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        Ok(git_check_file_locks(&repo, &file_paths))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn scan_heavy_files(
    path: String,
    threshold_mb: u64,
) -> AppResult<Vec<HeavyFileInfo>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_scan_heavy_files(&repo, threshold_mb)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn shelve_untracked_files(
    path: String,
    paths: Vec<String>,
    state: State<'_, AppState>,
) -> AppResult<usize> {
    let trash_store = state.trash_store.clone();
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_shelve_untracked(&repo, &trash_store, &paths)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
