import { invoke } from '@tauri-apps/api/core';
import type { BisectStatus } from '../types';
import { isTauri } from './client';

export async function startBisect(
  path: string,
  badCommitId: string,
  goodCommitId: string
): Promise<BisectStatus> {
  if (isTauri) {
    return await invoke<BisectStatus>('start_bisect', {
      path,
      badCommitId,
      goodCommitId,
    });
  }
  return {
    is_active: true,
    bad_commit_id: badCommitId,
    good_commit_ids: [goodCommitId],
    current_commit_id: 'mock-midpoint-sha-123',
    current_commit_summary: 'Refactor state runes and handlers',
    current_commit_author: 'FlowGit Dev',
    estimated_steps_remaining: 3,
    tested_commits_count: 0,
    total_commits_count: 8,
  };
}

export async function bisectStep(
  path: string,
  isGood: boolean
): Promise<BisectStatus> {
  if (isTauri) {
    return await invoke<BisectStatus>('bisect_step', { path, isGood });
  }
  return {
    is_active: false,
    good_commit_ids: [],
    estimated_steps_remaining: 0,
    tested_commits_count: 3,
    total_commits_count: 8,
    culprit_commit_id: 'mock-culprit-commit-abc456',
  };
}

export async function abortBisect(path: string): Promise<void> {
  if (isTauri) {
    await invoke('abort_bisect', { path });
  }
}

export async function getBisectStatus(path: string): Promise<BisectStatus> {
  if (isTauri) {
    return await invoke<BisectStatus>('get_bisect_status', { path });
  }
  return {
    is_active: false,
    good_commit_ids: [],
    estimated_steps_remaining: 0,
    tested_commits_count: 0,
    total_commits_count: 0,
  };
}
