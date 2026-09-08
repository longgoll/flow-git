import type { AccountProfile, GitCredentials, GitHubPullRequest, BackgroundFetchResult, TransferProgressPayload } from '../types';
import { executeRemoteWithAuth, getActiveAccount, saveAccountAuth, smartSync, silentBackgroundFetch, isTauri } from '../api';
import { listen } from '@tauri-apps/api/event';
import {
  getStoredGitHubToken,
  saveGitHubToken,
} from '../api/githubApi';
import {
  getRemoteAdapter,
  getStoredGitLabToken,
  getStoredBitbucketToken,
} from '../api/remoteProviderApi';


export class RemoteState {
  activeAccount = $state<AccountProfile | null>(null);
  cachedCredentials = $state<GitCredentials | null>(null);
  isSyncing = $state<boolean>(false);
  isPushing = $state<boolean>(false);
  transferProgress = $state<TransferProgressPayload | null>(null);
  openPRCount = $state<number>(0);
  isCheckingPRs = $state<boolean>(false);
  lastPRCheckRepo = $state<string>('');
  lastCreatedPR = $state<GitHubPullRequest | null>(null);
  prRefreshTrigger = $state<number>(0);

  triggerPRRefresh(newPR?: GitHubPullRequest) {
    if (newPR) {
      this.lastCreatedPR = newPR;
      this.openPRCount = (this.openPRCount || 0) + 1;
    }
    this.prRefreshTrigger++;
  }

  showAuthModal = $state<boolean>(false);
  authModalType = $state<'ssh_passphrase' | 'https' | 'token' | 'github_oauth' | string>('token');
  authModalRemoteUrl = $state<string>('origin');

  pendingSyncAfterAuth = $state<boolean>(false);
  pendingRemoteAction = $state<{
    action: 'push' | 'pull' | 'fetch' | 'publish';
    remote: string;
    branch?: string;
    force?: boolean;
    setUpstream?: boolean;
  } | null>(null);

  private isListeningProgress = false;

