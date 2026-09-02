<script lang="ts">
  import { FolderGit2, Sparkles, AlertCircle, ArrowRight, X } from 'lucide-svelte';

  let {
    isOpen = false,
    folderPath = '',
    onInit = (_defaultBranch: string) => {},
    onCancel = () => {},
  }: {
    isOpen: boolean;
    folderPath: string;
    onInit: (defaultBranch: string) => void | Promise<void>;
    onCancel: () => void;
  } = $props();

  let defaultBranch = $state('main');
  let isSubmitting = $state(false);
  let errorMessage = $state<string | null>(null);

  // Lấy tên thư mục cuối cùng từ path
  let folderName = $derived(() => {
    if (!folderPath) return 'Dự án';
    const clean = folderPath.replace(/\\/g, '/').replace(/\/$/, '');
    const parts = clean.split('/');
    return parts[parts.length - 1] || folderPath;
  });

  async function handleConfirm() {
    isSubmitting = true;
    errorMessage = null;
    try {
      await onInit(defaultBranch.trim() || 'main');
    } catch (e: any) {
      errorMessage = e?.message || String(e);
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-[60] bg-black/50 dark:bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100 font-sans"
    >
      <!-- Header -->
      <div class="px-6 pt-6 pb-4 flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800/80">
        <div class="flex items-center gap-3">
          <div class="p-3 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-xl shadow-inner">
            <FolderGit2 class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-neutral-900 dark:text-white tracking-wide flex items-center gap-2">
              Khởi tạo Git Repository?
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-mono font-normal">
                git init
              </span>
            </h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Thư mục này chưa có cấu trúc Git repository.
            </p>
          </div>
        </div>
        <button
          onclick={onCancel}
          class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Đóng"
          disabled={isSubmitting}
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-4">
        <!-- Path preview box -->
        <div class="bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800/80 rounded-xl p-3.5 flex flex-col gap-1">
          <span class="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Thư mục đích
          </span>
          <div class="flex items-center gap-2 text-sm text-cyan-700 dark:text-cyan-200 font-mono break-all select-text">
            <span class="text-neutral-400 dark:text-neutral-500">📁</span>
            <span class="font-semibold text-neutral-900 dark:text-neutral-200">{folderName()}</span>
            <span class="text-xs text-neutral-500 dark:text-neutral-400">({folderPath})</span>
          </div>
        </div>

        <!-- Privacy & Local Explanation Banner -->
        <div class="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
          <span class="text-base leading-none">🔒</span>
          <div>
            <strong class="text-emerald-700 dark:text-emerald-300 font-medium">100% Cục bộ & Riêng tư:</strong>
            <p class="text-neutral-600 dark:text-neutral-400 text-[11px] mt-0.5">
              Repository này sẽ được tạo hoàn toàn offline trên máy tính cá nhân của bạn và <strong>chưa đẩy lên bất kỳ đâu trên Internet</strong>. Bạn có thể xuất bản lên GitHub (chọn Công khai hoặc Riêng tư) bất kỳ lúc nào sau khi khởi tạo.
            </p>
          </div>
        </div>

        <p class="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
          FlowGit sẽ khởi tạo một Git repository cục bộ mới (<code class="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-cyan-700 dark:text-cyan-300 font-mono text-[11px]">.git/</code>) tại thư mục này để bạn có thể bắt đầu theo dõi lịch sử code, tạo commit và quản lý branch.
        </p>

        <!-- Branch input -->
        <div class="space-y-1.5">
          <label for="init-branch-input" class="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
            <span>Tên nhánh mặc định (Default Branch):</span>
            <span class="text-[10px] text-neutral-500 font-mono">Tiêu chuẩn: main</span>
          </label>
          <input
            id="init-branch-input"
            type="text"
            bind:value={defaultBranch}
            placeholder="main"
            disabled={isSubmitting}
            class="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono select-text"
          />
        </div>

        {#if errorMessage}
          <div class="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs rounded-lg p-3 flex items-start gap-2.5">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <div class="leading-relaxed">{errorMessage}</div>
          </div>
        {/if}
      </div>

      <!-- Footer Buttons -->
      <div class="px-6 py-4 bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-200 dark:border-neutral-800/80 flex items-center justify-end gap-3">
        <button
          onclick={onCancel}
          disabled={isSubmitting}
          class="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors border border-transparent hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer"
        >
          Chọn thư mục khác
        </button>
        <button
          onclick={handleConfirm}
          disabled={isSubmitting}
          class="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:from-cyan-700 active:to-blue-700 rounded-lg transition-all shadow-md shadow-cyan-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {#if isSubmitting}
            <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Đang khởi tạo...</span>
          {:else}
            <Sparkles class="w-3.5 h-3.5" />
            <span>Khởi tạo Git ngay</span>
            <ArrowRight class="w-3.5 h-3.5 opacity-70" />
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
