<script lang="ts">
  import { onMount } from 'svelte';
  import type { CommitDetail as ICommitDetail, CommitNode, FocusBranchResult } from '../types';
  import CommitGraph from './CommitGraph.svelte';
  import CommitDetail from './CommitDetail.svelte';
  import { getFocusBranchInfo } from '../api/repo';
  import {
    Crosshair,
    ArrowUpRight,
    ArrowDownLeft,
    RefreshCw,
    X,
    Check,
    AlertTriangle,
  } from 'lucide-svelte';

  interface Props {
    repoPath: string;
    currentBranchName?: string;
    selectedCommitId: string | null;
    selectedCommitIds?: string[];
    commitDetail: ICommitDetail | null;
    isDetailLoading: boolean;
    onSelectCommit: (commit: CommitNode) => void;
    onCloseFocus: () => void;
    onSyncWithBase?: (baseBranch?: string) => Promise<void>;
  }

  let {
    repoPath = '',
    currentBranchName = '',
    selectedCommitId = null,
    selectedCommitIds = [],
    commitDetail = null,
    isDetailLoading = false,
    onSelectCommit,
    onCloseFocus,
    onSyncWithBase,
  }: Props = $props();

  let focusData = $state<FocusBranchResult | null>(null);
  let isLoading = $state<boolean>(true);
  let isSyncing = $state<boolean>(false);
  let syncSuccess = $state<boolean>(false);
  let isDetailOpen = $state<boolean>(true);
  let isDetailMaximized = $state<boolean>(false);

  // Resizable Splitter state
  let detailHeight = $state<number>(360);
  let isResizing = $state<boolean>(false);
  let resizeStartY = 0;
  let resizeStartHeight = 0;

  function handleStartResize(e: MouseEvent) {
    isResizing = true;
    resizeStartY = e.clientY;
    resizeStartHeight = detailHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing) return;
      const deltaY = resizeStartY - moveEvent.clientY;
      detailHeight = Math.max(140, Math.min(window.innerHeight * 0.75, resizeStartHeight + deltaY));
    };

    const onMouseUp = () => {
      isResizing = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  onMount(() => {
    loadFocus();
  });

  async function loadFocus() {
    if (!repoPath) return;
    isLoading = true;
    try {
      const res = await getFocusBranchInfo(repoPath, currentBranchName || undefined);
      focusData = res;
      if (res.commits.length > 0 && !selectedCommitId) {
        onSelectCommit(res.commits[0]);
      }
      // If only few commits in focus, allocate generous height for detail panel (files changed)
      if (res.commits.length <= 3) {
        detailHeight = Math.max(380, Math.round(window.innerHeight * 0.55));
      }
    } catch (err) {
      console.error('Failed to load focus branch:', err);
    } finally {
      isLoading = false;
    }
  }

  async function handleSync() {
    if (!onSyncWithBase) return;
    isSyncing = true;
    try {
      await onSyncWithBase(focusData?.base_branch);
      syncSuccess = true;
      await loadFocus();
      setTimeout(() => (syncSuccess = false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      isSyncing = false;
    }
  }
</script>

<div class="flex-1 flex flex-col w-full h-full min-h-0 bg-white dark:bg-zinc-950 overflow-hidden select-none font-sans">
  <!-- Top Focus Header Banner -->
  <div class="px-4 py-2 border-b border-amber-300/70 dark:border-amber-900/50 bg-amber-50/60 dark:bg-zinc-900/50 flex items-center justify-between gap-4 shrink-0 shadow-xs">
    <div class="flex items-center gap-3 flex-wrap min-w-0">
      <div class="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
        <Crosshair class="w-4 h-4" />
      </div>

      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">Dev Focus Mode</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-500/20 border border-amber-300/80 dark:border-amber-500/30 text-amber-900 dark:text-amber-300 font-mono font-medium">
            Isolated Path
          </span>
        </div>
        <div class="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">
          <span class="text-amber-800 dark:text-amber-300 font-semibold">{focusData?.branch_name || currentBranchName || 'HEAD'}</span>
          <span class="text-zinc-400 dark:text-zinc-500">relative to</span>
          <span class="text-zinc-800 dark:text-zinc-200 bg-zinc-200/70 dark:bg-zinc-800 px-1.5 py-0.2 rounded border border-zinc-300 dark:border-zinc-700 font-semibold">{focusData?.base_branch || 'main'}</span>
        </div>
      </div>

      <!-- Ahead / Behind Stats -->
      {#if focusData}
        <div class="flex items-center gap-2 pl-3 border-l border-zinc-200 dark:border-zinc-800">
          <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-semibold" title="Commits you made ahead of base">
            <ArrowUpRight class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{focusData.ahead_count} Ahead</span>
          </div>

          {#if focusData.behind_count > 0}
            <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-mono font-semibold" title="Commits on base you don't have yet">
              <ArrowDownLeft class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{focusData.behind_count} Behind</span>
            </div>
          {:else}
            <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-mono font-medium" title="Up to date with base branch">
              <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>0 Behind</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Actions: 1-Click Sync & Exit -->
    <div class="flex items-center gap-2 shrink-0">
      {#if onSyncWithBase}
        <button
          onclick={handleSync}
          disabled={isSyncing || focusData?.behind_count === 0}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all {focusData?.behind_count === 0 ? 'bg-zinc-100 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-default opacity-80' : 'bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 cursor-pointer shadow-xs'}"
          title={focusData?.behind_count === 0 ? 'Nhánh của bạn đã đồng bộ mới nhất với base' : `Rebase ${focusData?.behind_count} commit(s) mới từ ${focusData?.base_branch}`}
        >
          {#if syncSuccess}
            <Check class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span class="text-emerald-700 dark:text-emerald-300 font-bold">Synced!</span>
          {:else if focusData?.behind_count === 0}
            <Check class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Up to date with Base</span>
          {:else}
            <RefreshCw class="w-3.5 h-3.5 {isSyncing ? 'animate-spin text-amber-600 dark:text-amber-400' : 'text-amber-700 dark:text-amber-400'}" />
            <span>{isSyncing ? 'Syncing...' : `Rebase onto ${focusData?.base_branch || 'Base'}`}</span>
          {/if}
        </button>
      {/if}

      <button
        onclick={onCloseFocus}
        class="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors cursor-pointer shadow-xs"
        title="Quay lại đồ thị đầy đủ"
      >
        <X class="w-3.5 h-3.5" />
        <span>Exit Focus</span>
      </button>
    </div>
  </div>

  <!-- Content: 1-Lane Linear Graph + Details Split -->
  <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
    {#if isLoading}
      <div class="h-full flex items-center justify-center text-zinc-500 text-xs gap-2">
        <div class="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
        <span>Calculating branch divergence...</span>
      </div>
    {:else if focusData && focusData.commits.length > 0}
      <div class="flex-1 min-h-[120px] relative overflow-hidden flex flex-col">
        <CommitGraph
          commits={focusData.commits}
          {selectedCommitId}
          {selectedCommitIds}
          {repoPath}
          onSelectCommit={onSelectCommit}
        />
      </div>

      {#if isDetailOpen && commitDetail}
        <!-- Resizable Splitter Bar -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
        <div
          role="separator"
          aria-orientation="horizontal"
          tabindex="-1"
          onmousedown={handleStartResize}
          class="h-1.5 w-full bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-cyan-500 active:bg-cyan-600 cursor-row-resize transition-colors flex items-center justify-center shrink-0 group relative z-10 select-none {isResizing ? 'bg-cyan-500!' : ''}"
          title="Kéo chuột để điều chỉnh độ cao panel chi tiết"
        >
          <div class="w-10 h-0.5 rounded-full bg-zinc-400 dark:bg-zinc-600 group-hover:bg-white transition-colors"></div>
        </div>

        <div
          style={isDetailMaximized ? 'height: 70%;' : `height: ${detailHeight}px;`}
          class="shrink-0 transition-[height] duration-75 overflow-hidden"
        >
          <CommitDetail
            {commitDetail}
            isLoading={isDetailLoading}
            isMaximized={isDetailMaximized}
            onToggleMaximize={() => (isDetailMaximized = !isDetailMaximized)}
            onClose={() => (isDetailOpen = false)}
          />
        </div>
      {/if}
    {:else}
      <div class="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500 text-xs gap-2">
        <AlertTriangle class="w-8 h-8 text-amber-500/50" />
        <span class="text-zinc-800 dark:text-zinc-300 font-semibold text-sm">No divergent commits found</span>
        <span class="max-w-sm text-zinc-500">
          This branch is completely in sync with base, or there are no unmerged local commits.
        </span>
      </div>
    {/if}
  </div>
</div>
