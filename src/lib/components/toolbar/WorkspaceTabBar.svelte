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

  let scrollContainer = $state<HTMLElement | null>(null);
  let showNewMenu = $state(false);
  let newMenuPos = $state<{ x: number; y: number }>({ x: 0, y: 0 });
  let showTabsList = $state(false);
  let tabsListPos = $state<{ x: number; y: number }>({ x: 0, y: 0 });
  let contextMenuTab = $state<WorkspaceTab | null>(null);
  let contextMenuPos = $state<{ x: number; y: number }>({ x: 0, y: 0 });

  function handleToggleNewMenu(e: MouseEvent) {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    newMenuPos = {
      x: Math.max(10, Math.min(window.innerWidth - 260, rect.left)),
      y: rect.bottom + 6,
    };
    showNewMenu = !showNewMenu;
    showTabsList = false;
    contextMenuTab = null;
  }

  function handleToggleTabsList(e: MouseEvent) {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    tabsListPos = {
      x: Math.max(10, Math.min(window.innerWidth - 280, rect.left)),
      y: rect.bottom + 6,
    };
    showTabsList = !showTabsList;
    showNewMenu = false;
    contextMenuTab = null;
  }

  function handleContextMenu(e: MouseEvent, tab: WorkspaceTab) {
    e.preventDefault();
    e.stopPropagation();
    contextMenuTab = tab;
    contextMenuPos = { x: e.clientX, y: e.clientY };
    showNewMenu = false;
    showTabsList = false;
  }

  function closeAllMenus() {
    contextMenuTab = null;
    showNewMenu = false;
    showTabsList = false;
  }

  function handleWheel(e: WheelEvent) {
    if (!scrollContainer) return;
    if (e.deltaY !== 0) {
      e.preventDefault();
      scrollContainer.scrollLeft += e.deltaY;
    }
  }

  $effect(() => {
    if (activeTabId && scrollContainer) {
      const activeEl = scrollContainer.querySelector('[aria-selected="true"]') as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      }
    }
  });

  async function copyTabPath(path: string) {
    try {
      await navigator.clipboard.writeText(path);
      toast.success('Đã sao chép đường dẫn thư mục!');
    } catch {
      toast.info(`Path: ${path}`);
    }
    closeAllMenus();
  }
</script>

<svelte:window onclick={closeAllMenus} />

