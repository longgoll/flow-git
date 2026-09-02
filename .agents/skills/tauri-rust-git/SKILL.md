---
name: tauri-rust-git
description: >-
  Hướng dẫn và tiêu chuẩn code Backend Rust + Tauri v2 cho ứng dụng Git Client hiệu năng cao (sử dụng git2-rs, rayon, tokio, notify). Kích hoạt khi phát triển hoặc chỉnh sửa code backend Rust, xử lý repository Git, IPC commands và quản lý đa luồng.
---

# KỸ NĂNG: TAURI V2 + RUST GIT CORE ENGINE

Kỹ năng này cung cấp các nguyên tắc, chuẩn mực thiết kế và mẫu code tối ưu khi phát triển Backend Rust cho FlowGit / RustGit GUI.

---

## 1. NGUYÊN TẮC CỐT LÕI (CORE PRINCIPLES)

1. **Hiệu năng là số 1 (Performance First):**
   - Không thực hiện I/O nặng hoặc duyệt đồ thị Git trên main thread / UI thread.
   - Sử dụng `tokio::task::spawn_blocking` cho các tác vụ `git2` đọc ghi đĩa.
   - Sử dụng `rayon` cho việc tính toán đồ thị (Lane Assignment, Topological Sort, Diff parsing).

2. **Xử lý Lỗi Tường Minh (Robust Error Handling):**
   - Sử dụng `thiserror` để định nghĩa Enum lỗi hệ thống.
   - Mọi Tauri Command phải trả về `Result<T, AppError>` có serialize JSON sang Frontend dễ hiểu.
   - Tuyệt đối không dùng `unwrap()` hoặc `expect()` trong runtime code để tránh crash ứng dụng.

3. **Cấu trúc Trả Dữ liệu Tối ưu (Data Serialization Efficiency):**
   - Chỉ truyền các trường cần thiết sang Frontend (giảm thiểu payload JSON qua IPC).
   - Format Commit hash dạng string rút gọn (short SHA 7 chars) + full SHA khi cần chi tiết.

---

## 2. KIẾN TRÚC THƯ MỤC BACKEND (RUST SRC STRUCTURE)

```
src-tauri/src/
├── git/
│   ├── mod.rs             # Re-export và abstractions chung
│   ├── repo.rs            # Mở, kiểm tra repo, HEAD, status
│   ├── history.rs         # Commit log, topological ordering, lane compaction
│   ├── diff.rs            # Line diff, hunk diff, intra-line diffing
│   ├── branches.rs        # Local/remote branch ops, ahead/behind counting
│   ├── safety.rs          # Safe discard (stash cache 48h), reflog time-travel
│   ├── simulation.rs      # Dry-run in-memory conflict & ghost preview
│   └── worktree.rs        # Git worktree manager
├── commands/
│   ├── mod.rs
│   ├── repo_commands.rs   # Tauri IPC #[tauri::command] cho repo/graph
│   ├── diff_commands.rs   # IPC cho diff/staging/discard
│   └── action_commands.rs # IPC cho rebase, merge, cherry-pick, undo
├── watcher/
│   └── mod.rs             # File system watcher sử dụng `notify`
├── error.rs               # Định nghĩa AppError với thiserror
└── main.rs / lib.rs       # Entrypoint Tauri v2 application setup
```

---

## 3. MẪU THIẾT KẾ IPC COMMAND (TAURI V2 PATTERN)

```rust
use tauri::{command, State};
use serde::{Serialize, Deserialize};
use crate::error::AppResult;

#[derive(Debug, Serialize, Deserialize)]
pub struct CommitNode {
    pub id: String,
    pub short_id: String,
    pub parents: Vec<String>,
    pub author_name: String,
    pub author_email: String,
    pub summary: String,
    pub timestamp: i64,
    pub lane: usize,
    pub refs: Vec<String>, // Branches, tags pointing here
}

#[command]
pub async fn get_commit_history(
    repo_path: String,
    max_count: usize,
) -> AppResult<Vec<CommitNode>> {
    tokio::task::spawn_blocking(move || {
        let repo = git2::Repository::open(&repo_path)?;
        crate::git::history::get_topological_history(&repo, max_count)
    })
    .await
    .map_err(|e| crate::error::AppError::Internal(e.to_string()))?
}
```

---

## 4. TÍNH TOÁN LANE ASSIGNMENT ĐA LUỒNG VỚI RAYON

- Khi phân tích đồ thị commit:
  - Duyệt theo thứ tự topo (Topological Order).
  - Sử dụng BitSet hoặc danh sách Lane còn trống để nén chiều ngang (Topological Lane Compaction).
  - Tận dụng `rayon::iter::IntoParallelRefIterator` khi tính diff hoặc metadata độc lập.

---

## 5. CHECKLIST TRƯỚC KHI SUBMIT CODE RUST
- [ ] Code không chứa `unwrap()` trong đường dẫn chính.
- [ ] Chạy `cargo clippy -- -D warnings` không có cảnh báo.
- [ ] Chạy `cargo test` vượt qua các bài kiểm tra logic Git.
- [ ] Đã comment giải thích các đoạn xử lý con trỏ hoặc bộ nhớ nhạy cảm của `git2-rs`.
