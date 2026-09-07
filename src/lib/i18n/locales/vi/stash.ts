export const stash = {
  shelf: {
    title: "Visual Stash Shelf",
    subtitle: "Browse stashes, inspect changed files, and preview line-by-line diffs with Monaco Diff Editor before applying.",
    stashesCount: "Bản lưu ({count})",
    emptyList: "Chưa có bản Stash nào được lưu",
    emptyListDesc: "Bạn có thể tạm cất các thay đổi dở dang bằng nút 'Tạo Stash mới' bên dưới hoặc từ Commit Box.",
    createNew: "Lưu Stash mới",
    stashIndex: "stash@{index}",
    createdTime: "{time}",
    branchOrigin: "Nhánh gốc: {branch}",
    changedFiles: "Tệp thay đổi ({count})",
    noFilesChanged: "Không có tệp nào bị thay đổi trong bản stash này.",
    totalStats: "+{additions} / -{deletions} dòng",
    
    // Actions
    applyBtn: "Áp dụng (Apply)",
    applyTooltip: "Đưa các thay đổi này vào thư mục làm việc, vẫn giữ lại bản stash",
    popBtn: "Áp dụng & Xóa (Pop)",
    popTooltip: "Đưa các thay đổi vào thư mục làm việc và xóa bản stash này",
    branchBtn: "Tạo nhánh từ Stash",
    branchTooltip: "Tạo một nhánh Git mới trỏ vào mốc stash này và checkout sang",
    dropBtn: "Xóa Stash (Drop)",
    dropTooltip: "Xóa vĩnh viễn bản stash này khỏi Git",
    
    // Dialogs & Notifications
    confirmDropTitle: "Xác nhận xóa Stash",
    confirmDropMessage: "Bạn có chắc chắn muốn xóa vĩnh viễn stash@{index} ('{message}') không? Thao tác này không thể hoàn tác.",
    dropSuccess: "Đã xóa stash@{index} thành công.",
    applySuccess: "Đã áp dụng stash@{index} vào working tree.",
    popSuccess: "Đã áp dụng và xóa stash@{index} thành công.",
    branchDialogTitle: "Tạo nhánh mới từ stash@{index}",
    branchNamePlaceholder: "Tên nhánh mới (vd: feature/restored-work)...",
    createBranchConfirm: "Tạo nhánh & Checkout",
    branchSuccess: "Đã tạo nhánh '{branch}' và áp dụng stash@{index} thành công.",
    
    // Quick Create Modal
    createModalTitle: "Tạo Stash mới",
    messagePlaceholder: "Ghi chú mô tả thay đổi cần tạm cất (tùy chọn)...",
    includeUntracked: "Bao gồm cả các tệp chưa theo dõi (Untracked files)",
    createConfirm: "Tạo Stash",
    createSuccess: "Đã cất thay đổi vào Stash thành công.",

    // Diff view
    diffTitle: "So sánh thay đổi trong Stash",
    splitView: "2 Cột (Split)",
    unifiedView: "1 Cột (Unified)",
    ignoreWhitespace: "Bỏ qua khoảng trắng",
    binaryNotice: "Đây là tệp nhị phân, không thể hiển thị nội dung diff văn bản.",
    selectFilePrompt: "Chọn một tệp từ danh sách bên trái để soi chi tiết diff",
    loadingDetail: "Đang tải chi tiết Stash...",
    loadingDiff: "Đang phân tích diff tệp...",
    untrackedBadge: "Chưa theo dõi",
  },
};
