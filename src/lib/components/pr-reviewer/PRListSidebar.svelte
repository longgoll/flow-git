<script lang="ts">
  import {
    Search,
    RefreshCw,
    RotateCcw,
    Plus,
    Key,
  } from 'lucide-svelte';
  import type { GitHubPullRequest } from '../../types';
  import { getPRStatusBadge } from './prDiffUtils';
  import { formatRelativeTime } from '../../utils/timeUtils';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    filteredPRs: GitHubPullRequest[];
    selectedPR: GitHubPullRequest | null;
    isLoadingPRs: boolean;
    searchQuery: string;
    prFilter: 'open' | 'closed' | 'all';
    showTokenInput: boolean;
    patToken: string;
    onSelectPR: (pr: GitHubPullRequest) => void;
    onFilterChange: (filter: 'open' | 'closed' | 'all') => void;
    onSearchChange: (query: string) => void;
    onSaveToken: (token: string) => void;
    onOpenCreatePR: () => void;
  }

  let {
    filteredPRs,
    selectedPR,
    isLoadingPRs,
    searchQuery = $bindable(''),
    prFilter = $bindable('open'),
    showTokenInput,
    patToken = $bindable(''),
    onSelectPR,
    onFilterChange,
    onSearchChange,
    onSaveToken,
    onOpenCreatePR,
  }: Props = $props();

  let inputToken = $state(patToken);

  $effect(() => {
    inputToken = patToken;
  });
</script>

<div class="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/70 dark:bg-zinc-950/60 shrink-0">
  <!-- Token Input Drawer (Optional) -->
  {#if showTokenInput}
    <div class="p-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-2 text-xs animate-in fade-in duration-150">
      <div class="flex items-center gap-2">
        <Key class="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
        <input
          type="password"
          bind:value={inputToken}
          placeholder="GitHub PAT (ghp_...)"
          class="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
        />
        <button
          onclick={() => onSaveToken(inputToken)}
          class="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs cursor-pointer shadow-xs shrink-0"
        >
          {localeState.t('pullRequest.reviewer.list.patDrawerSave')}
        </button>
      </div>
      <p class="text-[10px] text-zinc-500 dark:text-zinc-400">
        {localeState.t('pullRequest.reviewer.list.patDrawerNotice', { repoScope: 'repo' })}
      </p>
    </div>
  {/if}

  <!-- Search & Filters -->
  <div class="p-2.5 border-b border-zinc-200 dark:border-zinc-800/80 space-y-2">
    <div class="relative">
      <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
      <input
        type="text"
        bind:value={searchQuery}
        oninput={(e) => onSearchChange(e.currentTarget.value)}
        placeholder={localeState.t('pullRequest.reviewer.list.searchPlaceholder')}
        class="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500"
      />
    </div>

    <div class="flex items-center gap-1">
      {#each (['open', 'closed', 'all'] as const) as f}
        <button
          type="button"
          onclick={() => onFilterChange(f)}
          class="flex-1 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer capitalize {prFilter === f ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          {f}
        </button>
      {/each}
    </div>
  </div>

  <!-- PR Items -->
  <div class="flex-1 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-900">
    {#if isLoadingPRs}
      <div class="p-6 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
        <RefreshCw class="w-4 h-4 animate-spin text-violet-600 dark:text-violet-400" />
        <span>{localeState.t('pullRequest.reviewer.list.loadingPRs')}</span>
      </div>
    {:else if filteredPRs.length === 0}
      <div class="p-6 text-center text-xs text-zinc-400 dark:text-zinc-500 space-y-3">
        {#if searchQuery.trim()}
          <div class="leading-relaxed">{localeState.t('pullRequest.reviewer.list.noPRsMatching', { query: searchQuery })}</div>
          <button
            type="button"
            onclick={() => {
              searchQuery = '';
              onSearchChange('');
            }}
            class="px-2.5 py-1 rounded-md bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw class="w-3 h-3" />
            <span>{localeState.t('pullRequest.reviewer.list.clearSearch')}</span>
          </button>
        {:else}
          <div>{localeState.t('pullRequest.reviewer.list.noPRsFilter', { filter: prFilter })}</div>
          <button
            type="button"
            onclick={onOpenCreatePR}
            class="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>{localeState.t('pullRequest.reviewer.list.createNewPR')}</span>
          </button>
        {/if}
      </div>
    {:else}
      {#each filteredPRs as pr (pr.id)}
        {@const badge = getPRStatusBadge(pr)}
        {@const BadgeIcon = badge.icon}
        {@const isSelected = selectedPR?.id === pr.id}
        <button
          type="button"
          onclick={() => onSelectPR(pr)}
          class="w-full p-3 text-left transition-colors cursor-pointer flex flex-col gap-1.5 {isSelected ? 'bg-violet-50 dark:bg-violet-950/40 border-l-4 border-violet-600 shadow-xs' : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-900/50 border-l-4 border-transparent'}"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border {badge.bg} {badge.text} {badge.border}">
              <BadgeIcon class="w-3 h-3" />
              <span>{badge.label}</span>
            </span>
            <span class="text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
              #{pr.number}
            </span>
          </div>

          <div class="text-xs font-semibold line-clamp-2 leading-snug {isSelected ? 'text-violet-950 dark:text-violet-100 font-bold' : 'text-zinc-800 dark:text-zinc-200'}">
            {pr.title}
          </div>

          <div class="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 pt-0.5 gap-2">
            <span class="truncate">
              @{pr.user.login} &bull; {formatRelativeTime(pr.created_at)}
            </span>
            <span class="font-mono text-[10px] flex items-center gap-1 text-zinc-500 dark:text-zinc-400 shrink-0">
              <span class="text-violet-600 dark:text-violet-400 font-medium">{pr.head.ref}</span>
              <span class="text-zinc-400">&rarr;</span>
              <span class="text-zinc-600 dark:text-zinc-400">{pr.base.ref}</span>
            </span>
          </div>
        </button>
      {/each}
    {/if}
  </div>
</div>
