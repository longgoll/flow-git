<script lang="ts">
  import type { CommitNode, RebaseExecutionResult, RebaseTodoItem } from '../types';
  import { prepareInteractiveRebase, executeInteractiveRebase } from '../api/action';
  import {
    GitFork,
    X,
    ArrowUp,
    ArrowDown,
    Trash2,
    Check,
    RefreshCw,
    AlertTriangle,
  } from 'lucide-svelte';
  import { toast } from '../state/toastState.svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    isOpen: boolean;
    repoPath: string;
    ontoCommit: CommitNode | null;
    onClose: () => void;
    onSuccess?: (res: RebaseExecutionResult) => void;
  }

  let { isOpen = false, repoPath = '', ontoCommit = null, onClose, onSuccess }: Props = $props();

  let todos = $state<RebaseTodoItem[]>([]);
  let isLoading = $state<boolean>(false);
  let isExecuting = $state<boolean>(false);


  $effect(() => {
    if (isOpen && repoPath && ontoCommit) {
      loadTodos();
    }
  });

  async function loadTodos() {
    if (!repoPath || !ontoCommit) return;
    isLoading = true;
    try {
      todos = await prepareInteractiveRebase(repoPath, ontoCommit.id);
    } catch (err: any) {
      console.error('Failed to prepare interactive rebase:', err);
      toast.error(localeState.t('workflows.rebase.toastErrorLoad'), err?.message || err);
    } finally {
      isLoading = false;
    }
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    const next = [...todos];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    todos = next;
  }

  function moveDown(index: number) {
    if (index >= todos.length - 1) return;
    const next = [...todos];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    todos = next;
  }

  function setAction(index: number, action: string) {
    todos = todos.map((item, idx) => {
      if (idx === index) {
        return { ...item, action };
      }
      return item;
    });
  }

  async function handleStartRebase() {
    if (!repoPath || !ontoCommit) return;
    isExecuting = true;
    try {
      const res = await executeInteractiveRebase(repoPath, ontoCommit.id, todos);
      if (res.status === 'completed') {
        toast.success(localeState.t('workflows.rebase.toastSuccess'), res.message);
        onSuccess?.(res);
        onClose();
      } else if (res.status === 'conflict') {
        toast.warning(localeState.t('workflows.rebase.toastConflict'), res.message);
        onSuccess?.(res);
        onClose();
      }
    } catch (err: any) {
      toast.error(localeState.t('workflows.rebase.toastFailed'), err?.message || err);
    } finally {
      isExecuting = false;
    }
  }

  const ACTION_CONFIGS: Record<string, { label: string; color: string }> = {
    pick: {
      label: 'Pick',
      color: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60',
    },
    reword: {
      label: 'Reword',
      color: 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60',
    },
    squash: {
      label: 'Squash',
      color: 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700/60',
    },
    fixup: {
      label: 'Fixup',
      color: 'bg-cyan-50 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/60',
    },
    drop: {
      label: 'Drop',
      color: 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700/60',
    },
  };
</script>

