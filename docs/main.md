# TÀI LIỆU ĐẶC TẢ KỸ THUẬT & THIẾT KẾ TRẢI NGHIỆM (UI/UX SPECIFICATION)
# DỰ ÁN: NEXT-GEN TAURI V2 + RUST GIT CLIENT (FlowGit / RustGit GUI)
> **Phiên bản chuẩn công nghệ 2026 (State-of-the-Art Edition)**

---

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

### 📦 6. Git Submodules & Large File Storage (LFS) Management
- **Git Submodules Hub:**
  - Nhận diện tự động các submodules từ `.gitmodules` và `git2::Repository::submodules`.
  - Hiển thị danh sách submodules trên Sidebar/Panel: tên, đường dẫn, URL remote, trạng thái commit hiện tại (HEAD) so với commit được ghi nhận trong superproject (Index/WorkingTree), cảnh báo lệch phiên bản.
  - Hỗ trợ thao tác 1-click: `Submodule Update (--init --recursive)`, `Submodule Sync`, `Checkout Submodule Commit`.
- **Git LFS Engine:**
  - Nhận diện các tệp lớn được quản lý bởi LFS (dựa trên `.gitattributes` và `filter=lfs`).
  - Phân biệt rõ ràng giữa tệp con trỏ (LFS pointer text 130 bytes) và tệp nhị phân đã tải về máy (LFS binary payload).
  - Quản lý LFS Locks (`git lfs locks`) giúp lập trình viên game/đồ họa khóa file tránh xung đột tệp nhị phân không thể merge.
  - Cung cấp nút 1-click: `Fetch / Pull LFS Objects` cho toàn bộ hoặc từng tệp được chọn.

### 🔑 7. Interactive SSH & HTTPS Credential Modal (Xác thực thông minh)
- **Tự động bắt lỗi xác thực (Auth Interception):**
  - Khi thực hiện `Push`, `Pull`, `Fetch`, `Sync` gặp lỗi SSH Passphrase (ví dụ: `Enter passphrase for key ...`, `Permission denied (publickey)`) hoặc lỗi HTTPS `401 Unauthorized`.
  - Thay vì báo lỗi chung chung và dừng lại, ứng dụng hiển thị hộp thoại popup **"SSH / Remote Credentials Required"**.
- **Tính năng bảo mật:**
  - Nhập SSH Key Passphrase hoặc Personal Access Token (PAT) / Password trực tiếp.
  - Tùy chọn lưu tạm trong phiên làm việc (In-memory Session Cache) được mã hóa, không lưu mật khẩu trần ra ổ đĩa.
  - Tự động thử lại thao tác Git vừa bị gián đoạn ngay sau khi xác thực thành công.

### ⚡ 8. Monorepo Infinite Virtualization & Lazy-Loading (Phân trang > 100,000 Commits)
- **Kiến trúc Tải phân đoạn (Chunked Streaming History):**
  - Hỗ trợ API `get_paginated_commit_history(path, skip, limit)` từ Rust backend.
  - Khởi tạo ban đầu tải nhanh 500 commit đầu tiên để người dùng tương tác ngay trong < 50ms.
  - Khi người dùng cuộn (scroll) gần tới đáy danh sách, hệ thống tự động tải lười (lazy-load) thêm 500 - 1,000 commits tiếp theo.
- **Topological Lane Incremental Compaction:**
  - Duy trì trạng thái các lane đang mở (active lanes) để nối tiếp đồ thị liền mạch giữa các trang mà không bị đứt gãy đường cong Bezier.
  - Sử dụng `$state.raw` trong Svelte 5 để duy trì mảng commit khổng lồ mà không tạo proxy, kiểm soát RAM dưới 60MB cho 100,000 commits.

---

## 6. KIẾN TRÚC KỸ THUẬT TIÊN TIẾN 2026 (2026 SYSTEM ARCHITECTURE)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (Svelte 5 SPA + Tailwind CSS v4 + Bits UI / shadcn-svelte)     │
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

