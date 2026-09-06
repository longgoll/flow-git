<script lang="ts">
  import type { AccountProfile, BranchInfo, LayoutMode, RepoSummary, ViewMode } from '../types';
  import {
    BookOpen,
    FolderOpen,
    GitBranch,
    Search,
    RefreshCw,
    ShieldCheck,
    Layers,
    GitGraph,
    FolderGit2,
    CloudDownload,
    CloudUpload,
    Upload,
    GitCompare,
    Command,
    History,
    Bug,
    Sparkles,
    Split,
    FileCode,
    PanelLeftClose,
    PanelLeft,
    MoreHorizontal,
    Box,
    Database,
    Columns3,
    Rows2,
    GitMerge,
    UserCheck,
    Crosshair,
    Network,
    X,
    Flame,
    GitPullRequest,
    LifeBuoy,
    Sun,
    Moon,
    Monitor,
  } from 'lucide-svelte';
  import { themeState } from '../state/themeState.svelte';

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
    isSidebarOpen?: boolean;
    filterHideMerges?: boolean;
    filterMyCommits?: boolean;
    onToggleSidebar?: () => void;
    onOpenRepo: () => void;
    onRefresh: () => void;
    onSearchChange: (query: string) => void;
    onLimitChange: (limit: number) => void;
    onChangeViewMode: (mode: ViewMode) => void;
    onChangeLayoutMode?: (mode: LayoutMode) => void;
    onToggleHideMerges?: () => void;
    onToggleMyCommits?: () => void;
    onOpenTrash: () => void;
    onOpenWorktrees?: () => void;
    onSmartSync?: () => void;
    onPush?: () => void;
    onPublishBranch?: (branch: BranchInfo) => void;
    onOpenPalette?: () => void;
    onOpenBisect?: () => void;
    onOpenTimeMachine?: () => void;
    onOpenAI?: () => void;
    onOpenSubmodules?: () => void;
    onOpenLfs?: () => void;
    onOpenGuide?: () => void;
    onOpenPlaybook?: () => void;
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
    isSidebarOpen = true,
    layoutMode = 'horizontal',
    filterHideMerges = false,
    filterMyCommits = false,
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
    onOpenTrash,
    onOpenWorktrees,
    onSmartSync,
    onPush,
    onPublishBranch,
    onOpenPalette,
    onOpenBisect,
    onOpenTimeMachine,
    onOpenAI,
    onOpenSubmodules,
    onOpenLfs,
    onOpenGuide,
    onOpenPlaybook,
    onOpenAuth,
    onOpenQuickHotfix,
    activeHotfixBranch = null,
    onRestoreHotfixStash,
    remotesCount = 1,
    onPublishRepo,
  }: Props = $props();

  let showToolsMenu = $state(false);
  let currentBranch = $derived(branches.find((b) => b.is_head));

  function handleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    searchQuery = val;
    onSearchChange(val);
  }

  function handleWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (showToolsMenu && !target.closest('.tools-menu-container')) {
      showToolsMenu = false;
    }
  }
</script>

<svelte:window onclick={handleWindowClick} />

