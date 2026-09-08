use git2::Repository;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::git::auth::GitCredentials;
use crate::git::sync::smart_sync_upstream;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteInfo {
    pub name: String,
    pub fetch_url: Option<String>,
    pub push_url: Option<String>,
}

/// List all remotes in the repository with their fetch and push URLs
pub fn get_remotes(repo: &Repository) -> AppResult<Vec<RemoteInfo>> {
    let mut result = Vec::new();
    let remote_names = repo.remotes()?;

    for name_opt in remote_names.iter() {
        if let Some(name) = name_opt {
            if let Ok(remote) = repo.find_remote(name) {
                let fetch_url = remote.url().map(|s| s.to_string());
                let push_url = remote.pushurl().map(|s| s.to_string()).or_else(|| fetch_url.clone());
                result.push(RemoteInfo {
                    name: name.to_string(),
                    fetch_url,
                    push_url,
                });
            }
        }
    }

    Ok(result)
}

/// Add a new remote (git remote add <name> <url>)
pub fn add_remote(repo: &Repository, name: &str, url: &str) -> AppResult<RemoteInfo> {
    let name = name.trim();
    let url = url.trim();

    if name.is_empty() {
        return Err(AppError::InvalidRepo("Tên remote không được để trống.".into()));
    }
    if url.is_empty() {
        return Err(AppError::InvalidRepo("URL remote không được để trống.".into()));
    }

    let remote = repo.remote(name, url)?;
    let fetch_url = remote.url().map(|s| s.to_string());
    let push_url = remote.pushurl().map(|s| s.to_string()).or_else(|| fetch_url.clone());

    Ok(RemoteInfo {
        name: name.to_string(),
        fetch_url,
        push_url,
    })
}

/// Remove an existing remote (git remote remove <name>)
pub fn remove_remote(repo: &Repository, name: &str) -> AppResult<()> {
    repo.remote_delete(name)?;
    Ok(())
}

/// Set URL for an existing remote (git remote set-url <name> <new_url>)
pub fn set_remote_url(repo: &Repository, name: &str, new_url: &str) -> AppResult<()> {
    let new_url = new_url.trim();
    if new_url.is_empty() {
        return Err(AppError::InvalidRepo("URL remote không được để trống.".into()));
    }
    repo.remote_set_url(name, new_url)?;
    Ok(())
}