## 7. MỤC LỤC TÀI LIỆU CHUYÊN SÂU (DETAILED DOCUMENTATION SITEMAP)

Hệ thống tài liệu của FlowGit đã được chuẩn hóa và phân tách thành các chuyên đề chi tiết:
- 📖 **Tổng quan & Mục lục:** [`docs/README.md`](./README.md)
- 🏗️ **Kiến trúc hệ thống:** [`docs/architecture/overview.md`](./architecture/overview.md)
- 🔌 **Tra cứu 65+ IPC Commands:** [`docs/architecture/ipc-api-reference.md`](./architecture/ipc-api-reference.md)
- 🛡️ **Động cơ No-Fear Git (Safe Discard & Undo):** [`docs/architecture/safety-engine.md`](./architecture/safety-engine.md)
- 📊 **Living Graph 60 FPS & DAG Mini-Map:** [`docs/features/commit-graph-and-dag.md`](./features/commit-graph-and-dag.md)
- 🌲 **Working Tree, Diff & Staging:** [`docs/features/working-tree-and-diff.md`](./features/working-tree-and-diff.md)
- 🌿 **Nhánh, Đa Remotes & Smart Sync:** [`docs/features/branches-and-remotes.md`](./features/branches-and-remotes.md)
- 🔀 **Interactive Rebase & Squash:** [`docs/features/rebase-and-history-ops.md`](./features/rebase-and-history-ops.md)
- ⚔️ **Conflict Resolver & Bisect Wizard:** [`docs/features/conflict-and-bisect.md`](./features/conflict-and-bisect.md)
- 🏢 **Worktrees, LFS & Submodules:** [`docs/features/advanced-tools.md`](./features/advanced-tools.md)
- 🔐 **Xác thực GitHub OAuth, SSH & Identity:** [`docs/features/auth-and-identity.md`](./features/auth-and-identity.md)
- 🚨 **Tình huống biên & Bộ cảnh báo an toàn:** [`docs/features/edge-cases-and-guards.md`](./features/edge-cases-and-guards.md)
- 🤖 **Trợ lý AI Cục bộ (Ollama / Local LLM):** [`docs/features/ai-assistant.md`](./features/ai-assistant.md)
- 🆘 **FlowGit Playbook (Kịch bản giải cứu thực chiến):** [`docs/playbook/real-world-recipes.md`](./playbook/real-world-recipes.md)
- ⌨️ **Sổ tay người dùng & Phím tắt:** [`docs/guides/user-manual.md`](./guides/user-manual.md)
- 🛠️ **Hướng dẫn phát triển & Đóng gói:** [`docs/guides/development.md`](./guides/development.md)

---

## 8. LỘ TRÌNH TRIỂN KHAI THEO GIAI ĐOẠN (IMPLEMENTATION ROADMAP)

### 🚀 Phase 1: Foundation & High-Performance Visual Graph
- [x] Khởi tạo dự án **Tauri v2 + Rust Backend + Svelte 5 SPA + Tailwind CSS v4 + Bits UI**.
- [x] Cài đặt các crate Rust cốt lõi: `git2`, `tokio`, `rayon`, `notify`, `rusqlite`, `serde`.
- [x] Tích hợp backend: Đọc commit history, branches, tags, HEAD và tính toán Lane Assignment đa luồng.
- [x] Dựng **OffscreenCanvas Web Worker Living Commit Graph** mượt mà với Virtual Scrolling và ahead/behind badges (60 FPS).

### 🛠️ Phase 2: Working Tree, Interactive Diff & Safe Discard
- [x] Realtime Debounced File Watcher tự động cập nhật thay đổi file trong < 80ms.
- [x] Diff Viewer trực quan (Side-by-Side, Unified, chọn từng dòng / hunk để stage bằng phím `Space`).
- [x] Xây dựng **Safe Discard Engine** (SQLite lưu trữ uncommitted code 48h kèm Trash Inspector).
- [x] Commit Box hỗ trợ gợi ý Conventional Commits và Stash Manager.

