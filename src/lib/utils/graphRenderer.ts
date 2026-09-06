import type { CommitNode, ConflictSimulationResult, GraphEdge } from '../types';

export const ROW_HEIGHT = 36;
export const LANE_WIDTH = 20;
export const GRAPH_LEFT_MARGIN = 24;
export const NODE_RADIUS = 5;

// Vibrant High-Contrast Lane Color Palette (Dark Theme)
export const LANE_COLORS_DARK = [
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#38bdf8', // Sky
  '#84cc16', // Lime
  '#818cf8', // Indigo
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

// Refined High-Contrast Lane Color Palette (Light Theme)
export const LANE_COLORS_LIGHT = [
  '#0891b2', // Cyan 600
  '#9333ea', // Purple 600
  '#059669', // Emerald 600
  '#d97706', // Amber 600
  '#e11d48', // Rose 600
  '#0284c7', // Sky 600
  '#65a30d', // Lime 600
  '#6366f1', // Indigo 500
  '#db2777', // Pink 600
  '#0d9488', // Teal 600
];

export const LANE_COLORS = LANE_COLORS_DARK;

export function getLaneColor(lane: number, isDark = true): string {
  const safeLane = typeof lane === 'number' && !isNaN(lane) ? Math.abs(lane) : 0;
  const palette = isDark ? LANE_COLORS_DARK : LANE_COLORS_LIGHT;
  return palette[safeLane % palette.length];
}

export function timeAgo(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return '';
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return `${Math.max(1, diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function getAuthorColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

export function getAuthorInitials(name: string): string {
  if (!name || name === 'Unknown') return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof context.roundRect === 'function') {
    context.roundRect(x, y, w, h, r);
  } else {
    context.rect(x, y, w, h);
  }
}

export function drawHexagon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number
) {
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

export interface RenderGraphOptions {
  commits: CommitNode[];
  commitIndexMap: Map<string, number>;
  activeSelectedIds: string[];
  hoveredCommitId: string | null;
  scrollTop: number;
  containerWidth: number;
  containerHeight: number;
  isDraggingNode: boolean;
  draggedCommit: CommitNode | null;
  hoveredTargetCommit: CommitNode | null;
  simulationResult: ConflictSimulationResult | null;
  isDark?: boolean;
  lockedLane?: number | null;
  viewMode?: 'micro' | 'macro';
  edges?: GraphEdge[];
}

export function renderCommitGraph(
  ctx: CanvasRenderingContext2D,
  options: RenderGraphOptions
) {
  const {
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
    isDark = true,
    lockedLane = null,
    viewMode = 'micro',
    edges,
  } = options;

  void viewMode; // Explicitly consumed for options compatibility

  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = isDark ? '#09090b' : '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const totalCommits = commits.length;
  if (totalCommits === 0) {
    ctx.restore();
    return;
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
  const endIndex = Math.min(totalCommits - 1, Math.ceil((scrollTop + height) / ROW_HEIGHT) + 2);

  // 1. Row backgrounds
  for (let i = startIndex; i <= endIndex; i++) {
    const c = commits[i];
    if (!c) continue;
    const y = i * ROW_HEIGHT - scrollTop;
    const isSelected = activeSelectedIds.includes(c.id);
    const isGhostTarget = isDraggingNode && hoveredTargetCommit?.id === c.id;

    if (isGhostTarget) {
      ctx.fillStyle = simulationResult?.has_conflicts
        ? (isDark ? 'rgba(244, 63, 94, 0.2)' : 'rgba(244, 63, 94, 0.15)')
        : simulationResult?.is_fast_forward
          ? (isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.16)')
          : (isDark ? 'rgba(6, 182, 212, 0.2)' : 'rgba(8, 145, 178, 0.15)');
      ctx.fillRect(0, y, width, ROW_HEIGHT);

      ctx.fillStyle = simulationResult?.has_conflicts
        ? '#f43f5e'
        : simulationResult?.is_fast_forward
          ? (isDark ? '#fbbf24' : '#d97706')
          : (isDark ? '#06b6d4' : '#0891b2');
      ctx.fillRect(0, y, 4, ROW_HEIGHT);
    } else if (isSelected) {
      ctx.fillStyle = isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.12)';
      ctx.fillRect(0, y, width, ROW_HEIGHT);

      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, y, 3, ROW_HEIGHT);
    } else if (c.id === hoveredCommitId) {
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.035)';
      ctx.fillRect(0, y, width, ROW_HEIGHT);
    }

    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, y + ROW_HEIGHT - 1, width, 1);
  }

  // 2. Continuous Bezier Splines with Metro Spine & Edge-Span Viewport Intersection
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const hoveredCommit = hoveredCommitId ? commits[commitIndexMap.get(hoveredCommitId) ?? -1] : null;
  const hoveredLane = hoveredCommit ? (hoveredCommit.lane || 0) : null;
  const activeFocusLane = lockedLane !== null && lockedLane !== undefined ? lockedLane : hoveredLane;

  if (edges && edges.length > 0) {
    // Pass-through Lines Continuous Rendering: draw any edge intersecting the viewport window
    for (let eIdx = 0; eIdx < edges.length; eIdx++) {
      const edge = edges[eIdx];
      if (edge.childIndex > endIndex + 6 || edge.parentIndex < startIndex - 6) {
        continue;
      }

      const childLane = edge.childLane;
      const parentLane = edge.parentLane;
      const childY = edge.childIndex * ROW_HEIGHT - scrollTop + ROW_HEIGHT / 2;
      const childX = GRAPH_LEFT_MARGIN + childLane * LANE_WIDTH;
      const parentY = edge.parentIndex * ROW_HEIGHT - scrollTop + ROW_HEIGHT / 2;
      const parentX = GRAPH_LEFT_MARGIN + parentLane * LANE_WIDTH;

      const childColor = getLaneColor(childLane, isDark);
      const isTrunkBackbone = edge.isTrunk || (childLane === 0 && parentLane === 0);
      const lineColor = isTrunkBackbone
        ? (isDark ? '#38bdf8' : '#0284c7')
        : (edge.isFirstParent ? childColor : getLaneColor(parentLane, isDark));

      const isLineFocused = activeFocusLane === null || (childLane === activeFocusLane || parentLane === activeFocusLane);
      ctx.globalAlpha = isLineFocused ? 1.0 : 0.18;
      ctx.lineWidth = isTrunkBackbone
        ? (isLineFocused ? 3.4 : 2.8)
        : (isLineFocused && activeFocusLane !== null ? 2.8 : 2.2);

      ctx.beginPath();
      ctx.strokeStyle = lineColor;
      ctx.setLineDash([]);

      if (childLane === parentLane) {
        ctx.moveTo(childX, childY);
        ctx.lineTo(parentX, parentY);
      } else {
        const midY = (childY + parentY) / 2;
        ctx.moveTo(childX, childY);
        ctx.bezierCurveTo(childX, midY, parentX, midY, parentX, parentY);
      }
      ctx.stroke();
    }
  } else {
    // Fallback: Local window scan
    const splineStartIndex = Math.max(0, startIndex - 20);
    const splineEndIndex = Math.min(totalCommits - 1, endIndex + 20);

    for (let i = splineStartIndex; i <= splineEndIndex; i++) {
      const child = commits[i];
      if (!child) continue;
      const childLane = child.lane || 0;
      const childY = i * ROW_HEIGHT - scrollTop + ROW_HEIGHT / 2;
      const childX = GRAPH_LEFT_MARGIN + childLane * LANE_WIDTH;
      const childColor = getLaneColor(childLane, isDark);

      if (child.parents && Array.isArray(child.parents)) {
        for (let pIdx = 0; pIdx < child.parents.length; pIdx++) {
          const parentId = child.parents[pIdx];
          const parentIndex = commitIndexMap.get(parentId);
          if (parentIndex === undefined) continue;

          const parent = commits[parentIndex];
          if (!parent) continue;
          const parentLane = parent.lane || 0;
          const parentY = parentIndex * ROW_HEIGHT - scrollTop + ROW_HEIGHT / 2;
          const parentX = GRAPH_LEFT_MARGIN + parentLane * LANE_WIDTH;

          const isTrunkBackbone = childLane === 0 && parentLane === 0;
          const lineColor = isTrunkBackbone
            ? (isDark ? '#38bdf8' : '#0284c7')
            : (pIdx === 0 ? childColor : getLaneColor(parentLane, isDark));

          const isLineFocused = activeFocusLane === null || (childLane === activeFocusLane || parentLane === activeFocusLane);
          ctx.globalAlpha = isLineFocused ? 1.0 : 0.18;
          ctx.lineWidth = isTrunkBackbone
            ? (isLineFocused ? 3.4 : 2.8)
            : (isLineFocused && activeFocusLane !== null ? 2.8 : 2.2);

          ctx.beginPath();
          ctx.strokeStyle = lineColor;
          ctx.setLineDash([]);

          if (childLane === parentLane) {
            ctx.moveTo(childX, childY);
            ctx.lineTo(parentX, parentY);
          } else {
            const midY = (childY + parentY) / 2;
            ctx.moveTo(childX, childY);
            ctx.bezierCurveTo(childX, midY, parentX, midY, parentX, parentY);
          }
          ctx.stroke();
        }
      }
    }
  }
  ctx.globalAlpha = 1.0;

  // 3. Ghost Preview Curves, Fast-Forward & Warning Hub
  if (isDraggingNode && draggedCommit && hoveredTargetCommit && draggedCommit.id !== hoveredTargetCommit.id) {
    const sIndex = commitIndexMap.get(draggedCommit.id);
    const tIndex = commitIndexMap.get(hoveredTargetCommit.id);
    if (sIndex !== undefined && tIndex !== undefined) {
      const sCommit = commits[sIndex];
      const tCommit = commits[tIndex];
      const sY = sIndex * ROW_HEIGHT - scrollTop + ROW_HEIGHT / 2;
      const sX = GRAPH_LEFT_MARGIN + (sCommit?.lane || 0) * LANE_WIDTH;
      const tY = tIndex * ROW_HEIGHT - scrollTop + ROW_HEIGHT / 2;
      const tX = GRAPH_LEFT_MARGIN + (tCommit?.lane || 0) * LANE_WIDTH;

      const midY = (sY + tY) / 2;

      ctx.save();
      ctx.beginPath();

      if (simulationResult?.has_conflicts) {
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#f43f5e';
        ctx.moveTo(sX, sY);
        ctx.bezierCurveTo(sX + 30, midY, tX + 30, midY, tX, tY);
        ctx.stroke();

        // Stop Indicator at midpoint
        const midX = (sX + tX) / 2 + 15;
        ctx.beginPath();
        ctx.arc(midX, midY, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#f43f5e';
        ctx.fill();
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✕', midX, midY);

        // Warning Hub preview on target (Hexagon with glowing aura)
        drawHexagon(ctx, tX, tY, NODE_RADIUS + 9);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
        ctx.fill();

        drawHexagon(ctx, tX, tY, NODE_RADIUS + 6);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.5)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f43f5e';
        ctx.stroke();
      } else if (simulationResult?.is_fast_forward) {
        // Fast-Forward Visualizer: Golden glowing straight/spline line + badge
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
        ctx.moveTo(sX, sY);
        ctx.bezierCurveTo(sX + 24, midY, tX + 24, midY, tX, tY);
        ctx.stroke();

        // Fast-Forward badge at midpoint
        const midX = (sX + tX) / 2 + 25;
        const ffText = '⚡ Fast-Forward';
        ctx.font = '700 10.5px "Plus Jakarta Sans", sans-serif';
        const ffTextWidth = ctx.measureText(ffText).width;
        const ffPillWidth = ffTextWidth + 16;

        ctx.beginPath();
        drawRoundedRect(ctx, midX - ffPillWidth / 2, midY - 10, ffPillWidth, 20, 10);
        ctx.fillStyle = isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        ctx.fill();
        ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ffText, midX, midY);

        // Halo ring on target node
        ctx.beginPath();
        ctx.arc(tX, tY, NODE_RADIUS + 7, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(251, 191, 36, 0.35)' : 'rgba(217, 119, 6, 0.25)';
        ctx.fill();
      } else {
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = isDark ? '#06b6d4' : '#0891b2';
        ctx.moveTo(sX, sY);
        ctx.bezierCurveTo(sX + 30, midY, tX + 30, midY, tX, tY);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(tX, tY, NODE_RADIUS + 6, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(6, 182, 212, 0.35)' : 'rgba(8, 145, 178, 0.3)';
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 4. Nodes and Commit info
  let maxLane = 0;
  let hasCapsuleInView = false;
  let maxCapsuleRight = 0;
  for (let i = startIndex; i <= endIndex; i++) {
    const item = commits[i];
    if (!item) continue;
    const lane = item.lane || 0;
    if (lane > maxLane) maxLane = lane;
    if (item.is_capsule) {
      hasCapsuleInView = true;
      const nodeX = GRAPH_LEFT_MARGIN + lane * LANE_WIDTH;
      const capRight = nodeX - 8 + 92;
      if (capRight > maxCapsuleRight) maxCapsuleRight = capRight;
    }
  }

  // Calculate safe text left start: always after the widest lane and after any capsule pill
  let textLeftX = GRAPH_LEFT_MARGIN + (maxLane + 1.8) * LANE_WIDTH + 10;
  if (hasCapsuleInView) {
    textLeftX = Math.max(textLeftX, maxCapsuleRight + 16);
  }

  for (let i = startIndex; i <= endIndex; i++) {
    const c = commits[i];
    if (!c) continue;
    const y = i * ROW_HEIGHT - scrollTop;
    const centerY = y + ROW_HEIGHT / 2;
    const cLane = c.lane || 0;
    const nodeX = GRAPH_LEFT_MARGIN + cLane * LANE_WIDTH;
    const laneColor = getLaneColor(cLane, isDark);
    const isMerge = Array.isArray(c.parents) && c.parents.length > 1;
    const isHead = Array.isArray(c.refs) && c.refs.some((r) => r && (r.is_head || r.ref_type === 'head'));
    const isSelected = activeSelectedIds.includes(c.id);
    const isGhostTarget = isDraggingNode && hoveredTargetCommit?.id === c.id;
    const isConflictTarget = isGhostTarget && !!simulationResult?.has_conflicts;

    // Focus Dimming for node circle if another branch is focused (Locked or Hovered)
    const isNodeFocused = activeFocusLane === null || cLane === activeFocusLane || c.id === hoveredCommitId;
    const isGhostNode = !!c.is_ghost;
    ctx.globalAlpha = isGhostNode ? 0.38 : (isNodeFocused ? 1.0 : 0.25);

    if (c.is_capsule) {
      // Semantic Capsule Node
      const capsuleW = 90;
      const capsuleH = 20;
      const capX = nodeX - 8;
      const capY = centerY - capsuleH / 2;

      // Vertical track through capsule
      ctx.beginPath();
      ctx.setLineDash([3, 2]);
      ctx.strokeStyle = laneColor;
      ctx.lineWidth = 1.5;
      ctx.moveTo(nodeX, y);
      ctx.lineTo(nodeX, y + ROW_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Capsule pill body
      ctx.beginPath();
      drawRoundedRect(ctx, capX, capY, capsuleW, capsuleH, 10);
      ctx.fillStyle = isDark ? 'rgba(39, 39, 42, 0.95)' : 'rgba(244, 244, 245, 0.95)';
      ctx.fill();
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeStyle = isSelected ? '#38bdf8' : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)');
      ctx.stroke();

      // Capsule text inside
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`+${c.capsule_count || 2} commits`, capX + capsuleW / 2, centerY);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    } else if (isConflictTarget) {
      // Warning Hub: Glowing Hexagon
      drawHexagon(ctx, nodeX, centerY, NODE_RADIUS + 7);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
      ctx.fill();

      drawHexagon(ctx, nodeX, centerY, NODE_RADIUS + 2.5);
      ctx.fillStyle = '#f43f5e';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Warning exclamation mark
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', nodeX, centerY);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    } else {
      if (isHead) {
        ctx.beginPath();
        ctx.arc(nodeX, centerY, NODE_RADIUS + 4, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.18)';
        ctx.fill();
      }

      if (isGhostTarget) {
        ctx.beginPath();
        ctx.arc(nodeX, centerY, NODE_RADIUS + 5, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(6, 182, 212, 0.4)' : 'rgba(8, 145, 178, 0.35)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(nodeX, centerY, isSelected ? NODE_RADIUS + 1.5 : NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = isGhostTarget ? (isDark ? '#06b6d4' : '#0891b2') : laneColor;
      ctx.fill();

      if (isGhostNode) {
        ctx.setLineDash([3, 2]);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#f59e0b';
      } else {
        ctx.setLineDash([]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isSelected || isGhostTarget ? (isDark ? '#ffffff' : '#09090b') : (isDark ? '#09090b' : '#ffffff');
      }
      ctx.stroke();
      ctx.setLineDash([]);

      if (isMerge) {
        ctx.beginPath();
        ctx.arc(nodeX, centerY, NODE_RADIUS * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#09090b' : '#ffffff';
        ctx.fill();
      }
    }

    // Reset alpha for crisp text readability (unless it's an orphaned ghost node)
    ctx.globalAlpha = isGhostNode ? 0.45 : 1.0;

    // Draw Ref Badges
    let currentBadgeX = textLeftX;

    // Draw Rebase Target Badge if present
    if (c.rebase_target_sha) {
      const rebaseLabel = `rebase ➔ ${c.rebase_target_sha.slice(0, 7)}`;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      const textW = ctx.measureText(rebaseLabel).width;
      const bW = textW + 14;
      const bH = 20;
      const bY = centerY - bH / 2;

      ctx.beginPath();
      drawRoundedRect(ctx, currentBadgeX, bY, bW, bH, 4);
      ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.15)';
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(245, 158, 11, 0.5)' : 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
      ctx.fillText(rebaseLabel, currentBadgeX + 7, centerY + 3.5);
      currentBadgeX += bW + 6;
    }

    if (c.refs && Array.isArray(c.refs) && c.refs.length > 0) {
      for (const r of c.refs) {
        if (!r || !r.shorthand) continue;
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        const labelText = r.shorthand;
        const textWidth = ctx.measureText(labelText).width;
        const badgeWidth = textWidth + 14;
        const badgeHeight = 20;
        const badgeY = centerY - badgeHeight / 2;

        let bgStyle = isDark ? 'rgba(39, 39, 42, 0.85)' : 'rgba(228, 228, 231, 0.85)';
        let textStyle = isDark ? '#e4e4e7' : '#27272a';
        let borderStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';

        if (r.ref_type === 'head' || r.is_head) {
          bgStyle = isDark ? 'rgba(59, 130, 246, 0.22)' : 'rgba(59, 130, 246, 0.15)';
          textStyle = isDark ? '#60a5fa' : '#2563eb';
          borderStyle = isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.35)';
        } else if (r.ref_type === 'localbranch') {
          bgStyle = isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)';
          textStyle = isDark ? '#34d399' : '#059669';
          borderStyle = isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.35)';
        } else if (r.ref_type === 'remotebranch') {
          bgStyle = isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.15)';
          textStyle = isDark ? '#c084fc' : '#7c3aed';
          borderStyle = isDark ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.35)';
        } else if (r.ref_type === 'tag') {
          bgStyle = isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.15)';
          textStyle = isDark ? '#fbbf24' : '#d97706';
          borderStyle = isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.35)';
        }

        ctx.beginPath();
        drawRoundedRect(ctx, currentBadgeX, badgeY, badgeWidth, badgeHeight, 4);
        ctx.fillStyle = bgStyle;
        ctx.fill();
        ctx.strokeStyle = borderStyle;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = textStyle;
        ctx.fillText(labelText, currentBadgeX + 7, centerY + 3.5);

        currentBadgeX += badgeWidth + 6;
      }
    }

    // Draw Short Hash (Skip for capsule commit because capsule pill already shows the count)
    if (!c.is_capsule) {
      const shortId = c.short_id || (c.id ? c.id.slice(0, 7) : '???????');
      ctx.font = '500 12px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#a1a1aa' : '#71717a';
      ctx.fillText(shortId, currentBadgeX, centerY + 4);
      currentBadgeX += 65;
    }

    // Draw Summary
    ctx.font = isSelected ? '600 13px "Plus Jakarta Sans", sans-serif' : '400 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isSelected
      ? (isDark ? '#ffffff' : '#09090b')
      : (isDark ? '#f4f4f5' : '#27272a');

    const rightMargin = 220;
    const availableWidth = Math.max(80, width - currentBadgeX - rightMargin);
    let summaryText = c.summary || '';
    if (ctx.measureText(summaryText).width > availableWidth) {
      while (summaryText.length > 0 && ctx.measureText(summaryText + '...').width > availableWidth) {
        summaryText = summaryText.slice(0, -1);
      }
      summaryText += '...';
    }
    ctx.fillText(summaryText, currentBadgeX, centerY + 4);

    // Draw Author Avatar, Name & Timestamp
    const dateStr = timeAgo(c.timestamp || 0);
    ctx.font = '400 12px "Plus Jakarta Sans", sans-serif';
    const authorName = c.author_name || 'Unknown';
    const authorWidth = ctx.measureText(authorName).width;
    const dateWidth = ctx.measureText(dateStr).width;

    const avatarRadius = 8;
    const avatarX = width - dateWidth - authorWidth - 36 - avatarRadius * 2 - 6;
    const avatarY = centerY;

    if (!c.is_capsule && avatarX > currentBadgeX + 60) {
      // Draw Avatar Circle
      ctx.beginPath();
      ctx.arc(avatarX + avatarRadius, avatarY, avatarRadius, 0, Math.PI * 2);
      ctx.fillStyle = getAuthorColor(authorName);
      ctx.fill();

      // Draw Initials
      ctx.font = '700 8px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(getAuthorInitials(authorName), avatarX + avatarRadius, avatarY);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    ctx.font = '400 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isDark ? '#a1a1aa' : '#52525b';
    ctx.fillText(authorName, width - dateWidth - authorWidth - 36, centerY + 4);
    ctx.fillStyle = isDark ? '#71717a' : '#a1a1aa';
    ctx.fillText(dateStr, width - dateWidth - 16, centerY + 4);
  }

  ctx.restore();
}
