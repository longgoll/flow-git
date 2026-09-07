<script lang="ts">
  import {
    Archive,
    X,
    Plus,
    Trash2,
    GitBranch,
    Columns2,
    AlignJustify,
    FileCode,
    Search,
    RefreshCw,
    Download,
    ArrowUpRight,
    AlertTriangle,
  } from 'lucide-svelte';
  import type { StashInfo, StashDetail, FileDiffDetail } from '../types';
  import {
    getStashDetail,
    getStashFileDiff,
    stashApply,
    stashPop,
    stashDrop,
    stashBranch,
    stashSave,
  } from '../api/branch';
  import { localeState } from '../state/localeState.svelte';
  import { toast } from '../state/toastState.svelte';
  import MonacoDiffEditor from './MonacoDiffEditor.svelte';

  interface Props {
    isOpen: boolean;
    repoPath: string;
    stashes: StashInfo[];
    initialIndex?: number;
    onClose: () => void;
    onRefresh: () => Promise<void>;
  }

  let {
    isOpen = false,
    repoPath = '',
    stashes = [],
    initialIndex = 0,
    onClose,
    onRefresh,
  }: Props = $props();

  let selectedIndex = $state<number>(0);
  let stashDetail = $state<StashDetail | null>(null);
  let selectedFilePath = $state<string | null>(null);
  let fileDiff = $state<FileDiffDetail | null>(null);
  let fileSearchQuery = $state<string>('');

  let isLoadingDetail = $state<boolean>(false);
  let isLoadingDiff = $state<boolean>(false);
  let isOperating = $state<boolean>(false);

  let viewMode = $state<'split' | 'unified'>('split');
  let ignoreWhitespace = $state<boolean>(false);

  // Dialogs
  let showDropConfirm = $state<boolean>(false);
  let showBranchDialog = $state<boolean>(false);
  let branchNameInput = $state<string>('');
  let showCreateModal = $state<boolean>(false);
  let newStashMessage = $state<string>('');
  let newStashUntracked = $state<boolean>(true);

  // Synchronize initial selection on drawer open
  $effect(() => {
    if (isOpen) {
      selectedIndex = initialIndex >= 0 ? initialIndex : (stashes[0]?.index ?? 0);
      loadDetail(selectedIndex);
    } else {
      fileDiff = null;
      selectedFilePath = null;
      stashDetail = null;
    }
  });

  async function loadDetail(idx: number) {
    if (!repoPath || stashes.length === 0) {
      stashDetail = null;
      return;
    }
    isLoadingDetail = true;
    try {
      const detail = await getStashDetail(repoPath, idx);
      stashDetail = detail;
      if (detail.files.length > 0) {
        // Auto select first file
        selectFile(detail.files[0].path);
      } else {
        selectedFilePath = null;
        fileDiff = null;
      }
    } catch (err: any) {
      toast.error('Không thể tải chi tiết Stash', err?.message || String(err));
      stashDetail = null;
    } finally {
      isLoadingDetail = false;
    }
  }

  async function selectFile(filePath: string) {
    selectedFilePath = filePath;
    if (!repoPath) return;
    isLoadingDiff = true;
    try {
      const diff = await getStashFileDiff(repoPath, selectedIndex, filePath, ignoreWhitespace);
      fileDiff = diff;
    } catch (err: any) {
      toast.error('Không thể tải diff tệp', err?.message || String(err));
      fileDiff = null;
    } finally {
      isLoadingDiff = false;
    }
  }

  function handleSelectStash(idx: number) {
    selectedIndex = idx;
    loadDetail(idx);
  }

  async function handleApply() {
    if (!repoPath) return;
    isOperating = true;
    try {
      await stashApply(repoPath, selectedIndex);
      toast.success(localeState.t('stash.shelf.applySuccess', { index: selectedIndex }));
      await onRefresh();
    } catch (err: any) {
      toast.error('Apply Stash thất bại', err?.message || String(err));
    } finally {
      isOperating = false;
    }
  }

  async function handlePop() {
    if (!repoPath) return;
    isOperating = true;
    try {
      await stashPop(repoPath, selectedIndex);
      toast.success(localeState.t('stash.shelf.popSuccess', { index: selectedIndex }));
      await onRefresh();
      if (stashes.length <= 1) {
        onClose();
      } else {
        selectedIndex = stashes[0]?.index ?? 0;
        await loadDetail(selectedIndex);
      }
    } catch (err: any) {
      toast.error('Pop Stash thất bại', err?.message || String(err));
    } finally {
      isOperating = false;
    }
  }

  async function handleConfirmDrop() {
    if (!repoPath) return;
    isOperating = true;
    try {
      await stashDrop(repoPath, selectedIndex);
      toast.info(localeState.t('stash.shelf.dropSuccess', { index: selectedIndex }));
      showDropConfirm = false;
      await onRefresh();
      if (stashes.length <= 1) {
        onClose();
      } else {
        selectedIndex = stashes[0]?.index ?? 0;
        await loadDetail(selectedIndex);
      }
    } catch (err: any) {
      toast.error('Drop Stash thất bại', err?.message || String(err));
    } finally {
      isOperating = false;
    }
  }

  async function handleConfirmBranch() {
    if (!repoPath || !branchNameInput.trim()) return;
    isOperating = true;
    try {
      const res = await stashBranch(repoPath, selectedIndex, branchNameInput.trim());
      toast.success(localeState.t('stash.shelf.branchSuccess', { branch: res.shorthand, index: selectedIndex }));
      showBranchDialog = false;
      branchNameInput = '';
      await onRefresh();
      onClose();
    } catch (err: any) {
      toast.error('Tạo nhánh từ Stash thất bại', err?.message || String(err));
    } finally {
      isOperating = false;
    }
  }

  async function handleConfirmCreateStash() {
    if (!repoPath) return;
    isOperating = true;
    try {
      await stashSave(repoPath, newStashMessage.trim(), newStashUntracked);
      toast.success(localeState.t('stash.shelf.createSuccess'));
      showCreateModal = false;
      newStashMessage = '';
      await onRefresh();
      selectedIndex = 0;
      await loadDetail(0);
    } catch (err: any) {
      toast.error('Lưu Stash thất bại', err?.message || String(err));
    } finally {
      isOperating = false;
    }
  }

  let filteredFiles = $derived.by(() => {
    if (!stashDetail) return [];
    if (!fileSearchQuery.trim()) return stashDetail.files;
    const q = fileSearchQuery.toLowerCase();
    return stashDetail.files.filter((f) => f.path.toLowerCase().includes(q));
  });

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'added':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'deleted':
        return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'untracked':
        return 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'renamed':
        return 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20';
      default:
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
  }

  function formatTime(timestamp: number): string {
    const elapsed = Math.floor(Date.now() / 1000) - timestamp;
    if (elapsed < 60) return `${Math.max(1, elapsed)}s`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m`;
    if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h`;
    return `${Math.floor(elapsed / 86400)}d`;
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end select-none animate-in fade-in duration-150"
    tabindex="-1"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose();
    }}
  >
    <!-- Slide-over Drawer Container -->
    <div
      class="w-[92vw] max-w-6xl bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 text-zinc-900 dark:text-zinc-100 font-sans"
    >
      <!-- Top Drawer Header -->
      <div class="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/70 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Archive class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {localeState.t('stash.shelf.title')}
              </h2>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {stashes.length}
              </span>
            </div>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              {localeState.t('stash.shelf.subtitle')}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            onclick={() => (showCreateModal = true)}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>{localeState.t('stash.shelf.createNew')}</span>
          </button>
          <button
            onclick={onClose}
            class="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Main Drawer Workspace (Split: Left Files / Right Monaco Diff) -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Left Panel: Stash Selector & Files List (~340px) -->
        <div class="w-80 sm:w-96 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/60 dark:bg-zinc-950/40 shrink-0">
          <!-- Stashes Horizontal Pills / Dropdown -->
          <div class="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
            <div class="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
              <span>{localeState.t('stash.shelf.stashesCount', { count: stashes.length })}</span>
            </div>
            
            <div class="space-y-1 max-h-36 overflow-y-auto pr-1">
              {#each stashes as s (s.index)}
                <button
                  onclick={() => handleSelectStash(s.index)}
                  class="w-full text-left p-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between {selectedIndex === s.index ? 'bg-white dark:bg-zinc-800 shadow-xs border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-900 dark:text-white' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 border border-transparent'}"
                >
                  <div class="flex items-center gap-2 truncate">
                    <span class="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      @{s.index}
                    </span>
                    <span class="truncate">{s.message}</span>
                  </div>
                  {#if stashDetail && selectedIndex === s.index}
                    <span class="text-[10px] font-mono text-zinc-400 shrink-0 ml-1">
                      {formatTime(stashDetail.created_at)}
                    </span>
                  {/if}
                </button>
              {/each}

              {#if stashes.length === 0}
                <div class="py-6 text-center text-xs text-zinc-400 italic">
                  {localeState.t('stash.shelf.emptyList')}
                </div>
              {/if}
            </div>
          </div>

          <!-- Stash Metadata Banner (Branch & Stats) -->
          {#if stashDetail}
            <div class="px-3 py-2 bg-zinc-100/70 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px]">
              <div class="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 truncate">
                <GitBranch class="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span class="truncate font-medium">{stashDetail.branch_name || 'HEAD'}</span>
              </div>
              <div class="flex items-center gap-1.5 font-mono text-[10px] shrink-0">
                <span class="text-emerald-600 dark:text-emerald-400 font-bold">+{stashDetail.total_additions}</span>
                <span class="text-rose-600 dark:text-rose-400 font-bold">-{stashDetail.total_deletions}</span>
              </div>
            </div>
          {/if}

          <!-- Changed Files Search & Header -->
          <div class="p-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <div class="relative flex-1">
              <Search class="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                bind:value={fileSearchQuery}
                placeholder="Lọc tệp..."
                class="w-full pl-8 pr-2.5 py-1 text-xs rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus:border-cyan-500 text-zinc-800 dark:text-zinc-200"
              />
            </div>
            <span class="text-[10px] font-mono text-zinc-400 px-1">
              {filteredFiles.length}
            </span>
          </div>

          <!-- Files List -->
          <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {#if isLoadingDetail}
              <div class="h-40 flex items-center justify-center gap-2 text-xs text-zinc-400">
                <RefreshCw class="w-3.5 h-3.5 animate-spin text-cyan-500" />
                <span>{localeState.t('stash.shelf.loadingDetail')}</span>
              </div>
            {:else if stashDetail}
              {#each filteredFiles as file (file.path)}
                <button
                  onclick={() => selectFile(file.path)}
                  class="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between group {selectedFilePath === file.path ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-900 dark:text-cyan-200 font-medium border border-cyan-200 dark:border-cyan-800/60' : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 border border-transparent'}"
                >
                  <div class="flex items-center gap-2 truncate min-w-0">
                    <span class="w-4 h-4 rounded text-[9px] font-mono font-bold flex items-center justify-center border shrink-0 {getStatusColor(file.status)}">
                      {file.is_untracked ? 'U' : file.status.charAt(0).toUpperCase()}
                    </span>
                    <span class="truncate text-[11px] font-mono">{file.path}</span>
                  </div>
                  <div class="flex items-center gap-1 font-mono text-[9px] shrink-0 ml-1.5 opacity-80 group-hover:opacity-100">
                    {#if file.additions > 0}
                      <span class="text-emerald-600 dark:text-emerald-400">+{file.additions}</span>
                    {/if}
                    {#if file.deletions > 0}
                      <span class="text-rose-600 dark:text-rose-400">-{file.deletions}</span>
                    {/if}
                  </div>
                </button>
              {/each}

              {#if filteredFiles.length === 0}
                <div class="py-12 text-center text-xs text-zinc-400 italic">
                  {localeState.t('stash.shelf.noFilesChanged')}
                </div>
              {/if}
            {:else}
              <div class="py-12 text-center text-xs text-zinc-400 italic">
                {localeState.t('stash.shelf.emptyList')}
              </div>
            {/if}
          </div>
        </div>

        <!-- Right Panel: Diff Controls, Action Bar & Monaco Diff Editor -->
        <div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900">
          {#if stashDetail && stashes.length > 0}
            <!-- Stash Action Bar -->
            <div class="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-2">
                <button
                  onclick={handleApply}
                  disabled={isOperating}
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  title={localeState.t('stash.shelf.applyTooltip')}
                >
                  <Download class="w-3.5 h-3.5" />
                  <span>{localeState.t('stash.shelf.applyBtn')}</span>
                </button>

                <button
                  onclick={handlePop}
                  disabled={isOperating}
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  title={localeState.t('stash.shelf.popTooltip')}
                >
                  <ArrowUpRight class="w-3.5 h-3.5" />
                  <span>{localeState.t('stash.shelf.popBtn')}</span>
                </button>

                <button
                  onclick={() => {
                    branchNameInput = `stash-${selectedIndex}-${Date.now().toString().slice(-4)}`;
                    showBranchDialog = true;
                  }}
                  disabled={isOperating}
                  class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-medium border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer disabled:opacity-50"
                  title={localeState.t('stash.shelf.branchTooltip')}
                >
                  <GitBranch class="w-3.5 h-3.5 text-cyan-500" />
                  <span>{localeState.t('stash.shelf.branchBtn')}</span>
                </button>
              </div>

              <button
                onclick={() => (showDropConfirm = true)}
                disabled={isOperating}
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium border border-transparent hover:border-rose-300 dark:hover:border-rose-900 transition-all cursor-pointer disabled:opacity-50"
                title={localeState.t('stash.shelf.dropTooltip')}
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span>{localeState.t('stash.shelf.dropBtn')}</span>
              </button>
            </div>

            <!-- File Header & Diff Controls -->
            <div class="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-2 truncate">
                {#if selectedFilePath}
                  <FileCode class="w-4 h-4 text-cyan-500 shrink-0" />
                  <span class="text-xs font-mono font-bold text-zinc-900 dark:text-white truncate">
                    {selectedFilePath}
                  </span>
                {:else}
                  <span class="text-xs text-zinc-400 italic">
                    {localeState.t('stash.shelf.selectFilePrompt')}
                  </span>
                {/if}
              </div>

              <!-- Diff View Mode Toggles -->
              {#if selectedFilePath && fileDiff && !fileDiff.is_binary}
                <div class="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-950 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0">
                  <button
                    onclick={() => (viewMode = 'split')}
                    class="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer {viewMode === 'split' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-xs font-bold' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}"
                    title={localeState.t('stash.shelf.splitView')}
                  >
                    <Columns2 class="w-3 h-3" />
                    <span>Split</span>
                  </button>
                  <button
                    onclick={() => (viewMode = 'unified')}
                    class="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer {viewMode === 'unified' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-xs font-bold' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}"
                    title={localeState.t('stash.shelf.unifiedView')}
                  >
                    <AlignJustify class="w-3 h-3" />
                    <span>Unified</span>
                  </button>
                </div>
              {/if}
            </div>

            <!-- Diff Content Area -->
            <div class="flex-1 relative overflow-hidden bg-white dark:bg-zinc-900">
              {#if isLoadingDiff}
                <div class="h-full flex items-center justify-center gap-2 text-xs text-zinc-400">
                  <RefreshCw class="w-4 h-4 animate-spin text-cyan-500" />
                  <span>{localeState.t('stash.shelf.loadingDiff')}</span>
                </div>
              {:else if fileDiff}
                {#if fileDiff.is_binary}
                  <div class="h-full flex flex-col items-center justify-center text-xs text-zinc-400 gap-2">
                    <AlertTriangle class="w-8 h-8 text-amber-500" />
                    <span>{localeState.t('stash.shelf.binaryNotice')}</span>
                  </div>
                {:else}
                  <div class="w-full h-full">
                    <MonacoDiffEditor
                      originalContent={fileDiff.original_content ?? ''}
                      modifiedContent={fileDiff.modified_content ?? ''}
                      filePath={selectedFilePath || 'file.txt'}
                      {viewMode}
                      ignoreTrimWhitespace={ignoreWhitespace}
                    />
                  </div>
                {/if}
              {:else}
                <div class="h-full flex flex-col items-center justify-center text-xs text-zinc-400 gap-2 select-none">
                  <FileCode class="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                  <span>{localeState.t('stash.shelf.selectFilePrompt')}</span>
                </div>
              {/if}
            </div>
          {:else}
            <!-- Empty state when no stashes -->
            <div class="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
              <div class="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
                <Archive class="w-6 h-6" />
              </div>
              <h3 class="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                {localeState.t('stash.shelf.emptyList')}
              </h3>
              <p class="text-xs text-zinc-400 max-w-sm mb-4">
                {localeState.t('stash.shelf.emptyListDesc')}
              </p>
              <button
                onclick={() => (showCreateModal = true)}
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>{localeState.t('stash.shelf.createNew')}</span>
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Dialog: Drop Confirmation -->
{#if showDropConfirm && stashDetail}
  <div class="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
      <div class="flex items-center gap-3 text-rose-600 dark:text-rose-400">
        <div class="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <Trash2 class="w-5 h-5" />
        </div>
        <h3 class="font-bold text-sm text-zinc-900 dark:text-zinc-100">
          {localeState.t('stash.shelf.confirmDropTitle')}
        </h3>
      </div>

      <p class="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
        {localeState.t('stash.shelf.confirmDropMessage', { index: selectedIndex, message: stashDetail.message })}
      </p>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          onclick={() => (showDropConfirm = false)}
          class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          onclick={handleConfirmDrop}
          disabled={isOperating}
          class="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          {isOperating ? 'Đang xóa...' : 'Xác nhận xóa'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Dialog: Branch from Stash -->
{#if showBranchDialog}
  <div class="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
      <div class="flex items-center gap-3 text-cyan-600 dark:text-cyan-400">
        <div class="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <GitBranch class="w-5 h-5" />
        </div>
        <h3 class="font-bold text-sm text-zinc-900 dark:text-zinc-100">
          {localeState.t('stash.shelf.branchDialogTitle', { index: selectedIndex })}
        </h3>
      </div>

      <div class="space-y-1.5">
        <label for="stash-branch-input" class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
          Tên nhánh mới
        </label>
        <input
          id="stash-branch-input"
          type="text"
          bind:value={branchNameInput}
          placeholder={localeState.t('stash.shelf.branchNamePlaceholder')}
          class="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus:border-cyan-500 text-zinc-800 dark:text-zinc-200 font-mono"
        />
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          onclick={() => (showBranchDialog = false)}
          class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          onclick={handleConfirmBranch}
          disabled={isOperating || !branchNameInput.trim()}
          class="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          {isOperating ? 'Đang tạo...' : localeState.t('stash.shelf.createBranchConfirm')}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Dialog: Quick Create Stash -->
{#if showCreateModal}
  <div class="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
      <div class="flex items-center gap-3 text-cyan-600 dark:text-cyan-400">
        <div class="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <Plus class="w-5 h-5" />
        </div>
        <h3 class="font-bold text-sm text-zinc-900 dark:text-zinc-100">
          {localeState.t('stash.shelf.createModalTitle')}
        </h3>
      </div>

      <div class="space-y-3">
        <div class="space-y-1.5">
          <label for="new-stash-msg-input" class="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Ghi chú Stash
          </label>
          <input
            id="new-stash-msg-input"
            type="text"
            bind:value={newStashMessage}
            placeholder={localeState.t('stash.shelf.messagePlaceholder')}
            class="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-hidden focus:border-cyan-500 text-zinc-800 dark:text-zinc-200"
          />
        </div>

        <label class="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            bind:checked={newStashUntracked}
            class="rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span>{localeState.t('stash.shelf.includeUntracked')}</span>
        </label>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          onclick={() => (showCreateModal = false)}
          class="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          onclick={handleConfirmCreateStash}
          disabled={isOperating}
          class="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          {isOperating ? 'Đang lưu...' : localeState.t('stash.shelf.createConfirm')}
        </button>
      </div>
    </div>
  </div>
{/if}
