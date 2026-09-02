<script lang="ts">
  import type { BranchInfo } from '../types';
  import {
    AlertTriangle,
    GitBranch,
    Globe,
    Lock,
    ShieldAlert,
    Trash2,
    X,
  } from 'lucide-svelte';

  interface Props {
    show: boolean;
    branch: BranchInfo | null;
    isLoading?: boolean;
    onClose: () => void;
    onConfirmDelete: (branch: BranchInfo, deleteOnRemoteServer?: boolean) => Promise<void>;
  }

  let {
    show,
    branch,
    isLoading = false,
    onClose,
    onConfirmDelete,
  }: Props = $props();

  let deleteOnRemoteServer = $state(false);

  const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'dev', 'trunk', 'head', 'release']);

  let isProtected = $derived.by(() => {
    if (!branch) return false;
    if (branch.is_head) return true;
    const name = branch.shorthand.toLowerCase();
    const cleanName = name.replace(/^(origin|upstream|remotes\/[^\/]+)\//, '');
    return PROTECTED_BRANCHES.has(cleanName) || cleanName === 'head';
  });

  async function handleSubmit() {
    if (!branch || isProtected || isLoading) return;
    await onConfirmDelete(branch, branch.is_remote ? deleteOnRemoteServer : false);
  }
</script>

{#if show && branch}
  <div class="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
    <div
      class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100 font-sans"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
        <div class="flex items-center gap-2.5">
          {#if isProtected}
            <div class="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
              <Lock class="w-4 h-4" />
            </div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Nhánh được bảo vệ (Protected Branch)</h2>
          {:else}
            <div class="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
              <Trash2 class="w-4 h-4" />
            </div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {branch.is_remote ? 'Xóa nhánh Remote Tracking' : 'Xóa nhánh Local'}
            </h2>
          {/if}
        </div>
        <button
          onclick={onClose}
          disabled={isLoading}
          class="text-zinc-400 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-5 space-y-4 text-xs">
        <!-- Branch Details Card -->
        <div class="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 font-mono font-medium text-zinc-900 dark:text-zinc-200">
              {#if branch.is_remote}
                <Globe class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              {:else}
                <GitBranch class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              {/if}
              <span class="truncate text-sm font-semibold">{branch.shorthand}</span>
            </div>
            <span
              class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider {branch.is_remote
                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                : 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40'}"
            >
              {branch.is_remote ? 'Remote Tracking' : 'Local'}
            </span>
          </div>

          <div class="text-[11px] text-zinc-500 font-mono truncate">
            Target Commit: <span class="text-zinc-700 dark:text-zinc-400">{branch.target_commit_id?.slice(0, 8)}</span>
          </div>
        </div>

        {#if isProtected}
          <!-- Protected Branch Notice -->
          <div class="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200 space-y-2">
            <div class="flex items-start gap-2.5">
              <ShieldAlert class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div class="space-y-1">
                <p class="font-medium text-amber-700 dark:text-amber-300">Không thể xóa nhánh này</p>
                <p class="text-[11px] text-amber-800/80 dark:text-amber-200/80 leading-relaxed">
                  Nhánh <code class="font-mono font-semibold bg-amber-100 dark:bg-amber-950/60 px-1 py-0.5 rounded text-amber-800 dark:text-amber-300">{branch.shorthand}</code> 
                  được xác định là <strong>nhánh cốt lõi / protected branch</strong> hoặc là nhánh đang active (HEAD). Hệ thống khóa tính năng xóa để bảo đảm an toàn cho toàn bộ dự án.
                </p>
              </div>
            </div>
          </div>
        {:else}
          <!-- Normal Branch Deletion Info -->
          {#if !branch.is_remote}
            <!-- Local Branch Warnings -->
            {#if branch.ahead_count > 0}
              <div class="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertTriangle class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p class="text-[11px] leading-relaxed">
                  Nhánh này đang có <strong>{branch.ahead_count} commits</strong> chưa được đẩy lên Remote. Nếu xóa, các commits này có thể bị mất khỏi lịch sử tham chiếu!
                </p>
              </div>
            {:else}
              <p class="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Bạn có chắc chắn muốn xóa nhánh cục bộ <span class="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">{branch.shorthand}</span>? Thao tác này sẽ gỡ bỏ nhánh khỏi danh sách Local Branches.
              </p>
            {/if}
          {:else}
            <!-- Remote Branch Warnings & Choices -->
            <div class="space-y-3">
              <p class="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Bạn đang thực hiện xóa tham chiếu nhánh Remote <span class="font-mono text-zinc-900 dark:text-zinc-200 font-semibold">{branch.shorthand}</span>.
              </p>

              <div class="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <label class="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    bind:checked={deleteOnRemoteServer}
                    class="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-rose-600 focus:ring-rose-500/20 focus:ring-offset-0 cursor-pointer"
                  />
                  <div class="space-y-0.5">
                    <span class="text-xs font-semibold text-rose-600 dark:text-rose-300">Đồng thời xóa trên máy chủ Remote (GitHub/GitLab)</span>
                    <p class="text-[11px] text-zinc-500">
                      {deleteOnRemoteServer
                        ? '⚠️ Sẽ thực hiện `git push origin --delete` - Nhánh trên remote server sẽ bị xóa vĩnh viễn đối với tất cả thành viên!'
                        : 'Mặc định: Chỉ xóa cache tracking local ở máy này (`refs/remotes/...`), không xóa trên server.'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/40">
        <button
          onclick={onClose}
          disabled={isLoading}
          class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isProtected ? 'Đóng' : 'Hủy bỏ'}
        </button>

        {#if !isProtected}
          <button
            onclick={handleSubmit}
            disabled={isLoading}
            class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if isLoading}
              <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Đang xóa...</span>
            {:else}
              <Trash2 class="w-3.5 h-3.5" />
              <span>{deleteOnRemoteServer ? 'Xóa Vĩnh Viễn Trên Remote' : 'Xác Nhận Xóa'}</span>
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
