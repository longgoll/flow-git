<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Toolbar from "./lib/components/Toolbar.svelte";
  import Sidebar from "./lib/components/Sidebar.svelte";
  import StatusBar from "./lib/components/StatusBar.svelte";
  import ModalsContainer from "./lib/components/ModalsContainer.svelte";
  import RepoAlertBanner from "./lib/components/RepoAlertBanner.svelte";
  import UpstreamUpdateBanner from "./lib/components/UpstreamUpdateBanner.svelte";
  import RecentPushBanner from "./lib/components/RecentPushBanner.svelte";
  import RepoBindingBanner from "./lib/components/RepoBindingBanner.svelte";
  import ToastContainer from "./lib/components/ToastContainer.svelte";
  import MainViewSwitcher from "./lib/components/MainViewSwitcher.svelte";
  import { toast } from "./lib/state/toastState.svelte";
  import { localeState } from "./lib/state/localeState.svelte";
  import { RepoState } from "./lib/state/repoState.svelte";
  import { WorkingTreeState } from "./lib/state/workingTreeState.svelte";
  import { RemoteState } from "./lib/state/remoteState.svelte";
  import { GitSafetyState } from "./lib/state/gitSafetyState.svelte";
  import { WorkspaceTabState, pathsEqual } from "./lib/state/workspaceTabState.svelte";
  import { repoBindingState } from "./lib/state/repoBindingState.svelte";
  import { modalState } from "./lib/state/modalState.svelte";
  import { updateState } from "./lib/state/updateState.svelte";
  import { handleAppKeydown } from "./lib/utils/appShortcuts";
  import { createGitActions } from "./lib/services/gitActionHandlers";
  import { getRemotes } from "./lib/api/remote";
  import { getCurrentRepoIdentity } from "./lib/api/identity";
  import { getRemoteUrl, listenRepoStatus, executeRebase, stashSave, stashPop } from "./lib/api";
  import type {
    ComparisonResult,
    CurrentRepoIdentity,
    FileStatusItem,
    LayoutMode,
    RemoteInfo,
    RepoOperationState,
    ViewMode,
    WorkspaceTab,
    WorkingTreeStatus,
  } from "./lib/types";

  // Svelte 5 Rune State Stores
  const repo = new RepoState();
  const wt = new WorkingTreeState();
  const remote = new RemoteState();
  const safety = new GitSafetyState();
  const tabState = new WorkspaceTabState();

  // Panels & Views
  let isSidebarOpen = $state<boolean>(true);
  let viewMode = $state<ViewMode>("graph");
  let layoutMode = $state<LayoutMode>("horizontal");

  // Comparison & Explorer
  let comparisonResult = $state<ComparisonResult | null>(null);
  let isComparisonLoading = $state<boolean>(false);
  let explorerInitialFilePath = $state<string | null>(null);
  let explorerInitialCommitOid = $state<string | null>(null);

  // Remotes & Identity
  let remotes = $state<RemoteInfo[]>([]);
  let originRemoteUrl = $state<string | null>(null);
  let currentIdentity = $state<CurrentRepoIdentity | null>(null);
  let recentPushedBranch = $state<string | null>(null);
  let isOperatingAlert = $state<boolean>(false);

  let unlistenWatcher: (() => void) | null = null;
  let currentLoadSessionId = 0;

  async function loadRemotesList(path: string) {
    if (!path) return;
    try {
      remotes = await getRemotes(path);
    } catch (e) {
      console.error("Failed to load remotes:", e);
    }
  }

  async function loadIdentity(path: string) {
    if (!path) return;
    try {
      currentIdentity = await getCurrentRepoIdentity(path);
    } catch (e) {
      console.error("Failed to load repo identity:", e);
    }
  }

  $effect(() => {
    if (repo.currentRepoPath) {
      repoBindingState.setActiveRepo(repo.currentRepoPath);
    }
  });


  function saveCurrentTabContext() {
    const currentTab = tabState.activeTab;
    if (!currentTab) return;
    tabState.updateTabMeta(currentTab.id, {
      selectedFilePath: wt.selectedFilePath,
      selectedFileIsStaged: wt.selectedFileIsStaged,
      selectedCommitId: repo.selectedCommitId,
      selectedCommitIds: repo.selectedCommitIds,
      viewMode: viewMode === 'pr' ? 'graph' : viewMode,
      searchQuery: repo.searchQuery,
      recentPushedBranch: recentPushedBranch,
    });
  }

  async function refreshWorkingTreeAndDiff() {
    await repo.refreshWorkingTreeOnly(async (wtStatus: WorkingTreeStatus) => {
      wt.workingTreeStatus = wtStatus;
      if (wt.selectedFilePath) {
        const stillDirty =
          wtStatus.staged?.some((f: FileStatusItem) => f.path === wt.selectedFilePath) ||
          wtStatus.unstaged?.some((f: FileStatusItem) => f.path === wt.selectedFilePath) ||
          wtStatus.untracked?.some((f: FileStatusItem) => f.path === wt.selectedFilePath);

        if (stillDirty) {
          await wt.loadFileDiff(
            repo.currentRepoPath,
            wt.selectedFilePath,
            wt.selectedFileIsStaged,
          );
        } else {
          if (wtStatus.staged?.length > 0) {
            await wt.selectFile(repo.currentRepoPath, wtStatus.staged[0], true);
          } else if (wtStatus.unstaged?.length > 0) {
            await wt.selectFile(repo.currentRepoPath, wtStatus.unstaged[0], false);
          } else if (wtStatus.untracked?.length > 0) {
            await wt.selectFile(repo.currentRepoPath, wtStatus.untracked[0], false);
          } else {
            wt.clearSelection();
          }
        }
      }
      tabState.updateActiveTabMeta({
        dirtyFilesCount: wtStatus.total_dirty_count,
        branch: repo.repoSummary?.current_branch,
      });
    });
  }

  async function loadRepository(path: string, restoreTabContext?: WorkspaceTab | null) {
    const sessionId = ++currentLoadSessionId;
    try {
      const tabContext =
        restoreTabContext ||
        tabState.tabs.find((t) => pathsEqual(t.path, path)) ||
        null;

      originRemoteUrl = await getRemoteUrl(path).catch(() => null);
      if (sessionId !== currentLoadSessionId) return;

      await loadRemotesList(path);
      if (sessionId !== currentLoadSessionId) return;

      const effectiveRemoteUrl =
        originRemoteUrl ||
        remotes.find((r) => r.name === 'origin')?.fetch_url ||
        remotes.find((r) => r.name === 'upstream')?.fetch_url ||
        remotes[0]?.fetch_url ||
        null;

      if (effectiveRemoteUrl) {
        remote.refreshPRCount(effectiveRemoteUrl).then((count) => {
          if (sessionId === currentLoadSessionId) {
            tabState.updateActiveTabMeta({ openPRCount: count });
          }
        });
      } else {
        remote.openPRCount = 0;
      }

      await loadIdentity(path);
      if (sessionId !== currentLoadSessionId) return;

      await repo.loadRepo(
        path,
        (wtStatus: WorkingTreeStatus) => {
          if (sessionId !== currentLoadSessionId) return;
          wt.workingTreeStatus = wtStatus;

          const savedFile = tabContext?.selectedFilePath;
          const savedIsStaged = tabContext?.selectedFileIsStaged;
          let fileSelected = false;

          if (savedFile) {
            const inStaged = wtStatus.staged?.find((f: FileStatusItem) => f.path === savedFile);
            const inUnstaged = wtStatus.unstaged?.find((f: FileStatusItem) => f.path === savedFile);
            const inUntracked = wtStatus.untracked?.find((f: FileStatusItem) => f.path === savedFile);

            if (savedIsStaged && inStaged) {
              wt.selectFile(path, inStaged, true);
              fileSelected = true;
            } else if (!savedIsStaged && inUnstaged) {
              wt.selectFile(path, inUnstaged, false);
              fileSelected = true;
            } else if (inUntracked) {
              wt.selectFile(path, inUntracked, false);
              fileSelected = true;
            }
          }

          if (!fileSelected) {
            if (wtStatus?.staged && wtStatus.staged.length > 0) {
              wt.selectFile(path, wtStatus.staged[0], true);
            } else if (wtStatus?.unstaged && wtStatus.unstaged.length > 0) {
              wt.selectFile(path, wtStatus.unstaged[0], false);
            } else if (wtStatus?.untracked && wtStatus.untracked.length > 0) {
              wt.selectFile(path, wtStatus.untracked[0], false);
            } else {
              wt.clearSelection();
            }
          }
        },
        tabContext?.selectedCommitId,
      );

      if (sessionId !== currentLoadSessionId) return;
      repo.showWelcomeScreen = false;

      // Đồng bộ trạng thái Rebase, Conflicts & Safe Discard Trash từ Git backend
      await safety.checkRebaseStatus(path);
      await safety.loadConflictFiles(path);
      await safety.refreshTrashSnapshots(path);
      if (sessionId !== currentLoadSessionId) return;

      // Đồng bộ vào Tab Workspace
      const isWt = repo.worktrees.some((w) => !w.is_main && pathsEqual(w.path, path));
      tabState.openTab({
        path,
        name: repo.repoSummary?.name,
        branch: repo.repoSummary?.current_branch,
        dirtyFilesCount: wt.workingTreeStatus?.total_dirty_count || 0,
        openPRCount: tabContext?.openPRCount ?? remote.openPRCount,
        isWorktree: isWt,
        recentPushedBranch: tabContext?.recentPushedBranch || null,
        viewMode: tabContext?.viewMode === 'pr' ? 'graph' : (tabContext?.viewMode || 'graph'),
      });

      recentPushedBranch = tabContext?.recentPushedBranch || null;
      if (tabContext?.viewMode && tabContext.viewMode !== 'pr') {
        viewMode = tabContext.viewMode;
      } else {
        viewMode = 'graph';
      }
    } catch (err: any) {
      if (sessionId !== currentLoadSessionId) return;
      const msg = String(err?.message || err);
      if (
        msg.includes('could not find repository') ||
        msg.includes('InvalidRepo') ||
        msg.includes('Failed to open repository')
      ) {
        modalState.initRepoPath = path;
        modalState.showInitRepoModal = true;
      } else {
        toast.error(localeState.t('actions.switcher.openRepoError'), msg);
      }
      throw err;
    }
  }

  // Workspace Tab Handlers
  async function handleSelectTab(tab: WorkspaceTab) {
    if (!tab) return;
    if (pathsEqual(tab.path, repo.currentRepoPath) && tabState.activeTabId === tab.id) {
      return;
    }

    saveCurrentTabContext();
    tabState.switchTab(tab.id);

    // Dọn sạch trạng thái tạm thời để không hiển thị nhầm dữ liệu của repo trước
    wt.clearSelection();
    repo.selectedCommitId = null;
    repo.selectedCommitIds = [];
    repo.commitDetail = null;
    safety.reset();
    comparisonResult = null;
    explorerInitialFilePath = null;
    explorerInitialCommitOid = null;
    modalState.aiDiffContext = '';

    recentPushedBranch = tab.recentPushedBranch || null;
    if (tab.openPRCount !== undefined) {
      remote.openPRCount = tab.openPRCount;
    }
    if (tab.viewMode && tab.viewMode !== 'pr') {
      viewMode = tab.viewMode;
    } else {
      viewMode = 'graph';
    }
    if (tab.searchQuery !== undefined) {
      repo.searchQuery = tab.searchQuery;
    }

    await loadRepository(tab.path, tab);
  }

  async function handleCloseTab(tabId: string) {
    const { nextTab } = tabState.closeTab(tabId);
    if (nextTab) {
      await handleSelectTab(nextTab);
    } else {
      repo.showWelcomeScreen = true;
      repo.resetRepoData();
      wt.reset();
      safety.reset();
      recentPushedBranch = null;
    }
  }

  function handleCloseOtherTabs(keepId: string) {
    tabState.closeOtherTabs(keepId);
  }

  // Instantiate Git Actions Service
  const actions = createGitActions({
    repo,
    wt,
    safety,
    remote,
    tabState,
    modalState,
    setViewMode: (mode) => (viewMode = mode),
    getComparisonResult: () => comparisonResult,
    setComparisonResult: (res) => (comparisonResult = res),
    setIsComparisonLoading: (loading) => (isComparisonLoading = loading),
    getRecentPushedBranch: () => recentPushedBranch,
    setRecentPushedBranch: (branch) => (recentPushedBranch = branch),
    getOriginRemoteUrl: () => originRemoteUrl,
    setOriginRemoteUrl: (url) => (originRemoteUrl = url),
    loadRepository,
    refreshWorkingTreeAndDiff,
    loadRemotesList,
    loadIdentity,
    handleSelectTab,
  });

  let repoOpState = $derived<RepoOperationState>(
    wt.workingTreeStatus?.operation_state ?? { type: "Normal" },
  );

  onMount(async () => {
    try {
      unlistenWatcher = await listenRepoStatus(async (_path, eventType) => {
        if (repo.currentRepoPath && pathsEqual(_path, repo.currentRepoPath)) {
          await refreshWorkingTreeAndDiff();
          if (eventType === 'head' || eventType === 'all') {
            await loadRepository(repo.currentRepoPath);
          }
        }
      });

      repo.initRecentRepos();
      await remote.initAccount();

      const initialTab = tabState.activeTab;
      const repoToOpen = initialTab?.path || repo.recentRepos[0] || "f:/Dev/product/git-tool";
      try {
        await loadRepository(repoToOpen);
        tabState.initDefaultTab(repoToOpen, repo.repoSummary?.current_branch);
        viewMode = 'graph';
      } catch {
        repo.showWelcomeScreen = true;
      }

      // Tự động kiểm tra bản cập nhật mới ngầm sau 3 giây khi mở ứng dụng
      // Sau đó tiếp tục kiểm tra định kỳ mỗi 4 giờ
      setTimeout(() => {
        updateState.checkForUpdates(false).catch(() => {});
        updateState.startPeriodicCheck();
      }, 3000);

      // Kích hoạt Silent Background Auto-Fetch kiểm tra commit mới từ remote
      remote.startAutoFetch(
        () => repo.currentRepoPath,
        async () => {
          if (repo.currentRepoPath) {
            await loadRepository(repo.currentRepoPath);
          }
        }
      );
    } catch (e) {
      console.error("onMount failed gracefully:", e);
      repo.showWelcomeScreen = true;
    }

    window.addEventListener("keydown", handleGlobalKeydown);
  });

  onDestroy(() => {
    if (unlistenWatcher) unlistenWatcher();
    window.removeEventListener("keydown", handleGlobalKeydown);
    updateState.stopPeriodicCheck();
    remote.stopAutoFetch();
  });

  async function handleSafeSmartSync() {
    if (!repo.currentRepoPath) return;
    const dirtyCount = wt.workingTreeStatus?.total_dirty_count || 0;
    let didStash = false;

    if (dirtyCount > 0) {
      try {
        await stashSave(
          repo.currentRepoPath,
          `FlowGit Auto-Stash: Trước khi cập nhật từ ${repo.currentBranch?.upstream_name || 'remote'}`,
          true
        );
        didStash = true;
        toast.info(localeState.t('banners.autoStashNotice', { count: dirtyCount }));
      } catch (e) {
        console.warn("Auto-stash skipped:", e);
      }
    }

    const res = await remote.runSmartSync(
      repo.currentRepoPath,
      undefined,
      () => loadRepository(repo.currentRepoPath),
    );
    repo.statusMessage = res.message;

    if (res.success) {
      toast.success(res.message);
      if (didStash) {
        try {
          await stashPop(repo.currentRepoPath, 0);
          toast.success(localeState.t('banners.autoStashRestored'));
        } catch {
          toast.warning("Code dở dang đã được giữ trong Stash Shelf an toàn.");
        }
        await loadRepository(repo.currentRepoPath);
      }
    } else {
      toast.error(res.message);
    }
  }

  async function handleSafeRebaseUpstream() {
    if (!repo.currentRepoPath || !repo.currentBranch) return;
    const upstream = repo.currentBranch.upstream_name || 'origin/' + repo.currentBranch.shorthand;
    const dirtyCount = wt.workingTreeStatus?.total_dirty_count || 0;
    let didStash = false;

    if (dirtyCount > 0) {
      try {
        await stashSave(
          repo.currentRepoPath,
          `FlowGit Auto-Stash: Trước khi rebase lên ${upstream}`,
          true
        );
        didStash = true;
        toast.info(localeState.t('banners.autoStashNotice', { count: dirtyCount }));
      } catch (e) {
        console.warn("Auto-stash skipped:", e);
      }
    }

    try {
      const res = await executeRebase(repo.currentRepoPath, upstream);
      if (res.status === 'completed') {
        toast.success(res.message);
        repo.setStatus(res.message, 'success');
        if (didStash) {
          try {
            await stashPop(repo.currentRepoPath, 0);
            toast.success(localeState.t('banners.autoStashRestored'));
          } catch {
            toast.warning("Code dở dang đã được giữ trong Stash Shelf an toàn.");
          }
        }
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === 'conflict') {
        toast.warning(res.message);
        repo.setStatus(res.message, 'warn');
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        viewMode = 'conflict';
      }
    } catch (e: any) {
      toast.error(e?.message || String(e));
    }
  }

  async function handleSafeMergeUpstream() {
    if (!repo.currentRepoPath || !repo.currentBranch) return;
    const remoteName = repo.currentBranch.upstream_name?.split('/')[0] || 'origin';
    const remoteBranch = repo.currentBranch.upstream_name?.split('/').slice(1).join('/') || repo.currentBranch.shorthand;
    await remote.executeRemote(
      repo.currentRepoPath,
      'pull',
      remoteName,
      remoteBranch,
      false,
      () => loadRepository(repo.currentRepoPath),
    );
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    handleAppKeydown(e, {
      tabState,
      modalState,
      viewMode: () => viewMode,
      onChangeViewMode: (mode) => (viewMode = mode),
      onSelectTab: handleSelectTab,
      onCloseTab: handleCloseTab,
      onToggleSidebar: () => (isSidebarOpen = !isSidebarOpen),
      onUndo: () => actions.undo(),
      onRedo: () => actions.redo(),
      onStageOrUnstageSelected: () => {
        if (wt.selectedFilePath) {
          if (wt.selectedFileIsStaged) {
            wt.unstageFile(repo.currentRepoPath, wt.selectedFilePath, refreshWorkingTreeAndDiff);
          } else {
            wt.stageFile(repo.currentRepoPath, wt.selectedFilePath, refreshWorkingTreeAndDiff);
          }
        }
      },
    });
  }
