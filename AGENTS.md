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
   - **Framework:** Svelte 5 SPA (Vite) sử dụng 100% Runes (`$state`, `$state.raw`, `$derived`, `$effect`, `$props`).
   - **Quản lý Trạng thái:** Class-based Reactive Stores trong `src/lib/state/` (`RepoState`, `WorkingTreeState`, `RemoteState`, `GitSafetyState`, `ThemeState`, `ToastState`, `LocaleState`).
   - **Đa ngôn ngữ (i18n):** Hệ thống song ngữ Tiếng Việt (`vi`) & Tiếng Anh (`en`) qua `LocaleState` (`localeState.t(...)`) và từ điển kép `src/lib/i18n/locales/{vi,en}.ts`.
   - **Hiệu năng Dữ liệu Lớn:** Bắt buộc dùng `$state.raw` cho mảng dữ liệu Commit History hàng chục nghìn nodes để triệt tiêu chi phí Proxy overhead.
   - **Styling & UI Primitives:** Tailwind CSS v4 (`@tailwindcss/vite`), Bits UI / Lucide Svelte.
   - **Code & Diff Viewing:** Monaco Editor & Monaco Diff Editor cho mọi trải nghiệm xem code, diff và blame.
   - **Rendering Engine:** `OffscreenCanvas` + Web Worker chuyên biệt (`graphWorker.ts`), cách ly hoàn toàn việc vẽ đồ thị khỏi UI main-thread.
   - **GitHub Integration:** Octokit-less REST API Client (`src/lib/api/githubApi.ts`) siêu nhẹ, zero-dependency.
2. **Backend:**
   - **Framework:** Tauri v2 (IPC Capability Permissions scoped, Zero-copy serialization, 70+ commands).
   - **Language:** Rust (Edition 2021/2024).
   - **Crates Cốt lõi:** `git2` (libgit2 C-bindings), `rayon` (tính toán lane đa luồng), `tokio` (async network/IO), `notify` (realtime file watcher), `rusqlite` (SQLite lưu trữ Trash 48h, Action Undo Log, Account Auth), `serde`, `thiserror`.
   - **Local AI:** Tương thích chuẩn API cục bộ (Ollama / Local LLM) cho sinh commit message và giải thích conflict.

---

## 📁 HỆ THỐNG TÀI LIỆU & SKILLS
- `docs/README.md`: Trung tâm điều hướng sitemap toàn bộ 22 tài liệu kiến trúc, tính năng và hướng dẫn chi tiết.
- `.agents/skills/`: Kỹ năng chuyên biệt cho AI khi code:
  - [`tauri-rust-git`](./.agents/skills/tauri-rust-git/SKILL.md): Quy chuẩn Rust backend, IPC, `git2-rs`, concurrency `rayon`, `rusqlite`.
  - [`svelte5-canvas-graph`](./.agents/skills/svelte5-canvas-graph/SKILL.md): Svelte 5 Runes, `$state.raw`, OffscreenCanvas Web Worker, Bezier Splines.
  - [`git-safety-engine`](./.agents/skills/git-safety-engine/SKILL.md): Safe Discard snapshot (SQLite 48h), Reflog Time-travel, In-memory conflict dry-run.

---

## ⚡ NGUYÊN TẮC VÀNG KHI VIẾT CODE (GOLDEN CODING RULES)

1. **Quy trình Khép kín khi Thêm IPC Command Mới (Full-Loop IPC):**
   Mọi command mới ở Backend Rust phải hoàn tất đủ 5 bước nhất quán:
   - Viết logic trả về `Result<T, AppError>` trong `src-tauri/src/commands/<module>.rs`.
   - Re-export trong `src-tauri/src/commands/mod.rs`.
   - Đăng ký vào `generate_handler![...]` tại `src-tauri/src/lib.rs`.
   - Khai báo TypeScript types tương ứng trong `src/lib/types.ts`.
   - Viết wrapper function gọi `invoke()` trong `src/lib/api/<module>.ts`.

