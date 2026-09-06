<div align="center">

# 📖 Interactive Onboarding, Git Playbook & Pre-Commit Safety
### Hệ Thống Trợ Giúp, Sổ Tay Cứu Hộ & Bảo Vệ Tương Tác (Onboarding & Playbook)

> **Goal:** Ensure no developer ever gets stranded when facing complex Git issues  
> **Components:** `UserGuideModal`, `GitPlaybookModal`, `PreCommitWarningModal`, `RepoAlertBanner`  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🧭 1. In-App Guidance Philosophy

When encountering challenging Git situations (stuck rebase conflicts, detached HEAD, committing to the wrong branch, stale `.git/index.lock`, or leaked credentials):
- Developers often panic, searching StackOverflow for terminal commands.
- Copying hazardous CLI commands (`git reset --hard`, `rm -f .git/index.lock`, `git rebase --skip`) risks irreversible data loss.

**FlowGit packages complete operational rescue into intuitive 1-click workflows:**
1. **Interactive User Guide (`UserGuideModal.svelte`):** Comprehensive knowledge base launched with `F1` or `?`.
2. **Interactive Git Playbook (`GitPlaybookModal.svelte`):** Self-healing incident response with 1-click rescue buttons.
3. **Pre-Commit Safety Guard (`PreCommitWarningModal.svelte`):** Proactive heuristic scanner intercepting secrets.
4. **In-Progress Status Banner (`RepoAlertBanner.svelte`):** Fixed control banner pinned during Rebase, Merge, Bisect, or Detached HEAD states.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ IN-APP RESCUE & SAFETY ARCHITECTURE                                                    │
│                                                                                        │
│  [Press F1 or "?"] ────────► [UserGuideModal.svelte] (Complete 2026 Reference)         │
│                              ├── Real-World Recipes: Rebase, Time Machine, Worktrees...│
│                              ├── Feature Deep-Dives: Living Graph, Safe Discard, AI... │
│                              └── Shortcuts Cheat Sheet: Full Hotkeys Directory         │
│                                                                                        │
│  [Encounter Git Issue!] ───► [GitPlaybookModal.svelte] (1-Click Remediation)           │
│                              ├── Stuck `.git/index.lock` ➔ 1-Click Clear Lock          │
│                              ├── Committed to Wrong Branch ➔ 1-Click Move to New Branch│
│                              ├── File > 50MB ➔ 1-Click Move to Git LFS                 │
│                              └── Windows File Locks ➔ 1-Click Identify Culprit PID     │
│                                                                                        │
│  [In-Progress Operations] ──► [RepoAlertBanner.svelte] (Pinned to Top Bar)             │
│                              ├── Rebasing: Step X/Y, Buttons: Continue, Skip, Abort    │
│                              ├── Merging: Conflict counter, Button: Abort Merge        │
│                              └── Detached HEAD: Warning, Button: Create Branch Here    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📖 2. Interactive User Guide

Component: [`src/lib/components/UserGuideModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/UserGuideModal.svelte)  
Trigger: `F1`, `?`, or Help Menu.

Features three core interactive sections:
1. **Real-World Recipes:** Battle-tested solutions for behind upstream branches, broken merges, accidental discards, and urgent hotfixes.
2. **Feature Deep-Dives:** Explanations of OffscreenCanvas, SQLite Safe Discard, and Local AI generation.
3. **Shortcuts Directory:** Full keyboard shortcuts list grouped by functional workflow.

---

## 🛠️ 3. On-The-Fly Incident Response (Git Playbook)

Component: [`src/lib/components/GitPlaybookModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/GitPlaybookModal.svelte)  
Backend IPC: `is_index_locked`, `clear_index_lock`, `scan_heavy_files`, `check_file_locks`

### 3.1. Stuck `.git/index.lock`
- Detects if lock holder is dead; presents 1-click **"Clear Lock Now" (`clear_index_lock`)** to release repository in 1 second.

