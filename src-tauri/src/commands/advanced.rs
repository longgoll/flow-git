use tauri::command;
use crate::error::{AppError, AppResult};
use crate::git::{
    lfs::{get_lfs_summary, lock_lfs_cli, pull_lfs_cli, track_lfs_pattern as git_track_lfs, unlock_lfs_cli, untrack_lfs_pattern as git_untrack_lfs, LfsSummary},
    repo::open_repository as git_open_repo,
    sparse::{
        disable_sparse_checkout as git_disable_sparse,
        get_sparse_checkout_info as git_get_sparse,
        reapply_sparse_checkout as git_reapply_sparse,
        set_sparse_checkout as git_set_sparse,
        SparseCheckoutInfo,
    },
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

#[command]
pub async fn track_lfs_pattern(path: String, pattern: String) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        git_track_lfs(&path, &pattern)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn untrack_lfs_pattern(path: String, pattern: String) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        git_untrack_lfs(&path, &pattern)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

// ---------------------------------------------------------
// Git Sparse Checkout Commands (Monorepo)
// ---------------------------------------------------------

#[command]
pub async fn get_sparse_checkout_info(path: String) -> AppResult<SparseCheckoutInfo> {
    tokio::task::spawn_blocking(move || {
        git_get_sparse(&path)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn set_sparse_checkout(
    path: String,
    patterns: Vec<String>,
    cone: bool,
) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        git_set_sparse(&path, patterns, cone)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn disable_sparse_checkout(path: String) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        git_disable_sparse(&path)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn reapply_sparse_checkout(path: String) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        git_reapply_sparse(&path)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
