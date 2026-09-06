<script lang="ts">
  import {
    FileText,
    CheckCircle,
    Eye,
    Plus,
    Send,
  } from 'lucide-svelte';
  import type { GitHubPRComment, GitHubPRFile, GitHubPullRequest } from '../../types';
  import {
    getFileStatusBadge,
    parsePatchLines,
    parseSplitDiffRows,
  } from './prDiffUtils';

  interface Props {
    selectedPR: GitHubPullRequest;
    prFiles: GitHubPRFile[];
    prComments: GitHubPRComment[];
    selectedFileIndex: number;
    viewedFiles: Record<string, boolean>;
    diffMode: 'unified' | 'split';
    inlineCommentLine: { file: string; line: number } | null;
    inlineCommentText: string;
    isPostingComment: boolean;
    onSelectFile: (index: number) => void;
    onToggleFileViewed: (filename: string) => void;
    onDiffModeChange: (mode: 'unified' | 'split') => void;
    onOpenInlineComment: (file: string, line: number) => void;
    onCloseInlineComment: () => void;
    onPostInlineComment: () => void;
  }

  let {
    selectedPR,
    prFiles = [],
    prComments = [],
    selectedFileIndex = $bindable(0),
    viewedFiles,
    diffMode = $bindable('unified'),
    inlineCommentLine = $bindable(null),
    inlineCommentText = $bindable(''),
    isPostingComment = false,
    onSelectFile,
    onToggleFileViewed,
    onDiffModeChange,
    onOpenInlineComment,
    onCloseInlineComment,
    onPostInlineComment,
  }: Props = $props();

  // Resizable Files Sidebar State
  let filesSidebarWidth = $state(280);
  let isResizingFiles = $state(false);

  function handleStartResizeFiles(e: MouseEvent) {
    e.preventDefault();
    isResizingFiles = true;
    const startX = e.clientX;
    const startWidth = filesSidebarWidth;

    function onMouseMove(moveEvent: MouseEvent) {
      const delta = moveEvent.clientX - startX;
      filesSidebarWidth = Math.max(200, Math.min(520, startWidth + delta));
    }

    function onMouseUp() {
      isResizingFiles = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function isFileViewed(prNumber: number, filename: string): boolean {
    return !!viewedFiles[`${prNumber}:${filename}`];
  }

  function getLineComments(filePath: string, line: number) {
    return prComments.filter((c) => c.path === filePath && c.line === line);
  }
</script>

<div class="flex-1 flex overflow-hidden">
  <!-- Modified Files Sidebar (Resizable) -->
  <div
    style="width: {filesSidebarWidth}px;"
    class="border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto bg-zinc-50/60 dark:bg-zinc-950/40 divide-y divide-zinc-200/60 dark:divide-zinc-900/60 shrink-0"
  >
    <div class="p-2.5 bg-zinc-100/60 dark:bg-zinc-900/40 border-b border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
      <span>Tệp thay đổi</span>
      <span class="px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
        {prFiles.length}
      </span>
    </div>

    {#each prFiles as file, idx (file.filename)}
      {@const isSelected = selectedFileIndex === idx}
      {@const badge = getFileStatusBadge(file)}
      {@const parts = file.filename.split('/')}
      {@const basename = parts.pop() || file.filename}
      {@const dirname = parts.join('/')}
      {@const isViewed = isFileViewed(selectedPR.number, file.filename)}
      <div class="flex items-center w-full transition-colors {isSelected ? 'bg-violet-50 dark:bg-violet-950/50 border-l-3 border-violet-600 shadow-xs' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900/40 border-l-3 border-transparent'} {isViewed ? 'opacity-60' : ''}">
        <button
          type="button"
          onclick={() => onSelectFile(idx)}
          class="p-2.5 text-left text-xs transition-colors cursor-pointer flex items-center justify-between gap-2.5 min-w-0 flex-1"
          title={file.filename}
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 border {badge.bg} {badge.text} {badge.border}">
              {badge.label}
            </span>
            <div class="min-w-0 flex-1 leading-tight">
              <div class="font-mono text-xs truncate font-medium {isSelected ? 'text-violet-950 dark:text-violet-100 font-semibold' : 'text-zinc-800 dark:text-zinc-200'}">
                {basename}
              </div>
              {#if dirname}
                <div class="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                  {dirname}/
                </div>
              {/if}
            </div>
          </div>

          <div class="flex items-center gap-1 text-[10px] font-mono shrink-0">
            {#if file.additions > 0}
              <span class="text-emerald-600 dark:text-emerald-400 font-semibold">+{file.additions}</span>
            {/if}
            {#if file.deletions > 0}
              <span class="text-rose-600 dark:text-rose-400 font-semibold">-{file.deletions}</span>
            {/if}
          </div>
        </button>

        <!-- Mark as Viewed Checkbox -->
        <button
          type="button"
          onclick={() => onToggleFileViewed(file.filename)}
          class="p-1.5 mr-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer shrink-0 transition-colors"
          title={isViewed ? 'Bỏ đánh dấu đã xem' : 'Đánh dấu đã xem'}
        >
          {#if isViewed}
            <CheckCircle class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/60" />
          {:else}
            <div class="w-3.5 h-3.5 rounded border border-zinc-300 dark:border-zinc-700 hover:border-emerald-500"></div>
          {/if}
        </button>
      </div>
    {/each}
  </div>

  <!-- Vertical Splitter between File List & Diff -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    role="separator"
    aria-orientation="vertical"
    onmousedown={handleStartResizeFiles}
    class="w-1.5 hover:w-2 bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-violet-500 active:bg-violet-600 cursor-col-resize transition-all shrink-0 flex items-center justify-center select-none {isResizingFiles ? 'bg-violet-600 w-2' : ''}"
    title="Kéo để thay đổi độ rộng danh sách tệp"
  ></div>

  <!-- Diff Content & Inline Commenting -->
  <div class="flex-1 overflow-y-auto p-4 font-mono text-xs select-text">
    {#if prFiles[selectedFileIndex]}
      {@const activeFile = prFiles[selectedFileIndex]}
      {@const parsedLines = activeFile.patch ? parsePatchLines(activeFile.patch) : []}
      {@const splitRows = activeFile.patch ? parseSplitDiffRows(activeFile.patch) : []}
      {@const activeViewed = isFileViewed(selectedPR.number, activeFile.filename)}
      <div class="mb-3 flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800 gap-3 flex-wrap">
        <div class="flex items-center gap-2 min-w-0">
          <FileText class="w-4 h-4 text-violet-500 shrink-0" />
          <span class="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs truncate">{activeFile.filename}</span>
        </div>

        <div class="flex items-center gap-2 text-xs shrink-0">
          <!-- Diff Mode Toggle: Unified vs Split -->
          <div class="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onclick={() => onDiffModeChange('unified')}
              class="px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer {diffMode === 'unified' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
              Unified
            </button>
            <button
              type="button"
              onclick={() => onDiffModeChange('split')}
              class="px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer {diffMode === 'split' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
              Split (2 cột)
            </button>
          </div>

          <!-- Mark as Viewed Button -->
          <button
            type="button"
            onclick={() => onToggleFileViewed(activeFile.filename)}
            class="px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer {activeViewed ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-emerald-500'}"
          >
            {#if activeViewed}
              <CheckCircle class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Đã xem tệp</span>
            {:else}
              <Eye class="w-3.5 h-3.5" />
              <span>Đánh dấu đã xem</span>
            {/if}
          </button>

          <span class="px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            +{activeFile.additions} dòng
          </span>
          <span class="px-2 py-0.5 rounded-full text-[11px] font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            -{activeFile.deletions} dòng
          </span>
        </div>
      </div>

      {#if parsedLines.length > 0}
        {#if diffMode === 'split'}
          <!-- Split Diff (Side-by-side) View -->
          <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
            {#each splitRows as row, rIdx (rIdx)}
              {#if row.isHeader}
                <div class="px-3 py-1.5 bg-zinc-100/90 dark:bg-zinc-900/90 border-y border-zinc-200 dark:border-zinc-800 text-cyan-800 dark:text-cyan-400 text-[11px] font-mono font-medium flex items-center gap-2 select-none">
                  <span class="px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold">Hunk</span>
                  <span>{row.headerContent}</span>
                </div>
              {:else}
                <div class="grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800 border-b border-zinc-100 dark:border-zinc-900/50 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors">
                  <!-- Left Column: Old Lines / Deletions -->
                  <div class="flex items-center text-[11px] font-mono min-h-[1.5rem] {row.left?.type === 'del' ? 'bg-rose-500/10 text-rose-950 dark:text-rose-200' : 'text-zinc-800 dark:text-zinc-300'}">
                    <span class="w-10 px-1.5 py-0.5 text-right text-zinc-400 dark:text-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/40 select-none shrink-0 border-r border-zinc-200/60 dark:border-zinc-800/60 text-[10px]">
                      {row.left?.lineNumber ?? ''}
                    </span>
                    <span class="w-4 text-center font-bold shrink-0 select-none {row.left?.type === 'del' ? 'text-rose-600 dark:text-rose-400' : 'text-transparent'}">
                      {row.left?.type === 'del' ? '-' : ' '}
                    </span>
                    <span class="px-2 py-0.5 whitespace-pre-wrap break-all select-text leading-relaxed flex-1">
                      {row.left?.content ?? ''}
                    </span>
                  </div>

                  <!-- Right Column: New Lines / Additions -->
                  <div class="flex items-center text-[11px] font-mono min-h-[1.5rem] {row.right?.type === 'add' ? 'bg-emerald-500/10 text-emerald-950 dark:text-emerald-200' : 'text-zinc-800 dark:text-zinc-300'}">
                    <span class="w-10 px-1.5 py-0.5 text-right text-zinc-400 dark:text-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/40 select-none shrink-0 border-r border-zinc-200/60 dark:border-zinc-800/60 text-[10px]">
                      {row.right?.lineNumber ?? ''}
                    </span>
                    <span class="w-4 text-center font-bold shrink-0 select-none {row.right?.type === 'add' ? 'text-emerald-600 dark:text-emerald-400' : 'text-transparent'}">
                      {row.right?.type === 'add' ? '+' : ' '}
                    </span>
                    <span class="px-2 py-0.5 whitespace-pre-wrap break-all select-text leading-relaxed flex-1">
                      {row.right?.content ?? ''}
                    </span>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {:else}
          <!-- Unified Diff View -->
          <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
            {#each parsedLines as line, lIdx (lIdx)}
              {@const isAdd = line.type === 'add'}
              {@const isDel = line.type === 'del'}
              {@const isHeader = line.type === 'header'}
              {@const commentTargetLine = line.newLineNumber || line.oldLineNumber || 0}
              {@const lineComments = commentTargetLine > 0 ? getLineComments(activeFile.filename, commentTargetLine) : []}

              {#if isHeader}
                <div class="px-3 py-1.5 bg-zinc-100/90 dark:bg-zinc-900/90 border-y border-zinc-200 dark:border-zinc-800 text-cyan-800 dark:text-cyan-400 text-[11px] font-mono font-medium flex items-center gap-2 select-none">
                  <span class="px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold">Hunk</span>
                  <span>{line.content}</span>
                </div>
              {:else}
                <div class="group flex flex-col {isAdd ? 'bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 border-l-2 border-emerald-500' : isDel ? 'bg-rose-500/10 text-rose-950 dark:text-rose-200 border-l-2 border-rose-500' : 'text-zinc-800 dark:text-zinc-300 border-l-2 border-transparent'} hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70 transition-colors">
                  <div class="flex items-center pr-3">
                    <!-- Dual Line Numbers: Old Line | New Line -->
                    <div class="flex items-center text-[10px] font-mono select-none shrink-0 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
                      <span class="w-10 px-1.5 py-0.5 text-right text-zinc-400 dark:text-zinc-600">
                        {line.oldLineNumber ?? ''}
                      </span>
                      <span class="w-10 px-1.5 py-0.5 text-right text-zinc-400 dark:text-zinc-600 border-l border-zinc-200/60 dark:border-zinc-800/60">
                        {line.newLineNumber ?? ''}
                      </span>
                    </div>

                    <!-- Prefix indicator (+, -, space) -->
                    <span class="w-5 text-center font-mono font-bold select-none shrink-0 {isAdd ? 'text-emerald-600 dark:text-emerald-400' : isDel ? 'text-rose-600 dark:text-rose-400' : 'text-transparent'}">
                      {isAdd ? '+' : isDel ? '-' : ' '}
                    </span>

                    <!-- Code Content -->
                    <span class="px-2 py-0.5 flex-1 whitespace-pre-wrap break-all select-text font-mono leading-relaxed">
                      {line.content}
                    </span>

                    <!-- Inline Comment trigger button -->
                    {#if commentTargetLine > 0}
                      <button
                        onclick={() => onOpenInlineComment(activeFile.filename, commentTargetLine)}
                        class="opacity-0 group-hover:opacity-100 p-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white transition-opacity cursor-pointer ml-2 shadow-xs"
                        title="Thêm bình luận tại dòng {commentTargetLine}"
                      >
                        <Plus class="w-3 h-3" />
                      </button>
                    {/if}
                  </div>

                  <!-- Existing Inline Comments on this line -->
                  {#if lineComments.length > 0}
                    <div class="ml-24 p-2.5 bg-zinc-50 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
                      {#each lineComments as c (c.id)}
                        <div class="text-[11px]">
                          <span class="font-semibold text-cyan-700 dark:text-cyan-300">@{c.user.login}:</span>
                          <span class="text-zinc-800 dark:text-zinc-200 ml-1">{c.body}</span>
                        </div>
                      {/each}
                    </div>
                  {/if}

                  <!-- Inline Comment Box if active on this line -->
                  {#if inlineCommentLine?.file === activeFile.filename && inlineCommentLine?.line === commentTargetLine}
                    <div class="ml-24 p-3 bg-zinc-50 dark:bg-zinc-900 border-t border-violet-200 dark:border-violet-800/40 space-y-2">
                      <textarea
                        bind:value={inlineCommentText}
                        placeholder="Nhập nhận xét của bạn trên dòng {commentTargetLine}..."
                        rows={2}
                        class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none font-sans"
                      ></textarea>
                      <div class="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onclick={onCloseInlineComment}
                          class="px-2.5 py-1 rounded text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onclick={onPostInlineComment}
                          disabled={isPostingComment || !inlineCommentText.trim()}
                          class="px-3 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Send class="w-3 h-3" />
                          <span>Gửi nhận xét</span>
                        </button>
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        {/if}
      {:else}
        <div class="p-6 text-center text-zinc-400 dark:text-zinc-500">
          Tệp nhị phân hoặc không có diff chi tiết.
        </div>
      {/if}
    {/if}
  </div>
</div>
