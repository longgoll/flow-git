<script lang="ts">
  import { Layers, GitCompare, Copy, X } from 'lucide-svelte';
  import { toast } from '../../state/toastState.svelte';
  import type { CommitNode } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    activeSelectedIds: string[];
    commits: CommitNode[];
    onSquashCommits?: (commits: CommitNode[]) => void;
    onCompareCommits?: (c1: CommitNode, c2: CommitNode) => void;
    onDeselect: () => void;
  }

  let {
    activeSelectedIds = [],
    commits = [],
    onSquashCommits,
    onCompareCommits,
    onDeselect,
  }: Props = $props();

  function handleSquash() {
    if (!onSquashCommits) return;
    const selectedCommits = commits.filter((c) => activeSelectedIds.includes(c.id));
    if (selectedCommits.length >= 2) onSquashCommits(selectedCommits);
  }

  function handleCompare() {
    if (!onCompareCommits) return;
    const c1 = commits.find((c) => c.id === activeSelectedIds[0]);
    const c2 = commits.find((c) => c.id === activeSelectedIds[activeSelectedIds.length - 1]);
    if (c1 && c2) onCompareCommits(c1, c2);
  }

  function handleCopyShas() {
    navigator.clipboard.writeText(activeSelectedIds.join('\n'));
    toast.success(
      localeState.t('graph.floatingDock.copiedShasToast'),
      localeState.t('graph.floatingDock.copiedShasToastDesc', { count: activeSelectedIds.length })
    );
  }
</script>

{#if activeSelectedIds.length >= 2}
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div
    class="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700/80 backdrop-blur-md shadow-2xl rounded-2xl px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-150 select-none pointer-events-auto text-zinc-900 dark:text-zinc-100 font-sans"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="flex items-center gap-2 text-xs font-mono">
      <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
      <span class="text-zinc-800 dark:text-zinc-200 font-semibold">
        {localeState.t('graph.floatingDock.commitsSelected', { count: activeSelectedIds.length })}
      </span>
    </div>

    <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-700"></div>

    {#if onSquashCommits}
      <button
        onclick={handleSquash}
        class="px-2.5 py-1 rounded-lg text-xs bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-600/50 text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:scale-102"
        title={localeState.t('graph.floatingDock.squashTooltip')}
      >
        <Layers class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span>{localeState.t('graph.floatingDock.squash')}</span>
      </button>
    {/if}

    {#if onCompareCommits}
      <button
        onclick={handleCompare}
        class="px-2.5 py-1 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-cyan-700 dark:text-cyan-300 font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:scale-102 border border-zinc-200 dark:border-transparent"
        title={localeState.t('graph.floatingDock.compareTooltip')}
      >
        <GitCompare class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        <span>{localeState.t('graph.floatingDock.compareCommits')}</span>
      </button>
    {/if}

    <button
      onclick={handleCopyShas}
      class="px-2.5 py-1 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:scale-102 border border-zinc-200 dark:border-transparent"
      title={localeState.t('graph.floatingDock.copyShasTooltip')}
    >
      <Copy class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
      <span>{localeState.t('graph.floatingDock.copyShas')}</span>
    </button>

    <button
      onclick={onDeselect}
      class="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      title={localeState.t('graph.floatingDock.deselectTooltip')}
    >
      <X class="w-3.5 h-3.5" />
    </button>
  </div>
{/if}
