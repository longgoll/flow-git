import { invoke } from '@tauri-apps/api/core';
import type {
  CommitDetail,
  CommitNode,
  ComparisonResult,
  FileContentResponse,
  FileGrepMatch,
  FocusBranchResult,
  GitCredentials,
  PaginatedCommitHistory,
  PickaxeSearchResult,
  RepoSummary,
  StackedCommitItem,
  TrashSnapshotDiffResult,
  TreeEntryItem,
} from '../types';
import { isTauri } from './client';
import { getMockCommitDetail, getMockCommitHistory, getMockRepoSummary } from './mocks';

export async function openRepository(path: string): Promise<RepoSummary> {
  if (isTauri) {
    return await invoke<RepoSummary>('open_repository', { path });
  }
  return getMockRepoSummary(path);
}

export async function initRepository(
  path: string,
  defaultBranch?: string
): Promise<RepoSummary> {
  if (isTauri) {
    return await invoke<RepoSummary>('init_repository', {
      path,
      defaultBranch: defaultBranch || null,
    });
  }
  return getMockRepoSummary(path);
}

export async function cloneRepository(
  url: string,
  targetPath: string,
  credentials?: GitCredentials
): Promise<RepoSummary> {
  if (isTauri) {
    return await invoke<RepoSummary>('clone_repository', {
      url,
      targetPath,
      credentials,
    });
  }
  return getMockRepoSummary(targetPath);
}

export async function getCommitHistory(path: string, maxCount: number = 2000): Promise<CommitNode[]> {
  if (isTauri) {
    return await invoke<CommitNode[]>('get_commit_history', { path, maxCount });
  }
  return getMockCommitHistory();
}

export async function getPaginatedCommitHistory(
  path: string,
  skip: number,
  limit: number
): Promise<PaginatedCommitHistory> {
  if (isTauri) {
    return await invoke<PaginatedCommitHistory>('get_paginated_commit_history', {
      path,
      skip,
      limit,
    });
  }
  const all = getMockCommitHistory();
  const end = Math.min(skip + limit, all.length);
  return {
    commits: all.slice(skip, end),
    total_count: all.length,
    skip,
    limit,
    has_more: all.length > skip + limit,
  };
}

export async function getCommitInfo(path: string, commitId: string): Promise<CommitDetail> {
  if (isTauri) {
    return await invoke<CommitDetail>('get_commit_info', { path, commitId });
  }
  return getMockCommitDetail(commitId);
}

export async function compareTwoCommits(
  path: string,
  baseCommitId: string,
  targetCommitId: string
): Promise<ComparisonResult> {
  if (isTauri) {
    return await invoke<ComparisonResult>('compare_two_commits', {
      path,
      baseCommitId,
      targetCommitId,
    });
  }
  return {
    base_id: baseCommitId,
    target_id: targetCommitId,
    commits_between: [],
    files_changed: [
      {
        path: 'src/lib/components/CommitGraph.svelte',
        status: 'modified',
        additions: 25,
        deletions: 4,
      },
    ],
    total_additions: 25,
    total_deletions: 4,
  };
}

export async function getFocusBranchInfo(path: string, branchName?: string, baseBranch?: string): Promise<FocusBranchResult> {
  if (isTauri) {
    return await invoke<FocusBranchResult>('get_focus_branch_info', { path, branchName, baseBranch });
  }
  const history = getMockCommitHistory();
  return {
    branch_name: branchName || 'feature/quick-diff',
    base_branch: 'main',
    ahead_count: 3,
    behind_count: 1,
    base_commit_id: history[3]?.id || 'mock-base',
    head_commit_id: history[0]?.id || 'mock-head',
    commits: history.slice(0, 4).map((c) => ({ ...c, lane: 0 })),
  };
}

