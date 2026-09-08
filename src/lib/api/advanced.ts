import { invoke } from '@tauri-apps/api/core';
import type { LfsSummary, SparseCheckoutInfo, SubmoduleDiffResult, SubmoduleInfo } from '../types';
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

export async function getSubmoduleDiff(path: string, name: string): Promise<SubmoduleDiffResult> {
  if (isTauri) {
    return await invoke<SubmoduleDiffResult>('get_submodule_diff', { path, name });
  }
  return {
    name,
    path: `submodules/${name}`,
    full_path: `/mock/path/submodules/${name}`,
    diff: 'diff --git a/file.txt b/file.txt\n+ mock line added in submodule',
    modified_files: ['file.txt'],
  };
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

export async function trackLfsPattern(path: string, pattern: string): Promise<string> {
  if (isTauri) {
    return await invoke<string>('track_lfs_pattern', { path, pattern });
  }
  return `Tracking pattern: ${pattern} (mock)`;
}

export async function untrackLfsPattern(path: string, pattern: string): Promise<string> {
  if (isTauri) {
    return await invoke<string>('untrack_lfs_pattern', { path, pattern });
  }
  return `Untracked pattern: ${pattern} (mock)`;
}

// -------------------------------------------------------------
// Git Sparse Checkout API (Monorepo)
// -------------------------------------------------------------
export async function getSparseCheckoutInfo(path: string): Promise<SparseCheckoutInfo> {
  if (isTauri) {
    return await invoke<SparseCheckoutInfo>('get_sparse_checkout_info', { path });
  }
  return {
    is_enabled: false,
    is_cone: true,
    patterns: [],
    available_directories: ['packages/ui', 'packages/core', 'apps/web', 'apps/mobile', 'docs'],
  };
}

export async function setSparseCheckout(path: string, patterns: string[], cone: boolean): Promise<string> {
  if (isTauri) {
    return await invoke<string>('set_sparse_checkout', { path, patterns, cone });
  }
  return `Sparse checkout set with ${patterns.length} pattern(s) (mock)`;
}

export async function disableSparseCheckout(path: string): Promise<string> {
  if (isTauri) {
    return await invoke<string>('disable_sparse_checkout', { path });
  }
  return 'Sparse checkout disabled (mock)';
}

export async function reapplySparseCheckout(path: string): Promise<string> {
  if (isTauri) {
    return await invoke<string>('reapply_sparse_checkout', { path });
  }
  return 'Sparse checkout reapplied (mock)';
}