  async initAccount() {
    try {
      this.activeAccount = await getActiveAccount().catch(() => null);
      if (this.activeAccount?.token) {
        this.cachedCredentials = {
          auth_type: 'https_token',
          username: this.activeAccount.username,
          token: this.activeAccount.token,
        };
      }

      if (isTauri && !this.isListeningProgress) {
        this.isListeningProgress = true;
        listen<TransferProgressPayload>('remote://transfer-progress', (event) => {
          this.transferProgress = event.payload;
          if (event.payload.phase === 'done') {
            setTimeout(() => {
              if (this.transferProgress?.phase === 'done') {
                this.transferProgress = null;
              }
            }, 3000);
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to init account auth:', e);
    }
  }

  getEffectiveCredentials(): GitCredentials | undefined {
    if (this.cachedCredentials) return this.cachedCredentials;
    if (this.activeAccount?.token) {
      return {
        auth_type: 'https_token',
        username: this.activeAccount.username,
        token: this.activeAccount.token,
      };
    }
    return undefined;
  }

  async runSmartSync(
    repoPath: string,
    branch?: string,
    onSuccess?: () => Promise<void>
  ): Promise<{ success: boolean; message: string }> {
    if (!repoPath) return { success: false, message: 'No repository path' };
    this.isSyncing = true;
    try {
      const creds = this.getEffectiveCredentials();
      const result = await smartSync(repoPath, undefined, branch, creds);
      if (onSuccess) await onSuccess();
      return { success: true, message: `Sync: ${result.status}` };
    } catch (e: any) {
      const errStr = e?.message || String(e);
      const is403 = errStr.includes('403') || errStr.toLowerCase().includes('write access');
      const isAuthRequired =
        errStr.includes('401') ||
        errStr.includes('AUTH_REQUIRED') ||
        errStr.includes('class=Http (34)') ||
        errStr.toLowerCase().includes('authentication') ||
        is403;

      if (is403 || isAuthRequired) {
        this.pendingSyncAfterAuth = true;
        this.authModalType = 'token';
        this.authModalRemoteUrl = 'origin';
        this.showAuthModal = true;
        return {
          success: false,
          message: is403
            ? 'Lỗi quyền (403): GitHub yêu cầu Personal Access Token có quyền "repo".'
            : 'Xác thực Remote: Vui lòng nhập Personal Token hoặc đăng nhập GitHub.',
        };
      }
      return { success: false, message: `Smart Sync error: ${errStr}` };
    } finally {
      this.isSyncing = false;
    }
  }

  async executeRemote(
    repoPath: string,
    action: 'push' | 'pull' | 'fetch' | 'publish',
    remote = 'origin',
    branch?: string,
    force = false,
    setUpstreamOrSuccess?: boolean | (() => Promise<void>),
    onSuccess?: () => Promise<void>
  ): Promise<{ requiresAuth: boolean; success: boolean; message: string }> {
    if (!repoPath) return { requiresAuth: false, success: false, message: 'No repository' };

    let setUpstream = false;
    let successCb = onSuccess;
    if (typeof setUpstreamOrSuccess === 'function') {
      successCb = setUpstreamOrSuccess;
    } else if (typeof setUpstreamOrSuccess === 'boolean') {
      setUpstream = setUpstreamOrSuccess;
    }

    const isPushOp = action === 'push' || action === 'publish';
    if (isPushOp) {
      this.isPushing = true;
    }

    const creds = this.getEffectiveCredentials();
    try {
      const res = await executeRemoteWithAuth(repoPath, action, remote, branch, force, setUpstream, creds);
      if (res.requires_auth) {
        this.pendingRemoteAction = { action, remote, branch, force, setUpstream };
        this.authModalType = (res.auth_type_hint as any) || 'https';
        this.authModalRemoteUrl = remote;
        this.showAuthModal = true;
        return { requiresAuth: true, success: false, message: 'Authentication required' };
      } else if (res.success) {
        if (successCb) await successCb();
        return { requiresAuth: false, success: true, message: res.message };
      } else {
        return { requiresAuth: false, success: false, message: res.message };
      }
    } catch (e: any) {
      return { requiresAuth: false, success: false, message: `Git ${action} failed: ${e?.message || e}` };
    } finally {
      if (isPushOp) {
        this.isPushing = false;
      }
    }
  }

  async publishBranch(
    repoPath: string,
    branchName: string,
    remote = 'origin',
    onSuccess?: () => Promise<void>
  ): Promise<{ requiresAuth: boolean; success: boolean; message: string }> {
    return this.executeRemote(repoPath, 'publish', remote, branchName, false, true, onSuccess);
  }

  async pushBranch(
    repoPath: string,
    branchName?: string,
    remote = 'origin',
    force = false,
    setUpstream = false,
    onSuccess?: () => Promise<void>
  ): Promise<{ requiresAuth: boolean; success: boolean; message: string }> {
    return this.executeRemote(repoPath, 'push', remote, branchName, force, setUpstream, onSuccess);
  }

  async confirmAuth(
    creds: GitCredentials,
    profile: AccountProfile | undefined,
    repoPath: string,
    onSuccess: () => Promise<void>,
    remoteUrl?: string
  ): Promise<{ rerunAction: string | null }> {
    this.showAuthModal = false;
    this.cachedCredentials = creds;
    this.activeAccount = profile || null;
    if (this.activeAccount?.token) {
      saveGitHubToken(this.activeAccount.token);
    }
    this.refreshPRCount(remoteUrl || this.authModalRemoteUrl).catch(() => {});

    if (profile) {
      this.activeAccount = profile;
      await saveAccountAuth(profile).catch(console.error);
    } else if (creds.token) {
      this.activeAccount = {
        id: creds.username ? `${creds.username}_pat` : `account_${Date.now()}`,
        username: creds.username || 'user',
        name: creds.username || 'Git User',
        provider: creds.username?.includes('gitlab') ? 'gitlab' : 'github',
        token: creds.token,
        auth_method: 'pat',
        is_active: true,
        created_at: Math.floor(Date.now() / 1000),
      };
      await saveAccountAuth(this.activeAccount).catch(console.error);
    }

    if (this.pendingSyncAfterAuth) {
      this.pendingSyncAfterAuth = false;
      await this.runSmartSync(repoPath, undefined, onSuccess);
      return { rerunAction: 'sync' };
    }

    if (this.pendingRemoteAction && repoPath) {
      const { action, remote, branch, force, setUpstream } = this.pendingRemoteAction;
      this.pendingRemoteAction = null;
      await this.executeRemote(repoPath, action, remote, branch, force, setUpstream, onSuccess);
      return { rerunAction: action };
    }

    return { rerunAction: null };
  }

  cancelAuth() {
    this.showAuthModal = false;
    this.pendingRemoteAction = null;
    this.pendingSyncAfterAuth = false;
  }

  async refreshPRCount(remoteUrl?: string | null): Promise<number> {
    if (!remoteUrl) {
      this.openPRCount = 0;
      return 0;
    }
    const adapter = getRemoteAdapter(remoteUrl);
    if (!adapter) {
      this.openPRCount = 0;
      return 0;
    }
    try {
      this.isCheckingPRs = true;
      const providerType = adapter.providerInfo.type;
      let token = this.activeAccount?.token;

      if (!token) {
        if (providerType === 'github') {
          token = getStoredGitHubToken();
          if (!token) {
            const acc = await getActiveAccount('github').catch(() => null);
            if (acc?.token) {
              token = acc.token;
              saveGitHubToken(acc.token);
            }
          }
        } else if (providerType === 'gitlab') {
          token = getStoredGitLabToken();
        } else if (providerType === 'bitbucket') {
          token = getStoredBitbucketToken();
        }
      }

      const list = await adapter.fetchPullRequests('open', token);
      const count = Array.isArray(list) ? list.length : 0;
      this.openPRCount = count;
      this.lastPRCheckRepo = `${adapter.providerInfo.owner}/${adapter.providerInfo.repo}`;
      return count;
    } catch (e) {
      console.debug('Background PR count check skipped/failed:', e);
      return this.openPRCount;
    } finally {
      this.isCheckingPRs = false;
    }
  }

  // --- Silent Auto-Fetch Engine ---
  isAutoFetching = $state<boolean>(false);
  lastAutoFetchTime = $state<number>(0);
  autoFetchIntervalSeconds = $state<number>(
    typeof localStorage !== 'undefined' && localStorage.getItem('flowgit_autofetch_interval')
      ? parseInt(localStorage.getItem('flowgit_autofetch_interval') || '180', 10)
      : 180
  );
  autoFetchEnabled = $state<boolean>(
    typeof localStorage !== 'undefined' && localStorage.getItem('flowgit_autofetch_enabled') !== null
      ? localStorage.getItem('flowgit_autofetch_enabled') === 'true'
      : true
  );
  dismissedBehindBranch = $state<string | null>(null);
  lastFetchResult = $state<BackgroundFetchResult | null>(null);

  private autoFetchTimer: any = null;
  private focusListener: (() => void) | null = null;
  private currentRepoPathGetter: (() => string) | null = null;
  private currentOnCommitsFound: ((res: BackgroundFetchResult) => Promise<void>) | null = null;

  async runSilentAutoFetch(
    repoPath: string,
    onNewCommitsFound?: (res: BackgroundFetchResult) => Promise<void>
  ): Promise<BackgroundFetchResult | null> {
    if (!repoPath || this.isAutoFetching || this.isSyncing || this.isPushing) return null;
    this.isAutoFetching = true;
    try {
      const creds = this.getEffectiveCredentials();
      const res = await silentBackgroundFetch(repoPath, undefined, creds);
      this.lastAutoFetchTime = Date.now();
      this.lastFetchResult = res;

      if (res.success && res.has_new_commits) {
        if (onNewCommitsFound) {
          await onNewCommitsFound(res);
        }
      }
      return res;
    } catch (e) {
      console.debug('Silent background fetch skipped:', e);
      return null;
    } finally {
      this.isAutoFetching = false;
    }
  }

  startAutoFetch(
    getRepoPath: () => string,
    onNewCommitsFound: (res: BackgroundFetchResult) => Promise<void>
  ) {
    this.stopAutoFetch();
    this.currentRepoPathGetter = getRepoPath;
    this.currentOnCommitsFound = onNewCommitsFound;

    if (!this.autoFetchEnabled || this.autoFetchIntervalSeconds <= 0) return;

    // 1. Periodic Timer
    this.autoFetchTimer = setInterval(async () => {
      if (!this.autoFetchEnabled) return;
      const path = getRepoPath();
      if (!path) return;
      await this.runSilentAutoFetch(path, onNewCommitsFound);
    }, Math.max(30, this.autoFetchIntervalSeconds) * 1000);

    // 2. Window Focus Trigger with 60s cooldown
    this.focusListener = async () => {
      if (!this.autoFetchEnabled) return;
      const path = getRepoPath();
      if (!path) return;
      const now = Date.now();
      if (now - this.lastAutoFetchTime > 60_000) {
        await this.runSilentAutoFetch(path, onNewCommitsFound);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.focusListener);
    }
  }

  stopAutoFetch() {
    if (this.autoFetchTimer) {
      clearInterval(this.autoFetchTimer);
      this.autoFetchTimer = null;
    }
    if (this.focusListener && typeof window !== 'undefined') {
      window.removeEventListener('focus', this.focusListener);
      this.focusListener = null;
    }
  }

  setAutoFetchConfig(intervalSeconds: number, enabled: boolean = true) {
    this.autoFetchIntervalSeconds = intervalSeconds;
    this.autoFetchEnabled = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('flowgit_autofetch_interval', String(intervalSeconds));
      localStorage.setItem('flowgit_autofetch_enabled', String(enabled));
    }
    if (this.currentRepoPathGetter && this.currentOnCommitsFound) {
      this.startAutoFetch(this.currentRepoPathGetter, this.currentOnCommitsFound);
    }
  }

  dismissBehindNotice(branchName?: string) {
    this.dismissedBehindBranch = branchName || 'all';
  }
}

