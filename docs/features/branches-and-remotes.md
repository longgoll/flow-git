<div align="center">

# 🌿 Branch Management, Multi-Remotes & Smart Sync
### Quản Lý Nhánh, Multi-Remotes & Smart Sync

> **Standards:** Native support for Fork workflows & Multi-Remotes (`origin`, `upstream`)  
> **Automation:** 1-Click Smart Sync & Automated Clean Merged Branches  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🌿 1. Flexible Branch Management & Icon Rail Sidebar

Component: `src/lib/components/Sidebar.svelte`, `SidebarBranchTree.svelte`, `SidebarSections.svelte`, `SidebarContextMenu.svelte`

The FlowGit Sidebar utilizes a dual-tier **Icon Rail (Activity Bar) + Resizable Active Panel** pattern:
- **Left Icon Rail (44px):** Quick-switch rail with active badges for 5 core workspaces:
  + 🌿 **Branches:** Local, Remote, and Pinned Favorite branches.
  + 🌐 **Remotes:** Remote repositories (`origin`, `upstream`) with quick fetch and manager triggers.
  + 🏷️ **Tags:** Annotated and lightweight release tags.
  + 📦 **Stashes:** Visual stash list with 1-click diff drawer launcher.
  + 📂 **Worktrees:** Multi-working-tree directories.
- **Drag-to-Resize Panel (220px – 500px):** Drag the right edge border to comfortably view deeply-nested branch names (`feature/TASK-1234-...`). Dimensions persist in `localStorage`.
- **3-Mode Collapsing:**
  1. *Full Mode:* Rail (44px) + Active Panel (resizable).
  2. *Rail-Only Mode:* Clicking the active tab or the bottom collapse toggle shrinks the sidebar to a 44px icon strip.
  3. *Hidden Mode:* `Ctrl + B` toggles the entire sidebar off for full-width DAG canvas view.
- **Context-Aware Sidebar Adaptation:**
  + Automatically switches the active rail tab based on the active View Mode (`Graph/Focus/DAG` ➔ `Branches`, `Changes` ➔ `Stashes`, `PR` ➔ `Remotes`), while respecting manual user overrides.
- **Live PR Count Badge & Synchronization:**
  + Connects seamlessly to GitHub/GitLab remote endpoints (evaluating `origin` and `upstream` fallbacks).
  + Displays the real-time open PR count directly on the Top Nav PR Tab with immediate refresh upon authentication or tab switching.
- **Ahead / Behind Badges:** Realtime divergence tracking relative to upstream (`↑ 3  ↓ 1`).

### Intuitive Visual Operations:
- **Switch Branch (Checkout):** Double-click any branch name. Dirty working trees are safeguarded beforehand.
- **Branch Action Menu:** Click the `...` (MoreVertical) button on any branch or right-click to access 12+ operations: Checkout, Rebase onto HEAD, Publish to remote, Push (+ahead badge), Force Push, Fetch, Create PR, Rename, Copy name, Solo branch, Pin favorite, and Safe Delete.
- **Create Branch:** Press shortcut `B` or right-click any node ➔ **"Create Branch..."** (supports creating from HEAD or any past commit/tag).
- **Rename Branch:** Slow double-click any branch pill or select Rename to edit inline (`Enter` to save, `Esc` to cancel).
- **Safe Branch Deletion:** Clear warning prompts if a branch has unmerged work (`DeleteBranchModal.svelte`).

---

## 🧹 2. Clean Merged Branches

Component: `src/lib/components/CleanMergedBranchesModal.svelte`

### The Problem:
After months of sprint work, dozens of stale local branches accumulate (`feat/login`, `fix/nav`), cluttering the Sidebar.

### FlowGit Solution:
1. Click the broom icon **"Clean Merged Branches"** in the Sidebar header.
2. Rust backend executes `get_merged_branches` to safely locate local branches whose commits are ancestors of `main`.
3. Displays a checklist of safe-to-delete branches.
4. Click **"Delete Selected Branches"** to purge merged branches in under 1 second.

