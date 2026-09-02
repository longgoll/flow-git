# ĐỘNG CƠ AN TOÀN NO-FEAR GIT: SAFE DISCARD & TIME MACHINE
> **Triết lý:** Tuyệt đối không bao giờ làm mất mã nguồn của lập trình viên.  
> **Cơ chế:** SQLite 3 Bản địa + `git2` In-Memory Dry-Run + `git reflog` Đồng bộ hai chiều.

---

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
    original_content TEXT NOT NULL,
    discarded_at INTEGER NOT NULL,      -- Timestamp Unix
    is_staged INTEGER DEFAULT 0,
    file_hash TEXT                      -- SHA256 để chống trùng lặp dữ liệu
);
```

### 2.3. Cơ chế tự động dọn dẹp (48h TTL Auto-Eviction)
- Mỗi khi khởi động ứng dụng hoặc khi mở kho lưu trữ mới, một tiến trình ngầm sẽ thực thi truy vấn xóa các bản chụp quá 48 giờ:
  ```sql
  DELETE FROM trash_snapshots WHERE discarded_at < ?1;
  ```
- Nhờ cơ chế này, thùng rác không bao giờ làm phình to dung lượng ổ cứng của người dùng nhưng vẫn đảm bảo cửa sổ cứu hộ an toàn trong suốt 2 ngày làm việc.

### 2.4. Giao diện Trash Inspector (`TrashInspector.svelte`)
- Người dùng có thể bấm vào biểu tượng thùng rác trên thanh Toolbar bất kỳ lúc nào để:
  - Tìm kiếm các file đã discard theo tên hoặc mốc thời gian.
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
    before_ref TEXT NOT NULL,           -- Commit SHA trước khi thao tác
    after_ref TEXT NOT NULL,            -- Commit SHA sau khi hoàn thành
    created_at INTEGER NOT NULL,
    undone INTEGER DEFAULT 0            -- Cờ trạng thái đã hoàn tác hay chưa
);
```

### 3.2. Cơ chế hoàn tác song song (`git reflog`)
Khi người dùng bấm **`Ctrl + Z`** (hoặc `Ctrl + Shift + Z` để Redo):
1. Hệ thống tra cứu bản ghi gần nhất trong `action_history` có `undone = 0`.
2. Kiểm tra tính toàn vẹn của con trỏ `before_ref` với nhật ký `git reflog`.
3. Di chuyển con trỏ nhánh hiện tại về `before_ref` bằng cơ chế an toàn:
   ```rust
   let target_obj = repo.find_object(before_oid, None)?;
   repo.reset(&target_obj, git2::ResetType::Mixed, None)?;
   ```
4. Đánh dấu `undone = 1` trong SQLite và phát tín hiệu cập nhật giao diện đồ thị tức thì.

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
