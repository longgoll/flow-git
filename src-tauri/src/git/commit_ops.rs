use git2::{Signature, StashFlags};
use crate::error::{AppError, AppResult};
use crate::git::cli::silent_command;

pub fn run_pre_commit_hook(repo: &git2::Repository) -> AppResult<()> {
    let hooks_dir = repo.path().join("hooks");
    let pre_commit = hooks_dir.join("pre-commit");
    if pre_commit.exists() {
        let workdir = repo.workdir().ok_or_else(|| AppError::InvalidRepo("Bare repository".into()))?;
        let mut cmd = if cfg!(target_os = "windows") {
            let mut c = silent_command("sh");
            c.arg(&pre_commit);
            c
        } else {
            silent_command(&pre_commit)
        };
        cmd.current_dir(workdir);
        if let Ok(output) = cmd.output() {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let stdout = String::from_utf8_lossy(&output.stdout);
                let combined = format!("{}\n{}", stdout, stderr).trim().to_string();
                return Err(AppError::GitMessage(format!(
                    "Git hook 'pre-commit' thất bại:\n{}",
                    combined
                )));
            }
        }
    }
    Ok(())
}

pub fn create_commit(
    repo: &git2::Repository,
    message: &str,
    author_name: Option<String>,
    author_email: Option<String>,
    amend: bool,
    no_verify: bool,
) -> AppResult<String> {
    if !no_verify {
        run_pre_commit_hook(repo)?;
    }

    let mut index = repo.index()?;
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;

    let sig = if let (Some(name), Some(email)) = (author_name, author_email) {
        Signature::now(&name, &email)?
    } else {
        repo.signature()
            .or_else(|_| Signature::now("FlowGit User", "user@flowgit.local"))?
    };

    if amend {
        let head = repo.head()?;
        let parent_commit = head.peel_to_commit()?;
        let grand_parents: Vec<_> = parent_commit.parents().collect();
        let grand_parent_refs: Vec<&git2::Commit> = grand_parents.iter().collect();

        let new_commit_id = repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            message,
            &tree,
            &grand_parent_refs,
        )?;

        Ok(new_commit_id.to_string())
    } else {
        let head_commit = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
        let parents: Vec<&git2::Commit> = match head_commit {
            Some(ref c) => vec![c],
            None => vec![],
        };

        let new_commit_id = repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            message,
            &tree,
            &parents,
        )?;

        // Tự động dọn dẹp cờ tạm thời như CHERRY_PICK_HEAD, MERGE_HEAD
        let _ = repo.cleanup_state();

        Ok(new_commit_id.to_string())
    }
}

pub fn stash_save(
    repo: &mut git2::Repository,
    message: &str,
    include_untracked: bool,
) -> AppResult<String> {
    let sig = repo
        .signature()
        .or_else(|_| Signature::now("FlowGit User", "user@flowgit.local"))?;

    let flags = if include_untracked {
        StashFlags::INCLUDE_UNTRACKED
    } else {
        StashFlags::DEFAULT
    };

    let msg = if message.trim().is_empty() {
        "WIP on FlowGit"
    } else {
        message
    };

    let oid = repo.stash_save2(&sig, Some(msg), Some(flags))?;
    Ok(oid.to_string())
}

pub fn stash_apply(repo: &mut git2::Repository, index: usize) -> AppResult<()> {
    repo.stash_apply(index, None)?;
    Ok(())
}

pub fn stash_pop(repo: &mut git2::Repository, index: usize) -> AppResult<()> {
    repo.stash_pop(index, None)?;
    Ok(())
}

pub fn stash_drop(repo: &mut git2::Repository, index: usize) -> AppResult<()> {
    repo.stash_drop(index)?;
    Ok(())
}

/// Revert a commit by creating a reverse commit (git revert)
pub fn revert_commit(repo: &git2::Repository, commit_id: &str) -> AppResult<String> {
    let oid = git2::Oid::from_str(commit_id).map_err(|e| crate::error::AppError::InvalidRepo(e.to_string()))?;
    let commit = repo.find_commit(oid)?;

    let mut revert_opts = git2::RevertOptions::new();
    repo.revert(&commit, Some(&mut revert_opts))?;

    let mut index = repo.index()?;
    if index.has_conflicts() {
        return Err(crate::error::AppError::GitMessage(
            "Revert resulted in conflicts. Please resolve conflicts before continuing.".into()
        ));
    }

    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;
    let sig = repo.signature().or_else(|_| Signature::now("FlowGit User", "user@flowgit.local"))?;

    let head_commit = repo.head()?.peel_to_commit()?;
    let message = format!("Revert \"{}\"\n\nThis reverts commit {}.", commit.summary().unwrap_or(""), commit_id);

    let new_id = repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &message,
        &tree,
        &[&head_commit],
    )?;

    // Clean up REVERT_HEAD if left on disk
    let git_dir = repo.path();
    let _ = std::fs::remove_file(git_dir.join("REVERT_HEAD"));

    Ok(new_id.to_string())
}

