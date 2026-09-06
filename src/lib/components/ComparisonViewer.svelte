<script lang="ts">
  import type { ComparisonResult, FileChangeInfo } from '../types';
  import { getFileContent } from '../api';
  import MonacoDiffEditor from './MonacoDiffEditor.svelte';
  import {
    GitCompare,
    GitCommit,
    FileText,
    ArrowRight,
    ArrowLeftRight,
    X,
    Plus,
    Minus,
    Columns2,
    AlignJustify,
    FileCode,
    CheckCircle2,
    Search,
    Undo2,
  } from 'lucide-svelte';

  interface Props {
    comparison: ComparisonResult | null;
    isLoading: boolean;
    onClose: () => void;
    onSwap?: () => void;
    repoPath?: string;
  }

  let {
    comparison = null,
    isLoading = false,
    onClose,
    onSwap,
    repoPath = '',
  }: Props = $props();

  let selectedFile = $state<FileChangeInfo | null>(null);
  let originalContent = $state<string>('');
  let modifiedContent = $state<string>('');
  let isFileDiffLoading = $state<boolean>(false);
  let viewMode = $state<'split' | 'unified'>('split');
  let fileSearch = $state<string>('');

  let filteredFiles = $derived(
    comparison
      ? comparison.files_changed.filter((f) =>
          f.path.toLowerCase().includes(fileSearch.trim().toLowerCase())
        )
      : []
  );

  async function loadFileDiff(filePath: string, status: string) {
    if (!repoPath || !comparison) return;
    isFileDiffLoading = true;
    try {
      const basePromise =
        status === 'added'
          ? Promise.resolve({ content: '', is_binary: false, path: filePath, size_bytes: 0 })
          : getFileContent(repoPath, filePath, comparison.base_id).catch(() => ({
              content: '',
              is_binary: false,
              path: filePath,
              size_bytes: 0,
            }));

      const targetPromise =
        status === 'deleted'
          ? Promise.resolve({ content: '', is_binary: false, path: filePath, size_bytes: 0 })
          : getFileContent(repoPath, filePath, comparison.target_id).catch(() => ({
              content: '',
              is_binary: false,
              path: filePath,
              size_bytes: 0,
            }));

      const [baseRes, targetRes] = await Promise.all([basePromise, targetPromise]);
      originalContent = baseRes.content;
      modifiedContent = targetRes.content;
    } catch (err) {
      console.error('Failed to load comparison file diff:', err);
    } finally {
      isFileDiffLoading = false;
    }
  }

  $effect(() => {
    if (comparison) {
      if (comparison.files_changed.length > 0) {
        if (!selectedFile || !comparison.files_changed.some((f) => f.path === selectedFile?.path)) {
          selectedFile = comparison.files_changed[0];
        }
      } else {
        selectedFile = null;
        originalContent = '';
        modifiedContent = '';
      }
    }
  });

  $effect(() => {
    if (selectedFile && comparison) {
      loadFileDiff(selectedFile.path, selectedFile.status);
    }
  });

  function getStatusColor(status: string): string {
    switch (status) {
      case 'added':
        return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60';
      case 'deleted':
        return 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60';
      case 'modified':
        return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60';
      default:
        return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60';
    }
  }
</script>

