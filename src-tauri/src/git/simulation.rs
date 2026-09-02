use git2::{Index, Oid, Repository, Signature};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictSimulationResult {
    pub has_conflicts: bool,
    pub conflict_files: Vec<String>,
    pub is_fast_forward: bool,
    pub source_id: String,
    pub target_id: String,
    pub ahead_count: usize,
    pub behind_count: usize,
}

/// Simulate in-memory merge or rebase between source commit and target commit without modifying workdir
pub fn simulate_merge_or_rebase(
    repo: &Repository,
    source_commit_id: &str,
    target_commit_id: &str,
) -> AppResult<ConflictSimulationResult> {
    let source_oid = Oid::from_str(source_commit_id)
        .map_err(|e| AppError::GitMessage(format!("Invalid source commit OID: {e}")))?;
    let target_oid = Oid::from_str(target_commit_id)
        .map_err(|e| AppError::GitMessage(format!("Invalid target commit OID: {e}")))?;

    let source_commit = repo.find_commit(source_oid)?;
    let target_commit = repo.find_commit(target_oid)?;

    let source_tree = source_commit.tree()?;
    let target_tree = target_commit.tree()?;

    // Check relationship (ancestor / ahead / behind)
    let (ahead_count, behind_count) = repo.graph_ahead_behind(source_oid, target_oid).unwrap_or((0, 0));
    let is_fast_forward = repo.graph_descendant_of(source_oid, target_oid).unwrap_or(false)
        || repo.graph_descendant_of(target_oid, source_oid).unwrap_or(false);

    // Find Merge Base (ancestor)
    let ancestor_tree = if let Ok(base_oid) = repo.merge_base(source_oid, target_oid) {
        repo.find_commit(base_oid).ok().and_then(|c| c.tree().ok())
    } else {
        None
    };

    // Perform In-Memory 3-Way Merge Trees
    let index: Index = if let Some(base_tree) = ancestor_tree {
        repo.merge_trees(&base_tree, &target_tree, &source_tree, None)?
    } else {
        repo.merge_trees(&target_tree, &target_tree, &source_tree, None)?
    };

    let has_conflicts = index.has_conflicts();
    let mut conflict_files = Vec::new();

    if has_conflicts {
        if let Ok(conflicts) = index.conflicts() {
            for conflict in conflicts.flatten() {
                if let Some(entry) = conflict.our.as_ref().or(conflict.their.as_ref()).or(conflict.ancestor.as_ref()) {
                    let path_str = String::from_utf8_lossy(&entry.path).to_string();
                    if !conflict_files.contains(&path_str) {
                        conflict_files.push(path_str);
                    }
                }
            }
        }
    }

    Ok(ConflictSimulationResult {
        has_conflicts,
        conflict_files,
        is_fast_forward,
        source_id: source_commit_id.to_string(),
        target_id: target_commit_id.to_string(),
        ahead_count,
        behind_count,
    })
}

/// Execute cherry-pick of a commit onto the current HEAD
pub fn execute_cherry_pick(
    repo: &Repository,
    commit_id: &str,
) -> AppResult<String> {
    let oid = Oid::from_str(commit_id)
        .map_err(|e| AppError::GitMessage(format!("Invalid commit OID: {e}")))?;
    let commit = repo.find_commit(oid)?;

    let mut opts = git2::CherrypickOptions::new();
    repo.cherrypick(&commit, Some(&mut opts))
        .map_err(|e| AppError::GitMessage(format!("Cherry-pick failed: {e}")))?;

    // If there are index conflicts, report error
    let index = repo.index()?;
    if index.has_conflicts() {
        return Err(AppError::GitMessage("Cherry-pick produced conflicts in index".into()));
    }

    // Automatically commit the cherry-picked state if clean
    let sig = repo.signature()
        .or_else(|_| Signature::now("FlowGit User", "user@flowgit.local"))?;
    let mut index = repo.index()?;
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    let head = repo.head()?;
    let head_commit = head.peel_to_commit()?;

    let msg = commit.message().unwrap_or("Cherry-picked commit");
    let new_oid = repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        msg,
        &tree,
        &[&head_commit],
    )?;

    // Cleanup merge/cherrypick state files if present
    let _ = repo.cleanup_state();

    Ok(new_oid.to_string())
}

