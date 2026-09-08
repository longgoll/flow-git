import { invoke } from '@tauri-apps/api/core';
import type { AutoBisectResult, BisectStatus } from '../types';
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

export async function runAutoBisect(
  path: string,
  script: string
): Promise<AutoBisectResult> {
  if (isTauri) {
    return await invoke<AutoBisectResult>('run_auto_bisect', { path, script });
  }
  return {
    status: {
      is_active: false,
      good_commit_ids: [],
      estimated_steps_remaining: 0,
      tested_commits_count: 2,
      total_commits_count: 5,
      culprit_commit_id: 'mock-culprit-id-789',
    },
    logs: [
      {
        step: 1,
        commit_id: 'commit-1-test',
        commit_summary: 'Initial test commit',
        command: script,
        exit_code: 0,
        is_good: true,
        stdout_snippet: 'Tests passed successfully',
        stderr_snippet: '',
      },
    ],
    completed: true,
    message: 'Mock auto-bisect complete.',
  };
}

