<script lang="ts">
  import type { BranchInfo, TagInfo, ViewMode } from '../types';
  import { localeState } from '../state/localeState.svelte';
  import {
    BookOpen,
    Search,
    GitBranch,
    GitCommit,
    Layers,
    FileDiff,
    ShieldCheck,
    History,
    Bug,
    Split,
    FolderGit2,
    Sparkles,
    Undo2,
    Redo2,
    Tag,
    RefreshCw,
    PlusCircle,
    Upload,
    CloudDownload,
    LifeBuoy,
    Archive,
  } from 'lucide-svelte';

  interface PaletteItem {
    id: string;
    title: string;
    category: 'View' | 'Action' | 'Branch' | 'Tag' | 'AI' | 'Help';
    icon: any;
    shortcut?: string;
    action: () => void;
  }

  interface Props {
    isOpen: boolean;
    branches: BranchInfo[];
    tags: TagInfo[];
    onSelectBranch: (branch: BranchInfo) => void;
    onChangeViewMode: (mode: ViewMode) => void;
    onOpenTrash: () => void;
    onOpenWorktrees: () => void;
    onOpenBisect: () => void;
    onOpenTimeMachine: () => void;
    onOpenLostAndFound?: () => void;
    onOpenStashShelf?: () => void;
    onOpenAI: () => void;
    onSmartSync: () => void;
    onStageAll: () => void;
    onUnstageAll: () => void;
    onDiscardAll: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onPush?: () => void;
    onPull?: () => void;
    onFetch?: () => void;
    onOpenGuide?: () => void;
    onClose: () => void;
  }

  let {
    isOpen,
    branches = [],
    tags = [],
    onSelectBranch,
    onChangeViewMode,
    onOpenTrash,
    onOpenWorktrees,
    onOpenBisect,
    onOpenTimeMachine,
    onOpenLostAndFound,
    onOpenStashShelf,
    onOpenAI,
    onSmartSync,
    onStageAll,
    onUnstageAll,
    onDiscardAll,
    onUndo,
    onRedo,
    onPush,
    onPull,
    onFetch,
    onOpenGuide,
    onClose,
  }: Props = $props();

  let query = $state<string>('');
  let selectedIndex = $state<number>(0);

  let allItems = $derived.by<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      // Views
      {
        id: 'view-graph',
        title: 'Go to Living Commit Graph View',
        category: 'View',
        icon: GitCommit,
        shortcut: 'Ctrl + 1',
        action: () => {
          onChangeViewMode('graph');
          onClose();
        },
      },
      {
        id: 'help-playbook',
        title: 'Open FlowGit Playbook & Real-World Recipes (Sổ tay Thực chiến)',
        category: 'Help',
        icon: BookOpen,
        shortcut: 'F1',
        action: () => {
          onClose();
          onOpenGuide?.();
        },
      },{
        id: 'view-changes',
        title: 'Go to Working Tree & Staging View',
        category: 'View',
        icon: FileDiff,
        shortcut: 'Ctrl + 2',
        action: () => { onChangeViewMode('changes'); onClose(); },
      },
      {
        id: 'view-conflict',
        title: 'Open 3-Way Merge Conflict Resolver',
        category: 'View',
        icon: Split,
        action: () => { onChangeViewMode('conflict'); onClose(); },
      },
      {
        id: 'open-bisect',
        title: 'Open Visual Git Bisect Bug Hunter',
        category: 'View',
        icon: Bug,
        action: () => { onOpenBisect(); onClose(); },
      },
      {
        id: 'open-timemachine',
        title: 'Open Safe-Flight Time Machine Drawer',
        category: 'View',
        icon: History,
        shortcut: 'Ctrl + Z',
        action: () => { onOpenTimeMachine(); onClose(); },
      },
      {
        id: 'open-lost-and-found',
        title: 'Open Lost & Found (Git Reflog Explorer - Rescue Commits)',
        category: 'View',
        icon: LifeBuoy,
        action: () => { onOpenLostAndFound?.(); onClose(); },
      },
      {
        id: 'open-trash',
        title: 'Open Safe Discard 48h Trash Inspector',
        category: 'View',
        icon: ShieldCheck,
        action: () => { onOpenTrash(); onClose(); },
      },
      {
        id: 'open-worktrees',
        title: 'Open Git Worktree Multi-Folder Manager',
        category: 'View',
        icon: FolderGit2,
        action: () => { onOpenWorktrees(); onClose(); },
      },

      // AI
      {
        id: 'open-ai',
        title: 'AI Assistant: Generate Conventional Commit / Explain Conflict',
        category: 'AI',
        icon: Sparkles,
        action: () => { onOpenAI(); onClose(); },
      },

      // Actions
      {
        id: 'smart-sync',
        title: 'Smart Sync with Remote Upstream',
        category: 'Action',
        icon: CloudDownload,
        action: () => { onSmartSync(); onClose(); },
      },
      {
        id: 'git-push',
        title: 'Git Push / Publish (Push current branch to remote)',
        category: 'Action',
        icon: Upload,
        action: () => { onPush?.(); onClose(); },
      },
      {
        id: 'git-pull',
        title: 'Git Pull (Pull latest changes from remote)',
        category: 'Action',
        icon: RefreshCw,
        action: () => { onPull?.(); onClose(); },
      },
      {
        id: 'git-fetch',
        title: 'Git Fetch (Prune & fetch remote branches)',
        category: 'Action',
        icon: RefreshCw,
        action: () => { onFetch?.(); onClose(); },
      },
      {
        id: 'stage-all',
        title: 'Stage All Working Tree Changes',
        category: 'Action',
        icon: PlusCircle,
        action: () => { onStageAll(); onClose(); },
      },
      {
        id: 'unstage-all',
        title: 'Unstage All Staged Files',
        category: 'Action',
        icon: Layers,
        action: () => { onUnstageAll(); onClose(); },
      },
      {
        id: 'undo-action',
        title: 'Time Machine: Undo Last Action',
        category: 'Action',
        icon: Undo2,
        shortcut: 'Ctrl + Z',
        action: () => { onUndo(); onClose(); },
      },
      {
        id: 'redo-action',
        title: 'Time Machine: Redo Action',
        category: 'Action',
        icon: Redo2,
        shortcut: 'Ctrl + Shift + Z',
        action: () => { onRedo(); onClose(); },
      },
      {
        id: 'discard-all',
        title: 'Safe Discard All Working Tree Changes (Saved to Trash)',
        category: 'Action',
        icon: ShieldCheck,
        action: () => { onDiscardAll(); onClose(); },
      },
    ];

    if (onOpenStashShelf) {
      list.push({
        id: 'action-stash-shelf',
        title: 'Visual Stash Shelf: Inspect Diffs & Restore Stashes',
        category: 'Action',
        icon: Archive,
        action: () => { onClose(); onOpenStashShelf(); },
      });
    }

    // Dynamic Branches
    for (const b of branches) {
      list.push({
        id: `branch-${b.name}`,
        title: `Checkout branch: ${b.shorthand}`,
        category: 'Branch',
        icon: GitBranch,
        action: () => { onSelectBranch(b); onClose(); },
      });
    }

    // Dynamic Tags
    for (const t of tags) {
      list.push({
        id: `tag-${t.name}`,
        title: `Jump to tag: ${t.name}`,
        category: 'Tag',
        icon: Tag,
        action: () => { onClose(); },
      });
    }

    return list;
  });

  let filteredItems = $derived.by(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % Math.max(1, filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + filteredItems.length) % Math.max(1, filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-xs flex items-start justify-center pt-24 p-4 select-none"
    role="dialog"
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    <div class="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] text-zinc-900 dark:text-zinc-100">
      <!-- Search Box -->
      <div class="p-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center gap-3">
        <Search class="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 ml-1" />
        <input
          type="text"
          bind:value={query}
          placeholder={localeState.t('assistant.commandPalette.placeholder')}
          class="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none"
        />

        <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
          ESC
        </span>
      </div>

      <!-- Results List -->
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        {#if filteredItems.length === 0}
          <div class="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
            {localeState.t('assistant.commandPalette.noResults')} "{query}"
          </div>
        {:else}
          {#each filteredItems as item, idx}
            {@const IconComponent = item.icon}
            <button
              onclick={item.action}
              class="w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer {idx === selectedIndex ? 'bg-cyan-50 dark:bg-cyan-600/20 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-transparent'}"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                  <IconComponent class="w-3.5 h-3.5" />
                </div>
                <span class="truncate font-medium">{item.title}</span>
              </div>

              <div class="flex items-center gap-2 shrink-0 ml-2">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50">
                  {localeState.t(`assistant.commandPalette.category${item.category}`)}
                </span>
                {#if item.shortcut}
                  <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                    {item.shortcut}
                  </span>
                {/if}
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}
