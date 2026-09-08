<script lang="ts">
  import type { DiffLine, FileDiffDetail } from '../types';
  import { localeState } from '../state/localeState.svelte';
  import { pullLfsFiles } from '../api';
  import MonacoDiffEditor from './MonacoDiffEditor.svelte';
  import MonacoEditor from './MonacoEditor.svelte';
  import {
    Columns2,
    AlignJustify,
    Plus,
    Minus,
    Trash2,
    FileCode,
    FileText,
    GitCompare,
    Check,
    Binary,
    Copy,
    Sparkles,
    ListOrdered,
    Database,
    Download,
  } from 'lucide-svelte';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    diffDetail: FileDiffDetail | null;
    isLoading?: boolean;
    ignoreWhitespace?: boolean;
    repoPath?: string;
    onToggleIgnoreWhitespace?: () => void;
    onStageHunk?: (hunkIndex: number) => void;
    onUnstageHunk?: (hunkIndex: number) => void;
    onStageFile?: () => void;
    onUnstageFile?: () => void;
    onDiscardFile?: () => void;
  }

  let {
    diffDetail,
    isLoading = false,
    ignoreWhitespace = $bindable(false),
    repoPath = '',
    onToggleIgnoreWhitespace,
    onStageHunk,
    onUnstageHunk,
    onStageFile,
    onUnstageFile,
    onDiscardFile,
  }: Props = $props();

  // Content view mode: 'diff' | 'full' (view whole file at this commit)
  let contentMode = $state<'diff' | 'full'>('diff');
  // Diff view mode: 'unified' | 'split' (side-by-side)
  let viewMode = $state<'unified' | 'split'>('unified');
  // Diff engine: 'monaco' (VS Code rich engine) | 'hunks' (interactive staging)
  let diffEngine = $state<'monaco' | 'hunks'>('monaco');
  let isPullingLfs = $state(false);
  let copiedFullContent = $state(false);

  let fullFileContent = $derived(
    diffDetail?.modified_content ?? diffDetail?.original_content ?? ''
  );
  let isDeletedInCommit = $derived(
    diffDetail ? !diffDetail.modified_content && !!diffDetail.original_content : false
  );
  let fullFileLineCount = $derived(
    fullFileContent ? fullFileContent.split('\n').length : 0
  );

  function copyFullFile() {
    if (!fullFileContent) return;
    navigator.clipboard.writeText(fullFileContent);
    copiedFullContent = true;
    toast.info(localeState.t('diff.copyFullFileTooltip'), localeState.t('diff.copiedFullFileToast'));
    setTimeout(() => (copiedFullContent = false), 2000);
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  let lfsPointerInfo = $derived.by(() => {
    if (!diffDetail) return null;
    const content = diffDetail.modified_content || diffDetail.original_content || '';
    let text = content;
    if (!text && diffDetail.hunks && diffDetail.hunks.length > 0) {
      text = diffDetail.hunks.flatMap((h) => h.lines.map((l) => l.content)).join('\n');
    }
    if (text && text.includes('version https://git-lfs.github.com/spec/v1')) {
      const oidMatch = text.match(/oid sha256:([0-9a-fA-F]{64})/);
      const sizeMatch = text.match(/size (\d+)/);
      const sizeBytes = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
      return {
        oid: oidMatch ? oidMatch[1] : '',
        size: sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
      };
    }
    return null;
  });

  async function handlePullLfsFile() {
    if (!diffDetail || !repoPath) return;
    isPullingLfs = true;
    try {
      await pullLfsFiles(repoPath, diffDetail.path);
      toast.success(localeState.t('diff.lfsPointerDetected'), localeState.t('diff.lfsPullSuccess'));
    } catch (e: any) {
      toast.error(localeState.t('diff.lfsPullError'), e?.toString() || '');
    } finally {
      isPullingLfs = false;
    }
  }
</script>



<div class="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 select-text overflow-hidden font-mono text-xs">
  <!-- Diff Toolbar -->
  <div class="h-10 px-3 md:px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-900/60 flex items-center justify-between gap-2 select-none shrink-0 overflow-hidden">
    <div class="flex items-center gap-2 min-w-0 flex-1 overflow-hidden mr-1">
      <FileCode class="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
      {#if diffDetail}
        <span class="font-bold text-zinc-900 dark:text-zinc-100 truncate min-w-0" title={diffDetail.path}>{diffDetail.path}</span>
        {#if diffDetail.old_path}
          <span class="text-zinc-500 text-[11px] truncate min-w-0 shrink hidden lg:inline" title={diffDetail.old_path}>{localeState.t('diff.renamedFrom', { path: diffDetail.old_path })}</span>
        {/if}

        <div class="flex items-center gap-1.5 ml-1 text-[11px] font-mono shrink-0">
          {#if diffDetail.additions > 0}
            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">+{diffDetail.additions}</span>
          {/if}
          {#if diffDetail.deletions > 0}
            <span class="text-rose-600 dark:text-rose-400 font-semibold">-{diffDetail.deletions}</span>
          {/if}
        </div>
      {:else}
        <span class="text-zinc-400 dark:text-zinc-500 italic truncate">{localeState.t('diff.noFileSelected')}</span>
      {/if}
    </div>

    <!-- Actions & View Mode Switcher -->
    {#if diffDetail}
      <div class="flex items-center gap-1.5 sm:gap-2 select-none shrink-0">
        <!-- Content Mode: Diff vs Full File -->
        <div class="flex items-center bg-zinc-200/80 dark:bg-zinc-950 border border-zinc-300/80 dark:border-zinc-800 rounded-lg p-0.5 text-xs shrink-0 shadow-2xs">
          <button
            onclick={() => (contentMode = 'diff')}
            class="px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] whitespace-nowrap transition-colors cursor-pointer {contentMode === 'diff' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            title={localeState.t('diff.viewDiffTooltip')}
          >
            <GitCompare class="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span class="hidden sm:inline">{localeState.t('diff.viewDiff')}</span>
          </button>
          <button
            onclick={() => (contentMode = 'full')}
            class="px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] whitespace-nowrap transition-colors cursor-pointer {contentMode === 'full' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            title={localeState.t('diff.viewFullFileTooltip')}
          >
            <FileText class="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <span class="hidden sm:inline">{localeState.t('diff.viewFullFile')}</span>
          </button>
        </div>

        <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>

        {#if contentMode === 'diff'}
          <!-- Engine Switcher: Monaco (VS Code) vs Hunk Staging -->
          <div class="flex items-center bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 text-xs shrink-0">
            <button
              onclick={() => (diffEngine = 'monaco')}
              class="px-2 py-0.5 rounded flex items-center gap-1 text-[11px] whitespace-nowrap transition-colors cursor-pointer {diffEngine === 'monaco' ? 'bg-white dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-zinc-200 dark:border-cyan-800/60 font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
              title={localeState.t('diff.vsCodeTooltip')}
            >
              <Sparkles class="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span class="hidden md:inline">{localeState.t('diff.vsCodeEngine')}</span>
            </button>
            <button
              onclick={() => (diffEngine = 'hunks')}
              class="px-2 py-0.5 rounded flex items-center gap-1 text-[11px] whitespace-nowrap transition-colors cursor-pointer {diffEngine === 'hunks' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
              title={localeState.t('diff.hunksTooltip')}
            >
              <ListOrdered class="w-3 h-3 shrink-0" />
              <span class="hidden md:inline">{localeState.t('diff.hunksEngine')}</span>
            </button>
          </div>

          <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>

          <!-- Mode Switcher -->
          <div class="flex items-center bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 text-xs shrink-0">
            <button
              onclick={() => (viewMode = 'unified')}
              class="px-2 py-0.5 rounded flex items-center gap-1 text-[11px] whitespace-nowrap transition-colors cursor-pointer {viewMode === 'unified' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
              title={localeState.t('diff.unifiedTooltip')}
            >
              <AlignJustify class="w-3 h-3 shrink-0" />
              <span class="hidden lg:inline">{localeState.t('diff.unifiedMode')}</span>
            </button>
            <button
              onclick={() => (viewMode = 'split')}
              class="px-2 py-0.5 rounded flex items-center gap-1 text-[11px] whitespace-nowrap transition-colors cursor-pointer {viewMode === 'split' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
              title={localeState.t('diff.splitTooltip')}
            >
              <Columns2 class="w-3 h-3 shrink-0" />
              <span class="hidden lg:inline">{localeState.t('diff.splitMode')}</span>
            </button>
          </div>

          <!-- Whitespace / Line Endings Toggle -->
          <button
            onclick={() => {
              if (onToggleIgnoreWhitespace) {
                onToggleIgnoreWhitespace();
              } else {
                ignoreWhitespace = !ignoreWhitespace;
              }
            }}
            class="px-2 py-0.5 rounded-lg flex items-center gap-1 text-[11px] whitespace-nowrap transition-colors cursor-pointer border shrink-0 {ignoreWhitespace ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 font-medium' : 'bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            title={localeState.t('diff.ignoreSpaceTooltip')}
          >
            <span class="font-mono text-[10px] opacity-70">␣</span>
            <span class="hidden sm:inline">{localeState.t('diff.ignoreSpace')}</span>
          </button>

          <!-- Quick Stage / Unstage / Discard File (Only when handlers provided, e.g. Working Tree) -->
          {#if onStageFile || onUnstageFile || onDiscardFile}
            <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0"></div>

            <div class="flex items-center gap-1 shrink-0">
              {#if diffDetail.is_staged}
                {#if onUnstageFile}
                  <button
                    onclick={onUnstageFile}
                    class="px-2.5 py-1 rounded bg-white dark:bg-zinc-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-800 dark:hover:text-amber-300 hover:border-amber-300 dark:hover:border-amber-700/50 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 text-[11px] flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap"
                    title={localeState.t('diff.unstageFile')}
                  >
                    <Minus class="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span class="hidden sm:inline">{localeState.t('diff.unstageFile')}</span>
                  </button>
                {/if}
              {:else}
                {#if onStageFile}
                  <button
                    onclick={onStageFile}
                    class="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-1 font-medium cursor-pointer transition-all whitespace-nowrap"
                    title={localeState.t('diff.stageFile')}
                  >
                    <Plus class="w-3 h-3 shrink-0" />
                    <span class="hidden sm:inline">{localeState.t('diff.stageFile')}</span>
                  </button>
                {/if}
                {#if onDiscardFile}
                  <button
                    onclick={onDiscardFile}
                    class="p-1 rounded bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-[11px] cursor-pointer transition-all shrink-0"
                    title={localeState.t('diff.discardFileTooltip')}
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                {/if}
              {/if}
            </div>
          {/if}
        {:else}
          <!-- Full File Mode Controls -->
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800/60">
              {localeState.t('diff.linesCount', { count: fullFileLineCount })}
            </span>

            <button
              onclick={copyFullFile}
              class="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
              title={localeState.t('diff.copyFullFileTooltip')}
            >
              {#if copiedFullContent}
                <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span class="hidden sm:inline text-emerald-600 dark:text-emerald-400">{localeState.t('common.copied')}</span>
              {:else}
                <Copy class="w-3 h-3 shrink-0" />
                <span class="hidden sm:inline">{localeState.t('common.copy')}</span>
              {/if}
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- LFS Pointer Detection Banner -->
  {#if lfsPointerInfo}
    <div
      class="px-4 py-2.5 bg-sky-50 dark:bg-sky-950/50 border-b border-sky-200 dark:border-sky-800/60 flex items-center justify-between gap-3 text-xs select-none shrink-0"
    >
      <div class="flex items-center gap-2.5 text-sky-900 dark:text-sky-200">
        <div class="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400">
          <Database class="w-4 h-4" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold">{localeState.t('diff.lfsPointerDetected')}</span>
            <span
              class="px-1.5 py-0.5 rounded text-[10px] bg-sky-200/80 dark:bg-sky-800/60 text-sky-800 dark:text-sky-200 font-mono font-semibold"
            >
              {localeState.t('diff.lfsPointerSize', { size: lfsPointerInfo.sizeFormatted })}
            </span>
          </div>
          <p class="text-[11px] text-sky-700 dark:text-sky-300 mt-0.5">
            {localeState.t('diff.lfsPointerDesc')}
          </p>
        </div>
      </div>

      {#if repoPath}
        <button
          onclick={handlePullLfsFile}
          disabled={isPullingLfs}
          class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Download class="w-3.5 h-3.5 {isPullingLfs ? 'animate-bounce' : ''}" />
          <span>{isPullingLfs ? localeState.t('diff.lfsPulling') : localeState.t('diff.lfsPullButton')}</span>
        </button>
      {/if}
    </div>
  {/if}

  <!-- Diff Content Area -->
  <div class="flex-1 overflow-auto">
    {#if isLoading}
      <div class="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
        <div class="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
        <span class="text-xs">{localeState.t('diff.generatingDiff')}</span>
      </div>
    {:else if !diffDetail}
      <div class="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 gap-3 select-none">
        <FileCode class="w-12 h-12 opacity-30 stroke-[1.5]" />
        <div class="text-center">
          <p class="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{localeState.t('diff.selectFilePrompt')}</p>
          <p class="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">{localeState.t('diff.selectFileDesc')}</p>
        </div>
      </div>
    {:else if diffDetail.is_binary}
      <div class="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 select-none">
        <Binary class="w-10 h-10 text-cyan-600 dark:text-cyan-400 opacity-60" />
        <span class="text-xs font-medium text-zinc-700 dark:text-zinc-300">{localeState.t('diff.binaryNotice')}</span>
      </div>
    {:else if contentMode === 'full'}
      <!-- Full File Preview Mode with Monaco -->
      <div class="w-full h-full flex flex-col min-h-0 overflow-hidden">
        {#if isDeletedInCommit}
          <div class="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-[11px] shrink-0 select-none">
            <Trash2 class="w-3.5 h-3.5 shrink-0" />
            <span>{localeState.t('diff.deletedNotice')}</span>
          </div>
        {/if}
        <div class="flex-1 min-h-0 overflow-hidden">
          <MonacoEditor
            content={fullFileContent}
            filePath={diffDetail.path}
            readOnly={true}
            minimap={true}
            wordWrap="on"
          />
        </div>
      </div>
    {:else if diffDetail.hunks.length === 0}
      <div class="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 select-none">
        <Check class="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        <span class="text-xs text-zinc-600 dark:text-zinc-400">{localeState.t('diff.noDifferences')}</span>
      </div>
    {:else if diffEngine === 'monaco' && (diffDetail.original_content !== undefined && diffDetail.original_content !== null || diffDetail.modified_content !== undefined && diffDetail.modified_content !== null)}
      <div class="w-full h-full">
        <MonacoDiffEditor
          originalContent={diffDetail.original_content ?? ''}
          modifiedContent={diffDetail.modified_content ?? ''}
          filePath={diffDetail.path}
          {viewMode}
          ignoreTrimWhitespace={ignoreWhitespace}
        />
      </div>
    {:else}
      <!-- Render Hunks -->
      <div class="divide-y divide-zinc-200 dark:divide-zinc-900 font-mono text-[11px] leading-relaxed">
        {#each diffDetail.hunks as hunk (hunk.hunk_index)}
          <div class="group/hunk">
            <!-- Hunk Header Bar -->
            <div class="sticky top-0 z-10 px-3 py-1 bg-cyan-50/80 dark:bg-cyan-950/30 backdrop-blur-md border-y border-cyan-200 dark:border-cyan-900/30 text-cyan-800 dark:text-cyan-400 flex items-center justify-between select-none">
              <span class="font-bold tracking-tight">{hunk.header}</span>
              {#if onStageHunk || onUnstageHunk}
                <div class="flex items-center gap-1.5 opacity-80 group-hover/hunk:opacity-100 transition-opacity">
                  {#if diffDetail.is_staged}
                    {#if onUnstageHunk}
                      <button
                        onclick={() => onUnstageHunk?.(hunk.hunk_index)}
                        class="px-2 py-0.5 rounded bg-white dark:bg-zinc-900/80 hover:bg-amber-100 dark:hover:bg-amber-950/80 hover:text-amber-800 dark:hover:text-amber-300 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 text-[10px] flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <Minus class="w-2.5 h-2.5 text-amber-500 dark:text-amber-400" />
                        <span>{localeState.t('diff.unstageHunk')}</span>
                      </button>
                    {/if}
                  {:else}
                    {#if onStageHunk}
                      <button
                        onclick={() => onStageHunk?.(hunk.hunk_index)}
                        class="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[10px] flex items-center gap-1 font-medium cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <Plus class="w-2.5 h-2.5" />
                        <span>{localeState.t('diff.stageHunk')}</span>
                      </button>
                    {/if}
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Hunk Lines (Unified View) -->
            {#if viewMode === 'unified'}
              <div class="w-full">
                {#each hunk.lines as line}
                  <div
                    class="flex items-stretch hover:bg-zinc-100/80 dark:hover:bg-white/5 transition-colors group/line relative {line.line_type === 'addition' ? 'bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200' : line.line_type === 'deletion' ? 'bg-rose-50/70 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300' : 'text-zinc-600 dark:text-zinc-400'}"
                  >
                    <!-- Old Line Number -->
                    <div class="w-12 px-2 py-0.5 text-right text-zinc-400 dark:text-zinc-600 select-none border-r border-zinc-200 dark:border-zinc-900 shrink-0 font-mono text-[10px]">
                      {line.old_lineno ?? ''}
                    </div>
                    <!-- New Line Number -->
                    <div class="w-12 px-2 py-0.5 text-right text-zinc-400 dark:text-zinc-600 select-none border-r border-zinc-200 dark:border-zinc-900 shrink-0 font-mono text-[10px]">
                      {line.new_lineno ?? ''}
                    </div>
                    <!-- Line Origin Symbol -->
                    <div class="w-5 text-center select-none shrink-0 py-0.5 font-bold {line.line_type === 'addition' ? 'text-emerald-600 dark:text-emerald-400' : line.line_type === 'deletion' ? 'text-rose-600 dark:text-rose-400' : 'text-transparent'}">
                      {line.line_type === 'addition' ? '+' : line.line_type === 'deletion' ? '-' : ' '}
                    </div>
                    <!-- Line Code Content -->
                    <div class="flex-1 px-2 py-0.5 whitespace-pre overflow-x-auto pr-16">
                      {line.content}
                    </div>

                    <!-- Quick Hover Action Bar on Line -->
                    <div class="absolute right-2 top-0.5 bottom-0.5 hidden group-hover/line:flex items-center gap-1 bg-white/95 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700/60 rounded px-1 backdrop-blur-xs select-none z-10 shadow-xs">
                      {#if line.line_type === 'addition' || line.line_type === 'deletion'}
                        {#if diffDetail.is_staged}
                          <button
                            onclick={(e) => {
                              e.stopPropagation();
                              onUnstageHunk?.(hunk.hunk_index);
                            }}
                            class="px-1 py-0.5 text-[9px] rounded bg-amber-100 dark:bg-amber-950/70 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 flex items-center gap-0.5 cursor-pointer"
                            title={localeState.t('diff.unstageHunkTooltip')}
                          >
                            <Minus class="w-2.5 h-2.5" />
                            <span>{localeState.t('workingTree.unstage')}</span>
                          </button>
                        {:else}
                          <button
                            onclick={(e) => {
                              e.stopPropagation();
                              onStageHunk?.(hunk.hunk_index);
                            }}
                            class="px-1 py-0.5 text-[9px] rounded bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center gap-0.5 cursor-pointer font-medium"
                            title={localeState.t('diff.stageHunkTooltip')}
                          >
                            <Plus class="w-2.5 h-2.5" />
                            <span>{localeState.t('workingTree.stage')}</span>
                          </button>
                        {/if}
                      {/if}

                      <button
                        onclick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(line.content);
                          toast.info(localeState.t('common.success'), localeState.t('diff.copiedLineToast'));
                        }}
                        class="p-0.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        title={localeState.t('diff.copyLineTooltip')}
                      >
                        <Copy class="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <!-- Split (Side-by-Side) View -->
              <div class="w-full grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800/80">
                <!-- Left Side: Old / Deletion -->
                <div class="w-full">
                  {#each hunk.lines.filter((l: DiffLine) => l.line_type !== 'addition') as line}
                    <div
                      class="flex items-stretch {line.line_type === 'deletion' ? 'bg-rose-50/70 dark:bg-rose-950/25 text-rose-900 dark:text-rose-300' : 'text-zinc-600 dark:text-zinc-400'}"
                    >
                      <div class="w-10 px-2 py-0.5 text-right text-zinc-400 dark:text-zinc-600 select-none border-r border-zinc-200 dark:border-zinc-900 shrink-0 text-[10px]">
                        {line.old_lineno ?? ''}
                      </div>
                      <div class="w-4 text-center select-none shrink-0 py-0.5 font-bold {line.line_type === 'deletion' ? 'text-rose-600 dark:text-rose-400' : 'text-transparent'}">
                        {line.line_type === 'deletion' ? '-' : ' '}
                      </div>
                      <div class="flex-1 px-2 py-0.5 whitespace-pre overflow-x-auto">
                        {line.content}
                      </div>
                    </div>
                  {/each}
                </div>

                <!-- Right Side: New / Addition -->
                <div class="w-full">
                  {#each hunk.lines.filter((l: DiffLine) => l.line_type !== 'deletion') as line}
                    <div
                      class="flex items-stretch {line.line_type === 'addition' ? 'bg-emerald-50/70 dark:bg-emerald-950/25 text-emerald-900 dark:text-emerald-200' : 'text-zinc-600 dark:text-zinc-400'}"
                    >
                      <div class="w-10 px-2 py-0.5 text-right text-zinc-400 dark:text-zinc-600 select-none border-r border-zinc-200 dark:border-zinc-900 shrink-0 text-[10px]">
                        {line.new_lineno ?? ''}
                      </div>
                      <div class="w-4 text-center select-none shrink-0 py-0.5 font-bold {line.line_type === 'addition' ? 'text-emerald-600 dark:text-emerald-400' : 'text-transparent'}">
                        {line.line_type === 'addition' ? '+' : ' '}
                      </div>
                      <div class="flex-1 px-2 py-0.5 whitespace-pre overflow-x-auto">
                        {line.content}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
