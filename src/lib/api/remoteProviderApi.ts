import type {
  GitHubPRComment,
  GitHubPRFile,
  GitHubPullRequest,
  RemoteProviderInfo,
} from '../types';
import {
  fetchGitHubPullRequests,
  fetchGitHubPullRequestFiles,
  fetchGitHubPullRequestComments,
  createGitHubPullRequest,
  mergeGitHubPullRequest,
  updateGitHubPullRequestState,
  createGitHubInlineComment,
} from './githubApi';

// Storage keys for remote provider tokens
const GITLAB_TOKEN_STORAGE_KEY = 'flowgit_gitlab_token';
const BITBUCKET_TOKEN_STORAGE_KEY = 'flowgit_bitbucket_token';

export function saveGitLabToken(token: string): void {
  try {
    localStorage.setItem(GITLAB_TOKEN_STORAGE_KEY, token.trim());
  } catch (e) {
    console.error('Failed to save GitLab token', e);
  }
}

export function getStoredGitLabToken(): string {
  try {
    return localStorage.getItem(GITLAB_TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveBitbucketToken(token: string): void {
  try {
    localStorage.setItem(BITBUCKET_TOKEN_STORAGE_KEY, token.trim());
  } catch (e) {
    console.error('Failed to save Bitbucket token', e);
  }
}

export function getStoredBitbucketToken(): string {
  try {
    return localStorage.getItem(BITBUCKET_TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Universal remote URL parser supporting GitHub, GitLab (cloud & self-hosted), and Bitbucket.
 */
export function parseRemoteProvider(url?: string | null): RemoteProviderInfo | null {
  if (!url) return null;
  const clean = url.trim();

  // 1. GitHub
  const ghHttps = clean.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/\.]+)(?:\.git)?$/i);
  const ghSsh = clean.match(/^git@github\.com:([^\/]+)\/([^\/\.]+)(?:\.git)?$/i);
  if (ghHttps || ghSsh) {
    const owner = ghHttps ? ghHttps[1] : ghSsh![1];
    const repo = ghHttps ? ghHttps[2] : ghSsh![2];
    return {
      type: 'github',
      host: 'github.com',
      owner,
      repo,
      apiUrl: 'https://api.github.com',
    };
  }

  // 2. Bitbucket
  const bbHttps = clean.match(/^https?:\/\/bitbucket\.org\/([^\/]+)\/([^\/\.]+)(?:\.git)?$/i);
  const bbSsh = clean.match(/^git@bitbucket\.org:([^\/]+)\/([^\/\.]+)(?:\.git)?$/i);
  if (bbHttps || bbSsh) {
    const owner = bbHttps ? bbHttps[1] : bbSsh![1];
    const repo = bbHttps ? bbHttps[2] : bbSsh![2];
    return {
      type: 'bitbucket',
      host: 'bitbucket.org',
      owner,
      repo,
      apiUrl: 'https://api.bitbucket.org/2.0',
    };
  }

  // 3. GitLab (Cloud or Self-Hosted)
  // Matches gitlab.com or any host containing "gitlab"
  const glHttps = clean.match(/^https?:\/\/([^\/]+)\/([^\/]+)\/([^\/\.]+)(?:\.git)?$/i);
  const glSsh = clean.match(/^git@([^:]+):([^\/]+)\/([^\/\.]+)(?:\.git)?$/i);

  if (glHttps) {
    const host = glHttps[1];
    const owner = glHttps[2];
    const repo = glHttps[3];
    const isGitLab = host.toLowerCase().includes('gitlab');
    return {
      type: isGitLab ? 'gitlab' : 'custom',
      host,
      owner,
      repo,
      apiUrl: `https://${host}/api/v4`,
    };
  }

  if (glSsh) {
    const host = glSsh[1];
    const owner = glSsh[2];
    const repo = glSsh[3];
    const isGitLab = host.toLowerCase().includes('gitlab');
    return {
      type: isGitLab ? 'gitlab' : 'custom',
      host,
      owner,
      repo,
      apiUrl: `https://${host}/api/v4`,
    };
  }

  return null;
}

/**
 * Universal Remote Provider Adapter Interface
 */
export interface RemoteProviderAdapter {
  readonly providerInfo: RemoteProviderInfo;
  getLabel(): string;
  getPRTerm(): string; // "Pull Request" vs "Merge Request"
  getIconName(): 'github' | 'gitlab' | 'bitbucket' | 'git';
  fetchPullRequests(state?: 'open' | 'closed' | 'all', token?: string): Promise<GitHubPullRequest[]>;
  fetchPullRequestFiles(pullNumber: number, token?: string): Promise<GitHubPRFile[]>;
  fetchPullRequestComments(pullNumber: number, token?: string): Promise<GitHubPRComment[]>;
  createPullRequest(options: {
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
    token?: string;
  }): Promise<GitHubPullRequest>;
  mergePullRequest?(
    pullNumber: number,
    method?: 'merge' | 'squash' | 'rebase',
    commitMsg?: string,
    token?: string
  ): Promise<{ merged: boolean; message: string }>;
  closePullRequest?(pullNumber: number, token?: string): Promise<void>;
  createInlineComment?(options: {
    pullNumber: number;
    commitId: string;
    path: string;
    line: number;
    side?: 'LEFT' | 'RIGHT';
    body: string;
    token?: string;
  }): Promise<GitHubPRComment>;
}

/**
 * GitHub Adapter
 */
export class GitHubAdapter implements RemoteProviderAdapter {
  constructor(readonly providerInfo: RemoteProviderInfo) {}

  getLabel(): string {
    return 'GitHub';
  }

  getPRTerm(): string {
    return 'Pull Request';
  }

  getIconName(): 'github' {
    return 'github';
  }

  async fetchPullRequests(state: 'open' | 'closed' | 'all' = 'open', token?: string): Promise<GitHubPullRequest[]> {
    return fetchGitHubPullRequests(this.providerInfo.owner, this.providerInfo.repo, token, state);
  }

  async fetchPullRequestFiles(pullNumber: number, token?: string): Promise<GitHubPRFile[]> {
    return fetchGitHubPullRequestFiles(this.providerInfo.owner, this.providerInfo.repo, pullNumber, token);
  }

  async fetchPullRequestComments(pullNumber: number, token?: string): Promise<GitHubPRComment[]> {
    return fetchGitHubPullRequestComments(this.providerInfo.owner, this.providerInfo.repo, pullNumber, token);
  }

  async createPullRequest(options: {
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
    token?: string;
  }): Promise<GitHubPullRequest> {
    return createGitHubPullRequest(
      this.providerInfo.owner,
      this.providerInfo.repo,
      options.title,
      options.body,
      options.head,
      options.base,
      options.draft ?? false,
      options.token
    );
  }

  async mergePullRequest(
    pullNumber: number,
    method: 'merge' | 'squash' | 'rebase' = 'merge',
    commitMsg?: string,
    token?: string
  ): Promise<{ merged: boolean; message: string }> {
    return mergeGitHubPullRequest(
      this.providerInfo.owner,
      this.providerInfo.repo,
      pullNumber,
      method,
      '',
      commitMsg,
      token
    );
  }

  async closePullRequest(pullNumber: number, token?: string): Promise<void> {
    await updateGitHubPullRequestState(this.providerInfo.owner, this.providerInfo.repo, pullNumber, 'closed', token);
  }

  async createInlineComment(options: {
    pullNumber: number;
    commitId: string;
    path: string;
    line: number;
    side?: 'LEFT' | 'RIGHT';
    body: string;
    token?: string;
  }): Promise<GitHubPRComment> {
    return createGitHubInlineComment(
      this.providerInfo.owner,
      this.providerInfo.repo,
      options.pullNumber,
      options.commitId,
      options.path,
      options.line,
      options.side || 'RIGHT',
      options.body,
      options.token
    );
  }
}

/**
 * GitLab Adapter
 */
export class GitLabAdapter implements RemoteProviderAdapter {
  constructor(readonly providerInfo: RemoteProviderInfo) {}

  getLabel(): string {
    return 'GitLab';
  }

  getPRTerm(): string {
    return 'Merge Request';
  }

  getIconName(): 'gitlab' {
    return 'gitlab';
  }

  private getProjectIdentifier(): string {
    return encodeURIComponent(`${this.providerInfo.owner}/${this.providerInfo.repo}`);
  }

  private getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'FlowGit-Desktop',
    };
    const activeToken = token?.trim() || getStoredGitLabToken();
    if (activeToken) {
      headers['PRIVATE-TOKEN'] = activeToken;
    }
    return headers;
  }

  async fetchPullRequests(state: 'open' | 'closed' | 'all' = 'open', token?: string): Promise<GitHubPullRequest[]> {
    const glState = state === 'open' ? 'opened' : state === 'closed' ? 'closed' : 'all';
    const url = `${this.providerInfo.apiUrl}/projects/${this.getProjectIdentifier()}/merge_requests?state=${glState}&per_page=30`;
    const res = await fetch(url, { headers: this.getHeaders(token) });
    if (!res.ok) {
      throw new Error(`GitLab API Error (${res.status}): ${await res.text()}`);
    }
    const data: any[] = await res.json();
    return data.map((mr) => ({
      id: mr.id,
      number: mr.iid,
      title: mr.title,
      body: mr.description || '',
      state: mr.state === 'opened' ? 'open' : 'closed',
      html_url: mr.web_url,
      head: {
        ref: mr.source_branch,
        sha: mr.sha || '',
        label: mr.source_branch,
      },
      base: {
        ref: mr.target_branch,
        sha: '',
      },
      user: {
        login: mr.author?.username || 'unknown',
        avatar_url: mr.author?.avatar_url || '',
        html_url: mr.author?.web_url || '',
      },
      created_at: mr.created_at,
      updated_at: mr.updated_at,
      draft: !!(mr.work_in_progress || mr.draft),
      merged_at: mr.merged_at || undefined,
    }));
  }

  async fetchPullRequestFiles(pullNumber: number, token?: string): Promise<GitHubPRFile[]> {
    const url = `${this.providerInfo.apiUrl}/projects/${this.getProjectIdentifier()}/merge_requests/${pullNumber}/diffs?per_page=100`;
    const res = await fetch(url, { headers: this.getHeaders(token) });
    if (!res.ok) {
      throw new Error(`GitLab API Error (${res.status}): ${await res.text()}`);
    }
    const data: any[] = await res.json();
    return data.map((diff, index) => {
      const status = diff.new_file ? 'added' : diff.deleted_file ? 'deleted' : diff.renamed_file ? 'renamed' : 'modified';
      return {
        sha: `${pullNumber}-${index}`,
        filename: diff.new_path || diff.old_path,
        status,
        additions: 0,
        deletions: 0,
        changes: 0,
        patch: diff.diff,
        previous_filename: diff.renamed_file ? diff.old_path : undefined,
      };
    });
  }

  async fetchPullRequestComments(pullNumber: number, token?: string): Promise<GitHubPRComment[]> {
    const url = `${this.providerInfo.apiUrl}/projects/${this.getProjectIdentifier()}/merge_requests/${pullNumber}/notes?per_page=100`;
    const res = await fetch(url, { headers: this.getHeaders(token) });
    if (!res.ok) {
      throw new Error(`GitLab API Error (${res.status}): ${await res.text()}`);
    }
    const data: any[] = await res.json();
    return data
      .filter((note) => !note.system) // filter out system activity notes
      .map((note) => ({
        id: note.id,
        body: note.body,
        created_at: note.created_at,
        html_url: '',
        user: {
          login: note.author?.username || 'unknown',
          avatar_url: note.author?.avatar_url || '',
          html_url: note.author?.web_url || '',
        },
      }));
  }

  async createPullRequest(options: {
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
    token?: string;
  }): Promise<GitHubPullRequest> {
    const url = `${this.providerInfo.apiUrl}/projects/${this.getProjectIdentifier()}/merge_requests`;
    const title = options.draft ? `Draft: ${options.title}` : options.title;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(options.token),
      body: JSON.stringify({
        source_branch: options.head,
        target_branch: options.base,
        title,
        description: options.body,
      }),
    });
    if (!res.ok) {
      throw new Error(`GitLab API Error (${res.status}): ${await res.text()}`);
    }
    const mr = await res.json();
    return {
      id: mr.id,
      number: mr.iid,
      title: mr.title,
      body: mr.description || '',
      state: 'open',
      html_url: mr.web_url,
      head: { ref: mr.source_branch, sha: mr.sha || '', label: mr.source_branch },
      base: { ref: mr.target_branch, sha: '' },
      user: { login: mr.author?.username || 'unknown', avatar_url: mr.author?.avatar_url || '', html_url: mr.author?.web_url || '' },
      created_at: mr.created_at,
      updated_at: mr.updated_at,
      draft: !!(mr.work_in_progress || mr.draft),
    };
  }

  async mergePullRequest(
    pullNumber: number,
    method: 'merge' | 'squash' | 'rebase' = 'merge',
    commitMsg?: string,
    token?: string
  ): Promise<{ merged: boolean; message: string }> {
    const url = `${this.providerInfo.apiUrl}/projects/${this.getProjectIdentifier()}/merge_requests/${pullNumber}/merge`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify({
        squash: method === 'squash',
        merge_commit_message: commitMsg || undefined,
      }),
    });
    if (!res.ok) {
      throw new Error(`GitLab Merge Error (${res.status}): ${await res.text()}`);
    }
    return { merged: true, message: 'Merge Request merged successfully' };
  }

  async closePullRequest(pullNumber: number, token?: string): Promise<void> {
    const url = `${this.providerInfo.apiUrl}/projects/${this.getProjectIdentifier()}/merge_requests/${pullNumber}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(token),
      body: JSON.stringify({ state_event: 'close' }),
    });
    if (!res.ok) {
      throw new Error(`GitLab Close Error (${res.status}): ${await res.text()}`);
    }
  }

  async createInlineComment(options: {
    pullNumber: number;
    commitId: string;
    path: string;
    line: number;
    side?: 'LEFT' | 'RIGHT';
    body: string;
    token?: string;
  }): Promise<GitHubPRComment> {
    const url = `${this.providerInfo.apiUrl}/projects/${this.getProjectIdentifier()}/merge_requests/${options.pullNumber}/notes`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(options.token),
      body: JSON.stringify({
        body: options.body,
      }),
    });
    if (!res.ok) {
      throw new Error(`GitLab Comment Error (${res.status}): ${await res.text()}`);
    }
    const note = await res.json();
    return {
      id: note.id,
      body: note.body,
      created_at: note.created_at,
      html_url: '',
      user: { login: note.author?.username || 'unknown', avatar_url: note.author?.avatar_url || '', html_url: note.author?.web_url || '' },
    };
  }
}

/**
 * Bitbucket Adapter
 */
export class BitbucketAdapter implements RemoteProviderAdapter {
  constructor(readonly providerInfo: RemoteProviderInfo) {}

  getLabel(): string {
    return 'Bitbucket';
  }

  getPRTerm(): string {
    return 'Pull Request';
  }

  getIconName(): 'bitbucket' {
    return 'bitbucket';
  }

  private getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'FlowGit-Desktop',
    };
    const activeToken = token?.trim() || getStoredBitbucketToken();
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  }

  async fetchPullRequests(state: 'open' | 'closed' | 'all' = 'open', token?: string): Promise<GitHubPullRequest[]> {
    let bbStateQuery = 'state="OPEN"';
    if (state === 'closed') {
      bbStateQuery = '(state="MERGED" OR state="DECLINED")';
    } else if (state === 'all') {
      bbStateQuery = '(state="OPEN" OR state="MERGED" OR state="DECLINED")';
    }
    const url = `${this.providerInfo.apiUrl}/repositories/${this.providerInfo.owner}/${this.providerInfo.repo}/pullrequests?q=${encodeURIComponent(bbStateQuery)}&pagelen=30`;
    const res = await fetch(url, { headers: this.getHeaders(token) });
    if (!res.ok) {
      throw new Error(`Bitbucket API Error (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();
    const values: any[] = data.values || [];
    return values.map((pr) => ({
      id: pr.id,
      number: pr.id,
      title: pr.title,
      body: pr.description || pr.summary?.raw || '',
      state: pr.state === 'OPEN' ? 'open' : 'closed',
      html_url: pr.links?.html?.href || '',
      head: {
        ref: pr.source?.branch?.name || '',
        sha: pr.source?.commit?.hash || '',
        label: pr.source?.branch?.name || '',
      },
      base: {
        ref: pr.destination?.branch?.name || '',
        sha: pr.destination?.commit?.hash || '',
      },
      user: {
        login: pr.author?.display_name || pr.author?.nickname || 'unknown',
        avatar_url: pr.author?.links?.avatar?.href || '',
        html_url: pr.author?.links?.html?.href || '',
      },
      created_at: pr.created_on,
      updated_at: pr.updated_on,
      draft: false,
      merged_at: pr.state === 'MERGED' ? pr.updated_on : undefined,
    }));
  }

  async fetchPullRequestFiles(pullNumber: number, token?: string): Promise<GitHubPRFile[]> {
    const url = `${this.providerInfo.apiUrl}/repositories/${this.providerInfo.owner}/${this.providerInfo.repo}/pullrequests/${pullNumber}/diffstat?pagelen=100`;
    const res = await fetch(url, { headers: this.getHeaders(token) });
    if (!res.ok) {
      throw new Error(`Bitbucket API Error (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();
    const values: any[] = data.values || [];
    return values.map((stat, idx) => ({
      sha: `${pullNumber}-${idx}`,
      filename: stat.new?.path || stat.old?.path || '',
      status: stat.status || 'modified',
      additions: stat.lines_added || 0,
      deletions: stat.lines_removed || 0,
      changes: (stat.lines_added || 0) + (stat.lines_removed || 0),
      previous_filename: stat.old?.path !== stat.new?.path ? stat.old?.path : undefined,
    }));
  }

  async fetchPullRequestComments(pullNumber: number, token?: string): Promise<GitHubPRComment[]> {
    const url = `${this.providerInfo.apiUrl}/repositories/${this.providerInfo.owner}/${this.providerInfo.repo}/pullrequests/${pullNumber}/comments?pagelen=100`;
    const res = await fetch(url, { headers: this.getHeaders(token) });
    if (!res.ok) {
      throw new Error(`Bitbucket API Error (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();
    const values: any[] = data.values || [];
    return values
      .filter((c) => !c.deleted)
      .map((c) => ({
        id: c.id,
        body: c.content?.raw || '',
        created_at: c.created_on,
        html_url: c.links?.html?.href || '',
        user: {
          login: c.user?.display_name || c.user?.nickname || 'unknown',
          avatar_url: c.user?.links?.avatar?.href || '',
          html_url: c.user?.links?.html?.href || '',
        },
      }));
  }

  async createPullRequest(options: {
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
    token?: string;
  }): Promise<GitHubPullRequest> {
    const url = `${this.providerInfo.apiUrl}/repositories/${this.providerInfo.owner}/${this.providerInfo.repo}/pullrequests`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(options.token),
      body: JSON.stringify({
        title: options.title,
        summary: { raw: options.body },
        source: { branch: { name: options.head } },
        destination: { branch: { name: options.base } },
      }),
    });
    if (!res.ok) {
      throw new Error(`Bitbucket API Error (${res.status}): ${await res.text()}`);
    }
    const pr = await res.json();
    return {
      id: pr.id,
      number: pr.id,
      title: pr.title,
      body: pr.description || pr.summary?.raw || '',
      state: 'open',
      html_url: pr.links?.html?.href || '',
      head: { ref: options.head, sha: '', label: options.head },
      base: { ref: options.base, sha: '' },
      user: { login: pr.author?.display_name || 'unknown', avatar_url: pr.author?.links?.avatar?.href || '', html_url: pr.author?.links?.html?.href || '' },
      created_at: pr.created_on,
      updated_at: pr.updated_on,
      draft: false,
    };
  }

  async mergePullRequest(
    pullNumber: number,
    method: 'merge' | 'squash' | 'rebase' = 'merge',
    commitMsg?: string,
    token?: string
  ): Promise<{ merged: boolean; message: string }> {
    const url = `${this.providerInfo.apiUrl}/repositories/${this.providerInfo.owner}/${this.providerInfo.repo}/pullrequests/${pullNumber}/merge`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({
        message: commitMsg || undefined,
        merge_strategy: method === 'squash' ? 'squash' : 'merge_commit',
      }),
    });
    if (!res.ok) {
      throw new Error(`Bitbucket Merge Error (${res.status}): ${await res.text()}`);
    }
    return { merged: true, message: 'Pull Request merged successfully' };
  }

  async closePullRequest(pullNumber: number, token?: string): Promise<void> {
    const url = `${this.providerInfo.apiUrl}/repositories/${this.providerInfo.owner}/${this.providerInfo.repo}/pullrequests/${pullNumber}/decline`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(token),
    });
    if (!res.ok) {
      throw new Error(`Bitbucket Decline Error (${res.status}): ${await res.text()}`);
    }
  }

  async createInlineComment(options: {
    pullNumber: number;
    commitId: string;
    path: string;
    line: number;
    side?: 'LEFT' | 'RIGHT';
    body: string;
    token?: string;
  }): Promise<GitHubPRComment> {
    const url = `${this.providerInfo.apiUrl}/repositories/${this.providerInfo.owner}/${this.providerInfo.repo}/pullrequests/${options.pullNumber}/comments`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(options.token),
      body: JSON.stringify({
        content: { raw: options.body },
        inline: {
          path: options.path,
          to: options.line,
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`Bitbucket Comment Error (${res.status}): ${await res.text()}`);
    }
    const c = await res.json();
    return {
      id: c.id,
      body: c.content?.raw || '',
      created_at: c.created_on,
      html_url: c.links?.html?.href || '',
      user: { login: c.user?.display_name || 'unknown', avatar_url: c.user?.links?.avatar?.href || '', html_url: c.user?.links?.html?.href || '' },
    };
  }
}

/**
 * Factory to get the corresponding adapter for a remote URL
 */
export function getRemoteAdapter(remoteUrl?: string | null): RemoteProviderAdapter | null {
  const info = parseRemoteProvider(remoteUrl);
  if (!info) return null;

  switch (info.type) {
    case 'gitlab':
      return new GitLabAdapter(info);
    case 'bitbucket':
      return new BitbucketAdapter(info);
    case 'github':
    case 'custom':
    default:
      return new GitHubAdapter(info);
  }
}
