<div align="center">

# 🔌 Tauri v2 IPC Commands & Data Types Reference
### Danh Mục Tauri v2 IPC Commands & Data Types (API Reference)

> **Backend Engine:** Rust 2024 / Tauri v2 Native Bridge  
> **Command Coverage:** 70+ Commands with Scoped Capability Permissions  
> **Standard:** 2026 State-of-the-Art – 100% Synchronized with `src-tauri/src/lib.rs`  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

All IPC calls between Frontend (Svelte 5) and Backend (Rust) follow the standard `invoke<T>(command_name, payload)` pattern, returning `Result<T, AppError>`. Below is the complete reference organized by functional domain.

---

## 📂 1. Repository & History Commands

| Command Name | Parameters (Payload) | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `open_repository` | `path: String` | `RepoSummary` | Opens local repository, verifies validity, and returns high-level metrics (HEAD, branch, dirty file count). |
| `init_repository` | `path: String, bare: bool` | `RepoSummary` | Initializes new repository at target path (supports bare repos). |
| `clone_repository` | `url: String, target_path: String` | `RepoSummary` | Clones a remote repository to local disk. |
| `get_commit_history` | `path: String, max_count: usize` | `Vec<CommitNode>` | Fetches commit history with parallel topological lane allocation. |
| `get_paginated_commit_history` | `path: String, skip: usize, limit: usize` | `PaginatedCommitHistory` | Paginated commit stream for monorepos (> 100k commits) supporting lazy-loading. |
| `get_commit_info` | `path: String, commit_id: String` | `CommitDetail` | Retrieves full metadata for a commit (author, committer, message, files changed). |
| `compare_two_commits` | `path: String, base_id: String, target_id: String` | `ComparisonResult` | Compares two arbitrary commits/branches for offline PR review. |
| `get_tree_entries` | `path: String, commit_id: Option<String>, tree_path: Option<String>` | `Vec<TreeEntryItem>` | Traverses directory tree at specified commit or HEAD for Repository Explorer. |
| `get_file_content` | `path: String, file_path: String, commit_id: Option<String>` | `FileContentResponse` | Reads file content with UTF-8 decoding and binary detection flags. |
| `get_remote_url` | `path: String, remote_name: Option<String>` | `Option<String>` | Gets remote repository URL (defaults to `origin`). |
| `nuke_file_from_history` | `path: String, target_file_path: String` | `bool` | Recursively removes sensitive files (passwords, secrets) across all history. |
| `save_file_content` | `path: String, file_path: String, content: String` | `()` | Atomically persists edits from Monaco Editor to disk. |
| `grep_repository_content` | `path: String, query: String, case_sensitive: Option<bool>, max_results: Option<usize>` | `Vec<FileGrepMatch>` | Fast multi-threaded full-text grep across repository files via Rayon. |
| `open_in_external_editor` | `full_path: String, editor: Option<String>` | `()` | Opens file in external editor (Cursor, Antigravity, VS Code, Zed, Default). |
| `reveal_in_file_manager` | `full_path: String` | `()` | Reveals file in native OS File Explorer. |
| `get_focus_branch_info` | `path: String, branch_name: Option<String>, base_branch: Option<String>` | `FocusBranchResult` | Retrieves isolated commit stream belonging to Focus branch relative to Base. |
| `get_unpushed_stacked_commits` | `path: String` | `Vec<StackedCommitItem>` | Lists unpushed commits in active branch for Stacked PR workflows. |
| `reorder_stacked_commits` | `path: String, new_order_ids: Vec<String>` | `bool` | Reorders unpushed commits using the Reorder Sequencer. |
| `search_commits_pickaxe` | `path: String, query: String, max_results: Option<usize>` | `Vec<PickaxeSearchResult>` | **Pickaxe Search (`-S`)**: Finds commits that introduced or removed specific lines/strings across diffs. |
| `export_commit_patch` | `path: String, commit_id: String` | `String` | **Patch Engine**: Exports a commit as a standard `git format-patch` compatible patch string. |
| `check_patch` | `path: String, patch_content: String` | `PatchCheckResult` | **Patch Engine**: Dry-run validates a patch, verifying affected files and applicability without modifying disk. |
| `apply_patch` | `path: String, patch_content: String, stage_to_index: Option<bool>, reverse: Option<bool>` | `PatchApplyResult` | **Patch Engine**: Applies patch directly to the working directory and optionally stages changes to index. |
| `get_repo_file_churn` | `path: String, max_commits: Option<usize>` | `Vec<FileChurnInfo>` | **Insights Studio**: Analyzes commit history to detect top modified files, revision counts, additions, and deletions. |
| `get_commit_signature` | `path: String, commit_id: String` | `SignatureInfo` | **Commit Signing**: Extracts cryptographic signature (SSH or GPG) from commit object header. |
| `get_signing_config` | `path: String` | `SigningConfig` | **Commit Signing**: Retrieves `commit.gpgsign`, `gpg.format`, `user.signingkey`, and discovered local SSH keys from `~/.ssh/`. |
| `set_signing_config` | `path: String, gpg_sign: bool, gpg_format: String, signing_key: Option<String>, is_global: Option<bool>` | `SigningConfig` | **Commit Signing**: Configures commit signing (SSH/GPG) locally or globally (`--global`). |

---

## 🌿 2. Branch, Tag, Stash & Sync Commands

| Command Name | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `get_branches` | `path: String` | `Vec<BranchInfo>` | Lists local and remote branches with Ahead/Behind counts. |
| `create_branch` | `path: String, branch_name: String, target_commit: Option<String>` | `BranchInfo` | Creates a new branch at target commit or HEAD. |
| `rename_branch` | `path: String, old_name: String, new_name: String` | `bool` | Renames branch and synchronizes upstream references. |
| `checkout_branch` | `path: String, branch_name: String` | `bool` | Switches active branch, checking dirty state beforehand. |
| `delete_branch` | `path: String, branch_name: String, force: bool` | `bool` | Deletes a local branch (supports force deletion). |
| `get_merged_branches` | `path: String, target_branch: Option<String>` | `Vec<String>` | Identifies local branches fully merged into base. |
| `delete_merged_branches`| `path: String, branches: Vec<String>` | `usize` | 1-Click bulk cleanup of merged branches. |
| `smart_sync` | `path: String, branch_name: Option<String>` | `SyncResult` | 1-Click sync: background fetch and rebase without checkout. |
| `get_stashes` | `path: String` | `Vec<StashInfo>` | Lists all stored stash entries. |
| `stash_save` | `path: String, message: Option<String>, include_untracked: bool` | `bool` | Stashes uncommitted working tree changes. |
| `stash_apply` | `path: String, index: usize` | `bool` | Applies a stash entry without removing it. |
| `stash_pop` | `path: String, index: usize` | `bool` | Applies and removes a stash entry. |
| `stash_drop` | `path: String, index: usize` | `bool` | Drops a stash entry. |
| `get_stash_detail` | `path: String, index: usize` | `StashDetail` | **Visual Stash Shelf**: Inspects files, status, line stats, and branch origin of a stash. |
| `get_stash_file_diff` | `path: String, index: usize, file_path: String, ignore_whitespace: Option<bool>` | `FileDiffDetail` | **Visual Stash Shelf**: Generates Monaco-compatible diff for any file inside a stash (supports untracked). |
| `stash_branch` | `path: String, index: usize, branch_name: String` | `BranchInfo` | Creates a new branch from stash base commit, checks out, and applies the stash (`git stash branch`). |
| `get_tags` | `path: String` | `Vec<TagInfo>` | Lists release tags with target commits and annotations. |
| `create_tag` | `path: String, tag_name: String, target_commit: String, message: Option<String>` | `TagInfo` | Creates a Lightweight or Annotated tag. |
| `delete_tag` | `path: String, tag_name: String` | `bool` | Deletes tag from repository. |

