use std::path::Path;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::git::cli::silent_command;
pub use crate::storage::accounts::AccountProfile;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCredentials {
    pub auth_type: String, // "ssh_passphrase" | "https_token" | "https_basic" | "oauth"
    pub ssh_passphrase: Option<String>,
    pub username: Option<String>,
    pub token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteActionResult {
    pub success: bool,
    pub message: String,
    pub requires_auth: bool,
    pub auth_type_hint: Option<String>, // "ssh_passphrase" | "https"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCodeResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevicePollResult {
    pub status: String, // "pending" | "success" | "slow_down" | "expired" | "error"
    pub token: Option<String>,
    pub profile: Option<AccountProfile>,
    pub error_message: Option<String>,
}

/// Verify token with GitHub/GitLab API and fetch user profile
pub fn verify_and_fetch_account(
    provider: &str,
    token: &str,
    custom_host: Option<&str>,
) -> AppResult<AccountProfile> {
    let token = token.trim();
    if token.is_empty() {
        return Err(AppError::GitMessage("Token cannot be empty".into()));
    }

    if provider == "github" {
        let mut cmd = silent_command("curl.exe");
        cmd.arg("-s")
            .arg("-H")
            .arg(format!("Authorization: Bearer {}", token))
            .arg("-H")
            .arg("User-Agent: FlowGit-Desktop")
            .arg("-H")
            .arg("Accept: application/vnd.github+json")
            .arg("https://api.github.com/user");

        let output = cmd.output().map_err(|e| AppError::Internal(format!("Failed to run curl: {e}")))?;
        let raw_str = String::from_utf8_lossy(&output.stdout);
        let val: serde_json::Value = serde_json::from_str(&raw_str)
            .map_err(|e| AppError::GitMessage(format!("Invalid GitHub response: {e}. Raw: {raw_str}")))?;

        if let Some(msg) = val.get("message").and_then(|m| m.as_str()) {
            if msg.to_lowercase().contains("bad credentials") || msg.to_lowercase().contains("requires authentication") {
                return Err(AppError::GitMessage("Token không hợp lệ hoặc đã hết hạn trên GitHub.".into()));
            }
        }

        let login = val.get("login").and_then(|v| v.as_str()).unwrap_or("github_user");
        let name = val.get("name").and_then(|v| v.as_str()).map(|s| s.to_string());
        let avatar_url = val.get("avatar_url").and_then(|v| v.as_str()).map(|s| s.to_string());
        let id_val = val.get("id").map(|v| v.to_string()).unwrap_or_else(|| login.to_string());

        Ok(AccountProfile {
            id: format!("github_{}", id_val),
            username: login.to_string(),
            name,
            avatar_url,
            provider: "github".to_string(),
            token: token.to_string(),
            auth_method: "pat".to_string(),
            is_active: true,
            created_at: Utc::now().timestamp(),
        })
    } else if provider == "gitlab" {
        let host = custom_host.unwrap_or("gitlab.com").trim_end_matches('/');
        let api_url = format!("https://{}/api/v4/user", host);

        let mut cmd = silent_command("curl.exe");
        cmd.arg("-s")
            .arg("-H")
            .arg(format!("PRIVATE-TOKEN: {}", token))
            .arg(&api_url);

        let output = cmd.output().map_err(|e| AppError::Internal(format!("Failed to run curl: {e}")))?;
        let raw_str = String::from_utf8_lossy(&output.stdout);
        let val: serde_json::Value = serde_json::from_str(&raw_str)
            .map_err(|e| AppError::GitMessage(format!("Invalid GitLab response: {e}")))?;

        if let Some(err) = val.get("error").and_then(|e| e.as_str()) {
            return Err(AppError::GitMessage(format!("GitLab Error: {err}")));
        }

        let username = val.get("username").and_then(|v| v.as_str()).unwrap_or("gitlab_user");
        let name = val.get("name").and_then(|v| v.as_str()).map(|s| s.to_string());
        let avatar_url = val.get("avatar_url").and_then(|v| v.as_str()).map(|s| s.to_string());
        let id_val = val.get("id").map(|v| v.to_string()).unwrap_or_else(|| username.to_string());

        Ok(AccountProfile {
            id: format!("gitlab_{}", id_val),
            username: username.to_string(),
            name,
            avatar_url,
            provider: "gitlab".to_string(),
            token: token.to_string(),
            auth_method: "pat".to_string(),
            is_active: true,
            created_at: Utc::now().timestamp(),
        })
    } else {
        Err(AppError::GitMessage(format!("Unsupported provider: {provider}")))
    }
}

/// Request GitHub Device Flow Code
pub fn start_github_device_flow(client_id: Option<&str>) -> AppResult<DeviceCodeResponse> {
    // Default GitHub App client ID (can be overridden)
    let cid = client_id.unwrap_or("Iv1.b507a08c87ecfe98"); // FlowGit OAuth App / Standard Client ID

    let mut cmd = silent_command("curl.exe");
    cmd.arg("-s")
        .arg("-X")
        .arg("POST")
        .arg("-H")
        .arg("Accept: application/json")
        .arg("-d")
        .arg(format!("client_id={}&scope=repo%20read:user%20user:email", cid))
        .arg("https://github.com/login/device/code");

    let output = cmd.output().map_err(|e| AppError::Internal(format!("Failed to run device flow: {e}")))?;
    let raw_str = String::from_utf8_lossy(&output.stdout);
    let val: serde_json::Value = serde_json::from_str(&raw_str)
        .map_err(|e| AppError::GitMessage(format!("Failed to parse device response: {e}. Raw: {raw_str}")))?;

    if let Some(err) = val.get("error").and_then(|e| e.as_str()) {
        let desc = val.get("error_description").and_then(|d| d.as_str()).unwrap_or("");
        return Err(AppError::GitMessage(format!("GitHub Device Error: {err} - {desc}")));
    }

    let device_code = val.get("device_code").and_then(|v| v.as_str())
        .ok_or_else(|| AppError::GitMessage("Missing device_code from GitHub".into()))?;
    let user_code = val.get("user_code").and_then(|v| v.as_str())
        .ok_or_else(|| AppError::GitMessage("Missing user_code from GitHub".into()))?;
    let verification_uri = val.get("verification_uri").and_then(|v| v.as_str())
        .unwrap_or("https://github.com/login/device");
    let expires_in = val.get("expires_in").and_then(|v| v.as_u64()).unwrap_or(900);
    let interval = val.get("interval").and_then(|v| v.as_u64()).unwrap_or(5);

    Ok(DeviceCodeResponse {
        device_code: device_code.to_string(),
        user_code: user_code.to_string(),
        verification_uri: verification_uri.to_string(),
        expires_in,
        interval,
    })
}

/// Poll GitHub Device Token
pub fn poll_github_device_token(
    client_id: Option<&str>,
    device_code: &str,
) -> AppResult<DevicePollResult> {
    let cid = client_id.unwrap_or("Iv1.b507a08c87ecfe98");

    let mut cmd = silent_command("curl.exe");
    cmd.arg("-s")
        .arg("-X")
        .arg("POST")
        .arg("-H")
        .arg("Accept: application/json")
        .arg("-d")
        .arg(format!("client_id={}&device_code={}&grant_type=urn:ietf:params:oauth:grant-type:device_code", cid, device_code))
        .arg("https://github.com/login/oauth/access_token");

    let output = cmd.output().map_err(|e| AppError::Internal(format!("Failed to poll device token: {e}")))?;
    let raw_str = String::from_utf8_lossy(&output.stdout);
    let val: serde_json::Value = serde_json::from_str(&raw_str)
        .map_err(|e| AppError::GitMessage(format!("Failed to parse poll response: {e}. Raw: {raw_str}")))?;

    if let Some(err) = val.get("error").and_then(|e| e.as_str()) {
        match err {
            "authorization_pending" => {
                return Ok(DevicePollResult {
                    status: "pending".to_string(),
                    token: None,
                    profile: None,
                    error_message: None,
                });
            }
            "slow_down" => {
                return Ok(DevicePollResult {
                    status: "slow_down".to_string(),
                    token: None,
                    profile: None,
                    error_message: None,
                });
            }
            "expired_token" => {
                return Ok(DevicePollResult {
                    status: "expired".to_string(),
                    token: None,
                    profile: None,
                    error_message: Some("Mã xác thực đã hết hạn, vui lòng tạo mã mới.".to_string()),
                });
            }
            _ => {
                let desc = val.get("error_description").and_then(|d| d.as_str()).unwrap_or(err);
                return Ok(DevicePollResult {
                    status: "error".to_string(),
                    token: None,
                    profile: None,
                    error_message: Some(desc.to_string()),
                });
            }
        }
    }

    if let Some(access_token) = val.get("access_token").and_then(|v| v.as_str()) {
        // Fetch profile with new access token
        let profile = verify_and_fetch_account("github", access_token, None).ok();
        return Ok(DevicePollResult {
            status: "success".to_string(),
            token: Some(access_token.to_string()),
            profile,
            error_message: None,
        });
    }

    Ok(DevicePollResult {
        status: "pending".to_string(),
        token: None,
        profile: None,
        error_message: None,
    })
}

pub fn base64_encode(data: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0];
        let b1 = chunk.get(1).copied().unwrap_or(0);
        let b2 = chunk.get(2).copied().unwrap_or(0);

        result.push(CHARSET[(b0 >> 2) as usize] as char);
        result.push(CHARSET[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARSET[(((b1 & 0x0f) << 2) | (b2 >> 6)) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARSET[(b2 & 0x3f) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

pub fn execute_remote_with_credentials(
    repo_path: &str,
    action: &str, // "push" | "pull" | "fetch" | "publish"
    remote: &str,
    branch: Option<&str>,
    force: bool,
    set_upstream: Option<bool>,
    credentials: Option<GitCredentials>,
) -> AppResult<RemoteActionResult> {
    let mut cmd = silent_command("git");
    cmd.current_dir(Path::new(repo_path));
    cmd.env("GIT_TERMINAL_PROMPT", "0");

    // Pass environment variables or credentials
    if let Some(ref creds) = credentials {
        if creds.auth_type == "ssh_passphrase" {
            if let Some(ref passphrase) = creds.ssh_passphrase {
                cmd.env("SSH_PASSPHRASE", passphrase);
            }
        } else if let Some(ref token) = creds.token {
            let user = creds.username.as_deref().unwrap_or("x-access-token");
            let auth_str = format!("{}:{}", user, token);
            let b64 = base64_encode(auth_str.as_bytes());
            cmd.arg("-c").arg(format!("http.extraHeader=Authorization: Basic {}", b64));
        }
    }

    // Handle actions
    match action {
        "push" | "publish" => {
            cmd.arg("push");
            if force {
                cmd.arg("--force-with-lease");
            }
            if set_upstream.unwrap_or(action == "publish") {
                cmd.arg("-u");
            }
            cmd.arg(remote);
            if let Some(b) = branch {
                if !b.is_empty() {
                    cmd.arg(b);
                }
            }
        }
        "pull" => {
            cmd.arg("pull").arg("--prune").arg(remote);
            if let Some(b) = branch {
                if !b.is_empty() {
                    cmd.arg(b);
                }
            }
        }
        "fetch" => {
            cmd.arg("fetch").arg(remote).arg("--prune");
        }
        _ => return Err(AppError::GitMessage(format!("Unknown remote action: {}", action))),
    }

    let output = cmd.output().map_err(|e| AppError::GitMessage(format!("Failed to execute git {}: {}", action, e)))?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = format!("{}\n{}", stdout, stderr);

    // Detect auth challenges
    let lower = combined.to_lowercase();
    let is_ssh_auth = lower.contains("permission denied (publickey)")
        || lower.contains("enter passphrase for key")
        || lower.contains("passphrase")
        || lower.contains("could not read from remote repository");

    let is_https_auth = lower.contains("authentication failed")
        || lower.contains("http 401")
        || lower.contains("http 403")
        || lower.contains("status code: 401")
        || lower.contains("fatal: could not read username")
        || lower.contains("fatal: could not read password");

    if !output.status.success() {
        if is_ssh_auth {
            return Ok(RemoteActionResult {
                success: false,
                message: stderr.trim().to_string(),
                requires_auth: true,
                auth_type_hint: Some("ssh_passphrase".to_string()),
            });
        }
        if is_https_auth {
            return Ok(RemoteActionResult {
                success: false,
                message: stderr.trim().to_string(),
                requires_auth: true,
                auth_type_hint: Some("https".to_string()),
            });
        }

        return Err(AppError::GitMessage(format!("Git {} failed: {}", action, combined.trim())));
    }

    let success_msg = if !stdout.trim().is_empty() {
        stdout.trim().to_string()
    } else if !stderr.trim().is_empty() {
        stderr.trim().to_string()
    } else {
        format!("Git {} completed successfully", action)
    };

    Ok(RemoteActionResult {
        success: true,
        message: success_msg,
        requires_auth: false,
        auth_type_hint: None,
    })
}
