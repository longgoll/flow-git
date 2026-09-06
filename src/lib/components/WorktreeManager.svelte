<script lang="ts">
  import type { BranchInfo, WorktreeInfo } from '../types';
  import { FolderGit2, Plus, Trash2, FolderOpen, GitBranch, X, Lock } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';


  interface Props {
    isOpen: boolean;
    worktrees: WorktreeInfo[];
    branches: BranchInfo[];
    isLoading: boolean;
    onClose: () => void;
    onCreateWorktree: (name: string, targetPath: string, branchName?: string) => Promise<void>;
    onDeleteWorktree: (name: string) => Promise<void>;
    onOpenWorktree: (path: string) => void;
  }

  let {
    isOpen = false,
    worktrees = [],
    branches = [],
    isLoading = false,
    onClose,
    onCreateWorktree,
    onDeleteWorktree,
    onOpenWorktree,
  }: Props = $props();

  let isCreating = $state(false);
  let newName = $state('');
  let newPath = $state('');
  let selectedBranch = $state('');
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  async function handleCreateSubmit() {
    if (!newName.trim() || !newPath.trim()) {
      errorMessage = 'Please provide both worktree name and directory path.';
      return;
    }
    isSubmitting = true;
    errorMessage = '';
    try {
      await onCreateWorktree(
        newName.trim(),
        newPath.trim(),
        selectedBranch.trim() ? selectedBranch.trim() : undefined
      );
      isCreating = false;
      newName = '';
      newPath = '';
      selectedBranch = '';
    } catch (e: any) {
      errorMessage = e?.message || String(e);
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
    <div class="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100 font-sans">
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/90">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <FolderGit2 class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">{localeState.t('modals.worktree.title')}</h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">{localeState.t('modals.worktree.subtitle')}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          {#if !isCreating}
            <button
              onclick={() => (isCreating = true)}
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs cursor-pointer shadow-lg shadow-cyan-600/20 transition-colors"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>{localeState.t('modals.worktree.newWorktree')}</span>
            </button>
          {/if}
          <button
            onclick={onClose}
            class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="p-5 flex-1 overflow-y-auto space-y-4">
        {#if errorMessage}
          <div class="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 px-3.5 py-2 rounded-lg text-xs">
            {errorMessage}
          </div>
        {/if}

        <!-- Create Worktree Form Drawer -->
        {#if isCreating}
          <div class="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide">{localeState.t('modals.worktree.formTitle')}</span>
              <button
                onclick={() => (isCreating = false)}
                class="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs cursor-pointer"
              >
                {localeState.t('common.cancel')}
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="wt-name-input" class="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">{localeState.t('modals.worktree.nameLabel')}</label>
                <input
                  id="wt-name-input"
                  type="text"
                  bind:value={newName}
                  placeholder={localeState.t('modals.worktree.namePlaceholder')}
                  class="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-cyan-500 select-text"
                />
              </div>

              <div>
                <label for="wt-branch-select" class="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">{localeState.t('modals.worktree.targetBranchLabel')}</label>
                <select
                  id="wt-branch-select"
                  bind:value={selectedBranch}
                  class="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="" class="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">{localeState.t('modals.worktree.fromCurrentHead')}</option>
                  {#each branches as b}
                    <option value={b.shorthand} class="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">{b.shorthand}</option>
                  {/each}
                </select>
              </div>
            </div>

            <div>
              <label for="wt-path-input" class="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">{localeState.t('modals.worktree.directoryPathLabel')}</label>
              <input
                id="wt-path-input"
                type="text"
                bind:value={newPath}
                placeholder={localeState.t('modals.worktree.pathPlaceholder')}
                class="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-cyan-500 select-text"
              />
            </div>

            <div class="flex justify-end gap-2 pt-1">
              <button
                onclick={() => (isCreating = false)}
                class="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer border border-zinc-300 dark:border-transparent"
              >
                {localeState.t('common.cancel')}
              </button>
              <button
                onclick={handleCreateSubmit}
                disabled={isSubmitting}
                class="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs cursor-pointer shadow-lg shadow-cyan-600/25 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? localeState.t('modals.worktree.creating') : localeState.t('modals.worktree.createBtn')}
              </button>
            </div>
          </div>
        {/if}

        <!-- Worktree List -->
        {#if isLoading}
          <div class="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
            <div class="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-xs">Loading worktrees...</span>
          </div>
        {:else if worktrees.length === 0}
          <div class="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
            <FolderGit2 class="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
            <span class="text-sm font-medium">{localeState.t('modals.worktree.noWorktrees')}</span>
          </div>
        {:else}
          <div class="space-y-2.5">
            {#each worktrees as wt}
              <div class="bg-zinc-50/70 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl p-3.5 flex items-center justify-between transition-all">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-xs text-zinc-900 dark:text-zinc-100">{wt.name}</span>
                    {#if wt.is_main}
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/40 font-mono">
                        {localeState.t('modals.worktree.currentHeadBadge')}
                      </span>
                    {:else}
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 font-mono">
                        LINKED
                      </span>
                    {/if}

                    {#if wt.branch_name}
                      <span class="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-purple-100 dark:bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                        <GitBranch class="w-2.5 h-2.5" />
                        {wt.branch_name}
                      </span>
                    {/if}

                    {#if wt.is_locked}
                      <span class="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                        <Lock class="w-3 h-3" />
                        {localeState.t('modals.worktree.lockedBadge')}
                      </span>
                    {/if}
                  </div>

                  <p class="text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate max-w-lg select-text">{wt.path}</p>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    onclick={() => onOpenWorktree(wt.path)}
                    title={localeState.t('modals.worktree.openFolder')}
                    class="p-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors border border-zinc-200 dark:border-transparent shadow-xs"
                  >
                    <FolderOpen class="w-3.5 h-3.5" />
                  </button>

                  {#if !wt.is_main}
                    <button
                      onclick={() => onDeleteWorktree(wt.name)}
                      title={localeState.t('modals.worktree.removeBtn')}
                      class="p-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-900/50 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 cursor-pointer transition-colors border border-zinc-200 dark:border-transparent shadow-xs"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-end">
        <button
          onclick={onClose}
          class="px-4 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-300 cursor-pointer transition-colors border border-zinc-200 dark:border-transparent"
        >
          {localeState.t('common.close')}
        </button>
      </div>
    </div>
  </div>
{/if}
