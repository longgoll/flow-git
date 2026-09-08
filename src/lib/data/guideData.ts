import type { ComponentType } from 'svelte';
import {
  GitFork,
  GitMerge,
  Flame,
  FileEdit,
  AlertTriangle,
  CloudDownload,
  ShieldAlert,
  RotateCcw,
  Trash2,
  Briefcase,
  Layers,
  Bug,
  Split,
  CheckCircle2,
  ShieldCheck,
  Rewind,
} from 'lucide-svelte';

export interface GuideStep {
  title: string;
  desc: string;
  tip?: string;
}

export interface GuideItem {
  id: string;
  category: 'recipes' | 'features';
  title: string;
  subtitle: string;
  badge?: string;
  icon: ComponentType;
  problem: string;
  solution: string;
  steps: GuideStep[];
  proTips?: string[];
}

export interface ShortcutItem {
  key: string;
  desc: string;
}

export const guideItems: GuideItem[] = [
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
    id: 'undo-merge-rebase-force',
    category: 'recipes',
    title: 'Lỡ Merge rối nhánh, muốn quay lại Rebase duỗi thẳng & Force Push',
    subtitle: 'Quy trình 3 bước 100% bằng chuột: Reset Hard, Kéo-Thả Rebase và Force Push',
    badge: 'Kinh điển Thực chiến',
    icon: GitMerge,
    problem:
      'Bạn lỡ merge nhánh tính năng vào main (ở terminal hoặc app), đồ thị bị đan chéo rối rắm. Bạn muốn hủy merge để duỗi thẳng lịch sử bằng Rebase và đồng bộ lên remote.',
    solution:
      'Thực hiện 3 thao tác chuột trực quan: Chuột phải commit trước merge chọn Reset Hard ➔ Kéo thả nhánh Rebase onto main ➔ Bấm nút màu cam Force Push (--force-with-lease) ở Sidebar.',
    steps: [
      {
        title: 'Bước 1: Hủy commit Merge (Reset Hard)',
        desc: 'Nhấp chuột phải vào commit của main ngay trước lần merge trên đồ thị Canvas ➔ Chọn "Reset current branch to here" ➔ Chọn "Hard". Commit merge biến mất lập tức.',
        tip: 'Không lo mất code: FlowGit tự lưu snapshot vào Thùng rác SQLite 48h.',
      },
      {
        title: 'Bước 2: Rebase duỗi thẳng đồ thị',
        desc: 'Checkout sang nhánh dev ➔ Nhấp giữ chuột kéo nhánh dev thả đè lên đỉnh của main trên Canvas ➔ Chọn "Rebase dev onto main". Các commit được xếp nối tiếp thẳng hàng.',
      },
      {
        title: 'Bước 3: Force Push an toàn bằng chuột (Không gõ lệnh)',
        desc: 'Tại cột Sidebar bên trái (mục Local Branches), rê chuột vào nhánh vừa rebase ➔ Bấm menu 3 chấm (hoặc chuột phải) ➔ Bấm nút màu cam "Force Push (--force-with-lease)".',
        tip: 'Cờ --force-with-lease tự động bảo vệ: nếu remote bất ngờ có commit mới của người khác, app sẽ tự chặn lại không ghi đè mất code.',
      },
    ],
    proTips: [
      'Nếu nhánh dev có nhiều commit vụn vặt, bạn có thể bấm S để Squash hoặc chọn Interactive Rebase trước khi đưa vào main.',
    ],
  },
  {
    id: 'wrong-branch-main-commit',
    category: 'recipes',
    title: 'Lỡ commit nhầm vào nhánh main thay vì tạo nhánh mới',
    subtitle: 'Di chuyển commit sang nhánh mới và trả lại main sạch sẽ chỉ sau 2 click',
    badge: 'Hay gặp nhất',
    icon: Flame,
    problem:
      'Bạn đang code tính năng mới nhưng quên tạo nhánh, đã lỡ bấm commit 2-3 commit thẳng vào nhánh main local (chưa push).',
    solution:
      'Tạo nhánh mới ngay tại commit đỉnh hiện tại, sau đó Reset Hard nhánh main về vị trí trước khi bạn commit nhầm.',
    steps: [
      {
        title: 'Bước 1: Gắn commit vào nhánh mới',
        desc: 'Nhấp chuột phải vào commit đỉnh hiện tại trên Canvas ➔ Chọn "Create Branch Here" ➔ Đặt tên là feature/my-task. Toàn bộ commit tính năng đã nằm an toàn trên nhánh mới.',
      },
      {
        title: 'Bước 2: Đưa main về vị trí sạch',
        desc: 'Nhấp chuột phải vào commit cũ của main (trước khi commit nhầm) ➔ Chọn "Reset Current Branch (main) to Here" ➔ Chọn chế độ Hard.',
        tip: 'Nhánh main lập tức sạch sẽ trở lại, trong khi nhánh feature/my-task vẫn giữ trọn vẹn mọi thay đổi.',
      },
    ],
  },
  {
    id: 'cherry-pick-drag-drop',
    category: 'recipes',
    title: 'Gắp riêng commit fix bug từ nhánh đồng nghiệp về nhánh mình (Cherry-pick)',
    subtitle: 'Kéo thả nốt commit trực tiếp trên Living Graph sang nhánh hiện tại trong 1 giây',
    badge: 'Kéo - Thả 1s',
    icon: GitFork,
    problem:
      'Đồng nghiệp có 1 commit fix bug cực hay trên nhánh của họ, bạn muốn lấy riêng đúng commit đó về nhánh mình mà không muốn merge cả nhánh của họ.',
    solution:
      'Living Commit Graph hỗ trợ Drag & Drop node commit: chỉ cần gắp nốt commit của đồng nghiệp thả vào nhánh hiện tại và chọn Cherry-pick.',
    steps: [
      {
        title: 'Bước 1: Định vị commit trên Canvas',
        desc: 'Đảm bảo bạn đang đứng ở nhánh của mình. Tìm nốt commit cần lấy của đồng nghiệp trên đồ thị Living Commit Graph.',
      },
      {
        title: 'Bước 2: Kéo và thả đè (Drag & Drop)',
        desc: 'Nhấp giữ chuột vào commit đó, kéo và thả đè vào nốt commit đỉnh của nhánh bạn đang đứng.',
      },
      {
        title: 'Bước 3: Chọn Cherry-pick commit',
        desc: 'Menu thả hành động hiện ra ➔ Bấm nút "Cherry-pick commit". Toàn bộ nội dung và tác giả commit được gộp vào nhánh của bạn ngay lập tức.',
      },
    ],
  },
  {
    id: 'amend-forgotten-files',
    category: 'recipes',
    title: 'Viết sai commit message hoặc quên lưu 1 file vừa sửa (Amend Commit)',
    subtitle: 'Ghi đè trực tiếp vào commit đỉnh gần nhất mà không sinh commit rác',
    badge: 'Sạch lịch sử',
    icon: FileEdit,
    problem:
      'Bạn vừa bấm commit xong mới nhận ra viết sai chính tả message, hoặc phát hiện quên chưa stage 1 file quan trọng vừa sửa.',
    solution:
      'Sử dụng chế độ Amend Commit để gộp file bỏ quên hoặc sửa lại commit message mà không tạo thêm commit rác trong lịch sử.',
    steps: [
      {
        title: 'Bước 1: Đưa file bỏ quên vào Staged',
        desc: 'Trong mục Unstaged Changes ở Working Tree, bấm dấu + cạnh file bỏ quên để đưa vào Staged.',
      },
      {
        title: 'Bước 2: Kích hoạt Amend Commit',
        desc: 'Tại bảng Commit Box bên phải, đánh dấu vào ô checkbox "Amend Commit". Message cũ sẽ tự động hiển thị để bạn chỉnh sửa lại.',
      },
      {
        title: 'Bước 3: Bấm Commit (Amend)',
        desc: 'Bấm nút "Commit (Amend)". Thay đổi mới sẽ được hòa nhập vào commit đỉnh gần nhất.',
      },
    ],
  },
  {
    id: 'abort-conflict-safely',
    category: 'recipes',
    title: 'Đang giải quyết xung đột (Conflict) mà thấy bị rối, muốn hủy làm lại từ đầu',
    subtitle: 'Quay về nguyên trạng sạch sẽ ban đầu chỉ với 1 nút bấm Abort',
    badge: 'Bảo hiểm No-Fear',
    icon: AlertTriangle,
    problem:
      'Trong quá trình Merge hoặc Rebase, xảy ra xung đột ở nhiều file. Bạn bấm sửa nhưng càng sửa càng rối và muốn hủy bỏ toàn bộ để bắt đầu lại từ đầu.',
    solution:
      'Thanh RepoAlertBanner và màn hình ConflictResolver luôn có sẵn nút màu đỏ Abort để hoàn tác tức thì mọi trạng thái dở dang.',
    steps: [
      {
        title: 'Bước 1: Bấm nút Abort',
        desc: 'Nhìn lên thanh cảnh báo đầu trang RepoAlertBanner hoặc góc trên cửa sổ ConflictResolver ➔ Bấm nút màu đỏ "Hủy bỏ Merge (Abort)" hoặc "Hủy bỏ Rebase (Abort)".',
      },
      {
        title: 'Bước 2: Kiểm tra kết quả',
        desc: 'Trạng thái repository lập tức quay trở về nguyên trạng ban đầu sạch sẽ, không có bất kỳ file nào bị hỏng hay lưu vết dở dang.',
      },
    ],
  },
  {
    id: 'diverged-smart-sync',
    category: 'recipes',
    title: 'Vừa có commit local mới, remote cũng vừa có commit mới (Diverged Sync)',
    subtitle: 'Đồng bộ nhánh phân kỳ mượt mà với 1-Click Smart Sync',
    badge: 'Đồng bộ thông minh',
    icon: CloudDownload,
    problem:
      'Nhánh của bạn rơi vào tình trạng phân kỳ (1 Ahead, 1 Behind): Bạn vừa commit thêm ở máy, đồng nghiệp cũng vừa push lên remote.',
    solution:
      'Nút 1-Click Smart Sync trên Toolbar tự động phân tích độ lệch, chạy giả lập xung đột trong RAM và đồng bộ an toàn.',
    steps: [
      {
        title: 'Bước 1: Bấm nút Sync trên Toolbar',
        desc: 'Nhấp chuột vào nút "Sync" (CloudDownload) trên thanh công cụ Toolbar.',
      },
      {
        title: 'Bước 2: FlowGit tự động xử lý',
        desc: 'Nếu không đụng hàng: App tự động fetch và fast-forward mượt mà. Nếu có xung đột: App cảnh báo trước file đụng độ để bạn chủ động resolve.',
      },
    ],
  },
  {
    id: 'purge-heavy-files-nuke',
    category: 'recipes',
    title: 'Lỡ commit file nặng (>100MB) bị GitHub từ chối Push (Nuke History)',
    subtitle: 'Bóc tách và xóa triệt để file nặng khỏi toàn bộ lịch sử commit',
    badge: 'Cứu nguy GitHub',
    icon: ShieldAlert,
    problem:
      'Bạn lỡ commit file zip hoặc database nặng >100MB. Dù đã tạo commit sau để xóa file, GitHub vẫn chặn Push vì file nặng còn nằm trong commit cũ.',
    solution:
      'Tính năng Nuke History / Large Files Manager tự động quét và bóc tách vĩnh viễn tệp nặng ra khỏi toàn bộ lịch sử commit.',
    steps: [
      {
        title: 'Bước 1: Mở Large Files Manager / Nuke History',
        desc: 'Vào menu Tools trên Toolbar ➔ Chọn "Nuke History / Large Files". App sẽ tự quét và liệt kê các file vượt ngưỡng dung lượng.',
      },
      {
        title: 'Bước 2: Bấm Purge File',
        desc: 'Chọn file nặng và bấm "Purge File from History". FlowGit viết lại lịch sử commit loại bỏ hoàn toàn tệp nặng.',
      },
      {
        title: 'Bước 3: Force Push lên GitHub',
        desc: 'Bấm nút Force Push trên Sidebar để cập nhật kho lưu trữ sạch sẽ lên remote.',
      },
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
        title: 'Cách 1: Nút "Quick Hotfix" siêu tốc (Khuyên dùng)',
        desc: 'Bấm nút icon ngọn lửa "Quick Hotfix" trên Toolbar ➔ FlowGit tự động tạo thư mục độc lập trỏ vào main. Mở VS Code thứ 2 sửa và commit.',
        tip: 'Thư mục chính đang code dở nguyên vẹn 100%, không cần stash hay lo đụng độ file.',
      },
      {
        title: 'Cách 2: Mở Worktree Manager chuyên sâu',
        desc: 'Bấm vào biểu tượng cặp tài liệu "Worktrees" trên Sidebar hoặc Toolbar để quản lý, tạo thêm nhánh hoặc mở folder bất kỳ.',
      },
      {
        title: 'Bước 3: Dọn dẹp sau khi xong việc',
        desc: 'Sau khi merge hotfix, bạn chỉ cần bấm xóa worktree tạm thời đó. Mọi commit và lịch sử đã được lưu an toàn trong repo chính.',
      },
    ],
    proTips: [
      'FlowGit hỗ trợ khôi phục stash nhanh cho hotfix chỉ với 1 click.',
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
      'Bạn muốn đưa HEAD về một commit trước đó: có lúc muốn giữ nguyên code đang sửa ở Staged, có lúc muốn đưa về Working Tree hoặc xóa bỏ.',
    solution:
      'Menu chuột phải trên Commit cung cấp 3 chế độ rõ ràng:\n• Soft: Đưa HEAD về commit cũ, giữ nguyên toàn bộ thay đổi ở Staged.\n• Mixed: Đưa HEAD về commit cũ, đưa thay đổi về Unstaged (Working Tree).\n• Hard: Đưa HEAD về commit cũ và xóa bỏ code dở dang (được Time Machine lưu lại).',
    steps: [
      {
        title: 'Bước 1: Chuột phải vào commit muốn quay về',
        desc: 'Click chuột phải vào commit mốc trên đồ thị Canvas ➔ Rê chuột vào mục "Reset current branch to here".',
      },
      {
        title: 'Bước 2: Chọn chế độ phù hợp',
        desc: 'Chọn "Soft", "Mixed" hoặc "Hard".',
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
      'Nút "Clean Merged Branches" trên đầu mục Local Branches tự động quét toàn bộ nhánh local, phát hiện những nhánh nào đã gộp hoàn toàn vào main và cho phép bạn chọn xóa hàng loạt an toàn.',
    steps: [
      {
        title: 'Bước 1: Bấm biểu tượng dọn dẹp ở mục Local Branches',
        desc: 'Rê chuột vào thanh tiêu đề "Local Branches" trên thanh Sidebar ➔ Bấm vào icon chiếc chổi "Clean Merged Branches".',
      },
      {
        title: 'Bước 2: Xem danh sách nhánh rác và bấm Xóa',
        desc: 'App hiển thị modal danh sách các nhánh an toàn có thể xóa. Bấm nút "Delete Selected" để làm sạch toàn bộ kho lưu trữ.',
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
        desc: 'Rê chuột vào góc trên của từng khối code thay đổi trong Diff Viewer ➔ Bấm "Stage Hunk".',
      },
      {
        title: 'Discard Hunk an toàn',
        desc: 'Bấm "Discard Hunk" để loại bỏ thay đổi của khối đó (vẫn được lưu vào Thùng rác 48h).',
      },
    ],
  },
  {
    id: 'pr-reviewer',
    category: 'features',
    title: 'Offline Pull Request Reviewer & Diff-First',
    subtitle: 'Đánh giá toàn diện sự khác biệt giữa 2 nhánh trước khi mở PR',
    icon: CheckCircle2,
    problem: 'Thường phải push code lên GitHub mới xem được tổng quan diff của toàn bộ PR, dễ sót file rác hoặc debug log.',
    solution: 'Tab PR Reviewer cho phép đối chiếu 2 nhánh bất kỳ: hiển thị toàn bộ commit đóng góp, danh sách file thay đổi kèm số dòng + / - và diff 2 cột.',
    steps: [
      {
        title: 'Mở PR Reviewer',
        desc: 'Chuyển sang tab "PR Reviewer" trên thanh điều hướng hoặc qua Command Palette.',
      },
      {
        title: 'Chọn Base và Compare Branch',
        desc: 'Chọn nhánh Base (ví dụ: main) và nhánh Compare (ví dụ: feature/xxx) để duyệt toàn bộ diff tổng thể offline.',
      },
    ],
  },
  {
    id: 'safety-engine',
    category: 'features',
    title: 'No-Fear Safety Engine (SQLite 48h & Time Machine)',
    subtitle: 'Bảo vệ mã nguồn tuyệt đối: Thùng rác uncommitted và Time Machine Ctrl+Z',
    icon: ShieldCheck,
    problem: 'Các thao tác Git nguy hiểm như Discard, Reset Hard, Rebase dễ làm mất code vĩnh viễn.',
    solution: 'FlowGit lưu snapshot mọi file discard vào SQLite trong 48 giờ, đồng thời ghi lại toàn bộ con trỏ HEAD vào Action Log để bấm Ctrl+Z quay lại quá khứ bất cứ lúc nào.',
    steps: [
      {
        title: 'Trash Inspector 48h',
        desc: 'Bấm huy hiệu "Trash (48h)" dưới thanh trạng thái để xem lại và khôi phục các file lỡ tay discard.',
      },
      {
        title: 'Time Machine Drawer',
        desc: 'Bấm icon đồng hồ quay ngược trên Toolbar để xem toàn bộ lịch sử thao tác và quay ngược thời gian an toàn.',
      },
    ],
  },
];

export const shortcuts: ShortcutItem[] = [
  { key: 'Ctrl + K', desc: 'Mở Command Palette tìm kiếm lệnh nhanh' },
  { key: 'Ctrl + Z', desc: 'Undo - Hoàn tác hành động Git vừa thực hiện (Time Machine)' },
  { key: 'Ctrl + Shift + Z / Ctrl + Y', desc: 'Redo - Làm lại hành động vừa hoàn tác' },
  { key: 'F1 / Ctrl + /', desc: 'Mở Sổ tay Hướng dẫn & Kịch bản thực chiến (Playbook)' },
  { key: 'Ctrl + B', desc: 'Đóng / Mở thanh điều hướng Sidebar bên trái' },
  { key: 'Ctrl + 1', desc: 'Chuyển nhanh sang chế độ Commit Graph' },
  { key: 'Ctrl + 2', desc: 'Chuyển nhanh sang chế độ Working Tree & Changes' },
  { key: 'Ctrl + Enter', desc: 'Commit ngay lập tức trong bảng soạn thảo Commit' },
  { key: 'Space', desc: 'Stage / Unstage nhanh file đang chọn trong Working Tree' },
  { key: 'S', desc: 'Squash - Gộp các commit đang chọn thành 1 commit duy nhất' },
  { key: 'Right Click', desc: 'Mở Context Menu trên commit (Revert, Reset, Tag, Branch, SHA)' },
  { key: 'Escape', desc: 'Đóng modal / popup hiện tại' },
];