/// Execute merge of source branch/commit into current branch
pub fn execute_merge(
    repo: &Repository,
    source_ref_or_id: &str,
    custom_message: Option<&str>,
) -> AppResult<String> {
    let annotated = if let Ok(branch) = repo.find_branch(source_ref_or_id, git2::BranchType::Local) {
        let reference = branch.into_reference();
        repo.reference_to_annotated_commit(&reference)?
    } else {
        let oid = Oid::from_str(source_ref_or_id)
            .map_err(|e| AppError::GitMessage(format!("Invalid ref or commit: {e}")))?;
        repo.find_annotated_commit(oid)?
    };

    let (analysis, _preference) = repo.merge_analysis(&[&annotated])?;

    if analysis.is_up_to_date() {
        return Ok("Already up-to-date".into());
    }

    if analysis.is_fast_forward() {
        // Fast-Forward merge
        let target_oid = annotated.id();
        let mut head_ref = repo.head()?;
        head_ref.set_target(target_oid, "Fast-forward merge")?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
        return Ok(target_oid.to_string());
    }

    if analysis.is_normal() {
        // Normal 3-way merge
        let mut opts = git2::MergeOptions::new();
        let mut checkout_opts = git2::build::CheckoutBuilder::new();
        checkout_opts.allow_conflicts(true);

        repo.merge(&[&annotated], Some(&mut opts), Some(&mut checkout_opts))?;

        let mut index = repo.index()?;
        if index.has_conflicts() {
            return Err(AppError::GitMessage("Merge resulted in conflicts. Please resolve them.".into()));
        }

        let tree_id = index.write_tree()?;
        let tree = repo.find_tree(tree_id)?;

        let head_commit = repo.head()?.peel_to_commit()?;
        let source_commit = repo.find_commit(annotated.id())?;

        let sig = repo.signature()
            .or_else(|_| Signature::now("FlowGit User", "user@flowgit.local"))?;

        let default_msg = format!("Merge commit '{}' into HEAD", annotated.id().to_string().chars().take(7).collect::<String>());
        let msg = custom_message.unwrap_or(&default_msg);

        let new_oid = repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            msg,
            &tree,
            &[&head_commit, &source_commit],
        )?;

        let _ = repo.cleanup_state();
        return Ok(new_oid.to_string());
    }

    Err(AppError::GitMessage("Cannot perform merge for this state".into()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    use tempfile::tempdir;

    #[test]
    fn test_in_memory_simulation_clean() {
        let dir = tempdir().unwrap();
        let repo = Repository::init(dir.path()).unwrap();
        let sig = Signature::now("Tester", "test@flowgit.local").unwrap();

        // Commit 1 (base)
        std::fs::write(dir.path().join("file.txt"), "Line 1\n").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("file.txt")).unwrap();
        let tree1_id = index.write_tree().unwrap();
        let tree1 = repo.find_tree(tree1_id).unwrap();
        let c1_oid = repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree1, &[]).unwrap();

        // Branch feature
        let c1 = repo.find_commit(c1_oid).unwrap();
        repo.branch("feature", &c1, false).unwrap();

        // Commit 2 on main (modify file2)
        std::fs::write(dir.path().join("file2.txt"), "Other file\n").unwrap();
        index.add_path(Path::new("file2.txt")).unwrap();
        let tree2_id = index.write_tree().unwrap();
        let tree2 = repo.find_tree(tree2_id).unwrap();
        let c2_oid = repo.commit(Some("HEAD"), &sig, &sig, "Commit 2 on main", &tree2, &[&c1]).unwrap();

        // Simulate
        let sim = simulate_merge_or_rebase(&repo, &c1_oid.to_string(), &c2_oid.to_string()).unwrap();
        assert!(!sim.has_conflicts);
        assert!(sim.conflict_files.is_empty());
    }
}
