<script lang="ts">
  import { Trash2, X, Check, ShieldAlert, GitBranch } from 'lucide-svelte';

  interface Props {
    isOpen: boolean;
    mergedBranches: string[];
    isLoading?: boolean;
    onClose: () => void;
    onConfirmDelete: (branchesToDelete: string[]) => Promise<void>;
  }

  let {
    isOpen = false,
    mergedBranches = [],
    isLoading = false,
    onClose,
    onConfirmDelete,
  }: Props = $props();

  let selectedBranches = $state<string[]>([]);

  $effect(() => {
    if (isOpen) {
      selectedBranches = [...mergedBranches];
    }
  });

  function toggleBranch(name: string) {
    if (selectedBranches.includes(name)) {
      selectedBranches = selectedBranches.filter((b) => b !== name);
    } else {
      selectedBranches.push(name);
    }
  }

  function toggleAll() {
    if (selectedBranches.length === mergedBranches.length) {
      selectedBranches = [];
    } else {
      selectedBranches = [...mergedBranches];
    }
  }

  async function handleDelete() {
    if (selectedBranches.length === 0 || isLoading) return;
    await onConfirmDelete(selectedBranches);
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100 select-none"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-200 font-sans"
    >
      <!-- Header -->
      <div class="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/40">
        <div class="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
          <Trash2 class="w-4 h-4" />
          <span>Dọn dẹp các nhánh đã merge (Clean Merged Branches)</span>
        </div>
        <button
          onclick={onClose}
          class="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-5 space-y-4">
        <div class="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
          FlowGit đã phát hiện <strong class="text-zinc-900 dark:text-white">{mergedBranches.length}</strong> nhánh local đã được gộp hoàn toàn vào nhánh chính (<code class="text-cyan-700 dark:text-cyan-300 font-mono">main</code>/<code class="text-cyan-700 dark:text-cyan-300 font-mono">master</code>).
        </div>

        {#if mergedBranches.length === 0}
          <div class="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
            <GitBranch class="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <div class="text-xs font-bold text-emerald-700 dark:text-emerald-300">Không có nhánh rác!</div>
            <p class="text-[11px] text-zinc-500">Tất cả các nhánh local hiện tại đều chứa commit đang phát triển hoặc chưa merge.</p>
          </div>
        {:else}
          <!-- Selection List -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
              <button
                type="button"
                onclick={toggleAll}
                class="hover:text-zinc-900 dark:hover:text-white font-medium cursor-pointer"
              >
                {selectedBranches.length === mergedBranches.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
              <span class="text-[11px] font-mono">Đã chọn: {selectedBranches.length} / {mergedBranches.length}</span>
            </div>

            <div class="max-h-52 overflow-y-auto space-y-1 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              {#each mergedBranches as branch}
                <button
                  type="button"
                  onclick={() => toggleBranch(branch)}
                  class="w-full flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors {selectedBranches.includes(branch) ? 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-200' : 'bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/40 text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'}"
                >
                  <div class="flex items-center gap-2 font-mono truncate">
                    <GitBranch class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    <span>{branch}</span>
                  </div>
                  <div class="w-4 h-4 rounded border flex items-center justify-center shrink-0 {selectedBranches.includes(branch) ? 'bg-rose-500 border-rose-500 text-white' : 'border-zinc-300 dark:border-zinc-700'}">
                    {#if selectedBranches.includes(branch)}
                      <Check class="w-3 h-3" />
                    {/if}
                  </div>
                </button>
              {/each}
            </div>
          </div>

          <!-- Safe Note -->
          <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800/80 flex items-start gap-2.5 text-[11px] text-zinc-600 dark:text-zinc-400">
            <ShieldAlert class="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              Chỉ các nhánh đã được tích hợp trọn vẹn vào lịch sử của nhánh chính mới được xóa. Nhánh remote trên GitHub/GitLab vẫn được giữ nguyên.
            </span>
          </div>
        {/if}

        <!-- Actions -->
        <div class="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onclick={onClose}
            class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          {#if mergedBranches.length > 0}
            <button
              type="button"
              onclick={handleDelete}
              disabled={selectedBranches.length === 0 || isLoading}
              class="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-rose-600/20"
            >
              {isLoading ? 'Đang dọn...' : `Xóa ${selectedBranches.length} nhánh đã chọn`}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
