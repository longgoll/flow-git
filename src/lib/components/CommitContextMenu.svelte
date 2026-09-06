<script lang="ts">
  import { onMount } from 'svelte';
  import type { CommitNode } from '../types';
  import {
    GitBranch,
    Tag,
    RotateCcw,
    Rewind,
    Copy,
    GitCompare,
    Layers,
    GitFork,
    Eye,
    GitPullRequest,
  } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    x: number;
    y: number;
    commit: CommitNode;
    selectedCount?: number;
    isLockedFocus?: boolean;
    onClose: () => void;
    onCreateBranch?: (commit: CommitNode) => void;
    onCreateTag?: (commit: CommitNode) => void;
    onCherryPick?: (commit: CommitNode) => void;
    onRevert?: (commit: CommitNode) => void;
    onReset?: (commit: CommitNode, mode: 'soft' | 'mixed' | 'hard') => void;
    onSquash?: () => void;
    onInteractiveRebase?: (commit: CommitNode) => void;
    onCopySha: (sha: string) => void;
    onCompare?: (commit: CommitNode) => void;
    onToggleLockFocus?: (lane: number) => void;
  }

  let {
    x,
    y,
    commit,
    selectedCount = 1,
    isLockedFocus = false,
    onClose,
    onCreateBranch,
    onCreateTag,
    onCherryPick,
    onRevert,
    onReset,
    onSquash,
    onInteractiveRebase,
    onCopySha,
    onCompare,
    onToggleLockFocus,
  }: Props = $props();

  let menuEl: HTMLDivElement;
  let showResetSubmenu = $state<boolean>(false);
  let posX = $state<number>(0);
  let posY = $state<number>(0);

  onMount(() => {
    posX = x;
    posY = y;
    if (menuEl) {
      const rect = menuEl.getBoundingClientRect();
      if (x + rect.width > window.innerWidth) {
        posX = window.innerWidth - rect.width - 12;
      }
      if (y + rect.height > window.innerHeight) {
        posY = window.innerHeight - rect.height - 12;
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<div
  bind:this={menuEl}
  style="top: {posY}px; left: {posX}px;"
  class="fixed z-50 min-w-56 bg-white/95 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl shadow-2xl backdrop-blur-xl p-1.5 text-xs text-zinc-800 dark:text-zinc-200 animate-in fade-in zoom-in-95 duration-100 font-sans select-none"
  role="menu"
  tabindex="-1"
  onclick={(e) => e.stopPropagation()}
  onmousedown={(e) => e.stopPropagation()}
>
  <!-- Header with Commit short info -->
  <div class="px-2.5 py-1.5 border-b border-zinc-200 dark:border-zinc-800 text-[11px] flex items-center justify-between text-zinc-600 dark:text-zinc-400">
    <span class="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{commit.short_id}</span>
    <span class="truncate max-w-[120px] text-zinc-500">{commit.author_name}</span>
  </div>

  <div class="py-1 space-y-0.5">
    {#if selectedCount > 1 && onSquash}
      <!-- Multi-select Squash option -->
      <button
        onclick={() => {
          onSquash();
          onClose();
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white hover:bg-amber-100 dark:hover:bg-amber-600/30 transition-colors cursor-pointer font-semibold"
        role="menuitem"
      >
        <Layers class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        <span>{localeState.t('graph.contextMenu.squashCommits', { count: selectedCount })}</span>
      </button>
      <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>
    {/if}

    {#if onCreateBranch}
      <!-- Create Branch from here -->
      <button
        onclick={() => {
          onCreateBranch(commit);
          onClose();
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        role="menuitem"
      >
        <GitBranch class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>{localeState.t('graph.contextMenu.createBranch')}</span>
      </button>
    {/if}

    {#if onCreateTag}
      <!-- Create Tag from here -->
      <button
        onclick={() => {
          onCreateTag(commit);
          onClose();
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        role="menuitem"
      >
        <Tag class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        <span>{localeState.t('graph.contextMenu.createTag')}</span>
      </button>
    {/if}

    {#if onCompare}
      <!-- Compare with HEAD -->
      <button
        onclick={() => {
          onCompare(commit);
          onClose();
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        role="menuitem"
      >
        <GitCompare class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        <span>{localeState.t('graph.contextMenu.compareWithCurrent')}</span>
      </button>
    {/if}

    {#if onToggleLockFocus}
      <!-- Lock Focus to Branch -->
      <button
        onclick={() => {
          onToggleLockFocus(commit.lane);
          onClose();
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        role="menuitem"
      >
        <Eye class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
        <span>{isLockedFocus ? localeState.t('graph.contextMenu.unlockFocus') : localeState.t('graph.contextMenu.lockFocus')}</span>
      </button>
    {/if}

    <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>

    {#if onCherryPick}
      <!-- Cherry-pick Commit -->
      <button
        onclick={() => {
          onCherryPick(commit);
          onClose();
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 hover:text-cyan-950 dark:hover:text-cyan-100 transition-colors cursor-pointer"
        role="menuitem"
        title={localeState.t('graph.contextMenu.cherryPickTooltip')}
      >
        <GitPullRequest class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        <span>{localeState.t('graph.contextMenu.cherryPick')}</span>
      </button>
    {/if}

    {#if onRevert}
      <!-- Revert Commit -->
      <button
        onclick={() => {
          onRevert(commit);
          onClose();
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100 transition-colors cursor-pointer"
        role="menuitem"
        title={localeState.t('graph.contextMenu.revertTooltip')}
      >
        <RotateCcw class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        <span>{localeState.t('graph.contextMenu.revert')}</span>
      </button>
    {/if}

    {#if onInteractiveRebase}
      <!-- Interactive Rebase onto this commit -->
      <button
        onclick={() => {
          onInteractiveRebase(commit);
          onClose();
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 transition-colors cursor-pointer"
        role="menuitem"
        title={localeState.t('graph.contextMenu.interactiveRebaseTooltip')}
      >
        <GitFork class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
        <span>{localeState.t('graph.contextMenu.interactiveRebase')}</span>
      </button>
    {/if}

    {#if onReset}
      <!-- Reset HEAD to this commit (With Submenu / toggle) -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="relative"
        onmouseenter={() => (showResetSubmenu = true)}
        onmouseleave={() => (showResetSubmenu = false)}
      >
        <button
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
          role="menuitem"
        >
          <div class="flex items-center gap-2">
            <Rewind class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>{localeState.t('graph.contextMenu.resetHead')}</span>
          </div>
          <span class="text-[10px] text-zinc-400 dark:text-zinc-500">▶</span>
        </button>

        {#if showResetSubmenu}
          <div
            class="absolute left-full top-0 ml-1 min-w-48 bg-white/95 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-xl shadow-2xl backdrop-blur-xl p-1.5 text-xs text-zinc-800 dark:text-zinc-200 z-50"
          >
            <button
              onclick={() => {
                onReset(commit, 'soft');
                onClose();
              }}
              class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              <div class="font-bold text-emerald-700 dark:text-emerald-300">{localeState.t('graph.contextMenu.softResetTitle')}</div>
              <div class="text-[10px] text-zinc-500 dark:text-zinc-400">{localeState.t('graph.contextMenu.softResetDesc')}</div>
            </button>

            <button
              onclick={() => {
                onReset(commit, 'mixed');
                onClose();
              }}
              class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              <div class="font-bold text-cyan-700 dark:text-cyan-300">{localeState.t('graph.contextMenu.mixedResetTitle')}</div>
              <div class="text-[10px] text-zinc-500 dark:text-zinc-400">{localeState.t('graph.contextMenu.mixedResetDesc')}</div>
            </button>

            <button
              onclick={() => {
                onReset(commit, 'hard');
                onClose();
              }}
              class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:text-rose-950 dark:hover:text-rose-100 transition-colors cursor-pointer"
            >
              <div class="font-bold text-rose-600 dark:text-rose-400">{localeState.t('graph.contextMenu.hardResetTitle')}</div>
              <div class="text-[10px] text-rose-600/80 dark:text-rose-300/70">{localeState.t('graph.contextMenu.hardResetDesc')}</div>
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>

    <!-- Copy SHA -->
    <button
      onclick={() => {
        onCopySha(commit.id);
        onClose();
      }}
      class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-950 dark:hover:text-zinc-200 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer text-[11px]"
      role="menuitem"
    >
      <Copy class="w-3.5 h-3.5 text-zinc-400" />
      <span>{localeState.t('graph.contextMenu.copySha', { shortId: commit.short_id })}</span>
    </button>
  </div>
</div>
