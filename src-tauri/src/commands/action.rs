use tauri::{command, State};
use crate::commands::state::AppState;
use crate::error::{AppError, AppResult};
use crate::git::{
    commit_ops::{
        create_commit as git_create_commit, create_tag as git_create_tag,
        delete_tag as git_delete_tag, reset_head as git_reset_head,
        revert_commit as git_revert_commit, squash_commits as git_squash_commits,
    },
    interactive_rebase::{
        execute_interactive_rebase as git_execute_interactive_rebase,
        prepare_interactive_rebase as git_prepare_interactive_rebase,
        RebaseTodoItem,
    },
    rebase::{
        abort_operation as git_abort_operation, continue_rebase as git_continue_rebase,
        execute_rebase as git_execute_rebase, is_rebasing as git_is_rebasing,
        skip_rebase as git_skip_rebase, RebaseExecutionResult,
    },
    repo::open_repository as git_open_repo,
    simulation::{
        execute_cherry_pick as git_execute_cherry_pick, execute_merge as git_execute_merge,
        simulate_merge_or_rebase as git_simulate_merge, ConflictSimulationResult,
    },
    status::{get_repo_operation_state as git_get_repo_operation_state, RepoOperationState},
    safety::{
        get_reflog_entries as git_get_reflog_entries,
        restore_lost_commit as git_restore_lost_commit,
        scan_staged_secrets as git_scan_staged_secrets,
        ReflogEntry, SecretFinding,
    },
};
use crate::storage::action_log::ActionRecord;

