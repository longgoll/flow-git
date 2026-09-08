use git2::{FetchOptions, RemoteCallbacks, Repository};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::git::auth::GitCredentials;
use crate::git::cli::silent_command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartSyncResult {
    pub branch_name: String,
    pub remote_name: String,
    pub status: String,
    pub updated_commit_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferProgressPayload {
    pub total_objects: usize,
    pub indexed_objects: usize,
    pub received_objects: usize,
    pub received_bytes: usize,
    pub phase: String,
}

pub fn smart_sync_upstream(
    repo: &Repository,
    remote_name: Option<&str>,
    target_branch_name: Option<&str>,
    credentials: Option<GitCredentials>,
) -> AppResult<SmartSyncResult> {
    smart_sync_upstream_with_progress(
        repo,
        remote_name,
        target_branch_name,
        credentials,
        None::<fn(TransferProgressPayload)>,
    )
}

pub fn smart_sync_upstream_with_progress<F>(
    repo: &Repository,
    remote_name: Option<&str>,
    target_branch_name: Option<&str>,
    credentials: Option<GitCredentials>,
    progress_callback: Option<F>,
) -> AppResult<SmartSyncResult>
where
    F: Fn(TransferProgressPayload) + Send + Sync + 'static,
{
    let remote_str = remote_name.unwrap_or("origin");

    // 1. Find remote
    let mut remote = repo.find_remote(remote_str)
        .map_err(|e| AppError::GitMessage(format!("Remote '{remote_str}' not configured: {e}")))?;

    // 2. Setup callbacks for fetch
    let mut callbacks = RemoteCallbacks::new();
    let creds_clone = credentials.clone();

    callbacks.credentials(move |_url, username_from_url, _allowed_types| {
        if let Some(ref c) = creds_clone {
            if let Some(ref pass) = c.ssh_passphrase {
                if let Ok(cred) = git2::Cred::ssh_key_from_agent(username_from_url.unwrap_or("git")) {
                    return Ok(cred);
                }
                return git2::Cred::userpass_plaintext(username_from_url.unwrap_or("git"), pass);
            }
            if let Some(ref token) = c.token {
                let user = username_from_url
                    .or(c.username.as_deref())
                    .unwrap_or("x-access-token");
                return git2::Cred::userpass_plaintext(user, token);
            }
        }
        git2::Cred::default()
            .or_else(|_| git2::Cred::ssh_key_from_agent(username_from_url.unwrap_or("git")))
    });

    if let Some(cb) = progress_callback {
        callbacks.transfer_progress(move |stats| {
            let total = stats.total_objects();
            let received = stats.received_objects();
            let indexed = stats.indexed_objects();
            let phase = if total == 0 {
                "connecting".to_string()
            } else if received < total {
                "receiving".to_string()
            } else if indexed < total {
                "indexing".to_string()
            } else {
                "resolving".to_string()
            };

            cb(TransferProgressPayload {
                total_objects: total,
                indexed_objects: indexed,
                received_objects: received,
                received_bytes: stats.received_bytes(),
                phase,
            });
            true
        });
    }

    let mut fetch_opts = FetchOptions::new();
    fetch_opts.remote_callbacks(callbacks);
    fetch_opts.prune(git2::FetchPrune::On);

    // Fetch tracking branches - Try libgit2 fetch first
    let refspecs: [&str; 0] = [];
    let mut fetch_success = false;
    let mut last_error = String::new();

    if let Err(e) = remote.fetch(&refspecs, Some(&mut fetch_opts), None) {
        last_error = e.to_string();
    } else {
        let _ = remote.prune(None);
        fetch_success = true;
    }

    // If libgit2 fetch failed, fallback to git CLI fetch with credentials
    if !fetch_success {
        if let Some(workdir) = repo.workdir() {
            let mut cmd = silent_command("git");
            cmd.current_dir(workdir);
            cmd.env("GIT_TERMINAL_PROMPT", "0");

            if let Some(ref c) = credentials {
                if let Some(ref pass) = c.ssh_passphrase {
                    cmd.env("SSH_PASSPHRASE", pass);
                } else if let Some(ref token) = c.token {
                    let user = c.username.as_deref().unwrap_or("x-access-token");
                    let auth_str = format!("{}:{}", user, token);
                    let b64 = crate::git::auth::base64_encode(auth_str.as_bytes());
                    cmd.arg("-c").arg(format!("http.extraHeader=Authorization: Basic {}", b64));
                }
            }

            cmd.arg("fetch").arg(remote_str).arg("--prune");
            if let Ok(out) = cmd.output() {
                if out.status.success() {
                    fetch_success = true;
                } else {
                    let stderr = String::from_utf8_lossy(&out.stderr);
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    let combined = format!("{}\n{}", stdout, stderr).trim().to_string();
                    if !combined.is_empty() {
                        last_error = combined;
                    }
                }
            }
        }
    }

    if !fetch_success {
        let err_lower = last_error.to_lowercase();
        if err_lower.contains("401") || err_lower.contains("authentication") || err_lower.contains("class=http (34)") || err_lower.contains("http 401") || err_lower.contains("could not read username") {
            return Err(AppError::GitMessage(format!("AUTH_REQUIRED: {}", last_error)));
        }
        return Err(AppError::GitMessage(format!("Fetch failed: {}", last_error)));
    }

    // 3. Inspect Target Branch and Upstream
    let head = repo.head().ok();
    let is_head_branch;
    let branch_name = if let Some(target) = target_branch_name {
        is_head_branch = head.as_ref().and_then(|h| h.shorthand()).map(|s| s == target).unwrap_or(false);
        target.to_string()
    } else {
        is_head_branch = true;
        head.as_ref().and_then(|h| h.shorthand()).unwrap_or("HEAD").to_string()
    };

    let branch = match repo.find_branch(&branch_name, git2::BranchType::Local) {
        Ok(b) => b,
        Err(_) => {
            return Ok(SmartSyncResult {
                branch_name,
                remote_name: remote_str.to_string(),
                status: "Fetched remote objects. Target local branch not found.".to_string(),
                updated_commit_id: head.and_then(|h| h.target()).map(|t| t.to_string()),
            });
        }
    };

    let upstream = branch.upstream().ok();

    if let Some(up_branch) = upstream {
        let up_ref = up_branch.into_reference();
        let up_commit_oid = up_ref.target().ok_or_else(|| AppError::GitMessage("Invalid upstream target".into()))?;
        let local_commit_oid = branch.get().target().ok_or_else(|| AppError::GitMessage("Invalid local branch target".into()))?;

        if local_commit_oid == up_commit_oid {
            return Ok(SmartSyncResult {
                branch_name,
                remote_name: remote_str.to_string(),
                status: "Already up-to-date with upstream".to_string(),
                updated_commit_id: Some(local_commit_oid.to_string()),
            });
        }

        let is_fast_forward = repo.graph_descendant_of(up_commit_oid, local_commit_oid).unwrap_or(false);

        if is_fast_forward {
            if is_head_branch {
                // Fast-forward local HEAD branch to upstream
                let mut head_mut = repo.head()?;
                head_mut.set_target(up_commit_oid, "Smart Sync: Fast-forward upstream")?;
                repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
            } else {
                // Update local branch reference directly to upstream
                let mut ref_mut = branch.into_reference();
                ref_mut.set_target(up_commit_oid, "Smart Sync: Fast-forward upstream")?;
            }

            return Ok(SmartSyncResult {
                branch_name,
                remote_name: remote_str.to_string(),
                status: "Fast-forwarded to upstream".to_string(),
                updated_commit_id: Some(up_commit_oid.to_string()),
            });
        } else {
            return Ok(SmartSyncResult {
                branch_name,
                remote_name: remote_str.to_string(),
                status: "Remote fetched. Local branch has diverged commits.".to_string(),
                updated_commit_id: Some(local_commit_oid.to_string()),
            });
        }
    }

    Ok(SmartSyncResult {
        branch_name,
        remote_name: remote_str.to_string(),
        status: "Fetched remote objects. No tracking upstream configured for this branch.".to_string(),
        updated_commit_id: head.and_then(|h| h.target()).map(|t| t.to_string()),
    })
}
