import { invoke } from '@tauri-apps/api/core';
import type {
  AccountProfile,
  DeviceCodeResponse,
  DevicePollResult,
  GitCredentials,
  RemoteActionResult,
  RepoBinding,
} from '../types';
import { isTauri } from './client';

export async function executeRemoteWithAuth(
  path: string,
  action: 'push' | 'pull' | 'fetch' | 'publish',
  remote = 'origin',
  branch?: string,
  force = false,
  setUpstream?: boolean,
  credentials?: GitCredentials
): Promise<RemoteActionResult> {
  if (isTauri) {
    return await invoke<RemoteActionResult>('execute_remote_with_auth', {
      path,
      action,
      remote,
      branch,
      force,
      setUpstream: setUpstream ?? (action === 'publish'),
      set_upstream: setUpstream ?? (action === 'publish'),
      credentials,
    });
  }
  return {
    success: true,
    message: `Git ${action} executed successfully (mock)`,
    requires_auth: false,
  };
}

export async function saveAccountAuth(profile: AccountProfile): Promise<void> {
  if (isTauri) {
    await invoke('save_account_auth', { profile });
  }
}

export async function getActiveAccount(provider?: string): Promise<AccountProfile | null> {
  if (isTauri) {
    return await invoke<AccountProfile | null>('get_active_account', { provider });
  }
  return null;
}

export async function listAccounts(): Promise<AccountProfile[]> {
  if (isTauri) {
    return await invoke<AccountProfile[]>('list_accounts');
  }
  return [];
}

export async function deleteAccount(id: string): Promise<void> {
  if (isTauri) {
    await invoke('delete_account', { id });
  }
}

export async function verifyTokenAndGetProfile(
  provider: string,
  token: string,
  host?: string
): Promise<AccountProfile> {
  if (isTauri) {
    return await invoke<AccountProfile>('verify_token_and_get_profile', {
      provider,
      token,
      host,
    });
  }
  return {
    id: `mock_${provider}_user`,
    username: `${provider}_user`,
    name: 'Mock User',
    avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
    provider,
    token,
    auth_method: 'pat',
    is_active: true,
    created_at: Math.floor(Date.now() / 1000),
  };
}

export async function startGithubDeviceLogin(clientId?: string): Promise<DeviceCodeResponse> {
  if (isTauri) {
    return await invoke<DeviceCodeResponse>('start_github_device_login', { clientId });
  }
  return {
    device_code: 'mock-device-code',
    user_code: 'ABCD-1234',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval: 5,
  };
}

export async function checkGithubDeviceLogin(
  deviceCode: string,
  clientId?: string
): Promise<DevicePollResult> {
  if (isTauri) {
    return await invoke<DevicePollResult>('check_github_device_login', {
      clientId,
      deviceCode,
    });
  }
  return {
    status: 'success',
    token: 'mock-token',
    profile: {
      id: 'github_12345',
      username: 'flowgit_user',
      name: 'FlowGit Developer',
      avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
      provider: 'github',
      token: 'mock-token',
      auth_method: 'oauth',
      is_active: true,
      created_at: Math.floor(Date.now() / 1000),
    },
  };
}

export async function getRepoBinding(repoPath: string): Promise<RepoBinding | null> {
  if (isTauri) {
    return await invoke<RepoBinding | null>('get_repo_binding', { repoPath });
  }
  return null;
}

export async function saveRepoBinding(binding: RepoBinding): Promise<void> {
  if (isTauri) {
    await invoke('save_repo_binding', { binding });
  }
}

export async function listRepoBindings(): Promise<RepoBinding[]> {
  if (isTauri) {
    return await invoke<RepoBinding[]>('list_repo_bindings');
  }
  return [];
}

export async function deleteRepoBinding(repoPath: string): Promise<void> {
  if (isTauri) {
    await invoke('delete_repo_binding', { repoPath });
  }
}

