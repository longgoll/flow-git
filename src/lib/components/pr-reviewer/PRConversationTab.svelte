<script lang="ts">
  import {
    Bot,
    User,
    Check,
    GitMerge,
    MessageSquare,
    Send,
    RefreshCw,
    XCircle,
    RotateCcw,
  } from 'lucide-svelte';
  import type { GitHubPRComment, GitHubPullRequest } from '../../types';
  import { formatRelativeTime } from '../../utils/timeUtils';
  import MarkdownViewer from '../MarkdownViewer.svelte';

  interface Props {
    selectedPR: GitHubPullRequest;
    prComments: GitHubPRComment[];
    aiReviewResult: string | null;
    quickCommentText: string;
    isPostingQuickComment: boolean;
    isTogglingPRState?: boolean;
    onCloseAIReview: () => void;
    onOpenMergeModal: () => void;
    onPostQuickComment: () => void;
    onOpenCloseModal?: () => void;
    onCloseWithComment?: () => void;
    onReopenPR?: () => void;
  }

  let {
    selectedPR,
    prComments = [],
    aiReviewResult = null,
    quickCommentText = $bindable(''),
    isPostingQuickComment = false,
    isTogglingPRState = false,
    onCloseAIReview,
    onOpenMergeModal,
    onPostQuickComment,
    onOpenCloseModal,
    onCloseWithComment,
    onReopenPR,
  }: Props = $props();
</script>

