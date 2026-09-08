<div align="center">

# 📚 FlowGit Documentation Hub
### Trung Tâm Tài Liệu Toàn Diện Dự Án FlowGit

> **Edition:** 2026 Next-Gen State-of-the-Art Edition  
> **Architecture:** Tauri v2 (Rust) + Svelte 5 (Runes) + Tailwind CSS v4 + Bits UI / Monaco Editor  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 📌 Executive Summary

**FlowGit** (Next-Gen Git Client) is a premier cross-platform Git client engineered around three core pillars:
> **"Visual First – Zero Terminal Friction – No-Fear Git"**

Unlike conventional Git tools that merely wrap terminal commands or freeze on enterprise-scale repositories, FlowGit transforms complex workflows (Interactive Rebase, 3-Way Conflict Resolution, Bisect, Worktrees, GitHub PR Reviews, Stacked Commits, LFS, and Submodules) into fluid drag-and-drop interactions. Every action is fortified by a **48-Hour Safe Discard Trash**, **Time-Travel Undo (`Ctrl + Z`)**, and an **OffscreenCanvas Web Worker** commit graph engine locked at 60 FPS.

---

## 📚 Documentation Sitemap

The FlowGit documentation suite covers every architectural layer, feature set, and real-world operational guide:

```
docs/
├── README.md                           # Documentation Hub & Sitemap (this file)
├── main.md                             # Technical Specifications & UX Philosophy
│
├── architecture/                       # ARCHITECTURE & SYSTEM INTERNALS
│   ├── overview.md                     # Architecture: Tauri v2 + Svelte 5 + Rust git2-rs
│   ├── offscreen-canvas-graph.md       # Graph Engine: OffscreenCanvas Worker & Lane Compaction
│   ├── safety-engine.md                # Safety Core: 48h Safe Discard (SQLite) & Time Machine
│   └── ipc-api-reference.md            # IPC API: 70+ Tauri v2 Commands & Data Types
│
├── features/                           # IN-DEPTH FEATURE SPECIFICATIONS
│   ├── commit-graph-and-dag.md         # Living Commit Graph, DAG Mini-Map, Ghost Preview
│   ├── working-tree-and-diff.md        # Working Tree, Split/Unified Diff, Hunk/Line Staging
│   ├── branches-and-remotes.md         # Branches, Multi-Remotes, Smart Sync, Pruning
│   ├── rebase-and-history-ops.md       # Interactive Rebase Timeline, Drag-and-Drop, Squash
│   ├── conflict-and-bisect.md          # 4-Pane 3-Way Conflict Resolver & Visual Bisect Wizard
│   ├── github-and-pull-requests.md     # GitHub Workspace: PR Reviewer, Checks, Publish Repo
│   ├── repo-explorer-and-file-tools.md # Tree Explorer, 2-Commit Comparison, Blame, History Nuker
│   ├── stacked-commits-and-hotfix.md   # Stacked Commits Reordering & 1-Click Quick Hotfix
│   ├── advanced-tools.md               # Git Worktrees, Git LFS Manager & Submodules Hub
│   ├── auth-and-identity.md            # OAuth Device Flow, PAT, Identity Switcher
│   ├── edge-cases-and-guards.md        # Index Lock Resolver, Windows File Locks, Heavy Files
│   ├── onboarding-and-playbook.md      # In-App User Guide (F1), Git Playbook & Pre-Commit Guard
│   ├── repo-insights-and-statistics.md # Repository Pulse & Insights Studio: 52-Week Heatmap & Hotspots
│   ├── patch-file-manager.md           # Patch File Manager: Format-Patch Export & Dry-Run Import
│   ├── remote-providers-and-signing.md # Multi-Cloud Remote Adapters (GitLab/Bitbucket) & Commit Signing
│   └── ai-assistant.md                 # Local AI Assistant: Conventional Commits & Conflict Solver
│
├── playbook/                           # PRACTICAL PLAYBOOK
│   └── real-world-recipes.md           # Emergency rescues & battle-tested team workflows
│
└── guides/                             # DEVELOPER & USER GUIDES
    ├── user-manual.md                  # Comprehensive User Manual & Keyboard Shortcuts Cheat Sheet
    ├── development.md                  # Environment Setup, Local Build & Packaging
    └── version-management.md           # Version Management & Release Bumping
```

