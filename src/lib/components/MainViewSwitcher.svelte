<script lang="ts">
  import CommitGraph from './CommitGraph.svelte';
  import CommitDetail from './CommitDetail.svelte';
  import WorkingTree from './WorkingTree.svelte';
  import ComparisonViewer from './ComparisonViewer.svelte';
  import ConflictResolver from './ConflictResolver.svelte';
  import ThreeColumnLayout from './ThreeColumnLayout.svelte';
  import FocusView from './FocusView.svelte';
  import StackedCommitsFlow from './StackedCommitsFlow.svelte';
  import DagCanvasMap from './DagCanvasMap.svelte';
  import RepositoryExplorer from './RepositoryExplorer.svelte';
  import PullRequestReviewer from './PullRequestReviewer.svelte';
  import { toast } from '../state/toastState.svelte';
  import { localeState } from '../state/localeState.svelte';
  import type { RepoState } from '../state/repoState.svelte';
  import type { WorkingTreeState } from '../state/workingTreeState.svelte';
  import type { RemoteState } from '../state/remoteState.svelte';
  import type { GitSafetyState } from '../state/gitSafetyState.svelte';
  import type { ModalState } from '../state/modalState.svelte';
  import type {
    CommitNode,
    ComparisonResult,
    ConflictSimulationResult,
    LayoutMode,
    ViewMode,
  } from '../types';
  import {
    checkoutBranch,
    continueRebase,
    executeRebase,
  } from '../api';
  import { addToGitignore, generateStandardGitignore } from '../api/ignore';
  import { Info } from 'lucide-svelte';

  interface Props {
    repo: RepoState;
    wt: WorkingTreeState;
    safety: GitSafetyState;
    remote: RemoteState;
    modalState: ModalState;
    viewMode: ViewMode;
    layoutMode: LayoutMode;
    comparisonResult: ComparisonResult | null;
    isComparisonLoading: boolean;
    originRemoteUrl: string | null;
    explorerInitialFilePath: string | null;
    onChangeViewMode: (mode: ViewMode) => void;
    onSetExplorerInitialFilePath: (path: string | null) => void;
    loadRepository: (path: string) => Promise<void>;
    refreshWorkingTreeAndDiff: () => Promise<void>;
    handleCompareCommits: (c1: CommitNode, c2: CommitNode) => void;
    handleSwapComparison?: () => void;
    handleCherryPickCommit: (c: CommitNode) => Promise<void>;
    handleRevertCommit: (c: CommitNode) => Promise<void>;
    handleResetToCommit: (c: CommitNode, mode: 'soft' | 'mixed' | 'hard') => Promise<void>;
    handlePushCurrentBranch: () => Promise<void>;
    handleUndo: () => Promise<void>;
    handleOpenCreatePR: (source?: string) => void;
    handleOpenDropAction: (
      source: CommitNode,
      target: CommitNode,
      simulation: ConflictSimulationResult | null,
      position: { x: number; y: number }
    ) => void;
  }

  let {
    repo,
    wt,
    safety,
    remote,
    modalState,
    viewMode,
    layoutMode,
    comparisonResult,
    isComparisonLoading,
    originRemoteUrl,
    explorerInitialFilePath,
    onChangeViewMode,
    onSetExplorerInitialFilePath,
    loadRepository,
    refreshWorkingTreeAndDiff,
    handleCompareCommits,
    handleSwapComparison,
    handleCherryPickCommit,
    handleRevertCommit,
    handleResetToCommit,
    handlePushCurrentBranch,
    handleUndo,
    handleOpenCreatePR,
    handleOpenDropAction,
  }: Props = $props();

  // Commit Detail Resizable Splitter state
  let detailPanelHeight = $state<number>(280);
  let isResizingDetail = $state<boolean>(false);
  let resizeStartY = 0;
  let resizeStartHeight = 0;

  function handleStartResizeDetail(e: MouseEvent) {
    isResizingDetail = true;
    resizeStartY = e.clientY;
    resizeStartHeight = detailPanelHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingDetail) return;
      const deltaY = resizeStartY - moveEvent.clientY;
      const newH = Math.max(140, Math.min(window.innerHeight * 0.75, resizeStartHeight + deltaY));
      detailPanelHeight = newH;
    };

    const onMouseUp = () => {
      isResizingDetail = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
</script>

{#if viewMode === 'graph'}
  {#if layoutMode === 'three-column'}
    <ThreeColumnLayout
      commits={repo.visibleCommits}
      selectedCommitId={repo.selectedCommitId}
      selectedCommitIds={repo.selectedCommitIds}
      commitDetail={repo.commitDetail}
      isDetailLoading={repo.isDetailLoading}
      repoPath={repo.currentRepoPath}
      hasMore={repo.hasMoreCommits}
      isLoadingMore={repo.isLoadingMoreCommits}
      onLoadMore={() => repo.handleLoadMoreCommits()}
      onSelectCommit={(c) => repo.handleSelectCommit(c)}
      onCompareCommits={handleCompareCommits}
      onCreateBranch={(c) => modalState.openCreateBranch(c.id)}
      onCreateTag={(c) => modalState.openCreateTag(c)}
      onCherryPickCommit={handleCherryPickCommit}
      onRevertCommit={handleRevertCommit}
      onResetCommit={handleResetToCommit}
      onSquashCommits={(commits) => modalState.openSquash(commits)}
      onInteractiveRebase={(c) => modalState.openInteractiveRebase(c)}
      onOpenDropAction={handleOpenDropAction}
    />
  {:else}
    <div class="flex-1 min-h-[200px] relative overflow-hidden flex flex-col">
      <CommitGraph
        commits={repo.visibleCommits}
        selectedCommitId={repo.selectedCommitId}
        selectedCommitIds={repo.selectedCommitIds}
        repoPath={repo.currentRepoPath}
        hasMore={repo.hasMoreCommits}
        isLoadingMore={repo.isLoadingMoreCommits}
        onLoadMore={() => repo.handleLoadMoreCommits()}
        onSelectCommit={(c) => repo.handleSelectCommit(c)}
        onSelectMultipleCommits={(ids) => (repo.selectedCommitIds = ids)}
        onCompareCommits={handleCompareCommits}
        onCreateBranch={(c) => modalState.openCreateBranch(c.id)}
        onCreateTag={(c) => modalState.openCreateTag(c)}
        onCherryPickCommit={handleCherryPickCommit}
        onRevertCommit={handleRevertCommit}
        onResetCommit={handleResetToCommit}
        onSquashCommits={(commits) => modalState.openSquash(commits)}
        onInteractiveRebase={(c) => modalState.openInteractiveRebase(c)}
        onOpenDropAction={handleOpenDropAction}
      />

      {#if !repo.isDetailOpen && repo.selectedCommitId}
        <button
          onclick={() => (repo.isDetailOpen = true)}
          class="absolute bottom-3 right-4 px-3 py-1.5 rounded-lg bg-white/95 dark:bg-zinc-900/95 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/70 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white shadow-xl flex items-center gap-2 backdrop-blur-md cursor-pointer transition-all hover:scale-105 z-10"
          title={localeState.t('graph.canvas.openDetailsTooltip')}
        >
          <Info class="w-3.5 h-3.5 text-cyan-400" />
          <span>Commit Details</span>
        </button>
      {/if}
    </div>

    {#if repo.isDetailOpen}
      <!-- Resizable Splitter Bar -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
      <div
        role="separator"
        aria-orientation="horizontal"
        tabindex="-1"
        onmousedown={handleStartResizeDetail}
        class="h-1.5 w-full bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-cyan-500 active:bg-cyan-600 cursor-row-resize transition-colors flex items-center justify-center shrink-0 group relative z-10 select-none {isResizingDetail ? 'bg-cyan-500!' : ''}"
        title={localeState.t('graph.canvas.resizeDetailsTooltip')}
      >
        <div class="w-10 h-0.5 rounded-full bg-zinc-400 dark:bg-zinc-600 group-hover:bg-white transition-colors"></div>
      </div>

      <div
        style={repo.isDetailMaximized ? 'height: 70%;' : `height: ${detailPanelHeight}px;`}
        class="shrink-0 transition-[height] duration-75 overflow-hidden"
      >
        <CommitDetail
          commitDetail={repo.commitDetail}
          isLoading={repo.isDetailLoading}
          isMaximized={repo.isDetailMaximized}
          repoPath={repo.currentRepoPath}
          onToggleMaximize={() => (repo.isDetailMaximized = !repo.isDetailMaximized)}
          onClose={() => (repo.isDetailOpen = false)}
          onSelectParent={(pid) => repo.handleSelectParent(pid)}
          onOpenFileInExplorer={(filePath) => {
            onSetExplorerInitialFilePath(filePath);
            onChangeViewMode('files');
          }}
        />
      </div>
    {/if}
  {/if}
{:else if viewMode === 'focus'}
  <FocusView
    repoPath={repo.currentRepoPath}
    currentBranchName={repo.repoSummary?.current_branch}
    branches={repo.branches}
    selectedCommitId={repo.selectedCommitId}
    selectedCommitIds={repo.selectedCommitIds}
    commitDetail={repo.commitDetail}
    isDetailLoading={repo.isDetailLoading}
    onSelectCommit={(c) => repo.handleSelectCommit(c)}
    onSelectMultipleCommits={(ids) => (repo.selectedCommitIds = ids)}
    onSquashCommits={(commits) => modalState.openSquash(commits)}
    onCompareCommits={handleCompareCommits}
    onCreateBranch={(c) => modalState.openCreateBranch(c.id)}
    onCreateTag={(c) => modalState.openCreateTag(c)}
    onCherryPickCommit={handleCherryPickCommit}
    onRevertCommit={handleRevertCommit}
    onResetCommit={handleResetToCommit}
    onInteractiveRebase={(c) => modalState.openInteractiveRebase(c)}
    onOpenCreatePR={(source) => handleOpenCreatePR(source)}
    onPush={handlePushCurrentBranch}
    onCloseFocus={() => onChangeViewMode('graph')}
    onSyncWithBase={async (baseBranch) => {
      if (!repo.currentRepoPath) return;
      if (baseBranch) {
        repo.statusMessage = `Rebasing onto ${baseBranch}...`;
        try {
          const res = await executeRebase(repo.currentRepoPath, baseBranch);
          if (res.status === 'completed') {
            toast.success(res.message);
            repo.statusMessage = res.message;
            await loadRepository(repo.currentRepoPath);
          } else if (res.status === 'conflict') {
            toast.warning(res.message);
            safety.isRebasing = true;
            await safety.loadConflictFiles(repo.currentRepoPath);
            onChangeViewMode('conflict');
          }
          return;
        } catch (e: any) {
          toast.error(`Rebase thất bại: ${e?.message || e}`);
        }
      }
      const res = await remote.runSmartSync(
        repo.currentRepoPath,
        undefined,
        () => loadRepository(repo.currentRepoPath)
      );
      repo.statusMessage = res.message;
    }}
  />
{:else if viewMode === 'stacked'}
  <StackedCommitsFlow
    repoPath={repo.currentRepoPath}
    currentBranch={repo.repoSummary?.current_branch}
    onRefreshRepo={() => loadRepository(repo.currentRepoPath)}
    onClose={() => onChangeViewMode('graph')}
    onPush={handlePushCurrentBranch}
  />
{:else if viewMode === 'dag'}
  <DagCanvasMap
    commits={repo.visibleCommits}
    repoPath={repo.currentRepoPath}
    onClose={() => onChangeViewMode('graph')}
  />
{:else if viewMode === 'changes'}
  <WorkingTree
    status={wt.workingTreeStatus}
    currentBranch={repo.repoSummary?.current_branch || ''}
    selectedFilePath={wt.selectedFilePath}
    selectedFileIsStaged={wt.selectedFileIsStaged}
    diffDetail={wt.fileDiffDetail}
    isDiffLoading={wt.isDiffLoading}
    isCommitLoading={wt.isCommitLoading}
    ignoreWhitespace={wt.ignoreWhitespace}
    onToggleIgnoreWhitespace={() => wt.toggleIgnoreWhitespace(repo.currentRepoPath)}
    onCreateBranch={(base) => modalState.openCreateBranch(base)}
    onSelectFile={(f, isStaged) => wt.selectFile(repo.currentRepoPath, f, isStaged)}
    onStageFile={(f) => wt.stageFile(repo.currentRepoPath, f, refreshWorkingTreeAndDiff)}
    onUnstageFile={(f) => wt.unstageFile(repo.currentRepoPath, f, refreshWorkingTreeAndDiff)}
    onStageAll={() => wt.stageAll(repo.currentRepoPath, refreshWorkingTreeAndDiff)}
    onUnstageAll={() => wt.unstageAll(repo.currentRepoPath, refreshWorkingTreeAndDiff)}
    onStageHunk={(idx) => wt.stageHunk(repo.currentRepoPath, idx, refreshWorkingTreeAndDiff)}
    onUnstageHunk={(idx) => wt.unstageHunk(repo.currentRepoPath, idx, refreshWorkingTreeAndDiff)}
    onDiscardFile={async (f) => {
      const snapId = await wt.discardFile(repo.currentRepoPath, f, refreshWorkingTreeAndDiff);
      await safety.refreshTrashSnapshots(repo.currentRepoPath);
      toast.warning(
        'Đã Discard thay đổi',
        `Tệp '${f}' đã được sao lưu an toàn trong Thùng rác 48h.`,
        {
          label: 'Hoàn tác',
          onClick: async () => {
            if (snapId) {
              await safety.restoreTrash(repo.currentRepoPath, snapId, refreshWorkingTreeAndDiff);
              toast.success('Đã khôi phục', `Tệp '${f}' đã được hoàn tác về Working Tree.`);
            } else {
              safety.openTrash(repo.currentRepoPath);
            }
          },
        }
      );
    }}
    onDiscardAll={async () => {
      const snapIds = await wt.discardAll(repo.currentRepoPath, refreshWorkingTreeAndDiff);
      await safety.refreshTrashSnapshots(repo.currentRepoPath);
      toast.warning(
        'Đã Discard tất cả thay đổi',
        `${snapIds.length} tệp đã được sao lưu vào Thùng rác an toàn 48h.`,
        {
          label: 'Hoàn tác tất cả',
          onClick: async () => {
            await safety.restoreAllTrash(repo.currentRepoPath, refreshWorkingTreeAndDiff);
            toast.success('Đã khôi phục tất cả', 'Các tệp đã được hoàn tác về Working Tree.');
          },
        }
      );
    }}
    onAddToGitignore={async (pattern) => {
      try {
        await addToGitignore(repo.currentRepoPath, pattern);
        toast.success('Đã cập nhật .gitignore', `Đã thêm '${pattern}' vào .gitignore thành công.`);
        await refreshWorkingTreeAndDiff();
      } catch (err: any) {
        toast.error('Lỗi cập nhật .gitignore', err.message || String(err));
      }
    }}
    onGenerateGitignore={async () => {
      try {
        const added = await generateStandardGitignore(repo.currentRepoPath);
        toast.success('Đã tạo .gitignore chuẩn', `Đã bổ sung ${added.length} quy tắc tương thích dự án.`);
        await refreshWorkingTreeAndDiff();
      } catch (err: any) {
        toast.error('Lỗi tạo .gitignore', err.message || String(err));
      }
    }}
    onCommit={async (msg, amend, noVerify = false) => {
      const sha = await wt.createCommit(
        repo.currentRepoPath,
        msg,
        amend,
        noVerify,
        () => loadRepository(repo.currentRepoPath)
      );
      repo.statusMessage = `Committed: ${sha.slice(0, 7)}`;
      toast.success(
        amend ? 'Đã Amend Commit thành công' : 'Đã tạo Commit thành công',
        `${sha.slice(0, 7)}: ${msg}`,
        {
          label: 'Hoàn tác (Ctrl+Z)',
          onClick: () => handleUndo(),
        }
      );
    }}
    onOpenTrash={() => safety.openTrash(repo.currentRepoPath)}
    trashCount={safety.trashSnapshots.length}
  />
{:else if viewMode === 'compare'}
  <ComparisonViewer
    comparison={comparisonResult}
    isLoading={isComparisonLoading}
    repoPath={repo.currentRepoPath}
    onSwap={handleSwapComparison}
    onClose={() => onChangeViewMode('graph')}
  />
{:else if viewMode === 'conflict'}
  <ConflictResolver
    conflictDetail={safety.conflictFileDetail}
    conflictedFiles={safety.conflictedFiles}
    selectedFile={safety.selectedConflictFile}
    isLoading={safety.isConflictLoading}
    isRebasing={safety.isRebasing}
    onSelectFile={(f) => safety.selectConflictFile(repo.currentRepoPath, f)}
    onResolveAndStage={async (content) => {
      await safety.resolveConflict(repo.currentRepoPath, content, refreshWorkingTreeAndDiff);
      if (safety.conflictedFiles.length === 0 && !safety.isRebasing) {
        onChangeViewMode('changes');
      }
    }}
    onContinueRebase={async () => {
      if (!repo.currentRepoPath) return;
      repo.statusMessage = 'Continuing rebase...';
      try {
        const res = await continueRebase(repo.currentRepoPath);
        if (res.status === 'completed') {
          toast.success('Rebase hoàn tất thành công!');
          safety.isRebasing = false;
          onChangeViewMode('graph');
          await loadRepository(repo.currentRepoPath);
        } else if (res.status === 'conflict') {
          toast.warning('Xung đột ở commit tiếp theo. Vui lòng giải quyết tiếp.');
          await safety.loadConflictFiles(repo.currentRepoPath);
        }
      } catch (e: any) {
        toast.error(`Continue rebase failed: ${e?.message || e}`);
      }
    }}
    onAbortMerge={async () => {
      await safety.abortMerge(repo.currentRepoPath, () => loadRepository(repo.currentRepoPath));
      onChangeViewMode('graph');
    }}
    onClose={() => onChangeViewMode('graph')}
  />
{:else if viewMode === 'files'}
  <RepositoryExplorer
    repoPath={repo.currentRepoPath}
    commits={repo.visibleCommits}
    branches={repo.branches}
    tags={repo.tags}
    workingTreeStatus={wt.workingTreeStatus}
    initialFilePath={explorerInitialFilePath}
    onSelectCommit={(commitId: string) => {
      repo.selectedCommitId = commitId;
      onChangeViewMode('graph');
    }}
    onStageFile={async (p: string) => {
      await wt.stageFile(repo.currentRepoPath, p, () => loadRepository(repo.currentRepoPath));
    }}
    onUnstageFile={async (p: string) => {
      await wt.unstageFile(repo.currentRepoPath, p, () => loadRepository(repo.currentRepoPath));
    }}
    onDiscardFile={async (p: string) => {
      const snapId = await wt.discardFile(repo.currentRepoPath, p, () => loadRepository(repo.currentRepoPath));
      await safety.refreshTrashSnapshots(repo.currentRepoPath);
      toast.warning(
        'Đã Discard thay đổi',
        `Tệp '${p}' đã được sao lưu an toàn trong Thùng rác 48h.`,
        {
          label: 'Hoàn tác',
          onClick: async () => {
            if (snapId) {
              await safety.restoreTrash(repo.currentRepoPath, snapId, () => loadRepository(repo.currentRepoPath));
              toast.success('Đã khôi phục', `Tệp '${p}' đã được hoàn tác.`);
            } else {
              safety.openTrash(repo.currentRepoPath);
            }
          },
        }
      );
    }}
    onNukeFile={(p: string) => modalState.openNukeFile(p)}
  />
{:else if viewMode === 'pr'}
  <PullRequestReviewer
    remoteOriginUrl={originRemoteUrl}
    localBranches={repo.branches}
    activeAccount={remote.activeAccount}
    onOpenAuth={() => (remote.showAuthModal = true)}
    onOpenCreatePR={() => handleOpenCreatePR()}
    onCheckoutBranch={async (b: string) => {
      await checkoutBranch(repo.currentRepoPath, b);
      await loadRepository(repo.currentRepoPath);
    }}
    onPRCountChange={(count) => {
      remote.openPRCount = count;
    }}
  />
{/if}
