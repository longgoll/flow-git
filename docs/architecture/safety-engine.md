<div align="center">

# 🛡️ No-Fear Git Safety Engine: Safe Discard & Time Machine
### Động Cơ An Toàn No-Fear Git: Safe Discard & Time Machine

> **Philosophy:** Never lose a single line of developer code.  
> **Mechanism:** Embedded SQLite 3 + `git2` In-Memory Dry-Run + Bidirectional `git reflog` Synchronization.  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🛡️ 1. Overview of the No-Fear Git Philosophy

Developers commonly experience three major points of anxiety when using Git:
1. **Accidental "Discard Changes" clicks** in IDEs, causing an entire day of uncommitted work to vanish permanently.
2. **Erroneous Rebase, Reset `--hard`, or reckless Merge operations**, causing branch divergence or lost commits.
3. **Fear of Drag-and-Drop interactions**, unsure whether dropping will trigger destructive merge conflicts.

FlowGit eliminates these concerns with **three reinforced defensive layers**:
- **Layer 1 (Pre-Action):** In-Memory Dry-Run Simulation & Ghost Preview before execution.
- **Layer 2 (During-Action):** Safe Discard Engine snapshotting uncommitted code into SQLite prior to deletion.
- **Layer 3 (Post-Action):** Safe-Flight Time Machine (`Ctrl + Z`) enabling rollback of any historical Git action.

---

## 🗑️ 2. Safe Discard Engine (48-Hour Uncommitted Trash)

### 2.1. SQLite Storage Architecture (`src-tauri/src/storage/trash.rs`)
When a user clicks "Discard" on a file or selects "Discard All Changes", FlowGit **never** executes `git checkout -- <file>` immediately. Instead, it executes an atomic four-step sequence:

```
[User clicks Discard] 
       │
       ▼
1. Read file contents directly from disk
       │
       ▼
2. Write snapshot record into SQLite table `trash_snapshots`
       │
       ▼
3. Only after SQLite commits successfully, invoke libgit2 to reset file to HEAD
       │
       ▼
4. Display notification toast with "Undo / View in Trash" action button
```

### 2.2. Schema: `trash_snapshots`
```sql
CREATE TABLE IF NOT EXISTS trash_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_path TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_content BLOB NOT NULL,
    diff_preview TEXT NOT NULL,
    created_at INTEGER NOT NULL,        -- Unix timestamp
    head_commit_sha TEXT,
    file_size INTEGER NOT NULL DEFAULT 0,
    batch_id TEXT,                      -- Shared UUID for multi-file discard batches
    is_oversized INTEGER NOT NULL DEFAULT 0 -- 1 if file > 20MB (BLOB omitted to prevent OOM)
);
CREATE INDEX IF NOT EXISTS idx_trash_repo ON trash_snapshots(repo_path);
CREATE INDEX IF NOT EXISTS idx_trash_created ON trash_snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_trash_repo_created ON trash_snapshots(repo_path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trash_batch ON trash_snapshots(batch_id);
```

### 2.3. Multi-File Atomic Discard & Quota Protection
- **Single-Transaction Batch Discard (`save_snapshots_batch`):**
  When discarding multiple files (`discard_all_changes`), all snapshot metadata and content are recorded within a single SQLite transaction under a shared `batch_id`. If an error occurs, the working tree is never left partially damaged, and users can execute **1-Click Batch Restore** (`restore_trash_batch`).
- **Oversized BLOB Protection (`MAX_TRASH_FILE_SIZE = 20MB`):**
  Files exceeding 20 MB have metadata and preview retained with `is_oversized = 1`, while raw binary contents are omitted from SQLite to prevent memory exhaustion (OOM) and runaway database inflation.
- **Auto-Eviction & WAL Maintenance:**
  Purges records older than 48 hours and caps total trash size at 500 MB. Triggers `PRAGMA wal_checkpoint(TRUNCATE)` and `PRAGMA incremental_vacuum` to reclaim physical disk space.

### 2.4. Trash Inspector Interface (`TrashInspector.svelte`)
- Accessible via the Shield / Trash icon on the toolbar:
  - Search discarded files by name or timestamp.
  - View file size, relative time, and distinct amber `Oversized` badges.
  - Preview saved code diffs directly.
  - Click **"Restore"** to reconstruct the exact file back into the Working Tree in < 10ms.

---

## ⏳ 3. Time Machine: Universal Undo (`Ctrl + Z`)

### 3.1. SQLite Action Journal (`src-tauri/src/storage/action_log.rs`)
Every action modifying Git pointers (Commit, Merge, Rebase, Cherry-Pick, Reset, Checkout, Switch Branch) is captured in `action_history`:

