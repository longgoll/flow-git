<script lang="ts">
  import { AlertOctagon, Trash2, ShieldAlert, X, ArrowRight } from 'lucide-svelte';

  interface Props {
    isOpen: boolean;
    filePath: string;
    onConfirm: (filePath: string) => Promise<void>;
    onClose: () => void;
  }

  let { isOpen, filePath, onConfirm, onClose }: Props = $props();

  let confirmedRisk = $state(false);
  let isNuking = $state(false);
  let errorMsg = $state('');

  async function handleNuke() {
    if (!confirmedRisk || isNuking || !filePath.trim()) return;
    try {
      isNuking = true;
      errorMsg = '';
      await onConfirm(filePath.trim());
      onClose();
    } catch (err: any) {
      errorMsg = err?.message || String(err);
    } finally {
      isNuking = false;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="w-full max-w-lg bg-white dark:bg-zinc-950 border border-rose-300 dark:border-rose-600/50 rounded-2xl shadow-2xl shadow-rose-950/20 overflow-hidden flex flex-col font-sans text-zinc-900 dark:text-zinc-100"
    >
      <!-- Header -->
      <div class="px-6 py-4 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/80 dark:to-red-950/50 border-b border-rose-200 dark:border-rose-600/30 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-rose-100 dark:bg-rose-600/20 border border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400">
            <AlertOctagon class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-rose-950 dark:text-white flex items-center gap-2">
              Xóa Vĩnh Viễn Khỏi Lịch Sử Git (Nuke File)
            </h2>
            <p class="text-xs text-rose-700 dark:text-rose-300/80 mt-0.5">
              Xóa sạch dấu vết của tệp khỏi toàn bộ các commit trong quá khứ
            </p>
          </div>
        </div>
        <button
          type="button"
          onclick={onClose}
          disabled={isNuking}
          class="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-4 text-xs">
        <!-- Target File Path Card -->
        <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          <span class="text-zinc-600 dark:text-zinc-400">Tệp mục tiêu:</span>
          <span class="font-mono font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/60 break-all select-text">
            {filePath}
          </span>
        </div>

        <!-- Danger Explanation -->
        <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 space-y-2 leading-relaxed">
          <div class="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
            <ShieldAlert class="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>Lưu ý quan trọng trước khi thực hiện:</span>
          </div>
          <ul class="list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300 pl-1">
            <li>Lệnh này sẽ viết lại (rewrite) toàn bộ commit history của repo.</li>
            <li>Tệp <code class="text-rose-700 dark:text-rose-300 font-mono">{filePath}</code> sẽ biến mất hoàn toàn khỏi mọi commit cũ và mới.</li>
            <li>Tất cả các commit SHA sẽ bị thay đổi. Nếu đã push lên GitHub/GitLab, bạn sẽ phải thực hiện <strong>Force Push (`--force`)</strong>.</li>
          </ul>
        </div>

        {#if errorMsg}
          <div class="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300">
            {errorMsg}
          </div>
        {/if}

        <!-- Confirmation Checkbox -->
        <label class="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 cursor-pointer select-none">
          <input
            type="checkbox"
            bind:checked={confirmedRisk}
            disabled={isNuking}
            class="w-4 h-4 mt-0.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-rose-600 focus:ring-0 cursor-pointer"
          />
          <span class="text-zinc-700 dark:text-zinc-300 leading-snug">
            Tôi hiểu rằng thao tác này sẽ viết lại toàn bộ lịch sử Git và tôi đã sao lưu mã nguồn nếu cần.
          </span>
        </label>

        <!-- Actions -->
        <div class="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onclick={onClose}
            disabled={isNuking}
            class="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onclick={handleNuke}
            disabled={!confirmedRisk || isNuking}
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-900/30 active:scale-98 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {#if isNuking}
              <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Đang viết lại lịch sử Git...</span>
            {:else}
              <Trash2 class="w-4 h-4" />
              <span>Xóa Vĩnh Viễn (Nuke)</span>
              <ArrowRight class="w-3.5 h-3.5" />
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
