<script lang="ts">
  import { GitMerge, X, RefreshCw } from 'lucide-svelte';
  import type { GitHubPullRequest } from '../../types';

  interface Props {
    isOpen: boolean;
    selectedPR: GitHubPullRequest | null;
    mergeMethod: 'merge' | 'squash' | 'rebase';
    mergeCommitTitle: string;
    mergeCommitMessage: string;
    deleteBranchAfterMerge: boolean;
    isMerging: boolean;
    onClose: () => void;
    onConfirm: () => void;
  }

  let {
    isOpen,
    selectedPR,
    mergeMethod = $bindable('merge'),
    mergeCommitTitle = $bindable(''),
    mergeCommitMessage = $bindable(''),
    deleteBranchAfterMerge = $bindable(false),
    isMerging,
    onClose,
    onConfirm,
  }: Props = $props();
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
      class="w-full max-w-lg bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-150"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
            <GitMerge class="w-4 h-4" />
          </div>
          <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Hợp nhất Pull Request #{selectedPR.number}
          </h2>
        </div>
        <button
          onclick={onClose}
          class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs">
        <!-- Merge Method Selector -->
        <div class="space-y-1.5">
          <span class="font-semibold text-zinc-700 dark:text-zinc-300 block">Kiểu Merge:</span>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              onclick={() => (mergeMethod = 'merge')}
              class="p-2.5 rounded-xl border text-left cursor-pointer transition-all {mergeMethod === 'merge' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}"
            >
              <div class="font-semibold">Create Merge</div>
              <div class="text-[10px] opacity-75 font-normal">Giữ nguyên lịch sử</div>
            </button>
            <button
              type="button"
              onclick={() => (mergeMethod = 'squash')}
              class="p-2.5 rounded-xl border text-left cursor-pointer transition-all {mergeMethod === 'squash' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}"
            >
              <div class="font-semibold">Squash & Merge</div>
              <div class="text-[10px] opacity-75 font-normal">Gộp 1 commit</div>
            </button>
            <button
              type="button"
              onclick={() => (mergeMethod = 'rebase')}
              class="p-2.5 rounded-xl border text-left cursor-pointer transition-all {mergeMethod === 'rebase' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}"
            >
              <div class="font-semibold">Rebase & Merge</div>
              <div class="text-[10px] opacity-75 font-normal">Rebase nhánh</div>
            </button>
          </div>
        </div>

        <!-- Commit Title & Message -->
        <div class="space-y-1.5">
          <label for="merge-commit-title" class="font-semibold text-zinc-700 dark:text-zinc-300 block">
            Tiêu đề Commit Merge:
          </label>
          <input
            id="merge-commit-title"
            type="text"
            bind:value={mergeCommitTitle}
            class="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
          />
        </div>

        <div class="space-y-1.5">
          <label for="merge-commit-msg" class="font-semibold text-zinc-700 dark:text-zinc-300 block">
            Nội dung Commit Message:
          </label>
          <textarea
            id="merge-commit-msg"
            bind:value={mergeCommitMessage}
            rows="3"
            class="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden resize-none"
          ></textarea>
        </div>

        <!-- Delete Branch Checkbox -->
        <label class="flex items-center gap-2.5 cursor-pointer pt-1 select-none">
          <input
            type="checkbox"
            bind:checked={deleteBranchAfterMerge}
            class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <span class="text-zinc-700 dark:text-zinc-300">
            Tự động xóa nhánh remote <code class="text-emerald-700 dark:text-emerald-400 font-mono">{selectedPR.head.ref}</code> sau khi merge
          </span>
        </label>
      </div>

      <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="button"
          onclick={onConfirm}
          disabled={isMerging}
          class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 shadow-md hover:shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
        >
          {#if isMerging}
            <RefreshCw class="w-3.5 h-3.5 animate-spin" />
            <span>Đang merge...</span>
          {:else}
            <GitMerge class="w-3.5 h-3.5" />
            <span>Xác nhận Merge</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
