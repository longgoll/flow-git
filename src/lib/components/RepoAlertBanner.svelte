<script lang="ts">
  import type { RepoOperationState } from '../types';
  import { localeState } from '../state/localeState.svelte';
  import {
    AlertTriangle,
    GitMerge,
    RefreshCw,
    SkipForward,
    XCircle,
    GitBranch,
    Play,
    Bug,
    Split,
  } from 'lucide-svelte';

  interface Props {
    operationState?: RepoOperationState;
    isDetached?: boolean;
    currentBranch?: string;
    headCommitId?: string;
    isOperating?: boolean;
    hideActions?: boolean;
    onContinueRebase?: () => void;
    onSkipRebase?: () => void;
    onAbortOperation?: () => void;
    onOpenConflict?: () => void;
    onCreateBranchFromDetached?: () => void;
  }

  let {
    operationState = { type: 'Normal' },
    isDetached = false,
    currentBranch = '',
    headCommitId = '',
    isOperating = false,
    hideActions = false,
    onContinueRebase,
    onSkipRebase,
    onAbortOperation,
    onOpenConflict,
    onCreateBranchFromDetached,
  }: Props = $props();
</script>

{#if operationState.type !== 'Normal'}
  {#if operationState.type === 'Rebasing'}
    <div
      class="w-full bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 dark:from-amber-950/80 dark:via-amber-900/60 dark:to-zinc-950 border-b border-amber-300 dark:border-amber-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-sm z-15 animate-in slide-in-from-top duration-200 font-sans"
      role="alert"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 animate-pulse">
          <RefreshCw class="w-4 h-4" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide text-[11px]">
              {localeState.t('banners.rebaseInProgress')}
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-semibold">
              {localeState.t('banners.rebaseStep', { step: operationState.data.current_step, total: operationState.data.total_steps })}
            </span>
          </div>
          <p class="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5 truncate">
            {localeState.t('banners.rebaseDescPrefix')}<strong class="text-amber-950 dark:text-amber-100 font-mono">{operationState.data.head_name}</strong>{localeState.t('banners.rebaseDescSuffix')}
          </p>
        </div>
      </div>

      {#if !hideActions}
        <div class="flex items-center gap-2 shrink-0">
          {#if onContinueRebase}
            <button
              type="button"
              onclick={onContinueRebase}
              disabled={isOperating}
              class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title={localeState.t('banners.continueRebaseTooltip')}
            >
              <Play class="w-3.5 h-3.5 fill-current" />
              <span>{localeState.t('banners.continueRebase')}</span>
            </button>
          {/if}

          {#if onSkipRebase}
            <button
              type="button"
              onclick={onSkipRebase}
              disabled={isOperating}
              class="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              title={localeState.t('banners.skipRebaseTooltip')}
            >
              <SkipForward class="w-3.5 h-3.5" />
              <span>{localeState.t('banners.skipRebase')}</span>
            </button>
          {/if}

          {#if onAbortOperation}
            <button
              type="button"
              onclick={onAbortOperation}
              disabled={isOperating}
              class="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title={localeState.t('banners.abortRebaseTooltip')}
            >
              <XCircle class="w-3.5 h-3.5" />
              <span>{localeState.t('banners.abortRebase')}</span>
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {:else if operationState.type === 'Merging'}
    <div
      class="w-full bg-gradient-to-r from-cyan-50 via-blue-50 to-cyan-50 dark:from-cyan-950/80 dark:via-blue-950/60 dark:to-zinc-950 border-b border-cyan-300 dark:border-cyan-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-sm z-15 animate-in slide-in-from-top duration-200 font-sans"
      role="alert"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300 animate-pulse">
          <GitMerge class="w-4 h-4" />
        </div>
        <div>
          <span class="font-bold text-cyan-950 dark:text-cyan-200 uppercase tracking-wide text-[11px]">
            {localeState.t('banners.mergeInProgress')}
          </span>
          <p class="text-[11px] text-cyan-800/90 dark:text-cyan-300/80 mt-0.5 truncate">
            {localeState.t('banners.mergeDescPrefix')}<strong class="font-mono text-cyan-950 dark:text-cyan-100">{operationState.data.merge_heads.map(h => h.slice(0, 7)).join(', ')}</strong>{localeState.t('banners.mergeDescSuffix')}
          </p>
        </div>
      </div>

      {#if !hideActions}
        <div class="flex items-center gap-2 shrink-0">
          {#if onOpenConflict}
            <button
              type="button"
              onclick={onOpenConflict}
              class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer font-semibold shadow-xs"
              title={localeState.t('banners.openConflictTooltip')}
            >
              <Split class="w-3.5 h-3.5" />
              <span>{localeState.t('banners.openConflict')}</span>
            </button>
          {/if}
          {#if onAbortOperation}
            <button
              type="button"
              onclick={onAbortOperation}
              disabled={isOperating}
              class="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title={localeState.t('banners.abortMergeTooltip')}
            >
              <XCircle class="w-3.5 h-3.5" />
              <span>{localeState.t('banners.abortMerge')}</span>
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {:else if operationState.type === 'CherryPicking'}
    <div
      class="w-full bg-gradient-to-r from-purple-50 via-purple-100/40 to-purple-50 dark:from-purple-950/80 dark:via-zinc-950 dark:to-zinc-950 border-b border-purple-300 dark:border-purple-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-sm z-15 animate-in slide-in-from-top duration-200 font-sans"
      role="alert"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/40 text-purple-700 dark:text-purple-300">
          <GitBranch class="w-4 h-4" />
        </div>
        <div>
          <span class="font-bold text-purple-950 dark:text-purple-200 uppercase tracking-wide text-[11px]">
            {localeState.t('banners.cherryPickInProgress')}
          </span>
          <p class="text-[11px] text-purple-800/90 dark:text-purple-300/80 mt-0.5">
            {#if operationState.data.head_name}
              {localeState.t('banners.cherryPickCommitPrefix')}<strong class="font-mono text-purple-950 dark:text-purple-100">{operationState.data.head_name.slice(0, 7)}</strong>
            {:else}
              {localeState.t('banners.cherryPickDefaultDesc')}
            {/if}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        {#if onOpenConflict}
          <button
            type="button"
            onclick={onOpenConflict}
            class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer font-semibold shadow-xs"
            title={localeState.t('banners.openConflictTooltip')}
          >
            <Split class="w-3.5 h-3.5" />
            <span>{localeState.t('banners.openConflict')}</span>
          </button>
        {/if}
        {#if onAbortOperation}
          <button
            type="button"
            onclick={onAbortOperation}
            disabled={isOperating}
            class="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <XCircle class="w-3.5 h-3.5" />
            <span>{localeState.t('banners.abortCherryPick')}</span>
          </button>
        {/if}
      </div>
    </div>
  {:else if operationState.type === 'Bisecting'}
    <div
      class="w-full bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 dark:from-teal-950/80 dark:via-zinc-950 dark:to-zinc-950 border-b border-teal-300 dark:border-teal-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-sm z-15 animate-in slide-in-from-top duration-200 font-sans"
      role="alert"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-500/20 border border-teal-300 dark:border-teal-500/40 text-teal-700 dark:text-teal-300">
          <Bug class="w-4 h-4" />
        </div>
        <div>
          <span class="font-bold text-teal-950 dark:text-teal-200 uppercase tracking-wide text-[11px]">
            {localeState.t('banners.bisectInProgress')}
          </span>
          <p class="text-[11px] text-teal-800/90 dark:text-teal-300/80 mt-0.5">
            {localeState.t('banners.bisectDesc')}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        {#if onAbortOperation}
          <button
            type="button"
            onclick={onAbortOperation}
            disabled={isOperating}
            class="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <XCircle class="w-3.5 h-3.5" />
            <span>{localeState.t('banners.resetBisect')}</span>
          </button>
        {/if}
      </div>
    </div>
  {/if}
{/if}

{#if isDetached && operationState.type === 'Normal'}
  <div
    class="w-full bg-gradient-to-r from-fuchsia-50 via-indigo-50 to-purple-50 dark:from-fuchsia-950/80 dark:via-indigo-950/60 dark:to-zinc-950 border-b border-fuchsia-300 dark:border-fuchsia-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-sm z-14 animate-in slide-in-from-top duration-200 font-sans"
    role="alert"
  >
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="p-1.5 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/20 border border-fuchsia-300 dark:border-fuchsia-500/40 text-fuchsia-700 dark:text-fuchsia-300">
        <AlertTriangle class="w-4 h-4" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-fuchsia-950 dark:text-fuchsia-200 uppercase tracking-wide text-[11px]">
            {localeState.t('banners.detachedHeadTitle')}
          </span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-800 dark:text-fuchsia-300 border border-fuchsia-300 dark:border-fuchsia-500/40 font-semibold">
            {headCommitId ? headCommitId.slice(0, 7) : currentBranch}
          </span>
        </div>
        <p class="text-[11px] text-zinc-600 dark:text-zinc-300/80 mt-0.5">
          {localeState.t('banners.detachedHeadDesc')}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      {#if onCreateBranchFromDetached}
        <button
          type="button"
          onclick={onCreateBranchFromDetached}
          class="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-medium flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <GitBranch class="w-3.5 h-3.5" />
          <span>{localeState.t('banners.createBranchFromDetached')}</span>
        </button>
      {/if}
    </div>
  </div>
{/if}
