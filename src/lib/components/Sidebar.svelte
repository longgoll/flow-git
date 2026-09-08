<script lang="ts">
  import type { BranchInfo, RemoteInfo, RepoSummary, StashInfo, TagInfo, WorktreeInfo } from '../types';
  import type { RepoState } from '../state/repoState.svelte';
  import {
    FolderGit2,
    PanelLeftClose,
    PanelLeft,
    GitBranch,
    Globe,
    Tag,
    Archive,
    Plus,
    RefreshCw,
    Trash2,
    CloudUpload,
  } from 'lucide-svelte';
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
    viewMode?: import('../types').ViewMode;
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
    viewMode,
  }: Props = $props();

  // Rail Navigation Tab Type
  type RailTab = 'branches' | 'remotes' | 'tags' | 'stashes' | 'worktrees';

  // Context-Aware Sidebar Adaptation
  let previousViewMode = $state<import('../types').ViewMode | undefined>(undefined);

  $effect(() => {
    if (viewMode && viewMode !== previousViewMode) {
      previousViewMode = viewMode;
      if (viewMode === 'graph' || viewMode === 'focus' || viewMode === 'stacked' || viewMode === 'dag' || viewMode === 'compare') {
        activeRailTab = 'branches';
      } else if (viewMode === 'changes') {
        if (stashes.length > 0) {
          activeRailTab = 'stashes';
        }
      } else if (viewMode === 'pr') {
        if (remotes.length > 0) {
          activeRailTab = 'remotes';
        }
      }
    }
  });

  // Persistent States
  const savedWidth = typeof localStorage !== 'undefined' ? localStorage.getItem('flowgit_sidebar_width') : null;
  const savedTab = typeof localStorage !== 'undefined' ? localStorage.getItem('flowgit_sidebar_rail_tab') : null;
  const savedCollapsed = typeof localStorage !== 'undefined' ? localStorage.getItem('flowgit_sidebar_panel_collapsed') : null;

  let sidebarWidth = $state<number>(savedWidth ? Math.max(250, Math.min(520, parseInt(savedWidth, 10))) : 280);
  let activeRailTab = $state<RailTab>((savedTab as RailTab) || 'branches');
  let isPanelCollapsed = $state<boolean>(savedCollapsed === 'true');
  let isDragging = $state<boolean>(false);

  // Branch tree section visibility
  let showLocalBranches = $state(true);
  let showRemoteBranches = $state(true);

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

  // Handle Tab Switch / Toggle
  function handleSelectRailTab(tab: RailTab) {
    if (activeRailTab === tab) {
      // Toggle collapse if clicking the same tab
      isPanelCollapsed = !isPanelCollapsed;
    } else {
      activeRailTab = tab;
      isPanelCollapsed = false;
    }
    try {
      localStorage.setItem('flowgit_sidebar_rail_tab', activeRailTab);
      localStorage.setItem('flowgit_sidebar_panel_collapsed', isPanelCollapsed ? 'true' : 'false');
    } catch {}
  }

  function togglePanelCollapse() {
    isPanelCollapsed = !isPanelCollapsed;
    try {
      localStorage.setItem('flowgit_sidebar_panel_collapsed', isPanelCollapsed ? 'true' : 'false');
    } catch {}
  }

  // Resizing logic
  function handleResizeStart(e: MouseEvent) {
    e.preventDefault();
    isDragging = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    function onMouseMove(event: MouseEvent) {
      const delta = event.clientX - startX;
      sidebarWidth = Math.max(240, Math.min(550, startWidth + delta));
    }

    function onMouseUp() {
      isDragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        localStorage.setItem('flowgit_sidebar_width', sidebarWidth.toString());
      } catch {}
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
</script>

<aside
  class="relative h-full flex select-none overflow-hidden shrink-0 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950 transition-[width] {isDragging ? 'duration-0' : 'duration-150'}"
  style="width: {isPanelCollapsed ? '44px' : `${sidebarWidth}px`};"
>
  <!-- 1. LEFT ICON RAIL (Activity Bar - 44px) -->
  <div class="w-11 h-full bg-zinc-100/90 dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-center py-2.5 justify-between shrink-0 z-10">
    <!-- Top Rail Tab Buttons -->
    <div class="flex flex-col items-center gap-2 w-full px-1">
      <!-- Branches Tab -->
      <button
        onclick={() => handleSelectRailTab('branches')}
        class="relative p-2 rounded-lg transition-all cursor-pointer group {activeRailTab === 'branches' && !isPanelCollapsed ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-900'}"
        title="{localeState.t('sidebar.tabBranches')} ({branches.length})"
      >
        <GitBranch class="w-4 h-4 transition-transform group-hover:scale-110" />
        {#if activeRailTab === 'branches' && !isPanelCollapsed}
          <span class="absolute left-0 top-1.5 bottom-1.5 w-0.75 bg-cyan-600 dark:bg-cyan-400 rounded-r"></span>
        {/if}
      </button>

      <!-- Remotes Tab -->
      <button
        onclick={() => handleSelectRailTab('remotes')}
        class="relative p-2 rounded-lg transition-all cursor-pointer group {activeRailTab === 'remotes' && !isPanelCollapsed ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-900'}"
        title="{localeState.t('sidebar.tabRemotes')} ({remotes.length})"
      >
        <Globe class="w-4 h-4 transition-transform group-hover:scale-110" />
        {#if remotes.length > 0}
          <span class="absolute top-1 right-1 px-1 min-w-3.5 h-3.5 flex items-center justify-center rounded-full bg-cyan-600 dark:bg-cyan-500 text-[9px] font-mono font-bold text-white leading-none">
            {remotes.length}
          </span>
        {/if}
        {#if activeRailTab === 'remotes' && !isPanelCollapsed}
          <span class="absolute left-0 top-1.5 bottom-1.5 w-0.75 bg-cyan-600 dark:bg-cyan-400 rounded-r"></span>
        {/if}
      </button>

      <!-- Tags Tab -->
      <button
        onclick={() => handleSelectRailTab('tags')}
        class="relative p-2 rounded-lg transition-all cursor-pointer group {activeRailTab === 'tags' && !isPanelCollapsed ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-900'}"
        title="{localeState.t('sidebar.tabTags')} ({tags.length})"
      >
        <Tag class="w-4 h-4 transition-transform group-hover:scale-110" />
        {#if tags.length > 0}
          <span class="absolute top-1 right-1 px-1 min-w-3.5 h-3.5 flex items-center justify-center rounded-full bg-amber-500 dark:bg-amber-400 text-[9px] font-mono font-bold text-white dark:text-zinc-950 leading-none">
            {tags.length}
          </span>
        {/if}
        {#if activeRailTab === 'tags' && !isPanelCollapsed}
          <span class="absolute left-0 top-1.5 bottom-1.5 w-0.75 bg-cyan-600 dark:bg-cyan-400 rounded-r"></span>
        {/if}
      </button>

      <!-- Stashes Tab -->
      <button
        onclick={() => handleSelectRailTab('stashes')}
        class="relative p-2 rounded-lg transition-all cursor-pointer group {activeRailTab === 'stashes' && !isPanelCollapsed ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-900'}"
        title="{localeState.t('sidebar.tabStashes')} ({stashes.length})"
      >
        <Archive class="w-4 h-4 transition-transform group-hover:scale-110" />
        {#if stashes.length > 0}
          <span class="absolute top-1 right-1 px-1 min-w-3.5 h-3.5 flex items-center justify-center rounded-full bg-amber-500 dark:bg-amber-400 text-[9px] font-mono font-bold text-white dark:text-zinc-950 leading-none">
            {stashes.length}
          </span>
        {/if}
        {#if activeRailTab === 'stashes' && !isPanelCollapsed}
          <span class="absolute left-0 top-1.5 bottom-1.5 w-0.75 bg-cyan-600 dark:bg-cyan-400 rounded-r"></span>
        {/if}
      </button>

      <!-- Worktrees Tab -->
      <button
        onclick={() => handleSelectRailTab('worktrees')}
        class="relative p-2 rounded-lg transition-all cursor-pointer group {activeRailTab === 'worktrees' && !isPanelCollapsed ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-900'}"
        title="{localeState.t('sidebar.tabWorktrees')} ({worktrees.length})"
      >
        <FolderGit2 class="w-4 h-4 transition-transform group-hover:scale-110" />
        {#if worktrees.length > 1}
          <span class="absolute top-1 right-1 px-1 min-w-3.5 h-3.5 flex items-center justify-center rounded-full bg-purple-500 dark:bg-purple-400 text-[9px] font-mono font-bold text-white leading-none">
            {worktrees.length}
          </span>
        {/if}
        {#if activeRailTab === 'worktrees' && !isPanelCollapsed}
          <span class="absolute left-0 top-1.5 bottom-1.5 w-0.75 bg-cyan-600 dark:bg-cyan-400 rounded-r"></span>
        {/if}
      </button>
    </div>

    <!-- Bottom Collapse / Expand Action -->
    <div class="w-full px-1 flex flex-col items-center">
      <button
        onclick={togglePanelCollapse}
        class="p-2 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
        title={isPanelCollapsed ? localeState.t('sidebar.expandPanel') : localeState.t('sidebar.collapsePanel')}
      >
        {#if isPanelCollapsed}
          <PanelLeft class="w-4 h-4" />
        {:else}
          <PanelLeftClose class="w-4 h-4" />
        {/if}
      </button>
    </div>
  </div>

  <!-- 2. RIGHT ACTIVE PANEL -->
  {#if !isPanelCollapsed}
    <div class="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/50">
      <!-- Repository Overview Card -->
      <div class="p-2.5 border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-100/50 dark:bg-zinc-900/20 shrink-0">
        <div class="flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-medium text-xs">
          <div class="flex items-center gap-1.5 truncate">
            <FolderGit2 class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
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
          <div class="mt-1.5 flex items-center gap-2">
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

      <!-- Section Title & Quick Actions Header -->
      <div class="px-3 py-2 border-b border-zinc-200/70 dark:border-zinc-800/50 flex items-center justify-between shrink-0 bg-white/40 dark:bg-zinc-900/30">
        <span class="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-sans">
          {#if activeRailTab === 'branches'}
            {localeState.t('sidebar.tabBranches')}
          {:else if activeRailTab === 'remotes'}
            {localeState.t('sidebar.tabRemotes')}
          {:else if activeRailTab === 'tags'}
            {localeState.t('sidebar.tabTags')}
          {:else if activeRailTab === 'stashes'}
            {localeState.t('sidebar.tabStashes')}
          {:else if activeRailTab === 'worktrees'}
            {localeState.t('sidebar.tabWorktrees')}
          {/if}
        </span>

        <!-- Section Top Action Buttons -->
        <div class="flex items-center gap-1">
          {#if activeRailTab === 'branches'}
            {#if onCreateBranch}
              <button
                onclick={onCreateBranch}
                class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                title={localeState.t('sidebar.createBranch')}
              >
                <Plus class="w-3.5 h-3.5" />
              </button>
            {/if}
            {#if onFetchPrune}
              <button
                onclick={onFetchPrune}
                class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                title={localeState.t('sidebar.fetchPruneAll')}
              >
                <RefreshCw class="w-3.5 h-3.5" />
              </button>
            {/if}
            {#if onCleanMergedBranches}
              <button
                onclick={onCleanMergedBranches}
                class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                title={localeState.t('sidebar.cleanMergedBranches')}
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            {/if}
          {:else if activeRailTab === 'remotes'}
            {#if onOpenRemoteManager}
              <button
                onclick={onOpenRemoteManager}
                class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                title={localeState.t('sidebar.manageRemotesTitle')}
              >
                <Plus class="w-3.5 h-3.5" />
              </button>
            {/if}
            {#if remotes.length === 0 && onPublishRepo}
              <button
                onclick={onPublishRepo}
                class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                title={localeState.t('sidebar.publishRepoToGithub')}
              >
                <CloudUpload class="w-3.5 h-3.5" />
              </button>
            {/if}
          {:else if activeRailTab === 'stashes'}
            {#if onOpenStashShelf && stashes.length > 0}
              <button
                onclick={() => onOpenStashShelf?.(0)}
                class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                title="Mở Visual Stash Shelf"
              >
                <Archive class="w-3.5 h-3.5" />
              </button>
            {/if}
          {:else if activeRailTab === 'worktrees'}
            {#if onOpenWorktrees}
              <button
                onclick={onOpenWorktrees}
                class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                title={localeState.t('toolbar.worktrees')}
              >
                <Plus class="w-3.5 h-3.5" />
              </button>
            {/if}
          {/if}
        </div>
      </div>

      <!-- Navigation Content Tree (Scrollable) -->
      <div class="flex-1 overflow-y-auto p-2 font-sans">
        {#if activeRailTab === 'branches'}
          <SidebarBranchTree
            {branches}
            {repo}
            bind:showLocalBranches
            bind:showRemoteBranches
            {isPushing}
            bind:editingBranchName
            bind:inlineNewName
            {onSelectBranch}
            onRenameConfirm={handleConfirmRename}
            onRenameCancel={handleCancelRename}
            onStartRename={startRename}
            {onPublishBranch}
            {onPushBranch}
            {onFetchPrune}
            {onCreateBranch}
            onOpenContextMenu={(branch, x, y) => {
              activeBranchMenu = { branch, x, y };
            }}
            {isProtectedBranch}
          />
        {:else if activeRailTab === 'remotes'}
          <SidebarSections
            {remotes}
            activeSection="remotes"
            standalone={true}
            showWorktrees={false}
            showRemotes={true}
            showTags={false}
            showStashes={false}
            {onOpenRemoteManager}
            {onFetchRemote}
            {onPublishRepo}
          />
        {:else if activeRailTab === 'tags'}
          <SidebarSections
            {tags}
            activeSection="tags"
            standalone={true}
            showWorktrees={false}
            showRemotes={false}
            showTags={true}
            showStashes={false}
            {onDeleteTag}
          />
        {:else if activeRailTab === 'stashes'}
          <SidebarSections
            {stashes}
            activeSection="stashes"
            standalone={true}
            showWorktrees={false}
            showRemotes={false}
            showTags={false}
            showStashes={true}
            {onOpenStashShelf}
          />
        {:else if activeRailTab === 'worktrees'}
          <SidebarSections
            {worktrees}
            activeSection="worktrees"
            standalone={true}
            showWorktrees={true}
            showRemotes={false}
            showTags={false}
            showStashes={false}
            {onOpenWorktrees}
            {onSelectWorktree}
          />
        {/if}
      </div>
    </div>
  {/if}

  <!-- 3. DRAG TO RESIZE HANDLE (Right Border) -->
  {#if !isPanelCollapsed}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onmousedown={handleResizeStart}
      class="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cyan-500/50 active:bg-cyan-500 transition-colors z-30 select-none {isDragging ? 'bg-cyan-500' : ''}"
      title="Kéo để thay đổi độ rộng Sidebar"
    ></div>
  {/if}
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
