const translations = {
  vi: {
    navFeatures: "Tính năng",
    navComparison: "So sánh",
    navDocs: "Tài liệu",
    navDownload: "Tải về",
    heroTag: "⚡ Thế Hệ Git Client Mới 2026",
    heroTitlePrefix: "Trải Nghiệm Git",
    heroTitleHighlight: "Nhanh Như Chớp",
    heroTitleSuffix: "An Toàn Tuyệt Đối",
    heroDesc: "Tạm biệt các ứng dụng Electron ì ạch ngốn cả Gigabyte RAM. FlowGit kết hợp sức mạnh native của Rust và đồ thị 60 FPS cùng cỗ máy thời gian hoàn tác, biến Git thành trải nghiệm không-nỗi-sợ.",
    btnDownloadWindows: "Tải FlowGit cho Windows (.exe)",
    btnDownloadMac: "Tải FlowGit cho macOS (.dmg)",
    btnDownloadLinux: "Tải FlowGit cho Linux (.deb)",
    btnStarGithub: "Star trên GitHub",
    otherPlatforms: "Nền tảng khác:",
    freeOpenSource: "Miễn phí & Mã nguồn mở",
    noTelemetry: "Không quảng cáo",
    autoUpdate: "Tự động cập nhật ngầm",
    
    // Metrics
    metricRamVal: "< 85 MB",
    metricRamLabel: "Chiếm Dụng RAM Siêu Nhẹ",
    metricRamSub: "So với 800MB - 1.2GB của Electron",
    
    metricSpeedVal: "< 0.5s",
    metricSpeedLabel: "Khởi Động Tức Thì",
    metricSpeedSub: "Tối ưu hóa native bằng Rust & Tauri v2",
    
    metricFpsVal: "60 FPS",
    metricFpsLabel: "Đồ Thị Động Học Mượt Mà",
    metricFpsSub: "OffscreenCanvas cân > 100.000 commits",
    
    metricSafeVal: "48 Giờ",
    metricSafeLabel: "Thùng Rác Safe Discard",
    metricSafeSub: "Cứu lại mã nguồn lỡ tay xóa nhầm",

    // Section Titles
    featuresTitle: "Tại Sao FlowGit Vượt Trội?",
    featuresDesc: "Mọi tính năng đều được chế tác để giải quyết nỗi đau lớn nhất của lập trình viên khi làm việc với Git hàng ngày.",
    
    // 8 Features
    f1Title: "🛡️ Safe Discard 48h & Time Machine (Ctrl+Z)",
    f1Desc: "Không bao giờ sợ mất code. Mọi đoạn code discard đều được tự động snapshot vào SQLite 48h. Hoàn tác mọi thao tác nguy hiểm (Reset, Rebase hỏng) tức thì chỉ với Ctrl+Z.",
    
    f2Title: "📊 Living Commit Graph 60 FPS Locked",
    f2Desc: "Đồ thị động học dựng bằng OffscreenCanvas và Web Worker cách ly hoàn toàn khỏi UI thread. Thuật toán Rayon song song đảm bảo cuộn mượt mà ngay cả với repo kernel.",
    
    f3Title: "🔀 Kéo Thả Rebase & In-Memory Ghost Preview",
    f3Desc: "Đổi thứ tự commit, bôi đen gộp (Squash) chỉ bằng kéo thả. Thuật toán Ghost Preview mô phỏng in-memory cảnh báo conflict trước khi bạn nhả chuột.",
    
    f4Title: "⚔️ Trình Xử Lý Xung Đột 4 Khung Hình",
    f4Desc: "Phân tách rõ ràng Ours, Base, Theirs và Result. Nhận từng khối mã trực quan 1-click kết hợp sức mạnh highlight cú pháp của Monaco Editor (chuẩn VS Code).",
    
    f5Title: "🐙 GitHub Pull Request Workspace",
    f5Desc: "Duyệt PR, đọc diff Monaco, theo dõi CI/CD Actions, checkout nhánh PR và merge trực tiếp trong app mà không cần mở trình duyệt.",
    
    f6Title: "🐞 Visual Git Bisect Wizard",
    f6Desc: "Tự động phân đôi lịch sử commit và dẫn dắt bạn qua giao diện trực quan để truy vết commit gây bug chỉ sau 4 - 5 bước kiểm tra.",
    
    f7Title: "🧹 History Nuker (Tẩy Xóa File Mật)",
    f7Desc: "Xóa vĩnh viễn file nhạy cảm lỡ commit (.env, API keys, file binary nặng hàng trăm MB) khỏi toàn bộ lịch sử Git chỉ với vài cú nhấp chuột.",
    
    f8Title: "🔄 Tự Động Cập Nhật 0 Đồng (Zero-VPS)",
    f8Desc: "Tích hợp công nghệ cập nhật ngầm Tauri v2 ký số bằng mật mã Ed25519, phân phối qua GitHub Releases an toàn tuyệt đối và miễn phí trọn đời.",

    // Comparison
    compTitle: "Bảng So Sánh Chi Tiết",
    compMetric: "Tiêu Chí",
    compFlowGit: "⚡ FlowGit",
    compElectron: "Ứng Dụng Electron",
    compLegacy: "Git GUI Cổ Điển",
    
    // CTA
    ctaTitle: "Sẵn Sàng Nâng Tầm Trải Nghiệm Git?",
    ctaDesc: "Tải ngay FlowGit hoàn toàn miễn phí hoặc khám phá mã nguồn mở trên GitHub.",
    ctaBtn: "Tải Bản Cài Đặt",
    ctaBtnWindows: "Tải Bản Cài Đặt Windows (.exe)",
    ctaBtnMac: "Tải Bản Cài Đặt macOS (.dmg)",
    ctaBtnLinux: "Tải Bản Cài Đặt Linux (.deb / .AppImage)",
    
    // Showcase Tabs & Captions
    tabLivingGraph: "Living Graph & Monaco Diff",
    tabSplitDiff: "Split Diff Editor",
    tabConflicts: "3-Way Conflict Resolver",
    tabSafeTrash: "Safe Discard (48h Trash)",
    tabTimeMachine: "Time Machine (Ctrl+Z)",
    tabPalette: "Command Palette (Ctrl+K)",
    windowLiveBadge: "● Ảnh chụp ứng dụng thực tế",
    captionHero: "✨ Đồ thị Living Commit Graph vẽ bằng OffscreenCanvas 60 FPS kết hợp Monaco Diff Editor tích hợp.",
    captionDiff: "⚡ Monaco Diff Editor hỗ trợ chế độ Split 2 cột trực quan, syntax highlighting chuẩn VS Code.",
    captionConflicts: "⚔️ 3-Way Conflict Resolver trực quan với AI Auto-Merge, Take Ours / Theirs và xem kết quả tức thì.",
    captionTrash: "🛡️ Safe Discard 48h Trash Inspector: Cứu lại mã nguồn đã lỡ xóa chỉ với 1-Click Restore.",
    captionTimeMachine: "⏪ Cỗ máy thời gian Time Machine: Hoàn tác (Undo) và làm lại (Redo) mọi hành động Git qua Ctrl+Z.",
    captionPalette: "⌘ Siêu bảng lệnh Command Palette (Ctrl+K): Tìm kiếm lệnh, chuyển nhánh, mở công cụ tức thì.",

    // Visual Deep Dives
    tagConflictVisual: "⚔️ Trực Quan Hóa Xung Đột",
    titleConflictVisual: "Trình Giải Quyết Xung Đột 3 Khung Hình Chuẩn Monaco",
    descConflictVisual: "Không còn phải đoán mò giữa hàng đống dấu <<<<<<< HEAD trong terminal. FlowGit chia tách trực quan nhánh Hiện tại (Ours), nhánh Nhập vào (Theirs) và khung Kết quả cuối cùng với sự hỗ trợ của AI Auto-Merge.",
    itemConflict1: "✓ Chọn nhanh 1-Click \"Take All Ours\" hoặc \"Take All Theirs\"",
    itemConflict2: "✓ Highlight cú pháp chuyên nghiệp thừa hưởng từ VS Code (Monaco Editor)",
    itemConflict3: "✓ AI tự động đọc hiểu ngữ cảnh và hợp nhất code an toàn",

    tagSafeVisual: "🛡️ An Toàn Tuyệt Đối",
    titleSafeVisual: "Thùng Rác Safe Discard 48h & Time Machine (Ctrl+Z)",
    descSafeVisual: "Thao tác Git không còn là nỗi sợ mất code. Mọi tệp hoặc đoạn mã bạn bấm Discard đều được bí mật snapshot vào SQLite cục bộ trong 48 giờ. Bạn có thể xem trước diff và phục hồi tức thì.",
    itemSafe1: "✓ Lưu trữ SQLite tự dọn dẹp sau 48h mà không ngốn dung lượng ổ đĩa",
    itemSafe2: "✓ Hoàn tác Time Machine bằng phím tắt toàn năng Ctrl + Z",
    itemSafe3: "✓ Xem trước diff của từng snapshot trước khi bấm Phục Hồi",

    // Footer
    footerCopy: "© 2026 FlowGit. Phát hành theo giấy phép mã nguồn mở MIT."
  },
  en: {
    navFeatures: "Features",
    navComparison: "Comparison",
    navDocs: "Docs",
    navDownload: "Download",
    heroTag: "⚡ Next-Gen Visual Git Client 2026",
    heroTitlePrefix: "Experience Git",
    heroTitleHighlight: "Blazing Fast",
    heroTitleSuffix: "With Zero Fear",
    heroDesc: "Say goodbye to sluggish Electron apps that swallow a whole gigabyte of RAM. FlowGit combines native Rust performance with a 60 FPS canvas graph and a full Time Machine undo engine.",
    btnDownloadWindows: "Download FlowGit for Windows (.exe)",
    btnDownloadMac: "Download FlowGit for macOS (.dmg)",
    btnDownloadLinux: "Download FlowGit for Linux (.deb)",
    btnStarGithub: "Star on GitHub",
    otherPlatforms: "Other platforms:",
    freeOpenSource: "Free & Open Source",
    noTelemetry: "No Adware / Spyware",
    autoUpdate: "Background Auto-Updates",
    
    // Metrics
    metricRamVal: "< 85 MB",
    metricRamLabel: "Ultra-Low RAM Footprint",
    metricRamSub: "Compared to 800MB - 1.2GB in Electron",
    
    metricSpeedVal: "< 0.5s",
    metricSpeedLabel: "Instant Cold Startup",
    metricSpeedSub: "Engineered in native Rust & Tauri v2",
    
    metricFpsVal: "60 FPS",
    metricFpsLabel: "Silky Smooth Commit Graph",
    metricFpsSub: "OffscreenCanvas scales past 100k commits",
    
    metricSafeVal: "48 Hours",
    metricSafeLabel: "Safe Discard Protection",
    metricSafeSub: "Recover accidentally discarded code",

    // Section Titles
    featuresTitle: "Why Developers Love FlowGit",
    featuresDesc: "Engineered specifically to eliminate the most painful friction points in your daily Git workflow.",
    
    // 8 Features
    f1Title: "🛡️ Safe Discard 48h & Time Machine (Ctrl+Z)",
    f1Desc: "Never lose work again. Every discarded change is auto-snapshotted into an encrypted SQLite database for 48h. Undo destructive operations with a single Ctrl+Z.",
    
    f2Title: "📊 Living Commit Graph (60 FPS Locked)",
    f2Desc: "Hardware-accelerated OffscreenCanvas graph rendered in an isolated Web Worker. Parallel Rayon threading guarantees zero UI stutter even on kernel-sized trees.",
    
    f3Title: "🔀 Drag-and-Drop Rebase & Ghost Preview",
    f3Desc: "Reorder commits or select multiple to squash with key S. Ghost Preview simulates in-memory trees and warns you of conflicts before releasing your mouse.",
    
    f4Title: "⚔️ 4-Way Visual Conflict Resolver",
    f4Desc: "Crystal-clear side-by-side view of Ours, Base, Theirs, and live Result. One-click block picking powered by Monaco Editor's VS Code syntax engine.",
    
    f5Title: "🐙 GitHub Pull Request Workspace",
    f5Desc: "Inspect PRs, read Monaco diffs, review CI/CD Actions, checkout branches, and merge directly inside FlowGit without ever touching your browser.",
    
    f6Title: "🐞 Visual Git Bisect Wizard",
    f6Desc: "Automates binary search across your history with an intuitive visual guide to track down regression-inducing commits in 4-5 quick steps.",
    
    f7Title: "🧹 Sensitive History Nuker (.env Purge)",
    f7Desc: "Permanently erase committed secrets (.env, API keys, massive binary files) across your repository history with a few clicks.",
    
    f8Title: "🔄 Zero-VPS Auto-Updater",
    f8Desc: "Integrated Tauri v2 updater verified by cryptographic Ed25519 signatures, hosted seamlessly on GitHub Releases with zero server costs.",

    // Comparison
    compTitle: "In-Depth Comparison",
    compMetric: "Specification",
    compFlowGit: "⚡ FlowGit",
    compElectron: "Electron-based Clients",
    compLegacy: "Legacy GUIs (SourceTree)",
    
    // CTA
    ctaTitle: "Ready to Upgrade Your Git Workflow?",
    ctaDesc: "Download FlowGit free of charge or inspect the source code on GitHub.",
    ctaBtn: "Download Setup",
    ctaBtnWindows: "Download Windows Setup (.exe)",
    ctaBtnMac: "Download macOS Package (.dmg)",
    ctaBtnLinux: "Download Linux Package (.deb / .AppImage)",

    // Showcase Tabs & Captions
    tabLivingGraph: "Living Graph & Monaco Diff",
    tabSplitDiff: "Split Diff Editor",
    tabConflicts: "3-Way Conflict Resolver",
    tabSafeTrash: "Safe Discard (48h Trash)",
    tabTimeMachine: "Time Machine (Ctrl+Z)",
    tabPalette: "Command Palette (Ctrl+K)",
    windowLiveBadge: "● Real App Screenshot",
    captionHero: "✨ Living Commit Graph rendered via 60 FPS OffscreenCanvas paired with embedded Monaco Diff.",
    captionDiff: "⚡ Side-by-side Monaco Split Diff with full VS Code syntax highlighting and hunk staging.",
    captionConflicts: "⚔️ 3-Way Conflict Resolver with AI Auto-Merge, Take Ours / Theirs, and real-time output preview.",
    captionTrash: "🛡️ Safe Discard 48h Trash Inspector: 1-Click Restore for any accidentally discarded code.",
    captionTimeMachine: "⏪ Time Machine undo & redo engine: seamlessly reverse any destructive action via Ctrl+Z.",
    captionPalette: "⌘ Supercharged Command Palette (Ctrl+K): lightning-fast actions, branch jump & tools.",

    // Visual Deep Dives
    tagConflictVisual: "⚔️ Visual Conflict Resolution",
    titleConflictVisual: "Monaco-Grade 3-Way Conflict Resolver",
    descConflictVisual: "No more deciphering cryptic <<<<<<< HEAD markers in terminal. FlowGit clearly separates Ours, Incoming Theirs, and the Monaco Result buffer with AI Auto-Merge.",
    itemConflict1: "✓ One-click 'Take All Ours' or 'Take All Theirs'",
    itemConflict2: "✓ VS Code-level syntax highlighting & chunk hunk navigation",
    itemConflict3: "✓ AI auto-merge intelligently resolves complex semantic conflicts",

    tagSafeVisual: "🛡️ Bulletproof Safety",
    titleSafeVisual: "48-Hour Safe Discard Trash & Time Machine (Ctrl+Z)",
    descSafeVisual: "Git with zero fear. Every uncommitted discard is transparently snapshotted into local SQLite for 48 hours. Preview the full diff and restore anytime.",
    itemSafe1: "✓ Lightweight local SQLite storage with auto-cleanup after 48h",
    itemSafe2: "✓ Omnipresent Time Machine undo across dangerous Git operations via Ctrl+Z",
    itemSafe3: "✓ Real-time diff inspector before 1-Click Restore",
    
    // Footer
    footerCopy: "© 2026 FlowGit. Released under the MIT Open Source License."
  }
};

