/**
 * FlowGit Website Data Module
 * Tách biệt dữ liệu 40+ tính năng, 6 trụ cột kỹ thuật và các tình huống thực tế
 * Giúp mã nguồn index.html gọn gàng, tải nhanh và dễ bảo trì.
 */

const FLOWGIT_PILLARS = [
  { id: 'all', icon: '✨', name: { vi: 'Tất cả (40+)', en: 'All Features (40+)' } },
  { id: 'graph', icon: '📊', name: { vi: 'Đồ Thị & Lịch Sử', en: 'Graph & History' } },
  { id: 'safety', icon: '🛡️', name: { vi: 'An Toàn & Cứu Hộ', en: 'Safety & Recovery' } },
  { id: 'review', icon: '🔍', name: { vi: 'Soi Mã & Staging', en: 'Code & Review' } },
  { id: 'advanced', icon: '🗂️', name: { vi: 'Nâng Cao & Monorepo', en: 'Advanced & Monorepo' } },
  { id: 'cloud', icon: '🌐', name: { vi: 'Cloud, CI/CD & Bảo Mật', en: 'Cloud & CI/CD' } },
  { id: 'dx', icon: '⚡', name: { vi: 'Trải Nghiệm & Hiệu Năng', en: 'DX & Native Core' } },
];

