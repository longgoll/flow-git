# SỔ TAY THỰC CHIẾN & KỊCH BẢN CỨU HỘ (FLOWGIT PLAYBOOK)
> **Mục tiêu:** Cung cấp công thức 1-2 click và Kéo - Thả (Drag & Drop) giải cứu mọi sự cố Git thường gặp trong thực tế.  
> **Tra cứu nhanh trong ứng dụng:** Nhấn phím tắt **`F1`** hoặc **`Ctrl + /`** để mở trực tiếp trong FlowGit.  
> **Nguyên tắc:** 100% thao tác qua giao diện đồ họa (Visual First – Zero Terminal Friction).

---

## 📑 MỤC LỤC NHANH

- [Phần I: Đổi Ngữ Cảnh Đột Xuất & Phân Nhánh (Context Switching & Branching)](#phần-i-đổi-ngữ-cảnh-đột-xuất--phân-nhánh)
  - [Công thức 1: Lỡ commit nhầm vào nhánh `main` thay vì tạo nhánh mới](#-công-thức-1-lỡ-commit-nhầm-vào-nhánh-main-thay-vì-tạo-nhánh-mới)
  - [Công thức 2: Đang code dở 15 file trên nhánh A, sếp gọi gấp sửa Hotfix P0 trên nhánh khác](#-công-thức-2-đang-code-dở-15-file-trên-nhánh-a-sếp-gọi-gấp-sửa-hotfix-p0-trên-nhánh-khác)
  - [Công thức 3: Tạo nhánh mới từ commit cũ rích (quên pull), muốn dời nền nhánh lên `main` mới nhất](#-công-thức-3-tạo-nhánh-mới-từ-commit-cũ-rích-quên-pull-muốn-dời-nền-nhánh-lên-main-mới-nhất)
  - [Công thức 4: Thử nghiệm một ý tưởng liều lĩnh (Spike / Experiment) mà không sợ hỏng code](#-công-thức-4-thử-nghiệm-một-ý-tưởng-liều-lĩnh-spike--experiment-mà-không-sợ-hỏng-code)
- [Phần II: Sửa Sai Lịch Sử & Hoàn Tác (History & Undo Dilemmas)](#phần-ii-sửa-sai-lịch-sử--hoàn-tác)
  - [Công thức 5: Lỡ merge nhánh làm đồ thị bị rối, muốn hủy merge để Rebase duỗi thẳng và Force Push](#-công-thức-5-lỡ-merge-nhánh-làm-đồ-thị-bị-rối-muốn-hủy-merge-để-rebase-duỗi-thẳng-và-force-push)
  - [Công thức 6: Lỡ tay bấm Discard xóa nhầm code chưa commit viết cả buổi sáng](#-công-thức-6-lỡ-tay-bấm-discard-xóa-nhầm-code-chưa-commit-viết-cả-buổi-sáng)
  - [Công thức 7: Thao tác sai lầm nghiêm trọng (Reset Hard hoặc Rebase nhầm làm biến mất commit)](#-công-thức-7-thao-tác-sai-lầm-nghiêm-trọng-reset-hard-hoặc-rebase-nhầm-làm-biến-mất-commit)
  - [Công thức 8: Lỡ Push commit lỗi lên remote chung của công ty (Production)](#-công-thức-8-lỡ-push-commit-lỗi-lên-remote-chung-của-công-ty-production)
  - [Công thức 9: Viết sai commit message hoặc quên lưu 1 file vừa sửa (Amend Commit)](#-công-thức-9-viết-sai-commit-message-hoặc-quên-lưu-1-file-vừa-sửa-amend-commit)
  - [Công thức 10: Tách 1 commit khổng lồ thành nhiều commit nhỏ logic (Reset Mixed + Hunk Staging)](#-công-thức-10-tách-1-commit-khổng-lồ-thành-nhiều-commit-nhỏ-logic)
  - [Công thức 11: Gộp nhiều commit nhỏ lẻ (wip, fix typo) thành 1 commit duy nhất trước khi tạo PR (Squash)](#-công-thức-11-gộp-nhiều-commit-nhỏ-lẻ-thành-1-commit-duy-nhất-trước-khi-tạo-pr-squash)
- [Phần III: Xung Đột & Phối Hợp Nhóm (Teamwork & Conflicts)](#phần-iii-xung-đột--phối-hợp-nhóm)
  - [Công thức 12: "Gắp" riêng một commit fix bug cực hay từ nhánh đồng nghiệp về nhánh mình (Cherry-pick)](#-công-thức-12-gắp-riêng-một-commit-fix-bug-cực-hay-từ-nhánh-đồng-nghiệp-về-nhánh-mình-cherry-pick)
  - [Công thức 13: Đang giải quyết xung đột (Conflict) mà thấy bị rối, muốn làm lại từ đầu (Abort an toàn)](#-công-thức-13-đang-giải-quyết-xung-đột-conflict-mà-thấy-bị-rối-muốn-làm-lại-từ-đầu-abort-an-toàn)
  - [Công thức 14: Vừa có commit local mới, vừa có commit remote mới (Diverged Branch / Phân kỳ)](#-công-thức-14-vừa-có-commit-local-mới-vừa-có-commit-remote-mới-diverged-branch)
  - [Công thức 15: Dọn dẹp danh sách nhánh rác sau khi sprint kết thúc (Clean Merged & Fetch Prune)](#-công-thức-15-dọn-dẹp-danh-sách-nhánh-rác-sau-khi-sprint-kết-thúc)
  - [Công thức 16: Tự đánh giá và Review Pull Request offline trước khi gửi sếp](#-công-thức-16-tự-đánh-giá-và-review-pull-request-offline-trước-khi-gửi-sếp)
- [Phần IV: File Nặng & Bảo Mật (Large Files & Secrets)](#phần-iv-file-nặng--bảo-mật)
  - [Công thức 17: Lỡ commit file nặng (>100MB) khiến GitHub từ chối Push](#-công-thức-17-lỡ-commit-file-nặng-100mb-khiến-github-từ-chối-push)
  - [Công thức 18: Lỡ commit nhầm file chứa API Key / Token / Mật khẩu nhạy cảm](#-công-thức-18-lỡ-commit-nhầm-file-chứa-api-key--token--mật-khẩu-nhạy-cảm)
- [Phần V: Thám Tử Truy Tìm Bug (Debugging & Investigation)](#phần-v-thám-tử-truy-tìm-bug)
  - [Công thức 19: Tính năng bị lỗi nhưng không biết commit nào trong 50 commit tuần qua gây lỗi (Visual Bisect)](#-công-thức-19-tính-năng-bị-lỗi-nhưng-không-biết-commit-nào-trong-50-commit-tuần-qua-gây-lỗi-visual-bisect)
  - [Công thức 20: Ai đã sửa dòng code này, sửa vào ngày nào và vì sao? (Visual Blame)](#-công-thức-20-ai-đã-sửa-dòng-code-này-sửa-vào-ngày-nào-và-vì-sao-visual-blame)

---

# PHẦN I: ĐỔI NGỮ CẢNH ĐỘT XUẤT & PHÂN NHÁNH

## 🆘 CÔNG THỨC 1: LỠ COMMIT NHẦM VÀO NHÁNH `MAIN` THAY VÌ TẠO NHÁNH MỚI

### Triệu chứng:
Bạn đang code tính năng mới nhưng quên tạo nhánh `feature/my-task`. Bạn đã commit 2-3 commit thẳng vào nhánh `main` local nhưng chưa push lên remote.

### Cách cứu trên FlowGit (30 giây, 2 click):
1. **Bước 1:** Nhấp chuột phải vào commit đỉnh hiện tại trên đồ thị Canvas ➔ Chọn **"Create Branch Here"** ➔ Đặt tên là `feature/my-task`.  
   *(Bây giờ toàn bộ các commit tính năng của bạn đã được gắn an toàn vào nhánh mới).*
2. **Bước 2:** Nhấp chuột phải vào commit cũ của `main` (commit trước khi bạn commit nhầm) ➔ Chọn **"Reset Current Branch (main) to Here"** ➔ Chọn chế độ **Hard**.
3. **Kết quả:** Nhánh `main` quay trở về vị trí sạch sẽ chuẩn mực, trong khi toàn bộ mã nguồn và commit tính năng của bạn đã nằm trọn vẹn trên nhánh `feature/my-task`.

---

## 🆘 CÔNG THỨC 2: ĐANG CODE DỞ 15 FILE TRÊN NHÁNH A, SẾP GỌI GẤP SỬA HOTFIX P0 TRÊN NHÁNH KHÁC

### Triệu chứng:
Bạn đang sửa dở 15 file trong nhánh tính năng, code đang dở dang chưa thể build hay commit được thì sếp yêu cầu sửa gấp một con bug production trên nhánh `hotfix`. Chuyển nhánh bình thường sẽ bắt bạn stash hoặc commit rác, sau đó dễ bị xung đột khi pop stash.

### Cách xử lý trên FlowGit (Zero-Disruption):
- **Cách 1 (Khuyên dùng – Git Worktree độc lập):**
  1. Bấm nút **"Quick Hotfix"** trên thanh Toolbar.
  2. FlowGit tự động tạo một thư mục làm việc độc lập trỏ vào `main`.
  3. Bạn mở thư mục đó sửa lỗi, test và commit.
  4. Thư mục chính đang code dở của bạn **hoàn toàn không bị xáo trộn, không cần stash, không cần build lại `node_modules`**.
- **Cách 2 (Smart Stash):**
  1. Tại Working Tree, bấm **"Stash All"** (hệ thống tự động lưu nhãn kèm thời gian).
  2. Chuyển sang nhánh sửa lỗi và commit.
  3. Xong việc quay lại nhánh tính năng, bấm **"Pop Stash"**.

---

## 🆘 CÔNG THỨC 3: TẠO NHÁNH MỚI TỪ COMMIT CŨ RÍCH (QUÊN PULL), MUỐN DỜI NỀN NHÁNH LÊN `MAIN` MỚI NHẤT

### Triệu chứng:
Bạn tạo nhánh `feature/user-profile` từ `main` nhưng quên không pull code mới nhất từ remote. Sau 1 tuần code, bạn phát hiện nhánh của mình đang mọc ra từ một commit cũ cách đây cả tháng.

### Cách xử lý trên FlowGit (Kéo - Thả):
1. Đảm bảo nhánh `main` local đã được đồng bộ mới nhất (bấm **"Sync"** trên Toolbar hoặc kéo từ `origin/main`).
2. Nhấp giữ chuột vào nhánh `feature/user-profile`, **kéo và thả đè** lên commit đỉnh mới nhất của `main` trên đồ thị Canvas.
3. Menu hành động mở ra ➔ Chọn **"Rebase onto Target"**.
4. **Kết quả:** Toàn bộ nhánh tính năng của bạn được nhấc bổng và ghép nối tiếp vào nền tảng code mới nhất của `main`.

---

## 🆘 CÔNG THỨC 4: THỬ NGHIỆM MỘT Ý TƯỞNG LIỀU LĨNH (SPIKE / EXPERIMENT) MÀ KHÔNG SỢ HỎNG CODE

### Triệu chứng:
Bạn muốn thử nghiệm viết lại thuật toán hoặc tích hợp một thư viện mới, nhưng không chắc có thành công không và sợ làm hỏng nhánh đang làm việc.

### Cách xử lý trên FlowGit:
1. Nhấp chuột phải vào commit hiện tại trên đồ thị ➔ Chọn **"Create Branch Here"** ➔ Đặt tên là `spike/try-new-algo`.
2. Thoải mái code, commit, thử nghiệm trên nhánh này.
3. **Nếu thất bại:** Chỉ việc chuột phải vào nhánh `spike/try-new-algo` ở Sidebar ➔ Chọn **"Delete Branch"**. Nhánh cũ của bạn không hề bị ảnh hưởng.
4. **Nếu thành công:** Kéo thả nhánh spike vào nhánh chính và chọn Merge hoặc Rebase.

---

# PHẦN II: SỬA SAI LỊCH SỬ & HOÀN TÁC

## 🆘 CÔNG THỨC 5: LỠ MERGE NHÁNH LÀM ĐỒ THỊ BỊ RỐI, MUỐN HỦY MERGE ĐỂ REBASE DUỖI THẲNG VÀ FORCE PUSH

### Triệu chứng:
Bạn vừa thực hiện merge nhánh tính năng vào `main` (hoặc merge đã thực hiện ở terminal / tool khác trước đó). Đồ thị xuất hiện node commit merge đan chéo rối rắm. Bạn muốn hủy bỏ lần merge đó, duỗi thẳng lịch sử bằng Rebase và cập nhật lên remote.

### Cách xử lý 100% bằng chuột trên FlowGit:
1. **Bước 1 (Hủy commit Merge):**  
   - Nhấp chuột phải vào commit của `main` ngay trước lần merge trên đồ thị Canvas.  
   - Chọn **"Reset current branch to here"** ➔ Chọn **`Hard`**.  
   *(Commit merge biến mất, nhánh `main` quay về trạng thái sạch sẽ trước khi gộp).*
2. **Bước 2 (Rebase duỗi thẳng đồ thị):**  
   - Checkout sang nhánh tính năng (`dev`).  
   - Kéo nhánh `dev` thả đè lên đỉnh của `main` ➔ Chọn **"Rebase dev onto main"**.  
   *(Các commit của `dev` được xếp nối tiếp thẳng hàng sau `main`).*
3. **Bước 3 (Force Push an toàn bằng UI):**  
   - Tại cột **Sidebar bên trái**, mục **Local Branches**.  
   - Nhấp chuột phải (hoặc bấm menu 3 chấm) vào nhánh bạn vừa rebase.  
   - Bấm vào nút màu cam **"Force Push (--force-with-lease)"**.  
   *(Hệ thống tự động ghi đè lịch sử sạch lên remote mà không làm mất code nếu có người khác vô tình push).*

---

## 🆘 CÔNG THỨC 6: LỠ TAY BẤM DISCARD XÓA NHẦM CODE CHƯA COMMIT VIẾT CẢ BUỔI SÁNG

### Triệu chứng:
Bạn vô tình bấm "Discard All Changes" hoặc bấm nút xóa một file chứa toàn bộ logic bạn vừa code cả buổi sáng mà chưa kịp commit. Trên terminal hay các Git GUI khác, code này đã bốc hơi vĩnh viễn!

### Cách cứu trên FlowGit (1 click khôi phục 100%):
1. Bấm vào biểu tượng **Thùng rác an toàn (Trash Inspector 48h)** trên thanh công cụ Toolbar hoặc thanh Status bar dưới cùng.
2. Tìm snapshot theo tên tệp hoặc mốc thời gian vừa thao tác (ví dụ: `src/auth.rs - 5 phút trước`). Bấm vào để xem lại diff nội dung đã bị xóa.
3. Bấm nút màu xanh **"Restore"**.
4. **Kết quả:** Toàn bộ nội dung mã nguồn chưa commit được phục hồi nguyên vẹn 100% vào Working Tree trong chớp mắt.

---

## 🆘 CÔNG THỨC 7: THAO TÁC SAI LẦM NGHIÊM TRỌNG (RESET HARD HOẶC REBASE NHẦM LÀM BIẾN MẤT COMMIT)

### Triệu chứng:
Bạn lỡ bấm Reset Hard hoặc Rebase nhầm làm biến mất nhánh hoặc gộp sai các commit quan trọng. Bạn đang rất hoảng loạn vì không biết mã nguồn cũ đi đâu.

### Cách cứu trên FlowGit:
1. **Cách nhanh nhất:** Nhấn tổ hợp phím **`Ctrl + Z`** (Safe-Flight Time Machine) một hoặc nhiều lần.
2. **Cách chủ động:** Mở **Time Machine Drawer** ở cạnh phải màn hình:
   - Xem dòng thời gian các hành động trước đó được lưu bởi SQLite Action Journal.
   - Nhấn **"Time Travel Here"** tại mốc thời gian trước khi xảy ra sự cố.
3. **Kết quả:** Con trỏ nhánh và HEAD lập tức quay ngược về quá khứ an toàn trong 0.1 giây.

---

## 🆘 CÔNG THỨC 8: LỠ PUSH COMMIT LỖI LÊN REMOTE CHUNG CỦA CÔNG TY (PRODUCTION)

### Triệu chứng:
Bạn vừa push commit lên nhánh `main` hoặc `develop` chung của công ty thì phát hiện có bug nghiêm trọng. Tuyệt đối không được dùng Reset Hard rồi Force Push vì sẽ làm vỡ lịch sử của tất cả đồng nghiệp đang kéo code về.

### Cách xử lý chuẩn Teamwork trên FlowGit:
1. Nhấp chuột phải vào chính commit bị lỗi đó trên đồ thị Canvas.
2. Bấm chọn **"Revert this commit"**.
3. FlowGit tự động tạo một commit mới đảo ngược lại 100% thay đổi của commit lỗi mà vẫn bảo toàn tính toàn vẹn lịch sử.
4. Bấm **Push** bình thường lên remote. An toàn tuyệt đối cho toàn bộ dự án.

---

## 🆘 CÔNG THỨC 9: VIẾT SAI COMMIT MESSAGE HOẶC QUÊN LƯU 1 FILE VỪA SỬA (AMEND COMMIT)

### Triệu chứng:
Bạn vừa bấm Commit xong thì nhận ra viết sai chính tả message, hoặc quên chưa stage 1 file quan trọng vừa lưu.

### Cách xử lý trên FlowGit:
1. Đưa file bị bỏ quên vào mục **Staged Changes** (bằng cách bấm dấu `+` cạnh file).
2. Tại bảng Commit bên phải, đánh dấu vào ô checkbox **"Amend Commit"**.
3. Nhập lại commit message chuẩn (nếu muốn sửa message).
4. Bấm nút **"Commit (Amend)"**.
5. **Kết quả:** Thay đổi mới được gộp trực tiếp vào commit đỉnh gần nhất, không sinh thêm commit rác trong lịch sử.

---

## 🆘 CÔNG THỨC 10: TÁCH 1 COMMIT KHỔNG LỒ THÀNH NHIỀU COMMIT NHỎ LOGIC

### Triệu chứng:
Bạn có 1 commit chứa cả code backend, frontend và tài liệu. Tech lead yêu cầu tách thành 3 commit riêng biệt để review rõ ràng.

### Cách xử lý trên FlowGit:
1. Chuột phải vào commit đó trên đồ thị ➔ Chọn **"Reset current branch to here"** ➔ Chọn **`Mixed`**.
2. Toàn bộ mã nguồn vẫn còn nguyên vẹn 100% trong mục **Unstaged Changes**.
3. Sử dụng tính năng **Hunk Staging**:
   - Mở file trong Diff Viewer.
   - Bấm nút **"Stage Chunk"** ở các đoạn code backend ➔ Commit với message: `feat(api): backend logic`.
   - Bấm **"Stage Chunk"** ở các đoạn code frontend ➔ Commit với message: `feat(ui): client components`.
   - Stage phần còn lại ➔ Commit tài liệu.

---

## 🆘 CÔNG THỨC 11: GỘP NHIỀU COMMIT NHỎ LẺ (WIP, FIX TYPO) THÀNH 1 COMMIT DUY NHẤT TRƯỚC KHI TẠO PR (SQUASH)

### Triệu chứng:
Trong quá trình làm tính năng, bạn commit 5-6 lần với các nội dung vụn vặt như: *"wip"*, *"fix bug nhỏ"*, *"test"*. Bạn cần gộp lại thành 1 commit duy nhất chuẩn mực trước khi mở PR.

### Cách xử lý trên FlowGit:
1. **Cách 1 (Phím tắt siêu tốc):**  
   - Giữ phím `Shift` hoặc `Ctrl` và click chuột chọn các commit liên tiếp muốn gộp trên đồ thị.  
   - Nhấn phím **`S`** trên bàn phím (hoặc bấm nút "Squash Commits" ở thanh dưới).  
   - Biên tập lại commit message hoàn chỉnh ➔ Bấm **Xác nhận gộp**.
2. **Cách 2 (Interactive Rebase):**  
   - Chuột phải vào commit trước chuỗi commit đó ➔ Chọn **"Interactive Rebase"**.  
   - Kéo thả sắp xếp thứ tự hoặc đổi action thành `squash` ➔ Bấm **Execute Rebase**.

---

# PHẦN III: XUNG ĐỘT & PHỐI HỢP NHÓM

## 🆘 CÔNG THỨC 12: "GẮP" RIÊNG MỘT COMMIT FIX BUG CỰC HAY TỪ NHÁNH ĐỒNG NGHIỆP VỀ NHÁNH MÌNH (CHERRY-PICK)

### Triệu chứng:
Đồng nghiệp đang làm trên nhánh `feature/auth` và vừa commit một hàm fix bug mã hóa cực kỳ hữu ích. Bạn muốn lấy đúng commit đó về nhánh của mình mà không muốn merge cả nhánh của họ.

### Cách xử lý trên FlowGit (Kéo - Thả trong 1 giây):
1. Đảm bảo bạn đang đứng ở nhánh của mình (nhánh đang được checkout).
2. Trên Living Commit Graph, tìm nốt commit của đồng nghiệp.
3. Nhấp giữ chuột vào commit đó, **kéo và thả đè** vào nhánh của bạn.
4. Chọn **"Cherry-pick commit"**.
5. **Kết quả:** Commit đó được áp dụng ngay lập tức vào nhánh của bạn với đầy đủ nội dung và tác giả gốc.

---

## 🆘 CÔNG THỨC 13: ĐANG GIẢI QUYẾT XUNG ĐỘT (CONFLICT) MÀ THẤY BỊ RỐI, MUỐN LÀM LẠI TỪ ĐẦU (ABORT AN TOÀN)

### Triệu chứng:
Trong quá trình Merge hoặc Rebase, xảy ra xung đột ở nhiều file. Bạn bấm sửa tay nhưng càng sửa càng rối và muốn hủy bỏ toàn bộ quá trình để bắt đầu lại từ đầu.

### Cách xử lý trên FlowGit:
1. Trên thanh thông báo màu vàng/xanh đầu trang ([`RepoAlertBanner`](file:///f:/Dev/product/git-tool/src/lib/components/RepoAlertBanner.svelte)), bấm nút đỏ:
   - **"Hủy bỏ Merge (Abort)"** nếu đang merge.
   - **"Hủy bỏ (Abort)"** nếu đang rebase.
2. Hoặc trong màn hình [`ConflictResolver`](file:///f:/Dev/product/git-tool/src/lib/components/ConflictResolver.svelte), bấm nút **"Abort Merge / Rebase"**.
3. **Kết quả:** Trạng thái repository tức khắc quay trở về nguyên trạng ban đầu sạch sẽ, không có bất kỳ file nào bị lỗi dở dang.

---

## 🆘 CÔNG THỨC 14: VỪA CÓ COMMIT LOCAL MỚI, VỪA CÓ COMMIT REMOTE MỚI (DIVERGED BRANCH)

### Triệu chứng:
Bạn vừa commit thêm 1 commit ở local, cùng lúc đó đồng nghiệp cũng vừa push 1 commit lên nhánh đó trên remote. Nhánh của bạn rơi vào trạng thái phân kỳ (1 Ahead, 1 Behind).

### Cách xử lý trên FlowGit:
1. Bấm nút **"Sync" (1-Click Smart Sync)** trên thanh công cụ Toolbar.
2. FlowGit tự động phân tích độ lệch:
   - Nếu sạch (không đụng file): Tự động áp dụng và đồng bộ an toàn.
   - Nếu có xung đột: Mở ngay bộ giả lập **Conflict Simulation** để cảnh báo trước file nào đụng độ trước khi bạn tiến hành.

---

## 🆘 CÔNG THỨC 15: DỌN DẸP DANH SÁCH NHÁNH RÁC SAU KHI SPRINT KẾT THÚC

### Triệu chứng:
Cột Sidebar đầy ắp 20-30 nhánh local cũ đã merge vào main từ lâu, kèm theo các nhánh remote tracking của đồng nghiệp đã bị xóa trên GitHub nhưng ở app vẫn còn hiện.

### Cách xử lý trên FlowGit:
1. **Dọn nhánh Local đã merge:**  
   - Bấm vào biểu tượng chiếc chổi **"Clean Merged Branches"** trên đầu mục Local Branches ở Sidebar.  
   - FlowGit tự động lọc ra các nhánh an toàn ➔ Bấm **"Delete Selected"** để xóa toàn bộ chỉ sau 1 click.
2. **Dọn nhánh Remote đã bị xóa trên GitHub:**  
   - Chuột phải vào tên Remote (`origin`) ở Sidebar ➔ Chọn **"Fetch & Prune"**. Các nhánh ma trên remote sẽ tự động biến mất.

---

## 🆘 CÔNG THỨC 16: TỰ ĐÁNH GIÁ VÀ REVIEW PULL REQUEST OFFLINE TRƯỚC KHI GỬI SẾP

### Triệu chứng:
Bạn muốn tự mình kiểm tra lại toàn bộ mã nguồn thay đổi giữa nhánh tính năng của mình và nhánh `main` trước khi đẩy lên GitHub tạo PR, nhằm tránh sót các file debug hay password.

### Cách xử lý trên FlowGit:
1. Chuyển sang chế độ **"PR Reviewer"** (trên Toolbar hoặc menu View).
2. Chọn Base Branch là `main` và Compare Branch là nhánh tính năng của bạn.
3. Giao diện cung cấp:
   - Danh sách tuần tự tất cả commit đóng góp.
   - Tổng kết số file thay đổi kèm số dòng `+` (thêm) và `-` (xóa).
   - Diff chi tiết dạng Split (2 cột) hoặc Unified (1 cột) với syntax highlighting mượt mà.

---

# PHẦN IV: FILE NẶNG & BẢO MẬT

## 🆘 CÔNG THỨC 17: LỠ COMMIT FILE NẶNG (>100MB) KHIẾN GITHUB TỪ CHỐI PUSH

### Triệu chứng:
Bạn lỡ commit một file zip, video hoặc file database nặng hơn 100MB. Khi bấm Push, GitHub từ chối với lỗi *`File is 120.00 MB; this exceeds GitHub's file size limit of 100.00 MB`*. Dù bạn có tạo commit sau để xóa file đó đi thì file nặng vẫn nằm trong lịch sử và GitHub vẫn chặn!

### Cách xử lý trên FlowGit:
1. Mở **Nuke History / Large Files Manager** từ menu Tools trên Toolbar.
2. FlowGit tự động quét và chỉ ra file nặng đang nằm trong commit nào.
3. Bấm **"Purge File from History"** ➔ Hệ thống viết lại lịch sử commit loại bỏ hoàn toàn tệp nặng.
4. Sau đó bấm **Force Push** để đẩy repo sạch lên GitHub.

---

## 🆘 CÔNG THỨC 18: LỠ COMMIT NHẦM FILE CHỨA API KEY / TOKEN / MẬT KHẨU NHẠY CẢM

### Triệu chứng:
Bạn vô tình commit file `.env` hoặc file cấu hình chứa AWS Key, Stripe Secret Key hoặc Database Password vào git.

### Cách xử lý trên FlowGit:
1. **Nếu chưa push lên remote:**  
   - Bấm **`Ctrl + Z`** để hủy commit vừa tạo ngay lập tức.  
   - Thêm `.env` vào file `.gitignore` ➔ Bấm Save.
2. **Nếu đã push lên remote:**  
   - Lập tức thu hồi (Revoke/Rotate) chìa khóa bí mật đó trên trang quản trị dịch vụ (AWS, Stripe).  
   - Dùng tính năng **Nuke History Modal** để thanh tẩy hoàn toàn file đó khỏi toàn bộ các commit trong lịch sử kho lưu trữ.

---

# PHẦN V: THÁM TỬ TRUY TÌM BUG

## 🆘 CÔNG THỨC 19: TÍNH NĂNG BỊ LỖI NHƯNG KHÔNG BIẾT COMMIT NÀO TRONG 50 COMMIT TUẦN QUA GÂY LỖI (VISUAL BISECT)

### Triệu chứng:
Một tính năng đang chạy ổn định bỗng dưng bị hỏng trên nhánh `main`. Trong tuần qua có hơn 50 commit được merge vào từ nhiều người và bạn không biết ai hay commit nào đã gây ra lỗi.

### Cách xử lý trên FlowGit (Visual Bisect Wizard):
1. Bấm vào icon con bọ **"Bisect"** trên thanh Toolbar.
2. Đánh dấu commit hiện tại là **Bad 🐞** (đang bị lỗi).
3. Tìm một commit trong quá khứ lúc tính năng còn chạy tốt và đánh dấu là **Good ✅**.
4. FlowGit tự động tính toán điểm giữa và checkout:  
   - Bạn chạy thử ứng dụng: nếu chạy tốt bấm **"Pass"**, nếu lỗi bấm **"Fail"**.
5. Sau khoảng 3-4 lần kiểm tra nhị phân, FlowGit chỉ ra chính xác **commit thủ phạm** cùng thông tin tác giả và diff chi tiết của commit đó!

---

## 🆘 CÔNG THỨC 20: AI ĐÃ SỬA DÒNG CODE NÀY, SỬA VÀO NGÀY NÀO VÀ VÌ SAO? (VISUAL BLAME)

### Triệu chứng:
Bạn đọc vào một đoạn code rất khó hiểu và muốn biết ai là người đã viết đoạn code này, vào ngày nào và commit message đính kèm là gì để trao đổi lại.

### Cách xử lý trên FlowGit:
1. Mở file trong **Diff Viewer** hoặc File Inspector.
2. Bật chế độ xem **Blame / Line History**.
3. Mỗi dòng code hiển thị kèm:
   - Tên và avatar tác giả.
   - Thời gian sửa đổi tương đối (ví dụ: *3 tuần trước*).
   - Mã commit SHA (click vào để nhảy trực tiếp tới node commit đó trên đồ thị Canvas).
