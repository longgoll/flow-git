import type { CommitNode, ConflictSimulationResult } from '../types';

export const ROW_HEIGHT = 36;
export const LANE_WIDTH = 20;
export const GRAPH_LEFT_MARGIN = 24;
export const NODE_RADIUS = 5;

// Vibrant High-Contrast Lane Color Palette
export const LANE_COLORS = [
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

export function getLaneColor(lane: number): string {
  const safeLane = typeof lane === 'number' && !isNaN(lane) ? Math.abs(lane) : 0;
  return LANE_COLORS[safeLane % LANE_COLORS.length];
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
  } = options;

  const dpr = window.devicePixelRatio || 1;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

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
        ? 'rgba(244, 63, 94, 0.2)'
        : 'rgba(6, 182, 212, 0.2)';
      ctx.fillRect(0, y, width, ROW_HEIGHT);

      ctx.fillStyle = simulationResult?.has_conflicts ? '#f43f5e' : '#06b6d4';
      ctx.fillRect(0, y, 4, ROW_HEIGHT);
    } else if (isSelected) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
      ctx.fillRect(0, y, width, ROW_HEIGHT);

      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, y, 3, ROW_HEIGHT);
    } else if (c.id === hoveredCommitId) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(0, y, width, ROW_HEIGHT);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, y + ROW_HEIGHT - 1, width, 1);
  }

  // 2. Bezier Splines
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const splineStartIndex = Math.max(0, startIndex - 20);
  const splineEndIndex = Math.min(totalCommits - 1, endIndex + 20);

  for (let i = splineStartIndex; i <= splineEndIndex; i++) {
    const child = commits[i];
    if (!child) continue;
    const childLane = child.lane || 0;
    const childY = i * ROW_HEIGHT - scrollTop + ROW_HEIGHT / 2;
    const childX = GRAPH_LEFT_MARGIN + childLane * LANE_WIDTH;
    const childColor = getLaneColor(childLane);

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

        const lineColor = pIdx === 0 ? childColor : getLaneColor(parentLane);

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

  // 3. Ghost Preview Curves
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

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = simulationResult?.has_conflicts ? '#f43f5e' : '#06b6d4';

      const midY = (sY + tY) / 2;
      ctx.moveTo(sX, sY);
      ctx.bezierCurveTo(sX + 30, midY, tX + 30, midY, tX, tY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(tX, tY, NODE_RADIUS + 6, 0, Math.PI * 2);
      ctx.fillStyle = simulationResult?.has_conflicts ? 'rgba(244, 63, 94, 0.35)' : 'rgba(6, 182, 212, 0.35)';
      ctx.fill();
      ctx.restore();
    }
  }

  // 4. Nodes and Commit info
  let maxLane = 0;
  for (let i = startIndex; i <= endIndex; i++) {
    const lane = commits[i]?.lane || 0;
    if (lane > maxLane) maxLane = lane;
  }
  const textLeftX = GRAPH_LEFT_MARGIN + (maxLane + 1.8) * LANE_WIDTH;

  for (let i = startIndex; i <= endIndex; i++) {
    const c = commits[i];
    if (!c) continue;
    const y = i * ROW_HEIGHT - scrollTop;
    const centerY = y + ROW_HEIGHT / 2;
    const cLane = c.lane || 0;
    const nodeX = GRAPH_LEFT_MARGIN + cLane * LANE_WIDTH;
    const laneColor = getLaneColor(cLane);
    const isMerge = Array.isArray(c.parents) && c.parents.length > 1;
    const isHead = Array.isArray(c.refs) && c.refs.some((r) => r && (r.is_head || r.ref_type === 'head'));
    const isSelected = activeSelectedIds.includes(c.id);
    const isGhostTarget = isDraggingNode && hoveredTargetCommit?.id === c.id;

    if (isHead) {
      ctx.beginPath();
      ctx.arc(nodeX, centerY, NODE_RADIUS + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.fill();
    }

    if (isGhostTarget) {
      ctx.beginPath();
      ctx.arc(nodeX, centerY, NODE_RADIUS + 5, 0, Math.PI * 2);
      ctx.fillStyle = simulationResult?.has_conflicts ? 'rgba(244, 63, 94, 0.4)' : 'rgba(6, 182, 212, 0.4)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(nodeX, centerY, isSelected ? NODE_RADIUS + 1.5 : NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isGhostTarget ? (simulationResult?.has_conflicts ? '#f43f5e' : '#06b6d4') : laneColor;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isSelected || isGhostTarget ? '#ffffff' : '#09090b';
    ctx.stroke();

    if (isMerge) {
      ctx.beginPath();
      ctx.arc(nodeX, centerY, NODE_RADIUS * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#09090b';
      ctx.fill();
    }

    // Draw Ref Badges
    let currentBadgeX = textLeftX;
    if (c.refs && Array.isArray(c.refs) && c.refs.length > 0) {
      for (const r of c.refs) {
        if (!r || !r.shorthand) continue;
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        const labelText = r.shorthand;
        const textWidth = ctx.measureText(labelText).width;
        const badgeWidth = textWidth + 14;
        const badgeHeight = 20;
        const badgeY = centerY - badgeHeight / 2;

        let bgStyle = 'rgba(39, 39, 42, 0.85)';
        let textStyle = '#e4e4e7';
        let borderStyle = 'rgba(255, 255, 255, 0.15)';

        if (r.ref_type === 'head' || r.is_head) {
          bgStyle = 'rgba(59, 130, 246, 0.22)';
          textStyle = '#60a5fa';
          borderStyle = 'rgba(59, 130, 246, 0.4)';
        } else if (r.ref_type === 'localbranch') {
          bgStyle = 'rgba(16, 185, 129, 0.2)';
          textStyle = '#34d399';
          borderStyle = 'rgba(16, 185, 129, 0.4)';
        } else if (r.ref_type === 'remotebranch') {
          bgStyle = 'rgba(168, 85, 247, 0.2)';
          textStyle = '#c084fc';
          borderStyle = 'rgba(168, 85, 247, 0.4)';
        } else if (r.ref_type === 'tag') {
          bgStyle = 'rgba(245, 158, 11, 0.2)';
          textStyle = '#fbbf24';
          borderStyle = 'rgba(245, 158, 11, 0.4)';
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

    // Draw Short Hash
    const shortId = c.short_id || (c.id ? c.id.slice(0, 7) : '???????');
    ctx.font = '500 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#71717a';
    ctx.fillText(shortId, currentBadgeX, centerY + 4);
    currentBadgeX += 65;

    // Draw Summary
    ctx.font = isSelected ? '600 13px "Plus Jakarta Sans", sans-serif' : '400 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isSelected ? '#ffffff' : '#f4f4f5';

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

    // Draw Author & Timestamp
    const dateStr = timeAgo(c.timestamp || 0);
    ctx.font = '400 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#a1a1aa';
    const authorName = c.author_name || 'Unknown';
    const authorWidth = ctx.measureText(authorName).width;
    const dateWidth = ctx.measureText(dateStr).width;

    ctx.fillText(authorName, width - dateWidth - authorWidth - 36, centerY + 4);
    ctx.fillStyle = '#71717a';
    ctx.fillText(dateStr, width - dateWidth - 16, centerY + 4);
  }

  ctx.restore();
}
