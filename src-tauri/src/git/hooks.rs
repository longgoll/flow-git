use std::fs;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHookInfo {
    pub name: String,
    pub description_key: String,
    pub enabled: bool,
    pub exists: bool,
    pub content: String,
    pub sample_content: Option<String>,
}

const KNOWN_HOOKS: &[(&str, &str)] = &[
    ("pre-commit", "hooks.preCommitDesc"),
    ("commit-msg", "hooks.commitMsgDesc"),
    ("pre-push", "hooks.prePushDesc"),
    ("post-merge", "hooks.postMergeDesc"),
    ("prepare-commit-msg", "hooks.prepareCommitMsgDesc"),
    ("post-checkout", "hooks.postCheckoutDesc"),
    ("post-commit", "hooks.postCommitDesc"),
    ("pre-rebase", "hooks.preRebaseDesc"),
];

pub fn list_git_hooks(repo: &git2::Repository) -> AppResult<Vec<GitHookInfo>> {
    let hooks_dir = repo.path().join("hooks");
    if !hooks_dir.exists() {
        let _ = fs::create_dir_all(&hooks_dir);
    }

    let mut result = Vec::new();

    for (name, desc_key) in KNOWN_HOOKS {
        let active_path = hooks_dir.join(name);
        let disabled_path = hooks_dir.join(format!("{}.disabled", name));
        let sample_path = hooks_dir.join(format!("{}.sample", name));

        let sample_content = if sample_path.exists() {
            fs::read_to_string(&sample_path).ok()
        } else {
            None
        };

        let (enabled, exists, content) = if active_path.exists() {
            let content = fs::read_to_string(&active_path).unwrap_or_default();
            (true, true, content)
        } else if disabled_path.exists() {
            let content = fs::read_to_string(&disabled_path).unwrap_or_default();
            (false, true, content)
        } else {
            (false, false, String::new())
        };

        result.push(GitHookInfo {
            name: name.to_string(),
            description_key: desc_key.to_string(),
            enabled,
            exists,
            content,
            sample_content,
        });
    }

    Ok(result)
}

pub fn save_git_hook(
    repo: &git2::Repository,
    name: &str,
    content: &str,
    enabled: bool,
) -> AppResult<()> {
    let hooks_dir = repo.path().join("hooks");
    if !hooks_dir.exists() {
        fs::create_dir_all(&hooks_dir).map_err(AppError::Io)?;
    }

    let active_path = hooks_dir.join(name);
    let disabled_path = hooks_dir.join(format!("{}.disabled", name));

    let target_path = if enabled {
        if disabled_path.exists() {
            let _ = fs::remove_file(&disabled_path);
        }
        active_path
    } else {
        if active_path.exists() {
            let _ = fs::remove_file(&active_path);
        }
        disabled_path
    };

    fs::write(&target_path, content).map_err(AppError::Io)?;

    #[cfg(unix)]
    if enabled {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = fs::metadata(&target_path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o755);
            let _ = fs::set_permissions(&target_path, perms);
        }
    }

    Ok(())
}

pub fn toggle_git_hook(
    repo: &git2::Repository,
    name: &str,
    enabled: bool,
) -> AppResult<()> {
    let hooks_dir = repo.path().join("hooks");
    if !hooks_dir.exists() {
        fs::create_dir_all(&hooks_dir).map_err(AppError::Io)?;
    }

    let active_path = hooks_dir.join(name);
    let disabled_path = hooks_dir.join(format!("{}.disabled", name));
    let sample_path = hooks_dir.join(format!("{}.sample", name));

    if enabled {
        if disabled_path.exists() {
            fs::rename(&disabled_path, &active_path).map_err(AppError::Io)?;
        } else if !active_path.exists() {
            // If neither exists, copy sample or create default
            if sample_path.exists() {
                fs::copy(&sample_path, &active_path).map_err(AppError::Io)?;
            } else {
                let default_content = format!("#!/bin/sh\n# FlowGit Hook: {}\n\nexit 0\n", name);
                fs::write(&active_path, default_content).map_err(AppError::Io)?;
            }
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(metadata) = fs::metadata(&active_path) {
                let mut perms = metadata.permissions();
                perms.set_mode(0o755);
                let _ = fs::set_permissions(&active_path, perms);
            }
        }
    } else {
        // Disable: rename active to disabled
        if active_path.exists() {
            fs::rename(&active_path, &disabled_path).map_err(AppError::Io)?;
        }
    }

    Ok(())
}
