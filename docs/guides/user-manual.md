# HƯỚNG DẪN SỬ DỤNG & BẢNG TRA CỨU PHÍM TẮT (USER MANUAL)
> **Dành cho Người Dùng:** Hướng dẫn làm chủ giao diện FlowGit và khai thác tối đa hiệu năng công việc  
> **Cập nhật:** Chuẩn công nghệ 2026 – Đầy đủ GitHub Workspace, PR Reviewer, File Tools & In-App Guide

---

## 🖥️ 1. BỐ CỤC GIAO DIỆN CHÍNH (SCREEN ANATOMY)

Giao diện của FlowGit được thiết kế chuẩn mực 3 cột linh hoạt (Three-Column Split Layout), hỗ trợ co giãn mượt mà và chuyển đổi linh hoạt giữa màn hình ngang (Horizontal) và màn hình dọc (Vertical):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [≡] FlowGit 2026   [📂 Open]  [🌿 Branch]  [⚡ Sync]  [🗑️ Trash]  [⏳ Undo]  [🔍 Ctrl+K] │  <- Toolbar
├──────────────┬──────────────────────────────────────────┬──────────────────────────────┤
│ SIDEBAR      │ LIVING COMMIT GRAPH / DAG MAP            │ WORKING TREE / DIFF VIEWER   │
│              │                                          │                              │
│ ▼ Branches   │ ● [main] feat: thanh toán tự động        │ ▼ Staged Files               │
│   ● main     │ │                                        │   ● M src/App.svelte         │
│   ● feat/auth│ ● [feat/auth] feat: OAuth device flow    │                              │
│              │ │/                                       │ ▼ Unstaged Files             │
│ ▼ Remotes    │ ● chore: phát hành phiên bản v1.2.0      │   ● M src/lib/Toolbar.svelte │
│   ● origin   │                                          │                              │
│   ● upstream │                                          │ [Commit Message Input Box]   │
│              │                                          │ [AI Generate ✨] [Commit]    │
├──────────────┴──────────────────────────────────────────┴──────────────────────────────┤
│ 👤 John Doe <john@company.com> [Local]  |  🌿 main  |  ↑ 0 ↓ 0  |  UTF-8  |  60 FPS     │  <- StatusBar
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Top Toolbar:** Chứa các thao tác 1-chạm quan trọng nhất: Mở Repo, Tạo nhánh, Smart Sync, Quick Hotfix, Thùng rác Safe Trash, Time Machine, Pull Requests, Explorer, Command Palette và Cài đặt.
2. **Left Sidebar:** Cây danh mục phân cấp: Nhánh Local, Nhánh Remote, Tags, Stashes, Remotes Hub, Submodules và Git Worktrees.
3. **Center Graph (Đồ thị Trung tâm):** Living Commit Graph 60 FPS được vẽ bởi Web Worker. Hỗ trợ cuộn ảo phân trang vô hạn, kéo thả commit, hiển thị avatar và badges.
4. **Right Panel (Working Tree & Diff):** Danh sách các file thay đổi, Diff Viewer trực quan (Split/Unified), hỗ trợ stage từng dòng bằng phím `Space`, và Commit Box hỗ trợ AI.
5. **Bottom StatusBar:** Hiển thị danh tính Git hiện tại (`user.name` / `user.email`), trạng thái Ahead/Behind, cảnh báo Detached HEAD và chỉ số khung hình FPS.

---

## ⌨️ 2. BẢNG PHÍM TẮT TOÀN NĂNG (SHORTCUTS CHEAT SHEET)

FlowGit được trang bị hệ thống phím tắt 1 ký tự và tổ hợp phím tiêu chuẩn cao giúp thao tác nhanh gấp 5 lần so với chuột thông thường:

### Điều hướng & Mở nhanh (Navigation):
| Phím tắt | Chức năng thực thi |
| :--- | :--- |
| **`Ctrl + K`** (hoặc `Cmd + K`) | Mở **Command Palette** tìm kiếm nhanh nhánh, commit, tag hoặc chạy lệnh. |
| **`F1`** hoặc **`?`** | Mở **Interactive User Guide (Sổ tay hướng dẫn & bài học thực chiến)**. |
| **`Ctrl + /`** | Mở **Git Playbook Modal (Bộ giải cứu sự cố Git tại chỗ)**. |
| **`Ctrl + B`** | Đóng / Mở thanh Sidebar bên trái để mở rộng không gian đọc đồ thị. |
| **`Ctrl + E`** | Mở **Repository Explorer (Duyệt cây file & Monaco Code Viewer)**. |
| **`Ctrl + Shift + P`** | Mở không gian **GitHub Pull Request Reviewer**. |
| **`Ctrl + H`** | Mở hộp thoại **Quick Hotfix (Vá lỗi cấp tốc từ nhánh chính)**. |
| **`Ctrl + I`** | Mở hộp thoại **Trợ lý AI Cục bộ (AI Assistant Modal)**. |

### Thao tác trên Đồ thị & Commit (Graph Operations):
| Phím tắt | Chức năng thực thi |
| :--- | :--- |
| **`B`** | Mở nhanh hộp thoại **Tạo nhánh mới (Create Branch)** tại commit đang chọn. |
| **`T`** | Mở nhanh hộp thoại **Tạo Release Tag**. |
| **`S`** | **Gộp Commit (Squash)**: Bôi đen nhiều commit liên tiếp ➔ bấm `S` để gộp thành 1. |
| **`Ctrl + C`** | Sao chép nhanh mã Hash (SHA) đầy đủ của commit đang chọn vào Clipboard. |
| **`Delete`** | Mở hộp thoại xóa nhánh hoặc xóa tag đang được chọn. |

