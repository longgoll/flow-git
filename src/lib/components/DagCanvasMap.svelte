<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { CommitDetail, CommitNode } from '../types';
  import { getCommitInfo } from '../api/repo';
  import { themeState } from '../state/themeState.svelte';
  import { LANE_COLORS_DARK, LANE_COLORS_LIGHT } from '../utils/graphRenderer';
  import {
    Network,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    X,
    GitCommit,
  } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    commits: CommitNode[];
    repoPath: string;
    onClose: () => void;
  }

  let {
    commits = [],
    repoPath = '',
    onClose,
  }: Props = $props();

  let canvasEl: HTMLCanvasElement;
  let containerEl: HTMLDivElement;

  // 2D Pan & Zoom state
  let zoom = $state<number>(1.0);
  let panX = $state<number>(150);
  let panY = $state<number>(100);
  let isPanning = false;
  let startMouseX = 0;
  let startMouseY = 0;
  let animFrameId: number | null = null;

  // Node selection & detail
  let selectedCommit = $state<CommitNode | null>(null);
  let commitDetail = $state<CommitDetail | null>(null);

  // Layout node coordinates map: commit_id -> { x, y, width, height }
  interface DagNodePos {
    x: number;
    y: number;
    width: number;
    height: number;
    commit: CommitNode;
  }
  let nodePositions = new Map<string, DagNodePos>();

  const LANE_WIDTH = 180;
  const ROW_GAP = 90;
  const NODE_WIDTH = 150;
  const NODE_HEIGHT = 44;

  function calculateLayout() {
    nodePositions.clear();
    const idToCommit = new Map<string, CommitNode>();
    commits.forEach((c) => idToCommit.set(c.id, c));

    // Assign positions
    commits.forEach((c, index) => {
      const lane = c.lane || 0;
      const x = lane * LANE_WIDTH + 80;
      const y = index * ROW_GAP + 60;

      nodePositions.set(c.id, {
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        commit: c,
      });
    });
  }

  function requestRedraw() {
    if (animFrameId !== null) return;
    animFrameId = requestAnimationFrame(() => {
      animFrameId = null;
      draw();
    });
  }

  $effect(() => {
    if (themeState.isDark !== undefined) {
      requestRedraw();
    }
  });

  function draw() {
    if (!canvasEl) return;
    const c = canvasEl.getContext('2d');
    if (!c) return;

    const width = canvasEl.width;
    const height = canvasEl.height;

    const isDark = themeState.isDark;
    const laneColors = isDark ? LANE_COLORS_DARK : LANE_COLORS_LIGHT;

    c.save();
    c.clearRect(0, 0, width, height);
    c.fillStyle = isDark ? '#09090b' : '#fafafa';
    c.fillRect(0, 0, width, height);

    // Apply 2D camera transform
    c.translate(panX, panY);
    c.scale(zoom, zoom);

    // Frustum / Viewport Bounds in World Coordinates (Viewport Culling)
    const viewMinX = -panX / zoom - 250;
    const viewMaxX = (width - panX) / zoom + 250;
    const viewMinY = -panY / zoom - 250;
    const viewMaxY = (height - panY) / zoom + 250;

    // 1. Draw subtle background grid
    const gridSize = 40;
    c.strokeStyle = isDark ? 'rgba(39, 39, 42, 0.4)' : 'rgba(212, 212, 216, 0.6)';
    c.lineWidth = 0.5 / zoom;
    const startX = Math.floor((-panX / zoom) / gridSize) * gridSize;
    const endX = startX + (width / zoom) + gridSize * 2;
    const startY = Math.floor((-panY / zoom) / gridSize) * gridSize;
    const endY = startY + (height / zoom) + gridSize * 2;

    c.beginPath();
    for (let x = startX; x < endX; x += gridSize) {
      c.moveTo(x, startY);
      c.lineTo(x, endY);
    }
    for (let y = startY; y < endY; y += gridSize) {
      c.moveTo(startX, y);
      c.lineTo(endX, y);
    }
    c.stroke();

    const isFarOut = zoom < 0.45; // Level of Detail (LOD) trigger

    // 2. Draw connecting Bezier splines between parents and children (with culling)
    nodePositions.forEach((pos) => {
      const commit = pos.commit;
      const childX = pos.x + pos.width / 2;
      const childY = pos.y + pos.height;

      commit.parents.forEach((parentId) => {
        const parentPos = nodePositions.get(parentId);
        if (parentPos) {
          const pX = parentPos.x + parentPos.width / 2;
          const pY = parentPos.y;

          // Frustum culling: Skip spline if both endpoints are out of view
          if (
            (childY < viewMinY && pY < viewMinY) ||
            (childY > viewMaxY && pY > viewMaxY) ||
            (childX < viewMinX && pX < viewMinX) ||
            (childX > viewMaxX && pX > viewMaxX)
          ) {
            return;
          }

          c.beginPath();
          c.strokeStyle = laneColors[commit.lane % laneColors.length];
          c.lineWidth = isFarOut ? 1.5 : 2;
          c.lineCap = 'round';

          // Smooth vertical S-curve
          const midY = (childY + pY) / 2;
          c.moveTo(childX, childY);
          c.bezierCurveTo(childX, midY, pX, midY, pX, pY);
          c.stroke();
        }
      });
    });

    // 3. Draw Nodes (with Viewport Culling & LOD)
    nodePositions.forEach((pos, id) => {
      // Frustum culling: skip rendering if node is completely outside viewport!
      if (
        pos.x + pos.width < viewMinX ||
        pos.x > viewMaxX ||
        pos.y + pos.height < viewMinY ||
        pos.y > viewMaxY
      ) {
        return;
      }

      const commit = pos.commit;
      const isSelected = selectedCommit?.id === id;
      const color = laneColors[commit.lane % laneColors.length];

      // Level of Detail (LOD): If zoomed far out, draw simplified micro-capsule
      if (isFarOut) {
        c.fillStyle = isSelected ? (isDark ? '#ffffff' : '#09090b') : color;
        c.beginPath();
        c.roundRect(pos.x, pos.y + 10, pos.width, 24, 6);
        c.fill();
        return;
      }

      // Detailed card background
      c.fillStyle = isSelected
        ? (isDark ? '#18181b' : '#f4f4f5')
        : (isDark ? '#09090b' : '#ffffff');
      c.strokeStyle = isSelected ? color : (isDark ? 'rgba(63, 63, 70, 0.8)' : 'rgba(228, 228, 231, 1)');
      c.lineWidth = isSelected ? 2 : 1;

      const r = 8;
      c.beginPath();
      c.roundRect(pos.x, pos.y, pos.width, pos.height, r);
      c.fill();
      c.stroke();

      // Left color accent strip
      c.fillStyle = color;
      c.beginPath();
      c.roundRect(pos.x, pos.y, 4, pos.height, [r, 0, 0, r]);
      c.fill();

      // Commit short hash
      c.fillStyle = color;
      c.font = 'bold 10px monospace';
      c.fillText(commit.short_id, pos.x + 10, pos.y + 16);

      // Branch tags if any
      if (commit.refs && commit.refs.length > 0) {
        c.fillStyle = isDark ? '#a1a1aa' : '#71717a';
        c.font = '9px sans-serif';
        const tag = commit.refs[0].shorthand;
        c.fillText(`⎇ ${tag.slice(0, 10)}`, pos.x + 65, pos.y + 16);
      }

      // Summary text (truncated)
      c.fillStyle = isDark ? '#e4e4e7' : '#18181b';
      c.font = '10px sans-serif';
      const summary = commit.summary.length > 18 ? commit.summary.slice(0, 18) + '...' : commit.summary;
      c.fillText(summary, pos.x + 10, pos.y + 32);
    });

    c.restore();
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 2.5);

    // Zoom towards mouse position
    const rect = canvasEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    panX = mouseX - (mouseX - panX) * (newZoom / zoom);
    panY = mouseY - (mouseY - panY) * (newZoom / zoom);
    zoom = newZoom;
    requestRedraw();
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button === 0 || e.button === 1) {
      isPanning = true;
      startMouseX = e.clientX - panX;
      startMouseY = e.clientY - panY;
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (isPanning) {
      panX = e.clientX - startMouseX;
      panY = e.clientY - startMouseY;
      requestRedraw();
    }
  }

  function handleMouseUp(_e: MouseEvent) {
    if (isPanning) {
      isPanning = false;
    }
  }

  function handleClick(e: MouseEvent) {
    const rect = canvasEl.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - panX) / zoom;
    const clickY = (e.clientY - rect.top - panY) / zoom;

    // Check hit test
    for (const [, pos] of nodePositions.entries()) {
      if (
        clickX >= pos.x &&
        clickX <= pos.x + pos.width &&
        clickY >= pos.y &&
        clickY <= pos.y + pos.height
      ) {
        selectedCommit = pos.commit;
        loadCommitDetails(pos.commit.id);
        requestRedraw();
        return;
      }
    }
  }

  async function loadCommitDetails(id: string) {
    if (!repoPath) return;
    try {
      commitDetail = await getCommitInfo(repoPath, id);
    } catch (e) {
      console.error(e);
    }
  }

  function resetView() {
    zoom = 1.0;
    panX = 150;
    panY = 100;
    requestRedraw();
  }

  function resizeCanvas() {
    if (!containerEl || !canvasEl) return;
    canvasEl.width = containerEl.clientWidth;
    canvasEl.height = containerEl.clientHeight;
    requestRedraw();
  }

  $effect(() => {
    if (commits) {
      calculateLayout();
      requestRedraw();
    }
  });

  onMount(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  });

  onDestroy(() => {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
    }
  });
