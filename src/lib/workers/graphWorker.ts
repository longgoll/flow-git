import type { CommitNode } from '../types';

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

let width = 800;
let height = 600;
let dpr = 1;

let commits: CommitNode[] = [];
let commitIndexMap: Map<string, number> = new Map();

let scrollTop = 0;
let selectedCommitIds: string[] = [];
let hoveredCommitId: string | null = null;

// Ghost Preview state
let ghostSourceId: string | null = null;
let ghostTargetId: string | null = null;
let ghostHasConflict = false;

const ROW_HEIGHT = 36;
const LANE_WIDTH = 20;
const GRAPH_LEFT_MARGIN = 24;
const NODE_RADIUS = 5;

// Vibrant High-Contrast Lane Color Palette
const LANE_COLORS = [
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

function getLaneColor(lane: number): string {
  const safeLane = typeof lane === 'number' && !isNaN(lane) ? Math.abs(lane) : 0;
  return LANE_COLORS[safeLane % LANE_COLORS.length];
}

function timeAgo(timestamp: number): string {
  if (!timestamp || isNaN(timestamp)) return '';
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return `${Math.max(1, diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

function drawRoundedRect(
  context: OffscreenCanvasRenderingContext2D,
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

function drawHexagon(
  context: OffscreenCanvasRenderingContext2D,
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

function render() {
  if (!ctx || !canvas) return;
  if (width <= 0 || height <= 0) return;

  try {
    // Clear canvas
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const totalCommits = commits.length;
    if (totalCommits === 0) {
      ctx.restore();
      return;
    }

    // Virtual scrolling visible range calculation
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 3);
    const endIndex = Math.min(totalCommits - 1, Math.ceil((scrollTop + height) / ROW_HEIGHT) + 3);

    // 1. Draw Row Backgrounds (Hover / Selected / Drop Target)
    for (let i = startIndex; i <= endIndex; i++) {
      const c = commits[i];
      if (!c) continue;
      const y = i * ROW_HEIGHT - scrollTop;
      const isSelected = selectedCommitIds && selectedCommitIds.includes(c.id);
      const isGhostTarget = ghostTargetId === c.id;

      if (isGhostTarget) {
        ctx.fillStyle = ghostHasConflict
          ? 'rgba(244, 63, 94, 0.18)'
          : 'rgba(6, 182, 212, 0.18)';
        ctx.fillRect(0, y, width, ROW_HEIGHT);

        ctx.fillStyle = ghostHasConflict ? '#f43f5e' : '#06b6d4';
        ctx.fillRect(0, y, 4, ROW_HEIGHT);
      } else if (isSelected) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.16)';
        ctx.fillRect(0, y, width, ROW_HEIGHT);

        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, y, 3, ROW_HEIGHT);
      } else if (c.id === hoveredCommitId) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(0, y, width, ROW_HEIGHT);
      }

      // Subtle row bottom border
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(0, y + ROW_HEIGHT - 1, width, 1);
    }

    // 2. Draw Branch Splines (Bezier Curves with Focus Mode on Hover Dimming)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const splineStartIndex = Math.max(0, startIndex - 20);
    const splineEndIndex = Math.min(totalCommits - 1, endIndex + 20);

    const hoveredCommit = hoveredCommitId ? commits[commitIndexMap.get(hoveredCommitId) ?? -1] : null;
    const hoveredLane = hoveredCommit ? (hoveredCommit.lane || 0) : null;

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

          // Focus Dimming
          const isLineFocused = hoveredCommitId === null || (hoveredLane !== null && (childLane === hoveredLane || parentLane === hoveredLane));
          ctx.globalAlpha = isLineFocused ? 1.0 : 0.2;
          ctx.lineWidth = isLineFocused && hoveredCommitId !== null ? 2.8 : 2.2;

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
    ctx.globalAlpha = 1.0;

    // 3. Draw Ghost Preview Bezier Curves (if actively dragging over a target)
    if (ghostSourceId && ghostTargetId && ghostSourceId !== ghostTargetId) {
      const sIndex = commitIndexMap.get(ghostSourceId);
      const tIndex = commitIndexMap.get(ghostTargetId);
      if (sIndex !== undefined && tIndex !== undefined && commits[sIndex] && commits[tIndex]) {
        const sCommit = commits[sIndex];
        const tCommit = commits[tIndex];
        const sLane = sCommit.lane || 0;
        const tLane = tCommit.lane || 0;
        const sY = sIndex * ROW_HEIGHT - scrollTop + ROW_HEIGHT / 2;
        const sX = GRAPH_LEFT_MARGIN + sLane * LANE_WIDTH;
        const tY = tIndex * ROW_HEIGHT - scrollTop + ROW_HEIGHT / 2;
        const tX = GRAPH_LEFT_MARGIN + tLane * LANE_WIDTH;

        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = ghostHasConflict ? '#f43f5e' : '#06b6d4';

        const midY = (sY + tY) / 2;
        ctx.moveTo(sX, sY);
        ctx.bezierCurveTo(sX + 30, midY, tX + 30, midY, tX, tY);
        ctx.stroke();

        if (ghostHasConflict) {
          // Warning Hub Preview
          drawHexagon(ctx, tX, tY, NODE_RADIUS + 7);
          ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(tX, tY, NODE_RADIUS + 6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // 4. Draw Nodes and Commit Details
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
      const isSelected = selectedCommitIds && selectedCommitIds.includes(c.id);
      const isGhostTarget = ghostTargetId === c.id;
      const isConflictTarget = isGhostTarget && ghostHasConflict;

      const isNodeFocused = hoveredCommitId === null || (hoveredLane !== null && cLane === hoveredLane) || c.id === hoveredCommitId;
      ctx.globalAlpha = isNodeFocused ? 1.0 : 0.35;

      if (isConflictTarget) {
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

        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', nodeX, centerY);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      } else {
        // Head glowing halo
        if (isHead) {
          ctx.beginPath();
          ctx.arc(nodeX, centerY, NODE_RADIUS + 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
          ctx.fill();
        }

        // Ghost Target Highlight
        if (isGhostTarget) {
          ctx.beginPath();
          ctx.arc(nodeX, centerY, NODE_RADIUS + 5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
          ctx.fill();
        }

        // Node outer circle
        ctx.beginPath();
        ctx.arc(nodeX, centerY, isSelected ? NODE_RADIUS + 1.5 : NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = isGhostTarget ? '#06b6d4' : laneColor;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isSelected || isGhostTarget ? '#ffffff' : '#09090b';
        ctx.stroke();

        // Inner dot for merge commits
        if (isMerge) {
          ctx.beginPath();
          ctx.arc(nodeX, centerY, NODE_RADIUS * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = '#09090b';
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1.0;

      // Draw Ref Badges / Pills
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

          let bgStyle = 'rgba(39, 39, 42, 0.8)';
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

      // Draw Summary Message
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

      // Draw Author & Timestamp on the far right
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
  } catch (err) {
    console.error('graphWorker render error:', err);
    try {
      ctx.restore();
    } catch (_) {}
  }
}

self.onmessage = (e: MessageEvent) => {
  const data = e.data;
  switch (data.type) {
    case 'INIT': {
      canvas = data.canvas as OffscreenCanvas;
      ctx = canvas.getContext('2d', { alpha: true });
      width = data.width || 800;
      height = data.height || 600;
      dpr = data.dpr || 1;
      if (canvas) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      render();
      break;
    }
    case 'RESIZE': {
      if (data.width > 0 && data.height > 0) {
        width = data.width;
        height = data.height;
        dpr = data.dpr || 1;
        if (canvas) {
          canvas.width = Math.round(width * dpr);
          canvas.height = Math.round(height * dpr);
        }
        render();
      }
      break;
    }
    case 'SET_DATA': {
      commits = data.commits || [];
      commitIndexMap.clear();
      for (let i = 0; i < commits.length; i++) {
        if (commits[i] && commits[i].id) {
          commitIndexMap.set(commits[i].id, i);
        }
      }
      selectedCommitIds = data.selectedCommitIds || (data.selectedCommitId ? [data.selectedCommitId] : []);
      hoveredCommitId = data.hoveredCommitId || null;
      render();
      break;
    }
    case 'SCROLL': {
      scrollTop = data.scrollTop || 0;
      render();
      break;
    }
    case 'SET_SELECTION': {
      selectedCommitIds = data.selectedCommitIds || (data.selectedCommitId ? [data.selectedCommitId] : []);
      hoveredCommitId = data.hoveredCommitId || null;
      render();
      break;
    }
    case 'SET_GHOST_PREVIEW': {
      ghostSourceId = data.sourceId || null;
      ghostTargetId = data.targetId || null;
      ghostHasConflict = !!data.hasConflict;
      render();
      break;
    }
  }
};