---

## ⚡ Comparison: Traditional CLI vs FlowGit GUI

| Git Workflow | Traditional Terminal CLI | Visual FlowGit Experience |
| :--- | :--- | :--- |
| **Sync branch with remote** | `git fetch origin`<br>`git checkout main`<br>`git pull`<br>`git checkout feat`<br>`git rebase main` | **1-Click "Smart Sync"**: Fetches and rebases in the background without checking out, displaying `↑ 2 ↓ 5` sync badges. |
| **Review GitHub PR** | Open browser tabs or run CLI `gh pr checkout` | **Integrated PR Reviewer**: Browse PRs, review Monaco diffs, post comments, inspect CI/CD checks, and merge in 1 click. |
| **Squash multiple commits** | `git rebase -i HEAD~N`<br>Edit lines in Vim to `squash`... | **Select nodes ➔ Press `S`**: Auto-combines commit messages into an editable modal, squashing in under 1 second. |
| **Interactive Rebase** | Run `git rebase -i <base>` in terminal | **Interactive Rebase Modal**: Visual timeline with drag-and-drop reordering and intuitive buttons (`Pick`, `Reword`, `Drop`, `Squash`, `Fixup`). |
| **Reorder unpushed commits** | Complex `git rebase -i @{u}` commands | **Stacked Commits Flow**: Drag-and-drop to reorder or click Up/Down arrows and save safely. |
| **Cherry-pick commit** | Find SHA in `git log`, `git checkout target`, `git cherry-pick <SHA>` | **Drag commit node** directly onto target branch tip with instant Ghost Preview simulation. |
| **Stage hunk or single line** | `git add -p` answering terminal prompts `y/n/s/e` | **Click line/hunk in Monaco Diff** ➔ Press `Space` or click "Stage Hunk/Line". |
| **Resolve merge conflicts** | Manually edit raw conflict markers `<<<<<<<`, `=======`, `>>>>>>>` | **4-Pane Conflict Resolver**: Ours, Base, Theirs, and Result with 1-click hunk adoption buttons. |
| **Locate regression bug (Bisect)** | Repeatedly run `git bisect start`, `git bisect bad`, `git bisect good` | **Visual Bisect Wizard**: Automatically divides graph, guiding step-by-step testing with "Pass" / "Fail" buttons. |
| **Browse file tree at past commit** | `git checkout <sha>` polluting working tree | **Repository Explorer**: Browse file tree at any historical commit without checkout, backed by Monaco Editor. |
| **Compare arbitrary commits/branches** | Terminal command `git diff <commitA>..<commitB>` | **Comparison Viewer**: Visual file change list with Split/Unified Monaco Diff inspection. |
| **Nuke sensitive files (.env)** | Dangerous `git filter-branch` or external BFG tool | **History Nuker (Nuke File)**: 1-Click recursive scan to permanently purge credentials and sensitive files from entire history. |
| **Urgent bug fix (Hotfix)** | `git stash`, switch branch, fix, return, `git stash pop` conflict | **Quick Hotfix / Git Worktrees**: Spawn isolated parallel working directories without touching ongoing uncommitted work. |
| **Accidental discard of code** | Irreversible permanent data loss | **48-Hour Safe Discard Engine**: Open **Trash Inspector** and click "Restore" to recover 100% of discarded changes. |
| **Erroneous operation (bad Reset/Rebase)** | Complex manual inspection of `git reflog` | **Press `Ctrl + Z`**: Instant time-travel rollback of branch state backed by SQLite Action Log. |
| **Stuck `.git/index.lock` file** | Find process PID, run `rm -f .git/index.lock` | **Git Playbook Modal**: 1-Click diagnostic to safely terminate dangling processes and clear stale lock files. |

