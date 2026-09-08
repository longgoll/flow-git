use tauri::{command, AppHandle, State};
use serde::{Deserialize, Serialize};
use crate::commands::state::AppState;
use crate::error::{AppError, AppResult};
use crate::git::{
    auth::GitCredentials,
    comparison::{compare_commits as git_compare_commits, ComparisonResult},
    focus::{get_focus_branch_info as git_get_focus_branch_info, FocusBranchResult},
    history::{get_commit_detail, get_paginated_commit_history as git_get_paginated_history, get_topological_history, PaginatedCommitHistory},
    repo::{clone_repository as git_clone_repo, get_repo_summary, init_repository as git_init_repo, open_repository as git_open_repo},
    stacked::{get_unpushed_commits as git_get_unpushed_commits, reorder_stacked_commits as git_reorder_stacked_commits, StackedCommitItem},
    tree::{
        get_file_content as git_get_file_content,
        get_tree_entries as git_get_tree_entries,
        grep_repository_content as git_grep_repository_content,
        open_file_in_editor as git_open_file_in_editor,
        reveal_in_file_manager as git_reveal_in_file_manager,
        save_file_content as git_save_file_content,
        FileGrepMatch,
    },
    CommitDetail, CommitNode, FileContentResponse, RepoSummary, TreeEntryItem,
    signing::{
        get_commit_signature as git_get_commit_signature,
        get_signing_config as git_get_signing_config,
        set_signing_config as git_set_signing_config,
        SignatureInfo, SigningConfig,
    },
};

