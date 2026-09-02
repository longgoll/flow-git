# DANH MỤC TAURI V2 IPC COMMANDS & DATA TYPES (API REFERENCE)
> **Phiên bản Backend:** Rust 2024 / Tauri v2 Native Bridge  
> **Tổng số Commands:** 65+ Commands có Scoped Capability Permissions

Tất cả các hàm giao tiếp IPC giữa Frontend (Svelte 5) và Backend (Rust) đều được chuẩn hóa theo mẫu `invoke<T>(command_name, payload)` và trả về kiểu `Result<T, AppError>`. Dưới đây là bảng tra cứu chi tiết phân theo từng phân khu chức năng.

---

## 📂 1. REPOSITORY & HISTORY COMMANDS

| Tên Command (Rust & Frontend) | Tham số đầu vào (Payload) | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `open_repository` | `path: String` | `RepoSummary` | Mở kho lưu trữ cục bộ, kiểm tra tính hợp lệ và trả về thống kê tổng quan (HEAD, branch, số file bẩn). |
| `init_repository` | `path: String, bare: bool` | `RepoSummary` | Khởi tạo kho lưu trữ Git mới tại đường dẫn chỉ định (hỗ trợ cả chuẩn Bare repository). |
| `clone_repository` | `url: String, target_path: String` | `RepoSummary` | Clone kho mã nguồn từ remote về thư mục máy tính. |
| `get_commit_history` | `path: String, max_count: usize` | `Vec<CommitNode>` | Lấy danh sách commit mới nhất kèm tính toán Lane và phân nhánh tự động. |
| `get_paginated_commit_history` | `path: String, skip: usize, limit: usize` | `PaginatedCommitHistory` | Phân trang commit history cho các Monorepo siêu lớn (> 100k commits), hỗ trợ tải lười khi cuộn. |
| `get_commit_info` | `path: String, commit_id: String` | `CommitDetail` | Lấy đầy đủ thông tin chi tiết của 1 commit (tác giả, committer, message, danh sách file thay đổi). |
| `compare_two_commits` | `path: String, base_id: String, target_id: String` | `ComparisonResult` | So sánh sự khác biệt (commits và files changed) giữa 2 mốc bất kỳ để phục vụ review PR offline. |
| `get_tree_entries` | `path: String, commit_id: Option<String>, tree_path: Option<String>` | `Vec<TreeEntryItem>` | Duyệt cây thư mục và file tại commit chỉ định hoặc tại HEAD. |
| `get_file_content` | `path: String, file_path: String, commit_id: Option<String>` | `FileContentResponse` | Đọc nội dung tệp (hỗ trợ tự nhận diện mã hóa UTF-8 hoặc cờ báo tệp nhị phân). |
| `nuke_file_from_history` | `path: String, target_file_path: String` | `bool` | Xóa vĩnh viễn một tệp (chứa mật khẩu, secret) khỏi toàn bộ lịch sử commit của repo. |
| `get_focus_branch_info` | `path: String, branch_name: String` | `FocusBranchInfo` | Lấy thông tin các commit đặc thù chỉ thuộc về nhánh đang được Focus so với nhánh cơ sở. |
| `get_unpushed_stacked_commits` | `path: String` | `Vec<CommitNode>` | Lấy chuỗi các commit chưa được push lên remote để quản lý Stacked Pull Requests. |
| `reorder_stacked_commits` | `path: String, new_order_ids: Vec<String>` | `bool` | Sắp xếp lại thứ tự của các commit trong chuỗi Stacked Commits. |

---

## 🌿 2. BRANCH, TAG, STASH & SYNC COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `get_branches` | `path: String` | `Vec<BranchInfo>` | Liệt kê toàn bộ nhánh Local & Remote kèm chỉ số Ahead/Behind so với upstream. |
| `create_branch` | `path: String, branch_name: String, target_commit: Option<String>` | `BranchInfo` | Tạo nhánh mới tại vị trí commit chỉ định (hoặc tại HEAD hiện tại). |
| `rename_branch` | `path: String, old_name: String, new_name: String` | `bool` | Đổi tên nhánh an toàn. |
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
| `discard_file_changes`| `path: String, file_path: String` | `bool` | **Safe Discard**: Sao lưu nội dung vào SQLite 48h trước khi khôi phục file về HEAD. |
| `discard_all_changes` | `path: String` | `bool` | **Safe Discard All**: Sao lưu toàn bộ working tree vào SQLite trước khi xóa sạch thay đổi. |
| `list_trash_snapshots`| `repo_path: Option<String>` | `Vec<TrashSnapshotItem>` | Liệt kê danh sách các bản chụp thùng rác còn hạn sử dụng (trong vòng 48h). |
| `restore_trash_snapshot`| `snapshot_id: i64` | `bool` | Khôi phục nguyên vẹn 100% nội dung file đã lỡ tay discard. |
| `delete_trash_snapshot` | `snapshot_id: i64` | `bool` | Xóa vĩnh viễn một bản snapshot khỏi thùng rác. |
| `get_file_blame` | `path: String, file_path: String` | `Vec<BlameHunkItem>` | Soi vết từng dòng code: tác giả, email, thời gian, commit SHA cho toàn bộ dòng trong file. |
| `get_file_history` | `path: String, file_path: String, limit: usize` | `Vec<FileHistoryItem>` | Lọc riêng dòng thời gian các commit chỉ tác động lên tệp được chọn (`git log --follow`). |
| `add_to_gitignore` | `repo_path: String, pattern: String` | `bool` | Bổ sung quy tắc vào file `.gitignore` của repository. |
| `generate_standard_gitignore`| `repo_path: String, template: String` | `bool` | Tạo file `.gitignore` tiêu chuẩn cho Node.js, Rust, Python, Go, v.v. |

