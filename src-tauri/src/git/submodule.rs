use std::path::Path;
use git2::Repository;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmoduleInfo {
    pub name: String,
    pub path: String,
    pub url: String,
    pub head_oid: Option<String>,
    pub index_oid: Option<String>,
    pub workdir_oid: Option<String>,
    pub status: String, // "clean", "modified", "uninitialized", "out_of_sync"
}

pub fn get_submodules(repo: &Repository) -> AppResult<Vec<SubmoduleInfo>> {
    let mut submodules_list = Vec::new();

    let submodules = match repo.submodules() {
        Ok(s) => s,
        Err(_) => return Ok(submodules_list),
    };

    for sm in submodules {
        let name = sm.name().unwrap_or("").to_string();
        let path = sm.path().to_string_lossy().to_string();
        let url = sm.url().unwrap_or("").to_string();

        let head_oid = sm.head_id().map(|oid| oid.to_string());
        let index_oid = sm.index_id().map(|oid| oid.to_string());
        let workdir_oid = sm.workdir_id().map(|oid| oid.to_string());

        let status_flags = repo.submodule_status(&name, git2::SubmoduleIgnore::None).unwrap_or(git2::SubmoduleStatus::empty());

        let status = if status_flags.contains(git2::SubmoduleStatus::WD_UNINITIALIZED) {
            "uninitialized".to_string()
        } else if status_flags.contains(git2::SubmoduleStatus::WD_MODIFIED) || status_flags.contains(git2::SubmoduleStatus::WD_INDEX_MODIFIED) {
            "modified".to_string()
        } else if index_oid != head_oid && head_oid.is_some() {
            "out_of_sync".to_string()
        } else {
            "clean".to_string()
        };

        submodules_list.push(SubmoduleInfo {
            name,
            path,
            url,
            head_oid,
            index_oid,
            workdir_oid,
            status,
        });
    }

    Ok(submodules_list)
}

pub fn update_submodule_cli(repo_path: &str, name: Option<&str>, recursive: bool) -> AppResult<String> {
    let mut cmd = std::process::Command::new("git");
    cmd.current_dir(Path::new(repo_path));
    cmd.arg("submodule").arg("update").arg("--init");

    if recursive {
        cmd.arg("--recursive");
    }

    if let Some(sub_name) = name {
        if !sub_name.is_empty() {
            cmd.arg(sub_name);
        }
    }

    let output = cmd.output().map_err(|e| AppError::GitMessage(format!("Failed to execute git submodule update: {}", e)))?;
    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(AppError::GitMessage(format!("Submodule update failed: {}", err_msg)));
    }

    let out_msg = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(if out_msg.trim().is_empty() { "Submodules updated successfully".to_string() } else { out_msg })
}

pub fn sync_submodule_cli(repo_path: &str, name: Option<&str>) -> AppResult<String> {
    let mut cmd = std::process::Command::new("git");
    cmd.current_dir(Path::new(repo_path));
    cmd.arg("submodule").arg("sync");

    if let Some(sub_name) = name {
        if !sub_name.is_empty() {
            cmd.arg(sub_name);
        }
    }

    let output = cmd.output().map_err(|e| AppError::GitMessage(format!("Failed to execute git submodule sync: {}", e)))?;
    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(AppError::GitMessage(format!("Submodule sync failed: {}", err_msg)));
    }

    Ok("Submodules synced successfully".to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmoduleDiffResult {
    pub name: String,
    pub path: String,
    pub full_path: String,
    pub diff: String,
    pub modified_files: Vec<String>,
}

pub fn get_submodule_diff(repo: &Repository, name: &str) -> AppResult<SubmoduleDiffResult> {
    let sm = repo.find_submodule(name)?;
    let sm_path = sm.path().to_string_lossy().to_string();
    let workdir = repo.workdir().ok_or_else(|| AppError::InvalidRepo("Không có working directory".into()))?;
    let full_path = workdir.join(&sm_path).to_string_lossy().to_string();

    let sm_repo = match sm.open() {
        Ok(r) => r,
        Err(e) => {
            return Ok(SubmoduleDiffResult {
                name: name.to_string(),
                path: sm_path,
                full_path,
                diff: format!("(Submodule chưa được clone/khởi tạo: {e})"),
                modified_files: Vec::new(),
            });
        }
    };

    let mut diff_opts = git2::DiffOptions::new();
    let head_tree = sm_repo.head().ok().and_then(|h| h.peel_to_tree().ok());
    let diff = sm_repo.diff_tree_to_workdir_with_index(head_tree.as_ref(), Some(&mut diff_opts))?;

    let mut diff_output = String::new();
    let mut modified_files = Vec::new();

    let _ = diff.print(git2::DiffFormat::Patch, |delta, _hunk, line| {
        let path = delta.new_file().path().or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        if !path.is_empty() && !modified_files.contains(&path) {
            modified_files.push(path);
        }

        let origin = line.origin();
        if origin == '+' || origin == '-' || origin == ' ' {
            diff_output.push(origin);
        }
        diff_output.push_str(&String::from_utf8_lossy(line.content()));
        true
    });

    if diff_output.is_empty() {
        diff_output = "(Không có thay đổi trong submodule)".to_string();
    }

    Ok(SubmoduleDiffResult {
        name: name.to_string(),
        path: sm_path,
        full_path,
        diff: diff_output,
        modified_files,
    })
}

