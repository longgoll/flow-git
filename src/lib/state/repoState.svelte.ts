import type {
  BranchInfo,
  CommitDetail as ICommitDetail,
  CommitNode,
  OperationLog,
  OperationLogType,
  RepoSummary,
  StashInfo,
  TagInfo,
  WorktreeInfo,
} from '../types';
import {
  getBranches,
  getCommitHistory,
  getCommitInfo,
  getPaginatedCommitHistory,
  getStashes,
  getTags,
  getWorkingTreeStatus,
  initRepository,
  listWorktrees,
  openRepository,
} from '../api';
import { localeState } from './localeState.svelte';
export class RepoState {
  // Svelte 5 Runes:
  // MANDATORY: Use $state.raw for commits to eliminate Proxy overhead on large datasets (>50k items)
  rawCommits = $state.raw<CommitNode[]>([]);
  repoSummary = $state<RepoSummary | null>(null);
  branches = $state<BranchInfo[]>([]);
  tags = $state<TagInfo[]>([]);
  stashes = $state<StashInfo[]>([]);
  worktrees = $state<WorktreeInfo[]>([]);
  currentBranch = $derived(this.branches.find((b) => b.is_head));

  currentRepoPath = $state<string>('');
  searchQuery = $state<string>('');
  commitLimit = $state<number>(2000);
  isLoading = $state<boolean>(false);
  hasMoreCommits = $state<boolean>(false);
  isLoadingMoreCommits = $state<boolean>(false);

  selectedCommitId = $state<string | null>(null);
  selectedCommitIds = $state<string[]>([]);
  commitDetail = $state<ICommitDetail | null>(null);
  isDetailLoading = $state<boolean>(false);
  isDetailOpen = $state<boolean>(true);
  isDetailMaximized = $state<boolean>(false);

  statusMessage = $state<string>(localeState.t('statusBar.ready'));
  operationLogs = $state<OperationLog[]>([]);
  isLogPanelOpen = $state<boolean>(false);

  setStatus(message: string, type: OperationLogType = 'info') {
    this.statusMessage = message;
    const entry: OperationLog = { id: Date.now(), message, type, timestamp: new Date() };
    this.operationLogs = [entry, ...this.operationLogs].slice(0, 500);
  }

