# FLOWGIT - TÀI LIỆU TOÀN DIỆN DỰ ÁN (PROJECT DOCUMENTATION HUB)
> **Phiên bản:** 2026 Next-Gen State-of-the-Art Edition  
> **Kiến trúc:** Tauri v2 (Rust) + Svelte 5 (Runes) + Tailwind CSS v4 + Bits UI / Monaco Editor  
> **Cập nhật:** Tháng 09/2026 (Đã hoàn thiện 100% Phase 1 đến Phase 6)

---

## 📌 GIỚI THIỆU TỔNG QUAN (EXECUTIVE SUMMARY)

**FlowGit** (Next-Gen Git Client) là ứng dụng quản lý mã nguồn Git cao cấp, đa nền tảng, được xây dựng với mục tiêu:
> **"Visual First – Zero Terminal Friction – No-Fear Git"**  
> *(Ưu tiên trực quan – Triệt tiêu gánh nặng gõ lệnh dòng lệnh – An toàn tuyệt đối không sợ mất mã nguồn)*

Khác với các công cụ Git truyền thống thường chỉ là lớp vỏ bọc thô sơ của dòng lệnh, FlowGit biến các thao tác phức tạp (Interactive Rebase, 3-Way Conflict, Bisect, Worktrees, Cherry-pick, LFS, Submodules) thành trải nghiệm kéo-thả và tương tác 1-chạm trực quan, được bảo vệ bằng lớp an toàn **Safe Discard 48h** và **Time-Travel Undo (`Ctrl + Z`)**.

---

## 📚 HỆ THỐNG TÀI LIỆU DỰ ÁN (DOCUMENTATION SITEMAP)

Hệ thống tài liệu của FlowGit được chia thành các phân khu chuyên sâu, phản ánh đầy đủ mọi khía cạnh kiến trúc, tính năng và hướng dẫn thực chiến:

```
docs/
├── README.md                           # Trang mục lục trung tâm (file này)
├── main.md                             # Đặc tả kỹ thuật & Triết lý thiết kế UI/UX tổng thể
│
├── architecture/                       # KIẾN TRÚC & HỆ THỐNG
│   ├── overview.md                     # Kiến trúc tổng thể Tauri v2 + Svelte 5 + Rust git2-rs
│   ├── offscreen-canvas-graph.md       # Đồ thị động học OffscreenCanvas Worker 60 FPS & Lane Compaction
│   ├── safety-engine.md                # Động cơ an toàn: Safe Discard 48h (SQLite) & Time Machine
│   └── ipc-api-reference.md            # Danh mục 60+ Tauri IPC Commands & Data Structs
│
├── features/                           # TÍNH NĂNG CHI TIẾT
│   ├── commit-graph-and-dag.md         # Living Commit Graph, DAG Mini-Map, Focus View, Ghost Preview
│   ├── working-tree-and-diff.md        # Working Tree, Split/Unified Diff, Staging Hunk/Line, Monaco Editor
│   ├── branches-and-remotes.md         # Nhánh, Multi-Remotes, Smart Sync, Tags, Clean Merged Branches
│   ├── rebase-and-history-ops.md       # Interactive Rebase Timeline, Drag-and-Drop, Squash, Revert, Reset
│   ├── conflict-and-bisect.md          # 3-Way Merge Conflict Resolver (4-Pane) & Visual Bisect Wizard
│   ├── advanced-tools.md               # Git Worktrees, Git LFS, Submodules Hub, Explorer & Blame
│   ├── auth-and-identity.md            # GitHub OAuth Device Flow, PAT, SSH Key & Git Identity Switcher
│   ├── edge-cases-and-guards.md        # Repo In-Progress Banner, Detached HEAD, Heavy Files, Index Lock
│   └── ai-assistant.md                 # Trợ lý AI Cục bộ (Ollama/Local LLM): Conventional Commits & Conflict
│
├── playbook/                           # SỔ TAY THỰC CHIẾN
│   └── real-world-recipes.md           # Các kịch bản cứu hộ & quy trình làm việc chuẩn trong team
│
└── guides/                             # HƯỚNG DẪN DÀNH CHO DEV & USER
    ├── user-manual.md                  # Hướng dẫn sử dụng & Bảng tra cứu phím tắt toàn năng
    └── development.md                  # Hướng dẫn thiết lập môi trường, Build và Đóng gói
```

---

## ⚡ BẢNG ĐỐI CHIẾU: THAO TÁC TERMINAL VS FLOWGIT GUI

