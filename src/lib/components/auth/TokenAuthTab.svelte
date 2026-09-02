<script lang="ts">
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { saveAccountAuth, verifyTokenAndGetProfile } from '../../api';
  import { saveGitHubToken } from '../../api/githubApi';
  import type { AccountProfile, GitCredentials } from '../../types';

  let {
    onSuccess = (_creds: GitCredentials, _profile: AccountProfile) => {},
    onCancel = () => {},
  }: {
    onSuccess: (creds: GitCredentials, profile: AccountProfile) => void;
    onCancel: () => void;
  } = $props();

  let tokenProvider = $state<'github' | 'gitlab'>('github');
  let customHost = $state('');
  let httpsToken = $state('');
  let isValidatingToken = $state(false);
  let tokenValidationSuccess = $state<AccountProfile | null>(null);
  let tokenValidationError = $state<string | null>(null);
  let showPassword = $state(false);
  let rememberSession = $state(true);

  async function handleValidateAndSaveToken(e: Event) {
    e.preventDefault();
    if (!httpsToken.trim()) return;

    isValidatingToken = true;
    tokenValidationError = null;
    tokenValidationSuccess = null;

    try {
      const profile = await verifyTokenAndGetProfile(
        tokenProvider,
        httpsToken.trim(),
        customHost.trim() || undefined
      );
      tokenValidationSuccess = profile;
      if (rememberSession) {
        await saveAccountAuth(profile);
      }
      if (tokenProvider === 'github') {
        saveGitHubToken(httpsToken.trim());
      }
      setTimeout(() => {
        onSuccess(
          {
            auth_type: 'https_token',
            username: profile.username,
            token: httpsToken.trim(),
          },
          profile
        );
      }, 500);
    } catch (err: any) {
      tokenValidationError = err?.message || 'Token không hợp lệ hoặc không có quyền truy cập.';
    } finally {
      isValidatingToken = false;
    }
  }
</script>

