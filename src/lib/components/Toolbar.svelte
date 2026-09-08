<script lang="ts">
  import type { AccountProfile, BranchInfo, LayoutMode, RepoSummary, ViewMode, WorkspaceTab } from '../types';
  import {
    FolderOpen,
    GitBranch,
    FolderGit2,
    PanelLeftClose,
    PanelLeft,
    Sun,
    Moon,
    Monitor,
  } from 'lucide-svelte';
  import { themeState } from '../state/themeState.svelte';
  import { localeState } from '../state/localeState.svelte';
  import ToolbarViewModes from './toolbar/ToolbarViewModes.svelte';
  import ToolbarSearchFilters from './toolbar/ToolbarSearchFilters.svelte';
  import ToolbarActions from './toolbar/ToolbarActions.svelte';
  import ToolbarMoreMenu from './toolbar/ToolbarMoreMenu.svelte';
  import WorkspaceTabBar from './toolbar/WorkspaceTabBar.svelte';

  interface Props {
    repoSummary: RepoSummary | null;
    branches?: BranchInfo[];
    searchQuery: string;
    commitLimit: number;
    isLoading: boolean;
    isSyncing?: boolean;
    isPushing?: boolean;
    viewMode: ViewMode;
    layoutMode?: LayoutMode;
    dirtyFilesCount: number;
    stagedFilesCount: number;
    conflictedFilesCount?: number;
    openPRCount?: number;
    isSidebarOpen?: boolean;
    filterHideMerges?: boolean;
    filterMyCommits?: boolean;
    authors?: Array<{ name: string; email: string; count: number }>;
    filterAuthor?: string;
    filterDateRange?: 'all' | '24h' | '7d' | '30d' | 'custom';
    filterDateFrom?: string | null;
    filterDateTo?: string | null;
    workspaceTabs?: WorkspaceTab[];
    activeTabId?: string | null;
    onSelectTab?: (tab: WorkspaceTab) => void;
    onCloseTab?: (id: string) => void;
    onCloseOtherTabs?: (keepId: string) => void;
    onRevealInExplorer?: (path: string) => void;
    onToggleSidebar?: () => void;
    onOpenRepo: () => void;
    onRefresh: () => void;
    onSearchChange: (query: string) => void;
    onLimitChange: (limit: number) => void;
    onChangeViewMode: (mode: ViewMode) => void;
    onChangeLayoutMode?: (mode: LayoutMode) => void;
    onToggleHideMerges?: () => void;
    onToggleMyCommits?: () => void;
    onSelectAuthor?: (author: string) => void;
    onSelectDateRange?: (range: 'all' | '24h' | '7d' | '30d' | 'custom') => void;
    onSetCustomDates?: (from: string | null, to: string | null) => void;
    onClearAllFilters?: () => void;
    onOpenTrash: () => void;
    onOpenWorktrees?: () => void;
    onSmartSync?: () => void;
    onPush?: () => void;
    onPublishBranch?: (branch: BranchInfo) => void;
    onOpenPalette?: () => void;
    onOpenBisect?: () => void;
    onOpenTimeMachine?: () => void;
    onOpenLostAndFound?: () => void;
    onOpenStashShelf?: () => void;
    onOpenAI?: () => void;
    onOpenSubmodules?: () => void;
    onOpenLfs?: () => void;
    onOpenGuide?: () => void;
    onOpenPlaybook?: () => void;
    onOpenInsights?: () => void;
    onOpenGitHooks?: () => void;
    activeAccount?: AccountProfile | null;
    onOpenAuth?: () => void;
    onOpenQuickHotfix?: () => void;
    activeHotfixBranch?: string | null;
    onRestoreHotfixStash?: () => void;
    remotesCount?: number;
    onPublishRepo?: () => void;
  }

  let {
    repoSummary,
    branches = [],
    searchQuery = $bindable(''),
    commitLimit = 2000,
    isLoading = false,
    isSyncing = false,
    isPushing = false,
    viewMode = 'graph',
    dirtyFilesCount = 0,
    stagedFilesCount = 0,
    conflictedFilesCount = 0,
    openPRCount = 0,
    isSidebarOpen = true,
    layoutMode = 'horizontal',
    filterHideMerges = false,
    filterMyCommits = false,
    authors = [],
    filterAuthor = '',
    filterDateRange = 'all',
    filterDateFrom = null,
    filterDateTo = null,
    workspaceTabs = [],
    activeTabId = null,
    onSelectTab,
    onCloseTab,
    onCloseOtherTabs,
    onRevealInExplorer,
    activeAccount = null,
    onToggleSidebar,
    onOpenRepo,
    onRefresh,
    onSearchChange,
    onLimitChange,
    onChangeViewMode,
    onChangeLayoutMode,
    onToggleHideMerges,
    onToggleMyCommits,
    onSelectAuthor,
    onSelectDateRange,
    onSetCustomDates,
    onClearAllFilters,
    onOpenTrash,
    onOpenWorktrees,
    onSmartSync,
    onPush,
    onPublishBranch,
    onOpenPalette,
    onOpenBisect,
    onOpenTimeMachine,
    onOpenLostAndFound,
    onOpenStashShelf,
    onOpenAI,
    onOpenSubmodules,
    onOpenLfs,
    onOpenGuide,
    onOpenPlaybook,
    onOpenInsights,
    onOpenGitHooks,
    onOpenAuth,
    onOpenQuickHotfix,
    activeHotfixBranch = null,
    onRestoreHotfixStash,
    remotesCount = 1,
    onPublishRepo,
  }: Props = $props();

  let showToolsMenu = $state(false);
  let currentBranch = $derived(branches.find((b) => b.is_head));

  function handleWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (showToolsMenu && !target.closest('.tools-menu-container')) {
      showToolsMenu = false;
    }
  }