<div class="h-full w-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden select-none">
  <!-- Top Comparison Header -->
  <header class="h-13 px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/80 dark:bg-zinc-900/70 backdrop-blur-md flex items-center justify-between shrink-0">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
        <GitCompare class="w-4 h-4" />
      </div>

      <div class="flex items-center gap-2 text-xs">
        <span class="font-bold text-zinc-900 dark:text-zinc-200">Offline PR Comparison</span>
        {#if comparison}
          <div class="flex items-center gap-1.5 font-mono px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 shadow-2xs">
            <span class="text-purple-600 dark:text-purple-400 font-semibold">{comparison.base_id.slice(0, 7)}</span>
            {#if onSwap}
              <button
                type="button"
                onclick={onSwap}
                class="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                title="Đảo chiều so sánh (Swap Base ⇆ Target)"
              >
                <ArrowLeftRight class="w-3.5 h-3.5" />
              </button>
            {:else}
              <ArrowRight class="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
            {/if}
            <span class="text-cyan-600 dark:text-cyan-400 font-semibold">{comparison.target_id.slice(0, 7)}</span>
          </div>

          <!-- Stats Badges -->
          {#if comparison.files_changed.length === 0}
            <div class="flex items-center gap-2 ml-2">
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5">
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Trùng khớp hoàn toàn (Identical)</span>
              </span>
              <span class="text-zinc-400 dark:text-zinc-600">•</span>
              <span class="text-zinc-600 dark:text-zinc-400 font-medium">0 files changed</span>
              <span class="text-zinc-400 dark:text-zinc-600">•</span>
              <span class="text-zinc-600 dark:text-zinc-400 font-medium">{comparison.commits_between.length} commits</span>
            </div>
          {:else}
            <div class="flex items-center gap-2 ml-2">
              <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-0.5">
                <Plus class="w-3 h-3" />
                {comparison.total_additions}
              </span>
              <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center gap-0.5">
                <Minus class="w-3 h-3" />
                {comparison.total_deletions}
              </span>
              <span class="text-zinc-400 dark:text-zinc-500">•</span>
              <span class="text-zinc-600 dark:text-zinc-400 font-medium">{comparison.files_changed.length} files changed</span>
              <span class="text-zinc-400 dark:text-zinc-500">•</span>
              <span class="text-zinc-600 dark:text-zinc-400 font-medium">{comparison.commits_between.length} commits</span>
            </div>
          {/if}
        {/if}
      </div>
    </div>

    <button
      onclick={onClose}
      class="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
      title="Đóng chế độ So sánh (Esc / Close)"
    >
      <X class="w-4 h-4" />
    </button>
  </header>

  <!-- Main Split Body -->
  <div class="flex-1 flex overflow-hidden">
    {#if isLoading}
      <div class="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2">
        <div class="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-xs">Đang tính toán chênh lệch (diff) giữa 2 commit...</span>
      </div>
    {:else if comparison}
      <!-- Left Panel: Changed Files & Commits List -->
      <aside class="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/80 flex flex-col shrink-0 overflow-hidden">
        <!-- Commits Between Accordion/List -->
        <div class="p-3 border-b border-zinc-200 dark:border-zinc-800/80">
          <span class="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <GitCommit class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            Commits ({comparison.commits_between.length})
          </span>
          {#if comparison.commits_between.length === 0}
            <div class="py-3 px-2 text-center rounded-lg bg-white/40 dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-zinc-800/80 text-xs text-zinc-400 dark:text-zinc-500">
              <GitCommit class="w-3.5 h-3.5 mx-auto mb-1 opacity-50 text-zinc-400" />
              <span>0 commit chênh lệch</span>
            </div>
          {:else}
            <div class="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
              {#each comparison.commits_between as c}
                <div class="p-1.5 rounded bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                  <span class="text-cyan-700 dark:text-cyan-400 font-semibold">{c.short_id}</span>
                  <span class="text-zinc-800 dark:text-zinc-300 font-sans truncate text-[11px]">{c.summary}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Files Changed List -->
        <div class="flex-1 flex flex-col overflow-hidden p-3">
          <span class="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 shrink-0">
            <FileText class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Files Changed ({comparison.files_changed.length})
          </span>

          {#if comparison.files_changed.length === 0}
            <div class="flex-1 flex flex-col items-center justify-center p-4 text-center">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
                <CheckCircle2 class="w-5 h-5" />
              </div>
              <p class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Không có tệp thay đổi</p>
              <p class="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
                Tất cả mã nguồn ở 2 điểm này đều đồng nhất 100%.
              </p>
            </div>
          {:else}
            {#if comparison.files_changed.length > 3}
              <div class="relative mb-2 shrink-0">
                <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  bind:value={fileSearch}
                  placeholder="Lọc tệp tin..."
                  class="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 transition-all"
                />
              </div>
            {/if}

            <div class="flex-1 overflow-y-auto space-y-1 pr-1">
              {#each filteredFiles as f}
                <button
                  onclick={() => (selectedFile = f)}
                  class="w-full text-left px-2.5 py-2 rounded-lg border transition-all flex items-center justify-between gap-2 cursor-pointer {selectedFile?.path === f.path ? 'bg-cyan-100 dark:bg-zinc-800/90 border-cyan-400 dark:border-cyan-500/50 text-cyan-950 dark:text-white font-medium shadow-xs' : 'bg-white/60 dark:bg-zinc-900/30 border-zinc-200/60 dark:border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900/70 text-zinc-700 dark:text-zinc-300'}"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold border {getStatusColor(f.status)}">
                      {f.status.slice(0, 1)}
                    </span>
                    <span class="text-xs truncate font-mono">{f.path}</span>
                  </div>

                  <div class="flex items-center gap-1 text-[11px] font-mono shrink-0">
                    {#if f.additions > 0}
                      <span class="text-emerald-600 dark:text-emerald-400">+{f.additions}</span>
                    {/if}
                    {#if f.deletions > 0}
                      <span class="text-rose-600 dark:text-rose-400">-{f.deletions}</span>
                    {/if}
                  </div>
                </button>
              {/each}
              {#if filteredFiles.length === 0 && fileSearch.trim()}
                <div class="text-center py-4 text-xs text-zinc-400">
                  Không tìm thấy tệp nào khớp "{fileSearch}"
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </aside>

      <!-- Right Panel: Full Monaco Diff Editor or Rich Empty State -->
      <main class="flex-1 bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">
        {#if comparison.files_changed.length === 0}
          <!-- Informative Empty State Card: Identical Code Trees -->
          <div class="flex-1 flex flex-col items-center justify-center p-8 text-center select-text">
            <div class="max-w-md w-full bg-zinc-50/70 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
              <!-- Glowing Emerald Icon -->
              <div class="relative w-14 h-14 mx-auto mb-4">
                <div class="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-md animate-pulse"></div>
                <div class="relative w-full h-full rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                  <CheckCircle2 class="w-7 h-7" />
                </div>
              </div>

              <!-- Title & Subtitle -->
              <h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
                Mã nguồn hoàn toàn đồng nhất (Identical Trees)
              </h3>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-5">
                Không có sự khác biệt nào giữa commit <code class="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-purple-600 dark:text-purple-400 font-semibold">{comparison.base_id.slice(0, 7)}</code> và <code class="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{comparison.target_id.slice(0, 7)}</code> (<strong class="text-emerald-600 dark:text-emerald-400">0 tệp thay đổi, +0 -0 dòng</strong>).
              </p>

              <!-- Detailed Explanation Callout -->
              <div class="bg-white/80 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3.5 text-left text-xs space-y-2.5 mb-6 shadow-2xs">
                <div class="flex items-start gap-2.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0"></span>
                  <div class="text-zinc-600 dark:text-zinc-300">
                    <strong class="text-zinc-900 dark:text-zinc-100 font-medium">Đã gộp hoàn tất (Merged):</strong> Toàn bộ thay đổi của nhánh này đã nằm trọn trong nhánh kia (ví dụ PR đã được merge thành công).
                  </div>
                </div>
                <div class="flex items-start gap-2.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                  <div class="text-zinc-600 dark:text-zinc-300">
                    <strong class="text-zinc-900 dark:text-zinc-100 font-medium">Cùng cây thư mục (Same Git Tree):</strong> Cây mã nguồn của hai mốc commit trùng khớp 100%.
                  </div>
                </div>
                <div class="flex items-start gap-2.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                  <div class="text-zinc-500 dark:text-zinc-400 text-[11px]">
                    <em>Mẹo:</em> Để xem các file mà nhánh đã sửa đổi trước khi merge, hãy so sánh với commit cha (trước thời điểm merge) hoặc click chọn trực tiếp commit đó trên Graph.
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-center gap-3">
                {#if onSwap}
                  <button
                    onclick={onSwap}
                    class="px-3.5 py-2 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/80 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                    title="Đổi chiều Base ⇆ Target"
                  >
                    <ArrowLeftRight class="w-3.5 h-3.5 text-zinc-500" />
                    <span>Đảo chiều so sánh</span>
                  </button>
                {/if}
                <button
                  onclick={onClose}
                  class="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/20"
                >
                  <Undo2 class="w-3.5 h-3.5" />
                  <span>Quay lại Đồ thị Commit</span>
                </button>
              </div>
            </div>
          </div>
        {:else if selectedFile}
          <!-- File Header & View Mode Switcher -->
          <div class="h-10 px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/70 dark:bg-zinc-900/60 flex items-center justify-between shrink-0 select-none">
            <div class="flex items-center gap-2 truncate">
              <FileCode class="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span class="font-bold text-xs font-mono text-zinc-900 dark:text-zinc-100 truncate">{selectedFile.path}</span>
              <span class="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold border {getStatusColor(selectedFile.status)}">
                {selectedFile.status}
              </span>

              <div class="flex items-center gap-1.5 ml-2 text-[11px] font-mono">
                {#if selectedFile.additions > 0}
                  <span class="text-emerald-600 dark:text-emerald-400 font-semibold">+{selectedFile.additions}</span>
                {/if}
                {#if selectedFile.deletions > 0}
                  <span class="text-rose-600 dark:text-rose-400 font-semibold">-{selectedFile.deletions}</span>
                {/if}
              </div>
            </div>

            <!-- View Mode Switcher: Split vs Unified -->
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
          </div>

          <!-- Monaco Diff Area -->
          <div class="flex-1 w-full h-full min-h-0 overflow-hidden relative">
            {#if isFileDiffLoading}
              <div class="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                <div class="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                <span class="text-xs">Đang tải nội dung tệp vào Monaco Diff Editor...</span>
              </div>
            {:else}
              <MonacoDiffEditor
                {originalContent}
                {modifiedContent}
                filePath={selectedFile.path}
                {viewMode}
              />
            {/if}
          </div>
        {:else}
          <div class="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 text-xs gap-2">
            <FileText class="w-8 h-8 text-zinc-300 dark:text-zinc-700 stroke-1" />
            <span>Chọn một tệp từ danh sách bên trái để xem diff chi tiết.</span>
          </div>
        {/if}
      </main>
    {/if}
  </div>
</div>
