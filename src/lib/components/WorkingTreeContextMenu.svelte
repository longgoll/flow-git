<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Plus,
    Minus,
    Trash2,
    EyeOff,
    FolderOpen,
    ExternalLink,
    Copy,
    History,
    FileCode,
    ChevronRight,
  } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';
  import { toast } from '../state/toastState.svelte';
  import { revealInFileManager, openInExternalEditor } from '../api';

  interface Props {
    x: number;
    y: number;
    filePath: string;
    isStaged: boolean;
    isUntracked: boolean;
    isConflicted?: boolean;
    repoPath: string;
    onClose: () => void;
    onStage?: (path: string) => void;
    onUnstage?: (path: string) => void;
    onDiscard?: (path: string) => void;
    onAddToGitignore?: (pattern: string) => Promise<void>;
    onOpenFileHistory?: (path: string) => void;
  }

  let {
    x,
    y,
    filePath,
    isStaged,
    isUntracked,
    isConflicted = false,
    repoPath,
    onClose,
    onStage,
    onUnstage,
    onDiscard,
    onAddToGitignore,
    onOpenFileHistory,
  }: Props = $props();

  let menuEl: HTMLDivElement;
  let posX = $state<number>(0);
  let posY = $state<number>(0);
  let showIgnoreSubmenu = $state<boolean>(false);

  // Derived file info
  let fileName = $derived.by(() => {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || filePath;
  });

  let fileExt = $derived.by(() => {
    const dotIdx = fileName.lastIndexOf('.');
    return dotIdx > 0 ? fileName.slice(dotIdx + 1) : '';
  });

  let parentDir = $derived.by(() => {
    const lastSlash = filePath.lastIndexOf('/');
    return lastSlash > 0 ? filePath.slice(0, lastSlash) : '';
  });

  let fullFilePath = $derived.by(() => {
    if (!repoPath) return filePath;
    const cleanRepo = repoPath.replace(/[/\\]+$/, '');
    return `${cleanRepo}/${filePath}`;
  });

  onMount(() => {
    posX = x;
    posY = y;
    if (menuEl) {
      const rect = menuEl.getBoundingClientRect();
      if (x + rect.width > window.innerWidth) {
        posX = window.innerWidth - rect.width - 12;
      }
      if (y + rect.height > window.innerHeight) {
        posY = window.innerHeight - rect.height - 12;
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  async function handleCopyRelative() {
    try {
      await navigator.clipboard.writeText(filePath);
      toast.success(localeState.t('workingTree.contextMenu.copiedPathToast'), filePath);
    } catch {
      // Fallback
    }
    onClose();
  }

  async function handleCopyFull() {
    try {
      await navigator.clipboard.writeText(fullFilePath);
      toast.success(localeState.t('workingTree.contextMenu.copiedPathToast'), fullFilePath);
    } catch {
      // Fallback
    }
    onClose();
  }

  async function handleRevealInExplorer() {
    try {
      await revealInFileManager(fullFilePath);
    } catch (err: any) {
      toast.error('Explorer error', err?.message || String(err));
    }
    onClose();
  }

  async function handleOpenInEditor() {
    try {
      await openInExternalEditor(fullFilePath);
    } catch (err: any) {
      toast.error('Editor error', err?.message || String(err));
    }
    onClose();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<div
  bind:this={menuEl}
  style="top: {posY}px; left: {posX}px;"
  class="fixed z-50 min-w-60 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700/80 rounded-xl shadow-2xl backdrop-blur-xl p-1.5 text-xs text-zinc-800 dark:text-zinc-200 animate-in fade-in zoom-in-95 duration-100 font-sans select-none"
  role="menu"
  tabindex="-1"
  onclick={(e) => e.stopPropagation()}
  onmousedown={(e) => e.stopPropagation()}
>
  <!-- Header with File Name -->
  <div class="px-2.5 py-1.5 border-b border-zinc-200 dark:border-zinc-800/80 text-[11px] flex items-center justify-between text-zinc-600 dark:text-zinc-400">
    <div class="flex items-center gap-1.5 truncate max-w-[220px]">
      <FileCode class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
      <span class="font-mono font-medium truncate text-zinc-900 dark:text-zinc-100">{fileName}</span>
    </div>
    {#if fileExt}
      <span class="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold shrink-0">
        .{fileExt}
      </span>
    {/if}
  </div>

  <div class="py-1 space-y-0.5">
    <!-- Stage / Unstage Action -->
    {#if isStaged}
      {#if onUnstage}
        <button
          onclick={() => {
            onUnstage(filePath);
            onClose();
          }}
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
          role="menuitem"
        >
          <Minus class="w-3.5 h-3.5 text-amber-500" />
          <span>{localeState.t('workingTree.contextMenu.unstage')}</span>
        </button>
      {/if}
    {:else}
      {#if onStage}
        <button
          onclick={() => {
            onStage(filePath);
            onClose();
          }}
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
          role="menuitem"
        >
          <Plus class="w-3.5 h-3.5 text-emerald-500" />
          <span>{localeState.t('workingTree.contextMenu.stage')}</span>
        </button>
      {/if}
    {/if}

    <!-- Discard Changes (Safe Discard) -->
    {#if onDiscard && !isConflicted}
      <button
        onclick={() => {
          onDiscard(filePath);
          onClose();
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
        role="menuitem"
      >
        <Trash2 class="w-3.5 h-3.5 text-rose-500" />
        <span>{localeState.t('workingTree.contextMenu.discard')}</span>
      </button>
    {/if}

    <div class="my-1 border-t border-zinc-200 dark:border-zinc-800/80"></div>

    <!-- Add to .gitignore submenu / options -->
    {#if onAddToGitignore}
      <div class="relative">
        <button
          onclick={() => (showIgnoreSubmenu = !showIgnoreSubmenu)}
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
          role="menuitem"
        >
          <div class="flex items-center gap-2">
            <EyeOff class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{localeState.t('workingTree.contextMenu.addToGitignore')}</span>
          </div>
          <ChevronRight class="w-3 h-3 text-zinc-400 transition-transform {showIgnoreSubmenu ? 'rotate-90' : ''}" />
        </button>

        {#if showIgnoreSubmenu}
          <div class="mt-1 pl-3 pr-1 py-1 space-y-0.5 bg-zinc-100/70 dark:bg-zinc-800/40 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
            <!-- 1. Ignore exact file -->
            <button
              onclick={() => {
                onAddToGitignore(filePath);
                onClose();
              }}
              class="w-full text-left px-2 py-1 rounded text-[11px] font-mono hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 truncate cursor-pointer transition-colors"
              title={filePath}
            >
              {localeState.t('workingTree.contextMenu.ignoreFile', { name: fileName })}
            </button>

            <!-- 2. Ignore extension if available -->
            {#if fileExt}
              <button
                onclick={() => {
                  onAddToGitignore(`*.${fileExt}`);
                  onClose();
                }}
                class="w-full text-left px-2 py-1 rounded text-[11px] font-mono hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 truncate cursor-pointer transition-colors"
                title={`*.${fileExt}`}
              >
                {localeState.t('workingTree.contextMenu.ignoreExt', { ext: fileExt })}
              </button>
            {/if}

            <!-- 3. Ignore parent directory if inside folder -->
            {#if parentDir}
              <button
                onclick={() => {
                  onAddToGitignore(`${parentDir}/`);
                  onClose();
                }}
                class="w-full text-left px-2 py-1 rounded text-[11px] font-mono hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 truncate cursor-pointer transition-colors"
                title={`${parentDir}/`}
              >
                {localeState.t('workingTree.contextMenu.ignoreDir', { dir: parentDir })}
              </button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <div class="my-1 border-t border-zinc-200 dark:border-zinc-800/80"></div>

    <!-- Reveal in Explorer -->
    <button
      onclick={handleRevealInExplorer}
      class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
      role="menuitem"
    >
      <FolderOpen class="w-3.5 h-3.5 text-blue-500" />
      <span>{localeState.t('workingTree.contextMenu.revealInExplorer')}</span>
    </button>

    <!-- Open in External Editor -->
    <button
      onclick={handleOpenInEditor}
      class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
      role="menuitem"
    >
      <ExternalLink class="w-3.5 h-3.5 text-purple-500" />
      <span>{localeState.t('workingTree.contextMenu.openInEditor')}</span>
    </button>

    <!-- View File History -->
    {#if onOpenFileHistory && !isUntracked}
      <button
        onclick={() => {
          onOpenFileHistory(filePath);
          onClose();
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        role="menuitem"
      >
        <History class="w-3.5 h-3.5 text-cyan-500" />
        <span>{localeState.t('workingTree.contextMenu.viewFileHistory')}</span>
      </button>
    {/if}

    <div class="my-1 border-t border-zinc-200 dark:border-zinc-800/80"></div>

    <!-- Copy Relative Path -->
    <button
      onclick={handleCopyRelative}
      class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
      role="menuitem"
    >
      <Copy class="w-3.5 h-3.5 text-zinc-400" />
      <span>{localeState.t('workingTree.contextMenu.copyRelativePath')}</span>
    </button>

    <!-- Copy Full Path -->
    <button
      onclick={handleCopyFull}
      class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
      role="menuitem"
    >
      <Copy class="w-3.5 h-3.5 text-zinc-400" />
      <span>{localeState.t('workingTree.contextMenu.copyFullPath')}</span>
    </button>
  </div>
</div>
