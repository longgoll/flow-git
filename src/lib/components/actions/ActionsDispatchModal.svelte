<script lang="ts">
  import { Play, X, RefreshCw } from 'lucide-svelte';
  import type { GitHubWorkflow } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    isOpen: boolean;
    workflows: GitHubWorkflow[];
    availableBranches: string[];
    isDispatching: boolean;
    onClose: () => void;
    onDispatch: (workflowId: number | string, branch: string) => Promise<void>;
  }

  let {
    isOpen,
    workflows,
    availableBranches,
    isDispatching,
    onClose,
    onDispatch,
  }: Props = $props();

  let dispatchWorkflowId = $state<number | string>('');
  let dispatchBranch = $state<string>('main');

  $effect(() => {
    if (isOpen) {
      if (!dispatchWorkflowId && workflows.length > 0) {
        dispatchWorkflowId = workflows[0].id;
      }
      if (availableBranches.length > 0 && !availableBranches.includes(dispatchBranch)) {
        dispatchBranch = availableBranches[0];
      }
    }
  });

  async function handleConfirm() {
    if (!dispatchWorkflowId || isDispatching) return;
    await onDispatch(dispatchWorkflowId, dispatchBranch);
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-workflow-title"
      class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-600 dark:text-violet-400">
            <Play class="w-3.5 h-3.5 fill-current" />
          </div>
          <h3 id="run-workflow-title" class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {localeState.t('githubActions.runWorkflow')}
          </h3>
        </div>
        <button
          onclick={onClose}
          class="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 space-y-4 text-xs">
        <p class="text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {localeState.t('githubActions.runWorkflowDesc')}
        </p>

        <!-- Workflow selector -->
        <div>
          <label for="workflow-select-input" class="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            {localeState.t('githubActions.selectWorkflowPrompt')}
          </label>
          <select
            id="workflow-select-input"
            bind:value={dispatchWorkflowId}
            class="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500 font-medium"
          >
            {#each workflows as wf (wf.id)}
              <option value={wf.id}>{wf.name} ({wf.path.split('/').pop()})</option>
            {/each}
          </select>
        </div>

        <!-- Branch selector -->
        <div>
          <label for="branch-select-input" class="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            {localeState.t('githubActions.selectBranch')}
          </label>
          <div class="flex items-center gap-2">
            <select
              id="branch-select-input"
              bind:value={dispatchBranch}
              class="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-violet-500 font-mono font-medium"
            >
              {#if availableBranches.length === 0}
                <option value="main">main</option>
              {:else}
                {#each availableBranches as b}
                  <option value={b}>{b}</option>
                {/each}
              {/if}
            </select>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
        <button
          onclick={onClose}
          disabled={isDispatching}
          class="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onclick={handleConfirm}
          disabled={isDispatching || !dispatchWorkflowId}
          class="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
        >
          {#if isDispatching}
            <RefreshCw class="w-3.5 h-3.5 animate-spin" />
            <span>{localeState.t('githubActions.dispatching')}</span>
          {:else}
            <Play class="w-3.5 h-3.5 fill-current" />
            <span>{localeState.t('githubActions.runWorkflow')}</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
