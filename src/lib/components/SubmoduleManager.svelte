<script lang="ts">
  import { getSubmodules, updateSubmodules, syncSubmodules, getSubmoduleDiff } from '../api';
  import { localeState } from '../state/localeState.svelte';
  import type { SubmoduleDiffResult, SubmoduleInfo } from '../types';
  import { ExternalLink, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-svelte';

  let {
    repoPath = '',
    isOpen = false,
    onClose = () => {},
    onOpenSubmoduleRepo,
  }: {
    repoPath: string;
    isOpen: boolean;
    onClose: () => void;
    onOpenSubmoduleRepo?: (fullPath: string) => void;
  } = $props();

  let submodules = $state<SubmoduleInfo[]>([]);
  let isLoading = $state(false);
  let actionLoading = $state<string | null>(null);
  let statusMessage = $state<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);
  let expandedDiffSub = $state<string | null>(null);
  let subDiffData = $state<SubmoduleDiffResult | null>(null);
  let isLoadingDiff = $state(false);

  $effect(() => {
    if (isOpen && repoPath) {
      loadSubmodules();
    }
  });

  async function loadSubmodules() {
    isLoading = true;
    statusMessage = null;
    try {
      submodules = await getSubmodules(repoPath);
    } catch (e: any) {
      statusMessage = { text: e?.toString() || localeState.t('submodules.loadError'), type: 'error' };
    } finally {
      isLoading = false;
    }
  }

  async function handleUpdateAll(recursive = true) {
    actionLoading = 'all';
    statusMessage = null;
    try {
      const res = await updateSubmodules(repoPath, undefined, recursive);
      statusMessage = { text: res, type: 'success' };
      await loadSubmodules();
    } catch (e: any) {
      statusMessage = { text: e?.toString() || localeState.t('submodules.updateError'), type: 'error' };
    } finally {
      actionLoading = null;
    }
  }

  async function handleUpdateSingle(name: string) {
    actionLoading = name;
    statusMessage = null;
    try {
      const res = await updateSubmodules(repoPath, name, true);
      statusMessage = { text: res, type: 'success' };
      await loadSubmodules();
    } catch (e: any) {
      statusMessage = { text: e?.toString() || localeState.t('submodules.updateNameError', { name }), type: 'error' };
    } finally {
      actionLoading = null;
    }
  }

  async function handleSyncAll() {
    actionLoading = 'sync';
    statusMessage = null;
    try {
      const res = await syncSubmodules(repoPath);
      statusMessage = { text: res, type: 'success' };
      await loadSubmodules();
    } catch (e: any) {
      statusMessage = { text: e?.toString() || localeState.t('submodules.syncError'), type: 'error' };
    } finally {
      actionLoading = null;
    }
  }

  async function toggleSubmoduleDiff(name: string) {
    if (expandedDiffSub === name) {
      expandedDiffSub = null;
      subDiffData = null;
      return;
    }
    expandedDiffSub = name;
    isLoadingDiff = true;
    try {
      subDiffData = await getSubmoduleDiff(repoPath, name);
    } catch (e: any) {
      statusMessage = { text: e?.toString() || 'Failed to load submodule diff', type: 'error' };
      subDiffData = null;
    } finally {
      isLoadingDiff = false;
    }
  }

  function handleOpenSubmodule(sub: SubmoduleInfo) {
    const fullPath = subDiffData?.full_path || `${repoPath.replace(/[/\\]+$/, '')}/${sub.path.replace(/^[/\\]+/, '')}`;
    onClose();
    onOpenSubmoduleRepo?.(fullPath);
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose();
    }}
  >
    <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/80 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100 font-sans">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/40">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="8" height="8" x="3" y="3" rx="2"></rect>
              <path d="M7 11v4a2 2 0 0 0 2 2h4"></path>
              <rect width="8" height="8" x="13" y="13" rx="2"></rect>
            </svg>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              {localeState.t('submodules.title')}
              <span class="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-normal border border-neutral-200 dark:border-transparent">
                {localeState.t('submodules.modulesCount', { count: submodules.length })}
              </span>
            </h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">{localeState.t('submodules.description')}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            onclick={() => handleSyncAll()}
            disabled={actionLoading !== null || isLoading}
            class="px-2.5 py-1 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors disabled:opacity-50 cursor-pointer"
            title={localeState.t('submodules.syncConfigTooltip')}
          >
            {localeState.t('submodules.syncConfig')}
          </button>
          <button
            onclick={() => handleUpdateAll(true)}
            disabled={actionLoading !== null || isLoading}
            class="px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            {#if actionLoading === 'all'}
              <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {/if}
            {localeState.t('submodules.updateAll')}
          </button>
          <button
            onclick={onClose}
            aria-label={localeState.t('submodules.closeModal')}
            class="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Status banner -->
      {#if statusMessage}
        <div class="px-5 py-2 text-xs border-b {statusMessage.type === 'error' ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/40 text-red-800 dark:text-red-300' : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'} flex items-center justify-between">
          <span>{statusMessage.text}</span>
          <button onclick={() => (statusMessage = null)} class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer">✕</button>
        </div>
      {/if}

      <!-- Body -->
      <div class="p-5 overflow-y-auto flex-1 space-y-3">
        {#if isLoading}
          <div class="py-12 flex flex-col items-center justify-center gap-3 text-neutral-500 text-xs">
            <span class="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></span>
            {localeState.t('submodules.scanning')}
          </div>
        {:else if submodules.length === 0}
          <div class="py-12 text-center text-neutral-500">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800/50 flex items-center justify-center text-neutral-400 dark:text-neutral-500">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect width="8" height="8" x="3" y="3" rx="2"></rect>
                <path d="M7 11v4a2 2 0 0 0 2 2h4"></path>
                <rect width="8" height="8" x="13" y="13" rx="2"></rect>
              </svg>
            </div>
            <p class="text-sm font-medium text-neutral-800 dark:text-neutral-300">{localeState.t('submodules.emptyTitle')}</p>
            <p class="text-xs text-neutral-500 mt-1">{localeState.t('submodules.emptyDesc')}</p>
          </div>
        {:else}
          <div class="space-y-2.5">
            {#each submodules as sub}
              <div class="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 hover:border-neutral-300 dark:hover:border-neutral-700/80 transition-all flex flex-col gap-2.5">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm text-neutral-900 dark:text-neutral-200">{sub.name}</span>
                      {#if sub.status === 'clean'}
                        <span class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 font-semibold">{localeState.t('submodules.clean')}</span>
                      {:else if sub.status === 'modified'}
                        <span class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 font-semibold">{localeState.t('submodules.modified')}</span>
                      {:else if sub.status === 'uninitialized'}
                        <span class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800/50 font-semibold">{localeState.t('submodules.uninitialized')}</span>
                      {:else if sub.status === 'out_of_sync'}
                        <span class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50 font-semibold">{localeState.t('submodules.outOfSync')}</span>
                      {/if}
                    </div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5 flex items-center gap-2 select-text">
                      <span>📁 {sub.path}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <button
                      onclick={() => toggleSubmoduleDiff(sub.name)}
                      class="px-2.5 py-1 text-xs rounded-md bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium transition-colors flex items-center gap-1 border border-neutral-300 dark:border-transparent cursor-pointer shadow-xs"
                      title="Xem chi tiết thay đổi trong submodule"
                    >
                      <FileText class="w-3 h-3 text-cyan-500" />
                      <span>{localeState.t('submodules.viewDiff')}</span>
                      {#if expandedDiffSub === sub.name}
                        <ChevronUp class="w-3 h-3 text-neutral-400" />
                      {:else}
                        <ChevronDown class="w-3 h-3 text-neutral-400" />
                      {/if}
                    </button>

                    {#if onOpenSubmoduleRepo}
                      <button
                        onclick={() => handleOpenSubmodule(sub)}
                        class="px-2.5 py-1 text-xs rounded-md bg-white dark:bg-neutral-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 font-medium transition-colors flex items-center gap-1 border border-neutral-300 dark:border-neutral-700 cursor-pointer shadow-xs"
                        title="Mở submodule này thành Workspace độc lập trong FlowGit"
                      >
                        <ExternalLink class="w-3 h-3 text-cyan-500" />
                        <span>{localeState.t('submodules.openRepo')}</span>
                      </button>
                    {/if}

                    <button
                      onclick={() => handleUpdateSingle(sub.name)}
                      disabled={actionLoading !== null}
                      class="px-2.5 py-1 text-xs rounded-md bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium transition-colors disabled:opacity-50 flex items-center gap-1 border border-neutral-300 dark:border-transparent cursor-pointer shadow-xs"
                    >
                      {#if actionLoading === sub.name}
                        <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      {/if}
                      {localeState.t('submodules.update')}
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-neutral-900/80 p-2.5 rounded-md border border-neutral-200 dark:border-neutral-800/50 font-mono text-neutral-600 dark:text-neutral-400">
                  <div>
                    <span class="text-neutral-500 block text-[10px] font-sans">{localeState.t('submodules.remoteUrl')}</span>
                    <span class="truncate block text-neutral-900 dark:text-neutral-300 select-text" title={sub.url}>{sub.url || '(none)'}</span>
                  </div>
                  <div>
                    <span class="text-neutral-500 block text-[10px] font-sans">{localeState.t('submodules.registeredCommit')}</span>
                    <span class="text-indigo-600 dark:text-indigo-300 select-text font-semibold">{sub.index_oid?.slice(0, 8) || '(none)'}</span>
                    {#if sub.head_oid && sub.head_oid !== sub.index_oid}
                      <span class="text-amber-600 dark:text-amber-400 text-[10px] block font-sans font-medium">{localeState.t('submodules.diverged', { head: sub.head_oid.slice(0, 8) })}</span>
                    {/if}
                  </div>
                </div>

                <!-- Collapsible Submodule Diff Container -->
                {#if expandedDiffSub === sub.name}
                  <div class="mt-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-950 p-3 overflow-hidden animate-in fade-in duration-150">
                    <div class="flex items-center justify-between text-xs font-mono pb-2 border-b border-neutral-800 text-neutral-400">
                      <span class="font-bold text-cyan-400 flex items-center gap-1">
                        <FileText class="w-3.5 h-3.5" />
                        {localeState.t('submodules.diffTitle')}
                      </span>
                      {#if subDiffData?.modified_files.length}
                        <span class="text-[10px] text-neutral-400">{localeState.t('submodules.filesModified', { count: subDiffData.modified_files.length })}</span>
                      {/if}
                    </div>

                    {#if isLoadingDiff}
                      <div class="py-6 flex items-center justify-center gap-2 text-neutral-500 text-xs font-mono">
                        <Loader2 class="w-4 h-4 animate-spin text-cyan-500" />
                        <span>{localeState.t('submodules.loadingDiff')}</span>
                      </div>
                    {:else if subDiffData}
                      {#if subDiffData.modified_files.length > 0}
                        <div class="py-1.5 flex flex-wrap gap-1 border-b border-neutral-800/60 mb-2">
                          {#each subDiffData.modified_files as file}
                            <span class="px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800 text-[10px] font-mono">
                              {file}
                            </span>
                          {/each}
                        </div>
                      {/if}
                      <pre class="max-h-60 overflow-auto font-mono text-[11px] leading-relaxed select-text text-neutral-300 whitespace-pre-wrap">{#each subDiffData.diff.split('\n') as line}{#if line.startsWith('+')}<span class="text-emerald-400 bg-emerald-500/10 block">{line}</span>{:else if line.startsWith('-')}<span class="text-rose-400 bg-rose-500/10 block">{line}</span>{:else if line.startsWith('@@')}<span class="text-cyan-400 font-semibold block">{line}</span>{:else}<span class="text-neutral-400 block">{line}</span>{/if}{/each}</pre>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
