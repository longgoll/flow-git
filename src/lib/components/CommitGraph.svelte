<script lang="ts">
  import { onMount } from "svelte";
  import { Layers } from "lucide-svelte";
  import type { CommitNode, ConflictSimulationResult, GraphDensity, GraphViewMode } from "../types";
  import { simulateDragAction } from "../api";
  import { renderCommitGraph } from "../utils/graphRenderer";
  import DragAvatarTooltip from "./graph/DragAvatarTooltip.svelte";
  import GraphHeaderControls from "./graph/GraphHeaderControls.svelte";
  import GraphFloatingDock from "./graph/GraphFloatingDock.svelte";
  import { deriveDisplayCommits, buildCommitIndexMap, deriveGraphEdges } from "./graph/graphCapsuleUtils";
  import CommitContextMenu from "./CommitContextMenu.svelte";
  import { toast } from "../state/toastState.svelte";
  import { themeState } from "../state/themeState.svelte";
  import { localeState } from "../state/localeState.svelte";

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
    onCherryPickCommit?: (commit: CommitNode) => void;
    onRevertCommit?: (commit: CommitNode) => void;
    onResetCommit?: (
      commit: CommitNode,
      mode: "soft" | "mixed" | "hard",
    ) => void;
    onSquashCommits?: (commits: CommitNode[]) => void;
    onInteractiveRebase?: (commit: CommitNode) => void;
    onOpenDropAction?: (
      source: CommitNode,
      target: CommitNode,
      simulation: ConflictSimulationResult | null,
      pos: { x: number; y: number },
    ) => void;
  }

  let {
    commits = [],
    selectedCommitId = null,
    selectedCommitIds = [],
    repoPath = "",
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
    onSelectCommit,
    onSelectMultipleCommits,
    onCompareCommits,
    onCreateBranch,
    onCreateTag,
    onCherryPickCommit,
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

  let viewMode = $state<GraphViewMode>('micro');
  let density = $state<GraphDensity>('comfortable');
  let autoCapsule = $state(true);
  let expandedCapsuleIds = $state<Set<string>>(new Set());
  let lockedLane = $state<number | null>(null);

  let rowHeight = $derived.by(() => {
    switch (density) {
      case 'ultra':
        return 20;
      case 'compact':
        return 28;
      case 'comfortable':
      default:
        return 36;
    }
  });

  // Derive displayCommits by applying Macro View filtering and Semantic Capsule collapsing
  let displayCommits = $derived(
    deriveDisplayCommits(commits, viewMode, autoCapsule, expandedCapsuleIds)
  );

  let totalHeight = $derived(displayCommits.length * rowHeight);
  let maxScrollTop = $derived(Math.max(0, totalHeight - containerHeight));
  let scrollThumbHeight = $derived(
    totalHeight > 0
      ? Math.max(
          30,
          Math.min(
            containerHeight,
            (containerHeight / totalHeight) * containerHeight,
          ),
        )
      : 0,
  );
  let scrollThumbTop = $derived(
    maxScrollTop > 0
      ? (scrollTop / maxScrollTop) * (containerHeight - scrollThumbHeight)
      : 0,
  );

  let activeSelectedIds = $derived(
    selectedCommitIds && selectedCommitIds.length > 0
      ? selectedCommitIds
      : selectedCommitId
        ? [selectedCommitId]
        : [],
  );

  // Fast OID to index mapping of displayCommits
  let commitIndexMap = $derived(buildCommitIndexMap(displayCommits));

  // Precalculate continuous graph edges for Pass-through viewport intersection
  let graphEdges = $derived(deriveGraphEdges(displayCommits, commitIndexMap));

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

    if (
      canvasEl.width !== Math.round(width * dpr) ||
      canvasEl.height !== Math.round(height * dpr)
    ) {
      canvasEl.width = Math.round(width * dpr);
      canvasEl.height = Math.round(height * dpr);
    }

    renderCommitGraph(ctx, {
      commits: displayCommits,
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
      isDark: themeState.isDark,
      lockedLane,
      viewMode,
      edges: graphEdges,
      rowHeight,
    });
  }

  $effect(() => {
    // Re-render graph when theme changes
    scheduleRender();
  });

  onMount(() => {
    if (!canvasEl || !containerEl) return;
    ctx = canvasEl.getContext("2d", { alpha: true });

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
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
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
      if (remainingDistance < rowHeight * 20) {
        onLoadMore();
      }
    }
  }

  function handleWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      // Zoom density via Ctrl + Wheel
      if (e.deltaY < 0) {
        // Zoom in -> toward comfortable
        if (density === 'ultra') density = 'compact';
        else if (density === 'compact') density = 'comfortable';
      } else if (e.deltaY > 0) {
        // Zoom out -> toward ultra
        if (density === 'comfortable') density = 'compact';
        else if (density === 'compact') density = 'ultra';
      }
      scheduleRender();
      return;
    }

    e.preventDefault();
    const newScrollTop = Math.max(
      0,
      Math.min(maxScrollTop, scrollTop + e.deltaY),
    );
    if (newScrollTop !== scrollTop) {
      scrollTop = newScrollTop;
      checkTriggerLoadMore(scrollTop);
      scheduleRender();
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if (isDraggingScrollbar || e.target !== canvasEl) return;
    const rect = containerEl.getBoundingClientRect();
    const y = e.clientY - rect.top + scrollTop;
    const clickedIndex = Math.floor(y / rowHeight);

    if (clickedIndex >= 0 && clickedIndex < displayCommits.length) {
      const commit = displayCommits[clickedIndex];
      if (commit.is_capsule) return;
      isMouseDown = true;
      mouseDownPos = { x: e.clientX, y: e.clientY };
      draggedCommit = commit;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDraggingNode && e.target !== canvasEl) return;
    const rect = containerEl.getBoundingClientRect();
    const y = e.clientY - rect.top + scrollTop;
    const hoveredIndex = Math.floor(y / rowHeight);

    if (isMouseDown && draggedCommit && !isDraggingNode) {
      const dist = Math.hypot(
        e.clientX - mouseDownPos.x,
        e.clientY - mouseDownPos.y,
      );
      if (dist > 6) {
        isDraggingNode = true;
      }
    }

    if (isDraggingNode && draggedCommit) {
      dragMousePos = { x: e.clientX, y: e.clientY };

      const target =
        hoveredIndex >= 0 && hoveredIndex < displayCommits.length
          ? displayCommits[hoveredIndex]
          : null;

      if (target && !target.is_capsule && target.id !== draggedCommit.id) {
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

    if (hoveredIndex >= 0 && hoveredIndex < displayCommits.length) {
      const hoveredCommit = displayCommits[hoveredIndex];
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
        console.error("Simulation error:", err);
      } finally {
        isSimulating = false;
      }
    }, 100);
  }

  function handleGlobalMouseUp(e: MouseEvent) {
    if (
      isDraggingNode &&
      draggedCommit &&
      hoveredTargetCommit &&
      hoveredTargetCommit.id !== draggedCommit.id
    ) {
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
    if (isDraggingNode || e.target !== canvasEl) return;
    const rect = containerEl.getBoundingClientRect();
    const y = e.clientY - rect.top + scrollTop;
    const clickedIndex = Math.floor(y / rowHeight);

    if (clickedIndex >= 0 && clickedIndex < displayCommits.length) {
      const commit = displayCommits[clickedIndex];

      // If clicked on capsule node: toggle expansion
      if (commit.is_capsule) {
        if (expandedCapsuleIds.has(commit.id)) {
          expandedCapsuleIds.delete(commit.id);
          toast.info(
            localeState.t('graph.canvas.collapsedTitle'),
            localeState.t('graph.canvas.collapsedDesc', { count: commit.capsule_count || 3 })
          );
        } else {
          expandedCapsuleIds.add(commit.id);
          toast.info(
            localeState.t('graph.canvas.expandedTitle'),
            localeState.t('graph.canvas.expandedDesc', { count: commit.capsule_count || 3 })
          );
        }
        expandedCapsuleIds = new Set(expandedCapsuleIds);
        scheduleRender();
        return;
      }

      // Shift + Click: Chọn một dải commit (Range selection)
      if (e.shiftKey && selectedCommitId && selectedCommitId !== commit.id) {
        const lastIndex = commitIndexMap.get(selectedCommitId);
        if (lastIndex !== undefined) {
          const start = Math.min(lastIndex, clickedIndex);
          const end = Math.max(lastIndex, clickedIndex);
          const rangeIds = displayCommits
            .slice(start, end + 1)
            .filter((c) => !c.is_capsule)
            .map((c) => c.id);
          if (onSelectMultipleCommits) {
            onSelectMultipleCommits(rangeIds);
            scheduleRender();
            return;
          }
        }
      }

      // Ctrl / Cmd + Click: Toggle thêm/bớt commit vào tập lựa chọn
      if (
        (e.ctrlKey || e.metaKey) &&
        selectedCommitId &&
        selectedCommitId !== commit.id
      ) {
        const currentList =
          selectedCommitIds && selectedCommitIds.length > 0
            ? [...selectedCommitIds]
            : [selectedCommitId];
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
      if (
        onSelectMultipleCommits &&
        selectedCommitIds &&
        selectedCommitIds.length > 0
      ) {
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
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      selectAdjacentCommit(1);
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      selectAdjacentCommit(-1);
    } else if (e.key === "m" || e.key === "M") {
      e.preventDefault();
      viewMode = viewMode === "micro" ? "macro" : "micro";
      toast.info(
        localeState.t('graph.canvas.viewModeTitle'),
        localeState.t('graph.canvas.viewModeDesc', { mode: viewMode === "macro" ? "Macro Map (PR View)" : "Micro DAG" })
      );
      scheduleRender();
    } else if (e.key === "c" || e.key === "C") {
      e.preventDefault();
      autoCapsule = !autoCapsule;
      toast.info(
        localeState.t('graph.canvas.capsulesTitle'),
        localeState.t('graph.canvas.capsulesDesc', {
          state: autoCapsule ? localeState.t('graph.canvas.stateOn') : localeState.t('graph.canvas.stateOff'),
        })
      );
      scheduleRender();
    } else if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      if (selectedCommitId) {
        const curr = displayCommits.find((c) => c.id === selectedCommitId);
        if (curr) {
          if (lockedLane === curr.lane) {
            lockedLane = null;
            toast.info(
              localeState.t('graph.canvas.focusUnlocked'),
              localeState.t('graph.canvas.focusUnlockedDesc')
            );
          } else {
            lockedLane = curr.lane;
            toast.success(
              localeState.t('graph.canvas.focusLocked'),
              localeState.t('graph.canvas.focusLockedDesc', { lane: curr.lane })
            );
          }
          scheduleRender();
        }
      }
    } else if (e.key === "[" || e.key === "]") {
      e.preventDefault();
      jumpToNextMilestone(e.key === "]" ? 1 : -1);
    } else if (
      (e.key === "s" || e.key === "S") &&
      activeSelectedIds.length >= 2 &&
      onSquashCommits
    ) {
      e.preventDefault();
      const selectedCommits = displayCommits.filter((c) =>
        activeSelectedIds.includes(c.id),
      );
      onSquashCommits(selectedCommits);
    }
  }

  function jumpToNextMilestone(offset: number) {
    if (displayCommits.length === 0) return;
    const currentIndex = displayCommits.findIndex((c) => c.id === selectedCommitId);
    let idx = currentIndex === -1 ? (offset > 0 ? 0 : displayCommits.length - 1) : currentIndex + offset;

    while (idx >= 0 && idx < displayCommits.length) {
      const c = displayCommits[idx];
      const isMilestone =
        !c.is_capsule &&
        ((c.refs && c.refs.length > 0) ||
          (c.parents && c.parents.length > 1) ||
          !c.parents ||
          c.parents.length === 0);
      if (isMilestone) {
        onSelectCommit(c);
        const itemTop = idx * rowHeight;
        scrollTop = Math.max(0, Math.min(maxScrollTop, itemTop - containerHeight / 2));
        scheduleRender();
        const label = c.refs?.[0]?.shorthand || c.short_id;
        toast.info(localeState.t('graph.canvas.milestoneJumpTitle'), `${label}: ${c.summary}`);
        return;
      }
      idx += offset;
    }
  }

  function handleContextMenu(e: MouseEvent) {
    if (e.target !== canvasEl) return;
    e.preventDefault();
    const rect = containerEl.getBoundingClientRect();
    const y = e.clientY - rect.top + scrollTop;
    const clickedIndex = Math.floor(y / rowHeight);

    if (clickedIndex >= 0 && clickedIndex < displayCommits.length) {
      const commit = displayCommits[clickedIndex];
      if (commit.is_capsule) return;
      if (
        !selectedCommitIds?.includes(commit.id) &&
        selectedCommitId !== commit.id
      ) {
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
    if (displayCommits.length === 0) return;
    const currentIndex = displayCommits.findIndex((c) => c.id === selectedCommitId);
    let nextIndex = currentIndex + offset;
    if (currentIndex === -1) {
      nextIndex = 0;
    }
    while (nextIndex >= 0 && nextIndex < displayCommits.length && displayCommits[nextIndex].is_capsule) {
      nextIndex += offset > 0 ? 1 : -1;
    }
    if (nextIndex >= 0 && nextIndex < displayCommits.length) {
      const targetCommit = displayCommits[nextIndex];
      onSelectCommit(targetCommit);

      const itemTop = nextIndex * rowHeight;
      const itemBottom = itemTop + rowHeight;
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
      scrollTop = Math.max(
        0,
        Math.min(maxScrollTop, scrollbarStartScrollTop + scrollDelta),
      );
      scheduleRender();
    };

    const onMouseUp = () => {
      isDraggingScrollbar = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }
</script>

<div class="flex flex-col w-full h-full bg-white dark:bg-zinc-950 overflow-hidden select-none">
  <!-- Graph Control Sub-Header -->
  <GraphHeaderControls
    displayCount={displayCommits.length}
    totalCount={commits.length}
    lockedLane={lockedLane}
    bind:viewMode
    bind:autoCapsule
    {density}
    onChangeDensity={(newDensity) => {
      density = newDensity;
      scheduleRender();
    }}
    onUnlockLane={() => {
      lockedLane = null;
      scheduleRender();
    }}
    onToggleViewMode={(mode) => {
      viewMode = mode;
      scheduleRender();
    }}
    onToggleAutoCapsule={() => {
      autoCapsule = !autoCapsule;
      scheduleRender();
    }}
  />

  <!-- Canvas Container -->
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
    class="relative flex-1 w-full h-full bg-white dark:bg-zinc-950 overflow-hidden cursor-pointer focus:outline-none select-none"
  >
    <canvas bind:this={canvasEl} class="w-full h-full block"></canvas>

  <!-- Custom Scrollbar -->
  {#if totalHeight > containerHeight}
    <div
      class="absolute top-0 right-0 w-2.5 h-full bg-zinc-100/60 dark:bg-zinc-900/30 border-l border-zinc-200/60 dark:border-zinc-800/40 pointer-events-auto"
    >
      <div
        role="scrollbar"
        aria-orientation="vertical"
        aria-valuenow={scrollTop}
        aria-valuemin={0}
        aria-valuemax={maxScrollTop}
        aria-controls="graph-canvas"
        tabindex="0"
        onmousedown={startScrollbarDrag}
        class="w-full rounded-full transition-colors cursor-grab active:cursor-grabbing {isDraggingScrollbar
          ? 'bg-cyan-500/80'
          : 'bg-zinc-300 dark:bg-zinc-700/60 hover:bg-zinc-400 dark:hover:bg-zinc-600/80'}"
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
    <div
      class="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-2 pointer-events-none"
    >
      <span class="text-sm">No commits to display.</span>
      <span class="text-xs text-zinc-500"
        >Open a repository or change your filter settings.</span
      >
    </div>
  {/if}

  <!-- Lazy Loading Indicator -->
  {#if isLoadingMore}
    <div
      class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-neutral-900/90 border border-zinc-200 dark:border-neutral-700 shadow-xl backdrop-blur-md flex items-center gap-2 text-xs text-zinc-700 dark:text-neutral-300 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <span
        class="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"
      ></span>
      <span>{localeState.t('graph.canvas.loadingMore')}</span>
    </div>
  {/if}

  <!-- Multi-commit Floating Action Dock -->
  <GraphFloatingDock
    {activeSelectedIds}
    {commits}
    {onSquashCommits}
    {onCompareCommits}
    onDeselect={() => {
      if (onSelectMultipleCommits) onSelectMultipleCommits([]);
      else if (selectedCommitId)
        onSelectCommit(
          commits.find((c) => c.id === selectedCommitId) || commits[0],
        );
    }}
  />

  {#if commits.length === 0}
    <div
      class="absolute inset-0 flex flex-col items-center justify-center text-center p-6 select-none pointer-events-none z-10"
    >
      <div
        class="p-6 rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-zinc-200 dark:border-neutral-800 shadow-2xl max-w-md pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
      >
        <div
          class="w-12 h-12 mx-auto mb-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-inner"
        >
          <Layers class="w-6 h-6" />
        </div>
        <h3 class="text-sm font-semibold text-zinc-900 dark:text-neutral-100">
          {localeState.t('graph.canvas.emptyTitle')}
        </h3>
        <p
          class="text-xs text-zinc-500 dark:text-neutral-400 mt-2 leading-relaxed"
        >
          {localeState.t('graph.canvas.emptyDesc')}
        </p>
      </div>
    </div>
  {/if}

  {#if contextMenuData}
    <CommitContextMenu
      x={contextMenuData.x}
      y={contextMenuData.y}
      commit={contextMenuData.commit}
      selectedCount={activeSelectedIds.length > 1
        ? activeSelectedIds.length
        : 1}
      isLockedFocus={lockedLane === contextMenuData.commit.lane}
      onToggleLockFocus={(lane) => {
        if (lockedLane === lane) {
          lockedLane = null;
          toast.info(localeState.t('graph.canvas.focusUnlocked'), localeState.t('graph.canvas.focusUnlockedDesc'));
        } else {
          lockedLane = lane;
          toast.success(localeState.t('graph.canvas.focusLocked'), localeState.t('graph.canvas.focusLockedDesc', { lane: lane.toString() }));
        }
        scheduleRender();
      }}
      onClose={() => (contextMenuData = null)}
      onCreateBranch={onCreateBranch
        ? (c) => {
            onCreateBranch(c);
            contextMenuData = null;
          }
        : undefined}
      onCreateTag={onCreateTag
        ? (c) => {
            onCreateTag(c);
            contextMenuData = null;
          }
        : undefined}
      onCherryPick={onCherryPickCommit
        ? (c) => {
            onCherryPickCommit(c);
            contextMenuData = null;
          }
        : undefined}
      onRevert={onRevertCommit
        ? (c) => {
            onRevertCommit(c);
            contextMenuData = null;
          }
        : undefined}
      onReset={onResetCommit
        ? (c, mode) => {
            onResetCommit(c, mode);
            contextMenuData = null;
          }
        : undefined}
      onSquash={onSquashCommits
        ? () => {
            const selectedCommits = commits.filter((c) =>
              activeSelectedIds.includes(c.id),
            );
            onSquashCommits(selectedCommits);
            contextMenuData = null;
          }
        : undefined}
      onInteractiveRebase={onInteractiveRebase
        ? (c) => {
            onInteractiveRebase(c);
            contextMenuData = null;
          }
        : undefined}
      onCopySha={(sha) => {
        navigator.clipboard.writeText(sha);
        toast.success(localeState.t('graph.canvas.copiedSha'), localeState.t('graph.canvas.copiedShaDesc', { shortId: sha.slice(0, 7) }));
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
</div>
