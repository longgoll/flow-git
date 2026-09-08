use std::collections::HashMap;
use git2::{DiffOptions, Oid, Repository, Revwalk, Sort};
use crate::error::{AppError, AppResult};
use super::{CommitDetail, CommitNode, FileChangeInfo, RefInfo, RefType};

pub fn get_topological_history(
    repo: &Repository,
    max_count: usize,
) -> AppResult<Vec<CommitNode>> {
    // 1. Build map of OID -> RefInfo
    let mut ref_map: HashMap<Oid, Vec<RefInfo>> = HashMap::new();
    
    let head_oid = repo.head().ok().and_then(|h| h.target());
    if let Some(h_oid) = head_oid {
        ref_map.entry(h_oid).or_default().push(RefInfo {
            name: "HEAD".to_string(),
            shorthand: "HEAD".to_string(),
            ref_type: RefType::Head,
            is_head: true,
        });
    }

    if let Ok(branches) = repo.branches(None) {
        for b_res in branches {
            if let Ok((branch, b_type)) = b_res {
                if let Some(target) = branch.get().target() {
                    let name = branch.name().ok().flatten().unwrap_or("").to_string();
                    let shorthand = branch.get().shorthand().unwrap_or(&name).to_string();
                    let is_head = head_oid == Some(target);
                    let ref_type = if b_type == git2::BranchType::Remote {
                        RefType::RemoteBranch
                    } else {
                        RefType::LocalBranch
                    };

                    // Avoid duplicate HEAD
                    if shorthand != "HEAD" {
                        ref_map.entry(target).or_default().push(RefInfo {
                            name,
                            shorthand,
                            ref_type,
                            is_head,
                        });
                    }
                }
            }
        }
    }

    if let Ok(tag_names) = repo.tag_names(None) {
        for name_opt in tag_names.iter().flatten() {
            let ref_name = format!("refs/tags/{}", name_opt);
            if let Ok(reference) = repo.find_reference(&ref_name) {
                let target = if let Some(t) = reference.target() {
                    Some(t)
                } else {
                    reference.peel_to_commit().ok().map(|c| c.id())
                };

                if let Some(t) = target {
                    ref_map.entry(t).or_default().push(RefInfo {
                        name: ref_name,
                        shorthand: name_opt.to_string(),
                        ref_type: RefType::Tag,
                        is_head: false,
                    });
                }
            }
        }
    }

    // 2. Setup Revwalk with TOPOLOGICAL + TIME sorting
    let mut revwalk: Revwalk = repo.revwalk()?;
    revwalk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME)?;

    // Push all references to walk all branches
    if let Ok(references) = repo.references() {
        for ref_res in references {
            if let Ok(reference) = ref_res {
                if reference.is_branch() || reference.is_remote() || reference.is_tag() {
                    if let Some(target) = reference.target() {
                        let _ = revwalk.push(target);
                    }
                }
            }
        }
    }

    // Also push HEAD specifically
    if let Some(h_oid) = head_oid {
        let _ = revwalk.push(h_oid);
    } else {
        let _ = revwalk.push_head();
    }

    // 3. Collect Raw Commits
    let limit = if max_count == 0 { usize::MAX } else { max_count };
    let mut raw_commits: Vec<(Oid, Vec<Oid>, String, String, String, i64)> = Vec::new();

    for oid_res in revwalk {
        if raw_commits.len() >= limit {
            break;
        }
        let oid = match oid_res {
            Ok(id) => id,
            Err(_) => continue,
        };

        if let Ok(commit) = repo.find_commit(oid) {
            let parents: Vec<Oid> = commit.parent_ids().collect();
            let author = commit.author();
            let author_name = author.name().unwrap_or("Unknown").to_string();
            let author_email = author.email().unwrap_or("").to_string();
            let summary = commit.summary().unwrap_or("").to_string();
            let timestamp = commit.time().seconds();

            raw_commits.push((oid, parents, author_name, author_email, summary, timestamp));
        }
    }

    // 4. Identify Trunk Tip and Lineage (main -> master -> develop -> remotes -> HEAD -> first commit)
    let trunk_tip = repo.find_branch("main", git2::BranchType::Local).ok()
        .or_else(|| repo.find_branch("master", git2::BranchType::Local).ok())
        .or_else(|| repo.find_branch("develop", git2::BranchType::Local).ok())
        .or_else(|| repo.find_branch("origin/main", git2::BranchType::Remote).ok())
        .or_else(|| repo.find_branch("origin/master", git2::BranchType::Remote).ok())
        .or_else(|| repo.find_branch("origin/develop", git2::BranchType::Remote).ok())
        .or_else(|| repo.find_branch("main", git2::BranchType::Remote).ok())
        .or_else(|| repo.find_branch("master", git2::BranchType::Remote).ok())
        .and_then(|b| b.get().target())
        .or(head_oid)
        .or_else(|| raw_commits.first().map(|c| c.0));

    let mut trunk_commits: std::collections::HashSet<Oid> = std::collections::HashSet::new();
    if let Some(mut curr_oid) = trunk_tip {
        while let Ok(commit) = repo.find_commit(curr_oid) {
            trunk_commits.insert(curr_oid);
            if commit.parent_count() > 0 {
                if let Ok(first_parent) = commit.parent_id(0) {
                    curr_oid = first_parent;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
    }

    // 5. Multi-lane Topological Routing with Metro Backbone (Lane 0 dedicated to Trunk)
    let mut active_lanes: Vec<Option<Oid>> = vec![None]; // Lane 0 reserved for trunk
    let mut result: Vec<CommitNode> = Vec::with_capacity(raw_commits.len());

    for (oid, parents, author_name, author_email, summary, timestamp) in raw_commits {
        let is_trunk = trunk_commits.contains(&oid);

        let lane_index = if is_trunk {
            0
        } else {
            // Find if this commit is already expected in an active lane (skip lane 0)
            let mut assigned_lane = None;
            for (i, lane_oid) in active_lanes.iter().enumerate().skip(1) {
                if *lane_oid == Some(oid) {
                    assigned_lane = Some(i);
                    break;
                }
            }

            match assigned_lane {
                Some(idx) => idx,
                None => {
                    // Find first free lane starting from index 1
                    let free_idx = active_lanes.iter().enumerate().skip(1).find(|(_, l)| l.is_none()).map(|(i, _)| i);
                    match free_idx {
                        Some(idx) => {
                            active_lanes[idx] = Some(oid);
                            idx
                        }
                        None => {
                            active_lanes.push(Some(oid));
                            active_lanes.len() - 1
                        }
                    }
                }
            }
        };

        // Clear any other lanes that were waiting for this commit (merge joins)
        for (i, lane_oid) in active_lanes.iter_mut().enumerate() {
            if i != lane_index && *lane_oid == Some(oid) {
                *lane_oid = None;
            }
        }

        // Update active lanes with parents
        if is_trunk {
            if parents.is_empty() {
                active_lanes[0] = None;
            } else {
                // First parent of trunk stays in lane 0
                active_lanes[0] = Some(parents[0]);

                // Secondary parents of trunk (merges into trunk) branch out to lane >= 1
                for &p_sec in &parents[1..] {
                    let already_tracked = active_lanes.iter().skip(1).any(|&l| l == Some(p_sec));
                    if !already_tracked {
                        let free_slot = active_lanes.iter().enumerate().skip(1).find(|(_, l)| l.is_none()).map(|(i, _)| i);
                        match free_slot {
                            Some(s) => active_lanes[s] = Some(p_sec),
                            None => active_lanes.push(Some(p_sec)),
                        }
                    }
                }
            }
        } else {
            // Non-trunk commit
            if parents.is_empty() {
                active_lanes[lane_index] = None;
            } else {
                let p1 = parents[0];
                if trunk_commits.contains(&p1) {
                    // Forked from trunk: branch lane terminates here (joins trunk backbone)
                    active_lanes[lane_index] = None;
                } else {
                    active_lanes[lane_index] = Some(p1);
                }

                for &p_sec in &parents[1..] {
                    if !trunk_commits.contains(&p_sec) {
                        let already_tracked = active_lanes.iter().skip(1).any(|&l| l == Some(p_sec));
                        if !already_tracked {
                            let free_slot = active_lanes.iter().enumerate().skip(1).find(|(_, l)| l.is_none()).map(|(i, _)| i);
                            match free_slot {
                                Some(s) => active_lanes[s] = Some(p_sec),
                                None => active_lanes.push(Some(p_sec)),
                            }
                        }
                    }
                }
            }
        }

        // Trim trailing None lanes from end of active_lanes (compaction, keep at least lane 0)
        while active_lanes.len() > 1 && active_lanes.last() == Some(&None) {
            active_lanes.pop();
        }

        let refs = ref_map.remove(&oid).unwrap_or_default();
        let short_id = if oid.to_string().len() >= 7 {
            oid.to_string()[..7].to_string()
        } else {
            oid.to_string()
        };

        result.push(CommitNode {
            id: oid.to_string(),
            short_id,
            parents: parents.iter().map(|p| p.to_string()).collect(),
            author_name,
            author_email,
            summary,
            timestamp,
            lane: lane_index,
            refs,
            is_trunk,
        });
    }

    Ok(result)
}

pub fn get_commit_detail(repo: &Repository, commit_id: &str) -> AppResult<CommitDetail> {
    let oid = Oid::from_str(commit_id)
        .map_err(|e| AppError::InvalidRepo(format!("Invalid commit hash: {}", e)))?;
    let commit = repo.find_commit(oid)?;

    let author = commit.author();
    let committer = commit.committer();

    let mut files_changed = Vec::new();
    let current_tree = commit.tree()?;

    let parent_count = commit.parent_count();
    let diff = if parent_count > 0 {
        let parent = commit.parent(0)?;
        let parent_tree = parent.tree()?;
        let mut diff_opts = DiffOptions::new();
        repo.diff_tree_to_tree(Some(&parent_tree), Some(&current_tree), Some(&mut diff_opts))?
    } else {
        let mut diff_opts = DiffOptions::new();
        repo.diff_tree_to_tree(None, Some(&current_tree), Some(&mut diff_opts))?
    };

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
            git2::Delta::Ignored => "ignored",
            git2::Delta::Untracked => "untracked",
            git2::Delta::Typechange => "typechange",
            _ => "modified",
        };

        let path = delta.new_file().path()
            .or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        let old_path = if delta.status() == git2::Delta::Renamed {
            delta.old_file().path().map(|p| p.to_string_lossy().to_string())
        } else {
            None
        };

        let (additions, deletions) = if let Ok(Some(patch)) = git2::Patch::from_diff(&diff, delta_idx) {
            patch.line_stats().map(|(_, adds, dels)| (adds, dels)).unwrap_or((0, 0))
        } else {
            (0, 0)
        };

        files_changed.push(FileChangeInfo {
            path,
            old_path,
            status: status.to_string(),
            additions,
            deletions,
        });
    }

    let parents = commit.parent_ids().map(|p| p.to_string()).collect();
    let short_id = if commit_id.len() >= 7 {
        commit_id[..7].to_string()
    } else {
        commit_id.to_string()
    };

    let signature_info = crate::git::signing::get_commit_signature(repo, commit_id).ok();

    Ok(CommitDetail {
        id: commit_id.to_string(),
        short_id,
        parents,
        author_name: author.name().unwrap_or("Unknown").to_string(),
        author_email: author.email().unwrap_or("").to_string(),
        author_timestamp: author.when().seconds(),
        committer_name: committer.name().unwrap_or("Unknown").to_string(),
        committer_email: committer.email().unwrap_or("").to_string(),
        committer_timestamp: committer.when().seconds(),
        message: commit.message().unwrap_or("").to_string(),
        files_changed,
        signature_info,
    })
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PaginatedCommitHistory {
    pub commits: Vec<CommitNode>,
    pub total_count: usize,
    pub skip: usize,
    pub limit: usize,
    pub has_more: bool,
}

pub fn get_paginated_commit_history(
    repo: &Repository,
    skip: usize,
    limit: usize,
) -> AppResult<PaginatedCommitHistory> {
    let effective_limit = if limit == 0 { 500 } else { limit };
    // Fetch up to skip + effective_limit + 1 to determine has_more
    let max_to_fetch = skip + effective_limit + 1;
    let all_fetched = get_topological_history(repo, max_to_fetch)?;
    let total_fetched = all_fetched.len();

    let has_more = total_fetched > skip + effective_limit;
    let end_idx = std::cmp::min(skip + effective_limit, total_fetched);
    
    let commits = if skip < total_fetched {
        all_fetched[skip..end_idx].to_vec()
    } else {
        Vec::new()
    };

    Ok(PaginatedCommitHistory {
        commits,
        total_count: total_fetched,
        skip,
        limit: effective_limit,
        has_more,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use git2::{Repository, Signature};
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_topological_history_and_lanes() {
        let temp_dir = tempfile::tempdir().unwrap();
        let repo = Repository::init(temp_dir.path()).unwrap();

        let sig = Signature::now("FlowGit Tester", "tester@flowgit.local").unwrap();

        // 1. First commit
        let file_path = temp_dir.path().join("README.md");
        {
            let mut f = File::create(&file_path).unwrap();
            writeln!(f, "# Test Repo").unwrap();
        }

        let mut index = repo.index().unwrap();
        index.add_path(std::path::Path::new("README.md")).unwrap();
        index.write().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();

        let c1_id = repo
            .commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[])
            .unwrap();

        // 2. Second commit on main
        {
            let mut f = File::create(&file_path).unwrap();
            writeln!(f, "# Test Repo\nSecond line").unwrap();
        }
        index.add_path(std::path::Path::new("README.md")).unwrap();
        index.write().unwrap();
        let tree_id2 = index.write_tree().unwrap();
        let tree2 = repo.find_tree(tree_id2).unwrap();
        let c1 = repo.find_commit(c1_id).unwrap();

        let c2_id = repo
            .commit(Some("HEAD"), &sig, &sig, "Second commit", &tree2, &[&c1])
            .unwrap();

        // 3. Create feature branch from c1
        let branch = repo.branch("feature", &c1, false).unwrap();
        assert_eq!(branch.get().target().unwrap(), c1_id);

        let commits = get_topological_history(&repo, 50).unwrap();
        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].id, c2_id.to_string());
        assert_eq!(commits[1].id, c1_id.to_string());
        assert_eq!(commits[0].lane, 0);
    }
}

