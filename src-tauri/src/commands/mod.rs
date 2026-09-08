pub mod action;
pub mod advanced;
pub mod auth;
pub mod bisect;
pub mod branch;
pub mod conflict;
pub mod diff;
pub mod edge_cases;
pub mod remote;
pub mod repo;
pub mod state;
pub mod worktree;
pub mod hooks;

// Re-export AppState and all commands for convenience
pub use state::AppState;

pub use repo::{
    apply_patch, check_patch, clone_repository, compare_two_commits, export_commit_patch,
    get_commit_history, get_commit_info, get_commit_signature, get_file_content, get_focus_branch_info,
    get_paginated_commit_history, get_remote_url, get_repo_file_churn, get_signing_config, get_trash_snapshot_diff,
    get_tree_entries, get_unpushed_stacked_commits, grep_repository_content, init_repository,
    nuke_file_from_history, open_in_external_editor, open_repository, reorder_stacked_commits,
    reveal_in_file_manager, save_file_content, search_commits_pickaxe, set_signing_config,
};

pub use branch::{
    checkout_branch, create_branch, delete_branch, delete_merged_branches, get_branches,
    get_merged_branches, get_stash_detail, get_stash_file_diff, get_stashes, get_tags,
    rename_branch, smart_sync, stash_apply, stash_branch, stash_drop, stash_pop, stash_save,
};

pub use diff::{
    add_to_gitignore, delete_trash_snapshot, discard_all_changes, discard_file_changes,
    generate_standard_gitignore, get_commit_file_diff, get_file_blame, get_file_diff,
    get_file_history, get_status, list_trash_snapshots, restore_trash_batch, restore_trash_snapshot, stage_all,
    stage_file, stage_hunk, unstage_all, unstage_file, unstage_hunk,
};

pub use remote::{
    add_remote, fetch_remote, get_incoming_commits, get_remotes, remove_remote,
    set_remote_url, silent_background_fetch,
};

pub use action::{
    abort_current_operation, check_is_rebasing, continue_rebase_branch, create_commit,
    create_tag, delete_tag, execute_cherry_pick_commit, execute_interactive_rebase,
    execute_merge_commit, execute_rebase_branch, get_reflog_entries, get_repo_operation_state,
    list_actions, prepare_interactive_rebase, redo_action, reset_to_commit, restore_lost_commit,
    revert_commit, scan_staged_secrets, simulate_drag_action, skip_rebase_step, squash_commits,
    time_travel_to, undo_action,
};

pub use conflict::{
    abort_merge_or_rebase, get_conflict_details, get_conflicted_files, resolve_conflict_file,
};

pub use bisect::{
    abort_bisect, bisect_step, get_bisect_status, run_auto_bisect, start_bisect,
};

pub use worktree::{
    create_worktree, delete_worktree, list_worktrees,
};

pub use advanced::{
    disable_sparse_checkout, get_lfs_info, get_sparse_checkout_info, get_submodule_diff,
    get_submodules, lock_lfs_file, pull_lfs_files, reapply_sparse_checkout, set_sparse_checkout,
    sync_submodules, track_lfs_pattern, unlock_lfs_file, untrack_lfs_pattern, update_submodules,
};

pub use auth::{
    check_github_device_login, delete_account, delete_identity_profile,
    delete_repo_binding, execute_remote_with_auth, get_active_account,
    get_current_repo_identity, get_repo_binding, list_accounts,
    list_identity_profiles, list_repo_bindings, save_account_auth,
    save_identity_profile, save_repo_binding, set_repo_identity,
    start_github_device_login, verify_token_and_get_profile,
};

pub use edge_cases::{
    check_file_locks, clear_index_lock, is_index_locked, scan_heavy_files, shelve_untracked_files,
};

pub use hooks::{
    get_git_hooks, save_git_hook, toggle_git_hook,
};
