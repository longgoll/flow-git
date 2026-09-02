use git2::{BranchType, Oid, Repository, ResetType};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::storage::action_log::ActionLogStore;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StackedCommitItem {
    pub id: String,
    pub short_id: String,
    pub summary: String,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
    pub is_pushed: bool,
}

pub fn get_unpushed_commits(repo: &Repository) -> AppResult<Vec<StackedCommitItem>> {
    let head = repo.head()?;
    let head_oid = head.target().ok_or_else(|| AppError::InvalidRepo("HEAD has no target".into()))?;
    let branch_name = head.shorthand().unwrap_or("HEAD");

    // Try finding upstream
    let mut upstream_oid: Option<Oid> = None;
    if let Ok(branch) = repo.find_branch(branch_name, BranchType::Local) {
        if let Ok(upstream) = branch.upstream() {
            upstream_oid = upstream.get().target();
        }
    }

    if upstream_oid.is_none() {
        // Probe origin/main or origin/master
        for candidate in ["origin/main", "origin/master"] {
            if let Ok(b) = repo.find_branch(candidate, BranchType::Remote) {
                if let Some(target) = b.get().target() {
                    upstream_oid = Some(target);
                    break;
                }
            }
        }
    }

    let mut revwalk = repo.revwalk()?;
    revwalk.push(head_oid)?;
    if let Some(up_oid) = upstream_oid {
        if up_oid != head_oid {
            let _ = revwalk.hide(up_oid);
        }
    }

    let mut result = Vec::new();
    for oid_res in revwalk {
        let oid = match oid_res {
            Ok(o) => o,
            Err(_) => continue,
        };
        let commit = match repo.find_commit(oid) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let author = commit.author();
        let short_id = if oid.to_string().len() >= 7 {
            oid.to_string()[..7].to_string()
        } else {
            oid.to_string()
        };

        result.push(StackedCommitItem {
            id: oid.to_string(),
            short_id,
            summary: commit.summary().unwrap_or("").to_string(),
            message: commit.message().unwrap_or("").to_string(),
            author_name: author.name().unwrap_or("Unknown").to_string(),
            author_email: author.email().unwrap_or("").to_string(),
            timestamp: author.when().seconds(),
            is_pushed: false,
        });

        if result.len() >= 50 {
            break;
        }
    }

    // Commits in revwalk come in reverse chronological order (HEAD first).
    // In stacked cards, we want the base commit at bottom and HEAD at top, or ordered for stack.
    Ok(result)
}

pub fn reorder_stacked_commits(
    repo: &Repository,
    action_store: &ActionLogStore,
    repo_path: &str,
    new_order_ids: Vec<String>,
) -> AppResult<String> {
    if new_order_ids.is_empty() {
        return Ok("No commits to reorder".to_string());
    }

    let head = repo.head()?;
    let old_head_oid = head.target().ok_or_else(|| AppError::InvalidRepo("HEAD has no target".into()))?;

    // Record action for Undo Time Machine
    let _ = action_store.record_action(
        repo_path,
        "reorder_commits",
        &format!("Reordered {} commits", new_order_ids.len()),
        &old_head_oid.to_string(),
        &old_head_oid.to_string(),
        None,
        "safe",
    );

    // Collect commits to cherry-pick in given order
    let oldest_commit_id = &new_order_ids[new_order_ids.len() - 1];
    let oldest_oid = Oid::from_str(oldest_commit_id)
        .map_err(|e| AppError::InvalidRepo(e.to_string()))?;
    let oldest_commit = repo.find_commit(oldest_oid)?;
    
    let base_commit = if oldest_commit.parent_count() > 0 {
        oldest_commit.parent(0)?
    } else {
        return Err(AppError::Internal("Cannot reorder root commit without parents".into()));
    };

    let mut current_parent = base_commit;

    // Apply each commit from bottom to top in new order
    // Note: new_order_ids is passed from oldest to newest or newest to oldest.
    // We treat new_order_ids as [oldest ... newest].
    for id_str in &new_order_ids {
        let oid = Oid::from_str(id_str).map_err(|e| AppError::InvalidRepo(e.to_string()))?;
        let commit = repo.find_commit(oid)?;

        let mut index = repo.cherrypick_commit(&commit, &current_parent, 0, None)?;
        if index.has_conflicts() {
            return Err(AppError::Internal("Conflict detected while reordering commits. Reorder aborted.".into()));
        }

        let tree_id = index.write_tree_to(repo)?;
        let tree = repo.find_tree(tree_id)?;
        let sig = commit.author();

        let new_oid = repo.commit(
            None,
            &sig,
            &sig,
            commit.message().unwrap_or(""),
            &tree,
            &[&current_parent],
        )?;

        current_parent = repo.find_commit(new_oid)?;
    }

    // Reset current branch to the new tip
    let head_ref_name = head.name().unwrap_or("HEAD");
    repo.reference(head_ref_name, current_parent.id(), true, "FlowGit: Reorder stacked commits")?;
    let commit_obj = repo.find_object(current_parent.id(), None)?;
    repo.reset(&commit_obj, ResetType::Mixed, None)?;

    Ok(current_parent.id().to_string())
}
