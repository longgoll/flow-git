<script lang="ts">
  import { onMount } from 'svelte';
  import {
    FileDiff,
    X,
    Copy,
    Check,
    Download,
    Upload,
    AlertCircle,
    CheckCircle2,
    ShieldCheck,
    RefreshCw,
  } from 'lucide-svelte';
  import type { RepoState } from '../state/repoState.svelte';
  import type { PatchCheckResult } from '../types';
  import { exportCommitPatch, checkPatch, applyPatch } from '../api/repo';
  import { localeState } from '../state/localeState.svelte';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    repo: RepoState;
    initialMode?: 'export' | 'apply';
    initialCommitId?: string;
    onApplySuccess?: () => Promise<void>;
    onClose: () => void;
  }

  let {
    repo,
    initialMode = 'export',
    initialCommitId = '',
    onApplySuccess,
    onClose,
  }: Props = $props();

  let activeTab = $state<'apply' | 'export'>('export');
  let repoPath = $derived(repo.repoSummary?.path || '');

  // --- EXPORT STATE ---
  let selectedCommitId = $state<string>('');
  let exportPatchContent = $state<string>('');
  let isGeneratingExport = $state<boolean>(false);
  let isCopied = $state<boolean>(false);

  // --- APPLY STATE ---
  let applyPatchContent = $state<string>('');
  let stageToIndex = $state<boolean>(false);
  let applyReverse = $state<boolean>(false);
  let isChecking = $state<boolean>(false);
  let isApplying = $state<boolean>(false);
  let checkResult = $state<PatchCheckResult | null>(null);

  // Dropzone drag-over state
  let isDraggingFile = $state<boolean>(false);

  // Load export patch when commit changes or tab activates
  async function loadExportPatch() {
    if (!repoPath || !selectedCommitId) return;
    isGeneratingExport = true;
    try {
      exportPatchContent = await exportCommitPatch(repoPath, selectedCommitId);
    } catch (e: any) {
      toast.error(`Không thể tạo file patch: ${e?.message || e}`);
      exportPatchContent = '';
    } finally {
      isGeneratingExport = false;
    }
  }

  // Copy patch to clipboard
  async function handleCopy() {
    if (!exportPatchContent) return;
    try {
      await navigator.clipboard.writeText(exportPatchContent);
      isCopied = true;
      toast.success(localeState.t('patch.copied'));
      setTimeout(() => {
        isCopied = false;
      }, 2000);
    } catch (e) {
      toast.error('Không thể sao chép vào bộ nhớ tạm');
    }
  }

  // Save patch as file (Download blob)
  function handleSaveFile() {
    if (!exportPatchContent) return;
    try {
      const blob = new Blob([exportPatchContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const shortSha = selectedCommitId.slice(0, 7) || 'commit';
      a.href = url;
      a.download = `flowgit-${shortSha}.patch`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(localeState.t('patch.savedSuccess'));
    } catch (e: any) {
      toast.error(`Lỗi khi lưu file: ${e?.message || e}`);
    }
  }

  // Check patch validity
  let checkDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  function triggerCheckPatch(content: string) {
    if (checkDebounceTimer) clearTimeout(checkDebounceTimer);
    if (!content.trim() || !repoPath) {
      checkResult = null;
      return;
    }

    isChecking = true;
    checkDebounceTimer = setTimeout(async () => {
      try {
        checkResult = await checkPatch(repoPath, content);
      } catch (e: any) {
        checkResult = {
          can_apply: false,
          files: [],
          error_message: e?.message || String(e),
        };
      } finally {
        isChecking = false;
      }
    }, 300);
  }

  // Handle file drop
  function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    isDraggingFile = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      readFile(files[0]);
    }
  }

  // Handle file input change
  function handleFileInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      readFile(target.files[0]);
    }
  }

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        applyPatchContent = text;
        triggerCheckPatch(text);
      }
    };
    reader.readAsText(file);
  }

  // Apply patch execution
  async function handleApplyPatch() {
    if (!repoPath || !applyPatchContent.trim()) return;
    isApplying = true;
    try {
      const res = await applyPatch(repoPath, applyPatchContent, stageToIndex, applyReverse);
      if (res.success) {
        toast.success(localeState.t('patch.applySuccess', { count: res.files_applied.length }));
        if (onApplySuccess) {
          await onApplySuccess();
        }
        onClose();
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      toast.error(localeState.t('patch.applyFailed', { error: e?.message || e }));
    } finally {
      isApplying = false;
    }
  }

  onMount(() => {
    activeTab = initialMode;
    selectedCommitId = initialCommitId || repo.rawCommits[0]?.id || '';
    if (activeTab === 'export' && selectedCommitId) {
      loadExportPatch();
    }
  });

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'added':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'deleted':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'renamed':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      default:
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none font-sans"
  role="dialog"
  aria-modal="true"
>
  <div
    class="w-full max-w-4xl h-[84vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100"
  >
    <!-- Modal Header -->
    <div class="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-300 dark:border-indigo-700/60 text-indigo-600 dark:text-indigo-400 shadow-xs">
          <FileDiff class="w-5 h-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {localeState.t('patch.title')}
            </h2>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300/60 dark:border-indigo-700/60">
              {localeState.t('patch.badge')}
            </span>
          </div>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {localeState.t('patch.subtitle')}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Tab Selector -->
        <div class="flex items-center p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/60 border border-zinc-300/50 dark:border-zinc-700/50 text-xs">
          <button
            onclick={() => {
              activeTab = 'export';
              if (!exportPatchContent) loadExportPatch();
            }}
            class="px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer {activeTab === 'export' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}"
          >
            {localeState.t('patch.tabExport')}
          </button>
          <button
            onclick={() => (activeTab = 'apply')}
            class="px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer {activeTab === 'apply' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}"
          >
            {localeState.t('patch.tabApply')}
          </button>
        </div>

        <button
          onclick={onClose}
          class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          title={localeState.t('patch.close')}
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Modal Content -->
    <div class="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
      {#if activeTab === 'export'}
        <!-- TAB 1: EXPORT PATCH -->
        <div class="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {localeState.t('patch.commitLabel')}
            </span>
            <select
              bind:value={selectedCommitId}
              onchange={loadExportPatch}
              class="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 max-w-xs focus:outline-hidden focus:border-indigo-500"
            >
              {#each repo.rawCommits.slice(0, 50) as c}
                <option value={c.id}>
                  [{c.id.slice(0, 7)}] {c.summary.slice(0, 45)}
                </option>
              {/each}
            </select>
          </div>

          <div class="flex items-center gap-2">
            <button
              onclick={handleCopy}
              disabled={isGeneratingExport || !exportPatchContent}
              class="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
            >
              {#if isCopied}
                <Check class="w-3.5 h-3.5 text-emerald-500" />
                <span>{localeState.t('patch.copied')}</span>
              {:else}
                <Copy class="w-3.5 h-3.5" />
                <span>{localeState.t('patch.copyToClipboard')}</span>
              {/if}
            </button>

            <button
              onclick={handleSaveFile}
              disabled={isGeneratingExport || !exportPatchContent}
              class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
            >
              <Download class="w-3.5 h-3.5" />
              <span>{localeState.t('patch.saveAsFile')}</span>
            </button>
          </div>
        </div>

        <!-- Patch Preview Box -->
        <div class="flex-1 min-h-0 relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-zinc-100 overflow-hidden flex flex-col font-mono text-xs shadow-inner">
          {#if isGeneratingExport}
            <div class="flex-1 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <RefreshCw class="w-5 h-5 animate-spin text-indigo-500" />
              <span>{localeState.t('patch.generatingPatch')}</span>
            </div>
          {:else if !exportPatchContent}
            <div class="flex-1 flex items-center justify-center text-zinc-500">
              {localeState.t('patch.emptyPatch')}
            </div>
          {:else}
            <textarea
              readonly
              value={exportPatchContent}
              class="w-full h-full p-4 bg-transparent resize-none focus:outline-hidden font-mono text-[11px] leading-relaxed text-zinc-200"
            ></textarea>
          {/if}
        </div>
      {:else}
        <!-- TAB 2: APPLY PATCH -->
        <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Left: Input Area (Dropzone & Text Editor) -->
          <div class="flex flex-col space-y-3 min-h-0">
            <!-- Dropzone Banner -->
            <div
              role="region"
              aria-label="File dropzone"
              ondragover={(e) => {
                e.preventDefault();
                isDraggingFile = true;
              }}
              ondragleave={() => (isDraggingFile = false)}
              ondrop={handleFileDrop}
              class="p-4 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 text-center cursor-pointer {isDraggingFile ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30' : 'border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-indigo-400'}"
            >
              <Upload class="w-5 h-5 text-indigo-500" />
              <div class="text-xs text-zinc-600 dark:text-zinc-400">
                <span>{localeState.t('patch.dropHint')}</span>
                <span class="mx-1 text-zinc-400">—</span>
                <label class="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                  {localeState.t('patch.browseFile')}
                  <input
                    type="file"
                    accept=".patch,.diff"
                    class="hidden"
                    onchange={handleFileInputChange}
                  />
                </label>
              </div>
            </div>

            <!-- Paste / Edit Text Area -->
            <div class="flex-1 min-h-0 flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-2 overflow-hidden shadow-inner">
              <span class="text-[11px] font-semibold text-zinc-500 mb-1 px-1">
                {localeState.t('patch.orPaste')}
              </span>
              <textarea
                bind:value={applyPatchContent}
                oninput={(e) => triggerCheckPatch((e.target as HTMLTextAreaElement).value)}
                placeholder={localeState.t('patch.pastePlaceholder')}
                class="flex-1 w-full p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-[11px] leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-indigo-500 resize-none"
              ></textarea>
            </div>
          </div>

          <!-- Right: Dry-Run Inspection & Options -->
          <div class="flex flex-col space-y-4 min-h-0 border-l border-zinc-200 dark:border-zinc-800 pl-4">
            <!-- Dry Run Status Box -->
            <div class="p-3.5 rounded-xl border shadow-2xs {checkResult?.can_apply ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : checkResult ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200' : 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-500'}">
              <div class="flex items-center gap-2 text-xs font-bold">
                {#if isChecking}
                  <RefreshCw class="w-4 h-4 animate-spin text-indigo-500" />
                  <span>{localeState.t('patch.checking')}</span>
                {:else if checkResult?.can_apply}
                  <CheckCircle2 class="w-4 h-4 text-emerald-500" />
                  <span>{localeState.t('patch.statusClean')}</span>
                {:else if checkResult}
                  <AlertCircle class="w-4 h-4 text-rose-500" />
                  <span>{localeState.t('patch.statusConflict')}</span>
                {:else}
                  <ShieldCheck class="w-4 h-4 text-zinc-400" />
                  <span>{localeState.t('patch.dryRunTitle')}</span>
                {/if}
              </div>

              {#if checkResult?.error_message}
                <p class="text-[11px] font-mono text-rose-600 dark:text-rose-400 mt-1.5 break-words">
                  {checkResult.error_message}
                </p>
              {/if}
            </div>

            <!-- Affected Files List -->
            <div class="flex-1 min-h-0 flex flex-col space-y-2">
              <div class="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span>{localeState.t('patch.affectedFiles', { count: checkResult?.files.length || 0 })}</span>
              </div>

              <div class="flex-1 min-h-0 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 space-y-1.5">
                {#if !checkResult || checkResult.files.length === 0}
                  <div class="h-full flex items-center justify-center text-xs text-zinc-400">
                    {localeState.t('patch.noFiles')}
                  </div>
                {:else}
                  {#each checkResult.files as file}
                    <div class="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between gap-3 text-xs">
                      <div class="flex items-center gap-2 min-w-0 flex-1">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border {getStatusColor(file.status)}">
                          {file.status}
                        </span>
                        <span class="font-mono text-xs truncate text-zinc-800 dark:text-zinc-200" title={file.path}>
                          {file.path}
                        </span>
                      </div>

                      <div class="flex items-center gap-2 font-mono text-[10px] shrink-0">
                        {#if file.additions > 0}
                          <span class="text-emerald-600 dark:text-emerald-400">+{file.additions}</span>
                        {/if}
                        {#if file.deletions > 0}
                          <span class="text-rose-600 dark:text-rose-400">-{file.deletions}</span>
                        {/if}
                        <span class="text-zinc-400">({file.hunks_count} hunks)</span>
                      </div>
                    </div>
                  {/each}
                {/if}
              </div>
            </div>

            <!-- Options & Action -->
            <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <label class="flex items-center gap-2 text-xs cursor-pointer text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  bind:checked={stageToIndex}
                  class="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-zinc-950"
                />
                <span class="font-medium">{localeState.t('patch.stageToIndex')}</span>
              </label>

              <label class="flex items-center gap-2 text-xs cursor-pointer text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  bind:checked={applyReverse}
                  class="rounded text-indigo-600 focus:ring-indigo-500 dark:bg-zinc-950"
                />
                <span class="font-medium">{localeState.t('patch.applyReverse')}</span>
              </label>
            </div>

            <!-- Apply Button -->
            <button
              onclick={handleApplyPatch}
              disabled={isApplying || !checkResult?.can_apply || !applyPatchContent.trim()}
              class="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {#if isApplying}
                <RefreshCw class="w-4 h-4 animate-spin" />
                <span>{localeState.t('patch.applying')}</span>
              {:else}
                <Check class="w-4 h-4" />
                <span>{localeState.t('patch.applyButton')}</span>
              {/if}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
