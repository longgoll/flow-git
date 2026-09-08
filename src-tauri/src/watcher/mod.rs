use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;
use notify_debouncer_mini::{new_debouncer, DebouncedEvent, Debouncer};
use notify::RecommendedWatcher;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoWatchEvent {
    pub path: String,
    pub event_type: String, // "head" | "working_tree" | "all"
}

pub struct RepoWatcherState {
    pub current_watched_path: Mutex<Option<String>>,
    _debouncer: Mutex<Option<Debouncer<RecommendedWatcher>>>,
}

impl RepoWatcherState {
    pub fn new() -> Self {
        Self {
            current_watched_path: Mutex::new(None),
            _debouncer: Mutex::new(None),
        }
    }

    pub fn watch_repo(&self, app_handle: AppHandle, repo_path: &str) -> AppResult<()> {
        let path = PathBuf::from(repo_path);
        if !path.exists() {
            return Err(AppError::NotFound(format!("Path does not exist: {repo_path}")));
        }

        let repo_path_str = repo_path.to_string();
        let app = app_handle.clone();
        let event_repo_path = repo_path_str.clone();

        // 300ms debounce to prevent event storm on large file changes / builds
        let mut debouncer = new_debouncer(
            Duration::from_millis(300),
            move |res: Result<Vec<DebouncedEvent>, _>| {
                if let Ok(events) = res {
                    let mut has_head_change = false;
                    let mut has_wt_change = false;

                    for e in events {
                        let p = e.path.to_string_lossy().replace('\\', "/");

                        // 1. Skip noisy, high-churn directories and internal database files
                        if p.contains("/node_modules/")
                            || p.contains("/target/")
                            || p.contains("/dist/")
                            || p.contains("/.svelte-kit/")
                            || p.contains("/.next/")
                            || p.contains("/.nuxt/")
                            || p.contains("/__pycache__/")
                            || p.contains("/.vscode/")
                            || p.contains("/.idea/")
                            || p.contains("/.git/objects/")
                            || p.contains("/.git/logs/")
                            || p.ends_with(".lock")
                            || p.ends_with(".tmp")
                            || p.contains("trash_cache.db")
                            || p.contains("action_history.db")
                            || p.contains("accounts.db")
                        {
                            continue;
                        }

                        // 2. Classify event
                        if p.contains("/.git/HEAD")
                            || p.contains("/.git/refs/")
                            || p.contains("/.git/packed-refs")
                            || p.contains("/.git/config")
                        {
                            has_head_change = true;
                        } else if p.contains("/.git/index") || !p.contains("/.git/") {
                            has_wt_change = true;
                        }
                    }

                    if has_head_change || has_wt_change {
                        let event_type = if has_head_change && has_wt_change {
                            "all"
                        } else if has_head_change {
                            "head"
                        } else {
                            "working_tree"
                        };

                        let payload = RepoWatchEvent {
                            path: event_repo_path.clone(),
                            event_type: event_type.to_string(),
                        };

                        // Emit both structured event and backward-compatible path string
                        let _ = app.emit("repo-status-changed", &payload);
                    }
                }
            },
        )
        .map_err(|e| AppError::Internal(format!("Failed to create file watcher: {e}")))?;

        debouncer
            .watcher()
            .watch(&path, notify::RecursiveMode::Recursive)
            .map_err(|e| AppError::Internal(format!("Failed to watch directory: {e}")))?;

        if let Ok(mut deb_guard) = self._debouncer.lock() {
            *deb_guard = Some(debouncer);
        }
        if let Ok(mut path_guard) = self.current_watched_path.lock() {
            *path_guard = Some(repo_path_str);
        }

        Ok(())
    }
}

