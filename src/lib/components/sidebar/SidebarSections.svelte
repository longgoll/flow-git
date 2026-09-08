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
    activeSection?: 'all' | 'worktrees' | 'remotes' | 'tags' | 'stashes';
    standalone?: boolean;
    onOpenWorktrees?: () => void;
    onSelectWorktree?: (wt: WorktreeInfo) => void;
    onOpenRemoteManager?: () => void;
    onFetchRemote?: (name: string) => Promise<void>;
    onPublishRepo?: () => void;
    onDeleteTag?: (tagName: string) => void;
    onOpenStashShelf?: (index?: number) => void;
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
    activeSection = 'all',
    standalone = false,
    onOpenWorktrees,
    onSelectWorktree,
    onOpenRemoteManager,
    onFetchRemote,
    onPublishRepo,
    onDeleteTag,
    onOpenStashShelf,
  }: Props = $props();
</script>

<!-- WORKTREES -->
{#if activeSection === 'all' || activeSection === 'worktrees'}
  {#if worktrees.length > 0 || standalone}
    <div class="{standalone ? 'h-full flex flex-col' : ''}">
      {#if !standalone}
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
      {/if}

      {#if showWorktrees || standalone}
        <div class="space-y-0.5 {standalone ? 'flex-1 overflow-y-auto pr-0.5' : 'mt-1 pl-1'}">
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
                <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate max-w-24">{wt.branch_name}</span>
              {/if}
            </button>
          {/each}
          {#if worktrees.length === 0 && standalone}
            <div class="p-4 text-center text-zinc-500 dark:text-zinc-400 flex flex-col items-center gap-2">
              <FolderGit2 class="w-8 h-8 text-zinc-400 opacity-60" />
              <div class="text-xs">{localeState.t('sidebar.worktrees')} trống</div>
              {#if onOpenWorktrees}
                <button
                  onclick={onOpenWorktrees}
                  class="mt-1 px-3 py-1.5 rounded-md bg-cyan-100 dark:bg-cyan-950/80 hover:bg-cyan-200 dark:hover:bg-cyan-900 text-cyan-800 dark:text-cyan-300 text-xs font-medium cursor-pointer transition-colors border border-cyan-300 dark:border-cyan-700/60"
                >
                  {localeState.t('toolbar.worktrees')}
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
{/if}

<!-- REMOTES -->
{#if activeSection === 'all' || activeSection === 'remotes'}
  <div class="{standalone ? 'h-full flex flex-col' : ''}">
    {#if !standalone}
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
              title={localeState.t('sidebar.manageRemotesTitle')}
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
    {/if}

    {#if showRemotes || standalone}
      <div class="space-y-0.5 {standalone ? 'flex-1 overflow-y-auto pr-0.5' : 'mt-1 pl-1'}">
        {#each remotes as remote (remote.name)}
          <div class="flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/60 hover:text-zinc-950 dark:hover:text-zinc-200 font-mono text-[11px] group">
            <div class="flex items-center gap-2 truncate" title={remote.fetch_url}>
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shrink-0"></span>
              <span class="truncate font-semibold text-zinc-800 dark:text-zinc-300">{remote.name}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              {#if onFetchRemote}
                <button
                  onclick={() => onFetchRemote(remote.name)}
                  class="{standalone ? 'opacity-75' : 'opacity-0'} group-hover:opacity-100 p-0.5 rounded text-zinc-400 dark:text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  title={localeState.t('sidebar.fetchRemoteTooltip', { name: remote.name })}
                >
                  <RefreshCw class="w-3 h-3" />
                </button>
              {/if}
              {#if onOpenRemoteManager}
                <button
                  onclick={onOpenRemoteManager}
                  class="{standalone ? 'opacity-75' : 'opacity-0'} group-hover:opacity-100 p-0.5 rounded text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  title={localeState.t('sidebar.remoteConfig')}
                >
                  <Settings class="w-3 h-3" />
                </button>
              {/if}
            </div>
          </div>
        {/each}
        {#if remotes.length === 0}
          <div class="px-2 py-3 flex flex-col gap-2">
            <div class="text-[11px] text-zinc-500 italic text-center">{localeState.t('sidebar.noRemoteRepo')}</div>
            {#if onPublishRepo}
              <button
                type="button"
                onclick={onPublishRepo}
                class="w-full py-2 px-2.5 bg-indigo-100 dark:bg-indigo-600/20 hover:bg-indigo-200 dark:hover:bg-indigo-600/30 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 hover:border-indigo-400 dark:hover:border-indigo-500/50 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title={localeState.t('sidebar.publishRepoTooltip')}
              >
                <CloudUpload class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{localeState.t('sidebar.publishRepoToGithub')}</span>
              </button>
            {/if}
            {#if onOpenRemoteManager}
              <button
                type="button"
                onclick={onOpenRemoteManager}
                class="w-full py-1.5 px-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>{localeState.t('sidebar.manageRemotesTitle')}</span>
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<!-- TAGS -->
{#if activeSection === 'all' || activeSection === 'tags'}
  <div class="{standalone ? 'h-full flex flex-col' : ''}">
    {#if !standalone}
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
    {/if}

    {#if showTags || standalone}
      <div class="space-y-0.5 {standalone ? 'flex-1 overflow-y-auto pr-0.5' : 'mt-1 pl-1'}">
        {#each tags as tag (tag.name)}
          <div class="flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/60 hover:text-zinc-950 dark:hover:text-zinc-200 font-mono text-[11px] group">
            <div class="flex items-center gap-2 truncate">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0"></span>
              <span class="truncate">{tag.name}</span>
            </div>
            {#if onDeleteTag}
              <button
                onclick={(e) => { e.stopPropagation(); onDeleteTag(tag.name); }}
                class="{standalone ? 'opacity-75' : 'opacity-0'} group-hover:opacity-100 p-0.5 rounded text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                title={localeState.t('sidebar.deleteTagTooltip', { name: tag.name })}
              >
                <Trash2 class="w-3 h-3" />
              </button>
            {/if}
          </div>
        {/each}
        {#if tags.length === 0}
          <div class="px-2 py-4 text-[11px] text-zinc-400 dark:text-zinc-600 italic text-center">{localeState.t('sidebar.noTagsFound')}</div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<!-- STASHES -->
{#if activeSection === 'all' || activeSection === 'stashes'}
  <div class="{standalone ? 'h-full flex flex-col' : ''}">
    {#if !standalone}
      <div class="flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 group">
        <button
          onclick={() => (showStashes = !showStashes)}
          class="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <Archive class="w-3.5 h-3.5 text-zinc-400" />
          <span>{localeState.t('sidebar.stashes')}</span>
          <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({stashes.length})</span>
        </button>
        <div class="flex items-center gap-1">
          {#if onOpenStashShelf && stashes.length > 0}
            <button
              onclick={() => onOpenStashShelf?.(0)}
              class="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title="Mở Visual Stash Shelf"
            >
              <Archive class="w-3 h-3" />
            </button>
          {/if}
          <button
            onclick={() => (showStashes = !showStashes)}
            class="text-zinc-400 dark:text-zinc-500 cursor-pointer"
          >
            {#if showStashes}
              <ChevronDown class="w-3.5 h-3.5" />
            {:else}
              <ChevronRight class="w-3.5 h-3.5" />
            {/if}
          </button>
        </div>
      </div>
    {/if}

    {#if showStashes || standalone}
      <div class="space-y-0.5 {standalone ? 'flex-1 overflow-y-auto pr-0.5' : 'mt-1 pl-1'}">
        {#each stashes as stash (stash.index)}
          <button
            onclick={() => onOpenStashShelf?.(stash.index)}
            class="w-full text-left flex items-center justify-between px-2 py-2 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 font-mono text-[11px] transition-colors cursor-pointer group"
            title="Nhấn để xem chi tiết diff và thao tác với Stash này"
          >
            <div class="flex items-center gap-2 truncate pr-1">
              <span class="text-amber-600 dark:text-amber-400 font-semibold shrink-0">stash@{`{${stash.index}}`}</span>
              <span class="truncate text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200">{stash.message}</span>
            </div>
            <span class="text-[10px] text-zinc-400 {standalone ? 'opacity-80' : 'opacity-0'} group-hover:opacity-100 shrink-0">Diff ➔</span>
          </button>
        {/each}
        {#if stashes.length === 0}
          <div class="px-2 py-4 text-[11px] text-zinc-400 dark:text-zinc-600 italic text-center">{localeState.t('sidebar.noStashesFound')}</div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