### Thao tác Working Tree & Diff Viewer:
| Phím tắt | Chức năng thực thi |
| :--- | :--- |
| **`Space` (Phím Cách)** | **Stage / Unstage Hunk**: Đưa khối code đang trỏ chuột vào hoặc ra khỏi Staged Area. |
| **`Ctrl + Enter`** | Thực hiện **Commit** ngay lập tức với nội dung trong Commit Box (có Pre-Commit Guard quét secret). |
| **`Ctrl + Shift + S`**| **Stage All**: Đưa toàn bộ các thay đổi vào Staged Area (`git add -A`). |
| **`Ctrl + Shift + U`**| **Unstage All**: Đưa toàn bộ các file ra khỏi Staged Area. |

### Lưới an toàn No-Fear Git (Safety):
| Phím tắt | Chức năng thực thi |
| :--- | :--- |
| **`Ctrl + Z`** | **Undo Time Machine**: Hoàn tác hành động Git vừa thực hiện về quá khứ an toàn. |
| **`Ctrl + Shift + Z`** (hoặc `Ctrl + Y`)| **Redo Time Machine**: Làm lại hành động vừa hoàn tác. |
| **`Ctrl + T`** | Mở ngăn kéo **Safe Recycle Bin (Trash Inspector)** để khôi phục code đã discard. |

---

## 🐙 3. HƯỚNG DẪN REVIEW GITHUB PULL REQUESTS TRONG APP

1. **Kết nối tài khoản:** Mở Identity Switcher hoặc Settings ➔ Nhập GitHub Personal Access Token (PAT) hoặc sử dụng Device Code Flow.
2. **Mở PR Reviewer:** Nhấn vào tab **"Pull Requests"** trên thanh Toolbar (hoặc phím tắt `Ctrl + Shift + P`).
3. **Xem khác biệt mã nguồn:** Nhấp vào bất kỳ PR nào ➔ Chọn file thay đổi để xem trên **Monaco Diff Editor**.
4. **Viết nhận xét & Đánh giá:** Gõ phản hồi trong tab Thảo luận, bấm **Approve** hoặc **Request Changes**.
5. **Checkout & Test thử:** Bấm nút **"Checkout PR Branch"** để kéo nhánh PR về máy chạy thử trực tiếp.
6. **Merge PR:** Chọn 1 trong 3 kiểu merge (`Merge Commit`, `Squash`, `Rebase`) và xác nhận.

---

## 📂 4. HƯỚNG DẪN KHÁM PHÁ TỆP & TẨY XÓA LỊCH SỬ

1. **Khám phá cây tệp tin:** Mở Repository Explorer (`Ctrl + E`), chọn commit bất kỳ trên dropdown để xem cây file tại thời điểm đó mà không cần checkout.
2. **Soi vết Blame:** Mở file bất kỳ ➔ Bấm **"Toggle Blame"** để xem tác giả từng dòng và nhảy đến commit liên quan.
3. **So sánh 2 commit bất kỳ:** Bôi đen 2 node trên graph hoặc bấm "Compare Commits" để xem toàn bộ diff giữa 2 mốc thời gian.
4. **Tẩy xóa file nhạy cảm (History Nuker):** Nhấp chuột phải vào file `.env` hoặc file secret trong Explorer ➔ Chọn **"Nuke File from History"** ➔ Xác nhận xóa sạch khỏi toàn bộ lịch sử Git.

---

## 💡 5. MẸO SỬ DỤNG HIỆU QUẢ CAO CHO SENIOR DEV & TECH LEAD

1. **Tránh xung đột bằng Ghost Preview:**  
   Trước khi thả chuột để Rebase hoặc Merge một commit, hãy nhìn vào viền node mục tiêu. Nếu viền phát sáng màu cam đỏ, nghĩa là có conflict. Bạn có thể hủy thao tác bằng cách nhấn phím `Escape`.
2. **Tận dụng Safe Discard:**  
   Nếu bạn muốn thử nghiệm một giải pháp code hoàn toàn mới nhưng ngại làm rối working tree, cứ thoải mái bấm **"Discard All"**. Mã nguồn cũ sẽ được cất vào **Trash Inspector** trong 48 giờ. Nếu giải pháp mới thất bại, bạn chỉ cần bấm "Restore" để lấy lại code cũ.
3. **Tận dụng Quick Hotfix & Worktrees:**  
   Khi có bug gấp trên Production, không cần `git stash` hay lo sợ conflict code đang viết dở. Nhấn `Ctrl + H` để tạo nhánh hotfix an toàn từ `main`, hoàn tất vá lỗi và quay lại tính năng đang code nguyên vẹn 100%.
4. **Bách khoa toàn thư tại chỗ `F1`:**  
   Bất cứ khi nào bạn hoặc đồng nghiệp chưa rõ cách giải quyết một bài toán Git thực tế, hãy bấm phím `F1` để mở **Interactive User Guide** với các bước hướng dẫn trực quan kèm ví dụ minh họa chi tiết.
