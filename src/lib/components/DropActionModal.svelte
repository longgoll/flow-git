<script lang="ts">
  import type { CommitNode, ConflictSimulationResult } from '../types';
  import { GitMerge, GitPullRequest, GitFork, AlertTriangle, CheckCircle2, X } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    isOpen: boolean;
    sourceCommit: CommitNode | null;
    targetCommit: CommitNode | null;
    simulation: ConflictSimulationResult | null;
    isSimulating?: boolean;
    position: { x: number; y: number };
    onCherryPick: (source: CommitNode, target: CommitNode) => void;
    onMerge: (source: CommitNode, target: CommitNode) => void;
    onRebase?: (source: CommitNode, target: CommitNode) => void;
    onCancel: () => void;
  }

  let {
    isOpen = false,
    sourceCommit = null,
    targetCommit = null,
    simulation = null,
    isSimulating = false,
    position = { x: 0, y: 0 },
    onCherryPick,
    onMerge,
    onRebase,
    onCancel,
  }: Props = $props();

  // Clamp position to stay within viewport
  let clampedStyle = $derived.by(() => {
    const top = Math.max(20, Math.min(window.innerHeight - 320, position.y + 10));
    const left = Math.max(20, Math.min(window.innerWidth - 380, position.x + 10));
    return `top: ${top}px; left: ${left}px;`;
  });
</script>

{#if isOpen && sourceCommit && targetCommit}
  <div
    class="fixed z-50 w-96 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700/80 rounded-xl shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100 font-sans select-none"
    style={clampedStyle}
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
      <div class="flex items-center gap-2">
        <GitFork class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        <span class="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">{localeState.t('modals.dropAction.title')}</span>
      </div>
      <button
        onclick={onCancel}
        class="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 p-0.5 rounded cursor-pointer transition-colors"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Node Source & Target Info -->
    <div class="bg-zinc-50 dark:bg-zinc-950/70 rounded-lg p-2.5 space-y-1.5 border border-zinc-200 dark:border-zinc-800 text-xs">
      <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
        <span>{localeState.t('modals.dropAction.source')}</span>
        <span class="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{sourceCommit.short_id}</span>
      </div>
      <p class="text-zinc-800 dark:text-zinc-300 truncate font-medium">{sourceCommit.summary}</p>

      <div class="h-px bg-zinc-200 dark:bg-zinc-800 my-1"></div>

      <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
        <span>{localeState.t('modals.dropAction.target')}</span>
        <span class="font-mono text-purple-600 dark:text-purple-400 font-semibold">{targetCommit.short_id}</span>
      </div>
      <p class="text-zinc-800 dark:text-zinc-300 truncate font-medium">{targetCommit.summary}</p>
    </div>

    <!-- Dry-run Simulation Status Banner -->
    {#if isSimulating}
      <div class="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 animate-pulse">
        <div class="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <span>{localeState.t('modals.dropAction.simulating')}</span>
      </div>
    {:else if simulation}
      {#if simulation.has_conflicts}
        <div class="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg p-2.5 text-xs text-rose-800 dark:text-rose-300 space-y-1">
          <div class="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
            <AlertTriangle class="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{localeState.t('modals.dropAction.conflictFound', { count: simulation.conflict_files.length })}</span>
          </div>
          <div class="max-h-20 overflow-y-auto space-y-0.5 pl-5 font-mono text-[11px] text-rose-700 dark:text-rose-200/90 select-text">
            {#each simulation.conflict_files as f}
              <div class="truncate">• {f}</div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <span class="font-bold text-emerald-800 dark:text-emerald-300">{localeState.t('modals.dropAction.cleanSimulation')}</span>
            <p class="text-[11px] text-emerald-700 dark:text-emerald-400/80">
              {simulation.is_fast_forward ? localeState.t('modals.dropAction.fastForwardEligible') : localeState.t('modals.dropAction.safeMergeDesc')}
            </p>
          </div>
        </div>
      {/if}
    {/if}

    <!-- Action Buttons -->
    <div class="space-y-2 pt-1">
      {#if onRebase}
        <button
          onclick={() => onRebase(sourceCommit, targetCommit)}
          class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white cursor-pointer shadow-lg shadow-amber-600/25 transition-all active:scale-98"
          title={localeState.t('modals.dropAction.rebaseTooltip')}
        >
          <GitFork class="w-3.5 h-3.5" />
          <span>{localeState.t('modals.dropAction.rebaseOnto', { id: targetCommit.short_id })}</span>
        </button>
      {/if}

      <div class="grid grid-cols-2 gap-2">
        <button
          onclick={() => onCherryPick(sourceCommit, targetCommit)}
          class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer transition-all active:scale-98"
        >
          <GitPullRequest class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{localeState.t('modals.dropAction.cherryPick')}</span>
        </button>

        <button
          onclick={() => onMerge(sourceCommit, targetCommit)}
          class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white cursor-pointer shadow-lg shadow-cyan-600/25 transition-all active:scale-98"
        >
          <GitMerge class="w-3.5 h-3.5" />
          <span>{localeState.t('modals.dropAction.mergeIntoHead')}</span>
        </button>
      </div>
    </div>
  </div>
{/if}
