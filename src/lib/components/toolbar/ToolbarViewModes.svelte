<script lang="ts">
  import type { ViewMode } from '../../types';
  import {
    GitGraph,
    Layers,
    GitPullRequest,
    Split,
    ChevronDown,
    Crosshair,
    Box,
    Network,
    FileCode,
    GitCompare,
  } from 'lucide-svelte';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    viewMode: ViewMode;
    dirtyFilesCount: number;
    stagedFilesCount: number;
    conflictedFilesCount?: number;
    openPRCount?: number;
    onChangeViewMode: (mode: ViewMode) => void;
  }

  let {
    viewMode,
    dirtyFilesCount = 0,
    stagedFilesCount = 0,
    conflictedFilesCount = 0,
    openPRCount = 0,
    onChangeViewMode,
  }: Props = $props();

  let showMoreDropdown = $state(false);

  const EXTENDED_MODES: ViewMode[] = ['focus', 'stacked', 'dag', 'files', 'compare'];
  let isExtendedModeActive = $derived(EXTENDED_MODES.includes(viewMode));

  function getExtendedModeLabel(mode: ViewMode): string {
    switch (mode) {
      case 'focus':
        return localeState.t('toolbar.viewModes.focus');
      case 'stacked':
        return localeState.t('toolbar.viewModes.stacked');
      case 'dag':
        return localeState.t('toolbar.viewModes.dag');
      case 'files':
        return localeState.t('toolbar.viewModes.files');
      case 'compare':
        return localeState.t('toolbar.viewModes.compare');
      default:
        return localeState.t('toolbar.viewModes.moreViews');
    }
  }

  function handleWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (showMoreDropdown && !target.closest('.more-views-dropdown-container')) {
      showMoreDropdown = false;
    }
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-0.5 shrink-0 shadow-inner">
  <!-- 1. PINNED TAB: Graph -->
  <button
    onclick={() => onChangeViewMode('graph')}
    class="px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer {viewMode === 'graph' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'}"
    title={localeState.t('toolbar.viewModes.graphTitle')}
  >
    <GitGraph class="w-3.5 h-3.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
    <span class="hidden xl:inline">{localeState.t('toolbar.viewModes.graph')}</span>
  </button>

  <!-- 2. PINNED TAB: Changes (Working Tree) -->
  <button
    onclick={() => onChangeViewMode('changes')}
    class="px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer {viewMode === 'changes' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'}"
    title={localeState.t('toolbar.viewModes.changesTitle')}
  >
    <Layers class="w-3.5 h-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
    <span class="{viewMode === 'changes' ? 'inline' : 'hidden xl:inline'} text-[11px]">{localeState.t('toolbar.viewModes.changes')}</span>
    {#if dirtyFilesCount > 0 || stagedFilesCount > 0}
      <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {stagedFilesCount > 0 ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 font-bold' : 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 font-bold'}">
        {stagedFilesCount > 0 ? `${stagedFilesCount}S` : dirtyFilesCount}
      </span>
    {/if}
  </button>

  <!-- 3. PINNED TAB: GitHub PRs -->
  <button
    onclick={() => onChangeViewMode('pr')}
    class="px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer relative {viewMode === 'pr' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'}"
    title={openPRCount > 0 ? `Pull Requests (${localeState.t('toolbar.viewModes.prsOpen', { count: openPRCount })})` : localeState.t('toolbar.viewModes.prsTitle')}
  >
    <div class="relative flex items-center shrink-0">
      <GitPullRequest class="w-3.5 h-3.5 shrink-0 {openPRCount > 0 && viewMode !== 'pr' ? 'text-amber-500 dark:text-amber-400' : 'text-violet-500 dark:text-violet-400'}" />
      {#if openPRCount > 0}
        <span class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse {viewMode === 'pr' ? 'hidden' : 'sm:hidden'}"></span>
      {/if}
    </div>
    <span class="{viewMode === 'pr' ? 'inline' : 'hidden xl:inline'} text-[11px]">{localeState.t('toolbar.viewModes.prs')}</span>
    {#if openPRCount > 0}
      <span
        class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 {viewMode === 'pr' ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40' : 'bg-amber-500/20 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/40 dark:border-amber-500/50 shadow-xs'}"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>
        <span>{openPRCount}</span>
      </span>
    {/if}
  </button>

  <!-- 5. DYNAMIC TAB: Conflicts Resolver (Only visible when conflicts exist or active) -->
  {#if viewMode === 'conflict' || conflictedFilesCount > 0}
    <button
      onclick={() => onChangeViewMode('conflict')}
      class="px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer shrink-0 {viewMode === 'conflict' ? 'bg-rose-600 text-white shadow-sm font-semibold' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 animate-pulse'}"
      title={localeState.t('toolbar.viewModes.conflictsTitle')}
    >
      <Split class="w-3.5 h-3.5 shrink-0" />
      <span class="inline text-[11px] font-bold">{localeState.t('toolbar.viewModes.conflicts')}</span>
      {#if conflictedFilesCount > 0}
        <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-bold">
          {conflictedFilesCount}
        </span>
      {/if}
    </button>
  {/if}

  <!-- 6. MORE VIEWS DROPDOWN (Extended Views) -->
  <div class="relative more-views-dropdown-container">
    <button
      onclick={() => (showMoreDropdown = !showMoreDropdown)}
      class="px-2 py-1 rounded-md flex items-center gap-1 text-xs font-medium transition-all cursor-pointer {isExtendedModeActive ? 'bg-white dark:bg-zinc-800 text-cyan-700 dark:text-cyan-300 font-semibold shadow-xs border border-cyan-300 dark:border-cyan-700/60' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'}"
      title={localeState.t('toolbar.viewModes.moreViewsTitle')}
    >
      <span class="text-[11px] {isExtendedModeActive ? 'inline' : 'hidden lg:inline'}">
        {isExtendedModeActive ? getExtendedModeLabel(viewMode) : localeState.t('toolbar.viewModes.moreViews')}
      </span>
      <ChevronDown class="w-3 h-3 transition-transform {showMoreDropdown ? 'rotate-180' : ''}" />
    </button>

    {#if showMoreDropdown}
      <div class="absolute left-0 top-full mt-1.5 w-56 rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl p-1 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
        <div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-200/80 dark:border-zinc-800/80 mb-1">
          {localeState.t('toolbar.viewModes.moreViewsTitle')}
        </div>

        <!-- Focus Mode -->
        <button
          onclick={() => { showMoreDropdown = false; onChangeViewMode('focus'); }}
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer {viewMode === 'focus' ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300'}"
        >
          <Crosshair class="w-3.5 h-3.5 text-cyan-500" />
          <div class="flex-1 truncate">
            <div>{localeState.t('toolbar.viewModes.focus')}</div>
            <div class="text-[10px] text-zinc-400 truncate">{localeState.t('toolbar.viewModes.focusTitle')}</div>
          </div>
        </button>

        <!-- Stacked Commits Flow -->
        <button
          onclick={() => { showMoreDropdown = false; onChangeViewMode('stacked'); }}
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer {viewMode === 'stacked' ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300'}"
        >
          <Box class="w-3.5 h-3.5 text-indigo-500" />
          <div class="flex-1 truncate">
            <div>{localeState.t('toolbar.viewModes.stacked')}</div>
            <div class="text-[10px] text-zinc-400 truncate">{localeState.t('toolbar.viewModes.stackedTitle')}</div>
          </div>
        </button>

        <!-- 2D Interactive DAG Map -->
        <button
          onclick={() => { showMoreDropdown = false; onChangeViewMode('dag'); }}
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer {viewMode === 'dag' ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300'}"
        >
          <Network class="w-3.5 h-3.5 text-emerald-500" />
          <div class="flex-1 truncate">
            <div>{localeState.t('toolbar.viewModes.dag')}</div>
            <div class="text-[10px] text-zinc-400 truncate">{localeState.t('toolbar.viewModes.dagTitle')}</div>
          </div>
        </button>

        <!-- Repository File Explorer -->
        <button
          onclick={() => { showMoreDropdown = false; onChangeViewMode('files'); }}
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer {viewMode === 'files' ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300'}"
        >
          <FileCode class="w-3.5 h-3.5 text-amber-500" />
          <div class="flex-1 truncate">
            <div>{localeState.t('toolbar.viewModes.files')}</div>
            <div class="text-[10px] text-zinc-400 truncate">{localeState.t('toolbar.viewModes.filesTitle')}</div>
          </div>
        </button>

        <!-- Commit Compare -->
        <button
          onclick={() => { showMoreDropdown = false; onChangeViewMode('compare'); }}
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer {viewMode === 'compare' ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300'}"
        >
          <GitCompare class="w-3.5 h-3.5 text-purple-500" />
          <div class="flex-1 truncate">
            <div>{localeState.t('toolbar.viewModes.compare')}</div>
            <div class="text-[10px] text-zinc-400 truncate">{localeState.t('toolbar.viewModes.compareTitle')}</div>
          </div>
        </button>
      </div>
    {/if}
  </div>
</div>
