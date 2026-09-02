import { invoke } from '@tauri-apps/api/core';
import type { HeavyFileInfo, LockedFileInfo } from '../types';
import { isTauri } from './client';

export async function isIndexLocked(path: string): Promise<boolean> {
  if (isTauri) {
    return await invoke<boolean>('is_index_locked', { path });
  }
  return false;
}

export async function clearIndexLock(path: string): Promise<boolean> {
  if (isTauri) {
    return await invoke<boolean>('clear_index_lock', { path });
  }
  return true;
}

export async function checkFileLocks(
  path: string,
  filePaths: string[]
): Promise<LockedFileInfo[]> {
  if (isTauri) {
    return await invoke<LockedFileInfo[]>('check_file_locks', { path, filePaths });
  }
  return filePaths.map((p) => ({ path: p, is_locked: false }));
}

export async function scanHeavyFiles(
  path: string,
  thresholdMb: number = 50
): Promise<HeavyFileInfo[]> {
  if (isTauri) {
    return await invoke<HeavyFileInfo[]>('scan_heavy_files', { path, thresholdMb });
  }
  return [];
}

export async function shelveUntrackedFiles(
  path: string,
  paths: string[]
): Promise<number> {
  if (isTauri) {
    return await invoke<number>('shelve_untracked_files', { path, paths });
  }
  return paths.length;
}
