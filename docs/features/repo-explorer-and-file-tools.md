<div align="center">

# 📂 Repository Explorer & Deep File Tooling
### Khám Phá Kho Lưu Trữ & Bộ Công Cụ Tệp Tin Chuyên Sâu (Repo Explorer & File Tools)

> **Subsystem:** Tree Exploration, Multi-Point Comparison, Interactive Blame & History Nuking  
> **Components:** `RepositoryExplorer`, `ComparisonViewer`, `FileHistoryModal`, `NukeHistoryModal`  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🧭 1. File Tooling Overview

Beyond branch and commit lifecycle management, developers routinely require:
1. **Tree Traversal without Checkout:** Browse directory structures at historical commits without dirtying the working directory.
2. **Comparison Viewer:** Deep diff inspection between any two commits or branches (comparable to GitHub Compare `base...head` but 100% offline).
3. **Interactive Line Blame:** Inspect who modified each line, when, and with what commit message.
4. **File History Timeline:** Follow chronological mutations of a single file across years of history.
5. **History Nuker:** Permanently eradicate `.env` credentials, API tokens, or 100MB+ binaries across 100% of Git history.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ EXPLORATION & DEEP FILE TOOLING SUITE                                                  │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ RepositoryExplorer.svelte (Directory Tree & Monaco Code Preview)                 │  │
│  │ ├── Browse directory tree at HEAD or arbitrary Commit OID (getTreeEntries)       │  │
│  │ ├── Realtime file search & Monaco Syntax Highlighted Code Viewer                 │  │
│  │ ├── Interactive Blame Toggle (Author per line, commit metadata hover tooltip)    │  │
│  │ └── Context Menu: Copy Path, View File History, Nuke File from History           │  │
│  └───────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                      │                                                 │
│             ┌────────────────────────┼────────────────────────┐                        │
│             ▼                        ▼                        ▼                        │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────────────┐    │
│  │ ComparisonViewer     │ │ FileHistoryModal     │ │ NukeHistoryModal             │    │
│  │ ├── Compare 2 commits│ │ ├── Dedicated single │ │ ├── BFG / git-filter-repo    │    │
│  │ ├── Changed files    │ │ │   file timeline    │ │ ├── Permanent file deletion  │    │
│  │ └── Monaco Diff View │ │ └── Inline Blame/Diff│ │ │   across entire Git history│    │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 2. Repository Explorer

Component: [`src/lib/components/RepositoryExplorer.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/RepositoryExplorer.svelte)  
Backend IPC: `get_tree_entries`, `get_file_content`

### 2.1. Tree Browsing Without Checkout
- Switch seamlessly between the **active Working Tree** and **historical Tree at any commit OID**.
- Expand subdirectories with animated folder/file icons (Code, JSON, Text, Binary, Folder).
- **Realtime File Filter (`treeSearchQuery`):** Instant search filtering within the tree.

### 2.2. Integrated Monaco Code Preview
- Click any file: loaded via `get_file_content` into **Monaco Editor**:
  - Full syntax highlighting for 50+ languages.
  - Line numbers, minimap, and word wrap.
  - Automated detection and warning flags for large binary files (`is_binary: true`).

---

## 🕵️ 3. Interactive Line Blame

Component: [`src/lib/components/RepositoryExplorer.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/RepositoryExplorer.svelte)  
Backend IPC: `get_file_blame`

Click **"Toggle Blame"** in the Monaco viewer:
1. Backend runs multi-threaded `git2::Blame` returning `BlameHunkItem[]`.
2. Dedicated gutter renders along the left margin:
   - **Avatar & Author Name:** Highlights who modified the line.
   - **Relative Time:** E.g., `2 days ago`, `3 months ago`.
   - **Short SHA:** 7-character commit hash.
3. **Interactive Features:**
   - **Hover:** Displays commit message and full timestamp tooltip.
   - **Click:** Fires `onSelectCommit(commitId)`, panning the Living Graph camera to focus the commit node.

---

## 📜 4. File History Timeline

Component: [`src/lib/components/FileHistoryModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/FileHistoryModal.svelte)  
Backend IPC: `get_file_history`

To investigate evolution of a critical file:
1. Right-click file in Explorer ➔ **"View File History"**.
2. Opens dedicated timeline filtered strictly to commits affecting this file (`git log --follow -p -- <file>`).
3. Click any commit to view historical file content and predecessor diff.

---

## ⚖️ 5. Comparison Viewer (Compare Any 2 Commits)

Component: [`src/lib/components/ComparisonViewer.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/ComparisonViewer.svelte)  
Backend IPC: `compare_two_commits`

- Select any 2 commits or branches on graph or via Toolbar:
  - `base_id`: Baseline commit (e.g., `main`).
  - `target_id`: Target commit (e.g., `feature/payment`).
- Displays changed files list with `+` / `-` line counters and opens **Monaco Diff Editor** in Split or Unified view without checking out branches.

---

## ☢️ 6. History Nuker (Permanent File Eradication)