<div class="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl">
  <!-- AI Code Review Banner (if generated) -->
  {#if aiReviewResult}
    <div class="p-4 rounded-xl bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 shadow-xs space-y-2.5 animate-in fade-in duration-200">
      <div class="flex items-center justify-between border-b border-violet-200/60 dark:border-violet-800/40 pb-2">
        <div class="flex items-center gap-2 text-xs font-bold text-violet-900 dark:text-violet-200">
          <Bot class="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span>FlowGit AI Reviewer</span>
        </div>
        <button
          type="button"
          onclick={onCloseAIReview}
          class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer"
        >
          Đóng
        </button>
      </div>
      <MarkdownViewer content={aiReviewResult} />
    </div>
  {/if}

  <!-- Author PR Description Card -->
  <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2">
    <div class="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800/60 pb-2">
      <div class="flex items-center gap-2">
        <User class="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
        <span class="font-medium text-zinc-900 dark:text-zinc-200">{selectedPR.user.login}</span>
        <span>đã mở PR này</span>
      </div>
      <span class="text-[11px] text-zinc-400">{formatRelativeTime(selectedPR.created_at)}</span>
    </div>
    <div class="pt-1 select-text">
      <MarkdownViewer content={selectedPR.body || 'Không có mô tả chi tiết.'} />
    </div>
  </div>

  <!-- Comments Timeline -->
  {#if prComments.length > 0}
    <div class="space-y-3 pt-2">
      <h3 class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        Thảo luận & Nhận xét ({prComments.length})
      </h3>
      {#each prComments as comment (comment.id)}
        <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-1.5 select-text">
          <div class="flex items-center justify-between text-xs">
            <span class="font-medium text-cyan-700 dark:text-cyan-300">@{comment.user.login}</span>
            <div class="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
              {#if comment.path && comment.line}
                <span>{comment.path}:{comment.line}</span>
                <span>•</span>
              {/if}
              <span>{formatRelativeTime(comment.created_at)}</span>
            </div>
          </div>
          <div class="pt-1">
            <MarkdownViewer content={comment.body} />
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- GitHub Merge Pull Request Card -->
  {#if selectedPR.state === 'open'}
    <div class="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-xs space-y-3 mt-4">
      <div class="flex items-start gap-3">
        <div class="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5">
          <Check class="w-4 h-4 stroke-[3]" />
        </div>
        <div class="space-y-0.5 flex-1">
          <div class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            No conflicts with base branch ({selectedPR.base.ref})
          </div>
          <div class="text-[11px] text-zinc-500 dark:text-zinc-400">
            Merging can be performed automatically on GitHub.
          </div>
        </div>
      </div>

      <div class="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={onOpenMergeModal}
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md hover:shadow-emerald-500/20 cursor-pointer active:scale-98"
          >
            <GitMerge class="w-4 h-4" />
            <span>Merge pull request</span>
          </button>
          <button
            type="button"
            onclick={onOpenCloseModal}
            disabled={isTogglingPRState}
            class="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700/80 hover:border-rose-300 dark:hover:border-rose-800/60 bg-white dark:bg-zinc-850 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <XCircle class="w-4 h-4 text-rose-500/80" />
            <span>Đóng PR</span>
          </button>
        </div>
        <span class="text-[11px] text-zinc-400">
          Sẵn sàng hợp nhất {selectedPR.head.ref} vào {selectedPR.base.ref}
        </span>
      </div>
    </div>
  {:else if selectedPR.merged}
    <div class="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 flex items-center gap-3 mt-4">
      <div class="p-2 rounded-full bg-purple-100 dark:bg-purple-900/70 text-purple-700 dark:text-purple-300">
        <GitMerge class="w-4 h-4 stroke-[2.5]" />
      </div>
      <div>
        <div class="text-xs font-bold text-purple-900 dark:text-purple-200">
          Pull Request #{selectedPR.number} đã được Merge thành công
        </div>
        <div class="text-[11px] text-purple-700/80 dark:text-purple-400/80">
          Toàn bộ thay đổi đã được tích hợp vào nhánh {selectedPR.base.ref}.
        </div>
      </div>
    </div>
  {:else}
    <!-- Closed PR Card without Merge -->
    <div class="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 flex items-center justify-between gap-3 mt-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-full bg-rose-100 dark:bg-rose-900/70 text-rose-600 dark:text-rose-400">
          <XCircle class="w-4 h-4 stroke-[2.5]" />
        </div>
        <div>
          <div class="text-xs font-bold text-rose-900 dark:text-rose-200">
            Pull Request #{selectedPR.number} đã bị đóng (Closed)
          </div>
          <div class="text-[11px] text-rose-700/80 dark:text-rose-400/80">
            Các thay đổi chưa được hợp nhất vào nhánh {selectedPR.base.ref}.
          </div>
        </div>
      </div>
      <button
        type="button"
        onclick={onReopenPR}
        disabled={isTogglingPRState}
        class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98 disabled:opacity-50 shrink-0"
      >
        {#if isTogglingPRState}
          <RefreshCw class="w-3.5 h-3.5 animate-spin" />
          <span>Đang mở lại...</span>
        {:else}
          <RotateCcw class="w-3.5 h-3.5" />
          <span>Mở lại PR</span>
        {/if}
      </button>
    </div>
  {/if}

  <!-- Quick Comment Box directly at bottom of conversation -->
  <div class="p-4 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2.5 mt-4">
    <div class="flex items-center justify-between text-xs">
      <span class="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
        <MessageSquare class="w-3.5 h-3.5 text-violet-500" />
        <span>Viết bình luận nhanh</span>
      </span>
      <span class="text-[11px] text-zinc-400 font-mono">Ctrl + Enter để gửi</span>
    </div>
    <textarea
      bind:value={quickCommentText}
      onkeydown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          onPostQuickComment();
        }
      }}
      rows={3}
      placeholder="Nhập nhận xét hoặc phản hồi của bạn về PR này..."
      class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none font-sans"
    ></textarea>
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div>
        {#if selectedPR.state === 'open'}
          <button
            type="button"
            onclick={onCloseWithComment}
            disabled={isTogglingPRState}
            class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-rose-300 dark:hover:border-rose-800 bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-700 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Đóng Pull Request này kèm bình luận"
          >
            <XCircle class="w-3.5 h-3.5 text-rose-500/80" />
            <span>{quickCommentText.trim() ? 'Đóng với bình luận' : 'Đóng PR'}</span>
          </button>
        {:else if !selectedPR.merged}
          <button
            type="button"
            onclick={onReopenPR}
            disabled={isTogglingPRState}
            class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-800 bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Mở lại Pull Request này kèm bình luận"
          >
            <RotateCcw class="w-3.5 h-3.5 text-emerald-500" />
            <span>{quickCommentText.trim() ? 'Mở lại & Bình luận' : 'Mở lại PR'}</span>
          </button>
        {/if}
      </div>

      <button
        type="button"
        onclick={onPostQuickComment}
        disabled={isPostingQuickComment || !quickCommentText.trim()}
        class="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
      >
        {#if isPostingQuickComment}
          <RefreshCw class="w-3.5 h-3.5 animate-spin" />
          <span>Đang gửi...</span>
        {:else}
          <Send class="w-3.5 h-3.5" />
          <span>Gửi bình luận</span>
        {/if}
      </button>
    </div>
  </div>
</div>
