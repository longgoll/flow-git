<script lang="ts">
  import {
    ExternalLink,
    CheckCircle2,
    Download,
    GitMerge,
    Sparkles,
    Loader2,
    CheckCircle,
    Clock,
    XCircle,
    MessageSquare,
    RotateCcw,
    ArrowLeft,
    PanelLeftOpen,
    PanelLeftClose,
  } from 'lucide-svelte';
  import type { GitHubCommitChecks, GitHubPullRequest } from '../../types';
  import { getPRStatusBadge } from './prDiffUtils';
  import { formatRelativeTime } from '../../utils/timeUtils';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    selectedPR: GitHubPullRequest;
    commitChecks: GitHubCommitChecks | null;
    prFilesCount: number;
    isGeneratingReview: boolean;
    canCheckout: boolean;
    isTogglingPRState?: boolean;
    isMobileView?: boolean;
    isSidebarCollapsed?: boolean;
    onBackToList?: () => void;
    onToggleSidebar?: () => void;
    onAIReview: () => void;
    onCheckout: () => void;
    onOpenMergeModal: () => void;
    onOpenReviewModal: () => void;
    onOpenCloseModal?: () => void;
    onReopenPR?: () => void;
  }

  let {
    selectedPR,
    commitChecks,
    prFilesCount,
    isGeneratingReview,
    canCheckout,
    isTogglingPRState = false,
    isMobileView = false,
    isSidebarCollapsed = false,
    onBackToList,
    onToggleSidebar,
    onAIReview,
    onCheckout,
    onOpenMergeModal,
    onOpenReviewModal,
    onOpenCloseModal,
    onReopenPR,
  }: Props = $props();

  let statusBadge = $derived(getPRStatusBadge(selectedPR));
  let StatusIcon = $derived(statusBadge.icon);
</script>

