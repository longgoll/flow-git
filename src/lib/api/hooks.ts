import { invoke } from '@tauri-apps/api/core';
import type { GitHookInfo } from '../types';
import { isTauri } from './client';

export async function getGitHooks(repoPath: string): Promise<GitHookInfo[]> {
  if (isTauri) {
    return await invoke<GitHookInfo[]>('get_git_hooks', { repoPath });
  }
  return [
    {
      name: 'pre-commit',
      description_key: 'hooks.preCommitDesc',
      enabled: false,
      exists: true,
      content: '#!/bin/sh\n# Mock pre-commit hook\nexit 0\n',
      sample_content: '#!/bin/sh\n# Sample pre-commit hook\nexit 0\n',
    },
    {
      name: 'commit-msg',
      description_key: 'hooks.commitMsgDesc',
      enabled: false,
      exists: false,
      content: '',
      sample_content: '#!/bin/sh\n# Sample commit-msg hook\nexit 0\n',
    },
  ];
}

export async function saveGitHook(
  repoPath: string,
  name: string,
  content: string,
  enabled: boolean
): Promise<void> {
  if (isTauri) {
    await invoke('save_git_hook', { repoPath, name, content, enabled });
  }
}

export async function toggleGitHook(
  repoPath: string,
  name: string,
  enabled: boolean
): Promise<void> {
  if (isTauri) {
    await invoke('toggle_git_hook', { repoPath, name, enabled });
  }
}
