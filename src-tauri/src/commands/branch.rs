use tauri::{command, AppHandle, Emitter, State};
use crate::commands::state::AppState;
use crate::error::{AppError, AppResult};
use crate::git::{
    auth::GitCredentials,
    branches::{
        checkout_branch as git_checkout_branch, create_branch as git_create_branch,
        delete_branch as git_delete_branch, rename_branch as git_rename_branch,
        get_all_branches, get_all_stashes, get_all_tags,
    },
    commit_ops::{stash_apply as git_stash_apply, stash_drop as git_stash_drop, stash_pop as git_stash_pop, stash_save as git_stash_save},
    diff::FileDiffDetail,
    repo::open_repository as git_open_repo,
    stash_ops::{get_stash_detail as git_get_stash_detail, get_stash_file_diff as git_get_stash_file_diff, stash_branch as git_stash_branch, StashDetail},
    sync::{smart_sync_upstream_with_progress, SmartSyncResult, TransferProgressPayload},
    BranchInfo, StashInfo, TagInfo,
};

#[command]
pub async fn rename_branch(path: String, old_name: String, new_name: String) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_rename_branch(&repo, &old_name, &new_name)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_branches(path: String) -> AppResult<Vec<BranchInfo>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        get_all_branches(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn delete_branch(path: String, branch_name: String, is_remote: bool) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_delete_branch(&repo, &branch_name, is_remote)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn create_branch(
    path: String,
    new_name: String,
    from_ref: String,
    checkout: bool,
) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_create_branch(&repo, &new_name, &from_ref, checkout)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn checkout_branch(path: String, branch_name: String) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_checkout_branch(&repo, &branch_name)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_tags(path: String) -> AppResult<Vec<TagInfo>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        get_all_tags(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_stashes(path: String) -> AppResult<Vec<StashInfo>> {
    tokio::task::spawn_blocking(move || {
        let mut repo = git_open_repo(&path)?;
        get_all_stashes(&mut repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn stash_save(
    path: String,
    message: String,
    include_untracked: bool,
) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        let mut repo = git_open_repo(&path)?;
        git_stash_save(&mut repo, &message, include_untracked)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn stash_apply(path: String, index: usize) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let mut repo = git_open_repo(&path)?;
        git_stash_apply(&mut repo, index)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn stash_pop(path: String, index: usize) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let mut repo = git_open_repo(&path)?;
        git_stash_pop(&mut repo, index)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn stash_drop(path: String, index: usize) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let mut repo = git_open_repo(&path)?;
        git_stash_drop(&mut repo, index)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_stash_detail(path: String, index: usize) -> AppResult<StashDetail> {
    tokio::task::spawn_blocking(move || {
        let mut repo = git_open_repo(&path)?;
        git_get_stash_detail(&mut repo, index)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_stash_file_diff(
    path: String,
    index: usize,
    file_path: String,
    ignore_whitespace: Option<bool>,
) -> AppResult<FileDiffDetail> {
    tokio::task::spawn_blocking(move || {
        let mut repo = git_open_repo(&path)?;
        git_get_stash_file_diff(&mut repo, index, &file_path, ignore_whitespace)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn stash_branch(path: String, index: usize, branch_name: String) -> AppResult<BranchInfo> {
    tokio::task::spawn_blocking(move || {
        let mut repo = git_open_repo(&path)?;
        git_stash_branch(&mut repo, index, &branch_name)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn smart_sync(
    path: String,
    remote_name: Option<String>,
    branch_name: Option<String>,
    credentials: Option<GitCredentials>,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> AppResult<SmartSyncResult> {
    let effective_creds = match credentials {
        Some(c) => Some(c),
        None => {
            if let Ok(Some(acc)) = state.account_store.get_active_account(None) {
                Some(GitCredentials {
                    auth_type: "https_token".to_string(),
                    ssh_passphrase: None,
                    username: Some(acc.username),
                    token: Some(acc.token),
                })
            } else {
                None
            }
        }
    };
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let app = app_handle.clone();
        smart_sync_upstream_with_progress(
            &repo,
            remote_name.as_deref(),
            branch_name.as_deref(),
            effective_creds,
            Some(move |progress: TransferProgressPayload| {
                let _ = app.emit("remote://transfer-progress", &progress);
            }),
        )
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_merged_branches(path: String, base_branch: Option<String>) -> AppResult<Vec<String>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        crate::git::branches::get_merged_branches(&repo, base_branch.as_deref())
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn delete_merged_branches(path: String, branch_names: Vec<String>) -> AppResult<usize> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        crate::git::branches::delete_merged_branches(&repo, &branch_names)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

