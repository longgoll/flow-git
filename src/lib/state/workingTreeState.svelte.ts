import type { FileDiffDetail, FileStatusItem, WorkingTreeStatus } from '../types';
import {
  createCommit,
  discardAllChanges,
  discardFileChanges,
  getFileDiff,
  stageAll,
  stageFile,
  stageHunk,
  unstageAll,
  unstageFile,
  unstageHunk,
} from '../api';

export class WorkingTreeState {
  workingTreeStatus = $state<WorkingTreeStatus | null>(null);
  selectedFilePath = $state<string | null>(null);
  selectedFileIsStaged = $state<boolean>(false);
  fileDiffDetail = $state<FileDiffDetail | null>(null);
  isDiffLoading = $state<boolean>(false);
  isCommitLoading = $state<boolean>(false);
  ignoreWhitespace = $state<boolean>(false);

  clearSelection() {
    this.selectedFilePath = null;
    this.selectedFileIsStaged = false;
    this.fileDiffDetail = null;
    this.isDiffLoading = false;
  }

  reset() {
    this.workingTreeStatus = null;
    this.selectedFilePath = null;
    this.selectedFileIsStaged = false;
    this.fileDiffDetail = null;
    this.isDiffLoading = false;
    this.isCommitLoading = false;
  }

  async selectFile(repoPath: string, file: FileStatusItem, isStaged: boolean) {
    this.selectedFilePath = file.path;
    this.selectedFileIsStaged = isStaged;
    await this.loadFileDiff(repoPath, file.path, isStaged);
  }

  async loadFileDiff(repoPath: string, filePath: string, isStaged: boolean) {
    if (!repoPath) return;
    this.isDiffLoading = true;
    try {
      this.fileDiffDetail = await getFileDiff(repoPath, filePath, isStaged, this.ignoreWhitespace);
    } catch (e) {
      console.error('Failed to load file diff:', e);
    } finally {
      this.isDiffLoading = false;
    }
  }

  async toggleIgnoreWhitespace(repoPath: string) {
    this.ignoreWhitespace = !this.ignoreWhitespace;
    if (this.selectedFilePath) {
      await this.loadFileDiff(repoPath, this.selectedFilePath, this.selectedFileIsStaged);
    }
  }

  async stageFile(repoPath: string, filePath: string, onRefresh: () => Promise<void>) {
    if (!repoPath) return;
    await stageFile(repoPath, filePath);
    await onRefresh();
    this.selectedFileIsStaged = true;
  }

  async unstageFile(repoPath: string, filePath: string, onRefresh: () => Promise<void>) {
    if (!repoPath) return;
    await unstageFile(repoPath, filePath);
    await onRefresh();
    this.selectedFileIsStaged = false;
  }

  async stageAll(repoPath: string, onRefresh: () => Promise<void>) {
    if (!repoPath) return;
    await stageAll(repoPath);
    await onRefresh();
    this.selectedFileIsStaged = true;
  }

  async unstageAll(repoPath: string, onRefresh: () => Promise<void>) {
    if (!repoPath) return;
    await unstageAll(repoPath);
    await onRefresh();
    this.selectedFileIsStaged = false;
  }

  async stageHunk(repoPath: string, hunkIndex: number, onRefresh: () => Promise<void>) {
    if (!repoPath || !this.selectedFilePath) return;
    await stageHunk(repoPath, this.selectedFilePath, hunkIndex);
    await onRefresh();
  }

  async unstageHunk(repoPath: string, hunkIndex: number, onRefresh: () => Promise<void>) {
    if (!repoPath || !this.selectedFilePath) return;
    await unstageHunk(repoPath, this.selectedFilePath, hunkIndex);
    await onRefresh();
  }

  async discardFile(repoPath: string, filePath: string, onRefresh: () => Promise<void>) {
    if (!repoPath) return;
    await discardFileChanges(repoPath, filePath);
    await onRefresh();
  }

  async discardAll(repoPath: string, onRefresh: () => Promise<void>): Promise<number> {
    if (!repoPath) return 0;
    const count = await discardAllChanges(repoPath);
    await onRefresh();
    return count;
  }

  async createCommit(
    repoPath: string,
    message: string,
    amend: boolean,
    noVerify: boolean,
    onAfterCommit: () => Promise<void>
  ): Promise<string> {
    if (!repoPath) return '';
    this.isCommitLoading = true;
    try {
      const newSha = await createCommit(repoPath, message, undefined, undefined, amend, noVerify);
      await onAfterCommit();
      return newSha;
    } finally {
      this.isCommitLoading = false;
    }
  }
}
