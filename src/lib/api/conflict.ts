import { invoke } from '@tauri-apps/api/core';
import type { ConflictFileDetail } from '../types';
import { isTauri } from './client';

export async function getConflictedFiles(path: string): Promise<string[]> {
  if (isTauri) {
    return await invoke<string[]>('get_conflicted_files', { path });
  }
  return ['src/lib/components/Toolbar.svelte'];
}

export async function getConflictDetails(
  path: string,
  filePath: string
): Promise<ConflictFileDetail> {
  if (isTauri) {
    return await invoke<ConflictFileDetail>('get_conflict_details', {
      path,
      filePath,
    });
  }
  return {
    path: filePath,
    base_content: 'export const version = "1.0.0";\nexport const theme = "dark";',
    our_content: 'export const version = "1.1.0-main";\nexport const theme = "dark";\nexport const safeMode = true;',
    their_content: 'export const version = "1.2.0-feature";\nexport const theme = "light";\nexport const safeMode = false;',
    chunks: [
      {
        chunk_index: 0,
        is_conflict: true,
        base_content: 'export const version = "1.0.0";\nexport const theme = "dark";',
        our_content: 'export const version = "1.1.0-main";\nexport const theme = "dark";\nexport const safeMode = true;',
        their_content: 'export const version = "1.2.0-feature";\nexport const theme = "light";\nexport const safeMode = false;',
      },
    ],
    is_resolved: false,
  };
}

export async function resolveConflictFile(
  path: string,
  filePath: string,
  resolvedContent: string
): Promise<void> {
  if (isTauri) {
    await invoke('resolve_conflict_file', {
      path,
      filePath,
      resolvedContent,
    });
  }
}

export async function abortMergeOrRebase(path: string): Promise<void> {
  if (isTauri) {
    await invoke('abort_merge_or_rebase', { path });
  }
}
