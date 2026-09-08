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
    Search,
    Filter,
    RotateCcw,
    GripVertical,
    ListOrdered,
    Layers,
    Edit3,
    Sparkles,
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
  let searchQuery = $state<string>('');
  let filterMode = $state<'all' | 'merges' | 'dropped'>('all');
  let activeTab = $state<'todos' | 'preview'>('todos');

  // Drag and Drop States
  let draggedIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);
  let dropPlacement = $state<'before' | 'after' | null>(null);

  function isMergeCommit(summary: string): boolean {
    const s = summary.toLowerCase();
    return s.startsWith('merge ') || s.includes('merge pull request') || s.includes('merge branch');
  }

  let mergeCount = $derived(todos.filter((t) => isMergeCommit(t.summary)).length);
  let droppedCount = $derived(todos.filter((t) => t.action === 'drop').length);
  let activeMergesNotDropped = $derived(todos.filter((t) => isMergeCommit(t.summary) && t.action !== 'drop').length);

  let filteredTodosWithIndex = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    return todos
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        if (filterMode === 'merges' && !isMergeCommit(item.summary)) return false;
        if (filterMode === 'dropped' && item.action !== 'drop') return false;

        if (!q) return true;
        return (
          item.summary.toLowerCase().includes(q) ||
          item.short_id.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q)
        );
      });
  });

  // Dry-Run Simulation Data Structure
  interface DryRunCommit {
    id: string;
    short_id: string;
    summary: string;
    author: string;
    action: string;
    squashedMessages: string[];
    squashCount: number;
    isBase?: boolean;
    isNewHead?: boolean;
  }

  let dryRunResult = $derived.by(() => {
    if (!ontoCommit) return { commits: [], squashedCount: 0, droppedCount: 0, resultingCount: 0 };

    let totalSquashed = 0;
    const resultList: DryRunCommit[] = [];

    for (let i = 0; i < todos.length; i++) {
      const item = todos[i];
      if (item.action === 'drop') continue;

      if (item.action === 'squash' || item.action === 'fixup') {
        if (resultList.length > 0) {
          const prev = resultList[resultList.length - 1];
          prev.squashCount += 1;
          totalSquashed += 1;
          if (item.action === 'squash') {
            prev.squashedMessages.push(item.summary);
          }
        } else {
          // Fallback if first commit is squash: treat as pick
          resultList.push({
            id: item.commit_id,
            short_id: item.short_id,
            summary: item.summary,
            author: item.author,
            action: 'pick',
            squashedMessages: [],
            squashCount: 0,
          });
        }
      } else {
        resultList.push({
          id: item.commit_id,
          short_id: item.short_id,
          summary: item.summary,
          author: item.author,
          action: item.action,
          squashedMessages: [],
          squashCount: 0,
        });
      }
    }

    if (resultList.length > 0) {
      resultList[resultList.length - 1].isNewHead = true;
    }

    return {
      commits: resultList,
      squashedCount: totalSquashed,
      droppedCount: todos.filter((t) => t.action === 'drop').length,
      resultingCount: resultList.length,
    };
  });

  // Safety Check: First active commit cannot be squash or fixup
  let firstActiveTodo = $derived(todos.find((t) => t.action !== 'drop'));
  let isFirstCommitInvalidSquash = $derived(
    firstActiveTodo && (firstActiveTodo.action === 'squash' || firstActiveTodo.action === 'fixup')
  );

  function fixFirstCommitAction() {
    const idx = todos.findIndex((t) => t.action !== 'drop');
    if (idx !== -1) {
      todos = todos.map((item, i) => (i === idx ? { ...item, action: 'pick' } : item));
    }
  }

  function dropAllMerges() {
    let count = 0;
    todos = todos.map((item) => {
      if (isMergeCommit(item.summary) && item.action !== 'drop') {
        count++;
        return { ...item, action: 'drop' };
      }
      return item;
    });
    if (count > 0) {
      toast.success(
        localeState.t('workflows.rebase.toastSuccess'),
        `Đã đánh dấu Drop cho ${count} commit merge.`
      );
    }
  }

  function restoreAll() {
    todos = todos.map((item) => ({ ...item, action: 'pick' }));
    toast.info(localeState.t('workflows.rebase.restoreAll'), 'Đã đặt lại tất cả commit về pick.');
  }

  $effect(() => {
    if (isOpen && repoPath && ontoCommit) {
      searchQuery = '';
      filterMode = 'all';
      activeTab = 'todos';
      draggedIndex = null;
      dragOverIndex = null;
      dropPlacement = null;
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

  // HTML5 Drag and Drop Handlers
  function handleDragStart(e: DragEvent, originalIndex: number) {
    draggedIndex = originalIndex;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(originalIndex));
    }
  }

  function handleDragOver(e: DragEvent, originalIndex: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === originalIndex) {
      dragOverIndex = null;
      dropPlacement = null;
      return;
    }
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    dragOverIndex = originalIndex;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    dropPlacement = e.clientY < midY ? 'before' : 'after';
  }

  function handleDragLeave() {
    dragOverIndex = null;
    dropPlacement = null;
  }

  function handleDrop(e: DragEvent, targetOriginalIndex: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetOriginalIndex) {
      draggedIndex = null;
      dragOverIndex = null;
      dropPlacement = null;
      return;
    }

    const newTodos = [...todos];
    const [movedItem] = newTodos.splice(draggedIndex, 1);

    let targetPos = targetOriginalIndex;
    if (draggedIndex < targetOriginalIndex) {
      targetPos = dropPlacement === 'after' ? targetOriginalIndex : targetOriginalIndex - 1;
    } else {
      targetPos = dropPlacement === 'after' ? targetOriginalIndex + 1 : targetOriginalIndex;
    }
    targetPos = Math.max(0, Math.min(targetPos, newTodos.length));
    newTodos.splice(targetPos, 0, movedItem);

    todos = newTodos;
    draggedIndex = null;
    dragOverIndex = null;
    dropPlacement = null;
  }

  function handleDragEnd() {
    draggedIndex = null;
    dragOverIndex = null;
    dropPlacement = null;
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
    if (isFirstCommitInvalidSquash) {
      toast.error(localeState.t('workflows.rebase.invalidFirstSquash'), '');
      return;
    }
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
      class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100 max-h-[90vh]"
    >
      <!-- Header -->
      <div class="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
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

      <!-- Studio Mode Switcher: Todos vs Dry-Run Preview -->
      <div class="px-6 py-2 bg-zinc-100/70 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div class="flex items-center bg-zinc-200/80 dark:bg-zinc-800/80 p-0.5 rounded-lg text-xs">
          <button
            onclick={() => (activeTab = 'todos')}
            class="px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer {activeTab === 'todos' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            <ListOrdered class="w-3.5 h-3.5 text-amber-500" />
            <span>{localeState.t('workflows.rebase.tabTodos')}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {todos.length}
            </span>
          </button>

          <button
            onclick={() => (activeTab = 'preview')}
            class="px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer {activeTab === 'preview' ? 'bg-white dark:bg-zinc-900 text-cyan-700 dark:text-cyan-300 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            <Sparkles class="w-3.5 h-3.5 text-cyan-500" />
            <span>{localeState.t('workflows.rebase.tabPreview')}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 font-bold">
              {dryRunResult.resultingCount}
            </span>
          </button>
        </div>

        <!-- Quick Summary Tag -->
        <div class="text-xs text-zinc-500 dark:text-zinc-400 font-mono flex items-center gap-2">
          <span>{todos.length} ➔ <strong class="text-cyan-600 dark:text-cyan-400">{dryRunResult.resultingCount}</strong> commits</span>
          {#if dryRunResult.droppedCount > 0}
            <span class="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px]">
              -{dryRunResult.droppedCount} drop
            </span>
          {/if}
          {#if dryRunResult.squashedCount > 0}
            <span class="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px]">
              -{dryRunResult.squashedCount} squash
            </span>
          {/if}
        </div>
      </div>

      <!-- Action Legend / Quick Info (Shown in Todos Tab) -->
      {#if activeTab === 'todos'}
        <div class="px-6 py-2 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 font-mono">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[11px] font-sans text-zinc-500">{localeState.t('workflows.rebase.operations')}</span>
            <span class="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-[10px]">Pick: {localeState.t('workflows.rebase.pickDesc')}</span>
            <span class="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-[10px]">Reword: {localeState.t('workflows.rebase.rewordDesc')}</span>
            <span class="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 text-[10px]">Squash: {localeState.t('workflows.rebase.squashDesc')}</span>
            <span class="px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/50 text-[10px]">Fixup: {localeState.t('workflows.rebase.fixupDesc')}</span>
            <span class="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 text-[10px]">Drop: {localeState.t('workflows.rebase.dropDesc')}</span>
          </div>
          <span class="text-zinc-400 font-sans text-[11px] hidden md:inline">
            ✨ {localeState.t('workflows.rebase.dragToReorder')}
          </span>
        </div>

        <!-- Search & Filter Controls Toolbar -->
        <div class="px-6 py-2.5 bg-zinc-50/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <!-- Search Input -->
          <div class="relative flex-1 min-w-[220px]">
            <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder={localeState.t('workflows.rebase.searchPlaceholder')}
              class="w-full pl-8.5 pr-8 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-amber-500 font-sans transition-colors"
            />
            {#if searchQuery}
              <button
                onclick={() => (searchQuery = '')}
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
              >
                <X class="w-3 h-3" />
              </button>
            {/if}
          </div>

          <!-- Filter Tabs & Quick Action Buttons -->
          <div class="flex items-center gap-2 flex-wrap">
            <div class="flex items-center bg-zinc-200/70 dark:bg-zinc-800/80 p-0.5 rounded-lg text-xs">
              <button
                onclick={() => (filterMode = 'all')}
                class="px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer {filterMode === 'all' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
              >
                {localeState.t('workflows.rebase.filterAll')} ({todos.length})
              </button>
              <button
                onclick={() => (filterMode = 'merges')}
                class="px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer flex items-center gap-1.5 {filterMode === 'merges' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
              >
                <span>{localeState.t('workflows.rebase.filterMerges')}</span>
                {#if mergeCount > 0}
                  <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                    {mergeCount}
                  </span>
                {/if}
              </button>
              <button
                onclick={() => (filterMode = 'dropped')}
                class="px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer flex items-center gap-1.5 {filterMode === 'dropped' ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
              >
                <span>{localeState.t('workflows.rebase.filterDropped')}</span>
                {#if droppedCount > 0}
                  <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                    {droppedCount}
                  </span>
                {/if}
              </button>
            </div>

            <!-- Batch Action: Drop All Merges -->
            {#if activeMergesNotDropped > 0}
              <button
                onclick={dropAllMerges}
                title={localeState.t('workflows.rebase.dropAllMergesTooltip', { count: activeMergesNotDropped })}
                class="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Trash2 class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>{localeState.t('workflows.rebase.dropAllMerges')}</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 dark:bg-rose-800 text-rose-900 dark:text-rose-100 font-bold">
                  {activeMergesNotDropped}
                </span>
              </button>
            {/if}

            <!-- Restore All Button -->
            {#if droppedCount > 0}
              <button
                onclick={restoreAll}
                class="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw class="w-3 h-3" />
                <span>{localeState.t('workflows.rebase.restoreAll')}</span>
              </button>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Safety Alert: Invalid First Squash -->
      {#if isFirstCommitInvalidSquash}
        <div class="px-6 py-2.5 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 animate-in fade-in">
          <div class="flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{localeState.t('workflows.rebase.invalidFirstSquash')}</span>
          </div>
          <button
            onclick={fixFirstCommitAction}
            class="px-2.5 py-1 rounded-md bg-rose-200/80 dark:bg-rose-900/80 hover:bg-rose-300 dark:hover:bg-rose-800 text-rose-950 dark:text-rose-100 font-bold transition-all cursor-pointer text-xs"
          >
            {localeState.t('workflows.rebase.fixToPick')}
          </button>
        </div>
      {/if}

      <!-- TAB 1: TODOLIST & DRAG AND DROP -->
      {#if activeTab === 'todos'}
        <div class="p-6 max-h-[500px] overflow-y-auto space-y-2 select-none">
          {#if isLoading}
            <div class="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <RefreshCw class="w-6 h-6 animate-spin text-amber-500 dark:text-amber-400" />
              <span class="text-xs font-mono">{localeState.t('workflows.rebase.loadingTodos')}</span>
            </div>
          {:else if todos.length === 0}
            <div class="py-12 text-center text-zinc-500 text-xs font-mono">
              {localeState.t('workflows.rebase.emptyTodos')}
            </div>
          {:else if filteredTodosWithIndex.length === 0}
            <div class="py-12 text-center text-zinc-500 text-xs font-sans">
              <Filter class="w-6 h-6 mx-auto mb-2 text-zinc-400 opacity-60" />
              <p>{localeState.t('workflows.rebase.noFilterResults')}</p>
            </div>
          {:else}
            <div class="space-y-1.5 font-mono">
              {#each filteredTodosWithIndex as { item, originalIndex } (item.commit_id)}
                {@const isBeingDragged = draggedIndex === originalIndex}
                {@const isDragTarget = dragOverIndex === originalIndex}

                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  draggable="true"
                  ondragstart={(e) => handleDragStart(e, originalIndex)}
                  ondragover={(e) => handleDragOver(e, originalIndex)}
                  ondragleave={handleDragLeave}
                  ondrop={(e) => handleDrop(e, originalIndex)}
                  ondragend={handleDragEnd}
                  class="relative p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 {isBeingDragged ? 'opacity-40 border-dashed border-amber-500 scale-[0.99]' : ''} {isDragTarget && dropPlacement === 'before' ? 'border-t-2 border-t-amber-500' : ''} {isDragTarget && dropPlacement === 'after' ? 'border-b-2 border-b-amber-500' : ''} {item.action === 'drop' ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-60' : isMergeCommit(item.summary) ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50' : 'bg-zinc-50 dark:bg-zinc-950/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs'}"
                >
                  <!-- Drag Handle & Left Controls -->
                  <div class="flex items-center gap-1.5 shrink-0">
                    <!-- Grip Handle -->
                    <div
                      class="cursor-grab active:cursor-grabbing p-1 text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                      title={localeState.t('workflows.rebase.dragToReorder')}
                    >
                      <GripVertical class="w-3.5 h-3.5" />
                    </div>

                    <!-- Up / Down buttons -->
                    <div class="flex flex-col gap-0.5">
                      <button
                        onclick={() => moveUp(originalIndex)}
                        disabled={originalIndex === 0}
                        class="p-0.5 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default transition-colors border border-zinc-200 dark:border-transparent"
                        title={localeState.t('workflows.rebase.moveUpTooltip')}
                      >
                        <ArrowUp class="w-2.5 h-2.5" />
                      </button>
                      <button
                        onclick={() => moveDown(originalIndex)}
                        disabled={originalIndex === todos.length - 1}
                        class="p-0.5 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-default transition-colors border border-zinc-200 dark:border-transparent"
                        title={localeState.t('workflows.rebase.moveDownTooltip')}
                      >
                        <ArrowDown class="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <!-- Action Selector -->
                    <select
                      value={item.action}
                      onchange={(e) => setAction(originalIndex, e.currentTarget.value)}
                      class="px-2 py-1 rounded-lg text-xs font-bold border transition-colors outline-hidden cursor-pointer {ACTION_CONFIGS[item.action]?.color || 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'}"
                    >
                      <option value="pick">pick ({localeState.t('workflows.rebase.pickDesc')})</option>
                      <option value="reword">reword ({localeState.t('workflows.rebase.rewordDesc')})</option>
                      <option value="squash">squash ({localeState.t('workflows.rebase.squashDesc')})</option>
                      <option value="fixup">fixup ({localeState.t('workflows.rebase.fixupDesc')})</option>
                      <option value="drop">drop ({localeState.t('workflows.rebase.dropDesc')})</option>
                    </select>
                  </div>

                  <!-- Center: Commit SHA & Summary -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-cyan-700 dark:text-cyan-400">
                        {item.short_id}
                      </span>
                      <span class="text-[11px] text-zinc-500 truncate max-w-[150px]">
                        {item.author}
                      </span>
                      {#if isMergeCommit(item.summary)}
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                          Merge PR
                        </span>
                      {/if}
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

                  <!-- Right: Drop/Restore Quick Action -->
                  <div class="shrink-0">
                    {#if item.action !== 'drop'}
                      <button
                        onclick={() => setAction(originalIndex, 'drop')}
                        class="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title={localeState.t('workflows.rebase.dropTooltip')}
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    {:else}
                      <button
                        onclick={() => setAction(originalIndex, 'pick')}
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
      {:else}
        <!-- TAB 2: DRY-RUN GRAPH PREVIEW -->
        <div class="p-6 max-h-[500px] overflow-y-auto space-y-4">
          <!-- Summary Banner -->
          <div class="p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-900/60 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span class="font-medium text-cyan-950 dark:text-cyan-200">
                {localeState.t('workflows.rebase.commitsCountDiff', { original: todos.length, resulting: dryRunResult.resultingCount, reduced: dryRunResult.droppedCount + dryRunResult.squashedCount })}
              </span>
            </div>
            <span class="text-[11px] font-mono text-cyan-800 dark:text-cyan-300 font-bold">
              Dry-Run Simulation
            </span>
          </div>

          <!-- Vertical Timeline DAG Graph -->
          <div class="relative pl-6 space-y-3 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-amber-500 before:to-emerald-500">
            <!-- Simulated Commits (Reverse order: HEAD at top) -->
            {#each [...dryRunResult.commits].reverse() as commit, idx (commit.id + idx)}
              <div class="relative flex items-start gap-3 p-3 rounded-xl border bg-white dark:bg-zinc-950/80 border-zinc-200 dark:border-zinc-800 shadow-xs group hover:border-cyan-400 dark:hover:border-cyan-700 transition-all">
                <!-- Node circle indicator -->
                <div class="absolute -left-[19px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 shadow-xs flex items-center justify-center {commit.isNewHead ? 'bg-cyan-500 ring-2 ring-cyan-400/40' : commit.squashCount > 0 ? 'bg-blue-500' : commit.action === 'reword' ? 'bg-amber-500' : 'bg-emerald-500'}"></div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono font-bold text-xs text-cyan-600 dark:text-cyan-400">{commit.short_id}</span>
                    <span class="text-[11px] text-zinc-500 truncate">{commit.author}</span>

                    {#if commit.isNewHead}
                      <span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                        {localeState.t('workflows.rebase.previewHead')}
                      </span>
                    {/if}

                    {#if commit.squashCount > 0}
                      <span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                        <Layers class="w-2.5 h-2.5" />
                        {localeState.t('workflows.rebase.squashedCount', { count: commit.squashCount })}
                      </span>
                    {/if}

                    {#if commit.action === 'reword'}
                      <span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <Edit3 class="w-2.5 h-2.5" />
                        {localeState.t('workflows.rebase.rewordedBadge')}
                      </span>
                    {/if}
                  </div>

                  <p class="text-xs font-sans text-zinc-800 dark:text-zinc-200 mt-1 font-medium">
                    {commit.summary}
                  </p>

                  <!-- Squashed sub-messages list -->
                  {#if commit.squashedMessages.length > 0}
                    <div class="mt-2 pl-3 border-l-2 border-blue-300 dark:border-blue-800 space-y-1">
                      <div class="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">{localeState.t('workflows.rebase.squashedSubMessages')}</div>
                      {#each commit.squashedMessages as subMsg}
                        <div class="text-[11px] text-zinc-600 dark:text-zinc-400 truncate flex items-center gap-1">
                          <span class="text-blue-400">•</span>
                          <span>{subMsg}</span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}

            <!-- Base Commit (Onto) Node at bottom -->
            <div class="relative flex items-start gap-3 p-3 rounded-xl border bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 opacity-80">
              <div class="absolute -left-[19px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 bg-purple-500 shadow-xs"></div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">{ontoCommit.short_id}</span>
                  <span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                    {localeState.t('workflows.rebase.previewBase')}
                  </span>
                </div>
                <p class="text-xs font-sans text-zinc-600 dark:text-zinc-400 mt-1 truncate">
                  {ontoCommit.summary}
                </p>
              </div>
            </div>
          </div>
        </div>
      {/if}

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
            disabled={isExecuting || todos.length === 0 || isFirstCommitInvalidSquash}
            class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg transition-all disabled:opacity-50"
          >
            {#if isExecuting}
              <RefreshCw class="w-4 h-4 animate-spin" />
              <span>{localeState.t('workflows.rebase.rebasing')}</span>
            {:else}
              <GitFork class="w-4 h-4" />
              <span>{localeState.t('workflows.rebase.startRebaseWithCount', { count: dryRunResult.resultingCount })}</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
