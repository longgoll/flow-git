<script lang="ts">
  import type { CommitDetail } from '../types';
  import {
    Copy,
    Check,
    GitCommit,
    User,
    Clock,
    FileCode,
    FilePlus,
    FileEdit,
    FileX,
    Maximize2,
    Minimize2,
    X,
  } from 'lucide-svelte';

  interface Props {
    commitDetail: CommitDetail | null;
    isLoading: boolean;
    isMaximized?: boolean;
    onToggleMaximize?: () => void;
    onClose?: () => void;
    onSelectParent?: (parentId: string) => void;
    onSelectFile?: (filePath: string) => void;
  }

  let {
    commitDetail,
    isLoading = false,
    isMaximized = false,
    onToggleMaximize,
    onClose,
    onSelectParent,
    onSelectFile,
  }: Props = $props();

  let copied = $state(false);

  function copyHash() {
    if (!commitDetail) return;
    navigator.clipboard.writeText(commitDetail.id);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }
  let summary = $derived(commitDetail?.message?.split('\n')[0] || '');
  let description = $derived(
    commitDetail?.message
      ? commitDetail.message.split('\n').slice(1).join('\n').trim()
      : ''
  );

  function getStatusStyle(status: string) {
    switch (status.toLowerCase()) {
      case 'added':
        return 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80';
      case 'deleted':
        return 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/80';
      case 'renamed':
        return 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/80';
      default:
        return 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80';
    }
  }
</script>

<div class="h-full bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col font-sans overflow-hidden text-zinc-900 dark:text-zinc-100 select-none">
  {#if isLoading}
    <div class="h-full flex items-center justify-center text-zinc-500 text-xs gap-2">
      <div class="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
      <span>Loading commit details...</span>
    </div>
  {:else if commitDetail}
    <!-- Detail Header Bar -->
    <div class="px-3.5 py-2 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between bg-zinc-100/60 dark:bg-zinc-900/40 gap-3 shrink-0">
      <div class="flex items-center gap-3 flex-wrap min-w-0 flex-1">
        <!-- Hash pill -->
        <button
          onclick={copyHash}
          class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-mono text-[11px] transition-colors cursor-pointer group shadow-xs"
          title="Click to copy full commit SHA"
        >
          <GitCommit class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
          <span>{commitDetail.short_id}</span>
          {#if copied}
            <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          {:else}
            <Copy class="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
          {/if}
        </button>

        {#if commitDetail.parents.length > 0}
          <div class="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
            <span>parents:</span>
            {#each commitDetail.parents as parent}
              <button
                onclick={() => onSelectParent?.(parent)}
                class="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 border border-zinc-200 dark:border-zinc-800/80 text-[10px] cursor-pointer font-mono"
              >
                {parent.slice(0, 7)}
              </button>
            {/each}
          </div>
        {/if}

        <!-- Author & Date inline -->
        <div class="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 border-l border-zinc-200 dark:border-zinc-800/60 pl-3">
          <div class="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-300">
            <User class="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
            <span class="font-medium text-[11px]">{commitDetail.author_name}</span>
            <span class="text-zinc-500 text-[10px] font-mono hidden xl:inline">&lt;{commitDetail.author_email}&gt;</span>
          </div>

          <div class="flex items-center gap-1 text-zinc-500 text-[11px] font-mono hidden sm:flex">
            <Clock class="w-3 h-3" />
            <span>{formatDate(commitDetail.author_timestamp)}</span>
          </div>
        </div>
      </div>

      <!-- Window Actions (Maximize / Close) -->
      <div class="flex items-center gap-1 shrink-0">
        {#if onToggleMaximize}
          <button
            onclick={onToggleMaximize}
            class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title={isMaximized ? 'Thu nhỏ panel chi tiết' : 'Mở rộng panel chi tiết'}
          >
            {#if isMaximized}
              <Minimize2 class="w-3.5 h-3.5" />
            {:else}
              <Maximize2 class="w-3.5 h-3.5" />
            {/if}
          </button>
        {/if}

        {#if onClose}
          <button
            onclick={onClose}
            class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Đóng panel chi tiết commit"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>
    </div>

    <!-- Main Content: Message & Changed Files Split -->
    <div class="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800/60 overflow-hidden">
      <!-- Commit Message -->
      <div class="p-3.5 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Commit Message</h4>
        <div class="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug select-text">
          {summary}
        </div>
        {#if description}
          <div class="mt-2 text-xs text-zinc-600 dark:text-zinc-400 font-sans whitespace-pre-wrap leading-relaxed select-text border-t border-zinc-200/60 dark:border-zinc-800/60 pt-2">
            {description}
          </div>
        {/if}
      </div>

      <!-- Changed Files -->
      <div class="p-3.5 overflow-y-auto flex flex-col bg-zinc-50/50 dark:bg-zinc-950">
        <div class="flex items-center justify-between mb-2 shrink-0">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Files Changed ({commitDetail.files_changed.length})
          </h4>
        </div>

        <div class="space-y-1 overflow-y-auto flex-1 pr-1">
          {#each commitDetail.files_changed as file}
            <button
              onclick={() => onSelectFile?.(file.path)}
              class="w-full flex items-center justify-between p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-900 text-xs font-mono group transition-colors text-left cursor-pointer border border-transparent hover:border-zinc-300 dark:hover:border-zinc-800"
              title="Nhấp để xem toàn bộ mã nguồn của file này"
            >
              <div class="flex items-center gap-2 truncate pr-2">
                {#if file.status === 'added'}
                  <FilePlus class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {:else if file.status === 'deleted'}
                  <FileX class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                {:else if file.status === 'renamed'}
                  <FileCode class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                {:else}
                  <FileEdit class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                {/if}
                <span class="text-zinc-700 dark:text-zinc-300 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors truncate text-xs">{file.path}</span>
              </div>

              <span class="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded border {getStatusStyle(file.status)}">
                {file.status}
              </span>
            </button>
          {/each}
          {#if commitDetail.files_changed.length === 0}
            <div class="text-xs text-zinc-400 dark:text-zinc-600 italic">No file changes detected</div>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-xs font-sans">
      Select a commit on the graph to inspect its details and changed files
    </div>
  {/if}
</div>
