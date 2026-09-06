use git2::{BranchType, Repository, build::CheckoutBuilder};
use crate::error::{AppError, AppResult};
use super::{BranchInfo, StashInfo, TagInfo};

pub fn get_all_branches(repo: &Repository) -> AppResult<Vec<BranchInfo>> {
    let mut branch_infos = Vec::new();
    let head_ref_name = repo.head().ok().and_then(|h| h.name().map(|s| s.to_string()));

    let branches = repo.branches(None)?;
    for branch_res in branches {
        let (branch, branch_type) = branch_res?;
        let name = match branch.name()? {
            Some(n) => n.to_string(),
            None => continue,
        };

        let is_remote = branch_type == BranchType::Remote;
        let is_head = if let Some(ref h_name) = head_ref_name {
            if let Some(b_name) = branch.get().name() {
                b_name == h_name
            } else {
                false
            }
        } else {
            false
        };

        let shorthand = branch.get().shorthand().unwrap_or(&name).to_string();
        let target_commit_id = match branch.get().target() {
            Some(oid) => oid.to_string(),
            None => match branch.get().peel_to_commit() {
                Ok(c) => c.id().to_string(),
                Err(_) => continue,
            },
        };

        let mut upstream_name = None;
        let mut ahead_count = 0;
        let mut behind_count = 0;

        if !is_remote {
            if let Ok(upstream) = branch.upstream() {
                if let Ok(Some(up_name)) = upstream.name() {
                    upstream_name = Some(up_name.to_string());
                }

                if let (Some(local_oid), Some(up_oid)) = (branch.get().target(), upstream.get().target()) {
                    if let Ok((ahead, behind)) = repo.graph_ahead_behind(local_oid, up_oid) {
                        ahead_count = ahead;
                        behind_count = behind;
                    }
                }
            }
        }

        branch_infos.push(BranchInfo {
            name,
            shorthand,
            is_remote,
            is_head,
            target_commit_id,
            upstream_name,
            ahead_count,
            behind_count,
        });
    }

    // Sort: Local branches first (HEAD first), then remotes
    branch_infos.sort_by(|a, b| {
        if a.is_head != b.is_head {
            return b.is_head.cmp(&a.is_head);
        }
        if a.is_remote != b.is_remote {
            return a.is_remote.cmp(&b.is_remote);
        }
        a.name.cmp(&b.name)
    });

    Ok(branch_infos)
}

pub fn get_all_tags(repo: &Repository) -> AppResult<Vec<TagInfo>> {
    let mut tags = Vec::new();
    let tag_names = repo.tag_names(None)?;

    for name_opt in tag_names.iter() {
        let name = match name_opt {
            Some(n) => n.to_string(),
            None => continue,
        };

        let ref_name = format!("refs/tags/{}", name);
        if let Ok(reference) = repo.find_reference(&ref_name) {
            let target_commit_id = if let Some(target) = reference.target() {
                target.to_string()
            } else if let Ok(obj) = reference.peel_to_commit() {
                obj.id().to_string()
            } else {
                continue;
            };

            let message = reference.peel_to_tag().ok().and_then(|t| t.message().map(|m| m.to_string()));

            tags.push(TagInfo {
                name,
                target_commit_id,
                message,
            });
        }
    }

    Ok(tags)
}

pub fn get_all_stashes(repo: &mut Repository) -> AppResult<Vec<StashInfo>> {
    let mut stashes = Vec::new();
    
    repo.stash_foreach(|index, name, oid| {
        stashes.push(StashInfo {
            index,
            message: name.to_string(),
            commit_id: oid.to_string(),
        });
        true
    })?;

    Ok(stashes)
}

pub fn delete_branch(repo: &Repository, branch_name: &str, is_remote: bool) -> AppResult<()> {
    let clean_name = branch_name
        .trim_start_matches("refs/heads/")
        .trim_start_matches("refs/remotes/")
        .to_lowercase();
    
    // Extract base name if contains remote prefix like "origin/main"
    let base_name = if let Some((_, rest)) = clean_name.split_once('/') {
        rest
    } else {
        &clean_name
    };

    if base_name == "head" {
        return Err(AppError::Internal(
            "Không thể xóa tham chiếu HEAD.".to_string(),
        ));
    }

    let branch_type = if is_remote {
        BranchType::Remote
    } else {
        BranchType::Local
    };
    let mut branch = repo.find_branch(branch_name, branch_type)?;
    if branch.is_head() {
        return Err(AppError::Internal(
            "Không thể xóa nhánh đang hoạt động (HEAD). Vui lòng chuyển sang nhánh khác trước khi xóa.".to_string(),
        ));
    }
    branch.delete()?;
    Ok(())
}

