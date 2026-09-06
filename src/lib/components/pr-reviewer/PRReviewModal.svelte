<script lang="ts">
  import { CheckCircle2, X, MessageCircle, Check, ShieldAlert } from 'lucide-svelte';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    isOpen: boolean;
    isOwnPR: boolean;
    reviewEvent: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
    reviewBody: string;
    isSubmittingReview: boolean;
    onClose: () => void;
    onSubmit: () => void;
  }

  let {
    isOpen,
    isOwnPR,
    reviewEvent = $bindable('COMMENT'),
    reviewBody = $bindable(''),
    isSubmittingReview,
    onClose,
    onSubmit,
  }: Props = $props();
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="w-full max-w-lg bg-white dark:bg-zinc-950 border border-violet-300 dark:border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
      <div class="px-6 py-4 bg-zinc-100/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 text-violet-600 dark:text-violet-400" />
          {localeState.t('pullRequest.reviewer.reviewModal.submitTitle')}
        </h2>
        <button
          onclick={onClose}
          class="p-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-4">
        {#if isOwnPR}
          <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs">
            {localeState.t('pullRequest.reviewer.reviewModal.ownPRNotice')}
          </div>
        {/if}

        <!-- Review Action Type -->
        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            onclick={() => (reviewEvent = 'COMMENT')}
            class="p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex flex-col items-center gap-1 {reviewEvent === 'COMMENT' ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}"
          >
            <MessageCircle class="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>{localeState.t('pullRequest.reviewer.reviewModal.commentType')}</span>
          </button>
          <button
            type="button"
            disabled={isOwnPR}
            onclick={() => (reviewEvent = 'APPROVE')}
            title={isOwnPR ? localeState.t('pullRequest.reviewer.reviewModal.ownPRApproveTooltip') : localeState.t('pullRequest.reviewer.reviewModal.approveTooltip')}
            class="p-2.5 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-1 {isOwnPR ? 'opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800 text-zinc-400' : 'cursor-pointer'} {reviewEvent === 'APPROVE' && !isOwnPR ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}"
          >
            <Check class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{localeState.t('pullRequest.reviewer.reviewModal.approveType')}</span>
          </button>
          <button
            type="button"
            disabled={isOwnPR}
            onclick={() => (reviewEvent = 'REQUEST_CHANGES')}
            title={isOwnPR ? localeState.t('pullRequest.reviewer.reviewModal.ownPRRequestChangesTooltip') : localeState.t('pullRequest.reviewer.reviewModal.requestChangesTooltip')}
            class="p-2.5 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-1 {isOwnPR ? 'opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800 text-zinc-400' : 'cursor-pointer'} {reviewEvent === 'REQUEST_CHANGES' && !isOwnPR ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}"
          >
            <ShieldAlert class="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{localeState.t('pullRequest.reviewer.reviewModal.requestChangesType')}</span>
          </button>
        </div>

        <!-- Summary comment -->
        <div class="space-y-1.5">
          <label for="review-summary" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {localeState.t('pullRequest.reviewer.reviewModal.reviewSummaryLabel')}
          </label>
          <textarea
            id="review-summary"
            bind:value={reviewBody}
            placeholder={localeState.t('pullRequest.reviewer.reviewModal.reviewSummaryPlaceholder')}
            rows={3}
            class="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none font-sans"
          ></textarea>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onclick={onClose}
            class="px-4 py-2 rounded-xl text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
          >
            {localeState.t('pullRequest.reviewer.reviewModal.cancel')}
          </button>
          <button
            type="button"
            onclick={onSubmit}
            disabled={isSubmittingReview}
            class="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSubmittingReview ? localeState.t('pullRequest.reviewer.reviewModal.submitting') : localeState.t('pullRequest.reviewer.reviewModal.submitBtn')}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