</script>

<div
  class="h-screen w-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans select-none"
>
  <!-- Top Toolbar -->
  <Toolbar
    repoSummary={repo.repoSummary}
    branches={repo.branches}
    bind:searchQuery={repo.searchQuery}
    commitLimit={repo.commitLimit}
    isLoading={repo.isLoading}
    isSyncing={remote.isSyncing}
    isPushing={remote.isPushing}
    {viewMode}
    {layoutMode}
    filterHideMerges={repo.filterHideMerges}
    filterMyCommits={repo.filterMyCommits}
    authors={repo.authors}
    filterAuthor={repo.filterAuthor}
    filterDateRange={repo.filterDateRange}
    filterDateFrom={repo.filterDateFrom}
    filterDateTo={repo.filterDateTo}
    dirtyFilesCount={wt.workingTreeStatus?.total_dirty_count || 0}
    stagedFilesCount={wt.workingTreeStatus?.total_staged_count || 0}
    conflictedFilesCount={safety.conflictedFiles.length}
    openPRCount={remote.openPRCount}
    {isSidebarOpen}
    workspaceTabs={tabState.tabs}
    activeTabId={tabState.activeTabId}
    onSelectTab={handleSelectTab}
    onCloseTab={handleCloseTab}
    onCloseOtherTabs={handleCloseOtherTabs}
    onRevealInExplorer={actions.revealInExplorer}
    activeAccount={remote.activeAccount}
    onToggleSidebar={() => (isSidebarOpen = !isSidebarOpen)}
    onOpenRepo={() => (repo.showWelcomeScreen = true)}
    onRefresh={() => loadRepository(repo.currentRepoPath)}
    onSearchChange={(q) => (repo.searchQuery = q)}
    onLimitChange={(lim) => repo.handleLimitChange(lim)}
    onChangeViewMode={(mode) => (viewMode = mode)}
    onChangeLayoutMode={(mode) => (layoutMode = mode)}
    onToggleHideMerges={() => (repo.filterHideMerges = !repo.filterHideMerges)}
    onToggleMyCommits={() => (repo.filterMyCommits = !repo.filterMyCommits)}
    onSelectAuthor={(a) => (repo.filterAuthor = a)}
    onSelectDateRange={(r) => (repo.filterDateRange = r)}
    onSetCustomDates={(from, to) => { repo.filterDateFrom = from; repo.filterDateTo = to; }}
    onClearAllFilters={() => repo.clearFilters()}
    onOpenTrash={() => safety.openTrash(repo.currentRepoPath)}
    onOpenWorktrees={actions.openWorktreesModal}
    onSmartSync={handleSafeSmartSync}
    onPush={actions.pushCurrentBranch}
    onPublishBranch={actions.publishBranch}
    remotesCount={remotes.length}
    onPublishRepo={() => (modalState.showPublishModal = true)}
    onOpenPalette={() => (modalState.showCommandPalette = true)}
    onOpenBisect={() => safety.openBisect(repo.currentRepoPath)}
    onOpenTimeMachine={() => safety.openTimeMachine(repo.currentRepoPath)}
    onOpenLostAndFound={() => safety.openLostAndFound(repo.currentRepoPath)}
    onOpenStashShelf={() => modalState.openStashShelf(0)}
    onOpenAI={actions.openAI}
    onOpenSubmodules={() => (modalState.showSubmoduleModal = true)}
    onOpenLfs={() => (modalState.showLfsModal = true)}
    onOpenGuide={() => (modalState.showGuideModal = true)}
    onOpenPlaybook={() => (modalState.showPlaybookModal = true)}
    onOpenInsights={() => modalState.openInsights()}
    onOpenGitHooks={() => modalState.openGitHooks()}
    onOpenAuth={() => (remote.showAuthModal = true)}
    onOpenQuickHotfix={() => (modalState.showHotfixModal = true)}
    activeHotfixBranch={modalState.activeHotfixBranch}
    onRestoreHotfixStash={actions.restoreHotfixStash}
  />

  <!-- Main Work Area -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Navigation Sidebar -->
    {#if isSidebarOpen}
      <Sidebar
        {repo}
        {viewMode}
        repoSummary={repo.repoSummary}
        branches={repo.branches}
        tags={repo.tags}
        stashes={repo.stashes}
        worktrees={repo.worktrees}
        isPushing={remote.isPushing}
        onSelectWorktree={actions.selectWorktree}
        onSelectBranch={actions.checkoutBranch}
        onDeleteBranch={actions.deleteBranch}
        onRenameBranch={actions.renameBranch}
        onPublishBranch={actions.publishBranch}
        onPushBranch={actions.pushBranch}
        onFetchBranch={async (b) => {
          const res = await remote.runSmartSync(
            repo.currentRepoPath,
            b.shorthand,
            () => loadRepository(repo.currentRepoPath),
          );
          repo.statusMessage = res.message;
        }}
        onFetchPrune={() =>
          remote.executeRemote(
            repo.currentRepoPath,
            "fetch",
            "origin",
            undefined,
            false,
            () => loadRepository(repo.currentRepoPath),
          )}
        onCreateBranch={actions.openCreateBranch}
        onCreateBranchFrom={(b) => actions.openCreateBranch(b.shorthand)}
        onRebaseBranch={actions.rebaseBranch}
        onCleanMergedBranches={actions.openCleanMerged}
        onSelectTag={actions.selectTag}
        onDeleteTag={actions.openDeleteTag}
        onCreateBranchFromTag={(tag) => actions.openCreateBranch(tag.name)}
        onOpenReleases={actions.openGitHubReleases}
        onOpenWorktrees={actions.openWorktreesModal}
        onCreatePullRequest={(b) => actions.openCreatePR(b.shorthand)}
        {remotes}
        onOpenRemoteManager={() => (modalState.showRemoteManagerModal = true)}
        onFetchRemote={async (name) => {
          if (!repo.currentRepoPath) return;
          repo.statusMessage = `Đang fetch remote '${name}'...`;
          try {
            await remote.executeRemote(
              repo.currentRepoPath,
              "fetch",
              name,
              undefined,
              false,
              () => loadRepository(repo.currentRepoPath),
            );
            await loadRemotesList(repo.currentRepoPath);
          } catch (e: any) {
            toast.error(`Fetch '${name}' thất bại`, e?.message || e);
          }
        }}
        onPublishRepo={() => (modalState.showPublishModal = true)}
        onCloseSidebar={() => (isSidebarOpen = false)}
        onOpenStashShelf={(index) => modalState.openStashShelf(index ?? 0)}
      />
    {/if}

    <!-- Center & Right Views -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <!-- Upstream Update Banner (Khi branch local đi sau remote) -->
      {#if repo.currentBranch && (repo.currentBranch.behind_count ?? 0) > 0 && remote.dismissedBehindBranch !== repo.currentBranch.shorthand}
        <UpstreamUpdateBanner
          currentBranch={repo.currentBranch}
          incomingCommits={remote.lastFetchResult?.incoming_commits || []}
          repoPath={repo.currentRepoPath}
          isSyncing={remote.isSyncing}
          onSmartSync={handleSafeSmartSync}
          onRebaseUpstream={handleSafeRebaseUpstream}
          onMergeUpstream={handleSafeMergeUpstream}
          onSelectCommit={(sha) => repo.selectCommitById(sha)}
          onDismiss={() => {
            if (repo.currentBranch) {
              remote.dismissBehindNotice(repo.currentBranch.shorthand);
            }
          }}
        />
      {/if}

      <RepoAlertBanner
        operationState={repoOpState}
        isDetached={repo.repoSummary?.is_detached ?? false}
        currentBranch={repo.repoSummary?.current_branch}
        headCommitId={repo.repoSummary?.head_commit_id}
        isOperating={isOperatingAlert}
        onContinueRebase={async () => {
          isOperatingAlert = true;
          try {
            await actions.continueRebaseAlert();
          } finally {
            isOperatingAlert = false;
          }
        }}
        onSkipRebase={async () => {
          isOperatingAlert = true;
          try {
            await actions.skipRebaseAlert();
          } finally {
            isOperatingAlert = false;
          }
        }}
        onAbortOperation={async () => {
          isOperatingAlert = true;
          try {
            await actions.abortCurrentOperationAlert();
          } finally {
            isOperatingAlert = false;
          }
        }}
        onOpenConflict={async () => {
          if (repo.currentRepoPath) {
            await safety.loadConflictFiles(repo.currentRepoPath);
          }
          viewMode = 'conflict';
        }}
        hideActions={viewMode === 'conflict'}
        onCreateBranchFromDetached={actions.createBranchFromDetached}
      />
      {#if viewMode !== 'pr' && viewMode !== 'conflict'}
        <RecentPushBanner
          pushedBranch={recentPushedBranch}
          targetBranch={repo.branches.some((b) => b.shorthand === "main") ? "main" : "master"}
          onCompareAndPR={(b) => {
            recentPushedBranch = null;
            tabState.updateActiveTabMeta({ recentPushedBranch: null });
            actions.openCreatePR(b);
          }}
          onDismiss={() => {
            recentPushedBranch = null;
            tabState.updateActiveTabMeta({ recentPushedBranch: null });
          }}
        />
        <RepoBindingBanner repoPath={repo.currentRepoPath} />
      {/if}

      <!-- Main Dynamic Content Views Switcher -->
      <MainViewSwitcher
        {repo}
        {wt}
        {safety}
        {remote}
        {modalState}
        {viewMode}
        {layoutMode}
        {comparisonResult}
        {isComparisonLoading}
        {originRemoteUrl}
        {explorerInitialFilePath}
        {explorerInitialCommitOid}
        onChangeViewMode={(mode) => (viewMode = mode)}
        onSetExplorerInitialFilePath={(path) => (explorerInitialFilePath = path)}
        onSetExplorerInitialCommitOid={(oid) => (explorerInitialCommitOid = oid)}
        {loadRepository}
        {refreshWorkingTreeAndDiff}
        handleCompareCommits={actions.compareCommits}
        handleSwapComparison={actions.swapComparison}
        handleCherryPickCommit={actions.cherryPickCommit}
        handleRevertCommit={actions.revertCommit}
        handleResetToCommit={actions.resetToCommit}
        handlePushCurrentBranch={actions.pushCurrentBranch}
        handleUndo={actions.undo}
        handleOpenCreatePR={actions.openCreatePR}
        handleOpenDropAction={actions.openDropAction}
      />
    </main>
  </div>

  <!-- Bottom Global Status Bar -->
  <StatusBar
    repoSummary={repo.repoSummary}
    statusMessage={repo.statusMessage}
    visibleCommitsCount={repo.visibleCommits.length}
    dirtyFilesCount={wt.workingTreeStatus?.total_dirty_count || 0}
    stagedFilesCount={wt.workingTreeStatus?.total_staged_count || 0}
    currentIdentity={currentIdentity}
    transferProgress={remote.transferProgress}
    operationLogs={repo.operationLogs}
    isLogPanelOpen={repo.isLogPanelOpen}
    onOpenIdentity={() => (modalState.showIdentityModal = true)}
    onOpenTrash={() => safety.openTrash(repo.currentRepoPath)}
    onToggleLog={() => (repo.isLogPanelOpen = !repo.isLogPanelOpen)}
    onClearLog={() => (repo.operationLogs = [])}
  />

  <!-- Modals & Drawers Container -->
  <ModalsContainer
    {modalState}
    {repo}
    {wt}
    {safety}
    {remote}
    {tabState}
    {originRemoteUrl}
    {loadRepository}
    {refreshWorkingTreeAndDiff}
    onChangeViewMode={(mode) => (viewMode = mode)}
    handleUndo={actions.undo}
    handleRedo={actions.redo}
    handlePushCurrentBranch={actions.pushCurrentBranch}
    handleConfirmDeleteBranch={actions.confirmDeleteBranch}
    handleConfirmCreateBranch={actions.confirmCreateBranch}
    handleConfirmCreateTag={actions.confirmCreateTag}
    handleConfirmDeleteTag={actions.confirmDeleteTag}
    handleConfirmSquash={actions.confirmSquash}
    handleConfirmCleanMerged={actions.confirmCleanMerged}
    handleStartQuickHotfix={actions.startQuickHotfix}
    handleConfirmNukeFile={actions.confirmNukeFile}
    handleCherryPickDrop={actions.cherryPickDrop}
    handleMergeDrop={actions.mergeDrop}
    handleRebaseDrop={actions.rebaseDrop}
    handleCreateWorktree={actions.createWorktree}
    handleDeleteWorktree={actions.deleteWorktree}
    handleSelectWorktree={actions.selectWorktree}
    handleConfirmInitRepo={actions.confirmInitRepo}
    {loadRemotesList}
    {loadIdentity}
    handleOpenAI={actions.openAI}
    handleOpenWorktreesModal={actions.openWorktreesModal}
  />
</div>

<!-- Floating Interactive Toast Notifications -->
<ToastContainer />
