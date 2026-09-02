<script lang="ts">
  import { onMount } from 'svelte';
  import type { CommitNode, ConflictSimulationResult } from '../types';
  import { simulateDragAction } from '../api';
  import { ROW_HEIGHT, renderCommitGraph } from '../utils/graphRenderer';
  import DragAvatarTooltip from './graph/DragAvatarTooltip.svelte';
  import CommitContextMenu from './CommitContextMenu.svelte';
  import { GitCompare, Copy, X, Layers } from 'lucide-svelte';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    commits: CommitNode[];
    selectedCommitId: string | null;
    selectedCommitIds?: string[];
    repoPath?: string;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void;
    onSelectCommit: (commit: CommitNode) => void;
    onSelectMultipleCommits?: (commitIds: string[]) => void;
    onCompareCommits?: (c1: CommitNode, c2: CommitNode) => void;
    onCreateBranch?: (commit: CommitNode) => void;
    onCreateTag?: (commit: CommitNode) => void;
    onRevertCommit?: (commit: CommitNode) => void;
    onResetCommit?: (commit: CommitNode, mode: 'soft' | 'mixed' | 'hard') => void;
    onSquashCommits?: (commits: CommitNode[]) => void;
    onInteractiveRebase?: (commit: CommitNode) => void;
    onOpenDropAction?: (
      source: CommitNode,
      target: CommitNode,
      simulation: ConflictSimulationResult | null,
      pos: { x: number; y: number }
    ) => void;
  }

  let {
    commits = [],
    selectedCommitId = null,
    selectedCommitIds = [],
    repoPath = '',
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
    onSelectCommit,
    onSelectMultipleCommits,
    onCompareCommits,
    onCreateBranch,
    onCreateTag,
    onRevertCommit,
    onResetCommit,
    onSquashCommits,
    onInteractiveRebase,
    onOpenDropAction,
  }: Props = $props();

  let containerEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;

  let scrollTop = $state(0);
  let containerHeight = $state(600);
  let containerWidth = $state(800);
  let isDraggingScrollbar = $state(false);
  let contextMenuData = $state<{
    x: number;
    y: number;
    commit: CommitNode;
  } | null>(null);
  let scrollbarStartY = 0;
  let scrollbarStartScrollTop = 0;
  let hoveredCommitId = $state<string | null>(null);

  // Drag & Drop Node Interaction state
  let isMouseDown = false;
  let mouseDownPos = { x: 0, y: 0 };
  let isDraggingNode = $state(false);
  let draggedCommit = $state<CommitNode | null>(null);
  let hoveredTargetCommit = $state<CommitNode | null>(null);
  let dragMousePos = $state({ x: 0, y: 0 });
  let simulationResult = $state<ConflictSimulationResult | null>(null);
  let isSimulating = $state(false);
  let simulationDebounceTimer: any = null;

  let totalHeight = $derived(commits.length * ROW_HEIGHT);
  let maxScrollTop = $derived(Math.max(0, totalHeight - containerHeight));
  let scrollThumbHeight = $derived(
    totalHeight > 0
      ? Math.max(30, Math.min(containerHeight, (containerHeight / totalHeight) * containerHeight))
      : 0
  );
  let scrollThumbTop = $derived(
    maxScrollTop > 0
      ? (scrollTop / maxScrollTop) * (containerHeight - scrollThumbHeight)
      : 0
  );

  let activeSelectedIds = $derived(
    selectedCommitIds && selectedCommitIds.length > 0
      ? selectedCommitIds
      : selectedCommitId
      ? [selectedCommitId]
      : []
  );

  // Fast OID to index mapping
  let commitIndexMap = $derived.by(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < commits.length; i++) {
      if (commits[i]?.id) {
        map.set(commits[i].id, i);
      }
    }
    return map;
  });

  let animFrameId: number | null = null;

  function scheduleRender() {
    if (animFrameId !== null) return;
    animFrameId = requestAnimationFrame(() => {
      animFrameId = null;
      render();
    });
  }

  function render() {
    if (!ctx || !canvasEl) return;
    const width = containerWidth;
    const height = containerHeight;
    const dpr = window.devicePixelRatio || 1;

    if (canvasEl.width !== Math.round(width * dpr) || canvasEl.height !== Math.round(height * dpr)) {
      canvasEl.width = Math.round(width * dpr);
      canvasEl.height = Math.round(height * dpr);
    }

    renderCommitGraph(ctx, {
      commits,
      commitIndexMap,
      activeSelectedIds,
      hoveredCommitId,
      scrollTop,
      containerWidth: width,
      containerHeight: height,
      isDraggingNode,
      draggedCommit,
      hoveredTargetCommit,
      simulationResult,
    });
  }

  onMount(() => {
    if (!canvasEl || !containerEl) return;
    ctx = canvasEl.getContext('2d', { alpha: true });

    const rect = containerEl.getBoundingClientRect();
    containerWidth = rect.width > 0 ? rect.width : 800;
    containerHeight = rect.height > 0 ? rect.height : 600;

    scheduleRender();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          containerWidth = width;
          containerHeight = height;
          scheduleRender();
        }
      }
    });

    resizeObserver.observe(containerEl);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }
    };
  });

  $effect(() => {
    // Re-render when commits, selected commits, or scroll changes
    commits;
    activeSelectedIds;
    hoveredCommitId;
    isDraggingNode;
    hoveredTargetCommit;
    simulationResult;
    scrollTop;
    scheduleRender();
  });

  function checkTriggerLoadMore(currScrollTop: number) {
    if (hasMore && !isLoadingMore && onLoadMore) {
      const remainingDistance = totalHeight - (currScrollTop + containerHeight);
      if (remainingDistance < ROW_HEIGHT * 20) {
        onLoadMore();
      }
    }
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const newScrollTop = Math.max(0, Math.min(maxScrollTop, scrollTop + e.deltaY));
    if (newScrollTop !== scrollTop) {
      scrollTop = newScrollTop;
      checkTriggerLoadMore(scrollTop);
      scheduleRender();
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (isDraggingScrollbar) return;
    const rect = containerEl.getBoundingClientRect();
    const y = e.clientY - rect.top + scrollTop;
    const clickedIndex = Math.floor(y / ROW_HEIGHT);

    if (clickedIndex >= 0 && clickedIndex < commits.length) {
      isMouseDown = true;
      mouseDownPos = { x: e.clientX, y: e.clientY };
      draggedCommit = commits[clickedIndex];
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = containerEl.getBoundingClientRect();
    const y = e.clientY - rect.top + scrollTop;
    const hoveredIndex = Math.floor(y / ROW_HEIGHT);

    if (isMouseDown && draggedCommit && !isDraggingNode) {
      const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
      if (dist > 6) {
        isDraggingNode = true;
      }
    }

    if (isDraggingNode && draggedCommit) {
      dragMousePos = { x: e.clientX, y: e.clientY };

      const target = hoveredIndex >= 0 && hoveredIndex < commits.length ? commits[hoveredIndex] : null;

      if (target && target.id !== draggedCommit.id) {
        if (hoveredTargetCommit?.id !== target.id) {
          hoveredTargetCommit = target;
          triggerDryRunSimulation(draggedCommit.id, target.id);
        }
      } else {
        hoveredTargetCommit = null;
        simulationResult = null;
      }
      scheduleRender();
      return;
    }

    if (hoveredIndex >= 0 && hoveredIndex < commits.length) {
      const hoveredCommit = commits[hoveredIndex];
      if (hoveredCommitId !== hoveredCommit.id) {
        hoveredCommitId = hoveredCommit.id;
        scheduleRender();
      }
    }
  }

  function triggerDryRunSimulation(sourceId: string, targetId: string) {
    clearTimeout(simulationDebounceTimer);
    simulationDebounceTimer = setTimeout(async () => {
      if (!repoPath) return;
      isSimulating = true;
      try {
        const sim = await simulateDragAction(repoPath, sourceId, targetId);
        simulationResult = sim;
        scheduleRender();
      } catch (err) {
        console.error('Simulation error:', err);
      } finally {
        isSimulating = false;
      }
    }, 100);
  }

  function handleGlobalMouseUp(e: MouseEvent) {
    if (isDraggingNode && draggedCommit && hoveredTargetCommit && hoveredTargetCommit.id !== draggedCommit.id) {
      if (onOpenDropAction) {
        onOpenDropAction(draggedCommit, hoveredTargetCommit, simulationResult, {
          x: e.clientX,
          y: e.clientY,
        });
      }
    }

    isMouseDown = false;
    isDraggingNode = false;
    draggedCommit = null;
    hoveredTargetCommit = null;
    simulationResult = null;
    scheduleRender();
  }

  function handleClick(e: MouseEvent) {
    if (isDraggingNode) return;
    const rect = containerEl.getBoundingClientRect();
    const y = e.clientY - rect.top + scrollTop;
    const clickedIndex = Math.floor(y / ROW_HEIGHT);

    if (clickedIndex >= 0 && clickedIndex < commits.length) {
      const commit = commits[clickedIndex];

      // Shift + Click: Chọn một dải commit (Range selection)
      if (e.shiftKey && selectedCommitId && selectedCommitId !== commit.id) {
        const lastIndex = commitIndexMap.get(selectedCommitId);
        if (lastIndex !== undefined) {
          const start = Math.min(lastIndex, clickedIndex);
          const end = Math.max(lastIndex, clickedIndex);
          const rangeIds = commits.slice(start, end + 1).map((c) => c.id);
          if (onSelectMultipleCommits) {
            onSelectMultipleCommits(rangeIds);
            scheduleRender();
            return;
          }
        }
      }

      // Ctrl / Cmd + Click: Toggle thêm/bớt commit vào tập lựa chọn
      if ((e.ctrlKey || e.metaKey) && selectedCommitId && selectedCommitId !== commit.id) {
        const currentList = selectedCommitIds && selectedCommitIds.length > 0 ? [...selectedCommitIds] : [selectedCommitId];
        const exists = currentList.indexOf(commit.id);
        if (exists >= 0) {
          currentList.splice(exists, 1);
        } else {
          currentList.push(commit.id);
        }
        if (onSelectMultipleCommits) {
          onSelectMultipleCommits(currentList);
          scheduleRender();
          return;
        }
      }

      // Click thông thường: Chọn 1 commit
      if (onSelectMultipleCommits && selectedCommitIds && selectedCommitIds.length > 0) {
        onSelectMultipleCommits([]);
      }
      onSelectCommit(commit);
    }
  }

  function handleMouseLeave() {
    if (!isDraggingNode) {
      hoveredCommitId = null;
      scheduleRender();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault();
      selectAdjacentCommit(1);
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault();
      selectAdjacentCommit(-1);
    } else if ((e.key === 's' || e.key === 'S') && activeSelectedIds.length >= 2 && onSquashCommits) {
      e.preventDefault();
      const selectedCommits = commits.filter((c) => activeSelectedIds.includes(c.id));
      onSquashCommits(selectedCommits);
    }
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    const rect = containerEl.getBoundingClientRect();
    const y = e.clientY - rect.top + scrollTop;
    const clickedIndex = Math.floor(y / ROW_HEIGHT);

    if (clickedIndex >= 0 && clickedIndex < commits.length) {
      const commit = commits[clickedIndex];
      if (!selectedCommitIds?.includes(commit.id) && selectedCommitId !== commit.id) {
        onSelectCommit(commit);
      }
      contextMenuData = {
        x: e.clientX,
        y: e.clientY,
        commit,
      };
    }
  }

  function selectAdjacentCommit(offset: number) {
    if (commits.length === 0) return;
    const currentIndex = commits.findIndex((c) => c.id === selectedCommitId);
    let nextIndex = currentIndex + offset;
    if (currentIndex === -1) {
      nextIndex = 0;
    }
    if (nextIndex >= 0 && nextIndex < commits.length) {
      const targetCommit = commits[nextIndex];
      onSelectCommit(targetCommit);

      const itemTop = nextIndex * ROW_HEIGHT;
      const itemBottom = itemTop + ROW_HEIGHT;
      if (itemTop < scrollTop) {
        scrollTop = itemTop;
        scheduleRender();
      } else if (itemBottom > scrollTop + containerHeight) {
        scrollTop = itemBottom - containerHeight;
        scheduleRender();
      }
    }
  }

  function startScrollbarDrag(e: MouseEvent) {
    isDraggingScrollbar = true;
    scrollbarStartY = e.clientY;
    scrollbarStartScrollTop = scrollTop;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingScrollbar) return;
      const deltaY = moveEvent.clientY - scrollbarStartY;
      const trackHeight = containerHeight - scrollThumbHeight;
      if (trackHeight <= 0) return;
      const scrollDelta = (deltaY / trackHeight) * maxScrollTop;
      scrollTop = Math.max(0, Math.min(maxScrollTop, scrollbarStartScrollTop + scrollDelta));
      scheduleRender();
    };

    const onMouseUp = () => {
      isDraggingScrollbar = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
<div
  bind:this={containerEl}
  role="region"
  aria-label="Interactive Living Commit Graph"
  tabindex="0"
  onwheel={handleWheel}
  onmousedown={handleMouseDown}
  onclick={handleClick}
  oncontextmenu={handleContextMenu}
  onkeydown={handleKeydown}
  onmousemove={handleMouseMove}
  onmouseleave={handleMouseLeave}
  class="relative w-full h-full bg-zinc-950 overflow-hidden cursor-pointer focus:outline-none select-none"
>
  <canvas bind:this={canvasEl} class="w-full h-full block"></canvas>

  <!-- Custom Scrollbar -->
  {#if totalHeight > containerHeight}
    <div class="absolute top-0 right-0 w-2.5 h-full bg-zinc-900/30 border-l border-zinc-800/40 pointer-events-auto">
      <div
        role="scrollbar"
        aria-orientation="vertical"
        aria-valuenow={scrollTop}
        aria-valuemin={0}
        aria-valuemax={maxScrollTop}
        aria-controls="graph-canvas"
        tabindex="0"
        onmousedown={startScrollbarDrag}
        class="w-full rounded-full transition-colors cursor-grab active:cursor-grabbing {isDraggingScrollbar ? 'bg-cyan-500/80' : 'bg-zinc-700/60 hover:bg-zinc-600/80'}"
        style="height: {scrollThumbHeight}px; transform: translateY({scrollThumbTop}px);"
      ></div>
    </div>
  {/if}

  <!-- Floating Drag Avatar Tooltip -->
  {#if isDraggingNode && draggedCommit}
    <DragAvatarTooltip
      {draggedCommit}
      {hoveredTargetCommit}
      {dragMousePos}
      {simulationResult}
      {isSimulating}
    />
  {/if}

  <!-- Empty State -->
  {#if commits.length === 0}
    <div class="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-2 pointer-events-none">
      <span class="text-sm">No commits to display.</span>
      <span class="text-xs text-zinc-600">Open a repository or change your filter settings.</span>
    </div>
  {/if}

  <!-- Lazy Loading Indicator -->
  {#if isLoadingMore}
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-700 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs text-neutral-300 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      <span class="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></span>
      <span>Đang tải thêm commits...</span>
    </div>
  {/if}

  <!-- Multi-commit Floating Action Dock -->
  {#if activeSelectedIds.length >= 2}
    <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
    <div
      class="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 bg-zinc-900/95 border border-zinc-700/80 backdrop-blur-md shadow-2xl rounded-2xl px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-150 select-none pointer-events-auto"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center gap-2 text-xs font-mono">
        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        <span class="text-zinc-200 font-semibold">{activeSelectedIds.length} commits selected</span>
      </div>

      <div class="h-4 w-px bg-zinc-700"></div>

      {#if onSquashCommits}
        <button
          onclick={() => {
            const selectedCommits = commits.filter((c) => activeSelectedIds.includes(c.id));
            if (selectedCommits.length >= 2) onSquashCommits(selectedCommits);
          }}
          class="px-2.5 py-1 rounded-lg text-xs bg-amber-950/60 hover:bg-amber-900 border border-amber-600/50 text-amber-300 font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:scale-102"
          title="Gộp các commit được chọn thành 1 (S)"
        >
          <Layers class="w-3.5 h-3.5 text-amber-400" />
          <span>Squash (S)</span>
        </button>
      {/if}

      {#if onCompareCommits}
        <button
          onclick={() => {
            const c1 = commits.find((c) => c.id === activeSelectedIds[0]);
            const c2 = commits.find((c) => c.id === activeSelectedIds[activeSelectedIds.length - 1]);
            if (c1 && c2) onCompareCommits(c1, c2);
          }}
          class="px-2.5 py-1 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:scale-102"
          title="So sánh thay đổi giữa 2 đầu commit"
        >
          <GitCompare class="w-3.5 h-3.5 text-cyan-400" />
          <span>Compare Commits</span>
        </button>
      {/if}

      <button
        onclick={() => {
          navigator.clipboard.writeText(activeSelectedIds.join('\n'));
          toast.success("Copied SHAs", `Đã sao chép ${activeSelectedIds.length} mã commit SHA vào clipboard.`);
        }}
        class="px-2.5 py-1 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:scale-102"
        title="Sao chép toàn bộ commit hashes"
      >
        <Copy class="w-3.5 h-3.5 text-zinc-400" />
        <span>Copy SHAs</span>
      </button>

      <button
        onclick={() => {
          if (onSelectMultipleCommits) onSelectMultipleCommits([]);
          else if (selectedCommitId) onSelectCommit(commits.find((c) => c.id === selectedCommitId) || commits[0]);
        }}
        class="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
        title="Bỏ chọn (Esc)"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  {/if}

  {#if commits.length === 0}
    <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6 select-none pointer-events-none z-10">
      <div class="p-6 rounded-2xl bg-neutral-900/95 border border-neutral-800 shadow-2xl max-w-md pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
        <div class="w-12 h-12 mx-auto mb-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-inner">
          <Layers class="w-6 h-6" />
        </div>
        <h3 class="text-sm font-semibold text-neutral-100">Repository mới — Chưa có commit</h3>
        <p class="text-xs text-neutral-400 mt-2 leading-relaxed">
          Nhánh hiện tại chưa có commit nào được tạo. Hãy kiểm tra các tệp trong dự án ở bảng <strong class="text-cyan-300 font-medium">Working Tree</strong> bên trái, đưa vào Staged và tạo Commit đầu tiên của bạn!
        </p>
      </div>
    </div>
  {/if}

  {#if contextMenuData}
    <CommitContextMenu
      x={contextMenuData.x}
      y={contextMenuData.y}
      commit={contextMenuData.commit}
      selectedCount={activeSelectedIds.length > 1 ? activeSelectedIds.length : 1}
      onClose={() => (contextMenuData = null)}
      onCreateBranch={(c) => {
        contextMenuData = null;
        onCreateBranch?.(c);
      }}
      onCreateTag={(c) => {
        contextMenuData = null;
        onCreateTag?.(c);
      }}
      onRevert={(c) => {
        contextMenuData = null;
        onRevertCommit?.(c);
      }}
      onReset={(c, mode) => {
        contextMenuData = null;
        onResetCommit?.(c, mode);
      }}
      onSquash={() => {
        contextMenuData = null;
        const selectedCommits = commits.filter((c) => activeSelectedIds.includes(c.id));
        onSquashCommits?.(selectedCommits);
      }}
      onInteractiveRebase={(c) => {
        contextMenuData = null;
        onInteractiveRebase?.(c);
      }}
      onCopySha={(sha) => {
        navigator.clipboard.writeText(sha);
        toast.success("Copied SHA", `Đã sao chép ${sha.slice(0, 7)}`);
      }}
      onCompare={(c) => {
        const headCommit = commits[0];
        if (headCommit && onCompareCommits) {
          onCompareCommits(c, headCommit);
        }
      }}
    />
  {/if}
</div>