---

## 🔍 3. Working Tree, Diff, Safe Discard & Blame Commands

| Command Name | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `get_status` | `path: String` | `WorkingTreeStatus` | Scans working tree status: Staged, Unstaged, Untracked, Conflicted files. |
| `stage_file` | `path: String, file_path: String` | `bool` | Stages single file into Index. |
| `unstage_file` | `path: String, file_path: String` | `bool` | Unstages single file from Index. |
| `stage_all` | `path: String` | `bool` | Stages all changes (`git add -A`). |
| `unstage_all` | `path: String` | `bool` | Unstages all files (`git reset HEAD`). |
| `stage_hunk` | `path: String, file_path: String, hunk_index: usize` | `bool` | Stages specific hunk within file. |
| `unstage_hunk` | `path: String, file_path: String, hunk_index: usize` | `bool` | Unstages specific hunk. |
| `get_file_diff` | `path: String, file_path: String, is_staged: bool` | `FileDiffDetail` | Retrieves diff details (hunks, added/removed lines) for working tree file. |
| `get_commit_file_diff`| `path: String, commit_id: String, file_path: String` | `FileDiffDetail` | Retrieves diff details of a file in a historical commit. |
| `discard_file_changes`| `path: String, file_path: String` | `i64` | **Safe Discard**: Backs up file to SQLite 48h before restoring to HEAD; returns snapshot ID for 1-click restore. |
| `discard_all_changes` | `path: String` | `Vec<i64>` | **Safe Discard All**: Atomically snapshots all files into SQLite within a single transaction under a shared batch ID before discarding; returns array of snapshot IDs. |
| `list_trash_snapshots`| `repo_path: Option<String>` | `Vec<TrashSnapshotItem>` | Lists all available snapshots in 48-hour trash (supports batch ID and oversized markers). |
| `restore_trash_snapshot`| `path: String, snapshot_id: i64` | `()` | Restores 100% of discarded file content back to working tree. |
| `get_trash_snapshot_diff` | `path: String, snapshot_id: i64` | `TrashSnapshotDiffResult` | **Trash Snapshot Preview**: Retrieves Monaco-ready diff comparing snapshot content with active working tree. |
| `restore_trash_batch` | `path: String, batch_id: String` | `usize` | **Batch Restore**: Atomically restores all discarded files belonging to a specific batch ID in one click. |
| `delete_trash_snapshot` | `snapshot_id: i64` | `()` | Permanently deletes a single snapshot from trash. |
| `get_file_blame` | `path: String, file_path: String, min_line: Option<usize>, max_line: Option<usize>` | `Vec<BlameHunkItem>` | Line-by-line blame: author, email, timestamp, and commit SHA (supports optional line range). |
| `get_file_history` | `path: String, file_path: String, limit: usize` | `Vec<FileHistoryItem>` | Follows file modification timeline across history (`git log --follow`). |
| `add_to_gitignore` | `repo_path: String, pattern: String` | `bool` | Appends rule to repository `.gitignore`. |
| `generate_standard_gitignore`| `repo_path: String, template: String` | `bool` | Generates standard `.gitignore` for Node.js, Rust, Python, Go, etc. |

---

## 🌐 4. Remote Management Commands

| Command Name | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `get_remotes` | `path: String` | `Vec<RemoteInfo>` | Lists configured remotes (`origin`, `upstream`) with fetch/push URLs. |
| `add_remote` | `path: String, name: String, url: String` | `bool` | Adds a new remote. |
| `remove_remote` | `path: String, name: String` | `bool` | Removes a configured remote. |
| `set_remote_url` | `path: String, name: String, url: String` | `bool` | Updates remote URL endpoint. |
| `fetch_remote` | `path: String, remote_name: Option<String>` | `bool` | Fetches updates from remote. |
| `silent_background_fetch` | `path: String, remote: Option<String>, credentials: Option<GitCredentials>` | `BackgroundFetchResult` | **Silent Auto-Fetch**: Performs non-blocking background fetch without noisy auth prompts, computing ahead/behind metrics and incoming commits preview. |
| `get_incoming_commits` | `path: String, branch: Option<String>` | `Vec<CommitSummary>` | **Preview Incoming**: Reads commit list from upstream that are not yet pulled locally (`HEAD..upstream`). |

---

## ⚡ 5. Actions, Safety Engine & Interactive Rebase Commands

