import { invoke } from '@tauri-apps/api/core';
import type { BranchInfo, FileDiffDetail, GitCredentials, SmartSyncResult, StashDetail, StashInfo, TagInfo } from '../types';
import { isTauri } from './client';
import { getMockBranches } from './mocks';

export async function getBranches(path: string): Promise<BranchInfo[]> {
  if (isTauri) {
    return await invoke<BranchInfo[]>('get_branches', { path });
  }
  return getMockBranches();
}

export async function deleteBranch(path: string, branchName: string, isRemote: boolean = false): Promise<void> {
  if (isTauri) {
    return await invoke<void>('delete_branch', { path, branchName, isRemote });
  }
}

export async function renameBranch(path: string, oldName: string, newName: string): Promise<void> {
  if (isTauri) {
    return await invoke<void>('rename_branch', { path, oldName, newName });
  }
}

export async function createBranch(
  path: string,
  newName: string,
  fromRef: string,
  checkout: boolean = true,
): Promise<void> {
  if (isTauri) {
    return await invoke<void>('create_branch', { path, newName, fromRef, checkout });
  }
}

export async function checkoutBranch(path: string, branchName: string): Promise<void> {
  if (isTauri) {
    return await invoke<void>('checkout_branch', { path, branchName });
  }
}

export async function getTags(path: string): Promise<TagInfo[]> {
  if (isTauri) {
    return await invoke<TagInfo[]>('get_tags', { path });
  }
  return [];
}

export async function getStashes(path: string): Promise<StashInfo[]> {
  if (isTauri) {
    return await invoke<StashInfo[]>('get_stashes', { path });
  }
  return [];
}

export async function stashSave(path: string, message: string, includeUntracked: boolean = true): Promise<string> {
  if (isTauri) {
    return await invoke<string>('stash_save', { path, message, includeUntracked });
  }
  return 'mock_stash_oid';
}

export async function stashApply(path: string, index: number): Promise<void> {
  if (isTauri) {
    await invoke('stash_apply', { path, index });
  }
}

export async function stashPop(path: string, index: number): Promise<void> {
  if (isTauri) {
    await invoke('stash_pop', { path, index });
  }
}

export async function stashDrop(path: string, index: number): Promise<void> {
  if (isTauri) {
    await invoke('stash_drop', { path, index });
  }
}

export async function getStashDetail(path: string, index: number): Promise<StashDetail> {
  if (isTauri) {
    return await invoke<StashDetail>('get_stash_detail', { path, index });
  }
  return {
    index,
    message: `WIP on main: mock stash ${index}`,
    commit_id: 'mock_stash_commit',
    branch_name: 'main',
    created_at: Math.floor(Date.now() / 1000) - 3600,
    files: [
      { path: 'src/App.svelte', status: 'modified', additions: 15, deletions: 4, is_untracked: false },
      { path: 'src/config.ts', status: 'added', additions: 8, deletions: 0, is_untracked: false },
    ],
    total_additions: 23,
    total_deletions: 4,
  };
}

export async function getStashFileDiff(
  path: string,
  index: number,
  filePath: string,
  ignoreWhitespace?: boolean
): Promise<FileDiffDetail> {
  if (isTauri) {
    return await invoke<FileDiffDetail>('get_stash_file_diff', {
      path,
      index,
      filePath,
      ignoreWhitespace,
    });
  }
  return {
    path: filePath,
    is_staged: false,
    is_binary: false,
    additions: 5,
    deletions: 2,
    hunks: [],
    original_content: '// Original code\nexport const val = 1;',
    modified_content: '// Modified in stash\nexport const val = 2;\nexport const extra = true;',
  };
}

export async function stashBranch(
  path: string,
  index: number,
  branchName: string
): Promise<BranchInfo> {
  if (isTauri) {
    return await invoke<BranchInfo>('stash_branch', { path, index, branchName });
  }
  return {
    name: `refs/heads/${branchName}`,
    shorthand: branchName,
    is_head: true,
    is_remote: false,
    ahead_count: 0,
    behind_count: 0,
    target_commit_id: 'mock_base_commit',
  };
}

export async function smartSync(
  path: string,
  remoteName?: string,
  branchName?: string,
  credentials?: GitCredentials
): Promise<SmartSyncResult> {
  if (isTauri) {
    return await invoke<SmartSyncResult>('smart_sync', {
      path,
      remoteName,
      branchName,
      credentials,
    });
  }
  return {
    branch_name: branchName || 'main',
    remote_name: remoteName || 'origin',
    status: 'Synced with remote successfully (Mock)',
  };
}

export async function getMergedBranches(
  path: string,
  baseBranch?: string
): Promise<string[]> {
  if (isTauri) {
    return await invoke<string[]>('get_merged_branches', { path, baseBranch });
  }
  return ['feature/old-dashboard', 'chore/cleanup-assets'];
}

export async function deleteMergedBranches(
  path: string,
  branchNames: string[]
): Promise<number> {
  if (isTauri) {
    return await invoke<number>('delete_merged_branches', { path, branchNames });
  }
  return branchNames.length;
}