let currentLang = 'vi';
let activeShotKey = 'hero';

const showcaseShots = {
  hero: {
    src: 'assets/flowgit_hero.png',
    title: 'FlowGit — Living Commit Graph & Monaco Diff (main)',
    captionKey: 'captionHero',
  },
  diff: {
    src: 'assets/flowgit_diff_split.png',
    title: 'FlowGit — Side-by-Side Monaco Diff Viewer (feature/living-graph)',
    captionKey: 'captionDiff',
  },
  conflicts: {
    src: 'assets/flowgit_conflicts.png',
    title: 'FlowGit — 3-Way Visual Conflict Resolver (AI Auto-Merge)',
    captionKey: 'captionConflicts',
  },
  trash: {
    src: 'assets/flowgit_trash.png',
    title: 'FlowGit — Safe Discard 48h Trash Inspector (SQLite Snapshot)',
    captionKey: 'captionTrash',
  },
  timemachine: {
    src: 'assets/flowgit_timemachine.png',
    title: 'FlowGit — Time Machine Undo / Redo Engine (Ctrl + Z)',
    captionKey: 'captionTimeMachine',
  },
  palette: {
    src: 'assets/flowgit_palette.png',
    title: 'FlowGit — Command Palette & Quick Navigation (Ctrl + K)',
    captionKey: 'captionPalette',
  },
};