---

## 🏆 Technology Stack

### Frontend:
- **Framework:** Svelte 5 SPA (100% Runes: `$state`, `$state.raw`, `$derived`, `$effect`, `$props`).
- **Reactive State Management:** Class-based Stores (`RepoState`, `WorkingTreeState`, `RemoteState`, `GitSafetyState`, `ThemeState`, `ToastState`, `LocaleState`).
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`, CSS variables, Dark/Light Mode).
- **UI Primitives:** Bits UI, Lucide Svelte, HTML5 Canvas 2D API.
- **Code & Diff Editor:** Monaco Editor & Monaco Diff Editor (Full Language Syntax Highlighting).
- **Concurrency & Rendering:** Web Worker + `OffscreenCanvas` completely isolating graph drawing from UI main thread (60 FPS Locked).
- **GitHub Integration:** Zero-dependency REST API Client (`src/lib/api/githubApi.ts`).

### Backend:
- **Framework:** Tauri v2 (Capability Scoped Permissions, 70+ IPC commands).
- **Core Git Engine:** `git2` (libgit2 C bindings with zero CLI overhead).
- **Multithreading:** `rayon` (parallel multi-core lane allocation and topological routing).
- **Async Runtime:** `tokio` (asynchronous I/O and network operations).
- **File System Watcher:** `notify` (realtime debounced file change monitoring).
- **Local Database:** `rusqlite` (SQLite storage for 48h Safe Discard snapshots, Action Undo log, Account credentials).
- **Local AI:** HTTP client interfacing with Ollama/Local LLM endpoints for Conventional Commits and conflict explanation.

---

## 🔗 Documentation Index
- 📄 [main.md](./main.md): Master technical specifications and overall UI/UX philosophy.
- 🏗️ [architecture/overview.md](./architecture/overview.md): System architecture and data flow.
- 🎨 [architecture/offscreen-canvas-graph.md](./architecture/offscreen-canvas-graph.md): OffscreenCanvas Worker 60 FPS & Lane Compaction.
- 🔌 [architecture/ipc-api-reference.md](./architecture/ipc-api-reference.md): Complete index of 70+ Tauri v2 IPC Commands.
- 🛡️ [architecture/safety-engine.md](./architecture/safety-engine.md): 48-Hour Safe Discard & `Ctrl+Z` Time-Travel engine.
- 📊 [features/commit-graph-and-dag.md](./features/commit-graph-and-dag.md): Living Commit Graph, DAG Mini-Map, Graph Density, Pinned Branches ⭐ & Branch Visibility 👁️.
- 🔍 [features/working-tree-and-diff.md](./features/working-tree-and-diff.md): Working Tree, Monaco Diff & Line Staging.
- 🌿 [features/branches-and-remotes.md](./features/branches-and-remotes.md): Branches, Multi-Remotes, Smart Sync, Realtime Upstream Tracking & Branch Cleanup.
- 🔀 [features/rebase-and-history-ops.md](./features/rebase-and-history-ops.md): Visual Interactive Rebase Studio (Drag & Drop, Dry-Run Simulation), Squash.
- ⚔️ [features/conflict-and-bisect.md](./features/conflict-and-bisect.md): 4-Pane Conflict Resolver & Visual Bisect Wizard.
- 🐙 [features/github-and-pull-requests.md](./features/github-and-pull-requests.md): GitHub PR Hub, Reviewer, CI Checks & Publish Repo.
- 📂 [features/repo-explorer-and-file-tools.md](./features/repo-explorer-and-file-tools.md): Repository Explorer, Blame, Comparison, History Nuker, .gitignore Manager & Repo Insights.
- 🥞 [features/stacked-commits-and-hotfix.md](./features/stacked-commits-and-hotfix.md): Stacked Commits & Quick Hotfix Workflow.
- 🌲 [features/advanced-tools.md](./features/advanced-tools.md): Git Worktrees, Git LFS, Submodules Hub & Git Hooks Manager.
- 🔑 [features/auth-and-identity.md](./features/auth-and-identity.md): GitHub OAuth Device Flow, PAT, Identity Switcher & Repository Account Binding.
- 🚨 [features/edge-cases-and-guards.md](./features/edge-cases-and-guards.md): Index Lock, Heavy Files & Windows File Locks.
- 📖 [features/onboarding-and-playbook.md](./features/onboarding-and-playbook.md): Interactive User Guide (F1), Git Playbook & Pre-Commit Guard.
- 🤖 [features/ai-assistant.md](./features/ai-assistant.md): Local AI Assistant for commit messages and conflict diagnosis.
- 🚑 [playbook/real-world-recipes.md](./playbook/real-world-recipes.md): Emergency rescue scenarios & team best practices.
- ⌨️ [guides/user-manual.md](./guides/user-manual.md): User manual & comprehensive keyboard shortcut cheat sheet.
- 🛠️ [guides/development.md](./guides/development.md): Environment setup, building, and packaging guide.
- 🏷️ [guides/version-management.md](./guides/version-management.md): Single source of truth versioning guide.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 📌 GIỚI THIỆU TỔNG QUAN (EXECUTIVE SUMMARY)

**FlowGit** (Next-Gen Git Client) là ứng dụng quản lý mã nguồn Git cao cấp, đa nền tảng, được xây dựng với mục tiêu:
> **"Visual First – Zero Terminal Friction – No-Fear Git"**  
> *(Ưu tiên trực quan – Triệt tiêu gánh nặng dòng lệnh – An toàn tuyệt đối không sợ mất mã nguồn)*

Khác với các công cụ Git truyền thống thường chỉ là lớp vỏ bọc thô sơ của dòng lệnh hoặc gây giật lag khi mở dự án lớn, FlowGit biến các thao tác phức tạp (Interactive Rebase, 3-Way Conflict, Bisect, Worktrees, GitHub PR Review, Stacked Commits, LFS, Submodules) thành trải nghiệm kéo-thả và tương tác 1-chạm trực quan, được bảo vệ bằng lớp an toàn **Safe Discard 48h**, **Time-Travel Undo (`Ctrl + Z`)**, và đồ thị động học **OffscreenCanvas Web Worker khóa cứng 60 FPS**.

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
│   └── ipc-api-reference.md            # Danh mục 70+ Tauri v2 IPC Commands & Data Types
│
├── features/                           # TÍNH NĂNG CHI TIẾT
│   ├── commit-graph-and-dag.md         # Living Commit Graph, DAG Mini-Map, Focus View, Ghost Preview
│   ├── working-tree-and-diff.md        # Working Tree, Split/Unified Diff, Staging Hunk/Line, Monaco Diff Editor
│   ├── branches-and-remotes.md         # Nhánh, Multi-Remotes, Smart Sync, Tags, Clean Merged Branches
│   ├── rebase-and-history-ops.md       # Interactive Rebase Timeline, Drag-and-Drop, Squash, Revert, Reset
│   ├── conflict-and-bisect.md          # 3-Way Merge Conflict Resolver (4-Pane) & Visual Bisect Wizard
│   ├── github-and-pull-requests.md     # GitHub Workspace: PR Reviewer, Create PR, Recent Push Banner, Publish Repo
│   ├── repo-explorer-and-file-tools.md # Repository File Tree Explorer, 2-Commit Comparison, Blame, History Nuker
│   ├── stacked-commits-and-hotfix.md   # Chuỗi Stacked Commits, Kéo thả đổi thứ tự commit & Quick Hotfix 1-chạm
│   ├── advanced-tools.md               # Git Worktrees, Git LFS Manager & Submodules Hub
│   ├── auth-and-identity.md            # GitHub OAuth Device Flow, PAT, Multi-Account & Git Identity Switcher
│   ├── edge-cases-and-guards.md        # Index Lock Resolver, Windows File Locks, Heavy Files & Detached HEAD
│   ├── onboarding-and-playbook.md      # Interactive In-App User Guide (F1), Git Playbook & Pre-Commit Guard
│   ├── repo-insights-and-statistics.md # Studio Phân Tích Nhịp Độ Dự Án: Heatmap 52 Tuần & Điểm Nóng Mã Nguồn
│   ├── patch-file-manager.md           # Trình Quản Lý & Áp Dụng Tệp Patch Ngoại Vi
│   ├── remote-providers-and-signing.md # Tích Hợp Đa Nền Tảng (GitHub, GitLab, Bitbucket) & Ký Commit Bảo Mật
│   └── ai-assistant.md                 # Trợ lý AI Cục bộ (Ollama/Local LLM): Conventional Commits & Conflict Solver
│
├── playbook/                           # SỔ TAY THỰC CHIẾN
│   └── real-world-recipes.md           # Các kịch bản cứu hộ khẩn cấp & quy trình làm việc chuẩn trong team
│
└── guides/                             # HƯỚNG DẪN DÀNH CHO DEV & USER
    ├── user-manual.md                  # Hướng dẫn sử dụng & Bảng tra cứu phím tắt toàn năng
    ├── development.md                  # Hướng dẫn thiết lập môi trường, Build và Đóng gói
    └── version-management.md           # Quản lý phiên bản & Quy trình bump version
```