/// Tạo nhánh mới từ một commit/ref cụ thể.
/// `from_ref`: tên commit SHA hoặc tên nhánh cục bộ (vd "main", "abc1234").
/// `checkout`: nếu true thì checkout ngay sang nhánh mới.
pub fn create_branch(repo: &Repository, new_name: &str, from_ref: &str, checkout: bool) -> AppResult<()> {
    // Validate tên nhánh
    let new_name = new_name.trim();
    if new_name.is_empty() {
        return Err(AppError::Internal("Tên nhánh không được để trống.".to_string()));
    }
    if new_name.contains(' ') || new_name.contains("..") || new_name.starts_with('-') {
        return Err(AppError::Internal(format!(
            "Tên nhánh '{}' không hợp lệ. Không được có khoảng trắng, '..' hoặc bắt đầu bằng '-'.",
            new_name
        )));
    }

    // Tìm commit để bắt đầu nhánh
    let obj = repo.revparse_single(from_ref).map_err(|_| {
        AppError::Internal(format!("Không tìm thấy ref '{}' trong repository.", from_ref))
    })?;
    let commit = obj.peel_to_commit().map_err(|_| {
        AppError::Internal(format!("'{}' không phải là một commit hợp lệ.", from_ref))
    })?;

    // Kiểm tra nhánh đã tồn tại chưa
    if repo.find_branch(new_name, BranchType::Local).is_ok() {
        return Err(AppError::Internal(format!(
            "Nhánh '{}' đã tồn tại. Vui lòng chọn tên khác.",
            new_name
        )));
    }

    // Tạo nhánh
    let branch = repo.branch(new_name, &commit, false)?;

    // Checkout nếu cần
    if checkout {
        let ref_name = branch.get().name().ok_or_else(|| {
            AppError::Internal("Không thể lấy tên ref của nhánh vừa tạo.".to_string())
        })?;
        let obj = repo.revparse_single(ref_name)?;
        repo.checkout_tree(&obj, Some(CheckoutBuilder::default().safe()))?;
        repo.set_head(ref_name)?;
    }

    Ok(())
}

/// Checkout sang một nhánh local đã tồn tại.
pub fn checkout_branch(repo: &Repository, branch_name: &str) -> AppResult<()> {
    let branch = repo.find_branch(branch_name, BranchType::Local).map_err(|_| {
        AppError::Internal(format!("Không tìm thấy nhánh local '{}'.", branch_name))
    })?;

    let ref_name = branch.get().name().ok_or_else(|| {
        AppError::Internal("Không thể lấy tên ref của nhánh.".to_string())
    })?;

    let obj = repo.revparse_single(ref_name)?;
    repo.checkout_tree(&obj, Some(CheckoutBuilder::default().safe()))?;
    repo.set_head(ref_name)?;

    Ok(())
}

/// Đổi tên một nhánh local.
pub fn rename_branch(repo: &Repository, old_name: &str, new_name: &str) -> AppResult<()> {
    let mut branch = repo.find_branch(old_name, BranchType::Local).map_err(|_| {
        AppError::Internal(format!("Không tìm thấy nhánh '{}'.", old_name))
    })?;
    branch.rename(new_name, false).map_err(|e| {
        AppError::Internal(format!("Không thể đổi tên nhánh sang '{}': {e}", new_name))
    })?;
    Ok(())
}

/// Lấy danh sách các nhánh local đã được merge hoàn toàn vào base branch (mặc định main / master).
pub fn get_merged_branches(repo: &Repository, base_branch: Option<&str>) -> AppResult<Vec<String>> {
    let base_candidates = match base_branch {
        Some(b) => vec![b.to_string()],
        None => vec!["main".to_string(), "master".to_string(), "develop".to_string()],
    };

    let mut base_oid_opt = None;
    for cand in &base_candidates {
        if let Ok(b) = repo.find_branch(cand, BranchType::Local).or_else(|_| repo.find_branch(cand, BranchType::Remote)) {
            if let Some(target) = b.get().target() {
                base_oid_opt = Some(target);
                break;
            }
        }
    }

    let base_oid = match base_oid_opt {
        Some(oid) => oid,
        None => return Ok(vec![]),
    };

    let current_head_name = repo.head().ok().and_then(|h| h.shorthand().map(|s| s.to_string()));
    let protected = ["main", "master", "develop", "dev", "trunk", "release"];

    let mut merged = Vec::new();
    let branches = repo.branches(Some(BranchType::Local))?;
    for b_res in branches {
        let (branch, _) = b_res?;
        let shorthand = branch.name()?.unwrap_or("").to_string();
        if protected.contains(&shorthand.as_str()) || Some(&shorthand) == current_head_name.as_ref() {
            continue;
        }

        if let Some(target_oid) = branch.get().target() {
            if target_oid == base_oid || repo.graph_descendant_of(base_oid, target_oid).unwrap_or(false) {
                merged.push(shorthand);
            }
        }
    }

    Ok(merged)
}

/// Xóa hàng loạt các nhánh đã được merge an toàn.
pub fn delete_merged_branches(repo: &Repository, branch_names: &[String]) -> AppResult<usize> {
    let mut count = 0;
    let protected = ["main", "master", "develop", "dev", "trunk", "release"];
    let current_head_name = repo.head().ok().and_then(|h| h.shorthand().map(|s| s.to_string()));

    for name in branch_names {
        if protected.contains(&name.as_str()) || Some(name) == current_head_name.as_ref() {
            continue;
        }
        if let Ok(mut branch) = repo.find_branch(name, BranchType::Local) {
            if branch.delete().is_ok() {
                count += 1;
            }
        }
    }
    Ok(count)
}

