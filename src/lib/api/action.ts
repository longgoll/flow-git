import { invoke } from '@tauri-apps/api/core';
import type { ActionRecord, ConflictSimulationResult, RebaseExecutionResult, RebaseTodoItem, ReflogEntry, RepoOperationState, SecretFinding } from '../types';
import { isTauri } from './client';

export async function createCommit(
  path: string,
  message: string,
  authorName?: string,
  authorEmail?: string,
  amend: boolean = false,
  noVerify: boolean = false
): Promise<string> {
  if (isTauri) {
    return await invoke<string>('create_commit', {
      path,
      message,
      authorName,
      authorEmail,
      amend,
      noVerify,
    });
  }
  return 'mock_new_commit_sha_12345';
}

export async function simulateDragAction(
  path: string,
  sourceCommitId: string,
  targetCommitId: string
): Promise<ConflictSimulationResult> {
  if (isTauri) {
    return await invoke<ConflictSimulationResult>('simulate_drag_action', {
      path,
      sourceCommitId,
      targetCommitId,
    });
  }
  return {
    has_conflicts: false,
    conflict_files: [],
    is_fast_forward: true,
    source_id: sourceCommitId,
    target_id: targetCommitId,
    ahead_count: 1,
    behind_count: 0,
  };
}

export async function executeCherryPick(
  path: string,
  commitId: string
): Promise<string> {
  if (isTauri) {
    return await invoke<string>('execute_cherry_pick_commit', {
      path,
      commitId,
    });
  }
  return 'mock-cherry-picked-sha';
}

export async function executeMerge(
  path: string,
  sourceRefOrId: string,
  message?: string
): Promise<string> {
  if (isTauri) {
    return await invoke<string>('execute_merge_commit', {
      path,
      sourceRefOrId,
      message,
    });
  }
  return 'mock-merged-sha';
}

export async function executeRebase(
  path: string,
  upstream: string
): Promise<import('../types').RebaseExecutionResult> {
  if (isTauri) {
    return await invoke<import('../types').RebaseExecutionResult>('execute_rebase_branch', {
      path,
      upstream,
    });
  }
  return {
    status: 'completed',
    message: `Mock rebase onto ${upstream} succeeded.`,
    head_commit_id: 'mock-rebased-sha',
    conflicted_files: [],
  };
}

export async function continueRebase(
  path: string
): Promise<import('../types').RebaseExecutionResult> {
  if (isTauri) {
    return await invoke<import('../types').RebaseExecutionResult>('continue_rebase_branch', {
      path,
    });
  }
  return {
    status: 'completed',
    message: 'Mock continue rebase succeeded.',
    head_commit_id: 'mock-rebased-sha',
    conflicted_files: [],
  };
}

export async function checkIsRebasing(path: string): Promise<boolean> {
  if (isTauri) {
    return await invoke<boolean>('check_is_rebasing', { path });
  }
  return false;
}

export async function getRepoOperationState(path: string): Promise<RepoOperationState> {
  if (isTauri) {
    return await invoke<RepoOperationState>('get_repo_operation_state', { path });
  }
  return { type: 'Normal' };
}

export async function abortCurrentOperation(path: string): Promise<string> {
  if (isTauri) {
    return await invoke<string>('abort_current_operation', { path });
  }
  return 'Operation aborted.';
}

export async function skipRebaseStep(path: string): Promise<{
  status: string;
  message: string;
  head_commit_id?: string;
  conflicted_files: string[];
}> {
  if (isTauri) {
    return await invoke('skip_rebase_step', { path });
  }
  return {
    status: 'completed',
    message: 'Rebase step skipped.',
    conflicted_files: [],
  };
}

export async function listActions(
  path: string,
  limit?: number
): Promise<ActionRecord[]> {
  if (isTauri) {
    return await invoke<ActionRecord[]>('list_actions', { path, limit });
  }
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      id: 1,
      repo_path: path,
      action_type: 'commit',
      description: 'Commit: feat(graph): add living offscreen canvas bezier curves',
      previous_head: '0000000',
      new_head: 'a1b2c3d',
      branch_name: 'main',
      severity: 'safe',
      timestamp: now - 120,
      is_undone: false,
    },
    {
      id: 2,
      repo_path: path,
      action_type: 'merge',
      description: 'Merge feature/drag-drop into main',
      previous_head: 'a1b2c3d',
      new_head: 'e5f6a7b',
      branch_name: 'main',
      severity: 'moderate',
      timestamp: now - 30,
      is_undone: false,
    },
  ];
}