{#if isOpen && ontoCommit}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose();
    }}
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
            <GitFork class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {localeState.t('workflows.rebase.title')}
            </h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {localeState.t('workflows.rebase.subtitle')}
              <span class="font-mono text-cyan-600 dark:text-cyan-300 font-bold ml-1">{ontoCommit.short_id}</span>
              <span class="text-zinc-400 dark:text-zinc-500 truncate max-w-xs inline-block align-bottom ml-1">({ontoCommit.summary})</span>
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Action Legend / Quick Info -->
      <div class="px-6 py-2.5 bg-zinc-100/60 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 font-mono">
        <div class="flex items-center gap-2 flex-wrap">
          <span>{localeState.t('workflows.rebase.operations')}</span>
          <span class="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-[10px]">Pick: {localeState.t('workflows.rebase.pickDesc')}</span>
          <span class="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[10px]">Reword: {localeState.t('workflows.rebase.rewordDesc')}</span>
          <span class="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 text-[10px]">Squash: {localeState.t('workflows.rebase.squashDesc')}</span>
          <span class="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50 text-[10px]">Fixup: {localeState.t('workflows.rebase.fixupDesc')}</span>
          <span class="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 text-[10px]">Drop: {localeState.t('workflows.rebase.dropDesc')}</span>
        </div>
        <span class="text-zinc-500 font-mono text-[11px] shrink-0">{todos.length} commits</span>
      </div>

      <!-- Timeline Commits List -->
      <div class="p-6 max-h-[500px] overflow-y-auto space-y-2.5">
        {#if isLoading}
          <div class="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
            <RefreshCw class="w-6 h-6 animate-spin text-amber-500 dark:text-amber-400" />
            <span class="text-xs font-mono">{localeState.t('workflows.rebase.loadingTodos')}</span>
          </div>
        {:else if todos.length === 0}
          <div class="py-12 text-center text-zinc-500 text-xs font-mono">
            {localeState.t('workflows.rebase.emptyTodos')}
          </div>
        {:else}
          <div class="space-y-2 font-mono">
            {#each todos as item, index (item.commit_id)}
              <div
                class="p-3 rounded-xl border transition-all flex items-center justify-between gap-3 {item.action === 'drop' ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-60' : 'bg-zinc-50 dark:bg-zinc-950/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}"
              >
                <!-- Left: Reorder & Action Picker -->
                <div class="flex items-center gap-2 shrink-0">
                  <!-- Move up/down -->
                  <div class="flex flex-col gap-0.5">
                    <button
                      onclick={() => moveUp(index)}
                      disabled={index === 0}
                      class="p-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default transition-colors border border-zinc-200 dark:border-transparent"
                      title={localeState.t('workflows.rebase.moveUpTooltip')}
                    >
                      <ArrowUp class="w-3 h-3" />
                    </button>
                    <button
                      onclick={() => moveDown(index)}
                      disabled={index === todos.length - 1}
                      class="p-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default transition-colors border border-zinc-200 dark:border-transparent"
                      title={localeState.t('workflows.rebase.moveDownTooltip')}
                    >
                      <ArrowDown class="w-3 h-3" />
                    </button>
                  </div>

                  <!-- Action Dropdown / Select -->
                  <select
                    value={item.action}
                    onchange={(e) => setAction(index, e.currentTarget.value)}
                    class="px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors outline-hidden cursor-pointer {ACTION_CONFIGS[item.action]?.color || 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'}"
                  >
                    <option value="pick">pick ({localeState.t('workflows.rebase.pickDesc')})</option>
                    <option value="reword">reword ({localeState.t('workflows.rebase.rewordDesc')})</option>
                    <option value="squash">squash ({localeState.t('workflows.rebase.squashDesc')})</option>
                    <option value="fixup">fixup ({localeState.t('workflows.rebase.fixupDesc')})</option>
                    <option value="drop">drop ({localeState.t('workflows.rebase.dropDesc')})</option>
                  </select>
                </div>

                <!-- Center: Commit Short SHA & Summary -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-cyan-700 dark:text-cyan-400">
                      {item.short_id}
                    </span>
                    <span class="text-[11px] text-zinc-500">
                      {item.author}
                    </span>
                  </div>

                  {#if item.action === 'reword'}
                    <input
                      type="text"
                      bind:value={item.summary}
                      class="mt-1 w-full px-2 py-1 text-xs font-sans bg-white dark:bg-zinc-900 border border-amber-500 rounded text-zinc-900 dark:text-zinc-100 outline-hidden select-text"
                      placeholder={localeState.t('workflows.rebase.rewordPlaceholder')}
                    />
                  {:else}
                    <p class="text-xs text-zinc-800 dark:text-zinc-300 font-sans truncate mt-0.5 {item.action === 'drop' ? 'line-through text-zinc-400 dark:text-zinc-600' : ''}">
                      {item.summary}
                    </p>
                  {/if}
                </div>

                <!-- Right: Drop Quick Action -->
                <div class="shrink-0">
                  {#if item.action !== 'drop'}
                    <button
                      onclick={() => setAction(index, 'drop')}
                      class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title={localeState.t('workflows.rebase.dropTooltip')}
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  {:else}
                    <button
                      onclick={() => setAction(index, 'pick')}
                      class="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                      title={localeState.t('workflows.rebase.restoreTooltip')}
                    >
                      <Check class="w-3.5 h-3.5" />
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
        <div class="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
          <AlertTriangle class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{localeState.t('workflows.rebase.conflictWarning')}</span>
        </div>

        <div class="flex items-center gap-3">
          <button
            onclick={onClose}
            class="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs font-medium cursor-pointer transition-colors"
          >
            {localeState.t('common.cancel')}
          </button>
          <button
            onclick={handleStartRebase}
            disabled={isExecuting || todos.length === 0}
            class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg transition-all disabled:opacity-50"
          >
            {#if isExecuting}
              <RefreshCw class="w-4 h-4 animate-spin" />
              <span>{localeState.t('workflows.rebase.rebasing')}</span>
            {:else}
              <GitFork class="w-4 h-4" />
              <span>{localeState.t('workflows.rebase.startRebaseWithCount', { count: todos.filter(t => t.action !== 'drop').length })}</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