```sql
CREATE TABLE IF NOT EXISTS action_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_path TEXT NOT NULL,
    action_type TEXT NOT NULL,          -- 'commit', 'merge', 'rebase', 'reset', 'cherry-pick'
    description TEXT NOT NULL,          -- Human-readable action description
    previous_head TEXT NOT NULL,        -- Commit SHA before operation
    new_head TEXT NOT NULL,             -- Commit SHA after operation
    branch_name TEXT,
    severity TEXT NOT NULL DEFAULT 'safe',
    timestamp INTEGER NOT NULL,
    is_undone INTEGER NOT NULL DEFAULT 0 -- Undo status flag
);
CREATE INDEX IF NOT EXISTS idx_action_repo ON action_history(repo_path);
CREATE INDEX IF NOT EXISTS idx_action_time ON action_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_action_repo_undone_id ON action_history(repo_path, is_undone, id DESC);
```

### 3.2. Git GC Commit Protection Pinning (`refs/flowgit/pins/<action_id>`)
To guarantee that dangling commits (e.g. following a `reset --hard` or rebase) are never permanently removed by Git Garbage Collection (`git gc` / `git prune`), FlowGit automatically creates an internal git reference `refs/flowgit/pins/<action_id>` pointing to `previous_head`. When the action is undone or evicted, the pin reference is deleted.

### 3.3. Synchronized Undo via `git reflog` & Pointer Recovery
When the user presses **`Ctrl + Z`** (or `Ctrl + Shift + Z` to Redo):
1. Locate the latest entry in `action_history` where `is_undone = 0` via the composite index.
2. Cross-verify the target `previous_head` with `repo.find_commit(oid)`.
3. Safely restore branch pointer and checkout tree:
   ```rust
   let commit = repo.find_commit(oid)?;
   reference.set_target(oid, "Time machine rollback")?;
   repo.checkout_tree(commit.as_object(), Some(&mut builder))?;
   ```
4. Set `is_undone = 1` in SQLite, release the pin reference, and trigger instant graph UI update.

---

## 👻 4. Dry-Run Simulation & Ghost Preview

When dragging a commit or branch to drop onto another target:
1. **Zero-Disk-Impact Check:**
   - Evaluates merge trees completely in memory:
     ```rust
     let ancestor = repo.merge_base(source_oid, target_oid)?;
     let mut in_memory_index = repo.merge_commits(&ancestor_commit, &source_commit, &target_commit, None)?;
     ```
2. **Early Conflict Identification:**
   - If `in_memory_index.has_conflicts()` returns `true`, conflicting file paths are immediately gathered.
   - Frontend highlights candidate drop targets with amber borders and displays: *"Warning: 3 files will conflict if dropped here"*.
3. **Ghost Preview Rendering:**
   - Web Worker renders dotted ghost splines projecting the post-action DAG geometry, giving the user complete certainty before dropping.

---

## 🔓 5. Index Lock Recovery

### The Issue:
When a Git CLI process is forcefully terminated or locked by an external editor, `.git/index.lock` persists, failing all subsequent Git commands with:  
`Fatal: Unable to create '.git/index.lock': File exists.`

### FlowGit Solution:
1. Automatically verifies index lock presence via `is_index_locked`.
2. If stale lock (> 10s without active write processes) is detected, displays prompt:  
   *"Git Index is currently locked. Would you like FlowGit to clear it safely?"*
3. Clicking **"Clear Lock"** (`clear_index_lock`) safely unlinks the stale lock and restores normal repository state.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🛡️ 1. TỔNG QUAN TRIẾT LÝ NO-FEAR GIT

Nỗi ám ảnh lớn nhất của lập trình viên khi sử dụng Git là:
1. **Lỡ tay bấm "Discard Changes"** trên IDE và mất sạch công sức cả một ngày code chưa kịp commit.
2. **Chạy nhầm lệnh Rebase, Reset `--hard` hoặc Merge ẩu**, khiến nhánh bị lệch hoặc các commit quan trọng biến mất khỏi nhánh.
3. **Sợ thao tác kéo-thả** vì không biết liệu thả vào đó có gây ra xung đột (conflict) làm vỡ mã nguồn hay không.

FlowGit giải quyết triệt để 3 nỗi sợ này bằng **3 tầng phòng thủ kiên cố**:
- **Tầng 1 (Pre-Action):** Mô phỏng Dry-Run In-Memory & Ghost Preview trước khi thực thi.
- **Tầng 2 (During-Action):** Safe Discard Engine chụp snapshot toàn bộ code vào SQLite trước khi xóa.
- **Tầng 3 (Post-Action):** Safe-Flight Time Machine (`Ctrl + Z`) hoàn tác bất kỳ hành động nào.