| Command Name | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `create_commit` | `path: String, message: String` | `String` | Creates new commit with staged changes and records into Action Undo Log. |
| `simulate_drag_action` | `path: String, source_id: String, target_id: String, action_type: String` | `ConflictSimulationResult` | **Ghost Preview**: In-memory dry-run verifying potential conflicts before drop. |
| `execute_cherry_pick_commit` | `path: String, commit_id: String` | `CherryPickResult` | Cherry-picks commit onto current HEAD. |
| `execute_merge_commit` | `path: String, target_id: String` | `MergeResult` | Merges target branch or commit into current branch. |
| `execute_rebase_branch` | `path: String, upstream_id: String` | `RebaseExecutionResult`| Rebases current branch onto specified upstream. |
| `prepare_interactive_rebase` | `path: String, base_id: String` | `Vec<RebaseTodoItem>` | Fetches commit sequence from base for Interactive Rebase Timeline. |
| `execute_interactive_rebase` | `path: String, base_id: String, todos: Vec<RebaseTodoItem>` | `RebaseExecutionResult` | Executes visual rebase sequence (`Pick`, `Reword`, `Drop`, `Squash`, `Fixup`). |
| `continue_rebase_branch`| `path: String` | `RebaseExecutionResult` | Resumes rebase after conflicts are resolved. |
| `check_is_rebasing` | `path: String` | `bool` | Checks if repo is currently in an in-progress rebase state. |
| `get_repo_operation_state` | `path: String` | `RepoOperationState` | Inspects stuck repository operation state (Rebase, Merge, Cherry-Pick, Bisect). |
| `skip_rebase_step` | `path: String` | `RebaseExecutionResult` | Skips current conflicting commit and proceeds with rebase. |
| `abort_current_operation` | `path: String` | `bool` | Aborts in-progress operation and restores clean repository state. |
| `revert_commit` | `path: String, commit_id: String` | `String` | Creates revert commit preserving historical integrity. |
| `reset_to_commit` | `path: String, commit_id: String, mode: String` | `bool` | Resets HEAD to target commit (`soft`, `mixed`, or `hard`). |
| `squash_commits` | `path: String, commit_ids: Vec<String>, message: String` | `String` | Squashes consecutive commits into single commit in < 1 second. |
| `list_actions` | `repo_path: Option<String>` | `Vec<ActionRecord>` | Lists recorded actions from SQLite Action Journal. |
| `undo_action` | `repo_path: String` | `bool` | **Time Machine Undo (`Ctrl + Z`)**: Reverts last action using reflog snapshot. |
| `redo_action` | `repo_path: String` | `bool` | **Time Machine Redo (`Ctrl + Shift + Z`)**: Replays previously undone action. |
| `time_travel_to` | `repo_path: String, action_id: i64` | `bool` | Time-travels repository state to arbitrary past action point. |
| `scan_staged_secrets` | `path: String` | `Vec<SecretFinding>` | **Secret Shield**: Deep scans staged diffs and file paths for API keys, tokens, credentials, and sensitive dotfiles with auto-masking. |
| `get_reflog_entries` | `path: String, limit: Option<usize>` | `Vec<ReflogEntry>` | **Visual Reflog / Lost & Found**: Traverses native Git Reflog entries and mathematically identifies orphaned commits unreachable from branch tips. |
| `restore_lost_commit` | `path: String, commit_id: String, branch_name: String` | `bool` | Rescues an orphaned/lost commit by creating a new local branch pointing directly to it. |

---

## ⚔️ 6. Conflict Resolution & Bisect Commands

| Command Name | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `get_conflicted_files` | `path: String` | `Vec<String>` | Lists paths of currently conflicted files. |
| `get_conflict_details` | `path: String, file_path: String` | `ConflictFileDetail` | Extracts 4-pane views: Ours, Base, Theirs, and conflict markers. |
| `resolve_conflict_file` | `path: String, file_path: String, resolved_content: String` | `bool` | Overwrites resolved content and stages file into Index. |
| `abort_merge_or_rebase`| `path: String` | `bool` | Aborts merge or rebase upon unwanted conflicts. |
| `start_bisect` | `path: String, bad_id: String, good_id: String` | `BisectStatus` | Launches Visual Bisect Wizard between bad and known good commits. |
| `bisect_step` | `path: String, is_good: bool` | `BisectStatus` | Reports test result (`Pass` or `Fail`) at current node to bisect further. |
| `abort_bisect` | `path: String` | `bool` | Aborts bisect and returns HEAD to original reference. |
| `get_bisect_status` | `path: String` | `BisectStatus` | Queries active bisect status and estimated steps remaining. |
| `run_auto_bisect` | `path: String, bad_id: String, good_id: String, test_script: String` | `AutoBisectResult` | **Auto-Bisect**: Automated script execution (`npm test`, `cargo test`) with real-time streaming step logs. |

---

## 🏢 7. Worktrees, LFS & Submodules Commands

| Command Name | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `list_worktrees` | `path: String` | `Vec<WorktreeInfo>` | Lists all linked Git Worktrees. |
| `create_worktree` | `path: String, name: String, target_path: String, branch_name: Option<String>` | `WorktreeInfo` | Creates new parallel worktree for isolated bug fixing. |
| `delete_worktree` | `path: String, name: String` | `bool` | Cleans up and unlinks worktree directory. |
| `get_submodules` | `path: String` | `Vec<SubmoduleInfo>` | Lists submodules with HEAD vs Index status and remote URLs. |
| `update_submodules` | `path: String, recursive: bool, init: bool` | `bool` | Recursively updates submodules (`git submodule update --init --recursive`). |
| `sync_submodules` | `path: String` | `bool` | Synchronizes submodule URLs from `.gitmodules`. |
| `get_submodule_diff` | `path: String, submodule_name: String` | `SubmoduleDiffResult` | **Submodule Working Tree Diff**: Extracts unstaged changes, modified files list, and diff content within a submodule. |
| `get_lfs_info` | `path: String` | `LfsSummary` | Scans LFS managed files, pointers, and active locks. |
| `lock_lfs_file` | `path: String, file_path: String` | `bool` | Locks binary file on LFS server to prevent merge conflicts. |
| `unlock_lfs_file` | `path: String, file_path: String, force: bool` | `bool` | Unlocks LFS file. |
| `pull_lfs_files` | `path: String` | `bool` | Pulls binary payloads for LFS files. |

---

## 🔑 8. Auth, Identity & Multi-Account Commands

| Command Name | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `start_github_device_login`| None | `DeviceCodeResponse` | Initiates GitHub OAuth Device Flow (returns User Code and URL). |
| `check_github_device_login`| `device_code: String` | `DevicePollResult` | Polls authentication status from GitHub OAuth server. |
| `verify_token_and_get_profile`| `provider: String, token: String` | `AccountProfile` | Verifies PAT and fetches user avatar, username, and email. |
| `save_account_auth` | `profile: AccountProfile` | `bool` | Saves account profile into secure SQLite store. |
| `get_active_account` | None | `Option<AccountProfile>` | Gets active default account for remote operations. |
| `list_accounts` | None | `Vec<AccountProfile>` | Lists connected developer accounts. |
| `delete_account` | `id: String` | `bool` | Removes saved account profile. |
| `execute_remote_with_auth` | `command: String, args: Vec<String>` | `RemoteExecutionResult` | Executes remote operation with automated token credential injection. |
| `get_current_repo_identity`| `path: String` | `CurrentRepoIdentity` | Retrieves local vs global Git identity (`user.name`, `user.email`). |
| `set_repo_identity` | `path: String, name: String, email: String, is_global: bool` | `bool` | Sets Git committer identity locally or globally. |
| `list_identity_profiles`| None | `Vec<IdentityProfile>` | Lists identity presets (Work, Personal, Open-Source). |
| `save_identity_profile` | `profile: IdentityProfile` | `bool` | Saves new identity profile for 1-click switching. |
| `delete_identity_profile`| `id: String` | `bool` | Deletes identity profile. |
| `get_repo_binding` | `repo_path: String` | `Option<RepoBinding>` | Retrieves account binding configuration linked to specified repository path. |
| `save_repo_binding` | `binding: RepoBinding` | `()` | Persists repository-to-account binding record into SQLite. |
| `list_repo_bindings` | None | `Vec<RepoBinding>` | Lists all configured repository account bindings. |
| `delete_repo_binding` | `repo_path: String` | `()` | Unbinds account association from the repository. |

