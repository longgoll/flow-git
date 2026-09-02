<script lang="ts">
  import type { RepoOperationState } from '../types';
  import {
    AlertTriangle,
    GitMerge,
    RefreshCw,
    SkipForward,
    XCircle,
    GitBranch,
    Play,
    Bug,
  } from 'lucide-svelte';

  interface Props {
    operationState?: RepoOperationState;
    isDetached?: boolean;
    currentBranch?: string;
    headCommitId?: string;
    isOperating?: boolean;
    onContinueRebase?: () => void;
    onSkipRebase?: () => void;
    onAbortOperation?: () => void;
    onCreateBranchFromDetached?: () => void;
  }

  let {
    operationState = { type: 'Normal' },
    isDetached = false,
    currentBranch = '',
    headCommitId = '',
    isOperating = false,
    onContinueRebase,
    onSkipRebase,
    onAbortOperation,
    onCreateBranchFromDetached,
  }: Props = $props();
</script>

{#if operationState.type !== 'Normal'}
  {#if operationState.type === 'Rebasing'}
    <div
      class="w-full bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-zinc-950 border-b border-amber-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-md z-15 animate-in slide-in-from-top duration-200"
      role="alert"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
          <RefreshCw class="w-4 h-4" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-amber-200 uppercase tracking-wide text-[11px]">
              Tiến trình Rebase đang dở dang
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Bước {operationState.data.current_step} / {operationState.data.total_steps}
            </span>
          </div>
          <p class="text-[11px] text-amber-300/80 mt-0.5 truncate">
            Đang áp dụng lại các commit lên nhánh <strong class="text-amber-100 font-mono">{operationState.data.head_name}</strong>. Hãy giải quyết xung đột (nếu có) và tiếp tục.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        {#if onContinueRebase}
          <button
            type="button"
            onclick={onContinueRebase}
            disabled={isOperating}
            class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Tiếp tục rebase sau khi đã giải quyết xong conflict"
          >
            <Play class="w-3.5 h-3.5 fill-current" />
            <span>Tiếp tục (Continue)</span>
          </button>
        {/if}

        {#if onSkipRebase}
          <button
            type="button"
            onclick={onSkipRebase}
            disabled={isOperating}
            class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Bỏ qua commit này và chuyển sang commit tiếp theo"
          >
            <SkipForward class="w-3.5 h-3.5" />
            <span>Bỏ qua (Skip)</span>
          </button>
        {/if}

        {#if onAbortOperation}
          <button
            type="button"
            onclick={onAbortOperation}
            disabled={isOperating}
            class="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Hủy bỏ toàn bộ quá trình rebase và quay về trạng thái ban đầu"
          >
            <XCircle class="w-3.5 h-3.5" />
            <span>Hủy bỏ (Abort)</span>
          </button>
        {/if}
      </div>
    </div>
  {:else if operationState.type === 'Merging'}
    <div
      class="w-full bg-gradient-to-r from-cyan-950/80 via-blue-950/60 to-zinc-950 border-b border-cyan-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-md z-15 animate-in slide-in-from-top duration-200"
      role="alert"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 animate-pulse">
          <GitMerge class="w-4 h-4" />
        </div>
        <div>
          <span class="font-bold text-cyan-200 uppercase tracking-wide text-[11px]">
            Tiến trình Merge đang dở dang (Xung đột chưa giải quyết)
          </span>
          <p class="text-[11px] text-cyan-300/80 mt-0.5 truncate">
            Đang merge commit <strong class="font-mono text-cyan-100">{operationState.data.merge_heads.map(h => h.slice(0, 7)).join(', ')}</strong>. Vui lòng giải quyết conflict và commit kết quả, hoặc bấm hủy.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        {#if onAbortOperation}
          <button
            type="button"
            onclick={onAbortOperation}
            disabled={isOperating}
            class="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Hủy bỏ merge và khôi phục working tree về HEAD"
          >
            <XCircle class="w-3.5 h-3.5" />
            <span>Hủy bỏ Merge (Abort)</span>
          </button>
        {/if}
      </div>
    </div>
  {:else if operationState.type === 'CherryPicking'}
    <div
      class="w-full bg-gradient-to-r from-purple-950/80 via-zinc-950 to-zinc-950 border-b border-purple-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-md z-15 animate-in slide-in-from-top duration-200"
      role="alert"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="p-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300">
          <GitBranch class="w-4 h-4" />
        </div>
        <div>
          <span class="font-bold text-purple-200 uppercase tracking-wide text-[11px]">
            Đang trong tiến trình Cherry-pick
          </span>
          <p class="text-[11px] text-purple-300/80 mt-0.5">
            {#if operationState.data.head_name}
              Commit đang cherry-pick: <strong class="font-mono text-purple-100">{operationState.data.head_name.slice(0, 7)}</strong>
            {:else}
              Đang cherry-pick commit dở dang.
            {/if}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        {#if onAbortOperation}
          <button
            type="button"
            onclick={onAbortOperation}
            disabled={isOperating}
            class="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <XCircle class="w-3.5 h-3.5" />
            <span>Hủy bỏ Cherry-pick</span>
          </button>
        {/if}
      </div>
    </div>
  {:else if operationState.type === 'Bisecting'}
    <div
      class="w-full bg-gradient-to-r from-teal-950/80 via-zinc-950 to-zinc-950 border-b border-teal-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-md z-15 animate-in slide-in-from-top duration-200"
      role="alert"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="p-1.5 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300">
          <Bug class="w-4 h-4" />
        </div>
        <div>
          <span class="font-bold text-teal-200 uppercase tracking-wide text-[11px]">
            Tiến trình Git Bisect đang hoạt động
          </span>
          <p class="text-[11px] text-teal-300/80 mt-0.5">
            Hệ thống đang truy vết commit gây lỗi. Bạn có thể tiếp tục đánh giá trong Bisect Wizard hoặc hủy bỏ.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        {#if onAbortOperation}
          <button
            type="button"
            onclick={onAbortOperation}
            disabled={isOperating}
            class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <XCircle class="w-3.5 h-3.5" />
            <span>Kết thúc Bisect (Reset)</span>
          </button>
        {/if}
      </div>
    </div>
  {/if}
{/if}

{#if isDetached && operationState.type === 'Normal'}
  <div
    class="w-full bg-gradient-to-r from-fuchsia-950/80 via-indigo-950/60 to-zinc-950 border-b border-fuchsia-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-md z-14 animate-in slide-in-from-top duration-200"
    role="alert"
  >
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="p-1.5 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300">
        <AlertTriangle class="w-4 h-4" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-fuchsia-200 uppercase tracking-wide text-[11px]">
            Cảnh báo: Detached HEAD State
          </span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40">
            {headCommitId ? headCommitId.slice(0, 7) : currentBranch}
          </span>
        </div>
        <p class="text-[11px] text-zinc-300/80 mt-0.5">
          Bạn đang xem commit trực tiếp mà không gắn với nhánh nào. Các commit mới tạo ở đây sẽ bị mồ côi (dangling) khi bạn checkout đi chỗ khác!
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      {#if onCreateBranchFromDetached}
        <button
          type="button"
          onclick={onCreateBranchFromDetached}
          class="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-medium flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <GitBranch class="w-3.5 h-3.5" />
          <span>Tạo nhánh mới tại đây</span>
        </button>
      {/if}
    </div>
  </div>
{/if}
