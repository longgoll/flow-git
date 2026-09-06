<div align="center">

# 🐙 GitHub Workspace & Pull Request Reviewer
### Trung Tâm GitHub & Đánh Giá Pull Requests (PR Hub & Reviewer)

> **Collaboration Standard:** Zero-Context-Switching – Never leave FlowGit to open a web browser  
> **Integrations:** GitHub REST API v3 Client, Pull Request Reviewer, Diff Inspector, CI/CD Checks & Recent Push Banner  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🧭 1. GitHub Workspace Overview

In modern Git workflows, developers constantly juggle between Git GUIs and browser tabs:
- Pushing code requires opening a browser to submit a PR.
- Reviewing teammates' PRs requires toggling tabs to read code diffs.
- Testing PR branches locally requires manual `gh pr checkout` or fetch commands.

**FlowGit embeds a lightweight GitHub Workspace directly into the client:**
1. **Pull Request Reviewer (`PullRequestReviewer.svelte`):** Browse PRs, inspect changed file trees, submit reviews and comments, verify CI/CD checks, and merge with 1 click.
2. **Instant PR Creation (`CreatePullRequestModal.svelte`):** Select source and target branches, auto-populate title from commit messages, and create Draft PRs.
3. **Recent Push Banner (`RecentPushBanner.svelte`):** Pops immediately following push operations, prompting 1-click PR creation.
4. **Publish Repository (`PublishRepoModal.svelte`):** Publishes local repositories to GitHub in seconds.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ GITHUB WORKSPACE WORKFLOW IN FLOWGIT                                                   │
│                                                                                        │
│  [Local Git Commits] ────► [Push to Origin] ────► [RecentPushBanner: "Create PR?"]     │
│                                                              │                         │
│                                                              ▼                         │
│  ┌─────────────────────────────────┐       ┌────────────────────────────────────────┐ │
│  │ CreatePullRequestModal.svelte   │       │ PullRequestReviewer.svelte             │ │
│  │ ├── Base vs Head branch         │       │ ├── PR List (Open, Merged, All)        │ │
│  │ ├── Auto Title & Description    │       │ ├── File Tree Diff & Monaco Diff View  │ │
│  │ ├── Assign Reviewers & Labels   │──────►│ ├── CI/CD Status (GitHub Actions)      │ │
│  │ └── Draft PR Support            │       │ ├── Review: Approve / Request Changes  │ │
│  └─────────────────────────────────┘       │ ├── 1-Click "Checkout PR Branch"       │ │
│                                            │ └── Merge: Merge / Squash / Rebase     │ │
│                                            └────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 2. Pull Request Reviewer

