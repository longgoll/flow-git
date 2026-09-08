<script lang="ts">
  import type { BranchInfo } from '../../types';
  import { localeState } from '../../state/localeState.svelte';
  import {
    Command,
    CloudDownload,
    CloudUpload,
    Upload,
    RefreshCw,
    Sparkles,
    Flame,
    BookOpen,
    LifeBuoy,
    Activity,
  } from 'lucide-svelte';

  interface Props {
    currentBranch?: BranchInfo;
    isLoading?: boolean;
    isSyncing?: boolean;
    isPushing?: boolean;
    remotesCount?: number;
    activeHotfixBranch?: string | null;
    onOpenPalette?: () => void;
    onSmartSync?: () => void;
    onPush?: () => void;
    onPublishBranch?: (branch: BranchInfo) => void;
    onPublishRepo?: () => void;
    onRefresh: () => void;
    onOpenAI?: () => void;
    onOpenQuickHotfix?: () => void;
    onRestoreHotfixStash?: () => void;
    onOpenGuide?: () => void;
    onOpenPlaybook?: () => void;
    onOpenInsights?: () => void;
  }

  let {
    currentBranch,
    isLoading = false,
    isSyncing = false,
    isPushing = false,
    remotesCount = 1,
    activeHotfixBranch = null,
    onOpenPalette,
    onSmartSync,
    onPush,
    onPublishBranch,
    onPublishRepo,
    onRefresh,
    onOpenAI,
    onOpenQuickHotfix,
    onRestoreHotfixStash,
    onOpenGuide,
    onOpenPlaybook,
    onOpenInsights,
  }: Props = $props();
</script>