#[command]
pub async fn init_repository(
    app: AppHandle,
    path: String,
    default_branch: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<RepoSummary> {
    let path_clone = path.clone();
    let watcher = state.watcher.clone();

    let summary = tokio::task::spawn_blocking(move || {
        let repo = git_init_repo(&path, default_branch.as_deref())?;
        get_repo_summary(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    // Start background watcher for realtime updates
    let _ = watcher.watch_repo(app, &path_clone);

    Ok(summary)
}

#[command]
pub async fn open_repository(
    app: AppHandle,
    path: String,
    state: State<'_, AppState>,
) -> AppResult<RepoSummary> {
    let path_clone = path.clone();
    let watcher = state.watcher.clone();

    let summary = tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        get_repo_summary(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    // Start background watcher for realtime updates
    let _ = watcher.watch_repo(app, &path_clone);

    Ok(summary)
}

#[command]
pub async fn clone_repository(
    app: AppHandle,
    url: String,
    target_path: String,
    credentials: Option<GitCredentials>,
    state: State<'_, AppState>,
) -> AppResult<RepoSummary> {
    let target_clone = target_path.clone();
    let watcher = state.watcher.clone();
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

    let summary = tokio::task::spawn_blocking(move || {
        git_clone_repo(&url, &target_path, effective_creds)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))??;

    let _ = watcher.watch_repo(app, &target_clone);
    Ok(summary)
}

#[command]
pub async fn get_commit_history(
    path: String,
    max_count: usize,
) -> AppResult<Vec<CommitNode>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        get_topological_history(&repo, max_count)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_paginated_commit_history(
    path: String,
    skip: usize,
    limit: usize,
) -> AppResult<PaginatedCommitHistory> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_paginated_history(&repo, skip, limit)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_commit_info(path: String, commit_id: String) -> AppResult<CommitDetail> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        get_commit_detail(&repo, &commit_id)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn compare_two_commits(
    path: String,
    base_commit_id: String,
    target_commit_id: String,
) -> AppResult<ComparisonResult> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_compare_commits(&repo, &base_commit_id, &target_commit_id)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_focus_branch_info(
    path: String,
    branch_name: Option<String>,
    base_branch: Option<String>,
) -> AppResult<FocusBranchResult> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_focus_branch_info(&repo, branch_name.as_deref(), base_branch.as_deref())
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_unpushed_stacked_commits(
    path: String,
) -> AppResult<Vec<StackedCommitItem>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_unpushed_commits(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn reorder_stacked_commits(
    path: String,
    commit_ids: Vec<String>,
    state: State<'_, AppState>,
) -> AppResult<String> {
    let action_store = state.action_store.clone();
    let repo_path = path.clone();
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_reorder_stacked_commits(&repo, &action_store, &repo_path, commit_ids)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_tree_entries(
    path: String,
    dir_path: Option<String>,
    commit_oid: Option<String>,
) -> AppResult<Vec<TreeEntryItem>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_tree_entries(&repo, dir_path.as_deref(), commit_oid.as_deref())
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_file_content(
    path: String,
    file_path: String,
    commit_oid: Option<String>,
) -> AppResult<FileContentResponse> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_file_content(&repo, &file_path, commit_oid.as_deref())
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_remote_url(
    path: String,
    remote_name: Option<String>,
) -> AppResult<Option<String>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let name = remote_name.unwrap_or_else(|| "origin".to_string());
        let res = match repo.find_remote(&name) {
            Ok(r) => r.url().map(|s| s.to_string()),
            Err(_) => None,
        };
        Ok(res)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn nuke_file_from_history(
    path: String,
    file_path: String,
) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        crate::git::commit_ops::nuke_file_from_history(&path, &file_path)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn save_file_content(
    path: String,
    file_path: String,
    content: String,
) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_save_file_content(&repo, &file_path, &content)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn grep_repository_content(
    path: String,
    query: String,
    case_sensitive: Option<bool>,
    max_results: Option<usize>,
) -> AppResult<Vec<FileGrepMatch>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_grep_repository_content(
            &repo,
            &query,
            case_sensitive.unwrap_or(false),
            max_results.unwrap_or(200),
        )
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn open_in_external_editor(
    full_path: String,
    editor: Option<String>,
) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        git_open_file_in_editor(&full_path, editor.as_deref())
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn reveal_in_file_manager(
    full_path: String,
) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        git_reveal_in_file_manager(&full_path)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashSnapshotDiffResult {
    pub file_path: String,
    pub snapshot_content: String,
    pub current_content: String,
    pub is_oversized: bool,
}

#[command]
pub async fn get_trash_snapshot_diff(
    snapshot_id: i64,
    state: State<'_, AppState>,
) -> AppResult<TrashSnapshotDiffResult> {
    tokio::task::spawn_blocking(move || {
        let (repo_path, file_path, content_bytes) = state.trash_store.get_snapshot_content(snapshot_id)?;
        let snapshot_content = String::from_utf8_lossy(&content_bytes).to_string();

        let full_path = std::path::Path::new(&repo_path).join(&file_path);
        let current_content = if full_path.exists() {
            std::fs::read_to_string(&full_path).unwrap_or_else(|_| "(Không thể đọc nội dung file hiện tại hoặc file nhị phân)".to_string())
        } else {
            String::new()
        };

        Ok(TrashSnapshotDiffResult {
            file_path,
            snapshot_content,
            current_content,
            is_oversized: content_bytes.is_empty(),
        })
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn search_commits_pickaxe(
    path: String,
    query: String,
    is_regex: Option<bool>,
    max_results: Option<usize>,
) -> AppResult<Vec<crate::git::search::PickaxeSearchResult>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        crate::git::search::search_commits_pickaxe(&repo, &query, is_regex.unwrap_or(false), max_results)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn export_commit_patch(
    path: String,
    commit_id: String,
) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        crate::git::patch::export_commit_patch(&repo, &commit_id)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn check_patch(
    path: String,
    patch_content: String,
) -> AppResult<crate::git::patch::PatchCheckResult> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        crate::git::patch::check_patch(&repo, &patch_content)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn apply_patch(
    path: String,
    patch_content: String,
    stage_to_index: Option<bool>,
    reverse: Option<bool>,
) -> AppResult<crate::git::patch::PatchApplyResult> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        crate::git::patch::apply_patch(&repo, &patch_content, stage_to_index.unwrap_or(false), reverse.unwrap_or(false))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_repo_file_churn(
    path: String,
    max_commits: Option<usize>,
) -> AppResult<Vec<crate::git::stats::FileChurnInfo>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        crate::git::stats::get_repo_file_churn(&repo, max_commits)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_commit_signature(
    path: String,
    commit_id: String,
) -> AppResult<SignatureInfo> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_commit_signature(&repo, &commit_id)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_signing_config(path: String) -> AppResult<SigningConfig> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_signing_config(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn set_signing_config(
    path: String,
    gpg_sign: bool,
    gpg_format: String,
    signing_key: Option<String>,
    is_global: Option<bool>,
) -> AppResult<SigningConfig> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_set_signing_config(
            &repo,
            gpg_sign,
            &gpg_format,
            signing_key.as_deref(),
            is_global.unwrap_or(false),
        )?;
        git_get_signing_config(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}