---

## ⚡ 4. ACTIONS, SAFETY ENGINE & INTERACTIVE REBASE COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `create_commit` | `path: String, message: String` | `String` | Tạo commit mới với các file đang trong Staged Area. Ghi nhận vào Action Undo Log. |
| `simulate_drag_action` | `path: String, source_id: String, target_id: String, action_type: String` | `ConflictSimulationResult` | **Ghost Preview**: Chạy Dry-run mô phỏng in-memory để kiểm tra trước nguy cơ conflict. |
| `execute_cherry_pick_commit` | `path: String, commit_id: String` | `CherryPickResult` | Cherry-pick một commit vào đỉnh nhánh hiện tại. |
| `execute_merge_commit` | `path: String, target_id: String` | `MergeResult` | Merge nhánh hoặc commit mục tiêu vào nhánh hiện tại. |
| `execute_rebase_branch` | `path: String, upstream_id: String` | `RebaseExecutionResult`| Rebase nhánh hiện tại lên trên một mốc commit/nhánh khác. |
| `prepare_interactive_rebase` | `path: String, base_id: String` | `Vec<RebaseTodoItem>` | Lấy danh sách commit từ base để hiển thị lên Timeline Interactive Rebase. |
| `execute_interactive_rebase` | `path: String, base_id: String, todos: Vec<RebaseTodoItem>` | `RebaseExecutionResult` | Thực thi chuỗi thao tác Rebase trực quan (Pick, Reword, Drop, Squash, Fixup). |
| `revert_commit` | `path: String, commit_id: String` | `String` | Tạo commit đảo ngược an toàn mà không làm mất lịch sử cũ. |
| `reset_to_commit` | `path: String, commit_id: String, mode: String` | `bool` | Đưa HEAD về một commit quá khứ theo 3 chế độ: `soft`, `mixed`, hoặc `hard`. |
| `squash_commits` | `path: String, commit_ids: Vec<String>, message: String` | `String` | Gộp chuỗi nhiều commit liên tiếp thành 1 commit duy nhất trong 1 giây. |
| `list_actions` | `repo_path: Option<String>` | `Vec<ActionRecord>` | Lấy danh sách lịch sử các thao tác đã thực hiện từ SQLite Action Journal. |
| `undo_action` | `repo_path: String` | `bool` | **Time Machine Undo (`Ctrl + Z`)**: Hoàn tác hành động gần nhất qua `git reflog`. |
| `redo_action` | `repo_path: String` | `bool` | **Time Machine Redo (`Ctrl + Shift + Z`)**: Làm lại hành động vừa hoàn tác. |
| `time_travel_to` | `repo_path: String, action_id: i64` | `bool` | Nhảy vọt dòng thời gian về đúng trạng thái tại một mốc thao tác bất kỳ trong quá khứ. |
| `get_repo_operation_state` | `path: String` | `RepoOperationState` | Kiểm tra xem repo có đang bị kẹt giữa chừng (Rebase, Merge, Cherry-Pick, Bisect) hay không. |
| `continue_rebase_branch`| `path: String` | `RebaseExecutionResult` | Tiếp tục tiến trình Rebase sau khi đã giải quyết xong conflict. |
| `skip_rebase_step` | `path: String` | `RebaseExecutionResult` | Bỏ qua commit hiện tại đang bị conflict và tiếp tục rebase. |
| `abort_current_operation` | `path: String` | `bool` | Hủy bỏ khẩn cấp tiến trình Rebase/Merge/Cherry-pick và đưa repo về trạng thái sạch sẽ. |

---

