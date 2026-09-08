<script lang="ts">
  import {
    Database,
    ExternalLink,
    HardDrive,
    RefreshCw,
    Search,
    Trash2,
    X,
  } from 'lucide-svelte';
  import type { GitHubCacheItem, GitHubCacheUsage } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    caches: GitHubCacheItem[];
    usage: GitHubCacheUsage;
    isLoading: boolean;
    remoteInfo: { owner: string; repo: string } | null;
    onRefresh: () => void;
    onDeleteCache: (cacheId: number) => Promise<void>;
  }

  let {
    caches,
    usage,
    isLoading,
    remoteInfo,
    onRefresh,
    onDeleteCache,
  }: Props = $props();

  let searchQuery = $state('');
  let deletingId = $state<number | null>(null);

  const MAX_CACHE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB GitHub limit

  let usagePercent = $derived.by(() => {
    if (!usage.active_caches_size_in_bytes) return 0;
    const p = Math.min(100, Math.round((usage.active_caches_size_in_bytes / MAX_CACHE_BYTES) * 100));
    return p;
  });

  let filteredCaches = $derived.by(() => {
    if (!searchQuery.trim()) return caches;
    const q = searchQuery.toLowerCase().trim();
    return caches.filter(
      (c) => c.key.toLowerCase().includes(q) || c.ref.toLowerCase().includes(q)
    );
  });

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  function formatTimestamp(isoString: string): string {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  async function handleDelete(cacheId: number) {
    if (deletingId !== null) return;
    if (!window.confirm(localeState.t('githubActions.confirmDeleteCache'))) return;

    deletingId = cacheId;
    try {
      await onDeleteCache(cacheId);
    } finally {
      deletingId = null;
    }
  }
</script>

<div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 overflow-y-auto">
  <!-- View Header -->
  <div class="p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30 flex flex-wrap items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
          <Database class="w-4 h-4" />
        </div>
        <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {localeState.t('githubActions.cachesTitle')}
        </h2>
      </div>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
        {localeState.t('githubActions.cachesSubtitle')}
      </p>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onclick={onRefresh}
        disabled={isLoading}
        class="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
      >
        <RefreshCw class="w-3.5 h-3.5 {isLoading ? 'animate-spin text-violet-500' : ''}" />
        <span>{localeState.t('githubActions.refresh')}</span>
      </button>

      {#if remoteInfo}
        <a
          href="https://github.com/{remoteInfo.owner}/{remoteInfo.repo}/actions/caches"
          target="_blank"
          rel="noreferrer"
          class="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          title={localeState.t('githubActions.openOnGitHub')}
        >
          <ExternalLink class="w-3.5 h-3.5" />
          <span>GitHub</span>
        </a>
      {/if}
    </div>
  </div>

  <!-- Main Content Area -->
  <div class="p-6 space-y-6 max-w-6xl w-full mx-auto">
    <!-- Storage Usage Meter Card -->
    <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 shadow-xs">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2 font-semibold text-xs text-zinc-700 dark:text-zinc-300">
          <HardDrive class="w-4 h-4 text-violet-500" />
          <span>{localeState.t('githubActions.cacheUsage')}</span>
        </div>
        <div class="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
          {formatBytes(usage.active_caches_size_in_bytes)} / 10 GB
          <span class="ml-1 text-zinc-400 font-normal">({usagePercent}%)</span>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="w-full h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500 {usagePercent > 80 ? 'bg-rose-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}"
          style="width: {usagePercent}%"
        ></div>
      </div>

      <div class="flex items-center justify-between mt-2 text-[11px] text-zinc-400">
        <span>{usage.active_caches_count} {localeState.t('githubActions.caches').toLowerCase()}</span>
        <span>{localeState.t('githubActions.cacheLimit')}</span>
      </div>
    </div>

    <!-- Search Toolbar -->
    <div class="flex items-center justify-between gap-3">
      <div class="relative w-72">
        <Search class="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Filter by key or branch..."
          class="w-full pl-9 pr-8 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-violet-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 shadow-2xs font-mono"
        />
        {#if searchQuery}
          <button
            type="button"
            onclick={() => (searchQuery = '')}
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>

      <span class="text-xs text-zinc-400">
        {filteredCaches.length} / {caches.length}
      </span>
    </div>

    <!-- Caches Table -->
    {#if isLoading && caches.length === 0}
      <div class="p-16 flex flex-col items-center justify-center text-zinc-400 gap-2">
        <RefreshCw class="w-6 h-6 animate-spin text-violet-500" />
        <span class="text-xs">{localeState.t('githubActions.refreshing')}</span>
      </div>
    {:else if filteredCaches.length === 0}
      <div class="p-16 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
        <Database class="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2" />
        <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {localeState.t('githubActions.noCaches')}
        </div>
      </div>
    {:else}
      <div class="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
        <table class="w-full text-left text-xs">
          <thead class="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
            <tr>
              <th class="py-3 px-4">{localeState.t('githubActions.cacheKey')}</th>
              <th class="py-3 px-4">{localeState.t('githubActions.cacheBranch')}</th>
              <th class="py-3 px-4">{localeState.t('githubActions.cacheSize')}</th>
              <th class="py-3 px-4">{localeState.t('githubActions.cacheLastAccessed')}</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {#each filteredCaches as cache (cache.id)}
              <tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                <td class="py-3 px-4 font-mono font-medium text-zinc-900 dark:text-zinc-100 max-w-xs truncate" title={cache.key}>
                  {cache.key}
                </td>
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-mono bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                    {cache.ref.replace('refs/heads/', '')}
                  </span>
                </td>
                <td class="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-300 font-semibold">
                  {formatBytes(cache.size_in_bytes)}
                </td>
                <td class="py-3 px-4 text-zinc-500 dark:text-zinc-400 text-[11px]">
                  {formatTimestamp(cache.last_accessed_at)}
                </td>
                <td class="py-3 px-4 text-right">
                  <button
                    type="button"
                    onclick={() => handleDelete(cache.id)}
                    disabled={deletingId === cache.id}
                    class="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:border-rose-300 dark:hover:border-rose-800 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer shadow-2xs disabled:opacity-40"
                    title={localeState.t('githubActions.deleteCache')}
                  >
                    {#if deletingId === cache.id}
                      <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                    {:else}
                      <Trash2 class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
