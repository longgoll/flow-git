<script lang="ts">
  import { onMount } from 'svelte';
  import type { BlameHunkItem, CommitNode, TreeEntryItem } from '../types';
  import { getFileContent, getTreeEntries } from '../api';
  import { getFileBlame } from '../api/diff';
  import MonacoEditor from './MonacoEditor.svelte';
  import FileHistoryModal from './FileHistoryModal.svelte';
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
    Check,
    WrapText,
    Map,
    RefreshCw,
    GitCommit,
    Layers,
    FolderGit2,
    Binary,
    Trash2,
    History,
    UserCheck,
  } from 'lucide-svelte';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    repoPath: string;
    commits?: CommitNode[];
    initialFilePath?: string | null;
    onNukeFile?: (filePath: string) => void;
    onSelectCommit?: (commitId: string) => void;
  }

  let { repoPath, commits = [], initialFilePath = null, onNukeFile, onSelectCommit }: Props = $props();

  let contextMenu = $state<{ x: number; y: number; path: string } | null>(null);

  // Blame & File History state
  let showBlame = $state<boolean>(false);
  let blameHunks = $state<BlameHunkItem[]>([]);
  let isBlameLoading = $state<boolean>(false);
  let showFileHistory = $state<boolean>(false);

  // Commit context: null = working tree, or specific commit OID
  let selectedCommitOid = $state<string | null>(null);

  // Tree state: Map of directory path -> array of TreeEntryItem
  let directoryEntries = $state<Record<string, TreeEntryItem[]>>({});
  let expandedDirs = $state<Set<string>>(new Set([''])); // '' is root
  let isTreeLoading = $state<boolean>(false);
  let treeSearchQuery = $state<string>('');

  // Selected file and content
  let selectedFilePath = $state<string | null>(null);
  let fileContent = $state<string>('');
  let isBinary = $state<boolean>(false);
  let fileSize = $state<number>(0);
  let isContentLoading = $state<boolean>(false);

  // Editor settings
  let wordWrap = $state<'on' | 'off'>('on');
  let minimap = $state<boolean>(true);
  let copiedPath = $state<boolean>(false);
  let copiedContent = $state<boolean>(false);

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

  async function selectFile(filePath: string) {
    selectedFilePath = filePath;
    isContentLoading = true;
    try {
      const res = await getFileContent(repoPath, filePath, selectedCommitOid || undefined);
      fileContent = res.content;
      isBinary = res.is_binary;
      fileSize = res.size_bytes;
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
      await selectFile(selectedFilePath);
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

  function copyPath() {
    if (!selectedFilePath) return;
    navigator.clipboard.writeText(selectedFilePath);
    copiedPath = true;
    toast.info('Đã sao chép', `Đường dẫn file: ${selectedFilePath}`);
    setTimeout(() => {
      copiedPath = false;
    }, 2000);
  }

  function copyContent() {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    copiedContent = true;
    toast.info('Đã sao chép', 'Toàn bộ nội dung file đã được sao chép vào bộ nhớ tạm.');
    setTimeout(() => {
      copiedContent = false;
    }, 2000);
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

  onMount(() => {
    refreshTree();
    if (initialFilePath) {
      selectFile(initialFilePath);
    }
  });

  $effect(() => {
    if (initialFilePath && initialFilePath !== selectedFilePath) {
      selectFile(initialFilePath);
    }
  });

  $effect(() => {
    // When commit filter changes, reload
    void selectedCommitOid;
    if (repoPath) {
      refreshTree();
    }
  });
</script>

<div class="h-full w-full flex bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 overflow-hidden select-none font-sans">
  <!-- Left Panel: File Tree Explorer (300px) -->
  <div class="w-80 h-full border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/80 flex flex-col shrink-0">
    <!-- Explorer Header & Commit Context Switcher -->
    <div class="p-3 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-900/40 flex flex-col gap-2 shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <FolderGit2 class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span class="font-bold text-xs text-zinc-900 dark:text-zinc-100">Files Explorer</span>
        </div>
        <button
          onclick={refreshTree}
          class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          title="Tải lại cây thư mục"
        >
          <RefreshCw class="w-3.5 h-3.5 {isTreeLoading ? 'animate-spin text-cyan-600 dark:text-cyan-400' : ''}" />
        </button>
      </div>

      <!-- Context selector: Working Tree or Commit -->
      <div class="flex items-center gap-1.5 text-[11px] font-mono">
        <span class="text-zinc-500 shrink-0">Target:</span>
        <select
          bind:value={selectedCommitOid}
          class="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-zinc-800 dark:text-zinc-300 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer truncate"
        >
          <option value={null}>Working Tree (Live Files)</option>
          {#each commits.slice(0, 30) as commit}
            <option value={commit.id}>
              {commit.short_id} - {commit.summary.slice(0, 28)}
            </option>
          {/each}
        </select>
      </div>

      <!-- Filter input -->
      <div class="relative w-full">
        <Search class="w-3 h-3 text-zinc-400 dark:text-zinc-500 absolute left-2.5 top-2 pointer-events-none" />
        <input
          type="text"
          bind:value={treeSearchQuery}
          placeholder="Filter files..."
          class="w-full bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded pl-7 pr-2 py-1 text-xs text-zinc-900 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
        />
      </div>
    </div>

    <!-- Tree Entries List -->
    <div class="flex-1 overflow-y-auto p-1.5 text-xs font-mono divide-y divide-transparent">
      {#if isTreeLoading && !directoryEntries['']}
        <div class="h-32 flex items-center justify-center text-zinc-500 text-xs gap-2">
          <div class="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
          <span>Loading repository files...</span>
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
              <div>
                <button
                  onclick={() => toggleDirectory(item.path)}
                  class="w-full flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer text-left"
                  style="padding-left: {depth * 14 + 6}px"
                >
                  {#if isExpanded}
                    <ChevronDown class="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
                    <FolderOpen class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  {:else}
                    <ChevronRight class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                    <Folder class="w-3.5 h-3.5 text-amber-500/80 dark:text-amber-400/80 shrink-0" />
                  {/if}
                  <span class="truncate font-medium text-[11px]">{item.name}</span>
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
                  <span class="truncate text-[11px]">{item.name}</span>
                </div>
                {#if item.size !== undefined && item.size !== null}
                  <span class="text-[9px] text-zinc-400 dark:text-zinc-600 shrink-0 pl-1">{formatBytes(item.size)}</span>
                {/if}
              </button>
            {/if}
          {/each}
        {/snippet}

        {@render renderTree('', 0)}
      {/if}
    </div>
  </div>

  <!-- Right Panel: Monaco Code Viewer (Full Screen) -->
  <div class="flex-1 h-full flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
    {#if selectedFilePath}
      <!-- File Code Header -->
      <div class="h-10 px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-900/60 flex items-center justify-between shrink-0 select-none">
        <!-- Path & File Details -->
        <div class="flex items-center gap-2 truncate">
          <FileCode class="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span class="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate font-mono">{selectedFilePath}</span>

          <div class="flex items-center gap-1.5 ml-2 font-mono text-[11px]">
            {#if fileSize > 0}
              <span class="px-1.5 py-0.2 rounded bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 text-[10px]">
                {formatBytes(fileSize)}
              </span>
            {/if}
            {#if selectedCommitOid}
              <span class="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 text-[10px] flex items-center gap-1 font-semibold">
                <GitCommit class="w-2.5 h-2.5" />
                <span>{selectedCommitOid.slice(0, 7)}</span>
              </span>
            {:else}
              <span class="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 text-[10px] flex items-center gap-1 font-semibold">
                <Layers class="w-2.5 h-2.5" />
                <span>Working Tree</span>
              </span>
            {/if}
          </div>
        </div>

        <!-- Editor Toolbar Actions -->
        <div class="flex items-center gap-2">
          <!-- Word wrap toggle -->
          <button
            onclick={() => (wordWrap = wordWrap === 'on' ? 'off' : 'on')}
            class="px-2 py-1 rounded flex items-center gap-1 text-[11px] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer {wordWrap === 'on' ? 'text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800/60 bg-cyan-50 dark:bg-cyan-950/40 font-medium' : 'text-zinc-600 dark:text-zinc-400'}"
            title="Toggle Word Wrap"
          >
            <WrapText class="w-3 h-3" />
            <span>Wrap</span>
          </button>

          <!-- Minimap toggle -->
          <button
            onclick={() => (minimap = !minimap)}
            class="px-2 py-1 rounded flex items-center gap-1 text-[11px] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer {minimap ? 'text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800/60 bg-cyan-50 dark:bg-cyan-950/40 font-medium' : 'text-zinc-600 dark:text-zinc-400'}"
            title="Toggle Minimap"
          >
            <Map class="w-3 h-3" />
            <span>Minimap</span>
          </button>

          <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800"></div>

          <!-- Blame & File History -->
          {#if !isBinary}
            <button
              onclick={toggleBlame}
              class="px-2 py-1 rounded flex items-center gap-1 text-[11px] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer {showBlame ? 'text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 font-medium' : 'text-zinc-600 dark:text-zinc-400'}"
              title="Xem người viết từng dòng code (Git Blame)"
            >
              <UserCheck class="w-3 h-3" />
              <span>Blame</span>
            </button>

            <button
              onclick={() => (showFileHistory = true)}
              class="px-2 py-1 rounded flex items-center gap-1 text-[11px] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              title="Xem danh sách commit thay đổi tệp này (File History)"
            >
              <History class="w-3 h-3" />
              <span>History</span>
            </button>
          {/if}

          <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800"></div>

          <!-- Copy Path -->
          <button
            onclick={copyPath}
            class="px-2 py-1 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
            title="Sao chép đường dẫn file"
          >
            {#if copiedPath}
              <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span class="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
            {:else}
              <Copy class="w-3 h-3" />
              <span>Copy Path</span>
            {/if}
          </button>

          <!-- Copy Content -->
          <button
            onclick={copyContent}
            class="px-2.5 py-1 rounded bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/80 border border-cyan-200 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-300 text-[11px] flex items-center gap-1 font-semibold cursor-pointer transition-colors"
            title="Sao chép toàn bộ nội dung file"
          >
            {#if copiedContent}
              <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Copied Code</span>
            {:else}
              <Copy class="w-3 h-3" />
              <span>Copy Code</span>
            {/if}
          </button>

          <!-- Nuke from history -->
          {#if onNukeFile && selectedFilePath}
            <button
              onclick={() => selectedFilePath && onNukeFile(selectedFilePath)}
              class="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              title="Xóa vĩnh viễn tệp này khỏi toàn bộ lịch sử Git (Nuke from history)"
            >
              <Trash2 class="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span class="hidden sm:inline">Nuke from History</span>
            </button>
          {/if}
        </div>
      </div>

      <!-- Editor Content Area -->
      <div class="flex-1 relative overflow-hidden">
        {#if isContentLoading}
          <div class="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
            <div class="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            <span class="text-xs">Loading file content in Monaco Editor...</span>
          </div>
        {:else if isBinary}
          <div class="h-full flex flex-col items-center justify-center text-zinc-500 gap-3 select-none">
            <Binary class="w-12 h-12 text-cyan-600 dark:text-cyan-400 opacity-60" />
            <div class="text-center">
              <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-300">Binary File Detected</p>
              <p class="text-xs text-zinc-500 dark:text-zinc-600 mt-1">This file cannot be displayed as plain text in the code viewer.</p>
            </div>
          </div>
        {:else}
          <div class="w-full h-full flex overflow-hidden">
            {#if showBlame}
              <!-- Interactive Blame Lane -->
              <div class="w-80 bg-zinc-50/80 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/80 shrink-0 flex flex-col font-mono text-xs select-none">
                <div class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 font-semibold flex items-center justify-between">
                  <div class="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                    <UserCheck class="w-3.5 h-3.5" />
                    <span>Git Blame</span>
                  </div>
                  <span class="text-[10px] text-zinc-400 dark:text-zinc-500">{blameHunks.length} hunks</span>
                </div>
                <div class="flex-1 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800/50">
                  {#if isBlameLoading}
                    <div class="p-6 flex flex-col items-center justify-center gap-2 text-zinc-500">
                      <RefreshCw class="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
                      <span class="text-[11px]">Đang tính toán Git Blame...</span>
                    </div>
                  {:else if blameHunks.length === 0}
                    <div class="p-4 text-center text-zinc-400 dark:text-zinc-500 text-[11px]">
                      Không có thông tin blame cho file này.
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
                            L{hunk.final_start_line} ({hunk.lines_in_hunk} dòng)
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
                          {hunk.summary || '(no commit message)'}
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
                readOnly={true}
                {wordWrap}
                {minimap}
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
          <p class="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Select a file from the repository tree</p>
          <p class="text-[11px] text-zinc-400 dark:text-zinc-600">Full source code preview with VS Code Monaco Engine</p>
        </div>
      </div>
    {/if}
  </div>
</div>

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
    class="fixed z-50 bg-white/95 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1 w-56 text-xs text-zinc-800 dark:text-zinc-200 divide-y divide-zinc-200 dark:divide-zinc-800 font-sans backdrop-blur-md"
    style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
  >
    <div class="py-1">
      <button
        onclick={() => {
          navigator.clipboard.writeText(contextMenu!.path);
          toast.success("Đã sao chép đường dẫn", contextMenu!.path);
          contextMenu = null;
        }}
        class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
      >
        <Copy class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
        <span>Sao chép đường dẫn</span>
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
        <span>Xem lịch sử tệp (File History)</span>
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
        <span>Xem Git Blame</span>
      </button>
    </div>
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
          <span>Xóa vĩnh viễn khỏi Git history</span>
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
