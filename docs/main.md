<div align="center">

# 📑 FlowGit Technical Specification & UX Design
### Tài Liệu Đặc Tả Kỹ Thuật & Thiết Kế Trải Nghiệm (UI/UX Specification)

> **Edition:** 2026 Next-Gen State-of-the-Art Edition  
> **Platform:** Tauri v2 (Rust) + Svelte 5 (Runes) + Tailwind CSS v4 + Bits UI / Monaco Editor  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 1. Core Design Philosophy

> **"Visual First – Zero Terminal Friction"**  
> *(Prioritize visual intuition – Eliminate command-line burdens & tedious multi-step manual procedures)*

The ultimate mission of FlowGit is to **transform complex, abstract, and error-prone Git operations into intuitive 1–2 click, drag-and-drop interactions and lucid visual graphs.** Developers from Juniors to Tech Leads benefit from:

1. **Clear Big-Picture Visibility:** Immediately understand repository topology, branches, divergence levels, and merge conflict loci without guesswork.
2. **Zero Flag Memorization:** Eliminate the need to recall arcane multi-step commands (`git rebase -i`, `git bisect`, `git reset --hard`, `git cherry-pick`, `git add -p`).
3. **Absolute Safety (No-Fear Git):** Foresee outcomes before committing changes via **Ghost Preview** and maintain confidence with automated safety nets (**48-Hour Safe Discard** + **Time-Travel Undo `Ctrl + Z`**).
4. **Extreme Performance:** Locked at **60 FPS** on enterprise repositories (> 50,000 commits) with zero main-thread UI jank.

---

## 2. Comparison: Multi-Step CLI vs Intuitive Visual UI

| Complex / Error-Prone CLI Workflow | FlowGit Visual Experience |
| :--- | :--- |
| **Sync branch with latest `main`**<br>`git fetch origin`<br>`git checkout main`<br>`git pull`<br>`git checkout my-feature`<br>`git rebase main` (or merge) | **1-Click "Smart Sync with Upstream":**<br>Displays visual badge `Behind: 3 commits` right on branch. Click "Smart Sync", system fetches and rebases in the background without context switches. |
| **Squash 5 commits into 1**<br>`git rebase -i HEAD~5`<br>Edit lines in Vim/Nano to `squash`... | **Select 5 nodes on graph ➔ Press `S` (or drag together):**<br>Opens an intuitive squash popup, lets you edit the consolidated message, and merges in under 2 seconds. |
| **Pick 1 commit from another branch (Cherry-pick)**<br>`git log` find hash<br>`git checkout target`<br>`git cherry-pick <hash>` | **Drag & Drop commit node** directly from source branch onto the current HEAD branch tip with instant Ghost Preview simulation. |
| **Split commit / Partial staging**<br>`git reset HEAD~1`<br>`git add -p` (answer y/n per terminal hunk)... | **Direct Monaco Diff Interaction:**<br>Click lines or hunk blocks ➔ Press `Space` or click "Stage Line/Hunk" to bundle into staged changes. |
| **Trace bug introduction (Git Bisect)**<br>`git bisect start`<br>`git bisect bad`<br>`git bisect good <hash>`<br>Repeatedly test in terminal... | **Visual Bisect Wizard:**<br>Right-click broken commit ➔ *"Mark Bad 🐞"*, right-click known good commit ➔ *"Mark Good ✅"*. The system bisects the graph automatically and guides testing step-by-step. |
| **Rename branch & update remote**<br>`git branch -m new-name`<br>`git push origin :old-name new-name`<br>`git push origin -u new-name` | **Double-click branch name** on sidebar or graph ➔ Enter new name ➔ FlowGit renames local branch and safely updates upstream remote. |

---

## 3. Visual Components & Interactive Subsystems

### 📊 1. Living Interactive Graph Engine
- **OffscreenCanvas + Web Worker Architecture:**
  - Offloads entire graph canvas rendering to a dedicated Web Worker via `OffscreenCanvas`.
  - Maintains **60 FPS** on massive repositories (> 50,000 commits) without competing for main-thread CPU time.
  - Employs `$state.raw` in Svelte 5 to bypass reactive proxy overhead.
- **Rich Visual Topology:**
  - Author avatars, branch pill badges, relative timestamps (`15m ago`), CI/CD status badges (Green/Red icons).
  - **Ahead / Behind Indicators:** Realtime `↑ 2  ↓ 5` indicators right on branch heads.
