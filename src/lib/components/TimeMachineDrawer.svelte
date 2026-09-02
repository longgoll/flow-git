<script lang="ts">
  import type { ActionRecord } from '../types';
  import {
    History,
    Undo2,
    Redo2,
    ShieldCheck,
    RotateCcw
  } from 'lucide-svelte';


  interface Props {
    isOpen: boolean;
    actions: ActionRecord[];
    isLoading: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onTimeTravel: (actionId: number) => void;
    onClose: () => void;
  }

  let {
    isOpen,
    actions,
    isLoading,
    onUndo,
    onRedo,
    onTimeTravel,
    onClose,
  }: Props = $props();

  function formatTime(timestamp: number): string {
    const elapsed = Math.floor(Date.now() / 1000) - timestamp;
    if (elapsed < 60) return `${Math.max(1, elapsed)}s ago`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
    if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`;
    return `${Math.floor(elapsed / 86400)}d ago`;
  }

  function getSeverityBadge(severity: string) {
    switch (severity.toLowerCase()) {
      case 'destructive':
        return { label: 'Destructive', bg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/30' };
      case 'moderate':
        return { label: 'History Rewrite', bg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30' };
      default:
        return { label: 'Safe', bg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' };
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 bg-black/50 dark:bg-black/60 backdrop-blur-xs flex justify-end select-none">
    <div class="w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 text-zinc-900 dark:text-zinc-100 font-sans">
      <!-- Drawer Header -->
      <div class="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/70 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30">
            <History class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Safe-Flight Time Machine
              <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 font-semibold">
                Ctrl + Z
              </span>
            </h3>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              Zero-risk instant undo for any Git operation.
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs p-1 cursor-pointer"
        >
          ✕
        </button>
      </div>

      <!-- Quick Action Bar (Undo & Redo) -->
      <div class="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 grid grid-cols-2 gap-2">
        <button
          onclick={onUndo}
          disabled={isLoading || actions.length === 0}
          class="py-2 px-3 rounded-lg bg-cyan-50 dark:bg-cyan-600/20 hover:bg-cyan-100 dark:hover:bg-cyan-600/30 border border-cyan-200 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
        >
          <Undo2 class="w-3.5 h-3.5" />
          <span>Undo (Ctrl + Z)</span>
        </button>

        <button
          onclick={onRedo}
          disabled={isLoading || actions.length === 0}
          class="py-2 px-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-transparent font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
        >
          <Redo2 class="w-3.5 h-3.5" />
          <span>Redo (Ctrl+Shift+Z)</span>
        </button>
      </div>

      <!-- Actions History Timeline -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        {#if actions.length === 0}
          <div class="py-12 text-center text-xs text-zinc-500 space-y-2">
            <ShieldCheck class="w-8 h-8 mx-auto opacity-40 text-emerald-500" />
            <p>No recorded Git state changes in session yet.</p>
          </div>
        {:else}
          {#each actions as action}
            {@const badge = getSeverityBadge(action.severity)}
            <div class="p-3 rounded-xl border transition-all {action.is_undone ? 'bg-zinc-100/50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800/60 opacity-60' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}">
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <div class="flex items-center gap-1.5">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono border {badge.bg} font-semibold">
                    {badge.label}
                  </span>
                  <span class="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-300">
                    {action.action_type.toUpperCase()}
                  </span>
                </div>
                <span class="text-[11px] text-zinc-500 font-mono">
                  {formatTime(action.timestamp)}
                </span>
              </div>

              <div class="text-xs text-zinc-800 dark:text-zinc-200 font-medium line-clamp-2">
                {action.description}
              </div>

              <div class="mt-2.5 flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-800/60">
                <span>HEAD: {action.previous_head.slice(0, 7)} ➔ {action.new_head.slice(0, 7)}</span>
                <button
                  onclick={() => onTimeTravel(action.id)}
                  class="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium cursor-pointer transition-colors"
                >
                  <RotateCcw class="w-3 h-3" />
                  <span>Time Travel</span>
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}
