use git2::{Repository, WorktreeAddOptions, WorktreeLockStatus};
use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorktreeInfo {
    pub name: String,
    pub path: String,
    pub is_locked: bool,
    pub lock_reason: Option<String>,
    pub head_commit_id: Option<String>,
    pub branch_name: Option<String>,
    pub is_main: bool,
}

pub fn list_worktrees(repo: &Repository) -> AppResult<Vec<WorktreeInfo>> {
    let mut results = Vec::new();

    // 1. Add Main Worktree
    let main_path = repo.workdir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
    let main_branch = repo.head().ok().and_then(|h| h.shorthand().map(|s| s.to_string()));
    let main_head = repo.head().ok().and_then(|h| h.target().map(|t| t.to_string()));

    results.push(WorktreeInfo {
        name: "main".to_string(),
        path: main_path,
        is_locked: false,
        lock_reason: None,
        head_commit_id: main_head,
        branch_name: main_branch,
        is_main: true,
    });

    // 2. Add Linked Worktrees
    if let Ok(worktree_names) = repo.worktrees() {
        for name in worktree_names.iter().flatten() {
            if let Ok(wt) = repo.find_worktree(name) {
                let path = wt.path().to_string_lossy().to_string();
                let (is_locked, lock_reason) = match wt.is_locked() {
                    Ok(WorktreeLockStatus::Locked(reason)) => (true, reason),
                    _ => (false, None),
                };

                // Try to open linked repository to inspect its HEAD
                let mut head_id = None;
                let mut branch = None;
                if let Ok(wt_repo) = Repository::open(&path) {
                    if let Ok(head) = wt_repo.head() {
                        branch = head.shorthand().map(|s| s.to_string());
                        head_id = head.target().map(|t| t.to_string());
                    }
                }

                results.push(WorktreeInfo {
                    name: name.to_string(),
                    path,
                    is_locked,
                    lock_reason,
                    head_commit_id: head_id,
                    branch_name: branch,
                    is_main: false,
                });
            }
        }
    }

    Ok(results)
}

pub fn add_worktree(
    repo: &Repository,
    name: &str,
    target_path: &str,
    branch_name: Option<&str>,
) -> AppResult<WorktreeInfo> {
    let path = Path::new(target_path);
    let mut opts = WorktreeAddOptions::new();

    // If branch provided, find branch ref
    let reference = if let Some(bname) = branch_name {
        if let Ok(branch) = repo.find_branch(bname, git2::BranchType::Local) {
            Some(branch.into_reference())
        } else {
            None
        }
    } else {
        None
    };

    if let Some(ref r) = reference {
        opts.reference(Some(r));
    }

    let wt = repo.worktree(name, path, Some(&opts))
        .map_err(|e| AppError::GitMessage(format!("Failed to create worktree '{name}': {e}")))?;

    let wt_path = wt.path().to_string_lossy().to_string();

    Ok(WorktreeInfo {
        name: name.to_string(),
        path: wt_path,
        is_locked: false,
        lock_reason: None,
        head_commit_id: None,
        branch_name: branch_name.map(|s| s.to_string()),
        is_main: false,
    })
}

pub fn remove_worktree(
    repo: &Repository,
    name: &str,
) -> AppResult<()> {
    let wt = repo.find_worktree(name)
        .map_err(|e| AppError::GitMessage(format!("Worktree '{name}' not found: {e}")))?;

    // Prune worktree
    let mut opts = git2::WorktreePruneOptions::new();
    opts.valid(true);
    opts.working_tree(true);
    wt.prune(Some(&mut opts))
        .map_err(|e| AppError::GitMessage(format!("Failed to remove worktree '{name}': {e}")))?;

    Ok(())
}
