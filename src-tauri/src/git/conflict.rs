use std::path::Path;
use git2::{IndexEntry, Repository, ResetType};
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictChunk {
    pub chunk_index: usize,
    pub is_conflict: bool,
    pub base_content: String,
    pub our_content: String,
    pub their_content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictFileDetail {
    pub path: String,
    pub base_content: String,
    pub our_content: String,
    pub their_content: String,
    pub chunks: Vec<ConflictChunk>,
    pub is_resolved: bool,
}

/// Get list of all currently conflicted file paths from index
pub fn get_conflicted_files(repo: &Repository) -> AppResult<Vec<String>> {
    let index = repo.index()?;
    let mut conflicted = Vec::new();

    let conflicts = index.conflicts()?;
    for conflict in conflicts {
        let conflict = conflict?;
        if let Some(entry) = conflict.our.or(conflict.their).or(conflict.ancestor) {
            let path_str = String::from_utf8_lossy(&entry.path).to_string();
            if !conflicted.contains(&path_str) {
                conflicted.push(path_str);
            }
        }
    }

    Ok(conflicted)
}

/// Get 3-way conflict details for a given file path
pub fn get_conflict_details(repo: &Repository, file_path: &str) -> AppResult<ConflictFileDetail> {
    let index = repo.index()?;
    let conflicts = index.conflicts()?;

    let mut base_bytes = Vec::new();
    let mut our_bytes = Vec::new();
    let mut their_bytes = Vec::new();
    let mut found = false;

    for conflict in conflicts {
        let conflict = conflict?;
        let match_path = |entry: &Option<IndexEntry>| -> bool {
            if let Some(e) = entry {
                String::from_utf8_lossy(&e.path) == file_path
            } else {
                false
            }
        };

        if match_path(&conflict.ancestor) || match_path(&conflict.our) || match_path(&conflict.their) {
            found = true;
            if let Some(ancestor) = conflict.ancestor {
                if let Ok(blob) = repo.find_blob(ancestor.id) {
                    base_bytes = blob.content().to_vec();
                }
            }
            if let Some(our) = conflict.our {
                if let Ok(blob) = repo.find_blob(our.id) {
                    our_bytes = blob.content().to_vec();
                }
            }
            if let Some(their) = conflict.their {
                if let Ok(blob) = repo.find_blob(their.id) {
                    their_bytes = blob.content().to_vec();
                }
            }
            break;
        }
    }

    let base_content = String::from_utf8_lossy(&base_bytes).to_string();
    let our_content = String::from_utf8_lossy(&our_bytes).to_string();
    let their_content = String::from_utf8_lossy(&their_bytes).to_string();

    // If file is not in active conflicts table, check if disk file has conflict markers
    let chunks = parse_conflict_chunks(&base_content, &our_content, &their_content, repo, file_path);

    Ok(ConflictFileDetail {
        path: file_path.to_string(),
        base_content,
        our_content,
        their_content,
        chunks,
        is_resolved: !found,
    })
}

fn parse_conflict_chunks(
    base: &str,
    ours: &str,
    theirs: &str,
    repo: &Repository,
    file_path: &str,
) -> Vec<ConflictChunk> {
    // If workdir file exists, check for conflict markers first
    if let Some(workdir) = repo.workdir() {
        let full_path = workdir.join(file_path);
        if let Ok(content) = std::fs::read_to_string(&full_path) {
            if content.contains("<<<<<<<") && content.contains("=======") && content.contains(">>>>>>>") {
                return parse_markers_from_disk(&content);
            }
        }
    }

    // Default 3-way chunk
    vec![ConflictChunk {
        chunk_index: 0,
        is_conflict: true,
        base_content: base.to_string(),
        our_content: ours.to_string(),
        their_content: theirs.to_string(),
    }]
}

fn parse_markers_from_disk(content: &str) -> Vec<ConflictChunk> {
    let mut chunks = Vec::new();
    let mut current_common = Vec::new();
    let mut current_ours = Vec::new();
    let mut current_theirs = Vec::new();
    let mut state = 0; // 0: common, 1: in ours, 2: in theirs
    let mut chunk_idx = 0;

    for line in content.lines() {
        if line.starts_with("<<<<<<<") {
            if !current_common.is_empty() {
                chunks.push(ConflictChunk {
                    chunk_index: chunk_idx,
                    is_conflict: false,
                    base_content: current_common.join("\n"),
                    our_content: current_common.join("\n"),
                    their_content: current_common.join("\n"),
                });
                chunk_idx += 1;
                current_common.clear();
            }
            state = 1;
            current_ours.clear();
        } else if line.starts_with("=======") && state == 1 {
            state = 2;
            current_theirs.clear();
        } else if line.starts_with(">>>>>>>") && state == 2 {
            chunks.push(ConflictChunk {
                chunk_index: chunk_idx,
                is_conflict: true,
                base_content: String::new(),
                our_content: current_ours.join("\n"),
                their_content: current_theirs.join("\n"),
            });
            chunk_idx += 1;
            current_ours.clear();
            current_theirs.clear();
            state = 0;
        } else {
            match state {
                0 => current_common.push(line),
                1 => current_ours.push(line),
                2 => current_theirs.push(line),
                _ => {}
            }
        }
    }

    if !current_common.is_empty() {
        chunks.push(ConflictChunk {
            chunk_index: chunk_idx,
            is_conflict: false,
            base_content: current_common.join("\n"),
            our_content: current_common.join("\n"),
            their_content: current_common.join("\n"),
        });
    }

    chunks
}

/// Resolve conflict for a file by writing resolved content and staging it in Git Index
pub fn resolve_conflict_file(
    repo: &Repository,
    file_path: &str,
    resolved_content: &str,
) -> AppResult<()> {
    let workdir = repo
        .workdir()
        .ok_or_else(|| AppError::Internal("Bare repository has no workdir".into()))?;

    let full_path = workdir.join(file_path);
    if let Some(parent) = full_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    // 1. Write resolved content to disk
    std::fs::write(&full_path, resolved_content)
        .map_err(|e| AppError::Internal(format!("Failed to write resolved file: {e}")))?;

    // 2. Stage the resolved file to clear stage 1/2/3 conflict in index
    let mut index = repo.index()?;
    index.add_path(Path::new(file_path))?;
    index.write()?;

    Ok(())
}

/// Abort current merge or rebase
pub fn abort_merge_or_rebase(repo: &Repository) -> AppResult<()> {
    // If in rebase state, run git rebase --abort
    let git_dir = repo.path();
    if git_dir.join("rebase-merge").exists() || git_dir.join("rebase-apply").exists() {
        if let Some(workdir) = repo.workdir() {
            let mut cmd = std::process::Command::new("git");
            cmd.current_dir(workdir);
            let _ = cmd.arg("rebase").arg("--abort").output();
        }
    }

    // If MERGE_HEAD exists or git state is merging, reset hard to HEAD
    if let Ok(head) = repo.head().and_then(|h| h.peel_to_commit()) {
        let _ = repo.reset(head.as_object(), ResetType::Hard, None);
    }

    // Cleanup merge state files
    let merge_head = git_dir.join("MERGE_HEAD");
    let merge_msg = git_dir.join("MERGE_MSG");
    let merge_mode = git_dir.join("MERGE_MODE");
    let _ = std::fs::remove_file(merge_head);
    let _ = std::fs::remove_file(merge_msg);
    let _ = std::fs::remove_file(merge_mode);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_markers() {
        let text = "Line 1\n<<<<<<< HEAD\nOur code\n=======\nTheir code\n>>>>>>> incoming\nLine 3";
        let chunks = parse_markers_from_disk(text);
        assert_eq!(chunks.len(), 3);
        assert!(!chunks[0].is_conflict);
        assert!(chunks[1].is_conflict);
        assert_eq!(chunks[1].our_content, "Our code");
        assert_eq!(chunks[1].their_content, "Their code");
        assert!(!chunks[2].is_conflict);
    }
}
