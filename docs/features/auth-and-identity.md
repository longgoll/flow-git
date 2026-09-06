<div align="center">

# 🔑 Authentication & Git Identity Switcher
### Xác Thực Bảo Mật & Chuyển Đổi Danh Tính (Auth & Identity)

> **Security:** OAuth 2.0 Device Flow + Personal Access Token + In-Memory SSH Key Cache  
> **Identity Control:** Seamless toggling between personal and corporate Git identities (Local vs Global)  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🔐 1. Intelligent Authentication Interception

Component: `src/lib/components/AuthCredentialModal.svelte`  
Tabs: `src/lib/components/auth/` (`DeviceFlowTab.svelte`, `TokenAuthTab.svelte`, `SshKeyTab.svelte`)  
Backend: `src-tauri/src/git/auth.rs` & `src-tauri/src/storage/accounts.rs`

### 1.1. Automated Error Interception
When executing remote operations (`Push`, `Pull`, `Fetch`, `Smart Sync`), if errors occur:
- `Permission denied (publickey)` (SSH passphrase required).
- `HTTP 401 Unauthorized` / `Bad credentials` (HTTPS token required).

Rather than halting with cryptic CLI error output, FlowGit intercepts the failure and displays an **"Authentication Required"** modal.

---

## 📱 2. Three Authentication Methods

### 2.1. GitHub OAuth Device Flow (`DeviceFlowTab.svelte`)
1. Click **"Login with GitHub"**.
2. FlowGit generates a User Code (e.g., `ABCD-1234`) and verification URL `https://github.com/login/device`.
3. Copies code to clipboard and opens browser.
4. Rust backend polls in the background; upon browser authorization, FlowGit stores token, avatar, and username securely.

### 2.2. Personal Access Token (PAT) (`TokenAuthTab.svelte`)
- For GitHub, GitLab, Bitbucket, or self-hosted instances (Gitea).
- Token permission verification (`repo`, `read:user`, `workflow`).
- Encrypted SQLite local persistence.

### 2.3. SSH Key & Passphrase Management (`SshKeyTab.svelte`)
- Supports standard keys (`id_ed25519`, `id_rsa`).
- Secure in-memory passphrase caching avoids repeated prompts during active sessions.

---

## 👤 3. Git Identity Switcher

Component: `src/lib/components/IdentitySwitcherModal.svelte`  
Backend: `src-tauri/src/git/identity.rs`

### The Problem:
Accidentally committing personal emails (`myname@gmail.com`) to corporate repos (`dev@corp.com`) can breach internal security compliance.

### FlowGit Solution:
- **StatusBar Visibility:** Displays active identity:  
  `👤 John Doe <john@company.com> [Local Config]`
- **1-Click Switching:**
  - Click StatusBar to open Identity Switcher.
  - Switch between presets: "Work", "Personal", "Open Source".
  - Scope to **Repository (`.git/config`)** or **Global (`~/.gitconfig`)**.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🔐 1. XÁC THỰC THÔNG MINH (AUTH CREDENTIAL MODAL)

Component: `src/lib/components/AuthCredentialModal.svelte`  
Thư mục tab con: `src/lib/components/auth/` (`DeviceFlowTab.svelte`, `TokenAuthTab.svelte`, `SshKeyTab.svelte`)  
Backend: `src-tauri/src/git/auth.rs` & `src-tauri/src/storage/accounts.rs`

### 1.1. Bắt lỗi xác thực tự động (Auth Interception)
Khi người dùng thực hiện các thao tác kết nối mạng như `Push`, `Pull`, `Fetch`, hoặc `Smart Sync`, nếu gặp lỗi:
- `Permission denied (publickey)` (SSH Key yêu cầu passphrase).
- `HTTP 401 Unauthorized` / `Bad credentials` (HTTPS yêu cầu token/mật khẩu).

Thay vì hiển thị thông báo lỗi dòng lệnh màu đỏ và dừng lại, FlowGit tự động bắt lỗi và hiển thị popup **"Authentication Required"** với 3 tab xác thực hiện đại.

---

## 📱 2. BA PHƯƠNG THỨC XÁC THỰC

### 2.1. GitHub OAuth Device Flow (`DeviceFlowTab.svelte`)
- Phương thức đăng nhập tiện lợi và an toàn nhất hiện nay:
  1. Người dùng bấm **"Login with GitHub"**.
  2. FlowGit gọi `start_github_device_login` sinh ra mã người dùng (User Code, ví dụ: `ABCD-1234`) và đường link xác nhận `https://github.com/login/device`.
  3. Ứng dụng tự động sao chép mã vào Clipboard và mở trình duyệt mặc định.
  4. Rust backend tiến hành thăm dò (polling) định kỳ trong nền. Ngay khi bạn bấm xác nhận trên trình duyệt, FlowGit tự động nhận token, tải avatar, username và lưu vào hệ thống an toàn.

### 2.2. Personal Access Token (PAT) (`TokenAuthTab.svelte`)
- Dành cho GitHub, GitLab, Bitbucket hoặc các máy chủ tự host (Self-hosted GitLab / Gitea):
  - Nhập Token trực tiếp với tùy chọn kiểm tra quyền (`repo`, `read:user`, `workflow`).
  - Tùy chọn lưu trữ trong SQLite cục bộ được mã hóa.

### 2.3. Quản lý Khóa SSH & Passphrase (`SshKeyTab.svelte`)
- Hỗ trợ các tệp khóa SSH tiêu chuẩn (`id_ed25519`, `id_rsa`).
- Cho phép nhập Passphrase giải mã khóa và lưu tạm trong phiên làm việc (In-Memory Session Cache), bảo đảm an toàn tuyệt đối mà không cần phải nhập lại liên tục mỗi lần push code.

---

## 👤 3. BỘ CHUYỂN ĐỔI DANH TÍNH GIT (IDENTITY SWITCHER)

Component: `src/lib/components/IdentitySwitcherModal.svelte`  
Backend: `src-tauri/src/git/identity.rs`

### Vấn đề:
Lập trình viên làm việc song song trên máy tính cá nhân:
- Sáng làm dự án công ty cần dùng email: `dev@enterprise-corp.com`.
- Tối làm dự án Open Source cần dùng email cá nhân: `myname@gmail.com`.
- Việc commit nhầm email cá nhân vào repo công ty rất phổ biến và có thể vi phạm chính sách bảo mật nội bộ.

### Trải nghiệm trên FlowGit:
- **Hiển thị trực quan trên StatusBar:**
  - Nhìn thấy ngay danh tính đang hoạt động:  
    `👤 John Doe <john@company.com> [Local Config]`
- **Chuyển đổi 1-chạm:**
  - Nhấp chuột vào StatusBar mở modal Identity Switcher.
  - Cho phép lưu sẵn các hồ sơ mẫu (Profiles): "Công ty", "Cá nhân", "Dự án Khách hàng".
  - Chọn áp dụng cho:
    - **Chỉ Repository này (Local):** Ghi đè cấu hình `.git/config`.
    - **Toàn bộ máy tính (Global):** Ghi đè cấu hình `~/.gitconfig`.
