<script lang="ts">
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { saveAccountAuth, verifyTokenAndGetProfile } from '../../api';
  import { saveGitHubToken } from '../../api/githubApi';
  import type { AccountProfile, GitCredentials } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  let {
    onSuccess = (_creds: GitCredentials, _profile: AccountProfile) => {},
    onCancel = () => {},
  }: {
    onSuccess: (creds: GitCredentials, profile: AccountProfile) => void;
    onCancel: () => void;
  } = $props();

  let tokenProvider = $state<'github' | 'gitlab'>('github');
  let gitlabType = $state<'cloud' | 'self_hosted'>('cloud');
  let customHost = $state('');
  let httpsToken = $state('');
  let isValidatingToken = $state(false);
  let tokenValidationSuccess = $state<AccountProfile | null>(null);
  let tokenValidationError = $state<string | null>(null);
  let showPassword = $state(false);
  let rememberSession = $state(true);
  let hasCopiedScopes = $state(false);

  // Smart provider detection based on token prefix
  let isGitlabTokenInGithub = $derived(
    tokenProvider === 'github' && httpsToken.trim().startsWith('glpat-')
  );
  let isGithubTokenInGitlab = $derived(
    tokenProvider === 'gitlab' &&
      (httpsToken.trim().startsWith('ghp_') || httpsToken.trim().startsWith('github_pat_'))
  );

  function getGitLabBaseUrl(): string {
    if (gitlabType === 'cloud' || !customHost.trim()) {
      return 'https://gitlab.com';
    }
    let host = customHost.trim();
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
      host = `https://${host}`;
    }
    return host.replace(/\/+$/, '');
  }

  function getCreateTokenUrl(): string {
    if (tokenProvider === 'github') {
      return 'https://github.com/settings/tokens/new?description=FlowGit%20Desktop&scopes=repo,read:user,workflow';
    } else {
      const base = getGitLabBaseUrl();
      return `${base}/-/user_settings/personal_access_tokens?name=FlowGit%20Desktop&scopes=read_repository,write_repository,read_user,api`;
    }
  }

  async function openExternalUrl(url: string) {
    try {
      await openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  }

  async function handleCopyScopes() {
    const scopes =
      tokenProvider === 'github'
        ? 'repo, read:user, workflow'
        : 'read_repository, write_repository, read_user, api';
    try {
      await navigator.clipboard.writeText(scopes);
      hasCopiedScopes = true;
      setTimeout(() => {
        hasCopiedScopes = false;
      }, 2000);
    } catch (e) {
      console.error('Failed to copy scopes', e);
    }
  }

  async function handleValidateAndSaveToken(e: Event) {
    e.preventDefault();
    if (!httpsToken.trim()) return;

    isValidatingToken = true;
    tokenValidationError = null;
    tokenValidationSuccess = null;

    try {
      const effectiveHost =
        tokenProvider === 'gitlab' && gitlabType === 'self_hosted'
          ? customHost.trim()
          : undefined;

      const profile = await verifyTokenAndGetProfile(
        tokenProvider,
        httpsToken.trim(),
        effectiveHost
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
      }, 600);
    } catch (err: any) {
      tokenValidationError = err?.message || localeState.t('auth.token.invalidToken');
    } finally {
      isValidatingToken = false;
    }
  }
</script>

