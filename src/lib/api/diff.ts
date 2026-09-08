import type {
  BlameHunkItem,
  FileDiffDetail,
  FileHistoryItem,
  TrashSnapshotItem,
  WorkingTreeStatus,
} from '../types';
import { isTauri, invokeWithTimeout } from './client';
import { getMockFileDiff, getMockTrashSnapshots, getMockWorkingTreeStatus } from './mocks';

export async function getWorkingTreeStatus(path: string): Promise<WorkingTreeStatus> {
  if (isTauri) {
    return await invokeWithTimeout<WorkingTreeStatus>('get_status', { path }, 15000);
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
    return await invokeWithTimeout<FileDiffDetail>(
      'get_file_diff',
      { path, filePath, staged, ignoreWhitespace },
      15000
    );
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
    return await invokeWithTimeout<FileDiffDetail>(
      'get_commit_file_diff',
      { path, commitId, filePath, ignoreWhitespace },
      15000
    );
  }
  return getMockFileDiff(filePath, false);
}

export async function stageFile(path: string, filePath: string): Promise<void> {
  if (isTauri) {
    await invokeWithTimeout('stage_file', { path, filePath }, 15000);
  }
}

export async function unstageFile(path: string, filePath: string): Promise<void> {
  if (isTauri) {
    await invokeWithTimeout('unstage_file', { path, filePath }, 15000);
  }
}

export async function stageAll(path: string): Promise<void> {
  if (isTauri) {
    await invokeWithTimeout('stage_all', { path }, 25000);
  }
}

export async function unstageAll(path: string): Promise<void> {
  if (isTauri) {
    await invokeWithTimeout('unstage_all', { path }, 25000);
  }
}

export async function stageHunk(path: string, filePath: string, hunkIndex: number): Promise<void> {
  if (isTauri) {
    await invokeWithTimeout('stage_hunk', { path, filePath, hunkIndex }, 15000);
  }
}

export async function unstageHunk(path: string, filePath: string, hunkIndex: number): Promise<void> {
  if (isTauri) {
    await invokeWithTimeout('unstage_hunk', { path, filePath, hunkIndex }, 15000);
  }
}

export async function discardFileChanges(path: string, filePath: string): Promise<number> {
  if (isTauri) {
    return await invokeWithTimeout<number>('discard_file_changes', { path, filePath }, 20000);
  }
  return Date.now();
}

export async function discardAllChanges(path: string): Promise<number[]> {
  if (isTauri) {
    return await invokeWithTimeout<number[]>('discard_all_changes', { path }, 30000);
  }
  return [];
}

export async function listTrashSnapshots(path: string): Promise<TrashSnapshotItem[]> {
  if (isTauri) {
    return await invokeWithTimeout<TrashSnapshotItem[]>('list_trash_snapshots', { path }, 15000);
  }
  return getMockTrashSnapshots();
}

export async function restoreTrashSnapshot(path: string, snapshotId: number): Promise<void> {
  if (isTauri) {
    await invokeWithTimeout('restore_trash_snapshot', { path, snapshotId }, 20000);
  }
}

export async function restoreTrashBatch(path: string, batchId: string): Promise<number> {
  if (isTauri) {
    return await invokeWithTimeout<number>('restore_trash_batch', { path, batchId }, 30000);
  }
  return 0;
}

export async function deleteTrashSnapshot(snapshotId: number): Promise<void> {
  if (isTauri) {
    await invokeWithTimeout('delete_trash_snapshot', { snapshotId }, 15000);
  }
}

export async function getFileBlame(
  path: string,
  filePath: string,
  minLine?: number,
  maxLine?: number
): Promise<BlameHunkItem[]> {
  if (isTauri) {
    return await invokeWithTimeout<BlameHunkItem[]>(
      'get_file_blame',
      { path, filePath, minLine: minLine ?? null, maxLine: maxLine ?? null },
      25000
    );
  }
  return [];
}

export async function getFileHistory(
  path: string,
  filePath: string,
  limit?: number
): Promise<FileHistoryItem[]> {
  if (isTauri) {
    return await invokeWithTimeout<FileHistoryItem[]>('get_file_history', { path, filePath, limit }, 25000);
  }
  return [];
}
