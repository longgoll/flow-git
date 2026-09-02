# TRỢ LÝ TRÍ TUỆ NHÂN TẠO CỤC BỘ (LOCAL AI ASSISTANT)
> **Bảo mật tuyệt đối:** Hoạt động 100% trên Localhost qua Ollama / Local LLM  
> **Không rò rỉ mã nguồn:** Phù hợp với tiêu chuẩn bảo mật nghiêm ngặt của Ngân hàng & Doanh nghiệp

---

## 🤖 1. TỔNG QUAN TÍNH NĂNG AI TRONG FLOWGIT

Component: `src/lib/components/AIAssistantModal.svelte` & `CommitBox.svelte`

FlowGit tích hợp sẵn trợ lý trí tuệ nhân tạo thông minh được thiết kế chuyên biệt cho công việc Git hàng ngày. Khác với các công cụ gửi mã nguồn lên dịch vụ đám mây công cộng tiềm ẩn nguy cơ rò rỉ dữ liệu nhạy cảm, FlowGit ưu tiên giao tiếp với các mô hình chạy trực tiếp trên máy cục bộ (**Ollama**, **LM Studio**, **LocalAI**).

---

## ✍️ 2. TỰ ĐỘNG SINH CONVENTIONAL COMMIT MESSAGE

### Cách hoạt động:
1. Bạn stage các tệp cần commit trong Working Tree.
2. Tại khung **Commit Box**, bấm nút **"AI Generate"** (hoặc biểu tượng tia sét ✨).
3. Hệ thống thu thập toàn bộ Staged Diff, lọc bỏ các đoạn mã nhạy cảm và gửi tới mô hình AI cục bộ kèm Prompt chuẩn hóa:
   > *"Dựa vào git diff sau đây, hãy viết một commit message ngắn gọn tuân thủ chuẩn Conventional Commits (feat, fix, refactor, perf) kèm mô tả súc tích bằng tiếng Việt hoặc tiếng Anh."*
4. Kết quả được điền tự động vào ô nhập liệu chỉ trong 1-2 giây để bạn xem lại và nhấn Commit.

---

## 🧠 3. TƯ VẤN GIẢI QUYẾT XUNG ĐỘT (CONFLICT ADVISOR)

Khi gặp các ca xung đột logic hóc búa giữa 2 nhánh trong **Conflict Resolver**:
- Bạn có thể bấm nút **"Hỏi Trợ lý AI"**.
- AI sẽ phân tích sự khác biệt giữa phiên bản **Ours** và **Theirs** dựa trên bối cảnh của hàm code, sau đó:
  - Giải thích tại sao 2 lập trình viên lại sửa đổi dòng code này.
  - Đề xuất một phương án mã nguồn gộp logic tối ưu nhất nhằm giữ được tính năng của cả hai bên mà không làm gãy chương trình.

---

## 🔍 4. GIẢI THÍCH LỊCH SỬ & TÌM KIẾM BẰNG NGÔN NGỮ TỰ NHIÊN

Trong hộp thoại **AI Assistant Modal** (`Ctrl + I`):
- Bạn có thể đặt các câu hỏi tự nhiên như:
  - *"Tính năng xác thực hai lớp được thêm vào ở commit nào?"*
  - *"Giải thích commit `7a8b9c` đã sửa những gì trong module giỏ hàng?"*
- AI sẽ đọc tóm tắt lịch sử và trả về câu trả lời trực quan, kèm liên kết có thể bấm để nhảy ngay tới commit tương ứng trên đồ thị.

---

## ⚙️ 5. CẤU HÌNH KẾT NỐI AI CỤC BỘ

Mặc định FlowGit kết nối tới endpoint tiêu chuẩn của Ollama:
- **API URL:** `http://localhost:11434/api/generate`
- **Mô hình khuyến nghị:**
  - `qwen2.5-coder:7b` (Chuyên gia lập trình, cực kỳ thông minh)
  - `deepseek-coder:6.7b` (Nhanh, gọn, sinh commit message siêu chuẩn)
  - `llama3.2:3b` (Nhẹ, chạy mượt trên laptop văn phòng không có GPU rời)
- Người dùng có thể tùy chỉnh URL và Model trong phần cài đặt của `AIAssistantModal.svelte`.
