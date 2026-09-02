<script lang="ts">
  import { openUrl } from '@tauri-apps/plugin-opener';
  import {
    checkGithubDeviceLogin,
    saveAccountAuth,
    startGithubDeviceLogin,
  } from '../../api';
  import type { AccountProfile, DeviceCodeResponse, GitCredentials } from '../../types';

  let {
    onSuccess = (_creds: GitCredentials, _profile: AccountProfile) => {},
  }: {
    onSuccess: (creds: GitCredentials, profile: AccountProfile) => void;
  } = $props();

  let isStartingDeviceFlow = $state(false);
  let deviceFlowInfo = $state<DeviceCodeResponse | null>(null);
  let isPollingDevice = $state(false);
  let isManualChecking = $state(false);
  let authSuccessProfile = $state<AccountProfile | null>(null);
  let devicePollError = $state<string | null>(null);
  let copyCodeSuccess = $state(false);
  let pollIntervalTimer: any = null;

  $effect(() => {
    return () => {
      stopDevicePolling();
    };
  });

  function stopDevicePolling() {
    if (pollIntervalTimer) {
      clearInterval(pollIntervalTimer);
      pollIntervalTimer = null;
    }
    isPollingDevice = false;
  }

  async function handleStartGitHubLogin() {
    isStartingDeviceFlow = true;
    devicePollError = null;
    deviceFlowInfo = null;
    authSuccessProfile = null;
    stopDevicePolling();

    try {
      const res = await startGithubDeviceLogin();
      deviceFlowInfo = res;
      isStartingDeviceFlow = false;
      startDevicePolling(res.device_code, res.interval || 3);
    } catch (e: any) {
      devicePollError = `Không thể khởi tạo đăng nhập GitHub: ${e?.message || e}`;
      isStartingDeviceFlow = false;
    }
  }

  async function checkDeviceCodeStatus(deviceCode: string): Promise<boolean> {
    try {
      const res = await checkGithubDeviceLogin(deviceCode);
      if (res.status === 'success' && res.token) {
        stopDevicePolling();
        const profile = res.profile || {
          id: 'github_user',
          username: 'github_user',
          name: 'GitHub User',
          provider: 'github',
          token: res.token,
          auth_method: 'oauth',
          is_active: true,
          created_at: Math.floor(Date.now() / 1000),
        };
        authSuccessProfile = profile;
        await saveAccountAuth(profile);
        setTimeout(() => {
          onSuccess(
            {
              auth_type: 'https_token',
              username: profile.username || 'x-access-token',
              token: res.token,
            },
            profile
          );
        }, 800);
        return true;
      } else if (res.status === 'expired' || res.status === 'error') {
        stopDevicePolling();
        devicePollError = res.error_message || 'Xác thực thất bại hoặc đã hết hạn.';
        return false;
      }
    } catch (err: any) {
      console.warn('Poll error:', err);
    }
    return false;
  }

  function startDevicePolling(deviceCode: string, intervalSec: number) {
    isPollingDevice = true;
    const intervalMs = Math.max(intervalSec, 3) * 1000;

    pollIntervalTimer = setInterval(async () => {
      await checkDeviceCodeStatus(deviceCode);
    }, intervalMs);
  }

  async function handleManualCheckDevice() {
    if (!deviceFlowInfo || isManualChecking) return;
    isManualChecking = true;
    try {
      await checkDeviceCodeStatus(deviceFlowInfo.device_code);
    } finally {
      isManualChecking = false;
    }
  }

  async function handleCopyAndOpenGitHub() {
    if (!deviceFlowInfo) return;
    try {
      await navigator.clipboard.writeText(deviceFlowInfo.user_code);
      copyCodeSuccess = true;
      setTimeout(() => (copyCodeSuccess = false), 3000);
    } catch {
      // fallback
    }
    try {
      await openUrl(deviceFlowInfo.verification_uri);
    } catch {
      window.open(deviceFlowInfo.verification_uri, '_blank');
    }
  }