| Nghiệp vụ Git | Dòng lệnh truyền thống (CLI) | Trải nghiệm trực quan trên FlowGit |
| :--- | :--- | :--- |
| **Đồng bộ nhánh với remote** | `git fetch origin`<br>`git checkout main`<br>`git pull`<br>`git checkout feat`<br>`git rebase main` | **1 Click "Smart Sync"**: Tự động fetch và rebase ngầm không cần chuyển checkout, hiển thị badge `↑ 2 ↓ 5`. |
| **Gộp 100 commits thành 1 (Squash)** | `git rebase -i HEAD~100`<br>Mở Vim sửa 99 dòng thành `squash`<br>Xử lý conflict thủ công... | **Bôi đen các node ➔ Phím `S`**: Hộp thoại tự động tổng hợp danh sách message, gộp trong 1 giây. |
| **Interactive Rebase** | `git rebase -i <base>` gõ lệnh dạng văn bản | **Interactive Rebase Modal**: Timeline kéo thả đổi thứ tự commit, nút bấm trực quan `Pick`, `Reword`, `Drop`, `Squash`, `Fixup`. |
| **Cherry-pick commit** | `git log` tìm SHA, `git checkout target`, `git cherry-pick <SHA>` | **Kéo thả node commit** thả thẳng vào đỉnh nhánh đích với Ghost Preview mô phỏng trước. |
| **Stage từng khối code (Hunk/Line)** | `git add -p` trả lời từng prompt terminal `y/n/s/e` | **Click dòng/khối trên Monaco Diff** ➔ Phím `Space` hoặc bấm "Stage Hunk/Line". |
| **Giải quyết xung đột (Conflict)** | Mở file có dấu `<<<<<<<`, `=======`, `>>>>>>>` sửa tay | **Conflict Resolver 4 Khung hình**: Ours, Base, Theirs, Result với nút nhận 1-click từng khối. |
| **Tìm commit gây lỗi (Bisect)** | `git bisect start`, `git bisect bad`, `git bisect good` gõ lặp lại | **Visual Bisect Wizard**: Tự động chia đôi đồ thị, dẫn dắt test từng node với 2 nút "Pass" / "Fail". |
| **Chữa cháy bug gấp (Hotfix)** | `git stash`, chuyển nhánh, sửa bug, quay lại `git stash pop` dính conflict | **Git Worktrees Manager**: Mở thư mục làm việc song song để sửa lỗi độc lập, không chạm vào code dở. |
| **Lỡ tay Discard mất code** | Mất vĩnh viễn không thể cứu | **Safe Discard Engine 48h**: Mở **Trash Inspector** bấm "Restore" phục hồi 100% code. |
| **Thao tác sai lầm (Reset/Rebase nhầm)** | Tra cứu `git reflog` thủ công phức tạp | **Bấm `Ctrl + Z`**: Hoàn tác tức thì trạng thái nhánh về trước đó nhờ SQLite Action Log. |

---

## 🏆 CÔNG NGHỆ ÁP DỤNG (TECH STACK)

### Frontend:
- **Framework:** Svelte 5 SPA (100% Runes: `$state`, `$state.raw`, `$derived`, `$effect`, `$props`).
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`, CSS variables, Dark Mode mặc định).
- **UI Primitives:** Bits UI, Lucide Svelte, Canvas 2D API.
- **Code Editor:** Monaco Editor & Monaco Diff Editor (Full Language Syntax Highlight).
- **Concurrency:** Web Worker + `OffscreenCanvas` cách ly hoàn toàn việc render đồ thị khỏi UI main-thread.

### Backend:
- **Framework:** Tauri v2 (Capability Scoped Permissions, IPC commands).
- **Core Git:** `git2` (libgit2 C bindings an toàn và tối ưu bộ nhớ).
- **Đa luồng:** `rayon` (tính toán topological lane và graph routing đa nhân CPU).
- **Async Runtime:** `tokio` (xử lý bất đồng bộ các tác vụ I/O nặng).
- **File System Watcher:** `notify` (giám sát thay đổi file debounce realtime).
- **Cơ sở dữ liệu cục bộ:** `rusqlite` (lưu trữ snapshot Safe Discard 48h, Action Undo Log, Account Auth).
- **Local AI:** HTTP Client kết nối Ollama/Local LLM API cho Conventional Commits.

---

## 🔗 LIÊN KẾT NHANH ĐẾN CÁC TÀI LIỆU CHÍNH
- 📄 [main.md](./main.md): Toàn văn tài liệu đặc tả kỹ thuật và kế hoạch 6 Phase.
- 🏗️ [architecture/overview.md](./architecture/overview.md): Kiến trúc luồng dữ liệu Backend-Frontend.
- 🔌 [architecture/ipc-api-reference.md](./architecture/ipc-api-reference.md): Bảng tra cứu 60+ Tauri IPC Commands.
- 🛡️ [architecture/safety-engine.md](./architecture/safety-engine.md): Cơ chế Safe Discard & Time-Travel `Ctrl+Z`.
- 📊 [features/commit-graph-and-dag.md](./features/commit-graph-and-dag.md): Đồ thị Living Graph 60 FPS & DAG Mini-Map.
- 🔀 [features/rebase-and-history-ops.md](./features/rebase-and-history-ops.md): Interactive Rebase, Kéo-Thả, Squash.
- ⚔️ [features/conflict-and-bisect.md](./features/conflict-and-bisect.md): Bộ giải quyết Conflict 4-Pane & Bisect Wizard.
- 📖 [playbook/real-world-recipes.md](./playbook/real-world-recipes.md): Sổ tay giải cứu các tình huống thực chiến.
- ⌨️ [guides/user-manual.md](./guides/user-manual.md): Sổ tay người dùng và phím tắt toàn tập.
