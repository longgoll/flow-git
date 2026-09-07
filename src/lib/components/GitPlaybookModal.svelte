<script lang="ts">
  import {
    BookOpen,
    X,
    Lock,
    Unlock,
    AlertTriangle,
    ShieldCheck,
    GitBranch,
    History,
    CheckCircle2,
    RefreshCw,
    HardDrive,
    Trash2,
    ArrowRight,
    LifeBuoy,
  } from 'lucide-svelte';
  import {
    isIndexLocked,
    clearIndexLock,
    scanHeavyFiles,
  } from '../api/edgeCases';
  import type { HeavyFileInfo } from '../types';
  import { toast } from '../state/toastState.svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    isOpen: boolean;
    repoPath: string;
    currentBranch: string;
    onClose: () => void;
    onOpenTrash: () => void;
    onOpenTimeMachine: () => void;
    onOpenLostAndFound?: () => void;
    onRepoRefreshed?: () => Promise<void>;
  }

  let {
    isOpen = false,
    repoPath = '',
    currentBranch = '',
    onClose,
    onOpenTrash,
    onOpenTimeMachine,
    onOpenLostAndFound,
    onRepoRefreshed,
  }: Props = $props();

  let activeTab = $state<'indexLock' | 'wrongBranch' | 'heavyFiles' | 'fileLocks' | 'untrackedShelve'>('indexLock');

  // Edge cases state
  let hasIndexLock = $state<boolean>(false);
  let isCheckingIndexLock = $state<boolean>(false);
  let isClearingLock = $state<boolean>(false);

  // Heavy files state
  let heavyFiles = $state<HeavyFileInfo[]>([]);
  let isScanningHeavy = $state<boolean>(false);

  $effect(() => {
    if (isOpen && repoPath) {
      checkStatus();
    }
  });

  async function checkStatus() {
    if (!repoPath) return;
    isCheckingIndexLock = true;
    try {
      hasIndexLock = await isIndexLocked(repoPath);
      heavyFiles = await scanHeavyFiles(repoPath, 50);
    } catch (err) {
      console.error('Failed to check edge cases status:', err);
    } finally {
      isCheckingIndexLock = false;
    }
  }

  async function handleClearIndexLock() {
    if (!repoPath) return;
    isClearingLock = true;
    try {
      const ok = await clearIndexLock(repoPath);
      if (ok) {
        toast.success(
          localeState.t('assistant.playbook.toastLockCleared'),
          localeState.t('assistant.playbook.toastLockClearedMsg')
        );
        hasIndexLock = false;
        await onRepoRefreshed?.();
      } else {
        toast.info(
          localeState.t('assistant.playbook.toastNoLockDetected'),
          localeState.t('assistant.playbook.toastNoLockDetectedMsg')
        );
      }
    } catch (err: any) {
      toast.error(localeState.t('assistant.playbook.toastClearLockError'), err?.message || err);
    } finally {
      isClearingLock = false;
    }
  }

  async function handleScanHeavy() {
    if (!repoPath) return;
    isScanningHeavy = true;
    try {
      heavyFiles = await scanHeavyFiles(repoPath, 50);
      if (heavyFiles.length === 0) {
        toast.success(
          localeState.t('assistant.playbook.toastNoHeavyFiles'),
          localeState.t('assistant.playbook.toastNoHeavyFilesMsg')
        );
      } else {
        toast.warning(
          localeState.t('assistant.playbook.toastHeavyFilesDetected'),
          localeState.t('assistant.playbook.toastHeavyFilesDetectedMsg', { count: heavyFiles.length })
        );
      }
    } catch (err: any) {
      toast.error(localeState.t('assistant.playbook.toastScanError'), err?.message || err);
    } finally {
      isScanningHeavy = false;
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
      class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
            <BookOpen class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {localeState.t('assistant.playbook.title')}
            </h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {localeState.t('assistant.playbook.subtitle')}
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

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-1 px-6 py-2 bg-zinc-50/50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800/80 text-xs overflow-x-auto">
        <button
          onclick={() => (activeTab = 'indexLock')}
          class="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer {activeTab === 'indexLock' ? 'bg-amber-100 dark:bg-amber-600/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          <Lock class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>{localeState.t('assistant.playbook.tabIndexLock')}</span>
          {#if hasIndexLock}
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          {/if}
        </button>

        <button
          onclick={() => (activeTab = 'heavyFiles')}
          class="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer {activeTab === 'heavyFiles' ? 'bg-cyan-100 dark:bg-cyan-600/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          <HardDrive class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{localeState.t('assistant.playbook.tabHeavyFiles')}</span>
          {#if heavyFiles.length > 0}
            <span class="px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-mono font-bold">
              {heavyFiles.length}
            </span>
          {/if}
        </button>

        <button
          onclick={() => (activeTab = 'wrongBranch')}
          class="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer {activeTab === 'wrongBranch' ? 'bg-teal-100 dark:bg-teal-600/20 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/40 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          <GitBranch class="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>{localeState.t('assistant.playbook.tabWrongBranch')}</span>
        </button>

        <button
          onclick={() => (activeTab = 'fileLocks')}
          class="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer {activeTab === 'fileLocks' ? 'bg-purple-100 dark:bg-purple-600/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          <ShieldCheck class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>{localeState.t('assistant.playbook.tabRescueCode')}</span>
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="p-6 max-h-[460px] overflow-y-auto">
        <!-- TAB 1: Gỡ kẹt .git/index.lock -->
        {#if activeTab === 'indexLock'}
          <div class="space-y-4">
            <div class="p-4 rounded-xl border {hasIndexLock ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60' : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800'}">
              <div class="flex items-start gap-3">
                <div class="p-2 rounded-lg {hasIndexLock ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'} shrink-0">
                  {#if hasIndexLock}
                    <Lock class="w-5 h-5" />
                  {:else}
                    <Unlock class="w-5 h-5" />
                  {/if}
                </div>
                <div class="space-y-1 flex-1">
                  <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {localeState.t('assistant.playbook.statusLabel')}
                    {#if hasIndexLock}
                      <span class="text-rose-700 dark:text-rose-400 font-mono">{localeState.t('assistant.playbook.lockFoundMsg')}</span>
                    {:else}
                      <span class="text-emerald-700 dark:text-emerald-400 font-mono">{localeState.t('assistant.playbook.lockNormalMsg')}</span>
                    {/if}
                  </h3>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {localeState.t('assistant.playbook.lockExplanation')} <code class="text-amber-700 dark:text-amber-400 font-mono">Unable to create .git/index.lock: File exists</code>.
                  </p>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <h4 class="text-xs font-semibold text-zinc-800 dark:text-zinc-300">{localeState.t('assistant.playbook.lockSolutionTitle')}</h4>
              <p class="text-xs text-zinc-600 dark:text-zinc-400">
                {localeState.t('assistant.playbook.lockSolutionDesc')}
              </p>
              <div class="flex items-center gap-3 pt-1">
                <button
                  onclick={handleClearIndexLock}
                  disabled={isClearingLock}
                  class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {#if isClearingLock}
                    <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                    <span>{localeState.t('assistant.playbook.processing')}</span>
                  {:else}
                    <Unlock class="w-3.5 h-3.5" />
                    <span>{localeState.t('assistant.playbook.clearLockNow')}</span>
                  {/if}
                </button>
                <button
                  onclick={checkStatus}
                  disabled={isCheckingIndexLock}
                  class="px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border border-zinc-300 dark:border-transparent shadow-xs"
                >
                  {#if isCheckingIndexLock}
                    <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                    <span>{localeState.t('assistant.playbook.checking')}</span>
                  {:else}
                    <span>{localeState.t('assistant.playbook.recheck')}</span>
                  {/if}
                </button>
              </div>
            </div>
          </div>

        <!-- TAB 2: Quét tệp lớn > 50MB -->
        {:else if activeTab === 'heavyFiles'}
          <div class="space-y-4">
            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <AlertTriangle class="w-4 h-4 text-amber-600 dark:text-amber-400" />
                {localeState.t('assistant.playbook.heavyFilesTitle')}
              </h3>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {localeState.t('assistant.playbook.heavyFilesDesc')}
              </p>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-zinc-800 dark:text-zinc-300">
                  {localeState.t('assistant.playbook.heavyFilesCount', { count: heavyFiles.length })}
                </span>
                <button
                  onclick={handleScanHeavy}
                  disabled={isScanningHeavy}
                  class="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-300 dark:border-transparent shadow-xs"
                >
                  <RefreshCw class="w-3 h-3 {isScanningHeavy ? 'animate-spin' : ''}" />
                  <span>{localeState.t('assistant.playbook.rescan')}</span>
                </button>
              </div>

              {#if heavyFiles.length === 0}
                <div class="py-8 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-500 text-xs">
                  <CheckCircle2 class="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                  {localeState.t('assistant.playbook.noHeavyFilesStaged')}
                </div>
              {:else}
                <div class="space-y-1.5 font-mono text-xs">
                  {#each heavyFiles as f (f.path)}
                    <div class="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-zinc-800 dark:text-zinc-300 shadow-xs">
                      <span class="truncate max-w-sm select-text">{f.path}</span>
                      <span class="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800/60 text-[11px]">
                        {f.size_formatted}
                      </span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

        <!-- TAB 3: Commit nhầm vào main / nhánh hiện tại -->
        {:else if activeTab === 'wrongBranch'}
          <div class="space-y-4">
            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <GitBranch class="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  {localeState.t('assistant.playbook.wrongBranchScenario', { branch: currentBranch || 'main' })}
                </h3>
                {#if currentBranch}
                  <span class="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-mono text-[11px] border border-teal-200 dark:border-teal-800/60 font-semibold">
                    {localeState.t('assistant.playbook.branchLabel', { branch: currentBranch })}
                  </span>
                {/if}
              </div>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {localeState.t('assistant.playbook.wrongBranchCalm', { branch: currentBranch || 'main' })}
              </p>
            </div>

            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs text-zinc-800 dark:text-zinc-300">
              <h4 class="font-semibold text-teal-700 dark:text-teal-400">{localeState.t('assistant.playbook.wrongBranchStepsTitle')}</h4>
              <ol class="list-decimal pl-5 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>
                  {localeState.t('assistant.playbook.wrongBranchStep1')}
                </li>
                <li>
                  {localeState.t('assistant.playbook.wrongBranchStep2', { branch: currentBranch || 'main' })}
                </li>
                <li>
                  {localeState.t('assistant.playbook.wrongBranchResult', { branch: currentBranch || 'main' })}
                </li>
              </ol>
            </div>
          </div>

        <!-- TAB 4: Safe Discard 48h & Time Machine -->
        {:else if activeTab === 'fileLocks'}
          <div class="space-y-4">
            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {localeState.t('assistant.playbook.rescueTitle')}
              </h3>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {localeState.t('assistant.playbook.rescuePhilosophy')}
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                    <Trash2 class="w-4 h-4" />
                    {localeState.t('assistant.playbook.trashCardTitle')}
                  </h4>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400">
                    {localeState.t('assistant.playbook.trashCardDesc')}
                  </p>
                </div>
                <button
                  onclick={() => { onClose(); onOpenTrash(); }}
                  class="mt-3 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>{localeState.t('assistant.playbook.openTrashBtn')}</span>
                  <ArrowRight class="w-3.5 h-3.5" />
                </button>
              </div>

              <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5 mb-1">
                    <History class="w-4 h-4" />
                    {localeState.t('assistant.playbook.timeMachineCardTitle')}
                  </h4>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400">
                    {localeState.t('assistant.playbook.timeMachineCardDesc')}
                  </p>
                </div>
                <button
                  onclick={() => { onClose(); onOpenTimeMachine(); }}
                  class="mt-3 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-600/20 hover:bg-purple-100 dark:hover:bg-purple-600/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>{localeState.t('assistant.playbook.openTimeMachineBtn')}</span>
                  <ArrowRight class="w-3.5 h-3.5" />
                </button>
              </div>

              <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                    <LifeBuoy class="w-4 h-4" />
                    Lost & Found
                  </h4>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400">
                    {localeState.t('safety.lostAndFound.subtitle')}
                  </p>
                </div>
                <button
                  onclick={() => { onClose(); onOpenLostAndFound && onOpenLostAndFound(); }}
                  class="mt-3 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-600/20 hover:bg-amber-100 dark:hover:bg-amber-600/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>{localeState.t('safety.lostAndFound.rescueBtn')}</span>
                  <ArrowRight class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
        <span class="text-[11px] text-zinc-500 font-mono">
          {localeState.t('assistant.playbook.footerTagline')}
        </span>
        <button
          onclick={onClose}
          class="px-4 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer transition-colors border border-zinc-200 dark:border-transparent"
        >
          {localeState.t('common.close')}
        </button>
      </div>
    </div>
  </div>
{/if}
