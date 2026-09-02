use std::path::Path;
use git2::{Repository, StatusOptions};
use crate::error::{AppError, AppResult};
use super::RepoSummary;

pub fn open_repository<P: AsRef<Path>>(path: P) -> AppResult<Repository> {
    let repo = Repository::discover(path.as_ref())
        .map_err(|e| AppError::InvalidRepo(format!("Failed to open repository: {}", e)))?;
    Ok(repo)
}

pub fn init_repository<P: AsRef<Path>>(path: P, default_branch: Option<&str>) -> AppResult<Repository> {
    let target_path = path.as_ref();
    if !target_path.exists() {
        std::fs::create_dir_all(target_path)?;
    }
    let repo = Repository::init(target_path)?;

    let branch = default_branch.unwrap_or("main");
    let _ = repo.set_head(&format!("refs/heads/{}", branch));

    Ok(repo)
}

pub fn get_repo_summary(repo: &Repository) -> AppResult<RepoSummary> {
    let repo_path = repo.workdir()
        .or_else(|| repo.path().parent())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| repo.path().to_string_lossy().to_string());

    let repo_name = Path::new(&repo_path)
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let is_bare = repo.is_bare();

    let (current_branch, is_detached, head_commit_id) = match repo.head() {
        Ok(head_ref) => {
            let is_detached = repo.head_detached().unwrap_or(false);
            let branch_name = if is_detached {
                None
            } else {
                head_ref.shorthand().map(|s| s.to_string())
            };
            let head_commit = head_ref.target().map(|oid| oid.to_string());
            (branch_name, is_detached, head_commit)
        }
        Err(_) => {
            // Unborn branch (e.g. freshly initialized repo before first commit)
            let unborn_branch = repo.find_reference("HEAD")
                .ok()
                .and_then(|r| r.symbolic_target().map(|s| s.strip_prefix("refs/heads/").unwrap_or(s).to_string()));
            (unborn_branch.or_else(|| Some("main".to_string())), false, None)
        }
    };

    // Calculate dirty / staged files count
    let mut status_opts = StatusOptions::new();
    status_opts.include_untracked(true);
    status_opts.recurse_untracked_dirs(true);
    status_opts.include_ignored(false);

    let (dirty_count, staged_count) = if !is_bare {
        match repo.statuses(Some(&mut status_opts)) {
            Ok(statuses) => {
                let mut dirty = 0;
                let mut staged = 0;
                for entry in statuses.iter() {
                    let s = entry.status();
                    if s.is_index_new() || s.is_index_modified() || s.is_index_deleted() || s.is_index_renamed() || s.is_index_typechange() {
                        staged += 1;
                    }
                    if s.is_wt_new() || s.is_wt_modified() || s.is_wt_deleted() || s.is_wt_renamed() || s.is_wt_typechange() {
                        dirty += 1;
                    }
                }
                (dirty, staged)
            }
            Err(_) => (0, 0),
        }
    } else {
        (0, 0)
    };

    Ok(RepoSummary {
        path: repo_path,
        name: repo_name,
        is_bare,
        current_branch,
        head_commit_id,
        is_detached,
        dirty_files_count: dirty_count,
        staged_files_count: staged_count,
    })
}

pub fn clone_repository(
    url: &str,
    target_path: &str,
    credentials: Option<crate::git::auth::GitCredentials>,
) -> AppResult<RepoSummary> {
    let target = Path::new(target_path);
    if let Some(parent) = target.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let mut cmd = std::process::Command::new("git");
    cmd.env("GIT_TERMINAL_PROMPT", "0");

    if let Some(ref creds) = credentials {
        if creds.auth_type == "ssh_passphrase" {
            if let Some(ref passphrase) = creds.ssh_passphrase {
                cmd.env("SSH_PASSPHRASE", passphrase);
            }
        } else if let Some(ref token) = creds.token {
            let user = creds.username.as_deref().unwrap_or("x-access-token");
            let auth_str = format!("{}:{}", user, token);
            let b64 = crate::git::auth::base64_encode(auth_str.as_bytes());
            cmd.arg("-c").arg(format!("http.extraHeader=Authorization: Basic {}", b64));
        }
    }

    cmd.arg("clone").arg(url).arg(target_path);

    let output = cmd.output().map_err(|e| AppError::Internal(format!("Failed to execute git clone: {e}")))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let combined = format!("{}\n{}", stdout, stderr);
        if combined.to_lowercase().contains("401") || combined.to_lowercase().contains("authentication failed") {
            return Err(AppError::GitMessage(format!("AUTH_REQUIRED: {}", combined.trim())));
        }
        return Err(AppError::GitMessage(format!("Clone failed: {}", combined.trim())));
    }

    let repo = open_repository(target_path)?;
    get_repo_summary(&repo)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init_repository_and_summary() {
        let temp_dir = tempfile::tempdir().unwrap();
        let target_path = temp_dir.path().join("my_new_project");

        // 1. Initialize new repo with default branch "main"
        let repo = init_repository(&target_path, Some("main")).expect("Failed to init repository");
        assert!(repo.path().exists());

        // 2. Summary should detect unborn "main" branch and 0 commits
        let summary = get_repo_summary(&repo).expect("Failed to get summary");
        assert_eq!(summary.current_branch, Some("main".to_string()));
        assert_eq!(summary.head_commit_id, None);
        assert_eq!(summary.dirty_files_count, 0);

        // 3. Open repository directly
        let opened_repo = open_repository(&target_path).expect("Failed to reopen repository");
        let summary2 = get_repo_summary(&opened_repo).expect("Failed to get summary2");
        assert_eq!(summary2.current_branch, Some("main".to_string()));
    }
}

