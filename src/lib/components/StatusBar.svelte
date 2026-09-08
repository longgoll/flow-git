<script lang="ts">
  import type { CurrentRepoIdentity, OperationLog, RepoSummary, TransferProgressPayload } from '../types';
  import { CheckCircle, ShieldCheck, AlertTriangle, UserCheck, Globe, ChevronUp, Terminal, Trash2, X, Sparkles, RefreshCw } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';
  import { updateState } from '../state/updateState.svelte';

  interface Props {
    statusMessage: string;
    repoSummary: RepoSummary | null;
    visibleCommitsCount: number;
    dirtyFilesCount: number;
    stagedFilesCount: number;
    currentIdentity?: CurrentRepoIdentity | null;
    transferProgress?: TransferProgressPayload | null;
    operationLogs?: OperationLog[];
    isLogPanelOpen?: boolean;
    onOpenTrash: () => void;
    onOpenIdentity?: () => void;
    onToggleLog?: () => void;
    onClearLog?: () => void;
  }

  let {
    statusMessage,
    repoSummary,
    visibleCommitsCount,
    dirtyFilesCount,
    stagedFilesCount,
    currentIdentity = null,
    transferProgress = null,
    operationLogs = [],
    isLogPanelOpen = false,
    onOpenTrash,
    onOpenIdentity,
    onToggleLog,
    onClearLog,
  }: Props = $props();

  // Panel height state (resizable)
  let panelHeight = $state(220);
  let isDragging = $state(false);
  let dragStartY = 0;
  let dragStartHeight = 0;

  function onDragStart(e: MouseEvent) {
    isDragging = true;
    dragStartY = e.clientY;
    dragStartHeight = panelHeight;
    e.preventDefault();
  }

  function onDragMove(e: MouseEvent) {
    if (!isDragging) return;
    const delta = dragStartY - e.clientY;
    panelHeight = Math.max(120, Math.min(500, dragStartHeight + delta));
  }

  function onDragEnd() {
    isDragging = false;
  }

  // Icon + color per log type
  function getTypeIcon(type: OperationLog['type']) {
    switch (type) {
      case 'success': return '✓';
      case 'error':   return '✕';
      case 'warn':    return '⚠';
      default:        return 'ℹ';
    }
  }

  function getTypeClass(type: OperationLog['type']) {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'error':   return 'text-red-400';
      case 'warn':    return 'text-amber-400';
      default:        return 'text-zinc-400';
    }
  }

  function formatTime(d: Date): string {
    // d might be a plain object from state; ensure it's a Date
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleTimeString('en-GB', { hour12: false });
  }
</script>

