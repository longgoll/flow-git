<div align="center">

# 🌲 Working Tree, Diff Viewer & Hunk Staging
### Working Tree, Diff Viewer & Cơ Chế Staging Từng Khối

> **Visuals:** Monaco Diff Editor + Spacebar interaction  
> **Performance:** Realtime File Watcher < 80ms without manual F5 refreshes  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🌲 1. Working Tree & File Status Management

Component: `src/lib/components/WorkingTree.svelte`

The Working Tree panel monitors all live file changes occurring inside your working directory:

```
┌───────────────────────────────────────────────────────────┐
│ WORKING TREE                                [Stage All]   │
│                                                           │
│ ▼ STAGED CHANGES (2 files)                  [Unstage All] │
│   ● M src/lib/components/Toolbar.svelte    [+12, -4]     │
│   ● A src/lib/components/QuickHotfix.svelte [+85, -0]     │
│                                                           │
│ ▼ UNSTAGED CHANGES (3 files)                [Discard All] │
│   ● M src-tauri/src/git/diff.rs             [+24, -2]     │
│   ● D obsolete-file.ts                      [+0, -45]     │
│   ● ? docs/new-guide.md (Untracked)                       │
└───────────────────────────────────────────────────────────┘
```

### 1.1. Standardized Status Badges
- **`M` (Modified - Yellow):** Modified compared to current HEAD.
- **`A` (Added - Green):** Staged into Index ready for commit.
- **`D` (Deleted - Red):** Removed from directory tree.
- **`R` (Renamed - Purple):** Renamed or moved file paths.
- **`?` (Untracked - Gray):** New file not yet tracked by Git.
- **`!` (Conflicted - Pulsing Amber):** Unresolved merge conflict.

### 1.2. Realtime File Watcher (< 80ms)
- Backed by the **`notify`** crate in Rust (`src-tauri/src/watcher/mod.rs`), FlowGit captures saves from any external IDE (VS Code, Neovim, JetBrains) with an 80ms debounce.
- You **never have to press F5 or Refresh** to see modified files.

### 1.3. Instant Search & File Filtering
- Filter changed files in real time through the quick search bar at the top of the working tree list.
- Dynamically filters across all categories (Conflicted, Staged, Unstaged, Untracked) without lagging the UI.
- Auto-selects the first dirty file when opening the Changes view so the diff viewer is never blank.

### 1.4. Adaptive Responsive Master-Detail & Panel Collapse
- **Small Screens / Narrow Windows (< 860px):** Automatically switches to an ergonomic Master-Detail view with top tabs `[Changed Files]` ⟷ `[View Diff]`. Clicking any file smoothly transitions to the diff view with a prominent `← Back to files` button.
- **Desktop Panel Collapse:** Collapse the file list panel via `PanelLeftClose` or expand it via `PanelLeftOpen` to inspect complex multi-column diffs in full width.
- **Fullscreen Diff Studio:** Click the Maximize button on the Diff toolbar or press `ESC` to view Monaco Diff Editor in an immersive fullscreen overlay.

---

## 🔍 2. Monaco Diff Editor

Component: `src/lib/components/DiffViewer.svelte` & `MonacoDiffEditor.svelte`

FlowGit integrates the core **Monaco Editor** engine powering VS Code:
- **Split Mode (Side-by-Side):** Compares original on the left and modified on the right.
- **Unified Mode:** Seamless inline single-column stream of changes.
- **Comprehensive Syntax Highlighting:** Native language support for 50+ languages (TypeScript, Rust, Python, Go, C++, HTML, CSS, etc.).
- **Ignore Whitespace & Line Endings:** Filters out Windows `CRLF` vs `LF` line-ending noise.
- **In-Place Full File Toggle (`Diff` ↔ `Full File`):** Switch between diff comparison and the entire file source code at that specific commit instantly with 0 latency using `MonacoEditor`, without context switching.
- **Context-Preserved Explorer Navigation:** When opening a file in the Repository Explorer from Commit Details, the target commit SHA is preserved with a 1-click "Back to Commit" shortcut.
- **1-Click Path Copy:** Click on the filename in the header to instantly copy its relative path to the clipboard.

---

## 🎯 3. Hunk & Line Staging (Partial Staging)