---

## 🌐 3. Multi-Remotes Hub

Component: `src/lib/components/RemoteManagerModal.svelte`

For open-source contributions and corporate fork workflows:
- **`origin`:** Developer's personal fork.
- **`upstream`:** Central organization repository.

### Features:
- **Remote Listing:** Displays Fetch and Push endpoints per remote.
- **Add Remote (`add_remote`):** 1-Click modal to configure new remotes (`git remote add upstream https://...`).
- **Edit & Sync:** Update endpoints or remove unused remotes.
- **Independent Fetch:** Fetch specific remotes independently without network bottlenecks.

---

## ⚡ 4. 1-Click Smart Sync with Upstream

Component: `src/lib/components/Toolbar.svelte`

### Traditional Multi-Step CLI:
```bash
git fetch origin
git checkout main
git pull origin main
git checkout my-feature
git rebase main
```
Takes 5–7 steps, interrupts IDE state, and triggers unnecessary project recompilations.

### FlowGit 1-Click Experience:
- As soon as your branch falls behind remote (`↓ X commits`):
- The **"Smart Sync"** button illuminates on the Toolbar.
- Click **"Smart Sync"**:
  - Automatically fetches upstream changes.
  - Rebases your active feature branch onto upstream HEAD in the background.
  - You **never leave the context of your active feature branch**.
- **Realtime Transfer Progress Streaming**:
  - During Fetch, Push, or Smart Sync, Rust transfers network bytes via `git2` transfer progress callbacks.
  - Emits `remote://transfer-progress` events containing indexed objects, received objects, total objects, and transferred bytes.
  - The `StatusBar` displays an animated capsule with exact percentage and megabytes received (e.g. `Syncing... 64% (12.4 MB)`).

---

## 🏷️ 5. Release Tags Management

Components:
- `src/lib/components/CreateTagModal.svelte`: Creation of lightweight and annotated tags.
- `src/lib/components/DeleteTagModal.svelte`: Safe deletion with confirmation modal dialog.
- `src/lib/components/GitHubReleasesModal.svelte`: GitHub Releases & Markdown Changelog viewer.
- `src/lib/components/sidebar/SidebarSections.svelte`: Interactive tag tree in sidebar with quick actions.
- `src/lib/components/CommitDetail.svelte`: Tag badge, annotated release note, and GitHub release link inspection.

### Features & Capabilities:
- **Interactive Inspection (Click to Jump):** Clicking any tag in the sidebar immediately navigates to its target commit in the Commit Graph, auto-scrolling the viewport and loading its `CommitDetail` with diffs and files.
- **GitHub Releases & Changelog Viewer (`GitHubReleasesModal.svelte`):**
  - Displays a 2-column layout matching the GitHub web experience (`Release list` on the left, full Markdown Changelog on the right).
  - Shows release title, draft/pre-release/latest badges, author avatar, date, and downloadable binary assets.
  - Interactive clickable tags & commit SHAs that jump straight to the commit on the DAG graph.
  - Quick action buttons: Copy Release Notes, Open in GitHub, Realtime search filter.
  - One-click trigger from Sidebar Tag header, per-tag Globe button, or Commit Detail panel.
- **Annotated Tag Release Notes:** If a tag has an annotated release message, `CommitDetail` highlights it in an amber release notes card alongside the commit message.
- **No-Fear Safe Deletion:** Clicking the delete icon prompts `DeleteTagModal` with clear tag name, commit SHA, and caution warnings before removing the ref.
- **Quick Tag Actions:**
  - One-click copy tag name with visual feedback.
  - Create a new branch directly starting from this tag reference.
  - View GitHub Release Notes & Changelog directly.
- **Fast Tag Creation:** Right-click any commit ➔ **"Create Tag Here"** (supports Lightweight & Annotated tags).

---

## 📡 6. Realtime Upstream Tracking & Background Fetch