<!-- Drag overlay (captures mouse globally during drag) -->
{#if isDragging}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-[9999] cursor-row-resize"
    onmousemove={onDragMove}
    onmouseup={onDragEnd}
    onmouseleave={onDragEnd}
  ></div>
{/if}

<!-- Operation Log Panel (slides up above footer) -->
{#if isLogPanelOpen}
  <div
    class="border-t border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-900 flex flex-col overflow-hidden shrink-0"
    style="height: {panelHeight}px;"
  >
    <!-- Drag handle -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="h-1 w-full cursor-row-resize bg-transparent hover:bg-violet-500/30 transition-colors shrink-0 group"
      onmousedown={onDragStart}
    >
      <div class="mx-auto mt-0.5 w-8 h-0.5 rounded-full bg-zinc-300 dark:bg-zinc-600 group-hover:bg-violet-400 transition-colors"></div>
    </div>

    <!-- Panel header -->
    <div class="flex items-center justify-between px-3 py-1 border-b border-zinc-200 dark:border-zinc-700/60 shrink-0">
      <div class="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        <Terminal class="w-3 h-3" />
        <span>Operation Log</span>
        {#if operationLogs.length > 0}
          <span class="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500 font-mono text-[10px]">
            {operationLogs.length}
          </span>
        {/if}
      </div>
      <div class="flex items-center gap-1">
        {#if operationLogs.length > 0}
          <button
            onclick={onClearLog}
            class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-zinc-500 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
            title="Clear log"
          >
            <Trash2 class="w-3 h-3" />
            <span>Clear</span>
          </button>
        {/if}
        <button
          onclick={onToggleLog}
          class="p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
          title="Close log panel"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Log entries -->
    <div class="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed">
      {#if operationLogs.length === 0}
        <div class="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-600 text-[11px]">
          No operations logged yet
        </div>
      {:else}
        {#each operationLogs as log (log.id)}
          <div class="flex items-start gap-2 px-3 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors group">
            <span class="shrink-0 {getTypeClass(log.type)} font-bold w-3 text-center mt-px">
              {getTypeIcon(log.type)}
            </span>
            <span class="shrink-0 text-zinc-400 dark:text-zinc-600 tabular-nums">
              {formatTime(log.timestamp)}
            </span>
            <span class="{getTypeClass(log.type)} break-all">
              {log.message}
            </span>
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<!-- Status Bar Footer -->
<footer class="h-7 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-100 dark:bg-zinc-950 px-3 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 font-mono select-none z-20 shrink-0">
  <!-- Left: clickable status message + repo info -->
  <div class="flex items-center gap-3 truncate min-w-0">
    <!-- Status message — click to toggle log panel -->
    <button
      onclick={onToggleLog}
      class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 shrink-0 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer group"
      title={localeState.t('statusBar.toggleLogTip')}
    >
      <CheckCircle class="w-3 h-3 shrink-0" />
      <span class="truncate max-w-[400px]">{statusMessage}</span>
      <ChevronUp
        class="w-3 h-3 shrink-0 text-zinc-400 dark:text-zinc-600 group-hover:text-emerald-500 transition-all {isLogPanelOpen ? 'rotate-180' : ''}"
      />
    </button>

    {#if transferProgress}
      <span class="text-zinc-300 dark:text-zinc-600">|</span>
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 text-[10px] font-mono shadow-xs animate-pulse">
        <RefreshCw class="w-2.5 h-2.5 animate-spin text-cyan-500" />
        <span class="capitalize font-semibold">{transferProgress.phase}:</span>
        <span>
          {transferProgress.total_objects > 0
            ? `${Math.round((transferProgress.received_objects / transferProgress.total_objects) * 100)}% (${transferProgress.received_objects}/${transferProgress.total_objects})`
            : `${(transferProgress.received_bytes / 1024).toFixed(1)} KB`}
        </span>
      </div>
    {/if}

    {#if repoSummary}
      <span class="text-zinc-300 dark:text-zinc-600">|</span>
      <span class="text-zinc-700 dark:text-zinc-400 font-semibold shrink-0">{visibleCommitsCount.toLocaleString()} {localeState.t('statusBar.commits')}</span>
      {#if repoSummary.is_detached}
        <span class="text-zinc-300 dark:text-zinc-600">|</span>
        <span class="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700/60 font-semibold flex items-center gap-1">
          <AlertTriangle class="w-3 h-3 text-amber-500 dark:text-amber-400" />
          <span>{localeState.t('statusBar.detachedHead')}</span>
        </span>
      {/if}
      {#if dirtyFilesCount > 0 || stagedFilesCount > 0}
        <span class="text-zinc-300 dark:text-zinc-600">|</span>
        <span class="text-amber-600 dark:text-amber-400 font-semibold shrink-0">{dirtyFilesCount} {localeState.t('statusBar.unstaged')}</span>
        <span class="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">{stagedFilesCount} {localeState.t('statusBar.staged')}</span>
      {/if}
    {/if}
  </div>

  <!-- Right: shortcuts + identity + trash + lang -->
  <div class="flex items-center gap-3 text-zinc-500 shrink-0">
    <div class="flex items-center gap-1.5 hidden sm:flex">
      <span class="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">Ctrl+K</span>
      <span>{localeState.t('statusBar.paletteTip')}</span>
    </div>
    <div class="flex items-center gap-1.5 hidden sm:flex">
      <span class="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">Ctrl+Z</span>
      <span>{localeState.t('statusBar.timeMachineTip')}</span>
    </div>
    {#if currentIdentity?.name}
      <button
        onclick={onOpenIdentity}
        class="flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium cursor-pointer transition-colors"
        title={localeState.t('statusBar.gitAuthorTip', { name: `${currentIdentity.name} <${currentIdentity.email || ''}>` })}
      >
        <UserCheck class="w-3 h-3" />
        <span class="truncate max-w-[120px]">{currentIdentity.name}</span>
      </button>
    {/if}
    <button
      onclick={onOpenTrash}
      class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium cursor-pointer transition-colors"
      title={localeState.t('statusBar.trashTooltip')}
    >
      <ShieldCheck class="w-3 h-3" />
      <span>Trash</span>
    </button>
    <!-- Update Available Badge (Chỉ hiển thị trên macOS/Linux) -->
    {#if updateState.isSupportedPlatform && updateState.updateAvailable}
      <button
        onclick={() => updateState.openModal()}
        class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold text-[10px] cursor-pointer transition-all animate-pulse"
        title={localeState.t('updater.newVersionFoundMsg', { version: updateState.updateInfo?.version || '' })}
      >
        <Sparkles class="w-2.5 h-2.5" />
        <span>v{updateState.updateInfo?.version}</span>
      </button>
    {/if}

    <!-- Quick Language Toggle Button -->
    <button
      onclick={() => localeState.toggleLocale()}
      class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-800 font-semibold text-[10px] cursor-pointer transition-all"
      title={localeState.t('statusBar.langToggleTooltip')}
    >
      <Globe class="w-2.5 h-2.5 text-zinc-400" />
      <span>{localeState.locale === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</span>
    </button>
  </div>
</footer>
