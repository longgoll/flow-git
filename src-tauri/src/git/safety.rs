use std::path::Path;
use git2::{build::CheckoutBuilder, Repository};
use regex::Regex;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};
use crate::git::diff::get_working_tree_file_diff;
use crate::git::status::get_working_tree_status;
use crate::storage::trash::{TrashSnapshotItem, TrashStore};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecretFinding {
    pub file_path: String,
    pub rule_id: String,
    pub rule_name: String,
    pub description: String,
    pub line_number: Option<usize>,
    pub snippet_masked: Option<String>,
    pub severity: String, // "critical" | "warning"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflogEntry {
    pub index: usize,
    pub commit_id: String,
    pub short_id: String,
    pub old_id: String,
    pub action: String,
    pub message: String,
    pub committer: String,
    pub timestamp: i64,
    pub is_orphaned: bool,
}

pub fn discard_file_changes(
    repo: &Repository,
    store: &TrashStore,
    file_path: &str,
) -> AppResult<i64> {
    let repo_path = repo
        .workdir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| repo.path().to_string_lossy().to_string());

    let workdir = repo
        .workdir()
        .ok_or_else(|| AppError::Internal("No workdir in bare repository".into()))?;

    let full_path = workdir.join(file_path);

    let head_sha = repo
        .head()
        .ok()
        .and_then(|h| h.target())
        .map(|t| t.to_string());

    // 1. Read current disk content and generate diff preview for safe snapshot
    let (content, diff_preview) = if full_path.exists() && full_path.is_file() {
        let raw = std::fs::read(&full_path).unwrap_or_default();
        let diff_detail = get_working_tree_file_diff(repo, file_path, false, None).ok();
        let preview = if let Some(d) = diff_detail {
            let mut buf = String::new();
            for h in &d.hunks {
                buf.push_str(&h.header);
                buf.push('\n');
                for l in &h.lines {
                    match l.line_type {
                        crate::git::diff::LineChangeType::Addition => buf.push('+'),
                        crate::git::diff::LineChangeType::Deletion => buf.push('-'),
                        crate::git::diff::LineChangeType::Context => buf.push(' '),
                    }
                    buf.push_str(&l.content);
                    buf.push('\n');
                }
            }
            if buf.is_empty() {
                format!("Raw content ({} bytes)", raw.len())
            } else {
                buf
            }
        } else {
            format!("Raw content ({} bytes)", raw.len())
        };
        (raw, preview)
    } else {
        // File was deleted in workdir
        (Vec::new(), format!("Deleted file: {file_path}"))
    };

    // 2. Save snapshot in SQLite Trash Store BEFORE discarding
    let snapshot_id = store.save_snapshot(
        &repo_path,
        file_path,
        &content,
        &diff_preview,
        head_sha.as_deref(),
    )?;

    // 3. Perform discard
    let mut index = repo.index()?;
    let in_index = index.get_path(Path::new(file_path), 0).is_some();

    if in_index {
        let mut builder = CheckoutBuilder::new();
        builder.force();
        builder.path(file_path);
        repo.checkout_index(Some(&mut index), Some(&mut builder))?;
    } else if full_path.exists() {
        // Untracked file: safely remove
        let _ = std::fs::remove_file(&full_path);
    }

    Ok(snapshot_id)
}

pub fn discard_all_changes(repo: &Repository, store: &TrashStore) -> AppResult<Vec<i64>> {
    let status = get_working_tree_status(repo)?;
    let mut snapshot_ids = Vec::new();

    for item in status.unstaged.iter().chain(status.untracked.iter()) {
        if let Ok(id) = discard_file_changes(repo, store, &item.path) {
            snapshot_ids.push(id);
        }
    }

    Ok(snapshot_ids)
}

