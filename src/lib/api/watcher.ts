import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { isTauri } from './client';

export interface RepoWatchPayload {
  path: string;
  event_type: 'head' | 'working_tree' | 'all';
}

export async function listenRepoStatus(
  callback: (path: string, eventType?: 'head' | 'working_tree' | 'all') => void
): Promise<UnlistenFn> {
  if (isTauri) {
    try {
      return await listen<RepoWatchPayload | string>('repo-status-changed', (event) => {
        if (typeof event.payload === 'string') {
          callback(event.payload, 'all');
        } else if (event.payload && typeof event.payload === 'object') {
          callback(event.payload.path, event.payload.event_type);
        }
      });
    } catch (e) {
      console.warn('listenRepoStatus fallback:', e);
      return () => {};
    }
  }
  return () => {};
}

