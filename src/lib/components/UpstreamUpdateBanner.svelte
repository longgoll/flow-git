<script lang="ts">
  import type { BranchInfo } from '../types';
  import { localeState } from '../state/localeState.svelte';
  import { CloudDownload, Zap, GitMerge, GitBranch, X } from 'lucide-svelte';

  interface Props {
    currentBranch?: BranchInfo;
    isSyncing?: boolean;
    onSmartSync?: () => void;
    onRebaseUpstream?: () => void;
    onMergeUpstream?: () => void;
    onDismiss?: () => void;
  }

  let {
    currentBranch,
    isSyncing = false,
    onSmartSync,
    onRebaseUpstream,
    onMergeUpstream,
    onDismiss,
  }: Props = $props();

  let isDiverged = $derived(
    (currentBranch?.ahead_count ?? 0) > 0 && (currentBranch?.behind_count ?? 0) > 0
  );
</script>

{#if currentBranch && (currentBranch.behind_count ?? 0) > 0}
  <div
    class="w-full bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 dark:from-amber-950/80 dark:via-amber-900/40 dark:to-zinc-950 border-b border-amber-300 dark:border-amber-600/50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-xs z-15 animate-in slide-in-from-top duration-200 font-sans"
    role="alert"
  >
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
{/if}
