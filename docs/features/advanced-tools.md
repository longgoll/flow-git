# CÔNG CỤ NÂNG CAO: WORKTREES, GIT LFS, SUBMODULES & EXPLORER
> **Dành cho Dự án Doanh nghiệp:** Quản lý không gian làm việc song song, tệp đồ họa dung lượng lớn và đa kho mã nguồn phụ

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
- **Quick Hotfix Flow:** Bấm nút "Quick Hotfix" trên thanh công cụ để tự động tạo một hotfix worktree từ `main`, mở ra cửa sổ mới và dọn dẹp sau khi merge xong.

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

## 📂 4. REPOSITORY EXPLORER, INTERACTIVE BLAME & FILE HISTORY

Component: `src/lib/components/RepositoryExplorer.svelte` & `FileHistoryModal.svelte`  
Backend: `src-tauri/src/git/blame.rs` & `tree.rs`

### 4.1. Duyệt cây tập tin kho lưu trữ (Repository Explorer)
- Khám phá toàn bộ cấu trúc thư mục của repo tại commit hiện tại hoặc tại bất kỳ commit nào trong quá khứ mà không cần checkout.
- Tích hợp trình xem trước code Monaco Editor hỗ trợ định dạng cú pháp chuẩn xác.

### 4.2. Soi vết từng dòng code (Interactive Git Blame)
- Bật công tắc **"Toggle Blame"** trong trình xem file:
  - Lề trái hiển thị thông tin tác giả đã sửa dòng code đó: Avatar, Tên, Ngày sửa (dạng tương đối `3 tuần trước`) và SHA ngắn.
  - **Hover chuột vào dòng:** Hiển thị popup chứa toàn bộ commit message giải thích lý do dòng code đó được viết ra.
  - **Click vào dòng:** Lập tức đưa camera của Living Graph nhảy đến đúng commit đó để xem ngữ cảnh tổng thể.

### 4.3. Dòng thời gian lịch sử tệp (File History Timeline)
- Nhấp chuột phải vào bất kỳ tệp nào trong Explorer ➔ Chọn **"View File History"**.
- Mở danh sách dòng thời gian lọc riêng toàn bộ các commit từng can thiệp vào tệp đó (`git log --follow -- <path>`), giúp dễ dàng tìm hiểu quá trình thay đổi của một module logic qua nhiều năm.
