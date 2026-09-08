<script lang="ts">
  import {
    getSparseCheckoutInfo,
    setSparseCheckout,
    disableSparseCheckout,
    reapplySparseCheckout,
  } from '../api';
  import { localeState } from '../state/localeState.svelte';
  import { toast } from '../state/toastState.svelte';
  import type { SparseCheckoutInfo } from '../types';
  import {
    FolderTree,
    Folder,
    Check,
    X,
    Plus,
    RefreshCw,
    Search,
    Layers,
    Info,
    CheckCircle2,
  } from 'lucide-svelte';

  interface Props {
    repoPath: string;
    isOpen: boolean;
    onClose: () => void;
  }

  let { repoPath = '', isOpen = false, onClose = () => {} }: Props = $props();

  let info = $state<SparseCheckoutInfo>({
    is_enabled: false,
    is_cone: true,
    patterns: [],
    available_directories: [],
  });

  let selectedDirs = $state<string[]>([]);
  let customInput = $state('');
  let searchQuery = $state('');
  let coneMode = $state(true);
  let isLoading = $state(false);
  let isApplying = $state(false);

  $effect(() => {
    if (isOpen && repoPath) {
      loadInfo();
    }
  });

  async function loadInfo() {
    isLoading = true;
    try {
      info = await getSparseCheckoutInfo(repoPath);
      coneMode = info.is_cone;
      selectedDirs = [...info.patterns];
    } catch (e: any) {
      toast.error(localeState.t('sparse.errorLoading'), e?.toString() || '');
    } finally {
      isLoading = false;
    }
  }

  function toggleDir(dir: string) {
    if (selectedDirs.includes(dir)) {
      selectedDirs = selectedDirs.filter((d) => d !== dir);
    } else {
      selectedDirs = [...selectedDirs, dir];
    }
  }

  function addCustomPattern() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!selectedDirs.includes(trimmed)) {
      selectedDirs = [...selectedDirs, trimmed];
    }
    customInput = '';
  }

  function removePattern(pat: string) {
    selectedDirs = selectedDirs.filter((d) => d !== pat);
  }

  async function handleApply() {
    if (selectedDirs.length === 0) {
      toast.warning(localeState.t('sparse.title'), localeState.t('sparse.emptySelectionWarning'));
      return;
    }
    isApplying = true;
    try {
      await setSparseCheckout(repoPath, selectedDirs, coneMode);
      toast.success(localeState.t('sparse.title'), localeState.t('sparse.applySuccess'));
      await loadInfo();
    } catch (e: any) {
      toast.error(localeState.t('sparse.title'), e?.toString() || '');
    } finally {
      isApplying = false;
    }
  }

  async function handleDisable() {
    isApplying = true;
    try {
      await disableSparseCheckout(repoPath);
      toast.success(localeState.t('sparse.title'), localeState.t('sparse.disableSuccess'));
      await loadInfo();
    } catch (e: any) {
      toast.error(localeState.t('sparse.title'), e?.toString() || '');
    } finally {
      isApplying = false;
    }
  }

  async function handleReapply() {
    isApplying = true;
    try {
      await reapplySparseCheckout(repoPath);
      toast.success(localeState.t('sparse.title'), localeState.t('sparse.reapplySuccess'));
    } catch (e: any) {
      toast.error(localeState.t('sparse.title'), e?.toString() || '');
    } finally {
      isApplying = false;
    }
  }

  let filteredDirs = $derived.by(() => {
    if (!searchQuery.trim()) return info.available_directories;
    const q = searchQuery.toLowerCase();
    return info.available_directories.filter((d) => d.toLowerCase().includes(q));
  });
</script>