Component: [`src/lib/components/NukeHistoryModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/NukeHistoryModal.svelte)  
Backend IPC: `nuke_file_from_history`

When secrets, passwords, or huge binaries are committed:
1. Right-click sensitive file in Explorer ➔ **"Nuke File from History"**.
2. Review security confirmation modal.
3. Rust backend executes `nuke_file_from_history`, recursively traversing commit trees, removing all corresponding blobs, and rebuilding ancestor links consistently.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🧭 1. TỔNG QUAN BỘ CÔNG CỤ TỆP TIN

Ngoài việc quản lý luồng commit và nhánh, lập trình viên thường xuyên cần:
1. **Duyệt cây tệp tin mà không cần checkout:** Xem cấu trúc file tại một commit cũ từ nhiều tháng trước mà không phải checkout làm bẩn working tree.
2. **So sánh 2 mốc bất kỳ (Comparison Viewer):** Kiểm tra sự khác biệt toàn diện giữa 2 nhánh hoặc 2 commit bất kỳ (tương tự tính năng GitHub Compare `base...head` nhưng hoạt động hoàn toàn offline).
3. **Soi vết từng dòng code (Interactive Blame):** Biết chính xác ai đã viết từng dòng, viết vào ngày nào và vì mục đích gì.
4. **Theo dõi dòng đời của tệp (File History Timeline):** Lọc toàn bộ commit từng can thiệp vào một file đơn lẻ qua nhiều năm phát triển.
5. **Thanh trừng dữ liệu nhạy cảm (History Nuker):** Xóa triệt để tệp `.env`, API key, mật khẩu hoặc file dung lượng khổng lồ khỏi 100% lịch sử Git.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BỘ CÔNG CỤ KHÁM PHÁ & XỬ LÝ TỆP TIN                                                    │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ RepositoryExplorer.svelte (Cây tệp tin & Monaco Code Preview)                    │  │
│  │ ├── Duyệt cây thư mục tại HEAD hoặc Commit chỉ định (getTreeEntries)             │  │
│  │ ├── Tìm kiếm tệp realtime & Mở xem code cú pháp chuẩn bằng Monaco                │  │
│  │ ├── Interactive Blame Toggle (Soi tác giả từng dòng, hover xem commit message)   │  │
│  │ └── Context Menu: Copy Path, View File History, Nuke File from History           │  │
│  └───────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                      │                                                 │
│             ┌────────────────────────┼────────────────────────┐                        │
│             ▼                        ▼                        ▼                        │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────────────┐    │
│  │ ComparisonViewer     │ │ FileHistoryModal     │ │ NukeHistoryModal             │    │
│  │ ├── So sánh 2 commits│ │ ├── Dòng thời gian   │ │ ├── BFG / git-filter-repo    │    │
│  │ ├── Danh sách tệp sửa│ │ │   riêng cho 1 tệp  │ │ ├── Xóa tệp vĩnh viễn khỏi   │    │
│  │ └── Monaco Diff View │ │ └── Inline Blame/Diff│ │ │   toàn bộ lịch sử repo     │    │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 2. TRÌNH DUYỆT CÂY TỆP TIN KHO LƯU TRỮ (REPOSITORY EXPLORER)

Component: [`src/lib/components/RepositoryExplorer.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/RepositoryExplorer.svelte)  
Backend IPC: `get_tree_entries`, `get_file_content`

### 2.1. Khám phá cây thư mục không cần Checkout
- Cho phép người dùng chuyển đổi giữa chế độ xem **Working Tree hiện tại** hoặc **Cây thư mục tại một Commit OID bất kỳ**.
- Nhấp mở các thư mục con theo cấu trúc phân cấp mượt mà, phân loại icon theo đuôi tệp tự động (Code, JSON, Text, Binary, Folder).
- **Bộ lọc tìm kiếm tệp realtime (`treeSearchQuery`):** Gõ tên tệp để lọc tức thì các file trong cây thư mục.

### 2.2. Tích hợp Trình xem mã nguồn Monaco Editor
- Nhấp chuột vào bất kỳ tệp văn bản nào trong cây: Nội dung được tải nhanh qua `get_file_content` và hiển thị bằng **Monaco Editor** với đầy đủ tính năng:
  - Tô màu cú pháp (Syntax Highlighting) cho hơn 50 ngôn ngữ lập trình.
  - Hiển thị số dòng, bản đồ thu nhỏ (Minimap), tự động ngắt dòng (Word Wrap).
  - Tự động nhận diện và cảnh báo nếu phát hiện tệp nhị phân lớn (`is_binary: true`).

---

## 🕵️ 3. SOI VẾT TỪNG DÒNG CODE (INTERACTIVE GIT BLAME)

