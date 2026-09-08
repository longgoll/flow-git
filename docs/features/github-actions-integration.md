<div align="center">

# ⚡ GitHub Actions & CI/CD Pipeline Studio
### Giám Sát Quy Trình CI/CD & Quản Lý Workflow Runs Trực Tiếp Trong FlowGit

> **Collaboration Standard:** Zero-Context-Switching – Never leave FlowGit to inspect build results, manage caches, or check runners  
> **Integrations:** GitHub Actions REST API v3, Native Management Views (Caches, Runners, Deployments, Attestations, Analytics), Modular Sub-components  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🧭 1. GitHub Actions Overview

In modern Git development workflows, developers frequently push commits or create release tags and are forced to switch to a browser to monitor CI/CD pipelines (unit tests, build checks, packaging, and releases) or clean up storage caches.

**FlowGit brings GitHub Actions natively 100% into your desktop workspace:**
1. **Unified Workflows Explorer:** Browse all workflows (`.github/workflows/*.yml`), filter runs by workflow, branch, and status (Success, Failure, In-Progress, Queued).
2. **Runs List & Realtime Metrics:** Instantly inspect run numbers (`#8`), commit messages, commit SHAs, actors, trigger events (`push`, `release`, `workflow_dispatch`), timestamps, and elapsed duration.
3. **Jobs & Steps Console:** Drill down into specific jobs (`build-windows`, `build-linux`, `deploy-pages`) and expand individual execution steps to diagnose errors.
4. **Quick Actions:** Trigger **"Re-run failed jobs"**, **"Re-run all jobs"**, or **"Cancel run"** without touching the browser.
5. **Graph Cross-Navigation:** Click on any commit SHA within a workflow run to jump directly to that commit on the Living Commit Graph.
6. **Native 100% In-App Management Hub:**
   - 🗄️ **Caches Management:** Inspect cache keys, sizes, branch refs, and delete caches directly when the 10 GB quota is full.
   - 🖥️ **Runners Management:** Monitor self-hosted and repository runner statuses (Online/Offline, Idle/Busy, OS, and labels).
   - 🚀 **Deployments:** Track environment deployments (production, staging, preview), status badges, commit SHAs, and live app links.
   - 🛡️ **Attestations:** Verify cryptographic provenance and Sigstore attestations.
   - 📈 **Performance & Analytics:** View KPI metric cards (Success Rate, Average Duration, Failure Rate) and interactive SVG execution trends.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ GITHUB ACTIONS CI/CD STUDIO ARCHITECTURE IN FLOWGIT                                    │
│                                                                                        │
│  [Git Push / Release Tag] ────► [GitHub Actions CI Pipeline Triggered]                 │
│                                           │                                            │
│                                           ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ GitHubActionsViewer.svelte (Modal Coordinator)                                   │  │
│  │ ├─ ActionsSidebar.svelte (Workflows, Caches, Runners, Deployments, Analytics)   │  │
│  │ ├─ ActionsRunsList.svelte (Runs stream, search, status & branch filter)         │  │
│  │ ├─ ActionsRunDetail.svelte (Run Hero, Matrix, Jobs & Terminal Step Log Viewer)   │  │
│  │ ├─ ActionsCachesView.svelte (10 GB storage usage meter & cache deletion)         │  │
│  │ ├─ ActionsRunnersView.svelte (Online/Offline & Busy/Idle runners monitor)        │  │
│  │ ├─ ActionsDeploymentsView.svelte (Environment statuses & direct app links)       │  │
│  │ ├─ ActionsAttestationsView.svelte (Sigstore cryptographic build provenance)      │  │
│  │ ├─ ActionsAnalyticsView.svelte (Success rate %, avg duration, SVG trend chart)   │  │
│  │ └─ ActionsDispatchModal.svelte (workflow_dispatch manual trigger modal)          │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                           │                                            │
│                                           ▼                                            │
│                      [Click Commit SHA -> Focus on Commit Graph]                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 2. Modular Architecture