Eliminates tedious `git add -p` CLI interactions:
1. Open any modified file in the Diff Viewer.
2. Hover over any hunk: the block highlights with a **"Stage Hunk"** button.
3. **`Space` Shortcut:** Press `Space` to Stage/Unstage the active hunk in 0.1s.
4. **Line-by-Line Staging:** Highlight lines and click **"Stage Selected Lines"** to keep debug code uncommitted.

---

## ✍️ 4. Commit Box & Ergonomics

Component: `src/lib/components/CommitBox.svelte`

- **Conventional Commit Quick Chips:** 1-Click prefix insertion (`feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `chore:`).
- **Expandable Description:** Commit body textarea is expandable on demand, preserving maximum vertical screen space for the working tree file list.
- **Smart "Stage All & Commit":** When 0 files are staged but changes exist, the commit button automatically adapts to "Stage All & Commit", removing unnecessary friction.
- **Compact Safety Shield Ribbon:** Sleek protection banner on `main`/`master` with inline bypass toggle and feature branch generator.
- **Bypass Git Hooks (`--no-verify`):** Checkbox to bypass pre-commit hooks for urgent hotfixes.

---

## 🛡️ 5. Smart .gitignore Assistant

- Right-click untracked files:
  - **Ignore this file:** Appends filename to `.gitignore`.
  - **Ignore extension:** Appends pattern (`*.log`, `*.tmp`).
  - **Ignore parent folder:** Ignores enclosing directory.
- 1-Click standard templates for Node.js, Rust, Python, Go, Java.

---

## 🗄️ 6. Visual Stash Shelf with Monaco Diff Preview

Component: `src/lib/components/StashShelfDrawer.svelte`  
Backend: `src-tauri/src/git/stash_ops.rs` (Commands: `get_stash_detail`, `get_stash_file_diff`, `stash_branch`)

### The Problem:
Blindly applying or popping stashes via `git stash pop` risks conflicts and accidental overwrites because traditional Git tools don't show the files or diffs inside a stash before restoration.

### FlowGit Visual Stash Shelf:
- **Slide-over Drawer (`StashShelfDrawer`):** Opens instantly from the Sidebar stashes list, Toolbar More Menu, or Command Palette.
- **Stash Breakdown:** Shows original branch, creation timestamp, and file count with `+lines / -lines` stats.
- **File Inspector:** Lists all modified, added, deleted, and untracked files with status pills (`M`, `A`, `D`, `U`).
- **Monaco Diff Preview:** Inspect line-by-line changes in Split (side-by-side) or Unified mode with syntax highlighting before restoring.
- **1-Click Actions:**
  - 🟢 **Apply:** Restores changes into working directory while preserving the stash.
  - ⚡ **Pop:** Restores changes and removes the stash entry.
  - 🌿 **Branch from Stash:** Creates a new branch directly from the stash's base commit and checks it out (`git stash branch`).
  - 🗑️ **Drop:** Permanently removes stash with confirmation safety.

---

## 🗑️ 7. Safe Discard 48h Trash & Monaco Diff Preview

Components: `src/lib/components/SafeDiscardTrash.svelte`, `src/lib/components/TrashInspector.svelte`  
Backend: `src-tauri/src/commands/repo.rs` (`get_trash_snapshot_diff`, `restore_trash_snapshot`, `restore_trash_batch`)

- **48-Hour Safety Net**: When discarding files or discarding all changes, file contents are atomically stored in local SQLite before HEAD checkout.
- **Monaco Diff Preview**: Click any snapshot row to launch the `TrashInspector` with Monaco Diff Editor, comparing original snapshot contents directly against current working tree files (Split or Inline).
- **1-Click Restore & Batch Restore**: Restore a single file or an entire batch of discarded files without fear of data loss.

---

## ⛏️ 8. Pickaxe Code Diff Search (`-S`)

Components: `src/lib/components/toolbar/ToolbarSearchFilters.svelte`  
Backend: `src-tauri/src/git/search.rs` (`search_commits_pickaxe`)

- **Code-Level Historical Search**: Search commits that added or removed specific variable names, functions, or string literals across all diffs.
- **Rayon-Powered Concurrency**: Inspects git diff hunks across history with Rayon parallelism.
- **Visual Match Flyout**: Clicking a search match displays commit metadata, files affected, and exact added/removed line statistics.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🌲 1. WORKING TREE & QUẢN LÝ TẬP TIN THAY ĐỔI

Component: `src/lib/components/WorkingTree.svelte`

Bảng Working Tree quản lý toàn bộ các thay đổi đang diễn ra trong mã nguồn của bạn:

```
┌───────────────────────────────────────────────────────────┐
│ WORKING TREE                                [Stage All]   │
│                                                           │
│ ▼ STAGED CHANGES (2 files)                  [Unstage All] │
│   ● M src/lib/components/Toolbar.svelte    [+12, -4]     │
│   ● A src/lib/components/QuickHotfix.svelte [+85, -0]     │
│                                                           │
│ ▼ UNSTAGED CHANGES (3 files)                [Discard All] │
│   ● M src-tauri/src/git/diff.rs             [+24, -2]     │
│   ● D obsolete-file.ts                      [+0, -45]     │
│   ● ? docs/new-guide.md (Untracked)                       │
└───────────────────────────────────────────────────────────┘
```

### 1.1. Hệ thống thẻ trạng thái chuẩn hóa
- **`M` (Modified - Màu vàng):** Tệp đã được chỉnh sửa so với commit gần nhất.
- **`A` (Added - Màu xanh lá):** Tệp mới được đưa vào Index chuẩn bị commit.
- **`D` (Deleted - Màu đỏ):** Tệp đã bị xóa khỏi cây thư mục.
- **`R` (Renamed - Màu tím):** Tệp được đổi tên hoặc di chuyển đường dẫn.
- **`?` (Untracked - Màu xám):** Tệp mới xuất hiện chưa được Git theo dõi.
- **`!` (Conflicted - Màu cam nhấp nháy):** Tệp đang trong trạng thái xung đột cần giải quyết.

### 1.2. Giám sát tệp thời gian thực (Realtime Watcher < 80ms)
- Nhờ tích hợp crate **`notify`** trong Rust backend (`src-tauri/src/watcher/mod.rs`), mỗi khi bạn gõ code và lưu file trong bất kỳ trình soạn thảo nào (VS Code, Neovim, JetBrains), FlowGit tự động bắt sự kiện qua cơ chế Debounce 80ms.
- Bạn **không bao giờ phải bấm nút Refresh (F5)** để xem các thay đổi mới nhất.

### 1.3. Tìm kiếm & Lọc Tệp Tức Thì (Instant Search)
- Thanh tìm kiếm nhanh ở đầu danh sách tệp cho phép lọc tức thì đường dẫn tệp trong Working Tree.
- Tự động lọc mượt mà trên tất cả các nhóm (Conflicted, Staged, Unstaged, Untracked).
- Tự động chọn tệp thay đổi đầu tiên khi vào trang Changes giúp giao diện Diff luôn sẵn sàng ngay tức khắc.

### 1.4. Thiết Kế Đáp Ứng Đa Màn Hình (Responsive Master-Detail & Panel Collapse)
- **Màn hình nhỏ / Cửa sổ hẹp (< 860px):** Tự động chuyển sang chế độ Master-Detail với thanh tab chuyển đổi `[Tệp thay đổi]` ⟷ `[So sánh Diff]`. Khi click vào bất kỳ tệp nào, app tự chuyển sang Diff kèm nút quay lại `← Danh sách tệp`.
- **Thu gọn / Mở rộng Cột (Panel Collapse):** Cho phép ẩn cột danh sách tệp bằng nút `PanelLeftClose` và mở lại bằng `PanelLeftOpen` để soi diff rộng 100% màn hình.
- **Studio Soi Diff Toàn Màn Hình (Fullscreen Diff):** Bấm nút Maximize trên thanh công cụ Diff (hoặc phím `ESC` để thoát) để phóng to Monaco Diff Editor chiếm trọn màn hình.

---

## 🔍 2. DIFF VIEWER CHUYÊN NGHIỆP (MONACO DIFF EDITOR)

Component: `src/lib/components/DiffViewer.svelte` & `MonacoDiffEditor.svelte`

Diff Viewer của FlowGit được trang bị sức mạnh của **Monaco Editor** (trình biên tập cốt lõi của VS Code), mang lại trải nghiệm xem code đẳng cấp:
- **Chế độ Split (Side-by-Side):** Hiển thị song song bản cũ bên trái và bản mới bên phải, cực kỳ thuận tiện khi đọc các hàm lớn bị thay đổi cấu trúc.
- **Chế độ Unified:** Hiển thị cuộn một cột liền mạch theo từng khối thay đổi.
- **Hỗ trợ Syntax Highlighting toàn diện:** Tự động tô màu cú pháp chuẩn xác cho hơn 50 ngôn ngữ (TypeScript, Rust, Python, Go, C++, HTML, CSS, v.v.).
- **Tùy chọn Bỏ qua Whitespace & Line Endings:** Giúp lập trình viên Windows không bị phân tâm bởi các thay đổi do khác biệt ký tự xuống dòng `CRLF` vs `LF`.
- **Xem Toàn bộ Tệp ngay tại chỗ (`Diff` ↔ `Toàn bộ tệp`):** Cho phép chuyển đổi linh hoạt giữa xem diff thay đổi và đọc trọn vẹn toàn bộ mã nguồn của file tại chính commit đó bằng `MonacoEditor` mà không cần đổi view hay rời khỏi trang Commit Details.
- **Bảo toàn ngữ cảnh khi Xem trong Explorer:** Khi bấm "Xem trong Explorer" từ chi tiết commit, Explorer sẽ mở file tại đúng phiên bản `Commit OID` lịch sử tương ứng, kèm lối tắt "Quay lại Commit" 1-click.
- **1-Click Sao chép Đường dẫn:** Nhấn vào tên tệp trên thanh tiêu đề để sao chép ngay đường dẫn tương đối vào clipboard.

---

## 🎯 3. STAGING TỪNG KHỐI & TỪNG DÒNG (PARTIAL STAGING)

Thay vì phải gõ lệnh terminal rườm rà `git add -p` và trả lời từng câu hỏi `(y/n/s/e/?)`:
1. Mở file cần xem trong Diff Viewer.
2. Di chuột vào khối mã muốn stage: khối code sẽ sáng đèn và hiển thị nút **"Stage Hunk"** (hoặc "Unstage Hunk").
3. **Phím tắt nhanh `Space`:** Bấm phím cách (`Space`) để Stage/Unstage khối code đang trỏ chuột chỉ trong 0.1 giây.
4. **Stage từng dòng:** Chọn bôi đen các dòng code mong muốn và chọn **"Stage Selected Lines"**.

Tính năng này giúp bạn dễ dàng bóc tách các thay đổi nháp, commit riêng phần logic quan trọng và để lại các dòng console.log chưa cần thiết.

---

## ✍️ 4. COMMIT BOX & TỐI ƯU CÔNG THÁI HỌC (ERGONOMICS)

Component: `src/lib/components/CommitBox.svelte`

- **Conventional Commit Quick Chips:** Thẻ thể loại commit chuẩn công nghiệp (`feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `chore:`).
- **Mở rộng / Thu gọn Mô tả Linh Hoạt:** Ô nhập mô tả chi tiết (`commitBody`) có thể thu gọn lại giúp trả về tối đa không gian cuộn cho danh sách tệp.
- **Hành động Thông Minh "Stage tất cả & Commit":** Khi có file thay đổi nhưng chưa stage, nút Commit tự động kích hoạt chế độ "Stage tất cả & Commit" 1-click, loại bỏ thao tác bấm thừa.
- **Dải Băng Cảnh Báo Nhánh Bảo Vệ Nhỏ Gọn (Safety Shield Ribbon):** Tinh gọn cảnh báo khi commit vào `main`/`master` kèm nút tạo nhánh Feature và tùy chọn Bypass nhanh.
- **Cờ Bỏ qua Git Hooks (`--no-verify`):** Checkbox cho phép bypass các pre-commit hooks khi cần thực hiện hotfix khẩn cấp mà không bị kẹt linter.

