use tauri::{command, State};
use crate::commands::state::AppState;
use crate::error::{AppError, AppResult};
use crate::git::{
    blame::{
        get_file_blame as git_get_file_blame, get_file_history as git_get_file_history,
        BlameHunkItem, FileHistoryItem,
    },
    diff::{
        get_commit_file_diff as git_get_commit_file_diff, get_working_tree_file_diff,
        stage_all as git_stage_all, stage_file as git_stage_file,
        stage_hunk as git_stage_hunk, unstage_all as git_unstage_all, unstage_file as git_unstage_file,
        unstage_hunk as git_unstage_hunk, FileDiffDetail,
    },
    ignore::{add_pattern_to_gitignore, generate_smart_gitignore},
    repo::open_repository as git_open_repo,
    safety::{
        delete_trash_snapshot as git_delete_trash, discard_all_changes as git_discard_all,
        discard_file_changes as git_discard_file, list_trash_snapshots as git_list_trash,
        restore_trash_snapshot as git_restore_trash,
    },
    status::{get_working_tree_status, WorkingTreeStatus},
};
use crate::storage::trash::TrashSnapshotItem;

#[command]
pub async fn get_status(path: String) -> AppResult<WorkingTreeStatus> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        get_working_tree_status(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_file_diff(
    path: String,
    file_path: String,
    staged: bool,
    ignore_whitespace: Option<bool>,
) -> AppResult<FileDiffDetail> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        get_working_tree_file_diff(&repo, &file_path, staged, ignore_whitespace)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_commit_file_diff(
    path: String,
    commit_id: String,
    file_path: String,
    ignore_whitespace: Option<bool>,
) -> AppResult<FileDiffDetail> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_commit_file_diff(&repo, &commit_id, &file_path, ignore_whitespace)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn stage_file(path: String, file_path: String) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_stage_file(&repo, &file_path)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn unstage_file(path: String, file_path: String) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_unstage_file(&repo, &file_path)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn stage_all(path: String) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_stage_all(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn unstage_all(path: String) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_unstage_all(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn stage_hunk(path: String, file_path: String, hunk_index: usize) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_stage_hunk(&repo, &file_path, hunk_index)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn unstage_hunk(path: String, file_path: String, hunk_index: usize) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_unstage_hunk(&repo, &file_path, hunk_index)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn discard_file_changes(
    path: String,
    file_path: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let store = state.trash_store.clone();
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_discard_file(&repo, &store, &file_path)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn discard_all_changes(
    path: String,
    state: State<'_, AppState>,
) -> AppResult<usize> {
    let store = state.trash_store.clone();
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_discard_all(&repo, &store)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn list_trash_snapshots(
    path: String,
    state: State<'_, AppState>,
) -> AppResult<Vec<TrashSnapshotItem>> {
    let store = state.trash_store.clone();
    tokio::task::spawn_blocking(move || {
        git_list_trash(&store, &path)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn restore_trash_snapshot(
    path: String,
    snapshot_id: i64,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let store = state.trash_store.clone();
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_restore_trash(&repo, &store, snapshot_id)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn delete_trash_snapshot(
    snapshot_id: i64,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let store = state.trash_store.clone();
    tokio::task::spawn_blocking(move || {
        git_delete_trash(&store, snapshot_id)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_file_blame(
    path: String,
    file_path: String,
) -> AppResult<Vec<BlameHunkItem>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_file_blame(&repo, &file_path)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_file_history(
    path: String,
    file_path: String,
    limit: Option<usize>,
) -> AppResult<Vec<FileHistoryItem>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_file_history(&repo, &file_path, limit.unwrap_or(50))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn add_to_gitignore(path: String, pattern: String) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let workdir = repo.workdir().ok_or_else(|| AppError::Internal("Bare repo has no workdir".into()))?;
        add_pattern_to_gitignore(workdir.to_str().unwrap_or(&path), &pattern)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn generate_standard_gitignore(path: String) -> AppResult<Vec<String>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let workdir = repo.workdir().ok_or_else(|| AppError::Internal("Bare repo has no workdir".into()))?;
        generate_smart_gitignore(workdir.to_str().unwrap_or(&path))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}
