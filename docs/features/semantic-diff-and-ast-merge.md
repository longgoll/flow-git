<div align="center">

# 🧬 Semantic Diff & AST Conflict Resolution
### So Sánh Ngữ Nghĩa & Tự Động Xử Lý Xung Đột Bằng Cú Pháp (AST)

> **Core Engine:** Tree-sitter Rust AST Parser (TypeScript, Rust, Python, Go)  
> **Visuals:** Entity Move Detection Badges, Jump Links & 1-Click Magic AST Auto-Merge  
> **Safety Guard:** Automatic Syntax Validation Guard (`has_error()` detection) & Rollback  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🧬 1. The AST Evolution: Beyond Traditional Line-by-Line Git

Traditional Git clients rely strictly on the **Myers line-by-line diff algorithm** established in the 1980s. Line diffs are blind to syntax:
1. **Move Noise:** Moving an 80-line function from line 10 to line 95 causes Git to report 80 deleted lines and 80 added lines, obscuring actual logic modifications.
2. **False-Positive Conflicts:** When two engineers independently add distinct functions at the bottom of the same file, or sort/add different import statements, Git flags severe line collisions (`<<<<<<< HEAD`).
3. **Merge Burnout:** Reviewers and developers waste significant cognitive energy resolving trivial line clashes manually.

