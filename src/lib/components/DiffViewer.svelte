<script lang="ts">
  import type { DiffLine, FileDiffDetail } from '../types';
  import MonacoDiffEditor from './MonacoDiffEditor.svelte';
  import {
    Columns2,
    AlignJustify,
    Plus,
    Minus,
    Trash2,
    FileCode,
    Check,
    Binary,
    Copy,
    Sparkles,
    ListOrdered,
  } from 'lucide-svelte';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    diffDetail: FileDiffDetail | null;
    isLoading?: boolean;
    ignoreWhitespace?: boolean;
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
    onToggleIgnoreWhitespace,
    onStageHunk,
    onUnstageHunk,
    onStageFile,
    onUnstageFile,
    onDiscardFile,
  }: Props = $props();

  // Diff view mode: 'unified' | 'split' (side-by-side)
  let viewMode = $state<'unified' | 'split'>('unified');
  // Diff engine: 'monaco' (VS Code rich engine) | 'hunks' (interactive staging)
  let diffEngine = $state<'monaco' | 'hunks'>('monaco');
</script>



<div class="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 select-text overflow-hidden font-mono text-xs">
  <!-- Diff Toolbar -->
  <div class="h-10 px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-900/60 flex items-center justify-between select-none shrink-0">
    <div class="flex items-center gap-2 truncate">
      <FileCode class="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
      {#if diffDetail}
        <span class="font-bold text-zinc-900 dark:text-zinc-100 truncate">{diffDetail.path}</span>
        {#if diffDetail.old_path}
          <span class="text-zinc-500 text-[11px] truncate">renamed from {diffDetail.old_path}</span>
        {/if}

        <div class="flex items-center gap-1.5 ml-2 text-[11px] font-mono">
          {#if diffDetail.additions > 0}
            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">+{diffDetail.additions}</span>
          {/if}
          {#if diffDetail.deletions > 0}
            <span class="text-rose-600 dark:text-rose-400 font-semibold">-{diffDetail.deletions}</span>
          {/if}
        </div>
      {:else}
        <span class="text-zinc-400 dark:text-zinc-500 italic">No file selected</span>
      {/if}
    </div>

    <!-- Actions & View Mode Switcher -->
    {#if diffDetail}
      <div class="flex items-center gap-2 select-none">
        <!-- Engine Switcher: Monaco (VS Code) vs Hunk Staging -->
        <div class="flex items-center bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 text-xs">
          <button
            onclick={() => (diffEngine = 'monaco')}
            class="px-2 py-0.5 rounded flex items-center gap-1 text-[11px] transition-colors cursor-pointer {diffEngine === 'monaco' ? 'bg-white dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-zinc-200 dark:border-cyan-800/60 font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            title="Monaco VS Code Rich Diff (Syntax highlighting & Minimap)"
          >
            <Sparkles class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>VS Code</span>
          </button>
          <button
            onclick={() => (diffEngine = 'hunks')}
            class="px-2 py-0.5 rounded flex items-center gap-1 text-[11px] transition-colors cursor-pointer {diffEngine === 'hunks' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            title="Hunk Staging Mode (Interactive staging)"
          >
            <ListOrdered class="w-3 h-3" />
            <span>Hunks</span>
          </button>
        </div>

        <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800"></div>

        <!-- Mode Switcher -->
        <div class="flex items-center bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 text-xs">
          <button
            onclick={() => (viewMode = 'unified')}
            class="px-2 py-0.5 rounded flex items-center gap-1 text-[11px] transition-colors cursor-pointer {viewMode === 'unified' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            title="Unified View"
          >
            <AlignJustify class="w-3 h-3" />
            <span>Unified</span>
          </button>
          <button
            onclick={() => (viewMode = 'split')}
            class="px-2 py-0.5 rounded flex items-center gap-1 text-[11px] transition-colors cursor-pointer {viewMode === 'split' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            title="Side-by-Side Split View"
          >
            <Columns2 class="w-3 h-3" />
            <span>Split</span>
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
          class="px-2 py-0.5 rounded-lg flex items-center gap-1 text-[11px] transition-colors cursor-pointer border {ignoreWhitespace ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 font-medium' : 'bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          title="Bỏ qua khoảng trắng và định dạng ký tự xuống dòng (Ignore Whitespace & Line Endings - CRLF/LF)"
        >
          <span>Ignore Space</span>
        </button>

        <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800"></div>

        <!-- Quick Stage / Unstage / Discard File -->
        {#if diffDetail.is_staged}
          <button
            onclick={onUnstageFile}
            class="px-2.5 py-1 rounded bg-white dark:bg-zinc-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 hover:text-amber-800 dark:hover:text-amber-300 hover:border-amber-300 dark:hover:border-amber-700/50 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 text-[11px] flex items-center gap-1 cursor-pointer transition-all"
          >
            <Minus class="w-3 h-3 text-amber-500 dark:text-amber-400" />
            <span>Unstage File</span>
          </button>
        {:else}
          <button
            onclick={onStageFile}
            class="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-1 font-medium cursor-pointer transition-all"
          >
            <Plus class="w-3 h-3" />
            <span>Stage File</span>
          </button>
          <button
            onclick={onDiscardFile}
            class="p-1 rounded bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-[11px] cursor-pointer transition-all"
            title="Safe Discard File (48h protected)"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Diff Content Area -->
  <div class="flex-1 overflow-auto">
    {#if isLoading}
      <div class="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
        <div class="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
        <span class="text-xs">Generating deep interactive diff...</span>
      </div>
    {:else if !diffDetail}
      <div class="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 gap-3 select-none">
        <FileCode class="w-12 h-12 opacity-30 stroke-[1.5]" />
        <div class="text-center">
          <p class="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Select a file from the Working Tree</p>
          <p class="text-[11px] text-zinc-400 dark:text-zinc-600 mt-0.5">Interactive line and hunk staging will appear here</p>
        </div>
      </div>
    {:else if diffDetail.is_binary}
      <div class="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 select-none">
        <Binary class="w-10 h-10 text-cyan-600 dark:text-cyan-400 opacity-60" />
        <span class="text-xs font-medium text-zinc-700 dark:text-zinc-300">Binary file changes cannot be displayed as text</span>
      </div>
    {:else if diffDetail.hunks.length === 0}
      <div class="h-full flex flex-col items-center justify-center text-zinc-500 gap-2 select-none">
        <Check class="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        <span class="text-xs text-zinc-600 dark:text-zinc-400">No differences found</span>
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
              <div class="flex items-center gap-1.5 opacity-80 group-hover/hunk:opacity-100 transition-opacity">
                {#if diffDetail.is_staged}
                  <button
                    onclick={() => onUnstageHunk?.(hunk.hunk_index)}
                    class="px-2 py-0.5 rounded bg-white dark:bg-zinc-900/80 hover:bg-amber-100 dark:hover:bg-amber-950/80 hover:text-amber-800 dark:hover:text-amber-300 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Minus class="w-2.5 h-2.5 text-amber-500 dark:text-amber-400" />
                    <span>Unstage Hunk</span>
                  </button>
                {:else}
                  <button
                    onclick={() => onStageHunk?.(hunk.hunk_index)}
                    class="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[10px] flex items-center gap-1 font-medium cursor-pointer transition-colors"
                  >
                    <Plus class="w-2.5 h-2.5" />
                    <span>Stage Hunk</span>
                  </button>
                {/if}
              </div>
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
                            title="Unstage hunk chứa dòng này"
                          >
                            <Minus class="w-2.5 h-2.5" />
                            <span>Unstage</span>
                          </button>
                        {:else}
                          <button
                            onclick={(e) => {
                              e.stopPropagation();
                              onStageHunk?.(hunk.hunk_index);
                            }}
                            class="px-1 py-0.5 text-[9px] rounded bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center gap-0.5 cursor-pointer font-medium"
                            title="Stage hunk chứa dòng này"
                          >
                            <Plus class="w-2.5 h-2.5" />
                            <span>Stage</span>
                          </button>
                        {/if}
                      {/if}

                      <button
                        onclick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(line.content);
                          toast.info('Copied', 'Đã sao chép nội dung dòng code.');
                        }}
                        class="p-0.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        title="Sao chép dòng code"
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