---

## ⚡ BẢNG ĐỐI CHIẾU: THAO TÁC TERMINAL VS FLOWGIT GUI

| Nghiệp vụ Git | Dòng lệnh truyền thống (CLI) | Trải nghiệm trực quan trên FlowGit |
| :--- | :--- | :--- |
| **Đồng bộ nhánh với remote** | `git fetch origin`<br>`git checkout main`<br>`git pull`<br>`git checkout feat`<br>`git rebase main` | **1 Click "Smart Sync"**: Tự động fetch và rebase ngầm không cần chuyển checkout, hiển thị badge `↑ 2 ↓ 5`. |
| **Review Pull Request GitHub** | Mở trình duyệt, chuyển qua lại các tab hoặc dùng CLI `gh pr checkout` | **Pull Request Reviewer tích hợp**: Xem danh sách PR, diff Monaco, bình luận, kiểm tra CI/CD và merge 1-chạm. |
| **Gộp nhiều commits thành 1 (Squash)** | `git rebase -i HEAD~N`<br>Mở Vim sửa các dòng thành `squash`... | **Bôi đen các node ➔ Phím `S`**: Hộp thoại tự động tổng hợp danh sách message, gộp trong 1 giây. |
| **Interactive Rebase** | `git rebase -i <base>` gõ lệnh dạng văn bản | **Interactive Rebase Modal**: Timeline kéo thả đổi thứ tự commit, nút bấm trực quan `Pick`, `Reword`, `Drop`, `Squash`, `Fixup`. |
| **Sắp xếp chuỗi Commit chưa push** | `git rebase -i @{u}` phức tạp | **Stacked Commits Flow**: Kéo thả hoán đổi vị trí commit hoặc bấm mũi tên Lên/Xuống và lưu an toàn. |
| **Cherry-pick commit** | `git log` tìm SHA, `git checkout target`, `git cherry-pick <SHA>` | **Kéo thả node commit** thả thẳng vào đỉnh nhánh đích với Ghost Preview mô phỏng trước. |
| **Stage từng khối code (Hunk/Line)** | `git add -p` trả lời từng prompt terminal `y/n/s/e` | **Click dòng/khối trên Monaco Diff** ➔ Phím `Space` hoặc bấm "Stage Hunk/Line". |
| **Giải quyết xung đột (Conflict)** | Mở file có dấu `<<<<<<<`, `=======`, `>>>>>>>` sửa tay | **Conflict Resolver 4 Khung hình**: Ours, Base, Theirs, Result với nút nhận 1-click từng khối. |
| **Tìm commit gây lỗi (Bisect)** | `git bisect start`, `git bisect bad`, `git bisect good` gõ lặp lại | **Visual Bisect Wizard**: Tự động chia đôi đồ thị, dẫn dắt test từng node với 2 nút "Pass" / "Fail". |
| **Duyệt cây file tại commit cũ** | `git checkout <sha>` làm bẩn working tree | **Repository Explorer**: Duyệt cây file tại bất kỳ commit nào mà không cần checkout, tích hợp Monaco Editor. |
| **So sánh 2 commit/nhánh bất kỳ** | `git diff <commitA>..<commitB>` trên terminal | **Comparison Viewer**: Xem danh sách file thay đổi và Monaco Diff Split/Unified trực quan. |
| **Xóa vĩnh viễn file nhạy cảm (.env)** | Gõ lệnh nguy hiểm `git filter-branch` hoặc BFG | **History Nuker (Nuke File)**: 1 Click quét đệ quy và tẩy xóa vĩnh viễn file nhạy cảm khỏi toàn bộ lịch sử. |
| **Chữa cháy bug gấp (Hotfix)** | `git stash`, chuyển nhánh, sửa bug, quay lại `git stash pop` dính conflict | **Quick Hotfix / Git Worktrees**: Mở thư mục làm việc song song để sửa lỗi độc lập, không chạm vào code dở. |
| **Lỡ tay Discard mất code** | Mất vĩnh viễn không thể cứu | **Safe Discard Engine 48h**: Mở **Trash Inspector** bấm "Restore" phục hồi 100% code. |
| **Thao tác sai lầm (Reset/Rebase nhầm)** | Tra cứu `git reflog` thủ công phức tạp | **Bấm `Ctrl + Z`**: Hoàn tác tức thì trạng thái nhánh về trước đó nhờ SQLite Action Log. |
| **Kẹt file `.git/index.lock`** | Tìm PID tiến trình, gõ `rm -f .git/index.lock` | **Git Playbook Modal**: 1 Click kiểm tra và xóa file khóa giải phóng repository an toàn. |

