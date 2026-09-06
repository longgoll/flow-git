use git2::{BranchType, Oid, Repository, Revwalk, Sort};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use super::{CommitNode, RefInfo, RefType};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusBranchResult {
    pub branch_name: String,
    pub base_branch: String,
    pub ahead_count: usize,
    pub behind_count: usize,
    pub base_commit_id: String,
    pub head_commit_id: String,
    pub commits: Vec<CommitNode>,
}

pub fn get_focus_branch_info(
    repo: &Repository,
    requested_branch: Option<&str>,
    requested_base: Option<&str>,
) -> AppResult<FocusBranchResult> {
    // 1. Determine current branch and head commit
    let (branch_name, head_oid) = if let Some(b_name) = requested_branch {
        let branch = repo.find_branch(b_name, BranchType::Local)
            .or_else(|_| repo.find_branch(b_name, BranchType::Remote))?;
        let target = branch.get().target().ok_or_else(|| AppError::InvalidRepo("Branch has no target commit".into()))?;
        (b_name.to_string(), target)
    } else {
        let head = repo.head()?;
        let shorthand = head.shorthand().unwrap_or("HEAD").to_string();
        let target = head.target().ok_or_else(|| AppError::InvalidRepo("HEAD has no target".into()))?;
        (shorthand, target)
    };

    // 2. Find a suitable base branch (requested_base, or upstream, or main/master, or origin/main)
    let mut base_branch_name = "main".to_string();
    let mut base_oid_opt: Option<Oid> = None;

    // Check explicitly requested base first
    if let Some(req_base) = requested_base {
        if let Ok(branch) = repo.find_branch(req_base, BranchType::Local).or_else(|_| repo.find_branch(req_base, BranchType::Remote)) {
            if let Some(target) = branch.get().target() {
                base_branch_name = req_base.to_string();
                base_oid_opt = Some(target);
            }
        }
    }

    // Check upstream tracking branch if no explicit base requested
    if base_oid_opt.is_none() {
        if let Ok(branch) = repo.find_branch(&branch_name, BranchType::Local) {
            if let Ok(upstream) = branch.upstream() {
                if let Some(target) = upstream.get().target() {
                    base_branch_name = upstream.name().ok().flatten().unwrap_or("upstream").to_string();
                    base_oid_opt = Some(target);
                }
            }
        }
    }

    // If no upstream, probe common branch names
    if base_oid_opt.is_none() {
        let candidates = ["origin/main", "main", "origin/master", "master", "develop"];
        for candidate in candidates {
            if candidate == branch_name {
                continue;
            }
            let b_type = if candidate.starts_with("origin/") { BranchType::Remote } else { BranchType::Local };
            if let Ok(b) = repo.find_branch(candidate, b_type) {
                if let Some(target) = b.get().target() {
                    base_branch_name = candidate.to_string();
                    base_oid_opt = Some(target);
                    break;
                }
            }
        }
    }

    // Fallback: use the head's parent or head itself if repository has only 1 branch
    let base_oid = match base_oid_opt {
        Some(oid) => oid,
        None => {
            let commit = repo.find_commit(head_oid)?;
            if commit.parent_count() > 0 {
                commit.parent_id(0)?
            } else {
                head_oid
            }
        }
    };

    // 3. Ahead / Behind calculation
    let (ahead_count, behind_count) = if head_oid == base_oid {
        (0, 0)
    } else {
        repo.graph_ahead_behind(head_oid, base_oid).unwrap_or((0, 0))
    };

    // 4. Merge base
    let merge_base = repo.merge_base(head_oid, base_oid).unwrap_or(base_oid);

    // 5. Linear Revwalk from head_oid to merge_base
    let mut revwalk: Revwalk = repo.revwalk()?;
    revwalk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME)?;
    revwalk.push(head_oid)?;
    if merge_base != head_oid {
        let _ = revwalk.hide(merge_base);
    }

    let mut commits: Vec<CommitNode> = Vec::new();
    for oid_res in revwalk {
        let oid = match oid_res {
            Ok(o) => o,
            Err(_) => continue,
        };
        let commit = match repo.find_commit(oid) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let author = commit.author();
        let short_id = if oid.to_string().len() >= 7 {
            oid.to_string()[..7].to_string()
        } else {
            oid.to_string()
        };

        let mut refs = Vec::new();
        if oid == head_oid {
            refs.push(RefInfo {
                name: branch_name.clone(),
                shorthand: branch_name.clone(),
                ref_type: RefType::LocalBranch,
                is_head: true,
            });
        }

        commits.push(CommitNode {
            id: oid.to_string(),
            short_id,
            parents: commit.parent_ids().map(|p| p.to_string()).collect(),
            author_name: author.name().unwrap_or("Unknown").to_string(),
            author_email: author.email().unwrap_or("").to_string(),
            summary: commit.summary().unwrap_or("").to_string(),
            timestamp: author.when().seconds(),
            lane: 0, // In Focus View, all commits are strictly linear on lane 0
            refs,
            is_trunk: false,
        });

        // Limit to prevent runaway history
        if commits.len() >= 500 {
            break;
        }
    }

    // Also include the merge-base node as the root anchor if it's not head
    if merge_base != head_oid {
        if let Ok(base_commit) = repo.find_commit(merge_base) {
            let author = base_commit.author();
            let short_id = if merge_base.to_string().len() >= 7 {
                merge_base.to_string()[..7].to_string()
            } else {
                merge_base.to_string()
            };
            commits.push(CommitNode {
                id: merge_base.to_string(),
                short_id,
                parents: base_commit.parent_ids().map(|p| p.to_string()).collect(),
                author_name: author.name().unwrap_or("Unknown").to_string(),
                author_email: author.email().unwrap_or("").to_string(),
                summary: format!("⚓ [Base Point] {}", base_commit.summary().unwrap_or("")),
                timestamp: author.when().seconds(),
                lane: 0,
                refs: vec![RefInfo {
                    name: base_branch_name.clone(),
                    shorthand: base_branch_name.clone(),
                    ref_type: RefType::RemoteBranch,
                    is_head: false,
                }],
                is_trunk: true,
            });
        }
    }

    Ok(FocusBranchResult {
        branch_name,
        base_branch: base_branch_name,
        ahead_count,
        behind_count,
        base_commit_id: merge_base.to_string(),
        head_commit_id: head_oid.to_string(),
        commits,
    })
}
