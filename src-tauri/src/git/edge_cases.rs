use std::fs;
use git2::{Repository, StatusOptions};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::storage::trash::TrashStore;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LockedFileInfo {
    pub path: String,
    pub is_locked: bool,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeavyFileInfo {
    pub path: String,
    pub size_bytes: u64,
    pub size_formatted: String,
}

/// Check if `.git/index.lock` is lingering in the repository
pub fn is_index_locked(repo: &Repository) -> bool {
    let lock_file = repo.path().join("index.lock");
    lock_file.exists()
}

/// Safely remove lingering `.git/index.lock`
pub fn clear_index_lock(repo: &Repository) -> AppResult<bool> {
    let lock_file = repo.path().join("index.lock");
    if lock_file.exists() {
        fs::remove_file(&lock_file)
            .map_err(|e| AppError::Internal(format!("Không thể xóa .git/index.lock: {e}")))?;
        Ok(true)
    } else {
        Ok(false)
    }
}

/// Check if given files are currently locked by other processes on Windows/OS
pub fn check_file_locks(repo: &Repository, file_paths: &[String]) -> Vec<LockedFileInfo> {
    let workdir = match repo.workdir() {
        Some(w) => w,
        None => return vec![],
    };

    let mut results = Vec::new();

    for rel_path in file_paths {
        let full_path = workdir.join(rel_path);
        if !full_path.exists() || !full_path.is_file() {
            continue;
        }

        // Try opening with write access
        match fs::OpenOptions::new().write(true).open(&full_path) {
            Ok(_) => {
                results.push(LockedFileInfo {
                    path: rel_path.clone(),
                    is_locked: false,
                    reason: None,
                });
            }
            Err(e) => {
                let reason = format!("{e}");
                results.push(LockedFileInfo {
                    path: rel_path.clone(),
                    is_locked: true,
                    reason: Some(reason),
                });
            }
        }
    }

    results
}

/// Scan staged files to detect files exceeding `threshold_mb` (e.g. 50MB) before commit/push
pub fn scan_heavy_files(repo: &Repository, threshold_mb: u64) -> AppResult<Vec<HeavyFileInfo>> {
    let workdir = repo.workdir().ok_or_else(|| AppError::InvalidRepo("Bare repository".into()))?;
    let mut status_opts = StatusOptions::new();
    status_opts.include_untracked(false);

    let statuses = repo.statuses(Some(&mut status_opts))?;
    let limit_bytes = threshold_mb * 1024 * 1024;
    let mut heavy_files = Vec::new();

    for entry in statuses.iter() {
        let st = entry.status();
        if st.is_index_new() || st.is_index_modified() {
            if let Some(path_str) = entry.path() {
                let full_path = workdir.join(path_str);
                if let Ok(metadata) = fs::metadata(&full_path) {
                    let len = metadata.len();
                    if len >= limit_bytes {
                        let mb = len as f64 / (1024.0 * 1024.0);
                        heavy_files.push(HeavyFileInfo {
                            path: path_str.to_string(),
                            size_bytes: len,
                            size_formatted: format!("{mb:.1} MB"),
                        });
                    }
                }
            }
        }
    }

    Ok(heavy_files)
}

/// Safely shelve untracked files into the 48h Safe Discard trash before checkout to prevent overwrite
pub fn shelve_untracked_files(
    repo: &Repository,
    trash_store: &TrashStore,
    paths: &[String],
) -> AppResult<usize> {
    let workdir = repo.workdir().ok_or_else(|| AppError::InvalidRepo("Bare repository".into()))?;
    let repo_path_str = repo.path().to_string_lossy().to_string();
    let mut shelved_count = 0;

    for rel_path in paths {
        let full_path = workdir.join(rel_path);
        if full_path.exists() && full_path.is_file() {
            if let Ok(content) = fs::read(&full_path) {
                let _ = trash_store.save_snapshot(
                    &repo_path_str,
                    rel_path,
                    &content,
                    "auto_shelve",
                    None,
                );
                if fs::remove_file(&full_path).is_ok() {
                    shelved_count += 1;
                }
            }
        }
    }

    Ok(shelved_count)
}
