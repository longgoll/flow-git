<div align="center">

# 🤝 FlowGit Contribution Guidelines
### Hướng Dẫn Đóng Góp Phát Triển FlowGit

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

Thank you for your interest in contributing to **FlowGit**! FlowGit is engineered as a next-generation, high-performance Git client built on three core pillars: **Visual First • Zero Terminal Friction • No-Fear Git**.

This guide covers everything you need to know from setting up your local environment and understanding our mandatory technical standards to submitting your Pull Request (PR).

---

## 🛠️ 1. Prerequisites

Before getting started, make sure your development environment has the following tools installed:

1. **Node.js:** Version `>= 20.x` (LTS recommended) with bundled `npm`.
2. **Rust Toolchain:** Version `>= 1.80` (Edition 2021/2024). Install or update via [rustup.rs](https://rustup.rs/):
   ```bash
   rustup update stable
   ```
3. **C++ Build Tools (Windows):** Visual Studio C++ Build Tools (MSVC) with Windows SDK installed (required for compiling Tauri v2 and `git2-rs` / libgit2 C-bindings).
4. **Git:** A modern Git release installed and configured on your machine.

---

## 🚀 2. Local Setup & Execution

### Step 1: Fork and Clone the Repository
```bash
# Clone the repository
git clone https://github.com/longgoll/flow-git.git
cd flow-git

# Create a dedicated feature branch from main
git checkout -b feat/your-feature-name
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Launch in Development Mode
You can run the application in two ways:

- **Run full Desktop App with Tauri v2 + Rust Backend (Recommended):**
  ```bash
  npm run tauri dev
  ```
  *(On the first run, Cargo will download and compile Rust dependencies like `git2`, `rayon`, `rusqlite`, which may take 2–4 minutes).*

- **Run Frontend SPA Web View Only (Fast Hot-Reload for UI/CSS iteration):**
  ```bash
  npm run dev
  ```

---

## 🧪 3. Pre-PR Quality Checks

Before committing and opening a Pull Request, **always** execute the following verification suite:

```bash
# 1. Full TypeScript & Svelte Runes type verification
npm run check

# 2. Rust Backend compilation & linter check
cd src-tauri
cargo check
cargo clippy
cd ..
```

> [!IMPORTANT]
> All checks above must pass with **0 errors and 0 warnings** before your Pull Request will be considered for review and merging.

---

## ⚡ 4. Mandatory Technical Standards (Golden Rules)

FlowGit enforces strict engineering standards to ensure bulletproof reliability and locked 60 FPS performance:

### 4.1. Frontend Svelte 5 (Runes Architecture)
- **100% Svelte 5 Runes:** Exclusively use `$state`, `$state.raw`, `$derived`, `$effect`, and `$props`. Legacy Svelte 4 syntax (`export let`, `let:`, `$:`, writable stores) is strictly forbidden.
- **Large Data Collections:** Large commit history arrays must be wrapped with `$state.raw<CommitNode[]>` to completely eliminate reactive proxy overhead.
- **Code & Diff Inspection:** All file content, diff comparisons, and blame views must use `MonacoEditor.svelte` and `MonacoDiffEditor.svelte`.

### 4.2. Backend Rust & Tauri v2
- **Absolute Safety (Zero Panic):** Never use `.unwrap()` or `.expect()` inside runtime command handlers. Always map errors into `AppError` and return `Result<T, AppError>`.
- **Native Git via `git2-rs`:** Exclusively use the `git2` crate (libgit2 C-bindings). Do not spawn external `Command::new("git")` terminal processes.
- **Full-Loop IPC Command Workflow:**
  1. Implement logic returning `Result<T, AppError>` in `src-tauri/src/commands/<module>.rs`.
  2. Re-export the function in `src-tauri/src/commands/mod.rs`.
  3. Register the command in `generate_handler![...]` inside `src-tauri/src/lib.rs`.
  4. Declare matching TypeScript interfaces in `src/lib/types.ts`.
  5. Provide an `invoke()` wrapper in `src/lib/api/<module>.ts`.

### 4.3. Comprehensive Bilingual Support (i18n)
- The application natively supports both **English (`en`)** and **Vietnamese (`vi`)**.
- **Never** hardcode raw user-facing text, button labels, placeholders, or error messages directly inside `.svelte` or `.ts` files.
- Always use `localeState.t('path.to.key')` and keep both dictionaries synchronized:
  - `src/lib/i18n/locales/en.ts`
  - `src/lib/i18n/locales/vi.ts`

### 4.4. Single Source of Truth for Versioning
- The single source of truth for application version is the `"version"` field in `package.json`.
- When updating versions, use the dedicated sync script:
  ```bash
  npm run bump <new-version>   # Example: npm run bump 0.2.0
  ```

---

## 📨 5. Commit Conventions & PR Workflow

### Commit Naming (Conventional Commits)
We follow the Conventional Commits specification:
- `feat: add branch filtering inside commit graph`
- `fix: resolve focus loss in Monaco Diff Editor`
- `perf: optimize lane calculation for repositories exceeding 50k commits`
- `i18n: add English translations for PR workspace`
- `docs: update Windows build guide`
- `refactor: modularize workingTreeState logic`

### Pull Request Submission:
1. Push your feature branch to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Navigate to the main repository on GitHub and click **Compare & pull request**.
3. Complete all fields according to our **Pull Request Template**.
4. Attach screenshots or GIFs for any user interface modifications.

Thank you for helping us craft the fastest, most reliable, and safest Git client! ❤️

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

Cảm ơn bạn đã quan tâm và muốn đóng góp cho **FlowGit**! Dự án được xây dựng với mục tiêu trở thành một Git Client thế hệ mới: **Visual First • Zero Terminal Friction • No-Fear Git**.

Tài liệu này sẽ hướng dẫn bạn chi tiết từ việc thiết lập môi trường phát triển cục bộ (local setup), các quy chuẩn code bắt buộc đến quy trình gửi Pull Request (PR).

---

## 🛠️ 1. Yêu Cầu Môi Trường (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:

1. **Node.js:** Phiên bản `>= 20.x` (khuyến nghị dùng bản LTS mới nhất) cùng `npm` đi kèm.
2. **Rust Toolchain:** Phiên bản `>= 1.80` (Edition 2021/2024). Cài đặt qua [rustup.rs](https://rustup.rs/):
   ```bash
   rustup update stable
   ```
3. **C++ Build Tools (Windows):** Visual Studio C++ Build Tools (MSVC) kèm Windows SDK để biên dịch Tauri v2 và `git2-rs` (libgit2 C-bindings).
4. **Git:** Phiên bản Git hiện đại trên máy tính của bạn.

---

## 🚀 2. Thiết Lập & Khởi Chạy Tại Local (Local Setup)

### Bước 1: Fork và Clone Repository
```bash
# Clone repo về máy
git clone https://github.com/longgoll/flow-git.git
cd flow-git

# Tạo nhánh tính năng mới từ nhánh main
git checkout -b feat/ten-tinh-nang-moi
```

### Bước 2: Cài Đặt Dependencies
```bash
npm install
```

### Bước 3: Khởi Chạy Ứng Dụng ở Chế Độ Development
Bạn có hai cách để chạy thử nghiệm:

- **Chạy toàn bộ Desktop App với Tauri v2 + Rust Backend (Khuyên dùng):**
  ```bash
  npm run tauri dev
  ```
  *(Lần chạy đầu tiên Cargo sẽ tải và biên dịch các thư viện Rust như `git2`, `rayon`, `rusqlite`, có thể mất 2–4 phút).*

- **Chỉ chạy giao diện Web SPA Frontend (Hot-Reload nhanh cho UI/CSS):**
  ```bash
  npm run dev
  ```

---

## 🧪 3. Kiểm Tra Chất Lượng Mã Nguồn (Pre-PR Checks)

Trước khi commit và gửi Pull Request, **bắt buộc** chạy các lệnh kiểm tra sau để đảm bảo không có lỗi tiềm ẩn:

```bash
# 1. Kiểm tra toàn diện TypeScript & Svelte Runes
npm run check

# 2. Kiểm tra biên dịch Rust Backend
cd src-tauri
cargo check
cargo clippy
cd ..
```

> [!IMPORTANT]
> Toàn bộ lệnh kiểm tra trên phải vượt qua với **0 errors và 0 warnings** trước khi PR của bạn được xem xét merge.

---

## ⚡ 4. Quy Chuẩn Kỹ Thuật Bắt Buộc (Golden Rules)

Dự án áp dụng các tiêu chuẩn kiến trúc nghiêm ngặt để đảm bảo an toàn tuyệt đối và hiệu năng 60 FPS:

### 4.1. Frontend Svelte 5 (Runes Architecture)
- **100% Cú pháp Svelte 5 Runes:** Bắt buộc dùng `$state`, `$state.raw`, `$derived`, `$effect`, `$props`. Tuyệt đối không dùng cú pháp Svelte 4 cũ (`export let`, `let:`, `$:`, writable store cũ).
- **Mảng dữ liệu lớn:** Mảng commit history lớn bắt buộc dùng `$state.raw<CommitNode[]>` để triệt tiêu chi phí Proxy overhead.
- **Xem Code & Diff:** Sử dụng `MonacoEditor.svelte` và `MonacoDiffEditor.svelte`.

### 4.2. Backend Rust & Tauri v2
- **Tuyệt đối an toàn (No Panic):** Nghiêm cấm dùng `.unwrap()` hoặc `.expect()` trong runtime command handlers. Luôn bắt lỗi và ánh xạ sang `AppError`, trả về `Result<T, AppError>`.
- **Git thuần bản địa:** Sử dụng thư viện `git2-rs` (libgit2 C-bindings). Không tùy tiện `Command::new("git")` ra terminal bên ngoài.
- **Quy trình thêm IPC Command mới (Full-Loop IPC):**
  1. Viết logic trả về `Result<T, AppError>` trong `src-tauri/src/commands/<module>.rs`.
  2. Re-export trong `src-tauri/src/commands/mod.rs`.
  3. Đăng ký vào `generate_handler![...]` tại `src-tauri/src/lib.rs`.
  4. Khai báo TypeScript types tương ứng trong `src/lib/types.ts`.
  5. Viết wrapper function gọi `invoke()` trong `src/lib/api/<module>.ts`.

### 4.3. Bắt Buộc Song Ngữ Toàn Diện (i18n)
- Ứng dụng hỗ trợ đồng thời **Tiếng Việt (`vi`)** và **English (`en`)**.
- **Nghiêm cấm** hardcode chuỗi text, label, thông báo lỗi trực tiếp trong file Svelte hay TypeScript.
- Luôn sử dụng `localeState.t('path.to.key')` và cập nhật đồng thời cả hai từ điển:
  - `src/lib/i18n/locales/vi.ts`
  - `src/lib/i18n/locales/en.ts`

### 4.4. Quản Lý Phiên Bản (Version Management)
- Nguồn sự thật duy nhất cho phiên bản là trường `"version"` trong `package.json`.
- Khi nâng cấp phiên bản, sử dụng:
  ```bash
  npm run bump <new-version>   # Ví dụ: npm run bump 0.2.0
  ```

---

## 📨 5. Quy Chuẩn Commit & Gửi Pull Request

### Quy ước đặt tên Commit (Conventional Commits)
Chúng tôi sử dụng chuẩn Conventional Commits rõ ràng:
- `feat: thêm bộ lọc nhánh trong commit graph`
- `fix: sửa lỗi mất focus trên Monaco Diff Editor`
- `perf: tối ưu lane calculation cho repo trên 50k commits`
- `i18n: bổ sung bản dịch tiếng Việt cho PR workspace`
- `docs: cập nhật hướng dẫn cài đặt trên Windows`
- `refactor: tái cấu trúc module workingTreeState`

### Quy trình gửi PR:
1. Push nhánh tính năng lên fork của bạn:
   ```bash
   git push origin feat/ten-tinh-nang-moi
   ```
2. Truy cập repository chính trên GitHub và nhấn **Compare & pull request**.
3. Điền đầy đủ thông tin theo mẫu **Pull Request Template** được cung cấp sẵn.
4. Đính kèm ảnh chụp màn hình hoặc GIF nếu PR có thay đổi về giao diện người dùng.

Cảm ơn bạn đã cùng chúng tôi xây dựng một công cụ Git mã nguồn mở mạnh mẽ và an toàn nhất! ❤️