### 3.2. Committed to Wrong Branch
- Automatically spawns a new branch preserving the commit, rewinding the original branch via `git reset --soft HEAD~1`.

### 3.3. Large Files Diagnostics
- Scans for uncommitted files > 50MB and offers 1-click Git LFS tracking.

---

## 🛡️ 4. Pre-Commit Safety Guard

Component: [`src/lib/components/PreCommitWarningModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/PreCommitWarningModal.svelte)

Heuristic security checks execute upon pressing `Ctrl + Enter`:
1. **Secrets & API Keys:** Identifies patterns for OpenAI (`sk-proj-...`), GitHub (`ghp_...`), AWS (`AKIA...`), and RSA/SSH private keys.
2. **Sensitive Configs:** Alerts on `.env`, `credentials.json`, `id_rsa`.
3. **Dangling Debug Lines:** Warns on `console.log(secret)` or `debugger;`.
4. Prompts confirmation before creating the commit.

---

## 🚨 5. In-Progress Operation Banner

Component: [`src/lib/components/RepoAlertBanner.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/RepoAlertBanner.svelte)

- **Rebasing:** Shows current progress (`Step 3 / 8`) with **Continue**, **Skip**, and **Abort** buttons.
- **Merging:** Conflict counter with 1-click **Abort Merge**.
- **Detached HEAD:** Warns that commits will be lost without an anchored branch; provides **"Create Branch Here"**.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🧭 1. TRIẾT LÝ HỖ TRỢ TRỰC QUAN TRONG ỨNG DỤNG

Khi gặp các sự cố Git hóc búa (dính xung đột rebase dở dang, rớt vào trạng thái Detached HEAD, commit nhầm nhánh, kẹt `.git/index.lock` hay lỡ tay commit file nhạy cảm):
- Lập trình viên thường hoang mang, phải lên Google hoặc StackOverflow tìm kiếm lệnh cứu hộ.
- Việc sao chép và gõ các câu lệnh dòng lệnh nguy hiểm trên terminal (`git reset --hard`, `rm -f .git/index.lock`, `git rebase --skip`) có nguy cơ cao làm bốc hơi toàn bộ mã nguồn chưa commit.

**FlowGit đưa toàn bộ tri thức cứu hộ vào trải nghiệm tương tác 1-chạm:**
1. **Interactive User Guide (`UserGuideModal.svelte`):** Thư viện hướng dẫn đa năng tích hợp sẵn phím tắt `F1` hoặc `?`.
2. **Interactive Git Playbook (`GitPlaybookModal.svelte`):** Bộ công cụ xử lý sự cố tại chỗ với các nút hành động tự động.
3. **Pre-Commit Safety Guard (`PreCommitWarningModal.svelte`):** Bộ lọc quét bảo mật trước khi đóng gói commit.
4. **Biểu ngữ Trạng thái In-Progress (`RepoAlertBanner.svelte`):** Bảng điều khiển tiến trình Rebase / Merge / Bisect / Detached HEAD luôn hiển thị ở đỉnh ứng dụng.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ HỆ THỐNG TRỢ GIÚP & AN TOÀN TRONG ỨNG DỤNG                                             │
│                                                                                        │
│  [Bấm F1 hoặc "?"] ────────► [UserGuideModal.svelte] (49KB Kiến thức chuẩn 2026)      │
│                              ├── Tab Thực Chiến: Rebase, Time Machine, Worktrees...    │
│                              ├── Tab Tính Năng: Living Graph, Safe Discard, AI...      │
│                              └── Tab Phím Tắt: Toàn bộ bảng hotkeys tra cứu nhanh      │
│                                                                                        │
│  [Gặp sự cố Git!] ─────────► [GitPlaybookModal.svelte] (Khắc phục 1-Chạm)              │
│                              ├── Kẹt `.git/index.lock` ➔ 1 Click Giải Phóng            │
│                              ├── Commit nhầm nhánh ➔ 1 Click Chuyển Sang Nhánh Mới     │
│                              ├── File nặng > 50MB ➔ 1 Click Chuyển LFS                 │
│                              └── Windows File Locks ➔ 1 Click Rà Soát Tiến Trình Khóa  │
│                                                                                        │
│  [Tiến trình dở dang] ─────► [RepoAlertBanner.svelte] (Ghim cố định đỉnh màn hình)    │
│                              ├── Rebasing: Hiển thị bước X/Y, Nút Continue, Skip, Abort│
│                              ├── Merging: Đếm số file conflict, Nút Abort Merge        │
│                              └── Detached HEAD: Cảnh báo mất code, Nút Tạo Nhánh Mới   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📖 2. SỔ TAY HƯỚNG DẪN TƯƠNG TÁC (INTERACTIVE USER GUIDE)

