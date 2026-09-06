#!/usr/bin/env node
/**
 * bump-version.mjs
 * Đồng bộ version giữa package.json, Cargo.toml và tauri.conf.json.
 *
 * Cách dùng:
 *   node scripts/bump-version.mjs 0.2.0
 *   npm run bump 0.2.0
 *
 * Sau khi chạy xong, script sẽ in lệnh git tag cần thực hiện tiếp theo.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Validate đầu vào ─────────────────────────────────────────────────────────

const newVersion = process.argv[2];
if (!newVersion) {
  console.error('❌  Thiếu version. Dùng: npm run bump <version>');
  console.error('    Ví dụ: npm run bump 0.2.0');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(newVersion)) {
  console.error(`❌  Version không hợp lệ: "${newVersion}"`);
  console.error('    Phải theo dạng semver: MAJOR.MINOR.PATCH (ví dụ: 0.2.0)');
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJSON(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function readText(filePath) {
  return readFileSync(filePath, 'utf-8');
}

function writeText(filePath, content) {
  writeFileSync(filePath, content, 'utf-8');
}

// ─── Cập nhật package.json ────────────────────────────────────────────────────

const pkgPath = resolve(ROOT, 'package.json');
const pkg = readJSON(pkgPath);
const oldVersion = pkg.version;
pkg.version = newVersion;
writeJSON(pkgPath, pkg);
console.log(`✅  package.json:          ${oldVersion} → ${newVersion}`);

// ─── Cập nhật Cargo.toml ──────────────────────────────────────────────────────
// (tauri.conf.json không cần cập nhật – nó đọc trực tiếp từ package.json)

const cargoPath = resolve(ROOT, 'src-tauri', 'Cargo.toml');
let cargoContent = readText(cargoPath);

// Chỉ thay version trong section [package] (dòng đầu có version = "...")
const cargoVersionRegex = /^(version\s*=\s*)"[\d.\-\w]+"$/m;
const match = cargoContent.match(cargoVersionRegex);
if (!match) {
  console.error('❌  Không tìm thấy trường version trong Cargo.toml');
  process.exit(1);
}

const oldCargoVersion = match[0].match(/"([\d.\-\w]+)"/)[1];
cargoContent = cargoContent.replace(cargoVersionRegex, `$1"${newVersion}"`);
writeText(cargoPath, cargoContent);
console.log(`✅  Cargo.toml:            ${oldCargoVersion} → ${newVersion}`);

// ─── Hướng dẫn tiếp theo ─────────────────────────────────────────────────────

console.log('');
console.log('-'.repeat(55));
console.log(`🚀  Phiên bản đã được đồng bộ lên v${newVersion}`);
console.log('');
console.log('   Bước tiếp theo để phát hành:');
console.log('');
console.log(`   git add package.json src-tauri/Cargo.toml`);
console.log(`   git commit -m "chore: bump version to v${newVersion}"`);
console.log(`   git tag v${newVersion}`);
console.log(`   git push && git push origin v${newVersion}`);
console.log('');
console.log('   → GitHub Actions sẽ tự động build & publish release.');
console.log('-'.repeat(55));