export async function undoAction(path: string): Promise<ActionRecord> {
  if (isTauri) {
    return await invoke<ActionRecord>('undo_action', { path });
  }
  return {
    id: 2,
    repo_path: path,
    action_type: 'undo',
    description: 'Undid Merge feature/drag-drop',
    previous_head: 'a1b2c3d',
    new_head: 'a1b2c3d',
    severity: 'safe',
    timestamp: Math.floor(Date.now() / 1000),
    is_undone: true,
  };
}

export async function redoAction(path: string): Promise<ActionRecord> {
  if (isTauri) {
    return await invoke<ActionRecord>('redo_action', { path });
  }
  return {
    id: 2,
    repo_path: path,
    action_type: 'redo',
    description: 'Redid Merge feature/drag-drop',
    previous_head: 'a1b2c3d',
    new_head: 'e5f6a7b',
    severity: 'safe',
    timestamp: Math.floor(Date.now() / 1000),
    is_undone: false,
  };
}

export async function timeTravelTo(
  path: string,
  actionId: number
): Promise<ActionRecord> {
  if (isTauri) {
    return await invoke<ActionRecord>('time_travel_to', { path, actionId });
  }
  return {
    id: actionId,
    repo_path: path,
    action_type: 'time_travel',
    description: `Time traveled to action #${actionId}`,
    previous_head: 'a1b2c3d',
    new_head: 'a1b2c3d',
    severity: 'safe',
    timestamp: Math.floor(Date.now() / 1000),
    is_undone: false,
  };
}

export async function revertCommit(
  path: string,
  commitId: string
): Promise<string> {
  if (isTauri) {
    return await invoke<string>('revert_commit', { path, commitId });
  }
  return 'mock-reverted-sha';
}

export async function resetToCommit(
  path: string,
  commitId: string,
  mode: 'soft' | 'mixed' | 'hard'
): Promise<string> {
  if (isTauri) {
    return await invoke<string>('reset_to_commit', { path, commitId, mode });
  }
  return commitId;
}

export async function createTag(
  path: string,
  tagName: string,
  targetCommitId: string,
  message?: string
): Promise<string> {
  if (isTauri) {
    return await invoke<string>('create_tag', { path, tagName, targetCommitId, message });
  }
  return 'mock-tag-oid';
}

export async function deleteTag(
  path: string,
  tagName: string
): Promise<void> {
  if (isTauri) {
    await invoke<void>('delete_tag', { path, tagName });
  }
}

export async function squashCommits(
  path: string,
  commitIds: string[],
  message: string
): Promise<string> {
  if (isTauri) {
    return await invoke<string>('squash_commits', { path, commitIds, message });
  }
  return 'mock-squashed-sha';
}

export async function prepareInteractiveRebase(
  path: string,
  ontoCommitId: string
): Promise<RebaseTodoItem[]> {
  if (isTauri) {
    return await invoke<RebaseTodoItem[]>('prepare_interactive_rebase', { path, ontoCommitId });
  }
  return [];
}

export async function executeInteractiveRebase(
  path: string,
  ontoCommitId: string,
  todos: RebaseTodoItem[]
): Promise<RebaseExecutionResult> {
  if (isTauri) {
    return await invoke<RebaseExecutionResult>('execute_interactive_rebase', { path, ontoCommitId, todos });
  }
  return {
    status: 'completed',
    message: 'Mock interactive rebase succeeded.',
    conflicted_files: [],
  };
}

export async function scanStagedSecrets(path: string): Promise<SecretFinding[]> {
  if (isTauri) {
    return await invoke<SecretFinding[]>('scan_staged_secrets', { path });
  }
  return [];
}

export async function getReflogEntries(
  path: string,
  limit?: number
): Promise<ReflogEntry[]> {
  if (isTauri) {
    return await invoke<ReflogEntry[]>('get_reflog_entries', { path, limit });
  }
  return [];
}

export async function restoreLostCommit(
  path: string,
  commitId: string,
  branchName: string
): Promise<string> {
  if (isTauri) {
    return await invoke<string>('restore_lost_commit', {
      path,
      commitId,
      branchName,
    });
  }
  return `refs/heads/${branchName}`;
}

