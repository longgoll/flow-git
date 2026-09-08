use std::path::Path;
use git2::{ApplyLocation, Diff, DiffFormat, Oid, Repository};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatchFileItem {
    pub path: String,
    pub old_path: Option<String>,
    pub status: String,
    pub additions: usize,
    pub deletions: usize,
    pub hunks_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatchCheckResult {
    pub can_apply: bool,
    pub files: Vec<PatchFileItem>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatchApplyResult {
    pub success: bool,
    pub files_applied: Vec<String>,
    pub message: String,
}

/// Generate a standard git format-patch compatible patch string from a commit.
pub fn export_commit_patch(repo: &Repository, commit_id: &str) -> AppResult<String> {
    let oid = Oid::from_str(commit_id)
        .map_err(|e| AppError::GitMessage(format!("Invalid commit SHA {commit_id}: {e}")))?;
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;

    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0)?.tree()?)
    } else {
        None
    };

    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)?;

    let author = commit.author();
    let author_name = author.name().unwrap_or("Unknown");
    let author_email = author.email().unwrap_or("unknown@example.com");
    let time = commit.time();
    let dt = chrono::DateTime::from_timestamp(time.seconds(), 0)
        .unwrap_or_else(chrono::Utc::now);
    let rfc2822_date = dt.to_rfc2822();
    let summary = commit.summary().unwrap_or("No commit message");
    let message = commit.message().unwrap_or("");

    let mut patch_out = format!(
        "From {commit_id} Mon Sep 17 00:00:00 2001\nFrom: {author_name} <{author_email}>\nDate: {rfc2822_date}\nSubject: [PATCH] {summary}\n\n{message}\n---\n"
    );

    let mut has_diff_body = false;
    diff.print(DiffFormat::Patch, |_delta, _hunk, line| {
        has_diff_body = true;
        let origin = line.origin();
        if origin == '+' || origin == '-' || origin == ' ' {
            patch_out.push(origin);
        }
        patch_out.push_str(&String::from_utf8_lossy(line.content()));
        true
    })?;

    if !has_diff_body {
        patch_out.push_str(" (empty commit / no file changes)\n");
    }

    patch_out.push_str("\n--\nFlowGit v2\n");
    Ok(patch_out)
}

/// Check and validate a patch without modifying the working tree.
pub fn check_patch(repo: &Repository, patch_content: &str) -> AppResult<PatchCheckResult> {
    let trimmed = patch_content.trim();
    if trimmed.is_empty() {
        return Ok(PatchCheckResult {
            can_apply: false,
            files: Vec::new(),
            error_message: Some("Patch content is empty".into()),
        });
    }

    let diff = match Diff::from_buffer(trimmed.as_bytes()) {
        Ok(d) => d,
        Err(e) => {
            return Ok(PatchCheckResult {
                can_apply: false,
                files: Vec::new(),
                error_message: Some(format!("Invalid patch format: {e}")),
            });
        }
    };

    let mut files = Vec::new();
    let num_deltas = diff.deltas().len();

    let workdir = repo.workdir().unwrap_or_else(|| Path::new("."));
    let mut missing_targets = Vec::new();

    for i in 0..num_deltas {
        if let Some(delta) = diff.get_delta(i) {
            let path = delta.new_file().path()
                .or_else(|| delta.old_file().path())
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            let old_path = delta.old_file().path()
                .map(|p| p.to_string_lossy().to_string());
            let status = match delta.status() {
                git2::Delta::Added => "added",
                git2::Delta::Deleted => "deleted",
                git2::Delta::Modified => "modified",
                git2::Delta::Renamed => "renamed",
                git2::Delta::Copied => "copied",
                _ => "modified",
            }.to_string();

            let (additions, deletions, hunks_count) = if let Ok(Some(patch)) = git2::Patch::from_diff(&diff, i) {
                let (adds, dels) = patch.line_stats().map(|(_, a, d)| (a, d)).unwrap_or((0, 0));
                (adds, dels, patch.num_hunks())
            } else {
                (0, 0, 0)
            };

            // Check if file exists for modified / deleted
            if (status == "modified" || status == "deleted") && !path.is_empty() {
                let file_path = workdir.join(&path);
                if !file_path.exists() {
                    missing_targets.push(path.clone());
                }
            }

            files.push(PatchFileItem {
                path,
                old_path,
                status,
                additions,
                deletions,
                hunks_count,
            });
        }
    }

    let (can_apply, error_message) = if !missing_targets.is_empty() {
        (
            false,
            Some(format!(
                "Cannot apply cleanly: target file(s) not found in working tree: {}",
                missing_targets.join(", ")
            )),
        )
    } else if files.is_empty() {
        (false, Some("No file deltas discovered in patch".into()))
    } else {
        (true, None)
    };

    Ok(PatchCheckResult {
        can_apply,
        files,
        error_message,
    })
}

/// Apply a patch directly to the working tree and optionally the index.
pub fn apply_patch(
    repo: &Repository,
    patch_content: &str,
    stage_to_index: bool,
    _reverse: bool,
) -> AppResult<PatchApplyResult> {
    let trimmed = patch_content.trim();
    if trimmed.is_empty() {
        return Err(AppError::GitMessage("Cannot apply empty patch".into()));
    }

    let diff = Diff::from_buffer(trimmed.as_bytes())?;

    let mut files_applied = Vec::new();
    for delta in diff.deltas() {
        let path = delta.new_file().path()
            .or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        if !path.is_empty() && !files_applied.contains(&path) {
            files_applied.push(path);
        }
    }

    let location = if stage_to_index {
        ApplyLocation::Both
    } else {
        ApplyLocation::WorkDir
    };

    repo.apply(&diff, location, None)?;

    if stage_to_index {
        let mut index = repo.index()?;
        index.write()?;
    }

    Ok(PatchApplyResult {
        success: true,
        files_applied: files_applied.clone(),
        message: format!("Successfully applied patch to {} file(s)", files_applied.len()),
    })
}
