export type OperationLogType = 'info' | 'success' | 'error' | 'warn';

export interface OperationLog {
  id: number;
  message: string;
  type: OperationLogType;
  timestamp: Date;
}

export type RefType = 'localbranch' | 'remotebranch' | 'tag' | 'stash' | 'head';

export interface RefInfo {
  name: string;
  shorthand: string;
  ref_type: RefType;
  is_head: boolean;
}

export type GraphViewMode = 'micro' | 'macro';
export type GraphDensity = 'comfortable' | 'compact' | 'ultra';

export interface GraphEdge {
  childIndex: number;
  parentIndex: number;
  childLane: number;
  parentLane: number;
  isTrunk: boolean;
  isFirstParent: boolean;
}

export interface CommitNode {
  id: string;
  short_id: string;
  parents: string[];
  author_name: string;
  author_email: string;
  summary: string;
  timestamp: number;
  lane: number;
  refs: RefInfo[];
  is_trunk?: boolean;
  is_capsule?: boolean;
  capsule_count?: number;
  collapsed_ids?: string[];
  is_ghost?: boolean;
  rebase_target_sha?: string;
}

export interface BranchInfo {
  name: string;
  shorthand: string;
  is_remote: boolean;
  is_head: boolean;
  target_commit_id: string;
  upstream_name?: string;
  ahead_count: number;
  behind_count: number;
}

export interface TagInfo {
  name: string;
  target_commit_id: string;
  message?: string;
}

export interface StashInfo {
  index: number;
  message: string;
  commit_id: string;
}

export interface StashFileItem {
  path: string;
  old_path?: string;
  status: string;
  additions: number;
  deletions: number;
  is_untracked: boolean;
}

export interface StashDetail {
  index: number;
  message: string;
  commit_id: string;
  branch_name?: string;
  created_at: number;
  files: StashFileItem[];
  total_additions: number;
  total_deletions: number;
}

export interface RepoSummary {
  path: string;
  name: string;
  is_bare: boolean;
  current_branch?: string;
  head_commit_id?: string;
  is_detached: boolean;
  dirty_files_count: number;
  staged_files_count: number;
}

export interface RemoteInfo {
  name: string;
  fetch_url?: string;
  push_url?: string;
}

export interface BlameHunkItem {
  final_commit_id: string;
  final_short_id: string;
  final_start_line: number;
  lines_in_hunk: number;
  author_name: string;
  author_email: string;
  timestamp: number;
  summary: string;
}

export interface FileHistoryItem {
  commit_id: string;
  short_id: string;
  summary: string;
  author_name: string;
  author_email: string;
  timestamp: number;
}

export interface RebaseTodoItem {
  action: 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop' | string;
  commit_id: string;
  short_id: string;
  summary: string;
  author: string;
}

export interface GitHookInfo {
  name: string;
  description_key: string;
  enabled: boolean;
  exists: boolean;
  content: string;
  sample_content?: string | null;
}

export interface GitIdentity {
  id: string;
  label: string;
  name: string;
  email: string;
  signing_key?: string;
}

export interface CurrentRepoIdentity {
  name?: string;
  email?: string;
  is_local: boolean;
}

export interface LockedFileInfo {
  path: string;
  is_locked: boolean;
  reason?: string;
}

export interface HeavyFileInfo {
  path: string;
  size_bytes: number;
  size_formatted: string;
}

export interface FileChangeInfo {
  path: string;
  old_path?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | string;
  additions: number;
  deletions: number;
}

export interface CommitDetail {
  id: string;
  short_id: string;
  parents: string[];
  author_name: string;
  author_email: string;
  author_timestamp: number;
  committer_name: string;
  committer_email: string;
  committer_timestamp: number;
  message: string;
  files_changed: FileChangeInfo[];
}

export type FileDeltaStatus =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'typechange'
  | 'untracked'
  | 'conflicted';

export interface FileStatusItem {
  path: string;
  old_path?: string;
  status: FileDeltaStatus;
  is_staged: boolean;
  is_conflicted: boolean;
  is_dir?: boolean;
}

export type RepoOperationState =
  | { type: 'Normal' }
  | { type: 'Rebasing'; data: { current_step: number; total_steps: number; head_name: string } }
  | { type: 'Merging'; data: { merge_heads: string[] } }
  | { type: 'CherryPicking'; data: { head_name?: string } }
  | { type: 'Reverting'; data: { head_name?: string } }
  | { type: 'Bisecting' };

