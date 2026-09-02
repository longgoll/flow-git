---
name: git-safety-engine
description: >-
  Hướng dẫn và tiêu chuẩn code cho Hệ thống An toàn No-Fear Git: Safe Discard Engine (Thùng rác Uncommitted Changes 48h), Reflog Time-Travel Undo (Ctrl+Z) và Dry-Run In-Memory Conflict Simulation. Kích hoạt khi lập trình các tính năng liên quan đến an toàn dữ liệu, phục hồi mã nguồn và mô phỏng Git.
---

# KỸ NĂNG: NO-FEAR GIT SAFETY ENGINE

Kỹ năng này định nghĩa kiến trúc kỹ thuật để đảm bảo lập trình viên không bao giờ bị mất mã nguồn hoặc thao tác sai khi dùng FlowGit.

---

## 1. SAFE DISCARD ARCHITECTURE (THÙNG RÁC 48H)

### Cơ chế hoạt động:
1. Khi người dùng bấm **Discard Changes** (cho 1 file hoặc toàn bộ repo):
   - Trước khi gọi `git checkout -- file` hoặc `git reset`:
   - Backend Rust tự động tạo một **Snapshot Blob** lưu vào thư mục cache nội bộ (`.flowgit/trash_cache/` hoặc SQLite DB).
   - Lưu metadata: `original_path`, `timestamp`, `commit_head_sha`, `file_content_hash`.
2. **Dọn dẹp tự động (Auto Eviction):**
   - Background worker xóa các snapshot có tuổi đời `> 48 hours`.
3. **Trash Inspector UI:**
   - Liệt kê các bản ghi đã xóa kèm thời gian tương đối (`10 phút trước`).
   - Nút **"Phục hồi (Restore)"**: Đọc snapshot và ghi đè lại working tree an toàn.

---

## 2. REFLOG TIME-TRAVEL UNDO (`Ctrl + Z` ENGINE)

### Cơ chế hoạt động:
1. Mỗi thao tác làm thay đổi HEAD hoặc Branches (Rebase, Merge, Commit, Reset, Delete Branch):
   - Ứng dụng ghi nhận một `ActionRecord`:
     ```rust
     pub struct ActionRecord {
         pub action_type: ActionType, // Rebase, ResetHard, BranchDelete, Commit
         pub previous_head: git2::Oid,
         pub previous_branch_ref: Option<String>,
         pub description: String,
         pub timestamp: i64,
     }
     ```
2. Khi người dùng nhấn `Ctrl + Z`:
   - Lấy action gần nhất từ Undo Stack.
   - Dùng `git reflog` và `git2::Repository::set_head_detached` hoặc `branch.rename` / `reference.set_target` để phục hồi về `previous_head` tức thì.
   - Đẩy action đó vào Redo Stack (`Ctrl + Shift + Z`).

---

## 3. DRY-RUN IN-MEMORY CONFLICT SIMULATION

### Cơ chế hoạt động:
1. Khi người dùng kéo commit chuẩn bị Rebase hoặc Merge:
   - Thay vì checkout và can thiệp working directory:
   - Backend sử dụng `git2::Repository::merge_trees()` trực tiếp trong RAM giữa Commit Target và Source.
2. **Kiểm tra xung đột:**
   - Nếu `index.has_conflicts() == true`:
     - Trích xuất danh sách file bị xung đột: `vec![path1, path2]`.
     - Trả về Frontend để hiển thị cảnh báo ngay trên con trỏ chuột và viền node màu cam.
   - Nếu không có xung đột ➔ Báo xanh (Safe to Fast-Forward / Safe to Rebase).

---

## 4. CHECKLIST BẢO MẬT & AN TOÀN DỮ LIỆU
- [ ] Mọi thao tác `Discard` bắt buộc phải tạo Snapshot trước khi xóa.
- [ ] Mọi lệnh phá hủy (Force Push, Reset Hard, Delete Branch) phải yêu cầu confirm hoặc hiển thị rõ hệ quả.
- [ ] Thao tác Undo `Ctrl + Z` phải được kiểm thử toàn diện trên các case phức tạp (Rebase xung đột dở dang, reset commit có staged files).
