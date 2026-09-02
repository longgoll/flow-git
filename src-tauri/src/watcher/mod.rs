use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use notify_debouncer_mini::{new_debouncer, DebouncedEvent, Debouncer};
use notify::RecommendedWatcher;
use tauri::{AppHandle, Emitter};
use crate::error::{AppError, AppResult};

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

        // 50ms debounce
        let mut debouncer = new_debouncer(
            Duration::from_millis(50),
            move |res: Result<Vec<DebouncedEvent>, _>| {
                if let Ok(events) = res {
                    let has_relevant_change = events.iter().any(|e| {
                        let p = e.path.to_string_lossy();
                        // Ignore git internal noisy object writes, locks
                        !p.contains(".git\\objects")
                            && !p.contains(".git/objects")
                            && !p.ends_with(".lock")
                            && !p.ends_with("trash_cache.db")
                    });

                    if has_relevant_change {
                        let _ = app.emit("repo-status-changed", &event_repo_path);
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