export interface WorkingTreeStatus {
  staged: FileStatusItem[];
  unstaged: FileStatusItem[];
  untracked: FileStatusItem[];
  conflicted: FileStatusItem[];
  total_dirty_count: number;
  total_staged_count: number;
  operation_state?: RepoOperationState;
}

export type LineChangeType = 'context' | 'addition' | 'deletion';

export interface DiffLine {
  line_type: LineChangeType;
  content: string;
  old_lineno?: number;
  new_lineno?: number;
}

export interface HunkDiff {
  hunk_index: number;
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: DiffLine[];
}

export interface FileDiffDetail {
  path: string;
  old_path?: string;
  is_staged: boolean;
  is_binary: boolean;
  additions: number;
  deletions: number;
  hunks: HunkDiff[];
  original_content?: string | null;
  modified_content?: string | null;
}

export interface TreeEntryItem {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number | null;
}

export interface FileContentResponse {
  path: string;
  content: string;
  is_binary: boolean;
  size_bytes: number;
}

export interface FileGrepMatch {
  file_path: string;
  line_number: number;
  line_content: string;
}

export interface TrashSnapshotItem {
  id: number;
  repo_path: string;
  file_path: string;
  diff_preview: string;
  created_at: number;
  head_commit_sha?: string;
  file_size: number;
}

export type LayoutMode = 'horizontal' | 'three-column';

export type ViewMode = 'graph' | 'changes' | 'compare' | 'conflict' | 'focus' | 'stacked' | 'dag' | 'files' | 'pr';

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  html_url: string;
  user: GitHubUser;
  head: {
    ref: string;
    sha: string;
    label: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  comments?: number;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  draft?: boolean;
  merged?: boolean;
  merged_at?: string | null;
  mergeable?: boolean | null;
  mergeable_state?: string;
}

export interface GitHubPRFile {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  raw_url?: string;
}

export interface GitHubPRComment {
  id: number;
  body: string;
  path?: string;
  line?: number;
  side?: 'LEFT' | 'RIGHT';
  commit_id?: string;
  user: GitHubUser;
  created_at: string;
  html_url: string;
}

export interface GitHubPRCommit {
  sha: string;
  node_id: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author?: GitHubUser | null;
  html_url: string;
}

export interface GitHubCheckRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | 'action_required' | 'skipped' | null;
  html_url: string;
  started_at?: string;
  completed_at?: string;
}

export interface GitHubCommitChecks {
  total_count: number;
  check_runs: GitHubCheckRun[];
  state: 'success' | 'failure' | 'pending' | 'none';
}

export interface GitHubBranchComparison {
  status: 'ahead' | 'behind' | 'diverged' | 'identical';
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: GitHubPRCommit[];
  files: GitHubPRFile[];
}

export interface SmartFilters {
  hideMerges: boolean;
  myCommits: boolean;
  compactView: boolean;
}

export interface FocusBranchResult {
  branch_name: string;
  base_branch: string;
  ahead_count: number;
  behind_count: number;
  base_commit_id: string;
  head_commit_id: string;
  commits: CommitNode[];
}

export interface StackedCommitItem {
  id: string;
  short_id: string;
  summary: string;
  author_name: string;
  author_email: string;
  timestamp: number;
  is_pushed: boolean;
}

export interface ConflictSimulationResult {
  has_conflicts: boolean;
  conflict_files: string[];
  is_fast_forward: boolean;
  source_id: string;
  target_id: string;
  ahead_count: number;
  behind_count: number;
}

export interface WorktreeInfo {
  name: string;
  path: string;
  is_locked: boolean;
  lock_reason?: string;
  head_commit_id?: string;
  branch_name?: string;
  is_main: boolean;
}

export interface ComparisonResult {
  base_id: string;
  target_id: string;
  commits_between: CommitNode[];
  files_changed: FileChangeInfo[];
  total_additions: number;
  total_deletions: number;
}

export interface SmartSyncResult {
  branch_name: string;
  remote_name: string;
  status: string;
  updated_commit_id?: string;
}

export interface BackgroundFetchResult {
  success: boolean;
  has_new_commits: boolean;
  current_branch?: string;
  upstream_branch?: string;
  ahead_count: number;
  behind_count: number;
  message: string;
}

export interface DragDropGraphPayload {
  sourceCommit: CommitNode;
  clientX: number;
  clientY: number;
  targetCommit: CommitNode | null;
  simulation: ConflictSimulationResult | null;
  isSimulating: boolean;
}