---

## 🏆 CÔNG NGHỆ ÁP DỤNG (TECH STACK)

### Frontend:
- **Framework:** Svelte 5 SPA (100% Runes: `$state`, `$state.raw`, `$derived`, `$effect`, `$props`).
- **Reactive State Management:** Class-based Stores (`RepoState`, `WorkingTreeState`, `RemoteState`, `GitSafetyState`, `ThemeState`, `ToastState`, `LocaleState`).
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`, CSS variables, Dark/Light Mode).
- **UI Primitives:** Bits UI, Lucide Svelte, Canvas 2D API.
- **Code Editor:** Monaco Editor & Monaco Diff Editor (Full Language Syntax Highlight).
- **Concurrency & Rendering:** Web Worker + `OffscreenCanvas` cách ly hoàn toàn việc render đồ thị khỏi UI main-thread (60 FPS Locked).
- **GitHub Integration:** Octokit-less REST API Client (`src/lib/api/githubApi.ts`).

### Backend:
- **Framework:** Tauri v2 (Capability Scoped Permissions, 70+ IPC commands).
- **Core Git:** `git2` (libgit2 C bindings an toàn và tối ưu bộ nhớ).
- **Đa luồng:** `rayon` (tính toán topological lane và graph routing đa nhân CPU).
- **Async Runtime:** `tokio` (xử lý bất đồng bộ các tác vụ I/O nặng).
- **File System Watcher:** `notify` (giám sát thay đổi file debounce realtime).
- **Cơ sở dữ liệu cục bộ:** `rusqlite` (lưu trữ snapshot Safe Discard 48h, Action Undo Log, Account Auth).
- **Local AI:** HTTP Client kết nối Ollama/Local LLM API cho Conventional Commits.

---

## 🔗 DANH MỤC LIÊN KẾT ĐẾN CÁC TÀI LIỆU CHUYÊN SÂU
- 📄 [main.md](./main.md): Toàn văn đặc tả kỹ thuật và triết lý thiết kế UI/UX tổng thể.
- 🏗️ [architecture/overview.md](./architecture/overview.md): Kiến trúc tổng thể và luồng dữ liệu hệ thống.
- 🎨 [architecture/offscreen-canvas-graph.md](./architecture/offscreen-canvas-graph.md): Đồ thị động học OffscreenCanvas Worker 60 FPS & Lane Compaction.
- 🔌 [architecture/ipc-api-reference.md](./architecture/ipc-api-reference.md): Bảng tra cứu 70+ Tauri v2 IPC Commands.
- 🛡️ [architecture/safety-engine.md](./architecture/safety-engine.md): Cơ chế Safe Discard & Time-Travel `Ctrl+Z`.
- 📊 [features/commit-graph-and-dag.md](./features/commit-graph-and-dag.md): Đồ thị Living Graph, DAG Mini-Map, Mật độ đồ thị, Ghim nhánh ⭐ & Ẩn/Hiện nhánh 👁️.
- 🔍 [features/working-tree-and-diff.md](./features/working-tree-and-diff.md): Working Tree, Monaco Diff & Staging từng dòng.
- 🌿 [features/branches-and-remotes.md](./features/branches-and-remotes.md): Nhánh, Multi-Remotes, Smart Sync, Theo dõi Upstream Thời gian thực & Dọn dẹp nhánh.
- 🔀 [features/rebase-and-history-ops.md](./features/rebase-and-history-ops.md): Visual Interactive Rebase Studio (Kéo-Thả, Mô phỏng Dry-Run), Squash.
- ⚔️ [features/conflict-and-bisect.md](./features/conflict-and-bisect.md): Bộ giải quyết Conflict 4-Pane & Bisect Wizard.
- 🐙 [features/github-and-pull-requests.md](./features/github-and-pull-requests.md): GitHub PR Hub, Reviewer, Checks & Publish Repo.
- 📂 [features/repo-explorer-and-file-tools.md](./features/repo-explorer-and-file-tools.md): Repository Explorer, Blame, Comparison, History Nuker, Quản lý .gitignore & Repo Insights.
- 🥞 [features/stacked-commits-and-hotfix.md](./features/stacked-commits-and-hotfix.md): Chuỗi Stacked Commits & Quy trình Quick Hotfix.
- 🌲 [features/advanced-tools.md](./features/advanced-tools.md): Git Worktrees, Git LFS, Submodules Hub & Quản lý Git Hooks.
- 🔑 [features/auth-and-identity.md](./features/auth-and-identity.md): GitHub OAuth Device Flow, PAT, Identity Switcher & Liên kết tài khoản theo Repository.
- 🚨 [features/edge-cases-and-guards.md](./features/edge-cases-and-guards.md): Index Lock, Heavy Files & Windows File Locks.
- 📖 [features/onboarding-and-playbook.md](./features/onboarding-and-playbook.md): Interactive User Guide (F1), Git Playbook & Pre-Commit Guard.
- 🤖 [features/ai-assistant.md](./features/ai-assistant.md): Trợ lý AI Cục bộ sinh Commit Message & giải thích Conflict.
- 🚑 [playbook/real-world-recipes.md](./playbook/real-world-recipes.md): Sổ tay giải cứu các tình huống thực chiến.
- ⌨️ [guides/user-manual.md](./guides/user-manual.md): Sổ tay người dùng và phím tắt toàn tập.
- 🛠️ [guides/development.md](./guides/development.md): Hướng dẫn thiết lập môi trường, Build và Đóng gói.
- 🏷️ [guides/version-management.md](./guides/version-management.md): Quản lý phiên bản & Quy trình bump version.
