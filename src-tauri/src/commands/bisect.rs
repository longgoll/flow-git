use tauri::{command, AppHandle, Emitter};
use crate::error::{AppError, AppResult};
use crate::git::{
    bisect::{
        abort_bisect as git_abort_bisect, bisect_step as git_bisect_step,
        get_bisect_status as git_get_bisect_status, run_auto_bisect as git_run_auto_bisect,
        start_bisect as git_start_bisect, AutoBisectLogStep, AutoBisectResult, BisectStatus,
    },
    repo::open_repository as git_open_repo,
};

#[command]
pub async fn start_bisect(
    path: String,
    bad_commit_id: String,
    good_commit_id: String,
) -> AppResult<BisectStatus> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_start_bisect(&repo, &bad_commit_id, &good_commit_id)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn bisect_step(path: String, is_good: bool) -> AppResult<BisectStatus> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_bisect_step(&repo, is_good)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn abort_bisect(path: String) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_abort_bisect(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_bisect_status(path: String) -> AppResult<BisectStatus> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_bisect_status(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn run_auto_bisect(
    path: String,
    script: String,
    app_handle: AppHandle,
) -> AppResult<AutoBisectResult> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        let app = app_handle.clone();
        git_run_auto_bisect(&repo, &script, Some(move |step: &AutoBisectLogStep| {
            let _ = app.emit("bisect://step-log", step);
        }))
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

