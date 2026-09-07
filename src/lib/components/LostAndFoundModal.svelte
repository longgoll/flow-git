<script lang="ts">
  import {
    LifeBuoy,
    GitBranch,
    ShieldCheck,
    Search,
    X,
    Clock,
    User,
    Check,
    Copy,
    AlertTriangle,
  } from 'lucide-svelte';
  import type { ReflogEntry } from '../types';
  import { localeState } from '../state/localeState.svelte';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    isOpen: boolean;
    repoPath?: string;
    reflogEntries: ReflogEntry[];
    isLoading: boolean;
    onClose: () => void;
    onRescueCommit: (commitId: string, branchName: string) => Promise<void>;
    onResetToCommit?: (commitId: string) => Promise<void>;
  }

  let {
    isOpen = false,
    reflogEntries = [],
    isLoading = false,
    onClose,
    onRescueCommit,
    onResetToCommit,
  }: Props = $props();

  let activeTab = $state<'orphaned' | 'all'>('orphaned');
  let searchQuery = $state<string>('');

  // Inline rescue branch creation state
  let expandingCommitId = $state<string | null>(null);
  let rescueBranchName = $state<string>('');
  let isRescuing = $state<boolean>(false);
  let copiedSha = $state<string | null>(null);

  let orphanedEntries = $derived(reflogEntries.filter((e) => e.is_orphaned));

  let filteredEntries = $derived.by(() => {
    const baseList = activeTab === 'orphaned' ? orphanedEntries : reflogEntries;
    if (!searchQuery.trim()) return baseList;
    const q = searchQuery.toLowerCase().trim();
    return baseList.filter(
      (e) =>
        e.message.toLowerCase().includes(q) ||
        e.commit_id.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.committer.toLowerCase().includes(q)
    );
  });

  function formatTime(timestamp: number): string {
    const elapsed = Math.floor(Date.now() / 1000) - timestamp;
    if (elapsed < 60) return localeState.t('safety.lostAndFound.timeAgoSeconds', { count: Math.max(1, elapsed) });
    if (elapsed < 3600) return localeState.t('safety.lostAndFound.timeAgoMinutes', { count: Math.floor(elapsed / 60) });
    if (elapsed < 86400) return localeState.t('safety.lostAndFound.timeAgoHours', { count: Math.floor(elapsed / 3600) });
    return localeState.t('safety.lostAndFound.timeAgoDays', { count: Math.floor(elapsed / 86400) });
  }

  function getActionBadgeStyle(action: string) {
    const a = action.toLowerCase();
    if (a.includes('reset')) {
      return 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40';
    }
    if (a.includes('rebase')) {
      return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/40';
    }
    if (a.includes('merge')) {
      return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40';
    }
    if (a.includes('checkout')) {
      return 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/40';
    }
    return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40';
  }

  function handleStartRescue(entry: ReflogEntry) {
    if (expandingCommitId === entry.commit_id) {
      expandingCommitId = null;
      rescueBranchName = '';
    } else {
      expandingCommitId = entry.commit_id;
      rescueBranchName = `rescue/${entry.short_id}`;
    }
  }

  async function handleConfirmRescue(entry: ReflogEntry) {
    if (!rescueBranchName.trim() || isRescuing) return;
    isRescuing = true;
    try {
      await onRescueCommit(entry.commit_id, rescueBranchName.trim());
      toast.success(
        localeState.t('safety.lostAndFound.rescueSuccess'),
        localeState.t('safety.lostAndFound.rescueSuccessMsg', {
          branch: rescueBranchName.trim(),
          sha: entry.short_id,
        })
      );
      expandingCommitId = null;
      rescueBranchName = '';
    } catch (e: any) {
      toast.error('Rescue failed', e?.message || String(e));
    } finally {
      isRescuing = false;
    }
  }

  async function handleCopySha(sha: string) {
    try {
      await navigator.clipboard.writeText(sha);
      copiedSha = sha;
      setTimeout(() => (copiedSha = null), 1500);
    } catch {
      // Ignore clipboard error
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="w-full max-w-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden flex flex-col font-sans text-zinc-900 dark:text-zinc-100 max-h-[88vh]"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-xs">
            <LifeBuoy class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {localeState.t('safety.lostAndFound.title')}
              {#if orphanedEntries.length > 0}
                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-bold">
                  {orphanedEntries.length} {localeState.t('safety.lostAndFound.orphanedBadge')}
                </span>
              {/if}
            </h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {localeState.t('safety.lostAndFound.subtitle')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onclick={onClose}
          class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Filter Controls & Tabs -->
      <div class="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-4">
        <!-- Tabs -->
        <div class="flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onclick={() => (activeTab = 'orphaned')}
            class="px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer {activeTab === 'orphaned' ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            {localeState.t('safety.lostAndFound.tabLostAndFound', { count: orphanedEntries.length })}
          </button>
          <button
            type="button"
            onclick={() => (activeTab = 'all')}
            class="px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer {activeTab === 'all' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            {localeState.t('safety.lostAndFound.tabAllReflog', { count: reflogEntries.length })}
          </button>
        </div>

        <!-- Search box -->
        <div class="relative flex-1 max-w-xs">
          <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder={localeState.t('safety.lostAndFound.filterPlaceholder')}
            class="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      <!-- Content Timeline List -->
      <div class="flex-1 overflow-y-auto p-6 space-y-3">
        {#if isLoading}
          <div class="py-16 text-center text-xs text-zinc-500 space-y-3">
            <div class="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto"></div>
            <p>Đang quét Git Reflog...</p>
          </div>
        {:else if filteredEntries.length === 0}
          <div class="py-16 text-center text-xs text-zinc-500 space-y-3">
            {#if activeTab === 'orphaned'}
              <ShieldCheck class="w-10 h-10 text-emerald-500 mx-auto opacity-70" />
              <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {localeState.t('safety.lostAndFound.noOrphanedCommits')}
              </p>
              <button
                type="button"
                onclick={() => (activeTab = 'all')}
                class="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Xem toàn bộ lịch sử Reflog
              </button>
            {:else}
              <p>{localeState.t('safety.lostAndFound.noReflog')}</p>
            {/if}
          </div>
        {:else}
          {#each filteredEntries as entry (entry.commit_id + entry.index)}
            {@const badgeClass = getActionBadgeStyle(entry.action)}
            <div
              class="p-3.5 rounded-xl border transition-all {entry.is_orphaned ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-700/60' : 'bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}"
            >
              <div class="flex items-start justify-between gap-3 mb-2">
                <!-- Action & Status Badges -->
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono border font-bold uppercase {badgeClass}">
                    {entry.action}
                  </span>

                  {#if entry.is_orphaned}
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 flex items-center gap-1">
                      <AlertTriangle class="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>{localeState.t('safety.lostAndFound.orphanedBadge')}</span>
                    </span>
                  {:else}
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {localeState.t('safety.lostAndFound.activeBadge')}
                    </span>
                  {/if}

                  <span class="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                    <Clock class="w-3 h-3" />
                    <span>{formatTime(entry.timestamp)}</span>
                  </span>
                </div>

                <!-- Commit SHA & Copy -->
                <button
                  type="button"
                  onclick={() => handleCopySha(entry.commit_id)}
                  class="flex items-center gap-1 font-mono text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer transition-colors p-1 rounded-md hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                  title="Copy SHA"
                >
                  <span>{entry.short_id}</span>
                  {#if copiedSha === entry.commit_id}
                    <Check class="w-3 h-3 text-emerald-500" />
                  {:else}
                    <Copy class="w-3 h-3 text-zinc-400" />
                  {/if}
                </button>
              </div>

              <!-- Commit Description / Message -->
              <div class="text-xs text-zinc-800 dark:text-zinc-200 font-medium mb-2.5 select-text">
                {entry.message}
              </div>

              <!-- Author / Committer info & Rescue Action Trigger -->
              <div class="pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between gap-3 text-xs">
                <div class="flex items-center gap-1.5 text-zinc-500 font-mono text-[11px]">
                  <User class="w-3 h-3" />
                  <span>{entry.committer}</span>
                </div>

                <div class="flex items-center gap-2">
                  {#if onResetToCommit}
                    <button
                      type="button"
                      onclick={() => onResetToCommit && onResetToCommit(entry.commit_id)}
                      class="px-2.5 py-1 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 font-medium transition-colors cursor-pointer text-xs"
                      title={localeState.t('safety.lostAndFound.resetToCommit')}
                    >
                      {localeState.t('safety.lostAndFound.resetToCommit')}
                    </button>
                  {/if}

                  <button
                    type="button"
                    onclick={() => handleStartRescue(entry)}
                    class="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors text-xs"
                  >
                    <LifeBuoy class="w-3.5 h-3.5" />
                    <span>{localeState.t('safety.lostAndFound.rescueBtn')}</span>
                  </button>
                </div>
              </div>

              <!-- Expanding Inline Rescue Branch Input -->
              {#if expandingCommitId === entry.commit_id}
                <div class="mt-3 p-3 rounded-xl bg-amber-100/50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 animate-in fade-in duration-150 space-y-2">
                  <div class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <GitBranch class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{localeState.t('safety.lostAndFound.rescueTitle', { sha: entry.short_id })}</span>
                  </div>

                  <div class="flex items-center gap-2">
                    <input
                      type="text"
                      bind:value={rescueBranchName}
                      placeholder={localeState.t('safety.lostAndFound.branchNamePlaceholder')}
                      class="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:outline-hidden focus:border-amber-500 font-mono"
                    />

                    <button
                      type="button"
                      disabled={!rescueBranchName.trim() || isRescuing}
                      onclick={() => handleConfirmRescue(entry)}
                      class="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {#if isRescuing}
                        <div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {/if}
                      <span>{localeState.t('safety.lostAndFound.confirmRescue')}</span>
                    </button>

                    <button
                      type="button"
                      onclick={() => (expandingCommitId = null)}
                      class="px-2.5 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-xs cursor-pointer"
                    >
                      {localeState.t('common.cancel')}
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
        <span>Tổng cộng: {reflogEntries.length} bản ghi Reflog</span>
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium transition-colors cursor-pointer"
        >
          {localeState.t('common.close')}
        </button>
      </div>
    </div>
  </div>
{/if}