2. **Tuân thủ Svelte 5 Runes & State Architecture:**
   - Tuyệt đối không dùng cú pháp Svelte 4 cũ (`export let`, `let:`, `$:`, writable store cũ).
   - Khi chia sẻ state toàn cục, sử dụng hoặc mở rộng các State classes trong `src/lib/state/`.
   - Mảng commit history lớn bắt buộc dùng `$state.raw<CommitNode[]>`.

3. **An toàn Tuyệt đối trong Rust (No Panic):**
   - Nghiêm cấm sử dụng `unwrap()` hoặc `expect()` trong runtime command handlers. Luôn ánh xạ lỗi thành `AppError` và trả về `Result<T, AppError>`.

4. **Thao tác Git Bản địa qua `git2-rs`:**
   - Luôn sử dụng thư viện `git2` (libgit2 C-bindings). Không tùy tiện spawn `std::process::Command::new("git")` ra terminal bên ngoài nhằm bảo đảm tốc độ và không phụ thuộc Git CLI trên máy người dùng.

5. **Chuẩn hiển thị Mã nguồn & Diff:**
   - Mọi khu vực xem nội dung tệp, so sánh diff hoặc soi blame phải sử dụng `MonacoEditor.svelte` hoặc `MonacoDiffEditor.svelte`.

6. **Đồng bộ Tài liệu khi Thay đổi Code:**
   - Khi thêm mới hoặc thay đổi bất kỳ IPC command nào, bắt buộc cập nhật danh mục trong [`docs/architecture/ipc-api-reference.md`](./docs/architecture/ipc-api-reference.md).
   - Khi hoàn thành hoặc mở rộng tính năng, cập nhật tài liệu tương ứng trong `docs/features/`.

7. **Bắt buộc Song ngữ Toàn diện (i18n - Tiếng Việt & Tiếng Anh):**
   - Ứng dụng bắt buộc hỗ trợ đầy đủ 2 ngôn ngữ: Tiếng Việt (`vi`) và Tiếng Anh (`en`).
   - Nghiêm cấm hardcode chuỗi ký tự hiển thị (text, labels, buttons, tooltips, placeholders, modals, toasts, thông báo lỗi cho người dùng) trực tiếp trong file Svelte hoặc TypeScript.
   - Mọi chuỗi giao diện phải được ánh xạ qua `localeState.t('path.to.key', params?)` từ `src/lib/state/localeState.svelte.ts`.
   - Khi thêm tính năng mới hoặc chỉnh sửa giao diện, bắt buộc khai báo và đồng bộ đồng thời cả 2 từ điển:
     + `src/lib/i18n/locales/vi.ts` (chuẩn Tiếng Việt tự nhiên, chính xác, thân thiện với lập trình viên).
     + `src/lib/i18n/locales/en.ts` (chuẩn Tiếng Anh quốc tế chuẩn Git client).

8. **Quản lý Phiên bản – Single Source of Truth (Version Management):**
   - **Nguồn sự thật duy nhất** cho version là `package.json` → trường `"version"`.
   - **Nghiêm cấm** hardcode version string (ví dụ `"0.1.0"`, `"v0.2.0"`) ở bất kỳ file nào khác ngoài `package.json`.
   - Cơ chế tự động: `tauri.conf.json` đặt `"version": "../package.json"` (Tauri v2 native); frontend Svelte dùng global `APP_VERSION` (inject bởi `vite.config.ts`); website dùng GitHub API live.
   - Khi cần hiển thị version trong **Svelte component**, dùng trực tiếp `APP_VERSION` (không cần import):
     ```svelte
     <span>v{APP_VERSION}</span>
     ```
   - Khi phát hành phiên bản mới, **bắt buộc** dùng script đồng bộ thay vì sửa tay từng file:
     ```bash
     npm run bump <version>   # ví dụ: npm run bump 0.2.0
     ```
     Script này sync `package.json` + `Cargo.toml` cùng lúc và in lệnh git tag tiếp theo.
   - Xem chi tiết đầy đủ tại: [`docs/guides/version-management.md`](./docs/guides/version-management.md)

