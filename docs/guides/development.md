# HƯỚNG DẪN PHÁT TRIỂN & ĐÓNG GÓI ỨNG DỤNG (DEVELOPMENT & BUILD GUIDE)
> **Dành cho AI Agents & Lập trình viên:** Thiết lập môi trường, kiểm thử và đóng gói FlowGit

---

## 🛠️ 1. YÊU CẦU MÔI TRƯỜNG (PREREQUISITES)

Để biên dịch và phát triển FlowGit trên môi trường máy tính (đặc biệt là Windows 10/11):
1. **Node.js:** Phiên bản `>= 20.x` (LTS khuyến nghị) kèm trình quản lý gói `npm`.
2. **Rust Toolchain:** Phiên bản Rust `>= 1.80` (Edition 2021/2024), cài đặt qua [rustup.rs](https://rustup.rs).
3. **C++ Build Tools (Windows):** Cài đặt **Visual Studio C++ Build Tools** (với gói "Desktop development with C++" và Windows SDK) để biên dịch các C-bindings của thư viện `git2` (libgit2).
4. **Tauri v2 CLI:** Đã được tích hợp sẵn qua npm script (`@tauri-apps/cli`).

---

## 🚀 2. KHỞI CHẠY MÔI TRƯỜNG DEV (LOCAL DEVELOPMENT)

### Cài đặt dependencies:
```bash
# Tại thư mục gốc f:/Dev/product/git-tool
npm install
```

### Chạy ứng dụng ở chế độ Live Reload (Dev Mode):
```bash
npm run tauri dev
```
- Lệnh này sẽ khởi động máy chủ Vite Frontend tại `http://localhost:1420` đồng thời biên dịch backend Rust và mở cửa sổ Native Tauri v2.
- Mọi thay đổi trong tệp Svelte (`src/`) sẽ được cập nhật tức thì qua HMR (Hot Module Replacement).
- Mọi thay đổi trong mã nguồn Rust (`src-tauri/src/`) sẽ kích hoạt tự động biên dịch lại mã nhị phân.

---

## 🧪 3. KIỂM THỬ MÃ NGUỒN (TESTING & VERIFICATION)

### 3.1. Kiểm tra chất lượng Frontend (TypeScript & Svelte Check)
```bash
# Kiểm tra toàn bộ kiểu dữ liệu TypeScript và cú pháp Svelte 5 Runes
npm run check
```

### 3.2. Chạy Unit Tests Backend Rust
Các module Git, tính toán Lane đa luồng và SQLite Storage đều có các bài kiểm thử unit tests tự động:
```bash
cd src-tauri
cargo test
```
*Lưu ý: Luôn bảo đảm tất cả các bài test vượt qua trước khi merge code vào nhánh phát triển chính.*

---

## 📦 4. ĐÓNG GÓI BẢN PHÁT HÀNH (PRODUCTION BUILD)

Để tạo bộ cài đặt hoàn chỉnh cho người dùng cuối:
```bash
npm run tauri build
```

Sau khi hoàn tất, Tauri v2 sẽ sinh ra các bộ cài đặt tối ưu hóa tại thư mục:
- **Windows Installer (`.msi`):** `src-tauri/target/release/bundle/msi/`
- **Windows Setup (`.exe` NSIS):** `src-tauri/target/release/bundle/nsis/`
- **Mã nhị phân độc lập:** `src-tauri/target/release/flowgit.exe`

---

## 📁 5. CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT LAYOUT)

```
git-tool/
├── .agents/skills/             # Các AI Skills hướng dẫn code (Tauri-Rust, Svelte 5 Canvas, Safety Engine)
├── docs/                       # Toàn bộ hệ thống tài liệu đặc tả, kiến trúc, tính năng và playbook
├── src/                        # Frontend Svelte 5 SPA
│   ├── app.css                 # Cấu hình Tailwind CSS v4
│   ├── App.svelte              # Component gốc tích hợp 3-Column Layout và Modals
│   └── lib/
│       ├── api/                # Các hàm Wrapper gọi Tauri IPC invoke()
│       ├── components/         # 40+ UI Components (Graph, Diff, Modals, Blame, Bisect, v.v.)
│       ├── state/              # Class-based Svelte 5 Runes Stores (Repo, WT, Remote, Safety)
│       └── workers/            # graphWorker.ts (OffscreenCanvas rendering 60 FPS)
└── src-tauri/                  # Backend Rust Core
    ├── Cargo.toml              # Khai báo crate dependencies (git2, tokio, rayon, notify, rusqlite)
    ├── tauri.conf.json         # Cấu hình Scoped Capability Permissions của Tauri v2
    └── src/
        ├── commands/           # 65+ IPC Command Handlers phân theo domain
        ├── git/                # Core Git operations & Dry-run simulation algorithms
        ├── storage/            # SQLite tables: Trash snapshots 48h, Action journal, Accounts
        └── watcher/            # Realtime debounced file watcher
```