Component: [`src/lib/components/UserGuideModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/UserGuideModal.svelte)  
Kích hoạt: Phím `F1` hoặc `?`, hoặc chọn menu Help trên thanh Toolbar.

Được xây dựng như một bách khoa toàn thư tương tác thu nhỏ với 3 phân vùng chính:

### 2.1. Phân khu Thực chiến (Real-World Recipes)
Tổng hợp các kịch bản thực tế phổ biến nhất trong các nhóm kỹ thuật:
1. **Đồng nghiệp merge trước, nhánh tôi bị tụt hậu (Behind main):**
   - Hướng dẫn 3 cách Rebase trực quan với 0 rủi ro conflict nhờ Dry-Run Ghost Preview.
2. **Vừa lỡ tay làm hỏng nhánh (Reset/Rebase nhầm):**
   - Sử dụng cỗ máy thời gian Time Machine (`Ctrl + Z`) phục hồi trạng thái nhánh trước đó.
3. **Lỡ tay bấm Discard mất sạch code vừa viết sáng nay:**
   - Mở Trash Inspector (Safe Discard 48h) và bấm Restore lấy lại 100% nội dung.
4. **Đang code dở thì sếp giao vá lỗi gấp trên Production:**
   - Sử dụng Worktrees Manager hoặc Quick Hotfix tạo môi trường sửa lỗi song song không đụng vào code dở.
5. **Commit quá to cần tách nhỏ (Interactive Rebase):**
   - Timeline trực quan bóc tách commit thành nhiều phần chuẩn mực.
6. **Truy lùng commit gây lỗi bí ẩn (Visual Bisect Wizard):**
   - Phương pháp chia đôi đồ thị tìm ra thủ phạm trong 4-5 bước test.

### 2.2. Phân khu Tra cứu Phím tắt (Shortcuts Cheatsheet)
Bảng đối chiếu toàn diện các phím tắt theo từng ngữ cảnh:
- Điều hướng đồ thị (`J` / `K`, `PageUp` / `PageDown`).
- Thao tác staging (`Space`, `Ctrl + Enter`).
- Quản lý nhánh và lịch sử (`B`, `S`, `Ctrl + Z`, `Ctrl + Shift + Z`).
- Kích hoạt trợ lý AI (`Ctrl + I`) và Command Palette (`Ctrl + K`).

---

## 🛠️ 3. BỘ GIẢI CỨU SỰ CỐ TẠI CHỖ (GIT PLAYBOOK MODAL)

Component: [`src/lib/components/GitPlaybookModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/GitPlaybookModal.svelte)  
Backend IPC: `is_index_locked`, `clear_index_lock`, `scan_heavy_files`, `check_file_locks`

### 3.1. Kẹt File `.git/index.lock`
- **Nguyên nhân:** Khi VS Code, Antivirus, hoặc Git CLI bị crash bất ngờ, file khóa `.git/index.lock` bị bỏ quên khiến mọi thao tác sau đó đều bị báo lỗi: *"Another git process seems to be running in this repository"*.
- **Giải pháp 1-Click của FlowGit:** Kiểm tra xem tiến trình tạo khóa còn hoạt động không, nếu đã chết sẽ hiển thị nút **"Giải Phóng Khóa Ngay" (`clear_index_lock`)**, trả lại khả năng hoạt động cho repository chỉ sau 1 giây.

