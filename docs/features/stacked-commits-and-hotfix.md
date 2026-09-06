<div align="center">

# 🥞 Stacked Commits & Quick Hotfix Workflow
### Chuỗi Commits Xếp Chồng & Vá Lỗi Cấp Tốc (Stacked Commits & Quick Hotfix)

> **Audience:** Senior Developers & Tech Leads – Managing local unpushed commit chains & urgent patching  
> **Components:** `StackedCommitsFlow`, `QuickHotfixModal`  
> **Backend IPC:** `get_unpushed_stacked_commits`, `reorder_stacked_commits`, `create_branch`, `create_worktree`  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🧭 1. Advanced Workflow Overview

In high-velocity engineering environments (such as Google and Meta):
1. **Stacked Commits / Stacked PRs:** Instead of opening massive 2,000-line PRs, developers partition features into a chain of 4–5 coherent commits. Before pushing, commits are reordered or split into layered branches.
2. **Quick Hotfix Workflow:** When production breaks, developers need to branch off clean production HEAD (`main`), patch, test, and release without disrupting dirty work on ongoing feature branches.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STACKED COMMITS & QUICK HOTFIX WORKFLOWS                                               │
│                                                                                        │
│  [Unpushed Local Commits]                                                              │
│  Commit C (feat: frontend UI) ──────┐                                                  │
│  Commit B (feat: backend API) ──────┼──► [StackedCommitsFlow.svelte]                   │
│  Commit A (refactor: database) ─────┘    - Drag-and-drop Reordering                    │
│                                          - Up/Down Arrow buttons                       │
│                                          - Persist new DAG order atomically            │
│                                                                                        │
│  [Production Emergency Incident!]                                                      │
│  Active Working Tree with dirty files                                                  │
│             │                                                                          │
│             ▼                                                                          │
│  [QuickHotfixModal.svelte] ──► Auto-generates `hotfix/quick-fix-YYYYMMDD`              │
│                                from clean upstream `main`                              │
│                                ➔ Safeguards 100% of dirty working files                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🥞 2. Stacked Commits Flow

Component: [`src/lib/components/StackedCommitsFlow.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/StackedCommitsFlow.svelte)  
Backend IPC: `get_unpushed_stacked_commits`, `reorder_stacked_commits`

### 2.1. Automated Detection of Unpushed Commits
- Queries `get_unpushed_stacked_commits`:
  - Isolates commits completed locally that have not yet been pushed to upstream tracking branches.
  - Visual cards display:
    - Commit message summary.
    - Author name and avatar.
    - Relative time (`20m ago`).
    - 7-character short SHA hash.

### 2.2. Visual Drag-and-Drop Reordering
- Replaces intricate CLI commands like `git rebase -i @{u}`:
  - Drag the vertical grip handle (`GripVertical`) to reorder commits.
  - Or use fast **ArrowUp / ArrowDown** buttons on each row.
- Clicking **"Save Order"**:
  - Rust backend executes `reorder_stacked_commits`.
  - Replays commits in the designated sequence via the in-memory sequencer.
  - Alerts developers immediately if swapping commits causes textual conflicts.

---

## ⚡ 3. Quick Hotfix Workflow

Component: [`src/lib/components/QuickHotfixModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/QuickHotfixModal.svelte)

### 3.1. Real-World Scenario
- You are halfway through editing 15 files on `feat/ai-copilot`.
- Production billing incurs a zero-day issue requiring an emergency patch.
- You need a 100% clean branch spawned off `main` to test, commit, and deploy within minutes.

### 3.2. 1-Click Quick Hotfix Experience
1. Click the flame icon **"Quick Hotfix"** on Toolbar or press `Ctrl + H`.
2. The modal appears:
   - **Standardized branch naming:** e.g., `hotfix/quick-fix-20260905-1230` with timestamp.
   - **Base Branch Selection:** Defaults to `main` or `master`.
   - **Safety Metrics:** Confirms active dirty files are preserved.
3. Click **"Create Hotfix Branch"**:
   - Spawns branch directly off `main`.
   - Transitions workspace cleanly, letting you patch, test, and commit within 2 minutes.
   - Return to your original feature branch once hotfix is merged.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🧭 1. TỔNG QUAN VỀ QUY TRÌNH NÂNG CAO