Component: [`src/lib/components/PullRequestReviewer.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/PullRequestReviewer.svelte)

Accessible via the **"Pull Requests"** tab or `Ctrl + Shift + P`:

### 2.1. PR List & Filtering
- **Status Filters:** Open, Merged, Closed.
- **Summary Metrics:** PR Number (`#124`), title, author with avatar, updated time, and `+` / `-` lines changed.
- **Realtime Search:** Filter by PR title or author username.

### 2.2. Conversation & Discussion Timeline
- Rendered Markdown descriptions with task lists, tables, and code snippets.
- Realtime comment thread with submission via `postGitHubPRComment`.

### 2.3. CI/CD Checks Status
- Queries GitHub Check Runs (`fetchGitHubPRChecks`):
  - **Success:** Green checkmark for passing GitHub Actions workflows.
  - **Pending:** Yellow spinning indicator.
  - **Failure:** Red warning indicator cautioning against merging.

### 2.4. File Diff Inspection & Reviews
- File change tree with addition/deletion counters.
- High-fidelity **Monaco Diff Editor** inspection.
- **Submit Review Dialog:** Approve, Request Changes, or General Comment.

### 2.5. 1-Click Checkout & Merge
- **"Checkout PR Branch":** Automatically fetches PR branch and checks out locally.
- **"Merge Pull Request":** Supports GitHub strategies (`Create a merge commit`, `Squash and merge`, `Rebase and merge`).

---

## 🚀 3. Fast PR Creation

Component: [`src/lib/components/CreatePullRequestModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/CreatePullRequestModal.svelte)

- **Branch Selectors:** Select `base` (e.g., `main`) and `compare` branch.
- **Ahead / Behind Calculation:** Automatically evaluates commit distance.
- **Auto-generated Title:** Prefills with latest commit message.
- **Draft PR Option:** Flags PRs as Draft to prevent premature merging.

---

## 🔔 4. Recent Push Banner

Component: [`src/lib/components/RecentPushBanner.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/RecentPushBanner.svelte)

Immediately upon pushing local branches:
- A non-intrusive banner prompts: *"You pushed `feat/auth-ui` to `origin` 10s ago. Create a Pull Request?"*
- Clicking **"Create Pull Request"** opens the creation dialog with pre-filled parameters.

---

## 📦 5. Publish Repository to GitHub

Component: [`src/lib/components/PublishRepoModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/PublishRepoModal.svelte)

For newly initialized local repos (`git init`):
1. Click **"Publish to GitHub"** on the Toolbar.
2. Select repository name, visibility (**Public** or **Private**), and description.
3. FlowGit calls the GitHub API, configures the remote, and pushes `main` in under 3 seconds.

---

## 🔑 6. GitHub API Client

File: [`src/lib/api/githubApi.ts`](file:///f:/Dev/product/git-tool/src/lib/api/githubApi.ts)

- Secure PAT token handling in local encrypted SQLite.
- `parseGitHubRemote`: Robust regex parsing owner and repo from HTTPS and SSH URLs.
- Zero-dependency native fetch engine ensuring zero startup latency.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🧭 1. TỔNG QUAN VỀ GITHUB PR HUB

Trong quy trình phát triển hiện đại (Gitflow / Trunk-based), lập trình viên và Tech Lead phải liên tục chuyển đổi qua lại giữa Git Client và trình duyệt web (GitHub):
- Push code xong phải mở trình duyệt để tạo PR.
- Xem xét PR của đồng nghiệp phải mở web, chuyển qua lại giữa các tab để đối chiếu code.
- Muốn test thử code PR phải gõ lệnh terminal `gh pr checkout` hoặc fetch remote branch thủ công.

**FlowGit tích hợp hoàn chỉnh một GitHub Workspace thu nhỏ trực tiếp trong ứng dụng:**
1. **Pull Request Reviewer (`PullRequestReviewer.svelte`):** Duyệt PR, xem cây file thay đổi, đọc và gửi nhận xét (Review Comments), kiểm tra trạng thái CI/CD và gộp PR (Merge) với 1 cú nhấp chuột.
2. **Tạo PR Siêu Tốc (`CreatePullRequestModal.svelte`):** Chọn nhánh nguồn, nhánh đích, tự động điền tiêu đề từ commit và tạo PR nháp (Draft PR).
3. **Biểu ngữ Đẩy Mã Tức Thì (`RecentPushBanner.svelte`):** Hiển thị ngay sau khi người dùng push code lên remote, nhắc tạo PR chỉ bằng 1 nút bấm.
4. **Xuất Bản Kho Lưu Trữ (`PublishRepoModal.svelte`):** Đẩy kho code cục bộ mới lên GitHub chỉ trong vài giây.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ GITHUB WORKSPACE WORKFLOW TRONG FLOWGIT                                                │
│                                                                                        │
│  [Local Git Commits] ────► [Push to Origin] ────► [RecentPushBanner: "Create PR?"]     │
│                                                              │                         │
│                                                              ▼                         │
│  ┌─────────────────────────────────┐       ┌────────────────────────────────────────┐ │
│  │ CreatePullRequestModal.svelte   │       │ PullRequestReviewer.svelte             │ │
│  │ ├── Base branch vs Head branch  │       │ ├── Danh sách PRs (Open, Merged, All)  │ │
│  │ ├── Tự sinh Title & Description │       │ ├── File Tree Diff & Monaco Diff View  │ │
│  │ ├── Gán Reviewers & Labels      │──────►│ ├── CI/CD Status (GitHub Actions)      │ │
│  │ └── Hỗ trợ Draft PR             │       │ ├── Review: Approve / Request Changes  │ │
│  └─────────────────────────────────┘       │ ├── 1-Click "Checkout PR Branch"       │ │
│                                            │ └── Merge: Merge / Squash / Rebase     │ │
│                                            └────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 2. KHÔNG GIAN ĐÁNH GIÁ PULL REQUEST (PULL REQUEST REVIEWER)

Component: [`src/lib/components/PullRequestReviewer.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/PullRequestReviewer.svelte)

Khi mở tab **"Pull Requests"** trên thanh Toolbar hoặc bấm phím tắt `Ctrl + Shift + P`:
Giao diện chuyển sang chế độ chuyên biệt gồm 3 phân vùng tiêu chuẩn:

### 2.1. Cột Danh sách PR (PR List & Filtering)
- **Bộ lọc trạng thái:** Lọc theo PR đang mở (`Open`), đã gộp (`Merged`) hoặc đã đóng (`Closed`).
- **Thông tin tóm tắt:** Số hiệu PR (`#124`), tiêu đề, tác giả kèm avatar, thời gian cập nhật, số lượng file thay đổi và số dòng thêm/bớt (`+142 -35`).
- **Thanh tìm kiếm realtime:** Tìm kiếm theo tiêu đề hoặc tên tác giả.

### 2.2. Khung Chi tiết & Thảo luận (PR Conversation & Timeline)
- **Tiêu đề & Nhãn trạng thái:** Hiển thị Badge trạng thái (Xanh lá `Open`, Tím `Merged`, Đỏ `Closed`, Xám `Draft`).
- **Nội dung mô tả (Markdown):** Render đầy đủ định dạng văn bản, checkbox danh sách công việc (Tasklists), bảng biểu và khối code.
- **Dòng thời gian bình luận (Comments):**
  - Hiển thị nhận xét từ các thành viên trong nhóm kèm avatar và timestamp.
  - Khung soạn thảo cho phép viết và gửi bình luận mới trực tiếp lên GitHub thông qua API `postGitHubPRComment`.

### 2.3. Kiểm tra Trạng thái Tự Động (CI/CD Checks Status)
- FlowGit tự động truy vấn endpoint GitHub Check Runs (`fetchGitHubPRChecks`):
  - **Thành công (Success):** Icon tick xanh kèm nhãn các workflow GitHub Actions đã vượt qua.
  - **Đang chạy (Pending):** Icon vòng xoay màu vàng.
  - **Thất bại (Failure):** Icon cảnh báo màu đỏ, cảnh báo người review không nên merge code khi test đang lỗi.

### 2.4. Trình Xem Khác Biệt Tệp & Gửi Đánh Giá (Files Changed Diff & Review)
- Danh mục cây các tệp bị thay đổi trong PR kèm chỉ số dòng sửa đổi.
- Nhấp vào file để hiển thị **Monaco Diff Editor** độ nét cao.
- **Hộp thoại Submit Review:**
  - **Approve (Phê duyệt):** Gửi đánh giá đồng thuận để cho phép merge.
  - **Request Changes (Yêu cầu sửa đổi):** Yêu cầu tác giả chỉnh sửa lại trước khi merge.
  - **Comment (Góp ý):** Gửi phản hồi chung không chặn tiến trình merge.

### 2.5. Checkout Nhánh PR & Gộp PR 1-Chạm (Checkout & Merge)
- **Nút "Checkout PR Branch":** Tự động fetch nhánh của tác giả PR về máy và chuyển checkout ngay lập tức để lập trình viên chạy thử code trên máy cá nhân.
- **Nút "Merge Pull Request":** Hỗ trợ 3 chiến lược merge tiêu chuẩn của GitHub:
  1. `Create a merge commit`
  2. `Squash and merge` (khuyên dùng để giữ lịch sử nhánh chính gọn gàng)
  3. `Rebase and merge`

---

## 🚀 3. TẠO PULL REQUEST NHANH (CREATE PULL REQUEST MODAL)

Component: [`src/lib/components/CreatePullRequestModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/CreatePullRequestModal.svelte)

Khi sẵn sàng gửi code lên kho chính:
1. Bấm nút **"Create PR"** trên Toolbar hoặc từ biểu ngữ push.
2. **Bộ so sánh nhánh (Branch Selectors):**
   - Chọn nhánh đích `base` (ví dụ: `main` hoặc `upstream/main`).
   - Chọn nhánh nguồn `compare` (ví dụ: `feature/payment-v2`).
3. **Ahead / Behind Calculation:** Hệ thống tự động tính toán số commit mà nhánh của bạn đang dẫn trước hoặc lệch so với nhánh đích.
4. **Tự động sinh tiêu đề:** FlowGit tự động trích xuất commit message gần nhất làm tiêu đề PR mặc định.
5. **Đánh dấu Draft PR:** Tùy chọn "Create as draft" khi tính năng còn đang trong giai đoạn phát triển dở dang, ngăn chặn người khác vô tình merge sớm.

---

## 🔔 4. BIỂU NGỮ NHẬN DIỆN SAU KHI PUSH (RECENT PUSH BANNER)

Component: [`src/lib/components/RecentPushBanner.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/RecentPushBanner.svelte)

Ngay khi một lệnh push nhánh local thành công:
- Một biểu ngữ thông minh màu xanh nổi bật sẽ xuất hiện tức thì ở góc trên màn hình:
  > *"Bạn vừa đẩy nhánh `feat/auth-ui` lên `origin` cách đây 10 giây. Bạn có muốn mở Pull Request không?"*
- Người dùng chỉ cần nhấp nút **"Create Pull Request"**:
  - Hộp thoại `CreatePullRequestModal` lập tức được điền sẵn thông tin nhánh nguồn và nhánh đích.
  - Giúp tiết kiệm hàng chục thao tác thủ công mỗi ngày.

---

## 📦 5. XUẤT BẢN KHO LƯU TRỮ LÊN GITHUB (PUBLISH REPO MODAL)

Component: [`src/lib/components/PublishRepoModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/PublishRepoModal.svelte)

Khi khởi tạo một dự án mới hoàn toàn trên máy tính cá nhân (`git init`):
1. Bấm nút **"Publish to GitHub"** trên thanh công cụ.
2. Thiết lập:
   - Tên repository trên GitHub.
   - Chế độ riêng tư: **Public** (Mã nguồn mở) hoặc **Private** (Nội bộ bí mật).
   - Mô tả tóm tắt dự án.
3. FlowGit tự động:
   - Gọi GitHub API tạo repository mới trên tài khoản của bạn.
   - Thêm remote `origin` với URL HTTPS/SSH tương ứng.
   - Push nhánh mặc định (`main`) lên GitHub.
   - Toàn bộ hoàn tất chỉ trong 3 giây.

---

## 🔑 6. QUẢN TRỊ XÁC THỰC TOKEN GITHUB (GITHUB API CLIENT)

Tệp xử lý: [`src/lib/api/githubApi.ts`](file:///f:/Dev/product/git-tool/src/lib/api/githubApi.ts)

- **Cơ chế lưu trữ:** Token GitHub Personal Access Token (PAT) được lưu trữ an toàn trong kho bảo mật cục bộ của hệ thống.
- **Tự động nhận diện Remote URL (`parseGitHubRemote`):**
  - Tự động bóc tách cặp `owner` và `repo` từ bất kỳ định dạng URL nào:
    - HTTPS: `https://github.com/owner/repo.git`
    - SSH: `git@github.com:owner/repo.git`
- **Zero-Dependency REST:** Toàn bộ các yêu cầu HTTP đều sử dụng API Fetch bản địa chuẩn ES2024, không phụ thuộc vào thư viện bên thứ ba nặng nề, bảo đảm tốc độ khởi động tức thì và dung lượng nhẹ nhất.
