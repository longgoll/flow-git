import { invoke } from '@tauri-apps/api/core';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export class CommandTimeoutError extends Error {
  constructor(cmd: string, timeoutMs: number) {
    super(`Command '${cmd}' timed out after ${timeoutMs}ms`);
    this.name = 'CommandTimeoutError';
  }
}

/**
 * Invokes a Tauri command with an explicit timeout to prevent UI freezes.
 *
 * @param cmd The command name
 * @param args The command arguments
 * @param timeoutMs Maximum duration in milliseconds before rejecting (default: 20,000ms)
 */
export async function invokeWithTimeout<T>(
  cmd: string,
  args?: Record<string, unknown>,
  timeoutMs: number = 20000
): Promise<T> {
  if (!isTauri) {
    throw new Error(`Cannot invoke Tauri command '${cmd}' in web/mock environment`);
  }

  let timerId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(new CommandTimeoutError(cmd, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      invoke<T>(cmd, args),
      timeoutPromise,
    ]);
    return result;
  } finally {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
  }
}
