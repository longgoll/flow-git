import type { CommitNode, GraphEdge, GraphViewMode } from '../../types';
import { localeState } from '../../state/localeState.svelte';

export function deriveDisplayCommits(
  commits: CommitNode[],
  viewMode: GraphViewMode,
  autoCapsule: boolean,
  expandedCapsuleIds: Set<string>
): CommitNode[] {
  if (commits.length === 0) return [];
  if (viewMode === 'micro' && !autoCapsule) return commits;

  const result: CommitNode[] = [];
  const n = commits.length;
  let i = 0;

  while (i < n) {
    const c = commits[i];
    const isMerge = Array.isArray(c.parents) && c.parents.length > 1;
    const hasRefs = Array.isArray(c.refs) && c.refs.length > 0;
    const isRoot = !c.parents || c.parents.length === 0;

    // In Macro mode: group non-milestone commits
    // In Micro mode: group linear runs of >= 3 commits on non-trunk lanes (> 0)
    const isMilestone = hasRefs || isMerge || isRoot || c.lane === 0;
    const eligibleForRun = viewMode === 'macro' ? !isMilestone : (!isMilestone && c.lane > 0);

    if (eligibleForRun) {
      const run: CommitNode[] = [c];
      let j = i + 1;
      while (j < n) {
        const nextC = commits[j];
        const nextEligible = viewMode === 'macro'
          ? (!nextC.refs?.length && nextC.parents?.length <= 1 && nextC.parents?.length > 0)
          : (!nextC.refs?.length && nextC.parents?.length <= 1 && nextC.parents?.length > 0 && nextC.lane === c.lane);
        if (nextEligible) {
          run.push(nextC);
          j++;
        } else {
          break;
        }
      }

      const capsuleId = `capsule-${c.id}`;
      const minThreshold = viewMode === 'macro' ? 2 : 3;

      if (run.length >= minThreshold && !expandedCapsuleIds.has(capsuleId)) {
        const lastInRun = run[run.length - 1];
        result.push({
          id: capsuleId,
          short_id: `+${run.length}`,
          parents: lastInRun.parents || [],
          author_name: localeState.t('graph.capsules.commitsGrouped', { count: run.length }),
          author_email: '',
          summary: c.summary,
          timestamp: c.timestamp,
          lane: c.lane,
          refs: [],
          is_trunk: c.is_trunk,
          is_capsule: true,
          capsule_count: run.length,
          collapsed_ids: run.map((r) => r.id),
        });
        i = j;
        continue;
      }
    }

    result.push(c);
    i++;
  }

  return result;
}

export function buildCommitIndexMap(displayCommits: CommitNode[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < displayCommits.length; i++) {
    if (displayCommits[i]?.id) {
      map.set(displayCommits[i].id, i);
    }
  }
  return map;
}

export function deriveGraphEdges(
  displayCommits: CommitNode[],
  commitIndexMap: Map<string, number>
): GraphEdge[] {
  const list: GraphEdge[] = [];
  for (let cIdx = 0; cIdx < displayCommits.length; cIdx++) {
    const child = displayCommits[cIdx];
    if (!child || !Array.isArray(child.parents)) continue;

    for (let pIdx = 0; pIdx < child.parents.length; pIdx++) {
      const parentId = child.parents[pIdx];
      const parentIndex = commitIndexMap.get(parentId);
      if (parentIndex === undefined) continue;

      const parent = displayCommits[parentIndex];
      if (!parent) continue;

      list.push({
        childIndex: cIdx,
        parentIndex,
        childLane: child.lane || 0,
        parentLane: parent.lane || 0,
        isTrunk: !!(child.is_trunk && parent.is_trunk),
        isFirstParent: pIdx === 0,
      });
    }
  }
  return list;
}
