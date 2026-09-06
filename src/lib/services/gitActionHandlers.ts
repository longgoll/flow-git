import { toast } from '../state/toastState.svelte';
import type { RepoState } from '../state/repoState.svelte';
import type { WorkingTreeState } from '../state/workingTreeState.svelte';
import type { GitSafetyState } from '../state/gitSafetyState.svelte';
import type { RemoteState } from '../state/remoteState.svelte';
import type { WorkspaceTabState } from '../state/workspaceTabState.svelte';
import type { ModalState } from '../state/modalState.svelte';
import type {
  BranchInfo,
  CommitNode,
  ComparisonResult,
  ConflictSimulationResult,
  ViewMode,
  WorktreeInfo,
} from '../types';
import {
  abortCurrentOperation,
  checkoutBranch,
  compareTwoCommits,
  continueRebase,
  createBranch,
  createTag,
  createWorktree,
  deleteBranch,
  deleteMergedBranches,
  deleteTag,
  deleteWorktree,
  executeCherryPick,
  executeMerge,
  executeRebase,
  getMergedBranches,
  getRemoteUrl,
  listWorktrees,
  nukeFileFromHistory,
  renameBranch,
  resetToCommit,
  revertCommit,
  revealInFileManager,
  skipRebaseStep,
  squashCommits,
  stashPop,
  stashSave,
} from '../api';

export interface GitActionContext {
  repo: RepoState;
  wt: WorkingTreeState;
  safety: GitSafetyState;
  remote: RemoteState;
  tabState: WorkspaceTabState;
  modalState: ModalState;
  setViewMode: (mode: ViewMode) => void;
  getComparisonResult: () => ComparisonResult | null;
  setComparisonResult: (res: ComparisonResult | null) => void;
  setIsComparisonLoading: (loading: boolean) => void;
  getRecentPushedBranch: () => string | null;
  setRecentPushedBranch: (branch: string | null) => void;
  getOriginRemoteUrl: () => string | null;
  setOriginRemoteUrl: (url: string | null) => void;
  loadRepository: (path: string) => Promise<void>;
  refreshWorkingTreeAndDiff: () => Promise<void>;
  loadRemotesList: (path: string) => Promise<void>;
  loadIdentity: (path: string) => Promise<void>;
  handleSelectTab: (tab: any) => Promise<void>;
}