</script>

<div
  bind:this={containerEl}
  class="relative flex-1 w-full h-full min-h-0 bg-zinc-100 dark:bg-zinc-950 overflow-hidden font-sans select-none"
>
  <!-- Interactive 2D Canvas -->
  <canvas
    bind:this={canvasEl}
    onwheel={handleWheel}
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onclick={handleClick}
    class="w-full h-full cursor-grab active:cursor-grabbing block"
  ></canvas>

  <!-- Top Title & Controls Overlay -->
  <div class="absolute top-3 left-4 flex items-center gap-3 pointer-events-auto">
    <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 backdrop-blur-md shadow-xl">
      <Network class="w-4 h-4 text-teal-600 dark:text-teal-400" />
      <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200">{localeState.t('graph.dagMap.title')}</span>
      <span class="text-[10px] font-mono text-zinc-500">{localeState.t('graph.dagMap.nodesCount', { count: commits.length })}</span>
    </div>

    <button
      onclick={onClose}
      class="p-1.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer shadow-xl backdrop-blur-md"
      title={localeState.t('graph.dagMap.backToGraph')}
    >
      <X class="w-4 h-4" />
    </button>
  </div>

  <!-- Bottom Right: Floating Zoom / Pan Controls -->
  <div class="absolute bottom-4 right-4 flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-1 shadow-2xl backdrop-blur-md pointer-events-auto">
    <button
      onclick={() => { zoom = Math.min(zoom * 1.2, 2.5); draw(); }}
      class="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
      title={localeState.t('graph.dagMap.zoomIn')}
    >
      <ZoomIn class="w-4 h-4" />
    </button>

    <div class="px-1 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 min-w-[40px] text-center">
      {Math.round(zoom * 100)}%
    </div>

    <button
      onclick={() => { zoom = Math.max(zoom * 0.8, 0.25); draw(); }}
      class="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
      title={localeState.t('graph.dagMap.zoomOut')}
    >
      <ZoomOut class="w-4 h-4" />
    </button>

    <div class="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

    <button
      onclick={resetView}
      class="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
      title={localeState.t('graph.dagMap.resetZoom')}
    >
      <RotateCcw class="w-3.5 h-3.5" />
    </button>
  </div>

  <!-- Right Side Inspector Overlay (When a node is selected) -->
  {#if selectedCommit}
    <div class="absolute top-12 right-4 w-80 max-h-[75%] rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800/90 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden pointer-events-auto z-20">
      <div class="p-3 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60">
        <div class="flex items-center gap-2">
          <GitCommit class="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span class="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-200">{selectedCommit.short_id}</span>
        </div>
        <button onclick={() => (selectedCommit = null)} class="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-3.5 space-y-3 overflow-y-auto">
        <div>
          <div class="text-[10px] uppercase font-bold text-zinc-500 mb-1">{localeState.t('graph.dagMap.author')}</div>
          <div class="text-xs text-zinc-800 dark:text-zinc-200 font-medium">{selectedCommit.author_name}</div>
          <div class="text-[11px] text-zinc-500 font-mono">&lt;{selectedCommit.author_email}&gt;</div>
        </div>

        <div>
          <div class="text-[10px] uppercase font-bold text-zinc-500 mb-1">{localeState.t('graph.dagMap.message')}</div>
          <p class="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed bg-zinc-50 dark:bg-zinc-950/60 p-2 rounded border border-zinc-200 dark:border-zinc-800/60 select-text font-mono">
            {selectedCommit.summary}
          </p>
        </div>

        {#if commitDetail && commitDetail.files_changed.length > 0}
          <div>
            <div class="text-[10px] uppercase font-bold text-zinc-500 mb-1">
              {localeState.t('graph.dagMap.changedFiles', { count: commitDetail.files_changed.length })}
            </div>
            <div class="space-y-1 max-h-36 overflow-y-auto">
              {#each commitDetail.files_changed as f}
                <div class="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 truncate py-0.5 px-1.5 rounded bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/40">
                  {f.path}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
