import type {
  GitHubPRComment,
  GitHubPRFile,
  GitHubPullRequest,
  GitHubPRCommit,
  GitHubCommitChecks,
  GitHubBranchComparison,
} from '../types';

const GITHUB_API_BASE = 'https://api.github.com';
const TOKEN_STORAGE_KEY = 'flowgit_github_pat';

export function saveGitHubToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
  } catch (e) {
    console.error('Failed to save GitHub token to localStorage', e);
  }
}

export function getStoredGitHubToken(): string {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function parseGitHubRemote(url?: string | null): { owner: string; repo: string } | null {
  if (!url) return null;
  const clean = url.trim();

  // Pattern 1: HTTPS (https://github.com/owner/repo.git or https://github.com/owner/repo)
  const httpsMatch = clean.match(/github\.com\/([^\/]+)\/([^\/\.]+)(?:\.git)?/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // Pattern 2: SSH (git@github.com:owner/repo.git)
  const sshMatch = clean.match(/git@github\.com:([^\/]+)\/([^\/\.]+)(?:\.git)?/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
}

function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'FlowGit-Desktop',
  };
  const activeToken = token?.trim() || getStoredGitHubToken();
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  return headers;
}

export async function fetchGitHubPullRequests(
  owner: string,
  repo: string,
  token?: string,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<GitHubPullRequest[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=${state}&per_page=30`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub API Error (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function fetchGitHubPullRequestFiles(
  owner: string,
  repo: string,
  pullNumber: number,
  token?: string
): Promise<GitHubPRFile[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub API Error (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function fetchGitHubPullRequestComments(
  owner: string,
  repo: string,
  pullNumber: number,
  token?: string
): Promise<GitHubPRComment[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}/comments?per_page=100`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub API Error (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function createGitHubInlineComment(
  owner: string,
  repo: string,
  pullNumber: number,
  commitId: string,
  path: string,
  line: number,
  side: 'LEFT' | 'RIGHT',
  body: string,
  token?: string
): Promise<GitHubPRComment> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body,
      commit_id: commitId,
      path,
      line,
      side,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to post inline comment (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function submitGitHubPullRequestReview(
  owner: string,
  repo: string,
  pullNumber: number,
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
  body: string,
  token?: string
): Promise<any> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event,
      body,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to submit review (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function createGitHubRepository(
  name: string,
  description: string,
  isPrivate: boolean,
  token?: string
): Promise<{ html_url: string; clone_url: string; full_name: string }> {
  const url = `${GITHUB_API_BASE}/user/repos`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      auto_init: false,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `GitHub API Error (${res.status})`);
  }
  return await res.json();
}

export async function createGitHubPullRequest(
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string,
  draft: boolean = false,
  token?: string
): Promise<GitHubPullRequest> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      head,
      base,
      draft,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let msg = errorData.message || `GitHub API Error (${res.status})`;
    if (errorData.errors && Array.isArray(errorData.errors)) {
      const details = errorData.errors.map((e: any) => e.message || JSON.stringify(e)).join('; ');
      msg += `: ${details}`;
    }
    throw new Error(msg);
  }
  return await res.json();
}

export async function fetchGitHubPullRequestDetail(
  owner: string,
  repo: string,
  pullNumber: number,
  token?: string
): Promise<GitHubPullRequest> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`GitHub API Error (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function mergeGitHubPullRequest(
  owner: string,
  repo: string,
  pullNumber: number,
  mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge',
  commitTitle?: string,
  commitMessage?: string,
  token?: string
): Promise<{ sha: string; merged: boolean; message: string }> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}/merge`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merge_method: mergeMethod,
      ...(commitTitle ? { commit_title: commitTitle } : {}),
      ...(commitMessage ? { commit_message: commitMessage } : {}),
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let msg = errorData.message || `Merge failed (${res.status})`;
    throw new Error(msg);
  }
  return await res.json();
}

export async function deleteGitHubBranch(
  owner: string,
  repo: string,
  branchName: string,
  token?: string
): Promise<boolean> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branchName)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  return res.ok || res.status === 204;
}

export async function createGitHubIssueComment(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
  token?: string
): Promise<GitHubPRComment> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to post comment (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function fetchGitHubPullRequestCommits(
  owner: string,
  repo: string,
  pullNumber: number,
  token?: string
): Promise<GitHubPRCommit[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}/commits?per_page=100`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch PR commits (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function fetchGitHubCommitChecks(
  owner: string,
  repo: string,
  ref: string,
  token?: string
): Promise<GitHubCommitChecks> {
  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${ref}/check-runs`;
    const res = await fetch(url, { headers: getHeaders(token) });
    if (!res.ok) {
      return { total_count: 0, check_runs: [], state: 'none' };
    }
    const data = await res.json();
    const runs = (data.check_runs || []) as any[];

    let state: 'success' | 'failure' | 'pending' | 'none' = 'none';
    if (runs.length > 0) {
      const hasFailure = runs.some((r) => r.conclusion === 'failure' || r.conclusion === 'timed_out');
      const hasPending = runs.some((r) => r.status === 'in_progress' || r.status === 'queued');
      if (hasFailure) {
        state = 'failure';
      } else if (hasPending) {
        state = 'pending';
      } else {
        state = 'success';
      }
    }
    return {
      total_count: data.total_count || runs.length,
      check_runs: runs,
      state,
    };
  } catch {
    return { total_count: 0, check_runs: [], state: 'none' };
  }
}

export async function compareGitHubBranches(
  owner: string,
  repo: string,
  base: string,
  head: string,
  token?: string
): Promise<GitHubBranchComparison> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to compare branches (${res.status}): ${errorText}`);
  }
  return await res.json();
}