function updateShowcaseView(shotKey) {
  const shot = showcaseShots[shotKey];
  if (!shot) return;
  activeShotKey = shotKey;

  const img = document.getElementById('showcase-img');
  const titleEl = document.getElementById('window-title-text');
  const captionEl = document.getElementById('image-caption-text');

  // Update tabs active state
  document.querySelectorAll('.showcase-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.getAttribute('data-shot') === shotKey);
  });

  if (img) {
    img.classList.add('fading');
    setTimeout(() => {
      img.src = shot.src;
      img.alt = shot.title;
      img.onload = () => img.classList.remove('fading');
    }, 150);
  }

  if (titleEl) titleEl.textContent = shot.title;
  if (captionEl) {
    captionEl.setAttribute('data-i18n', shot.captionKey);
    const dict = translations[currentLang];
    if (dict && dict[shot.captionKey]) {
      captionEl.textContent = dict[shot.captionKey];
    }
  }
}

function detectOS() {
  const ua = (navigator.userAgent || '').toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();
  if (ua.includes('mac') || platform.includes('mac') || /iphone|ipad|ipod/.test(ua)) return 'mac';
  if (ua.includes('linux') || platform.includes('linux')) return 'linux';
  return 'windows';
}

function detectLanguage() {
  const saved = localStorage.getItem('flowgit_lang');
  if (saved === 'vi' || saved === 'en') return saved;
  const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  return browserLang.startsWith('vi') ? 'vi' : 'en';
}

