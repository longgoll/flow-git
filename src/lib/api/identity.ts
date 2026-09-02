import { invoke } from '@tauri-apps/api/core';
import type { CurrentRepoIdentity, GitIdentity } from '../types';
import { isTauri } from './client';

export async function getCurrentRepoIdentity(path: string): Promise<CurrentRepoIdentity> {
  if (isTauri) {
    return await invoke<CurrentRepoIdentity>('get_current_repo_identity', { path });
  }
  return {
    name: 'Dev User',
    email: 'dev@example.com',
    is_local: false,
  };
}

export async function setRepoIdentity(
  path: string,
  name: string,
  email: string,
  isGlobal: boolean = false
): Promise<void> {
  if (isTauri) {
    await invoke('set_repo_identity', { path, name, email, isGlobal });
  }
}

export async function listIdentityProfiles(): Promise<GitIdentity[]> {
  if (isTauri) {
    return await invoke<GitIdentity[]>('list_identity_profiles');
  }
  return [
    { id: 'default-work', label: 'Công việc (Work)', name: 'Lưu Hồ', email: 'luuho@company.com' },
    { id: 'default-personal', label: 'Cá nhân (Personal)', name: 'Luu Ho', email: 'luuho@gmail.com' },
  ];
}

export async function saveIdentityProfile(identity: GitIdentity): Promise<void> {
  if (isTauri) {
    await invoke('save_identity_profile', { identity });
  }
}

export async function deleteIdentityProfile(id: string): Promise<void> {
  if (isTauri) {
    await invoke('delete_identity_profile', { id });
  }
}
