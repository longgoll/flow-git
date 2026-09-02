<script lang="ts">
  import {
    BookOpen,
    X,
    Lock,
    Unlock,
    AlertTriangle,
    ShieldCheck,
    GitBranch,
    History,
    CheckCircle2,
    RefreshCw,
    HardDrive,
    Trash2,
    ArrowRight,
  } from 'lucide-svelte';
  import {
    isIndexLocked,
    clearIndexLock,
    scanHeavyFiles,
  } from '../api/edgeCases';
  import type { HeavyFileInfo } from '../types';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    isOpen: boolean;
    repoPath: string;
    currentBranch: string;
    onClose: () => void;
    onOpenTrash: () => void;
    onOpenTimeMachine: () => void;
    onRepoRefreshed?: () => Promise<void>;
  }

  let {
    isOpen = false,
    repoPath = '',
    currentBranch = '',
    onClose,
    onOpenTrash,
    onOpenTimeMachine,
    onRepoRefreshed,
  }: Props = $props();

  let activeTab = $state<'indexLock' | 'wrongBranch' | 'heavyFiles' | 'fileLocks' | 'untrackedShelve'>('indexLock');

  // Edge cases state
  let hasIndexLock = $state<boolean>(false);
  let isCheckingIndexLock = $state<boolean>(false);
  let isClearingLock = $state<boolean>(false);

  // Heavy files state
  let heavyFiles = $state<HeavyFileInfo[]>([]);
  let isScanningHeavy = $state<boolean>(false);

  $effect(() => {
    if (isOpen && repoPath) {
      checkStatus();
    }
  });

  async function checkStatus() {
    if (!repoPath) return;
    isCheckingIndexLock = true;
    try {
      hasIndexLock = await isIndexLocked(repoPath);
      heavyFiles = await scanHeavyFiles(repoPath, 50);
    } catch (err) {
      console.error('Failed to check edge cases status:', err);
    } finally {
      isCheckingIndexLock = false;
    }
  }

  async function handleClearIndexLock() {
    if (!repoPath) return;
    isClearingLock = true;
    try {
      const ok = await clearIndexLock(repoPath);
      if (ok) {
        toast.success('Đã gỡ kẹt index.lock', 'Repository đã mở khóa và có thể thực hiện các lệnh Git bình thường.');
        hasIndexLock = false;
        await onRepoRefreshed?.();
      } else {
        toast.info('Không phát hiện tệp khóa', 'Tệp .git/index.lock không tồn tại.');
      }
    } catch (err: any) {
      toast.error('Lỗi khi xóa lock file', err?.message || err);
    } finally {
      isClearingLock = false;
    }
  }

  async function handleScanHeavy() {
    if (!repoPath) return;
    isScanningHeavy = true;
    try {
      heavyFiles = await scanHeavyFiles(repoPath, 50);
      if (heavyFiles.length === 0) {
        toast.success('Không có tệp quá lớn', 'Tất cả tệp đã staged đều dưới 50MB (an toàn để push lên GitHub).');
      } else {
        toast.warning('Phát hiện tệp lớn', `Có ${heavyFiles.length} tệp vượt quá 50MB cần lưu ý.`);
      }
    } catch (err: any) {
      toast.error('Lỗi quét tệp', err?.message || err);
    } finally {
      isScanningHeavy = false;
    }
  }
</script>

