<script lang="ts">
  import { onMount } from 'svelte';
  import type { StackedCommitItem } from '../types';
  import { getUnpushedStackedCommits, reorderStackedCommits } from '../api/repo';
  import {
    Box,
    GripVertical,
    ArrowUp,
    ArrowDown,
    Check,
    X,
    Clock,
    User,
    ShieldCheck,
    Sparkles,
    Upload,
    Anchor,
  } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    repoPath: string;
    currentBranch?: string;
    onRefreshRepo: () => Promise<void>;
    onClose: () => void;
    onPush?: () => Promise<void>;
  }

  let {
    repoPath = '',
    currentBranch = '',
    onRefreshRepo,
    onClose,
    onPush,
  }: Props = $props();

  let commits = $state<StackedCommitItem[]>([]);
  let isLoading = $state<boolean>(true);
  let isSaving = $state<boolean>(false);
  let hasChanges = $state<boolean>(false);
  let statusMessage = $state<string>('');
  let draggedIndex = $state<number | null>(null);
  let dropTargetIndex = $state<number | null>(null);

  onMount(() => {
    loadCommits();
  });

  async function loadCommits() {
    if (!repoPath) return;
    isLoading = true;
    try {
      const items = await getUnpushedStackedCommits(repoPath);
      commits = items;
    } catch (err) {
      console.error('Failed to load stacked commits:', err);
    } finally {
      isLoading = false;
    }
  }

  function moveCommit(index: number, direction: 'up' | 'down') {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= commits.length) return;

    const copy = [...commits];
    const item = copy.splice(index, 1)[0];
    copy.splice(target, 0, item);
    commits = copy;
    hasChanges = true;
  }

  function handleDragStart(index: number, e: DragEvent) {
    draggedIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    }
  }

  function handleDragOver(index: number, e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    dropTargetIndex = index;
  }

  function handleDrop(index: number, e: DragEvent) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      draggedIndex = null;
      dropTargetIndex = null;
      return;
    }

    const copy = [...commits];
    const item = copy.splice(draggedIndex, 1)[0];
    copy.splice(index, 0, item);
    commits = copy;
    hasChanges = true;
    draggedIndex = null;
    dropTargetIndex = null;
  }

  async function handleApplyReorder() {
    if (!repoPath || commits.length === 0) return;
    isSaving = true;
    statusMessage = localeState.t('graph.stackedCommits.statusApplying');
    try {
      // Commits are ordered from newest (top) to oldest (bottom) in UI
      // For rebase application, we pass them in reverse (oldest first)
      const ids = commits.map((c) => c.id).reverse();
      await reorderStackedCommits(repoPath, ids);
      hasChanges = false;
      statusMessage = localeState.t('graph.stackedCommits.statusSuccess');
      await onRefreshRepo();
      await loadCommits();
      setTimeout(() => (statusMessage = ''), 4000);
    } catch (err: any) {
      console.error(err);
      statusMessage = `${localeState.t('common.error')}: ${err.message || err}`;
    } finally {
      isSaving = false;
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString() + ' ' + new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>
<div class="flex-1 flex flex-col w-full h-full min-h-0 bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-sans select-none">
  <!-- Top Banner -->
  <div class="px-5 py-3 border-b border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-500/10 via-zinc-50 dark:via-zinc-950 to-zinc-50 dark:to-zinc-950 flex items-center justify-between gap-4 shrink-0 shadow-xs">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
        <Box class="w-4 h-4" />
      </div>

      <div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100">{localeState.t('graph.stackedCommits.title')}</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-mono">
            {localeState.t('graph.stackedCommits.badge')}
          </span>
        </div>
        <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
          {localeState.t('graph.stackedCommits.subtitle')}
        </p>
      </div>
    </div>

    <!-- Actions & Safe Badge -->
    <div class="flex items-center gap-3">
      <div class="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-xs font-mono">
        <ShieldCheck class="w-3.5 h-3.5" />
        <span>{localeState.t('graph.stackedCommits.safeRebase')}</span>
      </div>

      {#if hasChanges}
        <button
          onclick={handleApplyReorder}
          disabled={isSaving}
          class="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-950/60 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          <Check class="w-3.5 h-3.5" />
          <span>{isSaving ? localeState.t('graph.stackedCommits.applying') : localeState.t('graph.stackedCommits.applyReorder')}</span>
        </button>
      {/if}

      <button
        onclick={onClose}
        class="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
        title={localeState.t('graph.stackedCommits.closeTooltip')}
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>

  {#if statusMessage}
    <div class="px-5 py-2 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200 dark:border-indigo-900/40 text-xs font-mono text-indigo-800 dark:text-indigo-200 flex items-center justify-between">
      <span>{statusMessage}</span>
      <button onclick={() => (statusMessage = '')} class="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 text-[10px] cursor-pointer">{localeState.t('graph.stackedCommits.dismiss')}</button>
    </div>
  {/if}

  <!-- Main Card Stack Container -->
  <div class="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
    {#if isLoading}
      <div class="h-64 flex items-center justify-center text-zinc-500 text-xs gap-2">
        <div class="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <span>{localeState.t('graph.stackedCommits.loading')}</span>
      </div>
    {:else if commits.length > 0}
      <div class="space-y-4">
        <div class="text-[11px] font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
          <span>{localeState.t('graph.stackedCommits.recentUnpushed')}</span>
          <span class="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">{localeState.t('graph.stackedCommits.unpushedCount', { count: commits.length })}</span>
        </div>

        <!-- Visual Stack Spine Container -->
        <div class="relative pl-6 sm:pl-8 border-l-2 border-indigo-300 dark:border-indigo-800/70 ml-3 sm:ml-4 space-y-4">
          {#each commits as commit, idx}
            {@const isTarget = dropTargetIndex === idx}
            {@const isDragging = draggedIndex === idx}
            <div class="relative">
              <!-- Node Indicator on Spine -->
              <div class="absolute -left-[31px] sm:-left-[39px] top-4 w-3.5 h-3.5 rounded-full bg-white dark:bg-zinc-950 border-2 {idx === 0 ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-indigo-500'} flex items-center justify-center z-10">
                <div class="w-1.5 h-1.5 rounded-full {idx === 0 ? 'bg-emerald-500' : 'bg-indigo-500'}"></div>
              </div>

              <!-- Commit Card -->
              <div
                role="listitem"
                draggable={commits.length > 1}
                ondragstart={(e) => handleDragStart(idx, e)}
                ondragover={(e) => handleDragOver(idx, e)}
                ondrop={(e) => handleDrop(idx, e)}
                class="group rounded-xl border bg-white dark:bg-zinc-900/80 p-3.5 transition-all flex items-start gap-3 select-none {isDragging ? 'opacity-40 scale-95 border-indigo-500' : isTarget ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-lg ring-2 ring-indigo-500/30' : 'border-zinc-200 dark:border-zinc-800/80 hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:shadow-sm shadow-xs'}"
              >
                <!-- Drag Handle (Active only when >= 2 commits) -->
                {#if commits.length > 1}
                  <div class="pt-1 text-zinc-400 group-hover:text-indigo-600 dark:text-zinc-600 dark:group-hover:text-indigo-400 cursor-grab active:cursor-grabbing shrink-0" title={localeState.t('graph.stackedCommits.dragTooltip')}>
                    <GripVertical class="w-4 h-4" />
                  </div>
                {/if}

                <!-- Commit Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-cyan-700 dark:text-cyan-400 text-xs font-bold">
                        {commit.short_id}
                      </span>
                      {#if idx === 0}
                        <span class="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 text-[10px] font-mono font-bold">
                          HEAD (Latest)
                        </span>
                      {/if}
                    </div>

                    <div class="flex items-center gap-3 text-zinc-500 text-[11px] font-mono">
                      <div class="flex items-center gap-1">
                        <User class="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                        <span>{commit.author_name}</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <Clock class="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                        <span>{formatDate(commit.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  <p class="text-xs text-zinc-900 dark:text-zinc-100 font-medium font-sans leading-snug">
                    {commit.summary}
                  </p>
                </div>

                <!-- Position Control Buttons (Only when >= 2 commits) -->
                {#if commits.length > 1}
                  <div class="flex flex-col gap-1 shrink-0 pt-0.5">
                    <button
                      onclick={() => moveCommit(idx, 'up')}
                      disabled={idx === 0}
                      class="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                      title={localeState.t('graph.stackedCommits.moveUp')}
                    >
                      <ArrowUp class="w-3.5 h-3.5" />
                    </button>
                    <button
                      onclick={() => moveCommit(idx, 'down')}
                      disabled={idx === commits.length - 1}
                      class="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                      title={localeState.t('graph.stackedCommits.moveDown')}
                    >
                      <ArrowDown class="w-3.5 h-3.5" />
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          {/each}

          <!-- Stack Anchor: Base Point (Upstream / Remote) -->
          <div class="relative pt-2">
            <!-- Anchor Dot on Spine -->
            <div class="absolute -left-[31px] sm:-left-[39px] top-5 w-3.5 h-3.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border-2 border-zinc-400 dark:border-zinc-600 flex items-center justify-center z-10">
              <div class="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
            </div>

            <div class="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-zinc-900/30 p-3.5 flex items-center justify-between text-xs text-zinc-500">
              <div class="flex items-center gap-2">
                <Anchor class="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                <span class="font-medium text-zinc-700 dark:text-zinc-300">{localeState.t('graph.stackedCommits.upstreamBase')}</span>
                {#if currentBranch}
                  <span class="font-mono text-[11px] px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">origin/{currentBranch}</span>
                {/if}
              </div>
              <span class="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check class="w-3 h-3" />
                <span>{localeState.t('graph.stackedCommits.baseAnchor')}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Smart Tip & Guidance -->
        {#if commits.length === 1}
          <div class="mt-6 p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 dark:from-indigo-950/40 dark:via-zinc-900 dark:to-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-start gap-3">
              <div class="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                <Sparkles class="w-4 h-4" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-zinc-900 dark:text-zinc-100">{localeState.t('graph.stackedCommits.readyPushTitle')}</h4>
                <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  {localeState.t('graph.stackedCommits.readyPushDesc')}
                </p>
              </div>
            </div>
            {#if onPush}
              <button
                onclick={onPush}
                class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Upload class="w-3.5 h-3.5" />
                <span>{localeState.t('graph.stackedCommits.pushToRemote')}</span>
              </button>
            {/if}
          </div>
        {:else}
          <div class="mt-4 p-3 rounded-lg bg-zinc-100/60 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
            <Sparkles class="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>{localeState.t('graph.stackedCommits.reorderTip')}</span>
          </div>
        {/if}
      </div>
    {:else}
      <div class="h-64 flex flex-col items-center justify-center text-center p-8 text-zinc-500 text-xs gap-3">
        <Box class="w-10 h-10 text-zinc-400 dark:text-zinc-600" />
        <span class="text-zinc-800 dark:text-zinc-300 font-semibold text-sm">{localeState.t('graph.stackedCommits.allCommitsPushedTitle')}</span>
        <span class="max-w-sm text-zinc-500 leading-relaxed">
          {localeState.t('graph.stackedCommits.allCommitsPushedDesc')}
        </span>
      </div>
    {/if}
  </div>
</div>