</script>

<svelte:window onclick={handleWindowClick} />

<header class="relative z-40 h-12 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-2 sm:px-3 flex items-center justify-between select-none shrink-0 gap-1 sm:gap-2 w-full max-w-full">
  <!-- Left: Sidebar Toggle, App Logo & Unified Repo/Branch Breadcrumb or Tabs -->
  <div class="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
    <!-- Sidebar Toggle Button -->
    {#if onToggleSidebar}
      <button
        onclick={onToggleSidebar}
        class="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
        title={isSidebarOpen ? localeState.t('toolbar.collapseSidebar') : localeState.t('toolbar.expandSidebar')}
      >
        {#if isSidebarOpen}
          <PanelLeftClose class="w-4 h-4" />
        {:else}
          <PanelLeft class="w-4 h-4" />
        {/if}
      </button>
    {/if}

    <!-- Logo / App Name -->
    <div class="flex items-center gap-1.5 sm:gap-2 font-bold tracking-tight text-zinc-900 dark:text-white select-none shrink-0">
      <div class="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-center shadow-xs">
        <FolderGit2 class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 stroke-[2.2]" />
      </div>
      <span class="text-sm font-bold text-zinc-800 dark:text-zinc-100 hidden 2xl:inline">FlowGit</span>
    </div>

    <!-- Unified Workspace Tabs or Fallback Breadcrumb -->
    {#if workspaceTabs.length > 0 && onSelectTab && onCloseTab}
      <WorkspaceTabBar
        tabs={workspaceTabs}
        {activeTabId}
        {onSelectTab}
        {onCloseTab}
        {onCloseOtherTabs}
        onOpenNewRepo={onOpenRepo}
        {onOpenWorktrees}
        {onRevealInExplorer}
      />
    {:else}
      <!-- Unified Repo & Branch Breadcrumb Fallback -->
      <div class="flex items-center bg-zinc-100 dark:bg-zinc-900/90 hover:bg-zinc-200/80 dark:hover:bg-zinc-850/90 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-0.5 transition-all max-w-[140px] sm:max-w-[190px] lg:max-w-[240px] min-w-0 shrink group">
        <button
          onclick={onOpenRepo}
          class="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800/60 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer min-w-0 truncate"
          title={repoSummary ? `Repository: ${repoSummary.name} (${repoSummary.path})` : 'Open Git Repository'}
        >
          <FolderOpen class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0 group-hover:text-cyan-600 dark:group-hover:text-cyan-400" />
          <span class="truncate font-mono text-[11px] max-w-[65px] sm:max-w-[95px] md:max-w-[125px]">
            {repoSummary ? repoSummary.name : 'Open Repo...'}
          </span>
        </button>
        {#if repoSummary?.current_branch}
          <span class="text-zinc-400 dark:text-zinc-600 text-xs select-none">/</span>
          <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800/80 border border-zinc-300/80 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200 text-[11px] font-medium font-mono min-w-0 shrink" title="Current Branch: {repoSummary.current_branch}">
            <GitBranch class="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span class="truncate max-w-[50px] sm:max-w-[70px] md:max-w-[90px]">{repoSummary.current_branch}</span>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Main View Mode Switcher: Clean, Unified Segmented Control -->
    <ToolbarViewModes
      {viewMode}
      {dirtyFilesCount}
      {stagedFilesCount}
      {conflictedFilesCount}
      {openPRCount}
      {onChangeViewMode}
    />
  </div>

  <!-- Right: Search/Filters (Graph Mode) + Actions & Tools -->
  <div class="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0 justify-end">
    {#if viewMode === 'graph'}
      <ToolbarSearchFilters
        bind:searchQuery
        {filterHideMerges}
        {filterMyCommits}
        {authors}
        {filterAuthor}
        {filterDateRange}
        {filterDateFrom}
        {filterDateTo}
        {layoutMode}
        {onSearchChange}
        {onToggleHideMerges}
        {onToggleMyCommits}
        {onSelectAuthor}
        {onSelectDateRange}
        {onSetCustomDates}
        {onClearAllFilters}
        {onChangeLayoutMode}
      />
      <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5 hidden xl:block shrink-0"></div>
    {/if}

    <!-- Toolbar Action Buttons -->
    <ToolbarActions
      {currentBranch}
      {isLoading}
      {isSyncing}
      {isPushing}
      {remotesCount}
      {activeHotfixBranch}
      {onOpenPalette}
      {onSmartSync}
      {onPush}
      {onPublishBranch}
      {onPublishRepo}
      {onRefresh}
      {onOpenAI}
      {onOpenQuickHotfix}
      {onRestoreHotfixStash}
      {onOpenGuide}
      {onOpenPlaybook}
      {onOpenInsights}
    />

    <!-- More Tools Dropdown Container -->
    <ToolbarMoreMenu
      {currentBranch}
      {commitLimit}
      bind:showToolsMenu
      onToggleToolsMenu={() => (showToolsMenu = !showToolsMenu)}
      onCloseToolsMenu={() => (showToolsMenu = false)}
      {onOpenGuide}
      {onOpenPlaybook}
      {onPush}
      {onOpenPalette}
      {onOpenTimeMachine}
      {onOpenLostAndFound}
      {onOpenStashShelf}
      {onOpenBisect}
      {onOpenWorktrees}
      {onOpenSubmodules}
      {onOpenLfs}
      {onOpenTrash}
      {onOpenInsights}
      {onOpenGitHooks}
      {onLimitChange}
    />

    <!-- Theme Switcher Button -->
    <button
      onclick={() => themeState.toggleTheme()}
      class="flex items-center gap-1.5 p-1 sm:px-1.5 sm:py-1 rounded-md border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer shrink-0"
      title={localeState.t('toolbar.themeToggle', { mode: themeState.theme === 'system' ? localeState.t('toolbar.themeSystem') : themeState.isDark ? localeState.t('toolbar.themeDark') : localeState.t('toolbar.themeLight') })}
    >
      {#if themeState.theme === 'system'}
        <Monitor class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
      {:else if themeState.isDark}
        <Moon class="w-3.5 h-3.5 text-indigo-400" />
      {:else}
        <Sun class="w-3.5 h-3.5 text-amber-500" />
      {/if}
      <span class="text-xs font-medium hidden 2xl:inline capitalize">
        {themeState.theme === 'system' ? 'Auto' : themeState.isDark ? 'Dark' : 'Light'}
      </span>
    </button>

    <!-- Account / Login Button -->
    {#if onOpenAuth}
      <button
        onclick={onOpenAuth}
        class="flex items-center gap-1.5 p-1 sm:px-1.5 sm:py-1 rounded-md border transition-all cursor-pointer group shrink-0 {activeAccount ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-750' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}"
        title={activeAccount ? localeState.t('toolbar.signedInAs', { username: activeAccount.username, provider: activeAccount.provider }) : localeState.t('toolbar.signInTitle')}
      >
        {#if activeAccount?.avatar_url}
          <img src={activeAccount.avatar_url} alt="Avatar" class="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0" />
        {:else}
          <svg class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        {/if}
        <span class="text-xs font-medium hidden 2xl:inline truncate max-w-[80px]">
          {activeAccount ? `@${activeAccount.username}` : localeState.t('toolbar.signIn')}
        </span>
      </button>
    {/if}
  </div>
</header>