**FlowGit v0.2.0** introduces a native **Tree-sitter AST Engine** compiled directly into the Rust core, delivering syntax-aware code intelligence across TypeScript, JavaScript, Rust, and Python.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TREE-SITTER AST ENGINE                        │
├────────────────────────────────────┬────────────────────────────────────┤
│         Semantic Diff              │       AST Conflict Resolver        │
│  - Entity Move Detection           │  - Magic Auto-Resolve Button       │
│  - Function & Class Signature Diff │  - Independent Additions Merge     │
│  - Token-level Body Hashing        │  - Import Block Deduplication      │
│  - Jump to Old/New Line Position   │  - Syntax Error Rollback Guard     │
└────────────────────────────────────┴────────────────────────────────────┘
```

---

## 📦 2. Move Detection & Entity-Level Diff

Component: `src/lib/components/DiffViewer.svelte`  
Backend: `src-tauri/src/git/semantic/diff_engine.rs`

### Capabilities:
- **Node Hashing:** Computes normalized structural hashes for functions, methods, classes, and structs.
- **Relocation Detection:** When a function's body hash matches between old and new versions but its start line shifted, FlowGit identifies it as a **Moved Entity** rather than an add/delete collision.
- **Visual Move Badges:** Shows prominent badges such as:
  `📦 1 moved function(s)/class(es) (100% identical) [parseConfig: L12 ➔ L85]`.
- **Semantic Summary:** Displays concise summaries such as *"1 moved, 1 modified, 1 added"*.

---

## 🪄 3. AST-Based 3-Way Conflict Auto-Merge

Component: `src/lib/components/ConflictResolver.svelte`  
Backend: `src-tauri/src/git/semantic/conflict_engine.rs`

### How It Works:
During merge or rebase conflicts, FlowGit parses the 3-Way conflict chunks (`Ancestor`, `Ours`, `Theirs`):
1. **Independent Sibling Additions (`ast_solvable_independent_addition`):**
   - If both branches added new functions or classes in the same region, the AST engine verifies whether their identifier names are disjoint.
   - If non-overlapping, it weaves both additions together cleanly with proper whitespace.
2. **Import Block Merging (`ast_solvable_imports`):**
   - Identifies import/use statements added by both branches, automatically combines them, deduplicates identical modules, and sorts them deterministically.
3. **Collision Detection (`ast_colliding_modification`):**
   - If both branches modified the same function or entity body, it marks the chunk with a yellow warning badge, leaving the final architectural choice safely to the developer.

### 🛡️ Syntax Validation Guard (No-Fear Principle):
Before presenting or writing any auto-resolved code, the engine parses the merged output back through Tree-sitter. If `tree.root_node().has_error()` detects syntax corruption:
- The merge is **immediately aborted and rolled back**.
- The user is alerted with a clear toast notification.
- FlowGit returns cleanly to the manual 3-Way Monaco Conflict Resolver without risking code corruption.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🧬 1. Bước Nhảy Vọt Cú Pháp (AST): Vượt Qua Giới Hạn Myers Git

Git truyền thống sử dụng thuật toán so khớp dòng chữ (Myers Diff) ra đời từ thập niên 1980. Điểm yếu cốt tử là thuật toán này hoàn toàn **"mù" về mặt cú pháp ngôn ngữ**:
1. **Nhiễu khi di chuyển code:** Dời 1 hàm 80 dòng từ đầu file xuống cuối file khiến Git báo "Xóa 80 dòng, Thêm 80 dòng", làm người review mất hàng giờ rà soát lại từng chữ.
2. **Xung đột giả mạo (False-Positive Conflicts):** Hai người cùng thêm 2 hàm độc lập ở cuối file hoặc cùng thêm `import` mới khiến Git báo xung đột đỏ chót vì cùng chạm vào một khoảng dòng.
3. **Mệt mỏi khi xử lý thủ công:** Lập trình viên phải mở resolver ra copy-paste thủ công các đoạn code không hề mâu thuẫn về mặt logic.

**FlowGit v0.2.0** tích hợp trực tiếp bộ phân tích cú pháp **Tree-sitter bằng Rust**, hỗ trợ phân tích chuyên sâu các ngôn ngữ: TypeScript, JavaScript, Rust, Python.

---

## 📦 2. Phát Hiện Di Chuyển Hàm (Move Detection)

Component: `src/lib/components/DiffViewer.svelte`  
Backend: `src-tauri/src/git/semantic/diff_engine.rs`

### Tính Năng Nổi Bật:
- **Băm Cú Pháp Thực Thể (Node Hashing):** Tính toán hash chuẩn hóa của thân hàm, lớp, struct, bỏ qua khoảng trắng và định dạng râu ria.
- **Nhận Diện Dời Vị Trí:** Nếu nội dung hàm giữ nguyên 100% nhưng vị trí dòng thay đổi, FlowGit định danh chính xác đây là **Hàm được di chuyển (Moved)** thay vì xóa và thêm mới.
- **Thanh Thông Báo Trực Quan:** Hiển thị banner:
  `📦 1 hàm/lớp di chuyển vị trí (Giữ nguyên 100%) [parseConfig: L12 ➔ L85]`.
- **Tóm Tắt Ngữ Nghĩa:** Tóm tắt nhanh số lượng thực thể bị sửa đổi, thêm mới hoặc xóa bỏ (`1 moved, 1 modified, 1 added`).

---

## 🪄 3. Tự Động Hòa Giải Xung Đột Bằng Cú Pháp (AST Auto-Merge)

Component: `src/lib/components/ConflictResolver.svelte`  
Backend: `src-tauri/src/git/semantic/conflict_engine.rs`

### Cơ Chế Hoạt Động:
Khi gặp xung đột khi Merge hoặc Rebase, FlowGit tự động phân tích các khối xung đột 3-Way (Ancestor, Ours, Theirs):
1. **Thêm Thực Thể Độc Lập (`ast_solvable_independent_addition`):**
   - Hai nhánh cùng thêm hàm/lớp vào cùng vị trí. AST engine kiểm tra tên các thực thể không trùng nhau và tự động gộp cả 2 khối code an toàn.
2. **Gộp Khối Imports (`ast_solvable_imports`):**
   - Nhận diện các câu lệnh `import` / `use` từ cả 2 nhánh, tự động hợp nhất, khử trùng lặp và sắp xếp theo chuẩn.
3. **Cảnh Báo Xung Đột Logic (`ast_colliding_modification`):**
   - Cả 2 nhánh cùng sửa chung thân một hàm sẽ được gắn nhãn cảnh báo vàng, giữ nguyên quyền quyết định thủ công cho lập trình viên.

### 🛡️ Chốt Chặn An Toàn Cú Pháp (Syntax Validation Guard):
Sau khi tổng hợp mã nguồn tự động, hệ thống parse ngược lại mã nguồn qua Tree-sitter:
- Nếu phát hiện lỗi cú pháp (`tree.root_node().has_error()`), FlowGit lập tức **hủy bỏ và rollback an toàn**.
- Hiển thị thông báo giải thích rõ ràng lý do cho người dùng.
- Tuyệt đối không bao giờ ghi đè mã nguồn lỗi vào repository.
