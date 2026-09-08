use tauri::{command, State};
use crate::commands::state::AppState;
use crate::error::{AppError, AppResult};
use crate::git::{
    auth::{
        execute_remote_with_credentials, poll_github_device_token, start_github_device_flow,
        verify_and_fetch_account, AccountProfile, DeviceCodeResponse, DevicePollResult,
        GitCredentials, RemoteActionResult,
    },
    identity::{
        get_current_repo_identity as git_get_current_identity,
        set_repo_identity as git_set_repo_identity, CurrentRepoIdentity, GitIdentity,
    },
    repo::open_repository as git_open_repo,
};
use crate::storage::accounts::RepoBinding;

#[command]
pub async fn execute_remote_with_auth(
    path: String,
    action: String,
    remote: String,
    branch: Option<String>,
    force: bool,
    set_upstream: Option<bool>,
    credentials: Option<GitCredentials>,
    state: State<'_, AppState>,
) -> AppResult<RemoteActionResult> {
    let effective_creds = match credentials {
        Some(c) => Some(c),
        None => {
            // Priority 1: Check repo-bound account
            let bound_acc = state
                .account_store
                .get_repo_binding(&path)
                .ok()
                .flatten()
                .and_then(|b| b.account_id)
                .and_then(|id| state.account_store.get_account_by_id(&id).ok().flatten());

            let account = if bound_acc.is_some() {
                bound_acc
            } else {
                // Priority 2: Auto-detect by remote URL
                let auto_provider = if let Ok(r) = git_open_repo(&path) {
                    r.find_remote(&remote).ok().and_then(|rem| {
                        rem.url().and_then(|u| {
                            let lower = u.to_lowercase();
                            if lower.contains("github.com") {
                                Some("github")
                            } else if lower.contains("gitlab") {
                                Some("gitlab")
                            } else {
                                None
                            }
                        })
                    })
                } else {
                    None
                };

                if let Some(provider) = auto_provider {
                    state.account_store.get_active_account(Some(provider)).ok().flatten()
                } else {
                    None
                }
            };

            // Priority 3: Fallback to global active account
            let final_acc = if account.is_some() {
                account
            } else {
                state.account_store.get_active_account(None).ok().flatten()
            };

            final_acc.map(|acc| GitCredentials {
                auth_type: "https_token".to_string(),
                ssh_passphrase: None,
                username: Some(acc.username),
                token: Some(acc.token),
            })
        }
    };
    tokio::task::spawn_blocking(move || {
        execute_remote_with_credentials(
            &path,
            &action,
            &remote,
            branch.as_deref(),
            force,
            set_upstream,
            effective_creds,
        )
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}


#[command]
pub async fn save_account_auth(
    state: State<'_, AppState>,
    profile: AccountProfile,
) -> AppResult<()> {
    state.account_store.save_account(&profile)
}

#[command]
pub async fn get_active_account(
    state: State<'_, AppState>,
    provider: Option<String>,
) -> AppResult<Option<AccountProfile>> {
    state.account_store.get_active_account(provider.as_deref())
}

#[command]
pub async fn list_accounts(
    state: State<'_, AppState>,
) -> AppResult<Vec<AccountProfile>> {
    state.account_store.list_accounts()
}

#[command]
pub async fn delete_account(
    state: State<'_, AppState>,
    id: String,
) -> AppResult<()> {
    state.account_store.delete_account(&id)
}

#[command]
pub async fn verify_token_and_get_profile(
    provider: String,
    token: String,
    host: Option<String>,
) -> AppResult<AccountProfile> {
    tokio::task::spawn_blocking(move || {
        verify_and_fetch_account(&provider, &token, host.as_deref())
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn start_github_device_login(
    client_id: Option<String>,
) -> AppResult<DeviceCodeResponse> {
    tokio::task::spawn_blocking(move || {
        start_github_device_flow(client_id.as_deref())
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn check_github_device_login(
    client_id: Option<String>,
    device_code: String,
) -> AppResult<DevicePollResult> {
    tokio::task::spawn_blocking(move || {
        poll_github_device_token(client_id.as_deref(), &device_code)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_current_repo_identity(path: String) -> AppResult<CurrentRepoIdentity> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_get_current_identity(&repo)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn set_repo_identity(
    path: String,
    name: String,
    email: String,
    is_global: bool,
) -> AppResult<()> {
    tokio::task::spawn_blocking(move || {
        let repo = git_open_repo(&path)?;
        git_set_repo_identity(&repo, &name, &email, is_global)
    })
    .await
    .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn list_identity_profiles(state: State<'_, AppState>) -> AppResult<Vec<GitIdentity>> {
    let store = state.account_store.clone();
    tokio::task::spawn_blocking(move || store.list_identities())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn save_identity_profile(
    identity: GitIdentity,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let store = state.account_store.clone();
    tokio::task::spawn_blocking(move || store.save_identity(identity))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn delete_identity_profile(
    id: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let store = state.account_store.clone();
    tokio::task::spawn_blocking(move || store.delete_identity(&id))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn get_repo_binding(
    repo_path: String,
    state: State<'_, AppState>,
) -> AppResult<Option<RepoBinding>> {
    let store = state.account_store.clone();
    tokio::task::spawn_blocking(move || store.get_repo_binding(&repo_path))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn save_repo_binding(
    binding: RepoBinding,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let store = state.account_store.clone();
    tokio::task::spawn_blocking(move || store.save_repo_binding(&binding))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn list_repo_bindings(
    state: State<'_, AppState>,
) -> AppResult<Vec<RepoBinding>> {
    let store = state.account_store.clone();
    tokio::task::spawn_blocking(move || store.list_repo_bindings())
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

#[command]
pub async fn delete_repo_binding(
    repo_path: String,
    state: State<'_, AppState>,
) -> AppResult<()> {
    let store = state.account_store.clone();
    tokio::task::spawn_blocking(move || store.delete_repo_binding(&repo_path))
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
}

