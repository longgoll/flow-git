<script lang="ts">
  import {
    GitBranch,
    GitPullRequest,
    GitFork,
    Check,
    RefreshCw,
    Trash2,
    CloudUpload,
    Upload,
    Copy,
    Edit3,
    Plus,
  } from 'lucide-svelte';
  import type { BranchInfo, RepoSummary } from '../../types';

  interface Props {
    activeBranchMenu: { branch: BranchInfo; x: number; y: number } | null;
    repoSummary: RepoSummary | null;
    onClose: () => void;
    onSelectBranch?: (branch: BranchInfo) => void;
    onRebaseBranch?: (branch: BranchInfo) => void;
    onPublishBranch?: (branch: BranchInfo) => void;
    onPushBranch?: (branch: BranchInfo, force?: boolean) => void;
    onFetchBranch?: (branch: BranchInfo) => void;
    onCreatePullRequest?: (branch: BranchInfo) => void;
    onCreateBranchFrom?: (branch: BranchInfo) => void;
    onStartRename: (branch: BranchInfo) => void;
    onDeleteBranch?: (branch: BranchInfo) => void;
    isProtectedBranch: (branch: BranchInfo) => boolean;
  }

  let {
    activeBranchMenu,
    repoSummary,
    onClose,
    onSelectBranch,
    onRebaseBranch,
    onPublishBranch,
    onPushBranch,
    onFetchBranch,
    onCreatePullRequest,
    onCreateBranchFrom,
    onStartRename,
    onDeleteBranch,
    isProtectedBranch,
  }: Props = $props();
</script>

{#if activeBranchMenu}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 bg-transparent"
    onclick={onClose}
    oncontextmenu={(e) => { e.preventDefault(); onClose(); }}
  >
    <div
      class="fixed w-56 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl p-1 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100"
      style="left: {activeBranchMenu.x}px; top: {activeBranchMenu.y}px;"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="px-2.5 py-1.5 border-b border-zinc-200 dark:border-zinc-800/80 mb-1">
        <div class="font-mono text-[11px] font-bold text-zinc-900 dark:text-zinc-200 truncate flex items-center gap-1.5">
          <GitBranch class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span class="truncate">{activeBranchMenu.branch.shorthand}</span>
        </div>
        <div class="text-[10px] text-zinc-500 truncate mt-0.5">
          {activeBranchMenu.branch.upstream_name ? `Tracks: ${activeBranchMenu.branch.upstream_name}` : 'Local only (Chưa có trên remote)'}
        </div>
      </div>

      {#if !activeBranchMenu.branch.is_head}
        {#if onSelectBranch}
          <button
            onclick={() => {
              const b = activeBranchMenu?.branch;
              onClose();
              if (b) onSelectBranch(b);
            }}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
          >
            <Check class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Checkout nhánh này</span>
          </button>
        {/if}

        {#if onRebaseBranch}
          <button
            onclick={() => {
              const b = activeBranchMenu?.branch;
              onClose();
              if (b) onRebaseBranch(b);
            }}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 transition-colors cursor-pointer text-left font-medium"
            title="Rebase nhánh hiện tại ({repoSummary?.current_branch}) lên {activeBranchMenu.branch.shorthand}"
          >
            <GitFork class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span class="truncate">Rebase HEAD onto {activeBranchMenu.branch.shorthand}</span>
          </button>
        {/if}
      {/if}

      {#if !activeBranchMenu.branch.upstream_name}
        {#if onPublishBranch}
          <button
            onclick={() => {
              const b = activeBranchMenu?.branch;
              onClose();
              if (b) onPublishBranch(b);
            }}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-cyan-50 dark:hover:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 hover:text-cyan-950 dark:hover:text-cyan-100 transition-colors cursor-pointer text-left font-medium"
          >
            <CloudUpload class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Publish lên remote (origin)</span>
          </button>
        {/if}
      {:else}
        {#if onPushBranch}
          <button
            onclick={() => {
              const b = activeBranchMenu?.branch;
              onClose();
              if (b && b.ahead_count > 0) onPushBranch(b);
            }}
            disabled={activeBranchMenu.branch.ahead_count === 0}
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-colors text-left {activeBranchMenu.branch.ahead_count > 0 ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white cursor-pointer' : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-50'}"
            title={activeBranchMenu.branch.ahead_count > 0 ? `Push ${activeBranchMenu.branch.ahead_count} commit mới` : 'Đã đồng bộ mới nhất (0 commit ahead)'}
          >
            <div class="flex items-center gap-2">
              <Upload class="w-3.5 h-3.5 {activeBranchMenu.branch.ahead_count > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-600'}" />
              <span>Push lên {activeBranchMenu.branch.upstream_name}</span>
            </div>
            {#if activeBranchMenu.branch.ahead_count > 0}
              <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{activeBranchMenu.branch.ahead_count}</span>
            {:else}
              <span class="text-[9px] font-mono text-zinc-400 dark:text-zinc-600">Up to date</span>
            {/if}
          </button>
          <button
            onclick={() => {
              const b = activeBranchMenu?.branch;
              onClose();
              if (b) onPushBranch(b, true);
            }}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-200 transition-colors cursor-pointer text-left"
          >
            <Upload class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Force Push (--force-with-lease)</span>
          </button>
        {/if}
        {#if onFetchBranch}
          <button
            onclick={() => {
              const b = activeBranchMenu?.branch;
              onClose();
              if (b) onFetchBranch(b);
            }}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
          >
            <RefreshCw class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Fetch & Đồng bộ</span>
          </button>
        {/if}
      {/if}

      {#if onCreatePullRequest}
        <button
          onclick={() => {
            const b = activeBranchMenu?.branch;
            onClose();
            if (b) onCreatePullRequest(b);
          }}
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-violet-50 dark:hover:bg-violet-950/60 text-violet-800 dark:text-violet-300 hover:text-violet-950 dark:hover:text-violet-100 transition-colors cursor-pointer text-left font-medium"
        >
          <GitPullRequest class="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span>Tạo Pull Request...</span>
        </button>
      {/if}

      {#if onCreateBranchFrom}
        <button
          onclick={() => {
            const b = activeBranchMenu?.branch;
            onClose();
            if (b) onCreateBranchFrom(b);
          }}
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
        >
          <Plus class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <span>Tạo nhánh mới từ đây...</span>
        </button>
      {/if}

      {#if !activeBranchMenu.branch.is_remote}
        <button
          onclick={() => {
            const b = activeBranchMenu?.branch;
            onClose();
            if (b) onStartRename(b);
          }}
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
        >
          <Edit3 class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Đổi tên nhánh (Rename)</span>
        </button>
      {/if}

      <button
        onclick={() => {
          const b = activeBranchMenu?.branch;
          onClose();
          if (b) navigator.clipboard.writeText(b.shorthand);
        }}
        class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
      >
        <Copy class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
        <span>Sao chép tên nhánh</span>
      </button>

      {#if !isProtectedBranch(activeBranchMenu.branch) && onDeleteBranch}
        <div class="h-px bg-zinc-200 dark:bg-zinc-800 my-1"></div>
        <button
          onclick={() => {
            const b = activeBranchMenu?.branch;
            onClose();
            if (b) onDeleteBranch(b);
          }}
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200 transition-colors cursor-pointer text-left"
        >
          <Trash2 class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>Xóa nhánh này</span>
        </button>
      {/if}
    </div>
  </div>
{/if}
