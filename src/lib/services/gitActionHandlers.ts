import { toast } from '../state/toastState.svelte';
import { localeState } from '../state/localeState.svelte';
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
  TagInfo,
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
    getComparisonResult,
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
    repo.setStatus(localeState.t('actions.cherryPick.inProgress', { sha: commit.short_id }));
    try {
      const newSha = await executeCherryPick(repo.currentRepoPath, commit.id);
      repo.setStatus(localeState.t('actions.cherryPick.succeededStatus', { sha: newSha.slice(0, 7) }), 'success');
      toast.success(
        localeState.t('actions.cherryPick.success'),
        localeState.t('actions.cherryPick.successMsg', { source: commit.short_id, target: newSha.slice(0, 7) })
      );
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      if (errMsg.toLowerCase().includes('conflict')) {
        toast.warning(
          localeState.t('actions.cherryPick.conflictTitle'),
          localeState.t('actions.cherryPick.conflictMsg')
        );
        repo.setStatus(localeState.t('actions.cherryPick.conflictStatus'), 'warn');
        await loadRepository(repo.currentRepoPath);
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      } else {
        repo.setStatus(localeState.t('actions.cherryPick.failedStatus', { error: errMsg }), 'error');
        toast.error(localeState.t('actions.cherryPick.failed'), errMsg);
      }
    }
  }

  async function cherryPickDrop(source: CommitNode) {
    if (!repo.currentRepoPath) return;
    modalState.closeDropAction();
    repo.setStatus(localeState.t('actions.cherryPick.inProgress', { sha: source.short_id }));
    try {
      const newSha = await executeCherryPick(repo.currentRepoPath, source.id);
      repo.setStatus(localeState.t('actions.cherryPick.succeededStatus', { sha: newSha.slice(0, 7) }), 'success');
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      if (errMsg.toLowerCase().includes('conflict')) {
        toast.warning(
          localeState.t('actions.cherryPick.conflictTitle'),
          localeState.t('actions.cherryPick.conflictMsg')
        );
        repo.setStatus(localeState.t('actions.cherryPick.conflictStatus'), 'warn');
        await loadRepository(repo.currentRepoPath);
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      } else {
        repo.setStatus(localeState.t('actions.cherryPick.failedStatus', { error: errMsg }), 'error');
        toast.error(localeState.t('actions.cherryPick.failed'), errMsg);
      }
    }
  }

  async function mergeDrop(source: CommitNode) {
    if (!repo.currentRepoPath) return;
    modalState.closeDropAction();
    repo.setStatus(localeState.t('actions.merge.inProgress', { sha: source.short_id }));
    try {
      const newSha = await executeMerge(repo.currentRepoPath, source.id);
      repo.setStatus(localeState.t('actions.merge.successStatus', { sha: newSha.slice(0, 7) }), 'success');
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      if (errMsg.toLowerCase().includes('conflict')) {
        toast.warning(
          localeState.t('actions.merge.conflictTitle'),
          localeState.t('actions.merge.conflictMsg')
        );
        repo.setStatus(localeState.t('actions.merge.conflictStatus'), 'warn');
        await loadRepository(repo.currentRepoPath);
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      } else {
        repo.setStatus(localeState.t('actions.merge.failedStatus', { error: errMsg }), 'error');
        toast.error(localeState.t('actions.merge.failed'), errMsg);
      }
    }
  }

  async function rebaseDrop(_source: CommitNode, target: CommitNode) {
    if (!repo.currentRepoPath) return;
    modalState.closeDropAction();
    const targetRef = target.refs?.[0]?.shorthand || target.id;
    repo.setStatus(localeState.t('actions.rebase.inProgress', { target: targetRef }));
    try {
      const res = await executeRebase(repo.currentRepoPath, targetRef);
      if (res.status === 'completed') {
        toast.success(res.message);
        repo.setStatus(res.message, 'success');
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === 'conflict') {
        toast.warning(res.message);
        repo.setStatus(res.message, 'warn');
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      }
    } catch (e: any) {
      const errText = e?.message || String(e);
      toast.error(localeState.t('actions.rebase.failed', { error: errText }));
      repo.setStatus(localeState.t('actions.rebase.failed', { error: errText }), 'error');
    }
  }

  async function rebaseBranch(branch: BranchInfo) {
    if (!repo.currentRepoPath) return;
    repo.setStatus(localeState.t('actions.rebase.inProgressOnto', { branch: branch.shorthand }));
    try {
      const res = await executeRebase(repo.currentRepoPath, branch.shorthand);
      if (res.status === 'completed') {
        toast.success(res.message);
        repo.setStatus(res.message, 'success');
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === 'conflict') {
        toast.warning(res.message);
        repo.setStatus(res.message, 'warn');
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      }
    } catch (e: any) {
      const errText = e?.message || String(e);
      toast.error(localeState.t('actions.rebase.failed', { error: errText }));
      repo.setStatus(localeState.t('actions.rebase.failed', { error: errText }), 'error');
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
    repo.setStatus(localeState.t('actions.worktree.createdStatus', { name }), 'success');

    const tab = tabState.openTab({
      path: targetPath,
      name,
      branch: branchName,
      isWorktree: true,
      mainRepoPath: repo.currentRepoPath,
    });
    modalState.showWorktreeModal = false;
    await loadRepository(tab.path);
    toast.success(
      localeState.t('actions.worktree.createdToast', { name }),
      localeState.t('actions.worktree.createdToastMsg', { path: targetPath })
    );
  }

  async function deleteWorktreeAction(name: string) {
    if (!repo.currentRepoPath) return;
    const targetWt = repo.worktrees.find((w) => w.name === name);
    await deleteWorktree(repo.currentRepoPath, name);
    repo.worktrees = await listWorktrees(repo.currentRepoPath);
    repo.setStatus(localeState.t('actions.worktree.removedStatus', { name }), 'info');
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
      repo.setStatus(
        localeState.t('actions.branch.createdStatus', {
          name: newName,
          from: fromRef,
          checkout: checkout ? localeState.t('actions.branch.checkoutAnd') : '',
        }),
        'success'
      );
      modalState.closeCreateBranch();
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.setStatus(localeState.t('actions.branch.createErrorStatus', { error: e?.message || e }), 'error');
    }
  }

  async function continueRebaseAlert(): Promise<boolean> {
    if (!repo.currentRepoPath) return false;
    try {
      const res = await continueRebase(repo.currentRepoPath);
      if (res.status === 'completed') {
        toast.success(res.message);
        repo.setStatus(res.message, 'success');
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === 'conflict') {
        toast.warning(res.message);
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      }
      return true;
    } catch (err: any) {
      toast.error(localeState.t('actions.rebase.continueFailed', { error: err?.message || err }));
      return false;
    }
  }

  async function skipRebaseAlert(): Promise<boolean> {
    if (!repo.currentRepoPath) return false;
    try {
      const res = await skipRebaseStep(repo.currentRepoPath);
      if (res.status === 'completed') {
        toast.success(res.message);
        repo.setStatus(res.message, 'success');
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === 'conflict') {
        toast.warning(res.message);
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        setViewMode('conflict');
      }
      return true;
    } catch (err: any) {
      toast.error(localeState.t('actions.rebase.skipFailed', { error: err?.message || err }));
      return false;
    }
  }

  async function abortCurrentOperationAlert(): Promise<boolean> {
    if (!repo.currentRepoPath) return false;
    try {
      const msg = await abortCurrentOperation(repo.currentRepoPath);
      toast.info(msg);
      repo.setStatus(msg, 'info');
      safety.isRebasing = false;
      await loadRepository(repo.currentRepoPath);
      return true;
    } catch (err: any) {
      toast.error(localeState.t('actions.rebase.abortFailed', { error: err?.message || err }));
      return false;
    }
  }

  function createBranchFromDetached() {
    modalState.openCreateBranch(repo.repoSummary?.head_commit_id);
  }

  async function publishBranch(branch: BranchInfo) {
    if (!repo.currentRepoPath) return;
    repo.setStatus(localeState.t('actions.branch.publishing', { name: branch.shorthand }));
    const res = await remote.pushBranch(
      repo.currentRepoPath,
      branch.shorthand,
      'origin',
      false,
      true,
      () => loadRepository(repo.currentRepoPath)
    );
    repo.setStatus(res.message, res.success ? 'success' : 'error');
    if (res.success && branch.shorthand !== 'main' && branch.shorthand !== 'master') {
      setRecentPushedBranch(branch.shorthand);
      tabState.updateActiveTabMeta({ recentPushedBranch: branch.shorthand });
      toast.success(
        localeState.t('actions.branch.publishSuccessToast', { branch: branch.shorthand }),
        localeState.t('actions.branch.createPRPrompt'),
        {
          label: localeState.t('actions.branch.createPRBtn'),
          onClick: () => openCreatePR(branch.shorthand),
        },
        8000
      );
    }
  }

  async function pushBranch(branch: BranchInfo, force = false) {
    if (!repo.currentRepoPath) return;
    repo.setStatus(localeState.t('actions.branch.pushing', { name: branch.shorthand }));
    const res = await remote.pushBranch(
      repo.currentRepoPath,
      branch.shorthand,
      'origin',
      force,
      !branch.upstream_name,
      () => loadRepository(repo.currentRepoPath)
    );
    repo.setStatus(res.message, res.success ? 'success' : 'error');
    if (res.success && branch.shorthand !== 'main' && branch.shorthand !== 'master') {
      setRecentPushedBranch(branch.shorthand);
      tabState.updateActiveTabMeta({ recentPushedBranch: branch.shorthand });
      toast.success(
        localeState.t('actions.branch.pushSuccessToast', { branch: branch.shorthand }),
        localeState.t('actions.branch.createPRPrompt'),
        {
          label: localeState.t('actions.branch.createPRBtn'),
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
      repo.setStatus(localeState.t('actions.branch.pushingRemote'));
      const res = await remote.executeRemote(
        repo.currentRepoPath,
        'push',
        'origin',
        undefined,
        false,
        false,
        () => loadRepository(repo.currentRepoPath)
      );
      repo.setStatus(res.message, res.success ? 'success' : 'error');
    }
  }

  async function checkoutBranchAction(branch: BranchInfo) {
    if (!repo.currentRepoPath || branch.is_head) return;
    try {
      repo.setStatus(localeState.t('actions.branch.checkingOut', { name: branch.shorthand }));
      await checkoutBranch(repo.currentRepoPath, branch.shorthand);
      repo.setStatus(localeState.t('actions.branch.checkoutSuccessStatus', { name: branch.shorthand }), 'success');
      toast.info(
        localeState.t('actions.branch.checkoutSuccessToast'),
        localeState.t('actions.branch.checkoutCurrentToast', { name: branch.shorthand })
      );
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.setStatus(localeState.t('actions.branch.checkoutErrorStatus', { error: e?.message || e }), 'error');
      toast.error(localeState.t('actions.branch.checkoutError'), e?.message || String(e));
    }
  }

  async function renameBranchAction(branch: BranchInfo, newName: string) {
    if (!repo.currentRepoPath) return;
    try {
      await renameBranch(repo.currentRepoPath, branch.shorthand, newName);
      toast.success(
        localeState.t('actions.branch.renameSuccessToast'),
        localeState.t('actions.branch.renameSuccessMsg', { oldName: branch.shorthand, newName })
      );
      repo.setStatus(localeState.t('actions.branch.renamingStatus', { oldName: branch.shorthand, newName }), 'success');
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      toast.error(localeState.t('actions.branch.renameError'), e?.message || String(e));
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
      repo.setStatus(localeState.t('actions.branch.deletingStatus', { name: branch.shorthand }), 'success');
      toast.success(
        localeState.t('actions.branch.deleteSuccessToast'),
        localeState.t('actions.branch.deleteSuccessMsg', { name: branch.shorthand })
      );
      modalState.closeDeleteBranch();
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.setStatus(localeState.t('actions.branch.deleteErrorStatus', { error: e?.message || e }), 'error');
      toast.error(localeState.t('actions.branch.deleteError'), e?.message || String(e));
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
    repo.setStatus(localeState.t('actions.compare.comparing', { c1: c1.short_id, c2: c2.short_id }));
    try {
      const res = await compareTwoCommits(
        repo.currentRepoPath,
        c1.id,
        c2.id
      );
      setComparisonResult(res);
      repo.setStatus(localeState.t('actions.compare.ready', { count: res.files_changed.length }), 'success');
    } catch (e: any) {
      repo.setStatus(localeState.t('actions.compare.failed', { error: e?.message || e }), 'error');
    } finally {
      setIsComparisonLoading(false);
    }
  }

  async function swapComparison() {
    if (!repo.currentRepoPath) return;
    const current = getComparisonResult();
    if (!current) return;
    const oldBase = current.base_id;
    const oldTarget = current.target_id;
    setIsComparisonLoading(true);
    repo.setStatus(localeState.t('actions.compare.comparing', { c1: oldTarget.slice(0, 7), c2: oldBase.slice(0, 7) }));
    try {
      const res = await compareTwoCommits(
        repo.currentRepoPath,
        oldTarget,
        oldBase
      );
      setComparisonResult(res);
      repo.selectedCommitIds = [oldTarget, oldBase];
      repo.setStatus(localeState.t('actions.compare.ready', { count: res.files_changed.length }), 'success');
    } catch (e: any) {
      repo.setStatus(localeState.t('actions.compare.failed', { error: e?.message || e }), 'error');
    } finally {
      setIsComparisonLoading(false);
    }
  }

  async function undo() {
    repo.setStatus(localeState.t('actions.timeMachine.undoing'));
    try {
      const record = await safety.undo(repo.currentRepoPath, () =>
        loadRepository(repo.currentRepoPath)
      );
      if (record) {
        repo.setStatus(localeState.t('actions.timeMachine.undone', { desc: record.description }), 'success');
        toast.info(
          localeState.t('actions.timeMachine.undoToast'),
          localeState.t('actions.timeMachine.undoToastMsg', { desc: record.description }),
          {
            label: localeState.t('actions.timeMachine.redoBtn'),
            onClick: () => redo(),
          }
        );
      }
    } catch (e: any) {
      repo.setStatus(localeState.t('actions.timeMachine.undoFailedStatus', { error: e?.message || e }), 'error');
      toast.warning(localeState.t('actions.timeMachine.undoFailed'), e?.message || String(e));
    }
  }

  async function redo() {
    repo.setStatus(localeState.t('actions.timeMachine.redoing'));
    try {
      const record = await safety.redo(repo.currentRepoPath, () =>
        loadRepository(repo.currentRepoPath)
      );
      if (record) {
        repo.setStatus(localeState.t('actions.timeMachine.redone', { desc: record.description }), 'success');
        toast.info(
          localeState.t('actions.timeMachine.redoToast'),
          localeState.t('actions.timeMachine.redoToastMsg', { desc: record.description })
        );
      }
    } catch (e: any) {
      repo.setStatus(localeState.t('actions.timeMachine.redoFailedStatus', { error: e?.message || e }), 'error');
      toast.warning(localeState.t('actions.timeMachine.redoFailed'), e?.message || String(e));
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
        localeState.t('actions.tag.createSuccess'),
        localeState.t('actions.tag.createSuccessMsg', { name: tagName, sha: modalState.tagTargetCommit.short_id })
      );
      modalState.closeCreateTag();
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      toast.warning(localeState.t('actions.tag.createError'), e?.message || String(e));
    } finally {
      modalState.isCreateTagLoading = false;
    }
  }

  function openDeleteTagAction(tagOrName: TagInfo | string) {
    if (typeof tagOrName === 'string') {
      const found = repo.tags.find((t) => t.name === tagOrName);
      modalState.openDeleteTag(found || { name: tagOrName, target_commit_id: '' });
    } else {
      modalState.openDeleteTag(tagOrName);
    }
  }

  async function confirmDeleteTagAction(tagOrName: TagInfo | string) {
    const tagName = typeof tagOrName === 'string' ? tagOrName : tagOrName.name;
    modalState.isDeleteTagLoading = true;
    try {
      await deleteTag(repo.currentRepoPath, tagName);
      modalState.closeDeleteTag();
      toast.info(
        localeState.t('actions.tag.deleteSuccess'),
        localeState.t('actions.tag.deleteSuccessMsg', { name: tagName })
      );
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      toast.warning(localeState.t('actions.tag.deleteError'), e?.message || String(e));
    } finally {
      modalState.isDeleteTagLoading = false;
    }
  }

  async function selectTagAction(tag: TagInfo) {
    await repo.handleSelectTag(tag);
  }

  function openGitHubReleasesAction(tagOrName?: TagInfo | string) {
    const tagName = typeof tagOrName === 'string' ? tagOrName : tagOrName?.name;
    modalState.openGitHubReleases(tagName);
  }

  async function revertCommitAction(commit: CommitNode) {
    repo.setStatus(localeState.t('actions.revert.inProgress', { sha: commit.short_id }));
    try {
      const newSha = await revertCommit(repo.currentRepoPath, commit.id);
      toast.success(
        localeState.t('actions.revert.success'),
        localeState.t('actions.revert.successMsg', { sha: newSha.slice(0, 7) })
      );
      repo.setStatus(localeState.t('actions.revert.succeededStatus', { sha: newSha.slice(0, 7) }), 'success');
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.setStatus(localeState.t('actions.revert.failedStatus', { error: e?.message || e }), 'error');
      toast.warning(localeState.t('actions.revert.error'), e?.message || String(e));
    }
  }

  async function resetToCommitAction(
    commit: CommitNode,
    mode: 'soft' | 'mixed' | 'hard'
  ) {
    repo.setStatus(localeState.t('actions.reset.inProgress', { sha: commit.short_id, mode }));
    try {
      await resetToCommit(repo.currentRepoPath, commit.id, mode);
      toast.info(
        localeState.t('actions.reset.success'),
        localeState.t('actions.reset.successMsg', { sha: commit.short_id, mode })
      );
      repo.setStatus(localeState.t('actions.reset.doneStatus', { sha: commit.short_id, mode }), 'success');
      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();
    } catch (e: any) {
      repo.setStatus(localeState.t('actions.reset.failedStatus', { error: e?.message || e }), 'error');
      toast.warning(localeState.t('actions.reset.error'), e?.message || String(e));
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
        localeState.t('actions.squash.success'),
        localeState.t('actions.squash.successMsg', { count: commitIds.length, sha: newSha.slice(0, 7) })
      );
      modalState.closeSquash();
      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();
    } catch (e: any) {
      toast.warning(localeState.t('actions.squash.error'), e?.message || String(e));
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
      toast.warning(localeState.t('actions.cleanup.mergedBranchesCheckError'), e?.message || String(e));
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
        localeState.t('actions.cleanup.success'),
        localeState.t('actions.cleanup.successMsg', { count: deletedCount, target: 'HEAD' })
      );
      modalState.showCleanMergedModal = false;
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      toast.warning(localeState.t('actions.cleanup.error'), e?.message || String(e));
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
          localeState.t('actions.hotfix.autoStashMsg', { branch: hotfixBranchName, time: new Date().toLocaleTimeString() }),
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
        localeState.t('actions.hotfix.started', { branch: hotfixBranchName }),
        modalState.hotfixStashed
          ? localeState.t('actions.hotfix.stashedMsg')
          : localeState.t('actions.hotfix.cleanMsg'),
        modalState.hotfixStashed
          ? {
              label: localeState.t('actions.hotfix.viewChanges'),
              onClick: () => setViewMode('changes'),
            }
          : undefined
      );
    } catch (err: any) {
      toast.error(localeState.t('actions.hotfix.startError'), err?.message || String(err));
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
        localeState.t('actions.hotfix.restored'),
        localeState.t('actions.hotfix.restoredMsg', { branch: finishedBranch || '' })
      );
    } catch (err: any) {
      toast.error(localeState.t('actions.hotfix.restoreError'), err?.message || String(err));
    }
  }

  async function confirmNukeFile(filePath: string) {
    if (!repo.currentRepoPath) return;
    try {
      const res = await nukeFileFromHistory(repo.currentRepoPath, filePath);
      toast.success(localeState.t('actions.nuke.success'), res);
      modalState.closeNukeFile();
      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();
    } catch (err: any) {
      toast.error(localeState.t('actions.nuke.error'), err?.message || String(err));
      throw err;
    }
  }

  async function revealInExplorerAction(path: string) {
    try {
      await revealInFileManager(path);
    } catch (e: any) {
      toast.error(localeState.t('actions.fileManager.openError'), e?.message || String(e));
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
        localeState.t('actions.init.success'),
        localeState.t('actions.init.successMsg', { branch: defaultBranch || 'main' })
      );
    } catch (err: any) {
      toast.error(localeState.t('actions.init.error'), err?.message || String(err));
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
    swapComparison,
    undo,
    redo,
    openAI,
    confirmCreateTag,
    openDeleteTag: openDeleteTagAction,
    deleteTag: openDeleteTagAction,
    confirmDeleteTag: confirmDeleteTagAction,
    selectTag: selectTagAction,
    openGitHubReleases: openGitHubReleasesAction,
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
