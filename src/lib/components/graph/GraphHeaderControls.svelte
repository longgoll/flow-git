<script lang="ts">
  import {
    GitCompare,
    Globe,
    Sparkles,
    Eye,
    X,
  } from 'lucide-svelte';
  import type { GraphViewMode } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    displayCount: number;
    totalCount: number;
    lockedLane: number | null;
    viewMode: GraphViewMode;
    autoCapsule: boolean;
    onUnlockLane: () => void;
    onToggleViewMode: (mode: GraphViewMode) => void;
    onToggleAutoCapsule: () => void;
  }

  let {
    displayCount,
    totalCount,
    lockedLane,
    viewMode = $bindable('micro'),
    autoCapsule = $bindable(true),
    onUnlockLane,
    onToggleViewMode,
    onToggleAutoCapsule,
  }: Props = $props();
</script>

<div class="h-9 px-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/40 flex items-center justify-between text-xs select-none shrink-0 font-sans">
  <!-- Left: Status & Commit Counts -->
  <div class="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
    <span class="font-mono text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
      {#if displayCount !== totalCount}
        {localeState.t('graph.headerControls.commitsCount', { display: displayCount, total: totalCount })}
      {:else}
        {localeState.t('graph.headerControls.commitsCountSimple', { count: displayCount })}
      {/if}
    </span>

    {#if lockedLane !== null}
      <span class="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-mono text-[10px] font-medium flex items-center gap-1 animate-in fade-in duration-100">
        <Eye class="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
        <span>{localeState.t('graph.headerControls.lockedLane', { lane: lockedLane })}</span>
        <button
          onclick={onUnlockLane}
          class="p-0.5 rounded hover:bg-indigo-200/60 dark:hover:bg-indigo-800/60 transition-colors cursor-pointer"
          title={localeState.t('graph.headerControls.unlockLaneTooltip')}
        >
          <X class="w-2.5 h-2.5" />
        </button>
      </span>
    {/if}
  </div>

  <!-- Right: View Modes & Capsules -->
  <div class="flex items-center gap-2">
    <div class="flex items-center p-0.5 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-xs">
      <button
        onclick={() => onToggleViewMode('micro')}
        class="px-2 py-0.5 rounded text-[11px] transition-all flex items-center gap-1.5 cursor-pointer {viewMode === 'micro' ? 'bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        title={localeState.t('graph.headerControls.microDagTooltip')}
      >
        <GitCompare class="w-3 h-3" />
        <span>{localeState.t('graph.headerControls.microDag')}</span>
      </button>

      <button
        onclick={() => onToggleViewMode('macro')}
        class="px-2 py-0.5 rounded text-[11px] transition-all flex items-center gap-1.5 cursor-pointer {viewMode === 'macro' ? 'bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        title={localeState.t('graph.headerControls.macroMapTooltip')}
      >
        <Globe class="w-3 h-3" />
        <span>{localeState.t('graph.headerControls.macroMap')}</span>
      </button>
    </div>

    <!-- Semantic Capsules Toggle -->
    <button
      onclick={onToggleAutoCapsule}
      class="px-2 py-0.5 rounded-md border text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer {autoCapsule ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 font-semibold' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}"
      title={localeState.t('graph.headerControls.capsulesTooltip')}
    >
      <Sparkles class="w-3 h-3 {autoCapsule ? 'text-emerald-500' : 'text-zinc-400'}" />
      <span>{autoCapsule ? localeState.t('graph.headerControls.capsulesOn') : localeState.t('graph.headerControls.capsulesOff')}</span>
    </button>
  </div>
</div>
