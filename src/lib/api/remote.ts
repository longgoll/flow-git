import { invoke } from '@tauri-apps/api/core';
import type { GitCredentials, RemoteInfo } from '../types';
import { isTauri } from './client';

export async function getRemotes(path: string): Promise<RemoteInfo[]> {
  if (isTauri) {
    return await invoke<RemoteInfo[]>('get_remotes', { path });
  }
  return [
    { name: 'origin', fetch_url: 'https://github.com/flowgit/flowgit.git', push_url: 'https://github.com/flowgit/flowgit.git' },
  ];
}

export async function addRemote(path: string, name: string, url: string): Promise<RemoteInfo> {
  if (isTauri) {
    return await invoke<RemoteInfo>('add_remote', { path, name, url });
  }
  return { name, fetch_url: url, push_url: url };
}

export async function removeRemote(path: string, name: string): Promise<void> {
  if (isTauri) {
    await invoke('remove_remote', { path, name });
  }
}

export async function setRemoteUrl(path: string, name: string, newUrl: string): Promise<void> {
  if (isTauri) {
    await invoke('set_remote_url', { path, name, newUrl });
  }
}

export async function fetchRemote(
  path: string,
  name: string,
  credentials?: GitCredentials
): Promise<string> {
  if (isTauri) {
    return await invoke<string>('fetch_remote', { path, name, credentials });
  }
  return `Fetched ${name} successfully.`;
}
