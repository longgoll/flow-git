<script lang="ts">
  import type { RemoteInfo } from '../types';
  import {
    getRemotes,
    addRemote,
    removeRemote,
    setRemoteUrl,
    fetchRemote,
  } from '../api/remote';
  import {
    Globe,
    Plus,
    Trash2,
    Edit2,
    RefreshCw,
    X,
    AlertTriangle,
  } from 'lucide-svelte';
  import { toast } from '../state/toastState.svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    isOpen: boolean;
    repoPath: string;
    onClose: () => void;
    onRemotesChanged?: () => void;
  }

  let { isOpen = false, repoPath = '', onClose, onRemotesChanged }: Props = $props();

  let remotes = $state<RemoteInfo[]>([]);
  let isLoading = $state<boolean>(false);
  let isFetchingName = $state<string | null>(null);

  // Add remote form
  let showAddForm = $state<boolean>(false);
  let newRemoteName = $state<string>('');
  let newRemoteUrl = $state<string>('');
  let isAdding = $state<boolean>(false);

  // Edit remote state
  let editingRemoteName = $state<string | null>(null);
  let editUrl = $state<string>('');
  let isSavingEdit = $state<boolean>(false);

  // Delete remote confirmation
  let deletingRemoteName = $state<string | null>(null);

  $effect(() => {
    if (isOpen && repoPath) {
      loadRemotes();
    }
  });

  async function loadRemotes() {
    if (!repoPath) return;
    isLoading = true;
    try {
      remotes = await getRemotes(repoPath);
    } catch (err: any) {
      console.error('Failed to load remotes:', err);
      toast.error(localeState.t('modals.remoteManager.loadError'), err?.message || err);
    } finally {
      isLoading = false;
    }
  }

  async function handleAddRemote() {
    const name = newRemoteName.trim();
    const url = newRemoteUrl.trim();
    if (!name || !url) {
      toast.warning(localeState.t('modals.remoteManager.missingFieldsWarning'));
      return;
    }

    isAdding = true;
    try {
      await addRemote(repoPath, name, url);
      toast.success(
        localeState.t('modals.remoteManager.addSuccessTitle'),
        localeState.t('modals.remoteManager.addSuccessMsg', { name })
      );
      newRemoteName = '';
      newRemoteUrl = '';
      showAddForm = false;
      await loadRemotes();
      onRemotesChanged?.();
    } catch (err: any) {
      toast.error(localeState.t('modals.remoteManager.addError'), err?.message || err);
    } finally {
      isAdding = false;
    }
  }

  function startEdit(remote: RemoteInfo) {
    editingRemoteName = remote.name;
    editUrl = remote.fetch_url || '';
  }

  async function handleSaveEdit(name: string) {
    const url = editUrl.trim();
    if (!url) {
      toast.warning(localeState.t('modals.remoteManager.emptyUrlWarning'));
      return;
    }

    isSavingEdit = true;
    try {
      await setRemoteUrl(repoPath, name, url);
      toast.success(
        localeState.t('modals.remoteManager.updateSuccessTitle'),
        localeState.t('modals.remoteManager.updateSuccessMsg', { name })
      );
      editingRemoteName = null;
      await loadRemotes();
      onRemotesChanged?.();
    } catch (err: any) {
      toast.error(localeState.t('modals.remoteManager.updateError'), err?.message || err);
    } finally {
      isSavingEdit = false;
    }
  }

  async function handleConfirmDelete(name: string) {
    try {
      await removeRemote(repoPath, name);
      toast.info(localeState.t('modals.remoteManager.deleteSuccessMsg', { name }));
      deletingRemoteName = null;
      await loadRemotes();
      onRemotesChanged?.();
    } catch (err: any) {
      toast.error(localeState.t('modals.remoteManager.deleteError'), err?.message || err);
    }
  }

  async function handleFetch(name: string) {
    isFetchingName = name;
    try {
      const msg = await fetchRemote(repoPath, name);
      toast.success(localeState.t('modals.remoteManager.fetchSuccessTitle', { name }), msg);
      onRemotesChanged?.();
    } catch (err: any) {
      toast.error(localeState.t('modals.remoteManager.fetchErrorTitle', { name }), err?.message || err);
    } finally {
      isFetchingName = null;
    }
  }
</script>

