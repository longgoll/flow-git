# SỔ TAY THỰC CHIẾN & KỊCH BẢN CỨU HỘ (FLOWGIT PLAYBOOK)
> **Mục tiêu:** Cung cấp công thức 1-2 click giải cứu mọi sự cố Git thường gặp trong thực tế  
> **Tra cứu nhanh:** Mở trực tiếp trong ứng dụng bằng phím tắt **`F1`** hoặc **`Ctrl + /`**

---

## 🆘 CÔNG THỨC 1: LỠ COMMIT NHẦM VÀO NHÁNH `MAIN` THAY VÌ TẠO NHÁNH MỚI

### Triệu chứng:
Bạn đang code tính năng mới nhưng quên tạo nhánh `feature/my-task`. Bạn đã commit 2-3 commit thẳng vào nhánh `main` local. Bạn chưa push lên remote.

### Cách cứu trên FlowGit (30 giây, 2 click):
1. **Bước 1:** Nhấp chuột phải vào commit đỉnh hiện tại ➔ Chọn **"Create Branch Here"** ➔ Đặt tên là `feature/my-task`.  
   *(Bây giờ các commit tính năng của bạn đã được gắn an toàn vào nhánh mới).*
2. **Bước 2:** Nhấp chuột phải vào commit cũ của `main` (commit trước khi bạn commit nhầm) ➔ Chọn **"Reset Current Branch (main) to Here"** ➔ Chọn chế độ **Hard**.
3. **Kết quả:** Nhánh `main` quay trở về vị trí sạch sẽ chuẩn mực, trong khi toàn bộ mã nguồn và commit tính năng của bạn đã nằm trọn vẹn trên nhánh `feature/my-task`.

---

## 🆘 CÔNG THỨC 2: LỠ BẤM DISCARD XÓA NHẦM CODE CHƯA COMMIT

### Triệu chứng:
Bạn vô tình bấm "Discard All Changes" hoặc bấm nút xóa một file chứa toàn bộ logic bạn vừa code cả buổi sáng mà chưa kịp commit. Trên các Git GUI khác hoặc terminal, code này đã bốc hơi vĩnh viễn!

### Cách cứu trên FlowGit (1 click khôi phục 100%):
1. Bấm vào biểu tượng **Thùng rác an toàn (Trash Inspector)** trên thanh công cụ Toolbar.
2. Tìm snapshot theo tên tệp hoặc mốc thời gian vừa thao tác.
3. Bấm nút màu xanh **"Restore"**.
4. **Kết quả:** Toàn bộ nội dung mã nguồn chưa commit được phục hồi nguyên vẹn 100% vào Working Tree trong chớp mắt.

---

## 🆘 CÔNG THỨC 3: THAO TÁC SAI LẦM NGHIÊM TRỌNG (RESET HOẶC REBASE NHẦM)

### Triệu chứng:
Bạn lỡ bấm Reset hoặc Rebase nhầm làm biến mất nhánh hoặc gộp sai các commit quan trọng. Bạn đang rất hoảng loạn vì không biết mã nguồn cũ đi đâu.

### Cách cứu trên FlowGit:
1. Nhấn tổ hợp phím **`Ctrl + Z`** (Safe-Flight Time Machine) một hoặc nhiều lần.
2. Hoặc mở **Time Machine Drawer** ở cạnh phải màn hình:
   - Xem dòng thời gian các hành động trước đó được lưu bởi SQLite Action Journal.
   - Nhấn **"Time Travel Here"** tại mốc thời gian trước khi xảy ra sự cố.
3. **Kết quả:** Con trỏ nhánh và HEAD lập tức quay ngược về quá khứ an toàn.

---

## 🆘 CÔNG THỨC 4: CÓ BUG NÓNG (HOTFIX) KHI ĐANG CODE DỞ TÍNH NĂNG

### Triệu chứng:
Bạn đang sửa dở 15 file trong nhánh tính năng, code đang dở dang chưa thể build hay commit được thì sếp yêu cầu sửa gấp một con bug production trên nhánh `hotfix`.

### Cách xử lý chuyên nghiệp (Zero-Disruption):
- **Cách 1 (Khuyên dùng - Dùng Git Worktree):**
  1. Bấm nút **"Quick Hotfix"** trên thanh Toolbar.
  2. FlowGit tự động tạo một thư mục làm việc độc lập trỏ vào `main`.
  3. Bạn mở thư mục đó sửa lỗi, test và commit.
  4. Thư mục chính đang code dở của bạn **hoàn toàn không bị xáo trộn hay phải stash**.
- **Cách 2 (Dùng Smart Stash):**
  1. Tại Working Tree, bấm **"Stash All"** (đặt tên nhãn tự động kèm ngày giờ).
  2. Chuyển sang `main` tạo nhánh sửa lỗi.
  3. Xong việc quay lại nhánh tính năng, bấm **"Pop Stash"**.

---

## 🆘 CÔNG THỨC 5: ĐÁNH GIÁ VÀ REVIEW PULL REQUEST OFFLINE GIỮA 2 NHÁNH

### Triệu chứng:
Bạn muốn xem trước toàn bộ sự khác biệt (tất cả các commit và tất cả các file thay đổi) giữa nhánh tính năng của bạn và nhánh `main` trước khi đẩy lên GitHub tạo PR.

### Cách xử lý trên FlowGit:
1. Chuyển sang tab **"PR Reviewer"** (hoặc mở `ComparisonViewer`).
2. Chọn Base Branch là `main` và Compare Branch là nhánh tính năng của bạn.
3. Hệ thống hiển thị:
   - Danh sách tuần tự toàn bộ commit đóng góp.
   - Bảng tổng hợp tất cả các file bị thay đổi (kèm số dòng `+` và `-`).
   - Diff chi tiết dạng Split hoặc Unified cho từng file.

---

## 🆘 CÔNG THỨC 6: DỌN DẸP 20 NHÁNH LOCAL CŨ SAU KHI SPRINT KẾT THÚC

### Triệu chứng:
Sidebar đầy ắp các nhánh cũ đã được merge vào `main` từ nhiều tuần trước, gây rối mắt khi tìm kiếm.

### Cách xử lý:
1. Bấm nút chiếc chổi **"Clean Merged Branches"** trên đầu mục Local Branches của Sidebar.
2. FlowGit tự động phân tích và liệt kê tất cả các nhánh đã an toàn để xóa.
3. Nhấn **"Delete Selected"** để thanh lọc sạch sẽ chỉ sau 1 click.
