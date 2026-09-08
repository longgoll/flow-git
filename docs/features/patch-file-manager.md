<div align="center">

# 🩹 Patch File Manager & Engine
### Trình Quản Lý & Áp Dụng Tệp Patch Ngoại Vi

> **Offline Collaboration & Code Sharing:** Standard `git format-patch` export, Drag & Drop `.patch`/`.diff` import, and In-Memory Dry-Run applicability validation  
> **Related Documentation:** Safe Discard & Undo Engine resides in [`working-tree-and-diff.md`](./working-tree-and-diff.md)  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🌟 Overview & Capabilities

The **Patch File Manager** enables seamless sharing and recovery of changes via standard unified diff / patch files without requiring remote branch pushes:
- **Zero Terminal Friction:** Export any commit directly from the graph with 1 click, or import external patches via file dropzone or direct clipboard paste.
- **Dry-Run Conflict Verification:** Checks patch applicability before applying to the disk, previewing all affected files and warning if files are missing or modified.
- **Dual Mode Flexibility:**
  - **Export Mode:** Generates compliant `git format-patch` output including commit metadata (Author, Email, Date, Subject, message, diff body).
  - **Apply Mode:** Drag & drop `.patch` or `.diff` files, live delta validation, optional immediate staging to Git index (`ApplyLocation::Both`), and reverse patch application.

---

## 📤 1. Export Commit as Patch

Component: `src/lib/components/PatchManagerModal.svelte`  
Backend: `src-tauri/src/git/patch.rs` (`export_commit_patch`)  
IPC Command: `export_commit_patch(path: String, commit_id: String) -> AppResult<String>`

- **Format:** Fully standard RFC 2822 / Git format-patch header:
  ```
  From <commit_id> Mon Sep 17 00:00:00 2001
  From: Author Name <email@domain.com>
  Date: Sun, 8 Sep 2026 14:30:00 +0000
  Subject: [PATCH] Commit summary

  Detailed commit message...
  ---
  <unified diff hunks>
  --
  FlowGit v2
  ```
- **Actions:**
  - **Copy to Clipboard:** 1-click clipboard copy with feedback toast.
  - **Save as `.patch` File:** Saves directly as `flowgit-<shortSha>.patch` on disk.

---

## 📥 2. Import & Apply Patch with Dry-Run Check

Backend: `src-tauri/src/git/patch.rs` (`check_patch`, `apply_patch`)  
IPC Commands:
- `check_patch(path: String, patch_content: String) -> AppResult<PatchCheckResult>`
- `apply_patch(path: String, patch_content: String, stage_to_index: Option<bool>, reverse: Option<bool>) -> AppResult<PatchApplyResult>`

- **Dropzone & File Selector:** Accepts `.patch` and `.diff` files via drag-and-drop or local file browser.
- **Dry-Run Validation (`check_patch`):** Parses diff deltas without altering working tree files:
  - Verifies presence of target files for modified/deleted lines.
  - Displays summary of affected files, additions (+), deletions (-), and hunks count.
  - Highlights status badge: **Clean (Ready)** vs **Conflict (Error)**.
- **Execution Options:**
  - **Stage to Index:** Automatically stages affected files into the Git index upon completion.
  - **Apply in Reverse:** Inverts patch changes to undo previously applied diffs.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🌟 Tổng Quan & Khả Năng Vận Hành

**Patch File Manager** cho phép chia sẻ, trao đổi và phục hồi các thay đổi mã nguồn qua các tệp `.patch` / `.diff` tiêu chuẩn mà không cần thông qua máy chủ remote:
- **Xuất 1-Click:** Nhấp chuột phải vào bất kỳ commit nào trên đồ thị ➔ chọn *"Xuất thành Patch (.patch)..."*.
- **Kiểm Tra Trước Khi Áp Dụng (Dry-Run):** Tự động phân tích cấu trúc patch, kiểm tra xem các file đích có tồn tại hay không trước khi ghi đè vào thư mục làm việc.
- **Hỗ Trợ Toàn Diện:**
  - **Tab Xuất (Export):** Xem trước mã patch, sao chép vào bộ nhớ tạm hoặc lưu thành tệp `.patch`.
  - **Tab Áp dụng (Apply):** Kéo thả tệp hoặc dán trực tiếp, hỗ trợ tùy chọn Stage ngay vào Index và Đảo ngược patch (Reverse).

---

## 📤 1. Xuất Commit Thành Tệp Patch Chuẩn

- Tương thích 100% với chuẩn `git format-patch` của Git CLI.
- Bao gồm đầy đủ thông tin metadata tác giả, thời gian, tiêu đề và nội dung commit.
- Hỗ trợ nút sao chép nhanh và tải về tệp tin `flowgit-<shortSha>.patch`.

---

## 📥 2. Nhập & Áp Dụng Patch An Toàn

- **Kiểm Tra An Toàn (Dry-Run):** Backend Rust phân tích buffer diff qua `git2::Diff::from_buffer`:
  - Xác thực tính hợp lệ của cú pháp patch.
  - Liệt kê toàn bộ các tệp tin chịu tác động (Added, Modified, Deleted, Renamed).
  - Đưa ra cảnh báo rõ ràng nếu thiếu tệp tin nguồn trong working tree.
- **Áp Dụng Linh Hoạt:** Áp dụng trực tiếp vào Working Tree (hoặc đồng thời cả Index) với cập nhật tức thì trạng thái tệp tin và thông báo Toast phản hồi.
