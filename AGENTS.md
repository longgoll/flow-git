# QUY CHUẨN PHÁT TRIỂN & CHỈ DẪN DÀNH CHO AI (PROJECT AGENTS RULES)
## DỰ ÁN: NEXT-GEN TAURI V2 + RUST GIT CLIENT (FlowGit / RustGit GUI)
> **Cập nhật chuẩn công nghệ 2026 (State-of-the-Art Edition)**

Tài liệu này chứa các quy tắc bắt buộc và ngữ cảnh chung dành cho các AI Agent khi tham gia phát triển dự án.

---

## 🧭 TRIẾT LÝ THIẾT KẾ CỐT LÕI (CORE PHILOSOPHY)
- **Visual First – Zero Terminal Friction:** Biến mọi thao tác Git phức tạp thành tương tác trực quan 1-2 click và Kéo - Thả (Drag & Drop).
- **Tuyệt đối an toàn (No-Fear Git):** Không bao giờ làm mất mã nguồn của người dùng. Mọi thao tác nguy hiểm phải có **Safe Discard (48h Trash)** và **Undo `Ctrl + Z` (Time Machine)**.
- **Extreme Performance (60 FPS Locked):** Main-thread không bao giờ bị nghẽn; mọi tác vụ render đồ thị và tính toán Git đều chạy trên Worker / Thread pool.

---

## 🛠️ TECH STACK TIÊN TIẾN NHẤT 2026 (OFFICIAL 2026 STACK)
1. **Frontend:**
   - **Framework:** Svelte 5 SPA (Vite) sử dụng 100% Runes (`$state`, `$derived`, `$effect`, `$props`).
   - **Hiệu năng Dữ liệu Lớn:** Bắt buộc dùng `$state.raw` cho mảng dữ liệu Commit History hàng chục nghìn nodes để triệt tiêu chi phí Proxy overhead.
   - **Styling:** **Tailwind CSS v4** (sử dụng `@tailwindcss/vite`, CSS-first configuration, zero-runtime).
   - **UI Primitives:** **shadcn-svelte** (dựa trên **Bits UI**) cho các component Dialog, Dropdown, Tooltip, Command Palette tiêu chuẩn cao.
   - **Rendering Engine:** **`OffscreenCanvas` + Web Worker** chuyên biệt cho Living Commit Graph, cách ly hoàn toàn việc vẽ đồ thị khỏi UI main-thread.
2. **Backend:**
   - **Framework:** Tauri v2 (IPC Capability Permissions scoped, Zero-copy serialization).
   - **Language:** Rust (Edition 2021/2024).
   - **Crates Cốt lõi:** `git2` (libgit2), `rayon` (tính toán lane đa luồng), `tokio` (async tasks), `notify` (file system watcher), `rusqlite` (lưu trữ Trash Snapshot 48h & Action Undo history), `serde` / `serde_json`, `thiserror`.
   - **Local AI:** Tương thích chuẩn API cục bộ (Ollama / Local LLM) cho tính năng sinh commit message và giải thích conflict.

---

## 📁 CẤU TRÚC KHO LƯU TRỮ (REPOSITORY LAYOUT)
- `docs/`: Toàn bộ hệ thống tài liệu kiến trúc, tính năng và hướng dẫn:
  - [`docs/README.md`](./docs/README.md): Tổng quan sitemap và đối chiếu CLI vs GUI.
  - [`docs/main.md`](./docs/main.md): Đặc tả kỹ thuật và triết lý thiết kế hoàn chỉnh.
  - [`docs/architecture/`](./docs/architecture/): Kiến trúc hệ thống, IPC API reference và Safety Engine.
  - [`docs/features/`](./docs/features/): Tài liệu chi tiết từng tính năng đã hoàn thiện.
  - [`docs/playbook/real-world-recipes.md`](./docs/playbook/real-world-recipes.md): Sổ tay thực chiến cứu hộ Git.
- `.agents/skills/`: Kỹ năng chuyên biệt cho AI khi code:
  - [`tauri-rust-git`](./.agents/skills/tauri-rust-git/SKILL.md): Quy chuẩn Rust backend, IPC, `git2-rs`, concurrency `rayon`, `rusqlite`.
  - [`svelte5-canvas-graph`](./.agents/skills/svelte5-canvas-graph/SKILL.md): Svelte 5 Runes, `$state.raw`, OffscreenCanvas Web Worker, Bezier Splines.
  - [`git-safety-engine`](./.agents/skills/git-safety-engine/SKILL.md): Safe Discard snapshot (SQLite 48h), Reflog Time-travel, In-memory conflict dry-run.

---

## ⚡ NGUYÊN TẮC KHI VIẾT CODE
1. **Trước khi thực hiện tính năng mới:** Đọc tài liệu tương ứng trong `docs/` và kích hoạt skill phù hợp trong `.agents/skills/`.
2. **Không dùng `unwrap()` hay `expect()` trong Rust runtime:** Luôn dùng `Result<T, AppError>` và xử lý lỗi lịch thiệp.
3. **Frontend Svelte 5:** Tuyệt đối không dùng cú pháp Svelte 4 cũ (`export let`, `let:`, `$:`) mà bắt buộc dùng Svelte 5 Runes. Đối với danh sách commits > 1,000 items, dùng `$state.raw`.
4. **Kiểm thử:** Mọi logic xử lý Git hoặc tính toán đồ thị phải đi kèm Unit Test rõ ràng.
