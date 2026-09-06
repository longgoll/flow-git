<script lang="ts">
  import { open } from '@tauri-apps/plugin-dialog';
  import { cloneRepository, isTauri } from '../api';
  import type { AccountProfile, GitCredentials } from '../types';

  let {
    isOpen = true,
    activeAccount = null,
    recentRepos = [],
    onSelectRepo = (_path: string) => {},
    onOpenAuth = () => {},
    onClose = () => {},
  }: {
    isOpen: boolean;
    activeAccount?: AccountProfile | null;
    recentRepos?: string[];
    onSelectRepo: (path: string) => void;
    onOpenAuth: () => void;
    onClose: () => void;
  } = $props();

  let activeTab = $state<'open' | 'clone'>('open');
  let manualPath = $state('f:/Dev/product/git-tool');
  let cloneUrl = $state('');
  let cloneTargetPath = $state('');
  let isCloning = $state(false);
  let cloneError = $state<string | null>(null);

  async function handleBrowseLocalFolder() {
    try {
      if (isTauri) {
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Chọn thư mục Git Repository',
        });
        if (selected && typeof selected === 'string') {
          onClose();
          onSelectRepo(selected);
        }
      } else {
        if (manualPath.trim()) {
          onClose();
          onSelectRepo(manualPath.trim());
        }
      }
    } catch (e: any) {
      console.error('Failed to open directory picker:', e);
    }
  }

  async function handleBrowseCloneTarget() {
    try {
      if (isTauri) {
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Chọn thư mục chứa Repository tải về',
        });
        if (selected && typeof selected === 'string') {
          cloneTargetPath = selected;
        }
      }
    } catch (e: any) {
      console.error('Browse target failed:', e);
    }
  }

  async function handleExecuteClone(e: Event) {
    e.preventDefault();
    if (!cloneUrl.trim() || !cloneTargetPath.trim()) return;

    isCloning = true;
    cloneError = null;

    try {
      const creds: GitCredentials | undefined = activeAccount?.token
        ? {
            auth_type: 'https_token',
            username: activeAccount.username,
            token: activeAccount.token,
          }
        : undefined;

      await cloneRepository(cloneUrl.trim(), cloneTargetPath.trim(), creds);
      onClose();
      onSelectRepo(cloneTargetPath.trim());
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('AUTH_REQUIRED') || msg.includes('401')) {
        cloneError = 'Repository yêu cầu xác thực. Vui lòng đăng nhập GitHub/GitLab trước.';
      } else {
        cloneError = msg;
      }
    } finally {
      isCloning = false;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 bg-black/50 dark:bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/90 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-neutral-900 dark:text-neutral-100"
    >
      <!-- Top Branding Bar -->
      <div class="px-8 pt-8 pb-6 border-b border-neutral-200 dark:border-neutral-800/80 bg-gradient-to-b from-neutral-50 via-white to-neutral-100/60 dark:from-neutral-900 dark:to-neutral-950/60 relative">
        {#if recentRepos.length > 0}
          <button
            onclick={onClose}
            class="absolute top-6 right-6 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Vào Workspace</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        {/if}

        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 text-white font-bold text-xl tracking-wider">
            FG
          </div>
          <div>
            <div class="flex items-center gap-2.5">
              <h1 class="text-xl font-bold bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-600 dark:from-neutral-100 dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
                Chào mừng bạn đến với FlowGit
              </h1>
              <span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/60">
                2026 Edition
              </span>
            </div>
            <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Trình quản lý Git trực quan thế hệ mới – Hiệu năng cao, Kéo thả mượt mà, An toàn tuyệt đối (No-Fear Git)
            </p>
          </div>
        </div>
      </div>

      <!-- Main Body: 2 Column Layout (Left: Actions / Right: Account & Recents) -->
      <div class="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
        <!-- Left Column: Open / Clone Actions (7 cols) -->
        <div class="md:col-span-7 p-6 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800 space-y-5">
          <!-- Mode Tabs -->
          <div class="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-950/80 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
            <button
              type="button"
              onclick={() => (activeTab = 'open')}
              class="py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 {activeTab === 'open' ? 'bg-white dark:bg-neutral-800 text-cyan-700 dark:text-cyan-300 shadow-xs font-semibold' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'}"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
              </svg>
              <span>Mở Repository Cục Bộ</span>
            </button>
            <button
              type="button"
              onclick={() => (activeTab = 'clone')}
              class="py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 {activeTab === 'clone' ? 'bg-white dark:bg-neutral-800 text-indigo-700 dark:text-indigo-300 shadow-xs font-semibold' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'}"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              <span>Clone từ Remote</span>
            </button>
          </div>

          {#if activeTab === 'open'}
            <!-- Open Local Repo Form -->
            <div class="space-y-4 pt-1">
              <div class="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800/80 space-y-3">
                <div class="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  <span class="w-2 h-2 rounded-full bg-cyan-500"></span>
                  <span>Mở thư mục dự án Git đã có sẵn trên máy</span>
                </div>
                <p class="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  FlowGit sẽ tự động tải Living Commit Graph, phát hiện Working Tree và kích hoạt cơ chế bảo vệ Safe Discard 48h.
                </p>
                <button
                  type="button"
                  onclick={handleBrowseLocalFolder}
                  class="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                  </svg>
                  <span>Chọn Thư Mục Dự Án (Browse Folder...)</span>
                </button>
              </div>

              <!-- Fast Path Input -->
              <div class="space-y-1.5">
                <label for="fast-path" class="text-xs font-medium text-neutral-600 dark:text-neutral-400 block">Hoặc dán đường dẫn trực tiếp:</label>
                <div class="flex items-center gap-2">
                  <input
                    id="fast-path"
                    type="text"
                    bind:value={manualPath}
                    placeholder="vd: C:/Projects/my-app hoặc /home/user/repo"
                    class="flex-1 px-3 py-2 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700/80 rounded-lg text-neutral-900 dark:text-neutral-200 font-mono focus:outline-hidden focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onclick={() => manualPath.trim() && onSelectRepo(manualPath.trim())}
                    class="px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 rounded-lg transition-colors cursor-pointer border border-neutral-200 dark:border-transparent"
                  >
                    Mở
                  </button>
                </div>
              </div>
            </div>
          {:else}
            <!-- Clone Repo Form -->
            <form onsubmit={handleExecuteClone} class="space-y-3 pt-1">
              <div class="space-y-1">
                <label for="clone-url" class="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
                  Remote Repository URL
                </label>
                <input
                  id="clone-url"
                  type="text"
                  bind:value={cloneUrl}
                  placeholder="https://github.com/username/repo.git hoặc git@github.com:..."
                  class="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700/80 rounded-lg text-neutral-900 dark:text-neutral-200 font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div class="space-y-1">
                <label for="clone-target" class="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
                  Thư mục lưu về máy (Target Path)
                </label>
                <div class="flex items-center gap-2">
                  <input
                    id="clone-target"
                    type="text"
                    bind:value={cloneTargetPath}
                    placeholder="vd: D:/Projects/my-new-repo"
                    class="flex-1 px-3 py-2 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700/80 rounded-lg text-neutral-900 dark:text-neutral-200 font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onclick={handleBrowseCloneTarget}
                    class="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 rounded-lg transition-colors cursor-pointer border border-neutral-200 dark:border-transparent"
                  >
                    Chọn...
                  </button>
                </div>
              </div>

              {#if cloneError}
                <div class="p-3 bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800/60 rounded-lg text-xs text-red-800 dark:text-red-300">
                  {cloneError}
                </div>
              {/if}

              <button
                type="submit"
                disabled={!cloneUrl.trim() || !cloneTargetPath.trim() || isCloning}
                class="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {#if isCloning}
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang tải mã nguồn (Git Clone)...</span>
                {:else}
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  <span>Bắt Đầu Clone & Mở Dự Án</span>
                {/if}
              </button>
            </form>
          {/if}
        </div>

        <!-- Right Column: Account Status & Recent Repos (5 cols) -->
        <div class="md:col-span-5 p-6 bg-neutral-50/60 dark:bg-neutral-950/40 flex flex-col justify-between space-y-5">
          <!-- Account Card -->
          <div class="space-y-3">
            <h3 class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Tài Khoản Git Remote
            </h3>

            {#if activeAccount}
              <!-- Logged In State -->
              <div class="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-indigo-500/30 flex items-center justify-between shadow-xs">
                <div class="flex items-center gap-3">
                  {#if activeAccount.avatar_url}
                    <img src={activeAccount.avatar_url} alt="Avatar" class="w-9 h-9 rounded-full border border-indigo-400/50" />
                  {:else}
                    <div class="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                      {activeAccount.username.slice(0, 2).toUpperCase()}
                    </div>
                  {/if}
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-bold text-neutral-900 dark:text-neutral-100">@{activeAccount.username}</span>
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-transparent">
                        Đã kết nối
                      </span>
                    </div>
                    <span class="text-[11px] text-neutral-500 dark:text-neutral-400 capitalize">{activeAccount.provider} account</span>
                  </div>
                </div>

                <button
                  type="button"
                  onclick={onOpenAuth}
                  class="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                  title="Cấu hình tài khoản"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </div>
            {:else}
              <!-- Not Logged In -->
              <div class="p-3.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2.5 shadow-xs">
                <p class="text-xs text-neutral-600 dark:text-neutral-400">
                  Đăng nhập GitHub để tự động đồng bộ 1-click không cần dán token nhiều lần.
                </p>
                <button
                  type="button"
                  onclick={onOpenAuth}
                  class="w-full py-2 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-100 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer border border-neutral-300 dark:border-neutral-700/80"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  <span>Sign in with GitHub</span>
                </button>
              </div>
            {/if}
          </div>

          <!-- Recent Repositories -->
          <div class="space-y-2 flex-1 pt-2">
            <h3 class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center justify-between">
              <span>Gần đây (Recent Repos)</span>
              {#if recentRepos.length > 0}
                <span class="text-[10px] font-mono text-neutral-500 font-normal">{recentRepos.length} repos</span>
              {/if}
            </h3>

            {#if recentRepos.length > 0}
              <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {#each recentRepos as repoPath}
                  <button
                    type="button"
                    onclick={() => {
                      onClose();
                      onSelectRepo(repoPath);
                    }}
                    class="w-full px-3 py-2 rounded-lg bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-800 text-left transition-colors cursor-pointer group flex items-center justify-between shadow-2xs"
                  >
                    <div class="truncate mr-2">
                      <span class="text-xs font-medium text-neutral-800 dark:text-neutral-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 block truncate">
                        {repoPath.split(/[\/\\]/).filter(Boolean).pop() || repoPath}
                      </span>
                      <span class="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 block truncate">{repoPath}</span>
                    </div>
                    <svg class="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 shrink-0 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                {/each}
              </div>
            {:else}
              <div class="p-4 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/50 border border-dashed border-neutral-300 dark:border-neutral-800 text-center">
                <span class="text-xs text-neutral-500">Chưa có lịch sử repository nào</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
