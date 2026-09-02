<script lang="ts">
  import type { FileHistoryItem } from '../types';
  import { getFileHistory } from '../api/diff';
  import {
    History,
    X,
    GitCommit,
    User,
    Calendar,
    RefreshCw,
  } from 'lucide-svelte';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    isOpen: boolean;
    repoPath: string;
    filePath: string | null;
    onClose: () => void;
    onSelectCommit?: (commitId: string) => void;
  }

  let { isOpen = false, repoPath = '', filePath = null, onClose, onSelectCommit }: Props = $props();

  let history = $state<FileHistoryItem[]>([]);
  let isLoading = $state<boolean>(false);

  $effect(() => {
    if (isOpen && repoPath && filePath) {
      loadHistory();
    }
  });

  async function loadHistory() {
    if (!repoPath || !filePath) return;
    isLoading = true;
    try {
      history = await getFileHistory(repoPath, filePath, 50);
    } catch (err: any) {
      console.error('Failed to load file history:', err);
      toast.error('Lỗi tải lịch sử file', err?.message || err);
    } finally {
      isLoading = false;
    }
  }

  function formatDate(timestamp: number): string {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function handleJumpToCommit(commitId: string) {
    onSelectCommit?.(commitId);
    onClose();
  }
</script>

{#if isOpen && filePath}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose();
    }}
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-inner">
            <History class="w-5 h-5" />
          </div>
          <div class="truncate max-w-md">
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Lịch sử chỉnh sửa tệp (File History)
            </h2>
            <p class="text-xs font-mono text-cyan-600 dark:text-cyan-400 truncate mt-0.5">
              {filePath}
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 max-h-[500px] overflow-y-auto space-y-3">
        {#if isLoading}
          <div class="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
            <RefreshCw class="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
            <span class="text-xs">Đang truy xuất các commit thay đổi tệp này...</span>
          </div>
        {:else if history.length === 0}
          <div class="py-12 text-center text-zinc-500 text-xs">
            Không tìm thấy commit nào thay đổi tệp này trong lịch sử nhánh hiện tại.
          </div>
        {:else}
          <div class="space-y-2">
            {#each history as item (item.commit_id)}
              <div
                class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-600/50 hover:bg-purple-50/20 dark:hover:bg-zinc-900/50 transition-all flex items-start justify-between gap-3 group"
              >
                <div class="space-y-1.5 flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/50">
                      {item.short_id}
                    </span>
                    <span class="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {item.summary || '(Không có thông điệp commit)'}
                    </span>
                  </div>

                  <div class="flex items-center gap-4 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                    <div class="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                      <User class="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                      <span>{item.author_name}</span>
                    </div>
                    <div class="flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                      <Calendar class="w-3 h-3 text-zinc-400 dark:text-zinc-600" />
                      <span>{formatDate(item.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <!-- Jump to commit button -->
                {#if onSelectCommit}
                  <button
                    onclick={() => handleJumpToCommit(item.commit_id)}
                    class="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-purple-50 dark:hover:bg-purple-950 hover:border-purple-300 dark:hover:border-purple-700/60 hover:text-purple-700 dark:hover:text-purple-300 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 mt-0.5 shadow-xs"
                    title="Xem commit này trên Living Graph"
                  >
                    <GitCommit class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Xem commit</span>
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
        <span class="text-[11px] text-zinc-500 font-mono">
          Hiển thị {history.length} commits gần nhất tác động tới tệp.
        </span>
        <button
          onclick={onClose}
          class="px-4 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer transition-colors border border-zinc-200 dark:border-transparent"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
{/if}
