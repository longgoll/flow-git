use std::fs;
use std::path::PathBuf;
use git2::{Oid, Repository};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignatureInfo {
    pub is_signed: bool,
    pub key_type: Option<String>, // "ssh" | "gpg" | "unknown"
    pub signature: Option<String>,
    pub signer: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SigningConfig {
    pub gpg_sign: bool,
    pub gpg_format: String, // "ssh" | "openpgp"
    pub signing_key: Option<String>,
    pub available_ssh_keys: Vec<String>,
}

/// Extract and analyze signature for a commit from its object header
pub fn get_commit_signature(repo: &Repository, commit_id: &str) -> AppResult<SignatureInfo> {
    let oid = Oid::from_str(commit_id)
        .map_err(|e| AppError::Git(format!("Invalid commit SHA {commit_id}: {e}")))?;
    let commit = repo.find_commit(oid)?;

    // Read the "gpgsig" header field from the raw commit object
    let sig_buf_opt = commit.header_field_bytes("gpgsig").ok();
    if let Some(buf) = sig_buf_opt {
        let sig_str = String::from_utf8_lossy(&buf).to_string();
        let key_type = if sig_str.contains("SSH SIGNATURE") {
            "ssh".to_string()
        } else if sig_str.contains("PGP SIGNATURE") {
            "gpg".to_string()
        } else {
            "unknown".to_string()
        };

        let signer = commit.author().name().map(|s| s.to_string());

        return Ok(SignatureInfo {
            is_signed: true,
            key_type: Some(key_type),
            signature: Some(sig_str),
            signer,
        });
    }

    Ok(SignatureInfo {
        is_signed: false,
        key_type: None,
        signature: None,
        signer: None,
    })
}

/// Discover public SSH keys in the user's ~/.ssh directory
fn discover_ssh_keys() -> Vec<String> {
    let home_dir = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_default();

    if home_dir.is_empty() {
        return Vec::new();
    }

    let ssh_path = PathBuf::from(home_dir).join(".ssh");
    if !ssh_path.is_dir() {
        return Vec::new();
    }

    let mut keys = Vec::new();
    if let Ok(entries) = fs::read_dir(ssh_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                if ext == "pub" {
                    keys.push(path.to_string_lossy().to_string());
                }
            }
        }
    }

    keys.sort();
    keys
}

/// Retrieve the current commit signing configuration for the repository
pub fn get_signing_config(repo: &Repository) -> AppResult<SigningConfig> {
    let config = repo.config()?;

    let gpg_sign = config.get_bool("commit.gpgsign").unwrap_or(false);
    let gpg_format = config
        .get_string("gpg.format")
        .unwrap_or_else(|_| "openpgp".to_string());
    let signing_key = config.get_string("user.signingkey").ok();
    let available_ssh_keys = discover_ssh_keys();

    Ok(SigningConfig {
        gpg_sign,
        gpg_format,
        signing_key,
        available_ssh_keys,
    })
}

/// Update commit signing configuration (local or global)
pub fn set_signing_config(
    repo: &Repository,
    gpg_sign: bool,
    gpg_format: &str,
    signing_key: Option<&str>,
    is_global: bool,
) -> AppResult<()> {
    let format = if gpg_format.eq_ignore_ascii_case("ssh") {
        "ssh"
    } else {
        "openpgp"
    };

    if is_global {
        let mut global_cfg = repo.config()?.open_global()?;
        global_cfg.set_bool("commit.gpgsign", gpg_sign)?;
        global_cfg.set_str("gpg.format", format)?;
        if let Some(key) = signing_key {
            let trimmed = key.trim();
            if !trimmed.is_empty() {
                global_cfg.set_str("user.signingkey", trimmed)?;
            } else {
                let _ = global_cfg.remove("user.signingkey");
            }
        } else {
            let _ = global_cfg.remove("user.signingkey");
        }
    } else {
        let mut cfg = repo.config()?;
        cfg.set_bool("commit.gpgsign", gpg_sign)?;
        cfg.set_str("gpg.format", format)?;
        if let Some(key) = signing_key {
            let trimmed = key.trim();
            if !trimmed.is_empty() {
                cfg.set_str("user.signingkey", trimmed)?;
            } else {
                let _ = cfg.remove("user.signingkey");
            }
        } else {
            let _ = cfg.remove("user.signingkey");
        }
    }

    Ok(())
}