<header class="relative z-40 h-12 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-2 sm:px-3 flex items-center justify-between select-none shrink-0 gap-1 sm:gap-2 w-full max-w-full">
  <!-- Left: Sidebar Toggle, App Logo & Unified Repo/Branch Breadcrumb -->
  <div class="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
    <!-- Sidebar Toggle Button -->
    {#if onToggleSidebar}
      <button
        onclick={onToggleSidebar}
        class="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
        title={isSidebarOpen ? 'Thu gọn Sidebar (Ctrl+B)' : 'Mở rộng Sidebar (Ctrl+B)'}
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

    <!-- Unified Repo & Branch Breadcrumb -->
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

    <!-- Main View Mode Switcher: Clean, Unified Segmented Control -->
    <div class="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-0.5 shrink-0 shadow-inner">
      <button
        onclick={() => onChangeViewMode('graph')}
        class="px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer {viewMode === 'graph' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'}"
        title="Commit History Graph"
      >
        <GitGraph class="w-3.5 h-3.5 shrink-0" />
        <span class="hidden sm:inline">Graph</span>
      </button>
      <button
        onclick={() => onChangeViewMode('focus')}
        class="px-1.5 sm:px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer {viewMode === 'focus' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'}"
        title="Focus / Linear View (Cô lập nhánh hiện tại)"
      >
        <Crosshair class="w-3.5 h-3.5 shrink-0" />
        <span class="{viewMode === 'focus' ? 'inline' : 'hidden'} text-[11px]">Focus</span>
      </button>
      <button
        onclick={() => onChangeViewMode('stacked')}
        class="px-1.5 sm:px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer {viewMode === 'stacked' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'}"
        title="Stacked Commits Flow (Reorder & Squash)"
      >
        <Box class="w-3.5 h-3.5 shrink-0" />
        <span class="{viewMode === 'stacked' ? 'inline' : 'hidden'} text-[11px]">Stacked</span>
      </button>
      <button
        onclick={() => onChangeViewMode('dag')}
        class="px-1.5 sm:px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer {viewMode === 'dag' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'}"
        title="2D Interactive DAG Map (Figma-style Canvas)"
      >
        <Network class="w-3.5 h-3.5 shrink-0" />
        <span class="{viewMode === 'dag' ? 'inline' : 'hidden'} text-[11px]">DAG Map</span>
      </button>
      <button
        onclick={() => onChangeViewMode('changes')}
        class="px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer {viewMode === 'changes' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'}"
        title="Working Tree Changes"
      >
        <Layers class="w-3.5 h-3.5 shrink-0" />
        <span class="{viewMode === 'changes' ? 'inline' : 'hidden 2xl:inline'} text-[11px]">Changes</span>
        {#if dirtyFilesCount > 0 || stagedFilesCount > 0}
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {stagedFilesCount > 0 ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 font-bold' : 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 font-bold'}">
            {stagedFilesCount > 0 ? `${stagedFilesCount}S` : dirtyFilesCount}
          </span>
        {/if}
      </button>
      <button
        onclick={() => onChangeViewMode('files')}
        class="px-1.5 sm:px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer {viewMode === 'files' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'}"
        title="Repository Files & Code Viewer (Monaco VS Code Engine)"
      >
        <FileCode class="w-3.5 h-3.5 shrink-0" />
        <span class="{viewMode === 'files' ? 'inline' : 'hidden'} text-[11px]">Files</span>
      </button>
      <button
        onclick={() => onChangeViewMode('pr')}
        class="px-1.5 sm:px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer {viewMode === 'pr' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'}"
        title="Pull Requests (Cloud Code Review - GitHub)"
      >
        <GitPullRequest class="w-3.5 h-3.5 shrink-0" />
        <span class="{viewMode === 'pr' ? 'inline' : 'hidden'} text-[11px]">PRs</span>
      </button>
      {#if viewMode === 'compare'}
        <button
          onclick={() => onChangeViewMode('compare')}
          class="px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs shrink-0 font-semibold border border-zinc-200 dark:border-zinc-700/60"
        >
          <GitCompare class="w-3.5 h-3.5 shrink-0" />
          <span class="hidden sm:inline">Compare</span>
        </button>
      {/if}
      {#if viewMode === 'conflict' || conflictedFilesCount > 0}
        <button
          onclick={() => onChangeViewMode('conflict')}
          class="px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer shrink-0 {viewMode === 'conflict' ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 animate-pulse'}"
        >
          <Split class="w-3.5 h-3.5 shrink-0" />
          <span class="hidden sm:inline">Conflicts</span>
          {#if conflictedFilesCount > 0}
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-bold">
              {conflictedFilesCount}
            </span>
          {/if}
        </button>
      {/if}
    </div>
  </div>

  <!-- Right: Search/Filters (Graph Mode) + Actions & Tools -->
  <div class="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0 justify-end">
    {#if viewMode === 'graph'}
      <!-- Commit Search Filter (Compact, expands smoothly on focus) -->
      <div class="relative min-w-[60px] w-20 sm:w-28 md:w-32 lg:w-36 focus-within:!w-48 transition-all duration-150 shrink-0">
        <Search class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-2 top-2 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter..."
          value={searchQuery}
          oninput={handleInput}
          class="w-full bg-zinc-100 dark:bg-zinc-900/70 hover:bg-zinc-200/60 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 focus:border-cyan-500/60 rounded-md pl-7 pr-6 py-1 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
        />
        {#if searchQuery}
          <button
            onclick={() => { searchQuery = ''; onSearchChange(''); }}
            class="absolute right-1 top-1 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            title="Clear filter"
          >
            <X class="w-3 h-3" />
          </button>
        {/if}
      </div>

      <!-- Smart Filter Toggles: Compact icon buttons with active glow -->
      <div class="flex items-center bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-md p-0.5 shrink-0">
        {#if onToggleHideMerges}
          <button
            onclick={onToggleHideMerges}
            class="p-1 rounded text-xs font-medium flex items-center transition-all cursor-pointer {filterHideMerges ? 'bg-amber-500/20 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent'}"
            title={filterHideMerges ? 'Đang ẩn merge commits (Bấm để hiện)' : 'Bấm để ẩn merge commits (No Merges)'}
          >
            <GitMerge class="w-3.5 h-3.5" />
          </button>
        {/if}

        {#if onToggleMyCommits}
          <button
            onclick={onToggleMyCommits}
            class="p-1 rounded text-xs font-medium flex items-center transition-all cursor-pointer {filterMyCommits ? 'bg-cyan-500/20 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent'}"
            title={filterMyCommits ? 'Đang lọc commit của tôi (Bấm để hiện tất cả)' : 'Bấm để chỉ hiện commit của tôi (My Commits)'}
          >
            <UserCheck class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>

      <!-- Layout Toggle: Horizontal 2-Row vs 3-Column Diff-First -->
      {#if onChangeLayoutMode}
        <div class="hidden 2xl:flex items-center bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-md p-0.5 shrink-0" title="Chuyển đổi bố cục Graph">
          <button
            onclick={() => onChangeLayoutMode?.('horizontal')}
            class="p-1 rounded text-xs transition-all cursor-pointer {layoutMode === 'horizontal' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-sm border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
            title="Layout Ngang (Graph trên, Detail dưới)"
          >
            <Rows2 class="w-3.5 h-3.5" />
          </button>
          <button
            onclick={() => onChangeLayoutMode?.('three-column')}
            class="p-1 rounded text-xs transition-all cursor-pointer {layoutMode === 'three-column' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-sm border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
            title="3-Column Diff-First (Sublime Merge style)"
          >
            <Columns3 class="w-3.5 h-3.5" />
          </button>
        </div>
      {/if}

      <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5 hidden xl:block shrink-0"></div>
    {/if}

    <!-- Command Palette Quick Button -->
    {#if onOpenPalette}
      <button
        onclick={onOpenPalette}
        class="hidden 2xl:flex items-center gap-1 px-1.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs transition-all cursor-pointer group shadow-xs shrink-0"
        title="Command Palette (Ctrl+K)"
      >
        <Command class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
        <kbd class="text-[9px] font-mono text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-1 py-0.2 rounded border border-zinc-300 dark:border-zinc-700/60">⌘K</kbd>
      </button>
    {/if}

    <!-- 1-Click Smart Sync -->
    {#if onSmartSync}
      <button
        onclick={onSmartSync}
        disabled={isSyncing}
        class="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all cursor-pointer group disabled:opacity-50 shrink-0"
        title="1-Click Smart Sync (Fetch & Fast-Forward)"
      >
        <CloudDownload class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform {isSyncing ? 'animate-bounce' : ''}" />
        <span class="text-[11px] hidden xl:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
      </button>
    {/if}

    <!-- Push / Publish Button -->
    {#if onPush}
      {#if currentBranch && !currentBranch.upstream_name}
        <button
          onclick={() => onPublishBranch ? onPublishBranch(currentBranch) : onPush?.()}
          disabled={isPushing}
          class="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-100 dark:bg-cyan-950/80 hover:bg-cyan-200 dark:hover:bg-cyan-900 border border-cyan-300 dark:border-cyan-600/50 text-xs text-cyan-800 dark:text-cyan-300 hover:text-cyan-950 dark:hover:text-white transition-all cursor-pointer group shadow-sm disabled:opacity-50 shrink-0 font-medium"
          title={`Publish nhánh hiện tại (${currentBranch.shorthand}) lên remote origin`}
        >
          <CloudUpload class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform {isPushing ? 'animate-bounce' : ''}" />
          <span class="text-[11px] font-semibold hidden xl:inline">{isPushing ? 'Publishing...' : 'Publish'}</span>
        </button>
      {:else}
        <button
          onclick={onPush}
          disabled={isPushing || (currentBranch && currentBranch.ahead_count === 0)}
          class="flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-all {currentBranch && currentBranch.ahead_count > 0
            ? 'bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 border-emerald-300 dark:border-emerald-600/50 text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white cursor-pointer shadow-xs font-medium'
            : 'bg-zinc-100/60 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-40'} disabled:opacity-40 shrink-0"
          title={currentBranch && currentBranch.ahead_count > 0
            ? `Push ${currentBranch.ahead_count} commit(s) lên ${currentBranch?.upstream_name || 'remote'}`
            : 'Đã đồng bộ mới nhất với remote (Không có commit mới để push)'}
        >
          <Upload class="w-3.5 h-3.5 {currentBranch && currentBranch.ahead_count > 0 ? 'text-emerald-600 dark:text-emerald-400 group-hover:scale-105' : 'text-zinc-400 dark:text-zinc-500'} transition-transform {isPushing ? 'animate-bounce' : ''}" />
          <span class="text-[11px] hidden xl:inline">{isPushing ? 'Pushing...' : 'Push'}</span>
          {#if currentBranch && currentBranch.ahead_count > 0}
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-600 text-white font-bold">
              {currentBranch.ahead_count}
            </span>
          {/if}
        </button>
      {/if}
    {/if}

    <!-- Publish to GitHub Button (when repository has no remote) -->
    {#if remotesCount === 0 && onPublishRepo}
      <button
        onclick={onPublishRepo}
        class="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-950/70 hover:bg-indigo-200 dark:hover:bg-indigo-900 border border-indigo-300 dark:border-indigo-500/40 text-xs text-indigo-800 dark:text-indigo-200 hover:text-indigo-950 dark:hover:text-white transition-all cursor-pointer shadow-xs group shrink-0"
        title="Xuất bản repository lên GitHub (chọn Công khai hoặc Riêng tư)"
      >
        <CloudUpload class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
        <span class="font-medium text-[11px] hidden sm:inline">Publish to GitHub</span>
      </button>
    {/if}

    <!-- Refresh Button -->
    <button
      onclick={onRefresh}
      disabled={isLoading}
      class="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer disabled:opacity-50 shrink-0"
      title="Refresh repository"
    >
      <RefreshCw class="w-3.5 h-3.5 {isLoading ? 'animate-spin text-cyan-500 dark:text-cyan-400' : ''}" />
    </button>

    <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5 hidden sm:block shrink-0"></div>

    <!-- AI Assistant Quick Button -->
    {#if onOpenAI}
      <button
        onclick={onOpenAI}
        class="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer group shadow-xs shrink-0"
        title="Local AI Assistant"
      >
        <Sparkles class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
        <span class="font-medium text-[11px] hidden sm:inline">AI</span>
      </button>
    {/if}

    <!-- Quick Hotfix 1-Chạm (Smart Stash & Switch) -->
    {#if activeHotfixBranch}
      <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/60 text-amber-800 dark:text-amber-300 text-xs shadow-xs shrink-0 animate-pulse">
        <Flame class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span class="font-medium text-[11px] max-w-[70px] sm:max-w-[100px] truncate">Hotfix: {activeHotfixBranch}</span>
        {#if onRestoreHotfixStash}
          <button
            onclick={onRestoreHotfixStash}
            class="ml-0.5 px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-semibold cursor-pointer shadow-xs transition-colors"
            title="Hoàn tất sửa lỗi & Khôi phục code dở dang (Pop Stash)"
          >
            Khôi phục
          </button>
        {/if}
      </div>
    {:else if onOpenQuickHotfix}
      <button
        onclick={onOpenQuickHotfix}
        class="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer group shadow-xs shrink-0"
        title="Quick Hotfix 1-Chạm (Smart Stash & Switch sang nhánh sửa lỗi khẩn cấp)"
      >
        <Flame class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-amber-500 transition-colors" />
        <span class="font-medium text-[11px] hidden 2xl:inline">Hotfix</span>
      </button>
    {/if}

    <!-- Playbook / User Guide Button (Cleaned up, accessible via More Menu (...) or F1) -->
    {#if onOpenGuide}
      <button
        onclick={onOpenGuide}
        class="hidden 3xl:flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer group shrink-0 shadow-xs"
        title="Sổ tay Hướng dẫn & Playbook thực chiến (F1 / Ctrl+/)"
      >
        <BookOpen class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors" />
        <span class="text-xs font-semibold">Playbook</span>
      </button>
    {/if}

    <!-- Emergency Rescue Kit Button (Cleaned up, accessible via More Menu (...)) -->
    {#if onOpenPlaybook}
      <button
        onclick={onOpenPlaybook}
        class="hidden 3xl:flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer group shrink-0 shadow-xs"
        title="Cứu hộ Khẩn cấp & Gỡ kẹt Git (Emergency Kit)"
      >
        <LifeBuoy class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors" />
        <span class="text-xs font-semibold">Cứu hộ</span>
      </button>
    {/if}

    <!-- More Tools Dropdown Container -->
    <div class="relative tools-menu-container">
      <button
        onclick={() => (showToolsMenu = !showToolsMenu)}
        class="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer {showToolsMenu ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-700' : ''}"
        title="More Git Tools, Guides & Settings"
      >
        <MoreHorizontal class="w-4 h-4" />
      </button>

      {#if showToolsMenu}
        <div class="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl p-1.5 z-50 text-xs font-sans animate-in fade-in slide-in-from-top-1 duration-150">
          <!-- Theme Switcher in Dropdown -->
          <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Giao diện (Theme)
          </div>
          <div class="grid grid-cols-3 gap-1 px-1 py-1 mb-1 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <button
              onclick={() => themeState.setTheme('light')}
              class="flex items-center justify-center gap-1 py-1 rounded text-xs transition-colors cursor-pointer {themeState.theme === 'light' ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 font-semibold shadow-xs border border-zinc-200 dark:border-zinc-700' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
              <Sun class="w-3 h-3 text-amber-500" />
              <span>Sáng</span>
            </button>
            <button
              onclick={() => themeState.setTheme('dark')}
              class="flex items-center justify-center gap-1 py-1 rounded text-xs transition-colors cursor-pointer {themeState.theme === 'dark' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs border border-zinc-200 dark:border-zinc-700' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
              <Moon class="w-3 h-3 text-indigo-400" />
              <span>Tối</span>
            </button>
            <button
              onclick={() => themeState.setTheme('system')}
              class="flex items-center justify-center gap-1 py-1 rounded text-xs transition-colors cursor-pointer {themeState.theme === 'system' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs border border-zinc-200 dark:border-zinc-700' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
              <Monitor class="w-3 h-3 text-cyan-500" />
              <span>Auto</span>
            </button>
          </div>

          <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>

          <!-- Guides & Help in Dropdown -->
          <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Guides & Rescue
          </div>
          {#if onOpenGuide}
            <button
              onclick={() => { showToolsMenu = false; onOpenGuide(); }}
              class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-zinc-700 dark:text-zinc-300 hover:text-cyan-900 dark:hover:text-cyan-200 transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <BookOpen class="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                <span>Playbook & Recipes</span>
              </div>
              <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">F1</span>
            </button>
          {/if}
          {#if onOpenPlaybook}
            <button
              onclick={() => { showToolsMenu = false; onOpenPlaybook(); }}
              class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/40 text-zinc-700 dark:text-zinc-300 hover:text-amber-900 dark:hover:text-amber-200 transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <LifeBuoy class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Cứu hộ khẩn cấp (Rescue Kit)</span>
              </div>
            </button>
          {/if}

          <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>

          <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Git Workflows
          </div>

          {#if onPush}
            <button
              onclick={() => { showToolsMenu = false; onPush(); }}
              class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <Upload class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{currentBranch && !currentBranch.upstream_name ? `Publish nhánh ${currentBranch.shorthand}` : 'Push to Remote'}</span>
              </div>
              {#if currentBranch && currentBranch.ahead_count > 0}
                <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{currentBranch.ahead_count}</span>
              {/if}
            </button>
          {/if}

          {#if onOpenPalette}
            <button
              onclick={() => { showToolsMenu = false; onOpenPalette(); }}
              class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <Command class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Command Palette</span>
              </div>
              <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">Ctrl+K</span>
            </button>
          {/if}

          {#if onOpenTimeMachine}
            <button
              onclick={() => { showToolsMenu = false; onOpenTimeMachine(); }}
              class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <History class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Time Machine (Undo)</span>
              </div>
              <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">Ctrl+Z</span>
            </button>
          {/if}

          {#if onOpenBisect}
            <button
              onclick={() => { showToolsMenu = false; onOpenBisect(); }}
              class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Bug class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Visual Git Bisect</span>
            </button>
          {/if}

          {#if onOpenWorktrees}
            <button
              onclick={() => { showToolsMenu = false; onOpenWorktrees(); }}
              class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              <FolderGit2 class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Worktrees Manager</span>
            </button>
          {/if}

          {#if onOpenSubmodules}
            <button
              onclick={() => { showToolsMenu = false; onOpenSubmodules(); }}
              class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Box class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Git Submodules</span>
            </button>
          {/if}

          {#if onOpenLfs}
            <button
              onclick={() => { showToolsMenu = false; onOpenLfs(); }}
              class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Database class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Git LFS Storage</span>
            </button>
          {/if}

          <button
            onclick={() => { showToolsMenu = false; onOpenTrash(); }}
            class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <ShieldCheck class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>48h Safe Discard Trash</span>
          </button>

          <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>

          <!-- Commit History Limit -->
          <div class="px-2.5 py-1.5">
            <div class="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center justify-between">
              <span>Commit Limit</span>
              <span class="font-mono text-zinc-600 dark:text-zinc-400">{commitLimit === 0 ? 'All' : commitLimit}</span>
            </div>
            <div class="grid grid-cols-4 gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-md border border-zinc-200 dark:border-zinc-800">
              {#each [500, 2000, 5000, 0] as lim}
                <button
                  onclick={() => onLimitChange(lim)}
                  class="py-0.5 rounded text-[10px] font-mono transition-colors text-center cursor-pointer {commitLimit === lim ? 'bg-cyan-600 text-white font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
                >
                  {lim === 0 ? 'All' : lim}
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Theme Switcher Button -->
    <button
      onclick={() => themeState.toggleTheme()}
      class="flex items-center gap-1.5 p-1 sm:px-1.5 sm:py-1 rounded-md border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer shrink-0"
      title="Đổi giao diện: Sáng / Tối ({themeState.theme === 'system' ? 'Theo hệ thống' : themeState.isDark ? 'Đang bật Chế độ Tối' : 'Đang bật Chế độ Sáng'})"
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
        title={activeAccount ? `Logged in as @${activeAccount.username} (${activeAccount.provider})` : 'Sign in with GitHub / Remote Auth'}
      >
        {#if activeAccount?.avatar_url}
          <img src={activeAccount.avatar_url} alt="Avatar" class="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0" />
        {:else}
          <svg class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        {/if}
        <span class="text-xs font-medium hidden 2xl:inline truncate max-w-[80px]">
          {activeAccount ? `@${activeAccount.username}` : 'Sign in'}
        </span>
      </button>
    {/if}
  </div>
</header>

