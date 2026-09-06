<script lang="ts">
  import type { ConflictFileDetail, ConflictChunk } from '../types';
  import MonacoEditor from './MonacoEditor.svelte';
  import MonacoDiffEditor from './MonacoDiffEditor.svelte';
  import { resolveConflictChunkAI, resolveConflictFileAI } from '../api/ai';
  import { toast } from '../state/toastState.svelte';
  import { localeState } from '../state/localeState.svelte';
  import {
    Split,
    CheckCircle,
    FileCode,
    Save,
    RotateCcw,
    Play,
    Sparkles,
    Search,
    Columns,
    Layers,
    Check,
    RefreshCw,
    X,
    Code2,
    Undo2
  } from 'lucide-svelte';

  interface Props {
    conflictDetail: ConflictFileDetail | null;
    conflictedFiles: string[];
    selectedFile: string | null;
    isLoading: boolean;
    onSelectFile: (path: string) => void;
    onResolveAndStage: (resolvedContent: string) => void;
    onAbortMerge: () => void;
    onContinueRebase?: () => void;
    isRebasing?: boolean;
    onClose: () => void;
  }

  let {
    conflictDetail,
    conflictedFiles,
    selectedFile,
    isLoading,
    onSelectFile,
    onResolveAndStage,
    onAbortMerge,
    onContinueRebase,
    isRebasing = false,
    onClose,
  }: Props = $props();

  // Local States
  let resolvedText = $state<string>('');
  let searchQuery = $state<string>('');
  let layoutMode = $state<'2way' | '3way' | 'chunks'>('2way');
  let isAiResolving = $state<boolean>(false);
  let aiResolvingChunkIdx = $state<number | null>(null);
  let chunkChoices = $state<Record<number, 'ours' | 'theirs' | 'both-ours' | 'both-theirs' | 'base'>>({});
  let lastLoadedFile = $state<string | null>(null);

  // Derived calculations
  let filteredFiles = $derived(
    conflictedFiles.filter((f) =>
      f.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
  );

  let activeChunks = $derived(conflictDetail?.chunks || []);
  let conflictChunks = $derived(activeChunks.filter((c) => c.is_conflict));
  let resolvedChunksCount = $derived(
    conflictChunks.filter((c) => chunkChoices[c.chunk_index] !== undefined).length
  );

  // Re-initialize state when selected file or detail changes
  $effect(() => {
    if (conflictDetail && conflictDetail.path !== lastLoadedFile) {
      lastLoadedFile = conflictDetail.path;
      chunkChoices = {};
      buildInitialResolvedText();
    }
  });

  /**
   * Build initial clean resolved text.
   * Defaulting to Ours keeps the syntax 100% valid TypeScript/JSX without red squiggly error marks!
   */
  function buildInitialResolvedText(includeRawMarkers = false) {
    if (!conflictDetail) return;
    if (conflictDetail.chunks && conflictDetail.chunks.length > 0) {
      let text = '';
      for (const chunk of conflictDetail.chunks) {
        if (!chunk.is_conflict) {
          text += (chunk.our_content || chunk.their_content || '') + '\n';
        } else {
          const choice = chunkChoices[chunk.chunk_index];
          if (choice === 'ours') {
            text += chunk.our_content + '\n';
          } else if (choice === 'theirs') {
            text += chunk.their_content + '\n';
          } else if (choice === 'both-ours') {
            text += chunk.our_content + '\n' + chunk.their_content + '\n';
          } else if (choice === 'both-theirs') {
            text += chunk.their_content + '\n' + chunk.our_content + '\n';
          } else if (choice === 'base') {
            text += chunk.base_content + '\n';
          } else {
            if (includeRawMarkers) {
              text += `<<<<<<< OURS (Current Branch)\n${chunk.our_content}\n=======\n${chunk.their_content}\n>>>>>>> THEIRS (Incoming Branch)\n`;
            } else {
              // Default to clean Ours to prevent syntax parse errors & red squiggly lines in Monaco
              text += chunk.our_content + '\n';
            }
          }
        }
      }
      resolvedText = text.trimEnd();
    } else {
      resolvedText = conflictDetail.our_content || '';
    }
  }

  function applyChunkChoice(
    chunkIndex: number,
    choice: 'ours' | 'theirs' | 'both-ours' | 'both-theirs' | 'base'
  ) {
    chunkChoices = { ...chunkChoices, [chunkIndex]: choice };
    rebuildTextFromChoices();
  }

  function rebuildTextFromChoices() {
    if (!conflictDetail) return;
    let text = '';
    for (const chunk of conflictDetail.chunks) {
      if (!chunk.is_conflict) {
        text += (chunk.our_content || chunk.their_content || '') + '\n';
      } else {
        const choice = chunkChoices[chunk.chunk_index];
        if (choice === 'ours') {
          text += chunk.our_content + '\n';
        } else if (choice === 'theirs') {
          text += chunk.their_content + '\n';
        } else if (choice === 'both-ours') {
          text += chunk.our_content + '\n' + chunk.their_content + '\n';
        } else if (choice === 'both-theirs') {
          text += chunk.their_content + '\n' + chunk.our_content + '\n';
        } else if (choice === 'base') {
          text += chunk.base_content + '\n';
        } else {
          // Default to Ours
          text += chunk.our_content + '\n';
        }
      }
    }
    resolvedText = text.trimEnd();
  }

  function acceptAllOurs() {
    if (!conflictDetail) return;
    const newChoices: Record<number, 'ours'> = {};
    for (const chunk of conflictChunks) {
      newChoices[chunk.chunk_index] = 'ours';
    }
    chunkChoices = newChoices;
    rebuildTextFromChoices();
    toast.success('Đã chọn phiên bản Ours (HEAD) cho tất cả các đoạn xung đột');
  }

  function acceptAllTheirs() {
    if (!conflictDetail) return;
    const newChoices: Record<number, 'theirs'> = {};
    for (const chunk of conflictChunks) {
      newChoices[chunk.chunk_index] = 'theirs';
    }
    chunkChoices = newChoices;
    rebuildTextFromChoices();
    toast.success('Đã chọn phiên bản Theirs (Incoming) cho tất cả các đoạn xung đột');
  }

  function acceptAllBoth() {
    if (!conflictDetail) return;
    const newChoices: Record<number, 'both-ours'> = {};
    for (const chunk of conflictChunks) {
      newChoices[chunk.chunk_index] = 'both-ours';
    }
    chunkChoices = newChoices;
    rebuildTextFromChoices();
    toast.success('Đã chọn ghép cả hai phiên bản (Ours + Theirs)');
  }

  function resetToOurs() {
    chunkChoices = {};
    buildInitialResolvedText(false);
    toast.info('Đã hoàn tác và đặt lại mã nguồn về Ours (HEAD)');
  }

  function insertGitConflictMarkers() {
    chunkChoices = {};
    buildInitialResolvedText(true);
    toast.warning('Đã chèn các mốc Git (<<<<<<< / ======= / >>>>>>>) vào trình biên tập');
  }

  // AI Conflict Resolutions
  async function handleAiResolveChunk(chunk: ConflictChunk) {
    if (!selectedFile) return;
    aiResolvingChunkIdx = chunk.chunk_index;
    try {
      const merged = await resolveConflictChunkAI(chunk, selectedFile);
      chunkChoices = { ...chunkChoices, [chunk.chunk_index]: 'ours' };
      let text = '';
      for (const c of conflictDetail?.chunks || []) {
        if (!c.is_conflict) {
          text += (c.our_content || c.their_content || '') + '\n';
        } else if (c.chunk_index === chunk.chunk_index) {
          text += merged + '\n';
        } else {
          const choice = chunkChoices[c.chunk_index];
          if (choice === 'ours') text += c.our_content + '\n';
          else if (choice === 'theirs') text += c.their_content + '\n';
          else if (choice === 'both-ours') text += c.our_content + '\n' + c.their_content + '\n';
          else if (choice === 'both-theirs') text += c.their_content + '\n' + c.our_content + '\n';
          else text += c.our_content + '\n';
        }
      }
      resolvedText = text.trimEnd();
      toast.success(`✨ AI đã giải quyết xong xung đột #${chunk.chunk_index + 1}!`);
    } catch (e: any) {
      toast.error('AI giải quyết thất bại: ' + (e?.message || e));
    } finally {
      aiResolvingChunkIdx = null;
    }
  }

  async function handleAiResolveEntireFile() {
    if (!conflictDetail || !selectedFile) return;
    isAiResolving = true;
    try {
      const resolved = await resolveConflictFileAI(conflictDetail.chunks, selectedFile);
      resolvedText = resolved.trimEnd();
      const newChoices: Record<number, 'ours'> = {};
      for (const chunk of conflictChunks) {
        newChoices[chunk.chunk_index] = 'ours';
      }
      chunkChoices = newChoices;
      toast.success('✨ AI đã phân tích và tự động ghép mã nguồn cho toàn bộ tệp!');
    } catch (e: any) {
      toast.error('AI hòa giải file thất bại: ' + (e?.message || e));
    } finally {
      isAiResolving = false;
    }
  }

  function handleStage() {
    if (!selectedFile || isLoading) return;
    onResolveAndStage(resolvedText);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleStage();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 overflow-hidden font-sans select-none">
  <!-- Top Conflict Header Toolbar -->
  <header class="h-12 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
    <div class="flex items-center gap-3 min-w-0">
      <div class="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
        <Split class="w-4 h-4" />
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h2 class="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide truncate">
            {localeState.t('workflows.conflictResolver.title')}
          </h2>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 font-semibold shrink-0">
            {localeState.t('workflows.conflictResolver.filesCount', { count: conflictedFiles.length })}
          </span>
          {#if selectedFile}
            <span class="text-zinc-400 dark:text-zinc-500 text-xs hidden sm:inline">•</span>
            <span class="text-xs font-mono text-zinc-600 dark:text-zinc-300 truncate hidden sm:inline" title={selectedFile}>
              {selectedFile.split('/').pop()}
            </span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Center: View Mode Switcher -->
    {#if conflictDetail}
      <div class="hidden md:flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/60 text-xs">
        <button
          onclick={() => (layoutMode = '2way')}
          class="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer {layoutMode === '2way' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
          title="VS Code 2-Way Diff"
        >
          <Columns class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{localeState.t('workflows.conflictResolver.layout2way')}</span>
        </button>
        <button
          onclick={() => (layoutMode = '3way')}
          class="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer {layoutMode === '3way' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
          title={localeState.t('workflows.conflictResolver.layout3wayTooltip')}
        >
          <Split class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>{localeState.t('workflows.conflictResolver.layout3way')}</span>
        </button>
        <button
          onclick={() => (layoutMode = 'chunks')}
          class="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer {layoutMode === 'chunks' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
          title={localeState.t('workflows.conflictResolver.layoutChunksTooltip')}
        >
          <Layers class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{localeState.t('workflows.conflictResolver.layoutChunks', { count: conflictChunks.length })}</span>
        </button>
      </div>
    {/if}

    <!-- Right: Actions Toolbar -->
    <div class="flex items-center gap-2 shrink-0">
      {#if conflictDetail}
        <button
          onclick={handleAiResolveEntireFile}
          disabled={isAiResolving || isLoading}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
          title={localeState.t('workflows.conflictResolver.aiAutoMergeTooltip')}
        >
          {#if isAiResolving}
            <RefreshCw class="w-3.5 h-3.5 animate-spin" />
            <span>{localeState.t('workflows.conflictResolver.aiResolving')}</span>
          {:else}
            <Sparkles class="w-3.5 h-3.5 text-amber-300" />
            <span class="hidden sm:inline">{localeState.t('workflows.conflictResolver.aiAutoMerge')}</span>
          {/if}
        </button>
      {/if}

      <button
        onclick={handleStage}
        disabled={isLoading || !selectedFile}
        class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-medium text-xs shadow-sm transition-all cursor-pointer"
        title={localeState.t('workflows.conflictResolver.stageFileTooltip')}
      >
        <Save class="w-3.5 h-3.5" />
        <span>{localeState.t('workflows.conflictResolver.stageFile')}</span>
        <kbd class="hidden md:inline text-[9px] bg-emerald-700 px-1 py-0.2 rounded font-mono">Ctrl+↵</kbd>
      </button>

      {#if isRebasing && onContinueRebase}
        <button
          onclick={onContinueRebase}
          disabled={isLoading || conflictedFiles.length > 0}
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs shadow-sm transition-all cursor-pointer"
          title={conflictedFiles.length > 0 ? localeState.t('workflows.conflictResolver.continueRebaseDisabledTooltip') : localeState.t('workflows.conflictResolver.continueRebaseTooltip')}
        >
          <Play class="w-3.5 h-3.5 fill-current" />
          <span>{localeState.t('workflows.conflictResolver.continueRebase')}</span>
        </button>
      {:else if conflictedFiles.length === 0}
        <button
          onclick={onClose}
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
          title={localeState.t('workflows.conflictResolver.finishAndReturnTooltip')}
        >
          <Check class="w-3.5 h-3.5" />
          <span>{localeState.t('workflows.conflictResolver.finishAndReturn')}</span>
        </button>
      {/if}

      <button
        onclick={onAbortMerge}
        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
        title={localeState.t('workflows.conflictResolver.abortTooltip')}
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">{localeState.t('workflows.conflictResolver.abort')}</span>
      </button>

      <button
        onclick={onClose}
        class="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        title={localeState.t('workflows.conflictResolver.closeTooltip')}
      >
        <X class="w-4 h-4" />
      </button>
    </div>
  </header>

  <!-- Main Area: Conflicted Files Sidebar (Left) + Split Resolution View (Right) -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Sidebar: Conflicted Files List -->
    <aside class="w-72 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70 flex flex-col shrink-0 overflow-hidden">
      <!-- Search Box -->
      <div class="p-2.5 border-b border-zinc-200 dark:border-zinc-800/80">
        <div class="relative">
          <Search class="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder={localeState.t('workflows.conflictResolver.filterPlaceholder')}
            class="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
          />
        </div>
      </div>

      <!-- File List Container -->
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        {#if conflictedFiles.length === 0}
          <div class="p-6 text-center text-xs text-emerald-600 dark:text-emerald-400 space-y-3">
            <CheckCircle class="w-10 h-10 mx-auto text-emerald-500 opacity-90 animate-bounce" />
            <div class="space-y-1">
              <h3 class="font-bold text-sm text-zinc-900 dark:text-zinc-100">{localeState.t('workflows.conflictResolver.allResolvedTitle')}</h3>
              <p class="text-zinc-500 text-[11px]">{localeState.t('workflows.conflictResolver.allResolvedSubtitle')}</p>
            </div>
            {#if isRebasing && onContinueRebase}
              <button
                onclick={onContinueRebase}
                class="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Play class="w-3.5 h-3.5 fill-current" />
                <span>{localeState.t('workflows.conflictResolver.continueRebase')}</span>
              </button>
            {:else}
              <button
                onclick={onClose}
                class="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Check class="w-4 h-4" />
                <span>{localeState.t('workflows.conflictResolver.returnToGraph')}</span>
              </button>
            {/if}
          </div>
        {:else if filteredFiles.length === 0}
          <div class="p-4 text-center text-xs text-zinc-400">
            {localeState.t('workflows.conflictResolver.noMatching', { query: searchQuery })}
          </div>
        {:else}
          {#each filteredFiles as file}
            {@const isSelected = selectedFile === file}
            {@const parts = file.split('/')}
            {@const fileName = parts.pop() || file}
            {@const dirPath = parts.join('/')}
            <button
              onclick={() => onSelectFile(file)}
              class="w-full text-left p-2.5 rounded-xl text-xs flex items-start justify-between gap-2 transition-all cursor-pointer border {isSelected ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-500/40 shadow-xs' : 'bg-white/60 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300 border-zinc-200/70 dark:border-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-900'}"
            >
              <div class="min-w-0 flex-1">
                <div class="font-mono font-semibold text-[12px] truncate flex items-center gap-1.5">
                  <FileCode class="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span class="truncate">{fileName}</span>
                </div>
                {#if dirPath}
                  <div class="text-[10px] text-zinc-400 dark:text-zinc-500 truncate font-mono mt-0.5" title={dirPath}>
                    {dirPath}
                  </div>
                {/if}
              </div>

              <div class="shrink-0 flex items-center mt-0.5">
                <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                  conflict
                </span>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </aside>

    <!-- Right: Resolution Workplace -->
    <div class="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
      {#if isLoading}
        <div class="flex-1 flex flex-col items-center justify-center gap-2 text-xs text-zinc-500">
          <RefreshCw class="w-6 h-6 animate-spin text-indigo-500" />
          <span>{localeState.t('workflows.conflictResolver.loadingConflict')}</span>
        </div>
      {:else if conflictDetail}
        <!-- Top Half: Comparison View (VS Code Monaco Diff Editor) -->
        <div class="h-1/2 flex flex-col border-b border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {#if layoutMode === '2way'}
            <!-- 2-Way View: Real Monaco Diff Editor (Side-by-side like VS Code with syntax highlighting & green/red diffs) -->
            <div class="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
              <!-- Diff Header Bar -->
              <div class="h-8 px-3 bg-zinc-100/90 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs shrink-0 select-none">
                <div class="flex items-center gap-2">
                  <div class="flex items-center gap-1.5 font-bold text-cyan-700 dark:text-cyan-400 text-[11px]">
                    <span class="w-2 h-2 rounded-full bg-cyan-500"></span>
                    <span>{localeState.t('workflows.conflictResolver.currentOursHeader')}</span>
                  </div>
                  <button
                    onclick={acceptAllOurs}
                    class="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-600/30 hover:bg-cyan-200 dark:hover:bg-cyan-600/50 text-[10px] font-medium text-cyan-800 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-500/40 cursor-pointer"
                  >
                    {localeState.t('workflows.conflictResolver.takeAllOurs')}
                  </button>
                </div>

                <div class="text-[11px] text-zinc-400 font-mono hidden sm:flex items-center gap-1.5">
                  <span>{localeState.t('workflows.conflictResolver.vsCodeEngine')}</span>
                  <span>•</span>
                  <span class="text-rose-600 dark:text-rose-400 font-semibold">{localeState.t('workflows.conflictResolver.redOurs')}</span>
                  <span>vs</span>
                  <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{localeState.t('workflows.conflictResolver.greenTheirs')}</span>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    onclick={acceptAllTheirs}
                    class="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-600/30 hover:bg-amber-200 dark:hover:bg-amber-600/50 text-[10px] font-medium text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 cursor-pointer"
                  >
                    {localeState.t('workflows.conflictResolver.takeAllTheirs')}
                  </button>
                  <div class="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 text-[11px]">
                    <span>{localeState.t('workflows.conflictResolver.incomingTheirsHeader')}</span>
                    <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                  </div>
                </div>
              </div>

              <!-- Monaco Diff Editor Instance -->
              <div class="flex-1 w-full h-full overflow-hidden">
                <MonacoDiffEditor
                  originalContent={conflictDetail.our_content || ''}
                  modifiedContent={conflictDetail.their_content || ''}
                  filePath={selectedFile || ''}
                  viewMode="split"
                  fontSize={12}
                  minimap={false}
                />
              </div>
            </div>
          {:else if layoutMode === '3way'}
            <!-- 3-Way View: 3 Monaco Editors (Base | Ours | Theirs) -->
            <div class="flex-1 grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
              <!-- Base (Ancestor) -->
              <div class="flex flex-col overflow-hidden">
                <div class="h-8 px-3 bg-zinc-100/90 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] shrink-0">
                  <span class="font-bold text-zinc-600 dark:text-zinc-400">{localeState.t('workflows.conflictResolver.baseHeader')}</span>
                </div>
                <div class="flex-1 w-full h-full overflow-hidden">
                  <MonacoEditor
                    content={conflictDetail.base_content || ''}
                    filePath={selectedFile || ''}
                    readOnly={true}
                    minimap={false}
                    fontSize={11}
                  />
                </div>
              </div>

              <!-- Ours (Current HEAD) -->
              <div class="flex flex-col overflow-hidden">
                <div class="h-8 px-3 bg-cyan-100/60 dark:bg-cyan-950/40 border-b border-cyan-200 dark:border-cyan-800/30 flex items-center justify-between text-[11px] shrink-0">
                  <span class="font-bold text-cyan-800 dark:text-cyan-300">{localeState.t('workflows.conflictResolver.currentOursHeader')}</span>
                  <button
                    onclick={acceptAllOurs}
                    class="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-600/30 hover:bg-cyan-200 text-[10px] text-cyan-800 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-500/40 cursor-pointer"
                  >
                    {localeState.t('workflows.conflictResolver.takeAll')}
                  </button>
                </div>
                <div class="flex-1 w-full h-full overflow-hidden">
                  <MonacoEditor
                    content={conflictDetail.our_content || ''}
                    filePath={selectedFile || ''}
                    readOnly={true}
                    minimap={false}
                    fontSize={11}
                  />
                </div>
              </div>

              <!-- Theirs (Incoming) -->
              <div class="flex flex-col overflow-hidden">
                <div class="h-8 px-3 bg-amber-100/60 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/30 flex items-center justify-between text-[11px] shrink-0">
                  <span class="font-bold text-amber-800 dark:text-amber-300">{localeState.t('workflows.conflictResolver.incomingTheirsHeader')}</span>
                  <button
                    onclick={acceptAllTheirs}
                    class="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-600/30 hover:bg-amber-200 text-[10px] text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 cursor-pointer"
                  >
                    {localeState.t('workflows.conflictResolver.takeAll')}
                  </button>
                </div>
                <div class="flex-1 w-full h-full overflow-hidden">
                  <MonacoEditor
                    content={conflictDetail.their_content || ''}
                    filePath={selectedFile || ''}
                    readOnly={true}
                    minimap={false}
                    fontSize={11}
                  />
                </div>
              </div>
            </div>
          {:else}
            <!-- Per-Chunk Inspector View -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/40 dark:bg-zinc-950/40">
              <div class="text-xs text-zinc-500 flex items-center justify-between">
                <span>{localeState.t('workflows.conflictResolver.chunksListCount', { count: conflictChunks.length })}</span>
                <span class="font-mono text-[11px]">{localeState.t('workflows.conflictResolver.chunksResolvedRatio', { resolved: resolvedChunksCount, total: conflictChunks.length })}</span>
              </div>

              {#each conflictChunks as chunk, idx}
                {@const currentChoice = chunkChoices[chunk.chunk_index]}
                <div class="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-xs">
                  <!-- Chunk Header -->
                  <div class="px-3 py-2 bg-zinc-100/80 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-rose-600 dark:text-rose-400 font-mono">{localeState.t('workflows.conflictResolver.chunkTitle', { index: idx + 1 })}</span>
                      {#if currentChoice}
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1">
                          <Check class="w-2.5 h-2.5" />
                          {localeState.t('workflows.conflictResolver.chunkResolved', { choice: currentChoice })}
                        </span>
                      {:else}
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30">
                          {localeState.t('workflows.conflictResolver.chunkDefault')}
                        </span>
                      {/if}
                    </div>

                    <div class="flex items-center gap-1.5">
                      <button
                        onclick={() => applyChunkChoice(chunk.chunk_index, 'ours')}
                        class="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors {currentChoice === 'ours' || !currentChoice ? 'bg-cyan-600 text-white shadow-xs' : 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800/40'}"
                      >
                        {localeState.t('workflows.conflictResolver.takeOurs')}
                      </button>
                      <button
                        onclick={() => applyChunkChoice(chunk.chunk_index, 'theirs')}
                        class="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors {currentChoice === 'theirs' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/40'}"
                      >
                        {localeState.t('workflows.conflictResolver.takeTheirs')}
                      </button>
                      <button
                        onclick={() => applyChunkChoice(chunk.chunk_index, 'both-ours')}
                        class="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors {currentChoice === 'both-ours' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/40'}"
                      >
                        {localeState.t('workflows.conflictResolver.takeBoth')}
                      </button>
                      <button
                        onclick={() => handleAiResolveChunk(chunk)}
                        disabled={aiResolvingChunkIdx === chunk.chunk_index}
                        class="px-2.5 py-1 rounded text-[11px] font-medium bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                        title={localeState.t('workflows.conflictResolver.aiChunkTooltip')}
                      >
                        {#if aiResolvingChunkIdx === chunk.chunk_index}
                          <RefreshCw class="w-3 h-3 animate-spin" />
                        {:else}
                          <Sparkles class="w-3 h-3 text-amber-300" />
                        {/if}
                        <span>AI</span>
                      </button>
                    </div>
                  </div>

                  <!-- Chunk Diff Content -->
                  <div class="grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800 text-[11px] font-mono leading-relaxed">
                    <div class="p-2.5 bg-cyan-50/15 dark:bg-cyan-950/10 overflow-x-auto select-text">
                      <div class="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold mb-1 uppercase tracking-wide">Ours:</div>
                      <pre class="whitespace-pre text-cyan-950 dark:text-cyan-100">{chunk.our_content || '(Empty)'}</pre>
                    </div>
                    <div class="p-2.5 bg-amber-50/15 dark:bg-amber-950/10 overflow-x-auto select-text">
                      <div class="text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-1 uppercase tracking-wide">Theirs:</div>
                      <pre class="whitespace-pre text-amber-950 dark:text-amber-100">{chunk.their_content || '(Empty)'}</pre>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Bottom Half: Monaco Editor (Final Output Result - 100% Clean Valid Code) -->
        <div class="h-1/2 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-900/30">
          <!-- Toolbar above Monaco -->
          <div class="h-9 px-4 bg-zinc-100/90 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs shrink-0 select-none">
            <div class="flex items-center gap-2">
              <Code2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span class="font-bold text-emerald-700 dark:text-emerald-400">{localeState.t('workflows.conflictResolver.resultHeader')}</span>
              <span class="text-zinc-500 text-[11px] hidden sm:inline">{localeState.t('workflows.conflictResolver.resultSubheader')}</span>
            </div>

            <!-- Global Quick Buttons -->
            <div class="flex items-center gap-1.5">
              <button
                onclick={acceptAllOurs}
                class="px-2 py-1 rounded bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-[10px] font-medium text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/40 cursor-pointer transition-colors"
                title={localeState.t('workflows.conflictResolver.allOursTooltip')}
              >
                {localeState.t('workflows.conflictResolver.takeAllOurs')}
              </button>
              <button
                onclick={acceptAllTheirs}
                class="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-[10px] font-medium text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 cursor-pointer transition-colors"
                title={localeState.t('workflows.conflictResolver.allTheirsTooltip')}
              >
                {localeState.t('workflows.conflictResolver.takeAllTheirs')}
              </button>
              <button
                onclick={acceptAllBoth}
                class="px-2 py-1 rounded bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-[10px] font-medium text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 cursor-pointer transition-colors"
                title={localeState.t('workflows.conflictResolver.allBothTooltip')}
              >
                {localeState.t('workflows.conflictResolver.takeAllBoth')}
              </button>
              <button
                onclick={resetToOurs}
                class="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 cursor-pointer flex items-center gap-1 transition-colors"
                title={localeState.t('workflows.conflictResolver.resetTooltip')}
              >
                <Undo2 class="w-3 h-3" />
                <span>{localeState.t('workflows.conflictResolver.resetBtn')}</span>
              </button>
              <button
                onclick={insertGitConflictMarkers}
                class="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] text-zinc-500 hover:text-rose-600 border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-colors hidden md:inline"
                title={localeState.t('workflows.conflictResolver.rawGitMarkersTooltip')}
              >
                {localeState.t('workflows.conflictResolver.rawGitMarkers')}
              </button>
            </div>
          </div>

          <!-- Monaco Editor Component Container -->
          <div class="flex-1 w-full h-full overflow-hidden">
            <MonacoEditor
              content={resolvedText}
              filePath={selectedFile || ''}
              readOnly={false}
              minimap={false}
              wordWrap="on"
              fontSize={12}
              onChange={(newVal) => {
                resolvedText = newVal;
              }}
              onSave={handleStage}
            />
          </div>
        </div>
      {:else}
        <!-- Empty Selection View -->
        <div class="flex-1 flex flex-col items-center justify-center text-zinc-400 text-xs p-6 space-y-2">
          <FileCode class="w-12 h-12 opacity-30 text-zinc-400" />
          <p class="font-medium">{localeState.t('workflows.conflictResolver.emptyPrompt')}</p>
          <p class="text-[11px] text-zinc-500">{localeState.t('workflows.conflictResolver.emptyHint')}</p>
        </div>
      {/if}
    </div>
  </div>
</div>
