## 📝 Summary of Changes | Tóm tắt thay đổi
<!-- [EN] Briefly summarize what this PR achieves and the motivation behind it. -->
<!-- [VI] Tóm tắt ngắn gọn những gì PR này thực hiện và lý do thay đổi. -->


## 🔗 Related Issues | Liên kết Issue
<!-- [EN] Automatically close issues when merged: Closes #123 or Fixes #456 -->
<!-- [VI] Đóng issue tự động khi PR được merge: Closes #123 hoặc Fixes #456 -->
- Closes #

## 🏷️ Type of Change | Loại thay đổi
- [ ] 🐛 **Bug fix** (Non-breaking fix / Sửa lỗi không làm thay đổi API hiện tại)
- [ ] ✨ **New feature** (Non-breaking feature / Tính năng mới tương thích ngược)
- [ ] ⚡ **Performance** (Perf optimization, RAM reduction / Tối ưu hiệu năng, giảm RAM, tăng tốc render)
- [ ] 🌐 **i18n** (Dual locales update / Cập nhật từ điển song ngữ `vi.ts` & `en.ts`)
- [ ] ♻️ **Refactor** (Code refactoring, no behavior change / Tái cấu trúc mã nguồn)
- [ ] 📝 **Documentation** (Docs or README updates / Cập nhật tài liệu hoặc README)

## 🧪 Testing Checklist | Quy trình kiểm thử cục bộ
<!-- [EN] Please verify the following items on your local environment before submitting: -->
<!-- [VI] Vui lòng tích chọn các mục bạn đã kiểm tra trên máy cá nhân trước khi gửi PR: -->

- [ ] [EN] TypeScript & Svelte Runes type check passed: `npm run check` (0 errors, 0 warnings).  
  [VI] Chạy kiểm tra kiểu TypeScript/Svelte: `npm run check` (0 errors, 0 warnings).
- [ ] [EN] Rust Backend builds clean: `cargo check` inside `src-tauri` directory with 0 errors.  
  [VI] Chạy kiểm tra Rust Backend: `cargo check` trong thư mục `src-tauri` không có lỗi.
- [ ] [EN] Verified runtime desktop behavior via `npm run tauri dev`.  
  [VI] Đã kiểm tra ứng dụng chạy thực tế qua: `npm run tauri dev`.
- [ ] [EN] Checked both languages (English & Tiếng Việt) without raw hardcoded strings.  
  [VI] Đã kiểm tra hiển thị đồng thời cả 2 ngôn ngữ: Tiếng Việt và English (không hardcode chuỗi text trực tiếp).
- [ ] [EN] Zero `unwrap()` or `expect()` runtime panics in Rust command handlers.  
  [VI] Không có lệnh `unwrap()` hoặc `expect()` gây panic runtime trong Rust handler.

## 📸 Screenshots / Video | Ảnh chụp màn hình (UI Changes)
<!-- [EN] Attach screenshots or GIFs if this PR modifies any user interface. -->
<!-- [VI] Đính kèm ảnh chụp màn hình hoặc GIF nếu PR có thay đổi về giao diện người dùng. -->
