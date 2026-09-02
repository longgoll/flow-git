# KIẾN TRÚC TỔNG THỂ HỆ THỐNG FLOWGIT (SYSTEM ARCHITECTURE)
> **Kiến trúc:** Tauri v2 Native Bridge + Svelte 5 Runes SPA + Rust Core Engine  
> **Cập nhật:** Chuẩn công nghệ 2026

---

## 🏗️ 1. SƠ ĐỒ KHỐI TỔNG THỂ (HIGH-LEVEL ARCHITECTURE)

Hệ thống FlowGit được thiết kế theo mô hình tách biệt nghiêm ngặt giữa tầng giao diện hiển thị (Presentation Layer), tầng tính toán đa luồng (Worker Layer) và tầng xử lý nghiệp vụ bản địa (Native Backend Core):

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (Svelte 5 SPA + Tailwind CSS v4 + Bits UI + Monaco Editor)                     │
│                                                                                         │
│  ┌─────────────────────────────────┐   ┌──────────────────────────────────────────────┐ │
│  │ MAIN UI THREAD (DOM Rendering)  │   │ DEDICATED WEB WORKER (OffscreenCanvas)       │ │
│  │ ├── 3-Column Split Layout       │   │ ├── Bezier Curves Spline Rendering (60 FPS) │ │
│  │ ├── Sidebar & Repository Tree   │   │ ├── Multi-Lane Topological Routing           │ │
│  │ ├── Monaco Diff & Code Editors  │◄──┼─ Matrix Coordinate Mapping (Screen <-> Graph)│ │
│  │ ├── Modals & Conflict Resolvers │   │ └── Virtual Viewport Caching                 │ │
│  │ └── Svelte 5 State Stores       │   └──────────────────────────────────────────────┘ │
│  └────────────────┬────────────────┘                                                    │
└───────────────────┼─────────────────────────────────────────────────────────────────────┘
                    │ Tauri v2 IPC Channel (Scoped Capability Permissions, Zero-Copy JSON)
┌───────────────────┴─────────────────────────────────────────────────────────────────────┐
│ BACKEND CORE (Rust Native Engine)                                                       │
│                                                                                         │
│  ┌───────────────────────────────┐  ┌─────────────────────────────────────────────────┐ │
│  │ TAURI IPC DISPATCHER LAYER    │  │ PARALLEL WORKERS & EVENT RUNTIME                │ │
│  │ ├── src/commands/action.rs    │  │ ├── Tokio Async Runtime (Long-running Network)  │ │
│  │ ├── src/commands/diff.rs      │  │ ├── Rayon Multi-thread Pool (Lane Compaction)   │ │
│  │ ├── src/commands/repo.rs      │  │ └── Realtime File Watcher (`notify` crate)      │ │
│  │ └── src/commands/auth.rs      │  └─────────────────────────────────────────────────┘ │
│  └───────────────┬───────────────┘                                                      │
│                  ▼                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ GIT2 CORE ENGINE (`libgit2-rs` Bindings)                                           │ │
│  │ ├── Monorepo Chunked Revwalk (500 commits / chunk, lazy pagination)                │ │
│  │ ├── In-Memory Simulation Engine (Dry-Run Conflict Check via `git2::Index`)         │ │
│  │ ├── Submodules Inspector (`.gitmodules`) & Git LFS Pointer Parser                  │ │
│  │ └── Interactive Rebase Sequencer (`git2::Repository::rebase_init`)                │ │
│  └───────────────────────────────┬────────────────────────────────────────────────────┘ │
│                                  ▼                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│  │ LOCAL PERSISTENCE LAYER (`rusqlite` SQLite 3)                                      │ │
│  │ ├── Safe Discard Trash Snapshots (Automatic 48-Hour TTL Eviction)                  │ │
│  │ ├── Action History & Undo Journal (Reflog Time-Travel Synchronization)            │ │
│  │ └── Secure Account Store (Personal Access Tokens & SSH Metadata)                   │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 2. KIẾN TRÚC FRONTEND (SVELTE 5 RUNES)

### 2.1. Quản lý trạng thái bằng Svelte 5 Runes
Khác với các ứng dụng Svelte 4 trước đây dùng writable stores và cú pháp reactivity cũ (`$:`, `let:`), FlowGit áp dụng **100% Svelte 5 Runes** dạng Class-based Reactive Stores:

1. **`RepoState` (`src/lib/state/repoState.svelte.ts`):**
   - Quản lý danh sách commit, branches, tags, stashes, HEAD pointer và tiến trình phân trang (`hasMoreCommits`, `isLoadingHistory`).
   - Sử dụng **`$state.raw<CommitNode[]>`** để lưu trữ danh sách hàng chục nghìn commits. Bằng cách này, Svelte 5 không tạo Proxy cho từng thuộc tính của commit node, giúp tiết kiệm hơn 80% bộ nhớ RAM và triệt tiêu độ trễ khi duyệt cây.
2. **`WorkingTreeState` (`src/lib/state/workingTreeState.svelte.ts`):**
   - Lưu trữ danh sách file đã thay đổi (`dirtyFiles`), trạng thái staged/unstaged, tiến trình theo dõi file realtime và cấu hình bỏ qua file (`.gitignore`).
