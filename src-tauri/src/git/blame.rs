use std::path::Path;
use git2::{BlameOptions, DiffOptions, Repository};
use serde::{Deserialize, Serialize};
use crate::error::AppResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlameHunkItem {
    pub final_commit_id: String,
    pub final_short_id: String,
    pub final_start_line: usize,
    pub lines_in_hunk: usize,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileHistoryItem {
    pub commit_id: String,
    pub short_id: String,
    pub summary: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
}

/// Compute blame for a specific file in the repository (optionally restricted to a line range)
pub fn get_file_blame(
    repo: &Repository,
    file_path: &str,
    min_line: Option<usize>,
    max_line: Option<usize>,
) -> AppResult<Vec<BlameHunkItem>> {
    let mut opts = BlameOptions::new();
    if let Some(min) = min_line {
        opts.min_line(min);
    }
    if let Some(max) = max_line {
        opts.max_line(max);
    }
    let blame = repo.blame_file(Path::new(file_path), Some(&mut opts))?;

    let mut hunks = Vec::new();
    for hunk in blame.iter() {
        let commit_id = hunk.final_commit_id();
        let short_id = if commit_id.to_string().len() >= 7 {
            commit_id.to_string()[..7].to_string()
        } else {
            commit_id.to_string()
        };

        let (author_name, author_email, timestamp, summary) = if let Ok(commit) = repo.find_commit(commit_id) {
            let author = commit.author();
            (
                author.name().unwrap_or("Unknown").to_string(),
                author.email().unwrap_or("").to_string(),
                author.when().seconds(),
                commit.summary().unwrap_or("").to_string(),
            )
        } else {
            let sig = hunk.final_signature();
            (
                sig.name().unwrap_or("Unknown").to_string(),
                sig.email().unwrap_or("").to_string(),
                sig.when().seconds(),
                String::new(),
            )
        };

        hunks.push(BlameHunkItem {
            final_commit_id: commit_id.to_string(),
            final_short_id: short_id,
            final_start_line: hunk.final_start_line(),
            lines_in_hunk: hunk.lines_in_hunk(),
            author_name,
            author_email,
            timestamp,
            summary,
        });
    }

    Ok(hunks)
}

/// Retrieve the commit history that modified a given file (equivalent to `git log --follow -- <path>`)
pub fn get_file_history(
    repo: &Repository,
    file_path: &str,
    limit: usize,
) -> AppResult<Vec<FileHistoryItem>> {
    let max_count = if limit == 0 { 50 } else { limit };
    let head = repo.head().ok().and_then(|h| h.target());
    let head_oid = match head {
        Some(oid) => oid,
        None => return Ok(Vec::new()),
    };

    let mut revwalk = repo.revwalk()?;
    revwalk.push(head_oid)?;
    revwalk.set_sorting(git2::Sort::TIME)?;

    let mut history = Vec::new();
    let mut diff_opts = DiffOptions::new();
    diff_opts.pathspec(file_path);

    for oid_res in revwalk {
        let oid = match oid_res {
            Ok(o) => o,
            Err(_) => continue,
        };

        let commit = match repo.find_commit(oid) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let current_tree = match commit.tree() {
            Ok(t) => t,
            Err(_) => continue,
        };

        let touches_file = if commit.parent_count() > 0 {
            if let Ok(parent) = commit.parent(0) {
                if let Ok(parent_tree) = parent.tree() {
                    let diff = repo.diff_tree_to_tree(
                        Some(&parent_tree),
                        Some(&current_tree),
                        Some(&mut diff_opts),
                    );
                    match diff {
                        Ok(d) => d.deltas().len() > 0,
                        Err(_) => false,
                    }
                } else {
                    false
                }
            } else {
                false
            }
        } else {
            // Initial commit: check if file exists in tree
            current_tree.get_path(Path::new(file_path)).is_ok()
        };

        if touches_file {
            let author = commit.author();
            let short_id = if oid.to_string().len() >= 7 {
                oid.to_string()[..7].to_string()
            } else {
                oid.to_string()
            };

            history.push(FileHistoryItem {
                commit_id: oid.to_string(),
                short_id,
                summary: commit.summary().unwrap_or("").to_string(),
                author_name: author.name().unwrap_or("Unknown").to_string(),
                author_email: author.email().unwrap_or("").to_string(),
                timestamp: author.when().seconds(),
            });

            if history.len() >= max_count {
                break;
            }
        }
    }

    Ok(history)
}
