<script lang="ts">
  import { ShieldAlert, AlertTriangle, Package, X, CheckCircle, ArrowRight } from 'lucide-svelte';

  export interface RiskyFileItem {
    path: string;
    type: 'secret' | 'large_binary';
    reason: string;
  }

  interface Props {
    riskyFiles: RiskyFileItem[];
    onConfirmCommit: () => void;
    onUnstageRisky: (files: string[]) => void;
    onCancel: () => void;
  }

  let { riskyFiles, onConfirmCommit, onUnstageRisky, onCancel }: Props = $props();
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none"
  role="dialog"
  aria-modal="true"
>
  <div
    class="w-full max-w-xl bg-white dark:bg-zinc-950 border border-amber-300 dark:border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-950/20 overflow-hidden flex flex-col font-sans text-zinc-900 dark:text-zinc-100"
  >
    <!-- Modal Header -->
    <div class="px-6 py-4 bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-950/60 dark:to-rose-950/40 border-b border-amber-200 dark:border-amber-500/20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-600 dark:text-amber-400">
          <ShieldAlert class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Phát hiện Tệp Rủi ro Trước khi Commit
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
              {riskyFiles.length} tệp
            </span>
          </h2>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Các tệp dưới đây có thể chứa thông tin bí mật hoặc định dạng tệp lớn không nên lưu trực tiếp vào Git history.
          </p>
        </div>
      </div>
      <button
        type="button"
        onclick={onCancel}
        class="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Risky Files List -->
    <div class="p-6 max-h-80 overflow-y-auto space-y-2.5">
      {#each riskyFiles as item}
        <div class="flex items-start justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border {item.type === 'secret' ? 'border-rose-200 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-700/60' : 'border-amber-200 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700/60'} transition-colors">
          <div class="flex items-start gap-2.5 min-w-0">
            {#if item.type === 'secret'}
              <div class="mt-0.5 p-1 rounded-md bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400">
                <AlertTriangle class="w-3.5 h-3.5" />
              </div>
            {:else}
              <div class="mt-0.5 p-1 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400">
                <Package class="w-3.5 h-3.5" />
              </div>
            {/if}

            <div class="min-w-0">
              <span class="font-mono text-xs text-zinc-900 dark:text-zinc-100 font-medium truncate block select-text" title={item.path}>
                {item.path}
              </span>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {item.reason}
              </p>
            </div>
          </div>

          <span class="px-2 py-0.5 rounded text-[10px] font-mono shrink-0 {item.type === 'secret' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 font-semibold' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 font-semibold'}">
            {item.type === 'secret' ? 'Bí mật / Token' : 'File nhị phân'}
          </span>
        </div>
      {/each}

      <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2.5">
        <CheckCircle class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>
          <strong>Lời khuyên an toàn:</strong> Bấm <strong class="text-emerald-700 dark:text-emerald-300">"Bỏ Stage các tệp này"</strong> để loại chúng ra khỏi commit hiện tại mà không làm mất nội dung trên máy của bạn.
        </span>
      </div>
    </div>

    <!-- Actions Footer -->
    <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
      <button
        type="button"
        onclick={onCancel}
        class="px-3.5 py-1.5 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        Hủy bỏ
      </button>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={onConfirmCommit}
          class="px-3.5 py-1.5 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-700/60 transition-colors cursor-pointer"
          title="Bỏ qua cảnh báo và tiếp tục commit các tệp này"
        >
          Vẫn Commit (Bypass)
        </button>

        <button
          type="button"
          onclick={() => onUnstageRisky(riskyFiles.map((f) => f.path))}
          class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
        >
          <span>Bỏ Stage {riskyFiles.length} tệp rủi ro</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</div>