- **Topological Lane Compaction:** Parallel lane routing algorithm powered by `rayon` keeps the graph horizontally compact.

### 👻 2. Ghost Preview & Dry-Run Simulation
- When dragging a commit or branch to Rebase, Merge, or Cherry-pick:
  - Graph immediately draws **dotted Ghost lines** illustrating future topological state.
  - **In-Memory Conflict Dry-Run:** Background simulation via `git2::Index` highlights conflicting nodes in amber with a warning: *"Anticipated 2 file conflicts"*.

### 🎯 3. Visual Git Bisect Wizard
- Step-by-step visual guidance:
  - Progress bar: *"Narrowed down to ~3 candidate commits (est. 2 steps remaining)"*.
  - Tested node pulses with high-contrast indicator, flanked by clear **"Pass ✅"** and **"Fail 🐞"** action buttons.

### 🧹 4. Branch Hygiene & Topology Radar
- Visual classification table for all repository branches:
  - **Merged Branches:** Already merged into base ➔ 1-Click safe bulk deletion.
  - **Stale Branches:** Inactive > 30 days ➔ Flags for review or archiving.
  - **Diverged Branches:** Identifies branches that diverged from base.

### 📦 5. Submodules & Git LFS Management
- **Git Submodules Hub:** Auto-detects submodules from `.gitmodules` and `git2::Repository::submodules`. Provides 1-click update (`--init --recursive`), sync, and detached HEAD tracking.
- **Git LFS Engine:** Identifies pointer files vs downloaded binary payloads. Supports file lock management (`git lfs locks`) and 1-click LFS object pulling.

### 🔑 6. Interactive SSH & HTTPS Credential Modal
- Intercepts SSH passphrase prompts and HTTPS `401 Unauthorized` errors.
- Displays non-blocking credential modal with secure in-memory session caching.
- Automatically retries the interrupted Git network operation upon successful authentication.

### ⚡ 7. Monorepo Virtualization (> 100,000 Commits)
- Streaming pagination API `get_paginated_commit_history(path, skip, limit)` in Rust.
- Initial load renders first 500 commits in < 50ms.
- Infinite scroll dynamically lazy-loads subsequent chunks with seamless Bezier spline lane continuation.

---