<form onsubmit={handleValidateAndSaveToken} class="p-6 space-y-4">
  <!-- Scopes explanation card -->
  <div class="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 space-y-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5 font-semibold text-indigo-300">
        <svg class="w-4 h-4 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>Quyền cần cấp cho Token (Recommended Scopes):</span>
      </div>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        Full Read/Write
      </span>
    </div>

    <!-- Scopes badges -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
      <div class="p-2 rounded-lg bg-neutral-950/70 border border-neutral-800 flex items-start gap-2">
        <span class="font-mono text-emerald-400 font-bold text-[11px] bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">repo</span>
        <div class="text-[11px] text-neutral-300">
          <span class="font-medium text-neutral-200 block">Quyền Push, Pull & Sync</span>
          <span class="text-neutral-400 text-[10px]">Bắt buộc cho Private Repos (tránh lỗi 403)</span>
        </div>
      </div>

      <div class="p-2 rounded-lg bg-neutral-950/70 border border-neutral-800 flex items-start gap-2">
        <span class="font-mono text-indigo-400 font-bold text-[11px] bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-500/30">read:user</span>
        <div class="text-[11px] text-neutral-300">
          <span class="font-medium text-neutral-200 block">Thông tin hồ sơ & Avatar</span>
          <span class="text-neutral-400 text-[10px]">Hiển thị Username và Avatar</span>
        </div>
      </div>
    </div>

    <div class="text-[11px] text-neutral-300 pt-1 flex items-center gap-1.5 border-t border-neutral-800/80">
      <span class="text-emerald-400">✨</span>
      <span>Nút <strong>"Tạo Token 1-Click ↗"</strong> bên dưới đã <strong>tự động tích sẵn 2 quyền này</strong> cho bạn trên GitHub.</span>
    </div>
  </div>

  <div class="flex items-center gap-2">
    <button
      type="button"
      onclick={() => (tokenProvider = 'github')}
      class="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all {tokenProvider === 'github' ? 'bg-neutral-800 border-neutral-600 text-neutral-100' : 'border-neutral-800 text-neutral-400 hover:bg-neutral-800/40'}"
    >
      GitHub Personal Access Token
    </button>
    <button
      type="button"
      onclick={() => (tokenProvider = 'gitlab')}
      class="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all {tokenProvider === 'gitlab' ? 'bg-neutral-800 border-neutral-600 text-neutral-100' : 'border-neutral-800 text-neutral-400 hover:bg-neutral-800/40'}"
    >
      GitLab Token / Self-hosted
    </button>
  </div>

  {#if tokenProvider === 'gitlab'}
    <div class="space-y-1">
      <label for="gl-host" class="text-xs font-medium text-neutral-300 block">GitLab Host (Tùy chọn)</label>
      <input
        id="gl-host"
        type="text"
        bind:value={customHost}
        placeholder="gitlab.com hoặc gitlab.yourdomain.com"
        class="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-indigo-500 font-mono"
      />
    </div>
  {/if}

  <div class="space-y-1.5">
    <div class="flex items-center justify-between">
      <label for="pat-input" class="text-xs font-medium text-neutral-300 block">
        Personal Access Token ({tokenProvider === 'github' ? 'ghp_...' : 'glpat-...'})
      </label>
      {#if tokenProvider === 'github'}
        <button
          type="button"
          onclick={() => {
            openUrl('https://github.com/settings/tokens/new?scopes=repo,read:user').catch(() => window.open('https://github.com/settings/tokens/new?scopes=repo,read:user', '_blank'));
          }}
          class="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 px-2 py-0.5 rounded-md border border-indigo-500/40 transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>Tạo Token 1-Click (Tự chọn sẵn quyền)</span>
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" x2="21" y1="14" y2="3"/>
          </svg>
        </button>
      {/if}
    </div>
    <div class="relative">
      <input
        id="pat-input"
        type={showPassword ? 'text' : 'password'}
        bind:value={httpsToken}
        placeholder={tokenProvider === 'github' ? 'ghp_xxxxxxxxxxxxxx' : 'glpat-xxxxxxxxxxxxxx'}
        class="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-indigo-500 pr-10 font-mono"
      />
      <button
        type="button"
        onclick={() => (showPassword = !showPassword)}
        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
      >
        {showPassword ? 'Ẩn' : 'Hiện'}
      </button>
    </div>
  </div>

  {#if tokenValidationError}
    <div class="p-2.5 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
      {tokenValidationError}
    </div>
  {/if}

  {#if tokenValidationSuccess}
    <div class="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg flex items-center gap-3">
      {#if tokenValidationSuccess.avatar_url}
        <img src={tokenValidationSuccess.avatar_url} alt="Avatar" class="w-8 h-8 rounded-full border border-emerald-500/40" />
      {/if}
      <div class="text-xs">
        <p class="font-semibold text-emerald-300">Đã xác thực: @{tokenValidationSuccess.username}</p>
        <p class="text-neutral-400">{tokenValidationSuccess.name || 'Tài khoản hợp lệ'}</p>
      </div>
    </div>
  {/if}

  <label class="flex items-center gap-2 cursor-pointer pt-1">
    <input
      type="checkbox"
      bind:checked={rememberSession}
      class="rounded border-neutral-700 bg-neutral-950 text-indigo-500 focus:ring-0 focus:ring-offset-0"
    />
    <span class="text-xs text-neutral-400">Lưu tài khoản an toàn trong cơ sở dữ liệu ứng dụng</span>
  </label>

  <div class="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
    <button
      type="button"
      onclick={onCancel}
      class="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
    >
      Hủy bỏ
    </button>
    <button
      type="submit"
      disabled={!httpsToken.trim() || isValidatingToken}
      class="px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 shadow-xs flex items-center gap-1.5 cursor-pointer"
    >
      {#if isValidatingToken}
        <div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Đang kiểm tra...</span>
      {:else}
        <span>Xác nhận & Đồng bộ</span>
      {/if}
    </button>
  </div>
</form>