#[command]
pub async fn create_commit(
    path: String,
    message: String,
    author_name: Option<String>,
    author_email: Option<String>,
    amend: bool,
    no_verify: Option<bool>,
    state: State<'_, AppState>,
) -> AppResult<String> {
    let action_store = state.action_store.clone();
    let path_clone = path.clone();
    let msg_clone = message.clone();

    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let prev_head = repo
            .head()
            .ok()
            .and_then(|h| h.target())
            .map(|t| t.to_string())
            .unwrap_or_default();
        let branch_name = repo
            .head()
            .ok()
            .and_then(|h| h.shorthand().map(|s| s.to_string()));

        let new_sha = git_create_commit(
            &repo,
            &message,
            author_name,
            author_email,
            amend,
            no_verify.unwrap_or(false),
        )?;

        let _ = action_store.record_action(
            &path_clone,
            if amend { "commit_amend" } else { "commit" },
            &format!("Commit: {msg_clone}"),
            &prev_head,
            &new_sha,
            branch_name.as_deref(),
            "safe",
        );

        Ok(new_sha)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn simulate_drag_action(
    path: String,
    source_commit_id: String,
    target_commit_id: String,
) -> AppResult<ConflictSimulationResult> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_simulate_merge(&repo, &source_commit_id, &target_commit_id)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn execute_cherry_pick_commit(
    path: String,
    commit_id: String,
    state: State<'_, AppState>,
) -> AppResult<String> {
    let action_store = state.action_store.clone();
    let path_clone = path.clone();
    let commit_id_clone = commit_id.clone();

    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let prev_head = repo
            .head()
            .ok()
            .and_then(|h| h.target())
            .map(|t| t.to_string())
            .unwrap_or_default();
        let branch_name = repo
            .head()
            .ok()
            .and_then(|h| h.shorthand().map(|s| s.to_string()));

        let new_sha = git_execute_cherry_pick(&repo, &commit_id)?;

        let _ = action_store.record_action(
            &path_clone,
            "cherry_pick",
            &format!("Cherry-pick commit {}", &commit_id_clone[..7.min(commit_id_clone.len())]),
            &prev_head,
            &new_sha,
            branch_name.as_deref(),
            "safe",
        );

        Ok(new_sha)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn execute_merge_commit(
    path: String,
    source_ref_or_id: String,
    message: Option<String>,
    state: State<'_, AppState>,
) -> AppResult<String> {
    let action_store = state.action_store.clone();
    let path_clone = path.clone();
    let ref_clone = source_ref_or_id.clone();

    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let prev_head = repo
            .head()
            .ok()
            .and_then(|h| h.target())
            .map(|t| t.to_string())
            .unwrap_or_default();
        let branch_name = repo
            .head()
            .ok()
            .and_then(|h| h.shorthand().map(|s| s.to_string()));

        let new_sha = git_execute_merge(&repo, &source_ref_or_id, message.as_deref())?;

        let _ = action_store.record_action(
            &path_clone,
            "merge",
            &format!("Merge {}", &ref_clone),
            &prev_head,
            &new_sha,
            branch_name.as_deref(),
            "moderate",
        );

        Ok(new_sha)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn execute_rebase_branch(
    path: String,
    upstream: String,
    state: State<'_, AppState>,
) -> AppResult<RebaseExecutionResult> {
    let action_store = state.action_store.clone();
    let path_clone = path.clone();
    let upstream_clone = upstream.clone();

    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let prev_head = repo
            .head()
            .ok()
            .and_then(|h| h.target())
            .map(|t| t.to_string())
            .unwrap_or_default();
        let branch_name = repo
            .head()
            .ok()
            .and_then(|h| h.shorthand().map(|s| s.to_string()));

        let res = git_execute_rebase(&repo, &upstream)?;

        if res.status == "completed" {
            let new_head = res.head_commit_id.clone().unwrap_or_else(|| prev_head.clone());
            let _ = action_store.record_action(
                &path_clone,
                "rebase",
                &format!("Rebase onto {upstream_clone}"),
                &prev_head,
                &new_head,
                branch_name.as_deref(),
                "moderate",
            );
        }

        Ok(res)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn continue_rebase_branch(
    path: String,
    state: State<'_, AppState>,
) -> AppResult<RebaseExecutionResult> {
    let action_store = state.action_store.clone();
    let path_clone = path.clone();

    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let prev_head = repo
            .head()
            .ok()
            .and_then(|h| h.target())
            .map(|t| t.to_string())
            .unwrap_or_default();
        let branch_name = repo
            .head()
            .ok()
            .and_then(|h| h.shorthand().map(|s| s.to_string()));

        let res = git_continue_rebase(&repo)?;

        if res.status == "completed" {
            let new_head = res.head_commit_id.clone().unwrap_or_else(|| prev_head.clone());
            let _ = action_store.record_action(
                &path_clone,
                "rebase",
                "Rebase completed",
                &prev_head,
                &new_head,
                branch_name.as_deref(),
                "moderate",
            );
        }

        Ok(res)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn check_is_rebasing(path: String) -> AppResult<bool> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        Ok(git_is_rebasing(&repo))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_repo_operation_state(path: String) -> AppResult<RepoOperationState> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_repo_operation_state(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn abort_current_operation(path: String) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_abort_operation(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn skip_rebase_step(path: String) -> AppResult<RebaseExecutionResult> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_skip_rebase(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn list_actions(
    path: String,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> AppResult<Vec<ActionRecord>> {
    let action_store = state.action_store.clone();
    tokio::task::spawn_blocking(move || {
        action_store.list_actions(&path, limit.unwrap_or(50))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn undo_action(path: String, state: State<'_, AppState>) -> AppResult<ActionRecord> {
    let action_store = state.action_store.clone();
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        action_store.undo_action(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn redo_action(path: String, state: State<'_, AppState>) -> AppResult<ActionRecord> {
    let action_store = state.action_store.clone();
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        action_store.redo_action(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn time_travel_to(
    path: String,
    action_id: i64,
    state: State<'_, AppState>,
) -> AppResult<ActionRecord> {
    let action_store = state.action_store.clone();
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        action_store.time_travel_to(&repo, action_id)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn revert_commit(
    path: String,
    commit_id: String,
    state: State<'_, AppState>,
) -> AppResult<String> {
    let action_store = state.action_store.clone();
    let path_clone = path.clone();
    let commit_id_clone = commit_id.clone();

    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let prev_head = repo
            .head()
            .ok()
            .and_then(|h| h.target())
            .map(|t| t.to_string())
            .unwrap_or_default();
        let branch_name = repo
            .head()
            .ok()
            .and_then(|h| h.shorthand().map(|s| s.to_string()));

        let new_sha = git_revert_commit(&repo, &commit_id)?;

        let _ = action_store.record_action(
            &path_clone,
            "revert",
            &format!("Revert commit {}", &commit_id_clone[..7.min(commit_id_clone.len())]),
            &prev_head,
            &new_sha,
            branch_name.as_deref(),
            "safe",
        );

        Ok(new_sha)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn reset_to_commit(
    path: String,
    commit_id: String,
    mode: String,
    state: State<'_, AppState>,
) -> AppResult<String> {
    let action_store = state.action_store.clone();
    let path_clone = path.clone();
    let commit_id_clone = commit_id.clone();
    let mode_clone = mode.clone();

    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let prev_head = repo
            .head()
            .ok()
            .and_then(|h| h.target())
            .map(|t| t.to_string())
            .unwrap_or_default();
        let branch_name = repo
            .head()
            .ok()
            .and_then(|h| h.shorthand().map(|s| s.to_string()));

        let target_sha = git_reset_head(&repo, &commit_id, &mode)?;

        let severity = if mode_clone == "hard" { "critical" } else { "moderate" };
        let _ = action_store.record_action(
            &path_clone,
            &format!("reset_{mode_clone}"),
            &format!("Reset ({mode_clone}) to {}", &commit_id_clone[..7.min(commit_id_clone.len())]),
            &prev_head,
            &target_sha,
            branch_name.as_deref(),
            severity,
        );

        Ok(target_sha)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn create_tag(
    path: String,
    tag_name: String,
    target_commit_id: String,
    message: Option<String>,
) -> AppResult<String> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_create_tag(&repo, &tag_name, &target_commit_id, message.as_deref())
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn delete_tag(
    path: String,
    tag_name: String,
) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_delete_tag(&repo, &tag_name)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn squash_commits(
    path: String,
    commit_ids: Vec<String>,
    message: String,
    state: State<'_, AppState>,
) -> AppResult<String> {
    let action_store = state.action_store.clone();
    let path_clone = path.clone();
    let count = commit_ids.len();

    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let prev_head = repo
            .head()
            .ok()
            .and_then(|h| h.target())
            .map(|t| t.to_string())
            .unwrap_or_default();
        let branch_name = repo
            .head()
            .ok()
            .and_then(|h| h.shorthand().map(|s| s.to_string()));

        let new_sha = git_squash_commits(&repo, &commit_ids, &message)?;

        let _ = action_store.record_action(
            &path_clone,
            "squash",
            &format!("Squashed {count} commits"),
            &prev_head,
            &new_sha,
            branch_name.as_deref(),
            "moderate",
        );

        Ok(new_sha)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn prepare_interactive_rebase(
    path: String,
    onto_commit_id: String,
) -> AppResult<Vec<RebaseTodoItem>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_prepare_interactive_rebase(&repo, &onto_commit_id)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn execute_interactive_rebase(
    path: String,
    onto_commit_id: String,
    todos: Vec<RebaseTodoItem>,
    state: State<'_, AppState>,
) -> AppResult<RebaseExecutionResult> {
    let action_store = state.action_store.clone();
    let path_clone = path.clone();

    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let prev_head = repo
            .head()
            .ok()
            .and_then(|h| h.target())
            .map(|t| t.to_string())
            .unwrap_or_default();
        let branch_name = repo
            .head()
            .ok()
            .and_then(|h| h.shorthand().map(|s| s.to_string()));

        let res = git_execute_interactive_rebase(&repo, &onto_commit_id, todos)?;

        if res.status == "completed" {
            let new_head = res.head_commit_id.clone().unwrap_or_else(|| prev_head.clone());
            let _ = action_store.record_action(
                &path_clone,
                "rebase",
                &format!("Interactive rebase onto {onto_commit_id}"),
                &prev_head,
                &new_head,
                branch_name.as_deref(),
                "moderate",
            );
        }

        Ok(res)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn scan_staged_secrets(path: String) -> AppResult<Vec<SecretFinding>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_scan_staged_secrets(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_reflog_entries(
    path: String,
    limit: Option<usize>,
) -> AppResult<Vec<ReflogEntry>> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_reflog_entries(&repo, limit)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn restore_lost_commit(
    path: String,
    commit_id: String,
    branch_name: String,
    state: State<'_, AppState>,
) -> AppResult<String> {
    let action_store = state.action_store.clone();
    let path_clone = path.clone();
    let cid_clone = commit_id.clone();
    let bname_clone = branch_name.clone();

    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let prev_head = repo
            .head()
            .ok()
            .and_then(|h| h.target())
            .map(|t| t.to_string())
            .unwrap_or_default();

        let refname = git_restore_lost_commit(&repo, &commit_id, &branch_name)?;

        let _ = action_store.record_action(
            &path_clone,
            "restore_lost_commit",
            &format!("Restored lost commit {} to branch {}", &cid_clone[..7.min(cid_clone.len())], bname_clone),
            &prev_head,
            &cid_clone,
            Some(&bname_clone),
            "safe",
        );

        Ok(refname)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