  recentRepos = $state<string[]>(
    (() => {
      try {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('flowgit_recent_repos') : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
      return [];
    })()
  );
  showWelcomeScreen = $state<boolean>(false);

  // Smart Filters
  filterHideMerges = $state<boolean>(false);
  filterMyCommits = $state<boolean>(false);
  filterCompactView = $state<boolean>(false);
  currentUserEmail = $state<string>('');

  // Pinned Branches & Branch Visibility Preferences
  pinnedBranches = $state<string[]>([]);
  hiddenBranches = $state<string[]>([]);

  // Advanced Filters
  filterAuthor = $state<string>('');
  filterDateRange = $state<'all' | '24h' | '7d' | '30d' | 'custom'>('all');
  filterDateFrom = $state<string | null>(null);
  filterDateTo = $state<string | null>(null);

  // Derived authors list with commit counts
  authors = $derived.by(() => {
    if (!this.rawCommits || !Array.isArray(this.rawCommits)) return [];
    const map = new Map<string, { name: string; email: string; count: number }>();
    for (const c of this.rawCommits) {
      const email = c.author_email?.trim() || '';
      const name = c.author_name?.trim() || 'Unknown';
      const key = email || name;
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { name, email, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  });

  // Filtered commits (derived)
  visibleCommits = $derived.by(() => {
    if (!this.rawCommits || !Array.isArray(this.rawCommits)) return [];
    let list = this.rawCommits;

    // 1. Filter by Hidden Branches (DAG Reachability)
    if (this.hiddenBranches.length > 0 && this.branches.length > 0) {
      const hiddenSet = new Set(this.hiddenBranches);
      // Collect visible branch tips
      const visibleBranchTips = this.branches
        .filter((b) => !hiddenSet.has(b.shorthand) && b.target_commit_id)
        .map((b) => b.target_commit_id);

      // Always include HEAD tip if available
      if (this.rawCommits.length > 0 && !visibleBranchTips.includes(this.rawCommits[0].id)) {
        visibleBranchTips.push(this.rawCommits[0].id);
      }

      if (visibleBranchTips.length > 0) {
        // Fast BFS to find reachable commits from visible branch tips
        const commitMap = new Map<string, CommitNode>();
        for (const c of this.rawCommits) {
          commitMap.set(c.id, c);
        }

        const reachable = new Set<string>();
        const queue: string[] = [...visibleBranchTips];

        while (queue.length > 0) {
          const sha = queue.pop()!;
          if (!reachable.has(sha)) {
            reachable.add(sha);
            const node = commitMap.get(sha);
            if (node && node.parents) {
              for (const p of node.parents) {
                if (!reachable.has(p) && commitMap.has(p)) {
                  queue.push(p);
                }
              }
            }
          }
        }

        list = list.filter((c) => reachable.has(c.id));
      }
    }

    // 2. Filter hide merges
    if (this.filterHideMerges) {
      list = list.filter((c) => !c.parents || c.parents.length <= 1);
    }

    // 3. Filter author (Author dropdown or my commits toggle)
    if (this.filterAuthor) {
      const target = this.filterAuthor.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.author_email?.toLowerCase().trim() === target ||
          c.author_name?.toLowerCase().trim() === target
      );
    } else if (this.filterMyCommits) {
      const email = this.currentUserEmail.toLowerCase().trim();
      if (email) {
        list = list.filter((c) => c.author_email?.toLowerCase().includes(email));
      } else {
        // Fallback: pick the first author from HEAD or the most recent commit
        const fallbackEmail = this.rawCommits[0]?.author_email?.toLowerCase();
        if (fallbackEmail) {
          list = list.filter((c) => c.author_email?.toLowerCase() === fallbackEmail);
        }
      }
    }

    // 4. Filter date range
    if (this.filterDateRange !== 'all') {
      const nowSec = Math.floor(Date.now() / 1000);
      let minSec = 0;
      let maxSec = Infinity;

      if (this.filterDateRange === '24h') {
        minSec = nowSec - 86400;
      } else if (this.filterDateRange === '7d') {
        minSec = nowSec - 7 * 86400;
      } else if (this.filterDateRange === '30d') {
        minSec = nowSec - 30 * 86400;
      } else if (this.filterDateRange === 'custom') {
        if (this.filterDateFrom) {
          minSec = Math.floor(new Date(this.filterDateFrom).getTime() / 1000);
        }
        if (this.filterDateTo) {
          maxSec = Math.floor(new Date(`${this.filterDateTo}T23:59:59`).getTime() / 1000);
        }
      }

      list = list.filter((c) => c.timestamp >= minSec && c.timestamp <= maxSec);
    }

    // 5. Search query
    if (!this.searchQuery.trim()) return list;
    const q = this.searchQuery.toLowerCase();
    return list.filter(
      (c) =>
        c?.short_id?.toLowerCase().includes(q) ||
        c?.summary?.toLowerCase().includes(q) ||
        c?.author_name?.toLowerCase().includes(q) ||
        (c?.refs && Array.isArray(c.refs) && c.refs.some((r) => r?.shorthand?.toLowerCase().includes(q)))
    );
  });

  loadRepoPrefs(path: string) {
    if (!path) return;
    try {
      const keyPinned = `flowgit_pinned_branches_${encodeURIComponent(path)}`;
      const savedPinned = localStorage.getItem(keyPinned);
      this.pinnedBranches = savedPinned ? JSON.parse(savedPinned) : [];

      const keyHidden = `flowgit_hidden_branches_${encodeURIComponent(path)}`;
      const savedHidden = localStorage.getItem(keyHidden);
      this.hiddenBranches = savedHidden ? JSON.parse(savedHidden) : [];
    } catch {}
  }

  saveRepoPrefs(path: string) {
    if (!path) return;
    try {
      localStorage.setItem(`flowgit_pinned_branches_${encodeURIComponent(path)}`, JSON.stringify(this.pinnedBranches));
      localStorage.setItem(`flowgit_hidden_branches_${encodeURIComponent(path)}`, JSON.stringify(this.hiddenBranches));
    } catch {}
  }

  togglePinBranch(shorthand: string) {
    if (this.pinnedBranches.includes(shorthand)) {
      this.pinnedBranches = this.pinnedBranches.filter((b) => b !== shorthand);
    } else {
      this.pinnedBranches = [...this.pinnedBranches, shorthand];
    }
    this.saveRepoPrefs(this.currentRepoPath);
  }

  isBranchPinned(shorthand: string): boolean {
    return this.pinnedBranches.includes(shorthand);
  }

  toggleBranchVisibility(shorthand: string) {
    if (this.hiddenBranches.includes(shorthand)) {
      this.hiddenBranches = this.hiddenBranches.filter((b) => b !== shorthand);
    } else {
      this.hiddenBranches = [...this.hiddenBranches, shorthand];
    }
    this.saveRepoPrefs(this.currentRepoPath);
  }

  isBranchHidden(shorthand: string): boolean {
    return this.hiddenBranches.includes(shorthand);
  }

  soloBranch(shorthand: string) {
    const allShorthands = this.branches.map((b) => b.shorthand);
    const toKeep = new Set<string>([shorthand]);
    if (this.repoSummary?.current_branch) {
      toKeep.add(this.repoSummary.current_branch);
    }
    this.hiddenBranches = allShorthands.filter((name) => !toKeep.has(name));
    this.saveRepoPrefs(this.currentRepoPath);
  }

  showAllBranches() {
    this.hiddenBranches = [];
    this.saveRepoPrefs(this.currentRepoPath);
  }

  clearFilters() {
    this.searchQuery = '';
    this.filterAuthor = '';
    this.filterDateRange = 'all';
    this.filterDateFrom = null;
    this.filterDateTo = null;
    this.filterHideMerges = false;
    this.filterMyCommits = false;
  }

  initRecentRepos() {
    try {
      const saved = localStorage.getItem('flowgit_recent_repos');
      if (saved) {
        this.recentRepos = JSON.parse(saved);
      }
    } catch {}
  }

  saveRecentRepo(path: string) {
    if (path && path.trim() !== '') {
      this.recentRepos = [path, ...this.recentRepos.filter((p) => p !== path)].slice(0, 8);
      try {
        localStorage.setItem('flowgit_recent_repos', JSON.stringify(this.recentRepos));
      } catch {}
    }
  }

  resetRepoData() {
    this.rawCommits = [];
    this.repoSummary = null;
    this.branches = [];
    this.tags = [];
    this.stashes = [];
    this.worktrees = [];
    this.selectedCommitId = null;
    this.selectedCommitIds = [];
    this.commitDetail = null;
    this.isDetailLoading = false;
    this.hasMoreCommits = false;
  }

  async loadRepo(path: string, onAfterLoad?: (wtStatus: any) => void, preferredCommitId?: string | null) {
    this.isLoading = true;
    this.setStatus(localeState.t('statusBar.openingRepo', { path }));
    if (this.currentRepoPath !== path) {
      this.resetRepoData();
    }
    try {
      this.currentRepoPath = path;
      this.loadRepoPrefs(path);
      const summary = await openRepository(path);
      this.repoSummary = summary;

      const [hist, branchList, tagList, stashList, wtStatus, worktreeList] = await Promise.all([
        getCommitHistory(path, this.commitLimit),
        getBranches(path),
        getTags(path),
        getStashes(path),
        getWorkingTreeStatus(path).catch((e) => {
          console.warn('[FlowGit] Bỏ qua lỗi working tree:', e);
          return {
            staged: [],
            unstaged: [],
            untracked: [],
            conflicted: [],
            total_dirty_count: 0,
            total_staged_count: 0,
            operation_state: 'normal' as any,
          };
        }),
        listWorktrees(path),
      ]);

      this.rawCommits = hist;
      this.hasMoreCommits = this.commitLimit > 0 && hist.length >= this.commitLimit;
      this.branches = branchList;
      this.tags = tagList;
      this.stashes = stashList;
      this.worktrees = worktreeList;

      if (onAfterLoad) {
        onAfterLoad(wtStatus);
      }

      if (this.rawCommits.length > 0) {
        const targetCommit = preferredCommitId && this.rawCommits.some((c) => c.id === preferredCommitId)
          ? preferredCommitId
          : this.rawCommits[0].id;
        this.selectedCommitId = targetCommit;
        this.selectedCommitIds = [targetCommit];
        await this.loadCommitDetail(targetCommit);
      } else {
        this.selectedCommitId = null;
        this.selectedCommitIds = [];
        this.commitDetail = null;
      }

      this.saveRecentRepo(path);
      this.showWelcomeScreen = false;
      this.setStatus(localeState.t('statusBar.loadedCommits', { count: hist.length.toLocaleString() }), 'success');
    } catch (err: any) {
      console.error('Failed to open repository:', err);
      this.setStatus(`${localeState.t('common.error')}: ${err?.message || err}`, 'error');
      this.repoSummary = null;
      this.rawCommits = [];
      this.showWelcomeScreen = true;
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async initRepo(path: string, defaultBranch?: string, onAfterLoad?: (wtStatus: any) => void) {
    this.isLoading = true;
    this.setStatus(localeState.t('statusBar.initializingRepo', { path }));
    try {
      this.currentRepoPath = path;
      const summary = await initRepository(path, defaultBranch);
      this.repoSummary = summary;

      const [hist, branchList, tagList, stashList, wtStatus, worktreeList] = await Promise.all([
        getCommitHistory(path, this.commitLimit),
        getBranches(path),
        getTags(path),
        getStashes(path),
        getWorkingTreeStatus(path),
        listWorktrees(path),
      ]);

      this.rawCommits = hist;
      this.hasMoreCommits = false;
      this.branches = branchList;
      this.tags = tagList;
      this.stashes = stashList;
      this.worktrees = worktreeList;

      if (onAfterLoad) {
        onAfterLoad(wtStatus);
      }

      this.saveRecentRepo(path);
      this.showWelcomeScreen = false;
      this.setStatus(localeState.t('statusBar.initSuccess', { branch: summary.current_branch || 'main' }), 'success');
      return summary;
    } catch (err: any) {
      console.error('Failed to init repository:', err);
      this.setStatus(`${localeState.t('common.error')}: ${err?.message || err}`, 'error');
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async refreshWorkingTreeOnly(onAfterRefresh?: (wtStatus: any) => Promise<void>) {
    if (!this.currentRepoPath) return;
    try {
      const [wtStatus, summary, worktreeList] = await Promise.all([
        getWorkingTreeStatus(this.currentRepoPath),
        openRepository(this.currentRepoPath),
        listWorktrees(this.currentRepoPath),
      ]);
      this.repoSummary = summary;
      this.worktrees = worktreeList;

      if (onAfterRefresh) {
        await onAfterRefresh(wtStatus);
      }
    } catch (e) {
      console.error('Failed to refresh working tree:', e);
    }
  }

  async loadCommitDetail(commitId: string) {
    if (!this.currentRepoPath) return;
    this.isDetailLoading = true;
    try {
      this.commitDetail = await getCommitInfo(this.currentRepoPath, commitId);
    } catch (e) {
      console.error('Failed to load commit detail:', e);
    } finally {
      this.isDetailLoading = false;
    }
  }

  async handleSelectCommit(commit: CommitNode) {
    this.selectedCommitId = commit.id;
    this.selectedCommitIds = [commit.id];
    this.isDetailOpen = true;
    await this.loadCommitDetail(commit.id);
  }

  async selectCommitById(commitId: string) {
    this.selectedCommitId = commitId;
    this.selectedCommitIds = [commitId];
    this.isDetailOpen = true;
    await this.loadCommitDetail(commitId);
  }

  handleSelectBranch(branch: BranchInfo) {
    const targetCommit = this.rawCommits.find((c) => c.id === branch.target_commit_id);
    if (targetCommit) {
      this.handleSelectCommit(targetCommit);
    }
  }

  handleSelectParent(parentId: string) {
    const parentCommit = this.rawCommits.find((c) => c.id === parentId);
    if (parentCommit) {
      this.handleSelectCommit(parentCommit);
    } else {
      this.selectedCommitId = parentId;
      this.selectedCommitIds = [parentId];
      this.loadCommitDetail(parentId);
    }
  }

  async handleLimitChange(limit: number) {
    this.commitLimit = limit;
    if (this.currentRepoPath) {
      this.isLoading = true;
      try {
        this.rawCommits = await getCommitHistory(this.currentRepoPath, this.commitLimit);
        this.setStatus(localeState.t('statusBar.loadedCommitsSimple', { count: this.rawCommits.length.toLocaleString() }), 'success');
      } finally {
        this.isLoading = false;
      }
    }
  }

  async handleLoadMoreCommits() {
    if (!this.currentRepoPath || this.isLoadingMoreCommits || !this.hasMoreCommits) return;
    this.isLoadingMoreCommits = true;
    try {
      const nextSkip = this.rawCommits.length;
      const res = await getPaginatedCommitHistory(this.currentRepoPath, nextSkip, 500);
      this.rawCommits = [...this.rawCommits, ...res.commits];
      this.hasMoreCommits = res.has_more;
      this.setStatus(
        localeState.t('statusBar.loadedMoreCommits', {
          count: this.rawCommits.length,
          status: this.hasMoreCommits ? localeState.t('statusBar.moreAvailable') : localeState.t('statusBar.allHistoryLoaded'),
        }),
        'success'
      );
    } catch (err: any) {
      console.error('Failed to load more commits:', err);
    } finally {
      this.isLoadingMoreCommits = false;
    }
  }
}
