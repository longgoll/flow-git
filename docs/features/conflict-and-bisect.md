# GIẢI QUYẾT XUNG ĐỘT (3-WAY CONFLICT) & TRUY VẾT LỖI (GIT BISECT)
> **Trực quan hóa:** 4 Khung hình Monaco Conflict Resolver + 1-Click Chọn khối code  
> **Dò vết Bug:** Visual Bisect Wizard tự động chia đôi đồ thị theo thuật toán Binary Search

---

## ⚔️ 1. BỘ GIẢI QUYẾT XUNG ĐỘT 4 KHUNG HÌNH (3-WAY MERGE RESOLVER)

Component: `src/lib/components/ConflictResolver.svelte`  
Backend: `src-tauri/src/git/conflict.rs`

### Vấn đề:
Khi giải quyết xung đột bằng các trình soạn thảo thông thường, lập trình viên phải đọc các ký tự đánh dấu khó chịu (`<<<<<<< HEAD`, `=======`, `>>>>>>> incoming`) nằm lẫn lộn trong một file duy nhất, rất dễ xóa nhầm ngoặc nhọn hoặc làm sai lệch logic.

### Giao diện 4 Khung hình (4-Pane Split Architecture):

```
┌───────────────────────────┬───────────────────────────┬───────────────────────────┐
│ OURS (Nhánh hiện tại)     │ BASE (Tổ tiên chung)      │ THEIRS (Nhánh gộp vào)    │
│                           │                           │                           │
│ const API_URL =           │ const API_URL =           │ const API_URL =           │
│   "https://api.v2.com";   │   "https://api.v1.com";   │   "https://api.prod.com"; │
│                           │                           │                           │
│ [Chọn khối này ◀]         │                           │ [▶ Chọn khối này]         │
├───────────────────────────┴───────────────────────────┴───────────────────────────┤
│ RESULT (Mã nguồn hợp nhất - Monaco Editor có thể gõ trực tiếp)                    │
│                                                                                   │
│ const API_URL = "https://api.v2.com";                                             │
│                                                                                   │
│ [Hủy bỏ Merge / Rebase]                       [Đánh dấu đã giải quyết xong (Save)]│
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Các tính năng ưu việt:
1. **Phân tách rành mạch:** Hiển thị đồng thời bản code nhánh ta (Ours), tổ tiên trước khi rẽ nhánh (Base), nhánh đối phương (Theirs) và khung kết quả (Result).
2. **Nút 1-Click Chọn khối (Chunk Resolution):**
   - **Take Ours:** Nhận toàn bộ khối code của nhánh ta.
   - **Take Theirs:** Nhận khối code của đối phương.
   - **Take Base:** Quay về mốc cũ của tổ tiên.
   - **Take Both:** Giữ cả 2 khối code kế tiếp nhau.
3. **Chỉnh sửa tự do (Freeform Monaco Editing):** Bạn có thể gõ phím trực tiếp vào khung Result để sửa logic kết hợp theo ý muốn.
4. **Tự động Stage khi hoàn thành:** Nhấn "Mark as Resolved", hệ thống tự động lưu file xuống đĩa và gọi `stage_file` đưa vào Index.
5. **Nút Abort khẩn cấp:** Cho phép dừng ngay lập tức tiến trình Merge/Rebase để đưa repo về trạng thái sạch sẽ ban đầu.

---

## 🐞 2. VISUAL GIT BISECT WIZARD (TRÌNH TRUY VẾT BUG)

Component: `src/lib/components/BisectWizard.svelte`  
Backend: `src-tauri/src/git/bisect.rs`

### Vấn đề:
Một con bug bí ẩn xuất hiện trên production, nhưng trong tháng vừa qua đã có hơn 200 commit được merge vào. Không ai biết dòng code nào gây ra lỗi. Nếu kiểm tra từng commit một sẽ mất nhiều ngày.

### Cơ chế Binary Search trực quan của FlowGit:
FlowGit tự động áp dụng thuật toán tìm kiếm nhị phân để thu hẹp 200 commit xuống còn **chỉ 7-8 bước kiểm tra**:

```
[Good Commit: v1.0.0] ──────────── (Bước 1: Test commit ở giữa) ──────────── [Bad Commit: HEAD]
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                           [Code Chạy Tốt (Pass)]    [Code Bị Lỗi (Fail)]
```

### Các bước thực hiện trên giao diện:
1. **Khởi động Wizard:**
   - Chuột phải vào commit bị lỗi (HEAD) ➔ Chọn **"Mark as Bad 🐞"**.
   - Chuột phải vào một commit cũ đã biết chắc chắn chạy tốt ➔ Chọn **"Mark as Good ✅"**.
   - Bấm **"Start Bisect Wizard"**.
2. **Tiến trình thông minh:**
   - Hệ thống tự động checkout vào commit nằm chính giữa khoảng nghi vấn.
   - Thanh tiến trình hiển thị: *"Đã thu hẹp còn ~6 commits nghi vấn (ước tính còn 3 bước)"*.
   - Node đang được test sẽ sáng đèn nhấp nháy trên đồ thị.
3. **Kiểm tra và Bấm nút:**
   - Chạy thử ứng dụng của bạn:
     - Nếu lỗi vẫn còn ➔ Bấm nút to màu đỏ: **"Code Bị Lỗi (Bad)"**.
     - Nếu ứng dụng chạy tốt ➔ Bấm nút to màu xanh: **"Code Chạy Tốt (Good)"**.
4. **Tìm ra thủ phạm (Culprit Identified):**
   - Sau vài bước, FlowGit lập tức phát hiện chính xác commit duy nhất đầu tiên đưa lỗi vào hệ thống.
   - Hiển thị bảng tổng kết: Tên tác giả, ngày giờ, commit message và danh sách các dòng code đã sửa của commit đó, kèm nút **"Revert Commit Này Ngay"**.