{#if isOpen}
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
          <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
            <BookOpen class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Sổ tay Cứu hộ Thực chiến (Git Emergency Playbook)
            </h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Xử lý nhanh các tình huống kẹt Git, xung đột khóa tệp Windows và cứu dữ liệu khẩn cấp
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

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-1 px-6 py-2 bg-zinc-50/50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800/80 text-xs overflow-x-auto">
        <button
          onclick={() => (activeTab = 'indexLock')}
          class="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer {activeTab === 'indexLock' ? 'bg-amber-100 dark:bg-amber-600/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          <Lock class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Gỡ kẹt index.lock</span>
          {#if hasIndexLock}
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          {/if}
        </button>

        <button
          onclick={() => (activeTab = 'heavyFiles')}
          class="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer {activeTab === 'heavyFiles' ? 'bg-cyan-100 dark:bg-cyan-600/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          <HardDrive class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Tệp nặng (>50MB)</span>
          {#if heavyFiles.length > 0}
            <span class="px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-mono font-bold">
              {heavyFiles.length}
            </span>
          {/if}
        </button>

        <button
          onclick={() => (activeTab = 'wrongBranch')}
          class="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer {activeTab === 'wrongBranch' ? 'bg-teal-100 dark:bg-teal-600/20 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/40 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          <GitBranch class="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Commit nhầm vào main</span>
        </button>

        <button
          onclick={() => (activeTab = 'fileLocks')}
          class="px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer {activeTab === 'fileLocks' ? 'bg-purple-100 dark:bg-purple-600/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/40 font-semibold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          <ShieldCheck class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Cứu Code (48h Trash)</span>
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="p-6 max-h-[460px] overflow-y-auto">
        <!-- TAB 1: Gỡ kẹt .git/index.lock -->
        {#if activeTab === 'indexLock'}
          <div class="space-y-4">
            <div class="p-4 rounded-xl border {hasIndexLock ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60' : 'bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800'}">
              <div class="flex items-start gap-3">
                <div class="p-2 rounded-lg {hasIndexLock ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'} shrink-0">
                  {#if hasIndexLock}
                    <Lock class="w-5 h-5" />
                  {:else}
                    <Unlock class="w-5 h-5" />
                  {/if}
                </div>
                <div class="space-y-1 flex-1">
                  <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    Trạng thái:
                    {#if hasIndexLock}
                      <span class="text-rose-700 dark:text-rose-400 font-mono">Phát hiện tệp `.git/index.lock` tồn đọng!</span>
                    {:else}
                      <span class="text-emerald-700 dark:text-emerald-400 font-mono">Repository đang mở khóa bình thường</span>
                    {/if}
                  </h3>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Khi một lệnh Git bị tắt đột ngột hoặc IDE khóa tệp, Git để lại tệp `index.lock` khiến mọi thao tác commit, stage hoặc checkout bị từ chối với lỗi <code class="text-amber-700 dark:text-amber-400 font-mono">Unable to create .git/index.lock: File exists</code>.
                  </p>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <h4 class="text-xs font-semibold text-zinc-800 dark:text-zinc-300">Giải pháp cứu hộ:</h4>
              <p class="text-xs text-zinc-600 dark:text-zinc-400">
                Nhấn nút bên dưới để gỡ bỏ an toàn tệp khóa tồn đọng ngay lập tức mà không cần dùng Terminal hay vào thư mục ẩn `.git`.
              </p>
              <div class="flex items-center gap-3 pt-1">
                <button
                  onclick={handleClearIndexLock}
                  disabled={isClearingLock}
                  class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {#if isClearingLock}
                    <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  {:else}
                    <Unlock class="w-3.5 h-3.5" />
                    <span>Xóa `index.lock` ngay</span>
                  {/if}
                </button>
                <button
                  onclick={checkStatus}
                  disabled={isCheckingIndexLock}
                  class="px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border border-zinc-300 dark:border-transparent shadow-xs"
                >
                  {#if isCheckingIndexLock}
                    <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                    <span>Đang kiểm tra...</span>
                  {:else}
                    <span>Kiểm tra lại</span>
                  {/if}
                </button>
              </div>
            </div>
          </div>

        <!-- TAB 2: Quét tệp lớn > 50MB -->
        {:else if activeTab === 'heavyFiles'}
          <div class="space-y-4">
            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <AlertTriangle class="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Cảnh báo tệp nhị phân siêu lớn (>50MB)
              </h3>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                GitHub và GitLab từ chối push tệp nhị phân có dung lượng trên 50MB – 100MB trừ khi được quản trị qua Git LFS. Việc lỡ commit tệp nặng vào lịch sử sẽ làm phình to repository vĩnh viễn.
              </p>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-zinc-800 dark:text-zinc-300">
                  Tệp staged vượt ngưỡng 50MB ({heavyFiles.length})
                </span>
                <button
                  onclick={handleScanHeavy}
                  disabled={isScanningHeavy}
                  class="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-300 dark:border-transparent shadow-xs"
                >
                  <RefreshCw class="w-3 h-3 {isScanningHeavy ? 'animate-spin' : ''}" />
                  <span>Quét lại</span>
                </button>
              </div>

              {#if heavyFiles.length === 0}
                <div class="py-8 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-500 text-xs">
                  <CheckCircle2 class="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                  Không có tệp nặng vượt quá 50MB trong khu vực Staging.
                </div>
              {:else}
                <div class="space-y-1.5 font-mono text-xs">
                  {#each heavyFiles as f (f.path)}
                    <div class="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-zinc-800 dark:text-zinc-300 shadow-xs">
                      <span class="truncate max-w-sm select-text">{f.path}</span>
                      <span class="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800/60 text-[11px]">
                        {f.size_formatted}
                      </span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

        <!-- TAB 3: Commit nhầm vào main / nhánh hiện tại -->
        {:else if activeTab === 'wrongBranch'}
          <div class="space-y-4">
            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <GitBranch class="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Kịch bản: Đang code tính năng nhưng lỡ commit nhầm vào `{currentBranch || 'main'}`
                </h3>
                {#if currentBranch}
                  <span class="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-mono text-[11px] border border-teal-200 dark:border-teal-800/60 font-semibold">
                    Nhánh: {currentBranch}
                  </span>
                {/if}
              </div>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Đừng hoảng loạn! FlowGit có thể giúp bạn chuyển toàn bộ các commit đó sang một nhánh tính năng mới, và đưa `{currentBranch || 'main'}` về lại mốc ban đầu sạch sẽ không tì vết.
              </p>
            </div>

            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs text-zinc-800 dark:text-zinc-300">
              <h4 class="font-semibold text-teal-700 dark:text-teal-400">Các bước thực hiện nhanh trực tiếp trên Living Graph:</h4>
              <ol class="list-decimal pl-5 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>
                  <strong class="text-zinc-900 dark:text-zinc-200">Bước 1:</strong> Chuột phải vào commit trên cùng -> Chọn <span class="text-teal-700 dark:text-teal-300 font-mono font-medium">"Tạo nhánh mới tại commit này..."</span> -> Đặt tên nhánh mới (ví dụ: <code class="text-cyan-700 dark:text-cyan-300 font-semibold">feature/my-task</code>).
                </li>
                <li>
                  <strong class="text-zinc-900 dark:text-zinc-200">Bước 2:</strong> Chuột phải vào commit cũ của `{currentBranch || 'main'}` (trước những commit bị nhầm) -> Chọn <span class="text-amber-700 dark:text-amber-300 font-mono font-medium">"Reset HEAD về commit này"</span> -> Chọn <strong class="text-zinc-900 dark:text-zinc-200">Mixed</strong> hoặc <strong class="text-zinc-900 dark:text-zinc-200">Hard</strong>.
                </li>
                <li>
                  <strong class="text-zinc-900 dark:text-zinc-200">Kết quả:</strong> Nhánh `{currentBranch || 'main'}` của bạn quay về đúng mốc sạch ban đầu, còn toàn bộ công việc đã nằm an toàn trên nhánh mới.
                </li>
              </ol>
            </div>
          </div>

        <!-- TAB 4: Safe Discard 48h & Time Machine -->
        {:else if activeTab === 'fileLocks'}
          <div class="space-y-4">
            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <h3 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Cứu mã nguồn bị lỡ tay Discard hoặc Reset nhầm
              </h3>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Triết lý <strong>No-Fear Git</strong> của FlowGit đảm bảo không bao giờ làm mất mã nguồn. Mọi thay đổi chưa commit khi Discard đều được lưu lại trong Thùng rác an toàn 48h (SQLite Store).
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1">
                    <Trash2 class="w-4 h-4" />
                    Thùng rác Uncommitted 48h
                  </h4>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400">
                    Phục hồi các tệp hoặc khối code chưa commit đã lỡ tay Discard trong vòng 48 giờ.
                  </p>
                </div>
                <button
                  onclick={() => { onClose(); onOpenTrash(); }}
                  class="mt-3 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>Mở Thùng rác Safe Discard</span>
                  <ArrowRight class="w-3.5 h-3.5" />
                </button>
              </div>

              <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5 mb-1">
                    <History class="w-4 h-4" />
                    Cỗ máy Thời gian (Ctrl + Z)
                  </h4>
                  <p class="text-xs text-zinc-600 dark:text-zinc-400">
                    Dịch chuyển ngược thời gian (Reflog Time-Travel) để hoàn tác các lệnh Merge, Rebase, Reset hoặc Checkout nhầm.
                  </p>
                </div>
                <button
                  onclick={() => { onClose(); onOpenTimeMachine(); }}
                  class="mt-3 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-600/20 hover:bg-purple-100 dark:hover:bg-purple-600/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/40 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>Mở Time Machine Reflog</span>
                  <ArrowRight class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
        <span class="text-[11px] text-zinc-500 font-mono">
          FlowGit Rescue Kit • Luôn an toàn tuyệt đối với mọi thao tác Git
        </span>
        <button
          onclick={onClose}
          class="px-4 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer transition-colors border border-zinc-200 dark:border-transparent"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
{/if}