Component: `src/lib/components/UpstreamUpdateBanner.svelte`  
State Manager: `src/lib/state/remoteState.svelte.ts`  
Backend Commands: `silent_background_fetch`, `get_incoming_commits`

### Automated Remote Awareness:
- **Non-Intrusive Background Fetch:** FlowGit periodically executes `silent_background_fetch` to check if collaborators have pushed new commits to the upstream branch. It runs entirely silently without blocking the user or spawning credential popups.
- **Upstream Update Banner (`UpstreamUpdateBanner.svelte`):**
  - Floats above the commit graph when new incoming commits are detected (`↓ N commits incoming`).
  - Displays a preview list of incoming commits (author, message, commit SHA) via `get_incoming_commits`.
  - **1-Click Actions:**
    - **Fast-Forward Pull:** Instantly updates local branch when no divergence exists.
    - **Fetch & Rebase:** Replays local work cleanly on top of upstream.
    - **Dismiss / Snooze:** Hides banner to avoid interrupting current focus.

---

## 🚀 7. Recent Push Banner & Instant PR Launchpad

Component: `src/lib/components/RecentPushBanner.svelte` & `src/lib/components/CreatePullRequestModal.svelte`

### Seamless GitHub Hand-off:
- Immediately after pushing a new branch to remote, FlowGit displays a contextual banner:  
  *"You recently pushed branch `feat/user-auth`. Create a Pull Request?"*
- **1-Click Action:** Launches `CreatePullRequestModal.svelte` pre-filled with branch targets, title, and generated release notes from commit history, eliminating the need to switch to a web browser.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🌿 1. QUẢN LÝ NHÁNH LINH HOẠT & SIDEBAR ICON RAIL (BRANCH MANAGEMENT)

Component: `src/lib/components/Sidebar.svelte`, `SidebarBranchTree.svelte`, `SidebarSections.svelte`, `SidebarContextMenu.svelte`

Sidebar của FlowGit ứng dụng mô hình 2 tầng chuẩn mực **Icon Rail (Activity Bar) + Resizable Active Panel**:
- **Icon Rail bên trái (44px):** Thanh điều hướng icon chuyển đổi 1-click kèm huy hiệu đếm số lượng thời gian thực cho 5 không gian:
  + 🌿 **Branches:** Toàn quyền không gian hiển thị Local Branches, Remote Branches và Pinned Favorites.
  + 🌐 **Remotes:** Danh sách Remotes (`origin`, `upstream`), nút Fetch độc lập và Quản lý Remote.
  + 🏷️ **Tags:** Danh sách Release Tags kèm nút xóa/tạo nhanh.
  + 📦 **Stashes:** Danh sách Stashes kèm nút mở khay Visual Stash Shelf Drawer.
  + 📂 **Worktrees:** Danh sách Worktrees song song.
- **Thanh kéo chỉnh độ rộng (Drag to Resize - 220px đến 500px):** Kéo mép viền phải để thoải mái đọc các tên nhánh dài sâu (`feature/TASK-1234-...`). Kích thước được lưu tự động vào `localStorage`.
- **3 Chế độ Thu gọn linh hoạt:**
  1. *Chế độ Đầy đủ:* Rail (44px) + Active Panel (tùy chỉnh độ rộng).
  2. *Chế độ Rail-Only:* Nhấp vào tab đang chọn hoặc nút thu gọn ở đáy rail để co sidebar về thanh icon 44px siêu tiết kiệm diện tích.
  3. *Chế độ Ẩn sạch:* Phím tắt `Ctrl + B` ẩn hoàn toàn Sidebar để xem đồ thị DAG toàn màn hình.
- **Tự thích ứng ngữ cảnh thông minh (Context-Aware Sidebar):**
  + Tự động kích hoạt tab phù hợp theo chế độ xem đang mở trên Top Nav (`Graph/Focus/DAG` ➔ `Branches`, `Changes` ➔ `Stashes`, `PRs` ➔ `Remotes`).
  + Không can thiệp nếu người dùng tự tay nhấp chuyển tab trong cùng một chế độ xem.
