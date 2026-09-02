use std::sync::Arc;
use crate::storage::accounts::AccountStore;
use crate::storage::action_log::ActionLogStore;
use crate::storage::trash::TrashStore;
use crate::watcher::RepoWatcherState;

pub struct AppState {
    pub trash_store: Arc<TrashStore>,
    pub action_store: Arc<ActionLogStore>,
    pub account_store: Arc<AccountStore>,
    pub watcher: Arc<RepoWatcherState>,
}
