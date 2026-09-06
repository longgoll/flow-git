<script lang="ts">
  import { Flame, GitBranch, ArrowRight, ShieldCheck, X, AlertCircle } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';
  import type { BranchInfo } from '../types';

  interface Props {
    isOpen: boolean;
    currentBranch: string;
    dirtyFilesCount: number;
    branches: BranchInfo[];
    onStartHotfix: (hotfixBranchName: string, baseBranch: string) => Promise<void>;
    onClose: () => void;
  }

  let {
    isOpen,
    currentBranch,
    dirtyFilesCount,
    branches,
    onStartHotfix,
    onClose,
  }: Props = $props();

  function generateDefaultName(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    return `hotfix/quick-fix-${dateStr}`;
  }

  let hotfixBranchName = $state(generateDefaultName());
  let selectedBaseBranch = $state('main');
  let isSubmitting = $state(false);
  let errorMsg = $state('');

  // Update default base branch when branches change
  $effect(() => {
    if (branches.length > 0) {
      const mainBranch = branches.find((b) => !b.is_remote && (b.shorthand === 'main' || b.shorthand === 'master'));
      if (mainBranch) {
        selectedBaseBranch = mainBranch.shorthand;
      } else {
        const firstLocal = branches.find((b) => !b.is_remote);
        if (firstLocal) selectedBaseBranch = firstLocal.shorthand;
      }
    }
  });

  async function handleSubmit(e?: Event) {
    if (e) e.preventDefault();
    const cleanName = hotfixBranchName.trim();
    if (!cleanName) {
      errorMsg = 'Vui lòng nhập tên nhánh hotfix';
      return;
    }

    try {
      isSubmitting = true;
      errorMsg = '';
      await onStartHotfix(cleanName, selectedBaseBranch);
      onClose();
    } catch (err: any) {
      errorMsg = err?.message || String(err);
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="w-full max-w-lg bg-white dark:bg-zinc-950 border border-amber-300 dark:border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-950/20 overflow-hidden flex flex-col font-sans text-zinc-900 dark:text-zinc-100"
    >
      <!-- Header -->
      <div class="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/60 dark:to-orange-950/40 border-b border-amber-200 dark:border-amber-500/20 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-300 dark:border-amber-500/30 text-amber-600 dark:text-amber-400">
            <Flame class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {localeState.t('modals.quickHotfix.title')}
            </h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {localeState.t('modals.quickHotfix.subtitle')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <form onsubmit={handleSubmit} class="p-6 space-y-4">
        <!-- Status card -->
        <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-zinc-500 dark:text-zinc-400">{localeState.t('modals.quickHotfix.currentBranch')}</span>
            <span class="font-mono font-medium text-zinc-900 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700/50">
              {currentBranch || 'HEAD'}
            </span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-zinc-500 dark:text-zinc-400">{localeState.t('modals.quickHotfix.uncommittedStatus')}</span>
            {#if dirtyFilesCount > 0}
              <span class="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <ShieldCheck class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {localeState.t('modals.quickHotfix.dirtyWarning', { count: dirtyFilesCount })}
              </span>
            {:else}
              <span class="text-emerald-700 dark:text-emerald-400">{localeState.t('modals.quickHotfix.cleanTree')}</span>
            {/if}
          </div>
        </div>

        <!-- Hotfix Branch Name -->
        <div class="space-y-1.5">
          <label for="hotfix-name" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {localeState.t('modals.quickHotfix.hotfixNameLabel')}
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
              <GitBranch class="w-4 h-4" />
            </div>
            <input
              id="hotfix-name"
              type="text"
              bind:value={hotfixBranchName}
              placeholder="hotfix/..."
              class="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-mono placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors select-text"
            />
          </div>
        </div>

        <!-- Base Branch Selection -->
        <div class="space-y-1.5">
          <label for="base-branch" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {localeState.t('modals.quickHotfix.baseBranchLabel')}
          </label>
          <select
            id="base-branch"
            bind:value={selectedBaseBranch}
            class="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
          >
            {#each branches.filter((b) => !b.is_remote) as b}
              <option value={b.shorthand} class="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">{b.shorthand} {b.is_head ? localeState.t('modals.quickHotfix.currentHead') : ''}</option>
            {/each}
          </select>
          <p class="text-[11px] text-zinc-500">
            {localeState.t('modals.quickHotfix.baseBranchHint')}
          </p>
        </div>

        {#if errorMsg}
          <div class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-red-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        {/if}

        <!-- Footer actions -->
        <div class="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onclick={onClose}
            class="px-4 py-2 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {localeState.t('common.cancel')}
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !hotfixBranchName.trim()}
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-amber-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {#if isSubmitting}
              <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>{localeState.t('modals.quickHotfix.starting')}</span>
            {:else}
              <Flame class="w-4 h-4" />
              <span>{localeState.t('modals.quickHotfix.startBtn')}</span>
              <ArrowRight class="w-3.5 h-3.5" />
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