- **Huy hiệu số lượng PR trực tiếp (Live PR Count Badge):**
  + Tự động kết nối với API GitHub/GitLab theo endpoint remote (tự động thử `origin` và `upstream`).
  + Hiển thị trực tiếp số lượng PR đang mở trên thanh Top Nav và tự động cập nhật ngay sau khi đăng nhập hoặc chuyển Workspace Tab.
- **Huy hiệu Ahead / Behind:** Hiển thị thời gian thực độ lệch giữa nhánh local và remote tương ứng (`↑ 3  ↓ 1`).

### Thao tác trực quan trên nhánh:
- **Chuyển nhánh (Checkout):** Nhấp đúp chuột vào tên nhánh bất kỳ. Hệ thống tự động kiểm tra xem working tree có an toàn để chuyển hay không.
- **Menu Thao tác nhánh (`...` và Chuột phải):** Nhấp vào icon ba chấm `MoreVertical` hoặc nhấp chuột phải để mở menu 12+ tính năng: Checkout, Rebase lên HEAD, Publish lên remote, Push (+ahead badge), Force Push, Fetch, Tạo PR trên GitHub, Đổi tên, Sao chép tên, Solo branch, Ghim yêu thích và Xóa an toàn.
- **Tạo nhánh mới:** Bấm phím tắt `B` hoặc nhấp chuột phải chọn **"Create Branch..."**. Cho phép tạo từ HEAD hoặc từ bất kỳ commit/tag nào trong quá khứ.
- **Đổi tên nhánh:** Nhấp đúp chuột chậm vào nhãn nhánh để sửa tên tại chỗ (`Enter` để lưu, `Esc` để hủy).
- **Xóa nhánh an toàn:** Cảnh báo rõ ràng nếu nhánh chưa được merge vào nhánh chính để tránh vô tình làm mất code (`DeleteBranchModal.svelte`).

---

## 🧹 2. DỌN DẸP NHÁNH ĐÃ MERGE (CLEAN MERGED BRANCHES)

Component: `src/lib/components/CleanMergedBranchesModal.svelte`

### Vấn đề:
Sau nhiều tháng làm việc trong các dự án agile lớn, lập trình viên thường tích lũy hàng chục nhánh local cũ (`feat/login`, `fix/nav`, `test/api`) đã được merge vào `main` nhưng chưa xóa, làm Sidebar chật chội và rối mắt.

### Giải pháp của FlowGit:
1. Bấm vào nút chổi quét **"Clean Merged Branches"** trên thanh tiêu đề Sidebar.
2. Hệ thống gọi thuật toán `get_merged_branches` tại Rust backend để rà soát toàn bộ các nhánh local có commit trỏ tới một tổ tiên đã nằm trong `main`.
3. Hiển thị danh sách các nhánh an toàn có thể xóa với hộp kiểm (checkbox) chọn lọc.
4. Nhấn **"Delete Selected Branches"**: Xóa hàng loạt toàn bộ nhánh rác trong 1 giây mà không gây bất kỳ rủi ro nào cho nhánh chính.

---

## 🌐 3. TRUNG TÂM ĐA REMOTES (MULTI-REMOTES HUB)

Component: `src/lib/components/RemoteManagerModal.svelte`

Đối với các dự án mã nguồn mở hoặc tổ chức phân tán theo mô hình Fork Workflow:
- **`origin`:** Kho fork cá nhân của lập trình viên.
- **`upstream`:** Kho mã nguồn chính của tổ chức.

### Tính năng của Remote Manager:
- **Xem danh sách Remotes:** Hiển thị tên, URL Fetch và URL Push của từng máy chủ từ xa.
- **Thêm Remote mới (`add_remote`):** Bấm nút `+` để thêm remote mới (ví dụ: `git remote add upstream https://...`).
- **Chỉnh sửa & Đồng bộ:** Thay đổi URL remote, xóa bỏ remote không còn sử dụng.
- **Fetch độc lập:** Cho phép nhấn Fetch riêng cho từng remote mà không làm nghẽn kết nối mạng.

