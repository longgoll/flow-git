import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { isTauri } from './client';

export async function listenRepoStatus(callback: (path: string) => void): Promise<UnlistenFn> {
  if (isTauri) {
    try {
      return await listen<string>('repo-status-changed', (event) => {
        callback(event.payload);
      });
    } catch (e) {
      console.warn('listenRepoStatus fallback:', e);
      return () => {};
    }
  }
  return () => {};
}
