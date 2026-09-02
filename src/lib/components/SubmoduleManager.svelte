<script lang="ts">
  import { getSubmodules, updateSubmodules, syncSubmodules } from '../api';
  import type { SubmoduleInfo } from '../types';

  let {
    repoPath = '',
    isOpen = false,
    onClose = () => {},
  }: {
    repoPath: string;
    isOpen: boolean;
    onClose: () => void;
  } = $props();

  let submodules = $state<SubmoduleInfo[]>([]);
  let isLoading = $state(false);
  let actionLoading = $state<string | null>(null);
  let statusMessage = $state<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

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
      statusMessage = { text: e?.toString() || 'Failed to load submodules', type: 'error' };
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
      statusMessage = { text: e?.toString() || 'Failed to update submodules', type: 'error' };
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
      statusMessage = { text: e?.toString() || `Failed to update ${name}`, type: 'error' };
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
      statusMessage = { text: e?.toString() || 'Failed to sync submodules', type: 'error' };
    } finally {
      actionLoading = null;
    }
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
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
    <div class="bg-neutral-900 border border-neutral-700/80 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="8" height="8" x="3" y="3" rx="2"></rect>
              <path d="M7 11v4a2 2 0 0 0 2 2h4"></path>
              <rect width="8" height="8" x="13" y="13" rx="2"></rect>
            </svg>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              Git Submodules Explorer
              <span class="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-normal">
                {submodules.length} {submodules.length === 1 ? 'module' : 'modules'}
              </span>
            </h2>
            <p class="text-xs text-neutral-400">Quản lý và đồng bộ các repository con lồng nhau</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            onclick={() => handleSyncAll()}
            disabled={actionLoading !== null || isLoading}
            class="px-2.5 py-1 text-xs font-medium rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition-colors disabled:opacity-50"
            title="Đồng bộ URL trong .gitmodules vào config"
          >
            Sync Config
          </button>
          <button
            onclick={() => handleUpdateAll(true)}
            disabled={actionLoading !== null || isLoading}
            class="px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            {#if actionLoading === 'all'}
              <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {/if}
            Update All (--init --recursive)
          </button>
          <button
            onclick={onClose}
            aria-label="Đóng modal"
            class="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Status banner -->
      {#if statusMessage}
        <div class="px-5 py-2 text-xs border-b {statusMessage.type === 'error' ? 'bg-red-950/40 border-red-800/40 text-red-300' : 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'} flex items-center justify-between">
          <span>{statusMessage.text}</span>
          <button onclick={() => (statusMessage = null)} class="text-neutral-400 hover:text-neutral-200">✕</button>
        </div>
      {/if}

      <!-- Body -->
      <div class="p-5 overflow-y-auto flex-1 space-y-3">
        {#if isLoading}
          <div class="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400 text-xs">
            <span class="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></span>
            Đang quét danh sách submodules...
          </div>
        {:else if submodules.length === 0}
          <div class="py-12 text-center text-neutral-400">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-800/50 flex items-center justify-center text-neutral-500">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect width="8" height="8" x="3" y="3" rx="2"></rect>
                <path d="M7 11v4a2 2 0 0 0 2 2h4"></path>
                <rect width="8" height="8" x="13" y="13" rx="2"></rect>
              </svg>
            </div>
            <p class="text-sm font-medium text-neutral-300">Không có Git Submodules</p>
            <p class="text-xs text-neutral-500 mt-1">Repository này hiện không chứa file .gitmodules nào.</p>
          </div>
        {:else}
          <div class="space-y-2.5">
            {#each submodules as sub}
              <div class="p-3.5 rounded-lg border border-neutral-800 bg-neutral-950/40 hover:border-neutral-700/80 transition-all flex flex-col gap-2.5">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm text-neutral-200">{sub.name}</span>
                      {#if sub.status === 'clean'}
                        <span class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">Clean</span>
                      {:else if sub.status === 'modified'}
                        <span class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-amber-950/60 text-amber-400 border border-amber-800/50">Modified</span>
                      {:else if sub.status === 'uninitialized'}
                        <span class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-red-950/60 text-red-400 border border-red-800/50">Uninitialized</span>
                      {:else if sub.status === 'out_of_sync'}
                        <span class="px-2 py-0.5 text-[10px] font-medium rounded-md bg-purple-950/60 text-purple-400 border border-purple-800/50">Out of Sync</span>
                      {/if}
                    </div>
                    <div class="text-xs text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                      <span>📁 {sub.path}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <button
                      onclick={() => handleUpdateSingle(sub.name)}
                      disabled={actionLoading !== null}
                      class="px-2.5 py-1 text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {#if actionLoading === sub.name}
                        <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      {/if}
                      Update
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2 text-xs bg-neutral-900/80 p-2.5 rounded-md border border-neutral-800/50 font-mono text-neutral-400">
                  <div>
                    <span class="text-neutral-500 block text-[10px] font-sans">Remote URL</span>
                    <span class="truncate block text-neutral-300" title={sub.url}>{sub.url || '(none)'}</span>
                  </div>
                  <div>
                    <span class="text-neutral-500 block text-[10px] font-sans">Registered Commit (Index)</span>
                    <span class="text-indigo-300">{sub.index_oid?.slice(0, 8) || '(none)'}</span>
                    {#if sub.head_oid && sub.head_oid !== sub.index_oid}
                      <span class="text-amber-400 text-[10px] block font-sans">HEAD: {sub.head_oid.slice(0, 8)} (diverged)</span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
