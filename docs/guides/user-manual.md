# HƯỚNG DẪN SỬ DỤNG & BẢNG TRA CỨU PHÍM TẮT (USER MANUAL)
> **Dành cho Người Dùng:** Hướng dẫn làm chủ giao diện FlowGit và khai thác tối đa hiệu năng công việc

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

1. **Top Toolbar:** Chứa các thao tác 1-chạm quan trọng nhất: Mở Repo, Tạo nhánh, Smart Sync, Quick Hotfix, Thùng rác Safe Trash, Time Machine, Command Palette và Cài đặt.
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
| **`F1`** hoặc **`Ctrl + /`** | Mở **FlowGit Playbook & Sổ tay Hướng dẫn** tra cứu kịch bản giải cứu. |
| **`Ctrl + B`** | Đóng / Mở thanh Sidebar bên trái để mở rộng không gian đọc đồ thị. |
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
| **`Ctrl + Enter`** | Thực hiện **Commit** ngay lập tức với nội dung trong Commit Box. |
| **`Ctrl + Shift + S`**| **Stage All**: Đưa toàn bộ các thay đổi vào Staged Area (`git add -A`). |
| **`Ctrl + Shift + U`**| **Unstage All**: Đưa toàn bộ các file ra khỏi Staged Area. |

### Lưới an toàn No-Fear Git (Safety):
| Phím tắt | Chức năng thực thi |
| :--- | :--- |
| **`Ctrl + Z`** | **Undo Time Machine**: Hoàn tác hành động Git vừa thực hiện về quá khứ an toàn. |
| **`Ctrl + Shift + Z`** (hoặc `Ctrl + Y`)| **Redo Time Machine**: Làm lại hành động vừa hoàn tác. |
| **`Ctrl + T`** | Mở ngăn kéo **Safe Recycle Bin (Trash Inspector)** để khôi phục code đã discard. |

---

## 💡 3. MẸO SỬ DỤNG HIỆU QUẢ CAO CHO TECH LEAD & SENIOR DEV

1. **Làm việc với Monorepo siêu lớn (> 100k commits):**  
   Đừng lo lắng về bộ nhớ RAM hay giật lag. FlowGit tự động phân trang tải lười 500 commit/lần. Khi bạn cuộn chuột xuống sâu, hệ thống sẽ tự động nối các đường cong Bezier tiếp theo liền mạch mà không làm đứt đoạn đồ thị.
2. **Trước khi Rebase một nhánh dài:**  
   Hãy dùng chuột kéo nhánh đó và rê qua nhánh đích để kích hoạt **Ghost Preview**. Nếu thấy viền node chuyển sang màu cam, bạn biết trước sẽ có xung đột và có thể chuẩn bị tinh thần hoặc mở **Conflict Resolver**.
3. **Thường xuyên bấm "Clean Merged Branches":**  
   Vào cuối mỗi tuần hoặc cuối mỗi Sprint, hãy bấm biểu tượng chiếc chổi trên Sidebar để quét sạch các nhánh local thừa, giữ cho workspace luôn ngăn nắp và tinh gọn.