## ⚔️ 5. CONFLICT RESOLUTION & BISECT COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `get_conflicted_files` | `path: String` | `Vec<String>` | Danh sách đường dẫn các file đang bị xung đột cần xử lý. |
| `get_conflict_details` | `path: String, file_path: String` | `ConflictFileDetail` | Tách chi tiết 4 khung hình: Ours, Base, Theirs, và các Chunks đánh dấu xung đột. |
| `resolve_conflict_file` | `path: String, file_path: String, resolved_content: String` | `bool` | Ghi đè nội dung đã giải quyết hoàn chỉnh vào file và tự động Stage vào Index. |
| `start_bisect` | `path: String, bad_id: String, good_id: String` | `BisectStatus` | Khởi động trình dò vết lỗi Bisect Wizard giữa commit bị lỗi và commit hoạt động tốt. |
| `bisect_step` | `path: String, is_good: bool` | `BisectStatus` | Báo cáo kết quả kiểm tra tại node hiện tại (`Pass` hoặc `Fail`) để hệ thống chia đôi tiếp. |
| `abort_bisect` | `path: String` | `bool` | Hủy bỏ chế độ Bisect và đưa HEAD trở về vị trí ban đầu. |
| `get_bisect_status` | `path: String` | `BisectStatus` | Lấy trạng thái hiện tại của phiên Bisect (ước tính số bước còn lại, danh sách commit nghi vấn). |

---

## 🏢 6. WORKTREES, LFS, SUBMODULES & AUTH COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `list_worktrees` | `path: String` | `Vec<WorktreeInfo>` | Liệt kê tất cả các thư mục làm việc song song (Git Worktrees). |
| `create_worktree` | `path: String, name: String, target_path: String, branch_name: Option<String>` | `WorktreeInfo` | Tạo một thư mục làm việc mới để sửa bug hoặc hotfix độc lập. |
| `delete_worktree` | `path: String, name: String` | `bool` | Xóa và dọn dẹp thư mục worktree. |
| `get_submodules` | `path: String` | `Vec<SubmoduleInfo>` | Liệt kê danh sách Submodules kèm trạng thái HEAD vs Index và URL remote. |
| `update_submodules` | `path: String, recursive: bool, init: bool` | `bool` | Cập nhật đệ quy toàn bộ các submodules (`git submodule update --init --recursive`). |
| `sync_submodules` | `path: String` | `bool` | Đồng bộ cấu hình URL submodules từ `.gitmodules`. |
| `get_lfs_info` | `path: String` | `LfsSummary` | Quét tệp được quản lý bởi LFS, danh sách con trỏ (pointers) và locks đang hoạt động. |
| `lock_lfs_file` | `path: String, file_path: String` | `bool` | Khóa tệp nhị phân lớn trên LFS server để đồng nghiệp không thể ghi đè. |
| `unlock_lfs_file` | `path: String, file_path: String, force: bool` | `bool` | Mở khóa tệp LFS. |
| `pull_lfs_files` | `path: String` | `bool` | Tải về toàn bộ payload nhị phân thực tế của các tệp LFS. |
| `start_github_device_login`| Không | `DeviceCodeResponse` | Khởi tạo quy trình GitHub OAuth Device Code Flow (hiển thị User Code & Verification URI). |
| `check_github_device_login`| `device_code: String` | `DevicePollResult` | Thăm dò (Poll) trạng thái đăng nhập thiết bị từ máy chủ GitHub OAuth. |
| `verify_token_and_get_profile`| `provider: String, token: String` | `AccountProfile` | Xác thực Personal Access Token (PAT) và tải avatar, username, email người dùng. |
| `save_account_auth` | `profile: AccountProfile` | `bool` | Lưu thông tin tài khoản vào kho bảo mật SQLite. |
| `list_accounts` | Không | `Vec<AccountProfile>` | Liệt kê các tài khoản đã kết nối. |
| `get_current_repo_identity`| `path: String` | `CurrentRepoIdentity` | Lấy danh tính Git hiện tại (`user.name`, `user.email`) phân biệt rõ Local vs Global. |
| `set_repo_identity` | `path: String, name: String, email: String, is_global: bool` | `bool` | Cập nhật thông tin tác giả commit cho riêng repository hoặc toàn máy tính. |

---

## 🛡️ 7. EDGE CASES & SAFETY GUARDS COMMANDS

| Tên Command | Tham số đầu vào | Kiểu dữ liệu trả về | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| `is_index_locked` | `path: String` | `bool` | Kiểm tra xem file `.git/index.lock` có đang tồn tại (do Git crash hoặc IDE khóa). |
| `clear_index_lock` | `path: String` | `bool` | Gỡ bỏ file `.git/index.lock` an toàn giúp giải phóng repository bị treo. |
| `check_file_locks` | `path: String, files: Vec<String>` | `Vec<LockedFileInfo>` | Quét xem file nào đang bị các phần mềm khác trên Windows/OS khóa chặt không cho ghi. |
| `scan_heavy_files` | `path: String, size_threshold_mb: Option<u64>` | `Vec<HeavyFileInfo>` | Quét trước khi stage/commit để ngăn ngừa vô tình đẩy file nhị phân > 50MB lên Git. |
| `shelve_untracked_files`| `path: String, files: Vec<String>` | `bool` | Cất tạm các file untracked bị trùng tên vào Safe Discard để tránh bị ghi đè khi switch branch. |
