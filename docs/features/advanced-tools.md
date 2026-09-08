<div align="center">

# 🌲 Advanced Tools: Git Worktrees, LFS & Submodules
### Công Cụ Nâng Cao: Worktrees, Git LFS & Submodules Hub

> **Enterprise Workflows:** Parallel working directories, large graphic asset pipelines, and multi-repo architectures  
> **Related Documentation:** Repository Explorer, Comparisons, and Blame reside in [`repo-explorer-and-file-tools.md`](./repo-explorer-and-file-tools.md)  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🌲 1. Git Worktrees Manager

Component: `src/lib/components/WorktreeManager.svelte` & `QuickHotfixModal.svelte`  
Backend: `src-tauri/src/git/worktree.rs`

### The Problem:
You are modifying 20 files for `feature/dashboard` when production incurs a critical bug requiring an immediate patch. Stashing or switching branches causes:
- Tedious stashing and popping prone to uncommitted code collisions.
- Rebuilding `node_modules` or Rust `target/` directories, wasting 5–15 minutes.

### FlowGit Worktrees Solution:
FlowGit links separate branches to independent physical directories on disk (`git worktree add`):
- **1-Click Worktree Creation:** Open **"Worktree Manager"** on Toolbar ➔ choose target branch and directory path.
- **Complete Isolation:** Open the new directory to patch, test, and commit. Your primary working directory **remains 100% untouched**.
- **Quick Hotfix Integration:** Click "Quick Hotfix" to spawn a temporary worktree from `main` that cleans itself up post-merge.

---

## 📦 2. Git Large File Storage (LFS) Engine

Component: `src/lib/components/LfsManager.svelte`  
Backend: `src-tauri/src/git/lfs.rs`

### LFS Capabilities:
1. **Pointer Text vs Binary Payload Discrimination:**
   - Evaluates `.gitattributes` (`filter=lfs`).
   - Clearly distinguishes between pointer metadata (130-byte text) and downloaded binary payloads.
2. **LFS File Locking:**
   - Crucial for Game Dev (Unity, Unreal) and Design (`.psd`, `.fbx`, `.blend`) where binary assets **cannot be merged automatically**.
   - 1-Click **"Lock File"** (`lock_lfs_file`) on the remote server to prevent team collision.
3. **1-Click LFS Pull (`pull_lfs_files`):**
   - Downloads binary assets across the repository without complex CLI invocations.

---

## 🗂️ 3. Git Submodules Hub

Component: `src/lib/components/SubmoduleManager.svelte`  
Backend: `src-tauri/src/git/submodule.rs`

### Multi-Repo Submodule Management:
- **Configuration Parsing:** Automatically parses `.gitmodules` via `libgit2`.
- **Status Radar:**
  - Compares Submodule HEAD SHA with the commit SHA recorded in the Superproject Index.
  - Highlights detached states and version drift warnings.
- **1-Click Operations:**
  - **`Update All (--init --recursive)`:** Clones and checks out all submodule trees recursively.
  - **`Sync URLs`:** Synchronizes `.gitmodules` endpoint modifications into local Git configs.

---

## ⚓ 4. Git Hooks Manager

Component: `src/lib/components/GitHooksModal.svelte`  
Backend: `src-tauri/src/git/hooks.rs` & `src-tauri/src/commands/hooks.rs`

### Visual Automation & Guardrails:
- **8 Standard Git Hooks Supported:** `pre-commit`, `commit-msg`, `pre-push`, `post-merge`, `prepare-commit-msg`, `post-checkout`, `post-commit`, `pre-rebase`.
- **1-Click Toggle Switch:**
  - Toggle between active (`.git/hooks/<name>`) and disabled state (`.git/hooks/<name>.disabled`).
  - Automatically initializes standard boilerplate scripts with executable permissions (`0o755` on Unix/macOS).
- **Integrated Monaco Code Editor:**
  - Syntax highlighting for Shell / Bash scripts (`language="shell"`), line numbers, and quick save (`Ctrl + S`).
  - **"Restore from Sample"**: Restore official `.sample` scripts generated during Git repo initialization.
  - **Built-in Presets**:
    - `commit-msg`: Conventional Commits validation regex.
    - `pre-commit`: Linter and test pre-check execution.
    - `pre-push`: Protected branch direct push blocker (`main` / `master`).
    - `post-merge`: Automatic `npm install` on `package.json` updates.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🌲 1. GIT WORKTREES MANAGER (KHÔNG GIAN LÀM VIỆC SONG SONG)

Component: `src/lib/components/WorktreeManager.svelte` & `QuickHotfixModal.svelte`  
Backend: `src-tauri/src/git/worktree.rs`

### Vấn đề:
Khi bạn đang sửa đổi 20 file cho tính năng `feature/dashboard`, khách hàng báo có lỗi nghiêm trọng trên production cần vá ngay lập tức. Nếu dùng `git stash` hoặc chuyển nhánh:
- Mất thời gian stash và pop lại, rất dễ gây xung đột code dở dang.
- Phải build lại toàn bộ `node_modules` hoặc thư mục `target/` tốn từ 5 đến 15 phút.

