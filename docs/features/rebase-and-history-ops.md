# INTERACTIVE REBASE, KÉO - THẢ & BIÊN TẬP LỊCH SỬ
> **Trực quan hóa:** Interactive Rebase Timeline kéo thả + Gộp commit (Squash) 1 giây  
> **An toàn:** Revert không ghi đè lịch sử + Reset 3 chế độ bảo hiểm bởi Time Machine

---

## ⏳ 1. INTERACTIVE REBASE VISUAL EDITOR (TIMELINE REBASE)

Component: `src/lib/components/InteractiveRebaseModal.svelte`  
Backend: `src-tauri/src/git/interactive_rebase.rs`

### Vấn đề:
Lệnh `git rebase -i HEAD~N` bằng dòng lệnh terminal buộc dev phải sử dụng trình soạn thảo văn bản thô sơ (Vim, Nano), nhớ các ký tự viết tắt (`p`, `r`, `s`, `f`, `d`) và rất dễ gây lỗi nếu xóa nhầm dòng.

### Giao diện Timeline của FlowGit:
Mở modal Interactive Rebase bằng cách nhấp chuột phải vào một commit làm mốc cơ sở (Base):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔀 INTERACTIVE REBASE TIMELINE                                              │
│                                                                             │
│ ☰  [Pick ▼]   a1b2c3d  feat(auth): thêm xác thực thiết bị GitHub            │
│ ☰  [Reword ▼] 4e5f6g7  sửa lại css phần nút bấm                             │
│ ☰  [Squash ▼] 8h9i0j1  wip: test thêm chút                                  │
│ ☰  [Fixup ▼]  2k3l4m5  fix typo file readme                                 │
│ ☰  [Drop ▼]   6n7o8p9  thử nghiệm tính năng bỏ                              │
│                                                                             │
│ [Hủy bỏ]                                           [Bắt đầu thực thi Rebase]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Các hành động được hỗ trợ:
1. **Kéo thả đổi vị trí (Reorder):** Giữ chuột vào biểu tượng `☰` để đổi thứ tự thực thi commit.
2. **`Pick`:** Giữ nguyên commit.
3. **`Reword`:** Sửa lại commit message trực tiếp trên giao diện mà không sửa code.
4. **`Squash`:** Gộp commit vào commit liền trước và tổng hợp nội dung commit message.
5. **`Fixup`:** Gộp vào commit trước nhưng tự động bỏ qua message của commit hiện tại.
6. **`Drop`:** Xóa bỏ hoàn toàn commit đó ra khỏi chuỗi lịch sử.

---

## 🎯 2. KÉO - THẢ TRỰC TIẾP TRÊN ĐỒ THỊ (DRAG & DROP)

Component: `src/lib/components/DropActionModal.svelte`

FlowGit cho phép tương tác tự nhiên như kéo thả tệp tin trên desktop:
- **Thao tác:** Giữ chuột vào một node commit trên Đồ thị ➔ Kéo và thả vào đỉnh của một nhánh khác.
- **Hộp thoại hành động thông minh:** Ngay khi thả chuột, một popup nổi hiển thị 3 lựa chọn trực quan:
  1. **Cherry-pick Commit này:** Lấy riêng thay đổi của commit này áp dụng vào nhánh đích.
  2. **Merge vào Nhánh này:** Thực hiện gộp nhánh với commit merge mới.
  3. **Rebase lên Nhánh này:** Đặt toàn bộ chuỗi nhánh hiện tại lên đỉnh nhánh đích.
- **Dry-run Conflict Preview:** Nếu backend phát hiện sẽ xảy ra conflict, một huy hiệu cảnh báo màu cam sẽ xuất hiện ngay trong hộp thoại trước khi bạn bấm nút xác nhận.

---

## 📦 3. GỘP COMMITS TRONG 1 GIÂY (1-CLICK SQUASH)

Component: `src/lib/components/SquashModal.svelte`

### Nỗi đau thực tế trong doanh nghiệp:
Trước khi tạo Pull Request, Team Lead thường yêu cầu dev phải gộp 50-100 commits nháp (`fix typo`, `test`, `wip`) thành 1 commit duy nhất mang tên tính năng hoàn chỉnh. Làm thủ công bằng dòng lệnh mất cả chục phút.

### Trải nghiệm trên FlowGit:
1. Bôi đen (giữ phím Shift hoặc Ctrl và click chuột) các node commit cần gộp trên đồ thị.
2. Bấm phím tắt **`S`** (hoặc nhấp chuột phải chọn **"Squash Commits"**).
3. Hộp thoại SquashModal tự động tổng hợp toàn bộ message của các commit được chọn thành một danh sách gạch đầu dòng tiện lợi.
4. Bạn gõ lại commit message cuối cùng (hoặc bấm nút **"AI Generate"** để AI tóm tắt) và bấm **"Squash Now"**.
5. Toàn bộ chuỗi commit được gộp sạch sẽ trong **đúng 1 giây**!

---

## ↩️ 4. ĐẢO NGƯỢC COMMIT AN TOÀN (REVERT COMMIT)

- Chuột phải vào bất kỳ commit nào trong lịch sử ➔ Chọn **"Revert Commit"**.
- Hệ thống gọi `git2::Repository::revert` để tạo một commit mới có nội dung đảo ngược chính xác những gì commit cũ đã làm.
- **Tại sao nên dùng Revert thay vì Reset?**  
  Khi commit đã được đẩy lên nhánh chung của team (`main`, `develop`), việc Revert là chuẩn mực vì nó không viết lại lịch sử (không cần `push --force`), bảo đảm các thành viên khác không bị vỡ nhánh.

---

## 🔄 5. RESET HEAD TO COMMIT (3 CHẾ ĐỘ CÓ BẢO HIỂM)

Khi cần đưa nhánh hiện tại quay về một mốc commit trong quá khứ:
- **Soft Reset (`--soft`):** Đưa con trỏ HEAD về commit cũ, giữ nguyên toàn bộ các thay đổi ở dạng **Staged**. Thích hợp khi muốn commit lại toàn bộ từ đầu.
- **Mixed Reset (`--mixed` - Mặc định):** Đưa HEAD về commit cũ, đưa các thay đổi về dạng **Unstaged** trong Working Tree.
- **Hard Reset (`--hard`):** Xóa sạch toàn bộ thay đổi ở cả Working Tree và Index.  
  *(Đặc biệt: Khác với Git CLI sẽ làm mất code vĩnh viễn, trong FlowGit, mọi file bị xóa bởi Hard Reset đều được tự động lưu vào **Safe Discard 48h** và có thể hoàn tác ngay bằng **`Ctrl + Z`**).*

---

## 💣 6. XÓA VĨNH VIỄN TỆP KHỎI LỊCH SỬ (NUKE HISTORY)

Component: `src/lib/components/NukeHistoryModal.svelte`

Khi vô tình commit nhầm file chứa Secret Key, Token API, Mật khẩu cơ sở dữ liệu hoặc file nặng hàng trăm MB:
- Việc xóa file ở commit mới không giải quyết được vấn đề vì file vẫn nằm trong lịch sử Git cũ.
- Mở **Nuke History Modal**, nhập đường dẫn tệp cần thanh trừng.
- FlowGit sẽ tái cấu trúc toàn bộ cây commit (`nuke_file_from_history`), xóa sạch tệp đó ra khỏi tất cả các commit từ trước đến nay một cách triệt để.