Main Component: [`src/lib/components/GitHubActionsViewer.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/GitHubActionsViewer.svelte)

Accessible via:
- **Sidebar (Primary Hub):** Dedicated button **"GitHub Actions & CI/CD [CI/CD]"** under the Remotes section in the left sidebar.
- **Command Palette (`Ctrl + P` / `Cmd + P`):** Type `Open GitHub Actions`.

Sub-components (Located in `src/lib/components/actions/`):
- **[`ActionsSidebar.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/actions/ActionsSidebar.svelte):** Left sidebar navigation for Workflows and Native Management items.
- **[`ActionsRunsList.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/actions/ActionsRunsList.svelte):** Runs feed with search and status/branch filtering.
- **[`ActionsRunDetail.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/actions/ActionsRunDetail.svelte):** Full run inspector with matrix progress, job list, and step terminal log viewer.
- **[`ActionsCachesView.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/actions/ActionsCachesView.svelte):** Visual storage usage bar (10 GB GitHub limit), filterable table of caches, and 1-click cache deletion.
- **[`ActionsRunnersView.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/actions/ActionsRunnersView.svelte):** Runners status monitoring with online/offline indicators, busy/idle states, and OS badges.
- **[`ActionsDeploymentsView.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/actions/ActionsDeploymentsView.svelte):** Environment deployment histories, status badges, and direct app launch links.
- **[`ActionsAttestationsView.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/actions/ActionsAttestationsView.svelte):** Sigstore build provenance inspector.
- **[`ActionsAnalyticsView.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/actions/ActionsAnalyticsView.svelte):** KPI stat cards and interactive SVG execution duration timeline.
- **[`ActionsDispatchModal.svelte`](file:///f:/Dev/product/git-tool/src/lib/components/actions/ActionsDispatchModal.svelte):** Manual `workflow_dispatch` trigger dialog.

---

## 🔌 3. REST API Specifications

Located in [`src/lib/api/githubApi.ts`](file:///f:/Dev/product/git-tool/src/lib/api/githubApi.ts):
- `listGitHubWorkflows(owner, repo, token)`: `GET /repos/{owner}/{repo}/actions/workflows`
- `listGitHubWorkflowRuns(owner, repo, options, token)`: `GET /repos/{owner}/{repo}/actions/runs`
- `getGitHubWorkflowRun(owner, repo, runId, token)`: `GET /repos/{owner}/{repo}/actions/runs/{run_id}`
- `listGitHubWorkflowJobs(owner, repo, runId, token)`: `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs`
- `fetchGitHubJobLogs(owner, repo, jobId, token)`: `GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs`
- `rerunGitHubWorkflow(owner, repo, runId, failedOnly, token)`: `POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun` or `rerun-failed-jobs`
- `cancelGitHubWorkflowRun(owner, repo, runId, token)`: `POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel`
- `listGitHubActionsCaches(owner, repo, token)`: `GET /repos/{owner}/{repo}/actions/caches`
- `getGitHubActionsCacheUsage(owner, repo, token)`: `GET /repos/{owner}/{repo}/actions/cache/usage`
- `deleteGitHubActionsCache(owner, repo, cacheId, token)`: `DELETE /repos/{owner}/{repo}/actions/caches/{cache_id}`
- `listGitHubRunners(owner, repo, token)`: `GET /repos/{owner}/{repo}/actions/runners`
- `listGitHubDeployments(owner, repo, token)`: `GET /repos/{owner}/{repo}/deployments`
- `listGitHubDeploymentStatuses(owner, repo, deploymentId, token)`: `GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses`
- `listGitHubAttestations(owner, repo, token)`: `GET /repos/{owner}/{repo}/attestations`

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🧭 1. Tổng Quan Về GitHub Actions Trong FlowGit

Trong quy trình làm việc hiện đại, lập trình viên thường xuyên phải rời IDE để mở trình duyệt kiểm tra build CI/CD, dọn dẹp bộ nhớ cache bị đầy, hoặc kiểm tra máy chủ runner.

**FlowGit tích hợp 100% trải nghiệm GitHub Actions vào giao diện bản địa (Native UI):**
1. **Trình duyệt Workflows thống nhất:** Xem toàn bộ workflow trong dự án (`.github/workflows/*.yml`), lọc theo từng workflow, theo nhánh (`main`, `v0.1.2`), và theo trạng thái.
2. **Danh sách Runs trực quan:** Hiển thị số run `#8`, commit message, mã SHA rút gọn, tác giả, sự kiện kích hoạt (`push`, `release`, `workflow_dispatch`), thời điểm chạy và thời lượng.
3. **Console Xem Log Chi Tiết (Terminal Step Log Viewer):** Xem trực tiếp log từng bước của từng job với highlight cú pháp, tìm kiếm trong log, sao chép và tải file `.log`.
4. **Hành động tức thì:** Bấm **"Chạy lại job lỗi"**, **"Chạy lại tất cả"**, hoặc **"Hủy lượt chạy"** ngay trong app.
5. **Điều hướng chéo về Commit Graph:** Click vào mã SHA commit để nhảy thẳng tới vị trí commit đó trên Living Commit Graph.
6. **Khu Vực Quản Lý Bản Địa 100% (Native Management Hub):**
   - 🗄️ **Quản lý Bộ nhớ đệm (Caches):** Theo dõi thanh dung lượng 10 GB miễn phí, lọc theo key/branch, và xóa cache trực tiếp bằng nút Xóa.
   - 🖥️ **Máy chủ Runners:** Kiểm tra trạng thái máy chủ runner nội bộ (Online/Offline, Busy/Idle, Hệ điều hành, Nhãn).
   - 🚀 **Lịch sử Triển khai (Deployments):** Theo dõi đợt deploy môi trường (`production`, `staging`), trạng thái và mở nhanh link web ứng dụng.
   - 🛡️ **Chứng thực (Attestations):** Kiểm tra tính toàn vẹn và nguồn gốc bảo mật của các artifact đã ký số.
   - 📈 **Hiệu suất & Thống kê (Analytics):** Thống kê tỷ lệ thành công %, thời gian build trung bình và biểu đồ cột xu hướng SVG trực quan.

---

## 🔍 2. Kiến Trúc Module Hóa

Tất cả các component được đặt trong thư mục chuyên biệt `src/lib/components/actions/`:
- **`ActionsSidebar.svelte`:** Cột bên trái chứa danh mục Workflows và các nút chuyển tab Quản lý bản địa.
- **`ActionsRunsList.svelte`:** Danh sách luồng các lần chạy kèm thanh tìm kiếm và bộ lọc trạng thái/nhánh.
- **`ActionsRunDetail.svelte`:** Giao diện soi chi tiết lần chạy gồm Banner Hero, Ma trận công việc và Trình xem log Terminal.
- **`ActionsCachesView.svelte`:** Khung quản lý cache, đo lường dung lượng 10 GB và xóa cache.
- **`ActionsRunnersView.svelte`:** Bảng giám sát máy chủ runners nội bộ.
- **`ActionsDeploymentsView.svelte`:** Lịch sử triển khai ứng dụng các môi trường kèm nút mở web.
- **`ActionsAttestationsView.svelte`:** Bảng chứng thực bảo mật nguồn gốc artifact.
- **`ActionsAnalyticsView.svelte`:** Các thẻ chỉ số KPI và biểu đồ timeline thời lượng thực thi qua các commit.
- **`ActionsDispatchModal.svelte`:** Hộp thoại kích hoạt pipeline thủ công qua sự kiện `workflow_dispatch`.
- **`GitHubActionsViewer.svelte`:** Coordinator tinh gọn ~500 dòng điều phối dữ liệu và các sub-components.
