<script lang="ts">
  import type { BranchInfo, RemoteInfo, RepoSummary, StashInfo, TagInfo, WorktreeInfo } from '../types';
  import {
    GitBranch,
    GitFork,
    FolderGit2,
    Tag,
    Archive,
    ChevronDown,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    Check,
    Globe,
    RefreshCw,
    Trash2,
    Shield,
    Lock,
    PanelLeftClose,
    Plus,
    CloudUpload,
    Upload,
    MoreVertical,
    Copy,
    Edit3,
    Settings,
    X as CloseIcon,
  } from 'lucide-svelte';

  interface Props {
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
    onOpenRemoteManager?: () => void;
    onFetchRemote?: (name: string) => Promise<void>;
    onPublishRepo?: () => void;
    onRebaseBranch?: (branch: BranchInfo) => void;
    onCleanMergedBranches?: () => void;
    onDeleteTag?: (tagName: string) => void;
    onCloseSidebar?: () => void;
    isPushing?: boolean;
  }

  let {
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
    onOpenRemoteManager,
    onFetchRemote,
    onPublishRepo,
    onRebaseBranch,
    onCleanMergedBranches,
    onDeleteTag,
    onCloseSidebar,
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

  let localBranches = $derived(branches.filter((b) => !b.is_remote));
  let remoteBranches = $derived(branches.filter((b) => b.is_remote));
</script>

<aside class="w-60 h-full bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col select-none overflow-hidden shrink-0 transition-all duration-200">
  <!-- Repository Overview Card -->
  <div class="p-3 border-b border-zinc-200 dark:border-zinc-800/60 bg-zinc-100/50 dark:bg-zinc-900/20">
    <div class="flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-medium text-xs">
      <div class="flex items-center gap-1.5 truncate">
        <FolderGit2 class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
        <span class="truncate font-semibold text-zinc-900 dark:text-zinc-100">{repoSummary?.name || 'No Repository'}</span>
      </div>
      {#if onCloseSidebar}
        <button
          onclick={onCloseSidebar}
          class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          title="Thu gọn sidebar (Ctrl + B)"
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
          <span>{repoSummary.dirty_files_count} unstaged</span>
        </div>
        {#if repoSummary.staged_files_count > 0}
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">
            {repoSummary.staged_files_count} staged
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Navigation Tree -->
  <div class="flex-1 overflow-y-auto p-2 space-y-3 font-sans">
    <!-- WORKTREES -->
    {#if worktrees.length > 0}
      <div>
        <button
          onclick={() => (showWorktrees = !showWorktrees)}
          class="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-1.5">
            <FolderGit2 class="w-3.5 h-3.5 text-zinc-400" />
            <span>Worktrees</span>
            <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({worktrees.length})</span>
          </div>
          {#if showWorktrees}
            <ChevronDown class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          {:else}
            <ChevronRight class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          {/if}
        </button>

        {#if showWorktrees}
          <div class="mt-1 space-y-0.5 pl-1">
            {#each worktrees as wt}
              <button
                onclick={onOpenWorktrees}
                class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/80 hover:text-zinc-950 dark:hover:text-white group"
              >
                <div class="flex items-center gap-2 truncate pr-1">
                  <span class="w-1.5 h-1.5 rounded-full {wt.is_main ? 'bg-cyan-500 dark:bg-cyan-400' : 'bg-purple-500 dark:bg-purple-400'} shrink-0"></span>
                  <span class="truncate font-mono text-[11px]">{wt.name}</span>
                </div>
                {#if wt.branch_name}
                  <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate max-w-20">{wt.branch_name}</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- LOCAL BRANCHES -->
    <div>
      <div
        class="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
      >
        <button
          onclick={() => (showLocalBranches = !showLocalBranches)}
          class="flex items-center gap-1.5 cursor-pointer flex-1 text-left"
        >
          <GitBranch class="w-3.5 h-3.5 text-zinc-400" />
          <span>Local Branches</span>
          <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({localBranches.length})</span>
        </button>
        <div class="flex items-center gap-1">
          {#if onCreateBranch}
            <button
              onclick={(e) => { e.stopPropagation(); onCreateBranch(); }}
              class="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors cursor-pointer"
              title="Tạo nhánh mới (New Branch)"
            >
              <Plus class="w-3 h-3" />
            </button>
          {/if}
          {#if onFetchPrune}
            <button
              onclick={(e) => { e.stopPropagation(); onFetchPrune(); }}
              class="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors cursor-pointer"
              title="Fetch & Đồng bộ tất cả nhánh"
            >
              <RefreshCw class="w-3 h-3" />
            </button>
          {/if}
          {#if onCleanMergedBranches}
            <button
              onclick={(e) => { e.stopPropagation(); onCleanMergedBranches(); }}
              class="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Dọn dẹp các nhánh đã merge (Clean Merged Branches)"
            >
              <Trash2 class="w-3 h-3" />
            </button>
          {/if}
          <button
            onclick={() => (showLocalBranches = !showLocalBranches)}
            class="p-0.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 cursor-pointer"
          >
            {#if showLocalBranches}
              <ChevronDown class="w-3.5 h-3.5" />
            {:else}
              <ChevronRight class="w-3.5 h-3.5" />
            {/if}
          </button>
        </div>
      </div>

      {#if showLocalBranches}
        <div class="mt-1 space-y-0.5 pl-1">
          {#each localBranches as branch (branch.name)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              oncontextmenu={(e) => {
                e.preventDefault();
                activeBranchMenu = { branch, x: Math.min(e.clientX, window.innerWidth - 220), y: Math.min(e.clientY, window.innerHeight - 260) };
              }}
              class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors group {branch.is_head ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-100 font-semibold border border-zinc-300 dark:border-zinc-700/60 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-zinc-200'}"
            >
              {#if editingBranchName === branch.shorthand}
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <div class="flex items-center gap-1.5 flex-1 pr-1" onclick={(e) => e.stopPropagation()}>
                  <!-- svelte-ignore a11y_autofocus -->
                  <input
                    type="text"
                    bind:value={inlineNewName}
                    autofocus
                    onkeydown={(e) => {
                      if (e.key === 'Enter') handleConfirmRename(branch);
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                    class="w-full px-1.5 py-0.5 text-[11px] font-mono bg-white dark:bg-zinc-900 text-zinc-900 dark:text-cyan-200 border border-cyan-500 rounded outline-hidden focus:ring-1 focus:ring-cyan-400"
                    placeholder="New branch name..."
                  />
                  <button
                    onclick={() => handleConfirmRename(branch)}
                    class="p-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-600/50 cursor-pointer"
                    title="Lưu tên mới (Enter)"
                  >
                    <Check class="w-3 h-3" />
                  </button>
                  <button
                    onclick={handleCancelRename}
                    class="p-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer"
                    title="Hủy (Esc)"
                  >
                    <CloseIcon class="w-3 h-3" />
                  </button>
                </div>
              {:else}
                <button
                  onclick={() => onSelectBranch?.(branch)}
                  ondblclick={(e) => {
                    e.stopPropagation();
                    startRename(branch);
                  }}
                  class="flex items-center gap-2 truncate pr-1 flex-1 text-left cursor-pointer"
                  title="Nhấp đúp để đổi tên nhánh (Double-click to rename)"
                >
                  {#if branch.is_head}
                    <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {:else}
                    <span class="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600 group-hover:bg-zinc-600 dark:group-hover:bg-zinc-400 shrink-0"></span>
                  {/if}
                  <span class="truncate font-mono text-[11px]">{branch.shorthand}</span>
                </button>
              {/if}

              <div class="flex items-center gap-1 shrink-0">
                <!-- If no upstream configured: show Publish button -->
                {#if !branch.upstream_name}
                  <button
                    onclick={(e) => { e.stopPropagation(); onPublishBranch?.(branch); }}
                    disabled={isPushing}
                    class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 hover:bg-cyan-200 dark:hover:bg-cyan-900 border border-cyan-300 dark:border-cyan-700/60 text-cyan-800 dark:text-cyan-300 hover:text-cyan-950 dark:hover:text-white text-[10px] font-medium transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    title={`Publish nhánh "${branch.shorthand}" lên remote origin (git push -u origin ${branch.shorthand})`}
                  >
                    <CloudUpload class="w-3 h-3 text-cyan-600 dark:text-cyan-400 {isPushing ? 'animate-bounce' : ''}" />
                    <span class="text-[9px] font-mono font-semibold">Publish</span>
                  </button>
                {:else}
                  <!-- Ahead / Behind Badge -->
                  {#if branch.ahead_count > 0 || branch.behind_count > 0}
                    <div class="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-400 shrink-0">
                      {#if branch.ahead_count > 0}
                        <span class="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                          <ArrowUp class="w-2.5 h-2.5" />{branch.ahead_count}
                        </span>
                      {/if}
                      {#if branch.behind_count > 0}
                        <span class="flex items-center text-amber-600 dark:text-amber-400 font-semibold">
                          <ArrowDown class="w-2.5 h-2.5" />{branch.behind_count}
                        </span>
                      {/if}
                    </div>
                  {/if}

                  <!-- Push to upstream button -->
                  {#if onPushBranch}
                    <button
                      onclick={(e) => {
                        e.stopPropagation();
                        if (branch.ahead_count > 0) {
                          onPushBranch?.(branch);
                        }
                      }}
                      disabled={isPushing || branch.ahead_count === 0}
                      class="{branch.ahead_count > 0
                        ? 'flex p-1 rounded bg-emerald-100 dark:bg-emerald-950/70 hover:bg-emerald-200 dark:hover:bg-emerald-900/90 border border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 cursor-pointer shadow-xs'
                        : 'opacity-0 group-hover:opacity-25 hidden group-hover:flex p-1 rounded text-zinc-400 dark:text-zinc-500 cursor-not-allowed'} transition-all"
                      title={branch.ahead_count > 0
                        ? `Push ${branch.ahead_count} commit mới lên ${branch.upstream_name || 'origin'}`
                        : `Đã đồng bộ mới nhất (Không có commit nào để push)`}
                    >
                      <Upload class="w-3 h-3" />
                    </button>
                  {/if}

                  {#if onFetchBranch}
                    <button
                      onclick={(e) => { e.stopPropagation(); onFetchBranch(branch); }}
                      class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-cyan-100 dark:hover:bg-cyan-950/60 text-zinc-400 dark:text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all cursor-pointer"
                      title={`Đồng bộ / Fetch nhánh ${branch.shorthand}`}
                    >
                      <RefreshCw class="w-3 h-3" />
                    </button>
                  {/if}
                {/if}

                <!-- Branch Actions Menu Button (3-dots) -->
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    activeBranchMenu = { branch, x: Math.min(rect.right, window.innerWidth - 220), y: Math.min(rect.bottom + 4, window.innerHeight - 260) };
                  }}
                  class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-all cursor-pointer"
                  title="Tùy chọn nhánh"
                >
                  <MoreVertical class="w-3 h-3" />
                </button>

                {#if isProtectedBranch(branch)}
                  {#if !branch.is_head}
                    <div
                      class="opacity-0 group-hover:opacity-100 p-1 text-amber-500/80 dark:text-amber-400/70"
                      title="Nhánh bảo vệ (Protected Branch)"
                    >
                      <Shield class="w-3 h-3" />
                    </div>
                  {/if}
                {:else if onDeleteBranch}
                  <button
                    onclick={(e) => { e.stopPropagation(); onDeleteBranch(branch); }}
                    class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
                    title={`Xóa nhánh ${branch.shorthand}`}
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                {/if}
              </div>
            </div>
          {/each}
          {#if localBranches.length === 0}
            <div class="px-2 py-1 text-[11px] text-zinc-400 dark:text-zinc-600 italic">No local branches</div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- REMOTE BRANCHES -->
    <div>
      <div
        class="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
      >
        <button
          onclick={() => (showRemoteBranches = !showRemoteBranches)}
          class="flex items-center gap-1.5 cursor-pointer flex-1 text-left"
        >
          <Globe class="w-3.5 h-3.5 text-zinc-400" />
          <span>Remote Branches</span>
          <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({remoteBranches.length})</span>
        </button>
        <div class="flex items-center gap-1">
          {#if onFetchPrune}
            <button
              onclick={(e) => { e.stopPropagation(); onFetchPrune(); }}
              class="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-purple-600 dark:hover:text-purple-300 transition-colors cursor-pointer"
              title="Fetch & Prune (Dọn dẹp các nhánh remote đã bị xóa)"
            >
              <RefreshCw class="w-3 h-3" />
            </button>
          {/if}
          <button
            onclick={() => (showRemoteBranches = !showRemoteBranches)}
            class="p-0.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 cursor-pointer"
          >
            {#if showRemoteBranches}
              <ChevronDown class="w-3.5 h-3.5" />
            {:else}
              <ChevronRight class="w-3.5 h-3.5" />
            {/if}
          </button>
        </div>
      </div>

      {#if showRemoteBranches}
        <div class="mt-1 space-y-0.5 pl-1">
          {#each remoteBranches as branch (branch.name)}
            <div
              class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/60 hover:text-zinc-950 dark:hover:text-zinc-200 transition-colors group"
            >
              <div class="flex items-center gap-2 truncate flex-1">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-500/60 shrink-0"></span>
                <span class="truncate font-mono text-[11px]">{branch.shorthand}</span>
              </div>
              {#if isProtectedBranch(branch)}
                <div
                  class="opacity-0 group-hover:opacity-100 p-1 text-purple-600/70 dark:text-purple-400/60"
                  title="Nhánh Remote cốt lõi (Protected Upstream Branch)"
                >
                  <Lock class="w-3 h-3" />
                </div>
              {:else if onDeleteBranch}
                <button
                  onclick={(e) => { e.stopPropagation(); onDeleteBranch(branch); }}
                  class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer shrink-0"
                  title={`Xóa reference remote ${branch.shorthand}`}
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              {/if}
            </div>
          {/each}
          {#if remoteBranches.length === 0}
            <div class="px-2 py-1 text-[11px] text-zinc-400 dark:text-zinc-600 italic">No remote branches</div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- REMOTES -->
    <div>
      <div
        class="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
      >
        <button
          onclick={() => (showRemotes = !showRemotes)}
          class="flex items-center gap-1.5 cursor-pointer flex-1 text-left"
        >
          <Globe class="w-3.5 h-3.5 text-zinc-400" />
          <span>Remotes</span>
          <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({remotes.length})</span>
        </button>
        <div class="flex items-center gap-1">
          {#if onOpenRemoteManager}
            <button
              onclick={(e) => { e.stopPropagation(); onOpenRemoteManager(); }}
              class="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors cursor-pointer"
              title="Quản lý Remotes (Thêm, sửa, xóa, đổi URL)"
            >
              <Plus class="w-3 h-3" />
            </button>
          {/if}
          <button
            onclick={() => (showRemotes = !showRemotes)}
            class="p-0.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 cursor-pointer"
          >
            {#if showRemotes}
              <ChevronDown class="w-3.5 h-3.5" />
            {:else}
              <ChevronRight class="w-3.5 h-3.5" />
            {/if}
          </button>
        </div>
      </div>

      {#if showRemotes}
        <div class="mt-1 space-y-0.5 pl-1">
          {#each remotes as remote (remote.name)}
            <div class="flex items-center justify-between px-2 py-1 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/60 hover:text-zinc-950 dark:hover:text-zinc-200 font-mono text-[11px] group">
              <div class="flex items-center gap-2 truncate" title={remote.fetch_url}>
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shrink-0"></span>
                <span class="truncate font-semibold text-zinc-800 dark:text-zinc-300">{remote.name}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                {#if onFetchRemote}
                  <button
                    onclick={() => onFetchRemote(remote.name)}
                    class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 dark:text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                    title={`Fetch từ ${remote.name}`}
                  >
                    <RefreshCw class="w-2.5 h-2.5" />
                  </button>
                {/if}
                {#if onOpenRemoteManager}
                  <button
                    onclick={onOpenRemoteManager}
                    class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                    title="Cấu hình Remote"
                  >
                    <Settings class="w-2.5 h-2.5" />
                  </button>
                {/if}
              </div>
            </div>
          {/each}
          {#if remotes.length === 0}
            <div class="px-2 py-2 flex flex-col gap-2">
              <div class="text-[11px] text-zinc-500 italic">Kho nội bộ (Chưa có remote)</div>
              {#if onPublishRepo}
                <button
                  type="button"
                  onclick={onPublishRepo}
                  class="w-full py-1.5 px-2.5 bg-indigo-100 dark:bg-indigo-600/20 hover:bg-indigo-200 dark:hover:bg-indigo-600/30 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 hover:border-indigo-400 dark:hover:border-indigo-500/50 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  title="Xuất bản dự án này lên GitHub (chọn Công khai hoặc Riêng tư)"
                >
                  <CloudUpload class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Xuất bản lên GitHub</span>
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- TAGS -->
    <div>
      <button
        onclick={() => (showTags = !showTags)}
        class="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
      >
        <div class="flex items-center gap-1.5">
          <Tag class="w-3.5 h-3.5 text-zinc-400" />
          <span>Tags</span>
          <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({tags.length})</span>
        </div>
        {#if showTags}
          <ChevronDown class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
        {:else}
          <ChevronRight class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
        {/if}
      </button>

      {#if showTags}
        <div class="mt-1 space-y-0.5 pl-1">
          {#each tags as tag (tag.name)}
            <div class="flex items-center justify-between px-2 py-1 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/60 hover:text-zinc-950 dark:hover:text-zinc-200 font-mono text-[11px] group">
              <div class="flex items-center gap-2 truncate">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0"></span>
                <span class="truncate">{tag.name}</span>
              </div>
              {#if onDeleteTag}
                <button
                  onclick={(e) => { e.stopPropagation(); onDeleteTag(tag.name); }}
                  class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  title="Xóa Tag {tag.name}"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              {/if}
            </div>
          {/each}
          {#if tags.length === 0}
            <div class="px-2 py-1 text-[11px] text-zinc-400 dark:text-zinc-600 italic">No tags</div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- STASHES -->
    <div>
      <button
        onclick={() => (showStashes = !showStashes)}
        class="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
      >
        <div class="flex items-center gap-1.5">
          <Archive class="w-3.5 h-3.5 text-zinc-400" />
          <span>Stashes</span>
          <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({stashes.length})</span>
        </div>
        {#if showStashes}
          <ChevronDown class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
        {:else}
          <ChevronRight class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
        {/if}
      </button>

      {#if showStashes}
        <div class="mt-1 space-y-0.5 pl-1">
          {#each stashes as stash (stash.index)}
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/60 hover:text-zinc-950 dark:hover:text-zinc-200 font-mono text-[11px]">
              <span class="text-rose-600 dark:text-rose-400 font-semibold">stash@{`{${stash.index}}`}</span>
              <span class="truncate text-zinc-500">{stash.message}</span>
            </div>
          {/each}
          {#if stashes.length === 0}
            <div class="px-2 py-1 text-[11px] text-zinc-400 dark:text-zinc-600 italic">No stashes</div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</aside>

<!-- Branch Action Context Menu Popup -->
{#if activeBranchMenu}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 bg-transparent"
    onclick={() => (activeBranchMenu = null)}
    oncontextmenu={(e) => { e.preventDefault(); activeBranchMenu = null; }}
  >
    <div
      class="fixed w-56 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl p-1 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100"
      style="left: {activeBranchMenu.x}px; top: {activeBranchMenu.y}px;"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="px-2.5 py-1.5 border-b border-zinc-200 dark:border-zinc-800/80 mb-1">
        <div class="font-mono text-[11px] font-bold text-zinc-900 dark:text-zinc-200 truncate flex items-center gap-1.5">
          <GitBranch class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span class="truncate">{activeBranchMenu.branch.shorthand}</span>
        </div>
        <div class="text-[10px] text-zinc-500 truncate mt-0.5">
          {activeBranchMenu.branch.upstream_name ? `Tracks: ${activeBranchMenu.branch.upstream_name}` : 'Local only (Chưa có trên remote)'}
        </div>
      </div>

      {#if !activeBranchMenu.branch.is_head}
        {#if onSelectBranch}
          <button
            onclick={() => {
              const b = activeBranchMenu?.branch;
              activeBranchMenu = null;
              if (b) onSelectBranch(b);
            }}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
          >
            <Check class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Checkout nhánh này</span>
          </button>
        {/if}

        {#if onRebaseBranch}
          <button
            onclick={() => {
              const b = activeBranchMenu?.branch;
              activeBranchMenu = null;
              if (b) onRebaseBranch(b);
            }}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 transition-colors cursor-pointer text-left font-medium"
            title="Rebase nhánh hiện tại ({repoSummary?.current_branch}) lên {activeBranchMenu.branch.shorthand}"
          >
            <GitFork class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span class="truncate">Rebase HEAD onto {activeBranchMenu.branch.shorthand}</span>
          </button>
        {/if}
      {/if}

      {#if !activeBranchMenu.branch.upstream_name}
        {#if onPublishBranch}
          <button
            onclick={() => {
              const b = activeBranchMenu?.branch;
              activeBranchMenu = null;
              if (b) onPublishBranch(b);
            }}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-cyan-50 dark:hover:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 hover:text-cyan-950 dark:hover:text-cyan-100 transition-colors cursor-pointer text-left font-medium"
          >
            <CloudUpload class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Publish lên remote (origin)</span>
          </button>
        {/if}
      {:else}
        {#if onPushBranch}
          <button
            onclick={() => {
              const b = activeBranchMenu?.branch;
              activeBranchMenu = null;
              if (b && b.ahead_count > 0) onPushBranch(b);
            }}
            disabled={activeBranchMenu.branch.ahead_count === 0}
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-md transition-colors text-left {activeBranchMenu.branch.ahead_count > 0 ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white cursor-pointer' : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-50'}"
            title={activeBranchMenu.branch.ahead_count > 0 ? `Push ${activeBranchMenu.branch.ahead_count} commit mới` : 'Đã đồng bộ mới nhất (0 commit ahead)'}
          >
            <div class="flex items-center gap-2">
              <Upload class="w-3.5 h-3.5 {activeBranchMenu.branch.ahead_count > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-600'}" />
              <span>Push lên {activeBranchMenu.branch.upstream_name}</span>
            </div>
            {#if activeBranchMenu.branch.ahead_count > 0}
              <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{activeBranchMenu.branch.ahead_count}</span>
            {:else}
              <span class="text-[9px] font-mono text-zinc-400 dark:text-zinc-600">Up to date</span>
            {/if}
          </button>
          <button
            onclick={() => {
              const b = activeBranchMenu?.branch;
              activeBranchMenu = null;
              if (b) onPushBranch(b, true);
            }}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-200 transition-colors cursor-pointer text-left"
          >
            <Upload class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Force Push (--force-with-lease)</span>
          </button>
        {/if}
        {#if onFetchBranch}
          <button
            onclick={() => {
              const b = activeBranchMenu?.branch;
              activeBranchMenu = null;
              if (b) onFetchBranch(b);
            }}
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
          >
            <RefreshCw class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Fetch & Đồng bộ</span>
          </button>
        {/if}
      {/if}

      {#if onCreateBranchFrom}
        <button
          onclick={() => {
            const b = activeBranchMenu?.branch;
            activeBranchMenu = null;
            if (b) onCreateBranchFrom(b);
          }}
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
        >
          <Plus class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <span>Tạo nhánh mới từ đây...</span>
        </button>
      {/if}

      {#if !activeBranchMenu.branch.is_remote}
        <button
          onclick={() => {
            const b = activeBranchMenu?.branch;
            if (b) startRename(b);
          }}
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
        >
          <Edit3 class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Đổi tên nhánh (Rename)</span>
        </button>
      {/if}

      <button
        onclick={() => {
          const b = activeBranchMenu?.branch;
          activeBranchMenu = null;
          if (b) navigator.clipboard.writeText(b.shorthand);
        }}
        class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
      >
        <Copy class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
        <span>Sao chép tên nhánh</span>
      </button>

      {#if !isProtectedBranch(activeBranchMenu.branch) && onDeleteBranch}
        <div class="h-px bg-zinc-200 dark:bg-zinc-800 my-1"></div>
        <button
          onclick={() => {
            const b = activeBranchMenu?.branch;
            activeBranchMenu = null;
            if (b) onDeleteBranch(b);
          }}
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200 transition-colors cursor-pointer text-left"
        >
          <Trash2 class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>Xóa nhánh này</span>
        </button>
      {/if}
    </div>
  </div>
{/if}
