use git2::{build::CheckoutBuilder, Oid, Repository};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BisectStatus {
    pub is_active: bool,
    pub bad_commit_id: Option<String>,
    pub good_commit_ids: Vec<String>,
    pub current_commit_id: Option<String>,
    pub current_commit_summary: Option<String>,
    pub current_commit_author: Option<String>,
    pub estimated_steps_remaining: usize,
    pub tested_commits_count: usize,
    pub total_commits_count: usize,
    pub culprit_commit_id: Option<String>,
    pub original_head: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct BisectDiskState {
    bad_commit: String,
    good_commits: Vec<String>,
    candidates: Vec<String>,
    tested_count: usize,
    original_head: String,
}

fn bisect_state_file(repo: &Repository) -> PathBuf {
    repo.path().join("flowgit_bisect.json")
}

pub fn get_bisect_status(repo: &Repository) -> AppResult<BisectStatus> {
    let state_file = bisect_state_file(repo);
    if !state_file.exists() {
        return Ok(BisectStatus {
            is_active: false,
            bad_commit_id: None,
            good_commit_ids: Vec::new(),
            current_commit_id: None,
            current_commit_summary: None,
            current_commit_author: None,
            estimated_steps_remaining: 0,
            tested_commits_count: 0,
            total_commits_count: 0,
            culprit_commit_id: None,
            original_head: None,
        });
    }

    let raw = std::fs::read_to_string(&state_file)
        .map_err(|e| AppError::Internal(format!("Failed to read bisect state: {e}")))?;
    let disk_state: BisectDiskState = serde_json::from_str(&raw)
        .map_err(|e| AppError::Internal(format!("Failed to parse bisect state: {e}")))?;

    if disk_state.candidates.is_empty() {
        // Bisect is done, culprit found
        return Ok(BisectStatus {
            is_active: false,
            bad_commit_id: Some(disk_state.bad_commit.clone()),
            good_commit_ids: disk_state.good_commits,
            current_commit_id: None,
            current_commit_summary: None,
            current_commit_author: None,
            estimated_steps_remaining: 0,
            tested_commits_count: disk_state.tested_count,
            total_commits_count: disk_state.tested_count,
            culprit_commit_id: Some(disk_state.bad_commit),
            original_head: Some(disk_state.original_head),
        });
    }

    let current_mid = &disk_state.candidates[disk_state.candidates.len() / 2];
    let (summary, author) = if let Ok(oid) = Oid::from_str(current_mid) {
        if let Ok(c) = repo.find_commit(oid) {
            (
                c.summary().map(|s| s.to_string()),
                Some(c.author().name().unwrap_or("Unknown").to_string()),
            )
        } else {
            (None, None)
        }
    } else {
        (None, None)
    };

    let remaining = disk_state.candidates.len();
    let est_steps = if remaining > 0 {
        ((remaining as f64).log2().ceil() as usize).max(1)
    } else {
        0
    };

    Ok(BisectStatus {
        is_active: true,
        bad_commit_id: Some(disk_state.bad_commit),
        good_commit_ids: disk_state.good_commits,
        current_commit_id: Some(current_mid.clone()),
        current_commit_summary: summary,
        current_commit_author: author,
        estimated_steps_remaining: est_steps,
        tested_commits_count: disk_state.tested_count,
        total_commits_count: disk_state.tested_count + remaining,
        culprit_commit_id: None,
        original_head: Some(disk_state.original_head),
    })
}

pub fn start_bisect(
    repo: &Repository,
    bad_commit_id: &str,
    good_commit_id: &str,
) -> AppResult<BisectStatus> {
    let bad_oid = Oid::from_str(bad_commit_id)
        .map_err(|e| AppError::Internal(format!("Invalid bad commit ID: {e}")))?;
    let good_oid = Oid::from_str(good_commit_id)
        .map_err(|e| AppError::Internal(format!("Invalid good commit ID: {e}")))?;

    // Store original HEAD
    let original_head = repo
        .head()
        .ok()
        .and_then(|h| h.name().map(|n| n.to_string()).or_else(|| h.target().map(|t| t.to_string())))
        .unwrap_or_else(|| bad_commit_id.to_string());

    // Compute candidate commits between good and bad
    let candidates = get_commit_range(repo, bad_oid, good_oid)?;

    if candidates.is_empty() {
        return Err(AppError::Internal(
            "No commits found between specified good and bad commits".into(),
        ));
    }

    let mid_idx = candidates.len() / 2;
    let mid_commit_id = candidates[mid_idx].clone();

    // Checkout mid commit in detached HEAD
    checkout_commit(repo, &mid_commit_id)?;

    let disk_state = BisectDiskState {
        bad_commit: bad_commit_id.to_string(),
        good_commits: vec![good_commit_id.to_string()],
        candidates: candidates.clone(),
        tested_count: 0,
        original_head: original_head.clone(),
    };

    let state_file = bisect_state_file(repo);
    let raw = serde_json::to_string_pretty(&disk_state)
        .map_err(|e| AppError::Internal(format!("Failed to serialize bisect state: {e}")))?;
    std::fs::write(&state_file, raw)
        .map_err(|e| AppError::Internal(format!("Failed to write bisect state: {e}")))?;

    get_bisect_status(repo)
}

pub fn bisect_step(repo: &Repository, is_good: bool) -> AppResult<BisectStatus> {
    let state_file = bisect_state_file(repo);
    if !state_file.exists() {
        return Err(AppError::Internal("No active bisect session".into()));
    }

    let raw = std::fs::read_to_string(&state_file)
        .map_err(|e| AppError::Internal(format!("Failed to read bisect state: {e}")))?;
    let mut disk_state: BisectDiskState = serde_json::from_str(&raw)
        .map_err(|e| AppError::Internal(format!("Failed to parse bisect state: {e}")))?;

    if disk_state.candidates.is_empty() {
        return get_bisect_status(repo);
    }

    let mid_idx = disk_state.candidates.len() / 2;
    let current_test = disk_state.candidates[mid_idx].clone();
    disk_state.tested_count += 1;

    if is_good {
        // Commit is good: bug was introduced AFTER this commit
        disk_state.good_commits.push(current_test.clone());
        // Remove tested commit and all commits older than it
        disk_state.candidates = disk_state.candidates[..mid_idx].to_vec();
    } else {
        // Commit is bad: bug is either THIS commit or introduced before it
        disk_state.bad_commit = current_test.clone();
        // Remove commits newer than it
        disk_state.candidates = disk_state.candidates[mid_idx + 1..].to_vec();
    }

    if disk_state.candidates.is_empty() {
        // Found culprit! It is disk_state.bad_commit
        let raw = serde_json::to_string_pretty(&disk_state).unwrap_or_default();
        let _ = std::fs::write(&state_file, raw);
        return get_bisect_status(repo);
    }

    let next_mid_idx = disk_state.candidates.len() / 2;
    let next_mid_id = disk_state.candidates[next_mid_idx].clone();

    checkout_commit(repo, &next_mid_id)?;

    let raw = serde_json::to_string_pretty(&disk_state)
        .map_err(|e| AppError::Internal(format!("Failed to serialize bisect state: {e}")))?;
    std::fs::write(&state_file, raw)
        .map_err(|e| AppError::Internal(format!("Failed to write bisect state: {e}")))?;

    get_bisect_status(repo)
}

pub fn abort_bisect(repo: &Repository) -> AppResult<()> {
    let state_file = bisect_state_file(repo);
    if state_file.exists() {
        if let Ok(raw) = std::fs::read_to_string(&state_file) {
            if let Ok(disk_state) = serde_json::from_str::<BisectDiskState>(&raw) {
                // Restore original HEAD
                let _ = checkout_commit(repo, &disk_state.original_head);
            }
        }
        let _ = std::fs::remove_file(state_file);
    }
    Ok(())
}

fn checkout_commit(repo: &Repository, ref_or_sha: &str) -> AppResult<()> {
    if let Ok(oid) = Oid::from_str(ref_or_sha) {
        if let Ok(commit) = repo.find_commit(oid) {
            let mut builder = CheckoutBuilder::new();
            builder.force();
            repo.checkout_tree(commit.as_object(), Some(&mut builder))?;
            repo.set_head_detached(oid)?;
            return Ok(());
        }
    }

    // Try as reference name
    if let Ok(reference) = repo.find_reference(ref_or_sha) {
        if let Some(target_oid) = reference.target() {
            let commit = repo.find_commit(target_oid)?;
            let mut builder = CheckoutBuilder::new();
            builder.force();
            repo.checkout_tree(commit.as_object(), Some(&mut builder))?;
            repo.set_head(ref_or_sha)?;
            return Ok(());
        }
    }

    Err(AppError::Internal(format!("Failed to checkout target: {ref_or_sha}")))
}

fn get_commit_range(repo: &Repository, bad: Oid, good: Oid) -> AppResult<Vec<String>> {
    let mut revwalk = repo.revwalk()?;
    revwalk.push(bad)?;
    revwalk.hide(good)?;

    let mut commits = Vec::new();
    for oid_res in revwalk {
        if let Ok(oid) = oid_res {
            commits.push(oid.to_string());
        }
    }

    Ok(commits)
}
