<script lang="ts">
  import { onMount } from 'svelte';
  import type { BranchInfo, CommitDetail as ICommitDetail, CommitNode, ConflictSimulationResult, FocusBranchResult } from '../types';
  import CommitGraph from './CommitGraph.svelte';
  import CommitDetail from './CommitDetail.svelte';
  import { getFocusBranchInfo } from '../api/repo';
  import { simulateDragAction } from '../api/action';
  import {
    Crosshair,
    ArrowUpRight,
    ArrowDownLeft,
    RefreshCw,
    X,
    Check,
    AlertTriangle,
    GitPullRequest,
    GitCompare,
    ChevronDown,
    Upload,
    ShieldCheck,
    ShieldAlert,
  } from 'lucide-svelte';

  interface Props {
    repoPath: string;
    currentBranchName?: string;
    branches?: BranchInfo[];
    selectedCommitId: string | null;
    selectedCommitIds?: string[];
    commitDetail: ICommitDetail | null;
    isDetailLoading: boolean;
    onSelectCommit: (commit: CommitNode) => void;
    onSelectMultipleCommits?: (commitIds: string[]) => void;
    onSquashCommits?: (commits: CommitNode[]) => void;
    onCompareCommits?: (c1: CommitNode, c2: CommitNode) => void;
    onOpenCreatePR?: (sourceBranch: string, targetBranch: string) => void;
    onCloseFocus: () => void;
    onPush?: () => Promise<void>;
    onSyncWithBase?: (baseBranch?: string) => Promise<void>;
  }

  let {
    repoPath = '',
    currentBranchName = '',
    branches = [],
    selectedCommitId = null,
    selectedCommitIds = [],
    commitDetail = null,
    isDetailLoading = false,
    onSelectCommit,
    onSelectMultipleCommits,
    onSquashCommits,
    onCompareCommits,
    onOpenCreatePR,
    onCloseFocus,
    onPush,
    onSyncWithBase,
  }: Props = $props();

  let focusData = $state<FocusBranchResult | null>(null);
  let selectedBase = $state<string | undefined>(undefined);
  let showBaseDropdown = $state<boolean>(false);
  let isLoading = $state<boolean>(true);
  let isSyncing = $state<boolean>(false);
  let isPushing = $state<boolean>(false);
  let syncSuccess = $state<boolean>(false);
  let dryRunResult = $state<ConflictSimulationResult | null>(null);
  let isDryRunning = $state<boolean>(false);
  let isDetailOpen = $state<boolean>(true);
  let isDetailMaximized = $state<boolean>(false);

  // Resizable Splitter state
  let detailHeight = $state<number>(360);
  let isResizing = $state<boolean>(false);
  let resizeStartY = 0;
  let resizeStartHeight = 0;

  // Filter available base branches (exclude current branch)
  let candidateBaseBranches = $derived.by(() => {
    const list: string[] = [];
    const added = new Set<string>();

    const priorityCandidates = ['main', 'origin/main', 'master', 'origin/master', 'develop', 'origin/develop'];
    for (const p of priorityCandidates) {
      if (p !== currentBranchName && branches.some((b) => b.shorthand === p || b.name === p)) {
        list.push(p);
        added.add(p);
      }
    }

    for (const b of branches) {
      const name = b.shorthand || b.name;
      if (name !== currentBranchName && !added.has(name)) {
        list.push(name);
        added.add(name);
      }
    }

    return list;
  });

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

  async function loadFocus(customBase?: string) {
    if (!repoPath) return;
    isLoading = true;
    try {
      const res = await getFocusBranchInfo(repoPath, currentBranchName || undefined, customBase);
      focusData = res;
      selectedBase = res.base_branch;
      if (res.commits.length > 0 && !selectedCommitId) {
        onSelectCommit(res.commits[0]);
      }
      if (res.commits.length <= 3) {
        detailHeight = Math.max(380, Math.round(window.innerHeight * 0.55));
      }
      if (res.behind_count > 0 && res.head_commit_id && res.base_commit_id) {
        checkConflictDryRun(res.head_commit_id, res.base_commit_id);
      } else {
        dryRunResult = null;
      }
    } catch (err) {
      console.error('Failed to load focus branch:', err);
    } finally {
      isLoading = false;
    }
  }

  async function checkConflictDryRun(headId: string, baseId: string) {
    if (!repoPath) return;
    isDryRunning = true;
    try {
      dryRunResult = await simulateDragAction(repoPath, headId, baseId);
    } catch (e) {
      console.error('Dry-run simulation failed:', e);
      dryRunResult = null;
    } finally {
      isDryRunning = false;
    }
  }

  async function handlePush() {
    if (!onPush) return;
    isPushing = true;
    try {
      await onPush();
      await loadFocus(selectedBase);
    } catch (e) {
      console.error('Push from focus view failed:', e);
    } finally {
      isPushing = false;
    }
  }

  function handleSelectBaseBranch(branchName: string) {
    showBaseDropdown = false;
    selectedBase = branchName;
    loadFocus(branchName);
  }

  async function handleSync() {
    if (!onSyncWithBase) return;
    isSyncing = true;
    try {
      await onSyncWithBase(focusData?.base_branch);
      syncSuccess = true;
      await loadFocus(selectedBase);
      setTimeout(() => (syncSuccess = false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      isSyncing = false;
    }
  }

  function handleBranchComparison() {
    if (!focusData || !onCompareCommits) return;
    if (focusData.commits.length === 0) return;
    const newest = focusData.commits[0];
    const oldest = focusData.commits[focusData.commits.length - 1];
    onCompareCommits(oldest, newest);
  }
</script>

<div class="flex-1 flex flex-col w-full h-full min-h-0 bg-white dark:bg-zinc-950 overflow-hidden select-none font-sans">
  <!-- Top Focus Header Banner -->
  <div class="px-4 py-2 border-b border-amber-300/70 dark:border-amber-900/50 bg-amber-50/60 dark:bg-zinc-900/50 flex items-center justify-between gap-4 shrink-0 shadow-xs relative z-20">
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
        <div class="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-0.5 relative">
          <span class="text-amber-800 dark:text-amber-300 font-semibold">{focusData?.branch_name || currentBranchName || 'HEAD'}</span>
          <span class="text-zinc-400 dark:text-zinc-500">relative to</span>

          <!-- Switchable Base Branch Dropdown Button -->
          <div class="relative inline-block">
            <button
              onclick={() => (showBaseDropdown = !showBaseDropdown)}
              class="inline-flex items-center gap-1 text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 font-semibold cursor-pointer shadow-xs transition-colors"
              title="Nhấp để đổi nhánh Base so sánh (main, origin/main, v.v.)"
            >
              <span>{focusData?.base_branch || 'main'}</span>
              <ChevronDown class="w-3 h-3 text-zinc-400" />
            </button>

            {#if showBaseDropdown}
              <!-- Backdrop -->
              <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
              <div
                class="fixed inset-0 z-40"
                onclick={() => (showBaseDropdown = false)}
              ></div>

              <!-- Menu -->
              <div class="absolute left-0 top-full mt-1 w-48 max-h-56 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-1 font-sans text-xs divide-y divide-zinc-100 dark:divide-zinc-800/60">
                <div class="px-2.5 py-1 text-[10px] uppercase font-bold text-zinc-400">Select Base Branch</div>
                {#each candidateBaseBranches as b}
                  <button
                    onclick={() => handleSelectBaseBranch(b)}
                    class="w-full text-left px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-mono text-xs flex items-center justify-between cursor-pointer {b === focusData?.base_branch ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50/50 dark:bg-amber-950/30' : 'text-zinc-700 dark:text-zinc-300'}"
                  >
                    <span class="truncate">{b}</span>
                    {#if b === focusData?.base_branch}
                      <Check class="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
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

    <!-- Actions: Compare / Create PR / Sync / Exit -->
    <div class="flex items-center gap-2 shrink-0 flex-wrap">
      {#if onCompareCommits && focusData && focusData.commits.length > 0}
        <button
          onclick={handleBranchComparison}
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 text-xs font-medium text-cyan-700 dark:text-cyan-300 hover:text-cyan-900 dark:hover:text-cyan-100 transition-all cursor-pointer shadow-xs"
          title="So sánh toàn bộ thay đổi giữa các đầu commit của nhánh so với Base"
        >
          <GitCompare class="w-3.5 h-3.5 text-cyan-500" />
          <span>Branch Diff</span>
        </button>
      {/if}

      <!-- Quick Push Button (When Ahead > 0) -->
      {#if onPush && focusData && focusData.ahead_count > 0}
        <button
          onclick={handlePush}
          disabled={isPushing}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs hover:scale-102 disabled:opacity-70"
          title="Đẩy {focusData.ahead_count} commit(s) lên remote"
        >
          <Upload class="w-3.5 h-3.5 {isPushing ? 'animate-bounce' : ''}" />
          <span>{isPushing ? 'Pushing...' : `Push (${focusData.ahead_count})`}</span>
        </button>
      {/if}

      {#if onOpenCreatePR && focusData}
        <button
          onclick={() => onOpenCreatePR?.(focusData!.branch_name, focusData!.base_branch)}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-300 dark:border-purple-700/80 text-purple-800 dark:text-purple-200 text-xs font-semibold transition-all cursor-pointer shadow-xs hover:scale-102"
          title="Tạo Pull Request từ nhánh này vào {focusData.base_branch}"
        >
          <GitPullRequest class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Create PR</span>
        </button>
      {/if}

      <!-- Conflict Dry-Run Badge (When Behind > 0) -->
      {#if focusData && focusData.behind_count > 0}
        {#if isDryRunning}
          <div
            class="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-500"
            title="Đang mô phỏng ngầm kiểm tra conflict..."
          >
            <RefreshCw class="w-3 h-3 animate-spin text-zinc-400" />
            <span>Simulating...</span>
          </div>
        {:else if dryRunResult}
          {#if !dryRunResult.has_conflicts}
            <div
              class="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[11px] font-mono font-medium text-emerald-800 dark:text-emerald-300 shadow-xs"
              title="Mô phỏng ngầm hoàn tất: Sạch 100%, không phát hiện xung đột khi rebase."
            >
              <ShieldCheck class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Clean Rebase</span>
            </div>
          {:else}
            <div
              class="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-[11px] font-mono font-medium text-rose-800 dark:text-rose-300 shadow-xs"
              title="Xung đột dự kiến ở {dryRunResult.conflict_files.length} tệp: {dryRunResult.conflict_files.join(', ')}"
            >
              <ShieldAlert class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{dryRunResult.conflict_files.length} Conflict(s)</span>
            </div>
          {/if}
        {/if}
      {/if}

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
            <span>Up to date</span>
          {:else}
            <RefreshCw class="w-3.5 h-3.5 {isSyncing ? 'animate-spin text-amber-600 dark:text-amber-400' : 'text-amber-700 dark:text-amber-400'}" />
            <span>{isSyncing ? 'Syncing...' : `Rebase (${focusData?.behind_count})`}</span>
          {/if}
        </button>
      {/if}

      <button
        onclick={onCloseFocus}
        class="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors cursor-pointer shadow-xs"
        title="Quay lại đồ thị đầy đủ (Exit Focus)"
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
          onSelectMultipleCommits={onSelectMultipleCommits}
          onSquashCommits={onSquashCommits}
          onCompareCommits={onCompareCommits}
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
            {repoPath}
            onToggleMaximize={() => (isDetailMaximized = !isDetailMaximized)}
            onClose={() => (isDetailOpen = false)}
            onSelectParent={(pid) => {
              const parent = focusData?.commits.find((c) => c.id === pid);
              if (parent) onSelectCommit(parent);
            }}
          />
        </div>
      {/if}
    {:else}
      <div class="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500 text-xs gap-2">
        <AlertTriangle class="w-8 h-8 text-amber-500/50" />
        <span class="text-zinc-800 dark:text-zinc-300 font-semibold text-sm">No divergent commits found</span>
        <span class="max-w-sm text-zinc-500">
          This branch is completely in sync with {selectedBase || 'base'}, or there are no unmerged local commits.
        </span>
      </div>
    {/if}
  </div>
</div>

