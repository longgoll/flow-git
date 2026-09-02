<script lang="ts">
  import { Github, Globe, Lock, Sparkles, AlertCircle, ExternalLink, X } from 'lucide-svelte';
  import { addRemote, createGitHubRepository, getStoredGitHubToken, saveGitHubToken, smartSync } from '../api';
  import type { AccountProfile } from '../types';
  import { toast } from '../state/toastState.svelte';

  let {
    isOpen = false,
    repoPath = '',
    repoName = '',
    currentBranch = 'main',
    activeAccount = null,
    onSuccess = () => {},
    onClose = () => {},
  }: {
    isOpen: boolean;
    repoPath: string;
    repoName: string;
    currentBranch?: string;
    activeAccount?: AccountProfile | null;
    onSuccess: () => void;
    onClose: () => void;
  } = $props();

  let targetName = $state('');
  let description = $state('');
  let isPrivate = $state(true);
  let githubToken = $state('');
  let isPublishing = $state(false);
  let errorMessage = $state<string | null>(null);

  $effect(() => {
    if (isOpen) {
      targetName = repoName || 'my-project';
      description = '';
      isPrivate = true;
      errorMessage = null;
      githubToken = activeAccount?.token || getStoredGitHubToken() || '';
    }
  });

  async function handlePublish(e: Event) {
    e.preventDefault();
    if (!targetName.trim()) return;

    const token = githubToken.trim() || activeAccount?.token || getStoredGitHubToken();
    if (!token) {
      errorMessage = 'Vui lòng nhập GitHub Personal Access Token (hoặc đăng nhập tài khoản GitHub).';
      return;
    }

    // Lưu token nếu người dùng nhập tay
    saveGitHubToken(token);

    isPublishing = true;
    errorMessage = null;

    try {
      // 1. Tạo repository mới trên GitHub
      const githubRepo = await createGitHubRepository(
        targetName.trim(),
        description.trim(),
        isPrivate,
        token
      );

      // 2. Thêm remote origin vào kho cục bộ
      await addRemote(repoPath, 'origin', githubRepo.clone_url);

      // 3. Đẩy code lên GitHub nếu có branch
      try {
        const creds = {
          auth_type: 'https_token' as const,
          username: activeAccount?.username || 'git',
          token: token,
        };
        await smartSync(repoPath, 'origin', currentBranch || 'main', creds);
      } catch (pushErr: any) {
        console.warn('Initial push skipped or empty repo:', pushErr);
      }

      toast.success(
        'Xuất bản thành công!',
        `Repository ${githubRepo.full_name} (${isPrivate ? 'Riêng tư' : 'Công khai'}) đã sẵn sàng trên GitHub.`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Publish repository failed:', err);
      errorMessage = err?.message || String(err);
    } finally {
      isPublishing = false;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-[70] bg-black/50 dark:bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl shadow-indigo-950/20 overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100 font-sans"
    >
      <!-- Header -->
      <div class="px-6 pt-6 pb-4 flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-950/40">
        <div class="flex items-center gap-3">
          <div class="p-3 bg-neutral-900 dark:bg-white/10 border border-neutral-700 dark:border-white/20 text-white rounded-xl shadow-inner">
            <Github class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-neutral-900 dark:text-white tracking-wide flex items-center gap-2">
              Xuất bản lên GitHub
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono font-semibold">
                Publish Repository
              </span>
            </h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Đưa dự án từ máy tính cá nhân lên kho lưu trữ đám mây GitHub.
            </p>
          </div>
        </div>
        <button
          onclick={onClose}
          class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Đóng"
          disabled={isPublishing}
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Form Body -->
      <form onsubmit={handlePublish} class="p-6 space-y-4">
        <!-- Repo Name -->
        <div class="space-y-1.5">
          <label for="pub-name" class="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
            Tên Repository trên GitHub
          </label>
          <input
            id="pub-name"
            type="text"
            bind:value={targetName}
            required
            disabled={isPublishing}
            placeholder="vd: my-awesome-app"
            class="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono select-text"
          />
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <label for="pub-desc" class="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
            Mô tả dự án (Tùy chọn)
          </label>
          <input
            id="pub-desc"
            type="text"
            bind:value={description}
            disabled={isPublishing}
            placeholder="Mô tả ngắn về dự án của bạn..."
            class="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-900 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition-all select-text"
          />
        </div>

        <!-- Privacy Selection (Radio cards) -->
        <div class="space-y-2">
          <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
            Quyền riêng tư (Visibility):
          </span>
          <div class="grid grid-cols-2 gap-3">
            <!-- Private Option -->
            <button
              type="button"
              onclick={() => (isPrivate = true)}
              class="p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 {isPrivate
                ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
                : 'bg-neutral-50 dark:bg-neutral-950/40 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'}"
            >
              <div class="flex items-center gap-2">
                <Lock class="w-4 h-4 {isPrivate ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 dark:text-neutral-500'}" />
                <span class="text-xs font-semibold text-neutral-900 dark:text-neutral-200">Riêng tư (Private)</span>
              </div>
              <p class="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                Chỉ một mình bạn và người bạn cấp quyền mới xem được code.
              </p>
            </button>

            <!-- Public Option -->
            <button
              type="button"
              onclick={() => (isPrivate = false)}
              class="p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 {!isPrivate
                ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
                : 'bg-neutral-50 dark:bg-neutral-950/40 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'}"
            >
              <div class="flex items-center gap-2">
                <Globe class="w-4 h-4 {!isPrivate ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 dark:text-neutral-500'}" />
                <span class="text-xs font-semibold text-neutral-900 dark:text-neutral-200">Công khai (Public)</span>
              </div>
              <p class="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                Bất kỳ ai trên internet cũng có thể xem và sao chép dự án.
              </p>
            </button>
          </div>
        </div>

        <!-- Token / Authentication Status -->
        {#if !activeAccount?.token && !getStoredGitHubToken()}
          <div class="space-y-1.5 pt-1">
            <div class="flex items-center justify-between text-xs">
              <label for="pub-token" class="font-medium text-neutral-700 dark:text-neutral-300">
                GitHub Personal Access Token (PAT)
              </label>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo"
                target="_blank"
                rel="noreferrer"
                class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center gap-1 text-[11px]"
              >
                Tạo Token <ExternalLink class="w-3 h-3" />
              </a>
            </div>
            <input
              id="pub-token"
              type="password"
              bind:value={githubToken}
              required
              disabled={isPublishing}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              class="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-900 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-indigo-500 font-mono select-text"
            />
          </div>
        {:else}
          <div class="bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Tài khoản: <strong class="text-neutral-900 dark:text-white">{activeAccount?.username || 'GitHub Token'}</strong></span>
            </div>
            <span class="text-[11px] text-neutral-500 font-mono">Đã sẵn sàng</span>
          </div>
        {/if}

        {#if errorMessage}
          <div class="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs rounded-lg p-3 flex items-start gap-2.5">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <div class="leading-relaxed">{errorMessage}</div>
          </div>
        {/if}

        <!-- Footer Buttons -->
        <div class="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onclick={onClose}
            disabled={isPublishing}
            class="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isPublishing || !targetName.trim()}
            class="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:from-indigo-700 active:to-purple-700 rounded-lg transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {#if isPublishing}
              <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Đang xuất bản...</span>
            {:else}
              <Sparkles class="w-3.5 h-3.5" />
              <span>Xuất bản ({isPrivate ? 'Riêng tư' : 'Công khai'})</span>
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
