<div align="center">

# ⚔️ 3-Way Conflict Resolver & Visual Bisect Wizard
### Giải Quyết Xung Đột (3-Way Conflict) & Truy Vết Lỗi (Git Bisect)

> **Visuals:** 4-Pane Monaco Conflict Resolver + 1-Click Chunk Adoption  
> **Investigation:** Visual Bisect Wizard automating Binary Search across the commit DAG  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## ⚔️ 1. 4-Pane 3-Way Merge Conflict Resolver

Component: `src/lib/components/ConflictResolver.svelte`  
Backend: `src-tauri/src/git/conflict.rs`

### The Problem:
Manual conflict resolution in typical code editors forces developers to parse noisy conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>> incoming`), risking accidental deletions or syntax corruption.

### 4-Pane Split Architecture:

```
┌───────────────────────────┬───────────────────────────┬───────────────────────────┐
│ OURS (Current Branch)     │ BASE (Common Ancestor)    │ THEIRS (Incoming Branch)  │
│                           │                           │                           │
│ const API_URL =           │ const API_URL =           │ const API_URL =           │
│   "https://api.v2.com";   │   "https://api.v1.com";   │   "https://api.prod.com"; │
│                           │                           │                           │
│ [Take Ours ◀]             │                           │ [▶ Take Theirs]           │
├───────────────────────────┴───────────────────────────┴───────────────────────────┤
│ RESULT (Consolidated Code - Editable Monaco Editor)                               │
│                                                                                   │
│ const API_URL = "https://api.v2.com";                                             │
│                                                                                   │
│ [Abort Merge / Rebase]                         [Mark as Resolved & Stage (Save)]  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Key Capabilities:
1. **Clear Segregation:** Concurrently displays Ours, Base (ancestor before branching), Theirs, and the editable Result pane.
2. **1-Click Chunk Adoption:**
   - **Take Ours:** Adopts active branch code.
   - **Take Theirs:** Adopts incoming code.
   - **Take Base:** Reverts to base ancestor code.
   - **Take Both:** Keeps both hunks sequentially.
3. **Freeform Monaco Editing:** Edit the Result pane directly to combine logic as needed.
4. **Automated Staging on Resolution:** "Mark as Resolved" persists changes and stages the file into Index.
5. **Emergency Abort:** Instantly cancels the merge/rebase and returns repo to clean state.

---

## 🐞 2. Visual Git Bisect Wizard

Component: `src/lib/components/BisectWizard.svelte`  
Backend: `src-tauri/src/git/bisect.rs`

### The Problem:
A regression appears on production after 200 commits have been merged over the past month. Testing each commit sequentially would take days.

### Binary Search Visualization:
FlowGit applies binary search to reduce 200 candidate commits down to **just 7–8 verification steps**:

```
[Good Commit: v1.0.0] ──────────── (Step 1: Test midpoint commit) ──────────── [Bad Commit: HEAD]
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                           [Code Passes (Good)]     [Code Fails (Bad)]
```

### Step-by-Step UI Execution:
1. **Launch Wizard:**
   - Right-click broken commit (HEAD) ➔ **"Mark as Bad 🐞"**.
   - Right-click known functional historical commit ➔ **"Mark as Good ✅"**.
   - Click **"Start Bisect Wizard"**.
2. **Intelligent Midpoint Navigation:**
   - FlowGit automatically checks out the exact mathematical midpoint.
   - Progress bar displays: *"Narrowed down to ~6 candidate commits (est. 3 steps remaining)"*.
   - Tested commit node pulses on the canvas.
3. **Verify and Vote:**
   - Test your build:
     - If bug persists ➔ click **"Code Fails (Bad)"**.
     - If build succeeds ➔ click **"Code Passes (Good)"**.
4. **Culprit Identified:**
   - FlowGit pinpoints the exact first commit that introduced the bug.
   - Shows summary modal: Author, timestamp, commit message, and full code diff, complete with a 1-click **"Revert This Commit"** button.

### 🤖 Automated Bisect Runner (Script Mode):
For test suites and CI scripts, switch to the **Auto-Bisect** tab:
- **Preset Buttons**: 1-click presets for `npm test`, `cargo test`, `pytest`, or `go test`.
- **Zero Manual Clicks**: FlowGit checks out each midpoint, executes the command in background, and parses the exit code (exit `0` = Good, non-zero = Bad).
- **Live Terminal Logs**: Tauri event streaming (`bisect://step-log`) streams stderr/stdout live for each commit step directly into the wizard.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

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

### 🤖 Chế độ Auto-Bisect Tự Động (Script Runner):
Đối với dự án có sẵn Unit test hoặc Integration test, chuyển sang tab **Tự động (Script)**:
- **Phím tắt cài sẵn (Presets)**: Hỗ trợ 1-click cho `npm test`, `cargo test`, `pytest`, hoặc `go test`.
- **Hoàn toàn tự động**: FlowGit tự động checkout từng commit ở giữa, kích hoạt lệnh test và phân tích exit code (mã `0` = Good, khác `0` = Bad).
- **Stream Log trực tiếp**: Luồng sự kiện Tauri `bisect://step-log` truyền tải realtime toàn bộ output stdout/stderr của từng bước test ngay trên giao diện Bisect Wizard.
