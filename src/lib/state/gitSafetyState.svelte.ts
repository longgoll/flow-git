import type {
  ActionRecord,
  BisectStatus,
  ConflictFileDetail,
  TrashSnapshotItem,
} from '../types';
import {
  abortBisect,
  abortMergeOrRebase,
  bisectStep,
  checkIsRebasing,
  deleteTrashSnapshot,
  getBisectStatus,
  getConflictDetails,
  getConflictedFiles,
  listActions,
  listTrashSnapshots,
  redoAction,
  resolveConflictFile,
  restoreTrashSnapshot,
  startBisect,
  timeTravelTo,
  undoAction,
} from '../api';

export class GitSafetyState {
  // Safe Discard 48h Trash Inspector state
  showTrashModal = $state<boolean>(false);
  trashSnapshots = $state<TrashSnapshotItem[]>([]);
  isTrashLoading = $state<boolean>(false);

  // Phase 4: Safe-Flight Time Machine state
  showTimeMachineDrawer = $state<boolean>(false);
  actionRecords = $state<ActionRecord[]>([]);
  isActionLoading = $state<boolean>(false);

  // Phase 4: Visual Git Bisect state
  showBisectModal = $state<boolean>(false);
  bisectStatus = $state<BisectStatus | null>(null);
  isBisectLoading = $state<boolean>(false);

  // Phase 4: 3-Way Merge Conflict Resolver state
  conflictedFiles = $state<string[]>([]);
  selectedConflictFile = $state<string | null>(null);
  conflictFileDetail = $state<ConflictFileDetail | null>(null);
  isConflictLoading = $state<boolean>(false);
  isRebasing = $state<boolean>(false);

  reset() {
    this.showTrashModal = false;
    this.trashSnapshots = [];
    this.isTrashLoading = false;
    this.showTimeMachineDrawer = false;
    this.actionRecords = [];
    this.isActionLoading = false;
    this.showBisectModal = false;
    this.bisectStatus = null;
    this.isBisectLoading = false;
    this.conflictedFiles = [];
    this.selectedConflictFile = null;
    this.conflictFileDetail = null;
    this.isConflictLoading = false;
    this.isRebasing = false;
  }

  // -------------------------------------------------------------
  // Safe Discard 48h Trash
  // -------------------------------------------------------------
  async openTrash(repoPath: string) {
    if (!repoPath) return;
    this.isTrashLoading = true;
    this.showTrashModal = true;
    try {
      this.trashSnapshots = await listTrashSnapshots(repoPath);
    } catch (e) {
      console.error('Failed to load trash snapshots:', e);
    } finally {
      this.isTrashLoading = false;
    }
  }

  async restoreTrash(repoPath: string, snapshotId: number, onRefresh: () => Promise<void>) {
    if (!repoPath) return;
    await restoreTrashSnapshot(repoPath, snapshotId);
    this.trashSnapshots = await listTrashSnapshots(repoPath);
    await onRefresh();
  }

  async deleteTrash(repoPath: string, snapshotId: number) {
    await deleteTrashSnapshot(snapshotId);
    if (repoPath) {
      this.trashSnapshots = await listTrashSnapshots(repoPath);
    }
  }

  // -------------------------------------------------------------
  // Safe-Flight Time Machine
  // -------------------------------------------------------------
  async openTimeMachine(repoPath: string) {
    if (!repoPath) return;
    this.showTimeMachineDrawer = true;
    this.isActionLoading = true;
    try {
      this.actionRecords = await listActions(repoPath);
    } catch (e) {
      console.error('Failed to list actions:', e);
    } finally {
      this.isActionLoading = false;
    }
  }

  async undo(repoPath: string, onRefresh: () => Promise<void>): Promise<ActionRecord | null> {
    if (!repoPath) return null;
    const record = await undoAction(repoPath);
    await onRefresh();
    this.actionRecords = await listActions(repoPath);
    return record;
  }

  async redo(repoPath: string, onRefresh: () => Promise<void>): Promise<ActionRecord | null> {
    if (!repoPath) return null;
    const record = await redoAction(repoPath);
    await onRefresh();
    this.actionRecords = await listActions(repoPath);
    return record;
  }