<div class="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/40 flex flex-col md:flex-row md:items-start justify-between gap-3 shrink-0">
  <div class="space-y-1.5 min-w-0 flex-1">
    <div class="flex items-center gap-2 flex-wrap">
      {#if isMobileView && onBackToList}
        <button
          type="button"
          onclick={onBackToList}
          class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 hover:bg-cyan-200 dark:hover:bg-cyan-900/80 border border-cyan-300 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-300 text-xs font-semibold cursor-pointer transition-colors"
          title={localeState.t('pullRequest.reviewer.backToList')}
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          <span>{localeState.t('pullRequest.reviewer.backToList')}</span>
        </button>
      {:else if onToggleSidebar}
        <button
          type="button"
          onclick={onToggleSidebar}
          class="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer transition-colors"
          title={isSidebarCollapsed ? localeState.t('pullRequest.reviewer.expandSidebar') : localeState.t('pullRequest.reviewer.collapseSidebar')}
        >
          {#if isSidebarCollapsed}
            <PanelLeftOpen class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          {:else}
            <PanelLeftClose class="w-4 h-4" />
          {/if}
        </button>
      {/if}

      <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border {statusBadge.bg} {statusBadge.text} {statusBadge.border}">
        <StatusIcon class="w-3.5 h-3.5" />
        <span>{statusBadge.label}</span>
      </span>
      <h1 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
        #{selectedPR.number} {selectedPR.title}
      </h1>
    </div>

    <div class="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 flex-wrap">
      <span>{localeState.t('pullRequest.reviewer.header.byAuthor', { name: selectedPR.user.login, time: formatRelativeTime(selectedPR.created_at) })}</span>
      <span>•</span>
      <span class="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
        <span>{localeState.t('pullRequest.reviewer.header.branchPrefix')}</span>
        <code class="px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-semibold">{selectedPR.head.ref}</code>
        <span class="text-zinc-400">&rarr;</span>
        <code class="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">{selectedPR.base.ref}</code>
      </span>

      <!-- CI / GitHub Actions Checks Status -->
      {#if commitChecks && commitChecks.total_count > 0}
        <span>•</span>
        {#if commitChecks.state === 'success'}
          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1" title={localeState.t('pullRequest.reviewer.header.ciPassedTooltip')}>
            <CheckCircle class="w-3 h-3" />
            <span>{localeState.t('pullRequest.reviewer.header.ciPassed', { count: commitChecks.total_count })}</span>
          </span>
        {:else if commitChecks.state === 'pending'}
          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center gap-1" title={localeState.t('pullRequest.reviewer.header.ciRunningTooltip')}>
            <Clock class="w-3 h-3 animate-spin" />
            <span>{localeState.t('pullRequest.reviewer.header.ciRunning')}</span>
          </span>
        {:else if commitChecks.state === 'failure'}
          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center gap-1" title={localeState.t('pullRequest.reviewer.header.ciFailedTooltip')}>
            <XCircle class="w-3 h-3" />
            <span>{localeState.t('pullRequest.reviewer.header.ciFailed')}</span>
          </span>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Actions: Checkout to Local, Review, Open GitHub -->
  <div class="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap">
    <!-- AI Review PR Button -->
    <button
      type="button"
      onclick={onAIReview}
      disabled={isGeneratingReview || prFilesCount === 0}
      class="px-2.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 dark:hover:bg-violet-900/60 border border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
      title={localeState.t('pullRequest.reviewer.header.aiReviewTooltip')}
    >
      {#if isGeneratingReview}
        <Loader2 class="w-3.5 h-3.5 animate-spin" />
        <span class="hidden sm:inline">{localeState.t('pullRequest.reviewer.header.aiReviewing')}</span>
      {:else}
        <Sparkles class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">{localeState.t('pullRequest.reviewer.header.aiReviewBtn')}</span>
      {/if}
    </button>

    {#if canCheckout}
      <button
        type="button"
        onclick={onCheckout}
        class="px-2.5 sm:px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        title={localeState.t('pullRequest.reviewer.header.checkoutToLocalTooltip')}
      >
        <Download class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        <span class="hidden md:inline">{localeState.t('pullRequest.reviewer.header.checkoutToLocal')}</span>
      </button>
    {/if}

    {#if selectedPR.state === 'open'}
      <button
        type="button"
        onclick={onOpenMergeModal}
        class="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
        title={localeState.t('pullRequest.reviewer.header.mergeTooltip')}
      >
        <GitMerge class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">{localeState.t('pullRequest.reviewer.header.mergeBtn')}</span>
      </button>

      <button
        type="button"
        onclick={onOpenReviewModal}
        class="px-2.5 sm:px-3 py-1.5 rounded-lg bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
        title={localeState.t('pullRequest.reviewer.header.submitReview')}
      >
        <CheckCircle2 class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">{localeState.t('pullRequest.reviewer.header.submitReview')}</span>
      </button>

      <button
        type="button"
        onclick={onOpenCloseModal}
        disabled={isTogglingPRState}
        class="px-2 sm:px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-zinc-200 dark:border-zinc-700 hover:border-rose-300 dark:hover:border-rose-800/60 text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
        title={localeState.t('pullRequest.reviewer.header.closePRTooltip')}
      >
        <XCircle class="w-3.5 h-3.5 text-rose-500/80" />
        <span class="hidden lg:inline">{localeState.t('pullRequest.reviewer.header.closePR')}</span>
      </button>
    {:else}
      {#if !selectedPR.merged}
        <button
          type="button"
          onclick={onReopenPR}
          disabled={isTogglingPRState}
          class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
          title={localeState.t('pullRequest.reviewer.header.reopenPRTooltip')}
        >
          {#if isTogglingPRState}
            <Loader2 class="w-3.5 h-3.5 animate-spin" />
            <span class="hidden sm:inline">{localeState.t('pullRequest.reviewer.header.reopening')}</span>
          {:else}
            <RotateCcw class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{localeState.t('pullRequest.reviewer.header.reopenPR')}</span>
          {/if}
        </button>
      {/if}

      <button
        type="button"
        onclick={onOpenReviewModal}
        class="px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        title={localeState.t('pullRequest.reviewer.header.addCommentTooltip')}
      >
        <MessageSquare class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
        <span class="hidden sm:inline">{localeState.t('pullRequest.reviewer.header.addComment')}</span>
      </button>
    {/if}

    <a
      href={selectedPR.html_url}
      target="_blank"
      rel="noreferrer"
      class="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
      title={localeState.t('pullRequest.reviewer.header.openOnGitHubTooltip')}
    >
      <ExternalLink class="w-4 h-4" />
    </a>
  </div>
</div>
