import { invoke } from '@tauri-apps/api/core';
import type { LfsSummary, SubmoduleInfo } from '../types';
import { isTauri } from './client';

// -------------------------------------------------------------
// Git Submodules API
// -------------------------------------------------------------
export async function getSubmodules(path: string): Promise<SubmoduleInfo[]> {
  if (isTauri) {
    return await invoke<SubmoduleInfo[]>('get_submodules', { path });
  }
  return [];
}

export async function updateSubmodules(
  path: string,
  name?: string,
  recursive = true
): Promise<string> {
  if (isTauri) {
    return await invoke<string>('update_submodules', { path, name, recursive });
  }
  return 'Submodules updated successfully (mock)';
}

export async function syncSubmodules(path: string, name?: string): Promise<string> {
  if (isTauri) {
    return await invoke<string>('sync_submodules', { path, name });
  }
  return 'Submodules synced successfully (mock)';
}

// -------------------------------------------------------------
// Git LFS API
// -------------------------------------------------------------
export async function getLfsInfo(path: string): Promise<LfsSummary> {
  if (isTauri) {
    return await invoke<LfsSummary>('get_lfs_info', { path });
  }
  return {
    is_lfs_enabled: false,
    tracked_patterns: [],
    files: [],
    locks: [],
  };
}

export async function pullLfsFiles(path: string, pattern?: string): Promise<string> {
  if (isTauri) {
    return await invoke<string>('pull_lfs_files', { path, pattern });
  }
  return 'Git LFS files pulled successfully (mock)';
}

export async function lockLfsFile(path: string, filePath: string): Promise<string> {
  if (isTauri) {
    return await invoke<string>('lock_lfs_file', { path, filePath });
  }
  return `Locked ${filePath} (mock)`;
}

export async function unlockLfsFile(path: string, filePath: string, force = false): Promise<string> {
  if (isTauri) {
    return await invoke<string>('unlock_lfs_file', { path, filePath, force });
  }
  return `Unlocked ${filePath} (mock)`;
}
