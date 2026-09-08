pub mod commands;
pub mod error;
pub mod git;
pub mod storage;
pub mod watcher;

use std::sync::Arc;
use commands::*;
use storage::accounts::AccountStore;
use storage::action_log::ActionLogStore;
use storage::trash::TrashStore;
use watcher::RepoWatcherState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let trash_store = Arc::new(TrashStore::default_store().expect("Failed to initialize trash database"));
    let action_store = Arc::new(ActionLogStore::default_store().expect("Failed to initialize actions database"));
    let account_store = Arc::new(AccountStore::default_store().expect("Failed to initialize accounts database"));
    let watcher = Arc::new(RepoWatcherState::new());

    let state = AppState {
        trash_store,
        action_store,
        account_store,
        watcher,
    };

    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            // Repo & History
            open_repository,
            init_repository,
            clone_repository,
            get_commit_history,
            get_paginated_commit_history,
            get_commit_info,
            compare_two_commits,
            get_focus_branch_info,
            get_unpushed_stacked_commits,
            reorder_stacked_commits,
            get_tree_entries,
            get_file_content,
            get_remote_url,
            nuke_file_from_history,
            save_file_content,
            grep_repository_content,
            search_commits_pickaxe,
            open_in_external_editor,
            reveal_in_file_manager,
            // Patch & Churn & Signing
            export_commit_patch,
            check_patch,
            apply_patch,
            get_repo_file_churn,
            get_commit_signature,
            get_signing_config,
            set_signing_config,
            // Branches, Stashes & Tags
            get_branches,
            create_branch,
            delete_branch,
            get_merged_branches,
            delete_merged_branches,
            rename_branch,
            checkout_branch,
            get_tags,
            create_tag,
            delete_tag,
            get_stashes,
            get_stash_detail,
            get_stash_file_diff,
            stash_save,
            stash_apply,
            stash_pop,
            stash_drop,
            stash_branch,
            smart_sync,
            // Diff & Staging
            get_status,
            get_file_diff,
            get_commit_file_diff,
            stage_file,
            unstage_file,
            stage_all,
            unstage_all,
            stage_hunk,
            unstage_hunk,
            discard_file_changes,
            discard_all_changes,
            list_trash_snapshots,
            get_trash_snapshot_diff,
            restore_trash_snapshot,
            restore_trash_batch,
            delete_trash_snapshot,
            add_to_gitignore,
            generate_standard_gitignore,
            // Blame & File History
            get_file_blame,
            get_file_history,
            // Remotes
            get_remotes,
            add_remote,
            remove_remote,
            set_remote_url,
            fetch_remote,
            silent_background_fetch,
            get_incoming_commits,
            // Actions, Rebase & Time Machine
            create_commit,
            simulate_drag_action,
            execute_cherry_pick_commit,
            execute_merge_commit,
            execute_rebase_branch,
            continue_rebase_branch,
            check_is_rebasing,
            get_repo_operation_state,
            abort_current_operation,
            skip_rebase_step,
            revert_commit,
            reset_to_commit,
            squash_commits,
            list_actions,
            undo_action,
            redo_action,
            time_travel_to,
            scan_staged_secrets,
            get_reflog_entries,
            restore_lost_commit,
            // Conflicts
            get_conflicted_files,
            get_conflict_details,
            resolve_conflict_file,
            abort_merge_or_rebase,
            // Bisect
            start_bisect,
            bisect_step,
            abort_bisect,
            get_bisect_status,
            run_auto_bisect,
            // Worktrees
            list_worktrees,
            create_worktree,
            delete_worktree,
            // Submodules & LFS
            get_submodules,
            get_submodule_diff,
            update_submodules,
            sync_submodules,
            get_lfs_info,
            pull_lfs_files,
            lock_lfs_file,
            unlock_lfs_file,
            // Auth, Identity & Multi-Account
            save_account_auth,
            get_active_account,
            list_accounts,
            delete_account,
            verify_token_and_get_profile,
            start_github_device_login,
            check_github_device_login,
            execute_remote_with_auth,
            get_current_repo_identity,
            set_repo_identity,
            list_identity_profiles,
            save_identity_profile,
            delete_identity_profile,
            get_repo_binding,
            save_repo_binding,
            list_repo_bindings,
            delete_repo_binding,
            // Interactive Rebase
            prepare_interactive_rebase,
            execute_interactive_rebase,
            // Enterprise Edge Cases & Windows Safety
            check_file_locks,
            clear_index_lock,
            is_index_locked,
            scan_heavy_files,
            shelve_untracked_files,
            // Git Hooks Manager
            get_git_hooks,
            save_git_hook,
            toggle_git_hook,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FlowGit application");
}