## 4. 2026 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (Svelte 5 SPA + Tailwind CSS v4 + Bits UI / Monaco Editor)     │
│ ├── Living Graph Engine: OffscreenCanvas + Web Worker (60 FPS Locked)   │
│ ├── Big Data Optimization: $state.raw + Lazy-Load Chunk Virtualization  │
│ ├── Interactive SSH / HTTPS Credential Prompt Modal                     │
│ ├── Submodule Explorer & Git LFS Asset Manager Panel                    │
│ ├── Ghost Preview Overlay & Drag-and-Drop Interaction Controller        │
│ ├── 3-Way Merge Conflict Visual Resolver (4-Pane Split View)            │
│ ├── Interactive Diff Viewer (Side-by-Side / Unified / Line Staging)     │
│ ├── Visual Bisect Wizard & Branch Hygiene Radar Panel                   │
│ └── Safe Recycle Bin (Trash Inspector) Panel                            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Tauri v2 IPC (Scoped Capabilities)
┌────────────────────────────────────┴────────────────────────────────────┐
│ BACKEND CORE (Rust)                                                     │
│ ├── Git Engine Core: `git2-rs` & Credential Callbacks                   │
│ ├── Monorepo Chunked Revwalk & Incremental Topological Lane Router      │
│ ├── Submodule Inspector & LFS Pointer/Lock Processor                    │
│ ├── Multi-threaded Lane Assignment & Routing Engine (`rayon`)           │
│ ├── Dry-run In-Memory Simulation Engine (Ghost Preview & Conflict Test) │
│ ├── Safe Discard Engine (SQLite `rusqlite` 48h Cache & Auto Eviction)   │
│ ├── Reflog Time-Travel Undo Engine (`Ctrl + Z` / `Ctrl + Shift + Z`)    │
│ ├── Realtime Debounced File System Watcher (`notify`)                   │
│ └── Local AI Service (Conventional Commit Generator & Conflict Advisor) │
└─────────────────────────────────────────────────────────────────────────┘
```

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 1. TRIẾT LÝ THIẾT KẾ CỐT LÕI (CORE DESIGN PHILOSOPHY)

> **"Visual First – Zero Terminal Friction"**  
> *(Ưu tiên trực quan – Triệt tiêu tối đa gánh nặng gõ lệnh & các thao tác thủ công nhiều bước)*

Mục tiêu tối thượng của sản phẩm là: **Biến mọi thao tác Git phức tạp, trừu tượng, dễ nhầm lẫn thành các tương tác trực quan 1-2 click, kéo-thả (Drag & Drop) và biểu đồ dễ hiểu.** Giúp lập trình viên từ Junior đến Tech Lead:
1. **Thấy rõ bức tranh toàn cảnh:** Hiểu ngay trạng thái repo, các nhánh, độ phân nhánh, vị trí xung đột mà không cần đoán.
2. **Không cần nhớ cú pháp cờ lệnh dài dòng:** Loại bỏ hoàn toàn nhu cầu gõ các lệnh phức tạp nhiều bước (`git rebase -i`, `git bisect`, `git reset --hard`, `git cherry-pick`, `git add -p`).
3. **Tuyệt đối an toàn (No-Fear Git):** Biết trước kết quả trước khi nhấn (Ghost Preview) và luôn có đường lui (Safe Discard 48h + Time-Travel Undo `Ctrl + Z`).
4. **Hiệu năng đỉnh cao (Extreme Performance):** Khóa cứng **60 FPS** với mọi repository lớn (> 50,000 commits), không bao giờ gây nghẽn UI main-thread.

---

## 2. BẢNG ĐỐI CHIẾU: TỪ "GÕ LỆNH NHIỀU BƯỚC" SANG "TƯƠNG TÁC TRỰC QUAN"

| Thao tác CLI phức tạp / Dễ sai | Trải nghiệm UI/UX Trực quan tương ứng |
| :--- | :--- |
| **Sync nhánh với `main` mới nhất**<br>`git fetch origin`<br>`git checkout main`<br>`git pull`<br>`git checkout my-feature`<br>`git rebase main` (hoặc merge) | **1 Click "Smart Sync with Upstream":**<br>Hiển thị visual badge `Behind: 3 commits` ngay trên nhánh. Bấm nút "Smart Sync", hệ thống tự động fetch và rebase ngầm, không cần nhảy context checkout qua lại. |
| **Gộp 5 commits thành 1 (Squash)**<br>`git rebase -i HEAD~5`<br>Mở trình soạn thảo Vim/Nano sửa các dòng thành `squash`... | **Bôi đen 5 node trên đồ thị ➔ Bấm phím `S` (hoặc kéo gộp lại)**:<br>Hiện popup trực quan để gộp, cho phép sửa commit message cuối cùng và hoàn tất trong 2 giây. |
| **Lấy 1 commit từ nhánh khác (Cherry-pick)**<br>`git log` tìm hash<br>`git checkout target`<br>`git cherry-pick <hash>` | **Kéo thả (Drag & Drop) node commit** từ nhánh nguồn thả thẳng vào đỉnh nhánh đích đang đứng. |
| **Tách commit / Stage từng phần (Partial Staging)**<br>`git reset HEAD~1`<br>`git add -p` (trả lời y/n từng hunk dòng lệnh)... | **Tương tác trực tiếp trên Diff Viewer:**<br>Click chọn từng dòng hoặc từng khối code (Hunk) ➔ Bấm phím `Space` hoặc nút "Stage Line/Hunk" để gom vào commit. |
| **Truy tìm commit sinh bug (Git Bisect)**<br>`git bisect start`<br>`git bisect bad`<br>`git bisect good <hash>`<br>Gõ lệnh test lặp đi lặp lại nhiều lần... | **Visual Bisect Wizard (Bản đồ truy vết bug):**<br>Click phải commit lỗi chọn *"Mark Bad 🐞"*, click commit cũ chọn *"Mark Good ✅"*. Hệ thống tự động chia đôi đồ thị, dẫn dắt test từng node trực quan. |
| **Đổi tên nhánh & cập nhật Remote**<br>`git branch -m new-name`<br>`git push origin :old-name new-name`<br>`git push origin -u new-name` | **Nhấp đúp chuột vào tên nhánh** trên Sidebar/Đồ thị ➔ Nhập tên mới ➔ App tự động đổi tên local và đồng bộ upstream remote an toàn. |

---

## 3. HỆ THỐNG BIỂU ĐỒ & THÀNH PHẦN GIAO DIỆN TRỰC QUAN (VISUAL DIAGRAMS & COMPONENTS)

### 📊 1. Đồ thị Động học (Living Interactive Graph Engine)
- **Kiến trúc OffscreenCanvas + Web Worker:**
  - Tách toàn bộ việc vẽ đồ thị sang Web Worker riêng biệt qua `OffscreenCanvas`.
  - Giữ vững tốc độ **60 FPS** với các repository siêu lớn (> 50,000 commits) mà không tiêu tốn tài nguyên trên luồng giao diện chính.
  - Sử dụng `$state.raw` trong Svelte 5 để triệt tiêu chi phí bọc Proxy bộ nhớ.
- **Hiển thị thông tin trực quan:**
  - Avatar tác giả, huy hiệu nhánh (branch pill), thời gian tương đối (`15 phút trước`), thẻ trạng thái CI/CD (Icon Xanh/Đỏ).
  - **Chỉ số Ahead / Behind trực quan:** Hiển thị trực tiếp trên nhánh `↑ 2  ↓ 5` (Dẫn trước 2 commit, tụt hậu 5 commit so với Remote).
- **Topological Lane Compaction:** Thuật toán nén làn đa luồng (`rayon`) giúp đồ thị gọn gàng, không bị phình ngang khi có nhiều nhánh song song.

### 👻 2. Ghost Preview (Dự báo hình dạng đồ thị & Cảnh báo Conflict trước khi bấm)
- Khi người dùng giữ chuột kéo một commit/nhánh chuẩn bị Rebase, Merge hay Cherry-pick:
  - Cây đồ thị lập tức vẽ các **đường nét đứt mờ (Ghost lines)** mô phỏng hình dạng cấu trúc cây sau khi thao tác hoàn tất.
  - **Dry-run Conflict Simulation:** Hệ thống chạy mô phỏng ngầm trong bộ nhớ (In-memory `git2::Index`), nếu có file bị xung đột sẽ làm phát sáng viền node màu cam kèm thông báo: *"Dự báo có 2 file conflict"*.

### 🎯 3. Visual Git Bisect Wizard (Bộ điều hướng truy tìm lỗi)
- Giao diện trực quan từng bước:
  - Thanh tiến trình: *"Đã thu hẹp còn lại ~3 commits cần kiểm tra (ước tính 2 bước nữa)"*.
  - Node đang được test sẽ sáng đèn nhấp nháy, kèm 2 nút bấm to rõ: **"Code Chạy Tốt (Pass)"** hoặc **"Code Bị Lỗi (Fail)"**.

### 🧹 4. Branch Hygiene & Topology Radar (Quản trị & Dọn dẹp Nhánh)
- Bảng trực quan phân loại toàn bộ nhánh trong repo:
  - **Merged Branches:** Đã merge vào nhánh chính ➔ Cung cấp nút 1-click "Dọn dẹp an toàn".
  - **Stale Branches:** Không có commit mới > 30 ngày ➔ Cảnh báo để dev xem xét xoá hoặc lưu trữ.
  - **Diverged Branches:** Nhánh bị lệch hướng so với Base branch.

### 📦 5. Git Submodules & Large File Storage (LFS) Management
- **Git Submodules Hub:**
  - Nhận diện tự động các submodules từ `.gitmodules` và `git2::Repository::submodules`.
  - Hiển thị danh sách submodules trên Sidebar/Panel: tên, đường dẫn, URL remote, trạng thái commit hiện tại (HEAD) so với commit được ghi nhận trong superproject (Index/WorkingTree), cảnh báo lệch phiên bản.
  - Hỗ trợ thao tác 1-click: `Submodule Update (--init --recursive)`, `Submodule Sync`, `Checkout Submodule Commit`.
- **Git LFS Engine:**
  - Nhận diện các tệp lớn được quản lý bởi LFS (dựa trên `.gitattributes` và `filter=lfs`).
  - Phân biệt rõ ràng giữa tệp con trỏ (LFS pointer text 130 bytes) và tệp nhị phân đã tải về máy (LFS binary payload).
  - Quản lý LFS Locks (`git lfs locks`) giúp lập trình viên game/đồ họa khóa file tránh xung đột tệp nhị phân không thể merge.
  - Cung cấp nút 1-click: `Fetch / Pull LFS Objects` cho toàn bộ hoặc từng tệp được chọn.

### 🔑 6. Interactive SSH & HTTPS Credential Modal (Xác thực thông minh)
- **Tự động bắt lỗi xác thực (Auth Interception):**
  - Khi thực hiện `Push`, `Pull`, `Fetch`, `Sync` gặp lỗi SSH Passphrase (ví dụ: `Enter passphrase for key ...`, `Permission denied (publickey)`) hoặc lỗi HTTPS `401 Unauthorized`.
  - Thay vì báo lỗi chung chung và dừng lại, ứng dụng hiển thị hộp thoại popup **"SSH / Remote Credentials Required"**.
- **Tính năng bảo mật:**
  - Nhập SSH Key Passphrase hoặc Personal Access Token (PAT) / Password trực tiếp.
  - Tùy chọn lưu tạm trong phiên làm việc (In-memory Session Cache) được mã hóa, không lưu mật khẩu trần ra ổ đĩa.
  - Tự động thử lại thao tác Git vừa bị gián đoạn ngay sau khi xác thực thành công.

### ⚡ 7. Monorepo Infinite Virtualization & Lazy-Loading (Phân trang > 100,000 Commits)
- **Kiến trúc Tải phân đoạn (Chunked Streaming History):**
  - Hỗ trợ API `get_paginated_commit_history(path, skip, limit)` từ Rust backend.
  - Khởi tạo ban đầu tải nhanh 500 commit đầu tiên để người dùng tương tác ngay trong < 50ms.
  - Khi người dùng cuộn (scroll) gần tới đáy danh sách, hệ thống tự động tải lười (lazy-load) thêm 500 - 1,000 commits tiếp theo.
- **Topological Lane Incremental Compaction:**
  - Duy trì trạng thái các lane đang mở (active lanes) để nối tiếp đồ thị liền mạch giữa các trang mà không bị đứt gãy đường cong Bezier.
  - Sử dụng `$state.raw` trong Svelte 5 để duy trì mảng commit khổng lồ mà không tạo proxy, kiểm soát RAM dưới 60MB cho 100,000 commits.

---

## 4. KIẾN TRÚC KỸ THUẬT TIÊN TIẾN 2026 (2026 SYSTEM ARCHITECTURE)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (Svelte 5 SPA + Tailwind CSS v4 + Bits UI / Monaco Editor)     │
│ ├── Living Graph Engine: OffscreenCanvas + Web Worker (60 FPS Locked)   │
│ ├── Big Data Optimization: $state.raw + Lazy-Load Chunk Virtualization  │
│ ├── Interactive SSH / HTTPS Credential Prompt Modal                     │
│ ├── Submodule Explorer & Git LFS Asset Manager Panel                    │
│ ├── Ghost Preview Overlay & Drag-and-Drop Interaction Controller        │
│ ├── 3-Way Merge Conflict Visual Resolver (4-Pane Split View)            │
│ ├── Interactive Diff Viewer (Side-by-Side / Unified / Line Staging)     │
│ ├── Visual Bisect Wizard & Branch Hygiene Radar Panel                   │
│ └── Safe Recycle Bin (Trash Inspector) Panel                            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Tauri v2 IPC (Scoped Capabilities)
┌────────────────────────────────────┴────────────────────────────────────┐
│ BACKEND CORE (Rust)                                                     │
│ ├── Git Engine Core: `git2-rs` & Credential Callbacks                   │
│ ├── Monorepo Chunked Revwalk & Incremental Topological Lane Router      │
│ ├── Submodule Inspector & LFS Pointer/Lock Processor                    │
│ ├── Multi-threaded Lane Assignment & Routing Engine (`rayon`)           │
│ ├── Dry-run In-Memory Simulation Engine (Ghost Preview & Conflict Test) │
│ ├── Safe Discard Engine (SQLite `rusqlite` 48h Cache & Auto Eviction)   │
│ ├── Reflog Time-Travel Undo Engine (`Ctrl + Z` / `Ctrl + Shift + Z`)    │
│ ├── Realtime Debounced File System Watcher (`notify`)                   │
│ └── Local AI Service (Conventional Commit Generator & Conflict Advisor) │
└─────────────────────────────────────────────────────────────────────────┘
```