---

## ⚡ 4. 1-CLICK SMART SYNC WITH UPSTREAM

Component: `src/lib/components/Toolbar.svelte`

### Quy trình dòng lệnh thủ công truyền thống:
```bash
git fetch origin
git checkout main
git pull origin main
git checkout my-feature
git rebase main
```
Thao tác này mất từ 5 đến 7 bước, phải chuyển đổi checkout qua lại làm gián đoạn IDE và tốn thời gian biên dịch lại mã nguồn.

### Trải nghiệm 1-Chạm trên FlowGit:
- Ngay khi phát hiện nhánh của bạn bị tụt hậu so với Remote (hiển thị `↓ X commits`):
- Nút **"Smart Sync"** trên thanh Toolbar sẽ sáng đèn.
- Bạn chỉ cần bấm **1 cú click vào nút "Smart Sync"**:
  - Hệ thống tự động fetch các commit mới từ remote.
  - Tự động thực hiện Rebase ngầm nhánh hiện tại của bạn lên trên đỉnh của upstream.
  - Bạn **không bao giờ phải rời khỏi ngữ cảnh của nhánh đang code**.
- **Hiển thị tiến trình mạng thời gian thực (Transfer Progress Streaming)**:
  - Khi thực hiện Fetch, Push hoặc Smart Sync, backend Rust lắng nghe sự kiện `git2` transfer callback và phát event `remote://transfer-progress`.
  - Thanh trạng thái `StatusBar` hiển thị viên nang (capsule) động với phần trăm (%) hoàn thành và dung lượng tải về thực tế (ví dụ: `Syncing... 64% (12.4 MB)`).

---

## 🏷️ 5. QUẢN LÝ RELEASE TAGS (PHIÊN BẢN PHÁT HÀNH)

Components:
- `src/lib/components/CreateTagModal.svelte`: Hộp thoại tạo thẻ Tag (Lightweight & Annotated).
- `src/lib/components/DeleteTagModal.svelte`: Hộp thoại xác nhận xóa Tag an toàn (No-Fear Git).
- `src/lib/components/GitHubReleasesModal.svelte`: Hộp thoại xem GitHub Releases & Changelog chuẩn GitHub web.
- `src/lib/components/sidebar/SidebarSections.svelte`: Cây danh sách Tag tương tác trực tiếp ở thanh Sidebar.
- `src/lib/components/CommitDetail.svelte`: Hiển thị huy hiệu thẻ Tag, ghi chú phát hành (Release Notes) và nút mở GitHub Releases.

### Tính năng & Trải nghiệm vượt trội:
- **Tương tác trực tiếp (Click để nhảy tới commit):** Nhấp chuột vào bất kỳ thẻ Tag nào ở Sidebar, ứng dụng sẽ tự động định vị và cuộn tới commit mục tiêu trên Commit Graph, đồng thời mở bảng `CommitDetail` để xem toàn bộ diff, files và thông tin commit.
- **Trình duyệt GitHub Releases & Changelog (`GitHubReleasesModal.svelte`):**
  - Giao diện 2 cột tiêu chuẩn như trên GitHub web: Cột trái liệt kê danh sách Releases, Cột phải hiển thị chi tiết Changelog định dạng Markdown.
  - Hiển thị tiêu đề bản phát hành, huy hiệu `Draft`, `Pre-release`, `Latest`, ảnh avatar tác giả, ngày phát hành, và danh sách tệp đính kèm tải về (Assets).
  - Tương tác thông minh: Bấm vào tên Tag hoặc mã Commit SHA trong Release để tự động nhảy tới commit tương ứng trên đồ thị.
  - Thao tác nhanh: Sao chép nội dung Release Notes vào Clipboard, Mở trực tiếp trên trình duyệt GitHub, Tìm kiếm lọc danh sách Release theo thời gian thực.
  - Kích hoạt dễ dàng: Bấm biểu tượng quả địa cầu trên thanh tiêu đề Thẻ (Tags) ở Sidebar, nút quả địa cầu ở từng hàng Tag, hoặc nút "Release Notes" trong bảng Commit Detail.
