<script lang="ts">
  import type { FileDiffDetail, FileStatusItem, WorkingTreeStatus } from '../types';
  import DiffViewer from './DiffViewer.svelte';
  import CommitBox from './CommitBox.svelte';
  import WorkingTreeContextMenu from './WorkingTreeContextMenu.svelte';
  import GitignoreManagerModal from './GitignoreManagerModal.svelte';
  import FileHistoryModal from './FileHistoryModal.svelte';
  import {
    Plus,
    Minus,
    Trash2,
    FolderGit2,
    ChevronDown,
    ChevronRight,
    ShieldCheck,
    Sparkles,
    FileCode,
    Folder,
    AlertTriangle,
    Anchor,
  } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';
  import { modalState } from '../state/modalState.svelte';

  interface Props {
    status: WorkingTreeStatus | null;
    selectedFilePath: string | null;
    selectedFileIsStaged: boolean;
    diffDetail: FileDiffDetail | null;
    isDiffLoading: boolean;
    isCommitLoading: boolean;
    currentBranch?: string;
    repoPath?: string;
    onSelectFile: (file: FileStatusItem, isStaged: boolean) => void;
    onStageFile: (filePath: string) => Promise<void>;
    onUnstageFile: (filePath: string) => Promise<void>;
    onStageAll: () => Promise<void>;
    onUnstageAll: () => Promise<void>;
    onStageHunk: (hunkIndex: number) => Promise<void>;
    onUnstageHunk: (hunkIndex: number) => Promise<void>;
    onDiscardFile: (filePath: string) => Promise<void>;
    onDiscardAll: () => Promise<void>;
    ignoreWhitespace?: boolean;
    onToggleIgnoreWhitespace?: () => void;
    onCommit: (message: string, amend: boolean, noVerify?: boolean) => Promise<void>;
    onOpenTrash: () => void;
    trashCount?: number;
    onCreateBranch?: (baseBranch: string) => void;
    onAddToGitignore?: (pattern: string) => Promise<void>;
    onGenerateGitignore?: () => Promise<void>;
  }

  let {
    status,
    selectedFilePath,
    selectedFileIsStaged,
    diffDetail,
    isDiffLoading,
    isCommitLoading,
    ignoreWhitespace = false,
    onToggleIgnoreWhitespace,
    currentBranch = '',
    repoPath = '',
    onSelectFile,
    onStageFile,
    onUnstageFile,
    onStageAll,
    onUnstageAll,
    onStageHunk,
    onUnstageHunk,
    onDiscardFile,
    onDiscardAll,
    onCommit,
    onOpenTrash,
    trashCount = 0,
    onCreateBranch,
    onAddToGitignore,
    onGenerateGitignore,
  }: Props = $props();

  let showConflictedSection = $state(true);
  let showStagedSection = $state(true);
  let showUnstagedSection = $state(true);
  let showUntrackedSection = $state(true);

  // Context Menu & Gitignore Manager state
  let contextMenuData = $state<{
    x: number;
    y: number;
    filePath: string;
    isStaged: boolean;
    isUntracked: boolean;
    isConflicted: boolean;
  } | null>(null);

  let showGitignoreModal = $state<boolean>(false);
  let fileHistoryTarget = $state<string | null>(null);

  function handleContextMenu(
    e: MouseEvent,
    filePath: string,
    isStaged: boolean,
    isUntracked: boolean,
    isConflicted: boolean = false
  ) {
    e.preventDefault();
    e.stopPropagation();
    contextMenuData = {
      x: e.clientX,
      y: e.clientY,
      filePath,
      isStaged,
      isUntracked,
      isConflicted,
    };
  }

  // Pagination cho Untracked files để giữ 60 FPS
  let untrackedLimit = $state(100);
  let visibleUntracked = $derived((status?.untracked || []).slice(0, untrackedLimit));
  let totalUntracked = $derived(status?.untracked.length || 0);
  let hasMoreUntracked = $derived(totalUntracked > untrackedLimit);

  // Danh sách các pattern thư mục nặng thường gặp
  const HEAVY_DIR_PATTERNS = [
    'node_modules',
    'target',
    'dist',
    '.svelte-kit',
    '.next',
    '.turbo',
    '.venv',
    'venv',
    '__pycache__',
    'build',
    'vendor',
  ];

  let detectedHeavyFolders = $derived.by(() => {
    if (!status?.untracked) return [];
    const found = new Set<string>();
    for (const item of status.untracked) {
      for (const pattern of HEAVY_DIR_PATTERNS) {
        if (
          item.path === pattern ||
          item.path === `${pattern}/` ||
          item.path.startsWith(`${pattern}/`) ||
          item.path.includes(`/${pattern}/`)
        ) {
          found.add(pattern);
        }
      }
    }
    return Array.from(found);
  });

  function getStatusBadge(item: FileStatusItem) {
    switch (item.status) {
      case 'added':
        return { label: 'A', class: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/40' };
      case 'modified':
        return { label: 'M', class: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800/40' };
      case 'deleted':
        return { label: 'D', class: 'text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800/40' };
      case 'renamed':
        return { label: 'R', class: 'text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800/40' };
      case 'untracked':
        return { label: 'U', class: 'text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800/40' };
      case 'conflicted':
        return { label: 'C', class: 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/60 border-orange-300 dark:border-orange-800/40 animate-pulse' };
      default:
        return { label: '•', class: 'text-zinc-600 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800' };
    }
  }

  // Resizable Width state
  let panelWidth = $state<number>(384);
  let isResizingWidth = $state<boolean>(false);
  let resizeStartX = 0;
  let resizeStartWidth = 0;

  function handleStartResizeWidth(e: MouseEvent) {
    isResizingWidth = true;
    resizeStartX = e.clientX;
    resizeStartWidth = panelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingWidth) return;
      const deltaX = moveEvent.clientX - resizeStartX;
      panelWidth = Math.max(280, Math.min(680, resizeStartWidth + deltaX));
    };

    const onMouseUp = () => {
      isResizingWidth = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
</script>

<div class="h-full w-full flex overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none">
  <!-- Left Column: Working Tree File Lists & Commit Box -->
  <div
    style="width: {panelWidth}px;"
    class="h-full border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/60 flex flex-col shrink-0 overflow-hidden transition-[width] duration-75"
  >
    <!-- Header Summary -->
    <div class="p-3 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-zinc-900/40 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <FolderGit2 class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        <span class="font-bold text-xs text-zinc-900 dark:text-zinc-100">{localeState.t('workingTree.title')}</span>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          onclick={() => (showGitignoreModal = true)}
          class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-300/70 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition-colors cursor-pointer"
          title={localeState.t('workingTree.gitignoreManagerTooltip')}
        >
          <FileCode class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
          <span class="hidden sm:inline">{localeState.t('workingTree.openGitignoreManager')}</span>
        </button>

        <button
          onclick={() => modalState.openGitHooks()}
          class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 border border-zinc-300/70 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition-colors cursor-pointer"
          title={localeState.t('gitHooks.title')}
        >
          <Anchor class="w-3 h-3 text-amber-500" />
          <span class="hidden sm:inline">{localeState.t('gitHooks.title')}</span>
        </button>

        <button
          onclick={onOpenTrash}
          class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium transition-colors cursor-pointer"
          title={localeState.t('workingTree.openSafeDiscardTrash')}
        >
          <ShieldCheck class="w-3 h-3" />
          <span>{localeState.t('workingTree.safeDiscard')}</span>
          {#if trashCount > 0}
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-emerald-200 dark:bg-emerald-800/80 text-emerald-900 dark:text-emerald-200 shadow-2xs">
              {trashCount}
            </span>
          {/if}
        </button>
      </div>
    </div>

    <!-- Scrollable Files List -->
    <div class="flex-1 overflow-y-auto p-2 space-y-3 font-sans text-xs">
      <!-- SMART GITIGNORE SHIELD BANNER -->
      {#if detectedHeavyFolders.length > 0 || totalUntracked > 100}
        <div class="p-2.5 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-zinc-50 dark:via-zinc-900/60 to-zinc-100 dark:to-zinc-950/80 shadow-xs backdrop-blur-xs space-y-2">
          <div class="flex items-start gap-2">
            <div class="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <Sparkles class="w-3.5 h-3.5" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>{localeState.t('workingTree.smartGitignoreTitle')}</span>
                <span class="text-[10px] font-mono text-amber-700 dark:text-amber-400/80 font-normal">
                  {localeState.t('workingTree.untrackedFilesDetected', { count: totalUntracked.toLocaleString() })}
                </span>
              </div>
              <p class="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                {#if detectedHeavyFolders.length > 0}
                  {localeState.t('workingTree.heavyFoldersDetected')}
                  {#each detectedHeavyFolders as folder, idx}
                    <code class="text-amber-700 dark:text-amber-300 font-mono font-bold">{folder}/</code>{idx < detectedHeavyFolders.length - 1 ? ', ' : ''}
                  {/each}
                {:else}
                  {localeState.t('workingTree.heavyFoldersRecommend', { count: totalUntracked.toLocaleString() })}
                {/if}
              </p>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-500/20">
            {#each detectedHeavyFolders as folder}
              <button
                onclick={() => onAddToGitignore?.(`${folder}/`)}
                class="px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                title={localeState.t('workingTree.ignoreFolderTooltip', { folder })}
              >
                <Plus class="w-2.5 h-2.5" />
                <span>{localeState.t('workingTree.ignoreFolder', { folder })}</span>
              </button>
            {/each}

            {#if onGenerateGitignore}
              <button
                onclick={onGenerateGitignore}
                class="px-2.5 py-1 rounded-md bg-cyan-100 dark:bg-cyan-950/60 hover:bg-cyan-200 dark:hover:bg-cyan-900/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/50 text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                title={localeState.t('workingTree.generateGitignoreTooltip')}
              >
                <FileCode class="w-2.5 h-2.5" />
                <span>{localeState.t('workingTree.generateStandardGitignore')}</span>
              </button>
            {/if}
          </div>
        </div>
      {/if}
      <!-- CONFLICTED FILES (CRITICAL) -->
      {#if (status?.conflicted.length || 0) > 0}
        <div class="rounded-xl border border-rose-300 dark:border-rose-800/80 bg-rose-50/80 dark:bg-rose-950/30 p-2 space-y-1.5 shadow-xs">
          <div class="flex items-center justify-between px-1">
            <button
              onclick={() => (showConflictedSection = !showConflictedSection)}
              class="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-rose-700 dark:text-rose-300 cursor-pointer"
            >
              {#if showConflictedSection}
                <ChevronDown class="w-3.5 h-3.5 text-rose-500" />
              {:else}
                <ChevronRight class="w-3.5 h-3.5 text-rose-500" />
              {/if}
              <AlertTriangle class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{localeState.t('workingTree.conflictedFiles')}</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-200 dark:bg-rose-900/80 font-mono font-bold text-rose-800 dark:text-rose-200">
                {status?.conflicted.length || 0}
              </span>
            </button>
          </div>

          {#if showConflictedSection}
            <div class="space-y-0.5 pl-1">
              {#each status?.conflicted || [] as item (item.path)}
                {@const badge = getStatusBadge(item)}
                <div
                  class="group w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer {selectedFilePath === item.path ? 'bg-rose-100 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 shadow-xs font-semibold' : 'hover:bg-rose-100/60 dark:hover:bg-rose-950/60 text-zinc-800 dark:text-zinc-200'}"
                  onclick={() => onSelectFile(item, false)}
                  oncontextmenu={(e) => handleContextMenu(e, item.path, false, false, true)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectFile(item, false); }}
                >
                  <div class="flex items-center gap-2 truncate pr-1">
                    <span class="w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center border shrink-0 {badge.class}">
                      {badge.label}
                    </span>
                    <span class="font-mono text-[11px] truncate text-rose-800 dark:text-rose-300 font-medium">{item.path}</span>
                  </div>

                  <div class="flex items-center gap-1">
                    <button
                      onclick={(e) => { e.stopPropagation(); onStageFile(item.path); }}
                      class="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-medium flex items-center gap-1 shadow-xs cursor-pointer"
                      title={localeState.t('workingTree.markResolved')}
                    >
                      <Plus class="w-2.5 h-2.5" />
                      <span>{localeState.t('workingTree.stage')}</span>
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- STAGED CHANGES -->
      <div>
        <div class="flex items-center justify-between px-2 py-1">
          <button
            onclick={() => (showStagedSection = !showStagedSection)}
            class="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
          >
            {#if showStagedSection}
              <ChevronDown class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            {:else}
              <ChevronRight class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            {/if}
            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{localeState.t('workingTree.stagedChanges')}</span>
            <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({status?.staged.length || 0})</span>
          </button>

          {#if (status?.staged.length || 0) > 0}
            <button
              onclick={onUnstageAll}
              class="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
              title={localeState.t('workingTree.unstageAll')}
            >
              <Minus class="w-2.5 h-2.5" />
              <span>{localeState.t('workingTree.unstageAll')}</span>
            </button>
          {/if}
        </div>

        {#if showStagedSection}
          <div class="mt-1 space-y-0.5 pl-1">
            {#each status?.staged || [] as item (item.path)}
              {@const badge = getStatusBadge(item)}
              <div
                class="group w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer {selectedFilePath === item.path && selectedFileIsStaged ? 'bg-cyan-100 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800/50 text-cyan-900 dark:text-cyan-200 shadow-xs font-medium' : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300'}"
                onclick={() => onSelectFile(item, true)}
                oncontextmenu={(e) => handleContextMenu(e, item.path, true, false, false)}
                role="button"
                tabindex="0"
                onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectFile(item, true); }}
              >
                <div class="flex items-center gap-2 truncate pr-1">
                  <span class="w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center border shrink-0 {badge.class}">
                    {badge.label}
                  </span>
                  <span class="font-mono text-[11px] truncate">{item.path}</span>
                </div>

                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onclick={(e) => { e.stopPropagation(); onUnstageFile(item.path); }}
                    class="p-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-800 dark:hover:text-amber-300 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                    title={localeState.t('workingTree.unstageFile')}
                  >
                    <Minus class="w-3 h-3" />
                  </button>
                </div>
              </div>
            {/each}

            {#if (status?.staged.length || 0) === 0}
              <div class="px-2 py-1 text-[11px] text-zinc-400 dark:text-zinc-600 italic">{localeState.t('workingTree.noStaged')}</div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- UNSTAGED CHANGES -->
      <div>
        <div class="flex items-center justify-between px-2 py-1">
          <button
            onclick={() => (showUnstagedSection = !showUnstagedSection)}
            class="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
          >
            {#if showUnstagedSection}
              <ChevronDown class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            {:else}
              <ChevronRight class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            {/if}
            <span class="text-amber-600 dark:text-amber-400 font-semibold">{localeState.t('workingTree.unstagedChanges')}</span>
            <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({status?.unstaged.length || 0})</span>
          </button>

          {#if (status?.unstaged.length || 0) > 0 || (status?.untracked.length || 0) > 0}
            <div class="flex items-center gap-1">
              <button
                onclick={onStageAll}
                class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                title={localeState.t('workingTree.stageAll')}
              >
                <Plus class="w-2.5 h-2.5" />
                <span>{localeState.t('workingTree.stageAll')}</span>
              </button>
              <button
                onclick={onDiscardAll}
                class="text-[10px] font-mono p-1 rounded bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-pointer transition-colors"
                title={localeState.t('workingTree.discardAllProtected')}
              >
                <Trash2 class="w-2.5 h-2.5" />
              </button>
            </div>
          {/if}
        </div>

        {#if showUnstagedSection}
          <div class="mt-1 space-y-0.5 pl-1">
            {#each status?.unstaged || [] as item (item.path)}
              {@const badge = getStatusBadge(item)}
              <div
                class="group w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer {selectedFilePath === item.path && !selectedFileIsStaged ? 'bg-cyan-100 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800/50 text-cyan-900 dark:text-cyan-200 shadow-xs font-medium' : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300'}"
                onclick={() => onSelectFile(item, false)}
                oncontextmenu={(e) => handleContextMenu(e, item.path, false, false, false)}
                role="button"
                tabindex="0"
                onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectFile(item, false); }}
              >
                <div class="flex items-center gap-2 truncate pr-1">
                  <span class="w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center border shrink-0 {badge.class}">
                    {badge.label}
                  </span>
                  <span class="font-mono text-[11px] truncate">{item.path}</span>
                </div>

                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onclick={(e) => { e.stopPropagation(); onStageFile(item.path); }}
                    class="p-1 rounded bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40 cursor-pointer"
                    title={localeState.t('workingTree.stageFile')}
                  >
                    <Plus class="w-3 h-3" />
                  </button>
                  <button
                    onclick={(e) => { e.stopPropagation(); onDiscardFile(item.path); }}
                    class="p-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-400 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                    title={localeState.t('workingTree.discardFile')}
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                </div>
              </div>
            {/each}

            {#if (status?.unstaged.length || 0) === 0}
              <div class="px-2 py-1 text-[11px] text-zinc-400 dark:text-zinc-600 italic">{localeState.t('workingTree.noUnstaged')}</div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- UNTRACKED FILES -->
      {#if (status?.untracked.length || 0) > 0}
        <div>
          <button
            onclick={() => (showUntrackedSection = !showUntrackedSection)}
            class="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
          >
            <div class="flex items-center gap-1.5">
              {#if showUntrackedSection}
                <ChevronDown class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              {:else}
                <ChevronRight class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              {/if}
              <span class="text-purple-600 dark:text-purple-400 font-semibold">Untracked Files</span>
              <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({status?.untracked.length})</span>
            </div>
          </button>

          {#if showUntrackedSection}
            <div class="mt-1 space-y-0.5 pl-1">
              {#each visibleUntracked as item (item.path)}
                {@const badge = getStatusBadge(item)}
                <div
                  class="group w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer {selectedFilePath === item.path && !selectedFileIsStaged ? 'bg-cyan-100 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800/50 text-cyan-900 dark:text-cyan-200 shadow-xs font-medium' : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300'}"
                  onclick={() => onSelectFile(item, false)}
                  oncontextmenu={(e) => handleContextMenu(e, item.path, false, true, false)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectFile(item, false); }}
                >
                  <div class="flex items-center gap-2 truncate pr-1">
                    {#if item.is_dir}
                      <Folder class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                    {:else}
                      <span class="w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center border shrink-0 {badge.class}">
                        {badge.label}
                      </span>
                    {/if}
                    <span class="font-mono text-[11px] truncate">{item.path}</span>
                  </div>

                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onclick={(e) => { e.stopPropagation(); onStageFile(item.path); }}
                      class="p-1 rounded bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40 cursor-pointer"
                      title={item.is_dir ? "Stage thư mục" : "Stage file"}
                    >
                      <Plus class="w-3 h-3" />
                    </button>
                    {#if !item.is_dir}
                      <button
                        onclick={(e) => { e.stopPropagation(); onDiscardFile(item.path); }}
                        class="p-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-400 text-zinc-600 dark:text-zinc-400 cursor-pointer"
                        title="Safe Discard file"
                      >
                        <Trash2 class="w-3 h-3" />
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}

              {#if hasMoreUntracked}
                <div class="p-2.5 rounded-xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 flex flex-col gap-2 items-center justify-center text-center mt-2 shadow-xs">
                  <div class="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Đang hiển thị <span class="text-zinc-900 dark:text-zinc-200 font-mono font-semibold">{visibleUntracked.length}</span> / <span class="text-purple-600 dark:text-purple-400 font-mono font-semibold">{totalUntracked.toLocaleString()}</span> tệp
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      onclick={() => (untrackedLimit += 200)}
                      class="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-mono font-medium cursor-pointer transition-colors"
                    >
                      + Tải thêm 200 tệp
                    </button>
                    <button
                      onclick={() => (untrackedLimit = totalUntracked)}
                      class="px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-950/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 border border-purple-300 dark:border-purple-800/50 text-purple-800 dark:text-purple-300 text-[10px] font-mono font-medium cursor-pointer transition-colors"
                    >
                      Hiện tất cả ({totalUntracked})
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Bottom Commit Control Center -->
    <CommitBox
      stagedCount={status?.staged.length || 0}
      stagedFiles={status?.staged || []}
      {currentBranch}
      {repoPath}
      isLoading={isCommitLoading}
      {onCommit}
      {onCreateBranch}
      {onAddToGitignore}
      onUnstageFiles={async (files) => {
        for (const f of files) {
          await onUnstageFile(f);
        }
      }}
    />
  </div>

  <!-- Resizable Splitter Handle between File List and Diff Viewer -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
  <div
    role="separator"
    aria-orientation="vertical"
    tabindex="-1"
    onmousedown={handleStartResizeWidth}
    class="w-1.5 h-full bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-cyan-500 active:bg-cyan-600 cursor-col-resize transition-colors flex items-center justify-center shrink-0 group relative z-10 select-none {isResizingWidth ? 'bg-cyan-500!' : ''}"
    title="Kéo chuột để điều chỉnh độ rộng danh sách tệp"
  >
    <div class="w-0.5 h-10 rounded-full bg-zinc-400 dark:bg-zinc-600 group-hover:bg-white transition-colors"></div>
  </div>

  <!-- Right Column: Interactive Diff Viewer -->
  <div class="flex-1 h-full overflow-hidden">
    <DiffViewer
      {diffDetail}
      isLoading={isDiffLoading}
      {ignoreWhitespace}
      {onToggleIgnoreWhitespace}
      onStageHunk={(idx) => onStageHunk(idx)}
      onUnstageHunk={(idx) => onUnstageHunk(idx)}
      onStageFile={() => selectedFilePath && onStageFile(selectedFilePath)}
      onUnstageFile={() => selectedFilePath && onUnstageFile(selectedFilePath)}
      onDiscardFile={() => selectedFilePath && onDiscardFile(selectedFilePath)}
    />
  </div>
</div>

<!-- Working Tree File Context Menu -->
{#if contextMenuData}
  <WorkingTreeContextMenu
    x={contextMenuData.x}
    y={contextMenuData.y}
    filePath={contextMenuData.filePath}
    isStaged={contextMenuData.isStaged}
    isUntracked={contextMenuData.isUntracked}
    isConflicted={contextMenuData.isConflicted}
    {repoPath}
    onClose={() => (contextMenuData = null)}
    onStage={async (p) => {
      await onStageFile(p);
    }}
    onUnstage={async (p) => {
      await onUnstageFile(p);
    }}
    onDiscard={async (p) => {
      await onDiscardFile(p);
    }}
    onAddToGitignore={onAddToGitignore}
    onOpenFileHistory={(p) => {
      fileHistoryTarget = p;
    }}
  />
{/if}

<!-- Gitignore Manager Modal -->
{#if showGitignoreModal}
  <GitignoreManagerModal
    {repoPath}
    onClose={() => (showGitignoreModal = false)}
    onUpdated={async () => {
      if (onGenerateGitignore) {
        await onGenerateGitignore();
      }
    }}
  />
{/if}

<!-- File History Modal -->
{#if fileHistoryTarget}
  <FileHistoryModal
    isOpen={true}
    {repoPath}
    filePath={fileHistoryTarget}
    onClose={() => (fileHistoryTarget = null)}
  />
{/if}