---

## 🛡️ 5. TRỢ LÝ .GITIGNORE THÔNG MINH

- Click chuột phải vào bất kỳ tệp untracked nào trong danh sách:
  - **Ignore file này:** Thêm chính xác tên file vào `.gitignore`.
  - **Ignore phần mở rộng:** Tự động thêm mẫu `*.log`, `*.tmp`, `*.cache`.
  - **Ignore thư mục cha:** Thêm toàn bộ thư mục chứa file vào quy tắc bỏ qua.
- Hỗ trợ tạo file `.gitignore` mẫu chuẩn hóa 1-click cho các môi trường phổ biến (Node.js, Rust, Python, Go, Java).

---

## 🗄️ 6. KỆ STASH TRỰC QUAN (VISUAL STASH SHELF VỚI MONACO DIFF)

Component: `src/lib/components/StashShelfDrawer.svelte`  
Backend: `src-tauri/src/git/stash_ops.rs` (Commands: `get_stash_detail`, `get_stash_file_diff`, `stash_branch`)

### Vấn đề:
Lập trình viên thường ngần ngại sử dụng `git stash pop` vì không nhớ bản stash cũ chứa những file gì, sửa dòng code nào, rất dễ gây ra conflict đè nát code đang làm dở.

### Giải pháp Kệ Stash Trực Quan trong FlowGit:
- **Ngăn kéo Slide-over (`StashShelfDrawer`):** Mở mượt mà khi nhấn vào bất kỳ bản stash nào ở Sidebar, hoặc từ menu Toolbar / Command Palette.
- **Bóc tách chi tiết bản Stash:** Hiển thị rõ nhánh gốc đã tạo stash, thời gian tạo, tổng số file và dòng thêm/bớt (`+X / -Y`).
- **Danh sách tệp thông minh:** Liệt kê toàn bộ các tệp được sửa đổi, thêm mới, xóa và cả các tệp untracked kèm huy hiệu màu sắc (`M`, `A`, `D`, `U`).
- **Monaco Diff Preview toàn diện:** Soi chi tiết diff từng dòng với chế độ xem song song 2 cột (Split) hoặc 1 cột (Unified), hỗ trợ syntax highlighting và tự động cuộn đến điểm thay đổi.
- **Hành động 1-Click an toàn:**
  - 🟢 **Apply:** Áp dụng code vào thư mục làm việc, vẫn giữ nguyên bản stash.
  - ⚡ **Pop:** Áp dụng code và xóa bản stash khỏi Git.
  - 🌿 **Branch from Stash:** Tạo một nhánh Git mới trực tiếp từ mốc stash và checkout sang (`git stash branch`).
  - 🗑️ **Drop:** Xóa vĩnh viễn bản stash kèm hộp thoại xác nhận.