export interface DropActionModalState {
  isOpen: boolean;
  sourceCommit: CommitNode | null;
  targetCommit: CommitNode | null;
  simulation: ConflictSimulationResult | null;
  position: { x: number; y: number };
}

export interface RebaseExecutionResult {
  status: 'completed' | 'conflict' | 'aborted';
  message: string;
  head_commit_id?: string | null;
  conflicted_files: string[];
}

// ----------------------------------------------------------------------
// Phase 4 Types
// ----------------------------------------------------------------------
export interface ConflictChunk {
  chunk_index: number;
  is_conflict: boolean;
  base_content: string;
  our_content: string;
  their_content: string;
}

export interface ConflictFileDetail {
  path: string;
  base_content: string;
  our_content: string;
  their_content: string;
  chunks: ConflictChunk[];
  is_resolved: boolean;
}

export interface BisectStatus {
  is_active: boolean;
  bad_commit_id?: string;
  good_commit_ids: string[];
  current_commit_id?: string;
  current_commit_summary?: string;
  current_commit_author?: string;
  estimated_steps_remaining: number;
  tested_commits_count: number;
  total_commits_count: number;
  culprit_commit_id?: string;
  original_head?: string;
}

export interface ActionRecord {
  id: number;
  repo_path: string;
  action_type: string;
  description: string;
  previous_head: string;
  new_head: string;
  branch_name?: string;
  severity: 'safe' | 'moderate' | 'destructive' | string;
  timestamp: number;
  is_undone: boolean;
}

export interface AISettings {
  provider: 'ollama' | 'openai' | 'custom' | 'heuristic';
  endpoint: string;
  apiKey: string;
  model: string;
}

// ----------------------------------------------------------------------
// Phase 5: Git Submodules, LFS, Auth & Monorepo Scaling
// ----------------------------------------------------------------------

export interface SubmoduleInfo {
  name: string;
  path: string;
  url: string;
  head_oid?: string;
  index_oid?: string;
  workdir_oid?: string;
  status: 'clean' | 'modified' | 'uninitialized' | 'out_of_sync' | string;
}

export interface LfsFileInfo {
  path: string;
  oid_sha256: string;
  size_bytes: number;
  is_pointer: boolean;
}

export interface LfsLockInfo {
  id: string;
  path: string;
  owner: string;
  locked_at: string;
}

export interface LfsSummary {
  is_lfs_enabled: boolean;
  tracked_patterns: string[];
  files: LfsFileInfo[];
  locks: LfsLockInfo[];
}

export interface GitCredentials {
  auth_type: 'ssh_passphrase' | 'https_token' | 'https_basic' | 'oauth';
  ssh_passphrase?: string;
  username?: string;
  token?: string;
}

export interface RemoteActionResult {
  success: boolean;
  message: string;
  requires_auth: boolean;
  auth_type_hint?: 'ssh_passphrase' | 'https';
}

export interface PaginatedCommitHistory {
  commits: CommitNode[];
  total_count: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface AccountProfile {
  id: string;
  username: string;
  name?: string;
  avatar_url?: string;
  provider: 'github' | 'gitlab' | string;
  token: string;
  auth_method: 'oauth' | 'pat' | 'ssh' | string;
  is_active: boolean;
  created_at: number;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface DevicePollResult {
  status: 'pending' | 'success' | 'slow_down' | 'expired' | 'error';
  token?: string;
  profile?: AccountProfile;
  error_message?: string;
}

export interface WorkspaceTab {
  id: string;
  path: string;
  name: string;
  branch?: string;
  isWorktree: boolean;
  mainRepoPath?: string;
  dirtyFilesCount?: number;
  openPRCount?: number;
  lastActiveAt?: number;
  // Per-tab isolated state:
  selectedFilePath?: string | null;
  selectedFileIsStaged?: boolean;
  selectedCommitId?: string | null;
  selectedCommitIds?: string[];
  viewMode?: ViewMode;
  searchQuery?: string;
  recentPushedBranch?: string | null;
}

export interface SecretFinding {
  file_path: string;
  rule_id: string;
  rule_name: string;
  description: string;
  line_number?: number | null;
  snippet_masked?: string | null;
  severity: 'critical' | 'warning';
}

export interface ReflogEntry {
  index: number;
  commit_id: string;
  short_id: string;
  old_id: string;
  action: string;
  message: string;
  committer: string;
  timestamp: number;
  is_orphaned: boolean;
}