### 🌿 Phase 3: Drag & Drop Workflow, Ghost Preview & Worktree
- [x] Lập trình thao tác Kéo - Thả (Drag & Drop) commit/nhánh trên Canvas để Rebase, Squash, Cherry-pick.
- [x] Xây dựng **Ghost Preview** (vẽ nét đứt mô phỏng và chạy Dry-run in-memory kiểm tra conflict).
- [x] Tích hợp **1-Click Smart Sync with Upstream**.
- [x] Tích hợp **Git Worktree Manager** trực quan và **Offline PR Preview** (So sánh 2 điểm).

### ✨ Phase 4: Visual Bisect, 3-Way Conflict Resolver & Time Machine
- [x] Bộ giải quyết xung đột **3-Way Merge Conflict Resolver** trực quan 4 khung hình.
- [x] **Visual Git Bisect Wizard** (Truy vết lỗi bằng đồ thị từng bước).
- [x] **Safe-Flight Time Machine (`Ctrl + Z`)**: Hoàn tác qua `git reflog` và SQLite Action Log.
- [x] Command Palette (`Ctrl + K`) và hệ thống phím tắt 1 ký tự.
- [x] Tích hợp Local AI (Ollama / Local LLM) hỗ trợ sinh Commit Message và gợi ý giải quyết Conflict.

### 🏢 Phase 5: Git LFS, Submodules, SSH/HTTPS Auth & Monorepo Scaling (>100k Commits)
- [x] Quản lý **Git Submodules**: Xem danh sách, tình trạng HEAD vs Index, đồng bộ và update đệ quy (`--init --recursive`).
- [x] Hỗ trợ **Git LFS**: Nhận diện LFS attributes, theo dõi LFS file pointers, quản lý LFS Locks và kéo binary payloads.
- [x] **Interactive SSH Passphrase & HTTPS Auth Modal**: Bắt tín hiệu yêu cầu credential khi Push/Pull/Fetch, mở modal nhập passphrase / PAT trực quan.
- [x] **Monorepo Infinite Lazy-Loading Virtualization**: Phân trang commit history (`skip` / `limit`), tải lười khi cuộn đồ thị cho repo > 100,000 commits.

### 💎 Phase 6: Advanced Team Git Operations & Living Playbook (Hoàn thiện 100% Thực chiến)
- [x] **Commit Context Menu (Menu chuột phải trên Đồ thị)**: Tích hợp nhanh tạo nhánh, tạo tag, so sánh, copy SHA, revert và reset.
- [x] **Revert Commit An toàn (`git revert`)**: Tạo commit đảo ngược tức thì mà không viết lại lịch sử, chuẩn mực cho nhánh chung remote/main.
- [x] **Reset HEAD to Commit**: Cung cấp 3 chế độ Soft (giữ Staged), Mixed (giữ Unstaged), Hard (xóa sạch code) kèm bảo hiểm hoàn tác `Ctrl + Z`.
- [x] **Squash Commits (Gộp commit)**: Bôi đen nhiều commit liên tiếp ➔ Phím `S` ➔ Hộp thoại tổng hợp message và gộp trong 1 giây.
- [x] **Quản lý Git Tags**: Tạo Release Tag (Lightweight & Annotated) tại commit bất kỳ, xóa Tag trực tiếp trên Sidebar.
- [x] **Dọn dẹp Nhánh đã Merge (Clean Merged Branches)**: 1-click tự động quét và xóa hàng loạt các nhánh local đã được gộp trọn vẹn vào `main`.
- [x] **FlowGit Playbook & Real-World Recipes (Sổ tay Thực chiến In-App)**: Tích hợp sẵn cẩm nang giải quyết các tình huống thực tế cho team (Rebase, Undo Ctrl+Z, Safe Discard, Worktrees, Bisect, Revert, Squash, v.v.), mở nhanh bằng `F1` hoặc `Ctrl + /`.