const FLOWGIT_FEATURES = [
  // --- 1. Graph & History ---
  {
    id: 'living-graph',
    pillar: 'graph',
    icon: '📊',
    badge: '60 FPS Worker',
    doc: 'commit-graph-and-dag.md',
    title: {
      vi: 'Đồ Thị Động Học Khóa Cứng 60 FPS (Living Graph)',
      en: 'Living Commit Graph (60 FPS Locked)'
    },
    desc: {
      vi: 'Đồ thị động học dựng bằng OffscreenCanvas và Web Worker cách ly hoàn toàn khỏi UI thread. Thuật toán Rayon song song đảm bảo cuộn mượt mà ngay cả với repo kernel > 100.000 commits.',
      en: 'Kinetic DAG rendering engine driven by OffscreenCanvas and Web Worker, fully isolated from UI thread. Rayon multi-threading keeps scrolling locked at 60 FPS even on 100k+ commit repos.'
    }
  },
  {
    id: 'dag-minimap',
    pillar: 'graph',
    icon: '🗺️',
    badge: 'Navigator',
    doc: 'commit-graph-and-dag.md',
    title: {
      vi: 'Bản Đồ Thu Nhỏ DAG Mini-Map',
      en: 'DAG Mini-Map & Timeline Navigator'
    },
    desc: {
      vi: 'Giao diện radar toàn cảnh lịch sử repository giúp định vị nhanh vị trí nhánh, HEAD và các mốc tag chỉ với 1 cú nhấp chuột.',
      en: 'Birds-eye minimap radar showing entire branching topology, allowing instant navigation across branch tips, HEAD, and tags in 1 click.'
    }
  },
  {
    id: 'ghost-preview',
    pillar: 'graph',
    icon: '🔀',
    badge: 'Dry-Run Sim',
    doc: 'commit-graph-and-dag.md',
    title: {
      vi: 'Kéo Thả & Ghost Preview Mô Phỏng Trước',
      en: 'Drag-and-Drop & Ghost Preview Simulation'
    },
    desc: {
      vi: 'Kéo thả commit hoặc nhánh để Merge/Rebase/Cherry-Pick. Động cơ tính toán in-memory hiển thị trước kết quả mô phỏng và cảnh báo conflict trước khi bạn nhả chuột.',
      en: 'Drag commit nodes directly onto target branches. In-memory simulation detects potential conflicts before you release the mouse button.'
    }
  },
  {
    id: 'branch-pinning',
    pillar: 'graph',
    icon: '⭐',
    badge: 'Custom View',
    doc: 'commit-graph-and-dag.md',
    title: {
      vi: 'Ghim Nhánh Yêu Thích & Lọc Ẩn/Hiện',
      en: 'Branch Pinning (⭐) & Visibility Toggles (👁️)'
    },
    desc: {
      vi: 'Ghim các nhánh quan trọng (main, production, staging) lên đầu đồ thị và ẩn các nhánh tính năng cũ để giữ không gian làm việc luôn gọn gàng.',
      en: 'Pin mission-critical branches (main, prod, staging) to graph apex and toggle visibility of obsolete branches to maintain a clutter-free view.'
    }
  },
  {
    id: 'graph-density',
    pillar: 'graph',
    icon: '🔍',
    badge: 'Zoom Density',
    doc: 'commit-graph-and-dag.md',
    title: {
      vi: 'Điều Chỉnh Mật Độ Đồ Thị (Graph Density)',
      en: 'Graph Density & Compact Mode Zoom'
    },
    desc: {
      vi: 'Linh hoạt phóng to thu nhỏ giữa chế độ Compact (nhìn bao quát hàng chục nhánh) và Comfortable (đọc chi tiết commit message và tác giả).',
      en: 'Seamlessly toggle between Compact mode for massive topology overviews and Comfortable mode for detailed commit inspections.'
    }
  },
  {
    id: 'rebase-studio',
    pillar: 'graph',
    icon: '🪄',
    badge: 'Interactive Rebase',
    doc: 'rebase-and-history-ops.md',
    title: {
      vi: 'Visual Interactive Rebase Studio',
      en: 'Visual Interactive Rebase Studio'
    },
    desc: {
      vi: 'Timeline trực quan kéo thả đổi thứ tự commit, hỗ trợ Pick, Reword, Drop, Squash, Fixup với thuật toán kiểm tra Dry-Run an toàn.',
      en: 'Intuitive drag-and-drop commit timeline supporting Pick, Reword, Drop, Squash, and Fixup with dry-run conflict validation.'
    }
  },
  {
    id: 'stacked-commits',
    pillar: 'graph',
    icon: '🥞',
    badge: 'Stacked PRs',
    doc: 'stacked-commits-and-hotfix.md',
    title: {
      vi: 'Stacked Commits Studio',
      en: 'Stacked Commits Reordering Studio'
    },
    desc: {
      vi: 'Tổ chức chuỗi commit chưa push lên remote bằng thao tác kéo thả hoặc bấm mũi tên Lên/Xuống và lưu an toàn, chuẩn bị hoàn hảo trước khi tạo PR.',
      en: 'Easily reorder and groom unpushed commit stacks using drag-and-drop or Up/Down arrows before submitting upstream PRs.'
    }
  },
  {
    id: 'cherry-pick',
    pillar: 'graph',
    icon: '🍒',
    badge: '1-Click Action',
    doc: 'rebase-and-history-ops.md',
    title: {
      vi: '1-Click Cherry-Pick & Fast-Forward',
      en: '1-Click Cherry-Pick & Fast-Forward'
    },
    desc: {
      vi: 'Nhặt commit sang nhánh hiện tại với 1 thao tác duy nhất, tự động nhận diện quan hệ gia phả và cảnh báo trước nếu phát sinh xung đột.',
      en: 'Cherry-pick individual commits onto the active branch in one action, with automatic parent graph resolution and conflict pre-checks.'
    }
  },

  // --- 2. Safety & Recovery ---
  {
    id: 'safe-discard',
    pillar: 'safety',
    icon: '🛡️',
    badge: '48h SQLite Trash',
    doc: 'safety-engine.md',
    title: {
      vi: 'Safe Discard Engine (Thùng Rác 48h)',
      en: 'Safe Discard Engine (48h SQLite Trash)'
    },
    desc: {
      vi: 'Không bao giờ sợ mất code. Mọi đoạn code discard đều được tự động snapshot vào SQLite 48h. Mở Trash Inspector xem diff và khôi phục 100% trong 1 giây.',
      en: 'Never lose uncommitted work. Every discarded hunk or file is automatically snapshotted into local SQLite for 48h with 1-click restoration.'
    }
  },
  {
    id: 'time-machine',
    pillar: 'safety',
    icon: '⏳',
    badge: 'Ctrl+Z Undo',
    doc: 'safety-engine.md',
    title: {
      vi: 'Cỗ Máy Thời Gian Time Machine (Ctrl + Z)',
      en: 'Time Machine & Undo Log (Ctrl + Z)'
    },
    desc: {
      vi: 'Ghi lại mọi biến động lịch sử (Reset, Rebase, Merge, Commit). Bấm Ctrl + Z để hoàn tác tức thì trạng thái nhánh về trước đó nhờ Git Reflog và Action Journal.',
      en: 'Action Journal tracks every repo mutation. Press Ctrl + Z to instantly rewind branch state across bad resets, rebases, and merges.'
    }
  },
  {
    id: 'index-lock-hunter',
    pillar: 'safety',
    icon: '🔓',
    badge: 'Auto-Fixer',
    doc: 'edge-cases-and-guards.md',
    title: {
      vi: 'Index Lock Deadlock Hunter',
      en: 'Index Lock Deadlock Hunter & Auto-Recovery'
    },
    desc: {
      vi: 'Tự động phát hiện và giải phóng file khóa .git/index.lock bị treo khi ứng dụng nền bị crash, giúp repo hoạt động lại ngay lập tức.',
      en: 'Automatically identifies and safely unlocks stale .git/index.lock files left behind by crashed CLI processes without manual PID hunting.'
    }
  },
  {
    id: 'windows-lock-guard',
    pillar: 'safety',
    icon: '🪟',
    badge: 'OS Handles',
    doc: 'edge-cases-and-guards.md',
    title: {
      vi: 'Windows File Lock & Antivirus Guard',
      en: 'Windows File Lock & Antivirus Guard'
    },
    desc: {
      vi: 'Bắt trước các file handle đang bị VS Code, IDE hoặc Antivirus chiếm dụng, ngăn ngừa tình trạng checkout dở dang gây hỏng working tree.',
      en: 'Detects locked file handles held by VS Code, IDEs, or Antivirus software to prevent aborted checkouts from corrupting the working tree.'
    }
  },
  {
    id: 'pre-commit-secret',
    pillar: 'safety',
    icon: '🚨',
    badge: 'Secret Blocker',
    doc: 'edge-cases-and-guards.md',
    title: {
      vi: 'Bộ Chặn Rò Rỉ Bí Mật (Pre-Commit Guard)',
      en: 'Pre-Commit Secret & Heavy File Guard'
    },
    desc: {
      vi: 'Cảnh báo và ngăn chặn ngay lập tức nếu bạn vô tình stage file nhạy cảm (.env, id_rsa, chứng chỉ pem, API keys) hoặc file quá khổ (> 50MB).',
      en: 'Instantly alerts and blocks accidental staging of sensitive credentials (.env, id_rsa, pem certificates, API tokens) or files > 50MB.'
    }
  },
  {
    id: 'git-playbook',
    pillar: 'safety',
    icon: '🩺',
    badge: 'Git Doctor',
    doc: 'onboarding-and-playbook.md',
    title: {
      vi: 'Git Playbook & Bác Sĩ Cứu Hộ Khẩn Cấp',
      en: 'Git Playbook & Emergency Doctor'
    },
    desc: {
      vi: 'Sổ tay tương tác chẩn đoán và sửa chữa 1-chạm cho các sự cố hóc búa: gỡ Detached HEAD, hủy rebase kẹt, dọn dẹp reflog và thu hồi rác kho chứa.',
      en: 'Interactive 1-click diagnostic doctor repairing difficult states: resolving Detached HEAD, aborting stuck rebases, and pruning garbage refs.'
    }
  },

  // --- 3. Code & Review ---
  {
    id: 'monaco-diff',
    pillar: 'review',
    icon: '⚡',
    badge: 'Monaco Engine',
    doc: 'working-tree-and-diff.md',
    title: {
      vi: 'Monaco Diff Editor (Split & Unified)',
      en: 'Monaco Diff Editor (Split & Unified)'
    },
    desc: {
      vi: 'Trình so sánh code chuẩn VS Code với 2 chế độ hiển thị Song Song (Split) hoặc Hợp Nhất (Unified), hỗ trợ highlight cú pháp mọi ngôn ngữ.',
      en: 'VS Code-grade diff engine featuring side-by-side Split and inline Unified views with full syntax highlighting across all programming languages.'
    }
  },
  {
    id: 'line-staging',
    pillar: 'review',
    icon: '📝',
    badge: 'Granular Stage',
    doc: 'working-tree-and-diff.md',
    title: {
      vi: 'Stage / Unstage Từng Khối & Từng Dòng Code',
      en: 'Granular Line & Hunk Staging (Spacebar)'
    },
    desc: {
      vi: 'Tự do chia tách commit sạch đẹp bằng cách bấm phím Space hoặc click chuột để stage từng dòng hoặc từng khối mã (hunk) độc lập.',
      en: 'Craft surgical, immaculate commits by pressing Spacebar or clicking to stage/unstage individual lines or hunks independently.'
    }
  },
  {
    id: 'discard-hunk-safe',
    pillar: 'review',
    icon: '✂️',
    badge: 'Protected Discard',
    doc: 'working-tree-and-diff.md',
    title: {
      vi: 'Xóa Dòng/Khối Có Bảo Hiểm (Safe Hunk Discard)',
      en: 'Safe Hunk Discard (Backed by Trash)'
    },
    desc: {
      vi: 'Loại bỏ những dòng code thừa ngay trên trình diff, dữ liệu xóa vẫn được đưa vào thùng rác SQLite 48h phòng khi bạn đổi ý.',
      en: 'Discard individual scrap lines directly in the diff viewer, with deleted chunks safely preserved in SQLite 48h trash just in case.'
    }
  },
  {
    id: 'conflict-resolver',
    pillar: 'review',
    icon: '⚔️',
    badge: '4-Pane 3-Way',
    doc: 'conflict-and-bisect.md',
    title: {
      vi: 'Trình Xử Lý Xung Đột 4 Khung Hình 3-Way',
      en: '4-Pane 3-Way Conflict Resolver'
    },
    desc: {
      vi: 'Phân tách trực quan Ours, Base, Theirs và Kết quả xem trước (Result). Chọn 1-click "Take Ours", "Take Theirs" hoặc trộn cả 2, không lo sót marker <<<<<<<.',
      en: 'Clean separation of Ours, Base, Theirs, and live Result preview. Adopt blocks in 1 click without messy <<<<<<< conflict markers.'
    }
  },
  {
    id: 'bisect-wizard',
    pillar: 'review',
    icon: '🐞',
    badge: 'Binary Search',
    doc: 'conflict-and-bisect.md',
    title: {
      vi: 'Visual Git Bisect Wizard Dò Bug Tự Động',
      en: 'Visual Git Bisect Wizard'
    },
    desc: {
      vi: 'Thuật toán tìm kiếm nhị phân chia đôi đồ thị, hướng dẫn bạn kiểm thử từng bước với 2 nút "Pass" / "Fail" để tìm ra commit gây lỗi trong tích tắc.',
      en: 'Automated binary search wizard splitting the commit graph, guiding you with simple Pass/Fail buttons to isolate bugs in minutes.'
    }
  },
  {
    id: 'commit-composer',
    pillar: 'review',
    icon: '✍️',
    badge: 'Composer',
    doc: 'working-tree-and-diff.md',
    title: {
      vi: 'Native Commit Composer & Amend',
      en: 'Native Commit Composer & Amend'
    },
    desc: {
      vi: 'Hỗ trợ mẫu quy chuẩn commit, Amend 1-click vào commit gần nhất, gán thẻ Co-Authors và bộ chọn Emoji tích hợp.',
      en: 'Integrated commit message composer supporting templates, 1-click commit Amend, Co-Author attribution, and native Emoji picker.'
    }
  },

  // --- 4. Advanced & Monorepo ---
  {
    id: 'repo-explorer',
    pillar: 'advanced',
    icon: '🗂️',
    badge: 'Zero-Checkout',
    doc: 'repo-explorer-and-file-tools.md',
    title: {
      vi: 'Duyệt Cây File Quá Khứ (Repo Explorer)',
      en: 'Repository Explorer (Browse History Without Checkout)'
    },
    desc: {
      vi: 'Khám phá cấu trúc thư mục và xem nội dung mã nguồn tại bất kỳ commit nào trong quá khứ mà không làm bẩn thư mục làm việc hiện tại.',
      en: 'Browse directory trees and view syntax-highlighted code at any historical commit OID without dirtying your active working directory.'
    }
  },
  {
    id: 'interactive-blame',
    pillar: 'advanced',
    icon: '🕵️',
    badge: 'Line Blame',
    doc: 'repo-explorer-and-file-tools.md',
    title: {
      vi: 'Interactive Line-by-Line Blame',
      en: 'Interactive Line-by-Line Blame'
    },
    desc: {
      vi: 'Soi rõ từng dòng code do ai viết, viết lúc nào và thuộc commit nào với tooltip hover chi tiết cùng liên kết mở commit tức thì.',
      en: 'Inspect author, commit hash, date, and message for every line with interactive hover popups and 1-click jump to commit details.'
    }
  },
  {
    id: 'compare-viewer',
    pillar: 'advanced',
    icon: '⚖️',
    badge: 'Offline Diff',
    doc: 'repo-explorer-and-file-tools.md',
    title: {
      vi: 'So Sánh 2 Commit Hoặc 2 Nhánh Tùy Ý',
      en: '2-Commit & 2-Branch Comparison Viewer'
    },
    desc: {
      vi: 'So sánh toàn diện danh sách tệp thay đổi và Monaco Diff giữa hai điểm bất kỳ trong lịch sử Git mà không cần kết nối Internet.',
      en: 'Deep side-by-side file tree and Monaco diff comparison between any two commits or branch heads, 100% offline.'
    }
  },
  {
    id: 'file-history',
    pillar: 'advanced',
    icon: '📜',
    badge: 'Single File',
    doc: 'repo-explorer-and-file-tools.md',
    title: {
      vi: 'Dòng Thời Gian Lịch Sử Đơn Tệp (File History)',
      en: 'Dedicated Single File History Timeline'
    },
    desc: {
      vi: 'Theo dõi toàn bộ quá trình tiến hóa và mọi lần chỉnh sửa của một tệp tin duy nhất xuyên suốt nhiều năm phát triển của dự án.',
      en: 'Track the complete evolution and chronological mutations of an isolated single file across years of repository history.'
    }
  },
  {
    id: 'history-nuker',
    pillar: 'advanced',
    icon: '🧹',
    badge: 'Permanent Purge',
    doc: 'repo-explorer-and-file-tools.md',
    title: {
      vi: 'History Nuker (Tẩy Xóa File Bí Mật Vĩnh Viễn)',
      en: 'History Nuker (Eradicate Sensitive Files)'
    },
    desc: {
      vi: '1-Click quét đệ quy và tẩy xóa triệt để tệp nhạy cảm (.env, token bí mật) hoặc file nặng khỏi 100% lịch sử Git mà không cần nhớ lệnh phức tạp.',
      en: '1-Click recursive purge permanently erasing credentials (.env, tokens) and large files across 100% of Git history without complex CLI syntax.'
    }
  },
  {
    id: 'worktrees-manager',
    pillar: 'advanced',
    icon: '🚀',
    badge: 'Parallel Workspaces',
    doc: 'advanced-tools.md',
    title: {
      vi: 'Git Worktrees Đa Nhiệm Song Song',
      en: 'Git Worktrees Parallel Workspaces'
    },
    desc: {
      vi: 'Mở song song nhiều thư mục làm việc cho các nhánh khác nhau mà không cần stash hay lo ngại xung đột node_modules/target.',
      en: 'Work on multiple branches simultaneously in isolated physical directories without stash juggling or node_modules rebuilds.'
    }
  },
  {
    id: 'quick-hotfix',
    pillar: 'advanced',
    icon: '🚑',
    badge: '1-Click Hotfix',
    doc: 'stacked-commits-and-hotfix.md',
    title: {
      vi: '1-Click Quick Hotfix Studio',
      en: '1-Click Quick Hotfix Studio'
    },
    desc: {
      vi: 'Tự động mở thư mục worktree tạm từ nhánh main để sửa bug khẩn cấp cho production, tự động dọn dẹp sạch sẽ sau khi merge.',
      en: 'Instantly spawn an isolated hotfix worktree branched from main, patch the bug, and automatically clean up after merging.'
    }
  },
  {
    id: 'git-lfs',
    pillar: 'advanced',
    icon: '📦',
    badge: 'Game Dev & LFS Lock',
    doc: 'advanced-tools.md',
    title: {
      vi: 'Quản Lý Tệp Lớn Git LFS & Khóa File',
      en: 'Git LFS Engine & Remote File Locking'
    },
    desc: {
      vi: 'Theo dõi, tải payload nhị phân và khóa tệp nhị phân trên remote server (Unreal, Unity, PSD, 3D) để tránh xung đột không thể merge.',
      en: 'Track, download binary payloads, and lock unmergeable assets (Unreal, Unity, PSD, 3D) on remote servers to prevent team collisions.'
    }
  },
  {
    id: 'submodules-hub',
    pillar: 'advanced',
    icon: '🧩',
    badge: 'Multi-Repo',
    doc: 'advanced-tools.md',
    title: {
      vi: 'Trung Tâm Git Submodules Hub',
      en: 'Git Submodules Hub'
    },
    desc: {
      vi: 'Khởi tạo, cập nhật đệ quy và đồng bộ các kho mã nguồn con lồng nhau một cách trực quan, giải quyết triệt để lỗi trôi commit submodule.',
      en: 'Visually initialize, update recursively, and synchronize nested submodule repositories, eliminating detached submodule states.'
    }
  },
  {
    id: 'sparse-checkout',
    pillar: 'advanced',
    icon: '📂',
    badge: 'Monorepo Cone',
    doc: 'sparse-checkout-and-lfs.md',
    title: {
      vi: 'Monorepo Sparse Checkout Studio',
      en: 'Monorepo Sparse Checkout Studio'
    },
    desc: {
      vi: 'Cấu hình Cone Mode để chỉ tải về và làm việc trên thư mục cần thiết trong monorepo hàng chục Gigabyte, tiết kiệm đĩa và tăng tốc tối đa.',
      en: 'Configure Cone Mode sparse checkout to download only relevant directories in multi-gigabyte monorepos, saving disk space and boosting speed.'
    }
  },
  {
    id: 'hooks-manager',
    pillar: 'advanced',
    icon: '🪝',
    badge: 'Git Hooks',
    doc: 'advanced-tools.md',
    title: {
      vi: 'Trình Quản Lý Git Hooks Trực Quan',
      en: 'Visual Git Hooks Manager'
    },
    desc: {
      vi: 'Kiểm tra, kích hoạt và chỉnh sửa các script tự động hóa (pre-commit, commit-msg, pre-push) trực tiếp trong giao diện ứng dụng.',
      en: 'Inspect, activate, and edit client-side automation scripts (pre-commit, commit-msg, pre-push) directly within the UI.'
    }
  },

  // --- 5. Cloud, CI/CD & Security ---
  {
    id: 'multi-remote',
    pillar: 'cloud',
    icon: '☁️',
    badge: 'Multi-Provider',
    doc: 'branches-and-remotes.md',
    title: {
      vi: 'Đa Nền Tảng Multi-Remote & Smart Sync',
      en: 'Multi-Remote Adapters & Smart Sync'
    },
    desc: {
      vi: 'Kết nối đồng thời GitHub, GitLab, Bitbucket, Gitea. Nút Smart Sync tự động fetch và rebase ngầm không cần checkout, hiển thị badge ↑2 ↓5.',
      en: 'Connect GitHub, GitLab, Bitbucket, and Gitea. 1-Click Smart Sync fetches and rebases in the background without checkout, showing ↑2 ↓5 badges.'
    }
  },
  {
    id: 'pr-hub',
    pillar: 'cloud',
    icon: '🐙',
    badge: 'Zero-Browser',
    doc: 'github-and-pull-requests.md',
    title: {
      vi: 'GitHub Pull Request Workspace',
      en: 'GitHub Pull Request Workspace'
    },
    desc: {
      vi: 'Duyệt PR, đọc diff Monaco, nhận xét nội dòng, duyệt và merge PR trực tiếp trong ứng dụng mà không cần mở trình duyệt.',
      en: 'Browse PRs, review Monaco diffs, post inline comments, check CI status, and merge directly inside FlowGit without opening a browser.'
    }
  },
  {
    id: 'actions-studio',
    pillar: 'cloud',
    icon: '🏗️',
    badge: 'Live Logs',
    doc: 'github-actions-integration.md',
    title: {
      vi: 'GitHub Actions CI/CD Studio',
      en: 'GitHub Actions CI/CD Studio'
    },
    desc: {
      vi: 'Giám sát tiến độ chạy pipeline thời gian thực, xem cây Job Steps, đọc log ANSI tô màu và bấm Re-run các job bị lỗi tức thì.',
      en: 'Monitor workflow runs in real-time, inspect job step trees, read ANSI color-parsed logs, and re-run failed pipelines in 1 click.'
    }
  },
  {
    id: 'commit-signing',
    pillar: 'cloud',
    icon: '🔏',
    badge: 'Verified Badge',
    doc: 'remote-providers-and-signing.md',
    title: {
      vi: 'Xác Thực Ký Số GPG & SSH Commit',
      en: 'GPG & SSH Commit Digital Signing'
    },
    desc: {
      vi: 'Tích hợp ký số bảo mật điện tử cho mọi commit, kiểm tra tính toàn vẹn và hiển thị huy hiệu Verified uy tín chuẩn doanh nghiệp.',
      en: 'Cryptographically sign commits using GPG or SSH keys, verify author integrity, and display enterprise-grade Verified badges.'
    }
  },
  {
    id: 'keychain-auth',
    pillar: 'cloud',
    icon: '🔑',
    badge: 'OS Keychain',
    doc: 'auth-and-identity.md',
    title: {
      vi: 'Xác Thực An Toàn Native OS Keychain',
      en: 'Secure Native OS Keychain Auth'
    },
    desc: {
      vi: 'Đăng nhập bảo mật qua OAuth Device Flow và PAT, mã hóa lưu trữ token trong Windows Credential Manager hoặc macOS Keychain.',
      en: 'Seamless authentication via OAuth Device Flow and PAT, storing encrypted credentials inside Windows Credential Manager and macOS Keychain.'
    }
  },
  {
    id: 'identity-switcher',
    pillar: 'cloud',
    icon: '👤',
    badge: 'Work vs Personal',
    doc: 'auth-and-identity.md',
    title: {
      vi: 'Chuyển Đổi Danh Tính Theo Từng Repo',
      en: 'Per-Repository Identity Switcher'
    },
    desc: {
      vi: 'Tự động áp dụng đúng User Name, Email và SSH Key theo từng repository, loại bỏ hoàn toàn nguy cơ commit nhầm email công ty vào repo cá nhân.',
      en: 'Automatically binds specific User Name, Email, and SSH keys per repository, preventing accidental leaks between work and personal repos.'
    }
  },
  {
    id: 'tag-lifecycle',
    pillar: 'cloud',
    icon: '🏷️',
    badge: 'Releases',
    doc: 'branches-and-remotes.md',
    title: {
      vi: 'Quản Lý Vòng Đời Git Tag',
      en: 'Git Tag Lifecycle Studio'
    },
    desc: {
      vi: 'Tạo thẻ phiên bản Lightweight hoặc Annotated có ký số, đẩy chọn lọc từng tag hoặc đẩy toàn bộ tags lên remote server an toàn.',
      en: 'Create lightweight or cryptographically signed annotated release tags, with granular controls to push individual or all tags upstream.'
    }
  },
  {
    id: 'stash-shelf',
    pillar: 'cloud',
    icon: '📥',
    badge: 'Diff Stash',
    doc: 'branches-and-remotes.md',
    title: {
      vi: 'Kệ Lưu Nháp Stash Shelf Inspector',
      en: 'Stash Shelf Inspector'
    },
    desc: {
      vi: 'Xem trước diff chi tiết của từng tệp bên trong stash trước khi Pop hoặc Apply, giúp dọn dẹp và áp dụng bản nháp tự tin.',
      en: 'Inspect Monaco diffs of individual files tucked inside stashes before popping or applying, keeping your stash shelf pristine.'
    }
  },
  {
    id: 'patch-manager',
    pillar: 'cloud',
    icon: '📫',
    badge: 'Format-Patch',
    doc: 'patch-file-manager.md',
    title: {
      vi: 'Trình Quản Lý & Áp Dụng Tệp Patch',
      en: 'Patch File Manager & Dry-Run Apply'
    },
    desc: {
      vi: 'Xuất các commit thành file .patch tiêu chuẩn và áp dụng patch 3-way với chế độ kiểm tra Dry-Run trước khi ghi đè mã nguồn.',
      en: 'Export commits to standard .patch files and import external patches using 3-way merge with dry-run conflict pre-checks.'
    }
  },

  // --- 6. DX & Native Core ---
  {
    id: 'repo-pulse',
    pillar: 'dx',
    icon: '📈',
    badge: 'Insights Studio',
    doc: 'repo-insights-and-statistics.md',
    title: {
      vi: 'Repo Pulse & Studio Phân Tích Nhịp Độ',
      en: 'Repository Pulse & Insights Studio'
    },
    desc: {
      vi: 'Bản đồ nhiệt 52 tuần hoạt động, phân tích Code Hotspots (các file bị sửa nhiều nhất dễ sinh lỗi) và bảng xếp hạng đóng góp của tác giả.',
      en: '52-week commit activity heatmap, Code Churn & Hotspot analysis identifying bug-prone files, and contributor impact velocity leaderboards.'
    }
  },
  {
    id: 'command-palette',
    pillar: 'dx',
    icon: '⚡',
    badge: 'Ctrl+K / Cmd+K',
    doc: 'user-manual.md',
    title: {
      vi: 'Siêu Bảng Lệnh Command Palette',
      en: 'Command Palette (Ctrl + K / Cmd + K)'
    },
    desc: {
      vi: 'Tìm kiếm mờ (fuzzy search) và thực hiện tức thì hơn 50+ thao tác Git chỉ bằng bàn phím mà không cần rời tay khỏi phím bấm.',
      en: 'Fuzzy-search and execute over 50+ Git commands at lightspeed without touching the mouse.'
    }
  },
  {
    id: 'smart-search',
    pillar: 'dx',
    icon: '🔎',
    badge: 'Instant Filter',
    doc: 'commit-graph-and-dag.md',
    title: {
      vi: 'Thanh Tìm Kiếm & Bộ Lọc Đa Tiêu Chí',
      en: 'Smart Multi-Criteria Search & Filter'
    },
    desc: {
      vi: 'Lọc lịch sử commit siêu tốc theo Author, SHA hash, nội dung thông điệp, khoảng thời gian hoặc đường dẫn tệp tin theo thời gian thực.',
      en: 'Filter commit history in real time by Author, commit hash, message keywords, date ranges, or affected file paths.'
    }
  },
  {
    id: 'theme-engine',
    pillar: 'dx',
    icon: '🎨',
    badge: '5 Curated Themes',
    doc: 'main.md',
    title: {
      vi: 'Động Cơ Giao Diện Đa Chủ Đề (Themes)',
      en: 'Curated Multi-Theme Engine'
    },
    desc: {
      vi: 'Tùy biến phong cách làm việc với 5 bảng màu cao cấp: Dark Modern, Tokyo Night, GitHub Dark, Catppuccin và Light Mode dịu mắt.',
      en: 'Elevate your workspace with 5 curated color palettes: Dark Modern, Tokyo Night, GitHub Dark, Catppuccin, and Clean Light.'
    }
  },
  {
    id: 'dual-i18n',
    pillar: 'dx',
    icon: '🌐',
    badge: '100% Dual i18n',
    doc: 'onboarding-and-playbook.md',
    title: {
      vi: 'Hệ Thống Song Ngữ Toàn Diện (Tiếng Việt & English)',
      en: 'Strict Dual i18n System (VI & EN)'
    },
    desc: {
      vi: '100% chuỗi giao diện, thông báo lỗi, tooltip và tài liệu đều được bản địa hóa chỉn chu với ngôn từ chuẩn mực dành cho lập trình viên.',
      en: '100% of UI strings, error alerts, tooltips, and guides are thoroughly localized in native Vietnamese and standard English.'
    }
  },
  {
    id: 'ai-assistant',
    pillar: 'dx',
    icon: '🤖',
    badge: 'Local AI Offline',
    doc: 'ai-assistant.md',
    title: {
      vi: 'Trợ Lý AI Cục Bộ (Ollama / Local LLM)',
      en: 'Offline Local AI Assistant (Ollama)'
    },
    desc: {
      vi: 'Tự động tạo thông điệp Conventional Commit chuẩn chỉnh từ diff và hỗ trợ giải thích nguyên nhân conflict chạy 100% offline trên máy.',
      en: 'Generates Conventional Commit messages from diffs and explains complex conflict resolutions, running 100% offline via Ollama.'
    }
  },
  {
    id: 'tauri-core',
    pillar: 'dx',
    icon: '🦀',
    badge: 'Rust & Tauri v2',
    doc: 'overview.md',
    title: {
      vi: 'Hiệu Năng Native Rust & Bộ Cài Siêu Nhẹ',
      en: 'Native Rust Core & Ultra-Light Footprint'
    },
    desc: {
      vi: 'Bộ cài dưới 35MB, tiêu tốn chỉ ~50MB RAM, khởi động dưới 0.8 giây và tích hợp sẵn cơ chế tự động cập nhật ngầm qua GitHub Releases.',
      en: 'Installer under 35MB, consuming only ~50MB RAM with sub-second startup and automated background updates via GitHub Releases.'
    }
  }
];