---

## 🛡️ 9. Edge Cases & Safety Guards Commands

| Command Name | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `is_index_locked` | `path: String` | `bool` | Detects presence of stale `.git/index.lock` file. |
| `clear_index_lock` | `path: String` | `bool` | Safely removes `.git/index.lock` to release locked repository. |
| `check_file_locks` | `path: String, files: Vec<String>` | `Vec<LockedFileInfo>` | Scans for external Windows/OS process file locks. |
| `scan_heavy_files` | `path: String, size_threshold_mb: Option<u64>` | `Vec<HeavyFileInfo>` | Pre-commit scan preventing accidental commits of files > 50MB. |
| `shelve_untracked_files`| `path: String, files: Vec<String>` | `bool` | Shelves conflicting untracked files into Safe Discard before branch switch. |

---

## ⚓ 10. Git Hooks Commands

| Command Name | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `get_git_hooks` | `repo_path: String` | `Vec<GitHookInfo>` | Lists all 8 standard lifecycle hooks with active/disabled/sample state and content. |
| `save_git_hook` | `repo_path: String, name: String, content: String, enabled: bool` | `()` | Saves hook script content, updates `.disabled` extension, and sets executable bits (`0o755`). |
| `toggle_git_hook` | `repo_path: String, name: String, enabled: bool` | `()` | 1-Click toggle renaming between `<hook>` and `<hook>.disabled` (or copies `.sample`). |

---

## 📦 11. Git LFS & Sparse Checkout (Monorepo) Commands

| Command Name | Parameters | Return Type | Description |
| :--- | :--- | :--- | :--- |
| `get_lfs_info` | `path: String` | `LfsSummary` | Reads `.gitattributes` patterns, listed LFS tracked files, and active locks. |
| `pull_lfs_files` | `path: String, pattern: Option<String>` | `String` | Downloads LFS binary payloads for entire repo or specific file/pattern (`-I <pattern>`). |
| `lock_lfs_file` | `path: String, file_path: String` | `String` | Locks specified LFS asset file on remote server to prevent team overwrite conflicts. |
| `unlock_lfs_file` | `path: String, file_path: String, force: bool` | `String` | Unlocks specified LFS asset file (with optional `--force` override). |
| `track_lfs_pattern` | `path: String, pattern: String` | `String` | Adds pattern to `.gitattributes` using `git lfs track "<pattern>"`. |
| `untrack_lfs_pattern` | `path: String, pattern: String` | `String` | Removes pattern from `.gitattributes` using `git lfs untrack "<pattern>"`. |
| `get_sparse_checkout_info` | `path: String` | `SparseCheckoutInfo` | Inspects sparse-checkout active state, cone mode flag, configured paths, and discovers monorepo directory tree. |
| `set_sparse_checkout` | `path: String, patterns: Vec<String>, cone: bool` | `String` | Sets and applies sparse-checkout directories with optional `--cone` mode. |
| `disable_sparse_checkout` | `path: String` | `String` | Disables sparse-checkout and restores full workspace checkout safely. |
| `reapply_sparse_checkout` | `path: String` | `String` | Re-evaluates sparse checkout rules against working tree. |

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

Tất cả các hàm giao tiếp IPC giữa Frontend (Svelte 5) và Backend (Rust) đều được chuẩn hóa theo mẫu `invoke<T>(command_name, payload)` và trả về kiểu `Result<T, AppError>`. Dưới đây là bảng tra cứu chi tiết phân theo từng phân khu chức năng.

---

## 📂 1. REPOSITORY & HISTORY COMMANDS

