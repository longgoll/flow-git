<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    Activity,
    RefreshCw,
    ShieldAlert,
    X,
  } from 'lucide-svelte';
  import type {
    AccountProfile,
    GitHubArtifact,
    GitHubAttestationItem,
    GitHubCacheItem,
    GitHubCacheUsage,
    GitHubDeploymentItem,
    GitHubRunnerItem,
    GitHubWorkflow,
    GitHubWorkflowJob,
    GitHubWorkflowRun,
  } from '../types';
  import {
    cancelGitHubWorkflowRun,
    deleteGitHubActionsCache,
    dispatchGitHubWorkflow,
    fetchGitHubJobLogs,
    getGitHubActionsCacheUsage,
    getStoredGitHubToken,
    listGitHubActionsCaches,
    listGitHubAttestations,
    listGitHubDeployments,
    listGitHubRunners,
    listGitHubWorkflowJobs,
    listGitHubWorkflowRunArtifacts,
    listGitHubWorkflowRuns,
    listGitHubWorkflows,
    parseGitHubRemote,
    rerunGitHubWorkflow,
    saveGitHubToken,
  } from '../api/githubApi';
  import { getActiveAccount } from '../api/auth';
  import { localeState } from '../state/localeState.svelte';
  import { toast } from '../state/toastState.svelte';

  // Child Sub-components
  import ActionsSidebar from './actions/ActionsSidebar.svelte';
  import ActionsRunsList from './actions/ActionsRunsList.svelte';
  import ActionsRunDetail from './actions/ActionsRunDetail.svelte';
  import ActionsDispatchModal from './actions/ActionsDispatchModal.svelte';
  import ActionsCachesView from './actions/ActionsCachesView.svelte';
  import ActionsRunnersView from './actions/ActionsRunnersView.svelte';
  import ActionsDeploymentsView from './actions/ActionsDeploymentsView.svelte';
  import ActionsAttestationsView from './actions/ActionsAttestationsView.svelte';
  import ActionsAnalyticsView from './actions/ActionsAnalyticsView.svelte';

  interface Props {
    remoteOriginUrl?: string | null;
    activeAccount?: AccountProfile | null;
    onOpenAuth?: () => void;
    onSelectCommit?: (commitId: string) => void;
    onClose?: () => void;
  }

  let {
    remoteOriginUrl = null,
    activeAccount = null,
    onOpenAuth,
    onSelectCommit,
    onClose,
  }: Props = $props();

  // Navigation View State
  let activeView = $state<'list' | 'detail' | 'caches' | 'runners' | 'deployments' | 'attestations' | 'analytics'>('list');

  // Core Data State
  let workflows = $state<GitHubWorkflow[]>([]);
  let workflowRuns = $state<GitHubWorkflowRun[]>([]);
  let totalRuns = $state<number>(0);
  let selectedWorkflowId = $state<number | 'all'>('all');
  let selectedRun = $state<GitHubWorkflowRun | null>(null);
  let jobs = $state<GitHubWorkflowJob[]>([]);
  let artifacts = $state<GitHubArtifact[]>([]);

  // Management Data State
  let caches = $state<GitHubCacheItem[]>([]);
  let cacheUsage = $state<GitHubCacheUsage>({ active_caches_size_in_bytes: 0, active_caches_count: 0 });
  let runners = $state<GitHubRunnerItem[]>([]);
  let deployments = $state<GitHubDeploymentItem[]>([]);
  let attestations = $state<GitHubAttestationItem[]>([]);

  // Loading States
  let isLoadingWorkflows = $state(false);
  let isLoadingRuns = $state(false);
  let isLoadingJobs = $state(false);
  let isLoadingArtifacts = $state(false);
  let isLoadingCaches = $state(false);
  let isLoadingRunners = $state(false);
  let isLoadingDeployments = $state(false);
  let isLoadingAttestations = $state(false);
  let isActionPending = $state(false);

  // Filters
  let filterStatus = $state<'all' | 'success' | 'failure' | 'in_progress' | 'queued'>('all');
  let filterBranch = $state<string>('all');
  let searchQuery = $state<string>('');

  // Active Account Token
  let patToken = $state<string>('');

  // Workflow Dispatch Modal State
  let isRunWorkflowModalOpen = $state(false);
  let isDispatching = $state(false);

  // Auto-refresh timer
  let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
  let activeRunsTracker = $state<Map<number, { name: string; run_number: number; head_branch: string }>>(new Map());

  let remoteInfo = $derived(parseGitHubRemote(remoteOriginUrl));

  let availableBranches = $derived.by(() => {
    const set = new Set<string>();
    for (const r of workflowRuns) {
      if (r.head_branch) set.add(r.head_branch);
    }
    return Array.from(set).sort();
  });

  let filteredRuns = $derived.by(() => {
    let list = workflowRuns;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.display_title && r.display_title.toLowerCase().includes(q)) ||
          r.head_sha.toLowerCase().includes(q) ||
          (r.head_branch && r.head_branch.toLowerCase().includes(q)) ||
          (r.actor && r.actor.login.toLowerCase().includes(q))
      );
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'success') {
        list = list.filter((r) => r.conclusion === 'success');
      } else if (filterStatus === 'failure') {
        list = list.filter(
          (r) => r.conclusion === 'failure' || r.conclusion === 'timed_out'
        );
      } else if (filterStatus === 'in_progress') {
        list = list.filter((r) => r.status === 'in_progress');
      } else if (filterStatus === 'queued') {
        list = list.filter((r) => r.status === 'queued' || r.status === 'waiting');
      }
    }

    if (filterBranch !== 'all') {
      list = list.filter((r) => r.head_branch === filterBranch);
    }

    return list;
  });

  onMount(() => {
    (async () => {
      patToken = activeAccount?.token || getStoredGitHubToken();
      if (!patToken) {
        try {
          const acc = await getActiveAccount('github');
          if (acc?.token) {
            patToken = acc.token;
            saveGitHubToken(acc.token);
          }
        } catch {
          // ignore
        }
      }
      loadAll();
    })();

    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch {
      // ignore
    }

    // Auto-polling every 8 seconds if there are active builds
    autoRefreshTimer = setInterval(() => {
      const hasActiveRuns = workflowRuns.some(
        (r) => r.status === 'in_progress' || r.status === 'queued'
      );
      if (hasActiveRuns && remoteInfo) {
        loadRunsQuietly();
        if (selectedRun && selectedRun.status === 'in_progress') {
          loadJobsQuietly(selectedRun.id);
        }
      }
    }, 8000);
  });

  onDestroy(() => {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  });

  $effect(() => {
    if (activeAccount?.token && activeAccount.token !== patToken) {
      patToken = activeAccount.token;
      loadAll();
    }
  });

  async function loadAll() {
    if (!remoteInfo) return;
    await Promise.all([loadWorkflows(), loadRuns()]);
  }

  async function loadWorkflows() {
    if (!remoteInfo) return;
    isLoadingWorkflows = true;
    try {
      workflows = await listGitHubWorkflows(remoteInfo.owner, remoteInfo.repo, patToken);
    } catch (e: any) {
      console.warn('Failed to load workflows', e);
    } finally {
      isLoadingWorkflows = false;
    }
  }

  async function loadRuns() {
    if (!remoteInfo) return;
    isLoadingRuns = true;
    try {
      const wid = selectedWorkflowId === 'all' ? undefined : selectedWorkflowId;
      const res = await listGitHubWorkflowRuns(
        remoteInfo.owner,
        remoteInfo.repo,
        wid ? { workflowId: wid } : undefined,
        patToken
      );
      workflowRuns = res.workflow_runs;
      totalRuns = res.total_count;
      checkRunsForNotifications(workflowRuns);
    } catch (e: any) {
      toast.error(localeState.t('githubActions.toastError', { error: e.message || e }));
    } finally {
      isLoadingRuns = false;
    }
  }

  async function loadRunsQuietly() {
    if (!remoteInfo) return;
    try {
      const wid = selectedWorkflowId === 'all' ? undefined : selectedWorkflowId;
      const res = await listGitHubWorkflowRuns(
        remoteInfo.owner,
        remoteInfo.repo,
        wid ? { workflowId: wid } : undefined,
        patToken
      );
      workflowRuns = res.workflow_runs;
      totalRuns = res.total_count;
      checkRunsForNotifications(workflowRuns);
    } catch {
      // ignore in background
    }
  }

  function checkRunsForNotifications(runs: GitHubWorkflowRun[]) {
    const updatedTracker = new Map<number, { name: string; run_number: number; head_branch: string }>();

    for (const r of runs) {
      if (r.status === 'in_progress' || r.status === 'queued') {
        updatedTracker.set(r.id, {
          name: r.name,
          run_number: r.run_number,
          head_branch: r.head_branch || 'main',
        });
      } else if (activeRunsTracker.has(r.id)) {
        const tracked = activeRunsTracker.get(r.id)!;
        const isSuccess = r.conclusion === 'success';
        const title = isSuccess
          ? localeState.t('githubActions.notifyBuildSuccess')
          : localeState.t('githubActions.notifyBuildFailed');
        const body = localeState.t('githubActions.notifyBody', {
          name: tracked.name,
          number: tracked.run_number,
          branch: tracked.head_branch,
        });

        if (isSuccess) {
          toast.success(`${title} - ${body}`);
        } else {
          toast.error(`${title} - ${body}`);
        }

        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/app-icon.png' });
          }
        } catch {
          // ignore
        }
      }
    }

    activeRunsTracker = updatedTracker;
  }

  async function loadJobs(runId: number) {
    if (!remoteInfo) return;
    isLoadingJobs = true;
    try {
      jobs = await listGitHubWorkflowJobs(remoteInfo.owner, remoteInfo.repo, runId, patToken);
    } catch (e: any) {
      console.warn('Failed to load jobs', e);
    } finally {
      isLoadingJobs = false;
    }
  }

  async function loadJobsQuietly(runId: number) {
    if (!remoteInfo) return;
    try {
      jobs = await listGitHubWorkflowJobs(remoteInfo.owner, remoteInfo.repo, runId, patToken);
    } catch {
      // ignore
    }
  }

  async function loadArtifacts(runId: number) {
    if (!remoteInfo) return;
    isLoadingArtifacts = true;
    try {
      artifacts = await listGitHubWorkflowRunArtifacts(
        remoteInfo.owner,
        remoteInfo.repo,
        runId,
        patToken
      );
    } catch (e: any) {
      console.warn('Failed to load artifacts', e);
    } finally {
      isLoadingArtifacts = false;
    }
  }

  async function loadCaches() {
    if (!remoteInfo) return;
    isLoadingCaches = true;
    try {
      const [cacheRes, usageRes] = await Promise.all([
        listGitHubActionsCaches(remoteInfo.owner, remoteInfo.repo, patToken),
        getGitHubActionsCacheUsage(remoteInfo.owner, remoteInfo.repo, patToken),
      ]);
      caches = cacheRes.actions_caches;
      cacheUsage = usageRes;
    } catch (e: any) {
      toast.error(localeState.t('githubActions.toastError', { error: e.message || e }));
    } finally {
      isLoadingCaches = false;
    }
  }

  async function handleDeleteCache(cacheId: number) {
    if (!remoteInfo) return;
    try {
      await deleteGitHubActionsCache(remoteInfo.owner, remoteInfo.repo, cacheId, patToken);
      toast.success(localeState.t('githubActions.cacheDeleted'));
      caches = caches.filter((c) => c.id !== cacheId);
      if (cacheUsage.active_caches_count > 0) {
        cacheUsage.active_caches_count--;
      }
    } catch (e: any) {
      toast.error(localeState.t('githubActions.toastError', { error: e.message || e }));
    }
  }

  async function loadRunners() {
    if (!remoteInfo) return;
    isLoadingRunners = true;
    try {
      runners = await listGitHubRunners(remoteInfo.owner, remoteInfo.repo, patToken);
    } catch (e: any) {
      console.warn('Failed to load runners', e);
    } finally {
      isLoadingRunners = false;
    }
  }

  async function loadDeployments() {
    if (!remoteInfo) return;
    isLoadingDeployments = true;
    try {
      deployments = await listGitHubDeployments(remoteInfo.owner, remoteInfo.repo, patToken);
    } catch (e: any) {
      console.warn('Failed to load deployments', e);
    } finally {
      isLoadingDeployments = false;
    }
  }

  async function loadAttestations() {
    if (!remoteInfo) return;
    isLoadingAttestations = true;
    try {
      attestations = await listGitHubAttestations(remoteInfo.owner, remoteInfo.repo, patToken);
    } catch (e: any) {
      console.warn('Failed to load attestations', e);
    } finally {
      isLoadingAttestations = false;
    }
  }

  async function handleRerun(failedOnly: boolean) {
    if (!remoteInfo || !selectedRun || isActionPending) return;
    isActionPending = true;
    try {
      await rerunGitHubWorkflow(
        remoteInfo.owner,
        remoteInfo.repo,
        selectedRun.id,
        failedOnly,
        patToken
      );
      toast.success(localeState.t('githubActions.toastRerunSuccess'));
      await loadRuns();
      if (selectedRun) await loadJobs(selectedRun.id);
    } catch (e: any) {
      toast.error(localeState.t('githubActions.toastError', { error: e.message || e }));
    } finally {
      isActionPending = false;
    }
  }

  async function handleCancel() {
    if (!remoteInfo || !selectedRun || isActionPending) return;
    isActionPending = true;
    try {
      await cancelGitHubWorkflowRun(
        remoteInfo.owner,
        remoteInfo.repo,
        selectedRun.id,
        patToken
      );
      toast.success(localeState.t('githubActions.toastCancelSuccess'));
      await loadRuns();
      if (selectedRun) await loadJobs(selectedRun.id);
    } catch (e: any) {
      toast.error(localeState.t('githubActions.toastError', { error: e.message || e }));
    } finally {
      isActionPending = false;
    }
  }

  async function handleDispatch(workflowId: number | string, branch: string) {
    if (!remoteInfo || isDispatching) return;
    isDispatching = true;
    try {
      await dispatchGitHubWorkflow(
        remoteInfo.owner,
        remoteInfo.repo,
        workflowId,
        branch,
        undefined,
        patToken
      );
      toast.success(localeState.t('githubActions.dispatchSuccess'));
      isRunWorkflowModalOpen = false;
      setTimeout(() => loadRuns(), 1500);
    } catch (e: any) {
      toast.error(localeState.t('githubActions.toastError', { error: e.message || e }));
    } finally {
      isDispatching = false;
    }
  }

  function openRunDetail(run: GitHubWorkflowRun) {
    selectedRun = run;
    activeView = 'detail';
    loadJobs(run.id);
    loadArtifacts(run.id);
  }

  function handleViewSelection(view: 'list' | 'caches' | 'runners' | 'deployments' | 'attestations' | 'analytics') {
    activeView = view;
    if (view === 'caches' && caches.length === 0) {
      loadCaches();
    } else if (view === 'runners' && runners.length === 0) {
      loadRunners();
    } else if (view === 'deployments' && deployments.length === 0) {
      loadDeployments();
    } else if (view === 'attestations' && attestations.length === 0) {
      loadAttestations();
    }
  }