### Giải pháp Worktrees của FlowGit:
FlowGit cho phép bạn gắn một nhánh khác vào một thư mục vật lý hoàn toàn riêng biệt trên ổ đĩa (`git worktree add`):
- **Tạo Worktree 1 chạm:** Bấm vào **"Worktree Manager"** trên thanh Toolbar ➔ Nhập tên nhánh và thư mục đích.
- **Làm việc độc lập:** Mở thư mục mới sửa lỗi, chạy test và commit độc lập 100%. Thư mục chính đang code dở dang của bạn **không hề bị suy chuyển dù chỉ một byte**.
- **Quick Hotfix Flow:** Bấm nút "Quick Hotfix" trên thanh công cụ để tự động tạo một hotfix worktree từ `main`, mở ra cửa sổ mới và dọn dẹp sau khi merge xong (xem chi tiết tại [`stacked-commits-and-hotfix.md`](./stacked-commits-and-hotfix.md)).

---

## 📦 2. GIT LARGE FILE STORAGE (LFS) ENGINE

Component: `src/lib/components/LfsManager.svelte`  
Backend: `src-tauri/src/git/lfs.rs`

### Các tính năng LFS chuyên sâu:
1. **Phân biệt Pointer Text và Binary Payload:**
   - Tự động quét file theo quy tắc `.gitattributes` (`filter=lfs`).
   - Nhận biết rõ file trên máy tính đang là file con trỏ nhỏ (pointer text 130 bytes) hay đã tải đầy đủ file nhị phân dung lượng thực tế.
2. **Khóa tệp LFS (LFS File Locking):**
   - Trong các dự án Game (Unity, Unreal Engine) hoặc Thiết kế (Photoshop `.psd`, mô hình 3D `.fbx`, `.blend`), các file nhị phân **không thể merge tự động** nếu bị xung đột.
   - FlowGit cung cấp tính năng **"Lock File"** (`lock_lfs_file`) lên máy chủ remote: ngăn chặn đồng nghiệp sửa đổi cùng lúc.
   - Hiển thị danh sách ai đang khóa file nào và cho phép mở khóa (Unlock).
3. **Kéo tệp LFS 1-Click (`pull_lfs_files`):**
   - Tải nhanh toàn bộ payload của các file LFS trong repo mà không cần gõ lệnh dòng lệnh phức tạp.

---

## 🗂️ 3. GIT SUBMODULES HUB

Component: `src/lib/components/SubmoduleManager.svelte`  
Backend: `src-tauri/src/git/submodule.rs`

### Quản trị kho mã nguồn lồng nhau:
- **Tự động quét cấu hình:** Đọc tệp `.gitmodules` và liên kết với thư viện `libgit2`.
- **Giám sát tình trạng đồng bộ (Status Radar):**
  - Hiển thị tên Submodule, đường dẫn (Path) và URL remote.
  - So sánh commit SHA mà submodule đang trỏ tới (HEAD) với commit SHA được ghi nhận trong kho cha (Superproject Index).
  - Cảnh báo rõ ràng: *"Submodule đang trỏ lệch phiên bản so với kho cha"*.
- **Các thao tác 1-Click:**
  - **`Update All (--init --recursive)`:** Tự động clone và cập nhật toàn bộ cây submodules nhiều cấp.
  - **`Sync URLs`:** Đồng bộ lại các thay đổi URL trong file cấu hình `.gitmodules` vào git config nội bộ.

---

## ⚓ 4. GIT HOOKS MANAGER (QUẢN LÝ HOOKS TRỰC QUAN)

Component: `src/lib/components/GitHooksModal.svelte`  
Backend: `src-tauri/src/git/hooks.rs` & `src-tauri/src/commands/hooks.rs`

### Tự động hóa kiểm tra & Bảo vệ kho mã nguồn:
- **Hỗ trợ 8 Git Hooks tiêu chuẩn:** `pre-commit`, `commit-msg`, `pre-push`, `post-merge`, `prepare-commit-msg`, `post-checkout`, `post-commit`, `pre-rebase`.
- **Công tắc Bật / Tắt 1-Click (Toggle Switch):**
  - Tự động chuyển trạng thái giữa tệp thực thi `<hook>` và tệp vô hiệu hóa `<hook>.disabled`.
  - Tự động cấp quyền thực thi (`chmod +x` / `0o755`) trên Unix/macOS.
- **Trình soạn thảo mã nguồn Monaco Editor tích hợp:**
  - Soạn thảo trực tiếp script Shell/Bash có tô màu cú pháp, số dòng và phím tắt lưu nhanh `Ctrl + S`.
  - **"Khôi phục từ Sample"**: Tái tạo lại tệp mẫu gốc `.sample` của Git.
  - **Mẫu kịch bản có sẵn (Built-in Templates):**
    - `commit-msg`: Kiểm tra quy chuẩn Conventional Commits (`feat:`, `fix:`, v.v.).
    - `pre-commit`: Chạy linter và kiểm thử tự động trước khi commit.
    - `pre-push`: Chặn hành động push trực tiếp vào nhánh được bảo vệ (`main`/`master`).
    - `post-merge`: Tự động chạy `npm install` khi có cập nhật `package.json`.

---

## 🔗 LIÊN KẾT ĐẾN BỘ CÔNG CỤ TỆP LIÊN QUAN
- 📂 [repo-explorer-and-file-tools.md](./repo-explorer-and-file-tools.md): Trình duyệt cây tệp tin Repository Explorer, Interactive Blame, File History Timeline, và History Nuker xóa tệp nhạy cảm.
- 🥞 [stacked-commits-and-hotfix.md](./stacked-commits-and-hotfix.md): Chuỗi Stacked Commits và luồng Quick Hotfix.

