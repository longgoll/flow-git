import { invoke } from '@tauri-apps/api/core';
import type { BranchInfo, GitCredentials, SmartSyncResult, StashInfo, TagInfo } from '../types';
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

