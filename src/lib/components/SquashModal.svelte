<script lang="ts">
  import { Layers, X, ShieldCheck } from 'lucide-svelte';
  import type { CommitNode } from '../types';

  interface Props {
    isOpen: boolean;
    commits: CommitNode[];
    isLoading?: boolean;
    onClose: () => void;
    onConfirmSquash: (commitIds: string[], message: string) => Promise<void>;
  }

  let {
    isOpen = false,
    commits = [],
    isLoading = false,
    onClose,
    onConfirmSquash,
  }: Props = $props();

  let squashMessage = $state('');

  $effect(() => {
    if (isOpen && commits.length > 0) {
      // Auto-combine messages
      squashMessage = commits
        .map((c) => c.summary.trim())
        .filter(Boolean)
        .join('\n\n');
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!squashMessage.trim() || commits.length < 2 || isLoading) return;
    const commitIds = commits.map((c) => c.id);
    await onConfirmSquash(commitIds, squashMessage.trim());
  }
</script>

{#if isOpen && commits.length >= 2}
  <div
    class="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-200 font-sans"
    >
      <!-- Header -->
      <div class="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
        <div class="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <Layers class="w-4 h-4" />
          <span>Gộp {commits.length} commits thành 1 (Squash Commits)</span>
        </div>
        <button
          onclick={onClose}
          class="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Form Content -->
      <form onsubmit={handleSubmit} class="p-5 space-y-4">
        <!-- Commits List Preview -->
        <div class="space-y-1.5">
          <div class="block text-xs font-semibold text-zinc-400">
            Các commit sẽ được gộp lại:
          </div>
          <div class="max-h-36 overflow-y-auto space-y-1 p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
            {#each commits as c}
              <div class="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                <span class="font-mono text-cyan-400 font-bold text-[11px] shrink-0 mr-2">{c.short_id}</span>
                <span class="truncate flex-1 text-zinc-300">{c.summary}</span>
                <span class="text-[10px] text-zinc-500 ml-2 shrink-0">{c.author_name}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Combined Message Editor -->
        <div class="space-y-1.5">
          <label for="squash-msg" class="block text-xs font-semibold text-zinc-300">
            Commit Message gộp cuối cùng: <span class="text-rose-400">*</span>
          </label>
          <textarea
            id="squash-msg"
            bind:value={squashMessage}
            rows="5"
            class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 leading-relaxed font-mono"
            required
            placeholder="Nhập commit message mới cho commit sau khi gộp..."
          ></textarea>
        </div>

        <!-- Safety Notice -->
        <div class="p-3 rounded-xl bg-amber-950/20 border border-amber-800/30 flex items-start gap-2.5 text-xs text-amber-300/90">
          <ShieldCheck class="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p class="leading-relaxed text-[11px]">
            Thao tác gộp sẽ thay thế {commits.length} commit bằng 1 commit mới. Mọi thứ được ghi nhận vào Time Machine để bạn có thể hoàn tác <kbd class="px-1 py-0.5 rounded bg-amber-900/40 font-mono text-amber-200">Ctrl + Z</kbd> bất kỳ lúc nào.
          </p>
        </div>

        <!-- Footer Actions -->
        <div class="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onclick={onClose}
            class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={!squashMessage.trim() || isLoading}
            class="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20"
          >
            {isLoading ? 'Đang gộp...' : 'Xác nhận gộp (Squash)'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
