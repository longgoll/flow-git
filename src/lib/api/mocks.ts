import type {
  BranchInfo,
  CommitDetail,
  CommitNode,
  FileDiffDetail,
  RepoSummary,
  TrashSnapshotItem,
  WorkingTreeStatus,
} from '../types';

export function getMockRepoSummary(path: string): RepoSummary {
  return {
    path: path || 'f:/Dev/product/git-tool',
    name: 'git-tool',
    is_bare: false,
    current_branch: 'feature/living-graph',
    head_commit_id: 'a1b2c3d4e5f6',
    is_detached: false,
    dirty_files_count: 3,
    staged_files_count: 2,
  };
}

export function getMockBranches(): BranchInfo[] {
  return [
    {
      name: 'feature/living-graph',
      shorthand: 'feature/living-graph',
      is_remote: false,
      is_head: true,
      target_commit_id: 'a1b2c3d4e5f6',
      upstream_name: 'origin/feature/living-graph',
      ahead_count: 2,
      behind_count: 1,
    },
    {
      name: 'main',
      shorthand: 'main',
      is_remote: false,
      is_head: false,
      target_commit_id: 'd4e5f6a1b2c3',
      upstream_name: 'origin/main',
      ahead_count: 0,
      behind_count: 0,
    },
    {
      name: 'origin/main',
      shorthand: 'origin/main',
      is_remote: true,
      is_head: false,
      target_commit_id: 'd4e5f6a1b2c3',
      ahead_count: 0,
      behind_count: 0,
    },
  ];
}

export function getMockCommitHistory(): CommitNode[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      id: 'a1b2c3d4e5f678901234567890abcdef12345678',
      short_id: 'a1b2c3d',
      parents: ['b2c3d4e5f6a178901234567890abcdef12345678'],
      author_name: 'Luu Ho',
      author_email: 'luuho@flowgit.app',
      summary: 'feat(graph): implement OffscreenCanvas web worker with cubic bezier curves',
      timestamp: now - 300,
      lane: 1,
      refs: [
        { name: 'HEAD', shorthand: 'HEAD', ref_type: 'head', is_head: true },
        { name: 'refs/heads/feature/living-graph', shorthand: 'feature/living-graph', ref_type: 'localbranch', is_head: true },
      ],
    },
    {
      id: 'b2c3d4e5f6a178901234567890abcdef12345678',
      short_id: 'b2c3d4e',
      parents: ['c3d4e5f6a1b278901234567890abcdef12345678'],
      author_name: 'Luu Ho',
      author_email: 'luuho@flowgit.app',
      summary: 'merge: sync upstream changes and resolve topological lane compacting',
      timestamp: now - 3600,
      lane: 1,
      refs: [],
    },
    {
      id: 'c3d4e5f6a1b278901234567890abcdef12345678',
      short_id: 'c3d4e5f',
      parents: ['d4e5f6a1b2c378901234567890abcdef12345678'],
      author_name: 'Luu Ho',
      author_email: 'luuho@flowgit.app',
      summary: 'feat(ui): setup Tailwind CSS v4 and Dark Theme HSL color palette',
      timestamp: now - 14400,
      lane: 0,
      refs: [{ name: 'refs/heads/main', shorthand: 'main', ref_type: 'localbranch', is_head: false }],
    },
  ];
}

export function getMockCommitDetail(commitId: string): CommitDetail {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: commitId,
    short_id: commitId.slice(0, 7),
    parents: ['b2c3d4e5f6a178901234567890abcdef12345678'],
    author_name: 'Luu Ho',
    author_email: 'luuho@flowgit.app',
    author_timestamp: now - 300,
    committer_name: 'Luu Ho',
    committer_email: 'luuho@flowgit.app',
    committer_timestamp: now - 300,
    message: `feat(graph): implement OffscreenCanvas web worker with cubic bezier curves\n\n- Multi-threaded rendering on dedicated Web Worker\n- 60 FPS locked scroll performance`,
    files_changed: [
      { path: 'src/lib/workers/graphWorker.ts', status: 'added', additions: 180, deletions: 0 },
      { path: 'src/lib/components/CommitGraph.svelte', status: 'modified', additions: 145, deletions: 12 },
    ],
  };
}

export function getMockWorkingTreeStatus(): WorkingTreeStatus {
  return {
    staged: [
      { path: 'src/lib/components/DiffViewer.svelte', status: 'added', is_staged: true, is_conflicted: false },
      { path: 'src/lib/components/WorkingTree.svelte', status: 'modified', is_staged: true, is_conflicted: false },
    ],
    unstaged: [
      { path: 'src-tauri/src/git/safety.rs', status: 'modified', is_staged: false, is_conflicted: false },
      { path: 'src/App.svelte', status: 'modified', is_staged: false, is_conflicted: false },
    ],
    untracked: [
      { path: 'src/lib/components/TrashInspector.svelte', status: 'untracked', is_staged: false, is_conflicted: false },
    ],
    conflicted: [],
    total_dirty_count: 3,
    total_staged_count: 2,
  };
}

export function getMockFileDiff(filePath: string, staged: boolean): FileDiffDetail {
  return {
    path: filePath,
    old_path: undefined,
    is_staged: staged,
    is_binary: false,
    additions: 5,
    deletions: 2,
    hunks: [
      {
        hunk_index: 0,
        old_start: 10,
        old_lines: 5,
        new_start: 10,
        new_lines: 8,
        header: '@@ -10,5 +10,8 @@ export interface State',
        lines: [
          { line_type: 'context', content: '  export interface AppState {', old_lineno: 10, new_lineno: 10 },
          { line_type: 'deletion', content: '-   readonly dirty: boolean;', old_lineno: 11, new_lineno: undefined },
          { line_type: 'addition', content: '+   readonly workingTreeStatus: WorkingTreeStatus;', old_lineno: undefined, new_lineno: 11 },
          { line_type: 'addition', content: '+   readonly safeDiscard48h: boolean;', old_lineno: undefined, new_lineno: 12 },
          { line_type: 'context', content: '    readonly commits: CommitNode[];', old_lineno: 12, new_lineno: 13 },
        ],
      },
    ],
  };
}

export function getMockTrashSnapshots(): TrashSnapshotItem[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      id: 1,
      repo_path: 'f:/Dev/product/git-tool',
      file_path: 'src/lib/components/ExperimentalFeature.svelte',
      diff_preview: '+// Experimental feature draft\n+export const debug = true;',
      created_at: now - 180,
      head_commit_sha: 'a1b2c3d',
      file_size: 420,
    },
    {
      id: 2,
      repo_path: 'f:/Dev/product/git-tool',
      file_path: 'src-tauri/src/temp_test.rs',
      diff_preview: '+fn test_something() { ... }',
      created_at: now - 3600,
      head_commit_sha: 'a1b2c3d',
      file_size: 1024,
    },
  ];
}