<form onsubmit={handleValidateAndSaveToken} class="p-6 space-y-5 select-none text-neutral-900 dark:text-neutral-100">
  <!-- Provider Selection Segmented Cards -->
  <div class="grid grid-cols-2 gap-3">
    <!-- GitHub Option -->
    <button
      type="button"
      onclick={() => (tokenProvider = 'github')}
      class="p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer {tokenProvider === 'github'
        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500/60 dark:border-indigo-500/60 ring-2 ring-indigo-500/20 shadow-xs'
        : 'bg-white dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shadow-xs">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </div>
        {#if tokenProvider === 'github'}
          <div class="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-4 ring-indigo-500/20"></div>
        {/if}
      </div>
      <div>
        <span class="font-semibold text-xs text-neutral-900 dark:text-neutral-100 block">{localeState.t('auth.token.tabGithubPat')}</span>
        <span class="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">ghp_... (Classic PAT)</span>
      </div>
    </button>

    <!-- GitLab Option -->
    <button
      type="button"
      onclick={() => (tokenProvider = 'gitlab')}
      class="p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer {tokenProvider === 'gitlab'
        ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-500/60 dark:border-amber-500/60 ring-2 ring-amber-500/20 shadow-xs'
        : 'bg-white dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-xs">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="m23.6 9.89-1.28-3.95a.8.8 0 0 0-1.53 0l-1.28 3.95H4.49L3.21 5.94a.8.8 0 0 0-1.53 0L.4 9.89a1.6 1.6 0 0 0 .58 1.8l10.5 7.63a.9.9 0 0 0 1.04 0l10.5-7.63a1.6 1.6 0 0 0 .58-1.8z"/>
          </svg>
        </div>
        {#if tokenProvider === 'gitlab'}
          <div class="w-2.5 h-2.5 rounded-full bg-amber-600 dark:bg-amber-400 ring-4 ring-amber-500/20"></div>
        {/if}
      </div>
      <div>
        <span class="font-semibold text-xs text-neutral-900 dark:text-neutral-100 block">{localeState.t('auth.token.tabGitlabToken')}</span>
        <span class="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">glpat-... (Cloud / Self-hosted)</span>
      </div>
    </button>
  </div>

  <!-- GitLab Host Selector (Only shown if GitLab is selected) -->
  {#if tokenProvider === 'gitlab'}
    <div class="p-3.5 bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{localeState.t('auth.token.gitlabHostType')}</span>
        <div class="flex items-center gap-1.5 bg-neutral-200/70 dark:bg-neutral-800/80 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onclick={() => (gitlabType = 'cloud')}
            class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer {gitlabType === 'cloud'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'}"
          >
            {localeState.t('auth.token.gitlabCloud')}
          </button>
          <button
            type="button"
            onclick={() => (gitlabType = 'self_hosted')}
            class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer {gitlabType === 'self_hosted'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'}"
          >
            {localeState.t('auth.token.gitlabSelfHosted')}
          </button>
        </div>
      </div>

      {#if gitlabType === 'self_hosted'}
        <div class="space-y-1">
          <label for="gl-host" class="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 block">
            {localeState.t('auth.token.gitlabHostLabel')}
          </label>
          <div class="flex items-center">
            <span class="px-2.5 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 border border-r-0 border-neutral-300 dark:border-neutral-700 rounded-l-lg text-neutral-500 font-mono">
              https://
            </span>
            <input
              id="gl-host"
              type="text"
              bind:value={customHost}
              placeholder={localeState.t('auth.token.gitlabHostPlaceholder')}
              class="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-r-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-amber-500 font-mono"
            />
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Scopes & Permissions Explanation Card (Dynamic according to provider) -->
  <div class="p-4 rounded-xl border transition-all space-y-3 {tokenProvider === 'github'
    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-500/30 text-indigo-950 dark:text-indigo-100'
    : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-500/30 text-amber-950 dark:text-amber-100'}">
    
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 {tokenProvider === 'github' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <span class="font-bold text-xs">{localeState.t('auth.token.scopesTitle')}</span>
          <span class="text-[11px] block text-neutral-500 dark:text-neutral-400">
            {tokenProvider === 'github' ? localeState.t('auth.token.githubBadge') : localeState.t('auth.token.gitlabBadge')}
          </span>
        </div>
      </div>

      <!-- Quick Action Buttons: 1-Click Create & Copy Scopes -->
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          onclick={handleCopyScopes}
          class="px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer flex items-center gap-1 bg-white/80 dark:bg-neutral-900/80 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          title="Sao chép tên các quyền cần chọn"
        >
          {#if hasCopiedScopes}
            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{localeState.t('auth.token.copiedScopes')}</span>
          {:else}
            <svg class="w-3 h-3 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            <span>{localeState.t('auth.token.copyScopes')}</span>
          {/if}
        </button>

        <button
          type="button"
          onclick={() => openExternalUrl(getCreateTokenUrl())}
          class="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer {tokenProvider === 'github' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'}"
        >
          <span>{localeState.t('auth.token.oneClickCreateToken')}</span>
        </button>
      </div>
    </div>

    <!-- Scopes Detailed Breakdown -->
    <div class="space-y-2 pt-1">
      {#if tokenProvider === 'github'}
        <!-- GitHub Scopes -->
        <div class="grid grid-cols-1 gap-2 text-xs">
          <!-- repo scope -->
          <div class="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800 flex items-start gap-2.5 shadow-xs">
            <span class="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-600/40 shrink-0">
              repo
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-neutral-900 dark:text-neutral-100">{localeState.t('auth.token.ghScopeRepoTitle')}</span>
                <span class="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30">
                  {localeState.t('auth.token.scopeRequired')}
                </span>
              </div>
              <p class="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                {localeState.t('auth.token.ghScopeRepoDesc')}
              </p>
            </div>
          </div>

          <!-- read:user scope -->
          <div class="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800 flex items-start gap-2.5 shadow-xs">
            <span class="font-mono text-indigo-700 dark:text-indigo-400 font-bold text-[11px] bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-300 dark:border-indigo-600/40 shrink-0">
              read:user
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-neutral-900 dark:text-neutral-100">{localeState.t('auth.token.ghScopeUserTitle')}</span>
                <span class="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  {localeState.t('auth.token.scopeRecommended')}
                </span>
              </div>
              <p class="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                {localeState.t('auth.token.ghScopeUserDesc')}
              </p>
            </div>
          </div>

          <!-- workflow scope (optional) -->
          <div class="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800 flex items-start gap-2.5 shadow-xs">
            <span class="font-mono text-neutral-700 dark:text-neutral-300 font-bold text-[11px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-300 dark:border-neutral-700 shrink-0">
              workflow
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-neutral-900 dark:text-neutral-100">{localeState.t('auth.token.ghScopeWorkflowTitle')}</span>
                <span class="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                  {localeState.t('auth.token.scopeOptional')}
                </span>
              </div>
              <p class="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                {localeState.t('auth.token.ghScopeWorkflowDesc')}
              </p>
            </div>
          </div>
        </div>
      {:else}
        <!-- GitLab Scopes -->
        <div class="grid grid-cols-1 gap-2 text-xs">
          <!-- read_repository & write_repository -->
          <div class="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800 flex items-start gap-2.5 shadow-xs">
            <div class="flex flex-col gap-1 shrink-0">
              <span class="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-600/40 text-center">
                read_repository
              </span>
              <span class="font-mono text-emerald-700 dark:text-emerald-400 font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-600/40 text-center">
                write_repository
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-neutral-900 dark:text-neutral-100">{localeState.t('auth.token.glScopeRepoTitle')}</span>
                <span class="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30">
                  {localeState.t('auth.token.scopeRequired')}
                </span>
              </div>
              <p class="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                {localeState.t('auth.token.glScopeRepoDesc')}
              </p>
            </div>
          </div>

          <!-- read_user -->
          <div class="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800 flex items-start gap-2.5 shadow-xs">
            <span class="font-mono text-amber-700 dark:text-amber-400 font-bold text-[11px] bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-600/40 shrink-0">
              read_user
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-neutral-900 dark:text-neutral-100">{localeState.t('auth.token.glScopeUserTitle')}</span>
                <span class="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                  {localeState.t('auth.token.scopeRecommended')}
                </span>
              </div>
              <p class="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                {localeState.t('auth.token.glScopeUserDesc')}
              </p>
            </div>
          </div>

          <!-- api -->
          <div class="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800 flex items-start gap-2.5 shadow-xs">
            <span class="font-mono text-indigo-700 dark:text-indigo-400 font-bold text-[11px] bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-300 dark:border-indigo-600/40 shrink-0">
              api
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-neutral-900 dark:text-neutral-100">{localeState.t('auth.token.glScopeApiTitle')}</span>
                <span class="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  {localeState.t('auth.token.scopeRecommended')}
                </span>
              </div>
              <p class="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
                {localeState.t('auth.token.glScopeApiDesc')}
              </p>
            </div>
          </div>
        </div>
      {/if}

      <!-- Quick Difference Clarification Callout -->
      <div class="p-2.5 rounded-lg bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 flex items-start gap-2 leading-relaxed">
        <span class="text-indigo-500 dark:text-indigo-400 font-bold shrink-0">💡</span>
        <div>
          <span class="font-semibold text-neutral-800 dark:text-neutral-200">{localeState.t('auth.token.diffNoticeTitle')}</span>
          <span> {localeState.t('auth.token.diffNoticeDesc')}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Smart Prefix Detection Warnings -->
  {#if isGitlabTokenInGithub}
    <div class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-150">
      <div class="flex items-center gap-2">
        <span>⚠️</span>
        <span>{localeState.t('auth.token.detectedGitlabInGithub')}</span>
      </div>
      <button
        type="button"
        onclick={() => (tokenProvider = 'gitlab')}
        class="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-[11px] shrink-0 cursor-pointer shadow-xs transition-colors"
      >
        {localeState.t('auth.token.switchToGitlab')}
      </button>
    </div>
  {:else if isGithubTokenInGitlab}
    <div class="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700/60 rounded-xl flex items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200 animate-in fade-in duration-150">
      <div class="flex items-center gap-2">
        <span>⚠️</span>
        <span>{localeState.t('auth.token.detectedGithubInGitlab')}</span>
      </div>
      <button
        type="button"
        onclick={() => (tokenProvider = 'github')}
        class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] shrink-0 cursor-pointer shadow-xs transition-colors"
      >
        {localeState.t('auth.token.switchToGithub')}
      </button>
    </div>
  {/if}

  <!-- Token Input Field -->
  <div class="space-y-1.5">
    <div class="flex items-center justify-between">
      <label for="pat-input" class="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
        <span>{localeState.t('auth.token.patLabel', { format: tokenProvider === 'github' ? 'ghp_...' : 'glpat-...' })}</span>
        <span class="text-red-500">*</span>
      </label>
      <span class="text-[11px] text-neutral-400 font-mono">
        {tokenProvider === 'github' ? localeState.t('auth.token.tokenFormatHintGithub') : localeState.t('auth.token.tokenFormatHintGitlab')}
      </span>
    </div>

    <div class="relative flex items-center">
      <div class="absolute left-3 text-neutral-400 pointer-events-none">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 2l-2 2m-1.5 1.5L14 9M3 21l6.5-6.5M3 3l18 18"/>
          <circle cx="7.5" cy="7.5" r="4.5"/>
        </svg>
      </div>

      <input
        id="pat-input"
        type={showPassword ? 'text' : 'password'}
        bind:value={httpsToken}
        placeholder={tokenProvider === 'github' ? localeState.t('auth.token.patPlaceholderGithub') : localeState.t('auth.token.patPlaceholderGitlab')}
        class="w-full pl-9.5 pr-20 py-2.5 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-hidden focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 font-mono select-text transition-all"
      />

      <div class="absolute right-2.5 flex items-center gap-1">
        {#if httpsToken}
          <button
            type="button"
            onclick={() => (httpsToken = '')}
            class="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs cursor-pointer"
            title="Xóa"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        {/if}
        <button
          type="button"
          onclick={() => (showPassword = !showPassword)}
          class="px-2 py-1 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 text-xs font-medium cursor-pointer transition-colors"
        >
          {showPassword ? localeState.t('auth.ssh.hide') : localeState.t('auth.ssh.show')}
        </button>
      </div>
    </div>

    <p class="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 pt-0.5">
      <span class="text-amber-500">⏱</span>
      <span>{localeState.t('auth.token.expirationTip')}</span>
    </p>
  </div>

  <!-- Validation Error Alert -->
  {#if tokenValidationError}
    <div class="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800/80 rounded-xl text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5 animate-in fade-in duration-150">
      <div class="w-4 h-4 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div>
        <span class="font-semibold block">{localeState.t('auth.token.invalidToken')}</span>
        <span class="text-[11px] opacity-90">{tokenValidationError}</span>
      </div>
    </div>
  {/if}

  <!-- Validation Success Card -->
  {#if tokenValidationSuccess}
    <div class="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/80 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
      <div class="flex items-center gap-3">
        {#if tokenValidationSuccess.avatar_url}
          <img src={tokenValidationSuccess.avatar_url} alt="Avatar" class="w-10 h-10 rounded-full border-2 border-emerald-500/50 shadow-xs" />
        {:else}
          <div class="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border-2 border-emerald-500/40 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300">
            {tokenValidationSuccess.username[0]?.toUpperCase() || 'U'}
          </div>
        {/if}
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {localeState.t('auth.token.verifiedAs', { username: tokenValidationSuccess.username })}
            </span>
            <span class="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-200/80 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 uppercase">
              {tokenValidationSuccess.provider}
            </span>
          </div>
          <p class="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">
            {tokenValidationSuccess.name || localeState.t('auth.token.validAccount')}
          </p>
        </div>
      </div>

      <div class="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    </div>
  {/if}

  <!-- Security & Storage Checkbox -->
  <div class="pt-1 space-y-1">
    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        bind:checked={rememberSession}
        class="rounded border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
      />
      <span class="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
        {localeState.t('auth.token.rememberSession')}
      </span>
    </label>
    <p class="text-[10px] text-neutral-500 dark:text-neutral-400 pl-5 leading-normal">
      {localeState.t('auth.token.securityNote')}
    </p>
  </div>

  <!-- Form Actions (Cancel & Confirm) -->
  <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200 dark:border-neutral-800">
    <button
      type="button"
      onclick={onCancel}
      class="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
    >
      {localeState.t('auth.token.cancelBtn')}
    </button>
    <button
      type="submit"
      disabled={!httpsToken.trim() || isValidatingToken}
      class="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
    >
      {#if isValidatingToken}
        <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>{localeState.t('auth.token.validating', { provider: tokenProvider === 'github' ? 'GitHub' : 'GitLab' })}</span>
      {:else}
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>{localeState.t('auth.token.confirmAndSync')}</span>
      {/if}
    </button>
  </div>
</form>