3. **`RemoteState` (`src/lib/state/remoteState.svelte.ts`):**
   - Quản lý các Remote URL (`origin`, `upstream`), danh sách tài khoản đã xác thực (GitHub, GitLab), và trạng thái token.
4. **`GitSafetyState` (`src/lib/state/gitSafetyState.svelte.ts`):**
   - Điều khiển ngăn kéo **Time Machine Drawer (`Ctrl + Z`)** và danh mục các bản lưu trữ trong **Safe Recycle Bin (Trash Inspector)**.
5. **`ToastState` (`src/lib/state/toastState.svelte.ts`):**
   - Hệ thống thông báo toast toàn cục hỗ trợ hiển thị lỗi có thể copy, cảnh báo conflict và tiến trình đồng bộ.

### 2.2. Kiến trúc Render Đồ thị Phân lập (Worker + Canvas)
- Toàn bộ thuật toán tính toán tọa độ $X, Y$, tính toán đường cong Bezier Cubic Spline và lệnh vẽ Canvas được đưa vào **`src/lib/workers/graphWorker.ts`**.
- Giao tiếp giữa Main UI và Worker chỉ truyền các cấu trúc dữ liệu phẳng qua kênh `postMessage`, bảo đảm UI main-thread luôn phản hồi người dùng ở tốc độ **60 FPS** ổn định ngay cả khi đang cuộn qua 100,000 commits.

---

## 🦀 3. KIẾN TRÚC BACKEND (TAURI V2 & RUST CORE)

### 3.1. Phân tầng Module Backend
Cấu trúc mã nguồn Rust trong thư mục `src-tauri/src/` được chia thành các phân khu rõ ràng:
- **`commands/`:** Điểm tiếp nhận và điều phối các yêu cầu IPC từ Frontend. Tất cả các command đều trả về kiểu `Result<T, AppError>`, nghiêm cấm sử dụng `unwrap()` hoặc `expect()` để bảo đảm ứng dụng không bao giờ bị crash đột ngột.
- **`git/`:** Thư viện logic Git tương tác trực tiếp với `git2-rs`. Bao gồm các thuật toán tính toán lịch sử, đồ thị lane đa luồng, mô phỏng Dry-run, xử lý conflict, rebase, blame và quản lý LFS.
- **`storage/`:** Tầng cơ sở dữ liệu SQLite bản địa (`rusqlite`), phụ trách lưu trữ Trash 48h (`trash.rs`), nhật ký hành động (`action_log.rs`) và thông tin tài khoản (`accounts.rs`).
- **`watcher/`:** Lớp giám sát tập tin (`notify`) chạy ngầm, gửi sự kiện `repo-changed` lên Frontend khi có bất kỳ thay đổi nào trong working tree hoặc thư mục `.git/`.

### 3.2. Đa luồng và Xử lý Bất đồng bộ
1. **Rayon Multi-Threading:**
   - Trong quá trình duyệt commit history (`history.rs`), thuật toán gán làn (Lane Assignment) và nén topological lanes được phân bổ xử lý song song trên nhiều core CPU bằng `rayon::par_iter()`.
2. **Tokio Async Runtime:**
   - Các thao tác mạng đường truyền dài (Fetch, Pull, Push, Clone, GitHub Device OAuth Poll) được đóng gói trong các tác vụ bất đồng bộ của Tokio, tránh khóa cứng luồng IPC chính của Tauri.
3. **In-Memory Git Index Simulation:**
   - Trước khi thực hiện Rebase, Merge hoặc Cherry-pick, hệ thống khởi tạo một `git2::Index` giả lập hoàn toàn trong bộ nhớ RAM để kiểm tra xem có xung đột mã nguồn xảy ra hay không mà không làm xáo trộn working tree thực tế của người dùng.

---

## ⚡ 4. VÒNG ĐỜI SỰ KIỆN VÀ ĐỒNG BỘ REALTIME (DATA FLOW)

```mermaid
sequenceDiagram
    participant OS as Hệ điều hành / Ổ đĩa
    participant Watcher as Rust Notify Watcher
    participant IPC as Tauri v2 IPC Channel
    participant Svelte as Svelte 5 Frontend
    participant Worker as Graph Web Worker

    OS->>Watcher: File được sửa đổi trong Repo
    Watcher->>Watcher: Debounce 80ms (Lọc nhiễu)
    Watcher->>IPC: Emit sự kiện "repo-changed"
    IPC->>Svelte: Nhận event qua listenRepoStatus()
    Svelte->>IPC: Gọi get_status() & get_commit_history()
    IPC-->>Svelte: Trả về danh sách Status & Commits ($state.raw)
    Svelte->>Worker: Gửi mảng commits vào Worker
    Worker->>Worker: Tính toán Bezier Splines & Tọa độ Nodes
    Worker-->>Svelte: Render trực tiếp lên OffscreenCanvas (60 FPS)
```

Kiến trúc này giúp FlowGit giữ được tốc độ phản hồi tính bằng mili-giây, giao diện mượt mà và an toàn tối đa trên mọi nền tảng Windows, macOS và Linux.
