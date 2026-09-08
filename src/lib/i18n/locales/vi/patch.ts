export const patch = {
  title: "Quản lý & Áp Dụng Patch",
  subtitle: "Xuất commit thành tệp patch hoặc áp dụng các thay đổi từ patch ngoại vi vào thư mục làm việc",
  badge: "Patch Engine",
  commandTitle: "Áp dụng tệp Patch (.patch / .diff) vào Working Tree",
  contextExport: "Xuất thành Patch (.patch)...",
  close: "Đóng",

  // Tabs
  tabApply: "Áp Dụng Patch (Apply)",
  tabExport: "Xuất Patch (Export)",

  // Export Tab
  exportTitle: "Xuất Commit Thành File Patch",
  exportSubtitle: "Tạo file patch chuẩn tương thích với `git format-patch` và `git apply`",
  commitLabel: "Commit đang chọn:",
  copyToClipboard: "Sao chép mã Patch",
  copied: "Đã sao chép vào bộ nhớ tạm!",
  saveAsFile: "Lưu thành tệp .patch...",
  savedSuccess: "Đã lưu tệp patch thành công!",
  generatingPatch: "Đang tạo mã patch từ commit...",
  emptyPatch: "Commit này không chứa thay đổi tệp tin nào.",

  // Apply Tab
  applyTitle: "Nhập & Áp Dụng File Patch",
  applySubtitle: "Kéo thả file .patch / .diff hoặc dán trực tiếp nội dung patch vào bên dưới",
  browseFile: "Chọn tệp từ máy...",
  dropHint: "Kéo & thả file .patch hoặc .diff vào đây",
  orPaste: "hoặc dán trực tiếp nội dung patch:",
  pastePlaceholder: "Dán nội dung unified diff hoặc format-patch tại đây (bắt đầu bằng '--- a/...' hoặc 'diff --git ...')...",
  optionsTitle: "Tùy chọn áp dụng",
  stageToIndex: "Stage trực tiếp vào Index (Staged changes)",
  stageToIndexDesc: "Tự động đưa các file thay đổi vào khu vực Staging sau khi áp dụng",
  applyReverse: "Đảo ngược thay đổi (Reverse patch)",
  applyReverseDesc: "Áp dụng ngược lại như hoàn tác thay đổi",

  // Validation / Dry-Run
  dryRunTitle: "Kiểm Tra Khả Năng Áp Dụng (Dry-Run Check)",
  checking: "Đang kiểm tra...",
  statusClean: "Khả thi (Sạch sẽ) — Có thể áp dụng ngay mà không xung đột",
  statusConflict: "Không thể áp dụng sạch — Có thể thiếu file gốc hoặc nội dung đã bị sửa đổi",
  affectedFiles: "Danh sách tệp tin ảnh hưởng ({count})",
  noFiles: "Chưa có file nào được phát hiện trong patch.",
  applyButton: "Áp Dụng Vào Working Tree",
  applying: "Đang áp dụng patch...",
  applySuccess: "Đã áp dụng patch thành công ({count} tệp tin)!",
  applyFailed: "Áp dụng patch thất bại: {error}",
};