Component: [`src/lib/components/RepositoryExplorer.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/RepositoryExplorer.svelte)  
Backend IPC: `get_file_blame`

Khi mở một tệp trong Repository Explorer và bấm nút **"Toggle Blame"**:
1. Backend Rust chạy giải thuật `git2::Blame` đa luồng, trả về danh sách `BlameHunkItem[]`.
2. Một cột gutter chuyên dụng xuất hiện dọc theo lề trái của Monaco Editor:
   - **Avatar & Tên tác giả:** Nhận diện người đã sửa đổi dòng code đó.
   - **Thời gian tương đối:** Hiển thị thời gian ngắn gọn (ví dụ: `2 ngày trước`, `3 tháng trước`).
   - **Mã commit SHA ngắn:** 7 ký tự đầu của commit.
3. **Tương tác trực quan nâng cao:**
   - **Hover chuột vào dòng:** Hiển thị popup tooltip đầy đủ thông điệp commit message và ngày giờ chính xác.
   - **Click vào dòng:** Lập tức kích hoạt sự kiện `onSelectCommit(commitId)`, đưa camera của Living Graph nhảy đến đúng vị trí commit đó trên đồ thị phân nhánh.

---

## 📜 4. DÒNG THỜI GIAN LỊCH SỬ TỆP ĐƠN LẺ (FILE HISTORY TIMELINE)

Component: [`src/lib/components/FileHistoryModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/FileHistoryModal.svelte)  
Backend IPC: `get_file_history`

Khi muốn điều tra toàn bộ quá trình biến đổi của một file logic quan trọng qua nhiều năm:
1. Nhấp chuột phải vào tệp trong Explorer ➔ Chọn **"View File History"**.
2. Một modal chuyên biệt mở ra, hiển thị dòng thời gian thu hẹp:
   - Chỉ liệt kê các commit có tác động thay đổi lên chính tệp đó (tương đương cờ `git log --follow -p -- <file>`).
   - Nhấp vào từng mốc commit trên danh sách để xem ngay nội dung tệp tại thời điểm đó và sự khác biệt (Diff) so với commit trước đó.
   - Giúp tìm kiếm thời điểm phát sinh hồi quy (Regression Bug) một cách chính xác trong vài giây.

---

## ⚖️ 5. BỘ SO SÁNH 2 MỐC BẤT KỲ (COMPARISON VIEWER)

Component: [`src/lib/components/ComparisonViewer.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/ComparisonViewer.svelte)  
Backend IPC: `compare_two_commits`

### 5.1. So sánh tùy ý giữa 2 Commit hoặc 2 Nhánh
- Bằng cách chọn 2 commit trên Living Graph hoặc bấm **"Compare Commits"** từ thanh Toolbar:
  - Tham số `base_id`: Commit cơ sở (ví dụ: đỉnh nhánh `main`).
  - Tham số `target_id`: Commit mục tiêu (ví dụ: đỉnh nhánh `feature/payment`).
- Hệ thống trả về `ComparisonResult`:
  - Số lượng commit chênh lệch giữa 2 mốc.
  - Danh sách toàn bộ các file bị thay đổi (Added, Modified, Deleted) kèm thống kê số dòng `+` và `-`.

### 5.2. Chế độ Monaco Diff Split & Unified
- Nhấp vào từng file trong danh sách so sánh để mở **Monaco Diff Editor**:
  - Hỗ trợ chuyển đổi linh hoạt giữa chế độ **Split View** (2 cột song song) và **Unified View** (1 cột nối tiếp).
  - Tự động đối chiếu nội dung thực tế giữa 2 mốc mà không cần checkout nhánh.

---

## ☢️ 6. THANH TRÙNG DỮ LIỆU LỊCH SỬ AN TOÀN (HISTORY NUKER)

Component: [`src/lib/components/NukeHistoryModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/NukeHistoryModal.svelte)  
Backend IPC: `nuke_file_from_history`

### 6.1. Vấn đề nghiêm trọng trong phát triển phần mềm
Lập trình viên vô tình commit file `.env` chứa mật khẩu cơ sở dữ liệu hoặc khóa API AWS/OpenAI, sau đó commit tiếp vài chục lần nữa rồi mới phát hiện.
- Lệnh `git rm .env` và commit mới **không hề bảo vệ bạn**: Mật khẩu vẫn nằm nguyên vẹn trong lịch sử Git các commit trước đó và hacker có thể dễ dàng checkout lại.
- Các công cụ như `git-filter-branch` hay `bfg-repo-cleaner` rất phức tạp, dễ gõ nhầm làm hỏng cả kho lưu trữ.

### 6.2. Giải pháp History Nuker của FlowGit
1. Trong Repository Explorer, nhấp chuột phải vào file nhạy cảm ➔ Chọn **"Nuke File from History"**.
2. Hộp thoại cảnh báo bảo mật màu đỏ xuất hiện:
   - Yêu cầu xác nhận nhận thức rõ rủi ro viết lại lịch sử (Rewrite Git DAG).
   - Tự động tạo bản sao lưu an toàn trước khi thực thi.
3. Khi bấm **"Thực Hiện Xóa Vĩnh Viễn"**:
   - Backend Rust gọi thuật toán `nuke_file_from_history`: Quét đệ quy toàn bộ cây commit của repository và xóa sạch blob của tệp đó khỏi mọi tree object.
   - Viết lại các commit ID cha-con một cách nhất quán.
   - Sau khi hoàn tất, tệp hoàn toàn biến mất khỏi mọi nhánh và commit cũ, bảo vệ an toàn tuyệt đối cho dự án của bạn.
