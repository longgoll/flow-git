<script lang="ts">
  import type { WorkspaceTab } from '../../types';
  import {
    FolderGit2,
    FolderTree,
    GitBranch,
    Plus,
    X,
    ExternalLink,
    Copy,
    FolderPlus,
    GitFork,
    ChevronDown,
    Check,
  } from 'lucide-svelte';
  import { toast } from '../../state/toastState.svelte';
  import { localeState } from '../../state/localeState.svelte';
  import { repoBindingState } from '../../state/repoBindingState.svelte';

  interface Props {
    tabs: WorkspaceTab[];
    activeTabId: string | null;
    onSelectTab: (tab: WorkspaceTab) => void;
    onCloseTab: (id: string) => void;
    onCloseOtherTabs?: (keepId: string) => void;
    onOpenNewRepo: () => void;
    onOpenWorktrees?: () => void;
    onRevealInExplorer?: (path: string) => void;
  }

  let {
    tabs = [],
    activeTabId = null,
    onSelectTab,
    onCloseTab,
    onCloseOtherTabs,
    onOpenNewRepo,
    onOpenWorktrees,
    onRevealInExplorer,
  }: Props = $props();

  let triggerEl = $state<HTMLElement | null>(null);
  let showDropdown = $state(false);
  let dropdownPos = $state<{ x: number; y: number }>({ x: 0, y: 0 });
  let contextMenuTab = $state<WorkspaceTab | null>(null);
  let contextMenuPos = $state<{ x: number; y: number }>({ x: 0, y: 0 });

  let activeTab = $derived(tabs.find((t) => t.id === activeTabId) || tabs[0]);

  function handleToggleDropdown(e: MouseEvent) {
    e.stopPropagation();
    if (showDropdown) {
      showDropdown = false;
      return;
    }
    if (triggerEl) {
      const rect = triggerEl.getBoundingClientRect();
      dropdownPos = {
        x: Math.max(8, Math.min(window.innerWidth - 300, rect.left)),
        y: rect.bottom + 6,
      };
    }
    showDropdown = true;
    contextMenuTab = null;
  }

  function handleContextMenu(e: MouseEvent, tab: WorkspaceTab) {
    e.preventDefault();
    e.stopPropagation();
    contextMenuTab = tab;
    contextMenuPos = { x: e.clientX, y: e.clientY };
  }

  function closeAllMenus() {
    showDropdown = false;
    contextMenuTab = null;
  }

  async function copyTabPath(path: string) {
    try {
      await navigator.clipboard.writeText(path);
      toast.success(localeState.t('tabBar.copiedPathToast'));
    } catch {
      toast.info(`Path: ${path}`);
    }
    closeAllMenus();
  }
</script>

<svelte:window onclick={closeAllMenus} />

