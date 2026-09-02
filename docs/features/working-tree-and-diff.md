# WORKING TREE, DIFF VIEWER & CƠ CHẾ STAGING TỪNG KHỐI
> **Trực quan:** Monaco Diff Editor + Tương tác phím Space  
> **Tốc độ:** Realtime File Watcher < 80ms không cần nhấn F5 làm mới

---

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

---

## 🔍 2. DIFF VIEWER CHUYÊN NGHIỆP (MONACO DIFF EDITOR)

Component: `src/lib/components/DiffViewer.svelte` & `MonacoDiffEditor.svelte`

Diff Viewer của FlowGit được trang bị sức mạnh của **Monaco Editor** (trình biên tập cốt lõi của VS Code), mang lại trải nghiệm xem code đẳng cấp:
- **Chế độ Split (Side-by-Side):** Hiển thị song song bản cũ bên trái và bản mới bên phải, cực kỳ thuận tiện khi đọc các hàm lớn bị thay đổi cấu trúc.
- **Chế độ Unified:** Hiển thị cuộn một cột liền mạch theo từng khối thay đổi.
- **Hỗ trợ Syntax Highlighting toàn diện:** Tự động tô màu cú pháp chuẩn xác cho hơn 50 ngôn ngữ (TypeScript, Rust, Python, Go, C++, HTML, CSS, v.v.).
- **Tùy chọn Bỏ qua Whitespace & Line Endings:** Giúp lập trình viên Windows không bị phân tâm bởi các thay đổi do khác biệt ký tự xuống dòng `CRLF` vs `LF`.

---

## 🎯 3. STAGING TỪNG KHỐI & TỪNG DÒNG (PARTIAL STAGING)

Thay vì phải gõ lệnh terminal rườm rà `git add -p` và trả lời từng câu hỏi `(y/n/s/e/?)`:
1. Mở file cần xem trong Diff Viewer.
2. Di chuột vào khối mã muốn stage: khối code sẽ sáng đèn và hiển thị nút **"Stage Hunk"** (hoặc "Unstage Hunk").
3. **Phím tắt nhanh `Space`:** Bấm phím cách (`Space`) để Stage/Unstage khối code đang trỏ chuột chỉ trong 0.1 giây.
4. **Stage từng dòng:** Chọn bôi đen các dòng code mong muốn và chọn **"Stage Selected Lines"**.

Tính năng này giúp bạn dễ dàng bóc tách các thay đổi nháp, commit riêng phần logic quan trọng và để lại các dòng console.log chưa cần thiết.

---

## ✍️ 4. COMMIT BOX & QUY CHUẨN CONVENTIONAL COMMITS

Component: `src/lib/components/CommitBox.svelte`

- **Conventional Commit Quick Chips:** Cung cấp sẵn các thẻ thể loại commit chuẩn công nghiệp:
  - `feat:` Tính năng mới
  - `fix:` Sửa lỗi
  - `docs:` Viết tài liệu
  - `refactor:` Tái cấu trúc mã nguồn
  - `perf:` Tối ưu hiệu năng
  - `chore:` Công việc bảo trì
- **Tích hợp Local AI:** Bấm nút **"AI Generate"** để mô hình AI cục bộ (Ollama) tự động đọc toàn bộ staged diff và viết một commit message ngắn gọn, chuẩn xác.
- **Cờ Bỏ qua Git Hooks (`--no-verify`):** Checkbox cho phép bypass các pre-commit hooks khi cần thực hiện hotfix khẩn cấp mà không bị kẹt linter.

---

## 🛡️ 5. TRỢ LÝ .GITIGNORE THÔNG MINH

- Click chuột phải vào bất kỳ tệp untracked nào trong danh sách:
  - **Ignore file này:** Thêm chính xác tên file vào `.gitignore`.
  - **Ignore phần mở rộng:** Tự động thêm mẫu `*.log`, `*.tmp`, `*.cache`.
  - **Ignore thư mục cha:** Thêm toàn bộ thư mục chứa file vào quy tắc bỏ qua.
- Hỗ trợ tạo file `.gitignore` mẫu chuẩn hóa 1-click cho các môi trường phổ biến (Node.js, Rust, Python, Go, Java).