pub fn restore_trash_snapshot(
    repo: &Repository,
    store: &TrashStore,
    snapshot_id: i64,
) -> AppResult<()> {
    let (_repo_path, file_path, content) = store.get_snapshot_content(snapshot_id)?;

    let workdir = repo
        .workdir()
        .ok_or_else(|| AppError::Internal("No workdir in bare repository".into()))?;

    let full_path = workdir.join(&file_path);

    if let Some(parent) = full_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    std::fs::write(&full_path, content)
        .map_err(|e| AppError::Internal(format!("Failed to restore file {file_path}: {e}")))?;

    // Auto remove from trash store after successful restore
    let _ = store.delete_snapshot(snapshot_id);

    Ok(())
}

pub fn list_trash_snapshots(
    store: &TrashStore,
    repo_path: &str,
) -> AppResult<Vec<TrashSnapshotItem>> {
    store.list_snapshots(repo_path)
}

pub fn delete_trash_snapshot(store: &TrashStore, snapshot_id: i64) -> AppResult<()> {
    store.delete_snapshot(snapshot_id)
}

fn mask_secret(val: &str) -> String {
    let len = val.len();
    if len <= 8 {
        format!("{}****", &val[..2.min(len)])
    } else {
        let prefix = &val[..4.min(len)];
        let suffix = &val[len.saturating_sub(4)..];
        format!("{prefix}****...****{suffix}")
    }
}