{#if isOpen}
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
      class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-inner">
            <Globe class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {localeState.t('modals.remoteManager.title')}
            </h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {localeState.t('modals.remoteManager.subtitle')}
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

      <!-- Body -->
      <div class="p-6 max-h-[480px] overflow-y-auto space-y-4">
        <!-- Remotes List -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              {localeState.t('modals.remoteManager.remotesList', { count: remotes.length })}
            </span>
            {#if !showAddForm}
              <button
                onclick={() => (showAddForm = true)}
                class="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/80 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus class="w-3 h-3" />
                <span>{localeState.t('modals.remoteManager.addNew')}</span>
              </button>
            {/if}
          </div>

          <!-- Add Form Card -->
          {#if showAddForm}
            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-cyan-300 dark:border-cyan-500/40 space-y-3 animate-in fade-in duration-150">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-cyan-700 dark:text-cyan-300">{localeState.t('modals.remoteManager.addNew')}</span>
                <button
                  onclick={() => (showAddForm = false)}
                  class="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label for="remote-name-input" class="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">{localeState.t('modals.remoteManager.remoteName')}</label>
                  <input
                    id="remote-name-input"
                    type="text"
                    bind:value={newRemoteName}
                    placeholder={localeState.t('modals.remoteManager.namePlaceholder')}
                    class="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-200 focus:outline-hidden focus:border-cyan-500 select-text"
                  />
                </div>
                <div class="col-span-2">
                  <label for="remote-url-input" class="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">{localeState.t('modals.remoteManager.remoteUrl')}</label>
                  <input
                    id="remote-url-input"
                    type="text"
                    bind:value={newRemoteUrl}
                    placeholder={localeState.t('modals.remoteManager.urlPlaceholder')}
                    class="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-200 focus:outline-hidden focus:border-cyan-500 select-text"
                  />
                </div>
              </div>

              <div class="flex items-center justify-end gap-2 pt-1">
                <button
                  onclick={() => (showAddForm = false)}
                  class="px-3 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {localeState.t('common.cancel')}
                </button>
                <button
                  onclick={handleAddRemote}
                  disabled={isAdding}
                  class="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isAdding ? localeState.t('modals.remoteManager.saving') : localeState.t('modals.remoteManager.saveRemote')}
                </button>
              </div>
            </div>
          {/if}

          {#if isLoading}
            <div class="py-8 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <RefreshCw class="w-5 h-5 animate-spin text-cyan-600 dark:text-cyan-400" />
              <span class="text-xs">{localeState.t('modals.remoteManager.loadingRemotes')}</span>
            </div>
          {:else if remotes.length === 0}
            <div class="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 text-center text-zinc-500 text-xs">
              {localeState.t('modals.remoteManager.noRemotes')}
            </div>
          {:else}
            {#each remotes as remote (remote.name)}
              <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-cyan-800 dark:text-cyan-300 px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/50">
                      {remote.name}
                    </span>
                    {#if remote.name === 'origin'}
                      <span class="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">{localeState.t('modals.remoteManager.defaultBadge')}</span>
                    {/if}
                  </div>

                  <div class="flex items-center gap-1.5">
                    <!-- Fetch Button -->
                    <button
                      onclick={() => handleFetch(remote.name)}
                      disabled={isFetchingName === remote.name}
                      class="px-2 py-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700/70 text-zinc-700 dark:text-zinc-300 text-[11px] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
                      title={localeState.t('modals.remoteManager.fetchTooltip')}
                    >
                      <RefreshCw class="w-3 h-3 text-cyan-600 dark:text-cyan-400 {isFetchingName === remote.name ? 'animate-spin' : ''}" />
                      <span>{localeState.t('modals.remoteManager.fetch')}</span>
                    </button>

                    <!-- Edit URL Button -->
                    <button
                      onclick={() => startEdit(remote)}
                      class="p-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700/70 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer transition-colors shadow-xs"
                      title={localeState.t('modals.remoteManager.editTooltip')}
                    >
                      <Edit2 class="w-3 h-3" />
                    </button>

                    <!-- Delete Button -->
                    {#if remote.name !== 'origin' || remotes.length > 1}
                      <button
                        onclick={() => (deletingRemoteName = remote.name)}
                        class="p-1 rounded bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-zinc-300 dark:border-zinc-700/70 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 cursor-pointer transition-colors shadow-xs"
                        title={localeState.t('modals.remoteManager.deleteTooltip')}
                      >
                        <Trash2 class="w-3 h-3" />
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- URL or Edit Form -->
                {#if editingRemoteName === remote.name}
                  <div class="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      bind:value={editUrl}
                      class="flex-1 px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-900 border border-cyan-500 rounded text-zinc-900 dark:text-zinc-100 outline-hidden select-text"
                    />
                    <button
                      onclick={() => handleSaveEdit(remote.name)}
                      disabled={isSavingEdit}
                      class="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs cursor-pointer shadow-xs"
                    >
                      {localeState.t('modals.remoteManager.saveEdit')}
                    </button>
                    <button
                      onclick={() => (editingRemoteName = null)}
                      class="px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      {localeState.t('modals.remoteManager.cancelEdit')}
                    </button>
                  </div>
                {:else}
                  <div class="space-y-0.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 break-all select-text">
                    {#if remote.fetch_url}
                      <div class="flex items-center gap-1 text-zinc-800 dark:text-zinc-300">
                        <span class="text-zinc-400 dark:text-zinc-600 text-[10px]">Fetch:</span>
                        <span>{remote.fetch_url}</span>
                      </div>
                    {/if}
                    {#if remote.push_url && remote.push_url !== remote.fetch_url}
                      <div class="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                        <span class="text-zinc-400 dark:text-zinc-600 text-[10px]">Push:</span>
                        <span>{remote.push_url}</span>
                      </div>
                    {/if}
                  </div>
                {/if}

                <!-- Delete Confirmation Confirmation -->
                {#if deletingRemoteName === remote.name}
                  <div class="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between text-xs animate-in fade-in duration-150">
                    <div class="flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                      <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
                      <span>{localeState.t('modals.remoteManager.confirmDeleteDesc', { name: remote.name })}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        onclick={() => (deletingRemoteName = null)}
                        class="px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 text-[11px] cursor-pointer"
                      >
                        {localeState.t('common.cancel')}
                      </button>
                      <button
                        onclick={() => handleConfirmDelete(remote.name)}
                        class="px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-medium cursor-pointer shadow-xs"
                      >
                        {localeState.t('modals.remoteManager.remove')}
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
        <span class="text-[11px] text-zinc-500 font-mono">
          {localeState.t('modals.remoteManager.tip')}
        </span>
        <button
          onclick={onClose}
          class="px-4 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer transition-colors border border-zinc-200 dark:border-transparent"
        >
          {localeState.t('common.close')}
        </button>
      </div>
    </div>
  </div>
{/if}
