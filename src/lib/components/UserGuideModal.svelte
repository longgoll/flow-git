<script lang="ts">
  import {
    BookOpen,
    Search,
    X,
    GitFork,
    RotateCcw,
    Trash2,
    Briefcase,
    Layers,
    Bug,
    CheckCircle2,
    AlertTriangle,
    ShieldCheck,
    Split,
    Keyboard,
    Lightbulb,
    Play,
    Rewind
  } from 'lucide-svelte';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen = false, onClose }: Props = $props();

  let searchQuery = $state<string>('');
  let activeTab = $state<'recipes' | 'features' | 'shortcuts'>('recipes');
  let selectedItemId = $state<string>('rebase-behind-main');

  interface GuideItem {
    id: string;
    category: 'recipes' | 'features';
    title: string;
    subtitle: string;
    badge?: string;
    icon: any;
    problem: string;
    solution: string;
    steps: { title: string; desc: string; tip?: string }[];
    proTips?: string[];
  }

  const guideItems: GuideItem[] = [
    {
      id: 'rebase-behind-main',
      category: 'recipes',
      title: 'Đồng nghiệp merge trước, nhánh tôi bị tụt hậu (Behind main)',
      subtitle: 'Quy trình cập nhật nhánh an toàn với Rebase & 3-Way Resolver',
      badge: 'Phổ biến nhất trong Team',
      icon: GitFork,
      problem:
        'Bạn và đồng nghiệp cùng rẽ nhánh từ main. Đồng nghiệp xong trước và đã merge vào main. Nhánh của bạn bị tụt hậu (Behind) và thiếu các commit mới nhất. Nếu push hoặc merge trực tiếp có thể gây xung đột lịch sử.',
      solution:
        'Rebase các commit của bạn lên trên đỉnh của main mới nhất. FlowGit tự động chạy Dry-Run in-memory để báo trước conflict, và cung cấp bộ giải quyết 3-Way trực quan.',
      steps: [
        {
          title: 'Bước 1: Nhận biết độ lệch',
          desc: 'Trong chế độ Focus View hoặc trên Sidebar, xem thông số Ahead/Behind. Ví dụ "3 Ahead, 5 Behind" nghĩa là bạn đang thiếu 5 commit từ main.',
        },
        {
          title: 'Bước 2: Kích hoạt Rebase (Chọn 1 trong 3 cách)',
          desc: '• Cách 1: Kéo commit nhánh bạn thả đè lên commit mới nhất của main trên Graph ➔ Bấm "Rebase onto Target".\n• Cách 2: Chuột phải vào nhánh main ở Sidebar ➔ Chọn "Rebase HEAD onto main".\n• Cách 3: Trong Focus View ➔ Bấm "1-Click Rebase on Base".',
          tip: 'FlowGit chạy mô phỏng in-memory trước. Nếu sạch (clean) thì xong ngay lập tức!',
        },
        {
          title: 'Bước 3: Xử lý nếu dính Conflict (3-Way Resolver)',
          desc: 'Nếu có file xung đột, app tự động mở giao diện 4 khung hình: Base (gốc), Ours (code của bạn), Theirs (code bạn đồng nghiệp) và Result.\nBấm "Accept Ours" hoặc "Accept Theirs" ➔ Bấm "Mark Resolved & Stage".',
        },
        {
          title: 'Bước 4: Hoàn tất với Continue Rebase',
          desc: 'Sau khi giải quyết xong tất cả file conflict, bấm nút màu tím "Continue Rebase" để chuyển sang commit tiếp theo hoặc hoàn tất.',
          tip: 'Nếu thấy rối hoặc không muốn rebase nữa, chỉ cần bấm "Abort Merge / Rebase" hoặc nhấn Ctrl + Z để quay lại nguyên trạng ban đầu an toàn 100%!',
        },
      ],
      proTips: [
        'Mọi thao tác Rebase đều được tự động lưu vào SQLite Action Log phục vụ hoàn tác Ctrl + Z.',
        'Trước khi Rebase, hãy đảm bảo bạn đã commit hoặc stash hết các thay đổi dở dang trong Working Tree.',
      ],
    },
    {
      id: 'undo-time-machine',
      category: 'recipes',
      title: 'Cứu nguy khi lỡ tay làm sai hoặc vỡ git (Undo Ctrl + Z)',
      subtitle: 'Hoàn tác tức thì mọi thao tác nguy hiểm như Reset Hard, Rebase nhầm, Xóa nhánh',
      badge: 'Bảo hiểm No-Fear',
      icon: RotateCcw,
      problem:
        'Trong Terminal, nếu lỡ tay chạy git reset --hard nhầm commit hoặc xóa nhầm nhánh, lập trình viên thường hoảng loạn lục tìm git reflog rất khó khăn và tốn thời gian.',
      solution:
        'Safe-Flight Time Machine tự động lưu nhật ký mọi hành động (action log) kèm con trỏ OID trước và sau. Chỉ cần 1 phím bấm Ctrl + Z là lịch sử nhánh quay về đúng vị trí cũ.',
      steps: [
        {
          title: 'Cách 1: Nhấn tổ hợp phím Ctrl + Z (hoặc Cmd + Z trên macOS)',
          desc: 'Bấm Ctrl + Z bất kỳ lúc nào để hoàn tác hành động vừa thực hiện (Commit, Reset, Rebase, Cherry-pick, v.v.).',
        },
        {
          title: 'Cách 2: Mở Cỗ máy thời gian (Time Machine Drawer)',
          desc: 'Bấm icon chiếc đồng hồ quay ngược trên thanh trạng thái hoặc Toolbar để mở danh sách toàn bộ lịch sử thao tác.\nBấm "Time Travel" vào bất kỳ thời điểm nào trong quá khứ để đưa HEAD về đó.',
        },
      ],
      proTips: [
        'Nhấn Ctrl + Shift + Z để Redo (làm lại hành động vừa hoàn tác).',
        'App gắn huy hiệu màu: Xanh lá (an toàn), Vàng (thay đổi lịch sử), Đỏ (nguy hiểm) cho từng action.',
      ],
    },
    {
      id: 'safe-discard-trash',
      category: 'recipes',
      title: 'Khôi phục file chưa commit lỡ tay bấm xóa (Safe Discard 48h)',
      subtitle: 'Thùng rác thông minh lưu trữ nội dung file bị discard trong 48 giờ',
      badge: 'Chống mất code',
      icon: Trash2,
      problem:
        'Thao tác "Discard changes" trong Git mặc định sẽ xóa vĩnh viễn nội dung chưa commit và không thể phục hồi lại bằng reflog.',
      solution:
        'Safe Discard Engine: Trước khi xóa bất kỳ file nào, FlowGit tự động tạo một snapshot nội dung file vào cơ sở dữ liệu SQLite cục bộ và lưu giữ trong 48 giờ.',
      steps: [
        {
          title: 'Bước 1: Mở Thùng rác (Trash Inspector)',
          desc: 'Bấm vào huy hiệu "Trash (48h)" ở thanh trạng thái dưới cùng (hoặc trong Working Tree toolbar).',
        },
        {
          title: 'Bước 2: Tìm file đã xóa',
          desc: 'Duyệt danh sách các snapshot theo thời gian (ví dụ: "src/App.svelte - 10 phút trước"). Bấm vào file để xem lại diff nội dung đã bị xóa.',
        },
        {
          title: 'Bước 3: Khôi phục lại',
          desc: 'Bấm nút "Restore" màu xanh lá, file sẽ được ghi lại vào thư mục làm việc nguyên vẹn 100%.',
        },
      ],
      proTips: [
        'Các snapshot quá 48 giờ sẽ tự động được dọn dẹp để tiết kiệm dung lượng đĩa.',
        'Bạn có thể bấm "Delete permanently" nếu muốn xóa vĩnh viễn dữ liệu nhạy cảm.',
      ],
    },
    {
      id: 'worktrees-parallel',
      category: 'recipes',
      title: 'Làm nhiều task / hotfix song song không cần switch nhánh (Git Worktrees)',
      subtitle: 'Tạo thư mục làm việc độc lập cho từng nhánh để code song song',
      badge: 'Năng suất x2',
      icon: Briefcase,
      problem:
        'Đang làm dở tính năng lớn mà sếp yêu cầu sửa gấp hotfix trên main: Nếu chuyển nhánh sẽ phải stash, build lại node_modules rất lâu và dễ lỗi môi trường.',
      solution:
        'Git Worktree cho phép checkout nhiều nhánh ra các thư mục khác nhau trên cùng một Git repository, dùng chung toàn bộ object database mà không tốn dung lượng.',
      steps: [
        {
          title: 'Bước 1: Mở Worktree Manager',
          desc: 'Bấm vào biểu tượng cặp tài liệu "Worktrees" trên thanh Sidebar hoặc Toolbar.',
        },
        {
          title: 'Bước 2: Tạo Worktree mới',
          desc: 'Nhập tên thư mục (ví dụ: `hotfix-login`), chọn nhánh mục tiêu hoặc tạo nhánh mới, rồi chọn đường dẫn thư mục.',
        },
        {
          title: 'Bước 3: Mở VS Code độc lập',
          desc: 'Mỗi worktree là một folder riêng biệt. Bạn có thể mở 2 cửa sổ VS Code làm việc song song cùng lúc mà không sợ đụng độ file hay node_modules.',
        },
      ],
      proTips: [
        'Khi fix xong hotfix, bạn chỉ cần xóa worktree đó đi, mã nguồn và commit đã được lưu trong repo chính.',
      ],
    },
    {
      id: 'stacked-commits',
      category: 'recipes',
      title: 'Sắp xếp, tách nhỏ và dọn dẹp các commit trước khi push (Stacked Commits)',
      subtitle: 'Kéo thả đổi thứ tự các commit theo phong cách Graphite / Sapling',
      badge: 'Chuẩn Clean Git',
      icon: Layers,
      problem:
        'Bạn có 4-5 commit cục bộ chưa push: commit fix bug nằm lẫn giữa các commit tính năng, bạn muốn đổi thứ tự hoặc gộp lại trước khi tạo Pull Request.',
      solution:
        'Giao diện Stacked Commits Flow cho phép bạn kéo thả các thẻ commit lên xuống trực quan như Kanban, sau đó bấm "Apply Reorder" để Git tự động tái cấu trúc.',
      steps: [
        {
          title: 'Bước 1: Chuyển sang chế độ Stacked Flow',
          desc: 'Bấm vào nút "Stacked" trên thanh công cụ Toolbar (hoặc phím tắt).',
        },
        {
          title: 'Bước 2: Kéo thả các thẻ commit',
          desc: 'Dùng chuột kéo commit lên hoặc xuống để thay đổi thứ tự thực thi.',
        },
        {
          title: 'Bước 3: Bấm Apply Reorder',
          desc: 'FlowGit sẽ tự động rebase và áp dụng lại commit theo đúng thứ tự mới trong nháy mắt.',
        },
      ],
      proTips: [
        'Tính năng này chỉ áp dụng cho các commit CỤC BỘ (chưa push lên remote) để đảm bảo không vi phạm an toàn Git.',
      ],
    },
    {
      id: 'visual-bisect',
      category: 'recipes',
      title: 'Truy tìm commit đầu tiên gây lỗi trên production (Visual Bisect Wizard)',
      subtitle: 'Thuật toán tìm kiếm nhị phân commit lỗi với 3-4 cú click chuột',
      badge: 'Dập Bug Thần Tốc',
      icon: Bug,
      problem:
        'Ứng dụng bị bug nhưng không biết commit nào trong số 50 commit tuần qua đã làm hỏng tính năng.',
      solution:
        'Visual Bisect Wizard tự động chọn commit ở giữa để bạn test. Bạn chỉ cần bấm "Chạy tốt (Pass)" hoặc "Bị lỗi (Fail)", app sẽ thu hẹp phạm vi và chỉ ra đúng commit thủ phạm.',
      steps: [
        {
          title: 'Bước 1: Mở Bisect Wizard',
          desc: 'Bấm icon con bọ "Bisect" trên thanh công cụ Toolbar.',
        },
        {
          title: 'Bước 2: Đánh dấu điểm mốc',
          desc: 'Chọn commit hiện tại là "Bad 🐞" và chọn 1 commit trong quá khứ lúc app còn chạy tốt là "Good ✅".',
        },
        {
          title: 'Bước 3: Test và bấm Pass / Fail',
          desc: 'App tự checkout tới commit nghi vấn: Chạy thử code của bạn, nếu tốt thì bấm "Pass", nếu lỗi bấm "Fail".',
        },
        {
          title: 'Bước 4: Xem báo cáo commit lỗi',
          desc: 'Chỉ sau khoảng 3-4 lần kiểm tra, app sẽ hiển thị chính xác commit và lập trình viên nào đã gây ra lỗi.',
        },
      ],
    },
    {
      id: 'living-graph',
      category: 'features',
      title: 'Living Commit Graph & OffscreenCanvas',
      subtitle: 'Đồ thị đường cong Bezier siêu mượt 60 FPS, xử lý > 50,000 commit',
      icon: Layers,
      problem: 'Đồ thị Git trong các tool Electron truyền thống rất nặng và giật lag khi repo lớn.',
      solution: 'FlowGit sử dụng Web Worker chuyên biệt và HTML5 OffscreenCanvas để vẽ đường cong Bezier spline đa luồng, cách ly hoàn toàn khỏi giao diện người dùng.',
      steps: [
        {
          title: 'Kéo thả tương tác (Drag & Drop)',
          desc: 'Bạn có thể gắp bất kỳ node commit nào kéo thả vào commit khác để mở menu hành động (Cherry-pick, Merge, Rebase).',
        },
        {
          title: 'Phân luồng nhánh (Lanes Allocation)',
          desc: 'Các nhánh được tự động gán làn sóng màu riêng biệt, các nút rẽ nhánh và hợp nhất được bo góc tròn thẩm mỹ cao.',
        },
      ],
    },
    {
      id: 'revert-pushed-commit',
      category: 'recipes',
      title: 'Lỡ push commit lỗi lên remote chung (Revert Commit)',
      subtitle: 'Hoàn tác an toàn khi commit đã lên remote mà không làm vỡ lịch sử của team',
      badge: 'Chuẩn Teamwork',
      icon: RotateCcw,
      problem:
        'Bạn vừa push commit lên main/develop và phát hiện lỗi nghiêm trọng. Nếu dùng Reset Hard hay Rebase sẽ ghi đè lịch sử gây xung đột nghiêm trọng cho tất cả đồng nghiệp kéo code về.',
      solution:
        'Quy chuẩn vàng trong Git là Revert: Hệ thống tạo ra một commit mới hoàn toàn, có nội dung đảo ngược lại 100% thay đổi của commit lỗi mà vẫn giữ nguyên lịch sử cũ minh bạch.',
      steps: [
        {
          title: 'Bước 1: Chuột phải vào commit bị lỗi trên đồ thị',
          desc: 'Tìm commit bạn vừa tạo trên Living Commit Graph ➔ Click chuột phải để mở menu ngữ cảnh.',
        },
        {
          title: 'Bước 2: Chọn "Revert commit này (git revert)"',
          desc: 'FlowGit sẽ tự động tính toán diff đảo ngược và tạo một commit mới dạng "Revert: [tên commit cũ]" trên đỉnh nhánh.',
          tip: 'Commit đảo ngược này có thể push lên remote bình thường mà không cần dùng cờ --force nguy hiểm!',
        },
      ],
      proTips: [
        'Mọi thao tác Revert đều có thể Undo lại bằng Ctrl + Z nếu bạn đổi ý.',
      ],
    },
    {
      id: 'squash-multiple-commits',
      category: 'recipes',
      title: 'Gộp nhiều commit nhỏ lẻ thành 1 trước khi tạo PR (Squash Commits)',
      subtitle: 'Làm sạch lịch sử commit với phím tắt S hoặc nút bấm trực quan',
      badge: 'Clean History',
      icon: Layers,
      problem:
        'Trong quá trình code tính năng, bạn commit 5-6 lần với message lộn xộn (wip, fix typo, test). Tech Lead yêu cầu phải gom lại thành 1 commit duy nhất trước khi merge.',
      solution:
        'FlowGit cho phép bạn bôi đen nhiều commit bằng Shift+Click hoặc Ctrl+Click ➔ Nhấn phím S ➔ Hộp thoại tổng hợp toàn bộ message cho phép bạn biên tập lại commit duy nhất.',
      steps: [
        {
          title: 'Bước 1: Chọn các commit cần gộp',
          desc: 'Giữ phím Shift hoặc Ctrl và click chuột vào các commit liên tiếp mà bạn muốn gộp trên đồ thị.',
        },
        {
          title: 'Bước 2: Bấm Squash (Phím S)',
          desc: 'Bấm nút "Squash Commits" trên thanh nổi dưới đáy màn hình hoặc nhấn trực tiếp phím S trên bàn phím.',
        },
        {
          title: 'Bước 3: Biên tập message và xác nhận',
          desc: 'Chỉnh sửa lại nội dung commit message theo chuẩn Conventional Commits ➔ Bấm "Xác nhận gộp".',
        },
      ],
      proTips: [
        'Tính năng này được bảo vệ bởi Time Machine: bấm Ctrl + Z sẽ tách ngược lại thành các commit cũ ngay lập tức.',
      ],
    },
    {
      id: 'reset-head-modes',
      category: 'recipes',
      title: 'Reset HEAD về quá khứ an toàn (Soft / Mixed / Hard Reset)',
      subtitle: 'Linh hoạt giữa giữ staged, giữ unstaged hoặc xóa sạch được bảo vệ bởi Ctrl+Z',
      badge: 'Quyền năng tối thượng',
      icon: Rewind,
      problem:
        'Bạn muốn đưa HEAD về một commit trước đó: có lúc muốn giữ nguyên code đang sửa ở Staged, có lúc muốn bỏ sạch để làm lại từ đầu.',
      solution:
        'Menu chuột phải trên Commit cung cấp 3 chế độ rõ ràng:\n• Soft: Đưa HEAD về commit cũ, giữ nguyên toàn bộ thay đổi ở Staged.\n• Mixed: Đưa HEAD về commit cũ, đưa thay đổi về Unstaged (Working Tree).\n• Hard: Đưa HEAD về commit cũ và xóa bỏ code dở dang (được Time Machine lưu lại).',
      steps: [
        {
          title: 'Bước 1: Chuột phải vào commit muốn quay về',
          desc: 'Click chuột phải vào commit mốc trên đồ thị ➔ Rê chuột vào mục "Reset HEAD về commit này".',
        },
        {
          title: 'Bước 2: Chọn chế độ phù hợp',
          desc: 'Chọn "Soft Reset", "Mixed Reset" hoặc "Hard Reset".',
          tip: 'Nếu lỡ tay chọn nhầm Hard Reset, chỉ cần nhấn Ctrl + Z để quay lại vị trí cũ trong 0.1 giây!',
        },
      ],
    },
    {
      id: 'clean-merged-branches',
      category: 'recipes',
      title: 'Dọn dẹp sạch sẽ các nhánh đã merge vào main (Branch Hygiene)',
      subtitle: 'Xóa hàng loạt các nhánh rác cũ chỉ với 1 click',
      badge: 'Dọn dẹp Repo',
      icon: Trash2,
      problem:
        'Sau nhiều tháng phát triển, danh sách Local Branches tích tụ hàng chục nhánh tính năng cũ đã merge vào main, gây rối rắm và khó tìm kiếm.',
      solution:
        'Nút "Clean Merged Branches" trên Sidebar tự động quét toàn bộ nhánh local, phát hiện những nhánh nào đã gộp hoàn toàn vào main và cho phép bạn chọn xóa hàng loạt an toàn.',
      steps: [
        {
          title: 'Bước 1: Bấm biểu tượng thùng rác ở mục Local Branches',
          desc: 'Rê chuột vào tiêu đề "Local Branches" trên thanh Sidebar ➔ Bấm vào icon Thùng rác.',
        },
        {
          title: 'Bước 2: Xem danh sách nhánh rác và bấm Xóa',
          desc: 'App hiển thị danh sách các nhánh an toàn có thể xóa. Bấm nút "Xóa nhánh đã chọn" để làm sạch toàn bộ kho lưu trữ.',
        },
      ],
    },
    {
      id: 'diff-staging',
      category: 'features',
      title: 'Interactive Diff Viewer & Hunk Staging',
      subtitle: 'Stage từng dòng, từng khối code thay đổi một cách chuẩn xác',
      icon: Split,
      problem: 'Bạn sửa nhiều thứ trong 1 file nhưng chỉ muốn commit một phần thay đổi liên quan.',
      solution: 'Interactive Diff Viewer cho phép bạn chọn từng khối (Hunk) hoặc từng dòng code để Stage vào commit, phần còn lại giữ nguyên ở Working Tree.',
      steps: [
        {
          title: 'Stage Hunk',
          desc: 'Rê chuột vào góc trên của từng khối code thay đổi ➔ Bấm "Stage Hunk".',
        },
        {
          title: 'Discard Hunk an toàn',
          desc: 'Bấm "Discard Hunk" để loại bỏ thay đổi của khối đó (vẫn được lưu vào Thùng rác 48h).',
        },
      ],
    },
  ];

  const shortcuts = [
    { key: 'Ctrl + K', desc: 'Mở Command Palette tìm kiếm lệnh nhanh' },
    { key: 'Ctrl + Z', desc: 'Undo - Hoàn tác hành động Git vừa thực hiện (Time Machine)' },
    { key: 'Ctrl + Shift + Z', desc: 'Redo - Làm lại hành động vừa hoàn tác' },
    { key: 'F1 / Ctrl + /', desc: 'Mở Sổ tay Hướng dẫn & Kịch bản thực chiến (Playbook)' },
    { key: 'Space', desc: 'Xem nhanh Diff của file hoặc commit đang chọn' },
    { key: 'S', desc: 'Squash - Gộp các commit đang chọn thành 1 commit duy nhất' },
    { key: 'Right Click', desc: 'Mở Context Menu trên commit (Revert, Reset, Tag, Branch, SHA)' },
    { key: 'C', desc: 'Checkout nhanh sang nhánh đang chọn' },
    { key: 'Escape', desc: 'Đóng modal / popup hiện tại' },
  ];

  // Filtering
  let filteredItems = $derived.by(() => {
    let list = guideItems.filter((item) => item.category === activeTab);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.problem.toLowerCase().includes(q) ||
        item.solution.toLowerCase().includes(q)
    );
  });

  let selectedItem = $derived.by(() => {
    return guideItems.find((i) => i.id === selectedItemId) || filteredItems[0] || guideItems[0];
  });

  function selectTab(tab: 'recipes' | 'features' | 'shortcuts') {
    activeTab = tab;
    if (tab === 'recipes') selectedItemId = 'rebase-behind-main';
    if (tab === 'features') selectedItemId = 'living-graph';
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-150 select-none"
    role="dialog"
    aria-modal="true"
  >
    <!-- Modal Container -->
    <div
      class="w-full max-w-5xl h-[85vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-200 font-sans"
    >
      <!-- Top Header -->
      <header class="h-14 px-6 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <BookOpen class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              FlowGit Playbook & Real-World Recipes
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 font-mono font-semibold">
                Sổ tay Thực chiến
              </span>
            </h2>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              Hướng dẫn xử lý các tình huống làm việc nhóm và khai thác toàn bộ sức mạnh của FlowGit
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Search Bar -->
          <div class="relative w-64">
            <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Tìm kiếm kịch bản, từ khóa..."
              class="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors select-text"
            />
          </div>

          <button
            onclick={onClose}
            class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            title="Đóng (Esc)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </header>

      <!-- Category Tabs -->
      <div class="px-6 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center gap-2 shrink-0">
        <button
          onclick={() => selectTab('recipes')}
          class="px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'recipes' ? 'border-cyan-600 dark:border-cyan-400 text-cyan-800 dark:text-cyan-300 font-bold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <Lightbulb class="w-3.5 h-3.5" />
          <span>🎯 Kịch bản Thực chiến (Team Recipes)</span>
        </button>

        <button
          onclick={() => selectTab('features')}
          class="px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'features' ? 'border-cyan-600 dark:border-cyan-400 text-cyan-800 dark:text-cyan-300 font-bold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <Briefcase class="w-3.5 h-3.5" />
          <span>🛠️ Chi tiết Công cụ (Features)</span>
        </button>

        <button
          onclick={() => selectTab('shortcuts')}
          class="px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'shortcuts' ? 'border-cyan-600 dark:border-cyan-400 text-cyan-800 dark:text-cyan-300 font-bold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <Keyboard class="w-3.5 h-3.5" />
          <span>⌨️ Bảng Phím tắt Nhanh</span>
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 flex overflow-hidden">
        {#if activeTab === 'shortcuts'}
          <!-- Shortcuts Full View -->
          <div class="flex-1 p-6 overflow-y-auto space-y-6">
            <div>
              <h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">Bảng phím tắt toàn hệ thống</h3>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">Tăng tốc độ thao tác Git tối đa mà không cần rời tay khỏi bàn phím.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              {#each shortcuts as sc}
                <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
                  <span class="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{sc.desc}</span>
                  <kbd class="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-cyan-800 dark:text-cyan-300 font-mono text-xs font-bold shadow-xs">
                    {sc.key}
                  </kbd>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <!-- Left List (Items) -->
          <aside class="w-80 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/60 flex flex-col shrink-0 overflow-y-auto p-3 space-y-1.5">
            {#each filteredItems as item}
              {@const Icon = item.icon}
              <button
                onclick={() => (selectedItemId = item.id)}
                class="w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 {selectedItemId === item.id ? 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-600/50 shadow-sm' : 'bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/60 hover:bg-zinc-100/80 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'}"
              >
                <div class="p-2 rounded-lg {selectedItemId === item.id ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'} shrink-0 mt-0.5">
                  <Icon class="w-4 h-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1 mb-0.5">
                    <span class="text-xs font-bold truncate {selectedItemId === item.id ? 'text-cyan-900 dark:text-cyan-200' : 'text-zinc-800 dark:text-zinc-200'}">
                      {item.title}
                    </span>
                  </div>
                  <p class="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {item.subtitle}
                  </p>
                  {#if item.badge}
                    <span class="inline-block mt-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 font-semibold">
                      {item.badge}
                    </span>
                  {/if}
                </div>
              </button>
            {/each}
          </aside>

          <!-- Right Detail Panel -->
          <main class="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-white dark:bg-zinc-950">
            {#if selectedItem}
              {@const MainIcon = selectedItem.icon}
              <!-- Header of Selected Item -->
              <div class="space-y-2 border-b border-zinc-200 dark:border-zinc-800 pb-5">
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
                    {selectedItem.category === 'recipes' ? 'KỊCH BẢN THỰC CHIẾN' : 'TÍNH NĂNG CÔNG CỤ'}
                  </span>
                  {#if selectedItem.badge}
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                      {selectedItem.badge}
                    </span>
                  {/if}
                </div>

                <h1 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                  <MainIcon class="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>{selectedItem.title}</span>
                </h1>
                <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {selectedItem.subtitle}
                </p>
              </div>

              <!-- Problem & Solution Callouts -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1.5">
                  <div class="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                    <AlertTriangle class="w-4 h-4" />
                    <span>Vấn đề thực tế (Pain point)</span>
                  </div>
                  <p class="text-xs text-rose-900 dark:text-rose-200/90 leading-relaxed">
                    {selectedItem.problem}
                  </p>
                </div>

                <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-1.5">
                  <div class="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 class="w-4 h-4" />
                    <span>Giải pháp từ FlowGit</span>
                  </div>
                  <p class="text-xs text-emerald-900 dark:text-emerald-200/90 leading-relaxed">
                    {selectedItem.solution}
                  </p>
                </div>
              </div>

              <!-- Step by Step Guide -->
              <div class="space-y-3 pt-2">
                <h3 class="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Play class="w-4 h-4 text-cyan-600 dark:text-cyan-400 fill-current" />
                  <span>Các bước thực hiện trên ứng dụng</span>
                </h3>

                <div class="space-y-3">
                  {#each selectedItem.steps as step, idx}
                    <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 space-y-2">
                      <div class="flex items-center gap-2.5">
                        <span class="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 class="text-xs font-bold text-zinc-900 dark:text-zinc-100">{step.title}</h4>
                      </div>
                      <p class="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed pl-7.5">
                        {step.desc}
                      </p>
                      {#if step.tip}
                        <div class="ml-7.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
                          <Lightbulb class="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                          <span>{step.tip}</span>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Pro Tips -->
              {#if selectedItem.proTips && selectedItem.proTips.length > 0}
                <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div class="flex items-center gap-2 text-xs font-bold text-cyan-800 dark:text-cyan-300">
                    <ShieldCheck class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Mẹo an toàn (No-Fear Git Tips)</span>
                  </div>
                  <ul class="space-y-1.5 pl-6 list-disc text-xs text-zinc-700 dark:text-zinc-300">
                    {#each selectedItem.proTips as tip}
                      <li>{tip}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
            {/if}
          </main>
        {/if}
      </div>
    </div>
  </div>
{/if}
