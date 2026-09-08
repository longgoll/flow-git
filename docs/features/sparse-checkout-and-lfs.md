# Sparse Checkout Studio & Git LFS Deep Awareness
# Hệ thống Sparse Checkout Monorepo & Nhận diện Chuyên sâu Git LFS

> **Standard (Chuẩn công nghệ):** Git 2.25+ Sparse Checkout (Cone & Pattern Mode), Git LFS Pointer Specification v1, Svelte 5 Runes, Zero-Crash Safe Fallbacks.

---

## English Documentation

### 1. Executive Summary
Modern software engineering frequently involves massive Monorepos (such as multi-package JavaScript/TypeScript, mobile apps, or backend microservices) as well as binary-heavy game and machine learning repositories. Working with these repositories presents two distinct challenges:
- **Monorepo Bloat:** Checking out hundreds of unneeded services or packages consumes hundreds of gigabytes, degrades disk I/O, and causes IDE/Git sluggishness.
- **Binary Assets Management (LFS):** Git LFS pointer files (containing SHA-256 metadata instead of raw binaries) can cause confusion when viewing diffs or browsing files, requiring manual terminal commands to pull binary payloads.

FlowGit solves both bottlenecks directly through:
1. **Sparse Checkout Studio:** A visual manager supporting cone mode and pattern mode, auto-discovering monorepo package structures and allowing 1-click inclusion/exclusion without data loss.
2. **Git LFS Deep Awareness:** Direct integration into the `DiffViewer` that detects LFS pointer headers (`version https://git-lfs.github.com/spec/v1`), displays asset size and OID, and provides a 1-click inline pull button, alongside a full `.gitattributes` pattern tracking hub (`git lfs track` / `untrack`).

---

### 2. Architecture & Implementation

#### A. Sparse Checkout Engine (`src-tauri/src/git/sparse.rs`)
- **Cone Mode (`--cone`):** The modern, high-performance sparse-checkout mode recommended by the Git core team. Rather than applying costly arbitrary regular expressions across every tree entry, cone mode uses prefix-based directory matching (`core.sparseCheckoutCone = true`).
- **Directory Tree Auto-Discovery:** When opening Sparse Checkout Studio, the backend recursively scans the repository directory tree up to depth 2-3 (filtering out `.git`, `node_modules`, `target`, `dist`, `.turbo`, and hidden directories), presenting a clean, instant checklist.
- **Non-Destructive Operations:**
  - `set_sparse_checkout`: Applies selected directories via `git sparse-checkout set [--cone] <paths...>`.
  - `disable_sparse_checkout`: Restores full workspace checkout via `git sparse-checkout disable` without modifying uncommitted local work.
  - `reapply_sparse_checkout`: Refreshes workspace filters via `git sparse-checkout reapply`.

#### B. Git LFS Deep Awareness (`src-tauri/src/git/lfs.rs` & `DiffViewer.svelte`)
- **Pointer Detection Specification:**
  Any file or diff hunk matching the canonical Git LFS specification:
  ```text
  version https://git-lfs.github.com/spec/v1
  oid sha256:<64-hex-chars>
  size <integer>
  ```
  triggers the `DiffViewer` LFS Banner, presenting the formatted file size (e.g., `42.5 MB`), partial SHA-256 hash, and an instant **"Pull File with LFS"** button.
- **Pattern Tracking & Untracking:**
  Users can add wildcard rules (e.g., `*.psd`, `*.mp4`, `*.zip`, `*.fbx`) directly into `.gitattributes` through `git lfs track` and untrack them with 1 click via `git lfs untrack`.

---

### 3. IPC Commands Reference

| Command | Arguments | Return Type | Description |
|---|---|---|---|
| `get_sparse_checkout_info` | `path: String` | `SparseCheckoutInfo` | Inspects sparse-checkout enabled status, cone flag, patterns, and available monorepo directories |
| `set_sparse_checkout` | `path: String, patterns: Vec<String>, cone: bool` | `String` | Configures and applies sparse checkout directories |
| `disable_sparse_checkout` | `path: String` | `String` | Disables sparse checkout and restores full workspace checkout |
| `reapply_sparse_checkout` | `path: String` | `String` | Re-evaluates sparse checkout rules against working tree |
| `track_lfs_pattern` | `path: String, pattern: String` | `String` | Adds pattern to `.gitattributes` using `git lfs track` |
| `untrack_lfs_pattern` | `path: String, pattern: String` | `String` | Removes pattern from `.gitattributes` using `git lfs untrack` |