Trong các công ty công nghệ lớn (như Google, Meta) và các dự án Agile tốc độ cao:
1. **Mô hình Stacked Commits / Stacked PRs:** Thay vì tạo một Pull Request khổng lồ nặng 2,000 dòng code khiến người review ngán ngẩm, lập trình viên chia nhỏ thành chuỗi 4-5 commit độc lập có tính logic chặt chẽ. Trước khi push, cần sắp xếp lại thứ tự các commit hoặc chuẩn bị tách thành chuỗi các nhánh con.
2. **Quy trình Quick Hotfix:** Khi server gặp lỗi khẩn cấp, cần nhanh chóng tách nhánh từ bản phát hành mới nhất (`main` / `production tag`), sửa lỗi, kiểm tra mà không làm ảnh hưởng đến mã nguồn đang viết dở ở nhánh tính năng hiện tại.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ STACKED COMMITS & QUICK HOTFIX WORKFLOWS                                               │
│                                                                                        │
│  [Chưa push lên Remote]                                                                │
│  Commit C (feat: frontend UI) ──────┐                                                  │
│  Commit B (feat: backend API) ──────┼──► [StackedCommitsFlow.svelte]                   │
│  Commit A (refactor: database) ─────┘    - Kéo thả đổi thứ tự (Reorder)                │
│                                          - Nút bấm Di chuyển Lên/Xuống                 │
│                                          - Lưu thứ tự an toàn vào Git DAG              │
│                                                                                        │
│  [Sự cố Production phát sinh!]                                                         │
│  Working Tree đang dở dang (dirty files)                                               │
│             │                                                                          │
│             ▼                                                                          │
│  [QuickHotfixModal.svelte] ──► Tự động tạo nhánh `hotfix/quick-fix-YYYYMMDD`           │
│                                từ nhánh gốc `main` an toàn                             │
│                                ➔ Bảo vệ 100% working tree không bị stash đè lỗi        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🥞 2. QUẢN LÝ CHUỖI STACKED COMMITS (STACKED COMMITS FLOW)

Component: [`src/lib/components/StackedCommitsFlow.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/StackedCommitsFlow.svelte)  
Backend IPC: `get_unpushed_stacked_commits`, `reorder_stacked_commits`

### 2.1. Tự động Nhận diện Chuỗi Commits Chưa Push
- FlowGit truy vấn `get_unpushed_stacked_commits`:
  - Lọc ra chính xác danh sách các commit đã hoàn thành ở nhánh cục bộ nhưng chưa được push lên remote upstream.
  - Hiển thị từng khối commit trực quan kèm:
    - Tiêu đề commit message.
    - Avatar và tên tác giả.
    - Thời gian tương đối (`20m ago`).
    - Mã SHA rút gọn 7 ký tự.

### 2.2. Kéo-Thả Sắp Xếp Lại Thứ Tự (Visual Reordering)
- Thay vì phải gõ lệnh dòng lệnh phức tạp và dễ nhầm thứ tự như `git rebase -i @{u}`:
  - Người dùng nắm vào tay cầm kéo thả (`GripVertical`) để di chuyển vị trí commit lên/xuống.
  - Hoặc bấm các phím mũi tên nhanh **ArrowUp / ArrowDown** trên từng dòng.
- Khi nhấn nút **"Lưu Thứ Tự Mới" (Save Order)**:
  - Backend Rust gọi thuật toán `reorder_stacked_commits`:
  - Tự động áp dụng lại các commit theo thứ tự mới được chỉ định thông qua in-memory commit sequencer.
  - Nếu xảy ra xung đột nội dung giữa 2 commit hoán đổi, hệ thống lập tức thông báo để người dùng điều chỉnh lại.

---

## ⚡ 3. VÁ LỖI CẤP TỐC (QUICK HOTFIX WORKFLOW)

Component: [`src/lib/components/QuickHotfixModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/QuickHotfixModal.svelte)

### 3.1. Kịch bản Đời Thực
- Bạn đang sửa dở 15 file trên nhánh `feat/ai-copilot`.
- Hệ thống thanh toán trên bản phát hành Production gặp lỗi nghiêm trọng (Zero-day bug).
- Bạn cần một nhánh sạch 100% tách từ `main`, sửa lỗi, commit và đẩy lên để deploy ngay.

### 3.2. Trải Nghiệm 1-Click Quick Hotfix
1. Bấm biểu tượng ngọn lửa đỏ **"Quick Hotfix"** trên thanh Toolbar (hoặc phím tắt `Ctrl + H`).
2. Hộp thoại Quick Hotfix mở ra:
   - **Tự động đặt tên nhánh chuẩn:** Ví dụ `hotfix/quick-fix-20260905-1230` kèm timestamp chính xác.
   - **Chọn nhánh cơ sở (Base Branch):** Mặc định tự động chọn `main` hoặc `master`.
   - **Hiển thị chỉ số an toàn:** Báo cáo số lượng file bẩn đang có (`dirtyFilesCount`) và đảm bảo các file này được bảo toàn.
3. Khi bấm **"Khởi Tạo Nhánh Hotfix"**:
   - Nhánh mới được tạo lập tức từ đỉnh nhánh `main`.
   - Chuyển không gian làm việc an toàn, cho phép bạn viết bản sửa lỗi, chạy test và tạo commit nóng trong vòng 2 phút.
   - Sau khi hotfix được merge vào production, bạn có thể chuyển lại nhánh tính năng ban đầu tiếp tục làm việc bình thường.
