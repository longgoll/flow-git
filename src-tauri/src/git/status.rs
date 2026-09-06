use git2::{Repository, Status, StatusOptions};
use serde::{Deserialize, Serialize};
use crate::error::AppResult;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileDeltaStatus {
    Added,
    Modified,
    Deleted,
    Renamed,
    Typechange,
    Untracked,
    Conflicted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileStatusItem {
    pub path: String,
    pub old_path: Option<String>,
    pub status: FileDeltaStatus,
    pub is_staged: bool,
    pub is_conflicted: bool,
    #[serde(default)]
    pub is_dir: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum RepoOperationState {
    Normal,
    Rebasing {
        current_step: usize,
        total_steps: usize,
        head_name: String,
    },
    Merging {
        merge_heads: Vec<String>,
    },
    CherryPicking {
        head_name: Option<String>,
    },
    Reverting {
        head_name: Option<String>,
    },
    Bisecting,
}

impl Default for RepoOperationState {
    fn default() -> Self {
        RepoOperationState::Normal
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkingTreeStatus {
    pub staged: Vec<FileStatusItem>,
    pub unstaged: Vec<FileStatusItem>,
    pub untracked: Vec<FileStatusItem>,
    pub conflicted: Vec<FileStatusItem>,
    pub total_dirty_count: usize,
    pub total_staged_count: usize,
    #[serde(default)]
    pub operation_state: RepoOperationState,
}

pub fn get_repo_operation_state(repo: &Repository) -> AppResult<RepoOperationState> {
    let git_dir = repo.path();

    // 1. Check Rebasing
    let rebase_merge = git_dir.join("rebase-merge");
    let rebase_apply = git_dir.join("rebase-apply");
    if rebase_merge.exists() || rebase_apply.exists() {
        let dir = if rebase_merge.exists() { rebase_merge } else { rebase_apply };
        let current_step = std::fs::read_to_string(dir.join("msgnum"))
            .ok()
            .and_then(|s| s.trim().parse::<usize>().ok())
            .unwrap_or(1);
        let total_steps = std::fs::read_to_string(dir.join("end"))
            .ok()
            .and_then(|s| s.trim().parse::<usize>().ok())
            .unwrap_or(1);
        let head_name = std::fs::read_to_string(dir.join("head-name"))
            .ok()
            .map(|s| s.trim().replace("refs/heads/", ""))
            .unwrap_or_else(|| "HEAD".to_string());

        return Ok(RepoOperationState::Rebasing {
            current_step,
            total_steps,
            head_name,
        });
    }

    // 2. Check Merging
    let merge_head = git_dir.join("MERGE_HEAD");
    if merge_head.exists() {
        let heads = std::fs::read_to_string(merge_head)
            .unwrap_or_default()
            .lines()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        return Ok(RepoOperationState::Merging { merge_heads: heads });
    }

    // 3. Check Cherry-picking
    let cherry_pick_head = git_dir.join("CHERRY_PICK_HEAD");
    if cherry_pick_head.exists() {
        let head_id = std::fs::read_to_string(cherry_pick_head)
            .ok()
            .map(|s| s.trim().to_string());
        return Ok(RepoOperationState::CherryPicking { head_name: head_id });
    }

    // 4. Check Reverting
    let revert_head = git_dir.join("REVERT_HEAD");
    if revert_head.exists() {
        let head_id = std::fs::read_to_string(revert_head)
            .ok()
            .map(|s| s.trim().to_string());
        return Ok(RepoOperationState::Reverting { head_name: head_id });
    }

    // 5. Check Bisecting
    let bisect_log = git_dir.join("BISECT_LOG");
    let bisect_start = git_dir.join("BISECT_START");
    if bisect_log.exists() || bisect_start.exists() {
        return Ok(RepoOperationState::Bisecting);
    }

    Ok(RepoOperationState::Normal)
}

pub fn get_working_tree_status(repo: &Repository) -> AppResult<WorkingTreeStatus> {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false)
        .renames_head_to_index(true);
    let maybe_statuses = match repo.statuses(Some(&mut opts)) {
        Ok(s) => Ok(s),
        Err(e) => {
            let err_msg = e.message().to_lowercase();
            if err_msg.contains("path too long") || err_msg.contains("filesystem") || err_msg.contains("exceed") {
                // Tier 1 Fallback: do not recurse into untracked directories
                let mut fallback_opts = StatusOptions::new();
                fallback_opts
                    .include_untracked(true)
                    .recurse_untracked_dirs(false)
                    .include_ignored(false)
                    .renames_head_to_index(true)
                    .renames_index_to_workdir(true);
                match repo.statuses(Some(&mut fallback_opts)) {
                    Ok(s) => Ok(s),
                    Err(_) => {
                        // Tier 2 Fallback: exclude untracked completely to avoid scanning deeply nested build files
                        let mut fallback_tracked_only = StatusOptions::new();
                        fallback_tracked_only
                            .include_untracked(false)
                            .include_ignored(false)
                            .renames_head_to_index(true)
                            .renames_index_to_workdir(true);
                        repo.statuses(Some(&mut fallback_tracked_only))
                    }
                }
            } else {
                Err(e)
            }
        }
    };

    let statuses = match maybe_statuses {
        Ok(s) => s,
        Err(e) => {
            let err_msg = e.message().to_lowercase();
            if err_msg.contains("path too long") || err_msg.contains("filesystem") || err_msg.contains("exceed") {
                eprintln!("[FlowGit] Bỏ qua lỗi path quá dài trong working tree: {}", e);
                return Ok(WorkingTreeStatus {
                    staged: Vec::new(),
                    unstaged: Vec::new(),
                    untracked: Vec::new(),
                    conflicted: Vec::new(),
                    total_dirty_count: 0,
                    total_staged_count: 0,
                    operation_state: get_repo_operation_state(repo).unwrap_or(RepoOperationState::Normal),
                });
            }
            return Err(e.into());
        }
    };

    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();
    let mut conflicted = Vec::new();
    let workdir = repo.workdir();

    for entry in statuses.iter() {
        let status: Status = entry.status();
        let path = entry.path().unwrap_or("").replace('\\', "/");

        if path.is_empty() {
            continue;
        }

        let full_path = workdir.map(|w| w.join(&path));
        let is_dir = full_path.as_ref().map(|p| p.is_dir()).unwrap_or(false) || path.ends_with('/');

        // Conflict check
        if status.is_conflicted() {
            conflicted.push(FileStatusItem {
                path: path.clone(),
                old_path: None,
                status: FileDeltaStatus::Conflicted,
                is_staged: false,
                is_conflicted: true,
                is_dir,
            });
            continue;
        }

        // Untracked check
        if status.is_wt_new() {
            untracked.push(FileStatusItem {
                path: path.clone(),
                old_path: None,
                status: FileDeltaStatus::Untracked,
                is_staged: false,
                is_conflicted: false,
                is_dir,
            });
            continue;
        }

        // Staged changes (Head to Index)
        if status.is_index_new() {
            staged.push(FileStatusItem {
                path: path.clone(),
                old_path: None,
                status: FileDeltaStatus::Added,
                is_staged: true,
                is_conflicted: false,
                is_dir,
            });
        } else if status.is_index_modified() {
            staged.push(FileStatusItem {
                path: path.clone(),
                old_path: None,
                status: FileDeltaStatus::Modified,
                is_staged: true,
                is_conflicted: false,
                is_dir,
            });
        } else if status.is_index_deleted() {
            staged.push(FileStatusItem {
                path: path.clone(),
                old_path: None,
                status: FileDeltaStatus::Deleted,
                is_staged: true,
                is_conflicted: false,
                is_dir,
            });
        } else if status.is_index_renamed() {
            let old_path = entry.head_to_index().and_then(|d| d.old_file().path().map(|p| p.to_string_lossy().to_string()));
            staged.push(FileStatusItem {
                path: path.clone(),
                old_path,
                status: FileDeltaStatus::Renamed,
                is_staged: true,
                is_conflicted: false,
                is_dir,
            });
        } else if status.is_index_typechange() {
            staged.push(FileStatusItem {
                path: path.clone(),
                old_path: None,
                status: FileDeltaStatus::Typechange,
                is_staged: true,
                is_conflicted: false,
                is_dir,
            });
        }

        // Unstaged changes (Index to Workdir)
        if status.is_wt_modified() {
            unstaged.push(FileStatusItem {
                path: path.clone(),
                old_path: None,
                status: FileDeltaStatus::Modified,
                is_staged: false,
                is_conflicted: false,
                is_dir,
            });
        } else if status.is_wt_deleted() {
            unstaged.push(FileStatusItem {
                path: path.clone(),
                old_path: None,
                status: FileDeltaStatus::Deleted,
                is_staged: false,
                is_conflicted: false,
                is_dir,
            });
        } else if status.is_wt_renamed() {
            let old_path = entry.index_to_workdir().and_then(|d| d.old_file().path().map(|p| p.to_string_lossy().to_string()));
            unstaged.push(FileStatusItem {
                path: path.clone(),
                old_path,
                status: FileDeltaStatus::Renamed,
                is_staged: false,
                is_conflicted: false,
                is_dir,
            });
        } else if status.is_wt_typechange() {
            unstaged.push(FileStatusItem {
                path: path.clone(),
                old_path: None,
                status: FileDeltaStatus::Typechange,
                is_staged: false,
                is_conflicted: false,
                is_dir,
            });
        }
    }

    let total_dirty_count = unstaged.len() + untracked.len() + conflicted.len();
    let total_staged_count = staged.len();
    let operation_state = get_repo_operation_state(repo).unwrap_or(RepoOperationState::Normal);

    Ok(WorkingTreeStatus {
        staged,
        unstaged,
        untracked,
        conflicted,
        total_dirty_count,
        total_staged_count,
        operation_state,
    })
}