const FLOWGIT_RESCUES = [
  {
    id: 'rescue-discard',
    icon: '🛡️',
    badge: { vi: 'Cứu Nguy Mất Code', en: 'Code Loss Rescue' },
    badgeClass: '',
    title: {
      vi: "Lỡ Bấm Nhầm 'Discard All Changes'",
      en: "Accidental 'Discard All Changes'"
    },
    problem: {
      vi: 'Hơn 250 dòng code thuật toán viết cả buổi sáng bốc hơi khỏi ổ đĩa. Các công cụ thông thường xóa vĩnh viễn không thể cứu lại.',
      en: 'Over 250 lines of complex algorithm code wiped out. Standard Git tools delete uncommitted files permanently without recovery.'
    },
    solution: {
      vi: 'FlowGit tự động tạo snapshot vào SQLite trước khi xóa. Mở Trash Inspector 48h ➔ Bấm Restore ➔ Khôi phục 100% trong 1 giây.',
      en: 'FlowGit auto-snapshots files into SQLite before deletion. Open 48h Trash Inspector ➔ Click Restore ➔ 100% recovered in 1 second.'
    }
  },
  {
    id: 'rescue-reflog',
    icon: '⏳',
    badge: { vi: 'Cứu Nguy Lịch Sử', en: 'History Rescue' },
    badgeClass: 'green',
    title: {
      vi: 'Reset Nhầm Hoặc Rebase Xung Đột Hỏng',
      en: 'Erroneous Reset or Broken Rebase'
    },
    problem: {
      vi: 'Chạy lệnh reset --hard nhầm làm mất branch pointer, hoặc rebase xung đột làm biến dạng toàn bộ commit tree.',
      en: 'Accidentally ran reset --hard losing commit pointers, or encountered an aborted rebase mangling branch history.'
    },
    solution: {
      vi: 'Bấm Ctrl + Z (Time Machine), FlowGit tra cứu Action Journal và reflog để hoàn tác tức thì, đưa repo về trạng thái trước đó an toàn.',
      en: 'Press Ctrl + Z (Time Machine): FlowGit checks the Action Journal and reflog to roll back repository state instantly.'
    }
  },
  {
    id: 'rescue-performance',
    icon: '🚀',
    badge: { vi: 'Hiệu Năng Cực Đại', en: 'Extreme Performance' },
    badgeClass: 'blue',
    title: {
      vi: 'Kho Chứa Khổng Lồ Gây Đơ Giật Ứng Dụng',
      en: 'Enterprise Repo Graph Freezes'
    },
    problem: {
      vi: 'Mở repo trên 50.000 commits, các app Electron thường xuyên đơ cứng giao diện, ngốn 1.2GB RAM và quạt tản nhiệt quay ầm ĩ.',
      en: 'Opening repos with 50,000+ commits causes traditional Electron tools to freeze, consuming 1.2GB RAM with spinning fans.'
    },
    solution: {
      vi: 'FlowGit tính toán luồng nhánh bằng Rust (rayon) và vẽ qua OffscreenCanvas Worker độc lập. Giữ vững 60 FPS và RAM < 85MB.',
      en: 'FlowGit computes DAG lanes with multi-core Rust and renders on an OffscreenCanvas Worker. Locked 60 FPS at <85MB RAM.'
    }
  },
  {
    id: 'rescue-conflict',
    icon: '⚔️',
    badge: { vi: 'Giải Quyết Xung Đột', en: 'Conflict Rescue' },
    badgeClass: '',
    title: {
      vi: 'Conflict Khổng Lồ Khi Merge Nhánh Lớn',
      en: 'Massive Merge Conflicts in Production'
    },
    problem: {
      vi: 'Hàng chục file đỏ lòm với các ký tự lạ <<<<<<<, =======, >>>>>>> gây nhầm lẫn nghiêm trọng khi xóa nhầm code đồng nghiệp.',
      en: 'Dozens of conflicting files littered with cryptic <<<<<<< and >>>>>>> markers, risking accidental deletion of team code.'
    },
    solution: {
      vi: 'Bộ giải quyết 4 khung nhìn Monaco trực quan (Ours, Base, Theirs, Result) với nút bấm nhận từng hunk, tự động kiểm tra cú pháp trước khi lưu.',
      en: '4-Pane Monaco resolver displaying Ours, Base, Theirs, and Result with 1-click hunk adoption and live syntax validation.'
    }
  },
  {
    id: 'rescue-secret',
    icon: '🚨',
    badge: { vi: 'Bảo Vệ Bí Mật', en: 'Security Guard' },
    badgeClass: 'purple',
    title: {
      vi: 'Vô Tình Stage File Chứa Token & File Nặng',
      en: 'Staging Private Keys or Huge Binaries'
    },
    problem: {
      vi: 'File .env chứa Secret Key ngân hàng hoặc video 200MB vô tình bị push lên GitHub công khai, gây lộ bảo mật hoặc hỏng repo.',
      en: 'Staged .env containing API credentials or a 200MB video, risking public credential leaks or repository bloat.'
    },
    solution: {
      vi: 'Pre-Commit Guard tự động chặn đứng thao tác commit và bật cảnh báo đỏ. Kèm công cụ History Nuker tẩy sạch trong quá khứ 1-chạm.',
      en: 'Pre-Commit Guard flags and blocks secret files immediately. If already committed, History Nuker purges them with 1 click.'
    }
  },
  {
    id: 'rescue-hotfix',
    icon: '🌲',
    badge: { vi: 'Đa Nhiệm Không Nghẽn', en: 'Zero Interruption' },
    badgeClass: 'green',
    title: {
      vi: 'Cần Sửa Bug Khẩn Cấp Khi Đang Code Dở',
      en: 'Urgent Production Patch While In Progress'
    },
    problem: {
      vi: 'Đang sửa dở 15 file trên nhánh feature thì production sập. Stash code dở thường xuyên gây conflict hoặc mất file khi pop.',
      en: 'Modifying 15 files on a feature branch when production breaks. Stashing often leads to pop collisions and rebuild delays.'
    },
    solution: {
      vi: 'Bấm Quick Hotfix / Worktree Manager: Mở nhánh song song ở thư mục độc lập để vá lỗi và deploy ngay, nhánh đang code giữ nguyên 100%.',
      en: 'Use Quick Hotfix / Worktrees: Open parallel working directory to hotfix and deploy immediately without touching ongoing work.'
    }
  }
];

// Export to window object for zero-build browser compatibility
if (typeof window !== 'undefined') {
  window.FLOWGIT_PILLARS = FLOWGIT_PILLARS;
  window.FLOWGIT_FEATURES = FLOWGIT_FEATURES;
  window.FLOWGIT_RESCUES = FLOWGIT_RESCUES;
}