---

## 🗑️ 7. THÙNG RÁC SAFE DISCARD 48H & MONACO DIFF PREVIEW

Component: `src/lib/components/SafeDiscardTrash.svelte`, `src/lib/components/TrashInspector.svelte`  
Backend: `src-tauri/src/commands/repo.rs` (`get_trash_snapshot_diff`, `restore_trash_snapshot`, `restore_trash_batch`)

- **Bảo vệ mã nguồn an toàn tuyệt đối (No-Fear Git)**: Mỗi khi bạn discard một tệp hoặc discard all, nội dung trước khi xóa được tự động snapshot vào cơ sở dữ liệu SQLite trong 48 giờ.
- **Monaco Diff Inspector**: Nhấn vào bất kỳ bản chụp nào để mở trình so sánh Monaco Diff Editor, trực tiếp đối chiếu nội dung bản chụp thùng rác với file hiện tại trong Working Tree (hỗ trợ chuyển đổi linh hoạt Split hoặc Inline).
- **Khôi phục 1-Click & Khôi phục theo Đợt (Batch Restore)**: Lấy lại chính xác 100% nội dung tệp mà không lo mất dữ liệu.

---

## ⛏️ 8. TÌM KIẾM THEO NỘI DUNG DÒNG CODE (PICKAXE SEARCH `-S`)

Component: `src/lib/components/toolbar/ToolbarSearchFilters.svelte`  
Backend: `src-tauri/src/git/search.rs` (`search_commits_pickaxe`)

- **Truy vết thay đổi cấp độ mã nguồn**: Tìm kiếm chính xác các commit trong lịch sử từng thêm hoặc xóa một đoạn code, tên biến, hoặc hàm cụ thể qua thuật toán Git Pickaxe `-S`.
- **Hiệu năng cao với Rust Rayon**: Xử lý đa luồng quét diff toàn bộ lịch sử commit cực nhanh.
- **Flyout kết quả trực quan**: Hiển thị danh sách commit khớp, tệp tác động và số dòng `+X / -Y` kèm phím tắt nhảy thẳng đến commit trên đồ thị.

