import type { ComponentType } from 'svelte';
import { GitPullRequest, GitMerge, FileCode, XCircle } from 'lucide-svelte';
import type { GitHubPRFile, GitHubPullRequest } from '../../types';
import { localeState } from '../../state/localeState.svelte';

export interface ParsedDiffLine {
  type: 'header' | 'add' | 'del' | 'context';
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface SplitDiffRow {
  isHeader: boolean;
  headerContent?: string;
  left?: {
    type: 'del' | 'context' | 'empty';
    lineNumber: number | null;
    content: string;
  };
  right?: {
    type: 'add' | 'context' | 'empty';
    lineNumber: number | null;
    content: string;
  };
}

export interface FileStatusBadge {
  label: string;
  bg: string;
  text: string;
  border: string;
}

export interface PRStatusBadge {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: ComponentType;
}

export function parsePatchLines(patch: string): ParsedDiffLine[] {
  const rawLines = patch.split('\n');
  const result: ParsedDiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of rawLines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({
        type: 'header',
        oldLineNumber: null,
        newLineNumber: null,
        content: line,
      });
    } else if (line.startsWith('+')) {
      result.push({
        type: 'add',
        oldLineNumber: null,
        newLineNumber: newLine,
        content: line.slice(1),
      });
      newLine++;
    } else if (line.startsWith('-')) {
      result.push({
        type: 'del',
        oldLineNumber: oldLine,
        newLineNumber: null,
        content: line.slice(1),
      });
      oldLine++;
    } else {
      result.push({
        type: 'context',
        oldLineNumber: oldLine > 0 ? oldLine : null,
        newLineNumber: newLine > 0 ? newLine : null,
        content: line.startsWith(' ') ? line.slice(1) : line,
      });
      if (oldLine > 0) oldLine++;
      if (newLine > 0) newLine++;
    }
  }
  return result;
}

export function parseSplitDiffRows(patch: string): SplitDiffRow[] {
  const unifiedLines = parsePatchLines(patch);
  const rows: SplitDiffRow[] = [];
  let i = 0;
  while (i < unifiedLines.length) {
    const line = unifiedLines[i];
    if (line.type === 'header') {
      rows.push({ isHeader: true, headerContent: line.content });
      i++;
    } else if (line.type === 'context') {
      rows.push({
        isHeader: false,
        left: { type: 'context', lineNumber: line.oldLineNumber, content: line.content },
        right: { type: 'context', lineNumber: line.newLineNumber, content: line.content },
      });
      i++;
    } else {
      const dels: ParsedDiffLine[] = [];
      const adds: ParsedDiffLine[] = [];
      while (i < unifiedLines.length && (unifiedLines[i].type === 'del' || unifiedLines[i].type === 'add')) {
        if (unifiedLines[i].type === 'del') dels.push(unifiedLines[i]);
        else adds.push(unifiedLines[i]);
        i++;
      }
      const maxLen = Math.max(dels.length, adds.length);
      for (let k = 0; k < maxLen; k++) {
        const d = dels[k];
        const a = adds[k];
        rows.push({
          isHeader: false,
          left: d ? { type: 'del', lineNumber: d.oldLineNumber, content: d.content } : undefined,
          right: a ? { type: 'add', lineNumber: a.newLineNumber, content: a.content } : undefined,
        });
      }
    }
  }
  return rows;
}

export function getFileStatusBadge(file: GitHubPRFile): FileStatusBadge {
  if (file.status === 'added') {
    return { label: 'A', bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-800' };
  }
  if (file.status === 'deleted') {
    return { label: 'D', bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-300 dark:border-rose-800' };
  }
  if (file.status === 'renamed') {
    return { label: 'R', bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-800' };
  }
  return { label: 'M', bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-800' };
}

export function getPRStatusBadge(pr: GitHubPullRequest): PRStatusBadge {
  if (pr.merged || pr.merged_at) {
    return {
      label: localeState.t('pullRequest.reviewer.statusBadges.merged'),
      bg: 'bg-purple-100 dark:bg-purple-950/80',
      text: 'text-purple-800 dark:text-purple-300',
      border: 'border-purple-300 dark:border-purple-800/60',
      icon: GitMerge,
    };
  }
  if (pr.draft) {
    return {
      label: localeState.t('pullRequest.reviewer.statusBadges.draft'),
      bg: 'bg-zinc-100 dark:bg-zinc-900',
      text: 'text-zinc-600 dark:text-zinc-400',
      border: 'border-dashed border-zinc-300 dark:border-zinc-700',
      icon: FileCode,
    };
  }
  if (pr.state === 'closed') {
    return {
      label: localeState.t('pullRequest.reviewer.statusBadges.closed'),
      bg: 'bg-rose-100 dark:bg-rose-950/80',
      text: 'text-rose-800 dark:text-rose-300',
      border: 'border-rose-300 dark:border-rose-800/60',
      icon: XCircle,
    };
  }
  return {
    label: localeState.t('pullRequest.reviewer.statusBadges.open'),
    bg: 'bg-emerald-100 dark:bg-emerald-950/80',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-800/60',
    icon: GitPullRequest,
  };
}
