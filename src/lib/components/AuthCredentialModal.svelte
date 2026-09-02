<script lang="ts">
  import type { AccountProfile, GitCredentials } from '../types';
  import DeviceFlowTab from './auth/DeviceFlowTab.svelte';
  import TokenAuthTab from './auth/TokenAuthTab.svelte';
  import SshKeyTab from './auth/SshKeyTab.svelte';

  let {
    isOpen = false,
    authType = 'https',
    remoteUrl = '',
    onConfirm = (_creds: GitCredentials, _profile?: AccountProfile) => {},
    onCancel = () => {},
  }: {
    isOpen: boolean;
    authType: 'ssh_passphrase' | 'https' | string;
    remoteUrl?: string;
    onConfirm: (creds: GitCredentials, profile?: AccountProfile) => void;
    onCancel: () => void;
  } = $props();

  let activeTab = $state<'github_oauth' | 'token' | 'ssh'>('token');

  $effect(() => {
    if (isOpen) {
      if (authType === 'ssh_passphrase') {
        activeTab = 'ssh';
      } else if (authType === 'token') {
        activeTab = 'token';
      } else {
        activeTab = 'token';
      }
    }
  });
</script>

{#if isOpen}
  <!-- Backdrop (z-[100] to sit above WelcomeScreen and all drawers) -->
  <div
    class="fixed inset-0 bg-black/80 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) onCancel();
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') onCancel();
    }}
  >
    <div
      class="bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div>
            <h2 class="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              Xác thực Git Remote
              {#if remoteUrl}
                <span class="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700/60">
                  {remoteUrl}
                </span>
              {/if}
            </h2>
            <p class="text-xs text-neutral-400">Chọn phương thức đăng nhập để FlowGit đồng bộ với Remote</p>
          </div>
        </div>

        <button
          onclick={onCancel}
          aria-label="Đóng modal"
          class="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="px-6 pt-3 pb-1 border-b border-neutral-800/80 bg-neutral-950/30 flex items-center gap-2">
        <button
          type="button"
          onclick={() => (activeTab = 'token')}
          class="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer {activeTab === 'token' ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 shadow-xs' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'}"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Personal Token / PAT 🔑
          <span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Khuyên dùng</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'github_oauth')}
          class="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer {activeTab === 'github_oauth' ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 shadow-xs' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'}"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Sign in GitHub 🌐
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'ssh')}
          class="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer {activeTab === 'ssh' ? 'bg-amber-600/20 border border-amber-500/40 text-amber-300 shadow-xs' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'}"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="m4.93 4.93 4.24 4.24"/>
            <path d="m14.83 9.17 4.24-4.24"/>
            <path d="m14.83 14.83 4.24 4.24"/>
            <path d="m9.17 14.83-4.24 4.24"/>
          </svg>
          SSH Passphrase 🛡️
        </button>
      </div>

      <!-- Tab Contents -->
      {#if activeTab === 'github_oauth'}
        <DeviceFlowTab
          onSuccess={(creds, profile) => onConfirm(creds, profile)}
        />
      {:else if activeTab === 'token'}
        <TokenAuthTab
          onSuccess={(creds, profile) => onConfirm(creds, profile)}
          onCancel={onCancel}
        />
      {:else if activeTab === 'ssh'}
        <SshKeyTab
          onSuccess={(creds) => onConfirm(creds)}
          onCancel={onCancel}
        />
      {/if}
    </div>
  </div>
{/if}
