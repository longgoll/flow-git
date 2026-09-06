<script lang="ts">
  import type { BranchInfo } from '../types';
  import {
    AlertTriangle,
    GitBranch,
    Globe,
    Lock,
    ShieldAlert,
    Trash2,
    X,
  } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    show: boolean;
    branch: BranchInfo | null;
    isLoading?: boolean;
    onClose: () => void;
    onConfirmDelete: (branch: BranchInfo, deleteOnRemoteServer?: boolean) => Promise<void>;
  }

  let {
    show,
    branch,
    isLoading = false,
    onClose,
    onConfirmDelete,
  }: Props = $props();

  let deleteOnRemoteServer = $state(false);
  let confirmNameInput = $state('');

  const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'dev', 'trunk', 'head', 'release']);

  $effect(() => {
    if (show) {
      confirmNameInput = '';
      deleteOnRemoteServer = false;
    }
  });

  let isHead = $derived(Boolean(branch?.is_head));

  let isProtected = $derived.by(() => {
    if (!branch) return false;
    const name = branch.shorthand.toLowerCase();
    const cleanName = name.replace(/^(origin|upstream|remotes\/[^\/]+)\//, '');
    return PROTECTED_BRANCHES.has(cleanName) || cleanName === 'head';
  });

  let isConfirmationMatched = $derived.by(() => {
    if (!branch) return false;
    return confirmNameInput.trim().toLowerCase() === branch.shorthand.trim().toLowerCase();
  });

  let canSubmit = $derived.by(() => {
    if (!branch || isHead || isLoading) return false;
    if (isProtected) {
      return isConfirmationMatched;
    }
    return true;
  });

  async function handleSubmit() {
    if (!canSubmit || !branch) return;
    await onConfirmDelete(branch, branch.is_remote ? deleteOnRemoteServer : false);
  }
</script>

{#if show && branch}
  <div class="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
    <div
      class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100 font-sans"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
        <div class="flex items-center gap-2.5">
          {#if isHead}
            <div class="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
              <Lock class="w-4 h-4" />
            </div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{localeState.t('modals.deleteBranch.activeHeadTitle')}</h2>
          {:else if isProtected}
            <div class="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
              <ShieldAlert class="w-4 h-4" />
            </div>
            <h2 class="text-sm font-semibold text-rose-600 dark:text-rose-400">{localeState.t('modals.deleteBranch.protectedTitle')}</h2>
          {:else}
            <div class="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
              <Trash2 class="w-4 h-4" />
            </div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {branch.is_remote ? localeState.t('modals.deleteBranch.remoteTitle') : localeState.t('modals.deleteBranch.localTitle')}
            </h2>
          {/if}
        </div>
        <button
          onclick={onClose}
          disabled={isLoading}
          class="text-zinc-400 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-5 space-y-4 text-xs">
        <!-- Branch Details Card -->
        <div class="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 font-mono font-medium text-zinc-900 dark:text-zinc-200">
              {#if branch.is_remote}
                <Globe class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              {:else}
                <GitBranch class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              {/if}
              <span class="truncate text-sm font-semibold">{branch.shorthand}</span>
            </div>
            <div class="flex items-center gap-1.5">
              {#if isProtected}
                <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                  {localeState.t('modals.deleteBranch.coreBadge')}
                </span>
              {/if}
              <span
                class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider {branch.is_remote
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                  : 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40'}"
              >
                {branch.is_remote ? 'Remote' : 'Local'}
              </span>
            </div>
          </div>

          <div class="text-[11px] text-zinc-500 font-mono truncate">
            {localeState.t('modals.deleteBranch.targetCommit')} <span class="text-zinc-700 dark:text-zinc-400">{branch.target_commit_id?.slice(0, 8)}</span>
          </div>
        </div>

        {#if isHead}
          <!-- HEAD Branch Notice: Can NEVER be deleted while checked out -->
          <div class="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200 space-y-2">
            <div class="flex items-start gap-2.5">
              <Lock class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div class="space-y-1">
                <p class="font-medium text-amber-700 dark:text-amber-300">{localeState.t('modals.deleteBranch.cannotDeleteHeadTitle')}</p>
                <p class="text-[11px] text-amber-800/80 dark:text-amber-200/80 leading-relaxed">
                  Nhánh <code class="font-mono font-semibold bg-amber-100 dark:bg-amber-950/60 px-1 py-0.5 rounded text-amber-800 dark:text-amber-300">{branch.shorthand}</code> 
                  {localeState.t('modals.deleteBranch.cannotDeleteHeadDesc')}
                </p>
                <p class="text-[11px] text-amber-900/90 dark:text-amber-200/90 font-medium pt-1">
                  {localeState.t('modals.deleteBranch.cannotDeleteHeadHint')}
                </p>
              </div>
            </div>
          </div>
        {:else if isProtected}
          <!-- Protected Branch Danger Zone with Type-to-Confirm -->
          <div class="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 space-y-3">
            <div class="flex items-start gap-2.5">
              <AlertTriangle class="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div class="space-y-1">
                <p class="font-bold text-rose-700 dark:text-rose-300 text-xs">{localeState.t('modals.deleteBranch.protectedWarningTitle')}</p>
                <p class="text-[11px] text-rose-800/85 dark:text-rose-300/85 leading-relaxed">
                  Nhánh <strong class="font-mono font-bold text-rose-900 dark:text-rose-200">{branch.shorthand}</strong> {localeState.t('modals.deleteBranch.protectedWarningDesc')} 
                  {#if branch.ahead_count > 0}
                    {localeState.t('modals.deleteBranch.unpushedCommitsWarning', { count: branch.ahead_count })}
                  {/if}
                </p>
              </div>
            </div>

            <div class="pt-1 space-y-1.5">
              <label for="branch-confirm-input" class="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                {localeState.t('modals.deleteBranch.confirmPrompt', { branch: branch.shorthand })}
              </label>
              <input
                id="branch-confirm-input"
                type="text"
                bind:value={confirmNameInput}
                placeholder={localeState.t('modals.deleteBranch.confirmPlaceholder')}
                autocomplete="off"
                spellcheck="false"
                class="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                onkeydown={(e) => {
                  if (e.key === 'Enter' && canSubmit) {
                    handleSubmit();
                  }
                }}
              />
            </div>
          </div>

          {#if branch.is_remote}
            <div class="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <label class="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  bind:checked={deleteOnRemoteServer}
                  class="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-rose-600 focus:ring-rose-500/20 focus:ring-offset-0 cursor-pointer"
                />
                <div class="space-y-0.5">
                  <span class="text-xs font-semibold text-rose-600 dark:text-rose-300">{localeState.t('modals.deleteBranch.remoteServerCheckbox')}</span>
                  <p class="text-[11px] text-zinc-500">
                    {deleteOnRemoteServer
                      ? localeState.t('modals.deleteBranch.remoteServerWarning')
                      : localeState.t('modals.deleteBranch.remoteDefaultHint')}
                  </p>
                </div>
              </label>
            </div>
          {/if}
        {:else}
          <!-- Normal Branch Deletion Info -->
          {#if !branch.is_remote}
            {#if branch.ahead_count > 0}
              <div class="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertTriangle class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p class="text-[11px] leading-relaxed">
                  {localeState.t('modals.deleteBranch.unpushedLocalWarning', { count: branch.ahead_count })}
                </p>
              </div>
            {:else}
              <p class="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {localeState.t('modals.deleteBranch.localConfirmDesc', { branch: branch.shorthand })}
              </p>
            {/if}
          {:else}
            <!-- Remote Branch Warnings & Choices -->
            <div class="space-y-3">
              <p class="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {localeState.t('modals.deleteBranch.remoteDeletingDesc', { branch: branch.shorthand })}
              </p>

              <div class="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <label class="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    bind:checked={deleteOnRemoteServer}
                    class="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-rose-600 focus:ring-rose-500/20 focus:ring-offset-0 cursor-pointer"
                  />
                  <div class="space-y-0.5">
                    <span class="text-xs font-semibold text-rose-600 dark:text-rose-300">{localeState.t('modals.deleteBranch.remoteServerCheckbox')}</span>
                    <p class="text-[11px] text-zinc-500">
                      {deleteOnRemoteServer
                        ? localeState.t('modals.deleteBranch.remoteServerWarning')
                        : localeState.t('modals.deleteBranch.remoteDefaultHint')}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/40">
        <button
          onclick={onClose}
          disabled={isLoading}
          class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isHead ? localeState.t('common.close') : localeState.t('common.cancel')}
        </button>

        {#if !isHead}
          <button
            onclick={handleSubmit}
            disabled={!canSubmit || isLoading}
            class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {#if isLoading}
              <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>{localeState.t('modals.deleteBranch.deleting')}</span>
            {:else}
              <Trash2 class="w-3.5 h-3.5" />
              <span>
                {deleteOnRemoteServer
                  ? localeState.t('modals.deleteBranch.confirmDeleteRemoteBtn')
                  : isProtected
                    ? localeState.t('modals.deleteBranch.confirmDeleteProtectedBtn')
                    : localeState.t('modals.deleteBranch.confirmDeleteBtn')}
              </span>
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