let currentOS = detectOS();
const releaseAssets = {
  windows: null,
  mac: null,
  linux: null,
};
const defaultDownloadUrl = 'https://github.com/longgoll/flow-git/releases';

const osIcons = {
  windows: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.951-1.802"/></svg>`,
  mac: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2.02.6-2.66 1.34-.56.64-.99 1.68-.87 2.7.99.08 2-.44 2.61-1.19z"/></svg>`,
  linux: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.003 2c-2.73 0-4.664 2.17-4.664 5.372 0 1.267.318 2.668.79 3.73-.55.437-1.065 1.082-1.397 1.84-.442 1.012-.479 2.052-.232 2.875.228.761.714 1.347 1.332 1.701-.01.19-.015.385-.015.586 0 1.956.88 3.518 2.378 4.316-1.05.518-1.737 1.347-1.737 2.316 0 .428.145.83.407 1.17.394.512 1.066.862 1.916 1.004.815.137 1.82.164 2.945.074 1.125.09 2.13-.037 2.945-.174.85-.142 1.522-.492 1.916-1.004.262-.34.407-.742.407-1.17 0-.969-.687-1.798-1.737-2.316 1.498-.798 2.378-2.36 2.378-4.316 0-.201-.005-.396-.015-.586.618-.354 1.104-.94 1.332-1.701.247-.823.21-1.863-.232-2.875-.332-.758-.847-1.403-1.397-1.84.472-1.062.79-2.463.79-3.73C16.667 4.172 14.733 2 12.003 2z"/></svg>`,
};