- **Đọc ghi chú phiên bản (Annotated Release Note):** Đối với thẻ có chú thích (`Annotated Tag`), bảng chi tiết commit sẽ hiển thị nổi bật khối Release Note màu hổ phách chứa thông điệp phát hành.
- **Xác nhận xóa an toàn (Safe Deletion):** Nhấp vào icon thùng rác sẽ kích hoạt `DeleteTagModal` với cảnh báo chi tiết (tên tag, mã SHA, nội dung tag) trước khi thực hiện xóa, tránh hoàn toàn rủi ro click nhầm.
- **Thao tác nhanh 1-Click:**
  - Sao chép tên thẻ Tag nhanh vào Clipboard với phản hồi trực quan.
  - Tạo nhanh nhánh mới (Create Branch) trực tiếp từ mốc phiên bản Tag đã chọn.
  - Mở xem trực tiếp GitHub Release & Changelog của thẻ.
- **Tạo Tag nhanh:** Chuột phải vào bất kỳ commit nào trên đồ thị ➔ **"Create Tag / Release here..."**.

---

## 📡 6. THEO DÕI UPSTREAM THỜI GIAN THỰC & AUTO-FETCH NGẦM (UPSTREAM TRACKING)

Component: `src/lib/components/UpstreamUpdateBanner.svelte`  
Quản lý trạng thái: `src/lib/state/remoteState.svelte.ts`  
Backend Commands: `silent_background_fetch`, `get_incoming_commits`

### Tự động nhận diện thay đổi từ đồng đội:
- **Chế độ Fetch ngầm êm ái (Silent Background Fetch):** FlowGit tự động thực hiện fetch kiểm tra định kỳ bằng `silent_background_fetch` trong nền mà không làm đơ giao diện hay bật popup xác thực phiền toái.
- **Banner thông báo Upstream (`UpstreamUpdateBanner.svelte`):**
  - Xuất hiện tinh tế trên đỉnh Commit Graph ngay khi phát hiện có commit mới trên remote (`↓ N commit mới trên upstream`).
  - Cho phép xem nhanh danh sách tóm tắt các commit sắp kéo về (tác giả, thông điệp, mã SHA) thông qua `get_incoming_commits`.
  - **Thao tác 1-chạm:**
    - **Fast-Forward Pull:** Cập nhật ngay lập tức nếu nhánh local không có commit lệch.
    - **Fetch & Rebase:** Tự động đặt các commit dở dang của bạn lên đỉnh nhánh remote.
    - **Bỏ qua / Đóng:** Tạm thời ẩn banner nếu bạn đang tập trung chỉnh sửa tệp hiện tại.

---

## 🚀 7. BANNER PUSH GẦN ĐÂY & MỞ PULL REQUEST NHANH (RECENT PUSH BANNER)

Component: `src/lib/components/RecentPushBanner.svelte` & `src/lib/components/CreatePullRequestModal.svelte`

### Tối ưu tốc độ làm việc nhóm:
- Ngay sau khi bạn push thành công một nhánh mới lên remote, FlowGit tự động phát hiện và bật banner thông minh:  
  *"Bạn vừa đẩy nhánh `feat/user-auth`. Bạn có muốn tạo Pull Request ngay không?"*
- **Tạo PR 1-chạm:** Nhấp vào nút mở trực tiếp modal `CreatePullRequestModal.svelte` được điền sẵn tên nhánh nguồn, nhánh đích, tiêu đề và mô tả tự động sinh từ lịch sử commit mà không cần chuyển qua trình duyệt web.