{#if isOpen}
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none"
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
    <div
      class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100 font-sans"
    >
      <!-- Header -->
      <div
        class="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/40"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400"
          >
            <FolderTree class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {localeState.t('sparse.title')}
              </h2>
              {#if info.is_enabled}
                <span
                  class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-medium"
                >
                  {localeState.t('sparse.statusActive', { count: info.patterns.length })}
                </span>
              {:else}
                <span
                  class="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                >
                  {localeState.t('sparse.statusInactive')}
                </span>
              {/if}
            </div>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {localeState.t('sparse.description')}
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          aria-label={localeState.t('sparse.closeModal')}
          class="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
        {#if isLoading}
          <div class="py-12 flex flex-col items-center justify-center gap-2.5 text-zinc-500">
            <RefreshCw class="w-6 h-6 animate-spin text-purple-500" />
            <span>Loading sparse checkout state...</span>
          </div>
        {:else}
          <!-- Options Bar: Cone Mode Toggle -->
          <div
            class="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800"
          >
            <div class="flex items-center gap-2">
              <Layers class="w-4 h-4 text-purple-500" />
              <div>
                <span class="font-semibold text-zinc-800 dark:text-zinc-200">
                  {localeState.t('sparse.coneModeToggle')}
                </span>
                <span class="block text-[11px] text-zinc-500">
                  {coneMode ? localeState.t('sparse.coneModeBadge') : localeState.t('sparse.patternModeBadge')}
                </span>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                bind:checked={coneMode}
                class="sr-only peer"
              />
              <div
                class="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-purple-600"
              ></div>
            </label>
          </div>

          <!-- Selected Patterns / Directories Chips -->
          {#if selectedDirs.length > 0}
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="font-semibold text-zinc-700 dark:text-zinc-300">
                  {localeState.t('sparse.selectedCount', { count: selectedDirs.length })}
                </span>
                <button
                  onclick={() => (selectedDirs = [])}
                  class="text-[11px] text-zinc-400 hover:text-rose-500 cursor-pointer"
                >
                  Clear all
                </button>
              </div>
              <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg bg-zinc-100/70 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800">
                {#each selectedDirs as pat}
                  <span
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 font-mono text-[11px]"
                  >
                    <Folder class="w-3 h-3 shrink-0" />
                    <span>{pat}</span>
                    <button
                      onclick={() => removePattern(pat)}
                      class="hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer p-0.5"
                    >
                      <X class="w-3 h-3" />
                    </button>
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Monorepo Directory Checklist -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <FolderTree class="w-3.5 h-3.5 text-purple-500" />
                {localeState.t('sparse.scanDirectories')}
              </span>
              <div class="relative w-48">
                <Search class="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-400" />
                <input
                  type="text"
                  bind:value={searchQuery}
                  placeholder={localeState.t('sparse.searchPlaceholder')}
                  class="w-full pl-8 pr-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 focus:outline-hidden focus:border-purple-500"
                />
              </div>
            </div>

            <div
              class="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800/60 max-h-56 overflow-y-auto bg-white dark:bg-zinc-900"
            >
              {#if filteredDirs.length === 0}
                <div class="p-4 text-center text-zinc-400 italic">
                  {localeState.t('sparse.noDirsFound')}
                </div>
              {:else}
                {#each filteredDirs as dir}
                  {@const isSelected = selectedDirs.includes(dir)}
                  <button
                    type="button"
                    onclick={() => toggleDir(dir)}
                    class="w-full px-3.5 py-2 flex items-center justify-between hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-left transition-colors cursor-pointer group"
                  >
                    <div class="flex items-center gap-2.5 truncate font-mono text-[11px]">
                      <div
                        class="w-4 h-4 rounded border flex items-center justify-center transition-colors {isSelected
                          ? 'bg-purple-600 border-purple-600 text-white'
                          : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'}"
                      >
                        {#if isSelected}
                          <Check class="w-3 h-3" />
                        {/if}
                      </div>
                      <Folder class="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span class="truncate text-zinc-800 dark:text-zinc-200">{dir}</span>
                    </div>
                  </button>
                {/each}
              {/if}
            </div>
          </div>

          <!-- Custom Path Input -->
          <div>
            <span class="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
              {localeState.t('sparse.customPatternsTitle')}
            </span>
            <div class="flex gap-2">
              <input
                type="text"
                bind:value={customInput}
                onkeydown={(e) => {
                  if (e.key === 'Enter') addCustomPattern();
                }}
                placeholder={localeState.t('sparse.customPlaceholder')}
                class="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 focus:outline-hidden focus:border-purple-500 font-mono"
              />
              <button
                onclick={addCustomPattern}
                disabled={!customInput.trim()}
                class="px-3 py-1.5 font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 disabled:opacity-50 flex items-center gap-1 cursor-pointer transition-colors border border-zinc-200 dark:border-zinc-700/60"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>{localeState.t('sparse.addPatternBtn')}</span>
              </button>
            </div>
          </div>

          <!-- Info Box -->
          <div
            class="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 flex items-start gap-2.5 text-purple-900 dark:text-purple-300"
          >
            <Info class="w-4 h-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
            <div class="text-[11px] leading-relaxed">
              <p class="font-semibold">{localeState.t('sparse.tipTitle')}</p>
              <p class="text-purple-800/80 dark:text-purple-300/80 mt-0.5">
                {localeState.t('sparse.tipDesc')}
              </p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Actions -->
      <div
        class="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/40"
      >
        <div>
          {#if info.is_enabled}
            <button
              onclick={handleDisable}
              disabled={isApplying || isLoading}
              class="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 font-medium transition-colors cursor-pointer text-xs disabled:opacity-50"
            >
              {localeState.t('sparse.disableBtn')}
            </button>
          {/if}
        </div>

        <div class="flex items-center gap-2">
          {#if info.is_enabled}
            <button
              onclick={handleReapply}
              disabled={isApplying || isLoading}
              class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw class="w-3.5 h-3.5 {isApplying ? 'animate-spin' : ''}" />
              <span>{localeState.t('sparse.reapplyBtn')}</span>
            </button>
          {/if}

          <button
            onclick={handleApply}
            disabled={isApplying || isLoading || selectedDirs.length === 0}
            class="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors cursor-pointer text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {#if isApplying}
              <RefreshCw class="w-3.5 h-3.5 animate-spin" />
            {:else}
              <CheckCircle2 class="w-3.5 h-3.5" />
            {/if}
            <span>{localeState.t('sparse.applyBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
