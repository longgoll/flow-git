use git2::{DiffOptions, Oid, Repository};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::git::{CommitNode, FileChangeInfo};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComparisonResult {
    pub base_id: String,
    pub target_id: String,
    pub commits_between: Vec<CommitNode>,
    pub files_changed: Vec<FileChangeInfo>,
    pub total_additions: usize,
    pub total_deletions: usize,
}

pub fn compare_commits(
    repo: &Repository,
    base_commit_id: &str,
    target_commit_id: &str,
) -> AppResult<ComparisonResult> {
    let base_oid = Oid::from_str(base_commit_id)
        .map_err(|e| AppError::GitMessage(format!("Invalid base commit OID: {e}")))?;
    let target_oid = Oid::from_str(target_commit_id)
        .map_err(|e| AppError::GitMessage(format!("Invalid target commit OID: {e}")))?;

    let base_commit = repo.find_commit(base_oid)?;
    let target_commit = repo.find_commit(target_oid)?;

    let base_tree = base_commit.tree()?;
    let target_tree = target_commit.tree()?;

    // 1. Tree to Tree Diff
    let mut diff_opts = DiffOptions::new();
    let diff = repo.diff_tree_to_tree(
        Some(&base_tree),
        Some(&target_tree),
        Some(&mut diff_opts),
    )?;

    let mut files_changed = Vec::new();
    let mut total_additions = 0;
    let mut total_deletions = 0;

    let num_deltas = diff.deltas().len();
    for i in 0..num_deltas {
        if let Some(delta) = diff.get_delta(i) {
            let path = delta
                .new_file()
                .path()
                .or_else(|| delta.old_file().path())
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();

            let old_path = if delta.status() == git2::Delta::Renamed {
                delta.old_file().path().map(|p| p.to_string_lossy().to_string())
            } else {
                None
            };

            let status_str = match delta.status() {
                git2::Delta::Added => "added",
                git2::Delta::Deleted => "deleted",
                git2::Delta::Modified => "modified",
                git2::Delta::Renamed => "renamed",
                git2::Delta::Copied => "copied",
                git2::Delta::Typechange => "typechange",
                _ => "unknown",
            };

            // Calculate per-file stats
            let mut file_additions = 0;
            let mut file_deletions = 0;
            if let Ok(patch) = git2::Patch::from_diff(&diff, i) {
                if let Some(p) = patch {
                    let (_, adds, dels) = p.line_stats().unwrap_or((0, 0, 0));
                    file_additions = adds;
                    file_deletions = dels;
                }
            }

            total_additions += file_additions;
            total_deletions += file_deletions;

            files_changed.push(FileChangeInfo {
                path,
                old_path,
                status: status_str.to_string(),
                additions: file_additions,
                deletions: file_deletions,
            });
        }
    }

    // 2. Commits Between (Revwalk from target excluding base)
    let mut revwalk = repo.revwalk()?;
    revwalk.push(target_oid)?;
    let _ = revwalk.hide(base_oid);

    let mut commits_between = Vec::new();
    for oid_res in revwalk {
        if let Ok(oid) = oid_res {
            if let Ok(commit) = repo.find_commit(oid) {
                let author = commit.author();
                let short_id = if oid.to_string().len() >= 7 {
                    oid.to_string()[..7].to_string()
                } else {
                    oid.to_string()
                };

                commits_between.push(CommitNode {
                    id: oid.to_string(),
                    short_id,
                    parents: commit.parent_ids().map(|p| p.to_string()).collect(),
                    author_name: author.name().unwrap_or("Unknown").to_string(),
                    author_email: author.email().unwrap_or("").to_string(),
                    summary: commit.summary().unwrap_or("").to_string(),
                    timestamp: commit.time().seconds(),
                    lane: 0,
                    refs: Vec::new(),
                });
            }
        }
    }

    Ok(ComparisonResult {
        base_id: base_commit_id.to_string(),
        target_id: target_commit_id.to_string(),
        commits_between,
        files_changed,
        total_additions,
        total_deletions,
    })
}
