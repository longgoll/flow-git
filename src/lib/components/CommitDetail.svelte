<script lang="ts">
  import type { CommitDetail, FileDiffDetail } from '../types';
  import { getCommitFileDiff } from '../api/diff';
  import DiffViewer from './DiffViewer.svelte';
  import {
    Copy,
    Check,
    GitCommit,
    Clock,
    FileCode,
    FilePlus,
    FileEdit,
    FileX,
    Maximize2,
    Minimize2,
    X,
    Search,
    Code2,
    ExternalLink,
    ShieldCheck,
  } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    commitDetail: CommitDetail | null;
    isLoading: boolean;
    isMaximized?: boolean;
    repoPath?: string;
    onToggleMaximize?: () => void;
    onClose?: () => void;
    onSelectParent?: (parentId: string) => void;
    onSelectFile?: (filePath: string) => void;
    onOpenFileInExplorer?: (filePath: string) => void;
  }

  let {
    commitDetail,
    isLoading = false,
    isMaximized = false,
    repoPath = '',
    onToggleMaximize,
    onClose,
    onSelectParent,
    onSelectFile,
    onOpenFileInExplorer,
  }: Props = $props();

  let copied = $state(false);
  let showSignatureDetails = $state(false);
  let copiedSignature = $state(false);
  let selectedFilePath = $state<string | null>(null);
  let fileDiffDetail = $state<FileDiffDetail | null>(null);
  let isDiffLoading = $state(false);
  let fileSearch = $state('');

  function copyHash() {
    if (!commitDetail) return;
    navigator.clipboard.writeText(commitDetail.id);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  function copySignature() {
    if (!commitDetail?.signature_info?.signature) return;
    navigator.clipboard.writeText(commitDetail.signature_info.signature);
    copiedSignature = true;
    setTimeout(() => {
      copiedSignature = false;
    }, 2000);
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  function getInitials(name: string): string {
    if (!name || name === 'Unknown') return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getAvatarGradient(name: string): string {
    const gradients = [
      'from-cyan-500 to-blue-600',
      'from-indigo-500 to-purple-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-violet-500 to-fuchsia-600',
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }

  let summary = $derived(commitDetail?.message?.split('\n')[0] || '');
  let description = $derived(
    commitDetail?.message
      ? commitDetail.message.split('\n').slice(1).join('\n').trim()
      : ''
  );

  let totalAdditions = $derived(
    commitDetail?.files_changed?.reduce((acc, f) => acc + (f.additions || 0), 0) || 0
  );
  let totalDeletions = $derived(
    commitDetail?.files_changed?.reduce((acc, f) => acc + (f.deletions || 0), 0) || 0
  );

  let filteredFiles = $derived.by(() => {
    if (!commitDetail?.files_changed) return [];
    if (!fileSearch.trim()) return commitDetail.files_changed;
    const q = fileSearch.toLowerCase();
    return commitDetail.files_changed.filter((f) => f.path.toLowerCase().includes(q));
  });

  // Auto select first file on commit change
  $effect(() => {
    if (commitDetail && commitDetail.files_changed.length > 0) {
      const exists = selectedFilePath && commitDetail.files_changed.some((f) => f.path === selectedFilePath);
      if (!exists) {
        selectedFilePath = commitDetail.files_changed[0].path;
      }
    } else {
      selectedFilePath = null;
      fileDiffDetail = null;
    }
  });

  // Fetch file diff when selected file changes
  $effect(() => {
    const filePath = selectedFilePath;
    const commitId = commitDetail?.id;
    if (!filePath || !commitId || !repoPath) {
      fileDiffDetail = null;
      return;
    }

    let isCancelled = false;
    isDiffLoading = true;

    getCommitFileDiff(repoPath, commitId, filePath)
      .then((diff) => {
        if (!isCancelled) {
          fileDiffDetail = diff;
        }
      })
      .catch((e) => {
        console.error('Failed to load commit file diff:', e);
        if (!isCancelled) {
          fileDiffDetail = null;
        }
      })
      .finally(() => {
        if (!isCancelled) {
          isDiffLoading = false;
        }
      });

    return () => {
      isCancelled = true;
    };
  });

  function getStatusStyle(status: string) {
    switch (status.toLowerCase()) {
      case 'added':
        return 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80';
      case 'deleted':
        return 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/80';
      case 'renamed':
        return 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/80';
      default:
        return 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80';
    }
  }

  function handleFileClick(filePath: string) {
    selectedFilePath = filePath;
    onSelectFile?.(filePath);
  }
</script>

<div class="h-full bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col font-sans overflow-hidden text-zinc-900 dark:text-zinc-100 select-none">
  {#if isLoading}
    <div class="h-full flex items-center justify-center text-zinc-500 text-xs gap-2">
      <div class="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
      <span>{localeState.t('graph.loadingCommitDetails')}</span>
    </div>
  {:else if commitDetail}
    <!-- Detail Header Bar -->
    <div class="px-3.5 py-1.5 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between bg-zinc-100/70 dark:bg-zinc-900/50 gap-3 shrink-0">
      <div class="flex items-center gap-3 flex-wrap min-w-0 flex-1">
        <!-- Hash pill -->
        <button
          onclick={copyHash}
          class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-mono text-[11px] transition-colors cursor-pointer group shadow-xs"
          title={localeState.t('graph.clickToCopySha')}
        >
          <GitCommit class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
          <span>{commitDetail.short_id}</span>
          {#if copied}
            <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          {:else}
            <Copy class="w-2.5 h-2.5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
          {/if}
        </button>

        {#if commitDetail.parents.length > 0}
          <div class="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
            <span>{localeState.t('graph.parents')}:</span>
            {#each commitDetail.parents as parent}
              <button
                onclick={() => onSelectParent?.(parent)}
                class="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 border border-zinc-200 dark:border-zinc-800/80 text-[10px] cursor-pointer font-mono"
              >
                {parent.slice(0, 7)}
              </button>
            {/each}
          </div>
        {/if}

        <!-- Commit Signing Badge -->
        {#if commitDetail.signature_info?.is_signed}
          <div class="relative">
            <button
              onclick={() => showSignatureDetails = !showSignatureDetails}
              class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono border transition-all cursor-pointer shadow-xs {commitDetail.signature_info.key_type === 'ssh' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/40'}"
              title={localeState.t('auth.signing.verifiedBadge')}
            >
              <ShieldCheck class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>{localeState.t('auth.signing.verified')} ({commitDetail.signature_info.key_type?.toUpperCase()})</span>
            </button>

            {#if showSignatureDetails}
              <div class="absolute left-0 top-full mt-1.5 w-80 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-50 text-xs">
                <div class="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div class="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck class="w-4 h-4" />
                    <span>{localeState.t('auth.signing.verifiedSignature')}</span>
                  </div>
                  <button
                    onclick={() => showSignatureDetails = false}
                    class="p-0.5 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
                <div class="py-2 space-y-1.5 text-zinc-600 dark:text-zinc-300 text-[11px]">
                  <div class="flex justify-between">
                    <span class="text-zinc-400">{localeState.t('auth.signing.keyFormat')}:</span>
                    <span class="font-mono font-medium uppercase">{commitDetail.signature_info.key_type}</span>
                  </div>
                  {#if commitDetail.signature_info.signer}
                    <div class="flex justify-between">
                      <span class="text-zinc-400">{localeState.t('auth.signing.signer')}:</span>
                      <span class="font-mono truncate max-w-[180px]">{commitDetail.signature_info.signer}</span>
                    </div>
                  {/if}
                </div>
                {#if commitDetail.signature_info.signature}
                  <div class="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">{localeState.t('auth.signing.rawSignature')}</span>
                      <button
                        onclick={copySignature}
                        class="flex items-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                      >
                        {#if copiedSignature}
                          <Check class="w-2.5 h-2.5" />
                          <span>{localeState.t('common.copied')}</span>
                        {:else}
                          <Copy class="w-2.5 h-2.5" />
                          <span>{localeState.t('common.copy')}</span>
                        {/if}
                      </button>
                    </div>
                    <pre class="p-1.5 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 font-mono text-[9px] text-zinc-500 dark:text-zinc-400 max-h-24 overflow-y-auto whitespace-pre-wrap break-all">{commitDetail.signature_info.signature}</pre>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Author with Avatar Initials & Date inline -->
        <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 border-l border-zinc-200 dark:border-zinc-800/60 pl-3">
          <div class="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-300">
            <div
              class="w-5 h-5 rounded-full bg-gradient-to-tr {getAvatarGradient(commitDetail.author_name)} text-white font-semibold text-[9px] flex items-center justify-center shadow-xs shrink-0"
              title="{commitDetail.author_name} <{commitDetail.author_email}>"
            >
              {getInitials(commitDetail.author_name)}
            </div>
            <span class="font-medium text-[11px]">{commitDetail.author_name}</span>
            <span class="text-zinc-400 dark:text-zinc-500 text-[10px] font-mono hidden xl:inline">&lt;{commitDetail.author_email}&gt;</span>
          </div>

          <div class="flex items-center gap-1 text-zinc-500 text-[11px] font-mono hidden sm:flex">
            <Clock class="w-3 h-3 text-zinc-400" />
            <span>{formatDate(commitDetail.author_timestamp)}</span>
          </div>
        </div>

        <!-- Total Stats Pill -->
        <div class="flex items-center gap-1.5 text-[11px] font-mono border-l border-zinc-200 dark:border-zinc-800/60 pl-3">
          <span class="text-zinc-600 dark:text-zinc-400 font-medium">{localeState.t('graph.filesChanged', { count: commitDetail.files_changed.length })}</span>
          {#if totalAdditions > 0}
            <span class="text-emerald-600 dark:text-emerald-400 font-semibold">+{totalAdditions}</span>
          {/if}
          {#if totalDeletions > 0}
            <span class="text-rose-600 dark:text-rose-400 font-semibold">-{totalDeletions}</span>
          {/if}
        </div>
      </div>

      <!-- Window Actions (Maximize / Close) -->
      <div class="flex items-center gap-1 shrink-0">
        {#if onToggleMaximize}
          <button
            onclick={onToggleMaximize}
            class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title={isMaximized ? localeState.t('graph.minimizePanel') : localeState.t('graph.maximizePanel')}
          >
            {#if isMaximized}
              <Minimize2 class="w-3.5 h-3.5" />
            {:else}
              <Maximize2 class="w-3.5 h-3.5" />
            {/if}
          </button>
        {/if}

        {#if onClose}
          <button
            onclick={onClose}
            class="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title={localeState.t('graph.closePanel')}
          >
            <X class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>
    </div>

    <!-- Main Content: 3-Column Split (Message ~25% | Files ~27% | Inline Diff Preview ~48%) -->
    <div class="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800/60 overflow-hidden">
      <!-- 1. Commit Message Pane -->
      <div class="w-full md:w-[25%] min-w-[190px] p-3 overflow-y-auto bg-zinc-50/60 dark:bg-zinc-950 shrink-0 flex flex-col">
        <h4 class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 shrink-0">
          {localeState.t('graph.commitMessage')}
        </h4>
        <div class="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug select-text">
          {summary}
        </div>
        {#if description}
          <div class="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed select-text border-t border-zinc-200/80 dark:border-zinc-800/80 pt-2 flex-1">
            {description}
          </div>
        {/if}
      </div>

      <!-- 2. Changed Files List Pane -->
      <div class="w-full md:w-[27%] min-w-[210px] p-2.5 flex flex-col bg-zinc-50/30 dark:bg-zinc-950/60 shrink-0 overflow-hidden">
        <div class="flex items-center justify-between mb-1.5 shrink-0 gap-2">
          <h4 class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {localeState.t('graph.changedFiles', { count: commitDetail.files_changed.length })}
          </h4>

          <!-- Compact search inside commit files -->
          {#if commitDetail.files_changed.length > 3}
            <div class="relative flex-1 max-w-[120px]">
              <Search class="w-2.5 h-2.5 text-zinc-400 absolute left-1.5 top-1.5 pointer-events-none" />
              <input
                type="text"
                placeholder={localeState.t('graph.filterFiles')}
                bind:value={fileSearch}
                class="w-full pl-4 pr-1.5 py-0.5 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          {/if}
        </div>

        <div class="space-y-1 overflow-y-auto flex-1 pr-1">
          {#each filteredFiles as file}
            {@const isSelected = selectedFilePath === file.path}
            {@const total = (file.additions || 0) + (file.deletions || 0)}
            {@const addPct = total > 0 ? ((file.additions || 0) / total) * 100 : 50}
            <button
              onclick={() => handleFileClick(file.path)}
              class="w-full flex items-center justify-between p-1.5 rounded-md text-xs font-mono group transition-colors text-left cursor-pointer border {isSelected ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-800/80 text-cyan-900 dark:text-cyan-200 shadow-xs' : 'hover:bg-zinc-200/70 dark:hover:bg-zinc-900/80 border-transparent hover:border-zinc-300 dark:hover:border-zinc-800 text-zinc-700 dark:text-zinc-300'}"
              title={file.path}
            >
              <div class="flex items-center gap-1.5 truncate pr-2 min-w-0 flex-1">
                {#if file.status === 'added'}
                  <FilePlus class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {:else if file.status === 'deleted'}
                  <FileX class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                {:else if file.status === 'renamed'}
                  <FileCode class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                {:else}
                  <FileEdit class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                {/if}
                <span class="truncate text-[11px] {isSelected ? 'font-semibold text-cyan-950 dark:text-cyan-100' : 'group-hover:text-cyan-700 dark:group-hover:text-cyan-300'}">
                  {file.path.split('/').pop() || file.path}
                </span>
                <span class="text-[9px] text-zinc-400 truncate hidden xl:inline">
                  {file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : ''}
                </span>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <!-- Diff Stats: +adds / -dels -->
                {#if (file.additions || 0) > 0 || (file.deletions || 0) > 0}
                  <div class="flex items-center gap-1 text-[10px] font-mono">
                    {#if (file.additions || 0) > 0}
                      <span class="text-emerald-600 dark:text-emerald-400 font-semibold">+{file.additions}</span>
                    {/if}
                    {#if (file.deletions || 0) > 0}
                      <span class="text-rose-600 dark:text-rose-400 font-semibold">-{file.deletions}</span>
                    {/if}
                    <!-- Visual Mini Bar -->
                    <div class="w-5 h-1.5 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex shrink-0">
                      <div class="bg-emerald-500 h-full" style="width: {addPct}%"></div>
                      <div class="bg-rose-500 h-full" style="width: {100 - addPct}%"></div>
                    </div>
                  </div>
                {:else}
                  <span class="text-[9px] uppercase font-semibold px-1 py-0.2 rounded border {getStatusStyle(file.status)}">
                    {file.status}
                  </span>
                {/if}
              </div>
            </button>
          {/each}

          {#if filteredFiles.length === 0}
            <div class="text-xs text-zinc-400 dark:text-zinc-600 italic py-2">
              {fileSearch ? 'No files matching query' : 'No file changes detected'}
            </div>
          {/if}
        </div>

        {#if onOpenFileInExplorer && selectedFilePath}
          <div class="pt-2 mt-auto border-t border-zinc-200/60 dark:border-zinc-800/60">
            <button
              onclick={() => onOpenFileInExplorer(selectedFilePath!)}
              class="w-full flex items-center justify-center gap-1 py-1 text-[10px] text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-colors cursor-pointer"
              title={localeState.t('graph.openInExplorerTooltip')}
            >
              <ExternalLink class="w-3 h-3" />
              <span>{localeState.t('graph.openInExplorer')}</span>
            </button>
          </div>
        {/if}
      </div>

      <!-- 3. Inline Monaco Diff Preview Pane -->
      <div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 overflow-hidden">
        {#if selectedFilePath}
          <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
            <DiffViewer
              diffDetail={fileDiffDetail}
              isLoading={isDiffLoading}
              {repoPath}
            />
          </div>
        {:else}
          <div class="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 text-xs font-sans gap-2 p-4">
            <Code2 class="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
            <span>{localeState.t('graph.selectFileToViewDiff')}</span>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-xs font-sans">
      {localeState.t('graph.selectCommitToInspect')}
    </div>
  {/if}
</div>

