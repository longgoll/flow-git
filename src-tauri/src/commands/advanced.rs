use tauri::command;
use crate::error::{AppError, AppResult};
use crate::git::{
    lfs::{get_lfs_summary, lock_lfs_cli, pull_lfs_cli, unlock_lfs_cli, LfsSummary},
    repo::open_repository as git_open_repo,
    submodule::{get_submodules as git_get_submodules, sync_submodule_cli, update_submodule_cli, SubmoduleInfo},
};

// ---------------------------------------------------------
// Git Submodules Commands
// ---------------------------------------------------------

#[command]
pub async fn get_submodules(path: String) -> AppResult<Vec<SubmoduleInfo>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_submodules(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn update_submodules(
    path: String,
    name: Option<String>,
    recursive: bool,
) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        update_submodule_cli(&path, name.as_deref(), recursive)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn sync_submodules(path: String, name: Option<String>) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        sync_submodule_cli(&path, name.as_deref())
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_submodule_diff(path: String, name: String) -> AppResult<crate::git::submodule::SubmoduleDiffResult> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        crate::git::submodule::get_submodule_diff(&repo, &name)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

// ---------------------------------------------------------
// Git LFS Commands
// ---------------------------------------------------------

#[command]
pub async fn get_lfs_info(path: String) -> AppResult<LfsSummary> {
    let p_clone = path.clone();
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&p_clone)?;
        get_lfs_summary(&repo, &p_clone)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn pull_lfs_files(path: String, pattern: Option<String>) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        pull_lfs_cli(&path, pattern.as_deref())
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn lock_lfs_file(path: String, file_path: String) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        lock_lfs_cli(&path, &file_path)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn unlock_lfs_file(path: String, file_path: String, force: bool) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        unlock_lfs_cli(&path, &file_path, force)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