</script>

<div class="h-full w-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden select-none">
  <!-- Top View Header -->
  <header class="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 bg-zinc-50/70 dark:bg-zinc-900/50 shrink-0">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
          <Activity class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {localeState.t('githubActions.title')}
            </h2>
            {#if remoteInfo}
              <span class="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                {remoteInfo.owner}/{remoteInfo.repo}
              </span>
            {/if}
            {#if totalRuns > 0}
              <span class="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 font-mono font-medium">
                {totalRuns} runs
              </span>
            {/if}
          </div>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
            {localeState.t('githubActions.subtitle')}
          </p>
        </div>
      </div>

      <!-- Header Controls: PAT Token, Refresh, Close -->
      <div class="flex items-center gap-2 shrink-0">
        {#if !patToken && onOpenAuth}
          <button
            type="button"
            onclick={onOpenAuth}
            class="px-2.5 py-1 text-xs rounded-lg border border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 text-violet-700 dark:text-violet-300 font-medium transition-colors cursor-pointer shadow-2xs"
          >
            {localeState.t('githubActions.configureAuth')}
          </button>
        {/if}

        <!-- Refresh Button -->
        <button
          type="button"
          onclick={loadAll}
          disabled={isLoadingRuns || isLoadingWorkflows}
          class="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          title={localeState.t('githubActions.refresh')}
        >
          <RefreshCw class="w-4 h-4 {isLoadingRuns || isLoadingWorkflows ? 'animate-spin text-violet-500' : ''}" />
        </button>

        <!-- Close Button -->
        {#if onClose}
          <button
            type="button"
            onclick={onClose}
            class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Close"
          >
            <X class="w-4 h-4" />
          </button>
        {/if}
      </div>
    </header>

    <!-- Missing Remote Origin Warning -->
    {#if !remoteInfo}
      <div class="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div class="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3 text-zinc-400">
          <ShieldAlert class="w-6 h-6" />
        </div>
        <h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
          {localeState.t('githubActions.notGitHubRepo')}
        </h3>
        <p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
          {localeState.t('githubActions.noRunsDesc')}
        </p>
      </div>
    {:else if activeView === 'detail' && selectedRun}
      <!-- Run Inspector Detail View -->
      <ActionsRunDetail
        run={selectedRun}
        {jobs}
        {artifacts}
        {isLoadingJobs}
        {isLoadingArtifacts}
        {isActionPending}
        onBack={() => (activeView = 'list')}
        onRerun={handleRerun}
        onCancel={handleCancel}
        {onSelectCommit}
        fetchLogs={(jobId) => fetchGitHubJobLogs(remoteInfo!.owner, remoteInfo!.repo, jobId, patToken)}
      />
    {:else}
      <!-- 2-Column Responsive Layout with Persistent Sidebar -->
      <div class="flex-1 flex overflow-hidden">
        <ActionsSidebar
          {activeView}
          {selectedWorkflowId}
          {workflows}
          {isLoadingWorkflows}
          {remoteInfo}
          cachesCount={caches.length}
          runnersCount={runners.length}
          deploymentsCount={deployments.length}
          attestationsCount={attestations.length}
          onSelectWorkflow={(wid) => {
            selectedWorkflowId = wid;
            loadRuns();
          }}
          onSelectView={handleViewSelection}
        />

        {#if activeView === 'list'}
          <ActionsRunsList
            runs={filteredRuns}
            {workflows}
            {isLoadingRuns}
            bind:searchQuery
            bind:filterStatus
            bind:filterBranch
            {availableBranches}
            onSelectRun={openRunDetail}
            {onSelectCommit}
            onOpenRunWorkflowModal={() => (isRunWorkflowModalOpen = true)}
          />
        {:else if activeView === 'caches'}
          <ActionsCachesView
            {caches}
            usage={cacheUsage}
            isLoading={isLoadingCaches}
            {remoteInfo}
            onRefresh={loadCaches}
            onDeleteCache={handleDeleteCache}
          />
        {:else if activeView === 'runners'}
          <ActionsRunnersView
            {runners}
            isLoading={isLoadingRunners}
            {remoteInfo}
            onRefresh={loadRunners}
          />
        {:else if activeView === 'deployments'}
          <ActionsDeploymentsView
            {deployments}
            isLoading={isLoadingDeployments}
            {remoteInfo}
            onRefresh={loadDeployments}
            {onSelectCommit}
          />
        {:else if activeView === 'attestations'}
          <ActionsAttestationsView
            {attestations}
            isLoading={isLoadingAttestations}
            {remoteInfo}
            onRefresh={loadAttestations}
          />
        {:else if activeView === 'analytics'}
          <ActionsAnalyticsView
            runs={workflowRuns}
            {remoteInfo}
          />
        {/if}
      </div>
    {/if}

  <!-- Run Workflow Dispatch Modal -->
  <ActionsDispatchModal
    isOpen={isRunWorkflowModalOpen}
    {workflows}
    {availableBranches}
    {isDispatching}
    onClose={() => (isRunWorkflowModalOpen = false)}
    onDispatch={handleDispatch}
  />
</div>
