<script lang="ts">
  import type { CommitDetail, CommitNode, ConflictSimulationResult, FileDiffDetail } from '../types';
  import { localeState } from '../state/localeState.svelte';
  import CommitGraph from './CommitGraph.svelte';
  import DiffViewer from './DiffViewer.svelte';
  import { getCommitFileDiff } from '../api/diff';
  import {
    Copy,
    Check,
    GitCommit,
    Clock,
    FileCode,
    FilePlus,
    FileEdit,
    FileX,
    Search,
    ChevronRight,
  } from 'lucide-svelte';

  interface Props {
    commits: CommitNode[];
    selectedCommitId: string | null;
    selectedCommitIds?: string[];
    commitDetail: CommitDetail | null;
    isDetailLoading: boolean;
    repoPath: string;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void;
    onSelectCommit: (commit: CommitNode) => void;
    onCompareCommits?: (c1: CommitNode, c2: CommitNode) => void;
    onOpenDropAction?: (
      source: CommitNode,
      target: CommitNode,
      simulation: ConflictSimulationResult | null,
      pos: { x: number; y: number }
    ) => void;
    onCreateBranch?: (commit: CommitNode) => void;
    onCreateTag?: (commit: CommitNode) => void;
    onCherryPickCommit?: (commit: CommitNode) => void;
    onRevertCommit?: (commit: CommitNode) => void;
    onResetCommit?: (commit: CommitNode, mode: 'soft' | 'mixed' | 'hard') => void;
    onSquashCommits?: (commits: CommitNode[]) => void;
    onInteractiveRebase?: (commit: CommitNode) => void;
    hiddenBranchesCount?: number;
    onShowAllBranches?: () => void;
  }

  let {
    commits = [],
    selectedCommitId = null,
    selectedCommitIds = [],
    commitDetail = null,
    isDetailLoading = false,
    repoPath = '',
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
    onSelectCommit,
    onCompareCommits,
    onCreateBranch,
    onCreateTag,
    onCherryPickCommit,
    onRevertCommit,
    onResetCommit,
    onSquashCommits,
    onInteractiveRebase,
    onOpenDropAction,
    hiddenBranchesCount = 0,
    onShowAllBranches,
  }: Props = $props();

  let selectedFilePath = $state<string | null>(null);
  let fileSearchQuery = $state<string>('');
  let fileDiffDetail = $state<FileDiffDetail | null>(null);
  let isDiffLoading = $state<boolean>(false);
  let copied = $state<boolean>(false);
  let fileDisplayLimit = $state<number>(100);

  // Filtered changed files in selected commit
  let visibleFiles = $derived.by(() => {
    if (!commitDetail || !commitDetail.files_changed) return [];
    if (!fileSearchQuery.trim()) return commitDetail.files_changed;
    const q = fileSearchQuery.toLowerCase();
    return commitDetail.files_changed.filter((f) => f.path.toLowerCase().includes(q));
  });

  let renderedFiles = $derived(visibleFiles.slice(0, fileDisplayLimit));

  // Whenever commitDetail changes, automatically select the first file and load its diff
  $effect(() => {
    fileDisplayLimit = 100;
    if (commitDetail && commitDetail.files_changed.length > 0) {
      const currentExists = selectedFilePath && commitDetail.files_changed.some((f) => f.path === selectedFilePath);
      if (!currentExists) {
        selectedFilePath = commitDetail.files_changed[0].path;
      }
    } else {
      selectedFilePath = null;
      fileDiffDetail = null;
    }
  });

  // Whenever selectedFilePath or commitDetail changes, fetch the file diff
  $effect(() => {
    const filePath = selectedFilePath;
    const commitId = commitDetail?.id;
    if (filePath && commitId && repoPath) {
      loadFileDiff(commitId, filePath);
    }
  });

  async function loadFileDiff(commitId: string, filePath: string) {
    isDiffLoading = true;
    try {
      const diff = await getCommitFileDiff(repoPath, commitId, filePath);
      fileDiffDetail = diff;
    } catch (err) {
      console.error('Failed to load commit file diff:', err);
      fileDiffDetail = null;
    } finally {
      isDiffLoading = false;
    }
  }

  function copyHash() {
    if (!commitDetail) return;
    navigator.clipboard.writeText(commitDetail.id);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }
</script>

<div class="flex-1 flex w-full h-full min-h-0 bg-zinc-50 dark:bg-zinc-950 overflow-hidden divide-x divide-zinc-200 dark:divide-zinc-800/80">
  <!-- Column 1: Commits List & Graph (35%) -->
  <div class="w-[36%] min-w-[320px] max-w-[500px] h-full flex flex-col min-h-0 overflow-hidden bg-white/60 dark:bg-zinc-950/60">
    <div class="h-8 px-3 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-100/70 dark:bg-zinc-900/60 shrink-0 select-none">
      <span class="text-[11px] font-semibold tracking-wide text-zinc-600 dark:text-zinc-400 uppercase">{localeState.t('diff.commitsAndGraph')}</span>
      <span class="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 px-1.5 py-0.5 rounded">
        {localeState.t('diff.commitsCount', { count: commits.length })}
      </span>
    </div>

    <div class="flex-1 min-h-0 relative overflow-hidden">
      <CommitGraph
        {commits}
        {selectedCommitId}
        {selectedCommitIds}
        {repoPath}
        {hasMore}
        {isLoadingMore}
        {onLoadMore}
        {onSelectCommit}
        {onCompareCommits}
        {onCreateBranch}
        {onCreateTag}
        {onCherryPickCommit}
        {onRevertCommit}
        {onResetCommit}
        {onSquashCommits}
        {onInteractiveRebase}
        {onOpenDropAction}
        {hiddenBranchesCount}
        {onShowAllBranches}
      />
    </div>
  </div>

  <!-- Column 2: Selected Commit Overview & Changed Files (24%) -->
  <div class="w-[24%] min-w-[240px] max-w-[380px] h-full flex flex-col min-h-0 overflow-hidden bg-zinc-50/90 dark:bg-zinc-950/90 border-r border-zinc-200 dark:border-zinc-800/80">
    {#if isDetailLoading}
      <div class="h-full flex items-center justify-center text-zinc-500 text-xs gap-2">
        <div class="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
        <span>{localeState.t('diff.loadingCommit')}</span>
      </div>
    {:else if commitDetail}
      <!-- Commit Metadata Card -->
      <div class="p-3 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/40 space-y-2 shrink-0">
        <div class="flex items-center justify-between gap-2">
          <!-- Commit Hash -->
          <button
            onclick={copyHash}
            class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-mono text-[11px] transition-colors cursor-pointer"
            title={localeState.t('diff.copyShaTooltip')}
          >
            <GitCommit class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>{commitDetail.short_id}</span>
            {#if copied}
              <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            {:else}
              <Copy class="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500" />
            {/if}
          </button>

          <div class="flex items-center gap-1 text-zinc-500 text-[10px] font-mono">
            <Clock class="w-3 h-3" />
            <span>{formatDate(commitDetail.author_timestamp)}</span>
          </div>
        </div>

        <!-- Author -->
        <div class="flex items-center gap-1.5 text-xs text-zinc-800 dark:text-zinc-300">
          <div class="w-4 h-4 rounded-full bg-cyan-100 dark:bg-cyan-600/30 text-cyan-800 dark:text-cyan-300 flex items-center justify-center text-[10px] font-bold shrink-0">
            {commitDetail.author_name.charAt(0).toUpperCase()}
          </div>
          <span class="font-medium truncate">{commitDetail.author_name}</span>
          <span class="text-zinc-500 text-[10px] truncate">&lt;{commitDetail.author_email}&gt;</span>
        </div>

        <!-- Summary / Message -->
        <div class="max-h-24 overflow-y-auto bg-white dark:bg-zinc-950/80 p-2 rounded border border-zinc-200 dark:border-zinc-800/60">
          <p class="text-xs text-zinc-800 dark:text-zinc-200 font-sans leading-relaxed whitespace-pre-wrap select-text">
            {commitDetail.message}
          </p>
        </div>
      </div>

      <!-- Changed Files Section -->
      <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div class="p-2 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/40 dark:bg-zinc-900/30 flex items-center justify-between gap-2 shrink-0">
          <div class="flex items-center gap-1.5">
            <span class="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">{localeState.t('diff.changedFiles')}</span>
            <span class="text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-1.5 py-0.2 rounded-full">
              {commitDetail.files_changed.length}
            </span>
          </div>

          <!-- Quick search filter -->
          {#if commitDetail.files_changed.length > 5}
            <div class="relative w-32">
              <Search class="w-3 h-3 text-zinc-400 dark:text-zinc-500 absolute left-1.5 top-2" />
              <input
                type="text"
                bind:value={fileSearchQuery}
                placeholder={localeState.t('diff.filterFilesPlaceholder')}
                class="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded pl-6 pr-2 py-0.5 text-[11px] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          {/if}
        </div>

        <div class="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {#each renderedFiles as file}
            {@const isSelected = selectedFilePath === file.path}
            <button
              onclick={() => (selectedFilePath = file.path)}
              class="w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-xs font-mono transition-all cursor-pointer group {isSelected ? 'bg-cyan-100 dark:bg-cyan-600/20 border border-cyan-300 dark:border-cyan-500/40 text-cyan-900 dark:text-cyan-200 font-medium' : 'hover:bg-zinc-200/60 dark:hover:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 border border-transparent'}"
            >
              <div class="flex items-center gap-2 truncate pr-1">
                {#if file.status === 'added'}
                  <FilePlus class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {:else if file.status === 'deleted'}
                  <FileX class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                {:else if file.status === 'renamed'}
                  <FileCode class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                {:else}
                  <FileEdit class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                {/if}
                <span class="truncate text-[11px]">{file.path}</span>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-[9px] uppercase px-1 py-0.2 rounded border {file.status === 'added' ? 'border-emerald-300 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : file.status === 'deleted' ? 'border-rose-300 dark:border-rose-800/80 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900'}">
                  {file.status.slice(0, 3)}
                </span>
                <ChevronRight class="w-3 h-3 opacity-0 group-hover:opacity-100 {isSelected ? 'opacity-100 text-cyan-600 dark:text-cyan-400' : 'text-zinc-400 dark:text-zinc-500'}" />
              </div>
            </button>
          {/each}

          {#if visibleFiles.length > fileDisplayLimit}
            <button
              onclick={() => (fileDisplayLimit += 150)}
              class="w-full py-2 mt-1 rounded bg-white dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-mono text-cyan-700 dark:text-cyan-400 text-center transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-800"
            >
              {localeState.t('diff.showMoreFiles', { rendered: renderedFiles.length, total: visibleFiles.length })}
            </button>
          {/if}

          {#if visibleFiles.length === 0}
            <div class="p-4 text-center text-xs text-zinc-400 dark:text-zinc-600 italic">
              {fileSearchQuery ? localeState.t('diff.noMatchingFiles') : localeState.t('diff.noChangesInCommit')}
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <div class="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 dark:text-zinc-600 text-xs">
        <GitCommit class="w-8 h-8 mb-2 opacity-40 text-zinc-400 dark:text-zinc-500" />
        <span>{localeState.t('diff.selectCommitPrompt')}</span>
      </div>
    {/if}
  </div>

  <!-- Column 3: Live Code Diff Viewer (40%) -->
  <div class="flex-1 h-full min-w-0 overflow-hidden flex flex-col bg-white dark:bg-zinc-950">
    <DiffViewer
      diffDetail={fileDiffDetail}
      isLoading={isDiffLoading}
      {repoPath}
    />
  </div>
</div>