---

## 🗑️ 2. SAFE DISCARD ENGINE (THÙNG RÁC UNCOMMITTED 48H)

### 2.1. Kiến trúc lưu trữ SQLite (`src-tauri/src/storage/trash.rs`)
Mỗi khi người dùng bấm Discard một file đơn lẻ hoặc bấm "Discard All Changes", hệ thống **không bao giờ** gọi `git checkout -- <file>` trực tiếp ngay lập tức. Thay vào đó, nó thực thi chuỗi quy trình:

```
[Người dùng bấm Discard] 
       │
       ▼
1. Đọc nội dung tệp thực tế từ ổ đĩa
       │
       ▼
2. Lưu bản ghi Snapshot vào bảng SQLite `trash_snapshots`
       │
       ▼
3. Chỉ sau khi SQLite commit thành công mới gọi libgit2 để khôi phục tệp về HEAD
       │
       ▼
4. Hiển thị thông báo Toast có nút "Undo / Xem trong Thùng rác"
```

### 2.2. Cấu trúc bảng `trash_snapshots`
```sql
CREATE TABLE IF NOT EXISTS trash_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_path TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_content BLOB NOT NULL,
    diff_preview TEXT NOT NULL,
    created_at INTEGER NOT NULL,        -- Timestamp Unix
    head_commit_sha TEXT,
    file_size INTEGER NOT NULL DEFAULT 0,
    batch_id TEXT,                      -- Mã UUID chung cho các đợt multi-file discard
    is_oversized INTEGER NOT NULL DEFAULT 0 -- 1 nếu file > 20MB (không lưu BLOB để tránh OOM)
);
CREATE INDEX IF NOT EXISTS idx_trash_repo ON trash_snapshots(repo_path);
CREATE INDEX IF NOT EXISTS idx_trash_created ON trash_snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_trash_repo_created ON trash_snapshots(repo_path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trash_batch ON trash_snapshots(batch_id);
```

### 2.3. Cơ chế Batch Transaction & Giới hạn Quota an toàn
- **Batch Discard Nguyên tử (`save_snapshots_batch`):**
  Khi discard nhiều tệp cùng lúc (`discard_all_changes`), toàn bộ bản ghi được thực thi trong **1 Transaction SQLite duy nhất** và gắn chung `batch_id`. Nhờ đó, nếu có lỗi xảy ra giữa chừng, trạng thái working tree không bị phá hủy dở dang, đồng thời hỗ trợ **Khôi phục cả đợt (Batch Restore)** chỉ trong 1 click.
- **Bảo vệ chống tràn bộ nhớ (`MAX_TRASH_FILE_SIZE = 20MB`):**
  Các tệp vượt quá 20MB chỉ được lưu metadata kèm cờ `is_oversized = 1` thay vì nạp toàn bộ BLOB vào RAM và SQLite, tránh tuyệt đối lỗi OOM panic và tình trạng phình đĩa.
- **Tự động dọn dẹp & Tối ưu WAL:**
  Tự động dọn dẹp các bản ghi quá 48 giờ và khống chế tổng dung lượng thùng rác dưới 500 MB. Thực thi `PRAGMA wal_checkpoint(TRUNCATE)` và `PRAGMA incremental_vacuum` để trả lại dung lượng thực tế cho ổ cứng.

### 2.4. Giao diện Trash Inspector (`TrashInspector.svelte`)
- Người dùng có thể bấm vào biểu tượng thùng rác trên thanh Toolbar bất kỳ lúc nào để:
  - Tìm kiếm các file đã discard theo tên hoặc mốc thời gian.
  - Nhận biết nhanh các file kích thước lớn với huy hiệu màu cam **Oversized**.
  - Xem trước (Preview) nội dung code được lưu trong bản chụp.
  - Nhấn nút **"Restore"** để phục hồi nguyên trạng tệp vào Working Tree trong < 10ms.

---

## ⏳ 3. TIME MACHINE: HOÀN TÁC TOÀN NĂNG (`CTRL + Z`)

### 3.1. Sổ nhật ký hành động SQLite (`src-tauri/src/storage/action_log.rs`)
Mọi hành động làm thay đổi con trỏ Git (Commit, Merge, Rebase, Cherry-Pick, Reset, Checkout, Switch Branch, v.v.) đều được ghi nhận vào bảng `action_history`:

```sql
CREATE TABLE IF NOT EXISTS action_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_path TEXT NOT NULL,
    action_type TEXT NOT NULL,          -- 'commit', 'merge', 'rebase', 'reset', 'cherry-pick'
    description TEXT NOT NULL,          -- Tóm tắt hành động người dùng dễ hiểu
    previous_head TEXT NOT NULL,        -- Commit SHA trước khi thao tác
    new_head TEXT NOT NULL,             -- Commit SHA sau khi hoàn thành
    branch_name TEXT,
    severity TEXT NOT NULL DEFAULT 'safe',
    timestamp INTEGER NOT NULL,
    is_undone INTEGER NOT NULL DEFAULT 0 -- Cờ trạng thái đã hoàn tác hay chưa
);
CREATE INDEX IF NOT EXISTS idx_action_repo ON action_history(repo_path);
CREATE INDEX IF NOT EXISTS idx_action_time ON action_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_action_repo_undone_id ON action_history(repo_path, is_undone, id DESC);
```

### 3.2. Ghim tham chiếu chống dọn rác Git (`refs/flowgit/pins/<action_id>`)
Để đảm bảo các commit bị tách nhánh (ví dụ sau khi `reset --hard` hoặc rebase) không bao giờ bị lệnh dọn rác ngầm của Git (`git gc` / `git prune`) xóa vĩnh viễn, FlowGit tự động tạo một reference ẩn `refs/flowgit/pins/<action_id>` trỏ tới commit trước đó. Tham chiếu này chỉ được dỡ bỏ khi hành động đã được Undo hoặc bản ghi hết hạn.

### 3.3. Cơ chế hoàn tác song song (`git reflog`)
Khi người dùng bấm **`Ctrl + Z`** (hoặc `Ctrl + Shift + Z` để Redo):
1. Hệ thống tra cứu bản ghi gần nhất trong `action_history` có `is_undone = 0` bằng composite index.
2. Kiểm tra tính hợp lệ của commit target bằng `repo.find_commit(oid)`.
3. Di chuyển con trỏ nhánh hiện tại và phục hồi working tree:
   ```rust
   let commit = repo.find_commit(oid)?;
   reference.set_target(oid, "Time machine rollback")?;
   repo.checkout_tree(commit.as_object(), Some(&mut builder))?;
   ```
4. Đánh dấu `is_undone = 1` trong SQLite, xóa ref pin và phát tín hiệu cập nhật giao diện đồ thị tức thì.

---

## 👻 4. DRY-RUN SIMULATION & GHOST PREVIEW

Khi kéo một commit hoặc một nhánh chuẩn bị thả vào nhánh khác để Rebase hoặc Merge:
1. **Kiểm tra trước không làm bẩn ổ đĩa:**
   - Hệ thống tạo một bản sao in-memory của Git Tree:
     ```rust
     let ancestor = repo.merge_base(source_oid, target_oid)?;
     let mut in_memory_index = repo.merge_commits(&ancestor_commit, &source_commit, &target_commit, None)?;
     ```
2. **Phát hiện xung đột sớm:**
   - Nếu `in_memory_index.has_conflicts()` trả về `true`, hệ thống thu thập ngay danh sách các file bị xung đột.
   - Frontend lập tức vẽ viền node màu cam cảnh báo và hiển thị tooltip: *"Cảnh báo: Có 3 tệp sẽ bị xung đột nếu thả vào đây"*.
3. **Ghost Preview Rendering:**
   - Worker vẽ các đường nối nét đứt mờ (Ghost dotted splines) biểu diễn hình thái cây đồ thị tương lai sau khi thả thành công, giúp người dùng luôn chắc chắn về kết quả trước khi nhấn xác nhận.

---

## 🔓 5. GIẢI CỨU TRẠNG THÁI KHÓA (INDEX LOCK RECOVERY)

### Vấn đề:
Khi tiến trình Git bị tắt đột ngột hoặc IDE khóa tệp, tệp `.git/index.lock` vẫn tồn tại, khiến mọi thao tác sau đó đều báo lỗi:  
`Fatal: Unable to create '.git/index.lock': File exists.`

### Giải pháp trong FlowGit:
1. Tự động kiểm tra sự tồn tại của `.git/index.lock` thông qua command `is_index_locked`.
2. Nếu phát hiện bị khóa quá 10 giây mà không có tiến trình nào đang ghi, ứng dụng hiển thị thông báo:  
   *"Phát hiện Index của Git đang bị khóa. Bạn có muốn FlowGit mở khóa giúp không?"*
3. Người dùng bấm **1 click "Clear Lock"** (`clear_index_lock`), hệ thống xóa tệp lock an toàn và phục hồi trạng thái repo hoạt động bình thường.
