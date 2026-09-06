<script lang="ts">
  import type { ViewMode } from '../../types';
  import {
    GitGraph,
    Crosshair,
    Box,
    Network,
    Layers,
    FileCode,
    GitPullRequest,
    GitCompare,
    Split,
  } from 'lucide-svelte';

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
</script>

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
    class="px-1.5 sm:px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer relative {viewMode === 'pr' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40'}"
    title={openPRCount > 0 ? `Pull Requests (${openPRCount} PRs đang mở)` : 'Pull Requests (Cloud Code Review - GitHub)'}
  >
    <div class="relative flex items-center shrink-0">
      <GitPullRequest class="w-3.5 h-3.5 shrink-0 {openPRCount > 0 && viewMode !== 'pr' ? 'text-amber-500 dark:text-amber-400' : ''}" />
      {#if openPRCount > 0}
        <span class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse {viewMode === 'pr' ? 'hidden' : 'sm:hidden'}"></span>
      {/if}
    </div>
    <span class="{viewMode === 'pr' || openPRCount > 0 ? 'inline' : 'hidden sm:inline'} text-[11px]">PRs</span>
    {#if openPRCount > 0}
      <span
        class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 {viewMode === 'pr' ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40' : 'bg-amber-500/20 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/40 dark:border-amber-500/50 shadow-xs'}"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>
        <span>{openPRCount}</span>
      </span>
    {/if}
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
