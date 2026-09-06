<div align="center">

# 🚨 Edge Cases & Safety Guards
### Xử Lý Tình Huống Biên & Bộ Giám Sát An Toàn (Edge Cases & Guards)

> **Mission:** Automatically diagnose and prevent common pitfalls on Windows & Enterprise Git  
> **Mechanisms:** In-Progress Alerts + Heavy File Scanner + Index Lock Clearer + Process Diagnostics  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🚨 1. Repository In-Progress Alert Banner

Component: `src/lib/components/RepoAlertBanner.svelte`  
Backend: `src-tauri/src/git/status.rs` & `src-tauri/src/git/edge_cases.rs`

### The Problem:
When interrupted during a Rebase, Merge, or Cherry-pick (due to conflict or app shutdown), repositories enter an in-progress locked state where subsequent checkout or commit actions fail.

### FlowGit Solution:
FlowGit constantly inspects `.git` markers:
- `.git/rebase-merge` or `.git/rebase-apply`: In-progress Rebase.
- `.git/MERGE_HEAD`: In-progress Merge.
- `.git/CHERRY_PICK_HEAD`: In-progress Cherry-pick.

When detected, a **prominent amber banner** pins to the top of the window with 1-click action buttons:
1. **`Continue`:** Resumes process once conflicts are resolved.
2. **`Skip`:** Skips the active problematic commit.
3. **`Abort`:** Instantly rolls back the repository to its clean starting state.

---

## 🪤 2. Detached HEAD Trap Guard

### The Danger:
Checking out a commit SHA or Tag (instead of a named branch) places Git into a "Detached HEAD" state. Subsequent commits become dangling and can be lost when switching branches.

### FlowGit Safety Net:
- StatusBar and Graph header illuminate with a red warning: **"Detached HEAD Mode"**.
- Displays an action button: **"Create Branch Here"**.
- 1-Click to anchor commits safely to a new branch, ensuring zero work is ever orphaned.

---

## 🔒 3. Windows File Locking Diagnostics

Command: `check_file_locks`

### Windows Specific Behavior:
On Windows, files held open by running processes (Visual Studio, Node.js, running web servers, Excel) cannot be overwritten or deleted, yielding cryptic `Permission Denied` or `EPERM` Git errors.

### FlowGit Diagnostics:
- Catches permission errors and scans files via `check_file_locks`.
- Displays actionable diagnostics identifying the culprit process:  
  *"File `bundle.js` is locked by `Node.js (PID 12480)`. Please terminate the process before continuing."*

---

## 🐘 4. Pre-Commit Heavy File Scanner

Component: `src/lib/components/PreCommitWarningModal.svelte`  
Backend: `src-tauri/src/git/edge_cases.rs`

### The Danger:
Accidentally committing `.zip`, `.mp4`, or large ML models (> 50MB) results in rejected pushes on GitHub. Fixing it requires complex history rewriting.

### Preventive Scanner:
- Automatically scans staged additions (`scan_heavy_files`) prior to commit.
- If files > 50MB lack Git LFS tracking:
  - Halts the commit and prompts:  
    *"File `assets/demo.mp4` is 82 MB. Would you like FlowGit to track it with Git LFS?"*

---

## 🛡️ 5. Untracked File Collisions (Shelve Untracked)

Command: `shelve_untracked_files`

### The Scenario:
Switching branches when an untracked local file shares a name with a tracked file on the target branch causes Git to abort checkout.

### Solution:
FlowGit offers 1-click **"Shelve to Safe Discard"**: moves conflicting untracked files into 48-hour SQLite storage, allowing seamless branch transitions with on-demand restoration.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🚨 1. BANNER TRẠNG THÁI REPO DỞ DANG (REPO IN-PROGRESS BANNER)

Component: `src/lib/components/RepoAlertBanner.svelte`  
Backend: `src-tauri/src/git/status.rs` & `src-tauri/src/git/edge_cases.rs`

### Sự cố thường gặp:
Khi đang thực hiện Rebase, Merge hoặc Cherry-pick mà gặp xung đột hoặc người dùng vô tình đóng app giữa chừng, repository rơi vào trạng thái "dở dang" (In-Progress). Các thao tác checkout, commit hoặc pull sau đó đều bị khóa cứng.

### Giải pháp của FlowGit:
FlowGit liên tục kiểm tra các mốc trạng thái trong thư mục `.git`:
- `.git/rebase-merge` hoặc `.git/rebase-apply`: Đang trong tiến trình Rebase.
- `.git/MERGE_HEAD`: Đang trong tiến trình Merge.
- `.git/CHERRY_PICK_HEAD`: Đang trong tiến trình Cherry-pick.