pub fn scan_staged_secrets(repo: &Repository) -> AppResult<Vec<SecretFinding>> {
    let mut findings = Vec::new();
    let index = repo.index()?;

    // 1. Scan staged filenames for sensitive patterns
    for entry in index.iter() {
        let path_bytes = &entry.path;
        let path_str = String::from_utf8_lossy(path_bytes);
        let path_lower = path_str.to_lowercase();

        if path_lower.ends_with(".env") || path_lower.contains(".env.") || path_lower.starts_with(".env.") {
            findings.push(SecretFinding {
                file_path: path_str.to_string(),
                rule_id: "env_file".to_string(),
                rule_name: "Environment File".to_string(),
                description: "Environment configuration file containing secrets or credentials".to_string(),
                line_number: None,
                snippet_masked: None,
                severity: "critical".to_string(),
            });
        } else if path_lower.contains("id_rsa") || path_lower.contains("id_ed25519") || path_lower.contains("id_ecdsa") || path_lower.contains("id_dsa") {
            findings.push(SecretFinding {
                file_path: path_str.to_string(),
                rule_id: "ssh_key".to_string(),
                rule_name: "SSH Private Key".to_string(),
                description: "SSH Private Key file should never be committed to Git".to_string(),
                line_number: None,
                snippet_masked: None,
                severity: "critical".to_string(),
            });
        } else if path_lower.ends_with(".pem") || path_lower.ends_with(".key") || path_lower.ends_with(".pfx") || path_lower.ends_with(".p12") || path_lower.ends_with(".keystore") {
            findings.push(SecretFinding {
                file_path: path_str.to_string(),
                rule_id: "cert_key".to_string(),
                rule_name: "Private Key / Certificate".to_string(),
                description: "Cryptographic private key or identity certificate file".to_string(),
                line_number: None,
                snippet_masked: None,
                severity: "critical".to_string(),
            });
        } else if path_lower.ends_with("credentials.json") || path_lower.ends_with("client_secret.json") || path_lower.ends_with("service_account.json") {
            findings.push(SecretFinding {
                file_path: path_str.to_string(),
                rule_id: "oauth_credentials".to_string(),
                rule_name: "OAuth / Cloud Credentials".to_string(),
                description: "Cloud service account or OAuth client credentials file".to_string(),
                line_number: None,
                snippet_masked: None,
                severity: "critical".to_string(),
            });
        }
    }

    // 2. Scan staged content diff for API keys & tokens
    let head_tree = match repo.head().and_then(|h| h.peel_to_tree()) {
        Ok(tree) => Some(tree),
        Err(_) => None,
    };

    let mut diff_opts = git2::DiffOptions::new();
    diff_opts.context_lines(0);
    let diff = repo.diff_tree_to_index(head_tree.as_ref(), Some(&index), Some(&mut diff_opts))?;

    // Precompile Regex rules
    let rules: Vec<(&str, &str, &str, Regex)> = vec![
        (
            "aws_access_key",
            "AWS Access Key",
            "AWS Access Key ID found in staged content",
            Regex::new(r"\b(AKIA[0-9A-Z]{16})\b").unwrap(),
        ),
        (
            "openai_key",
            "OpenAI API Key",
            "OpenAI API Secret Key found in staged content",
            Regex::new(r"\b(sk-[a-zA-Z0-9]{20,T3BlbkFJ[a-zA-Z0-9]{20,}|sk-proj-[a-zA-Z0-9_-]{30,})\b").unwrap(),
        ),
        (
            "github_token",
            "GitHub Token",
            "GitHub Personal Access Token found in staged content",
            Regex::new(r"\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{50,})\b").unwrap(),
        ),
        (
            "slack_token",
            "Slack Token",
            "Slack API token found in staged content",
            Regex::new(r"\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b").unwrap(),
        ),
        (
            "stripe_key",
            "Stripe Secret Key",
            "Stripe live secret key found in staged content",
            Regex::new(r"\b(sk_live_[0-9a-zA-Z]{24,})\b").unwrap(),
        ),
        (
            "google_key",
            "Google API Key",
            "Google API key found in staged content",
            Regex::new(r"\b(AIza[0-9A-Za-z\-_]{35})\b").unwrap(),
        ),
        (
            "private_key_block",
            "Private Key Header",
            "PEM formatted private key block detected",
            Regex::new(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----").unwrap(),
        ),
    ];

    let mut content_findings = Vec::new();

    let _ = diff.print(git2::DiffFormat::Patch, |delta, _hunk, line| {
        if line.origin() == '+' {
            if let Ok(line_str) = std::str::from_utf8(line.content()) {
                let file_path = delta
                    .new_file()
                    .path()
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();
                let line_num = line.new_lineno().map(|n| n as usize);

                for (rule_id, rule_name, desc, re) in &rules {
                    if let Some(mat) = re.find(line_str) {
                        let masked = mask_secret(mat.as_str());
                        content_findings.push(SecretFinding {
                            file_path: file_path.clone(),
                            rule_id: rule_id.to_string(),
                            rule_name: rule_name.to_string(),
                            description: desc.to_string(),
                            line_number: line_num,
                            snippet_masked: Some(masked),
                            severity: "critical".to_string(),
                        });
                        break;
                    }
                }
            }
        }
        true
    });

    findings.extend(content_findings);
    Ok(findings)
}

pub fn get_reflog_entries(repo: &Repository, limit: Option<usize>) -> AppResult<Vec<ReflogEntry>> {
    let reflog = repo.reflog("HEAD").map_err(|e| {
        AppError::Internal(format!("Failed to open reflog: {e}"))
    })?;

    let limit = limit.unwrap_or(100);
    let count = reflog.len();

    // Collect all local branch tips
    let mut branch_tips = Vec::new();
    if let Ok(branches) = repo.branches(Some(git2::BranchType::Local)) {
        for branch_res in branches {
            if let Ok((branch, _)) = branch_res {
                if let Ok(commit) = branch.get().peel_to_commit() {
                    branch_tips.push(commit.id());
                }
            }
        }
    }

    let mut entries = Vec::new();
    for i in 0..count {
        if entries.len() >= limit {
            break;
        }
        let idx = count - 1 - i;
        if let Some(entry) = reflog.get(idx) {
            let commit_oid = entry.id_new();
            let old_oid = entry.id_old();
            let msg = entry.message().unwrap_or("").to_string();
            let committer = entry.committer().name().unwrap_or("Unknown").to_string();
            let timestamp = entry.committer().when().seconds();

            let action = if let Some(first) = msg.split(':').next() {
                first.trim().to_lowercase()
            } else {
                "unknown".to_string()
            };

            let is_orphaned = if branch_tips.is_empty() {
                false
            } else {
                let mut reachable = false;
                for &tip in &branch_tips {
                    if tip == commit_oid || repo.graph_descendant_of(tip, commit_oid).unwrap_or(false) {
                        reachable = true;
                        break;
                    }
                }
                !reachable
            };

            let commit_id_str = commit_oid.to_string();
            let short_id: String = commit_id_str.chars().take(7).collect();

            entries.push(ReflogEntry {
                index: i,
                commit_id: commit_id_str,
                short_id,
                old_id: old_oid.to_string(),
                action,
                message: msg,
                committer,
                timestamp,
                is_orphaned,
            });
        }
    }

    Ok(entries)
}

pub fn restore_lost_commit(repo: &Repository, commit_id: &str, branch_name: &str) -> AppResult<String> {
    let oid = git2::Oid::from_str(commit_id)
        .map_err(|e| AppError::Internal(format!("Invalid commit SHA {commit_id}: {e}")))?;
    let commit = repo.find_commit(oid)
        .map_err(|e| AppError::Internal(format!("Commit {commit_id} not found: {e}")))?;

    let clean_name = branch_name.trim().replace("refs/heads/", "");
    if clean_name.is_empty() {
        return Err(AppError::Internal("Branch name cannot be empty".into()));
    }

    let branch = repo.branch(&clean_name, &commit, false)
        .map_err(|e| AppError::Internal(format!("Failed to create rescue branch '{clean_name}': {e}")))?;

    let refname = branch.get().name().unwrap_or("").to_string();
    Ok(refname)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use git2::Signature;

    #[test]
    fn test_safe_discard_and_restore() {
        let dir = tempdir().unwrap();
        let repo = Repository::init(dir.path()).unwrap();
        let db_file = dir.path().join("trash_test.db");
        let store = TrashStore::new(&db_file).unwrap();

        // 1. Initial commit
        let file_path = dir.path().join("hello.txt");
        std::fs::write(&file_path, "Initial line\n").unwrap();

        let sig = Signature::now("Tester", "test@flowgit.local").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("hello.txt")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[]).unwrap();

        // 2. Modify file in workdir
        std::fs::write(&file_path, "Modified line\nExtra line\n").unwrap();

        // 3. Discard file changes
        let snap_id = discard_file_changes(&repo, &store, "hello.txt").unwrap();
        assert!(snap_id > 0);

        // File on disk should be back to initial content
        let content_after = std::fs::read_to_string(&file_path).unwrap().replace("\r\n", "\n");
        assert_eq!(content_after, "Initial line\n");

        // 4. Check TrashStore
        let repo_path = repo.workdir().unwrap().to_string_lossy().to_string();
        let trash_items = list_trash_snapshots(&store, &repo_path).unwrap();
        assert_eq!(trash_items.len(), 1);
        assert_eq!(trash_items[0].file_path, "hello.txt");

        // 5. Restore from trash
        restore_trash_snapshot(&repo, &store, trash_items[0].id).unwrap();
        let content_restored = std::fs::read_to_string(&file_path).unwrap().replace("\r\n", "\n");
        assert_eq!(content_restored, "Modified line\nExtra line\n");

        // 6. Trash store should now be empty for this snapshot
        let trash_items_after = list_trash_snapshots(&store, &repo_path).unwrap();
        assert_eq!(trash_items_after.len(), 0);
    }

    #[test]
    fn test_scan_staged_secrets_detects_keys_and_env() {
        let dir = tempdir().unwrap();
        let repo = Repository::init(dir.path()).unwrap();

        // 1. Initial commit
        let readme = dir.path().join("README.md");
        std::fs::write(&readme, "# Hello\n").unwrap();
        let sig = Signature::now("Tester", "test@flowgit.local").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("README.md")).unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[]).unwrap();

        // 2. Stage a .env file
        let env_file = dir.path().join(".env.production");
        std::fs::write(&env_file, "SECRET_KEY=12345\n").unwrap();
        index.add_path(Path::new(".env.production")).unwrap();

        // 3. Stage a code file with an OpenAI key and AWS key
        let code_file = dir.path().join("config.ts");
        std::fs::write(
            &code_file,
            "export const apiKey = 'sk-proj-1234567890abcdef1234567890abcdef1234';\nexport const aws = 'AKIAIOSFODNN7EXAMPLE';\n",
        )
        .unwrap();
        index.add_path(Path::new("config.ts")).unwrap();
        index.write().unwrap();

        // 4. Scan staged secrets
        let findings = scan_staged_secrets(&repo).unwrap();
        assert!(findings.len() >= 3);

        let has_env = findings.iter().any(|f| f.rule_id == "env_file");
        let has_openai = findings.iter().any(|f| f.rule_id == "openai_key");
        let has_aws = findings.iter().any(|f| f.rule_id == "aws_access_key");

        assert!(has_env, "Should detect .env file");
        assert!(has_openai, "Should detect OpenAI key");
        assert!(has_aws, "Should detect AWS key");

        // Verify snippet is masked
        let openai_finding = findings.iter().find(|f| f.rule_id == "openai_key").unwrap();
        assert!(openai_finding.snippet_masked.as_ref().unwrap().contains("****...****"));
    }

    #[test]
    fn test_reflog_detects_orphaned_commit() {
        let dir = tempdir().unwrap();
        let repo = Repository::init(dir.path()).unwrap();
        let sig = Signature::now("Tester", "test@flowgit.local").unwrap();

        // Commit 1
        let f1 = dir.path().join("f1.txt");
        std::fs::write(&f1, "1").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("f1.txt")).unwrap();
        let t1 = repo.find_tree(index.write_tree().unwrap()).unwrap();
        let c1 = repo.commit(Some("HEAD"), &sig, &sig, "Commit 1", &t1, &[]).unwrap();

        // Create main branch
        let c1_obj = repo.find_commit(c1).unwrap();
        repo.branch("main", &c1_obj, true).unwrap();
        repo.set_head("refs/heads/main").unwrap();

        // Commit 2
        let f2 = dir.path().join("f2.txt");
        std::fs::write(&f2, "2").unwrap();
        index.add_path(Path::new("f2.txt")).unwrap();
        let t2 = repo.find_tree(index.write_tree().unwrap()).unwrap();
        let c2 = repo.commit(Some("HEAD"), &sig, &sig, "Commit 2", &t2, &[&c1_obj]).unwrap();

        // Reset main back to Commit 1
        let mut target_branch = repo.find_reference("refs/heads/main").unwrap();
        target_branch.set_target(c1, "reset: back to c1").unwrap();

        // Get reflog
        let entries = get_reflog_entries(&repo, Some(50)).unwrap();
        assert!(!entries.is_empty());

        // Commit 2 should now be marked as orphaned!
        let c2_entry = entries.iter().find(|e| e.commit_id == c2.to_string());
        assert!(c2_entry.is_some(), "Commit 2 should be in reflog");
        assert!(c2_entry.unwrap().is_orphaned, "Commit 2 should be orphaned after reset");

        // Restore Commit 2 into a new branch
        let rescue_ref = restore_lost_commit(&repo, &c2.to_string(), "rescue-branch").unwrap();
        assert_eq!(rescue_ref, "refs/heads/rescue-branch");

        // After restoring, Commit 2 should no longer be orphaned
        let entries_after = get_reflog_entries(&repo, Some(50)).unwrap();
        let c2_after = entries_after.iter().find(|e| e.commit_id == c2.to_string()).unwrap();
        assert!(!c2_after.is_orphaned, "Commit 2 should not be orphaned after rescue branch is created");
    }
}
