use std::collections::HashMap;
use git2::{Repository, Sort};
use serde::{Deserialize, Serialize};
use crate::error::AppResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChurnInfo {
    pub path: String,
    pub changes_count: usize,
    pub additions: usize,
    pub deletions: usize,
}

/// Analyze commit history and calculate the top modified files (file churn hotspots).
pub fn get_repo_file_churn(
    repo: &Repository,
    max_commits: Option<usize>,
) -> AppResult<Vec<FileChurnInfo>> {
    let limit = max_commits.unwrap_or(500).min(2000);

    let mut revwalk = repo.revwalk()?;
    revwalk.set_sorting(Sort::TIME | Sort::TOPOLOGICAL)?;
    if revwalk.push_head().is_err() {
        // Empty repository or detached without commits
        return Ok(Vec::new());
    }

    struct FileAccumulator {
        changes_count: usize,
        additions: usize,
        deletions: usize,
    }

    let mut map: HashMap<String, FileAccumulator> = HashMap::new();
    let mut count = 0;

    for oid_res in revwalk {
        if count >= limit {
            break;
        }
        let oid = match oid_res {
            Ok(id) => id,
            Err(_) => continue,
        };

        let commit = match repo.find_commit(oid) {
            Ok(c) => c,
            Err(_) => continue,
        };

        // Skip merge commits to avoid duplicating file churn stats
        if commit.parent_count() > 1 {
            count += 1;
            continue;
        }

        let tree = match commit.tree() {
            Ok(t) => t,
            Err(_) => continue,
        };

        let parent_tree = if commit.parent_count() == 1 {
            commit.parent(0).ok().and_then(|p| p.tree().ok())
        } else {
            None
        };

        let diff = match repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None) {
            Ok(d) => d,
            Err(_) => continue,
        };

        let num_deltas = diff.deltas().len();
        for i in 0..num_deltas {
            if let Some(delta) = diff.get_delta(i) {
                let path = delta.new_file().path()
                    .or_else(|| delta.old_file().path())
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();

                if !path.is_empty() {
                    let (adds, dels) = if let Ok(Some(patch)) = git2::Patch::from_diff(&diff, i) {
                        patch.line_stats().map(|(_, a, d)| (a, d)).unwrap_or((0, 0))
                    } else {
                        (0, 0)
                    };

                    let entry = map.entry(path).or_insert(FileAccumulator {
                        changes_count: 0,
                        additions: 0,
                        deletions: 0,
                    });
                    entry.changes_count += 1;
                    entry.additions += adds;
                    entry.deletions += dels;
                }
            }
        }

        count += 1;
    }

    let mut result: Vec<FileChurnInfo> = map
        .into_iter()
        .map(|(path, acc)| FileChurnInfo {
            path,
            changes_count: acc.changes_count,
            additions: acc.additions,
            deletions: acc.deletions,
        })
        .collect();

    result.sort_by(|a, b| b.changes_count.cmp(&a.changes_count));
    result.truncate(50); // Top 50 hotspot files

    Ok(result)
}
