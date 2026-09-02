import type { AISettings } from '../types';

export async function generateAICommitMessage(
  diffContext: string,
  settings: AISettings
): Promise<string> {
  if (settings.provider === 'ollama' && settings.endpoint) {
    try {
      const response = await fetch(`${settings.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.model || 'qwen2.5-coder',
          prompt: `You are an expert Git assistant. Write a clear, concise Conventional Commit message (e.g. feat(scope): message, fix(scope): message) for the following changes:\n\n${diffContext.slice(0, 3000)}\n\nOnly respond with the commit message, nothing else.`,
          stream: false,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.response.trim();
      }
    } catch (e) {
      console.warn('Ollama API failed, falling back to heuristic AI:', e);
    }
  }

  // Smart Heuristic Fallback
  return generateHeuristicCommitMessage(diffContext);
}

export function generateHeuristicCommitMessage(diff: string): string {
  const lines = diff.split('\n');
  const files: string[] = [];
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      files.push(line.replace('+++ b/', ''));
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
    }
  }

  const primaryFile = files[0] || 'app';
  const basename = primaryFile.split('/').pop()?.split('.')[0] || 'core';

  if (files.some((f) => f.includes('test'))) {
    return `test(${basename}): add automated tests and edge case coverage`;
  }
  if (files.some((f) => f.endsWith('.md'))) {
    return `docs(${basename}): update documentation and workflow guides`;
  }
  if (deletions > additions * 2) {
    return `refactor(${basename}): streamline logic and cleanup redundant code`;
  }
  if (diff.toLowerCase().includes('fix') || diff.toLowerCase().includes('bug') || diff.toLowerCase().includes('error')) {
    return `fix(${basename}): resolve issue in ${basename} and stabilize behavior`;
  }
  return `feat(${basename}): implement new updates and improvements`;
}
