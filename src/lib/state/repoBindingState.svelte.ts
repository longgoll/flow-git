import type { ProjectType, RepoBinding, AccountProfile, GitIdentity } from '../types';
import { getRepoBinding, saveRepoBinding, listRepoBindings } from '../api/auth';
import { setRepoIdentity } from '../api/identity';
import { toast } from './toastState.svelte';
import { localeState } from './localeState.svelte';

export class RepoBindingState {
  bindings = $state<Record<string, RepoBinding>>({});
  activeRepoPath = $state<string>('');
  dismissedBannerRepos = $state<Set<string>>(new Set());
  isLoading = $state(false);

  constructor() {
    this.loadAllBindings();
  }

  get currentBinding(): RepoBinding | null {
    if (!this.activeRepoPath) return null;
    return this.bindings[this.activeRepoPath] || null;
  }

  get currentTag(): ProjectType | null {
    return this.currentBinding?.project_type || null;
  }

  async loadAllBindings() {
    this.isLoading = true;
    try {
      const list = await listRepoBindings();
      const map: Record<string, RepoBinding> = {};
      for (const b of list) {
        if (b.repo_path) {
          map[b.repo_path] = b;
        }
      }
      this.bindings = map;
    } catch (err) {
      console.warn('Failed to load repo bindings:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async setActiveRepo(path: string) {
    this.activeRepoPath = path;
    if (path && !this.bindings[path]) {
      try {
        const b = await getRepoBinding(path);
        if (b) {
          this.bindings[path] = b;
        }
      } catch (err) {
        console.warn('Failed to get repo binding for active repo:', err);
      }
    }
  }

  getTagForRepo(path: string): ProjectType | null {
    return this.bindings[path]?.project_type || null;
  }

  async setQuickTag(path: string, projectType: ProjectType, accounts?: AccountProfile[], identities?: GitIdentity[]) {
    if (!path) return;

    let targetAccountId = this.bindings[path]?.account_id || null;
    let targetIdentityId = this.bindings[path]?.identity_id || null;

    // Smart Identity Auto-Assignment if not configured yet
    if (!targetIdentityId && identities && identities.length > 0) {
      const match = identities.find((i) => {
        const idLower = (i.id + ' ' + i.label).toLowerCase();
        if (projectType === 'work') return idLower.includes('work') || idLower.includes('công ty');
        if (projectType === 'personal') return idLower.includes('personal') || idLower.includes('cá nhân');
        return false;
      });
      if (match) {
        targetIdentityId = match.id;
        // Automatically apply git config --local user.name & email
        try {
          await setRepoIdentity(path, match.name, match.email, false);
          toast.success(
            localeState.t('auth.token.projectTagging.autoAppliedIdentity', {
              name: match.name,
              email: match.email,
            })
          );
        } catch (e) {
          console.warn('Could not auto-apply git identity:', e);
        }
      }
    }

    // Smart Account Auto-Assignment if accounts provided
    if (!targetAccountId && accounts && accounts.length > 0) {
      if (projectType === 'work') {
        const gitlabAcc = accounts.find((a) => a.provider === 'gitlab');
        if (gitlabAcc) targetAccountId = gitlabAcc.id;
      } else if (projectType === 'personal' || projectType === 'opensource') {
        const githubAcc = accounts.find((a) => a.provider === 'github');
        if (githubAcc) targetAccountId = githubAcc.id;
      }
    }

    const binding: RepoBinding = {
      repo_path: path,
      project_type: projectType,
      account_id: targetAccountId,
      identity_id: targetIdentityId,
      updated_at: Math.floor(Date.now() / 1000),
    };

    await this.save(binding);
  }

  async save(binding: RepoBinding) {
    try {
      await saveRepoBinding(binding);
      this.bindings[binding.repo_path] = binding;
      toast.success(localeState.t('auth.token.projectTagging.saveSuccess'));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save repo binding');
    }
  }

  dismissBanner(path: string) {
    this.dismissedBannerRepos.add(path);
  }

  shouldShowBanner(path: string): boolean {
    if (!path) return false;
    if (this.dismissedBannerRepos.has(path)) return false;
    return !this.bindings[path];
  }
}

export const repoBindingState = new RepoBindingState();