| Tên Command | Tham số đầu vào (Payload) | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `open_repository` | `path: String` | `RepoSummary` | Mở kho lưu trữ cục bộ, kiểm tra tính hợp lệ và trả về thống kê tổng quan (HEAD, branch, số file bẩn). |
| `init_repository` | `path: String, bare: bool` | `RepoSummary` | Khởi tạo kho lưu trữ Git mới tại đường dẫn chỉ định (hỗ trợ cả chuẩn Bare repository). |
| `clone_repository` | `url: String, target_path: String` | `RepoSummary` | Clone kho mã nguồn từ remote về thư mục máy tính. |
| `get_commit_history` | `path: String, max_count: usize` | `Vec<CommitNode>` | Lấy danh sách commit mới nhất kèm tính toán Lane và phân nhánh tự động. |
| `get_paginated_commit_history` | `path: String, skip: usize, limit: usize` | `PaginatedCommitHistory` | Phân trang commit history cho các Monorepo siêu lớn (> 100k commits), hỗ trợ tải lười khi cuộn. |
| `get_commit_info` | `path: String, commit_id: String` | `CommitDetail` | Lấy đầy đủ thông tin chi tiết của 1 commit (tác giả, committer, message, danh sách file thay đổi). |
| `compare_two_commits` | `path: String, base_id: String, target_id: String` | `ComparisonResult` | So sánh sự khác biệt (commits và files changed) giữa 2 mốc bất kỳ để phục vụ review PR offline. |
| `get_tree_entries` | `path: String, commit_id: Option<String>, tree_path: Option<String>` | `Vec<TreeEntryItem>` | Duyệt cây thư mục và file tại commit chỉ định hoặc tại HEAD (phục vụ Repository Explorer). |
| `get_file_content` | `path: String, file_path: String, commit_id: Option<String>` | `FileContentResponse` | Đọc nội dung tệp (hỗ trợ tự nhận diện mã hóa UTF-8 hoặc cờ báo tệp nhị phân). |
| `get_remote_url` | `path: String, remote_name: Option<String>` | `Option<String>` | Lấy URL remote của repository (mặc định lấy remote `origin`). |
| `nuke_file_from_history` | `path: String, target_file_path: String` | `bool` | Xóa vĩnh viễn một tệp (chứa mật khẩu, secret) khỏi toàn bộ lịch sử commit của repo. |
| `save_file_content` | `path: String, file_path: String, content: String` | `()` | Lưu nội dung tệp chỉnh sửa trực tiếp từ Monaco Editor xuống đĩa an toàn. |
| `grep_repository_content` | `path: String, query: String, case_sensitive: Option<bool>, max_results: Option<usize>` | `Vec<FileGrepMatch>` | Tìm kiếm toàn văn (Grep / Find in files) bằng Rust Rayon đa luồng tốc độ cao. |
| `open_in_external_editor` | `full_path: String, editor: Option<String>` | `()` | Mở tệp bằng trình soạn thảo mã nguồn ngoại vi (Cursor, Antigravity, VS Code, Zed hoặc Default). |
| `reveal_in_file_manager` | `full_path: String` | `()` | Mở File Explorer trên hệ điều hành và highlight chính xác tệp được chọn. |
| `get_focus_branch_info` | `path: String, branch_name: Option<String>, base_branch: Option<String>` | `FocusBranchResult` | Lấy thông tin các commit đặc thù thuộc về nhánh Focus so với Base branch (hỗ trợ chọn Base branch tùy chỉnh). |
| `get_unpushed_stacked_commits` | `path: String` | `Vec<StackedCommitItem>` | Lấy chuỗi các commit chưa được push lên remote để quản lý Stacked Commits / Stacked PRs. |
| `reorder_stacked_commits` | `path: String, new_order_ids: Vec<String>` | `bool` | Sắp xếp lại thứ tự của các commit trong chuỗi Stacked Commits bằng bộ Reorder Sequencer. |
| `search_commits_pickaxe` | `path: String, query: String, max_results: Option<usize>` | `Vec<PickaxeSearchResult>` | **Pickaxe Search (`-S`)**: Tìm kiếm commit đã thêm hoặc xóa chuỗi/đoạn mã cụ thể trong diffs. |
| `export_commit_patch` | `path: String, commit_id: String` | `String` | **Patch Engine**: Xuất một commit thành chuỗi patch tương thích chuẩn `git format-patch`. |
| `check_patch` | `path: String, patch_content: String` | `PatchCheckResult` | **Patch Engine**: Kiểm tra thử (Dry-run) patch mà không ghi đĩa, xác thực danh sách file ảnh hưởng và tính sạch sẽ. |
| `apply_patch` | `path: String, patch_content: String, stage_to_index: Option<bool>, reverse: Option<bool>` | `PatchApplyResult` | **Patch Engine**: Áp dụng patch vào working tree (và index nếu chọn stage) an toàn. |
| `get_repo_file_churn` | `path: String, max_commits: Option<usize>` | `Vec<FileChurnInfo>` | **Insights Studio**: Quét lịch sử commit để tìm các điểm nóng thay đổi mã nguồn (File Churn Hotspots), số lần sửa và dòng thêm/xóa. |
| `get_commit_signature` | `path: String, commit_id: String` | `SignatureInfo` | **Commit Signing**: Trích xuất chữ ký mật mã (SSH hoặc GPG) từ header của raw commit object. |
| `get_signing_config` | `path: String` | `SigningConfig` | **Commit Signing**: Lấy trạng thái `commit.gpgsign`, `gpg.format`, `user.signingkey`, và danh sách SSH public key phát hiện được trong `~/.ssh/`. |
| `set_signing_config` | `path: String, gpg_sign: bool, gpg_format: String, signing_key: Option<String>, is_global: Option<bool>` | `SigningConfig` | **Commit Signing**: Thiết lập cấu hình tự động ký commit (SSH hoặc GPG) ở cấp độ local repo hoặc `--global`. |

---

## 🌿 2. BRANCH, TAG, STASH & SYNC COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `get_branches` | `path: String` | `Vec<BranchInfo>` | Liệt kê toàn bộ nhánh Local & Remote kèm chỉ số Ahead/Behind so với upstream. |
| `create_branch` | `path: String, branch_name: String, target_commit: Option<String>` | `BranchInfo` | Tạo nhánh mới tại vị trí commit chỉ định (hoặc tại HEAD hiện tại). |
| `rename_branch` | `path: String, old_name: String, new_name: String` | `bool` | Đổi tên nhánh an toàn và đồng bộ tham chiếu. |
| `checkout_branch` | `path: String, branch_name: String` | `bool` | Chuyển đổi nhánh làm việc. Tự động kiểm tra file bẩn trước khi switch. |
| `delete_branch` | `path: String, branch_name: String, force: bool` | `bool` | Xóa nhánh local (có cờ ép buộc xóa nếu nhánh chưa được merge). |
| `get_merged_branches` | `path: String, target_branch: Option<String>` | `Vec<String>` | Quét danh sách các nhánh local đã được gộp hoàn chỉnh vào nhánh chính. |
| `delete_merged_branches`| `path: String, branches: Vec<String>` | `usize` | Xóa hàng loạt các nhánh đã merge chỉ bằng 1 cú click. |
| `smart_sync` | `path: String, branch_name: Option<String>` | `SyncResult` | Đồng bộ 1 chạm: tự động fetch remote và rebase ngầm không cần checkout. |
| `get_stashes` | `path: String` | `Vec<StashInfo>` | Lấy danh sách các mốc stash đang lưu trữ. |
| `stash_save` | `path: String, message: Option<String>, include_untracked: bool` | `bool` | Lưu tạm trạng thái working tree vào stash. |
| `stash_apply` | `path: String, index: usize` | `bool` | Áp dụng lại một mốc stash mà không xóa nó khỏi danh sách. |
| `stash_pop` | `path: String, index: usize` | `bool` | Áp dụng lại một mốc stash và xóa nó ra khỏi stash list. |
| `stash_drop` | `path: String, index: usize` | `bool` | Xóa bỏ một mốc stash. |
| `get_stash_detail` | `path: String, index: usize` | `StashDetail` | **Visual Stash Shelf**: Bóc tách danh sách file thay đổi, thống kê dòng, và nhánh gốc của mốc Stash. |
| `get_stash_file_diff` | `path: String, index: usize, file_path: String, ignore_whitespace: Option<bool>` | `FileDiffDetail` | **Visual Stash Shelf**: Trích xuất nội dung diff chuẩn Monaco Diff Editor cho bất kỳ tệp nào trong Stash (kể cả tệp untracked). |
| `stash_branch` | `path: String, index: usize, branch_name: String` | `BranchInfo` | Tạo nhánh Git mới từ mốc stash, checkout và tự động apply nội dung stash (`git stash branch`). |
| `get_tags` | `path: String` | `Vec<TagInfo>` | Liệt kê toàn bộ Release Tags kèm commit mục tiêu và ghi chú. |
| `create_tag` | `path: String, tag_name: String, target_commit: String, message: Option<String>` | `TagInfo` | Tạo Lightweight Tag hoặc Annotated Tag tại một commit. |
| `delete_tag` | `path: String, tag_name: String` | `bool` | Xóa Tag khỏi repository. |

