# 📰 FlowGit Content Hub & Release Articles
### Trung Tâm Quản Lý Bài Viết Truyền Thông & Cập Nhật Phiên Bản

Thư mục này lưu trữ toàn bộ các bài viết chia sẻ, bài đăng blog công nghệ, và các bài thông báo cập nhật phiên bản (Release Announcements) của **FlowGit** trên các nền tảng:
- **Quốc tế:** [Dev.to](https://dev.to), [Hashnode](https://hashnode.com), [Reddit](https://reddit.com) (`r/rust`, `r/sveltejs`, `r/programming`), [Hacker News](https://news.ycombinator.com), [Product Hunt](https://producthunt.com), [X / Twitter](https://twitter.com).
- **Việt Nam:** [Viblo.asia](https://viblo.asia), Các nhóm Lập trình viên / Rust / Web Dev / Frontend Việt Nam trên Facebook.

---

## 📅 Quy Chuẩn Đặt Tên Tệp (Naming Convention)

Để dễ quản lý theo thời gian và phiên bản, mọi bài viết được đặt tên theo định dạng:

```text
YYYY-MM-DD-v<version>-<slug>.<lang>.md
```

**Ví dụ:**
- `2026-09-10-v0.1.3-introducing-flowgit-rust-svelte.en.md` (Bài ra mắt v0.1.3 Tiếng Anh)
- `2026-09-10-v0.1.3-introducing-flowgit-rust-svelte.vi.md` (Bài ra mắt v0.1.3 Tiếng Việt)
- `2026-10-01-v0.2.0-monorepo-sparse-and-ai-commits.en.md` (Bài cập nhật tính năng mới v0.2.0)

---

## 🗂️ Danh Sách Bài Viết Đã Lên Kế Hoạch & Xuất Bản

| Ngày đăng | Phiên bản | Tiêu đề bài viết | Nền tảng | Trạng thái |
| :--- | :---: | :--- | :---: | :---: |
| **2026-09-10** | `v0.1.3` | **Full Showcase:** [FlowGit: The Ultimate Visual Git Client — Full Architectural & Feature Deep Dive](./2026-09-10-v0.1.3-flowgit-the-ultimate-visual-git-client-full-showcase.en.md) | Dev.to, Hashnode, Hacker News | 🚀 Ready to Publish |
| **2026-09-10** | `v0.1.3` | **Toàn diện:** [FlowGit: Git Client Đột Phá — 18 Phân Khu Tính Năng, Lõi Rust & Vượt Trội Thị Trường](./2026-09-10-v0.1.3-flowgit-the-ultimate-visual-git-client-full-showcase.vi.md) | Viblo, Facebook Tech Groups | 🚀 Ready to Publish |
| **2026-09-10** | `v0.1.3` | **Fast Hook:** [I Built a Blazing-Fast, No-Fear Git Client in Rust & Svelte 5 (<85MB RAM)](./2026-09-10-v0.1.3-introducing-flowgit-rust-svelte.en.md) | Dev.to, Reddit r/rust | 🚀 Ready to Publish |
| **2026-09-10** | `v0.1.3` | **Bản ngắn:** [FlowGit: Git Client Lõi Rust & Svelte 5 Siêu Tốc (<85MB RAM) & Triết Lý "No-Fear Git"](./2026-09-10-v0.1.3-introducing-flowgit-rust-svelte.vi.md) | Viblo, Tech Blogs | 🚀 Ready to Publish |
| *Tương lai* | `v0.2.0` | *Dùng file mẫu `_template.md` để viết khi ra mắt tính năng lớn tiếp theo* | Dev.to | 📝 Kế hoạch |

---

## 💡 Chiến Lược Đăng Bài Định Kỳ Để Thu Hút Cộng Đồng (Dev Marketing Guide)

1. **Chu kỳ đăng bài:**
   - **Bài Ra Mắt Lớn (Major Launch):** Đăng vào giữa tuần (Thứ Ba hoặc Thứ Tư, khung giờ 8h-10h sáng giờ Mỹ / 20h-22h giờ VN) để đạt tương tác cao nhất trên Dev.to & Reddit.
   - **Bài Devlog / Kỹ thuật chuyên sâu (Deep Dive):** 2–3 tuần một bài (ví dụ: *"Cách chúng tôi vẽ 100k commits ở 60 FPS bằng OffscreenCanvas và Web Worker"*, *"Bí kíp cứu dữ liệu uncommitted bằng SQLite và Rust"*).
   - **Release Update (Minor Bumps):** Mỗi khi bump version mới kèm tính năng hot, đăng bài ngắn changelog / spotlight tính năng đó.

2. **File mẫu bài viết mới:**
   - Khi có phiên bản mới, copy file [`_template.md`](./_template.md) thành tệp mới và điền thông tin.
