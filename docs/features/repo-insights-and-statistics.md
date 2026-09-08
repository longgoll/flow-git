<div align="center">

# 📊 Repository Pulse & Insights Studio
### Studio Thống Kê & Phân Tích Nhịp Độ Dự Án Toàn Diện

> **Interactive Git Analytics:** 52-week activity heatmap, commit streaks, top contributors leaderboard, code churn hotspots, and work habit distribution  
> **Related Documentation:** Living Commit Graph resides in [`commit-graph-and-dag.md`](./commit-graph-and-dag.md)  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 🌟 Overview & Philosophy

The **Repository Pulse & Insights Studio** transforms raw Git commit history into actionable engineering intelligence and visual delight:
- **Zero Friction:** Accessible directly via Toolbar More Menu (`Pulse`), Command Palette (`Ctrl+K` ➔ `Insights`), or Shortcut.
- **Extreme Performance:** Employs parallel commit traversal with `git2-rs` and caching to compute metrics over thousands of commits in under 50ms.
- **4 Dedicated Analysis Studios:**
  1. **Overview Studio:** Core project vitals (Total commits, active contributors, branch counts, repository age), 52-week activity heatmap with streak badges, and monthly commit velocity.
  2. **Activity & Heatmap Studio:** Full 52-week GitHub-style contribution grid (365 trailing days), commit streaks (current & longest), 7×24 punch card matrix, time of day distribution, and weekday vs weekend breakdown.
  3. **Contributors Studio:** Leaderboard with gold/silver/bronze medals, percentage share, interactive author filtering (filter heatmap to view specific developer activity).
  4. **Code Churn & Hotspots Studio:** Scans revwalk diffs to detect high-churn files, revision frequencies, additions/deletions, and visual hotness meters.

---

## 📅 1. 52-Week GitHub-Style Heatmap Grid & Streaks

Component: `src/lib/components/RepoInsightsModal.svelte`  
Data Source: `repo.rawCommits` via `$state.raw` & `$derived`

- **52 Columns × 7 Rows:** Maps every calendar day across the trailing 365 days leading to today.
- **Adaptive Level Scaling:** Color ramps categorized into 5 intensity tiers (Level 0 empty to Level 4 vivid emerald), matching dark & light themes seamlessly.
- **Streak Tracking:**
  - **Current Streak:** Consecutive days with at least 1 commit up to the current date.
  - **Longest Streak:** Historical continuous daily commit record.
  - **Active Days Ratio:** Total productive days compared to elapsed calendar days.
- **Interactive Tooltip:** Hovering over any cell reveals the exact calendar date and commit volume.
- **Contributor Filter:** Selecting an author filters the heatmap to display only their individual contribution intensity.

---

## 🔥 2. Code Churn & Hotspots Engine

Component: `src/lib/components/RepoInsightsModal.svelte`  
Backend: `src-tauri/src/git/stats.rs` (`get_repo_file_churn`)  
IPC Command: `get_repo_file_churn(path: String, max_commits: Option<usize>) -> AppResult<Vec<FileChurnInfo>>`

- **File Hotspots Analysis:** Walks through linear commit history (skipping merge commits to prevent double-counting), tallies modification frequencies per file, and computes total additions/deletions.
- **Hotness Meter:** Gradient bar indicating the relative churn percentage against the project's most volatile file.
- **Search Filter:** Live search bar to quickly inspect specific directories or file extensions.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 🌟 Tổng Quan & Triết Lý Thiết Kế

**Repository Pulse & Insights Studio** biến toàn bộ lịch sử Git thô thành bức tranh phân tích sinh động, trực quan và ấn tượng:
- **Truy Cập Nhanh:** Mở tức thì từ Toolbar More Menu (`Pulse`), Command Palette (`Ctrl+K` ➔ `Insights`).
- **Hiệu Năng Vượt Trội:** Tận dụng duyệt revwalk bản địa của `git2-rs` kết hợp `$state.raw` phía Svelte 5, cho kết quả phân tích tức thì dưới 50ms.
- **4 Phân Khu Studio Chuyên Biệt:**
  1. **Tổng quan (Overview):** 4 thẻ chỉ số quan trọng (Commits, Contributors, Nhánh, Tuổi thọ repo), Heatmap 52 tuần kèm chỉ số Streak và biểu đồ cột vận tốc theo tháng.
  2. **Hoạt động & Heatmap (Activity):** Lưới nhiệt 52 tuần phong cách GitHub (365 ngày qua), thống kê chuỗi ngày làm việc liên tục (Current & Longest Streak), ma trận khung giờ cao điểm 7×24, phân bổ thời gian trong ngày và so sánh ngày thường vs cuối tuần.
  3. **Thành viên đóng góp (Contributors):** Bảng xếp hạng vinh danh huy chương Vàng 🥇, Bạc 🥈, Đồng 🥉, tỷ lệ đóng góp %, hỗ trợ click lọc để xem riêng nhịp độ của từng cá nhân trên heatmap.
  4. **Điểm nóng mã nguồn (Code Churn & Hotspots):** Phân tích tần suất thay đổi tệp tin, dòng thêm/xóa để xác định các file phức tạp và nhiều rủi ro nhất trong codebase.

---

## 📅 1. Lưới Nhiệt 52 Tuần (365 Ngày) & Chỉ Số Streak

- **52 Cột × 7 Dòng:** Trực quan hóa từng ngày làm việc từ 1 năm trước đến hôm nay.
- **5 Cấp Độ Màu Sắc:** Tự động tính toán theo phân vị (Quartiles), phối màu Emerald hài hòa cho cả Light và Dark mode.
- **Chỉ Số Chuỗi Ngày (Streaks):**
  - **Chuỗi ngày hiện tại (Current Streak):** Số ngày liên tục có commit tính đến hôm nay.
  - **Chuỗi ngày dài nhất (Longest Streak):** Kỷ lục chuỗi ngày cày cuốc dài nhất trong lịch sử dự án.
  - **Tỷ lệ ngày hoạt động:** Tổng số ngày có commit trên 365 ngày.
- **Bộ Lọc Cá Nhân:** Click vào bất kỳ tác giả nào ở tab Contributors để highlight riêng những ngày họ commit trên Heatmap.

---

## 🔥 2. Động Cơ Phân Tích Điểm Nóng (Code Churn & Hotspots)

- **Backend Rust:** `get_repo_file_churn` quét revwalk, loại trừ merge commit để tính toán chính xác số lần tệp tin bị sửa đổi cùng tổng dòng thêm/bớt.
- **Thanh Đo Độ Nóng (Hotness Meter):** Biểu diễn tỷ lệ phần trăm sửa đổi so với file biến động nhiều nhất dự án theo gradient màu Cam - Đỏ neon.
- **Tìm Kiếm Nhanh:** Lọc tệp tin theo tên hoặc đuôi mở rộng để tìm ra các file "hotspot" cần được refactor.