---

## 🔍 3. WORKING TREE, DIFF, TRASH 48H & BLAME COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `get_status` | `path: String` | `WorkingTreeStatus` | Quét trạng thái Working Tree: danh sách file Staged, Unstaged, Untracked, Conflicted. |
| `stage_file` | `path: String, file_path: String` | `bool` | Đưa 1 file vào Index (Stage). |
| `unstage_file` | `path: String, file_path: String` | `bool` | Đưa 1 file ra khỏi Index (Unstage). |
| `stage_all` | `path: String` | `bool` | Stage toàn bộ các thay đổi (`git add -A`). |
| `unstage_all` | `path: String` | `bool` | Unstage toàn bộ các file đã staged (`git reset HEAD`). |
| `stage_hunk` | `path: String, file_path: String, hunk_index: usize` | `bool` | Stage riêng một khối code (Hunk) cụ thể trong file. |
| `unstage_hunk` | `path: String, file_path: String, hunk_index: usize` | `bool` | Unstage một khối code cụ thể. |
| `get_file_diff` | `path: String, file_path: String, is_staged: bool` | `FileDiffDetail` | Lấy chi tiết diff (hunks, dòng thêm/xóa) của file trong working tree. |
| `get_commit_file_diff`| `path: String, commit_id: String, file_path: String` | `FileDiffDetail` | Lấy chi tiết diff của một file thuộc về một commit trong lịch sử. |
| `discard_file_changes`| `path: String, file_path: String` | `i64` | **Safe Discard**: Sao lưu nội dung vào SQLite 48h trước khi khôi phục file về HEAD, trả về snapshot ID phục vụ 1-Click Undo. |
| `discard_all_changes` | `path: String` | `Vec<i64>` | **Safe Discard All**: Sao lưu nguyên tử toàn bộ working tree vào SQLite trong 1 Transaction duy nhất kèm mã `batch_id`, trả về mảng snapshot IDs. |
| `list_trash_snapshots`| `repo_path: Option<String>` | `Vec<TrashSnapshotItem>` | Liệt kê danh sách các bản chụp thùng rác còn hạn sử dụng (trong vòng 48h, có gắn cờ `batch_id` và `is_oversized`). |
| `restore_trash_snapshot`| `path: String, snapshot_id: i64` | `()` | Khôi phục nguyên vẹn 100% nội dung file đã lỡ tay discard. |
| `get_trash_snapshot_diff` | `path: String, snapshot_id: i64` | `TrashSnapshotDiffResult` | **Xem trước Diff Thùng rác**: Trích xuất diff Monaco so sánh giữa bản chụp snapshot đã discard và working tree hiện tại. |
| `restore_trash_batch` | `path: String, batch_id: String` | `usize` | **Khôi phục cả đợt (Batch Restore)**: Phục hồi đồng loạt toàn bộ các file đã discard trong cùng một batch chỉ bằng 1 thao tác. |
| `delete_trash_snapshot` | `snapshot_id: i64` | `()` | Xóa vĩnh viễn một bản snapshot khỏi thùng rác. |
| `get_file_blame` | `path: String, file_path: String, min_line: Option<usize>, max_line: Option<usize>` | `Vec<BlameHunkItem>` | Soi vết từng dòng code: tác giả, email, thời gian, commit SHA (hỗ trợ tùy chọn khoảng dòng min..max). |
| `get_file_history` | `path: String, file_path: String, limit: usize` | `Vec<FileHistoryItem>` | Lọc riêng dòng thời gian các commit chỉ tác động lên tệp được chọn (`git log --follow`). |
| `add_to_gitignore` | `repo_path: String, pattern: String` | `bool` | Bổ sung quy tắc vào file `.gitignore` của repository. |
| `generate_standard_gitignore`| `repo_path: String, template: String` | `bool` | Tạo file `.gitignore` tiêu chuẩn cho Node.js, Rust, Python, Go, v.v. |

---

## 🌐 4. REMOTE MANAGEMENT COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `get_remotes` | `path: String` | `Vec<RemoteInfo>` | Liệt kê toàn bộ các máy chủ Remote (`origin`, `upstream`) kèm URL fetch và URL push. |
| `add_remote` | `path: String, name: String, url: String` | `bool` | Thêm một Remote mới vào kho lưu trữ. |
| `remove_remote` | `path: String, name: String` | `bool` | Xóa bỏ cấu hình một Remote không còn dùng. |
| `set_remote_url` | `path: String, name: String, url: String` | `bool` | Thay đổi đường dẫn URL kết nối của Remote. |
| `fetch_remote` | `path: String, remote_name: Option<String>` | `bool` | Tải về các nhánh và commit mới từ Remote về máy tính. |
| `silent_background_fetch` | `path: String, remote: Option<String>, credentials: Option<GitCredentials>` | `BackgroundFetchResult` | **Silent Auto-Fetch**: Chạy ngầm kiểm tra commit mới từ remote an toàn, không bung popup làm phiền, tính toán chênh lệch ahead/behind và commit mới. |
| `get_incoming_commits` | `path: String, branch: Option<String>` | `Vec<CommitSummary>` | **Xem trước Commit mới**: Lấy danh sách các commit mới trên remote chưa được kéo về local (`HEAD..upstream`). |

---