<div class="relative flex items-center min-w-0 max-w-[280px] sm:max-w-[420px] md:max-w-[580px] lg:max-w-[740px] xl:max-w-[920px] shrink bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-800/90 rounded-lg p-0.5 gap-1 shadow-2xs">
  <!-- 1. Tabs Horizontal Scroll Area (Mouse-wheel scrollable) -->
  <div
    bind:this={scrollContainer}
    onwheel={handleWheel}
    class="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 min-w-0"
  >
    {#each tabs as tab (tab.id)}
      {@const isActive = tab.id === activeTabId}
      <div
        role="tab"
        tabindex="0"
        aria-selected={isActive}
        onclick={() => onSelectTab(tab)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectTab(tab);
          }
        }}
        oncontextmenu={(e) => handleContextMenu(e, tab)}
        class="group relative flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-150 cursor-pointer select-none shrink-0 min-w-[120px] max-w-[190px] border {isActive
          ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 font-medium border-zinc-300 dark:border-zinc-700 shadow-xs ring-1 ring-cyan-500/30 dark:ring-cyan-400/30'
          : 'bg-zinc-200/70 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 border-zinc-300/60 dark:border-zinc-750'}"
        title="{tab.isWorktree ? 'Linked Worktree' : 'Repository'}: {tab.name}&#10;Branch: {tab.branch || 'HEAD'}&#10;Path: {tab.path}"
      >
        <!-- Left: Icon & Info -->
        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          <!-- Icon: Worktree (Fork/Tree) vs Main Repo -->
          {#if tab.isWorktree}
            <div class="flex items-center gap-0.5 shrink-0">
              <FolderTree class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span class="text-[8px] font-mono px-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700/60 leading-tight">
                WT
              </span>
            </div>
          {:else}
            <FolderGit2 class="w-3.5 h-3.5 shrink-0 {isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-500 dark:text-zinc-400'}" />
          {/if}

          <!-- Tab Repo / Worktree Name -->
          <span class="truncate font-mono text-[11px] leading-tight font-medium">
            {tab.name}
          </span>

          <!-- Current Branch Shorthand -->
          {#if tab.branch}
            <div class="flex items-center gap-0.5 font-mono text-[10px] text-zinc-500 dark:text-zinc-400 shrink-0 max-w-[65px] truncate">
              <span class="text-zinc-400 dark:text-zinc-600 select-none">/</span>
              <GitBranch class="w-2.5 h-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span class="truncate">{tab.branch}</span>
            </div>
          {/if}
        </div>

        <!-- Right: PR Badge & Dirty Indicator Dot & Close Button -->
        <div class="flex items-center gap-1 shrink-0 ml-1">
          {#if tab.openPRCount && tab.openPRCount > 0}
            <span
              class="flex items-center gap-0.5 px-1 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0"
              title="{tab.openPRCount} Pull Requests đang mở"
            >
              <span class="w-1 h-1 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>
              <span>{tab.openPRCount} PR</span>
            </span>
          {/if}

          {#if tab.dirtyFilesCount && tab.dirtyFilesCount > 0}
            <span
              class="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20 shrink-0 animate-pulse"
              title="{tab.dirtyFilesCount} tệp thay đổi chưa commit"
            ></span>
          {/if}

          {#if tabs.length > 1}
            <button
              type="button"
              onclick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              class="p-0.5 rounded hover:bg-zinc-300/80 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all shrink-0 {isActive ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-100'}"
              title="Đóng tab (Ctrl+W)"
            >
              <X class="w-3 h-3" />
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- 2. Pinned Action Buttons on Right: Always visible regardless of scrolling -->
  <div class="flex items-center gap-0.5 shrink-0 pl-1 border-l border-zinc-200/80 dark:border-zinc-800/80">
    {#if tabs.length > 2}
      <button
        type="button"
        onclick={handleToggleTabsList}
        class="p-1 rounded-md hover:bg-zinc-200/80 dark:hover:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0 flex items-center gap-0.5 text-[10px] font-mono px-1.5"
        title="Xem danh sách tất cả {tabs.length} tabs đang mở"
      >
        <span>{tabs.length}</span>
        <ChevronDown class="w-3 h-3" />
      </button>
    {/if}

    <button
      type="button"
      onclick={handleToggleNewMenu}
      class="p-1 rounded-md hover:bg-zinc-200/80 dark:hover:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
      title="Mở thêm Repository hoặc Git Worktree song song"
    >
      <Plus class="w-3.5 h-3.5" />
    </button>
  </div>
</div>

<!-- New Tab Dropdown Menu (Rendered Fixed to avoid overflow clipping) -->
{#if showNewMenu}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div
    role="menu"
    tabindex="-1"
    class="fixed z-[100] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1.5 w-60 text-xs animate-in fade-in zoom-in-95 duration-100"
    style="top: {newMenuPos.y}px; left: {newMenuPos.x}px;"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
      Thêm Workspace Tab
    </div>

    <button
      type="button"
      onclick={() => {
        showNewMenu = false;
        onOpenNewRepo();
      }}
      class="w-full px-3 py-2 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer transition-colors"
    >
      <div class="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
        <FolderPlus class="w-4 h-4" />
      </div>
      <div>
        <div class="font-medium text-zinc-900 dark:text-zinc-100">Mở Repository khác...</div>
        <div class="text-[10px] text-zinc-500 dark:text-zinc-400">Mở dự án từ máy hoặc clone mới</div>
      </div>
    </button>

    {#if onOpenWorktrees}
      <button
        type="button"
        onclick={() => {
          showNewMenu = false;
          onOpenWorktrees();
        }}
        class="w-full px-3 py-2 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer transition-colors border-t border-zinc-100 dark:border-zinc-800/80"
      >
        <div class="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
          <GitFork class="w-4 h-4" />
        </div>
        <div>
          <div class="font-medium text-zinc-900 dark:text-zinc-100">Tạo Git Worktree song song...</div>
          <div class="text-[10px] text-zinc-500 dark:text-zinc-400">Checkout nhánh khác ra thư mục mới</div>
        </div>
      </button>
    {/if}
  </div>
{/if}

<!-- All Tabs Quick Switcher Dropdown Menu -->
{#if showTabsList}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div
    role="menu"
    tabindex="-1"
    class="fixed z-[100] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1.5 w-64 max-h-80 overflow-y-auto text-xs animate-in fade-in zoom-in-95 duration-100"
    style="top: {tabsListPos.y}px; left: {tabsListPos.x}px;"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
      <span>Các Tab đang mở</span>
      <span class="font-mono text-[9px]">{tabs.length} tabs</span>
    </div>

    {#each tabs as t (t.id)}
      {@const isActive = t.id === activeTabId}
      <button
        type="button"
        onclick={() => {
          showTabsList = false;
          onSelectTab(t);
        }}
        class="w-full px-3 py-1.5 flex items-center justify-between text-left cursor-pointer transition-colors {isActive ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-medium' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
      >
        <div class="flex items-center gap-2 truncate pr-2">
          {#if t.isWorktree}
            <FolderTree class="w-3.5 h-3.5 text-amber-500 shrink-0" />
          {:else}
            <FolderGit2 class="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          {/if}
          <div class="truncate">
            <div class="truncate font-mono text-[11px] leading-tight">{t.name}</div>
            {#if t.branch}
              <div class="text-[9px] text-zinc-400 truncate">{t.branch}</div>
            {/if}
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          {#if t.dirtyFilesCount && t.dirtyFilesCount > 0}
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          {/if}
          {#if isActive}
            <Check class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          {/if}
        </div>
      </button>
    {/each}
  </div>
{/if}

<!-- Tab Right-Click Context Menu -->
{#if contextMenuTab}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div
    role="menu"
    tabindex="-1"
    class="fixed z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 w-48 text-xs animate-in fade-in zoom-in-95 duration-75"
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
        <span>Mở trong File Explorer</span>
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
      <span>Sao chép đường dẫn</span>
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
        <span>Đóng tab này</span>
      </button>

      {#if onCloseOtherTabs}
        <button
          type="button"
          onclick={() => {
            if (contextMenuTab && onCloseOtherTabs) onCloseOtherTabs(contextMenuTab.id);
            closeAllMenus();
          }}
          class="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left cursor-pointer"
        >
          <span>Đóng các tab khác</span>
        </button>
      {/if}
    {/if}
  </div>
{/if}

<style>
  /* Ẩn thanh cuộn nhưng vẫn cuộn ngang mượt mà */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
