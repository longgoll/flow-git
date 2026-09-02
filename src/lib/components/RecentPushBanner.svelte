<script lang="ts">
  import { GitBranch, X, GitPullRequest } from 'lucide-svelte';

  interface Props {
    pushedBranch: string | null;
    targetBranch?: string;
    onCompareAndPR: (branch: string) => void;
    onDismiss: () => void;
  }

  let {
    pushedBranch = null,
    targetBranch = 'main',
    onCompareAndPR,
    onDismiss,
  }: Props = $props();
</script>

{#if pushedBranch}
  <div
    class="w-full bg-amber-50 dark:bg-amber-950/80 border-b border-amber-300 dark:border-amber-700/60 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs z-20 animate-in slide-in-from-top duration-200 font-sans"
  >
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="p-1 rounded-md bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0">
        <GitBranch class="w-3.5 h-3.5" />
      </div>
      <div class="truncate text-zinc-800 dark:text-zinc-200">
        Nhánh <code class="font-mono text-amber-900 dark:text-amber-300 font-bold bg-amber-100/80 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">{pushedBranch}</code> vừa có commit mới được push lên remote.
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <button
        onclick={() => onCompareAndPR(pushedBranch)}
        class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
        title="Tạo Pull Request từ {pushedBranch} vào {targetBranch}"
      >
        <GitPullRequest class="w-3.5 h-3.5" />
        <span>Compare & pull request</span>
      </button>
      <button
        onclick={onDismiss}
        class="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
        title="Bỏ qua (Dismiss)"
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
{/if}