---

## Tài liệu Tiếng Việt

### 1. Tổng quan & Triết lý Thiết kế
Trong các dự án phần mềm quy mô lớn (Monorepo đa dịch vụ, Game Engine, AI/ML), lập trình viên thường xuyên đối mặt với 2 vấn đề lớn:
1. **Monorepo phình to:** Khi checkout hàng trăm packages hoặc apps không liên quan, ổ cứng bị chiếm dụng hàng chục GB, `git status` và IDE indexing trở nên chậm chạp.
2. **Quản lý tệp nhị phân lớn (Git LFS):** Các tệp LFS trong diff thường chỉ hiển thị dưới dạng con trỏ text 3 dòng (`version`, `oid`, `size`), khiến người dùng không biết rõ kích thước tệp và phải gõ lệnh terminal để tải binary về máy.

FlowGit giải quyết triệt để 2 vấn đề trên:
- **Sparse Checkout Studio:** Giao diện trực quan hỗ trợ cả Chế độ Cone (`--cone`) và Pattern tự do, tự động phát hiện danh sách thư mục `apps/`, `packages/`, `libs/` để người dùng tick chọn trong 1 giây.
- **Git LFS Deep Awareness:** Tự động phát hiện LFS pointer trong `DiffViewer`, hiển thị banner thông tin dung lượng và nút **"Tải tệp từ LFS"** 1-chạm ngay trên màn hình so sánh diff, kèm trung tâm cấu hình quy tắc theo dõi `.gitattributes`.

---

### 2. Kiến trúc & Vận hành Kỹ thuật

#### A. Sparse Checkout Studio (`SparseCheckoutModal.svelte`)
- **Chế độ Cone Mode:** Kích hoạt thuật toán khớp tiền tố thư mục tối ưu của Git (`core.sparseCheckoutCone = true`), giúp kiểm tra trạng thái tệp cực nhanh kể cả khi repo có hàng trăm nghìn commits.
- **Tự động quét thư mục:** Quét nhanh các nhánh cấp 1-2 của repo và bỏ qua các thư mục rác / build (`node_modules`, `target`, `dist`, `.svelte-kit`, v.v.), cho phép tìm kiếm và chọn nhanh.
- **Thao tác an toàn:**
  - `Áp dụng (Apply)`: Chạy `git sparse-checkout set` với danh sách thư mục đã chọn.
  - `Tắt Sparse (Disable)`: Trả về trạng thái full checkout toàn bộ repo mà không làm mất các thay đổi chưa commit.
  - `Tái áp dụng (Reapply)`: Cập nhật lại các tệp trên đĩa khớp với quy chuẩn mới nhất.

#### B. Nhận diện LFS Pointer trong Diff (`DiffViewer.svelte`)
- Khi người dùng xem diff của một tệp LFS chưa tải binary về máy, `DiffViewer` tự động phân tích cú pháp chuẩn spec v1:
  - Bóc tách mã băm SHA-256 (`oid`) và kích thước byte (`size`).
  - Định dạng kích thước sang KB, MB, GB trực quan.
  - Hiển thị nút **"Tải tệp từ LFS (Pull)"** gọi `pullLfsFiles(repoPath, filePath)`. Sau khi tải xong, hệ thống tự động thông báo và sẵn sàng xem diff mới.

#### C. Quản lý Quy tắc Theo dõi (`LfsManager.svelte`)
- Cung cấp ô nhập pattern mới cùng các nút preset tiện lợi: `*.psd`, `*.mp4`, `*.zip`, `*.blend`, `*.fbx`, `*.tar.gz`.
- Nút hủy theo dõi (Untrack) trực tiếp trên từng nhãn pattern mà không cần mở file `.gitattributes` bằng tay.
- Nút tải từng tệp (Single File Pull) ngay trong danh sách tệp LFS của repository.

---

### 3. Kiểm thử & Độ tin cậy (Testing & Verification)
- Toàn bộ giao diện được viết bằng chuẩn **Svelte 5 Runes** (`$state`, `$derived`, `$effect`, `$props`).
- Được định kiểu nghiêm ngặt trong `src/lib/types.ts` (`SparseCheckoutInfo`, `LfsSummary`).
- Đảm bảo biên dịch không lỗi (`npm run check` 0 errors, 0 warnings).
- Đa ngôn ngữ hoàn chỉnh 100% qua từ điển song ngữ `vi` và `en`.
