use std::path::Path;
use git2::Repository;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LfsFileInfo {
    pub path: String,
    pub oid_sha256: String,
    pub size_bytes: u64,
    pub is_pointer: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LfsLockInfo {
    pub id: String,
    pub path: String,
    pub owner: String,
    pub locked_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LfsSummary {
    pub is_lfs_enabled: bool,
    pub tracked_patterns: Vec<String>,
    pub files: Vec<LfsFileInfo>,
    pub locks: Vec<LfsLockInfo>,
}

pub fn get_lfs_summary(_repo: &Repository, repo_path: &str) -> AppResult<LfsSummary> {
    let mut tracked_patterns = Vec::new();
    let mut is_lfs_enabled = false;

    // Check .gitattributes
    let gitattributes_path = Path::new(repo_path).join(".gitattributes");
    if gitattributes_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&gitattributes_path) {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.contains("filter=lfs") {
                    is_lfs_enabled = true;
                    let parts: Vec<&str> = trimmed.split_whitespace().collect();
                    if let Some(pattern) = parts.first() {
                        tracked_patterns.push(pattern.to_string());
                    }
                }
            }
        }
    }

    let mut files = Vec::new();
    let mut locks = Vec::new();

    // Query files using `git lfs ls-files -l`
    if is_lfs_enabled {
        let mut cmd = std::process::Command::new("git");
        cmd.current_dir(Path::new(repo_path));
        cmd.arg("lfs").arg("ls-files").arg("-l");

        if let Ok(output) = cmd.output() {
            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout);
                for line in text.lines() {
                    let parts: Vec<&str> = line.trim().split_whitespace().collect();
                    if parts.len() >= 3 {
                        let oid = parts[0].to_string();
                        let indicator = parts[1]; // '-' for pointer, '*' for downloaded
                        let file_path = parts[2..].join(" ");

                        // Try to get size on disk if available
                        let full_file = Path::new(repo_path).join(&file_path);
                        let size_bytes = std::fs::metadata(&full_file).map(|m| m.len()).unwrap_or(0);

                        files.push(LfsFileInfo {
                            path: file_path,
                            oid_sha256: oid,
                            size_bytes,
                            is_pointer: indicator == "-",
                        });
                    }
                }
            }
        }

        // Query locks `git lfs locks`
        let mut lock_cmd = std::process::Command::new("git");
        lock_cmd.current_dir(Path::new(repo_path));
        lock_cmd.arg("lfs").arg("locks");

        if let Ok(output) = lock_cmd.output() {
            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout);
                for line in text.lines() {
                    let trimmed = line.trim();
                    if !trimmed.is_empty() {
                        // Example: "models/character.fbx\tJohn Doe\tID:12345"
                        let parts: Vec<&str> = trimmed.split('\t').collect();
                        if parts.len() >= 3 {
                            let path = parts[0].to_string();
                            let owner = parts[1].to_string();
                            let id_part = parts[2].trim_start_matches("ID:").to_string();
                            locks.push(LfsLockInfo {
                                id: id_part,
                                path,
                                owner,
                                locked_at: "active".to_string(),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(LfsSummary {
        is_lfs_enabled,
        tracked_patterns,
        files,
        locks,
    })
}

pub fn pull_lfs_cli(repo_path: &str, file_pattern: Option<&str>) -> AppResult<String> {
    let mut cmd = std::process::Command::new("git");
    cmd.current_dir(Path::new(repo_path));
    cmd.arg("lfs").arg("pull");

    if let Some(pat) = file_pattern {
        if !pat.is_empty() {
            cmd.arg("-I").arg(pat);
        }
    }

    let output = cmd.output().map_err(|e| AppError::GitMessage(format!("Failed to execute git lfs pull: {}", e)))?;
    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(AppError::GitMessage(format!("Git LFS pull failed: {}", err_msg)));
    }

    Ok("Git LFS files pulled successfully".to_string())
}

pub fn lock_lfs_cli(repo_path: &str, file_path: &str) -> AppResult<String> {
    let mut cmd = std::process::Command::new("git");
    cmd.current_dir(Path::new(repo_path));
    cmd.arg("lfs").arg("lock").arg(file_path);

    let output = cmd.output().map_err(|e| AppError::GitMessage(format!("Failed to execute git lfs lock: {}", e)))?;
    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(AppError::GitMessage(format!("Git LFS lock failed: {}", err_msg)));
    }

    Ok(format!("Locked {}", file_path))
}

pub fn unlock_lfs_cli(repo_path: &str, file_path: &str, force: bool) -> AppResult<String> {
    let mut cmd = std::process::Command::new("git");
    cmd.current_dir(Path::new(repo_path));
    cmd.arg("lfs").arg("unlock").arg(file_path);

    if force {
        cmd.arg("--force");
    }

    let output = cmd.output().map_err(|e| AppError::GitMessage(format!("Failed to execute git lfs unlock: {}", e)))?;
    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(AppError::GitMessage(format!("Git LFS unlock failed: {}", err_msg)));
    }

    Ok(format!("Unlocked {}", file_path))
}
