<div align="center">

# 📊 Living Commit Graph & DAG Map Engine
### Đồ Thị Động Học & Bản Đồ Cây Phân Nhánh (Living Graph & DAG Engine)

> **Performance:** Locked 60 FPS across 100,000+ Commits  
> **Technology:** HTML5 `OffscreenCanvas` + Dedicated Web Worker + 2D Cubic Bezier Splines  

**[ 🇬🇧 Read in English ](#-english)** &nbsp;•&nbsp; **[ 🇻🇳 Đọc Tiếng Việt ](#-tiếng-việt)**

</div>

---

<a name="-english"></a>
# 🇬🇧 English

## 📊 1. Living Commit Graph

The Living Commit Graph is the beating heart of FlowGit, vividly visualizing branches, commits, tags, and parent-child lineages in realtime.

```
● [main] feat: automated billing integration ───────────────────────────┐
│                                                                      │
│   ● [feature/auth] feat(auth): add GitHub OAuth Device Flow support  │
│  /│                                                                  │
│ ● │ fix(token): handle expired JWT token refresh                     │
│ │/                                                                   │
● ┴ [v1.2.0] chore: release version v1.2.0                             │
```

### 1.1. OffscreenCanvas + Web Worker Architecture
- **Legacy Git Client Bottlenecks:** Traditional tools render DOM nodes or inline SVGs directly on the main UI thread. Repositories with over 5,000 commits trigger catastrophic layout thrashing, reducing scroll frame rates below 15 FPS.
- **FlowGit Architecture:**
  - Offloads canvas rendering via **`transferControlToOffscreen()`** to **`graphWorker.ts`**.
  - Worker computes coordinate matrices and draws smooth **Cubic Bezier Splines**.
  - **Virtual Viewport Clipping & Long-Span Continuity**: Only renders rows within the active scrollport plus a 200px buffer. Long-living branch spans (> 20 rows) are pre-indexed upon `SET_DATA` so splines passing through the active viewport are rendered seamlessly without broken or missing curve segments when scrolling fast.

### 1.2. Parallel Topological Lane Compaction
- Parallelized in Rust via `rayon` (`src-tauri/src/git/history.rs`).
- Reclaims closed branch lanes immediately into an available pool, keeping graph width neatly contained between 3 and 8 lanes.

### 1.3. Visual Badges & Indicators
- **Ahead / Behind Badges (`↑ 2  ↓ 5`):** Tracks divergence relative to upstream remotes.
- **Author Avatars:** GitHub avatars or initials with distinct developer color hashing.
- **Tag & Branch Pills:** Differentiates Local branches (blue), Remote tracking branches (purple), HEAD (luminous outline), and Release Tags (gold).

---

## 🗺️ 2. DAG Canvas Map (Mini-Map Overview)

Component: `src/lib/components/DagCanvasMap.svelte`

For monorepos with dozens of concurrent branches, FlowGit provides a **DAG Mini-Map**:
- Birds-eye overview of overall repository structure.
- Click and drag the viewport rect to jump across months of history instantly.

---

## 🎯 3. Focus View (Branch Isolation)

Component: `src/lib/components/FocusView.svelte`

- Right-click any branch ➔ **"Focus This Branch"**:
  - Hides unrelated commit lines from other team branches.
  - Highlights the direct evolutionary lineage from base (`main`) to the branch tip.
  - Consolidates file changes across the entire feature branch.

---

## 📚 4. Stacked Commits Flow

Component: `src/lib/components/StackedCommitsFlow.svelte`

Enables Google / Meta style Stacked Diffs workflows:
- Visualizes unpushed local commit sequences (`get_unpushed_stacked_commits`).
- Supports drag-and-drop commit reordering (`reorder_stacked_commits`) before PR publication.

---

## 👻 5. Ghost Preview on Drag & Drop

- When dragging a commit node across the canvas:
  - Dotted ghost connector lines simulate the proposed DAG topology.
  - In-memory dry-run conflict checks highlight conflicting targets in glowing amber with instant warnings.

---

## 🎚️ 6. Graph Density, Visibility & Advanced Filters

- **Display Density Controls:** Toggle between Compact (high commit count view), Comfortable, and Spacious row heights.
- **Pinned Favorite Branches (⭐):** 1-Click pin important branches (main, dev, personal features) to sidebar top for instant switching.
- **Branch Visibility Control (👁️):**
  - Hide / Solo specific branches to unclutter dense repositories.
  - Powered by a safe DAG BFS reachability filter that only prunes commits belonging exclusively to hidden branches.
- **Advanced Commit Filters & Interactive Canvas Tools:**
  - **Direct Author Click Filter:** Click on any author avatar or name directly on the canvas to highlight their commits with a distinct cyan halo ring while dimming others (`alpha: 0.25`). An active filter chip `[Author: Name (X)]` appears in the graph sub-header for quick dismissal.
  - **Date Range Presets:** Quick preset dropdown (All Time, Today / 24h, Past 7 days, Past 30 days, Past 90 days) dynamically recalculating commits in realtime via Svelte 5 `$derived`.
  - **Glowing Ancestor Path Highlight:** When 2 commits are selected (Ctrl+Click or in Compare mode), a BFS lineage traversal over `parents` detects the exact ancestry chain and renders a vibrant cyan glowing Bezier path (`#38bdf8`, `shadowBlur: 8`) with halo rings around path nodes.
  - **Overview Minimap:** Toggleable glassmorphism minimap on the top-right canvas showing commit lane micro-dots, highlighted ancestor path, and viewport position indicator with 1-click scroll navigation.

---

## 🛡️ 7. Safe Commit Context Menu

Right-click any commit node on the living graph for contextual actions:
- **Interactive Rebase Studio:** Reorder commits via drag & drop, squash, fixup, reword, or drop with dry-run preview simulation.
- **Squash Commits:** 1-Click squash recent commits into one with automated commit message drafting.
- **Safe Reset (`--soft`, `--mixed`, `--hard`):** Backed up by Safe Discard & Time Machine Undo (`Ctrl + Z`).
- **Cherry-pick & Revert:** Non-destructive operations with smart branch destination selection.

---

## 🧭 8. Clean Top Nav & View Modes Segmented Control

Component: `src/lib/components/toolbar/ToolbarViewModes.svelte`

To eliminate clutter on high-DPI and compact laptop displays, the Top Nav is structured around **4 Pinned Primary Tabs + More Views Dropdown**:
- **Pinned Tabs (95% Daily Usage):**
  + 🌿 **Graph:** Primary Living Commit Graph & Canvas.
  + 📑 **Changes:** Working Tree uncommitted diff & staging inspector (with real-time modified/staged count badges).
  + 🔀 **PRs:** GitHub Pull Requests & Cloud Review (with open count indicator).
  + 📊 **Insights:** Repository analytics, commit frequency heatmaps, and contributor velocity.
- **Dynamic Conflicts Tab (`⚠️ Conflicts`):** Automatically appears in illuminated red whenever merge or rebase conflicts are active.
- **More Views Dropdown:** Convenient popover housing extended views (`Focus Mode`, `Stacked Commits`, `2D DAG Map`, `Repository File Explorer`, and `Commit Comparison`). When an extended view is active, the dropdown button highlights and displays the active mode name.

---

<a name="-tiếng-việt"></a>
# 🇻🇳 Tiếng Việt

## 📊 1. LIVING COMMIT GRAPH (ĐỒ THỊ ĐỘNG HỌC TRỰC QUAN)

Living Commit Graph là trái tim của FlowGit, nơi mọi nhánh, commit, tag và mối quan hệ cha-con (parent-child) được mô phỏng sinh động theo thời gian thực.

```
● [main] feat: tích hợp thanh toán tự động ────────────────────────────┐
│                                                                      │
│   ● [feature/auth] feat(auth): thêm hỗ trợ GitHub OAuth Device Flow  │
│  /│                                                                  │
│ ● │ fix(token): sửa lỗi làm mới JWT token khi hết hạn                │
│ │/                                                                   │
● ┴ [v1.2.0] chore: phát hành phiên bản v1.2.0                         │
```

### 1.1. Kiến trúc OffscreenCanvas + Web Worker
- **Vấn đề của các Git Client cũ:**  
  Các phần mềm truyền thống (như SourceTree hoặc GitKraken đời đầu) thường vẽ DOM nodes hoặc SVG trực tiếp trên main-thread. Khi repository có trên 5,000 commits, việc cuộn chuột gây giật lag nghiêm trọng, tụt khung hình xuống dưới 15 FPS.
- **Giải pháp của FlowGit:**
  - Chuyển toàn bộ canvas sang chế độ **`OffscreenCanvas`** và gửi sang **`graphWorker.ts`**.
  - Worker tính toán tọa độ $X, Y$ của từng node commit và vẽ các đường cong **Cubic Bezier Splines** mượt mà.
  - Áp dụng kỹ thuật **Virtual Viewport Clipping & Liền Mạch Nhánh Dài (Long-Span Continuity)**: Chỉ render các node và đường nối nằm trong khung nhìn hiển thị hiện tại cộng thêm vùng đệm 200px. Đồng thời các nhánh sống dài (> 20 hàng) được tiền lập chỉ mục `longSpans` ngay khi nhận dữ liệu `SET_DATA`, đảm bảo đường spline chạy xuyên qua viewport luôn liền mạch 100%, không bị đứt nét hay cụt nhánh khi cuộn chuột nhanh trên các repo lớn.

### 1.2. Thuật toán Nén Làn Tự Động (Topological Lane Compaction)
- Được tính toán song song tại backend Rust bằng thư viện đa luồng `rayon` (`src-tauri/src/git/history.rs`).
- Khi một nhánh đã kết thúc hoặc được merge vào nhánh khác, chỉ số lane của nó lập tức được thu hồi và tái sử dụng cho các nhánh mới xuất hiện tiếp theo.
- Nhờ đó, đồ thị luôn giữ được bề ngang thanh thoát gọn gàng, không bị phình to sang phải làm mất diện tích đọc commit message.

### 1.3. Các huy hiệu trực quan (Visual Badges & Indicators)
- **Huy hiệu Ahead / Behind (`↑ 2  ↓ 5`):** Hiển thị ngay trên nhãn nhánh, thông báo số lượng commit mà nhánh local đang dẫn trước hoặc tụt hậu so với nhánh upstream trên remote.
- **Avatar Tác giả:** Tự động nhận diện avatar hoặc vẽ avatar chữ cái đầu với màu sắc định danh riêng cho từng lập trình viên.
- **Tag Pills & Branch Pills:** Phân biệt rõ ràng giữa nhánh Local (màu xanh lam), nhánh Remote (màu tím), HEAD hiện tại (viền sáng) và Release Tags (màu vàng kim).

---

## 🗺️ 2. DAG CANVAS MAP (BẢN ĐỒ TỔNG QUAN TOPOLOGY)

Component: `src/lib/components/DagCanvasMap.svelte`

Đối với các dự án lớn có hàng chục nhánh song song đang phát triển, FlowGit cung cấp chế độ **DAG Mini-Map**:
- Thu nhỏ toàn bộ cấu trúc phân nhánh của kho lưu trữ thành một bản đồ chim bay (Bird's Eye Overview).
- Cho phép người dùng di chuột hoặc kéo khung nhìn để nhảy nhanh đến các mốc thời gian cách đây nhiều tháng mà không cần cuộn trang thủ công.
- Màu sắc của các nhánh được đồng bộ 1:1 với đồ thị chính.

---

## 🎯 3. FOCUS VIEW (CHẾ ĐỘ TẬP TRUNG NHÁNH)

Component: `src/lib/components/FocusView.svelte`

Khi cần tập trung sâu vào một tính năng mà không bị xao nhãng bởi các nhánh khác của đồng nghiệp:
- Người dùng bấm chuột phải vào một nhánh và chọn **"Focus This Branch"** (hoặc chuyển tab Focus trên thanh Toolbar).
- Giao diện chuyển sang chế độ Focus View:
  - Ẩn toàn bộ các commit ngoại lai không liên quan.
  - Chỉ làm nổi bật con đường tiến hóa từ nhánh gốc (`main`) đến đỉnh nhánh hiện tại.
  - Hiển thị danh sách các tệp bị thay đổi tổng hợp của toàn bộ chuỗi commit trong nhánh đó.

---

## 📚 4. STACKED COMMITS FLOW (QUẢN LÝ CHUỖI PULL REQUEST)

Component: `src/lib/components/StackedCommitsFlow.svelte`

Theo tiêu chuẩn công nghệ hiện đại tại các công ty lớn (Google / Meta Stacked Diffs):
- Cho phép lập trình viên chia một tính năng lớn thành nhiều commit nhỏ, mạch lạc kế tiếp nhau trước khi đẩy lên remote.
- FlowGit nhận diện các commit chưa được push (`get_unpushed_stacked_commits`) và hiển thị thành một chuỗi thẻ trực quan:
  - Cho phép **kéo thả thay đổi thứ tự** (`reorder_stacked_commits`).
  - Gợi ý tách hoặc gộp (squash) các bước trung gian trước khi nộp PR.

---

## 👻 5. GHOST PREVIEW KHI KÉO - THẢ (DRAG & DROP)

- Khi người dùng giữ chuột vào một node commit hoặc nhãn nhánh và kéo đi:
  - Cây đồ thị lập tức xuất hiện các **đường nét đứt mờ (Ghost lines)** mô phỏng hình dạng tương lai nếu thả vào vị trí đó.
  - Phía sau hậu trường, Rust backend chạy kiểm tra Dry-run in-memory: nếu có nguy cơ xung đột, viền node mục tiêu sẽ đổi sang **màu cam phát sáng** kèm thông báo cảnh báo tức thì.

---

## 🎚️ 6. MẬT ĐỘ ĐỒ THỊ, ẨN/HIỆN NHÁNH & BỘ LỌC NÂNG CAO

- **Điều chỉnh mật độ hiển thị (Graph Density):** Chuyển đổi linh hoạt giữa các chế độ Thu gọn (Compact - xem nhiều commit nhất), Vừa vặn (Comfortable) và Thoáng đãng (Spacious).
- **Ghim nhánh yêu thích (⭐ Pinned Branches):** 1-Click ghim các nhánh cốt lõi (`main`, `dev`, nhánh cá nhân) lên đầu Sidebar để chuyển đổi tức thì.
- **Kiểm soát hiển thị nhánh (👁️ Branch Visibility):**
  - Bật/tắt con mắt hoặc chọn **"Solo this branch"** để dọn sạch các nhánh phụ gây rối mắt.
  - Vận hành trên thuật toán duyệt đồ thị DAG BFS Reachability: chỉ ẩn các commit thuộc riêng nhánh bị ẩn, tuyệt đối an toàn với dữ liệu kho mã nguồn.
- **Bộ lọc commit nâng cao & Tương tác Canvas (Advanced Filters & Interactive Features):**
  - **Lọc theo Tác giả trực tiếp (Author Click Filter):** Nhấp trực tiếp vào avatar hoặc tên tác giả trên bất kỳ dòng commit nào trên Canvas để kích hoạt chế độ làm nổi bật (highlight commits của tác giả kèm viền sáng, làm mờ các commit khác). Xuất hiện chip điều khiển `[Tác giả: Tên [X]]` ở thanh tiêu đề đồ thị để dễ dàng hủy lọc.
  - **Lọc theo Khoảng thời gian (Date Range Presets):** Menu xổ chọn các mốc thời gian chuẩn hóa: Tất cả thời gian (All Time), Hôm nay (24h qua), 7 ngày qua, 30 ngày qua hoặc 3 tháng qua. Toàn bộ cây commit tự động tái tính toán hiển thị mượt mà.
  - **Dò đường Thủy tổ phát sáng (Ancestor Path Highlight):** Khi chọn 2 commit (Ctrl + Click hoặc chế độ Compare), thuật toán BFS duyệt ngược cây phả hệ (`parents`) tự động tìm đường nối giữa 2 mốc và render hiệu ứng đường cong Bezier phát sáng neon màu ngọc lam (`#38bdf8`) nổi bật trên nền tối.
  - **Bản đồ thu nhỏ toàn cảnh (Graph Minimap):** Bật/tắt thanh Minimap thu nhỏ ở góc phải Canvas. Hiển thị vi điểm phân bố các commit theo lane nhánh, tô sáng Ancestor Path và khung chữ nhật biểu diễn viewport hiện tại, cho phép nhấp chuột để cuộn tức thời đến vị trí bất kỳ trong các repository lớn.

---

## 🛡️ 7. MENU NGỮ CẢNH AN TOÀN (SAFE COMMIT CONTEXT MENU)

Nhấp chuột phải vào bất kỳ node commit nào trên đồ thị động để mở menu hành động an toàn:
- **Interactive Rebase Studio:** Kéo thả đổi thứ tự commit, squash, fixup, reword, drop với tính năng xem trước mô phỏng Dry-Run.
- **Gộp commit nhanh (Squash Commits):** Gộp chuỗi commit gần nhất thành 1 commit duy nhất kèm tự động soạn thảo commit message.
- **Safe Reset (`--soft`, `--mixed`, `--hard`):** Luôn được bảo vệ bởi thùng rác Safe Discard 48h và Time Machine hoàn tác (`Ctrl + Z`).
- **Cherry-pick & Revert:** Sao chép hoặc đảo ngược commit không phá hủy, tự động định tuyến đến nhánh đích mong muốn.

---

## 🧭 8. ĐIỀU HƯỚNG ĐỈNH TINH GỌN (TOP NAV VIEW MODES)

Component: `src/lib/components/toolbar/ToolbarViewModes.svelte`

Nhằm xóa bỏ tình trạng nhồi nhét và cuộn ngang trên màn hình laptop nhỏ, thanh điều hướng Top Nav được thiết kế theo chuẩn **4 Pinned Tabs cốt lõi + Menu Chế độ xem mở rộng (More Views)**:
- **4 Tabs Ghim Cố định (Chiếm 95% thao tác thường ngày):**
  + 🌿 **Graph:** Đồ thị động học và Canvas phân nhánh chính.
  + 📑 **Changes:** Khu vực Working Tree xem file thay đổi, diff và stage/unstage (kèm huy hiệu đếm số file thời gian thực).
  + 🔀 **PRs:** Quản lý Pull Request và review mã nguồn đám mây (kèm huy hiệu số PR đang mở).
  + 📊 **Insights:** Bảng phân tích thống kê repository, biểu đồ tần suất commit và năng suất lập trình viên.
- **Tab Xung đột Động (`⚠️ Conflicts`):** Tự động phát sáng màu đỏ cảnh báo ngay khi xuất hiện xung đột trong quá trình merge hoặc rebase.
- **Menu Chế độ xem mở rộng (More Views ▾):** Hộp xổ nhỏ gọn chứa các view chuyên sâu (`Focus Mode`, `Stacked Commits`, `Bản đồ 2D DAG Map`, `Duyệt cây file Repository Explorer`, và `So sánh Commit Compare`). Khi một chế độ xem mở rộng đang hoạt động, nút dropdown tự động đổi nhãn và tô sáng để báo hiệu cho người dùng.

