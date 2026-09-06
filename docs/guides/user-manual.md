<div align="center">

# 📖 FlowGit User Manual & Shortcut Cheat Sheet
### Hướng Dẫn Sử Dụng & Bảng Tra Cứu Phím Tắt Toàn Năng

> **Audience:** End Users & Teams – Mastering FlowGit UI and maximizing productivity  
> **Edition:** 2026 State-of-the-Art – GitHub Workspace, PR Reviewer, File Tools & In-App Guide  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🖥️ 1. Screen Anatomy

FlowGit features a standard Three-Column Split Layout supporting dynamic resizing and seamless toggling between horizontal and vertical layouts:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [≡] FlowGit 2026   [📂 Open]  [🌿 Branch]  [⚡ Sync]  [🗑️ Trash]  [⏳ Undo]  [🔍 Ctrl+K] │  <- Toolbar
├──────────────┬──────────────────────────────────────────┬──────────────────────────────┤
│ SIDEBAR      │ LIVING COMMIT GRAPH / DAG MAP            │ WORKING TREE / DIFF VIEWER   │
│              │                                          │                              │
│ ▼ Branches   │ ● [main] feat: automated billing         │ ▼ Staged Files               │
│   ● main     │ │                                        │   ● M src/App.svelte         │
│   ● feat/auth│ ● [feat/auth] feat: OAuth device flow    │                              │
│              │ │/                                       │ ▼ Unstaged Files             │
│ ▼ Remotes    │ ● chore: release version v1.2.0          │   ● M src/lib/Toolbar.svelte │
│   ● origin   │                                          │                              │
│   ● upstream │                                          │ [Commit Message Input Box]   │
│              │                                          │ [AI Generate ✨] [Commit]    │
├──────────────┴──────────────────────────────────────────┴──────────────────────────────┤
│ 👤 John Doe <john@company.com> [Local]  |  🌿 main  |  ↑ 0 ↓ 0  |  UTF-8  |  60 FPS     │  <- StatusBar
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Top Toolbar:** Houses 1-click core actions: Open Repo, Create Branch, Smart Sync, Quick Hotfix, Safe Trash, Time Machine, Pull Requests, Explorer, Command Palette, and Settings.
2. **Left Sidebar:** Hierarchical tree: Local Branches, Remote Branches, Tags, Stashes, Remotes Hub, Submodules, and Git Worktrees.
3. **Center Graph:** 60 FPS Living Commit Graph powered by a Web Worker. Supports virtualized scrolling, drag-and-drop actions, author avatars, and status badges.
4. **Right Panel (Working Tree & Diff):** Changed files list, visual Diff Viewer (Split/Unified), single-line staging via `Space`, and AI-assisted Commit Box.
5. **Bottom StatusBar:** Displays current Git committer (`user.name` / `user.email`), Ahead/Behind counts, Detached HEAD warnings, and live FPS counters.

---

## ⌨️ 2. Comprehensive Shortcuts Cheat Sheet

### Navigation:
| Shortcut | Action |
| :--- | :--- |
| **`Ctrl + K`** (or `Cmd + K`) | Opens **Command Palette** to search branches, commits, tags, or execute actions. |
| **`F1`** or **`?`** | Opens **Interactive User Guide (Tutorials & best practices)**. |
| **`Ctrl + /`** | Opens **Git Playbook Modal (On-the-fly emergency rescue wizard)**. |
| **`Ctrl + B`** | Toggle Left Sidebar to maximize graph viewing space. |
| **`Ctrl + E`** | Opens **Repository Explorer (Tree traversal & Monaco Code Viewer)**. |
| **`Ctrl + Shift + P`** | Opens **GitHub Pull Request Reviewer**. |
| **`Ctrl + H`** | Opens **Quick Hotfix Modal (Immediate patch branch from main)**. |
| **`Ctrl + I`** | Opens **Local AI Assistant Modal**. |

### Graph & Commit Operations:
| Shortcut | Action |
| :--- | :--- |
| **`B`** | Opens **Create Branch** modal at selected commit. |
| **`T`** | Opens **Create Release Tag** modal. |
| **`S`** | **Squash Commits**: Select multiple commits ➔ press `S` to combine into one. |
| **`Ctrl + C`** | Copies full commit SHA hash to Clipboard. |
| **`Delete`** | Prompts deletion of selected branch or tag. |

### Working Tree & Diff Viewer:
| Shortcut | Action |
| :--- | :--- |
| **`Space`** | **Stage / Unstage Hunk**: Stages or unstages the focused code hunk. |
| **`Ctrl + Enter`** | Immediately **Commits** staged changes (monitored by Pre-Commit Secret Guard). |
| **`Ctrl + Shift + S`**| **Stage All**: Stages all dirty files (`git add -A`). |
| **`Ctrl + Shift + U`**| **Unstage All**: Unstages all staged files. |

### No-Fear Git Safety:
| Shortcut | Action |
| :--- | :--- |
| **`Ctrl + Z`** | **Time Machine Undo**: Reverts the last Git operation to a safe historical state. |
| **`Ctrl + Shift + Z`** (or `Ctrl + Y`)| **Time Machine Redo**: Replays previously undone operation. |
| **`Ctrl + T`** | Opens **Safe Recycle Bin (Trash Inspector)** to restore discarded code. |

---

## 🐙 3. In-App GitHub PR Review Guide

1. **Authenticate Account:** Open Identity Switcher or Settings ➔ enter GitHub Personal Access Token (PAT) or use Device Code Flow.
2. **Open PR Reviewer:** Click the **"Pull Requests"** tab on Toolbar or press `Ctrl + Shift + P`.
3. **Inspect Code Diff:** Click any PR ➔ select changed files to view inside **Monaco Diff Editor**.
4. **Submit Feedback:** Write comments in the Discussion tab; click **Approve** or **Request Changes**.
5. **Local Checkout & Testing:** Click **"Checkout PR Branch"** to test changes locally.
6. **Merge PR:** Choose merge strategy (`Merge Commit`, `Squash`, `Rebase`) and confirm.

---

## 📂 4. Exploring Files & Nuking History

1. **Repository Explorer:** Open Explorer (`Ctrl + E`), select any historical commit on the dropdown to browse files without checking out.
2. **Blame Inspection:** Open any file ➔ click **"Toggle Blame"** to inspect author per line and jump to associated commits.
3. **Compare Any 2 Commits:** Select two nodes on the graph to view complete file diffs.
4. **Permanently Nuke Secrets (History Nuker):** Right-click `.env` or leaked credentials in Explorer ➔ choose **"Nuke File from History"** to purge from the entire Git DAG.

---

## 💡 5. Best Practices for Senior Developers & Tech Leads

1. **Anticipate Conflicts via Ghost Preview:** Observe target node borders while dragging. An amber-rose glow indicates potential conflict; press `Escape` to cancel.
2. **Leverage Safe Discard for Rapid Prototyping:** Experiment fearlessly by clicking "Discard All"; previous changes remain recoverable in the **Trash Inspector** for 48 hours.
3. **Use Quick Hotfix & Worktrees:** Never stash ongoing feature work to fix urgent production bugs. Press `Ctrl + H` to spawn an isolated hotfix worktree instantly.
4. **On-Demand Reference (`F1`):** Press `F1` anytime to launch the built-in guide with interactive step-by-step solutions.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

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
