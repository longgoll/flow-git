<script lang="ts">
  import type { BranchInfo, CommitSummary } from '../types';
  import { localeState } from '../state/localeState.svelte';
  import { getIncomingCommits } from '../api/remote';
  import {
    CloudDownload,
    Zap,
    GitMerge,
    GitBranch,
    ChevronDown,
    ListTree,
    X,
  } from 'lucide-svelte';

  interface Props {
    currentBranch?: BranchInfo;
    incomingCommits?: CommitSummary[];
    repoPath?: string;
    isSyncing?: boolean;
    onSmartSync?: () => void;
    onRebaseUpstream?: () => void;
    onMergeUpstream?: () => void;
    onSelectCommit?: (commitId: string) => void;
    onDismiss?: () => void;
  }

  let {
    currentBranch,
    incomingCommits = [],
    repoPath = '',
    isSyncing = false,
    onSmartSync,
    onRebaseUpstream,
    onMergeUpstream,
    onSelectCommit,
    onDismiss,
  }: Props = $props();

  let showPreview = $state(false);
  let localCommits = $state<CommitSummary[]>([]);
  let isLoadingPreview = $state(false);

  let displayedCommits = $derived(
    incomingCommits.length > 0 ? incomingCommits : localCommits
  );

  let isDiverged = $derived(
    (currentBranch?.ahead_count ?? 0) > 0 && (currentBranch?.behind_count ?? 0) > 0
  );

  async function togglePreview() {
    showPreview = !showPreview;
    if (showPreview && displayedCommits.length === 0 && repoPath) {
      isLoadingPreview = true;
      try {
        localCommits = await getIncomingCommits(repoPath, currentBranch?.shorthand);
      } catch (e) {
        console.warn('Failed to load preview commits:', e);
      } finally {
        isLoadingPreview = false;
      }
    }
  }

  function formatRelativeTime(timestampSec: number): string {
    const elapsedSec = Math.max(0, Math.floor(Date.now() / 1000) - timestampSec);
    if (elapsedSec < 60) return `${Math.max(1, elapsedSec)}s`;
    const mins = Math.floor(elapsedSec / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
</script>

{#if currentBranch && (currentBranch.behind_count ?? 0) > 0}
  <div
    class="w-full bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 dark:from-amber-950/80 dark:via-amber-900/40 dark:to-zinc-950 border-b border-amber-300 dark:border-amber-600/50 flex flex-col text-xs select-none shadow-xs z-15 animate-in slide-in-from-top duration-200 font-sans"
    role="alert"
  >
    <!-- Top Alert Bar -->
    <div class="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 shrink-0">
          {#if isDiverged}
            <GitMerge class="w-4 h-4 {isSyncing ? 'animate-bounce' : 'animate-pulse'}" />
          {:else}
            <CloudDownload class="w-4 h-4 {isSyncing ? 'animate-bounce' : 'animate-pulse'}" />
          {/if}
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide text-[11px]">
              {isDiverged ? localeState.t('banners.upstreamDivergedTitle') : localeState.t('banners.upstreamBehindTitle')}
            </span>
            {#if isDiverged}
              <span class="px-2 py-0.2 rounded-full text-[10px] font-mono bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-600/50 font-bold">
                ↑{currentBranch.ahead_count} ↓{currentBranch.behind_count}
              </span>
            {:else}
              <span class="px-2 py-0.2 rounded-full text-[10px] font-mono bg-amber-200/70 dark:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 font-bold">
                ↓ {currentBranch.behind_count}
              </span>
            {/if}
          </div>
          <p class="text-amber-800/90 dark:text-amber-300/80 text-[11px] truncate mt-0.5">
            {#if isDiverged}
              {localeState.t('banners.upstreamDivergedDesc', {
                branch: currentBranch.shorthand,
                upstream: currentBranch.upstream_name || 'origin',
                ahead: currentBranch.ahead_count,
                behind: currentBranch.behind_count,
              })}
            {:else}
              {localeState.t('banners.upstreamBehindDesc', {
                branch: currentBranch.shorthand,
                upstream: currentBranch.upstream_name || 'origin',
                count: currentBranch.behind_count,
              })}
            {/if}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0 ml-auto">
        <!-- Preview Commits Toggle Button -->
        <button
          onclick={togglePreview}
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-amber-300/80 dark:border-amber-700/60 bg-white/70 hover:bg-white dark:bg-zinc-900/60 dark:hover:bg-zinc-900 text-amber-900 dark:text-amber-200 text-xs font-medium cursor-pointer transition-colors shadow-2xs group"
          title={localeState.t('banners.previewCommitsTooltip')}
        >
          <ListTree class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform" />
          <span>{showPreview ? localeState.t('banners.hidePreviewBtn') : localeState.t('banners.previewCommitsBtn', { count: currentBranch.behind_count })}</span>
          <ChevronDown class="w-3 h-3 text-amber-600 dark:text-amber-400 transition-transform duration-200 {showPreview ? 'rotate-180' : ''}" />
        </button>

        {#if isDiverged}
          <!-- Diverged: Offer Rebase or Merge -->
          {#if onRebaseUpstream}
            <button
              onclick={onRebaseUpstream}
              disabled={isSyncing}
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 active:scale-97 text-white font-medium text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50 group"
              title={localeState.t('banners.rebaseUpstreamTooltip')}
            >
              <GitBranch class="w-3.5 h-3.5 text-amber-200 group-hover:scale-110 transition-transform {isSyncing ? 'animate-spin' : ''}" />
              <span>{localeState.t('banners.rebaseUpstreamBtn', { upstream: currentBranch.upstream_name || 'origin' })}</span>
            </button>
          {/if}

          {#if onMergeUpstream}
            <button
              onclick={onMergeUpstream}
              disabled={isSyncing}
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50 group"
              title={localeState.t('banners.mergeUpstreamTooltip')}
            >
              <GitMerge class="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300 group-hover:scale-110 transition-transform" />
              <span>{localeState.t('banners.mergeUpstreamBtn', { upstream: currentBranch.upstream_name || 'origin' })}</span>
            </button>
          {/if}
        {:else}
          <!-- Clean Fast-Forward -->
          {#if onSmartSync}
            <button
              onclick={onSmartSync}
              disabled={isSyncing}
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 active:scale-97 text-white font-medium text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50 group"
              title={localeState.t('banners.fastForwardTooltip')}
            >
              <Zap class="w-3.5 h-3.5 text-amber-200 group-hover:scale-110 transition-transform {isSyncing ? 'animate-spin' : ''}" />
              <span>{isSyncing ? localeState.t('toolbar.syncing') : localeState.t('banners.fastForwardBtn')}</span>
            </button>
          {/if}
        {/if}

        {#if onDismiss}
          <button
            onclick={onDismiss}
            class="p-1.5 rounded-md hover:bg-amber-200/60 dark:hover:bg-amber-800/40 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
            title={localeState.t('banners.dismissNotice')}
            aria-label={localeState.t('banners.dismissNotice')}
          >
            <X class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>
    </div>

    <!-- Collapsible Incoming Commits Preview List -->
    {#if showPreview}
      <div class="w-full bg-amber-50/90 dark:bg-zinc-950/80 border-t border-amber-200/80 dark:border-amber-800/40 px-4 py-2.5 max-h-56 overflow-y-auto space-y-1 animate-in slide-in-from-top-1 duration-150">
        <div class="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-amber-800/80 dark:text-amber-300/70 mb-1.5">
          <span>{localeState.t('banners.incomingCommitsTitle', { upstream: currentBranch.upstream_name || 'origin' })}</span>
          <span class="font-mono text-[9px] text-zinc-400">Click để chọn commit</span>
        </div>

        {#if isLoadingPreview}
          <div class="flex items-center justify-center py-4 text-xs text-amber-700 dark:text-amber-300 gap-2">
            <CloudDownload class="w-4 h-4 animate-bounce" />
            <span>Đang tải danh sách commit...</span>
          </div>
        {:else if displayedCommits.length === 0}
          <div class="text-xs text-zinc-400 dark:text-zinc-500 py-2 italic text-center">
            {localeState.t('banners.noIncomingCommits')}
          </div>
        {:else}
          {#each displayedCommits as c (c.id)}
            <button
              onclick={() => onSelectCommit?.(c.id)}
              class="w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-md bg-white/70 hover:bg-white dark:bg-zinc-900/60 dark:hover:bg-zinc-900 border border-amber-200/50 dark:border-zinc-800/60 text-left transition-all cursor-pointer group shadow-2xs"
              title={`${c.message} (${c.id})`}
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-300/80 dark:border-amber-500/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {c.author_name.charAt(0).toUpperCase()}
                </span>
                <span class="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 font-semibold shrink-0">
                  {c.short_id}
                </span>
                <span class="text-xs text-zinc-800 dark:text-zinc-200 font-medium truncate">
                  {c.message}
                </span>
              </div>
              <div class="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">
                <span class="truncate max-w-[120px]">{c.author_name}</span>
                <span>•</span>
                <span class="font-mono">{formatRelativeTime(c.timestamp)}</span>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{/if}