function updateDownloadButtons(targetOS) {
  if (targetOS) currentOS = targetOS;
  const dict = translations[currentLang] || translations.vi;

  const mainBtn = document.getElementById('main-download-btn');
  const ctaBtn = document.getElementById('cta-download-btn');
  const mainIcon = document.getElementById('main-download-icon');
  const ctaIcon = document.getElementById('cta-download-icon');
  const mainText = document.getElementById('main-download-text');
  const ctaText = document.getElementById('cta-download-text');

  const heroTexts = {
    windows: dict.btnDownloadWindows,
    mac: dict.btnDownloadMac,
    linux: dict.btnDownloadLinux,
  };

  const ctaTexts = {
    windows: dict.ctaBtnWindows,
    mac: dict.ctaBtnMac,
    linux: dict.ctaBtnLinux,
  };

  if (mainIcon && osIcons[currentOS]) mainIcon.innerHTML = osIcons[currentOS];
  if (ctaIcon && osIcons[currentOS]) ctaIcon.innerHTML = osIcons[currentOS];

  if (mainText && heroTexts[currentOS]) mainText.textContent = heroTexts[currentOS];
  if (ctaText && ctaTexts[currentOS]) ctaText.textContent = ctaTexts[currentOS];

  const targetUrl = releaseAssets[currentOS] || defaultDownloadUrl;
  if (mainBtn) mainBtn.href = targetUrl;
  if (ctaBtn) ctaBtn.href = targetUrl;

  // Update OS selector badges
  document.querySelectorAll('.os-badge').forEach((badge) => {
    const os = badge.getAttribute('data-os-target');
    badge.classList.toggle('active', os === currentOS);
    if (releaseAssets[os]) {
      badge.href = releaseAssets[os];
    } else {
      badge.href = defaultDownloadUrl;
    }
  });
}

function setLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  const dict = translations[lang];
  if (!dict) return;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) {
    langBtn.textContent = lang === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English';
  }

  // Also refresh current showcase caption
  const shot = showcaseShots[activeShotKey];
  if (shot) {
    const captionEl = document.getElementById('image-caption-text');
    if (captionEl && dict[shot.captionKey]) {
      captionEl.textContent = dict[shot.captionKey];
    }
  }

  // Refresh download buttons text
  updateDownloadButtons();
}

function setupShowcaseTabs() {
  const tabs = document.querySelectorAll('.showcase-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const shotKey = tab.getAttribute('data-shot');
      if (shotKey) {
        updateShowcaseView(shotKey);
      }
    });
  });

  // Keyboard navigation between tabs with arrow keys
  const tablist = document.querySelector('.showcase-tabs');
  if (tablist) {
    const keys = Object.keys(showcaseShots);
    tablist.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        let idx = keys.indexOf(activeShotKey);
        if (e.key === 'ArrowRight') idx = (idx + 1) % keys.length;
        if (e.key === 'ArrowLeft') idx = (idx - 1 + keys.length) % keys.length;
        updateShowcaseView(keys[idx]);
      }
    });
  }
}

function setupOSBadges() {
  document.querySelectorAll('.os-badge').forEach((badge) => {
    badge.addEventListener('click', (e) => {
      const os = badge.getAttribute('data-os-target');
      if (os) {
        currentOS = os;
        updateDownloadButtons(os);
      }
    });
  });
}

async function fetchLatestRelease() {
  const repo = 'longgoll/flow-git';
  const versionTag = document.getElementById('version-tag');

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
    if (!res.ok) throw new Error('Release fetch status ' + res.status);
    const data = await res.json();

    if (data.tag_name && versionTag) {
      versionTag.textContent = data.tag_name;
    }

    if (data.assets && Array.isArray(data.assets)) {
      // Windows asset (.exe or .msi)
      const winAsset = data.assets.find(a => a.name.endsWith('.exe') || a.name.endsWith('.msi'));
      if (winAsset) releaseAssets.windows = winAsset.browser_download_url;

      // macOS asset (.dmg or .tar.gz)
      const macAsset = data.assets.find(a => a.name.endsWith('.dmg') || (a.name.endsWith('.tar.gz') && a.name.includes('darwin')));
      if (macAsset) releaseAssets.mac = macAsset.browser_download_url;

      // Linux asset (.deb or .AppImage)
      const linuxAsset = data.assets.find(a => a.name.endsWith('.deb') || a.name.endsWith('.AppImage'));
      if (linuxAsset) releaseAssets.linux = linuxAsset.browser_download_url;
    }

    updateDownloadButtons();
  } catch (e) {
    updateDownloadButtons();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Auto-detect or load saved language
  const initialLang = detectLanguage();
  setLanguage(initialLang);

  // Setup interactive real app showcase
  setupShowcaseTabs();

  // Setup OS selector badges click handler
  setupOSBadges();

  // Initial download button render for detected OS
  updateDownloadButtons(currentOS);

  // Toggle button listener with persistence
  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const nextLang = currentLang === 'vi' ? 'en' : 'vi';
      localStorage.setItem('flowgit_lang', nextLang);
      setLanguage(nextLang);
    });
  }

  // Fetch release download links
  fetchLatestRelease();
});