## ⚡ 5. ACTIONS, SAFETY ENGINE & INTERACTIVE REBASE COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `create_commit` | `path: String, message: String` | `String` | Tạo commit mới với các file đang trong Staged Area. Ghi nhận vào Action Undo Log. |
| `simulate_drag_action` | `path: String, source_id: String, target_id: String, action_type: String` | `ConflictSimulationResult` | **Ghost Preview**: Chạy Dry-run mô phỏng in-memory để kiểm tra trước nguy cơ conflict. |
| `execute_cherry_pick_commit` | `path: String, commit_id: String` | `CherryPickResult` | Cherry-pick một commit vào đỉnh nhánh hiện tại. |
| `execute_merge_commit` | `path: String, target_id: String` | `MergeResult` | Merge nhánh hoặc commit mục tiêu vào nhánh hiện tại. |
| `execute_rebase_branch` | `path: String, upstream_id: String` | `RebaseExecutionResult`| Rebase nhánh hiện tại lên trên một mốc commit/nhánh khác. |
| `prepare_interactive_rebase` | `path: String, base_id: String` | `Vec<RebaseTodoItem>` | Lấy danh sách commit từ base để hiển thị lên Timeline Interactive Rebase. |
| `execute_interactive_rebase` | `path: String, base_id: String, todos: Vec<RebaseTodoItem>` | `RebaseExecutionResult` | Thực thi chuỗi thao tác Rebase trực quan (Pick, Reword, Drop, Squash, Fixup). |
| `continue_rebase_branch`| `path: String` | `RebaseExecutionResult` | Tiếp tục tiến trình Rebase sau khi đã giải quyết xong conflict. |
| `check_is_rebasing` | `path: String` | `bool` | Kiểm tra nhanh xem kho lưu trữ có đang trong trạng thái rebase dở dang hay không. |
| `get_repo_operation_state` | `path: String` | `RepoOperationState` | Kiểm tra chi tiết trạng thái repo đang bị kẹt (Rebase, Merge, Cherry-Pick, Bisect). |
| `skip_rebase_step` | `path: String` | `RebaseExecutionResult` | Bỏ qua commit hiện tại đang bị conflict và tiếp tục rebase. |
| `abort_current_operation` | `path: String` | `bool` | Hủy bỏ khẩn cấp tiến trình Rebase/Merge/Cherry-pick và đưa repo về trạng thái sạch sẽ. |
| `revert_commit` | `path: String, commit_id: String` | `String` | Tạo commit đảo ngược an toàn mà không làm mất lịch sử cũ. |
| `reset_to_commit` | `path: String, commit_id: String, mode: String` | `bool` | Đưa HEAD về một commit quá khứ theo 3 chế độ: `soft`, `mixed`, hoặc `hard`. |
| `squash_commits` | `path: String, commit_ids: Vec<String>, message: String` | `String` | Gộp chuỗi nhiều commit liên tiếp thành 1 commit duy nhất trong 1 giây. |
| `list_actions` | `repo_path: Option<String>` | `Vec<ActionRecord>` | Lấy danh sách lịch sử các thao tác đã thực hiện từ SQLite Action Journal. |
| `undo_action` | `repo_path: String` | `bool` | **Time Machine Undo (`Ctrl + Z`)**: Hoàn tác hành động gần nhất qua `git reflog`. |
| `redo_action` | `repo_path: String` | `bool` | **Time Machine Redo (`Ctrl + Shift + Z`)**: Làm lại hành động vừa hoàn tác. |
| `time_travel_to` | `repo_path: String, action_id: i64` | `bool` | Nhảy vọt dòng thời gian về đúng trạng thái tại một mốc thao tác bất kỳ trong quá khứ. |
| `scan_staged_secrets` | `path: String` | `Vec<SecretFinding>` | **Secret Shield**: Quét sâu diff và tên tệp staged để phát hiện API key, token, private key và tệp nhạy cảm với cơ chế che giấu an toàn. |
| `get_reflog_entries` | `path: String, limit: Option<usize>` | `Vec<ReflogEntry>` | **Visual Reflog & Lost/Found**: Duyệt Reflog nội bộ git2 và phát hiện các commit mồ côi (orphaned commits) bị tách rời khỏi nhánh. |
| `restore_lost_commit` | `path: String, commit_id: String, branch_name: String` | `bool` | Cứu hộ commit thất lạc bằng cách tạo một nhánh Git mới trỏ trực tiếp vào commit đó. |

---

## ⚔️ 6. CONFLICT RESOLUTION & BISECT COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `get_conflicted_files` | `path: String` | `Vec<String>` | Danh sách đường dẫn các file đang bị xung đột cần xử lý. |
| `get_conflict_details` | `path: String, file_path: String` | `ConflictFileDetail` | Tách chi tiết 4 khung hình: Ours, Base, Theirs, và các Chunks đánh dấu xung đột. |
| `resolve_conflict_file` | `path: String, file_path: String, resolved_content: String` | `bool` | Ghi đè nội dung đã giải quyết hoàn chỉnh vào file và tự động Stage vào Index. |
| `abort_merge_or_rebase`| `path: String` | `bool` | Hủy bỏ tiến trình Merge hoặc Rebase khi phát sinh xung đột không mong muốn. |
| `start_bisect` | `path: String, bad_id: String, good_id: String` | `BisectStatus` | Khởi động trình dò vết lỗi Bisect Wizard giữa commit bị lỗi và commit hoạt động tốt. |
| `bisect_step` | `path: String, is_good: bool` | `BisectStatus` | Báo cáo kết quả kiểm tra tại node hiện tại (`Pass` hoặc `Fail`) để hệ thống chia đôi tiếp. |
| `abort_bisect` | `path: String` | `bool` | Hủy bỏ chế độ Bisect và đưa HEAD trở về vị trí ban đầu. |
| `get_bisect_status` | `path: String` | `BisectStatus` | Lấy trạng thái hiện tại của phiên Bisect (ước tính số bước còn lại, danh sách commit nghi vấn). |
| `run_auto_bisect` | `path: String, bad_id: String, good_id: String, test_script: String` | `AutoBisectResult` | **Auto-Bisect Tự Động**: Chạy script kiểm thử (`npm test`, `cargo test`) tự động phân nhánh nhị phân và stream log thời gian thực. |

---

## 🏢 7. WORKTREES, LFS & SUBMODULES COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `list_worktrees` | `path: String` | `Vec<WorktreeInfo>` | Liệt kê tất cả các thư mục làm việc song song (Git Worktrees). |
| `create_worktree` | `path: String, name: String, target_path: String, branch_name: Option<String>` | `WorktreeInfo` | Tạo một thư mục làm việc mới để sửa bug hoặc hotfix độc lập. |
| `delete_worktree` | `path: String, name: String` | `bool` | Xóa và dọn dẹp thư mục worktree. |
| `get_submodules` | `path: String` | `Vec<SubmoduleInfo>` | Liệt kê danh sách Submodules kèm trạng thái HEAD vs Index và URL remote. |
| `update_submodules` | `path: String, recursive: bool, init: bool` | `bool` | Cập nhật đệ quy toàn bộ các submodules (`git submodule update --init --recursive`). |
| `sync_submodules` | `path: String` | `bool` | Đồng bộ cấu hình URL submodules từ `.gitmodules`. |
| `get_submodule_diff` | `path: String, submodule_name: String` | `SubmoduleDiffResult` | **Xem trước Diff Submodule**: Đọc diff tệp thay đổi trong working tree của submodule con. |
| `get_lfs_info` | `path: String` | `LfsSummary` | Quét tệp được quản lý bởi LFS, danh sách con trỏ (pointers) và locks đang hoạt động. |
| `lock_lfs_file` | `path: String, file_path: String` | `bool` | Khóa tệp nhị phân lớn trên LFS server để đồng nghiệp không thể ghi đè. |
| `unlock_lfs_file` | `path: String, file_path: String, force: bool` | `bool` | Mở khóa tệp LFS. |
| `pull_lfs_files` | `path: String` | `bool` | Tải về toàn bộ payload nhị phân thực tế của các tệp LFS. |

