import type {
  GitHubPRComment,
  GitHubPRFile,
  GitHubPullRequest,
  GitHubPRCommit,
  GitHubCommitChecks,
  GitHubBranchComparison,
  GitHubRelease,
  GitHubWorkflow,
  GitHubWorkflowRun,
  GitHubWorkflowJob,
  GitHubArtifact,
  GitHubCacheItem,
  GitHubCacheUsage,
  GitHubRunnerItem,
  GitHubDeploymentItem,
  GitHubDeploymentStatusItem,
  GitHubAttestationItem,
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
  };
  const activeToken = token?.trim() || getStoredGitHubToken();
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }
  return headers;
}

async function fetchGitHub(url: string, init?: RequestInit, maxRetries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    const res = await fetch(url, init);

    if ((res.status === 429 || res.status === 403) && attempt < maxRetries) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      const retryAfter = res.headers.get('retry-after');

      if (remaining === '0' || res.status === 429) {
        let delayMs = 1000 * Math.pow(2, attempt);
        if (retryAfter) {
          const parsed = parseInt(retryAfter, 10);
          if (!isNaN(parsed) && parsed > 0) {
            delayMs = Math.min(parsed * 1000, 10000);
          }
        }
        console.warn(`[GitHub API] Rate limit reached. Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
    }
    return res;
  }
  return await fetch(url, init);
}

export async function fetchGitHubPullRequests(
  owner: string,
  repo: string,
  token?: string,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<GitHubPullRequest[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=${state}&per_page=30`;
  const res = await fetchGitHub(url, { headers: getHeaders(token) });
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
  const res = await fetchGitHub(url, { headers: getHeaders(token) });
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
  const res = await fetchGitHub(url, { headers: getHeaders(token) });
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
  const res = await fetchGitHub(url, {
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
  const res = await fetchGitHub(url, {
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
  const res = await fetchGitHub(url, {
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
  const res = await fetchGitHub(url, {
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
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}?_t=${Date.now()}`;
  const res = await fetchGitHub(url, { headers: getHeaders(token), cache: 'no-store' });
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
  const res = await fetchGitHub(url, {
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

export async function updateGitHubPullRequestState(
  owner: string,
  repo: string,
  pullNumber: number,
  state: 'open' | 'closed',
  token?: string
): Promise<GitHubPullRequest> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}`;
  const res = await fetchGitHub(url, {
    method: 'PATCH',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ state }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let msg = errorData.message || `Cập nhật trạng thái PR thất bại (${res.status})`;
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
  const res = await fetchGitHub(url, {
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
  const res = await fetchGitHub(url, {
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
  const res = await fetchGitHub(url, { headers: getHeaders(token) });
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
    const res = await fetchGitHub(url, { headers: getHeaders(token) });
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
  const res = await fetchGitHub(url, { headers: getHeaders(token) });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to compare branches (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function listGitHubReleases(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRelease[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=50`;
  const res = await fetchGitHub(url, { headers: getHeaders(token) });
  if (!res.ok) {
    if (res.status === 404) return [];
    const errorText = await res.text();
    throw new Error(`Failed to list releases (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function getGitHubReleaseByTag(
  owner: string,
  repo: string,
  tag: string,
  token?: string
): Promise<GitHubRelease | null> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`;
  const res = await fetchGitHub(url, { headers: getHeaders(token) });
  if (!res.ok) {
    if (res.status === 404) return null;
    const errorText = await res.text();
    throw new Error(`Failed to get release for tag '${tag}' (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export interface ListWorkflowRunsOptions {
  workflowId?: number | string;
  branch?: string;
  event?: string;
  status?: string;
  perPage?: number;
  page?: number;
}

export async function listGitHubWorkflows(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubWorkflow[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/workflows`;
  const res = await fetchGitHub(url, { headers: getHeaders(token) });
  if (!res.ok) {
    if (res.status === 404) return [];
    const errorText = await res.text();
    throw new Error(`Failed to list workflows (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return data.workflows || [];
}

export async function listGitHubWorkflowRuns(
  owner: string,
  repo: string,
  options?: ListWorkflowRunsOptions,
  token?: string
): Promise<{ total_count: number; workflow_runs: GitHubWorkflowRun[] }> {
  const params = new URLSearchParams();
  if (options?.branch) params.set('branch', options.branch);
  if (options?.event) params.set('event', options.event);
  if (options?.status) params.set('status', options.status);
  params.set('per_page', String(options?.perPage || 30));
  if (options?.page) params.set('page', String(options.page));

  let url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs`;
  if (options?.workflowId) {
    url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/workflows/${options.workflowId}/runs`;
  }
  const fullUrl = `${url}?${params.toString()}`;
  const res = await fetchGitHub(fullUrl, { headers: getHeaders(token) });
  if (!res.ok) {
    if (res.status === 404) return { total_count: 0, workflow_runs: [] };
    const errorText = await res.text();
    throw new Error(`Failed to list workflow runs (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return {
    total_count: data.total_count || 0,
    workflow_runs: data.workflow_runs || [],
  };
}

export async function getGitHubWorkflowRun(
  owner: string,
  repo: string,
  runId: number,
  token?: string
): Promise<GitHubWorkflowRun> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}`;
  const res = await fetchGitHub(url, { headers: getHeaders(token) });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to get workflow run ${runId} (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function listGitHubWorkflowJobs(
  owner: string,
  repo: string,
  runId: number,
  token?: string
): Promise<GitHubWorkflowJob[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}/jobs?per_page=100`;
  const res = await fetchGitHub(url, { headers: getHeaders(token) });
  if (!res.ok) {
    if (res.status === 404) return [];
    const errorText = await res.text();
    throw new Error(`Failed to list workflow jobs (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return data.jobs || [];
}

export async function rerunGitHubWorkflow(
  owner: string,
  repo: string,
  runId: number,
  failedOnly: boolean = false,
  token?: string
): Promise<void> {
  const endpoint = failedOnly ? 'rerun-failed-jobs' : 'rerun';
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}/${endpoint}`;
  const res = await fetchGitHub(url, {
    method: 'POST',
    headers: getHeaders(token),
  });
  if (!res.ok && res.status !== 201) {
    const errorText = await res.text();
    throw new Error(`Failed to rerun workflow (${res.status}): ${errorText}`);
  }
}

export async function cancelGitHubWorkflowRun(
  owner: string,
  repo: string,
  runId: number,
  token?: string
): Promise<void> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}/cancel`;
  const res = await fetchGitHub(url, {
    method: 'POST',
    headers: getHeaders(token),
  });
  if (!res.ok && res.status !== 202) {
    const errorText = await res.text();
    throw new Error(`Failed to cancel workflow run (${res.status}): ${errorText}`);
  }
}

export async function fetchGitHubJobLogs(
  owner: string,
  repo: string,
  jobId: number,
  token?: string
): Promise<string> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`;
  const headers = getHeaders(token);

  try {
    const res = await fetch(url, {
      headers,
      redirect: 'follow',
    });

    if (res.ok) {
      return await res.text();
    }

    if (res.status === 404) {
      // 404 means the job is currently in_progress or logs have expired (> 90 days)
      return '';
    }

    // If redirected failed due to auth header conflict on third-party storage, retry without headers
    const resWithoutAuth = await fetch(url, { redirect: 'follow' });
    if (resWithoutAuth.ok) {
      return await resWithoutAuth.text();
    }
  } catch (e: any) {
    console.warn('fetchGitHubJobLogs error', e);
  }

  return '';
}

export async function dispatchGitHubWorkflow(
  owner: string,
  repo: string,
  workflowId: number | string,
  ref: string,
  inputs?: Record<string, any>,
  token?: string
): Promise<void> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;
  const res = await fetchGitHub(url, {
    method: 'POST',
    headers: {
      ...getHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref,
      inputs: inputs || {},
    }),
  });
  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to dispatch workflow (${res.status})`);
  }
}

export async function listGitHubWorkflowRunArtifacts(
  owner: string,
  repo: string,
  runId: number,
  token?: string
): Promise<GitHubArtifact[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`;
  try {
    const res = await fetchGitHub(url, {
      headers: getHeaders(token),
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.artifacts || [];
  } catch (e) {
    console.warn('Failed to list run artifacts', e);
    return [];
  }
}

export async function listGitHubActionsCaches(
  owner: string,
  repo: string,
  token?: string
): Promise<{ total_count: number; actions_caches: GitHubCacheItem[] }> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/caches?per_page=100`;
  try {
    const res = await fetchGitHub(url, { headers: getHeaders(token) });
    if (!res.ok) {
      return { total_count: 0, actions_caches: [] };
    }
    const data = await res.json();
    return {
      total_count: data.total_count || 0,
      actions_caches: data.actions_caches || [],
    };
  } catch (e) {
    console.warn('Failed to list actions caches', e);
    return { total_count: 0, actions_caches: [] };
  }
}

export async function getGitHubActionsCacheUsage(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubCacheUsage> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/cache/usage`;
  try {
    const res = await fetchGitHub(url, { headers: getHeaders(token) });
    if (!res.ok) {
      return { active_caches_size_in_bytes: 0, active_caches_count: 0 };
    }
    const data = await res.json();
    return {
      active_caches_size_in_bytes: data.active_caches_size_in_bytes || 0,
      active_caches_count: data.active_caches_count || 0,
    };
  } catch (e) {
    console.warn('Failed to get cache usage', e);
    return { active_caches_size_in_bytes: 0, active_caches_count: 0 };
  }
}

export async function deleteGitHubActionsCache(
  owner: string,
  repo: string,
  cacheId: number,
  token?: string
): Promise<void> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/caches/${cacheId}`;
  const res = await fetchGitHub(url, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to delete cache (${res.status})`);
  }
}

export async function listGitHubRunners(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRunnerItem[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runners`;
  try {
    const res = await fetchGitHub(url, { headers: getHeaders(token) });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.runners || [];
  } catch (e) {
    console.warn('Failed to list runners', e);
    return [];
  }
}

export async function listGitHubDeploymentStatuses(
  owner: string,
  repo: string,
  deploymentId: number,
  token?: string
): Promise<GitHubDeploymentStatusItem[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/deployments/${deploymentId}/statuses`;
  try {
    const res = await fetchGitHub(url, { headers: getHeaders(token) });
    if (!res.ok) {
      return [];
    }
    return await res.json();
  } catch (e) {
    console.warn('Failed to list deployment statuses', e);
    return [];
  }
}

export async function listGitHubDeployments(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubDeploymentItem[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/deployments?per_page=30`;
  try {
    const res = await fetchGitHub(url, { headers: getHeaders(token) });
    if (!res.ok) {
      return [];
    }
    const deployments: GitHubDeploymentItem[] = await res.json();
    if (!Array.isArray(deployments)) return [];

    // Concurrently fetch latest status for top 15 deployments
    const enriched = await Promise.all(
      deployments.slice(0, 15).map(async (dep) => {
        try {
          const statuses = await listGitHubDeploymentStatuses(owner, repo, dep.id, token);
          return {
            ...dep,
            statuses,
            latest_status: statuses[0] || undefined,
          };
        } catch {
          return dep;
        }
      })
    );

    return [...enriched, ...deployments.slice(15)];
  } catch (e) {
    console.warn('Failed to list deployments', e);
    return [];
  }
}

export async function listGitHubAttestations(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubAttestationItem[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/attestations`;
  try {
    const res = await fetchGitHub(url, { headers: getHeaders(token) });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.attestations || [];
  } catch (e) {
    console.warn('Failed to list attestations', e);
    return [];
  }
}
