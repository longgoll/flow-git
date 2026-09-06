import { invoke } from '@tauri-apps/api/core';
import type {
  BlameHunkItem,
  FileDiffDetail,
  FileHistoryItem,
  TrashSnapshotItem,
  WorkingTreeStatus,
} from '../types';
import { isTauri } from './client';
import { getMockFileDiff, getMockTrashSnapshots, getMockWorkingTreeStatus } from './mocks';

export async function getWorkingTreeStatus(path: string): Promise<WorkingTreeStatus> {
  if (isTauri) {
    return await invoke<WorkingTreeStatus>('get_status', { path });
  }
  return getMockWorkingTreeStatus();
}

export async function getFileDiff(
  path: string,
  filePath: string,
  staged: boolean,
  ignoreWhitespace?: boolean
): Promise<FileDiffDetail> {
  if (isTauri) {
    return await invoke<FileDiffDetail>('get_file_diff', { path, filePath, staged, ignoreWhitespace });
  }
  return getMockFileDiff(filePath, staged);
}

export async function getCommitFileDiff(
  path: string,
  commitId: string,
  filePath: string,
  ignoreWhitespace?: boolean
): Promise<FileDiffDetail> {
  if (isTauri) {
    return await invoke<FileDiffDetail>('get_commit_file_diff', { path, commitId, filePath, ignoreWhitespace });
  }
  return getMockFileDiff(filePath, false);
}

export async function stageFile(path: string, filePath: string): Promise<void> {
  if (isTauri) {
    await invoke('stage_file', { path, filePath });
  }
}

export async function unstageFile(path: string, filePath: string): Promise<void> {
  if (isTauri) {
    await invoke('unstage_file', { path, filePath });
  }
}

export async function stageAll(path: string): Promise<void> {
  if (isTauri) {
    await invoke('stage_all', { path });
  }
}

export async function unstageAll(path: string): Promise<void> {
  if (isTauri) {
    await invoke('unstage_all', { path });
  }
}

export async function stageHunk(path: string, filePath: string, hunkIndex: number): Promise<void> {
  if (isTauri) {
    await invoke('stage_hunk', { path, filePath, hunkIndex });
  }
}

export async function unstageHunk(path: string, filePath: string, hunkIndex: number): Promise<void> {
  if (isTauri) {
    await invoke('unstage_hunk', { path, filePath, hunkIndex });
  }
}

export async function discardFileChanges(path: string, filePath: string): Promise<number> {
  if (isTauri) {
    return await invoke<number>('discard_file_changes', { path, filePath });
  }
  return Date.now();
}

export async function discardAllChanges(path: string): Promise<number[]> {
  if (isTauri) {
    return await invoke<number[]>('discard_all_changes', { path });
  }
  return [];
}

export async function listTrashSnapshots(path: string): Promise<TrashSnapshotItem[]> {
  if (isTauri) {
    return await invoke<TrashSnapshotItem[]>('list_trash_snapshots', { path });
  }
  return getMockTrashSnapshots();
}

export async function restoreTrashSnapshot(path: string, snapshotId: number): Promise<void> {
  if (isTauri) {
    await invoke('restore_trash_snapshot', { path, snapshotId });
  }
}

export async function deleteTrashSnapshot(snapshotId: number): Promise<void> {
  if (isTauri) {
    await invoke('delete_trash_snapshot', { snapshotId });
  }
}

export async function getFileBlame(path: string, filePath: string): Promise<BlameHunkItem[]> {
  if (isTauri) {
    return await invoke<BlameHunkItem[]>('get_file_blame', { path, filePath });
  }
  return [];
}

export async function getFileHistory(
  path: string,
  filePath: string,
  limit?: number
): Promise<FileHistoryItem[]> {
  if (isTauri) {
    return await invoke<FileHistoryItem[]>('get_file_history', { path, filePath, limit });
  }
  return [];
}
