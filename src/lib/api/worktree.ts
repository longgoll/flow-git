import { invoke } from '@tauri-apps/api/core';
import type { WorktreeInfo } from '../types';
import { isTauri } from './client';

export async function listWorktrees(path: string): Promise<WorktreeInfo[]> {
  if (isTauri) {
    return await invoke<WorktreeInfo[]>('list_worktrees', { path });
  }
  return [
    {
      name: 'main',
      path,
      is_locked: false,
      branch_name: 'main',
      is_main: true,
    },
  ];
}

export async function createWorktree(
  path: string,
  name: string,
  targetPath: string,
  branchName?: string
): Promise<WorktreeInfo> {
  if (isTauri) {
    return await invoke<WorktreeInfo>('create_worktree', {
      path,
      name,
      targetPath,
      branchName,
    });
  }
  return {
    name,
    path: targetPath,
    is_locked: false,
    branch_name: branchName,
    is_main: false,
  };
}

export async function deleteWorktree(path: string, name: string): Promise<void> {
  if (isTauri) {
    await invoke('delete_worktree', { path, name });
  }
}