export function createGitActions(ctx: GitActionContext) {
  const {
    repo,
    wt,
    safety,
    remote,
    tabState,
    modalState,
    setViewMode,
    setComparisonResult,
    setIsComparisonLoading,
    setRecentPushedBranch,
    setOriginRemoteUrl,
    loadRepository,
    refreshWorkingTreeAndDiff,
    loadRemotesList,
    loadIdentity,
    handleSelectTab,
  } = ctx;

  function openCreatePR(sourceBranch?: string) {
    modalState.openCreatePR(sourceBranch || repo.repoSummary?.current_branch || '');
  }

  // --- DRAG & DROP ACTION HANDLERS ---
  function openDropAction(
    source: CommitNode,
    target: CommitNode,
    sim: ConflictSimulationResult | null,
    pos: { x: number; y: number }
  ) {
    modalState.openDropAction(source, target, sim, pos);
  }

  async function cherryPickCommit(commit: CommitNode) {
    if (!repo.currentRepoPath) return;
    repo.statusMessage = `Cherry-picking commit ${commit.short_id}...`;
    try {
      const newSha = await executeCherryPick(repo.currentRepoPath, commit.id);
      repo.statusMessage = `Cherry-pick succeeded: ${newSha.slice(0, 7)}`;
      toast.success('Cherry-pick thành công', `Đã áp dụng commit ${commit.short_id} -> ${newSha.slice(0, 7)}`);
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      if (errMsg.toLowerCase().includes('conflict')) {
        toast.warning('Phát hiện xung đột khi Cherry-pick', 'Đang tự động chuyển sang trang giải quyết Conflict...');
        repo.statusMessage = 'Cherry-pick conflict. Vui lòng giải quyết xung đột.';
        await loadRepository(repo.currentRepoPath);
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      } else {
        repo.statusMessage = `Cherry-pick failed: ${errMsg}`;
        toast.error('Cherry-pick thất bại', errMsg);
      }
    }
  }

  async function cherryPickDrop(source: CommitNode) {
    if (!repo.currentRepoPath) return;
    modalState.closeDropAction();
    repo.statusMessage = `Cherry-picking commit ${source.short_id}...`;
    try {
      const newSha = await executeCherryPick(repo.currentRepoPath, source.id);
      repo.statusMessage = `Cherry-pick succeeded: ${newSha.slice(0, 7)}`;
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      if (errMsg.toLowerCase().includes('conflict')) {
        toast.warning('Phát hiện xung đột khi Cherry-pick', 'Đang tự động chuyển sang trang giải quyết Conflict...');
        repo.statusMessage = 'Cherry-pick conflict. Vui lòng giải quyết xung đột.';
        await loadRepository(repo.currentRepoPath);
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      } else {
        repo.statusMessage = `Cherry-pick failed: ${errMsg}`;
        toast.error('Cherry-pick failed', errMsg);
      }
    }
  }

  async function mergeDrop(source: CommitNode) {
    if (!repo.currentRepoPath) return;
    modalState.closeDropAction();
    repo.statusMessage = `Merging commit ${source.short_id} into HEAD...`;
    try {
      const newSha = await executeMerge(repo.currentRepoPath, source.id);
      repo.statusMessage = `Merge succeeded: ${newSha.slice(0, 7)}`;
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      if (errMsg.toLowerCase().includes('conflict')) {
        toast.warning('Phát hiện xung đột khi Merge', 'Đang tự động chuyển sang trang giải quyết Conflict...');
        repo.statusMessage = 'Merge conflict. Vui lòng giải quyết xung đột.';
        await loadRepository(repo.currentRepoPath);
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      } else {
        repo.statusMessage = `Merge failed: ${errMsg}`;
        toast.error('Merge failed', errMsg);
      }
    }
  }

  async function rebaseDrop(_source: CommitNode, target: CommitNode) {
    if (!repo.currentRepoPath) return;
    modalState.closeDropAction();
    const targetRef = target.refs?.[0]?.shorthand || target.id;
    repo.statusMessage = `Rebasing onto ${targetRef}...`;
    try {
      const res = await executeRebase(repo.currentRepoPath, targetRef);
      if (res.status === 'completed') {
        toast.success(res.message);
        repo.statusMessage = res.message;
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === 'conflict') {
        toast.warning(res.message);
        repo.statusMessage = res.message;
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      }
    } catch (e: any) {
      toast.error(`Rebase thất bại: ${e?.message || e}`);
      repo.statusMessage = `Rebase failed: ${e?.message || e}`;
    }
  }

  async function rebaseBranch(branch: BranchInfo) {
    if (!repo.currentRepoPath) return;
    repo.statusMessage = `Rebasing HEAD onto ${branch.shorthand}...`;
    try {
      const res = await executeRebase(repo.currentRepoPath, branch.shorthand);
      if (res.status === 'completed') {
        toast.success(res.message);
        repo.statusMessage = res.message;
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === 'conflict') {
        toast.warning(res.message);
        repo.statusMessage = res.message;
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      }
    } catch (e: any) {
      toast.error(`Rebase thất bại: ${e?.message || e}`);
      repo.statusMessage = `Rebase failed: ${e?.message || e}`;
    }
  }

  // --- WORKTREE HANDLERS ---
  async function openWorktreesModal() {
    if (!repo.currentRepoPath) return;
    modalState.showWorktreeModal = true;
    modalState.isWorktreeLoading = true;
    try {
      repo.worktrees = await listWorktrees(repo.currentRepoPath);
    } finally {
      modalState.isWorktreeLoading = false;
    }
  }

  async function createWorktreeAction(
    name: string,
    targetPath: string,
    branchName?: string
  ) {
    if (!repo.currentRepoPath) return;
    await createWorktree(repo.currentRepoPath, name, targetPath, branchName);
    repo.worktrees = await listWorktrees(repo.currentRepoPath);
    repo.statusMessage = `Created worktree '${name}' successfully.`;

    const tab = tabState.openTab({
      path: targetPath,
      name,
      branch: branchName,
      isWorktree: true,
      mainRepoPath: repo.currentRepoPath,
    });
    modalState.showWorktreeModal = false;
    await loadRepository(tab.path);
    toast.success(`Đã tạo và mở Worktree '${name}'`, `Thư mục: ${targetPath}`);
  }

  async function deleteWorktreeAction(name: string) {
    if (!repo.currentRepoPath) return;
    const targetWt = repo.worktrees.find((w) => w.name === name);
    await deleteWorktree(repo.currentRepoPath, name);
    repo.worktrees = await listWorktrees(repo.currentRepoPath);
    repo.statusMessage = `Removed worktree '${name}'.`;
    if (targetWt) {
      tabState.closeTab(targetWt.path);
    }
  }

  async function selectWorktree(wtItem: WorktreeInfo) {
    const tab = tabState.openTab({
      path: wtItem.path,
      name: wtItem.name,
      branch: wtItem.branch_name,
      isWorktree: !wtItem.is_main,
      mainRepoPath: repo.currentRepoPath,
    });
    await handleSelectTab(tab);
  }

  // --- BRANCH HANDLERS ---
  function openCreateBranch(baseRef?: string) {
    modalState.openCreateBranch(baseRef);
  }

  async function confirmCreateBranch(
    newName: string,
    fromRef: string,
    checkout: boolean
  ) {
    if (!repo.currentRepoPath) return;
    try {
      await createBranch(repo.currentRepoPath, newName, fromRef, checkout);
      repo.statusMessage = `✓ Tạo nhánh '${newName}' từ '${fromRef}' thành công${checkout ? ' và đã checkout' : ''}.`;
      modalState.closeCreateBranch();
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.statusMessage = `Lỗi tạo nhánh: ${e?.message || e}`;
    }
  }

  async function continueRebaseAlert(): Promise<boolean> {
    if (!repo.currentRepoPath) return false;
    try {
      const res = await continueRebase(repo.currentRepoPath);
      if (res.status === 'completed') {
        toast.success(res.message);
        repo.statusMessage = res.message;
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === 'conflict') {
        toast.warning(res.message);
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      }
      return true;
    } catch (err: any) {
      toast.error(`Tiếp tục rebase thất bại: ${err?.message || err}`);
      return false;
    }
  }

  async function skipRebaseAlert(): Promise<boolean> {
    if (!repo.currentRepoPath) return false;
    try {
      const res = await skipRebaseStep(repo.currentRepoPath);
      if (res.status === 'completed') {
        toast.success(res.message);
        repo.statusMessage = res.message;
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === 'conflict') {
        toast.warning(res.message);
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      }
      return true;
    } catch (err: any) {
      toast.error(`Bỏ qua commit thất bại: ${err?.message || err}`);
      return false;
    }
  }

  async function abortCurrentOperationAlert(): Promise<boolean> {
    if (!repo.currentRepoPath) return false;
    try {
      const msg = await abortCurrentOperation(repo.currentRepoPath);
      toast.info(msg);
      repo.statusMessage = msg;
      safety.isRebasing = false;
      await loadRepository(repo.currentRepoPath);
      return true;
    } catch (err: any) {
      toast.error(`Hủy thao tác thất bại: ${err?.message || err}`);
      return false;
    }
  }

  function createBranchFromDetached() {
    modalState.openCreateBranch(repo.repoSummary?.head_commit_id);
  }

  async function publishBranch(branch: BranchInfo) {
    if (!repo.currentRepoPath) return;
    repo.statusMessage = `Đang publish nhánh '${branch.shorthand}'...`;
    const res = await remote.pushBranch(
      repo.currentRepoPath,
      branch.shorthand,
      'origin',
      false,
      true,
      () => loadRepository(repo.currentRepoPath)
    );
    repo.statusMessage = res.message;
    if (res.success && branch.shorthand !== 'main' && branch.shorthand !== 'master') {
      setRecentPushedBranch(branch.shorthand);
      tabState.updateActiveTabMeta({ recentPushedBranch: branch.shorthand });
      toast.success(
        `Đã publish nhánh '${branch.shorthand}' lên origin`,
        `Bạn có muốn tạo Pull Request vào nhánh chính không?`,
        {
          label: 'Tạo Pull Request',
          onClick: () => openCreatePR(branch.shorthand),
        },
        8000
      );
    }
  }

  async function pushBranch(branch: BranchInfo, force = false) {
    if (!repo.currentRepoPath) return;
    repo.statusMessage = `Đang push nhánh '${branch.shorthand}'...`;
    const res = await remote.pushBranch(
      repo.currentRepoPath,
      branch.shorthand,
      'origin',
      force,
      !branch.upstream_name,
      () => loadRepository(repo.currentRepoPath)
    );
    repo.statusMessage = res.message;
    if (res.success && branch.shorthand !== 'main' && branch.shorthand !== 'master') {
      setRecentPushedBranch(branch.shorthand);
      tabState.updateActiveTabMeta({ recentPushedBranch: branch.shorthand });
      toast.success(
        `Đã push nhánh '${branch.shorthand}'`,
        `Bạn có muốn tạo Pull Request vào nhánh chính không?`,
        {
          label: 'Tạo Pull Request',
          onClick: () => openCreatePR(branch.shorthand),
        },
        8000
      );
    }
  }

  async function pushCurrentBranch() {
    if (!repo.currentRepoPath) return;
    const current = repo.branches.find((b) => b.is_head);
    if (current && !current.upstream_name) {
      await publishBranch(current);
    } else if (current) {
      await pushBranch(current, false);
    } else {
      repo.statusMessage = `Đang push lên remote...`;
      const res = await remote.executeRemote(
        repo.currentRepoPath,
        'push',
        'origin',
        undefined,
        false,
        false,
        () => loadRepository(repo.currentRepoPath)
      );
      repo.statusMessage = res.message;
    }
  }

  async function checkoutBranchAction(branch: BranchInfo) {
    if (!repo.currentRepoPath || branch.is_head) return;
    try {
      repo.statusMessage = `Checking out '${branch.shorthand}'...`;
      await checkoutBranch(repo.currentRepoPath, branch.shorthand);
      repo.statusMessage = `✓ Đã chuyển sang nhánh '${branch.shorthand}'.`;
      toast.info('Đã chuyển nhánh', `Hiện đang ở nhánh '${branch.shorthand}'.`);
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.statusMessage = `Lỗi checkout: ${e?.message || e}`;
      toast.error('Lỗi chuyển nhánh', e?.message || String(e));
    }
  }

  async function renameBranchAction(branch: BranchInfo, newName: string) {
    if (!repo.currentRepoPath) return;
    try {
      await renameBranch(repo.currentRepoPath, branch.shorthand, newName);
      toast.success(
        'Đổi tên nhánh thành công',
        `Nhánh '${branch.shorthand}' đã được đổi thành '${newName}'.`
      );
      repo.statusMessage = `Đổi tên nhánh '${branch.shorthand}' -> '${newName}'`;
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      toast.error('Lỗi đổi tên nhánh', e?.message || String(e));
    }
  }

  function deleteBranchAction(branch: BranchInfo) {
    if (!repo.currentRepoPath) return;
    modalState.openDeleteBranch(branch);
  }

  async function confirmDeleteBranch(
    branch: BranchInfo,
    deleteOnRemoteServer = false
  ) {
    if (!repo.currentRepoPath) return;
    modalState.isDeleteBranchLoading = true;
    try {
      if (branch.is_remote && deleteOnRemoteServer) {
        const remoteParts = branch.shorthand.split('/');
        const remoteName = remoteParts[0] || 'origin';
        const remoteBranchName = remoteParts.slice(1).join('/');
        await remote.executeRemote(
          repo.currentRepoPath,
          'push',
          remoteName,
          `:${remoteBranchName}`,
          false
        );
      } else {
        await deleteBranch(
          repo.currentRepoPath,
          branch.shorthand,
          branch.is_remote
        );
      }
      repo.statusMessage = `Đã xóa nhánh ${branch.shorthand} thành công`;
      toast.success(
        'Đã xóa nhánh',
        `Nhánh '${branch.shorthand}' đã được xóa an toàn.`
      );
      modalState.closeDeleteBranch();
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.statusMessage = `Lỗi xóa nhánh: ${e?.message || e}`;
      toast.error('Lỗi xóa nhánh', e?.message || String(e));
    } finally {
      modalState.isDeleteBranchLoading = false;
    }
  }

  // --- COMMIT COMPARISON, UNDO & ACTIONS ---
  async function compareCommits(c1: CommitNode, c2: CommitNode) {
    if (!repo.currentRepoPath) return;
    repo.selectedCommitIds = [c1.id, c2.id];
    setViewMode('compare');
    setIsComparisonLoading(true);
    repo.statusMessage = `Comparing ${c1.short_id} .. ${c2.short_id}...`;
    try {
      const res = await compareTwoCommits(
        repo.currentRepoPath,
        c1.id,
        c2.id
      );
      setComparisonResult(res);
      repo.statusMessage = `Comparison ready: ${res.files_changed.length} files changed`;
    } catch (e: any) {
      repo.statusMessage = `Comparison failed: ${e?.message || e}`;
    } finally {
      setIsComparisonLoading(false);
    }
  }

  async function undo() {
    repo.statusMessage = 'Time Machine: Undoing last action...';
    try {
      const record = await safety.undo(repo.currentRepoPath, () =>
        loadRepository(repo.currentRepoPath)
      );
      if (record) {
        repo.statusMessage = `Time Machine: Undid ${record.description}`;
        toast.info(
          'Đã hoàn tác (Time Machine)',
          `Đã hoàn tác: ${record.description}`,
          {
            label: 'Làm lại (Redo)',
            onClick: () => redo(),
          }
        );
      }
    } catch (e: any) {
      repo.statusMessage = `Undo failed: ${e?.message || e}`;
      toast.warning('Không thể hoàn tác', e?.message || String(e));
    }
  }

  async function redo() {
    repo.statusMessage = 'Time Machine: Redoing action...';
    try {
      const record = await safety.redo(repo.currentRepoPath, () =>
        loadRepository(repo.currentRepoPath)
      );
      if (record) {
        repo.statusMessage = `Time Machine: Redid ${record.description}`;
        toast.info(
          'Đã làm lại (Time Machine)',
          `Đã khôi phục: ${record.description}`
        );
      }
    } catch (e: any) {
      repo.statusMessage = `Redo failed: ${e?.message || e}`;
      toast.warning('Không thể làm lại', e?.message || String(e));
    }
  }

  function openAI() {
    if (wt.fileDiffDetail) {
      modalState.aiDiffContext = wt.fileDiffDetail.hunks
        .map((h) => h.header + '\n' + h.lines.map((l) => l.content).join('\n'))
        .join('\n');
    } else {
      modalState.aiDiffContext = 'Changes across staged files';
    }
    modalState.showAIModal = true;
  }

  async function confirmCreateTag(tagName: string, message?: string) {
    if (!modalState.tagTargetCommit) return;
    modalState.isCreateTagLoading = true;
    try {
      await createTag(
        repo.currentRepoPath,
        tagName,
        modalState.tagTargetCommit.id,
        message
      );
      toast.success(
        'Đã tạo Tag',
        `Tag ${tagName} đã được tạo tại ${modalState.tagTargetCommit.short_id}`
      );
      modalState.closeCreateTag();
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      toast.warning('Lỗi tạo Tag', e?.message || String(e));
    } finally {
      modalState.isCreateTagLoading = false;
    }
  }

  async function deleteTagAction(tagName: string) {
    try {
      await deleteTag(repo.currentRepoPath, tagName);
      toast.info('Đã xóa Tag', `Đã xóa tag ${tagName}`);
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      toast.warning('Lỗi xóa Tag', e?.message || String(e));
    }
  }

  async function revertCommitAction(commit: CommitNode) {
    repo.statusMessage = `Reverting commit ${commit.short_id}...`;
    try {
      const newSha = await revertCommit(repo.currentRepoPath, commit.id);
      toast.success(
        'Revert thành công',
        `Đã tạo commit đảo ngược: ${newSha.slice(0, 7)}`
      );
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.statusMessage = `Revert failed: ${e?.message || e}`;
      toast.warning('Lỗi Revert commit', e?.message || String(e));
    }
  }

  async function resetToCommitAction(
    commit: CommitNode,
    mode: 'soft' | 'mixed' | 'hard'
  ) {
    repo.statusMessage = `Resetting (${mode}) to ${commit.short_id}...`;
    try {
      await resetToCommit(repo.currentRepoPath, commit.id, mode);
      toast.info(
        'Reset hoàn tất',
        `HEAD đã đưa về ${commit.short_id} (${mode})`
      );
      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();
    } catch (e: any) {
      repo.statusMessage = `Reset failed: ${e?.message || e}`;
      toast.warning('Lỗi Reset commit', e?.message || String(e));
    }
  }

  async function confirmSquash(commitIds: string[], message: string) {
    modalState.isSquashLoading = true;
    try {
      const newSha = await squashCommits(
        repo.currentRepoPath,
        commitIds,
        message
      );
      toast.success(
        'Squash thành công',
        `Đã gộp ${commitIds.length} commit thành ${newSha.slice(0, 7)}`
      );
      modalState.closeSquash();
      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();
    } catch (e: any) {
      toast.warning('Lỗi Squash commit', e?.message || String(e));
    } finally {
      modalState.isSquashLoading = false;
    }
  }

  async function openCleanMerged() {
    modalState.isCleanMergedLoading = true;
    modalState.showCleanMergedModal = true;
    try {
      modalState.mergedBranches = await getMergedBranches(repo.currentRepoPath);
    } catch (e: any) {
      toast.warning('Lỗi kiểm tra nhánh merged', e?.message || String(e));
    } finally {
      modalState.isCleanMergedLoading = false;
    }
  }

  async function confirmCleanMerged(branchesToDelete: string[]) {
    modalState.isCleanMergedLoading = true;
    try {
      const deletedCount = await deleteMergedBranches(
        repo.currentRepoPath,
        branchesToDelete
      );
      toast.success(
        'Dọn dẹp hoàn tất',
        `Đã xóa ${deletedCount} nhánh đã merge.`
      );
      modalState.showCleanMergedModal = false;
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      toast.warning('Lỗi dọn dẹp nhánh', e?.message || String(e));
    } finally {
      modalState.isCleanMergedLoading = false;
    }
  }

  async function startQuickHotfix(
    hotfixBranchName: string,
    baseBranch: string
  ) {
    if (!repo.currentRepoPath) return;
    try {
      if (wt.workingTreeStatus && wt.workingTreeStatus.total_dirty_count > 0) {
        await stashSave(
          repo.currentRepoPath,
          `Auto-stash trước hotfix: ${hotfixBranchName} (${new Date().toLocaleTimeString()})`,
          true
        );
        modalState.hotfixStashed = true;
      } else {
        modalState.hotfixStashed = false;
      }

      await createBranch(repo.currentRepoPath, hotfixBranchName, baseBranch);
      await checkoutBranch(repo.currentRepoPath, hotfixBranchName);
      modalState.activeHotfixBranch = hotfixBranchName;

      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();

      toast.success(
        `Bắt đầu Quick Hotfix: ${hotfixBranchName}`,
        modalState.hotfixStashed
          ? 'Toàn bộ code dở dang đã được gom vào Stash an toàn. Khi fix xong, bấm "Khôi phục code dở" trên Toolbar.'
          : 'Working tree sạch sẽ. Đã chuyển sang nhánh hotfix.',
        modalState.hotfixStashed
          ? {
              label: 'Xem Changes',
              onClick: () => setViewMode('changes'),
            }
          : undefined
      );
    } catch (err: any) {
      toast.error('Lỗi khi bắt đầu Quick Hotfix', err?.message || String(err));
      throw err;
    }
  }

  async function restoreHotfixStash() {
    if (!repo.currentRepoPath) return;
    try {
      if (modalState.hotfixStashed) {
        await stashPop(repo.currentRepoPath, 0);
        modalState.hotfixStashed = false;
      }
      const finishedBranch = modalState.activeHotfixBranch;
      modalState.activeHotfixBranch = null;

      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();

      toast.success(
        'Đã khôi phục code dở dang',
        `Đã hoàn tất khôi phục code từ Stash cho phiên hotfix '${finishedBranch}'.`
      );
    } catch (err: any) {
      toast.error('Lỗi khôi phục code dở dang', err?.message || String(err));
    }
  }

  async function confirmNukeFile(filePath: string) {
    if (!repo.currentRepoPath) return;
    try {
      const res = await nukeFileFromHistory(repo.currentRepoPath, filePath);
      toast.success('Xóa vĩnh viễn thành công', res);
      modalState.closeNukeFile();
      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();
    } catch (err: any) {
      toast.error('Lỗi khi xóa tệp khỏi lịch sử', err?.message || String(err));
      throw err;
    }
  }

  async function revealInExplorerAction(path: string) {
    try {
      await revealInFileManager(path);
    } catch (e: any) {
      toast.error('Không thể mở File Explorer', e?.message || String(e));
    }
  }

  async function confirmInitRepo(defaultBranch: string) {
    if (!modalState.initRepoPath) return;
    const targetPath = modalState.initRepoPath;
    try {
      await repo.initRepo(targetPath, defaultBranch, (wtStatus) => {
        wt.workingTreeStatus = wtStatus;
        if (wtStatus.untracked.length > 0) {
          wt.selectFile(targetPath, wtStatus.untracked[0], false);
        }
      });
      const originUrl = await getRemoteUrl(targetPath).catch(() => null);
      setOriginRemoteUrl(originUrl);
      await loadRemotesList(targetPath);
      await loadIdentity(targetPath);
      modalState.showInitRepoModal = false;
      modalState.initRepoPath = '';
      repo.showWelcomeScreen = false;
      tabState.initDefaultTab(targetPath, defaultBranch);
      toast.success(
        'Khởi tạo Git thành công',
        `Đã tạo kho Git mới với nhánh ${defaultBranch || 'main'}`
      );
    } catch (err: any) {
      toast.error('Khởi tạo thất bại', err?.message || String(err));
      throw err;
    }
  }

  return {
    openCreatePR,
    openDropAction,
    cherryPickDrop,
    cherryPickCommit,
    mergeDrop,
    rebaseDrop,
    rebaseBranch,
    openWorktreesModal,
    createWorktree: createWorktreeAction,
    deleteWorktree: deleteWorktreeAction,
    selectWorktree,
    openCreateBranch,
    confirmCreateBranch,
    continueRebaseAlert,
    skipRebaseAlert,
    abortCurrentOperationAlert,
    createBranchFromDetached,
    publishBranch,
    pushBranch,
    pushCurrentBranch,
    checkoutBranch: checkoutBranchAction,
    renameBranch: renameBranchAction,
    deleteBranch: deleteBranchAction,
    confirmDeleteBranch,
    compareCommits,
    undo,
    redo,
    openAI,
    confirmCreateTag,
    deleteTag: deleteTagAction,
    revertCommit: revertCommitAction,
    resetToCommit: resetToCommitAction,
    confirmSquash,
    openCleanMerged,
    confirmCleanMerged,
    startQuickHotfix,
    restoreHotfixStash,
    confirmNukeFile,
    revealInExplorer: revealInExplorerAction,
    confirmInitRepo,
  };
}
