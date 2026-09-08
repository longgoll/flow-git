use git2::{DiffFormat, DiffOptions, Repository, Sort};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PickaxeFileMatch {
    pub path: String,
    pub additions: usize,
    pub deletions: usize,
    pub line_snippets: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PickaxeSearchResult {
    pub commit_id: String,
    pub short_id: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
    pub summary: String,
    pub matched_files: Vec<PickaxeFileMatch>,
}

/// Search commit history using Pickaxe (-S code search).
/// Finds commits where the given string or regex was introduced or removed in the diff.
pub fn search_commits_pickaxe(
    repo: &Repository,
    query: &str,
    is_regex: bool,
    max_results: Option<usize>,
) -> AppResult<Vec<PickaxeSearchResult>> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }

    let limit = max_results.unwrap_or(40).clamp(1, 100);
    let mut revwalk = repo.revwalk()?;
    revwalk.set_sorting(Sort::TIME | Sort::TOPOLOGICAL)?;

    // Push HEAD and local branches
    if revwalk.push_head().is_err() {
        let _ = revwalk.push_glob("refs/heads/*");
    }

    let regex_matcher = if is_regex {
        Some(regex::Regex::new(query).map_err(|e| AppError::InvalidRepo(format!("Biểu thức regex không hợp lệ: {e}")))?)
    } else {
        None
    };

    let query_lower = query.to_lowercase();
    let mut results: Vec<PickaxeSearchResult> = Vec::new();
    let mut diff_opts = DiffOptions::new();
    diff_opts.context_lines(1);

    for oid_result in revwalk {
        if results.len() >= limit {
            break;
        }

        let oid = match oid_result {
            Ok(id) => id,
            Err(_) => continue,
        };

        let commit = match repo.find_commit(oid) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let commit_tree = match commit.tree() {
            Ok(t) => t,
            Err(_) => continue,
        };

        let parent_tree = if commit.parent_count() > 0 {
            commit.parent(0).ok().and_then(|p| p.tree().ok())
        } else {
            None
        };

        let diff = match repo.diff_tree_to_tree(
            parent_tree.as_ref(),
            Some(&commit_tree),
            Some(&mut diff_opts),
        ) {
            Ok(d) => d,
            Err(_) => continue,
        };

        let mut current_file_path = String::new();
        let mut file_additions = 0usize;
        let mut file_deletions = 0usize;
        let mut snippets: Vec<String> = Vec::new();
        let mut file_matched = false;
        let mut matched_files: Vec<PickaxeFileMatch> = Vec::new();

        let _ = diff.print(DiffFormat::Patch, |delta, _hunk, line| {
            let new_path = delta.new_file().path().or_else(|| delta.old_file().path())
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();

            if new_path != current_file_path {
                if file_matched && !current_file_path.is_empty() {
                    matched_files.push(PickaxeFileMatch {
                        path: current_file_path.clone(),
                        additions: file_additions,
                        deletions: file_deletions,
                        line_snippets: snippets.clone(),
                    });
                }
                current_file_path = new_path;
                file_additions = 0;
                file_deletions = 0;
                snippets.clear();
                file_matched = false;
            }

            let origin = line.origin();
            if origin == '+' || origin == '-' {
                let content_str = String::from_utf8_lossy(line.content());
                let line_text = content_str.trim_end();

                let is_hit = if let Some(ref re) = regex_matcher {
                    re.is_match(line_text)
                } else {
                    line_text.to_lowercase().contains(&query_lower)
                };

                if is_hit {
                    file_matched = true;
                    if snippets.len() < 5 {
                        let prefix = if origin == '+' { "+" } else { "-" };
                        snippets.push(format!("{} {}", prefix, line_text.trim()));
                    }
                }

                if origin == '+' {
                    file_additions += 1;
                } else {
                    file_deletions += 1;
                }
            }
            true
        });

        if file_matched && !current_file_path.is_empty() {
            matched_files.push(PickaxeFileMatch {
                path: current_file_path,
                additions: file_additions,
                deletions: file_deletions,
                line_snippets: snippets,
            });
        }

        if !matched_files.is_empty() {
            let author = commit.author();
            let commit_id = oid.to_string();
            let short_id = if commit_id.len() >= 7 {
                commit_id[..7].to_string()
            } else {
                commit_id.clone()
            };

            results.push(PickaxeSearchResult {
                commit_id,
                short_id,
                author_name: author.name().unwrap_or("Unknown").to_string(),
                author_email: author.email().unwrap_or("").to_string(),
                timestamp: commit.time().seconds(),
                summary: commit.summary().unwrap_or("").to_string(),
                matched_files,
            });
        }
    }

    Ok(results)
}
