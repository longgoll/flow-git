<script lang="ts">
  import {
    GitPullRequest,
    Sparkles,
    Plus,
    FileText,
    MessageSquare,
    GitMerge,
    Download,
    Search,
    RotateCcw,
    ArrowRight,
  } from 'lucide-svelte';
  import type { GitHubPullRequest } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    repoOwner: string;
    repoName: string;
    prFilter: 'open' | 'closed' | 'all';
    searchQuery: string;
    totalPRCount: number;
    filteredPRs: GitHubPullRequest[];
    isLoadingPRs: boolean;
    loadError?: string | null;
    onRetry?: () => void;
    onOpenAuth?: () => void;
    onOpenCreatePR: () => void;
    onClearSearch: () => void;
    onSelectPR: (pr: GitHubPullRequest) => void;
  }

  let {
    repoOwner,
    repoName,
    prFilter,
    searchQuery,
    totalPRCount,
    filteredPRs,
    isLoadingPRs,
    loadError = null,
    onRetry,
    onOpenAuth,
    onOpenCreatePR,
    onClearSearch,
    onSelectPR,
  }: Props = $props();
</script>

<div class="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50/50 dark:bg-zinc-950/40 text-center overflow-y-auto">
  {#if loadError && !isLoadingPRs}
    <!-- Connection / API Error State -->
    <div class="max-w-md w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
      <div class="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-md mb-4">
        <Sparkles class="w-7 h-7 text-amber-500" />
      </div>

      <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
        {localeState.t('pullRequest.reviewer.connectionErrorTitle')}
      </h2>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4 max-w-sm">
        {loadError}. {localeState.t('pullRequest.reviewer.connectionErrorDesc')}
      </p>

      <div class="flex items-center gap-2 mb-8">
        {#if onRetry}
          <button
            type="button"
            onclick={onRetry}
            class="px-3.5 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-semibold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 cursor-pointer transition-colors"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>{localeState.t('pullRequest.reviewer.retryBtn')}</span>
          </button>
        {/if}

        {#if onOpenAuth}
          <button
            type="button"
            onclick={onOpenAuth}
            class="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold flex items-center gap-1.5 text-white shadow-xs cursor-pointer transition-colors"
          >
            <span>{localeState.t('toolbar.signIn')} GitHub</span>
          </button>
        {/if}
      </div>
    </div>
  {:else if totalPRCount === 0 && !isLoadingPRs}
    <!-- PR Launchpad Empty State (No PRs in Repo) -->
    <div class="max-w-md w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
      <div class="relative mb-5">
        <div class="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500/20 via-cyan-500/15 to-emerald-500/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10 dark:shadow-violet-950/30">
          <GitPullRequest class="w-8 h-8 text-violet-600 dark:text-violet-400" />
        </div>
        <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-white shadow-xs">
          <Sparkles class="w-3 h-3" />
        </div>
      </div>

      <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
        {localeState.t('pullRequest.reviewer.launchpad.studioTitle')}
      </h2>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
        {#if repoOwner && repoName}
          {localeState.t('pullRequest.reviewer.launchpad.repoNoPRs', { owner: repoOwner, repo: repoName, filter: prFilter })}
        {:else}
          {localeState.t('pullRequest.reviewer.launchpad.connectPrompt')}
        {/if}
      </p>

      <button
        type="button"
        onclick={onOpenCreatePR}
        class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-98 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-cyan-600/20 cursor-pointer transition-all mb-8"
      >
        <Plus class="w-4 h-4" />
        <span>{localeState.t('pullRequest.reviewer.launchpad.createPRNow')}</span>
      </button>

      <!-- Feature Showcase Cards -->
      <div class="w-full grid grid-cols-2 gap-2.5 text-left">
        <div class="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <div class="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
            <FileText class="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span>{localeState.t('pullRequest.reviewer.launchpad.cardMonacoTitle')}</span>
          </div>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
            {localeState.t('pullRequest.reviewer.launchpad.cardMonacoDesc')}
          </p>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <div class="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
            <MessageSquare class="w-3.5 h-3.5 text-violet-500 shrink-0" />
            <span>{localeState.t('pullRequest.reviewer.launchpad.cardInlineTitle')}</span>
          </div>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
            {localeState.t('pullRequest.reviewer.launchpad.cardInlineDesc')}
          </p>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <div class="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
            <GitMerge class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{localeState.t('pullRequest.reviewer.launchpad.cardMergeTitle')}</span>
          </div>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
            {localeState.t('pullRequest.reviewer.launchpad.cardMergeDesc')}
          </p>
        </div>

        <div class="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <div class="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
            <Download class="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{localeState.t('pullRequest.reviewer.launchpad.cardCheckoutTitle')}</span>
          </div>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
            {localeState.t('pullRequest.reviewer.launchpad.cardCheckoutDesc')}
          </p>
        </div>
      </div>
    </div>
  {:else if filteredPRs.length === 0 && searchQuery.trim()}
    <!-- Search No Result -->
    <div class="max-w-sm w-full flex flex-col items-center animate-in fade-in duration-150">
      <div class="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-3">
        <Search class="w-5 h-5" />
      </div>
      <h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
        {localeState.t('pullRequest.reviewer.launchpad.searchNoResultsTitle')}
      </h3>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
        {localeState.t('pullRequest.reviewer.launchpad.searchNoResultsDesc', { query: searchQuery, filter: prFilter })}
      </p>
      <button
        type="button"
        onclick={onClearSearch}
        class="px-3.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 cursor-pointer transition-colors"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span>{localeState.t('pullRequest.reviewer.launchpad.clearSearchFilter')}</span>
      </button>
    </div>
  {:else}
    <!-- PRs exist, but none selected -->
    <div class="max-w-sm w-full flex flex-col items-center animate-in fade-in duration-150">
      <div class="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/60 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-3">
        <GitPullRequest class="w-6 h-6" />
      </div>
      <h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
        {localeState.t('pullRequest.reviewer.launchpad.readyToReviewTitle')}
      </h3>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
        {localeState.t('pullRequest.reviewer.launchpad.readyToReviewDesc', { count: filteredPRs.length })}
      </p>
      {#if filteredPRs.length > 0}
        <button
          type="button"
          onclick={() => onSelectPR(filteredPRs[0])}
          class="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
        >
          <span>{localeState.t('pullRequest.reviewer.launchpad.viewLatestPR', { number: filteredPRs[0].number })}</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </button>
      {/if}
    </div>
  {/if}
</div>
