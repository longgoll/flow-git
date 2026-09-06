# Quy Trình Quản Lý Phiên Bản (Version Management)

> **Nguồn sự thật duy nhất:** `package.json` → mọi nơi khác đọc từ đây.

---

## Nguyên tắc cốt lõi

Dự án sử dụng **một nguồn sự thật duy nhất** cho version:

```
📄 package.json  ←── CHỈ sửa ở đây
        │
        ├──▶ tauri.conf.json    (Tauri v2 native: "version": "../package.json")
        │        └──▶ App Tauri tự đọc khi build
        │
        ├──▶ Cargo.toml         (sync bởi npm run bump)
        │
        ├──▶ Frontend Svelte    (vite.config.ts define: APP_VERSION)
        │        └──▶ Dùng ngay: APP_VERSION hoặc import.meta.env.VITE_APP_VERSION
        │
        ├──▶ Website HTML       (fetch GitHub API /releases/latest → TỰ ĐỘNG ✅)
        │
        └──▶ README badges      (shields.io trỏ GitHub release → TỰ ĐỘNG ✅)
```

**Nghiêm cấm** hardcode version string (ví dụ `"0.1.0"`) ở bất kỳ đâu ngoài `package.json`.

---

## Cách sử dụng version trong Frontend Svelte

```svelte
<!-- Bất kỳ .svelte component nào – không cần import gì cả -->
<span>v{APP_VERSION}</span>

<!-- Hoặc dùng cú pháp import.meta.env nếu muốn tường minh -->
<span>v{import.meta.env.VITE_APP_VERSION}</span>
```

Cả hai đều trỏ về `version` trong `package.json` tại **compile-time**,
được inject qua `vite.config.ts` → `define: { APP_VERSION }`.

---

## Quy trình phát hành phiên bản mới

### Bước 1 – Bump version (2 file tự động)

```bash
npm run bump 0.2.0
```

Script này sẽ:
- ✅ Cập nhật `package.json` → `"version": "0.2.0"`
- ✅ Cập nhật `src-tauri/Cargo.toml` → `version = "0.2.0"`
- ℹ️ `tauri.conf.json` KHÔNG cần cập nhật (đọc từ `package.json` tự động)
- ℹ️ Frontend KHÔNG cần cập nhật (inject tại build time bởi Vite)
- ℹ️ Website KHÔNG cần cập nhật (fetch GitHub API khi page load)

### Bước 2 – Commit và tag

```bash
git add package.json src-tauri/Cargo.toml
git commit -m "chore: bump version to v0.2.0"
git tag v0.2.0
git push && git push origin v0.2.0
```

### Bước 3 – CI/CD tự động hoàn tất

GitHub Actions (`release.yml`) sẽ tự động:
1. Build cho Windows, macOS (ARM + Intel), Ubuntu
2. Ký số bằng Minisign private key
3. Publish GitHub Release kèm `latest.json` cho auto-updater
4. Generate release notes từ `git log` giữa 2 tag

---

## Cơ chế kỹ thuật

### `tauri.conf.json` – Tauri v2 Native Path Reference

```json
{
  "version": "../package.json"
}
```

Tauri CLI v2 hỗ trợ natively: khi gặp một path `.json`, nó đọc trường `version` từ file đó.
Không cần plugin hay script bổ sung.

### `vite.config.ts` – Compile-time Injection

```ts
import pkg from './package.json' assert { type: 'json' };

export default defineConfig({
  define: {
    APP_VERSION: JSON.stringify(pkg.version),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
});
```

`APP_VERSION` được replace tĩnh tại build time (giống `#define` trong C).
TypeScript type được khai báo trong `src/vite-env.d.ts`.

### Auto-Updater – Tauri Plugin Updater v2

- **Endpoint:** `https://github.com/longgoll/flow-git/releases/latest/download/latest.json`
- **Ký số:** Minisign (`flowgit.key`) – public key lưu trong `tauri.conf.json`
- **Check tự động:** Mỗi lần mở app (sau 3 giây), sau đó mỗi **4 giờ** định kỳ
- **Check thủ công:** Toolbar → More Menu → "Kiểm tra bản cập nhật"

### Website – GitHub API Live

`website/main.js` gọi `api.github.com/repos/longgoll/flow-git/releases/latest`:
- Lấy `data.tag_name` → hiển thị version badge
- Lấy `.exe` / `.msi` asset → điền link download button
- Hoàn toàn tự động sau mỗi lần release, **không cần deploy lại website**

---

## Các file liên quan

| File | Vai trò |
|---|---|
| [`package.json`](../../package.json) | ⭐ Nguồn sự thật – chỉ sửa ở đây |
| [`scripts/bump-version.mjs`](../../scripts/bump-version.mjs) | Script sync version 2 file |
| [`vite.config.ts`](../../vite.config.ts) | Inject `APP_VERSION` vào frontend |
| [`src/vite-env.d.ts`](../../src/vite-env.d.ts) | TypeScript type cho `APP_VERSION` |
| [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json) | Trỏ `"version": "../package.json"` |
| [`src-tauri/Cargo.toml`](../../src-tauri/Cargo.toml) | Sync bởi `npm run bump` |
| [`src/lib/state/updateState.svelte.ts`](../../src/lib/state/updateState.svelte.ts) | State + logic auto-updater |
| [`src/lib/components/UpdateModal.svelte`](../../src/lib/components/UpdateModal.svelte) | Modal UI cập nhật |
| [`.github/workflows/release.yml`](../../.github/workflows/release.yml) | CI/CD build & publish |
| [`website/main.js`](../../website/main.js) | Fetch version từ GitHub API |

---

## Validation nhanh

```bash
# Kiểm tra version hiện tại đồng bộ không?
node -e "
  const pkg = require('./package.json');
  const cargo = require('fs').readFileSync('./src-tauri/Cargo.toml', 'utf8');
  const cargoVer = cargo.match(/^version\s*=\s*\"([^\"]+)\"/m)?.[1];
  console.log('package.json:', pkg.version);
  console.log('Cargo.toml:  ', cargoVer);
  console.log('In sync:', pkg.version === cargoVer ? '✅' : '❌');
"
```
