import type {
  BranchInfo,
  CommitDetail as ICommitDetail,
  CommitNode,
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

export class RepoState {
  // Svelte 5 Runes:
  // MANDATORY: Use $state.raw for commits to eliminate Proxy overhead on large datasets (>50k items)
  rawCommits = $state.raw<CommitNode[]>([]);
  repoSummary = $state<RepoSummary | null>(null);
  branches = $state<BranchInfo[]>([]);
  tags = $state<TagInfo[]>([]);
  stashes = $state<StashInfo[]>([]);
  worktrees = $state<WorktreeInfo[]>([]);

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

  statusMessage = $state<string>('Ready');
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

  // Filtered commits (derived)
  visibleCommits = $derived.by(() => {
    if (!this.rawCommits || !Array.isArray(this.rawCommits)) return [];
    let list = this.rawCommits;

    if (this.filterHideMerges) {
      list = list.filter((c) => !c.parents || c.parents.length <= 1);
    }

    if (this.filterMyCommits) {
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
    this.statusMessage = `Opening repository at ${path}...`;
    if (this.currentRepoPath !== path) {
      this.resetRepoData();
    }
    try {
      this.currentRepoPath = path;
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
      this.statusMessage = `Loaded ${hist.length.toLocaleString()} commits. Realtime file watcher active.`;
    } catch (err: any) {
      console.error('Failed to open repository:', err);
      this.statusMessage = `Error: ${err?.message || err}`;
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
    this.statusMessage = `Initializing git repository at ${path}...`;
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
      this.statusMessage = `Repository initialized successfully. Branch: ${summary.current_branch || 'main'}`;
      return summary;
    } catch (err: any) {
      console.error('Failed to init repository:', err);
      this.statusMessage = `Error: ${err?.message || err}`;
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
        this.statusMessage = `Loaded ${this.rawCommits.length.toLocaleString()} commits.`;
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
      this.statusMessage = `Loaded ${this.rawCommits.length} commits (${this.hasMoreCommits ? 'more available' : 'all history loaded'})`;
    } catch (err: any) {
      console.error('Failed to load more commits:', err);
    } finally {
      this.isLoadingMoreCommits = false;
    }
  }
}
