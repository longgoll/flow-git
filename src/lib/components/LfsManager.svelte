<script lang="ts">
  import { getLfsInfo, pullLfsFiles, lockLfsFile, unlockLfsFile } from '../api';
  import { localeState } from '../state/localeState.svelte';
  import type { LfsSummary } from '../types';

  let {
    repoPath = '',
    isOpen = false,
    onClose = () => {},
  }: {
    repoPath: string;
    isOpen: boolean;
    onClose: () => void;
  } = $props();

  let lfsData = $state<LfsSummary>({
    is_lfs_enabled: false,
    tracked_patterns: [],
    files: [],
    locks: [],
  });
  let isLoading = $state(false);
  let actionLoading = $state<string | null>(null);
  let statusMessage = $state<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);
  let newLockPath = $state('');

  $effect(() => {
    if (isOpen && repoPath) {
      loadLfs();
    }
  });

  async function loadLfs() {
    isLoading = true;
    statusMessage = null;
    try {
      lfsData = await getLfsInfo(repoPath);
    } catch (e: any) {
      statusMessage = { text: e?.toString() || localeState.t('lfs.queryError'), type: 'error' };
    } finally {
      isLoading = false;
    }
  }

  async function handlePullAll() {
    actionLoading = 'pull_all';
    statusMessage = null;
    try {
      const res = await pullLfsFiles(repoPath);
      statusMessage = { text: res, type: 'success' };
      await loadLfs();
    } catch (e: any) {
      statusMessage = { text: e?.toString() || localeState.t('lfs.pullError'), type: 'error' };
    } finally {
      actionLoading = null;
    }
  }

  async function handleLock(filePath: string) {
    if (!filePath.trim()) return;
    actionLoading = `lock_${filePath}`;
    statusMessage = null;
    try {
      const res = await lockLfsFile(repoPath, filePath.trim());
      statusMessage = { text: res, type: 'success' };
      newLockPath = '';
      await loadLfs();
    } catch (e: any) {
      statusMessage = { text: e?.toString() || localeState.t('lfs.lockError', { path: filePath }), type: 'error' };
    } finally {
      actionLoading = null;
    }
  }

  async function handleUnlock(filePath: string, force = false) {
    actionLoading = `unlock_${filePath}`;
    statusMessage = null;
    try {
      const res = await unlockLfsFile(repoPath, filePath, force);
      statusMessage = { text: res, type: 'success' };
      await loadLfs();
    } catch (e: any) {
      statusMessage = { text: e?.toString() || localeState.t('lfs.unlockError', { path: filePath }), type: 'error' };
    } finally {
      actionLoading = null;
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/80 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100 font-sans">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/40">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold text-xs">
            LFS
          </div>
          <div>
            <h2 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              {localeState.t('lfs.title')}
              {#if lfsData.is_lfs_enabled}
                <span class="text-xs px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800/50 text-sky-800 dark:text-sky-300 font-normal">
                  {localeState.t('lfs.activeCount', { count: lfsData.files.length })}
                </span>
              {:else}
                <span class="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-normal border border-neutral-200 dark:border-transparent">
                  {localeState.t('lfs.inactive')}
                </span>
              {/if}
            </h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">{localeState.t('lfs.description')}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          {#if lfsData.is_lfs_enabled}
            <button
              onclick={() => handlePullAll()}
              disabled={actionLoading !== null || isLoading}
              class="px-3 py-1 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {#if actionLoading === 'pull_all'}
                <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              {/if}
              {localeState.t('lfs.pullAll')}
            </button>
          {/if}
          <button
            onclick={onClose}
            aria-label={localeState.t('lfs.closeModal')}
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
      <div class="p-5 overflow-y-auto flex-1 space-y-4">
        {#if isLoading}
          <div class="py-12 flex flex-col items-center justify-center gap-3 text-neutral-500 text-xs">
            <span class="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin"></span>
            {localeState.t('lfs.scanning')}
          </div>
        {:else if !lfsData.is_lfs_enabled}
          <div class="py-12 text-center text-neutral-500">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800/50 flex items-center justify-center text-neutral-400 dark:text-neutral-500 font-bold text-sm">
              LFS
            </div>
            <p class="text-sm font-medium text-neutral-800 dark:text-neutral-300">{localeState.t('lfs.notConfiguredTitle')}</p>
            <p class="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              {localeState.t('lfs.notConfiguredDesc')}
            </p>
          </div>
        {:else}
          <!-- Tracked patterns -->
          {#if lfsData.tracked_patterns.length > 0}
            <div class="p-3 bg-neutral-50 dark:bg-neutral-950/40 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <span class="text-xs font-semibold text-neutral-800 dark:text-neutral-300 block mb-1.5">{localeState.t('lfs.trackedPatterns')}</span>
              <div class="flex flex-wrap gap-1.5">
                {#each lfsData.tracked_patterns as pat}
                  <span class="px-2 py-0.5 text-xs font-mono rounded-md bg-neutral-100 dark:bg-neutral-800/80 text-sky-700 dark:text-sky-300 border border-neutral-200 dark:border-neutral-700/60">
                    {pat}
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Lock Manager Section -->
          <div class="p-3.5 bg-neutral-50 dark:bg-neutral-950/40 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-neutral-800 dark:text-neutral-300 flex items-center gap-1.5">
                {localeState.t('lfs.locksTitle', { count: lfsData.locks.length })}
              </span>
            </div>
            
            <div class="flex gap-2">
              <input
                type="text"
                bind:value={newLockPath}
                placeholder={localeState.t('lfs.lockPlaceholder')}
                class="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-sky-500 select-text"
              />
              <button
                onclick={() => handleLock(newLockPath)}
                disabled={!newLockPath.trim() || actionLoading !== null}
                class="px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg transition-colors disabled:opacity-50 border border-neutral-200 dark:border-transparent cursor-pointer"
              >
                {localeState.t('lfs.lockBtn')}
              </button>
            </div>

            {#if lfsData.locks.length > 0}
              <div class="divide-y divide-neutral-200 dark:divide-neutral-800/60 border border-neutral-200 dark:border-neutral-800/60 rounded-lg overflow-hidden">
                {#each lfsData.locks as lock}
                  <div class="px-3 py-2 text-xs flex items-center justify-between bg-white dark:bg-neutral-900/50">
                    <div>
                      <span class="font-mono text-neutral-900 dark:text-neutral-200">{lock.path}</span>
                      <span class="text-neutral-500 text-[10px] ml-2 font-sans">{localeState.t('lfs.lockedBy', { owner: lock.owner, id: lock.id })}</span>
                    </div>
                    <button
                      onclick={() => handleUnlock(lock.path)}
                      disabled={actionLoading !== null}
                      class="px-2 py-0.5 text-[10px] rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/50 transition-colors cursor-pointer"
                    >
                      {localeState.t('lfs.unlockBtn')}
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- LFS Files List -->
          <div>
            <span class="text-xs font-semibold text-neutral-800 dark:text-neutral-300 block mb-2">{localeState.t('lfs.filesInRepo')}</span>
            {#if lfsData.files.length === 0}
              <p class="text-xs text-neutral-500 italic">{localeState.t('lfs.noFilesCommitted')}</p>
            {:else}
              <div class="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-800/50">
                {#each lfsData.files as file}
                  <div class="px-3.5 py-2 text-xs flex items-center justify-between bg-white dark:bg-neutral-950/20 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
                    <div class="flex items-center gap-2 truncate pr-2">
                      {#if file.is_pointer}
                        <span class="px-1.5 py-0.5 text-[10px] rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 font-semibold" title={localeState.t('lfs.pointerTooltip')}>
                          {localeState.t('lfs.pointerBadge')}
                        </span>
                      {:else}
                        <span class="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 font-semibold" title={localeState.t('lfs.downloadedTooltip')}>
                          {localeState.t('lfs.downloadedBadge')}
                        </span>
                      {/if}
                      <span class="font-mono text-neutral-900 dark:text-neutral-200 truncate select-text">{file.path}</span>
                    </div>
                    <div class="flex items-center gap-3 shrink-0 text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                      <span>{formatBytes(file.size_bytes)}</span>
                      <span class="text-neutral-400 dark:text-neutral-500 text-[10px]">{file.oid_sha256.slice(0, 8)}</span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
