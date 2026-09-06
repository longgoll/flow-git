<script lang="ts">
  import {
    FolderGit2,
    Globe,
    Tag,
    Archive,
    ChevronDown,
    ChevronRight,
    RefreshCw,
    Trash2,
    Plus,
    CloudUpload,
    Settings,
  } from 'lucide-svelte';
  import type { RemoteInfo, StashInfo, TagInfo, WorktreeInfo } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    worktrees?: WorktreeInfo[];
    remotes?: RemoteInfo[];
    tags?: TagInfo[];
    stashes?: StashInfo[];
    showWorktrees: boolean;
    showRemotes: boolean;
    showTags: boolean;
    showStashes: boolean;
    onOpenWorktrees?: () => void;
    onSelectWorktree?: (wt: WorktreeInfo) => void;
    onOpenRemoteManager?: () => void;
    onFetchRemote?: (name: string) => Promise<void>;
    onPublishRepo?: () => void;
    onDeleteTag?: (tagName: string) => void;
  }

  let {
    worktrees = [],
    remotes = [],
    tags = [],
    stashes = [],
    showWorktrees = $bindable(true),
    showRemotes = $bindable(true),
    showTags = $bindable(false),
    showStashes = $bindable(false),
    onOpenWorktrees,
    onSelectWorktree,
    onOpenRemoteManager,
    onFetchRemote,
    onPublishRepo,
    onDeleteTag,
  }: Props = $props();
</script>

<!-- WORKTREES -->
{#if worktrees.length > 0}
  <div>
    <button
      onclick={() => (showWorktrees = !showWorktrees)}
      class="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
    >
      <div class="flex items-center gap-1.5">
        <FolderGit2 class="w-3.5 h-3.5 text-zinc-400" />
        <span>{localeState.t('sidebar.worktrees')}</span>
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
        {#each worktrees as wt (wt.path)}
          <button
            onclick={() => {
              if (onSelectWorktree) onSelectWorktree(wt);
              else if (onOpenWorktrees) onOpenWorktrees();
            }}
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/80 hover:text-zinc-950 dark:hover:text-white group"
            title={`Worktree '${wt.name}' (${wt.path})`}
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

<!-- REMOTES -->
<div>
  <div class="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
    <button
      onclick={() => (showRemotes = !showRemotes)}
      class="flex items-center gap-1.5 cursor-pointer flex-1 text-left"
    >
      <Globe class="w-3.5 h-3.5 text-zinc-400" />
      <span>{localeState.t('sidebar.remotes')}</span>
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
      <span>{localeState.t('sidebar.tags')}</span>
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
              title={`Delete Tag ${tag.name}`}
            >
              <Trash2 class="w-3 h-3" />
            </button>
          {/if}
        </div>
      {/each}
      {#if tags.length === 0}
        <div class="px-2 py-1 text-[11px] text-zinc-400 dark:text-zinc-600 italic">{localeState.t('sidebar.noTagsFound')}</div>
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
      <span>{localeState.t('sidebar.stashes')}</span>
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
        <div class="px-2 py-1 text-[11px] text-zinc-400 dark:text-zinc-600 italic">{localeState.t('sidebar.noStashesFound')}</div>
      {/if}
    </div>
  {/if}
</div>
