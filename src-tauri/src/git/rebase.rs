use std::process::Command;
use git2::Repository;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::git::conflict::get_conflicted_files;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebaseExecutionResult {
    pub status: String, // "completed", "conflict", "aborted"
    pub message: String,
    pub head_commit_id: Option<String>,
    pub conflicted_files: Vec<String>,
}

/// Check if repository is currently in the middle of a rebase
pub fn is_rebasing(repo: &Repository) -> bool {
    let git_dir = repo.path();
    git_dir.join("rebase-merge").exists() || git_dir.join("rebase-apply").exists()
}

/// Execute git rebase <upstream>
pub fn execute_rebase(repo: &Repository, upstream: &str) -> AppResult<RebaseExecutionResult> {
    let workdir = repo.workdir().ok_or_else(|| AppError::InvalidRepo("Bare repository".into()))?;

    // Check if working tree has unstaged or uncommitted changes
    let mut status_opts = git2::StatusOptions::new();
    status_opts.include_untracked(false);
    let statuses = repo.statuses(Some(&mut status_opts))?;
    let dirty_count = statuses.iter().filter(|s| {
        let st = s.status();
        st.is_wt_modified() || st.is_wt_deleted() || st.is_index_modified() || st.is_index_new() || st.is_index_deleted()
    }).count();

    if dirty_count > 0 {
        return Err(AppError::InvalidRepo(
            "Working directory contains uncommitted changes. Please commit or stash your changes before rebasing.".into()
        ));
    }

    let mut cmd = Command::new("git");
    cmd.current_dir(workdir);
    cmd.env("GIT_TERMINAL_PROMPT", "0");
    cmd.arg("rebase").arg(upstream);

    let output = cmd.output().map_err(|e| AppError::Internal(format!("Failed to execute git rebase: {e}")))?;

    if output.status.success() {
        let new_head = repo.head().ok().and_then(|h| h.target()).map(|t| t.to_string());
        return Ok(RebaseExecutionResult {
            status: "completed".to_string(),
            message: format!("Rebase onto '{upstream}' completed successfully."),
            head_commit_id: new_head,
            conflicted_files: vec![],
        });
    }

    // Check if rebase encountered conflicts
    let conflicted = get_conflicted_files(repo)?;
    if !conflicted.is_empty() || is_rebasing(repo) {
        return Ok(RebaseExecutionResult {
            status: "conflict".to_string(),
            message: format!(
                "Rebase stopped due to {} conflict file(s). Resolve conflicts and continue rebase.",
                conflicted.len()
            ),
            head_commit_id: None,
            conflicted_files: conflicted,
        });
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let combined = format!("{}\n{}", stdout, stderr).trim().to_string();
    Err(AppError::GitMessage(format!("Git rebase failed: {combined}")))
}

/// Continue rebase after resolving conflicts
pub fn continue_rebase(repo: &Repository) -> AppResult<RebaseExecutionResult> {
    let workdir = repo.workdir().ok_or_else(|| AppError::InvalidRepo("Bare repository".into()))?;

    // Check if there are still unresolved conflicts in index
    let conflicted = get_conflicted_files(repo)?;
    if !conflicted.is_empty() {
        return Ok(RebaseExecutionResult {
            status: "conflict".to_string(),
            message: format!(
                "Still {} file(s) with conflicts. Please resolve and stage them all first.",
                conflicted.len()
            ),
            head_commit_id: None,
            conflicted_files: conflicted,
        });
    }

    let mut cmd = Command::new("git");
    cmd.current_dir(workdir);
    cmd.env("GIT_TERMINAL_PROMPT", "0");
    cmd.env("GIT_EDITOR", "true"); // Prevent interactive editor from hanging
    cmd.arg("-c").arg("core.editor=true").arg("rebase").arg("--continue");

    let output = cmd.output().map_err(|e| AppError::Internal(format!("Failed to execute git rebase --continue: {e}")))?;

    if output.status.success() {
        if is_rebasing(repo) {
            let next_conflicts = get_conflicted_files(repo)?;
            if !next_conflicts.is_empty() {
                return Ok(RebaseExecutionResult {
                    status: "conflict".to_string(),
                    message: "Conflict detected in subsequent rebase commit.".to_string(),
                    head_commit_id: None,
                    conflicted_files: next_conflicts,
                });
            }
        }

        let new_head = repo.head().ok().and_then(|h| h.target()).map(|t| t.to_string());
        return Ok(RebaseExecutionResult {
            status: "completed".to_string(),
            message: "Rebase completed successfully.".to_string(),
            head_commit_id: new_head,
            conflicted_files: vec![],
        });
    }

    let next_conflicts = get_conflicted_files(repo)?;
    if !next_conflicts.is_empty() || is_rebasing(repo) {
        return Ok(RebaseExecutionResult {
            status: "conflict".to_string(),
            message: "Rebase encountered conflicts in the next commit.".to_string(),
            head_commit_id: None,
            conflicted_files: next_conflicts,
        });
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let combined = format!("{}\n{}", stdout, stderr).trim().to_string();
    Err(AppError::GitMessage(format!("Git rebase --continue failed: {combined}")))
}

/// Skip current commit during rebase
pub fn skip_rebase(repo: &Repository) -> AppResult<RebaseExecutionResult> {
    let workdir = repo.workdir().ok_or_else(|| AppError::InvalidRepo("Bare repository".into()))?;

    let mut cmd = Command::new("git");
    cmd.current_dir(workdir);
    cmd.env("GIT_TERMINAL_PROMPT", "0");
    cmd.arg("rebase").arg("--skip");

    let output = cmd.output().map_err(|e| AppError::Internal(format!("Failed to execute git rebase --skip: {e}")))?;

    if output.status.success() {
        if is_rebasing(repo) {
            let next_conflicts = get_conflicted_files(repo)?;
            if !next_conflicts.is_empty() {
                return Ok(RebaseExecutionResult {
                    status: "conflict".to_string(),
                    message: "Conflict detected in subsequent rebase commit.".to_string(),
                    head_commit_id: None,
                    conflicted_files: next_conflicts,
                });
            }
        }

        let new_head = repo.head().ok().and_then(|h| h.target()).map(|t| t.to_string());
        return Ok(RebaseExecutionResult {
            status: "completed".to_string(),
            message: "Rebase --skip completed.".to_string(),
            head_commit_id: new_head,
            conflicted_files: vec![],
        });
    }

    let next_conflicts = get_conflicted_files(repo)?;
    if !next_conflicts.is_empty() || is_rebasing(repo) {
        return Ok(RebaseExecutionResult {
            status: "conflict".to_string(),
            message: "Rebase stopped due to conflicts after skipping.".to_string(),
            head_commit_id: None,
            conflicted_files: next_conflicts,
        });
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let combined = format!("{}\n{}", stdout, stderr).trim().to_string();
    Err(AppError::GitMessage(format!("Git rebase --skip failed: {combined}")))
}

/// Abort any ongoing operation (rebase, merge, cherry-pick, revert, bisect)
pub fn abort_operation(repo: &Repository) -> AppResult<String> {
    let workdir = repo.workdir().ok_or_else(|| AppError::InvalidRepo("Bare repository".into()))?;
    let git_dir = repo.path();

    let (cmd_args, op_name) = if git_dir.join("rebase-merge").exists() || git_dir.join("rebase-apply").exists() {
        (vec!["rebase", "--abort"], "Rebase")
    } else if git_dir.join("MERGE_HEAD").exists() {
        (vec!["merge", "--abort"], "Merge")
    } else if git_dir.join("CHERRY_PICK_HEAD").exists() {
        (vec!["cherry-pick", "--abort"], "Cherry-pick")
    } else if git_dir.join("REVERT_HEAD").exists() {
        (vec!["revert", "--abort"], "Revert")
    } else if git_dir.join("BISECT_LOG").exists() || git_dir.join("BISECT_START").exists() {
        (vec!["bisect", "reset"], "Bisect")
    } else {
        return Ok("No in-progress operation to abort.".to_string());
    };

    let mut cmd = Command::new("git");
    cmd.current_dir(workdir);
    cmd.env("GIT_TERMINAL_PROMPT", "0");
    for arg in cmd_args {
        cmd.arg(arg);
    }

    let output = cmd.output().map_err(|e| AppError::Internal(format!("Failed to abort {op_name}: {e}")))?;
    if output.status.success() {
        Ok(format!("{op_name} aborted successfully."))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let combined = format!("{}\n{}", stdout, stderr).trim().to_string();
        Err(AppError::GitMessage(format!("Failed to abort {op_name}: {combined}")))
    }
}

