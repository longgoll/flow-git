# QUẢN LÝ NHÁNH, MULTI-REMOTES & SMART SYNC
> **Tiêu chuẩn:** Hỗ trợ quy trình Fork, Đa Remotes (`origin`, `upstream`)  
> **Tự động hóa:** 1-Click Smart Sync & Tự động quét dọn nhánh rác (Clean Merged Branches)

---

## 🌿 1. QUẢN LÝ NHÁNH LINH HOẠT (BRANCH MANAGEMENT)

Component: `Sidebar.svelte`, `CreateBranchModal.svelte`, `DeleteBranchModal.svelte`

Sidebar của FlowGit phân loại các nhánh trong repository thành các cây thư mục rõ ràng:
- **Local Branches:** Các nhánh làm việc trên máy tính cá nhân.
- **Remote Branches:** Các nhánh được theo dõi trên máy chủ từ xa (GitHub, GitLab, Bitbucket).
- **Huy hiệu Ahead / Behind:** Hiển thị thời gian thực độ lệch giữa nhánh local và remote tương ứng (`↑ 3  ↓ 1`).

### Thao tác trực quan trên nhánh:
- **Chuyển nhánh (Checkout):** Nhấp đúp chuột vào tên nhánh bất kỳ. Hệ thống tự động kiểm tra xem working tree có an toàn để chuyển hay không.
- **Tạo nhánh mới:** Bấm phím tắt `B` hoặc nhấp chuột phải chọn **"Create Branch..."**. Cho phép tạo từ HEAD hoặc từ bất kỳ commit/tag nào trong quá khứ.
- **Đổi tên nhánh:** Nhấp đúp chuột chậm vào nhãn nhánh để sửa tên tại chỗ (`rename_branch`).
- **Xóa nhánh an toàn:** Cảnh báo rõ ràng nếu nhánh chưa được merge vào nhánh chính để tránh vô tình làm mất code (`DeleteBranchModal.svelte`).

---

## 🧹 2. DỌN DẸP NHÁNH ĐÃ MERGE (CLEAN MERGED BRANCHES)

Component: `src/lib/components/CleanMergedBranchesModal.svelte`

### Vấn đề:
Sau nhiều tháng làm việc trong các dự án agile lớn, lập trình viên thường tích lũy hàng chục nhánh local cũ (`feat/login`, `fix/nav`, `test/api`) đã được merge vào `main` nhưng chưa xóa, làm Sidebar chật chội và rối mắt.

### Giải pháp của FlowGit:
1. Bấm vào nút chổi quét **"Clean Merged Branches"** trên thanh tiêu đề Sidebar.
2. Hệ thống gọi thuật toán `get_merged_branches` tại Rust backend để rà soát toàn bộ các nhánh local có commit trỏ tới một tổ tiên đã nằm trong `main`.
3. Hiển thị danh sách các nhánh an toàn có thể xóa với hộp kiểm (checkbox) chọn lọc.
4. Nhấn **"Delete Selected Branches"**: Xóa hàng loạt toàn bộ nhánh rác trong 1 giây mà không gây bất kỳ rủi ro nào cho nhánh chính.

---

## 🌐 3. TRUNG TÂM ĐA REMOTES (MULTI-REMOTES HUB)

Component: `src/lib/components/RemoteManagerModal.svelte`

Đối với các dự án mã nguồn mở hoặc tổ chức phân tán theo mô hình Fork Workflow:
- **`origin`:** Kho fork cá nhân của lập trình viên.
- **`upstream`:** Kho mã nguồn chính của tổ chức.

### Tính năng của Remote Manager:
- **Xem danh sách Remotes:** Hiển thị tên, URL Fetch và URL Push của từng máy chủ từ xa.
- **Thêm Remote mới (`add_remote`):** Bấm nút `+` để thêm remote mới (ví dụ: `git remote add upstream https://...`).
- **Chỉnh sửa & Đồng bộ:** Thay đổi URL remote, xóa bỏ remote không còn sử dụng.
- **Fetch độc lập:** Cho phép nhấn Fetch riêng cho từng remote mà không làm nghẽn kết nối mạng.

---

## ⚡ 4. 1-CLICK SMART SYNC WITH UPSTREAM

Component: `src/lib/components/Toolbar.svelte`

### Quy trình dòng lệnh thủ công truyền thống:
```bash
git fetch origin
git checkout main
git pull origin main
git checkout my-feature
git rebase main
```
Thao tác này mất từ 5 đến 7 bước, phải chuyển đổi checkout qua lại làm gián đoạn IDE và tốn thời gian biên dịch lại mã nguồn.

### Trải nghiệm 1-Chạm trên FlowGit:
- Ngay khi phát hiện nhánh của bạn bị tụt hậu so với Remote (hiển thị `↓ X commits`):
- Nút **"Smart Sync"** trên thanh Toolbar sẽ sáng đèn.
- Bạn chỉ cần bấm **1 cú click vào nút "Smart Sync"**:
  - Hệ thống tự động fetch các commit mới từ remote.
  - Tự động thực hiện Rebase ngầm nhánh hiện tại của bạn lên trên đỉnh của upstream.
  - Bạn **không bao giờ phải rời khỏi ngữ cảnh của nhánh đang code**.

---

## 🏷️ 5. QUẢN LÝ RELEASE TAGS

Component: `src/lib/components/CreateTagModal.svelte`

- Xem toàn bộ danh sách phiên bản phát hành (`v1.0.0`, `v1.1.0-beta`, v.v.) trên Sidebar và đồ thị.
- **Tạo Tag nhanh:** Nhấp chuột phải vào bất kỳ node commit nào trên đồ thị -> Chọn **"Create Tag Here"**.
- Hỗ trợ cả 2 chuẩn:
  - **Lightweight Tag:** Gắn nhãn con trỏ đơn giản.
  - **Annotated Tag:** Gắn kèm thông điệp phát hành và định danh người tạo.
- Xóa Tag an toàn bằng menu chuột phải.