<!-- Command Palette Quick Button -->
{#if onOpenPalette}
  <button
    onclick={onOpenPalette}
    class="hidden 2xl:flex items-center gap-1 px-1.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs transition-all cursor-pointer group shadow-xs shrink-0"
    title={localeState.t('toolbar.commandPaletteTooltip')}
  >
    <Command class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
    <kbd class="text-[9px] font-mono text-zinc-500 bg-zinc-200 dark:bg-zinc-800 px-1 py-0.2 rounded border border-zinc-300 dark:border-zinc-700/60">⌘K</kbd>
  </button>
{/if}

<!-- 1-Click Smart Sync -->
{#if onSmartSync}
  {@const isBehind = (currentBranch?.behind_count ?? 0) > 0}
  <button
    onclick={onSmartSync}
    disabled={isSyncing}
    class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all cursor-pointer group disabled:opacity-50 shrink-0 font-medium {isBehind ? 'bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/80 shadow-xs ring-1 ring-amber-400/30 dark:ring-amber-500/20' : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-300'}"
    title={isBehind ? localeState.t('toolbar.smartSyncBehindTooltip', { count: currentBranch?.behind_count ?? 0, upstream: currentBranch?.upstream_name || 'origin' }) : localeState.t('toolbar.smartSyncTooltip')}
  >
    <CloudDownload class="w-3.5 h-3.5 transition-transform group-hover:scale-105 {isBehind ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-cyan-600 dark:text-cyan-400'} {isSyncing ? 'animate-bounce' : ''}" />
    <span class="text-[11px] hidden 2xl:inline">
      {isSyncing ? localeState.t('toolbar.syncing') : isBehind ? localeState.t('toolbar.syncBehindBadge', { count: currentBranch?.behind_count ?? 0 }) : localeState.t('toolbar.sync')}
    </span>
    {#if isBehind}
      <span class="2xl:hidden flex items-center text-[10px] font-bold text-amber-600 dark:text-amber-400">
        ↓{currentBranch?.behind_count}
      </span>
    {/if}
  </button>
{/if}

<!-- Push / Publish Button -->
{#if onPush}
  {#if currentBranch && !currentBranch.upstream_name}
    <button
      onclick={() => onPublishBranch ? onPublishBranch(currentBranch) : onPush?.()}
      disabled={isPushing}
      class="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-100 dark:bg-cyan-950/80 hover:bg-cyan-200 dark:hover:bg-cyan-900 border border-cyan-300 dark:border-cyan-600/50 text-xs text-cyan-800 dark:text-cyan-300 hover:text-cyan-950 dark:hover:text-white transition-all cursor-pointer group shadow-sm disabled:opacity-50 shrink-0 font-medium"
      title={localeState.t('toolbar.publishBranchTooltip', { branch: currentBranch.shorthand })}
    >
      <CloudUpload class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform {isPushing ? 'animate-bounce' : ''}" />
      <span class="text-[11px] font-semibold hidden 2xl:inline">{isPushing ? localeState.t('toolbar.publishing') : localeState.t('toolbar.publish')}</span>
    </button>
  {:else}
    <button
      onclick={onPush}
      disabled={isPushing || (currentBranch && currentBranch.ahead_count === 0)}
      class="flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-all {currentBranch && currentBranch.ahead_count > 0
        ? 'bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 border-emerald-300 dark:border-emerald-600/50 text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white cursor-pointer shadow-xs font-medium'
        : 'bg-zinc-100/60 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-40'} disabled:opacity-40 shrink-0"
      title={currentBranch && currentBranch.ahead_count > 0
        ? localeState.t('toolbar.pushAheadTooltip', { count: currentBranch.ahead_count, upstream: currentBranch?.upstream_name || 'remote' })
        : localeState.t('toolbar.pushSyncedTooltip')}
    >
      <Upload class="w-3.5 h-3.5 {currentBranch && currentBranch.ahead_count > 0 ? 'text-emerald-600 dark:text-emerald-400 group-hover:scale-105' : 'text-zinc-400 dark:text-zinc-500'} transition-transform {isPushing ? 'animate-bounce' : ''}" />
      <span class="text-[11px] hidden 2xl:inline">{isPushing ? localeState.t('toolbar.pushing') : localeState.t('toolbar.push')}</span>
      {#if currentBranch && currentBranch.ahead_count > 0}
        <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-600 text-white font-bold">
          {currentBranch.ahead_count}
        </span>
      {/if}
    </button>
  {/if}
{/if}

<!-- Publish to GitHub Button (when repository has no remote) -->
{#if remotesCount === 0 && onPublishRepo}
  <button
    onclick={onPublishRepo}
    class="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-950/70 hover:bg-indigo-200 dark:hover:bg-indigo-900 border border-indigo-300 dark:border-indigo-500/40 text-xs text-indigo-800 dark:text-indigo-200 hover:text-indigo-950 dark:hover:text-white transition-all cursor-pointer shadow-xs group shrink-0"
    title={localeState.t('toolbar.publishToGithubTooltip')}
  >
    <CloudUpload class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
    <span class="font-medium text-[11px] hidden sm:inline">{localeState.t('toolbar.publishToGithub')}</span>
  </button>
{/if}

<!-- Refresh Button -->
<button
  onclick={onRefresh}
  disabled={isLoading}
  class="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer disabled:opacity-50 shrink-0"
  title={localeState.t('toolbar.refreshRepo')}
>
  <RefreshCw class="w-3.5 h-3.5 {isLoading ? 'animate-spin text-cyan-500 dark:text-cyan-400' : ''}" />
</button>

<div class="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5 hidden sm:block shrink-0"></div>

<!-- AI Assistant Quick Button -->
{#if onOpenAI}
  <button
    onclick={onOpenAI}
    class="hidden md:flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer group shadow-xs shrink-0"
    title={localeState.t('toolbar.aiAssistant')}
  >
    <Sparkles class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
    <span class="font-medium text-[11px] hidden 2xl:inline">AI</span>
  </button>
{/if}

<!-- Quick Hotfix 1-Chạm (Smart Stash & Switch) -->
{#if activeHotfixBranch}
  <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/60 text-amber-800 dark:text-amber-300 text-xs shadow-xs shrink-0 animate-pulse">
    <Flame class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
    <span class="font-medium text-[11px] max-w-[70px] sm:max-w-[100px] truncate">{localeState.t('toolbar.hotfixPrefix', { branch: activeHotfixBranch })}</span>
    {#if onRestoreHotfixStash}
      <button
        onclick={onRestoreHotfixStash}
        class="ml-0.5 px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-semibold cursor-pointer shadow-xs transition-colors"
        title={localeState.t('toolbar.restoreHotfixTooltip')}
      >
        {localeState.t('toolbar.restoreHotfixBtn')}
      </button>
    {/if}
  </div>
{:else if onOpenQuickHotfix}
  <button
    onclick={onOpenQuickHotfix}
    class="hidden md:flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer group shadow-xs shrink-0"
    title={localeState.t('toolbar.quickHotfixTooltip')}
  >
    <Flame class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-amber-500 transition-colors" />
    <span class="font-medium text-[11px] hidden 2xl:inline">{localeState.t('toolbar.quickHotfixBtn')}</span>
  </button>
{/if}

<!-- Playbook / User Guide Button -->
{#if onOpenGuide}
  <button
    onclick={onOpenGuide}
    class="hidden 3xl:flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer group shrink-0 shadow-xs"
    title={localeState.t('toolbar.playbookTooltip')}
  >
    <BookOpen class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors" />
    <span class="text-xs font-semibold">{localeState.t('toolbar.playbookBtn')}</span>
  </button>
{/if}

<!-- Emergency Rescue Kit Button -->
{#if onOpenPlaybook}
  <button
    onclick={onOpenPlaybook}
    class="hidden 3xl:flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/80 dark:hover:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-all cursor-pointer group shrink-0 shadow-xs"
    title={localeState.t('toolbar.rescueKitTooltip')}
  >
    <LifeBuoy class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors" />
    <span class="text-xs font-semibold">{localeState.t('toolbar.rescueKitBtn')}</span>
  </button>
{/if}

<!-- Repository Pulse & Insights Button -->
{#if onOpenInsights}
  <button
    onclick={onOpenInsights}
    class="hidden 2xl:flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 border border-zinc-200 dark:border-zinc-800 hover:border-cyan-300 dark:hover:border-cyan-700/60 text-xs text-zinc-700 dark:text-zinc-300 hover:text-cyan-900 dark:hover:text-cyan-200 transition-all cursor-pointer group shadow-xs shrink-0"
    title={localeState.t('insights.title')}
  >
    <Activity class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" />
    <span class="font-medium text-[11px] hidden 2xl:inline">{localeState.t('insights.badge')}</span>
  </button>
{/if}

