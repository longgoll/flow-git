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

## 🏷️ 4. Project-Specific Account & Identity Binding System

Components: `src/lib/components/RepoBindingBanner.svelte`, `src/lib/components/RepoTagBadge.svelte`, `src/lib/components/toolbar/WorkspaceTabBar.svelte`, `src/lib/components/CommitBox.svelte`  
State Manager: `src/lib/state/repoBindingState.svelte.ts`  
Backend Storage: `src-tauri/src/storage/accounts.rs` (SQLite `repo_bindings` table)  
IPC Commands: `get_repo_binding`, `save_repo_binding`, `list_repo_bindings`, `delete_repo_binding`

### 4.1. The Multi-Account Dilemma
Developers routinely operate multiple Git accounts on the same workstation:
- Enterprise GitHub / GitLab account for work projects (`@work-enterprise`).
- Personal GitHub account for side-projects & open source (`@personal-dev`).

Mixing up remote credentials or committer identities can lead to permission errors during push or leak corporate identity into public repositories.

### 4.2. Repository-Level Binding Architecture
FlowGit permanently links an individual repository path to a specific developer account profile in SQLite:
- **Auto-Detection on Load:** When a workspace is opened, FlowGit inspects the remote origin URL and analyzes connected accounts to detect an affinity.
- **Repository Binding Banner (`RepoBindingBanner.svelte`):**
  - Appears if a repository does not yet have an explicit binding or if the remote URL suggests an account mismatch.
  - One-click confirmation: `"Bind this repo to @username"`.
- **Visual Workspace Badge (`RepoTagBadge.svelte`):**
  - Displays the bound account avatar and badge in the **Workspace Tab Bar** (`WorkspaceTabBar.svelte`) and the **Welcome Screen**.
  - Provides instant glanceable clarity of which account owns each open workspace tab.

### 4.3. Pre-Commit Identity Guard (`CommitBox.svelte`)
- Before creating a commit, FlowGit verifies that the current Git committer email matches the email of the repository's bound account.
- If a mismatch is detected, a warning chip illuminates with 1-click **"Sync Identity"** to update `.git/config` locally before committing, completely eliminating accidental cross-account leakage.

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

---

## 🏷️ 4. HỆ THỐNG LIÊN KẾT TÀI KHOẢN & DANH TÍNH THEO REPOSITORY (REPO BINDING)

Components: `src/lib/components/RepoBindingBanner.svelte`, `src/lib/components/RepoTagBadge.svelte`, `src/lib/components/toolbar/WorkspaceTabBar.svelte`, `src/lib/components/CommitBox.svelte`  
Quản lý trạng thái: `src/lib/state/repoBindingState.svelte.ts`  
Lưu trữ Backend: `src-tauri/src/storage/accounts.rs` (Bảng SQLite `repo_bindings`)  
Tauri IPC Commands: `get_repo_binding`, `save_repo_binding`, `list_repo_bindings`, `delete_repo_binding`

### 4.1. Vấn nạn nhầm lẫn tài khoản & danh tính (Multi-Account Conflict)
Lập trình viên hiện đại thường xuyên sử dụng nhiều tài khoản Git trên cùng một máy tính:
- Tài khoản GitHub / GitLab công ty cho các dự án nội bộ (`@work-enterprise`).
- Tài khoản GitHub cá nhân cho các dự án ngoài giờ & mã nguồn mở (`@personal-dev`).

Việc sử dụng sai token hoặc commit nhầm email cá nhân vào repo công ty thường dẫn đến lỗi 403/401 khi push hoặc vi phạm quy chế bảo mật mã nguồn doanh nghiệp.

### 4.2. Kiến trúc liên kết bền vững theo Repository (Repository-Level Binding)
FlowGit thiết lập liên kết 1-1 chặt chẽ giữa đường dẫn repository và hồ sơ tài khoản (Account Profile) được lưu trữ bền vững trong SQLite:
- **Tự động nhận diện (Auto-Detection):** Khi mở một dự án, FlowGit tự động phân tích remote URL (ví dụ: tên tổ chức, tên chủ sở hữu repo) và đối chiếu với danh sách các tài khoản đang kết nối.
- **Banner liên kết thông minh (`RepoBindingBanner.svelte`):**
  - Hiển thị thông báo gợi ý ngay trên đỉnh màn hình nếu repository chưa được gắn tài khoản hoặc phát hiện lệch tài khoản.
  - Thao tác 1-chạm: Bấm `"Liên kết với tài khoản @username"` để ghi nhận ràng buộc vĩnh viễn.
- **Huy hiệu trực quan trên Workspace (`RepoTagBadge.svelte`):**
  - Hiển thị avatar và tên tài khoản liên kết ngay trên từng tab repository tại **Workspace Tab Bar** (`WorkspaceTabBar.svelte`) và màn hình chào đón (Welcome Screen).
  - Giúp lập trình viên nhận diện ngay lập tức tab đang mở thuộc tài khoản công ty hay cá nhân.

### 4.3. Lá chắn kiểm tra danh tính trước khi Commit (`CommitBox.svelte`)
- Trước khi nhấn Commit, hệ thống tự động kiểm tra xem `user.email` trong `.git/config` hiện tại có khớp với tài khoản đã được liên kết với repo hay không.
- Nếu phát hiện sai lệch (ví dụ đang dùng email cá nhân nhưng repo liên kết tài khoản công ty), FlowGit sẽ hiển thị cảnh báo trực quan kèm nút **"Đồng bộ danh tính" (Sync Identity)** 1-click để tự động cập nhật cấu hình local trước khi commit.
