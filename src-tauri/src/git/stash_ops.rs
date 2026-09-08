use git2::{DiffOptions, Repository};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::git::BranchInfo;
use crate::git::diff::{get_tree_blob_content, parse_git_diff, DiffLine, FileDiffDetail, HunkDiff, LineChangeType};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StashFileItem {
    pub path: String,
    pub old_path: Option<String>,
    pub status: String, // "modified" | "added" | "deleted" | "renamed" | "untracked"
    pub additions: usize,
    pub deletions: usize,
    pub is_untracked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StashDetail {
    pub index: usize,
    pub message: String,
    pub commit_id: String,
    pub branch_name: Option<String>,
    pub created_at: i64,
    pub files: Vec<StashFileItem>,
    pub total_additions: usize,
    pub total_deletions: usize,
}

/// Lấy thông tin chi tiết của một bản Stash tại `index`
pub fn get_stash_detail(repo: &mut Repository, target_index: usize) -> AppResult<StashDetail> {
    let mut found_oid: Option<git2::Oid> = None;
    let mut found_message = String::new();

    repo.stash_foreach(|idx, name, oid| {
        if idx == target_index {
            found_oid = Some(*oid);
            found_message = name.to_string();
            false
        } else {
            true
        }
    })?;

    let oid = found_oid.ok_or_else(|| {
        AppError::InvalidRepo(format!("Không tìm thấy bản Stash tại vị trí {}", target_index))
    })?;

    let stash_commit = repo.find_commit(oid)?;
    let created_at = stash_commit.time().seconds();

    // Phân tích tên nhánh gốc từ message (vd: "WIP on main: 1234567 ...")
    let branch_name = if let Some(rest) = found_message.strip_prefix("WIP on ") {
        rest.split(':').next().map(|s| s.trim().to_string())
    } else if let Some(rest) = found_message.strip_prefix("On ") {
        rest.split(':').next().map(|s| s.trim().to_string())
    } else {
        None
    };

    let mut files = Vec::new();
    let mut total_additions = 0;
    let mut total_deletions = 0;

    // 1. So sánh Base commit (parent 0) với Stash commit
    if stash_commit.parent_count() > 0 {
        let base_commit = stash_commit.parent(0)?;
        let base_tree = base_commit.tree()?;
        let stash_tree = stash_commit.tree()?;

        let mut diff_opts = DiffOptions::new();
        let diff = repo.diff_tree_to_tree(Some(&base_tree), Some(&stash_tree), Some(&mut diff_opts))?;

        let num_deltas = diff.deltas().len();
        for delta_idx in 0..num_deltas {
            let delta = match diff.get_delta(delta_idx) {
                Some(d) => d,
                None => continue,
            };

            let status = match delta.status() {
                git2::Delta::Added => "added",
                git2::Delta::Deleted => "deleted",
                git2::Delta::Modified => "modified",
                git2::Delta::Renamed => "renamed",
                git2::Delta::Copied => "copied",
                _ => "modified",
            };

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

            let (additions, deletions) = if let Ok(Some(patch)) = git2::Patch::from_diff(&diff, delta_idx) {
                let mut add = 0;
                let mut del = 0;
                for h in 0..patch.num_hunks() {
                    if let Ok((_, num_lines)) = patch.hunk(h) {
                        for l in 0..num_lines {
                            if let Ok(line) = patch.line_in_hunk(h, l) {
                                match line.origin() {
                                    '+' => add += 1,
                                    '-' => del += 1,
                                    _ => {}
                                }
                            }
                        }
                    }
                }
                (add, del)
            } else {
                (0, 0)
            };

            total_additions += additions;
            total_deletions += deletions;

            files.push(StashFileItem {
                path,
                old_path,
                status: status.to_string(),
                additions,
                deletions,
                is_untracked: false,
            });
        }
    }

    // 2. Thu thập Untracked files (nằm ở parent 2 nếu được stash kèm --include-untracked)
    if stash_commit.parent_count() >= 3 {
        if let Ok(untracked_commit) = stash_commit.parent(2) {
            if let Ok(untracked_tree) = untracked_commit.tree() {
                let mut untracked_files = Vec::new();
                let _ = untracked_tree.walk(git2::TreeWalkMode::PreOrder, |root, entry| {
                    if entry.kind() == Some(git2::ObjectType::Blob) {
                        let full_path = if root.is_empty() {
                            entry.name().unwrap_or("").to_string()
                        } else {
                            format!("{}{}", root, entry.name().unwrap_or(""))
                        };

                        if let Ok(blob) = entry.to_object(repo).and_then(|o| o.peel_to_blob()) {
                            let add = if blob.content().contains(&0) {
                                0
                            } else {
                                String::from_utf8_lossy(blob.content()).lines().count()
                            };

                            untracked_files.push(StashFileItem {
                                path: full_path,
                                old_path: None,
                                status: "untracked".to_string(),
                                additions: add,
                                deletions: 0,
                                is_untracked: true,
                            });
                        }
                    }
                    git2::TreeWalkResult::Ok
                });

                for uf in untracked_files {
                    total_additions += uf.additions;
                    files.push(uf);
                }
            }
        }
    }

    Ok(StashDetail {
        index: target_index,
        message: found_message,
        commit_id: oid.to_string(),
        branch_name,
        created_at,
        files,
        total_additions,
        total_deletions,
    })
}

/// Lấy diff chi tiết của 1 tệp trong Stash (tương thích Monaco Diff Editor)
pub fn get_stash_file_diff(
    repo: &mut Repository,
    target_index: usize,
    file_path: &str,
    ignore_whitespace: Option<bool>,
) -> AppResult<FileDiffDetail> {
    let mut found_oid: Option<git2::Oid> = None;

    repo.stash_foreach(|idx, _, oid| {
        if idx == target_index {
            found_oid = Some(*oid);
            false
        } else {
            true
        }
    })?;

    let oid = found_oid.ok_or_else(|| {
        AppError::InvalidRepo(format!("Không tìm thấy bản Stash tại vị trí {}", target_index))
    })?;

    let stash_commit = repo.find_commit(oid)?;

    // Kiểm tra xem tệp có nằm trong untracked commit (parent 2) hay không
    if stash_commit.parent_count() >= 3 {
        if let Ok(untracked_commit) = stash_commit.parent(2) {
            if let Ok(untracked_tree) = untracked_commit.tree() {
                if let Some(content) = get_tree_blob_content(repo, Some(&untracked_tree), file_path) {
                    let lines: Vec<DiffLine> = content
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
                        modified_content: Some(content),
                    });
                }
            }
        }
    }

    // Tệp thuộc tracked changes: so sánh giữa base_tree (parent 0) và stash_tree
    if stash_commit.parent_count() > 0 {
        let base_commit = stash_commit.parent(0)?;
        let base_tree = base_commit.tree()?;
        let stash_tree = stash_commit.tree()?;

        let mut diff_opts = DiffOptions::new();
        diff_opts.pathspec(file_path);
        diff_opts.context_lines(3);
        if ignore_whitespace.unwrap_or(false) {
            diff_opts.ignore_whitespace(true);
            diff_opts.ignore_whitespace_change(true);
            diff_opts.ignore_whitespace_eol(true);
        }

        let diff = repo.diff_tree_to_tree(Some(&base_tree), Some(&stash_tree), Some(&mut diff_opts))?;
        let orig = get_tree_blob_content(repo, Some(&base_tree), file_path).or_else(|| Some(String::new()));
        let modif = get_tree_blob_content(repo, Some(&stash_tree), file_path).or_else(|| Some(String::new()));

        parse_git_diff(&diff, file_path, false, orig, modif)
    } else {
        Err(AppError::InvalidRepo("Bản stash không có commit gốc.".to_string()))
    }
}

