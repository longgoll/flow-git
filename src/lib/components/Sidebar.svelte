<script lang="ts">
  import type { BranchInfo, RemoteInfo, RepoSummary, StashInfo, TagInfo, WorktreeInfo } from '../types';
  import type { RepoState } from '../state/repoState.svelte';
  import { FolderGit2, PanelLeftClose } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';
  import SidebarBranchTree from './sidebar/SidebarBranchTree.svelte';
  import SidebarSections from './sidebar/SidebarSections.svelte';
  import SidebarContextMenu from './sidebar/SidebarContextMenu.svelte';

  interface Props {
    repo?: RepoState;
    repoSummary: RepoSummary | null;
    branches: BranchInfo[];
    tags?: TagInfo[];
    stashes?: StashInfo[];
    worktrees?: WorktreeInfo[];
    remotes?: RemoteInfo[];
    onSelectBranch?: (branch: BranchInfo) => void;
    onDeleteBranch?: (branch: BranchInfo) => void;
    onRenameBranch?: (branch: BranchInfo, newName: string) => Promise<void>;
    onPublishBranch?: (branch: BranchInfo) => void;
    onPushBranch?: (branch: BranchInfo, force?: boolean) => void;
    onFetchBranch?: (branch: BranchInfo) => void;
    onFetchPrune?: () => void;
    onCreateBranch?: () => void;
    onCreateBranchFrom?: (branch: BranchInfo) => void;
    onOpenWorktrees?: () => void;
    onSelectWorktree?: (wt: WorktreeInfo) => void;
    onOpenRemoteManager?: () => void;
    onFetchRemote?: (name: string) => Promise<void>;
    onPublishRepo?: () => void;
    onRebaseBranch?: (branch: BranchInfo) => void;
    onCleanMergedBranches?: () => void;
    onDeleteTag?: (tagName: string) => void;
    onCreatePullRequest?: (branch: BranchInfo) => void;
    onCloseSidebar?: () => void;
    onOpenStashShelf?: (index?: number) => void;
    isPushing?: boolean;
  }

  let {
    repo,
    repoSummary,
    branches = [],
    tags = [],
    stashes = [],
    worktrees = [],
    remotes = [],
    onSelectBranch,
    onDeleteBranch,
    onRenameBranch,
    onPublishBranch,
    onPushBranch,
    onFetchBranch,
    onFetchPrune,
    onCreateBranch,
    onCreateBranchFrom,
    onOpenWorktrees,
    onSelectWorktree,
    onOpenRemoteManager,
    onFetchRemote,
    onPublishRepo,
    onRebaseBranch,
    onCleanMergedBranches,
    onDeleteTag,
    onCreatePullRequest,
    onCloseSidebar,
    onOpenStashShelf,
    isPushing = false,
  }: Props = $props();

  let showLocalBranches = $state(true);
  let showRemoteBranches = $state(true);
  let showRemotes = $state(true);
  let showTags = $state(false);
  let showStashes = $state(false);
  let showWorktrees = $state(true);

  let activeBranchMenu = $state<{ branch: BranchInfo; x: number; y: number } | null>(null);

  // Inline branch rename state
  let editingBranchName = $state<string | null>(null);
  let inlineNewName = $state<string>('');

  function startRename(branch: BranchInfo) {
    editingBranchName = branch.shorthand;
    inlineNewName = branch.shorthand;
    activeBranchMenu = null;
  }

  async function handleConfirmRename(branch: BranchInfo) {
    const trimmed = inlineNewName.trim();
    if (trimmed && trimmed !== branch.shorthand && onRenameBranch) {
      await onRenameBranch(branch, trimmed);
    }
    editingBranchName = null;
    inlineNewName = '';
  }

  function handleCancelRename() {
    editingBranchName = null;
    inlineNewName = '';
  }

  const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'dev', 'trunk', 'head', 'release']);

  function isProtectedBranch(branch: BranchInfo): boolean {
    if (branch.is_head) return true;
    const name = branch.shorthand.toLowerCase();
    const cleanName = name.replace(/^(origin|upstream|remotes\/[^\/]+)\//, '');
    return PROTECTED_BRANCHES.has(cleanName) || cleanName === 'head';
  }
</script>

<aside class="w-60 h-full bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col select-none overflow-hidden shrink-0 transition-all duration-200">
  <!-- Repository Overview Card -->
  <div class="p-3 border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-100/50 dark:bg-zinc-900/20">
    <div class="flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-medium text-xs">
      <div class="flex items-center gap-1.5 truncate">
        <FolderGit2 class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
        <span class="truncate font-semibold text-zinc-900 dark:text-zinc-100">{repoSummary?.name || localeState.t('sidebar.noRepo')}</span>
      </div>
      {#if onCloseSidebar}
        <button
          onclick={onCloseSidebar}
          class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          title={localeState.t('sidebar.collapseSidebar')}
        >
          <PanelLeftClose class="w-3.5 h-3.5" />
        </button>
      {/if}
    </div>
    {#if repoSummary}
      <div class="mt-0.5 text-[10px] text-zinc-500 truncate font-mono">
        {repoSummary.path}
      </div>
      <div class="mt-2 flex items-center gap-2">
        <div class="flex items-center gap-1 text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
          <span class="w-1.5 h-1.5 rounded-full {repoSummary.dirty_files_count > 0 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-emerald-500 dark:bg-emerald-400'}"></span>
          <span>{repoSummary.dirty_files_count} {localeState.t('statusBar.unstaged')}</span>
        </div>
        {#if repoSummary.staged_files_count > 0}
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">
            {repoSummary.staged_files_count} {localeState.t('statusBar.staged')}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Navigation Tree -->
  <div class="flex-1 overflow-y-auto p-2 space-y-3 font-sans">
    <!-- WORKTREES, REMOTES, TAGS, STASHES -->
    <SidebarSections
      {worktrees}
      {remotes}
      {tags}
      {stashes}
      bind:showWorktrees
      bind:showRemotes
      bind:showTags
      bind:showStashes
      {onOpenWorktrees}
      {onSelectWorktree}
      {onOpenRemoteManager}
      {onFetchRemote}
      {onPublishRepo}
      {onDeleteTag}
      {onOpenStashShelf}
    />

    <!-- LOCAL & REMOTE BRANCHES -->
    <SidebarBranchTree
      {branches}
      {repo}
      bind:showLocalBranches
      bind:showRemoteBranches
      {isPushing}
      bind:editingBranchName
      bind:inlineNewName
      {onSelectBranch}
      {onDeleteBranch}
      onRenameConfirm={handleConfirmRename}
      onRenameCancel={handleCancelRename}
      onStartRename={startRename}
      {onPublishBranch}
      {onPushBranch}
      {onFetchBranch}
      {onFetchPrune}
      {onCreateBranch}
      {onCleanMergedBranches}
      onOpenContextMenu={(branch, x, y) => {
        activeBranchMenu = { branch, x, y };
      }}
      {isProtectedBranch}
    />
  </div>
</aside>

<!-- Branch Action Context Menu Popup -->
<SidebarContextMenu
  {activeBranchMenu}
  {repoSummary}
  isPinned={activeBranchMenu && repo ? repo.isBranchPinned(activeBranchMenu.branch.shorthand) : false}
  isHidden={activeBranchMenu && repo ? repo.isBranchHidden(activeBranchMenu.branch.shorthand) : false}
  onClose={() => (activeBranchMenu = null)}
  {onSelectBranch}
  {onRebaseBranch}
  {onPublishBranch}
  {onPushBranch}
  {onFetchBranch}
  {onCreatePullRequest}
  {onCreateBranchFrom}
  onStartRename={startRename}
  {onDeleteBranch}
  onTogglePin={(b) => repo?.togglePinBranch(b.shorthand)}
  onToggleVisibility={(b) => repo?.toggleBranchVisibility(b.shorthand)}
  onSoloBranch={(b) => repo?.soloBranch(b.shorthand)}
  {isProtectedBranch}
/>