### 3.2. Commit Nhầm Nhánh (Wrong Branch Rescue)
- Cung cấp wizard 2 bước:
  - Nếu commit chưa push: Tự động tạo nhánh mới giữ lại commit đó, đồng thời đưa nhánh hiện tại lùi lại về vị trí ban đầu bằng `git reset --soft HEAD~1`.
  - Nếu code chưa commit: Tự động lưu working tree và áp dụng sang nhánh mục tiêu được chọn.

### 3.3. Rà soát Tệp Nặng (Heavy Files Scan)
- Quét nhanh toàn bộ thư mục để tìm ra các file vô tình được tạo ra có dung lượng > 50MB (video `.mp4`, weights AI `.pt`, database backup `.dump`).
- Đề xuất 1-click đưa vào quy tắc `.gitignore` hoặc cấu hình Git LFS.

---

## 🛡️ 4. BẢO VỆ TRƯỚC KHI COMMIT (PRE-COMMIT SAFETY GUARD)

Component: [`src/lib/components/PreCommitWarningModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/PreCommitWarningModal.svelte)

Khi người dùng nhấn phím commit (`Ctrl + Enter`), FlowGit tự động chạy một bộ quét bảo mật siêu nhanh (Security Heuristics):
1. **Phát hiện Secret & Khóa Bí Mật:**
   - Quét nội dung các dòng vừa stage để tìm mẫu chuỗi API key nhạy cảm (ví dụ: `sk-proj-...`, `ghp_...`, `AKIA...`, chuỗi Private Key RSA/SSH).
2. **Phát hiện Tệp Cấu Hình Nhạy Cảm:**
   - Cảnh báo nếu trong danh sách commit có chứa các file `.env`, `credentials.json`, `id_rsa`.
3. **Phát hiện Dòng Lệnh Debug Thừa:**
   - Cảnh báo nếu có các dòng `console.log(secret)`, `debugger;`, `print(token)`.
4. Nếu phát hiện rủi ro, hộp thoại cảnh báo sẽ bật lên chặn lại, yêu cầu người dùng xác nhận hoặc gỡ bỏ dòng nhạy cảm trước khi chính thức tạo commit.

---

## 🚨 5. BIỂU NGỮ TRẠNG THÁI TIẾN TRÌNH (REPO ALERT BANNER)

Component: [`src/lib/components/RepoAlertBanner.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/RepoAlertBanner.svelte)  
Backend IPC: `get_repo_operation_state`, `continue_rebase_branch`, `skip_rebase_step`, `abort_current_operation`

Khi repository đang ở một trong các trạng thái dở dang:
- **Đang Rebase (`Rebasing`):**
  - Hiển thị thanh trạng thái màu hổ phách: *"Đang áp dụng lại commit bước 3 / 8"*.
  - Cung cấp 3 nút bấm trực quan:
    - **"Continue Rebase":** Sau khi người dùng đã giải quyết xong conflict.
    - **"Skip Step":** Bỏ qua commit hiện tại nếu nó trở thành rỗng hoặc không cần thiết.
    - **"Abort Rebase":** Hủy bỏ hoàn toàn tiến trình và hoàn trả repo về mốc trước khi rebase.
- **Đang Merge Xung Đột (`Merging`):**
  - Hiển thị số lượng file xung đột còn lại.
  - Cung cấp nút **"Abort Merge"** để đưa kho về an toàn nếu thấy tình hình quá phức tạp.
- **Trạng thái Rời Đầu (`Detached HEAD`):**
  - Cảnh báo màu vàng: *"HEAD đang không trỏ vào nhánh nào! Mọi commit mới sẽ bị mất khi bạn chuyển nhánh"*.
  - Cung cấp nút **"Tạo Nhánh Mới Từ Đây"** để bảo tồn các commit vừa tạo thành một nhánh chính thức.
