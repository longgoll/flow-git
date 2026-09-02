# XỬ LÝ TÌNH HUỐNG BIÊN & BỘ GIÁM SÁT AN TOÀN (EDGE CASES & GUARDS)
> **Mục tiêu:** Dự đoán và xử lý tự động mọi sự cố thường gặp trên Windows & Enterprise Git  
> **Cơ chế:** Repo Alert Banner + Heavy File Scanner + Index Lock Clearer + Process Diagnostics

---

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
