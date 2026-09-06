<script lang="ts">
  import { XCircle, X, RefreshCw, AlertCircle } from 'lucide-svelte';
  import type { GitHubPullRequest } from '../../types';

  interface Props {
    isOpen: boolean;
    selectedPR: GitHubPullRequest | null;
    isClosing: boolean;
    onClose: () => void;
    onConfirm: (comment: string) => void;
  }

  let {
    isOpen,
    selectedPR,
    isClosing,
    onClose,
    onConfirm,
  }: Props = $props();

  let closeComment = $state('');

  // Reset comment when modal opens
  $effect(() => {
    if (isOpen) {
      closeComment = '';
    }
  });

  function handleSubmit() {
    onConfirm(closeComment);
  }
</script>

{#if isOpen && selectedPR}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    onclick={onClose}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="w-full max-w-md bg-white dark:bg-zinc-900 border border-rose-300 dark:border-rose-900/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-150"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="px-5 py-4 bg-rose-50/50 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900/40 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400">
            <XCircle class="w-4 h-4" />
          </div>
          <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Đóng Pull Request #{selectedPR.number}
          </h2>
        </div>
        <button
          onclick={onClose}
          class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-5 space-y-4">
        <!-- PR Summary Card -->
        <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-1">
          <div class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
            {selectedPR.title}
          </div>
          <div class="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-mono">
            <span>{selectedPR.head.ref}</span>
            <span>&rarr;</span>
            <span>{selectedPR.base.ref}</span>
          </div>
        </div>

        <!-- Warning info -->
        <div class="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs">
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div class="leading-relaxed text-[11.5px]">
            Pull Request này sẽ bị đóng lại mà không hợp nhất vào nhánh chính. Bạn hoặc tác giả có thể mở lại bất cứ lúc nào.
          </div>
        </div>

        <!-- Optional Comment -->
        <div class="space-y-1.5">
          <label for="close-comment" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Lý do hoặc nhận xét đóng PR (không bắt buộc)
          </label>
          <textarea
            id="close-comment"
            bind:value={closeComment}
            placeholder="Ví dụ: Đã giải quyết ở PR khác, hoặc tính năng bị hủy bỏ..."
            rows={3}
            class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none font-sans"
          ></textarea>
        </div>
      </div>

      <div class="px-5 py-3.5 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
        <button
          type="button"
          onclick={onClose}
          disabled={isClosing}
          class="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          onclick={handleSubmit}
          disabled={isClosing}
          class="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md hover:shadow-rose-500/20 cursor-pointer disabled:opacity-50 active:scale-98"
        >
          {#if isClosing}
            <RefreshCw class="w-3.5 h-3.5 animate-spin" />
            <span>Đang đóng PR...</span>
          {:else}
            <XCircle class="w-3.5 h-3.5" />
            <span>{closeComment.trim() ? 'Đóng với bình luận' : 'Đóng Pull Request'}</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
