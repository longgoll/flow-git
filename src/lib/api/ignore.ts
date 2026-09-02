import { invoke } from '@tauri-apps/api/core';

/**
 * Thêm một pattern vào .gitignore của repository
 */
export async function addToGitignore(path: string, pattern: string): Promise<void> {
  return await invoke<void>('add_to_gitignore', { path, pattern });
}

/**
 * Tự động phân tích stack dự án và sinh bộ quy tắc .gitignore chuẩn
 */
export async function generateStandardGitignore(path: string): Promise<string[]> {
  return await invoke<string[]>('generate_standard_gitignore', { path });
}