/// Tạo nhánh mới từ mốc stash và apply nội dung stash vào nhánh mới (`git stash branch <name> stash@{index}`)
pub fn stash_branch(repo: &mut Repository, target_index: usize, branch_name: &str) -> AppResult<BranchInfo> {
    let branch_name = branch_name.trim();
    if branch_name.is_empty() {
        return Err(AppError::Internal("Tên nhánh không được để trống.".to_string()));
    }

    let mut found_oid: Option<git2::Oid> = None;
    repo.stash_foreach(|idx, _, oid| {
        if idx == target_index {
            found_oid = Some(*oid);
            false
        } else {
            true
        }
    })?;

    let oid = found_oid.ok_or_else(|| {
        AppError::InvalidRepo(format!("Không tìm thấy bản Stash tại vị trí {}", target_index))
    })?;

    let stash_commit = repo.find_commit(oid)?;
    if stash_commit.parent_count() == 0 {
        return Err(AppError::InvalidRepo("Bản stash không có commit gốc để tạo nhánh.".to_string()));
    }

    let base_commit = stash_commit.parent(0)?;

    // 1. Tạo nhánh mới tại base commit
    repo.branch(branch_name, &base_commit, false)?;

    // 2. Checkout sang nhánh mới
    repo.set_head(&format!("refs/heads/{}", branch_name))?;
    let mut checkout_opts = git2::build::CheckoutBuilder::new();
    checkout_opts.safe();
    repo.checkout_head(Some(&mut checkout_opts))?;

    // 3. Apply stash lên nhánh mới
    repo.stash_apply(target_index, None)?;

    // 4. Drop stash sau khi apply thành công
    let _ = repo.stash_drop(target_index);

    Ok(BranchInfo {
        name: format!("refs/heads/{}", branch_name),
        shorthand: branch_name.to_string(),
        is_head: true,
        is_remote: false,
        upstream_name: None,
        ahead_count: 0,
        behind_count: 0,
        target_commit_id: base_commit.id().to_string(),
    })
}
