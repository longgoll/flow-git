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

## 🌿 1. Flexible Branch Management

Component: `Sidebar.svelte`, `CreateBranchModal.svelte`, `DeleteBranchModal.svelte`

The FlowGit Sidebar categorizes branches into clear hierarchical sections:
- **Local Branches:** Development branches hosted on your local machine.
- **Remote Branches:** Remote tracking branches on servers (GitHub, GitLab, Bitbucket).
- **Ahead / Behind Badges:** Realtime divergence tracking relative to upstream (`↑ 3  ↓ 1`).

### Intuitive Visual Operations:
- **Switch Branch (Checkout):** Double-click any branch name. Dirty working trees are safeguarded beforehand.
- **Create Branch:** Press shortcut `B` or right-click any node ➔ **"Create Branch..."** (supports creating from HEAD or any past commit/tag).
- **Rename Branch:** Slow double-click any branch pill to rename in place (`rename_branch`).
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

---

## 🏷️ 5. Release Tags Management

Component: `src/lib/components/CreateTagModal.svelte`

- Browse release tags (`v1.0.0`, `v1.1.0-beta`) across Sidebar and DAG canvas.
- **Fast Tagging:** Right-click any commit ➔ **"Create Tag Here"**.
- Supports both **Lightweight** and **Annotated Tags** with messages.
- Safe deletion via context menu.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🌿 1. QUẢN LÝ NHÁNH LINH HOẠT (BRANCH MANAGEMENT)

Component: `Sidebar.svelte`, `CreateBranchModal.svelte`, `DeleteBranchModal.svelte`

Sidebar của FlowGit phân loại các nhánh trong repository thành các cây thư mục rõ ràng:
- **Local Branches:** Các nhánh làm việc trên máy tính cá nhân.
- **Remote Branches:** Các nhánh được theo dõi trên máy chủ từ xa (GitHub, GitLab, Bitbucket).
- **Huy hiệu Ahead / Behind:** Hiển thị thời gian thực độ lệch giữa nhánh local và remote tương ứng (`↑ 3  ↓ 1`).

### Thao tác trực quan trên nhánh:
- **Chuyển nhánh (Checkout):** Nhấp đúp chuột vào tên nhánh bất kỳ. Hệ thống tự động kiểm tra xem working tree có an toàn để chuyển hay không.
- **Tạo nhánh mới:** Bấm phím tắt `B` hoặc nhấp chuột phải chọn **"Create Branch..."**. Cho phép tạo từ HEAD hoặc từ bất kỳ commit/tag nào trong quá khứ.
- **Đổi tên nhánh:** Nhấp đúp chuột chậm vào nhãn nhánh để sửa tên tại chỗ (`rename_branch`).
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

---

## 🏷️ 5. QUẢN LÝ RELEASE TAGS

Component: `src/lib/components/CreateTagModal.svelte`

- Xem toàn bộ danh sách phiên bản phát hành (`v1.0.0`, `v1.1.0-beta`, v.v.) trên Sidebar và đồ thị.
- **Tạo Tag nhanh:** Nhấp chuột phải vào bất kỳ node commit nào trên đồ thị -> Chọn **"Create Tag Here"**.
- Hỗ trợ cả 2 chuẩn:
  - **Lightweight Tag:** Gắn nhãn con trỏ đơn giản.
  - **Annotated Tag:** Gắn kèm thông điệp phát hành và định danh người tạo.
- Xóa Tag an toàn bằng menu chuột phải.