export async function getUnpushedStackedCommits(path: string): Promise<StackedCommitItem[]> {
  if (isTauri) {
    return await invoke<StackedCommitItem[]>('get_unpushed_stacked_commits', { path });
  }
  const history = getMockCommitHistory();
  return history.slice(0, 4).map((c) => ({
    id: c.id,
    short_id: c.short_id,
    summary: c.summary,
    message: c.summary,
    author_name: c.author_name,
    author_email: c.author_email,
    timestamp: c.timestamp,
    is_pushed: false,
  }));
}

export async function reorderStackedCommits(path: string, commitIds: string[]): Promise<string> {
  if (isTauri) {
    return await invoke<string>('reorder_stacked_commits', { path, commitIds });
  }
  return commitIds[0] || 'success';
}

export async function getTreeEntries(
  path: string,
  dirPath?: string,
  commitOid?: string
): Promise<TreeEntryItem[]> {
  if (isTauri) {
    return await invoke<TreeEntryItem[]>('get_tree_entries', {
      path,
      dirPath: dirPath || null,
      commitOid: commitOid || null,
    });
  }
  return [];
}

export async function getFileContent(
  path: string,
  filePath: string,
  commitOid?: string
): Promise<FileContentResponse> {
  if (isTauri) {
    return await invoke<FileContentResponse>('get_file_content', {
      path,
      filePath,
      commitOid: commitOid || null,
    });
  }
  return {
    path: filePath,
    content: '// Mock content for browser preview',
    is_binary: false,
    size_bytes: 35,
  };
}

export async function getRemoteUrl(
  path: string,
  remoteName?: string
): Promise<string | null> {
  if (isTauri) {
    return await invoke<string | null>('get_remote_url', {
      path,
      remoteName: remoteName || null,
    });
  }
  return 'https://github.com/flowgit/flowgit-desktop.git';
}

export async function nukeFileFromHistory(
  path: string,
  filePath: string
): Promise<string> {
  if (isTauri) {
    return await invoke<string>('nuke_file_from_history', {
      path,
      filePath,
    });
  }
  return `Mock: Deleted ${filePath} from history`;
}

export async function saveFileContent(
  path: string,
  filePath: string,
  content: string
): Promise<void> {
  if (isTauri) {
    await invoke<void>('save_file_content', { path, filePath, content });
  }
}

export async function grepRepositoryContent(
  path: string,
  query: string,
  caseSensitive?: boolean,
  maxResults?: number
): Promise<FileGrepMatch[]> {
  if (isTauri) {
    return await invoke<FileGrepMatch[]>('grep_repository_content', {
      path,
      query,
      caseSensitive: caseSensitive ?? false,
      maxResults: maxResults ?? 200,
    });
  }
  return [];
}

export async function openInExternalEditor(
  fullPath: string,
  editor?: string
): Promise<void> {
  if (isTauri) {
    await invoke<void>('open_in_external_editor', {
      fullPath,
      editor: editor || null,
    });
  }
}

export async function revealInFileManager(
  fullPath: string
): Promise<void> {
  if (isTauri) {
    await invoke<void>('reveal_in_file_manager', { fullPath });
  }
}

export async function getTrashSnapshotDiff(
  snapshotId: number
): Promise<TrashSnapshotDiffResult> {
  if (isTauri) {
    return await invoke<TrashSnapshotDiffResult>('get_trash_snapshot_diff', { snapshotId });
  }
  return {
    file_path: 'mock/path.ts',
    snapshot_content: '// Mock snapshot content\nexport const x = 1;\n',
    current_content: '// Mock current content\nexport const x = 2;\n',
    is_oversized: false,
  };
}

export async function searchCommitsPickaxe(
  path: string,
  query: string,
  isRegex?: boolean,
  maxResults?: number
): Promise<PickaxeSearchResult[]> {
  if (isTauri) {
    return await invoke<PickaxeSearchResult[]>('search_commits_pickaxe', {
      path,
      query,
      isRegex: isRegex ?? false,
      maxResults: maxResults ?? 40,
    });
  }
  return [];
}




