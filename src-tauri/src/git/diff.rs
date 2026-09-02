use std::path::Path;
use git2::{ApplyLocation, Diff, DiffOptions, Repository};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LineChangeType {
    Context,
    Addition,
    Deletion,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffLine {
    pub line_type: LineChangeType,
    pub content: String,
    pub old_lineno: Option<u32>,
    pub new_lineno: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HunkDiff {
    pub hunk_index: usize,
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub header: String,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDiffDetail {
    pub path: String,
    pub old_path: Option<String>,
    pub is_staged: bool,
    pub is_binary: bool,
    pub additions: usize,
    pub deletions: usize,
    pub hunks: Vec<HunkDiff>,
    pub original_content: Option<String>,
    pub modified_content: Option<String>,
}

fn get_tree_blob_content(repo: &Repository, tree: Option<&git2::Tree>, file_path: &str) -> Option<String> {
    let tree = tree?;
    let entry = tree.get_path(Path::new(file_path)).ok()?;
    let obj = entry.to_object(repo).ok()?;
    let blob = obj.peel_to_blob().ok()?;
    if blob.content().contains(&0) {
        return None;
    }
    Some(String::from_utf8_lossy(blob.content()).to_string())
}

fn get_index_blob_content(repo: &Repository, file_path: &str) -> Option<String> {
    let index = repo.index().ok()?;
    let entry = index.get_path(Path::new(file_path), 0)?;
    let blob = repo.find_blob(entry.id).ok()?;
    if blob.content().contains(&0) {
        return None;
    }
    Some(String::from_utf8_lossy(blob.content()).to_string())
}

pub fn get_working_tree_file_diff(
    repo: &Repository,
    file_path: &str,
    staged: bool,
    ignore_whitespace: Option<bool>,
) -> AppResult<FileDiffDetail> {
    let mut diff_opts = DiffOptions::new();
    diff_opts.pathspec(file_path);
    diff_opts.context_lines(3);
    if ignore_whitespace.unwrap_or(false) {
        diff_opts.ignore_whitespace(true);
        diff_opts.ignore_whitespace_change(true);
        diff_opts.ignore_whitespace_eol(true);
    }

    let (diff, original_content, modified_content) = if staged {
        let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
        let index = repo.index()?;
        let orig = get_tree_blob_content(repo, head_tree.as_ref(), file_path).or_else(|| Some(String::new()));
        let modif = get_index_blob_content(repo, file_path).or_else(|| Some(String::new()));
        (repo.diff_tree_to_index(head_tree.as_ref(), Some(&index), Some(&mut diff_opts))?, orig, modif)
    } else {
        // First check if it's an untracked file
        let workdir = repo.workdir().ok_or_else(|| AppError::Internal("No workdir in bare repo".into()))?;
        let full_path = workdir.join(file_path);

        let index = repo.index()?;
        let in_index = index.get_path(Path::new(file_path), 0).is_some();

        if !in_index && full_path.exists() && full_path.is_dir() {
            return Ok(FileDiffDetail {
                path: file_path.to_string(),
                old_path: None,
                is_staged: false,
                is_binary: false,
                additions: 0,
                deletions: 0,
                hunks: vec![HunkDiff {
                    hunk_index: 0,
                    old_start: 0,
                    old_lines: 0,
                    new_start: 1,
                    new_lines: 1,
                    header: "@@ Directory @@".into(),
                    lines: vec![DiffLine {
                        line_type: LineChangeType::Addition,
                        content: format!("Thư mục chưa theo dõi: {}", file_path),
                        old_lineno: None,
                        new_lineno: Some(1),
                    }],
                }],
                original_content: Some(String::new()),
                modified_content: Some(format!("Thư mục chưa theo dõi: {}", file_path)),
            });
        }

        if !in_index && full_path.exists() && full_path.is_file() {
            // Untracked file: create diff from empty buffer to file content
            let content = std::fs::read(&full_path).unwrap_or_default();
            let is_binary = content.contains(&0);
            if is_binary {
                return Ok(FileDiffDetail {
                    path: file_path.to_string(),
                    old_path: None,
                    is_staged: false,
                    is_binary: true,
                    additions: 0,
                    deletions: 0,
                    hunks: Vec::new(),
                    original_content: None,
                    modified_content: None,
                });
            }

            let text = String::from_utf8_lossy(&content).to_string();
            let lines: Vec<DiffLine> = text
                .lines()
                .enumerate()
                .map(|(idx, line)| DiffLine {
                    line_type: LineChangeType::Addition,
                    content: line.to_string(),
                    old_lineno: None,
                    new_lineno: Some((idx + 1) as u32),
                })
                .collect();

            let count = lines.len();
            let hunk = HunkDiff {
                hunk_index: 0,
                old_start: 0,
                old_lines: 0,
                new_start: 1,
                new_lines: count as u32,
                header: format!("@@ -0,0 +1,{count} @@"),
                lines,
            };

            return Ok(FileDiffDetail {
                path: file_path.to_string(),
                old_path: None,
                is_staged: false,
                is_binary: false,
                additions: count,
                deletions: 0,
                hunks: vec![hunk],
                original_content: Some(String::new()),
                modified_content: Some(text),
            });
        }

        let orig = get_index_blob_content(repo, file_path)
            .or_else(|| get_tree_blob_content(repo, repo.head().ok().and_then(|h| h.peel_to_tree().ok()).as_ref(), file_path))
            .or_else(|| Some(String::new()));

        let modif = if full_path.exists() && full_path.is_file() {
            let bytes = std::fs::read(&full_path).unwrap_or_default();
            if bytes.contains(&0) {
                None
            } else {
                Some(String::from_utf8_lossy(&bytes).to_string())
            }
        } else {
            Some(String::new())
        };

        (repo.diff_index_to_workdir(Some(&index), Some(&mut diff_opts))?, orig, modif)
    };

    parse_git_diff(&diff, file_path, staged, original_content, modified_content)
}

pub fn parse_git_diff(
    diff: &Diff,
    file_path: &str,
    staged: bool,
    original_content: Option<String>,
    modified_content: Option<String>,
) -> AppResult<FileDiffDetail> {
    let mut hunks: Vec<HunkDiff> = Vec::new();
    let mut additions = 0;
    let mut deletions = 0;
    let mut is_binary = false;
    let mut old_path: Option<String> = None;

    let num_deltas = diff.deltas().len();
    for delta_idx in 0..num_deltas {
        let delta = diff.get_delta(delta_idx).ok_or_else(|| AppError::Internal("Delta not found".into()))?;
        if delta.flags().contains(git2::DiffFlags::BINARY) {
            is_binary = true;
        }
        if let Some(p) = delta.old_file().path() {
            let p_str = p.to_string_lossy().to_string();
            if p_str != file_path && !p_str.is_empty() {
                old_path = Some(p_str);
            }
        }

        if let Ok(Some(patch)) = git2::Patch::from_diff(diff, delta_idx) {
            for h_idx in 0..patch.num_hunks() {
                let (hunk, num_lines) = patch.hunk(h_idx)?;
                let header = String::from_utf8_lossy(hunk.header()).trim().to_string();
                let mut lines = Vec::new();

                for l_idx in 0..num_lines {
                    let line = patch.line_in_hunk(h_idx, l_idx)?;
                    let line_type = match line.origin() {
                        '+' => {
                            additions += 1;
                            LineChangeType::Addition
                        }
                        '-' => {
                            deletions += 1;
                            LineChangeType::Deletion
                        }
                        _ => LineChangeType::Context,
                    };
                    let content = String::from_utf8_lossy(line.content())
                        .trim_end_matches(&['\r', '\n'][..])
                        .to_string();

                    lines.push(DiffLine {
                        line_type,
                        content,
                        old_lineno: line.old_lineno(),
                        new_lineno: line.new_lineno(),
                    });
                }

                hunks.push(HunkDiff {
                    hunk_index: hunks.len(),
                    old_start: hunk.old_start(),
                    old_lines: hunk.old_lines(),
                    new_start: hunk.new_start(),
                    new_lines: hunk.new_lines(),
                    header,
                    lines,
                });
            }
        }
    }

    Ok(FileDiffDetail {
        path: file_path.to_string(),
        old_path,
        is_staged: staged,
        is_binary,
        additions,
        deletions,
        hunks,
        original_content,
        modified_content,
    })
}

pub fn stage_file(repo: &Repository, file_path: &str) -> AppResult<()> {
    let mut index = repo.index()?;
    let path = Path::new(file_path);
    let workdir = repo.workdir().ok_or_else(|| AppError::Internal("No workdir".into()))?;
    let full_path = workdir.join(path);

    if full_path.exists() {
        if full_path.is_dir() {
            let clean_path = file_path.trim_end_matches('/');
            let pattern = format!("{}/*", clean_path);
            index.add_all([pattern], git2::IndexAddOption::DEFAULT, None)?;
        } else {
            index.add_path(path)?;
        }
    } else {
        index.remove_path(path)?;
    }
    index.write()?;
    Ok(())
}

pub fn unstage_file(repo: &Repository, file_path: &str) -> AppResult<()> {
    let path = Path::new(file_path);
    let mut index = repo.index()?;

    if let Ok(head) = repo.head().and_then(|h| h.peel_to_commit()) {
        let tree = head.tree()?;
        if let Ok(entry) = tree.get_path(path) {
            index.add(&git2::IndexEntry {
                ctime: git2::IndexTime::new(0, 0),
                mtime: git2::IndexTime::new(0, 0),
                dev: 0,
                ino: 0,
                mode: entry.filemode() as u32,
                uid: 0,
                gid: 0,
                file_size: 0,
                id: entry.id(),
                flags: 0,
                flags_extended: 0,
                path: file_path.as_bytes().to_vec(),
            })?;
        } else {
            let _ = index.remove_path(path);
        }
    } else {
        // Initial commit state (no HEAD) -> remove from index
        let _ = index.remove_path(path);
    }

    index.write()?;
    Ok(())
}

pub fn stage_all(repo: &Repository) -> AppResult<()> {
    let mut index = repo.index()?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.update_all(["*"].iter(), None)?;
    index.write()?;
    Ok(())
}

pub fn unstage_all(repo: &Repository) -> AppResult<()> {
    if let Ok(head) = repo.head().and_then(|h| h.peel_to_commit()) {
        repo.reset_default(Some(&head.into_object()), &["*"])?;
    } else {
        let mut index = repo.index()?;
        index.clear()?;
        index.write()?;
    }
    Ok(())
}

pub fn stage_hunk(repo: &Repository, file_path: &str, hunk_index: usize) -> AppResult<()> {
    let mut diff_opts = DiffOptions::new();
    diff_opts.pathspec(file_path);
    diff_opts.context_lines(3);

    let index = repo.index()?;
    let diff = repo.diff_index_to_workdir(Some(&index), Some(&mut diff_opts))?;

    // Generate patch
    let patch_opt = git2::Patch::from_diff(&diff, 0)?;
    let patch = match patch_opt {
        Some(p) => p,
        None => return Err(AppError::NotFound("No patch found for file".into())),
    };

    if hunk_index >= patch.num_hunks() {
        return Err(AppError::NotFound(format!("Hunk index {hunk_index} out of bounds")));
    }

    let (hunk, _) = patch.hunk(hunk_index)?;
    let mut patch_text = format!("--- a/{file_path}\n+++ b/{file_path}\n");
    patch_text.push_str(&String::from_utf8_lossy(hunk.header()));

    for line_idx in 0..patch.num_lines_in_hunk(hunk_index).unwrap_or(0) {
        let line = patch.line_in_hunk(hunk_index, line_idx)?;
        let origin = line.origin();
        let content = String::from_utf8_lossy(line.content());
        patch_text.push(origin);
        patch_text.push_str(&content);
    }

    let custom_diff = Diff::from_buffer(patch_text.as_bytes())?;
    repo.apply(&custom_diff, ApplyLocation::Index, None)?;

    let mut index = repo.index()?;
    index.write()?;

    Ok(())
}

pub fn unstage_hunk(repo: &Repository, file_path: &str, hunk_index: usize) -> AppResult<()> {
    let mut diff_opts = DiffOptions::new();
    diff_opts.pathspec(file_path);
    diff_opts.context_lines(3);

    let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
    let index = repo.index()?;
    let diff = repo.diff_tree_to_index(head_tree.as_ref(), Some(&index), Some(&mut diff_opts))?;

    let patch_opt = git2::Patch::from_diff(&diff, 0)?;
    let patch = match patch_opt {
        Some(p) => p,
        None => return Err(AppError::NotFound("No patch found for file in index".into())),
    };

    if hunk_index >= patch.num_hunks() {
        return Err(AppError::NotFound(format!("Hunk index {hunk_index} out of bounds")));
    }

    let (hunk, _) = patch.hunk(hunk_index)?;
    
    // Reverse patch to revert index back
    let mut patch_text = format!("--- a/{file_path}\n+++ b/{file_path}\n");
    patch_text.push_str(&format!("@@ -{},{} +{},{} @@\n", hunk.new_start(), hunk.new_lines(), hunk.old_start(), hunk.old_lines()));

    for line_idx in 0..patch.num_lines_in_hunk(hunk_index).unwrap_or(0) {
        let line = patch.line_in_hunk(hunk_index, line_idx)?;
        let origin = line.origin();
        let content = String::from_utf8_lossy(line.content());
        let rev_origin = match origin {
            '+' => '-',
            '-' => '+',
            other => other,
        };
        patch_text.push(rev_origin);
        patch_text.push_str(&content);
    }

    let custom_diff = Diff::from_buffer(patch_text.as_bytes())?;
    repo.apply(&custom_diff, ApplyLocation::Index, None)?;

    let mut index = repo.index()?;
    index.write()?;

    Ok(())
}

pub fn get_commit_file_diff(
    repo: &Repository,
    commit_id: &str,
    file_path: &str,
    ignore_whitespace: Option<bool>,
) -> AppResult<FileDiffDetail> {
    let oid = git2::Oid::from_str(commit_id)
        .map_err(|e| AppError::InvalidRepo(format!("Invalid commit hash: {}", e)))?;
    let commit = repo.find_commit(oid)?;
    let current_tree = commit.tree()?;

    let mut diff_opts = DiffOptions::new();
    diff_opts.pathspec(file_path);
    diff_opts.context_lines(3);
    if ignore_whitespace.unwrap_or(false) {
        diff_opts.ignore_whitespace(true);
        diff_opts.ignore_whitespace_change(true);
        diff_opts.ignore_whitespace_eol(true);
    }

    let (diff, original_content, modified_content) = if commit.parent_count() > 0 {
        let parent = commit.parent(0)?;
        let parent_tree = parent.tree()?;
        let orig = get_tree_blob_content(repo, Some(&parent_tree), file_path).or_else(|| Some(String::new()));
        let modif = get_tree_blob_content(repo, Some(&current_tree), file_path).or_else(|| Some(String::new()));
        (
            repo.diff_tree_to_tree(Some(&parent_tree), Some(&current_tree), Some(&mut diff_opts))?,
            orig,
            modif,
        )
    } else {
        let modif = get_tree_blob_content(repo, Some(&current_tree), file_path).or_else(|| Some(String::new()));
        (
            repo.diff_tree_to_tree(None, Some(&current_tree), Some(&mut diff_opts))?,
            Some(String::new()),
            modif,
        )
    };

    parse_git_diff(&diff, file_path, false, original_content, modified_content)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use git2::Signature;

    #[test]
    fn test_stage_and_diff() {
        let dir = tempdir().unwrap();
        let repo = Repository::init(dir.path()).unwrap();
        let file_path = dir.path().join("code.rs");

        // 1. Initial commit
        std::fs::write(&file_path, "fn hello() {}\n").unwrap();
        let sig = Signature::now("Tester", "test@flowgit.local").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("code.rs")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "init", &tree, &[]).unwrap();

        // 2. Modify file
        std::fs::write(&file_path, "fn hello() {\n    println!(\"world\");\n}\n").unwrap();

        // Check unstaged diff
        let diff_detail = get_working_tree_file_diff(&repo, "code.rs", false, None).unwrap();
        assert_eq!(diff_detail.path, "code.rs");
        assert_eq!(diff_detail.is_staged, false);
        assert!(diff_detail.hunks.len() > 0);

        // 3. Stage file
        stage_file(&repo, "code.rs").unwrap();

        // Check staged diff
        let staged_diff = get_working_tree_file_diff(&repo, "code.rs", true, None).unwrap();
        assert_eq!(staged_diff.is_staged, true);
        assert!(staged_diff.hunks.len() > 0);

        // 4. Unstage file
        unstage_file(&repo, "code.rs").unwrap();
        let staged_after = get_working_tree_file_diff(&repo, "code.rs", true, None).unwrap();
        assert_eq!(staged_after.hunks.len(), 0);
    }
}
