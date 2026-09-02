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
