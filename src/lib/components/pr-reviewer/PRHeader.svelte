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
  } from 'lucide-svelte';
  import type { GitHubCommitChecks, GitHubPullRequest } from '../../types';
  import { getPRStatusBadge } from './prDiffUtils';
  import { formatRelativeTime } from '../../utils/timeUtils';

  interface Props {
    selectedPR: GitHubPullRequest;
    commitChecks: GitHubCommitChecks | null;
    prFilesCount: number;
    isGeneratingReview: boolean;
    canCheckout: boolean;
    isTogglingPRState?: boolean;
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

<div class="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/40 flex items-start justify-between gap-4 shrink-0">
  <div class="space-y-1">
    <div class="flex items-center gap-2">
      <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border {statusBadge.bg} {statusBadge.text} {statusBadge.border}">
        <StatusIcon class="w-3.5 h-3.5" />
        <span>{statusBadge.label}</span>
      </span>
      <h1 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
        #{selectedPR.number} {selectedPR.title}
      </h1>
    </div>

    <div class="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 flex-wrap">
      <span>Bởi <strong class="text-zinc-900 dark:text-zinc-200">{selectedPR.user.login}</strong> ({formatRelativeTime(selectedPR.created_at)})</span>
      <span>•</span>
      <span class="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
        <span>Nhánh:</span>
        <code class="px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-semibold">{selectedPR.head.ref}</code>
        <span class="text-zinc-400">&rarr;</span>
        <code class="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">{selectedPR.base.ref}</code>
      </span>

      <!-- CI / GitHub Actions Checks Status -->
      {#if commitChecks && commitChecks.total_count > 0}
        <span>•</span>
        {#if commitChecks.state === 'success'}
          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1" title="Tất cả bài kiểm thử CI đã vượt qua">
            <CheckCircle class="w-3 h-3" />
            <span>CI Passed ({commitChecks.total_count})</span>
          </span>
        {:else if commitChecks.state === 'pending'}
          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center gap-1" title="Các bài kiểm tra CI đang chạy...">
            <Clock class="w-3 h-3 animate-spin" />
            <span>CI Running...</span>
          </span>
        {:else if commitChecks.state === 'failure'}
          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center gap-1" title="Có bài kiểm tra CI bị lỗi!">
            <XCircle class="w-3 h-3" />
            <span>CI Failed</span>
          </span>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Actions: Checkout to Local, Review, Open GitHub -->
  <div class="flex items-center gap-2 shrink-0">
    <!-- AI Review PR Button -->
    <button
      onclick={onAIReview}
      disabled={isGeneratingReview || prFilesCount === 0}
      class="px-2.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 dark:hover:bg-violet-900/60 border border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
      title="Sử dụng FlowGit AI phân tích nhanh các rủi ro và thay đổi trong PR này"
    >
      {#if isGeneratingReview}
        <Loader2 class="w-3.5 h-3.5 animate-spin" />
        <span>AI đang review...</span>
      {:else}
        <Sparkles class="w-3.5 h-3.5" />
        <span>✨ AI Review PR</span>
      {/if}
    </button>

    {#if canCheckout}
      <button
        onclick={onCheckout}
        class="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        title="Tải nhánh PR này về máy để chạy và kiểm thử độc lập"
      >
        <Download class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        <span>Checkout to Local</span>
      </button>
    {/if}

    {#if selectedPR.state === 'open'}
      <button
        onclick={onOpenMergeModal}
        class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
        title="Hợp nhất Pull Request vào nhánh chính"
      >
        <GitMerge class="w-3.5 h-3.5" />
        <span>Merge</span>
      </button>

      <button
        onclick={onOpenReviewModal}
        class="px-3 py-1.5 rounded-lg bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
      >
        <CheckCircle2 class="w-3.5 h-3.5" />
        <span>Submit Review</span>
      </button>

      <button
        onclick={onOpenCloseModal}
        disabled={isTogglingPRState}
        class="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-zinc-200 dark:border-zinc-700 hover:border-rose-300 dark:hover:border-rose-800/60 text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
        title="Đóng Pull Request này mà không hợp nhất (Close PR)"
      >
        <XCircle class="w-3.5 h-3.5 text-rose-500/80" />
        <span>Đóng PR</span>
      </button>
    {:else}
      {#if !selectedPR.merged}
        <button
          onclick={onReopenPR}
          disabled={isTogglingPRState}
          class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
          title="Mở lại Pull Request đã đóng (Reopen PR)"
        >
          {#if isTogglingPRState}
            <Loader2 class="w-3.5 h-3.5 animate-spin" />
            <span>Đang mở lại...</span>
          {:else}
            <RotateCcw class="w-3.5 h-3.5" />
            <span>Mở lại PR</span>
          {/if}
        </button>
      {/if}

      <button
        onclick={onOpenReviewModal}
        class="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        title="Gửi bình luận vào PR đã đóng"
      >
        <MessageSquare class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
        <span>Thêm bình luận</span>
      </button>
    {/if}

    <a
      href={selectedPR.html_url}
      target="_blank"
      rel="noreferrer"
      class="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
      title="Mở trên GitHub.com"
    >
      <ExternalLink class="w-4 h-4" />
    </a>
  </div>
</div>