  async timeTravel(repoPath: string, actionId: number, onRefresh: () => Promise<void>) {
    if (!repoPath) return;
    await timeTravelTo(repoPath, actionId);
    await onRefresh();
    this.actionRecords = await listActions(repoPath);
  }

  // -------------------------------------------------------------
  // Visual Git Bisect
  // -------------------------------------------------------------
  async openBisect(repoPath: string) {
    if (!repoPath) return;
    this.showBisectModal = true;
    this.isBisectLoading = true;
    try {
      this.bisectStatus = await getBisectStatus(repoPath);
    } catch (e) {
      console.error('Failed to get bisect status:', e);
    } finally {
      this.isBisectLoading = false;
    }
  }

  async startBisect(repoPath: string, badSha: string, goodSha: string, onRefresh: () => Promise<void>) {
    if (!repoPath) return;
    this.isBisectLoading = true;
    try {
      this.bisectStatus = await startBisect(repoPath, badSha, goodSha);
      await onRefresh();
      return this.bisectStatus;
    } finally {
      this.isBisectLoading = false;
    }
  }

  async bisectStep(repoPath: string, isGood: boolean, onRefresh: () => Promise<void>) {
    if (!repoPath) return;
    this.isBisectLoading = true;
    try {
      this.bisectStatus = await bisectStep(repoPath, isGood);
      await onRefresh();
      return this.bisectStatus;
    } finally {
      this.isBisectLoading = false;
    }
  }

  async abortBisect(repoPath: string, onRefresh: () => Promise<void>) {
    if (!repoPath) return;
    await abortBisect(repoPath);
    this.bisectStatus = null;
    this.showBisectModal = false;
    await onRefresh();
  }

  // -------------------------------------------------------------
  // 3-Way Merge Conflict Resolver
  // -------------------------------------------------------------
  async loadConflictFiles(repoPath: string) {
    if (!repoPath) return;
    try {
      this.conflictedFiles = await getConflictedFiles(repoPath);
      if (this.conflictedFiles.length > 0 && !this.selectedConflictFile) {
        await this.selectConflictFile(repoPath, this.conflictedFiles[0]);
      }
    } catch (e) {
      console.error('Failed to get conflicted files:', e);
    }
  }

  async selectConflictFile(repoPath: string, filePath: string) {
    if (!repoPath) return;
    this.selectedConflictFile = filePath;
    this.isConflictLoading = true;
    try {
      this.conflictFileDetail = await getConflictDetails(repoPath, filePath);
    } catch (e) {
      console.error('Failed to load conflict details:', e);
    } finally {
      this.isConflictLoading = false;
    }
  }

  async resolveConflict(
    repoPath: string,
    resolvedContent: string,
    onRefreshWorkingTree: () => Promise<void>
  ) {
    if (!repoPath || !this.selectedConflictFile) return;
    this.isConflictLoading = true;
    const currentFile = this.selectedConflictFile;
    try {
      await resolveConflictFile(repoPath, currentFile, resolvedContent);
      this.conflictedFiles = await getConflictedFiles(repoPath);
      // Auto-advance to next conflicted file if current is resolved
      if (this.conflictedFiles.includes(currentFile)) {
        await this.selectConflictFile(repoPath, currentFile);
      } else if (this.conflictedFiles.length > 0) {
        await this.selectConflictFile(repoPath, this.conflictedFiles[0]);
      } else {
        this.selectedConflictFile = null;
        this.conflictFileDetail = null;
      }
      await onRefreshWorkingTree();
    } finally {
      this.isConflictLoading = false;
    }
  }

  async abortMerge(repoPath: string, onRefresh: () => Promise<void>) {
    if (!repoPath) return;
    await abortMergeOrRebase(repoPath);
    this.isRebasing = false;
    await onRefresh();
  }

  async checkRebaseStatus(repoPath: string): Promise<boolean> {
    if (!repoPath) return false;
    try {
      this.isRebasing = await checkIsRebasing(repoPath);
      return this.isRebasing;
    } catch {
      this.isRebasing = false;
      return false;
    }
  }
}
