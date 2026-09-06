# ⚡ FlowGit (Next-Gen Git Client)
> **Visual First – Zero Terminal Friction – No-Fear Git**  
> State-of-the-Art Desktop Git Client built with **Tauri v2 (Rust)**, **Svelte 5 (Runes)**, **Tailwind CSS v4** & **Monaco Editor**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Tauri-v2-orange.svg)](https://v2.tauri.app/)
[![Frontend Svelte 5](https://img.shields.io/badge/Svelte-5%20Runes-ff3e00.svg)](https://svelte.dev/)
[![Engine Rust 2024](https://img.shields.io/badge/Rust-2024%20Edition-black.svg)](https://www.rust-lang.org/)

---

## 🌟 Điểm Nhấn Cốt Lõi (Core Features)

- 📊 **Living Commit Graph (60 FPS Locked):** Dựng đồ thị động học mượt mà qua HTML5 `OffscreenCanvas` và Web Worker chuyên biệt, không bao giờ gây nghẽn UI main-thread ngay cả với repository > 100,000 commits.
- 🛡️ **No-Fear Git (Safe Discard & Undo Time Machine):**
  - **Safe Discard 48h:** Tự động sao lưu uncommitted code vào SQLite trước khi xóa, khôi phục 100% qua Trash Inspector.
  - **Undo `Ctrl + Z`:** Hoàn tác tức thì các thao tác nguy hiểm (Reset, Rebase nhầm) qua `git reflog` và SQLite Action Journal.
- 🐙 **GitHub PR Workspace Tích Hợp:** Đánh giá PR (`PullRequestReviewer`), xem diff Monaco, bình luận, kiểm tra CI/CD checks (GitHub Actions), checkout nhánh PR và merge 1-chạm không cần rời khỏi ứng dụng.
- 🔀 **Interactive Rebase & Kéo-Thả (Drag & Drop):** Timeline trực quan đổi thứ tự commit, bôi đen gộp (Squash) bằng phím `S`, và **Ghost Preview** mô phỏng in-memory cảnh báo xung đột trước khi thả chuột.
- ⚔️ **Conflict Resolver 4 Khung Hình:** Phân tách rõ ràng Ours, Base, Theirs và Result, nhận từng khối mã chỉ với 1 click.
- 🐞 **Visual Git Bisect Wizard:** Tự động chia đôi đồ thị, dẫn dắt kiểm tra từng node để truy lùng commit gây bug trong 4-5 bước.
- 📂 **Repository Explorer & File Tools:** Duyệt cây tệp tin tại bất kỳ commit nào mà không cần checkout, Monaco Code Preview, Interactive Blame gutter, và **History Nuker** tẩy xóa triệt để file nhạy cảm (.env) khỏi lịch sử Git.
- 🥞 **Stacked Commits & Quick Hotfix:** Sắp xếp chuỗi commit chưa push và tạo nhánh hotfix độc lập từ `main` qua Git Worktrees.
- 📖 **Interactive In-App Guide (`F1` / `?`):** Bách khoa toàn thư hướng dẫn và bộ giải cứu sự cố Git tại chỗ (index.lock, wrong branch, heavy files scan).

---

## 🚀 Cài Đặt & Khởi Chạy (Quick Start)

### Yêu cầu tiên quyết:
- **Node.js** `>= 20.x`
- **Rust Toolchain** `>= 1.80` (Edition 2021/2024)
- **C++ Build Tools** (trên Windows để biên dịch `libgit2`)

### Khởi chạy môi trường Dev:
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi chạy ứng dụng với Hot Reload (HMR)
npm run tauri dev
```

### Đóng gói sản phẩm:
```bash
npm run tauri build
```

---

## 📚 Trung Tâm Tài Liệu Đầy Đủ (Documentation Hub)

Toàn bộ hệ thống 22 tài liệu đặc tả kiến trúc, tính năng chuyên sâu và sổ tay thực chiến nằm trong thư mục [`docs/`](./docs/README.md):
- 📖 [docs/README.md](./docs/README.md): Mục lục trung tâm & Bảng đối chiếu thao tác CLI vs FlowGit GUI.
- 🏗️ [docs/architecture/overview.md](./docs/architecture/overview.md): Kiến trúc tổng thể hệ thống (Tauri v2 + Svelte 5 + Rust).
- 🎨 [docs/architecture/offscreen-canvas-graph.md](./docs/architecture/offscreen-canvas-graph.md): Kiến trúc đồ thị OffscreenCanvas 60 FPS.
- 🔌 [docs/architecture/ipc-api-reference.md](./docs/architecture/ipc-api-reference.md): Bảng tra cứu 70+ Tauri IPC Commands.
- 🛡️ [docs/architecture/safety-engine.md](./docs/architecture/safety-engine.md): Động cơ Safe Discard & Time Machine.
- 🆘 [docs/playbook/real-world-recipes.md](./docs/playbook/real-world-recipes.md): 20 Kịch bản giải cứu Git thực chiến.
- ⌨️ [docs/guides/user-manual.md](./docs/guides/user-manual.md): Cẩm nang sử dụng & Bảng tra cứu phím tắt toàn năng.

---

## 📄 Bản Quyền (License)

Dự án được phân phối dưới giấy phép [MIT License](LICENSE).
