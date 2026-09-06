<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    BlameHunkItem,
    BranchInfo,
    CommitNode,
    FileDeltaStatus,
    FileGrepMatch,
    TagInfo,
    TreeEntryItem,
    WorkingTreeStatus,
  } from '../types';
  import {
    getFileContent,
    getTreeEntries,
    saveFileContent,
    grepRepositoryContent,
    openInExternalEditor,
    revealInFileManager,
  } from '../api';
  import { getFileBlame } from '../api/diff';
  import MonacoEditor from './MonacoEditor.svelte';
  import MonacoDiffEditor from './MonacoDiffEditor.svelte';
  import FileHistoryModal from './FileHistoryModal.svelte';
  import RefPickerModal from './explorer/RefPickerModal.svelte';
  import {
    Folder,
    FolderOpen,
    File,
    FileCode,
    FileText,
    FileJson,
    Search,
    ChevronRight,
    ChevronDown,
    Copy,
    WrapText,
    Map as MapIcon,
    RefreshCw,
    GitCommit,
    FolderGit2,
    Binary,
    Trash2,
    History,
    UserCheck,
    PanelLeftClose,
    PanelLeftOpen,
    ExternalLink,
    Code,
    Edit3,
    Eye,
    GitCompare,
    Save,
    MoreVertical,
    Sparkles,
    CheckCircle2,
    RotateCcw,
  } from 'lucide-svelte';
  import { toast } from '../state/toastState.svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    repoPath: string;
    commits?: CommitNode[];
    branches?: BranchInfo[];
    tags?: TagInfo[];
    workingTreeStatus?: WorkingTreeStatus | null;
    initialFilePath?: string | null;
    onNukeFile?: (filePath: string) => void;
    onSelectCommit?: (commitId: string) => void;
    onStageFile?: (filePath: string) => Promise<void>;
    onUnstageFile?: (filePath: string) => Promise<void>;
    onDiscardFile?: (filePath: string) => Promise<void>;
  }

  let {
    repoPath,
    commits = [],
    branches = [],
    tags = [],
    workingTreeStatus = null,
    initialFilePath = null,
    onNukeFile,
    onSelectCommit,
    onStageFile,
    onUnstageFile,
    onDiscardFile,
  }: Props = $props();

  // Splitter & Layout state
  let treeWidth = $state<number>(300);
  let isTreeCollapsed = $state<boolean>(false);
  let isDraggingSplitter = $state<boolean>(false);

  // Explorer Tab: 'tree' (Files) vs 'search' (Find in files)
  let explorerTab = $state<'tree' | 'search'>('tree');

  // Ref Picker
  let isRefPickerOpen = $state<boolean>(false);
  let selectedCommitOid = $state<string | null>(null);
  let selectedRefLabel = $state<string>('Working Tree (Live Files)');

  // Context Menu
  let contextMenu = $state<{ x: number; y: number; path: string } | null>(null);
  let showMoreDropdown = $state<boolean>(false);
  let showEditorDropdown = $state<boolean>(false);

  // Blame & File History state
  let showBlame = $state<boolean>(false);
  let blameHunks = $state<BlameHunkItem[]>([]);
  let isBlameLoading = $state<boolean>(false);
  let showFileHistory = $state<boolean>(false);

  // Tree state: Map of directory path -> array of TreeEntryItem
  let directoryEntries = $state<Record<string, TreeEntryItem[]>>({});
  let expandedDirs = $state<Set<string>>(new Set([''])); // '' is root
  let isTreeLoading = $state<boolean>(false);
  let treeSearchQuery = $state<string>('');

  // Selected file and content
  let selectedFilePath = $state<string | null>(null);
  let fileContent = $state<string>('');
  let initialLoadedContent = $state<string>('');
  let isBinary = $state<boolean>(false);
  let fileSize = $state<number>(0);
  let isContentLoading = $state<boolean>(false);

  // View Mode: 'preview' (readOnly), 'edit' (editable + save), 'diff' (MonacoDiff vs HEAD)
  let editorMode = $state<'preview' | 'edit' | 'diff'>('preview');
  let headContentForDiff = $state<string>('');
  let isDiffLoading = $state<boolean>(false);
  let isSaving = $state<boolean>(false);
  let targetLine = $state<number | null>(null);

  // Grep (Find in Files) state
  let grepQuery = $state<string>('');
  let grepCaseSensitive = $state<boolean>(false);
  let grepResults = $state<FileGrepMatch[]>([]);
  let isGrepSearching = $state<boolean>(false);

  // Editor settings
  let wordWrap = $state<'on' | 'off'>('on');
  let minimap = $state<boolean>(true);

  // Path segments for breadcrumbs
  let pathSegments = $derived(selectedFilePath ? selectedFilePath.split('/') : []);

  // Track unsaved modifications
  let hasUnsavedChanges = $derived(
    editorMode === 'edit' && fileContent !== initialLoadedContent
  );

  // Build Git Status map for quick lookup
  let gitStatusMap = $derived.by(() => {
    const map = new Map<string, { status: FileDeltaStatus; isStaged: boolean }>();
    if (!workingTreeStatus) return map;

    for (const item of workingTreeStatus.staged) {
      map.set(item.path, { status: item.status, isStaged: true });
    }
    for (const item of workingTreeStatus.unstaged) {
      map.set(item.path, { status: item.status, isStaged: false });
    }
    for (const item of workingTreeStatus.untracked) {
      map.set(item.path, { status: 'untracked', isStaged: false });
    }
    for (const item of workingTreeStatus.conflicted) {
      map.set(item.path, { status: 'conflicted', isStaged: false });
    }
    return map;
  });

  // Folders with dirty changes
  let dirtyFolders = $derived.by(() => {
    const folders = new Set<string>();
    for (const [filePath] of gitStatusMap) {
      const parts = filePath.split('/');
      let cur = '';
      for (let i = 0; i < parts.length - 1; i++) {
        cur = cur ? `${cur}/${parts[i]}` : parts[i];
        folders.add(cur);
      }
    }
    return folders;
  });

  // Selected file's git status
  let selectedFileGitStatus = $derived(
    selectedFilePath ? gitStatusMap.get(selectedFilePath) : null
  );

  async function loadDirectory(dirPath: string = '') {
    if (!repoPath) return;
    try {
      const items = await getTreeEntries(repoPath, dirPath, selectedCommitOid || undefined);
      directoryEntries = {
        ...directoryEntries,
        [dirPath]: items,
      };
    } catch (err) {
      console.error('Failed to load directory tree:', err);
    }
  }

  async function toggleDirectory(dirPath: string) {
    const next = new Set(expandedDirs);
    if (next.has(dirPath)) {
      next.delete(dirPath);
    } else {
      next.add(dirPath);
      if (!directoryEntries[dirPath]) {
        await loadDirectory(dirPath);
      }
    }
    expandedDirs = next;
  }

  async function selectFile(filePath: string, jumpToLine?: number) {
    selectedFilePath = filePath;
    targetLine = jumpToLine ?? null;
    isContentLoading = true;
    try {
      const res = await getFileContent(repoPath, filePath, selectedCommitOid || undefined);
      fileContent = res.content;
      initialLoadedContent = res.content;
      isBinary = res.is_binary;
      fileSize = res.size_bytes;

      if (editorMode === 'diff') {
        await loadHeadDiffContent(filePath);
      }

      if (showBlame && !res.is_binary) {
        await loadBlame(filePath);
      }
    } catch (err) {
      console.error('Failed to load file content:', err);
      toast.error('Lỗi đọc file', `Không thể đọc nội dung file: ${filePath}`);
    } finally {
      isContentLoading = false;
    }
  }

  async function loadHeadDiffContent(filePath: string) {
    isDiffLoading = true;
    try {
      const res = await getFileContent(repoPath, filePath, 'HEAD');
      headContentForDiff = res.content;
    } catch {
      headContentForDiff = '';
    } finally {
      isDiffLoading = false;
    }
  }

  async function handleToggleDiffMode() {
    if (editorMode === 'diff') {
      editorMode = 'preview';
    } else {
      editorMode = 'diff';
      if (selectedFilePath) {
        await loadHeadDiffContent(selectedFilePath);
      }
    }
  }

  async function handleSave() {
    if (!selectedFilePath || !repoPath || isBinary) return;
    isSaving = true;
    try {
      await saveFileContent(repoPath, selectedFilePath, fileContent);
      initialLoadedContent = fileContent;
      toast.success('Đã lưu file thành công', selectedFilePath);
      // Auto refresh tree to update dirty status
      await refreshTree();
    } catch (err: any) {
      console.error('Save failed:', err);
      toast.error('Lưu file thất bại', err?.message || err);
    } finally {
      isSaving = false;
    }
  }

  async function loadBlame(filePath: string) {
    if (!repoPath || !filePath) return;
    isBlameLoading = true;
    try {
      blameHunks = await getFileBlame(repoPath, filePath);
    } catch (err: any) {
      console.error('Failed to load blame:', err);
      toast.error('Lỗi tính toán Git Blame', err?.message || err);
    } finally {
      isBlameLoading = false;
    }
  }

  function toggleBlame() {
    showBlame = !showBlame;
    if (showBlame && selectedFilePath && !isBinary) {
      loadBlame(selectedFilePath);
    }
  }

  async function runGrepSearch() {
    if (!repoPath || !grepQuery.trim()) {
      grepResults = [];
      return;
    }
    isGrepSearching = true;
    try {
      grepResults = await grepRepositoryContent(
        repoPath,
        grepQuery.trim(),
        grepCaseSensitive,
        300
      );
    } catch (err: any) {
      console.error('Grep search failed:', err);
      toast.error('Tìm kiếm thất bại', err?.message || err);
    } finally {
      isGrepSearching = false;
    }
  }

  function formatRelativeDate(timestamp: number): string {
    if (!timestamp) return '';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return 'vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d trước`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo trước`;
    return `${Math.floor(diff / 31536000)}y trước`;
  }

  async function refreshTree() {
    isTreeLoading = true;
    directoryEntries = {};
    expandedDirs = new Set(['']);
    await loadDirectory('');
    if (selectedFilePath) {
      await selectFile(selectedFilePath, targetLine || undefined);
    }
    isTreeLoading = false;
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function copyPath(isAbsolute: boolean = false) {
    if (!selectedFilePath) return;
    const target = isAbsolute ? `${repoPath}/${selectedFilePath}` : selectedFilePath;
    navigator.clipboard.writeText(target);
    toast.info('Đã sao chép đường dẫn', target);
  }

  function copyContent() {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    toast.info('Đã sao chép', 'Toàn bộ nội dung file đã được sao chép vào bộ nhớ tạm.');
  }

  async function handleOpenInEditor(editor: 'cursor' | 'antigravity' | 'code' | 'zed' | 'default') {
    if (!selectedFilePath || !repoPath) return;
    showEditorDropdown = false;
    const fullPath = `${repoPath}/${selectedFilePath}`.replace(/\\/g, '/');
    try {
      await openInExternalEditor(fullPath, editor);
      toast.success(
        'Mở editor thành công',
        `Đang khởi chạy ${editor === 'antigravity' ? 'Antigravity IDE' : editor.toUpperCase()}`
      );
    } catch (err: any) {
      console.error(`Failed to open in ${editor}:`, err);
      toast.error('Lỗi khởi chạy editor', err?.message || err);
    }
  }

  async function handleRevealInExplorer() {
    if (!selectedFilePath || !repoPath) return;
    const fullPath = `${repoPath}/${selectedFilePath}`.replace(/\\/g, '/');
    try {
      await revealInFileManager(fullPath);
    } catch (err: any) {
      console.error('Failed to reveal file:', err);
      toast.error('Lỗi mở thư mục', err?.message || err);
    }
  }

  function getFileIcon(fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['ts', 'js', 'rs', 'py', 'go', 'c', 'cpp', 'java', 'svelte', 'html', 'css'].includes(ext || '')) {
      return FileCode;
    }
    if (['json', 'yaml', 'yml', 'toml'].includes(ext || '')) {
      return FileJson;
    }
    if (['md', 'txt', 'log'].includes(ext || '')) {
      return FileText;
    }
    return File;
  }

  // Splitter drag logic
  function startDraggingSplitter(e: MouseEvent) {
    e.preventDefault();
    isDraggingSplitter = true;

    function onMouseMove(moveEvent: MouseEvent) {
      const newWidth = Math.max(180, Math.min(650, moveEvent.clientX - 60));
      treeWidth = newWidth;
    }

    function onMouseUp() {
      isDraggingSplitter = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  onMount(() => {
    refreshTree();
    if (initialFilePath) {
      selectFile(initialFilePath);
    }

    function handleGlobalKeyDown(e: KeyboardEvent) {
      // Ctrl+B: Toggle file tree
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        isTreeCollapsed = !isTreeCollapsed;
      }
      // Ctrl+E: Toggle edit mode
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        editorMode = editorMode === 'edit' ? 'preview' : 'edit';
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  });

  $effect(() => {
    if (initialFilePath && initialFilePath !== selectedFilePath) {
      selectFile(initialFilePath);
    }
  });

  $effect(() => {
    void selectedCommitOid;
    if (repoPath) {
      refreshTree();
    }
  });
</script>

<div class="h-full w-full flex bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 overflow-hidden select-none font-sans relative">
  <!-- Left Panel: Resizable File Tree Explorer / Grep -->
  {#if !isTreeCollapsed}
    <div
      class="h-full border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/80 flex flex-col shrink-0 relative transition-none"
      style="width: {treeWidth}px"
    >
      <!-- Explorer Header: Target Ref Picker & Actions -->
      <div class="p-2.5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-900/40 flex flex-col gap-2 shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 min-w-0">
            <FolderGit2 class="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span class="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">Explorer</span>
          </div>

          <div class="flex items-center gap-1">
            <button
              onclick={refreshTree}
              class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title="Tải lại cây thư mục"
            >
              <RefreshCw class="w-3.5 h-3.5 {isTreeLoading ? 'animate-spin text-cyan-600 dark:text-cyan-400' : ''}" />
            </button>
            <button
              onclick={() => (isTreeCollapsed = true)}
              class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title="Thu gọn cột thư mục (Ctrl + B)"
            >
              <PanelLeftClose class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Target Ref Selector Button -->
        <button
          onclick={() => (isRefPickerOpen = true)}
          class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500/50 text-left transition-all cursor-pointer shadow-2xs group"
          title={localeState.t('explorer.repository.refPickerButtonTooltip')}
        >
          <div class="flex items-center gap-1.5 truncate min-w-0">
            {#if selectedCommitOid === null}
              <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
              <span class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 truncate">{localeState.t('explorer.repository.workingTreeLive')}</span>
            {:else}
              <GitCommit class="w-3 h-3 text-indigo-500 shrink-0" />
              <span class="text-xs font-mono font-medium text-indigo-700 dark:text-indigo-400 truncate">{selectedRefLabel}</span>
            {/if}
          </div>
          <ChevronDown class="w-3 h-3 text-zinc-400 group-hover:text-cyan-500 transition-colors shrink-0 ml-1" />
        </button>

        <!-- Subtabs: File Tree vs Grep Search -->
        <div class="flex items-center gap-1 bg-zinc-200/50 dark:bg-zinc-950 p-0.5 rounded-lg text-[11px] font-medium">
          <button
            onclick={() => (explorerTab = 'tree')}
            class="flex-1 py-1 rounded-md flex items-center justify-center gap-1 cursor-pointer transition-all {explorerTab === 'tree' ? 'bg-white dark:bg-zinc-800 text-cyan-700 dark:text-cyan-300 font-semibold shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            <Folder class="w-3 h-3" />
            <span>{localeState.t('explorer.repository.filesTab')}</span>
          </button>
          <button
            onclick={() => (explorerTab = 'search')}
            class="flex-1 py-1 rounded-md flex items-center justify-center gap-1 cursor-pointer transition-all {explorerTab === 'search' ? 'bg-white dark:bg-zinc-800 text-cyan-700 dark:text-cyan-300 font-semibold shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            <Search class="w-3 h-3" />
            <span>{localeState.t('explorer.repository.findInRepo')}</span>
          </button>
        </div>

        {#if explorerTab === 'tree'}
          <!-- Filter input for file names -->
          <div class="relative w-full">
            <Search class="w-3 h-3 text-zinc-400 dark:text-zinc-500 absolute left-2.5 top-2 pointer-events-none" />
            <input
              type="text"
              bind:value={treeSearchQuery}
              placeholder={localeState.t('explorer.repository.filterFileNames')}
              class="w-full bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-7 pr-2 py-1 text-xs text-zinc-900 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        {:else}
          <!-- Grep search input -->
          <div class="flex flex-col gap-1.5">
            <div class="relative w-full">
              <Search class="w-3 h-3 text-zinc-400 dark:text-zinc-500 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                bind:value={grepQuery}
                onkeydown={(e) => {
                  if (e.key === 'Enter') runGrepSearch();
                }}
                placeholder={localeState.t('explorer.repository.findCodePlaceholder')}
                class="w-full bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-7 pr-7 py-1 text-xs text-zinc-900 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onclick={runGrepSearch}
                class="absolute right-1.5 top-1 px-1.5 py-0.5 rounded text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white font-medium cursor-pointer"
              >
                {localeState.t('explorer.repository.grepBtn')}
              </button>
            </div>
            <div class="flex items-center justify-between text-[10px] text-zinc-500 px-1">
              <label class="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  bind:checked={grepCaseSensitive}
                  onchange={runGrepSearch}
                  class="rounded text-cyan-600 focus:ring-0 w-3 h-3"
                />
                <span>{localeState.t('explorer.repository.caseSensitive')}</span>
              </label>
              {#if grepResults.length > 0}
                <span class="text-cyan-600 dark:text-cyan-400 font-mono">{localeState.t('explorer.repository.resultsCount', { count: grepResults.length })}</span>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Left Tab Body -->
      <div class="flex-1 overflow-y-auto p-1.5 text-xs font-mono">
        {#if explorerTab === 'tree'}
          {#if isTreeLoading && !directoryEntries['']}
            <div class="h-32 flex items-center justify-center text-zinc-500 text-xs gap-2">
              <div class="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
              <span>{localeState.t('explorer.repository.readingTree')}</span>
            </div>
          {:else}
            {#snippet renderTree(dirPath: string, depth: number)}
              {@const entries = directoryEntries[dirPath] || []}
              {@const filtered = treeSearchQuery.trim()
                ? entries.filter((e) => e.name.toLowerCase().includes(treeSearchQuery.toLowerCase()) || e.is_dir)
                : entries}

              {#each filtered as item (item.path)}
                {#if item.is_dir}
                  {@const isExpanded = expandedDirs.has(item.path)}
                  {@const hasDirtyChild = dirtyFolders.has(item.path)}
                  <div>
                    <button
                      onclick={() => toggleDirectory(item.path)}
                      class="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left group"
                      style="padding-left: {depth * 14 + 6}px"
                    >
                      <div class="flex items-center gap-1.5 truncate min-w-0">
                        {#if isExpanded}
                          <ChevronDown class="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
                          <FolderOpen class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                        {:else}
                          <ChevronRight class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                          <Folder class="w-3.5 h-3.5 text-amber-500/80 dark:text-amber-400/80 shrink-0" />
                        {/if}
                        <span class="truncate font-medium text-[11px]">{item.name}</span>
                      </div>
                      {#if hasDirtyChild}
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mr-1" title="Có tệp thay đổi bên trong"></span>
                      {/if}
                    </button>

                    {#if isExpanded}
                      {#if directoryEntries[item.path]}
                        {@render renderTree(item.path, depth + 1)}
                      {:else}
                        <div class="py-1 text-[10px] text-zinc-400 dark:text-zinc-600 italic" style="padding-left: {(depth + 1) * 14 + 6}px">
                          Loading...
                        </div>
                      {/if}
                    {/if}
                  </div>
                {:else}
                  {@const isSelected = selectedFilePath === item.path}
                  {@const IconComponent = getFileIcon(item.name)}
                  {@const gitStatus = gitStatusMap.get(item.path)}
                  <button
                    onclick={() => selectFile(item.path)}
                    oncontextmenu={(e) => {
                      e.preventDefault();
                      contextMenu = { x: e.clientX, y: e.clientY, path: item.path };
                    }}
                    class="w-full flex items-center justify-between py-1 px-1.5 rounded text-left transition-colors cursor-pointer {isSelected ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-950 dark:text-cyan-300 font-semibold border border-cyan-300 dark:border-cyan-800/50 shadow-xs' : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'}"
                    style="padding-left: {depth * 14 + 20}px"
                  >
                    <div class="flex items-center gap-1.5 truncate min-w-0">
                      <IconComponent class="w-3.5 h-3.5 {isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-400 dark:text-zinc-500'} shrink-0" />
                      <span class="truncate text-[11px] {gitStatus ? (gitStatus.status === 'untracked' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : gitStatus.status === 'conflicted' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-amber-600 dark:text-amber-400 font-medium') : ''}">
                        {item.name}
                      </span>
                    </div>

                    <div class="flex items-center gap-1 shrink-0 pl-1">
                      {#if gitStatus}
                        {#if gitStatus.status === 'untracked'}
                          <span class="px-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">U</span>
                        {:else if gitStatus.status === 'conflicted'}
                          <span class="px-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-bold">!</span>
                        {:else if gitStatus.isStaged}
                          <span class="px-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">S</span>
                        {:else}
                          <span class="px-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold">M</span>
                        {/if}
                      {/if}
                      {#if item.size !== undefined && item.size !== null}
                        <span class="text-[9px] text-zinc-400 dark:text-zinc-600">{formatBytes(item.size)}</span>
                      {/if}
                    </div>
                  </button>
                {/if}
              {/each}
            {/snippet}

            {@render renderTree('', 0)}
          {/if}
        {:else}
          <!-- Grep Results List -->
          {#if isGrepSearching}
            <div class="h-32 flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
              <div class="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
              <span>{localeState.t('explorer.repository.grepScanning')}</span>
            </div>
          {:else if grepResults.length === 0}
            <div class="p-6 text-center text-zinc-400 text-xs">
              {grepQuery ? localeState.t('explorer.repository.noGrepResults') : localeState.t('explorer.repository.grepPrompt')}
            </div>
          {:else}
            <div class="space-y-1">
              {#each grepResults as match}
                <button
                  onclick={() => selectFile(match.file_path, match.line_number)}
                  class="w-full text-left p-2 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors cursor-pointer group"
                >
                  <div class="flex items-center justify-between text-[11px]">
                    <span class="text-cyan-700 dark:text-cyan-400 font-semibold truncate group-hover:underline">{match.file_path}</span>
                    <span class="text-[10px] text-zinc-400 font-mono shrink-0 ml-1">L{match.line_number}</span>
                  </div>
                  <div class="text-[10px] text-zinc-600 dark:text-zinc-400 truncate mt-0.5 font-mono bg-zinc-100 dark:bg-zinc-950 px-1.5 py-0.5 rounded">
                    {match.line_content}
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>

    <!-- Draggable Splitter Divider -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onmousedown={startDraggingSplitter}
      class="w-1.5 h-full cursor-col-resize hover:bg-cyan-500/40 active:bg-cyan-500 transition-colors z-10 shrink-0 select-none {isDraggingSplitter ? 'bg-cyan-500' : 'bg-transparent'}"
      title={localeState.t('explorer.repository.dragSplitterTooltip')}
    ></div>
  {:else}
    <!-- Collapsed Toggle Button -->
    <button
      onclick={() => (isTreeCollapsed = false)}
      class="absolute left-2 top-2 z-20 p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md text-zinc-600 dark:text-zinc-300 hover:text-cyan-600 cursor-pointer"
      title={localeState.t('explorer.repository.expandTreeTooltip')}
    >
      <PanelLeftOpen class="w-4 h-4" />
    </button>
  {/if}

  <!-- Right Panel: Monaco Code Viewer / Editor (Full Screen) -->
  <div class="flex-1 h-full flex flex-col overflow-hidden bg-white dark:bg-zinc-950 min-w-0">
    {#if selectedFilePath}
      <!-- File Code Header -->
      <div class="h-10 px-3 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-900/60 flex items-center justify-between shrink-0 select-none gap-2">
        <!-- Interactive Segmented Breadcrumbs & File Details -->
        <div class="flex items-center gap-1.5 truncate min-w-0">
          <FileCode class="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />

          <!-- Segmented clickable breadcrumb -->
          <div class="flex items-center gap-1 text-xs font-mono truncate">
            {#each pathSegments as segment, idx}
              {#if idx > 0}
                <span class="text-zinc-400 text-[10px] shrink-0">/</span>
              {/if}
              {#if idx === pathSegments.length - 1}
                <span class="font-bold text-zinc-900 dark:text-zinc-100 truncate">{segment}</span>
              {:else}
                <span class="text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer transition-colors truncate">
                  {segment}
                </span>
              {/if}
            {/each}
          </div>

          <!-- File badges -->
          <div class="flex items-center gap-1.5 ml-1 font-mono text-[10px] shrink-0">
            {#if fileSize > 0}
              <span class="px-1.5 py-0.2 rounded bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60">
                {formatBytes(fileSize)}
              </span>
            {/if}

            {#if selectedFileGitStatus}
              {#if selectedFileGitStatus.status === 'untracked'}
                <span class="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 font-bold">
                  Untracked
                </span>
              {:else if selectedFileGitStatus.status === 'conflicted'}
                <span class="px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 font-bold">
                  Conflict
                </span>
              {:else if selectedFileGitStatus.isStaged}
                <span class="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 font-bold">
                  Staged
                </span>
              {:else}
                <span class="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 font-bold">
                  Modified
                </span>
              {/if}
            {/if}

            {#if hasUnsavedChanges}
              <span class="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold animate-pulse">
                {localeState.t('explorer.repository.unsavedBadge')}
              </span>
            {/if}
          </div>
        </div>

        <!-- Editor Toolbar Actions -->
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- View Modes: Preview | Edit | Diff -->
          <div class="flex items-center bg-zinc-200/60 dark:bg-zinc-800/60 p-0.5 rounded-lg text-[11px] font-medium">
            <button
              onclick={() => (editorMode = 'preview')}
              class="px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-all {editorMode === 'preview' ? 'bg-white dark:bg-zinc-900 text-cyan-700 dark:text-cyan-300 font-semibold shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'}"
              title={localeState.t('explorer.repository.previewModeTooltip')}
            >
              <Eye class="w-3 h-3" />
              <span class="hidden sm:inline">{localeState.t('explorer.repository.previewMode')}</span>
            </button>
            <button
              onclick={() => (editorMode = 'edit')}
              class="px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-all {editorMode === 'edit' ? 'bg-white dark:bg-zinc-900 text-cyan-700 dark:text-cyan-300 font-semibold shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'}"
              title={localeState.t('explorer.repository.editModeTooltip')}
            >
              <Edit3 class="w-3 h-3" />
              <span class="hidden sm:inline">{localeState.t('explorer.repository.editMode')}</span>
            </button>
            <button
              onclick={handleToggleDiffMode}
              class="px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-all {editorMode === 'diff' ? 'bg-white dark:bg-zinc-900 text-cyan-700 dark:text-cyan-300 font-semibold shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'}"
              title={localeState.t('explorer.repository.diffHeadModeTooltip')}
            >
              <GitCompare class="w-3 h-3" />
              <span class="hidden sm:inline">{localeState.t('explorer.repository.diffHeadMode')}</span>
            </button>
          </div>

          <!-- Save Button (Active in Edit mode) -->
          {#if editorMode === 'edit'}
            <button
              onclick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              class="px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer {hasUnsavedChanges ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'}"
              title={localeState.t('explorer.repository.saveTooltip')}
            >
              <Save class="w-3 h-3 {isSaving ? 'animate-spin' : ''}" />
              <span>{localeState.t('explorer.repository.saveBtn')}</span>
            </button>
          {/if}

          <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800"></div>

          <!-- Word wrap toggle -->
          <button
            onclick={() => (wordWrap = wordWrap === 'on' ? 'off' : 'on')}
            class="px-1.5 py-1 rounded flex items-center gap-1 text-[11px] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer {wordWrap === 'on' ? 'text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800/60 bg-cyan-50 dark:bg-cyan-950/40 font-medium' : 'text-zinc-600 dark:text-zinc-400'}"
            title={localeState.t('explorer.repository.toggleWordWrap')}
          >
            <WrapText class="w-3 h-3" />
          </button>

          <!-- Minimap toggle -->
          <button
            onclick={() => (minimap = !minimap)}
            class="px-1.5 py-1 rounded flex items-center gap-1 text-[11px] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer {minimap ? 'text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800/60 bg-cyan-50 dark:bg-cyan-950/40 font-medium' : 'text-zinc-600 dark:text-zinc-400'}"
            title={localeState.t('explorer.repository.toggleMinimap')}
          >
            <MapIcon class="w-3 h-3" />
          </button>

          <!-- Blame & File History -->
          {#if !isBinary}
            <button
              onclick={toggleBlame}
              class="px-2 py-1 rounded flex items-center gap-1 text-[11px] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer {showBlame ? 'text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 font-medium' : 'text-zinc-600 dark:text-zinc-400'}"
              title={localeState.t('explorer.repository.blameTooltip')}
            >
              <UserCheck class="w-3 h-3" />
              <span class="hidden md:inline">Blame</span>
            </button>

            <button
              onclick={() => (showFileHistory = true)}
              class="px-2 py-1 rounded flex items-center gap-1 text-[11px] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              title={localeState.t('explorer.repository.historyTooltip')}
            >
              <History class="w-3 h-3" />
              <span class="hidden md:inline">History</span>
            </button>
          {/if}

          <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800"></div>

          <!-- Open in External IDE Menu (Cursor, Antigravity, VS Code, Zed, Default) -->
          <div class="relative">
            <button
              onclick={() => (showEditorDropdown = !showEditorDropdown)}
              class="px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              title={localeState.t('explorer.repository.openIdeTooltip')}
            >
              <Code class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              <span class="hidden lg:inline font-medium">{localeState.t('explorer.repository.openIde')}</span>
              <ChevronDown class="w-2.5 h-2.5 text-zinc-400" />
            </button>

            {#if showEditorDropdown}
              <!-- Backdrop to close -->
              <div
                class="fixed inset-0 z-40 bg-transparent"
                onclick={() => (showEditorDropdown = false)}
                role="presentation"
              ></div>
              <div class="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 w-52 text-xs font-sans">
                <button
                  onclick={() => handleOpenInEditor('cursor')}
                  class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles class="w-3.5 h-3.5 text-indigo-500" />
                  <span>{localeState.t('explorer.repository.openCursor')}</span>
                </button>
                <button
                  onclick={() => handleOpenInEditor('antigravity')}
                  class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <Code class="w-3.5 h-3.5 text-cyan-500" />
                  <span>{localeState.t('explorer.repository.openAntigravity')}</span>
                </button>
                <button
                  onclick={() => handleOpenInEditor('code')}
                  class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <ExternalLink class="w-3.5 h-3.5 text-blue-500" />
                  <span>{localeState.t('explorer.repository.openVsCode')}</span>
                </button>
                <button
                  onclick={() => handleOpenInEditor('zed')}
                  class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <ExternalLink class="w-3.5 h-3.5 text-emerald-500" />
                  <span>{localeState.t('explorer.repository.openZed')}</span>
                </button>
                <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>
                <button
                  onclick={() => handleOpenInEditor('default')}
                  class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileText class="w-3.5 h-3.5 text-zinc-500" />
                  <span>{localeState.t('explorer.repository.openDefault')}</span>
                </button>
                <button
                  onclick={() => { showEditorDropdown = false; handleRevealInExplorer(); }}
                  class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <FolderOpen class="w-3.5 h-3.5 text-amber-500" />
                  <span>{localeState.t('explorer.repository.revealFileExplorer')}</span>
                </button>
              </div>
            {/if}
          </div>

          <!-- More Actions Dropdown (...) -->
          <div class="relative">
            <button
              onclick={() => (showMoreDropdown = !showMoreDropdown)}
              class="p-1 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
              title={localeState.t('explorer.repository.moreOptions')}
            >
              <MoreVertical class="w-3.5 h-3.5" />
            </button>

            {#if showMoreDropdown}
              <!-- Backdrop to close -->
              <div
                class="fixed inset-0 z-40 bg-transparent"
                onclick={() => (showMoreDropdown = false)}
                role="presentation"
              ></div>
              <div class="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 w-56 text-xs font-sans divide-y divide-zinc-100 dark:divide-zinc-800">
                <div class="py-1">
                  <button
                    onclick={() => { showMoreDropdown = false; copyPath(false); }}
                    class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Copy class="w-3.5 h-3.5 text-zinc-500" />
                    <span>{localeState.t('explorer.repository.copyRelativePath')}</span>
                  </button>
                  <button
                    onclick={() => { showMoreDropdown = false; copyPath(true); }}
                    class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Copy class="w-3.5 h-3.5 text-zinc-500" />
                    <span>{localeState.t('explorer.repository.copyAbsolutePath')}</span>
                  </button>
                  <button
                    onclick={() => { showMoreDropdown = false; copyContent(); }}
                    class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Copy class="w-3.5 h-3.5 text-cyan-500" />
                    <span>{localeState.t('explorer.repository.copyAllContent')}</span>
                  </button>
                </div>

                {#if selectedFileGitStatus}
                  <div class="py-1">
                    {#if selectedFileGitStatus.isStaged}
                      <button
                        onclick={async () => {
                          showMoreDropdown = false;
                          if (selectedFilePath && onUnstageFile) await onUnstageFile(selectedFilePath);
                        }}
                        class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer text-amber-600 dark:text-amber-400"
                      >
                        <RotateCcw class="w-3.5 h-3.5" />
                        <span>{localeState.t('explorer.repository.unstageFileAction')}</span>
                      </button>
                    {:else}
                      <button
                        onclick={async () => {
                          showMoreDropdown = false;
                          if (selectedFilePath && onStageFile) await onStageFile(selectedFilePath);
                        }}
                        class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400"
                      >
                        <CheckCircle2 class="w-3.5 h-3.5" />
                        <span>{localeState.t('explorer.repository.stageFileAction')}</span>
                      </button>
                    {/if}

                    <button
                      onclick={async () => {
                        showMoreDropdown = false;
                        if (selectedFilePath && onDiscardFile) await onDiscardFile(selectedFilePath);
                      }}
                      class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer text-rose-600 dark:text-rose-400"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                      <span>{localeState.t('explorer.repository.safeDiscardAction')}</span>
                    </button>
                  </div>
                {/if}

                {#if onNukeFile && selectedFilePath}
                  <div class="py-1">
                    <button
                      onclick={() => {
                        showMoreDropdown = false;
                        if (selectedFilePath) onNukeFile(selectedFilePath);
                      }}
                      class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 class="w-3.5 h-3.5 text-rose-600" />
                      <span>{localeState.t('explorer.repository.nukeFileAction')}</span>
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Editor Content Area -->
      <div class="flex-1 relative overflow-hidden">
        {#if isContentLoading}
          <div class="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
            <div class="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            <span class="text-xs">{localeState.t('explorer.repository.loadingEditor')}</span>
          </div>
        {:else if isBinary}
          <div class="h-full flex flex-col items-center justify-center text-zinc-500 gap-3 select-none">
            <Binary class="w-12 h-12 text-cyan-600 dark:text-cyan-400 opacity-60" />
            <div class="text-center">
              <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-300">{localeState.t('explorer.repository.binaryTitle')}</p>
              <p class="text-xs text-zinc-500 dark:text-zinc-600 mt-1">{localeState.t('explorer.repository.binaryDesc')}</p>
              <button
                onclick={handleRevealInExplorer}
                class="mt-4 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                {localeState.t('explorer.repository.revealFileExplorer')}
              </button>
            </div>
          </div>
        {:else if editorMode === 'diff'}
          <!-- Monaco Diff Editor vs HEAD -->
          {#if isDiffLoading}
            <div class="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
              <div class="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
              <span class="text-xs">{localeState.t('explorer.repository.calculatingDiffHead')}</span>
            </div>
          {:else}
            <div class="w-full h-full">
              <MonacoDiffEditor
                originalContent={headContentForDiff}
                modifiedContent={fileContent}
                filePath={selectedFilePath}
                viewMode="split"
                {minimap}
              />
            </div>
          {/if}
        {:else}
          <!-- Standard Monaco Editor (Preview or Quick Edit) -->
          <div class="w-full h-full flex overflow-hidden">
            {#if showBlame}
              <!-- Interactive Blame Lane -->
              <div class="w-80 bg-zinc-50/80 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/80 shrink-0 flex flex-col font-mono text-xs select-none">
                <div class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 font-semibold flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                    <UserCheck class="w-3.5 h-3.5" />
                    <span>{localeState.t('explorer.repository.blameTitle')}</span>
                  </div>
                  <span class="text-[10px] text-zinc-400 dark:text-zinc-500">{localeState.t('explorer.repository.blameHunksCount', { count: blameHunks.length })}</span>
                </div>
                <div class="flex-1 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800/50">
                  {#if isBlameLoading}
                    <div class="p-6 flex flex-col items-center justify-center gap-2 text-zinc-500">
                      <RefreshCw class="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
                      <span class="text-[11px]">{localeState.t('explorer.repository.blameLoading')}</span>
                    </div>
                  {:else if blameHunks.length === 0}
                    <div class="p-4 text-center text-zinc-400 dark:text-zinc-500 text-[11px]">
                      {localeState.t('explorer.repository.blameEmpty')}
                    </div>
                  {:else}
                    {#each blameHunks as hunk}
                      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                      <div
                        class="px-2.5 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900/80 transition-colors cursor-pointer group"
                        onclick={() => onSelectCommit?.(hunk.final_commit_id)}
                        title={`Commit: ${hunk.final_commit_id}\nTác giả: ${hunk.author_name} <${hunk.author_email}>\nDòng ${hunk.final_start_line} - ${hunk.final_start_line + hunk.lines_in_hunk - 1}\n\n${hunk.summary}`}
                      >
                        <div class="flex items-center justify-between text-[11px]">
                          <span class="text-purple-700 dark:text-purple-400 font-bold group-hover:underline">
                            {hunk.final_short_id}
                          </span>
                          <span class="text-zinc-500 text-[10px]">
                            {localeState.t('explorer.repository.blameLines', { line: hunk.final_start_line, count: hunk.lines_in_hunk })}
                          </span>
                        </div>
                        <div class="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <span class="truncate max-w-[140px] text-zinc-800 dark:text-zinc-300 font-medium">
                            {hunk.author_name}
                          </span>
                          <span class="text-zinc-400 dark:text-zinc-500">
                            {formatRelativeDate(hunk.timestamp)}
                          </span>
                        </div>
                        <p class="text-[10px] text-zinc-500 truncate mt-0.5 group-hover:text-zinc-800 dark:group-hover:text-zinc-300">
                          {hunk.summary || localeState.t('explorer.repository.noCommitMsg')}
                        </p>
                      </div>
                    {/each}
                  {/if}
                </div>
              </div>
            {/if}

            <div class="flex-1 min-w-0 h-full">
              <MonacoEditor
                content={fileContent}
                filePath={selectedFilePath}
                readOnly={editorMode !== 'edit'}
                {wordWrap}
                {minimap}
                {targetLine}
                onChange={(val) => (fileContent = val)}
                onSave={handleSave}
              />
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Empty state when no file is selected -->
      <div class="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 gap-3 select-none">
        <FolderGit2 class="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
        <div class="text-center space-y-1">
          <p class="text-xs text-zinc-600 dark:text-zinc-400 font-medium">{localeState.t('explorer.repository.emptyPrompt')}</p>
          <p class="text-[11px] text-zinc-400 dark:text-zinc-600">{localeState.t('explorer.repository.emptyEngine')}</p>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Ref Picker Modal -->
<RefPickerModal
  isOpen={isRefPickerOpen}
  {selectedCommitOid}
  currentBranchName={branches.find((b) => b.is_head)?.shorthand || 'HEAD'}
  {branches}
  {tags}
  {commits}
  onSelect={(target) => {
    selectedCommitOid = target.commitOid;
    selectedRefLabel = target.label;
  }}
  onClose={() => (isRefPickerOpen = false)}
/>

<!-- File Context Menu -->
{#if contextMenu}
  <!-- Backdrop to close -->
  <div
    class="fixed inset-0 z-50 bg-transparent"
    onclick={() => (contextMenu = null)}
    oncontextmenu={(e) => { e.preventDefault(); contextMenu = null; }}
    role="presentation"
  ></div>
  <div
    class="fixed z-50 bg-white/95 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1 w-60 text-xs text-zinc-800 dark:text-zinc-200 divide-y divide-zinc-200 dark:divide-zinc-800 font-sans backdrop-blur-md"
    style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
  >
    <div class="py-1">
      <button
        onclick={() => {
          const p = contextMenu!.path;
          contextMenu = null;
          selectFile(p);
          handleOpenInEditor('cursor');
        }}
        class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
      >
        <Sparkles class="w-3.5 h-3.5 text-indigo-500" />
        <span>{localeState.t('explorer.repository.openCursor')}</span>
      </button>

      <button
        onclick={() => {
          const p = contextMenu!.path;
          contextMenu = null;
          selectFile(p);
          handleOpenInEditor('antigravity');
        }}
        class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
      >
        <Code class="w-3.5 h-3.5 text-cyan-500" />
        <span>{localeState.t('explorer.repository.openAntigravity')}</span>
      </button>

      <button
        onclick={() => {
          const p = contextMenu!.path;
          contextMenu = null;
          selectFile(p);
          handleOpenInEditor('code');
        }}
        class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
      >
        <ExternalLink class="w-3.5 h-3.5 text-blue-500" />
        <span>{localeState.t('explorer.repository.openVsCode')}</span>
      </button>

      <button
        onclick={() => {
          const p = contextMenu!.path;
          contextMenu = null;
          selectFile(p);
          handleRevealInExplorer();
        }}
        class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
      >
        <FolderOpen class="w-3.5 h-3.5 text-amber-500" />
        <span>{localeState.t('explorer.repository.revealFileExplorer')}</span>
      </button>
    </div>

    <div class="py-1">
      <button
        onclick={() => {
          navigator.clipboard.writeText(contextMenu!.path);
          toast.success(localeState.t('explorer.repository.copiedPathToast'), contextMenu!.path);
          contextMenu = null;
        }}
        class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
      >
        <Copy class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
        <span>{localeState.t('explorer.repository.copyPath')}</span>
      </button>

      <button
        onclick={() => {
          const p = contextMenu!.path;
          contextMenu = null;
          selectFile(p);
          showFileHistory = true;
        }}
        class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
      >
        <History class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
        <span>{localeState.t('explorer.repository.viewHistory')}</span>
      </button>

      <button
        onclick={() => {
          const p = contextMenu!.path;
          contextMenu = null;
          selectFile(p);
          if (!showBlame) toggleBlame();
        }}
        class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
      >
        <UserCheck class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
        <span>{localeState.t('explorer.repository.toggleBlame')}</span>
      </button>
    </div>

    {#if gitStatusMap.get(contextMenu.path)}
      {@const itemStatus = gitStatusMap.get(contextMenu.path)!}
      <div class="py-1">
        {#if itemStatus.isStaged}
          <button
            onclick={async () => {
              const p = contextMenu!.path;
              contextMenu = null;
              if (onUnstageFile) await onUnstageFile(p);
            }}
            class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer text-amber-600 dark:text-amber-400"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            <span>{localeState.t('explorer.repository.unstageFileAction')}</span>
          </button>
        {:else}
          <button
            onclick={async () => {
              const p = contextMenu!.path;
              contextMenu = null;
              if (onStageFile) await onStageFile(p);
            }}
            class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 class="w-3.5 h-3.5" />
            <span>{localeState.t('explorer.repository.stageFileAction')}</span>
          </button>
        {/if}

        <button
          onclick={async () => {
            const p = contextMenu!.path;
            contextMenu = null;
            if (onDiscardFile) await onDiscardFile(p);
          }}
          class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer text-rose-600 dark:text-rose-400"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>{localeState.t('explorer.repository.safeDiscardAction')}</span>
        </button>
      </div>
    {/if}

    {#if onNukeFile}
      <div class="py-1">
        <button
          onclick={() => {
            const p = contextMenu!.path;
            contextMenu = null;
            onNukeFile(p);
          }}
          class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Trash2 class="w-3.5 h-3.5 text-rose-600 dark:text-rose-500" />
          <span>{localeState.t('explorer.repository.nukeFileAction')}</span>
        </button>
      </div>
    {/if}
  </div>
{/if}

<!-- File History Modal -->
<FileHistoryModal
  isOpen={showFileHistory}
  {repoPath}
  filePath={selectedFilePath}
  onClose={() => (showFileHistory = false)}
  {onSelectCommit}
/>
