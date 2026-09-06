# CÔNG CỤ NÂNG CAO: WORKTREES, GIT LFS & SUBMODULES HUB
> **Dành cho Dự án Doanh nghiệp:** Quản lý không gian làm việc song song, tệp đồ họa dung lượng lớn và đa kho mã nguồn phụ  
> **Lưu ý:** Bộ công cụ Duyệt cây tệp tin, So sánh commit và Soi vết Blame đã được chuyển sang tài liệu chuyên sâu: [`repo-explorer-and-file-tools.md`](./repo-explorer-and-file-tools.md)

---

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

## 🔗 LIÊN KẾT ĐẾN BỘ CÔNG CỤ TỆP LIÊN QUAN
- 📂 [repo-explorer-and-file-tools.md](./repo-explorer-and-file-tools.md): Trình duyệt cây tệp tin Repository Explorer, Interactive Blame, File History Timeline, và History Nuker xóa tệp nhạy cảm.
- 🥞 [stacked-commits-and-hotfix.md](./stacked-commits-and-hotfix.md): Chuỗi Stacked Commits và luồng Quick Hotfix.
