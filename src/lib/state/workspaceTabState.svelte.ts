import type { WorkspaceTab } from '../types';

const STORAGE_TABS_KEY = 'flowgit_workspace_tabs';
const STORAGE_ACTIVE_TAB_KEY = 'flowgit_active_tab_id';

function normalizePath(p: string): string {
  if (!p) return '';
  return p.replace(/\\/g, '/').replace(/\/+$/, '');
}

function extractNameFromPath(p: string): string {
  const norm = normalizePath(p);
  const parts = norm.split('/');
  return parts[parts.length - 1] || 'repository';
}

export class WorkspaceTabState {
  tabs = $state<WorkspaceTab[]>([]);
  activeTabId = $state<string | null>(null);

  constructor() {
    this.loadFromStorage();
  }

  get activeTab(): WorkspaceTab | null {
    if (!this.activeTabId) return this.tabs[0] || null;
    return this.tabs.find((t) => t.id === this.activeTabId) || this.tabs[0] || null;
  }

  loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const savedTabs = localStorage.getItem(STORAGE_TABS_KEY);
      const savedActiveId = localStorage.getItem(STORAGE_ACTIVE_TAB_KEY);

      if (savedTabs) {
        const parsed: WorkspaceTab[] = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.tabs = parsed.map((t) => ({
            ...t,
            id: normalizePath(t.path || t.id),
            path: normalizePath(t.path),
          }));
          if (savedActiveId && this.tabs.some((t) => t.id === savedActiveId)) {
            this.activeTabId = savedActiveId;
          } else {
            this.activeTabId = this.tabs[0].id;
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load workspace tabs from storage:', e);
    }
  }

  saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_TABS_KEY, JSON.stringify(this.tabs));
      if (this.activeTabId) {
        localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, this.activeTabId);
      } else {
        localStorage.removeItem(STORAGE_ACTIVE_TAB_KEY);
      }
    } catch (e) {
      console.warn('Failed to save workspace tabs to storage:', e);
    }
  }

  initDefaultTab(path: string, branchName?: string): WorkspaceTab {
    const norm = normalizePath(path);
    if (!norm) {
      throw new Error('Path cannot be empty');
    }

    if (this.tabs.length === 0) {
      const newTab: WorkspaceTab = {
        id: norm,
        path: norm,
        name: extractNameFromPath(norm),
        branch: branchName || undefined,
        isWorktree: false,
        dirtyFilesCount: 0,
        lastActiveAt: Date.now(),
      };
      this.tabs = [newTab];
      this.activeTabId = norm;
      this.saveToStorage();
      return newTab;
    }

    const existing = this.tabs.find((t) => t.id === norm);
    if (existing) {
      if (branchName) existing.branch = branchName;
      this.activeTabId = norm;
      this.saveToStorage();
      return existing;
    }

    return this.openTab({ path: norm, branch: branchName });
  }

  openTab(params: {
    path: string;
    name?: string;
    isWorktree?: boolean;
    branch?: string;
    mainRepoPath?: string;
    dirtyFilesCount?: number;
  }): WorkspaceTab {
    const norm = normalizePath(params.path);
    const existing = this.tabs.find((t) => t.id === norm);

    if (existing) {
      if (params.name) existing.name = params.name;
      if (params.branch) existing.branch = params.branch;
      if (params.isWorktree !== undefined) existing.isWorktree = params.isWorktree;
      if (params.mainRepoPath) existing.mainRepoPath = normalizePath(params.mainRepoPath);
      if (params.dirtyFilesCount !== undefined) existing.dirtyFilesCount = params.dirtyFilesCount;
      existing.lastActiveAt = Date.now();

      this.activeTabId = norm;
      this.saveToStorage();
      return existing;
    }

    const newTab: WorkspaceTab = {
      id: norm,
      path: norm,
      name: params.name || extractNameFromPath(norm),
      branch: params.branch,
      isWorktree: !!params.isWorktree,
      mainRepoPath: params.mainRepoPath ? normalizePath(params.mainRepoPath) : undefined,
      dirtyFilesCount: params.dirtyFilesCount || 0,
      lastActiveAt: Date.now(),
    };

    this.tabs = [...this.tabs, newTab];
    this.activeTabId = norm;
    this.saveToStorage();
    return newTab;
  }

  switchTab(id: string): WorkspaceTab | null {
    const target = this.tabs.find((t) => t.id === id);
    if (!target) return null;

    target.lastActiveAt = Date.now();
    this.activeTabId = target.id;
    this.saveToStorage();
    return target;
  }

  closeTab(id: string): { closedId: string; nextTab: WorkspaceTab | null } {
    const idx = this.tabs.findIndex((t) => t.id === id);
    if (idx === -1) {
      return { closedId: id, nextTab: this.activeTab };
    }

    const wasActive = this.activeTabId === id;
    const remaining = this.tabs.filter((t) => t.id !== id);
    this.tabs = remaining;

    let nextTab: WorkspaceTab | null = null;
    if (remaining.length > 0) {
      if (wasActive) {
        // Switch to the adjacent tab (previous if available, else next)
        const nextIdx = Math.max(0, Math.min(idx - 1, remaining.length - 1));
        nextTab = remaining[nextIdx];
        this.activeTabId = nextTab.id;
      } else {
        nextTab = this.activeTab;
      }
    } else {
      this.activeTabId = null;
    }

    this.saveToStorage();
    return { closedId: id, nextTab };
  }

  closeOtherTabs(keepId: string) {
    const keep = this.tabs.find((t) => t.id === keepId);
    if (!keep) return;

    this.tabs = [keep];
    this.activeTabId = keep.id;
    this.saveToStorage();
  }

  updateTabMeta(
    id: string,
    meta: {
      name?: string;
      branch?: string;
      dirtyFilesCount?: number;
      isWorktree?: boolean;
    },
  ) {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;

    if (meta.name !== undefined) tab.name = meta.name;
    if (meta.branch !== undefined) tab.branch = meta.branch;
    if (meta.dirtyFilesCount !== undefined) tab.dirtyFilesCount = meta.dirtyFilesCount;
    if (meta.isWorktree !== undefined) tab.isWorktree = meta.isWorktree;

    this.saveToStorage();
  }

  updateActiveTabMeta(meta: {
    name?: string;
    branch?: string;
    dirtyFilesCount?: number;
    isWorktree?: boolean;
  }) {
    if (!this.activeTabId) return;
    this.updateTabMeta(this.activeTabId, meta);
  }

  nextTab(): WorkspaceTab | null {
    if (this.tabs.length <= 1) return this.activeTab;
    const currentIdx = this.tabs.findIndex((t) => t.id === this.activeTabId);
    const nextIdx = (currentIdx + 1) % this.tabs.length;
    return this.switchTab(this.tabs[nextIdx].id);
  }

  prevTab(): WorkspaceTab | null {
    if (this.tabs.length <= 1) return this.activeTab;
    const currentIdx = this.tabs.findIndex((t) => t.id === this.activeTabId);
    const prevIdx = (currentIdx - 1 + this.tabs.length) % this.tabs.length;
    return this.switchTab(this.tabs[prevIdx].id);
  }
}
