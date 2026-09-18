<div align="center">

# 🚀 FlowGit v0.2.0 Next-Gen Milestone & Specifications
### Lộ Trình & Đặc Tả Kỹ Thuật Bản Cập Nhật v0.2.0

> **Milestone Version:** `v0.2.0` (Major Feature Evolution)  
> **Core Theme:** *Semantic Code-Aware Git • Agentic Local AI • Big-Tech Stacked PRs • Zero Conflict Friction*  
> **Architecture Alignment:** Rust 2024 + Tauri v2 + Svelte 5 Runes + Tree-sitter AST + SQLite

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🎯 Strategic Objectives for v0.2.0

FlowGit v0.1.x established the fastest, safest desktop Git foundation with its sub-85MB RAM footprint, 60 FPS Canvas commit graph, 48-hour Safe Discard Trash, and Time-Travel `Ctrl + Z`.

Version **v0.2.0** elevates FlowGit from a high-performance visual Git client to an **Intelligent, Semantic Engineering Workspace**. It tackles the remaining fundamental limitations of traditional line-by-line Git:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      FLOWGIT v0.2.0 CORE PILLARS                       │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 1. SEMANTIC AST   │ 2. LOCAL AI AGENT │ 3. BIG-TECH STACKED PRs        │
│ • Tree-sitter AST │ • Pre-flight Linter│ • Graphite-Style Multi-PR      │
│ • Move Detection  │ • Bug/Leak Scanner│ • Auto Rebase Downstream       │
│ • AST Auto-Merge  │ • Auto Changelog  │ • 1-Click Stack Submission     │
├───────────────────┴───────────────────┴────────────────────────────────┤
│ 4. EARLY TEAM CONFLICT RADAR          │ 5. EXTENDED CLOUD & WASM       │
│ • Pre-commit Collision Detection      │ • GitLab MR & Gitea Adapters   │
│ • Privacy-Preserving File Touch Pings │ • WebAssembly Custom Diff View │
└───────────────────────────────────────┴────────────────────────────────┘
```

---

## 🌟 Feature Suite Breakdown

### 1. 🧬 Semantic Diff & AST-Aware Auto Merge
- **Problem:** Traditional Git compares text line-by-line. Moving a 100-line function down or renaming an argument results in massive delete/add diffs and spurious merge conflicts.
- **Solution in Rust:** Integrate native `tree-sitter` parsers (TypeScript, Rust, Python, Go, C++, Java).
- **Capabilities:**
  - **Function Move Detection:** Visual tags indicating `"Function 'renderGraph' was moved from line 40 to line 180"`, rendering diffs as a single collapsed block.
  - **Safe Semantic Auto-Merge:** Automatically adopts safe non-overlapping syntax changes (e.g., renames, imports reordering) during rebases without user intervention.

### 2. 🤖 Local AI Pre-Flight Code Review & PR Summarizer
- **Problem:** Developers often push code containing `console.log`, temporary test credentials, unhandled exceptions, or subtle breaking changes.
- **Solution:** Leverage FlowGit's native Ollama/Local LLM integration to perform offline semantic reviews on staged hunks before commit/push:
  - **Sanity Guard:** Identifies leftover debug statements, dangerous SQL queries, or deprecated functions.
  - **Semantic Release & Changelog Generator:** Inspects commits across any range (e.g., `v0.1.3..HEAD`), groups them by `feat`, `fix`, `refactor`, and outputs production-ready markdown release notes.

### 3. 🥞 Visual Stacked PRs Studio (Graphite Alternative)
- **Problem:** Modern engineering teams avoid monolithic 2,000-line PRs in favor of chains of atomic, reviewable PRs (Stacked Diffs). However, managing stacked branches in terminal Git requires tedious rebase juggling when an earlier branch changes.
- **Solution:**
  - Visual stacked commit chains directly on the canvas graph.
  - **1-Click "Submit Stack to GitHub":** FlowGit creates and links `feat/part-1` ➔ `feat/part-2` ➔ `feat/part-3` PRs with upstream dependencies on GitHub.
  - **Automated Cascading Rebase:** When `part-1` is merged, FlowGit rebases `part-2` and `part-3` in 1 click.

### 4. 📡 Early Conflict Radar (Team Presence)
- **Problem:** Teammates work simultaneously on the same critical source files for hours, only discovering conflicts at the end of the sprint.
- **Solution:**
  - Zero-knowledge, privacy-preserving ping broadcasting only repo hash and touched file paths (no source code leaves local machines).
  - Amber indicators on file items: `⚠️ Teammate 'Alex' has uncommitted edits on src/lib/api.ts (feat/auth)`.

### 5. 🌐 GitLab & Gitea/Forgejo Cloud Adapters
- First-class support for enterprise GitLab Self-Hosted instances and lightweight open-source Gitea/Forgejo servers.
- Full merge request review, inline diff comments, and CI/CD pipeline visualizer parity with the existing GitHub Studio.

### 6. 🔌 WebAssembly Plugin Hub
- Extensible sandbox allowing community developers to create custom diff viewers:
  - Visual Image Slider / Onion-Skin Diffs for PNG/SVG/WebP.
  - Tabular Diff Viewer for CSV/Excel data.
  - 3D Mesh Diff for GLTF/OBJ assets.

---

<br/><br/>

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🎯 Mục Tiêu Chiến Lược Cho Bản Cập Nhật v0.2.0

Nếu chuỗi phiên bản v0.1.x đã hoàn thành xuất sắc mục tiêu xây dựng một Git Client Native nhẹ nhất (<85MB RAM), an toàn nhất (Thùng rác SQLite 48h, Undo `Ctrl + Z`) và đồ họa mượt nhất (Canvas 60 FPS), thì **FlowGit v0.2.0** sẽ là bước nhảy vọt đưa ứng dụng trở thành **Không Gian Làm Việc Lập Trình Thông Minh (Semantic Engineering Workspace)**.

Bản cập nhật v0.2.0 tập trung giải quyết triệt để những giới hạn lịch sử của Git truyền thống:

---

## 🌟 Chi Tiết Các Tính Năng Đột Phá Trong v0.2.0

### 1. 🧬 Semantic Diff & Tự Động Xử Lý Xung Đột Bằng Cú Pháp (AST)
- **Nỗi đau:** Git so sánh dòng chữ đơn thuần (line-by-line). Chỉ cần bạn dời vị trí một hàm hoặc format code là Git báo "xóa 100 dòng, thêm 100 dòng", kéo theo xung đột merge vô lý.
- **Giải pháp:** Tích hợp bộ phân tích cú pháp **Tree-sitter** viết bằng Rust (hỗ trợ TypeScript, Rust, Python, Go, C++, Java).
- **Khả năng:**
  - **Phát hiện di chuyển hàm (Move Detection):** Nhận diện hàm chỉ bị dịch chuyển vị trí mà không bị sửa nội dung, gom gọn diff lại giúp review nhẹ nhàng.
  - **Semantic Auto-Merge:** Tự động giải quyết các xung đột vô hại (như đổi tên biến đồng nhất, sắp xếp lại thứ tự import) khi rebase mà không cần người dùng can thiệp thủ công.

### 2. 🤖 Trợ Lý AI Nội Bộ: Pre-Flight Review & Tự Động Tạo Changelog
- **Bắt lỗi trước khi Push (Pre-Flight Sanity Check):**
  - Chạy mô hình AI cục bộ (Ollama) quét nhanh các dòng code đã Stage:
  - Cảnh báo các lệnh debug bỏ quên (`console.log`, `debugger`, `print()`).
  - Phát hiện các đoạn mã có lỗ hổng bảo mật sơ đẳng (Hardcoded token, SQL injection).
- **Tự động sinh Release Notes chuẩn chỉnh:**
  - So sánh diff giữa 2 release tag hoặc commit, AI tự phân loại `feat`, `fix`, `perf`, `docs` và xuất ra file Markdown Changelog sẵn sàng đăng tải lên GitHub / website.

### 3. 🥞 Visual Stacked PRs Studio (Mô Hình Big-Tech Như Graphite)
- **Nỗi đau:** Các team chuyên nghiệp chia tính năng lớn thành nhiều PR nhỏ nối tiếp nhau (Stacked PRs) để review nhanh, nhưng rebase các nhánh con này bằng dòng lệnh rất dễ sai sót.
- **Giải pháp:**
  - Giao diện trực quan hoá chuỗi commit xếp tầng trên canvas.
  - **1-Click "Submit Stack":** FlowGit tự tạo và kết nối chuỗi PR 1 ➔ PR 2 ➔ PR 3 trực tiếp lên GitHub.
  - **Tự động Rebase dây chuyền:** Khi PR 1 được merge trên GitHub, FlowGit tự động rebase các nhánh sau chỉ với 1 click.

### 4. 📡 Radar Cảnh Báo Xung Đột Sớm (Team Early Conflict Radar)
- **Cảnh báo đụng file trước khi commit:**
  - Cơ chế chia sẻ trạng thái ẩn cực nhẹ giữa các thành viên cùng mở FlowGit trong một dự án (chỉ chia sẻ tên file đang sửa, **tuyệt đối không gửi mã nguồn ra ngoài**).
  - Cảnh báo trực tiếp trên giao diện: ⚠️ *"Đồng đội Nam đang sửa file `src/auth.ts` trên nhánh `feat/login`"*, giúp lập trình viên trao đổi trước, triệt tiêu xung đột cuối sprint.

### 5. 🌐 Hỗ Trợ Đầy Đủ GitLab & Gitea/Forgejo
- Bổ sung adapter cho **GitLab Merge Requests** (đặc biệt là các server GitLab Self-Hosted nội bộ công ty) và **Gitea/Forgejo** (mã nguồn mở, tự host).
- Hỗ trợ xem diff, duyệt MR, comment từng dòng code và theo dõi pipeline CI/CD tương đương với GitHub Studio hiện có.

### 6. 🔌 Kho Plugin Tiện Ích WebAssembly (Wasm)
- Mở rộng hệ sinh thái cho phép cộng đồng tự viết extension bằng JS/Wasm:
  - **Trình so sánh Diff đa phương tiện:** So sánh ảnh (thanh trượt Before/After, Onion Skin), file bảng tính Excel/CSV, file 3D Model.
  - Tích hợp tự động chạy linter (Biome, Prettier, Rustfmt) khi stage code.

---

## 📅 Bảng Kế Hoạch Triển Khai (Roadmap Timeline)

| Giai đoạn | Hạng mục công việc cốt lõi | Công nghệ phụ trách | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Phase 1** | Tích hợp Tree-sitter Rust AST, Move Detection & Auto-Merge | `tree-sitter`, Rust, Monaco | 🟢 Completed |
| **Phase 2** | Local AI Pre-Flight Scanner & Changelog Studio | Rust Tokio, Ollama API, Svelte 5 | 🟡 Planning |
| **Phase 3** | Visual Stacked PRs Workflow & GitHub Bridge | GitHub REST API, Rust `git2` | ⚪ Queued |
| **Phase 4** | GitLab & Gitea Self-Hosted Adapters | GitLab REST API, Keychain Auth | ⚪ Queued |
| **Phase 5** | Team Early Conflict Radar & Wasm Diff Plugins | Wasm Runtime, SQLite Sync | ⚪ Queued |

---