Ngay khi phát hiện, một **Banner màu vàng nổi bật** sẽ ghim trên đỉnh màn hình kèm 3 nút xử lý 1-chạm:
1. **`Continue`:** Tiếp tục tiến trình sau khi bạn đã giải quyết xong xung đột.
2. **`Skip`:** Bỏ qua commit hiện tại đang bị lỗi và đi tiếp.
3. **`Abort (Hủy khẩn cấp)`:** Hủy bỏ toàn bộ tiến trình và đưa repository trở về trạng thái sạch sẽ trước khi bắt đầu.

---

## 🪤 2. BẪY ĐẦU TÁCH RỜI (DETACHED HEAD TRAP GUARD)

### Nguy cơ tiềm ẩn:
Khi người dùng checkout trực tiếp vào một Commit SHA hoặc một Tag (thay vì tên nhánh), Git sẽ rơi vào trạng thái "Detached HEAD". Nếu người dùng tiếp tục commit mã nguồn tại đây, khi chuyển sang nhánh khác, **toàn bộ các commit mới sẽ bị mồ côi (dangling commit)** và biến mất khỏi cây đồ thị thông thường.

### Lưới an toàn trong FlowGit:
- StatusBar và đỉnh Đồ thị lập tức chuyển sang màu đỏ cảnh báo: **"Detached HEAD Mode"**.
- Hiển thị nút bấm khẩn cấp: **"Create Branch Here"**.
- Chỉ với 1 click, người dùng có thể đặt tên nhánh mới gắn chặt vào commit hiện tại, bảo đảm không bao giờ có commit nào bị rơi rụng.

---

## 🔒 3. CHẨN ĐOÁN KHÓA TỆP WINDOWS (WINDOWS FILE LOCKING DIAGNOSTICS)

Command: `check_file_locks`

### Vấn đề đặc thù trên Windows:
Khác với Linux/macOS, hệ điều hành Windows không cho phép ghi đè hoặc xóa các tệp đang được mở bởi các tiến trình khác (Visual Studio, IDE, Web Server đang chạy, hoặc file Excel/Word). Khi đó lệnh checkout hoặc reset của Git sẽ báo lỗi chung chung: `Permission Denied` hoặc `EPERM`.

### Cơ chế chẩn đoán của FlowGit:
- Khi thao tác Git bị lỗi phân quyền, FlowGit tự động quét danh sách tệp qua hàm `check_file_locks`.
- Ứng dụng hiển thị hộp thoại chỉ đích danh:  
  *"Tệp `bundle.js` đang bị khóa bởi tiến trình `Node.js (PID 12480)`. Vui lòng dừng server trước khi tiếp tục."*

---

## 🐘 4. BỘ QUÉT TỆP NẶNG TRƯỚC KHI COMMIT (HEAVY FILE SCANNER)

Component: `src/lib/components/PreCommitWarningModal.svelte`  
Backend: `src-tauri/src/git/edge_cases.rs`

### Nỗi đau lớn:
Một lập trình viên vô tình kéo một file nén `.zip`, video demo `.mp4` hoặc file mô hình máy học `.onnx` nặng **80MB** vào stage và commit. Khi đẩy lên GitHub:
- Lệnh `git push` bị GitHub từ chối vì vượt quá giới hạn 50MB/100MB.
- Việc xóa file ở commit tiếp theo không thể push được vì file nặng vẫn nằm trong commit cũ, buộc phải viết lại lịch sử rất phức tạp.

### Cơ chế phòng ngừa chủ động:
- Mỗi khi bạn nhấn nút "Stage" hoặc "Commit", FlowGit tự động kích hoạt bộ quét dung lượng ngầm (`scan_heavy_files`).
- Nếu phát hiện tệp > 50MB chưa được cấu hình Git LFS:
  - Ứng dụng chặn thao tác và hiển thị modal cảnh báo:  
    *"Phát hiện tệp `assets/demo.mp4` có dung lượng 82 MB. Bạn có muốn chuyển tệp này sang Git LFS để theo dõi không?"*

---

## 🛡️ 5. XUNG ĐỘT GHI ĐÈ FILE UNTRACKED (SHELVE UNTRACKED)

Command: `shelve_untracked_files`

### Tình huống:
Khi chuyển từ nhánh `main` sang nhánh `feature`, nếu ở `main` bạn có một file mới tạo chưa commit (untracked) mà trùng tên với một file đã có trên nhánh `feature`, Git sẽ báo lỗi và từ chối checkout.

### Giải pháp:
FlowGit cung cấp nút 1-chạm **"Shelve to Safe Discard"**: Tự động chuyển các file untracked bị xung đột vào thùng rác SQLite 48h, cho phép chuyển nhánh trơn tru, và bạn có thể khôi phục lại bất kỳ lúc nào sau đó.
