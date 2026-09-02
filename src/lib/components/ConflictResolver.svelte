<script lang="ts">
  import type { ConflictFileDetail } from '../types';
  import {
    Split,
    CheckCircle,
    FileCode,
    AlertTriangle,
    Save,
    RotateCcw,
    Play
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

  // Svelte 5 runes for local state
  let resolvedText = $state<string>('');

  $effect(() => {
    if (conflictDetail) {
      if (conflictDetail.chunks.length > 0) {
        let initial = '';
        for (const chunk of conflictDetail.chunks) {
          if (chunk.is_conflict) {
            initial += `<<<<<<< OURS\n${chunk.our_content}\n=======\n${chunk.their_content}\n>>>>>>> THEIRS\n`;
          } else {
            initial += chunk.our_content + '\n';
          }
        }
        resolvedText = initial.trimEnd();
      } else {
        resolvedText = conflictDetail.our_content;
      }
    }
  });



  function acceptOurs() {
    if (!conflictDetail) return;
    resolvedText = conflictDetail.our_content;
  }

  function acceptTheirs() {
    if (!conflictDetail) return;
    resolvedText = conflictDetail.their_content;
  }

  function acceptBoth() {
    if (!conflictDetail) return;
    resolvedText = `${conflictDetail.our_content}\n${conflictDetail.their_content}`;
  }

  function acceptBase() {
    if (!conflictDetail) return;
    resolvedText = conflictDetail.base_content;
  }

</script>

<div class="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 overflow-hidden font-sans select-none">
  <!-- Top Conflict Header Toolbar -->
  <header class="h-12 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-900/60 px-4 flex items-center justify-between shrink-0">
    <div class="flex items-center gap-3">
      <div class="p-1.5 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
        <Split class="w-4 h-4" />
      </div>
      <div>
        <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          3-Way Merge Conflict Visual Resolver
          <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 font-semibold">
            {conflictedFiles.length} conflicted file{conflictedFiles.length !== 1 ? 's' : ''}
          </span>
        </h2>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        onclick={onAbortMerge}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 text-xs text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-transparent transition-colors cursor-pointer"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span>Abort Merge / Rebase</span>
      </button>

      {#if isRebasing && onContinueRebase}
        <button
          onclick={onContinueRebase}
          disabled={isLoading || conflictedFiles.length > 0}
          class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          title={conflictedFiles.length > 0 ? 'Vui lòng giải quyết hết các file conflict trước khi tiếp tục' : 'Tiếp tục chu trình rebase'}
        >
          <Play class="w-3.5 h-3.5 fill-current" />
          <span>Continue Rebase</span>
        </button>
      {/if}

      <button
        onclick={() => onResolveAndStage(resolvedText)}
        disabled={isLoading || !selectedFile}
        class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
      >
        <Save class="w-3.5 h-3.5" />
        <span>Mark Resolved & Stage</span>
      </button>

      <button
        onclick={onClose}
        class="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-transparent text-xs transition-colors cursor-pointer"
      >
        ✕
      </button>
    </div>
  </header>

  <!-- Main Area: Conflicted Files List (Left) + 4-Pane Resolution Grid (Right) -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Left: Conflicted File Tabs -->
    <aside class="w-64 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-950/80 flex flex-col shrink-0">
      <div class="p-3 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        Conflicted Files
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        {#if conflictedFiles.length === 0}
          <div class="p-4 text-center text-xs text-emerald-600 dark:text-emerald-400 space-y-3">
            <CheckCircle class="w-6 h-6 mx-auto mb-1 opacity-80" />
            <p>All conflicts resolved!</p>
            {#if isRebasing && onContinueRebase}
              <button
                onclick={onContinueRebase}
                class="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md cursor-pointer transition-all"
              >
                Continue Rebase
              </button>
            {/if}
          </div>
        {:else}
          {#each conflictedFiles as file}
            <button
              onclick={() => onSelectFile(file)}
              class="w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors {selectedFile === file ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 font-medium' : 'text-zinc-700 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-900'}"
            >
              <span class="truncate">{file}</span>
              <AlertTriangle class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 ml-1" />
            </button>
          {/each}
        {/if}
      </div>
    </aside>

    <!-- Right: 4-Pane Split Layout (Base | Ours | Theirs -> Result) -->
    <div class="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
      {#if isLoading}
        <div class="flex-1 flex items-center justify-center text-xs text-zinc-500">
          Loading 3-way conflict data...
        </div>
      {:else if conflictDetail}
        <!-- Top 3 Panes: Base (Ancestor) | Ours (Current) | Theirs (Incoming) -->
        <div class="h-1/2 grid grid-cols-3 border-b border-zinc-200 dark:border-zinc-800 divide-x divide-zinc-200 dark:divide-zinc-800">
          <!-- 1. BASE (Ancestor) -->
          <div class="flex flex-col overflow-hidden bg-zinc-50/70 dark:bg-zinc-950/40">
            <div class="h-8 px-3 bg-zinc-100 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px]">
              <span class="font-bold text-zinc-600 dark:text-zinc-400">1. Base (Ancestor)</span>
              <button
                onclick={acceptBase}
                class="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-transparent text-[10px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Accept Base
              </button>
            </div>
            <pre class="flex-1 p-3 text-[11px] font-mono text-zinc-700 dark:text-zinc-400 overflow-auto whitespace-pre leading-relaxed select-text">{conflictDetail.base_content || '(Empty in base)'}</pre>
          </div>

          <!-- 2. OURS (Current Branch) -->
          <div class="flex flex-col overflow-hidden bg-cyan-50/40 dark:bg-cyan-950/10">
            <div class="h-8 px-3 bg-cyan-100/60 dark:bg-cyan-950/30 border-b border-cyan-200 dark:border-cyan-800/30 flex items-center justify-between text-[11px]">
              <span class="font-bold text-cyan-800 dark:text-cyan-400">2. Current / Ours (HEAD)</span>
              <button
                onclick={acceptOurs}
                class="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-600/30 hover:bg-cyan-200 dark:hover:bg-cyan-600/50 text-[10px] text-cyan-800 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-500/40 cursor-pointer transition-colors"
              >
                Accept Ours
              </button>
            </div>
            <pre class="flex-1 p-3 text-[11px] font-mono text-cyan-900 dark:text-cyan-200/90 bg-cyan-50/20 dark:bg-cyan-950/5 overflow-auto whitespace-pre leading-relaxed select-text">{conflictDetail.our_content || '(Empty in ours)'}</pre>
          </div>

          <!-- 3. THEIRS (Incoming Branch) -->
          <div class="flex flex-col overflow-hidden bg-amber-50/40 dark:bg-amber-950/10">
            <div class="h-8 px-3 bg-amber-100/60 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/30 flex items-center justify-between text-[11px]">
              <span class="font-bold text-amber-800 dark:text-amber-400">3. Incoming / Theirs</span>
              <button
                onclick={acceptTheirs}
                class="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-600/30 hover:bg-amber-200 dark:hover:bg-amber-600/50 text-[10px] text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 cursor-pointer transition-colors"
              >
                Accept Theirs
              </button>
            </div>
            <pre class="flex-1 p-3 text-[11px] font-mono text-amber-900 dark:text-amber-200/90 bg-amber-50/20 dark:bg-amber-950/5 overflow-auto whitespace-pre leading-relaxed select-text">{conflictDetail.their_content || '(Empty in theirs)'}</pre>
          </div>
        </div>

        <!-- Bottom Pane: 4. Final Merged Result (Interactive Editable Editor) -->
        <div class="h-1/2 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-900/20">
          <div class="h-9 px-4 bg-zinc-100/80 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="font-bold text-emerald-700 dark:text-emerald-400">4. Result (Final Output)</span>
              <span class="text-zinc-500 text-[11px]">• Directly editable preview</span>
            </div>

            <div class="flex items-center gap-2">
              <button
                onclick={acceptBoth}
                class="px-2.5 py-1 rounded bg-purple-100 dark:bg-zinc-800 hover:bg-purple-200 dark:hover:bg-zinc-700 text-[11px] text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 cursor-pointer transition-colors"
              >
                Accept Both (Ours then Theirs)
              </button>
            </div>
          </div>

          <textarea
            bind:value={resolvedText}
            class="flex-1 w-full p-4 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            placeholder="Merged result code goes here..."
            spellcheck="false"
          ></textarea>
        </div>
      {:else}
        <div class="flex-1 flex flex-col items-center justify-center text-zinc-500 text-xs">
          <FileCode class="w-8 h-8 mb-2 opacity-40" />
          Select a conflicted file from the list to begin 3-way visual resolution.
        </div>
      {/if}
    </div>
  </div>
</div>
