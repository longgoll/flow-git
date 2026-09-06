<script lang="ts">
  import type { CommitNode, ConflictSimulationResult } from '../../types';
  import { GitCommit, AlertTriangle, CheckCircle2, ArrowRight, Zap } from 'lucide-svelte';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    draggedCommit: CommitNode;
    hoveredTargetCommit: CommitNode | null;
    dragMousePos: { x: number; y: number };
    simulationResult: ConflictSimulationResult | null;
    isSimulating: boolean;
  }

  let {
    draggedCommit,
    hoveredTargetCommit,
    dragMousePos,
    simulationResult,
    isSimulating,
  }: Props = $props();
</script>

<div
  class="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-1.5 rounded-lg bg-zinc-900/95 border shadow-2xl backdrop-blur-md flex items-center gap-2 font-sans text-xs transition-all {simulationResult?.has_conflicts ? 'border-rose-500/80 text-rose-200' : simulationResult?.is_fast_forward ? 'border-amber-500/80 text-amber-200' : 'border-cyan-500/80 text-cyan-200'}"
  style="top: {dragMousePos.y}px; left: {dragMousePos.x}px;"
>
  <GitCommit class="w-3.5 h-3.5 shrink-0" />
  <span class="font-mono font-bold">{draggedCommit.short_id}</span>
  <span class="text-zinc-400 font-medium truncate max-w-40">{draggedCommit.summary}</span>

  {#if hoveredTargetCommit}
    <ArrowRight class="w-3 h-3 text-zinc-500 shrink-0" />
    <span class="font-mono font-bold text-purple-400">{hoveredTargetCommit.short_id}</span>

    {#if isSimulating}
      <div class="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
    {:else if simulationResult}
      {#if simulationResult.has_conflicts}
        <span class="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/80">
          <AlertTriangle class="w-3 h-3" />
          {localeState.t('graph.dragTooltip.conflictsCount', { count: simulationResult.conflict_files.length })}
        </span>
      {:else if simulationResult.is_fast_forward}
        <span class="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-700/80">
          <Zap class="w-3 h-3 text-amber-400" />
          {localeState.t('graph.dragTooltip.fastForward')}
        </span>
      {:else}
        <span class="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/80">
          <CheckCircle2 class="w-3 h-3" />
          {localeState.t('graph.dragTooltip.clean')}
        </span>
      {/if}
    {/if}
  {/if}
</div>
