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
  } from 'lucide-svelte';

  interface Props {
    x: number;
    y: number;
    commit: CommitNode;
    selectedCount?: number;
    onClose: () => void;
    onCreateBranch: (commit: CommitNode) => void;
    onCreateTag: (commit: CommitNode) => void;
    onRevert: (commit: CommitNode) => void;
    onReset: (commit: CommitNode, mode: 'soft' | 'mixed' | 'hard') => void;
    onSquash?: () => void;
    onInteractiveRebase?: (commit: CommitNode) => void;
    onCopySha: (sha: string) => void;
    onCompare?: (commit: CommitNode) => void;
  }

  let {
    x,
    y,
    commit,
    selectedCount = 1,
    onClose,
    onCreateBranch,
    onCreateTag,
    onRevert,
    onReset,
    onSquash,
    onInteractiveRebase,
    onCopySha,
    onCompare,
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

<div
  bind:this={menuEl}
  style="top: {posY}px; left: {posX}px;"
  class="fixed z-50 min-w-56 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100 font-sans select-none"
  role="menu"
>
  <!-- Header with Commit short info -->
  <div class="px-2.5 py-1.5 border-b border-zinc-800 text-[11px] flex items-center justify-between text-zinc-400">
    <span class="font-mono text-cyan-400 font-bold">{commit.short_id}</span>
    <span class="truncate max-w-[120px] text-zinc-500">{commit.author_name}</span>
  </div>

  <div class="py-1 space-y-0.5">
    {#if selectedCount > 1 && onSquash}
      <!-- Multi-select Squash option -->
      <button
        onclick={() => {
          onClose();
          onSquash();
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-300 hover:text-white hover:bg-amber-600/30 transition-colors cursor-pointer font-semibold"
        role="menuitem"
      >
        <Layers class="w-3.5 h-3.5 text-amber-400" />
        <span>Gộp {selectedCount} commit thành 1 (Squash)</span>
      </button>
      <div class="my-1 border-t border-zinc-800"></div>
    {/if}

    <!-- Create Branch from here -->
    <button
      onclick={() => {
        onClose();
        onCreateBranch(commit);
      }}
      class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
      role="menuitem"
    >
      <GitBranch class="w-3.5 h-3.5 text-emerald-400" />
      <span>Tạo nhánh mới tại commit này...</span>
    </button>

    <!-- Create Tag from here -->
    <button
      onclick={() => {
        onClose();
        onCreateTag(commit);
      }}
      class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
      role="menuitem"
    >
      <Tag class="w-3.5 h-3.5 text-amber-400" />
      <span>Tạo Tag / Release tại đây...</span>
    </button>

    {#if onCompare}
      <!-- Compare with HEAD -->
      <button
        onclick={() => {
          onClose();
          onCompare(commit);
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
        role="menuitem"
      >
        <GitCompare class="w-3.5 h-3.5 text-cyan-400" />
        <span>So sánh với commit hiện tại</span>
      </button>
    {/if}

    <div class="my-1 border-t border-zinc-800"></div>

    <!-- Revert Commit -->
    <button
      onclick={() => {
        onClose();
        onRevert(commit);
      }}
      class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-300 hover:text-rose-100 transition-colors cursor-pointer"
      role="menuitem"
      title="Tạo commit mới đảo ngược lại commit này an toàn"
    >
      <RotateCcw class="w-3.5 h-3.5 text-rose-400" />
      <span>Revert commit này (git revert)</span>
    </button>

    {#if onInteractiveRebase}
      <!-- Interactive Rebase onto this commit -->
      <button
        onclick={() => {
          onClose();
          onInteractiveRebase(commit);
        }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-950/40 text-amber-300 hover:text-amber-100 transition-colors cursor-pointer"
        role="menuitem"
        title="Interactive Rebase các commit từ HEAD xuống commit này (git rebase -i)"
      >
        <GitFork class="w-3.5 h-3.5 text-amber-400" />
        <span>Rebase tương tác lên đây (git rebase -i)</span>
      </button>
    {/if}

    <!-- Reset HEAD to this commit (With Submenu / toggle) -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="relative"
      onmouseenter={() => (showResetSubmenu = true)}
      onmouseleave={() => (showResetSubmenu = false)}
    >
      <button
        class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
        role="menuitem"
      >
        <div class="flex items-center gap-2 text-zinc-200">
          <Rewind class="w-3.5 h-3.5 text-purple-400" />
          <span>Reset HEAD về commit này</span>
        </div>
        <span class="text-[10px] text-zinc-500">▶</span>
      </button>

      {#if showResetSubmenu}
        <div
          class="absolute left-full top-0 ml-1 min-w-48 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 text-xs text-zinc-200 z-50"
        >
          <button
            onclick={() => {
              onClose();
              onReset(commit, 'soft');
            }}
            class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
          >
            <div class="font-bold text-emerald-300">Soft Reset</div>
            <div class="text-[10px] text-zinc-400">Giữ nguyên thay đổi ở Staged</div>
          </button>

          <button
            onclick={() => {
              onClose();
              onReset(commit, 'mixed');
            }}
            class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
          >
            <div class="font-bold text-cyan-300">Mixed Reset (Mặc định)</div>
            <div class="text-[10px] text-zinc-400">Giữ thay đổi ở Working Tree</div>
          </button>

          <button
            onclick={() => {
              onClose();
              onReset(commit, 'hard');
            }}
            class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-300 hover:text-rose-100 transition-colors cursor-pointer"
          >
            <div class="font-bold text-rose-400">Hard Reset (Nguy hiểm)</div>
            <div class="text-[10px] text-rose-300/70">Xóa sạch code về commit này (Undo Ctrl+Z)</div>
          </button>
        </div>
      {/if}
    </div>

    <div class="my-1 border-t border-zinc-800"></div>

    <!-- Copy SHA -->
    <button
      onclick={() => {
        onClose();
        onCopySha(commit.id);
      }}
      class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 hover:text-zinc-200 text-zinc-400 transition-colors cursor-pointer text-[11px]"
      role="menuitem"
    >
      <Copy class="w-3.5 h-3.5 text-zinc-400" />
      <span>Sao chép SHA ({commit.short_id})</span>
    </button>
  </div>
</div>