---

## 🔑 8. AUTH, IDENTITY & MULTI-ACCOUNT COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `start_github_device_login`| Không | `DeviceCodeResponse` | Khởi tạo quy trình GitHub OAuth Device Code Flow (hiển thị User Code & Verification URI). |
| `check_github_device_login`| `device_code: String` | `DevicePollResult` | Thăm dò (Poll) trạng thái đăng nhập thiết bị từ máy chủ GitHub OAuth. |
| `verify_token_and_get_profile`| `provider: String, token: String` | `AccountProfile` | Xác thực Personal Access Token (PAT) và tải avatar, username, email người dùng. |
| `save_account_auth` | `profile: AccountProfile` | `bool` | Lưu thông tin tài khoản vào kho bảo mật SQLite. |
| `get_active_account` | Không | `Option<AccountProfile>` | Lấy tài khoản đang được kích hoạt làm mặc định cho các hoạt động remote. |
| `list_accounts` | Không | `Vec<AccountProfile>` | Liệt kê các tài khoản đã kết nối. |
| `delete_account` | `id: String` | `bool` | Xóa tài khoản đã lưu khỏi kho bảo mật. |
| `execute_remote_with_auth` | `command: String, args: Vec<String>` | `RemoteExecutionResult` | Thực thi lệnh Git Remote có tiêm thông tin xác thực token tự động. |
| `get_current_repo_identity`| `path: String` | `CurrentRepoIdentity` | Lấy danh tính Git hiện tại (`user.name`, `user.email`) phân biệt rõ Local vs Global. |
| `set_repo_identity` | `path: String, name: String, email: String, is_global: bool` | `bool` | Cập nhật thông tin tác giả commit cho riêng repository hoặc toàn máy tính. |
| `list_identity_profiles`| Không | `Vec<IdentityProfile>` | Liệt kê các hồ sơ danh tính có sẵn (Công việc, Cá nhân, Open-source). |
| `save_identity_profile` | `profile: IdentityProfile` | `bool` | Lưu một hồ sơ danh tính mới vào danh mục chuyển đổi nhanh. |
| `delete_identity_profile`| `id: String` | `bool` | Xóa hồ sơ danh tính. |
| `get_repo_binding` | `repo_path: String` | `Option<RepoBinding>` | Đọc cấu hình liên kết tài khoản tương ứng với đường dẫn repository. |
| `save_repo_binding` | `binding: RepoBinding` | `()` | Lưu cấu hình liên kết tài khoản - repository vào cơ sở dữ liệu SQLite. |
| `list_repo_bindings` | Không | `Vec<RepoBinding>` | Liệt kê toàn bộ các liên kết tài khoản theo repository đã thiết lập. |
| `delete_repo_binding` | `repo_path: String` | `()` | Gỡ bỏ liên kết tài khoản khỏi repository được chọn. |

---

## 🛡️ 9. EDGE CASES & SAFETY GUARDS COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `is_index_locked` | `path: String` | `bool` | Kiểm tra xem file `.git/index.lock` có đang tồn tại (do Git crash hoặc IDE khóa). |
| `clear_index_lock` | `path: String` | `bool` | Gỡ bỏ file `.git/index.lock` an toàn giúp giải phóng repository bị treo. |
| `check_file_locks` | `path: String, files: Vec<String>` | `Vec<LockedFileInfo>` | Quét xem file nào đang bị các phần mềm khác trên Windows/OS khóa chặt không cho ghi. |
| `scan_heavy_files` | `path: String, size_threshold_mb: Option<u64>` | `Vec<HeavyFileInfo>` | Quét trước khi stage/commit để ngăn ngừa vô tình đẩy file nhị phân > 50MB lên Git. |
| `shelve_untracked_files`| `path: String, files: Vec<String>` | `bool` | Cất tạm các file untracked bị trùng tên vào Safe Discard để tránh bị ghi đè khi switch branch. |

---

## ⚓ 10. GIT HOOKS COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `get_git_hooks` | `repo_path: String` | `Vec<GitHookInfo>` | Đọc toàn bộ 8 lifecycle hooks kèm trạng thái bật/tắt/sample và nội dung tệp. |
| `save_git_hook` | `repo_path: String, name: String, content: String, enabled: bool` | `()` | Lưu nội dung script, xử lý phần mở rộng `.disabled` và cấp quyền `0o755`. |
| `toggle_git_hook` | `repo_path: String, name: String, enabled: bool` | `()` | Bật/tắt 1-click bằng cách đổi tên tệp giữa `<hook>` và `<hook>.disabled` (hoặc sao chép `.sample`). |

---

## 📦 11. GIT LFS & SPARSE CHECKOUT (MONOREPO) COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `get_lfs_info` | `path: String` | `LfsSummary` | Đọc danh sách pattern `.gitattributes`, các tệp LFS đã track và các lock đang hoạt động. |
| `pull_lfs_files` | `path: String, pattern: Option<String>` | `String` | Tải dữ liệu nhị phân Git LFS cho toàn bộ repo hoặc tệp/mẫu cụ thể (`-I <pattern>`). |
| `lock_lfs_file` | `path: String, file_path: String` | `String` | Khóa tệp tài nguyên trên LFS remote server nhằm ngăn xung đột ghi đè đồng đội. |
| `unlock_lfs_file` | `path: String, file_path: String, force: bool` | `String` | Mở khóa tệp LFS (hỗ trợ cờ `--force` cho admin/lead). |
| `track_lfs_pattern` | `path: String, pattern: String` | `String` | Thêm mẫu theo dõi vào `.gitattributes` bằng `git lfs track "<pattern>"`. |
| `untrack_lfs_pattern` | `path: String, pattern: String` | `String` | Hủy theo dõi mẫu khỏi `.gitattributes` bằng `git lfs untrack "<pattern>"`. |
| `get_sparse_checkout_info` | `path: String` | `SparseCheckoutInfo` | Kiểm tra trạng thái Sparse Checkout, cờ cone mode, các path đang active và tự động quét cây thư mục monorepo. |
| `set_sparse_checkout` | `path: String, patterns: Vec<String>, cone: bool` | `String` | Thiết lập và áp dụng danh sách thư mục sparse checkout với chế độ `--cone` hoặc pattern tự do. |
| `disable_sparse_checkout` | `path: String` | `String` | Tắt chế độ sparse checkout và khôi phục toàn bộ workspace an toàn. |
| `reapply_sparse_checkout` | `path: String` | `String` | Tái áp dụng bộ lọc sparse checkout lên toàn bộ working tree. |

