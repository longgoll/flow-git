<script lang="ts">
  import type { CurrentRepoIdentity, RepoSummary } from '../types';
  import { CheckCircle, ShieldCheck, AlertTriangle, UserCheck } from 'lucide-svelte';

  interface Props {
    statusMessage: string;
    repoSummary: RepoSummary | null;
    visibleCommitsCount: number;
    dirtyFilesCount: number;
    stagedFilesCount: number;
    currentIdentity?: CurrentRepoIdentity | null;
    onOpenTrash: () => void;
    onOpenIdentity?: () => void;
  }

  let {
    statusMessage,
    repoSummary,
    visibleCommitsCount,
    dirtyFilesCount,
    stagedFilesCount,
    currentIdentity = null,
    onOpenTrash,
    onOpenIdentity,
  }: Props = $props();
</script>

<footer class="h-7 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-100 dark:bg-zinc-950 px-3 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 font-mono select-none z-20 shrink-0">
  <div class="flex items-center gap-3 truncate">
    <div class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 shrink-0">
      <CheckCircle class="w-3 h-3 shrink-0" />
      <span class="truncate max-w-[500px]">{statusMessage}</span>
    </div>

    {#if repoSummary}
      <span class="text-zinc-300 dark:text-zinc-600">|</span>
      <span class="text-zinc-700 dark:text-zinc-400 font-semibold shrink-0">{visibleCommitsCount.toLocaleString()} commits</span>
      {#if repoSummary.is_detached}
        <span class="text-zinc-300 dark:text-zinc-600">|</span>
        <span class="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700/60 font-semibold flex items-center gap-1">
          <AlertTriangle class="w-3 h-3 text-amber-500 dark:text-amber-400" />
          <span>Detached HEAD</span>
        </span>
      {/if}
      {#if dirtyFilesCount > 0 || stagedFilesCount > 0}
        <span class="text-zinc-300 dark:text-zinc-600">|</span>
        <span class="text-amber-600 dark:text-amber-400 font-semibold shrink-0">{dirtyFilesCount} unstaged</span>
        <span class="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">{stagedFilesCount} staged</span>
      {/if}
    {/if}
  </div>

  <div class="flex items-center gap-4 text-zinc-500 shrink-0">
    <div class="flex items-center gap-1.5 hidden sm:flex">
      <span class="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">Ctrl+K</span>
      <span>Palette</span>
    </div>
    <div class="flex items-center gap-1.5 hidden sm:flex">
      <span class="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">Ctrl+Z</span>
      <span>Time Machine</span>
    </div>
    {#if currentIdentity?.name}
      <button
        onclick={onOpenIdentity}
        class="flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium cursor-pointer transition-colors"
        title={`Tác giả Git: ${currentIdentity.name} <${currentIdentity.email || ''}> (Nhấp để đổi)`}
      >
        <UserCheck class="w-3 h-3" />
        <span class="truncate max-w-[120px]">{currentIdentity.name}</span>
      </button>
    {/if}
    <button
      onclick={onOpenTrash}
      class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium cursor-pointer transition-colors"
    >
      <ShieldCheck class="w-3 h-3" />
      <span>Trash</span>
    </button>
  </div>
</footer>