/// Reset HEAD to a specific commit (soft, mixed, or hard)
pub fn reset_head(repo: &git2::Repository, commit_id: &str, mode: &str) -> AppResult<String> {
    let oid = git2::Oid::from_str(commit_id).map_err(|e| crate::error::AppError::InvalidRepo(e.to_string()))?;
    let commit = repo.find_commit(oid)?;
    let obj = commit.as_object();

    let reset_type = match mode.to_lowercase().as_str() {
        "soft" => git2::ResetType::Soft,
        "hard" => git2::ResetType::Hard,
        _ => git2::ResetType::Mixed,
    };

    repo.reset(obj, reset_type, None)?;
    Ok(commit_id.to_string())
}

/// Create a lightweight or annotated Git tag
pub fn create_tag(
    repo: &git2::Repository,
    tag_name: &str,
    target_commit_id: &str,
    message: Option<&str>,
) -> AppResult<String> {
    let oid = git2::Oid::from_str(target_commit_id).map_err(|e| crate::error::AppError::InvalidRepo(e.to_string()))?;
    let target = repo.find_object(oid, Some(git2::ObjectType::Commit))?;

    if let Some(msg) = message {
        let sig = repo.signature().or_else(|_| Signature::now("FlowGit User", "user@flowgit.local"))?;
        let tag_oid = repo.tag(tag_name, &target, &sig, msg, false)?;
        Ok(tag_oid.to_string())
    } else {
        let tag_oid = repo.tag_lightweight(tag_name, &target, false)?;
        Ok(tag_oid.to_string())
    }
}

/// Delete a Git tag by name
pub fn delete_tag(repo: &git2::Repository, tag_name: &str) -> AppResult<()> {
    repo.tag_delete(tag_name)?;
    Ok(())
}

/// Squash contiguous unpushed commits into a single commit
pub fn squash_commits(
    repo: &git2::Repository,
    commit_ids: &[String],
    message: &str,
) -> AppResult<String> {
    if commit_ids.len() < 2 {
        return Err(crate::error::AppError::InvalidRepo("Need at least 2 commits to squash".into()));
    }

    // Newest commit provides the final tree state
    let newest_oid = git2::Oid::from_str(&commit_ids[0])
        .map_err(|e| crate::error::AppError::InvalidRepo(e.to_string()))?;
    let newest_commit = repo.find_commit(newest_oid)?;
    let final_tree = newest_commit.tree()?;

    // Oldest commit's parent is the base of the squashed commit
    let oldest_oid = git2::Oid::from_str(&commit_ids[commit_ids.len() - 1])
        .map_err(|e| crate::error::AppError::InvalidRepo(e.to_string()))?;
    let oldest_commit = repo.find_commit(oldest_oid)?;

    let base_parent = if oldest_commit.parent_count() > 0 {
        oldest_commit.parent(0)?
    } else {
        return Err(crate::error::AppError::InvalidRepo("Cannot squash root commit".into()));
    };

    let sig = repo.signature().or_else(|_| Signature::now("FlowGit User", "user@flowgit.local"))?;

    let head = repo.head()?;
    let head_ref_name = head.name().unwrap_or("HEAD");

    let new_oid = repo.commit(
        Some(head_ref_name),
        &sig,
        &sig,
        message,
        &final_tree,
        &[&base_parent],
    )?;

    let new_commit_obj = repo.find_object(new_oid, None)?;
    repo.reset(&new_commit_obj, git2::ResetType::Mixed, None)?;

    Ok(new_oid.to_string())
}

pub fn nuke_file_from_history(repo_path: &str, file_path: &str) -> AppResult<String> {
    let clean_path = file_path.trim().replace('\\', "/");
    if clean_path.is_empty() {
        return Err(crate::error::AppError::InvalidRepo("File path cannot be empty".to_string()));
    }

    let index_filter = format!("git rm -rf --cached --ignore-unmatch \"{}\"", clean_path);

    let mut cmd = silent_command("git");
    cmd.current_dir(repo_path)
        .arg("filter-branch")
        .arg("--force")
        .arg("--index-filter")
        .arg(&index_filter)
        .arg("--prune-empty")
        .arg("--tag-name-filter")
        .arg("cat")
        .arg("--")
        .arg("--all");

    let output = cmd.output().map_err(|e| crate::error::AppError::Internal(format!("Failed to execute git filter-branch: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(crate::error::AppError::Internal(format!("Git filter-branch failed: {}", stderr)));
    }

    // Expire reflogs and aggressive gc
    let _ = silent_command("git")
        .current_dir(repo_path)
        .args(["reflog", "expire", "--expire=now", "--all"])
        .output();

    let _ = silent_command("git")
        .current_dir(repo_path)
        .args(["gc", "--prune=now"])
        .output();

    Ok(format!("Đã xóa vĩnh viễn '{}' khỏi toàn bộ lịch sử Git.", clean_path))
}


