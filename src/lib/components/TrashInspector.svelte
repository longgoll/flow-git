<script lang="ts">
  import type { TrashSnapshotItem } from '../types';
  import {
    ShieldCheck,
    RotateCcw,
    Trash2,
    FileText,
    X,
    FolderArchive,
  } from 'lucide-svelte';


  interface Props {
    isOpen: boolean;
    snapshots: TrashSnapshotItem[];
    isLoading?: boolean;
    onClose: () => void;
    onRestore: (snapshotId: number) => Promise<void>;
    onDelete: (snapshotId: number) => Promise<void>;
  }

  let {
    isOpen,
    snapshots = [],
    isLoading = false,
    onClose,
    onRestore,
    onDelete,
  }: Props = $props();

  let selectedSnapshotId = $state<number | null>(null);

  $effect(() => {
    if (snapshots.length > 0 && selectedSnapshotId === null) {
      selectedSnapshotId = snapshots[0].id;
    }
  });

  let selectedSnapshot = $derived(
    snapshots.find((s) => s.id === selectedSnapshotId) || snapshots[0] || null
  );

  function formatRelativeTime(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, now - timestamp);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-6 select-none font-sans">
    <div class="w-full max-w-4xl h-[650px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100">
      <!-- Modal Header -->
      <div class="h-14 px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/60 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Safe Discard Trash Inspector
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 font-semibold">
                48h Auto-Protected
              </span>
            </h2>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              Every discarded file is safely snapshotted in embedded SQLite before deletion.
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Body (2 Columns) -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Left: List of Snapshots -->
        <div class="w-80 border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col bg-zinc-50/50 dark:bg-zinc-950/50">
          <div class="p-3 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <span class="font-semibold text-zinc-800 dark:text-zinc-300">Snapshots ({snapshots.length})</span>
            <span class="text-[10px] text-zinc-500 font-mono">Kept for 48 hours</span>
          </div>

          <div class="flex-1 overflow-y-auto p-2 space-y-1">
            {#if isLoading}
              <div class="h-48 flex items-center justify-center text-xs text-zinc-500">
                Loading snapshots...
              </div>
            {:else if snapshots.length === 0}
              <div class="h-48 flex flex-col items-center justify-center text-zinc-500 gap-2">
                <FolderArchive class="w-8 h-8 opacity-40" />
                <span class="text-xs">Trash is currently empty</span>
              </div>
            {:else}
              {#each snapshots as snap (snap.id)}
                <button
                  onclick={() => (selectedSnapshotId = snap.id)}
                  class="w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer {selectedSnapshotId === snap.id ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-700/50 shadow-xs' : 'bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/60 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300'}"
                >
                  <div class="flex items-center justify-between text-xs font-mono">
                    <span class="font-bold text-zinc-900 dark:text-zinc-200 truncate pr-2">{snap.file_path}</span>
                    <span class="text-[10px] text-zinc-500 shrink-0">{formatRelativeTime(snap.created_at)}</span>
                  </div>
                  <div class="mt-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span>{formatBytes(snap.file_size)}</span>
                    {#if snap.head_commit_sha}
                      <span class="font-mono text-[10px] text-zinc-500">{snap.head_commit_sha.slice(0, 7)}</span>
                    {/if}
                  </div>
                </button>
              {/each}
            {/if}
          </div>

        </div>

        <!-- Right: Snapshot Diff Preview & Restore Action -->
        <div class="flex-1 flex flex-col bg-white dark:bg-zinc-950">
          {#if selectedSnapshot}
            <!-- Preview Action Bar -->
            <div class="h-12 px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-2 font-mono text-xs text-zinc-800 dark:text-zinc-300 truncate">
                <FileText class="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span class="font-bold truncate select-text">{selectedSnapshot.file_path}</span>
                <span class="text-zinc-400 dark:text-zinc-500">•</span>
                <span class="text-zinc-500 dark:text-zinc-400 text-[11px]">{formatBytes(selectedSnapshot.file_size)}</span>
              </div>

              <div class="flex items-center gap-2">
                <button
                  onclick={() => onDelete(selectedSnapshot.id)}
                  class="p-1.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 border border-zinc-300 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs transition-colors cursor-pointer shadow-xs"
                  title="Permanently remove from trash"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>

                <button
                  onclick={() => onRestore(selectedSnapshot.id)}
                  class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  <span>1-Click Restore</span>
                </button>
              </div>
            </div>

            <!-- Preview Text / Diff -->
            <div class="flex-1 p-4 overflow-auto font-mono text-xs text-zinc-800 dark:text-zinc-300 bg-zinc-50/70 dark:bg-zinc-950/90 whitespace-pre select-text">
              {selectedSnapshot.diff_preview}
            </div>
          {:else}
            <div class="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <ShieldCheck class="w-12 h-12 text-emerald-500 opacity-20" />
              <p class="text-xs text-zinc-500">No snapshot selected</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