</script>

<div class="p-6 space-y-4">
  {#if !deviceFlowInfo}
    <div class="text-center py-5 space-y-4">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-100 shadow-lg">
        <svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
      </div>
      <div class="space-y-1">
        <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Đăng nhập tài khoản GitHub (OAuth)</h3>
        <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
          Xác thực 1-click qua trình duyệt để hiển thị thông tin tài khoản và avatar.
        </p>
      </div>

      <!-- Permission Warning Notice -->
      <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-200 text-left space-y-1">
        <span class="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Lưu ý về quyền với Private Repositories:
        </span>
        <p class="text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
          Đăng nhập qua Web chỉ cấp quyền đọc hồ sơ. Nếu bạn đồng bộ với <strong>Repository Private</strong> và gặp lỗi <code class="text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1 py-0.5 rounded">403 Write access not granted</code>, vui lòng chuyển sang tab <strong>Personal Token / PAT</strong> để cấp đủ quyền.
        </p>
      </div>

      {#if devicePollError}
        <div class="p-3 bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800/60 rounded-xl text-xs text-red-800 dark:text-red-300 text-left">
          {devicePollError}
        </div>
      {/if}

      <button
        type="button"
        onclick={handleStartGitHubLogin}
        disabled={isStartingDeviceFlow}
        class="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-900 rounded-xl font-medium text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {#if isStartingDeviceFlow}
          <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Đang kết nối GitHub...</span>
        {:else}
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <span>Tiếp tục với GitHub (Sign in with GitHub)</span>
        {/if}
      </button>
    </div>
  {:else}
    <!-- Device Code Display -->
    <div class="space-y-4 py-2 text-center">
      <div class="space-y-1">
        <span class="text-xs text-neutral-500 dark:text-neutral-400">Mã xác thực của bạn:</span>
        <div class="text-2xl font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400 bg-neutral-100 dark:bg-neutral-950 py-3 px-4 rounded-xl border border-indigo-300 dark:border-indigo-500/30 select-all shadow-inner">
          {deviceFlowInfo.user_code}
        </div>
      </div>

      <p class="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
        Bấm nút bên dưới để tự động sao chép mã và mở trang xác nhận trên GitHub.
      </p>

      <button
        type="button"
        onclick={handleCopyAndOpenGitHub}
        class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {#if copyCodeSuccess}
          <span class="text-emerald-300">✓ Đã copy mã! Đang mở GitHub...</span>
        {:else}
          <span>Sao chép mã & Mở GitHub</span>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" x2="21" y1="14" y2="3"/>
          </svg>
        {/if}
      </button>

      {#if authSuccessProfile}
        <div class="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-500/50 rounded-xl flex items-center justify-center gap-3 animate-in zoom-in-95 duration-200">
          {#if authSuccessProfile.avatar_url}
            <img src={authSuccessProfile.avatar_url} alt="Avatar" class="w-8 h-8 rounded-full border border-emerald-400" />
          {/if}
          <div class="text-left">
            <span class="text-xs font-bold text-emerald-700 dark:text-emerald-300 block">✓ Xác thực thành công!</span>
            <span class="text-[11px] text-emerald-600 dark:text-emerald-400/90">Xin chào @{authSuccessProfile.username}</span>
          </div>
        </div>
      {:else}
        <div class="space-y-2 pt-1">
          <button
            type="button"
            onclick={handleManualCheckDevice}
            disabled={isManualChecking}
            class="w-full py-2 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {#if isManualChecking}
              <div class="w-3.5 h-3.5 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Đang kiểm tra trạng thái...</span>
            {:else}
              <svg class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Tôi đã xác nhận trên Web (Kiểm tra ngay)</span>
            {/if}
          </button>

          {#if isPollingDevice}
            <div class="flex items-center justify-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 pt-1">
              <div class="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Đang tự động kiểm tra xác thực...</span>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