<div class="relative flex items-center gap-1 shrink-0">
  <!-- Workspace Selector Dropdown Trigger (Select-Style) -->
  <button
    type="button"
    bind:this={triggerEl}
    onclick={handleToggleDropdown}
    class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer select-none max-w-[200px] sm:max-w-[240px] md:max-w-[280px] shadow-xs group text-xs shrink-0"
    title={activeTab ? `${activeTab.isWorktree ? 'Worktree' : 'Repo'}: ${activeTab.name} (${activeTab.branch || 'HEAD'})` : 'Chọn kho lưu trữ'}
  >
    <!-- Icon: Worktree vs Main Repo -->
    {#if activeTab?.isWorktree}
      <div class="flex items-center gap-0.5 shrink-0">
        <FolderTree class="w-3.5 h-3.5 text-amber-500" />
        <span class="text-[8px] font-mono px-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700/60 leading-tight">
          WT
        </span>
      </div>
    {:else}
      <FolderGit2 class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
    {/if}

    <!-- Project Tag Badge (if configured) -->
    {#if activeTab?.path && repoBindingState.getTagForRepo(activeTab.path)}
      {@const pTag = repoBindingState.getTagForRepo(activeTab.path)}
      <span class="text-[10px] shrink-0 select-none">
        {pTag === 'work' ? '🏢' : pTag === 'personal' ? '👤' : pTag === 'client' ? '💼' : '🚀'}
      </span>
    {/if}

    <!-- Tab Name -->
    <span class="truncate font-mono text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 min-w-0">
      {activeTab?.name || 'Chọn repo...'}
    </span>

    <!-- Branch Shorthand -->
    {#if activeTab?.branch}
      <span class="text-zinc-400 dark:text-zinc-600 text-[10px] select-none">/</span>
      <div class="flex items-center gap-0.5 font-mono text-[10px] text-zinc-500 dark:text-zinc-400 shrink-0 max-w-[70px] truncate">
        <GitBranch class="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span class="truncate">{activeTab.branch}</span>
      </div>
    {/if}

    <!-- Dirty Dot Indicator -->
    {#if activeTab?.dirtyFilesCount && activeTab.dirtyFilesCount > 0}
      <span
        class="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20 shrink-0 animate-pulse"
        title={localeState.t('tabBar.dirtyFilesTooltip', { count: activeTab.dirtyFilesCount })}
      ></span>
    {/if}

    <!-- Open PR Badge -->
    {#if activeTab?.openPRCount && activeTab.openPRCount > 0}
      <span
        class="px-1 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0"
        title={localeState.t('tabBar.openPrsTooltip', { count: activeTab.openPRCount })}
      >
        {activeTab.openPRCount} PR
      </span>
    {/if}

    <!-- Multiple Tabs Count Badge -->
    {#if tabs.length > 1}
      <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-200/90 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold shrink-0 ml-0.5">
        {tabs.length}
      </span>
    {/if}

    <ChevronDown class="w-3 h-3 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-transform shrink-0 ml-auto {showDropdown ? 'rotate-180' : ''}" />
  </button>

  <!-- Quick Add / Open New Repo Button -->
  <button
    type="button"
    onclick={onOpenNewRepo}
    class="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0 shadow-xs"
    title={localeState.t('tabBar.openOtherRepo')}
  >
    <Plus class="w-3.5 h-3.5" />
  </button>
</div>

<!-- Dropdown Menu (Fixed Position to avoid clipping) -->
{#if showDropdown}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div
    role="menu"
    tabindex="-1"
    class="fixed z-[100] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1.5 w-72 max-h-96 overflow-y-auto text-xs animate-in fade-in zoom-in-95 duration-100"
    style="top: {dropdownPos.y}px; left: {dropdownPos.x}px;"
    onclick={(e) => e.stopPropagation()}
  >
    <!-- Section Header -->
    <div class="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-1 mb-1">
      <span>{localeState.t('tabBar.openTabsTitle')}</span>
      <span class="font-mono text-[9px]">{localeState.t('tabBar.tabsCount', { count: tabs.length })}</span>
    </div>

    <!-- Tabs List -->
    <div class="space-y-0.5 px-1">
      {#each tabs as t (t.id)}
        {@const isActive = t.id === activeTabId}
        <div
          role="menuitem"
          tabindex="0"
          onclick={() => {
            showDropdown = false;
            onSelectTab(t);
          }}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              showDropdown = false;
              onSelectTab(t);
            }
          }}
          oncontextmenu={(e) => handleContextMenu(e, t)}
          class="group w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left cursor-pointer transition-colors {isActive ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-950 dark:text-cyan-100 font-medium' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
        >
          <!-- Left: Icon & Info -->
          <div class="flex items-center gap-2 truncate pr-2 min-w-0 flex-1">
            {#if t.isWorktree}
              <FolderTree class="w-3.5 h-3.5 text-amber-500 shrink-0" />
            {:else}
              <FolderGit2 class="w-3.5 h-3.5 {isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-400'} shrink-0" />
            {/if}

            <div class="truncate min-w-0 flex-1">
              <div class="truncate font-mono text-[11px] leading-tight flex items-center gap-1.5">
                <span class="font-semibold">{t.name}</span>
                {#if t.isWorktree}
                  <span class="text-[8px] font-mono px-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700/60 leading-tight">
                    WT
                  </span>
                {/if}
              </div>
              {#if t.branch}
                <div class="text-[10px] text-zinc-400 dark:text-zinc-500 truncate flex items-center gap-0.5 font-mono">
                  <GitBranch class="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{t.branch}</span>
                </div>
              {/if}
            </div>
          </div>

          <!-- Right: Badges & Close Button -->
          <div class="flex items-center gap-1.5 shrink-0">
            {#if t.dirtyFilesCount && t.dirtyFilesCount > 0}
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500" title="{t.dirtyFilesCount} dirty files"></span>
            {/if}

            {#if isActive}
              <Check class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            {/if}

            {#if tabs.length > 1}
              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  onCloseTab(t.id);
                }}
                class="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                title={localeState.t('tabBar.closeTabTooltip')}
              >
                <X class="w-3 h-3" />
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <div class="h-px bg-zinc-100 dark:border-zinc-800/80 my-1.5"></div>

    <!-- Actions -->
    <div class="space-y-0.5 px-1">
      <button
        type="button"
        onclick={() => {
          showDropdown = false;
          onOpenNewRepo();
        }}
        class="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer transition-colors"
      >
        <FolderPlus class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
        <span class="text-[11px] font-medium">{localeState.t('tabBar.openOtherRepo')}</span>
      </button>

      {#if onOpenWorktrees}
        <button
          type="button"
          onclick={() => {
            showDropdown = false;
            onOpenWorktrees();
          }}
          class="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer transition-colors"
        >
          <GitFork class="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span class="text-[11px] font-medium">{localeState.t('tabBar.createParallelWorktree')}</span>
        </button>
      {/if}

      {#if tabs.length > 1 && onCloseOtherTabs}
        <button
          type="button"
          onclick={() => {
            showDropdown = false;
            if (activeTabId && onCloseOtherTabs) onCloseOtherTabs(activeTabId);
          }}
          class="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer transition-colors text-[11px]"
        >
          <X class="w-3.5 h-3.5 shrink-0" />
          <span>{localeState.t('tabBar.closeOtherTabs')}</span>
        </button>
      {/if}
    </div>
  </div>
{/if}

<!-- Tab Right-Click Context Menu -->
{#if contextMenuTab}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div
    role="menu"
    tabindex="-1"
    class="fixed z-[110] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 w-48 text-xs animate-in fade-in zoom-in-95 duration-75"
    style="top: {contextMenuPos.y}px; left: {contextMenuPos.x}px;"
    onclick={(e) => e.stopPropagation()}
  >
    {#if onRevealInExplorer}
      <button
        type="button"
        onclick={() => {
          if (contextMenuTab) onRevealInExplorer(contextMenuTab.path);
          closeAllMenus();
        }}
        class="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer"
      >
        <ExternalLink class="w-3.5 h-3.5 text-zinc-400" />
        <span>{localeState.t('tabBar.revealInExplorer')}</span>
      </button>
    {/if}

    <button
      type="button"
      onclick={() => {
        if (contextMenuTab) copyTabPath(contextMenuTab.path);
      }}
      class="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer"
    >
      <Copy class="w-3.5 h-3.5 text-zinc-400" />
      <span>{localeState.t('tabBar.copyFolderPath')}</span>
    </button>

    {#if tabs.length > 1}
      <div class="h-px bg-zinc-200 dark:bg-zinc-800 my-1"></div>

      <button
        type="button"
        onclick={() => {
          if (contextMenuTab) onCloseTab(contextMenuTab.id);
          closeAllMenus();
        }}
        class="w-full px-3 py-1.5 flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left cursor-pointer"
      >
        <X class="w-3.5 h-3.5" />
        <span>{localeState.t('tabBar.closeTab')}</span>
      </button>
    {/if}
  </div>
{/if}