/// Fetch a specific remote
pub fn fetch_specific_remote(
    repo: &Repository,
    name: &str,
    credentials: Option<GitCredentials>,
) -> AppResult<String> {
    let res = smart_sync_upstream(repo, Some(name), None, credentials)?;
    Ok(res.status)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitSummary {
    pub id: String,
    pub short_id: String,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackgroundFetchResult {
    pub success: bool,
    pub has_new_commits: bool,
    pub current_branch: Option<String>,
    pub upstream_branch: Option<String>,
    pub ahead_count: usize,
    pub behind_count: usize,
    pub incoming_commits: Vec<CommitSummary>,
    pub message: String,
}

/// Retrieve commits present in target_oid but missing in base_oid
pub fn get_commits_between(
    repo: &Repository,
    base_oid: git2::Oid,
    target_oid: git2::Oid,
    max_count: usize,
) -> AppResult<Vec<CommitSummary>> {
    let mut revwalk = repo.revwalk()?;
    revwalk.set_sorting(git2::Sort::TIME | git2::Sort::TOPOLOGICAL)?;
    revwalk.push(target_oid)?;
    let _ = revwalk.hide(base_oid);

    let mut commits = Vec::new();
    for oid_res in revwalk {
        if commits.len() >= max_count {
            break;
        }
        if let Ok(oid) = oid_res {
            if let Ok(commit) = repo.find_commit(oid) {
                let id = oid.to_string();
                let short_id = if id.len() >= 7 { id[..7].to_string() } else { id.clone() };
                let message = commit.summary().unwrap_or("").to_string();
                let author = commit.author();
                let author_name = author.name().unwrap_or("Unknown").to_string();
                let author_email = author.email().unwrap_or("").to_string();
                let timestamp = commit.time().seconds();

                commits.push(CommitSummary {
                    id,
                    short_id,
                    message,
                    author_name,
                    author_email,
                    timestamp,
                });
            }
        }
    }
    Ok(commits)
}

/// Get preview of incoming commits from upstream for a branch
pub fn get_incoming_commits(
    repo: &Repository,
    branch_name: Option<&str>,
) -> AppResult<Vec<CommitSummary>> {
    let head = repo.head().ok();
    let target_branch_name = branch_name.or_else(|| head.as_ref().and_then(|h| h.shorthand()));
    if let Some(b_name) = target_branch_name {
        if let Ok(branch) = repo.find_branch(b_name, git2::BranchType::Local) {
            if let Ok(upstream) = branch.upstream() {
                if let (Some(local_oid), Some(up_oid)) = (branch.get().target(), upstream.get().target()) {
                    return get_commits_between(repo, local_oid, up_oid, 50);
                }
            }
        }
    }
    Ok(Vec::new())
}

/// Perform a silent background fetch without showing noisy auth popups on network/auth failure.
/// Safely updates remote tracking refs and computes ahead/behind commit metrics for the active branch.
pub fn silent_background_fetch(
    repo: &Repository,
    remote_name: Option<&str>,
    credentials: Option<GitCredentials>,
) -> AppResult<BackgroundFetchResult> {
    let remotes = repo.remotes()?;
    if remotes.is_empty() {
        return Ok(BackgroundFetchResult {
            success: true,
            has_new_commits: false,
            current_branch: None,
            upstream_branch: None,
            ahead_count: 0,
            behind_count: 0,
            incoming_commits: Vec::new(),
            message: "No remotes configured".to_string(),
        });
    }

    let default_remote = remotes.get(0).unwrap_or("origin");
    let target_remote = remote_name.unwrap_or(default_remote);

    // Prepare Git CLI fetch with credentials and terminal prompt disabled
    let workdir = repo.workdir().unwrap_or_else(|| repo.path());
    let mut cmd = std::process::Command::new("git");
    cmd.current_dir(workdir);
    cmd.env("GIT_TERMINAL_PROMPT", "0");

    if let Some(ref c) = credentials {
        if c.auth_type == "ssh_passphrase" {
            if let Some(ref pass) = c.ssh_passphrase {
                cmd.env("SSH_PASSPHRASE", pass);
            }
        } else if let Some(ref token) = c.token {
            let user = c.username.as_deref().unwrap_or("x-access-token");
            let auth_str = format!("{}:{}", user, token);
            let b64 = crate::git::auth::base64_encode(auth_str.as_bytes());
            cmd.arg("-c").arg(format!("http.extraHeader=Authorization: Basic {}", b64));
        }
    }

    cmd.arg("fetch").arg(target_remote).arg("--prune");

    let output = match cmd.output() {
        Ok(out) => out,
        Err(e) => {
            return Ok(BackgroundFetchResult {
                success: false,
                has_new_commits: false,
                current_branch: None,
                upstream_branch: None,
                ahead_count: 0,
                behind_count: 0,
                incoming_commits: Vec::new(),
                message: format!("Fetch skipped (git spawn error): {}", e),
            });
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Ok(BackgroundFetchResult {
            success: false,
            has_new_commits: false,
            current_branch: None,
            upstream_branch: None,
            ahead_count: 0,
            behind_count: 0,
            incoming_commits: Vec::new(),
            message: format!("Fetch skipped or offline: {}", stderr.trim()),
        });
    }

    // Inspect HEAD branch and calculate ahead/behind against upstream
    let head = repo.head().ok();
    let current_branch = head.as_ref().and_then(|h| h.shorthand()).map(|s| s.to_string());
    let mut upstream_branch = None;
    let mut ahead_count = 0;
    let mut behind_count = 0;
    let mut local_oid_opt = None;
    let mut up_oid_opt = None;

    if let Some(ref b_name) = current_branch {
        if let Ok(branch) = repo.find_branch(b_name, git2::BranchType::Local) {
            if let Ok(upstream) = branch.upstream() {
                if let Ok(Some(up_name)) = upstream.name() {
                    upstream_branch = Some(up_name.to_string());
                }
                if let (Some(local_oid), Some(up_oid)) = (branch.get().target(), upstream.get().target()) {
                    local_oid_opt = Some(local_oid);
                    up_oid_opt = Some(up_oid);
                    if let Ok((ahead, behind)) = repo.graph_ahead_behind(local_oid, up_oid) {
                        ahead_count = ahead;
                        behind_count = behind;
                    }
                }
            }
        }
    }

    let has_new_commits = behind_count > 0;
    let incoming_commits = if has_new_commits {
        if let (Some(local_oid), Some(up_oid)) = (local_oid_opt, up_oid_opt) {
            get_commits_between(repo, local_oid, up_oid, 20).unwrap_or_default()
        } else {
            Vec::new()
        }
    } else {
        Vec::new()
    };

    Ok(BackgroundFetchResult {
        success: true,
        has_new_commits,
        current_branch,
        upstream_branch,
        ahead_count,
        behind_count,
        incoming_commits,
        message: if has_new_commits {
            format!("Found {} new commit(s) on remote.", behind_count)
        } else {
            "Remote is up to date.".to_string()
        },
    })
}

