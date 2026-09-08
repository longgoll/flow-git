use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::git::cli::silent_command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SparseCheckoutInfo {
    pub is_enabled: bool,
    pub is_cone: bool,
    pub patterns: Vec<String>,
    pub available_directories: Vec<String>,
}

/// Retrieve current sparse checkout status and discover top/sub directories in repository
pub fn get_sparse_checkout_info(repo_path: &str) -> AppResult<SparseCheckoutInfo> {
    let repo_dir = Path::new(repo_path);
    if !repo_dir.exists() {
        return Err(AppError::GitMessage(format!("Repository path does not exist: {}", repo_path)));
    }

    // 1. Check if sparse checkout is enabled and get patterns
    let mut cmd = silent_command("git");
    cmd.current_dir(repo_dir);
    cmd.arg("sparse-checkout").arg("list");

    let mut is_enabled = false;
    let mut patterns = Vec::new();

    if let Ok(output) = cmd.output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    patterns.push(trimmed.to_string());
                }
            }
            // If git sparse-checkout list succeeded, it's typically active or initialized
            if !patterns.is_empty() {
                is_enabled = true;
            }
        }
    }

    // Double check with core.sparseCheckout config
    let mut config_cmd = silent_command("git");
    config_cmd.current_dir(repo_dir);
    config_cmd.arg("config").arg("--get").arg("core.sparseCheckout");
    if let Ok(output) = config_cmd.output() {
        if output.status.success() {
            let val = String::from_utf8_lossy(&output.stdout).trim().to_lowercase();
            if val == "true" || val == "1" {
                is_enabled = true;
            } else if val == "false" || val == "0" {
                is_enabled = false;
            }
        }
    }

    // Check cone mode
    let mut cone_cmd = silent_command("git");
    cone_cmd.current_dir(repo_dir);
    cone_cmd.arg("config").arg("--get").arg("core.sparseCheckoutCone");
    let mut is_cone = true; // default in modern git
    if let Ok(output) = cone_cmd.output() {
        if output.status.success() {
            let val = String::from_utf8_lossy(&output.stdout).trim().to_lowercase();
            if val == "false" || val == "0" {
                is_cone = false;
            }
        }
    }

    // 2. Discover available directories up to 2-3 levels deep for monorepo convenience
    let available_directories = scan_directories(repo_dir, 2);

    Ok(SparseCheckoutInfo {
        is_enabled,
        is_cone,
        patterns,
        available_directories,
    })
}

/// Recursively scan top directories up to max_depth
fn scan_directories(base_path: &Path, max_depth: usize) -> Vec<String> {
    let mut results = Vec::new();
    let ignored_dirs = [
        ".git", "node_modules", "target", "dist", "build", ".svelte-kit",
        ".vscode", ".idea", ".agents", "coverage", ".turbo", ".next", ".nuxt"
    ];

    fn walk(
        root: &Path,
        current: PathBuf,
        depth: usize,
        max_depth: usize,
        ignored: &[&str],
        results: &mut Vec<String>,
    ) {
        if depth > max_depth {
            return;
        }

        if let Ok(entries) = std::fs::read_dir(&current) {
            let mut subdirs = Vec::new();
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_dir() {
                        let file_name = entry.file_name();
                        let name_str = file_name.to_string_lossy();
                        if !ignored.contains(&name_str.as_ref()) && !name_str.starts_with('.') {
                            subdirs.push(entry.path());
                        }
                    }
                }
            }

            subdirs.sort();
            for subdir in subdirs {
                if let Ok(rel) = subdir.strip_prefix(root) {
                    let rel_str = rel.to_string_lossy().replace('\\', "/");
                    results.push(rel_str);
                }
                walk(root, subdir, depth + 1, max_depth, ignored, results);
            }
        }
    }

    walk(base_path, base_path.to_path_buf(), 1, max_depth, &ignored_dirs, &mut results);
    results.sort();
    results
}

/// Configure and apply sparse checkout
pub fn set_sparse_checkout(repo_path: &str, patterns: Vec<String>, cone: bool) -> AppResult<String> {
    let repo_dir = Path::new(repo_path);
    if !repo_dir.exists() {
        return Err(AppError::GitMessage(format!("Repository path does not exist: {}", repo_path)));
    }

    if patterns.is_empty() {
        return Err(AppError::GitMessage("At least one directory or pattern must be selected".to_string()));
    }

    let mut cmd = silent_command("git");
    cmd.current_dir(repo_dir);
    cmd.arg("sparse-checkout").arg("set");

    if cone {
        cmd.arg("--cone");
    } else {
        cmd.arg("--no-cone");
    }

    for pat in &patterns {
        let trimmed = pat.trim();
        if !trimmed.is_empty() {
            cmd.arg(trimmed);
        }
    }

    let output = cmd
        .output()
        .map_err(|e| AppError::GitMessage(format!("Failed to execute git sparse-checkout set: {}", e)))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(AppError::GitMessage(format!("git sparse-checkout set failed: {}", err_msg)));
    }

    Ok(format!("Sparse checkout configured with {} pattern(s)", patterns.len()))
}

/// Disable sparse checkout and restore full worktree
pub fn disable_sparse_checkout(repo_path: &str) -> AppResult<String> {
    let repo_dir = Path::new(repo_path);
    if !repo_dir.exists() {
        return Err(AppError::GitMessage(format!("Repository path does not exist: {}", repo_path)));
    }

    let mut cmd = silent_command("git");
    cmd.current_dir(repo_dir);
    cmd.arg("sparse-checkout").arg("disable");

    let output = cmd
        .output()
        .map_err(|e| AppError::GitMessage(format!("Failed to execute git sparse-checkout disable: {}", e)))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(AppError::GitMessage(format!("git sparse-checkout disable failed: {}", err_msg)));
    }

    Ok("Sparse checkout disabled. Full workspace checked out.".to_string())
}

/// Reapply sparse checkout patterns to working tree
pub fn reapply_sparse_checkout(repo_path: &str) -> AppResult<String> {
    let repo_dir = Path::new(repo_path);
    if !repo_dir.exists() {
        return Err(AppError::GitMessage(format!("Repository path does not exist: {}", repo_path)));
    }

    let mut cmd = silent_command("git");
    cmd.current_dir(repo_dir);
    cmd.arg("sparse-checkout").arg("reapply");

    let output = cmd
        .output()
        .map_err(|e| AppError::GitMessage(format!("Failed to execute git sparse-checkout reapply: {}", e)))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(AppError::GitMessage(format!("git sparse-checkout reapply failed: {}", err_msg)));
    }

    Ok("Sparse checkout patterns reapplied successfully.".to_string())
}
