<script lang="ts">
  import {
    ArrowLeft,
    Check,
    CheckCircle2,
    ChevronDown,
    Circle,
    Clock,
    Copy,
    Download,
    ExternalLink,
    FileCode,
    FileText,
    Filter,
    GitCommit,
    Home,
    Layers,
    Package,
    Play,
    RefreshCw,
    RotateCcw,
    Search,
    Terminal,
    X,
    XCircle,
  } from 'lucide-svelte';
  import type {
    GitHubArtifact,
    GitHubWorkflowJob,
    GitHubWorkflowRun,
  } from '../../types';
  import { localeState } from '../../state/localeState.svelte';
  import { toast } from '../../state/toastState.svelte';

  interface Props {
    run: GitHubWorkflowRun;
    jobs: GitHubWorkflowJob[];
    artifacts: GitHubArtifact[];
    isLoadingJobs: boolean;
    isLoadingArtifacts: boolean;
    isActionPending: boolean;
    onBack: () => void;
    onRerun: (failedOnly: boolean) => Promise<void>;
    onCancel: () => Promise<void>;
    onSelectCommit?: (commitId: string) => void;
    fetchLogs: (jobId: number) => Promise<string>;
  }

  let {
    run,
    jobs,
    artifacts,
    isLoadingJobs,
    isLoadingArtifacts,
    isActionPending,
    onBack,
    onRerun,
    onCancel,
    onSelectCommit,
    fetchLogs,
  }: Props = $props();

  let selectedJobId = $state<number | 'summary'>('summary');
  let jobFilterQuery = $state<string>('');
  let copiedSha = $state<string | null>(null);

  // Log viewer state
  let jobLogs = $state<string>('');
  let isLoadingLogs = $state(false);
  let expandedStepNumbers = $state<Set<number>>(new Set());
  let searchLogsQuery = $state('');
  let logDisplayMode = $state<'steps' | 'raw'>('steps');
  let copiedLogs = $state(false);

  let selectedJob = $derived.by(() => {
    if (selectedJobId === 'summary') return null;
    return jobs.find((j) => j.id === selectedJobId) || null;
  });

  let filteredJobs = $derived.by(() => {
    if (!jobFilterQuery.trim()) return jobs;
    const q = jobFilterQuery.toLowerCase().trim();
    return jobs.filter((j) => j.name.toLowerCase().includes(q));
  });

  let matrixProgress = $derived.by(() => {
    if (jobs.length === 0) return { completed: 0, total: 0, failed: 0, inProgress: 0 };
    const total = jobs.length;
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const failed = jobs.filter((j) => j.conclusion === 'failure' || j.conclusion === 'timed_out').length;
    const inProgress = jobs.filter((j) => j.status === 'in_progress').length;
    return { completed, total, failed, inProgress };
  });

  interface LogLineItem {
    lineNumber: number;
    text: string;
    raw: string;
    isCommand?: boolean;
    isError?: boolean;
    isWarn?: boolean;
  }

  let allLogLines = $derived.by(() => {
    if (!jobLogs) return [];
    const lines = jobLogs.split('\n');
    return lines.map((line, idx) => {
      const clean = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s?/, '');
      const isCommand = clean.startsWith('▶') || clean.startsWith('>') || clean.startsWith('##[group]');
      const isError = /error:|fatal:|failed|ERR!/i.test(clean);
      const isWarn = /warn:|warning:|WARN/i.test(clean);
      return {
        lineNumber: idx + 1,
        text: clean.replace(/^##\[group\]/, '▶ ').replace(/^##\[endgroup\]/, ''),
        raw: line,
        isCommand,
        isError,
        isWarn,
      };
    });
  });

  let filteredLogLines = $derived.by(() => {
    if (!searchLogsQuery.trim()) return allLogLines;
    const q = searchLogsQuery.toLowerCase().trim();
    return allLogLines.filter((l) => l.text.toLowerCase().includes(q));
  });

  let stepLogsMap = $derived.by(() => {
    const map = new Map<number, LogLineItem[]>();
    if (!selectedJob?.steps || allLogLines.length === 0) return map;

    const steps = selectedJob.steps;
    for (const s of steps) {
      map.set(s.number, []);
    }

    let currentStepNum = steps[0]?.number || 1;

    for (const item of allLogLines) {
      const cleanLower = item.text.toLowerCase().trim();
      const matchedStep = steps.find(
        (st) =>
          st.name &&
          (cleanLower.includes(st.name.toLowerCase().trim()) ||
            st.name.toLowerCase().trim().includes(cleanLower))
      );

      if (matchedStep) {
        currentStepNum = matchedStep.number;
      }

      const list = map.get(currentStepNum) || [];
      list.push(item);
      map.set(currentStepNum, list);
    }

    return map;
  });

  async function selectJob(job: GitHubWorkflowJob) {
    selectedJobId = job.id;
    jobLogs = '';
    searchLogsQuery = '';
    expandedStepNumbers = new Set();
    isLoadingLogs = true;

    try {
      jobLogs = await fetchLogs(job.id);
      if (job.steps && job.steps.length > 0) {
        const failedStep = job.steps.find((s) => s.conclusion === 'failure');
        if (failedStep) {
          expandedStepNumbers.add(failedStep.number);
        } else {
          expandedStepNumbers.add(job.steps[0].number);
        }
      }
    } finally {
      isLoadingLogs = false;
    }
  }

  function handleToggleStep(stepNum: number) {
    const next = new Set(expandedStepNumbers);
    if (next.has(stepNum)) {
      next.delete(stepNum);
    } else {
      next.add(stepNum);
    }
    expandedStepNumbers = next;
  }

  function handleToggleAllSteps() {
    if (!selectedJob?.steps) return;
    if (expandedStepNumbers.size === selectedJob.steps.length) {
      expandedStepNumbers = new Set();
    } else {
      expandedStepNumbers = new Set(selectedJob.steps.map((s) => s.number));
    }
  }

  function handleCopyJobLogs() {
    if (!jobLogs) return;
    navigator.clipboard.writeText(jobLogs);
    copiedLogs = true;
    setTimeout(() => (copiedLogs = false), 2000);
    toast.success(localeState.t('githubActions.copiedLogs'));
  }

  function handleDownloadLog() {
    if (!jobLogs || !selectedJob) return;
    const blob = new Blob([jobLogs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-${selectedJob.id}-${selectedJob.name.replace(/\s+/g, '_')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopySha(sha: string, e: MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(sha);
    copiedSha = sha;
    setTimeout(() => {
      if (copiedSha === sha) copiedSha = null;
    }, 2000);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  function formatDuration(startIso?: string | null, endIso?: string | null): string {
    if (!startIso || !endIso) return '';
    try {
      const s = new Date(startIso).getTime();
      const e = new Date(endIso).getTime();
      const diffSec = Math.max(0, Math.floor((e - s) / 1000));
      if (diffSec < 60) return `${diffSec}s`;
      const m = Math.floor(diffSec / 60);
      const remS = diffSec % 60;
      return `${m}m ${remS}s`;
    } catch {
      return '';
    }
  }

  function formatTimeAgo(isoString: string): string {
    try {
      const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diff < 60) return `${diff}s ago`;
      const m = Math.floor(diff / 60);
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      return `${h}h ago`;
    } catch {
      return '';
    }
  }
</script>

<div class="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
  <!-- Top Run Hero Banner -->
  <div class="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
    <div class="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <!-- Title & Status -->
      <div class="flex items-start gap-3">
        <button
          type="button"
          onclick={onBack}
          class="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors shrink-0 mt-0.5 cursor-pointer shadow-2xs"
          title={localeState.t('githubActions.backToRuns')}
        >
          <ArrowLeft class="w-4 h-4" />
        </button>

        <!-- Big Status Icon -->
        <div class="mt-1 shrink-0">
          {#if run.status === 'in_progress'}
            <div class="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
              <RefreshCw class="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          {:else if run.conclusion === 'success'}
            <div class="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 class="w-6 h-6 text-emerald-500" />
            </div>
          {:else if run.conclusion === 'failure' || run.conclusion === 'timed_out'}
            <div class="w-8 h-8 rounded-full bg-rose-500/15 flex items-center justify-center">
              <XCircle class="w-6 h-6 text-rose-500" />
            </div>
          {:else}
            <div class="w-8 h-8 rounded-full bg-zinc-500/15 flex items-center justify-center">
              <Clock class="w-6 h-6 text-zinc-400" />
            </div>
          {/if}
        </div>

        <div>
          <div class="flex items-center gap-2 flex-wrap mb-1.5">
            <h1 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 select-text">
              {run.display_title || run.name}
            </h1>
            <span class="text-sm font-mono text-zinc-400">#{run.run_number}</span>
          </div>

          <!-- Metadata row -->
          <div class="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
            {#if run.actor}
              <div class="flex items-center gap-1.5 font-medium text-zinc-800 dark:text-zinc-200">
                {#if run.actor.avatar_url}
                  <img src={run.actor.avatar_url} alt={run.actor.login} class="w-4 h-4 rounded-full" />
                {/if}
                <span>{run.actor.login}</span>
              </div>
              <span>•</span>
            {/if}

            <!-- Commit SHA -->
            <div class="flex items-center gap-1 font-mono">
              <button
                type="button"
                onclick={() => {
                  if (onSelectCommit) onSelectCommit(run.head_sha);
                }}
                class="text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 underline decoration-dotted flex items-center gap-1 font-semibold cursor-pointer"
                title="Focus on Commit Graph"
              >
                <GitCommit class="w-3.5 h-3.5 text-violet-500" />
                <span>{run.head_sha.slice(0, 7)}</span>
              </button>

              <button
                type="button"
                onclick={(e) => handleCopySha(run.head_sha, e)}
                class="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                title="Copy full commit SHA"
              >
                {#if copiedSha === run.head_sha}
                  <Check class="w-3 h-3 text-emerald-500" />
                {:else}
                  <Copy class="w-3 h-3" />
                {/if}
              </button>
            </div>

            {#if run.head_branch}
              <span>•</span>
              <span class="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60">
                {run.head_branch}
              </span>
            {/if}

            <span>•</span>
            <span>{localeState.t('githubActions.totalDuration')}:</span>
            <span class="font-mono font-bold text-zinc-700 dark:text-zinc-300">
              {formatDuration(run.run_started_at || run.created_at, run.updated_at)}
            </span>
          </div>
        </div>
      </div>

      <!-- Actions: Re-run & External Browser -->
      <div class="flex items-center gap-2 self-start lg:self-center shrink-0">
        {#if run.status === 'in_progress' || run.status === 'queued'}
          <button
            type="button"
            onclick={onCancel}
            disabled={isActionPending}
            class="py-1.5 px-3.5 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <X class="w-3.5 h-3.5" />
            <span>{localeState.t('githubActions.cancelRun')}</span>
          </button>
        {:else}
          {#if run.conclusion === 'failure'}
            <button
              type="button"
              onclick={() => onRerun(true)}
              disabled={isActionPending}
              class="py-1.5 px-3.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw class="w-3.5 h-3.5 {isActionPending ? 'animate-spin' : ''}" />
              <span>{localeState.t('githubActions.rerunFailed')}</span>
            </button>
          {/if}

          <button
            type="button"
            onclick={() => onRerun(false)}
            disabled={isActionPending}
            class="py-1.5 px-3.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Play class="w-3.5 h-3.5 {isActionPending ? 'animate-spin' : ''}" />
            <span>{localeState.t('githubActions.rerunAll')}</span>
          </button>
        {/if}

        <a
          href={run.html_url}
          target="_blank"
          rel="noreferrer"
          class="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors shadow-2xs"
          title={localeState.t('githubActions.openOnGitHub')}
        >
          <ExternalLink class="w-4 h-4" />
        </a>
      </div>
    </div>
  </div>

  <!-- Main Master-Detail Split Area -->
  <div class="flex-1 flex overflow-hidden w-full border-t border-zinc-200 dark:border-zinc-800">
    <!-- Left Job Sidebar -->
    <div class="w-72 lg:w-80 flex flex-col shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <!-- Navigation Tab: Summary -->
      <button
        type="button"
        onclick={() => (selectedJobId = 'summary')}
        class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold flex items-center justify-between text-left transition-colors cursor-pointer {selectedJobId === 'summary' ? 'bg-zinc-100 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 font-bold border-l-3 border-l-violet-600' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}"
      >
        <div class="flex items-center gap-2.5">
          <Home class="w-4 h-4 text-violet-500" />
          <span>{localeState.t('githubActions.summary')}</span>
        </div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500">
          Overview
        </span>
      </button>

      <!-- All Jobs Header with Filter -->
      <div class="px-4 py-2.5 bg-zinc-50/70 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <Filter class="w-3.5 h-3.5" />
          <span>{localeState.t('githubActions.allJobs')} ({jobs.length})</span>
        </div>
      </div>

      <!-- Jobs List -->
      <div class="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/40">
        {#if isLoadingJobs}
          <div class="flex items-center justify-center p-8 text-zinc-400 gap-2">
            <RefreshCw class="w-4 h-4 animate-spin text-violet-500" />
            <span class="text-xs">{localeState.t('githubActions.refreshing')}</span>
          </div>
        {:else if filteredJobs.length === 0}
          <div class="p-4 text-xs text-zinc-400 italic text-center">
            {localeState.t('githubActions.noJobsFound')}
          </div>
        {:else}
          {#each filteredJobs as job (job.id)}
            <button
              type="button"
              onclick={() => selectJob(job)}
              class="w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between gap-2.5 cursor-pointer {selectedJobId === job.id ? 'bg-zinc-100 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 font-semibold border-l-3 border-l-violet-600' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'}"
            >
              <!-- Status Icon -->
              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                {#if job.status === 'in_progress'}
                  <RefreshCw class="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
                {:else if job.conclusion === 'success'}
                  <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {:else if job.conclusion === 'failure'}
                  <XCircle class="w-3.5 h-3.5 text-rose-500 shrink-0" />
                {:else}
                  <Circle class="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                {/if}

                <span class="text-xs truncate" title={job.name}>
                  {job.name}
                </span>
              </div>

              <!-- Duration -->
              <span class="text-[11px] font-mono text-zinc-400 shrink-0">
                {formatDuration(job.started_at, job.completed_at)}
              </span>
            </button>
          {/each}
        {/if}
      </div>

      <!-- Run Details section -->
      <div class="border-t border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/50 dark:bg-zinc-950/30 text-xs shrink-0">
        <div class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 px-1">
          {localeState.t('githubActions.runDetails')}
        </div>

        <!-- Usage -->
        <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 transition-colors">
          <div class="flex items-center gap-2">
            <Clock class="w-3.5 h-3.5 text-zinc-400" />
            <span>{localeState.t('githubActions.usage')}</span>
          </div>
          <span class="font-mono text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            {formatDuration(run.run_started_at || run.created_at, run.updated_at)}
          </span>
        </div>

        <!-- Workflow file -->
        {#if run.path}
          <div class="flex items-center justify-between px-2 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 transition-colors">
            <div class="flex items-center gap-2 truncate pr-2">
              <FileCode class="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span class="truncate">{run.path.split('/').pop() || 'workflow.yml'}</span>
            </div>
            <a
              href={run.html_url}
              target="_blank"
              rel="noreferrer"
              class="text-[10px] font-mono text-violet-500 hover:underline shrink-0"
            >
              View
            </a>
          </div>
        {/if}
      </div>
    </div>

    <!-- Right Content Details Area -->
    <div class="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#0d1117]">
      {#if selectedJobId === 'summary'}
        <!-- SUMMARY OVERVIEW CARD -->
        <div class="p-6 overflow-y-auto space-y-6 flex-1">
          <!-- Workflow file header -->
          <div class="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <FileCode class="w-4 h-4 text-zinc-400" />
            <span class="font-bold text-zinc-800 dark:text-zinc-200">{run.path || 'workflow.yml'}</span>
            <span>•</span>
            <span>on: {run.event}</span>
          </div>

          <!-- Matrix Progress Card -->
          <div class="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50/50 dark:bg-zinc-950/40 shadow-xs">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2 font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <Layers class="w-4 h-4 text-violet-500" />
                <span>{localeState.t('githubActions.matrix')}: {run.name}</span>
              </div>

              <!-- Status Badge -->
              <div class="flex items-center gap-1.5 text-xs font-semibold">
                {#if matrixProgress.inProgress > 0}
                  <RefreshCw class="w-3.5 h-3.5 text-amber-500 animate-spin" />
                  <span class="text-amber-700 dark:text-amber-400">
                    {localeState.t('githubActions.jobsCompleted', { completed: matrixProgress.completed, total: matrixProgress.total })}
                  </span>
                {:else if matrixProgress.failed > 0}
                  <XCircle class="w-3.5 h-3.5 text-rose-500" />
                  <span class="text-rose-700 dark:text-rose-400">
                    {matrixProgress.failed} failed / {matrixProgress.total} jobs
                  </span>
                {:else if matrixProgress.total > 0}
                  <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500" />
                  <span class="text-emerald-700 dark:text-emerald-400">
                    All {matrixProgress.total} jobs passed
                  </span>
                {/if}
              </div>
            </div>

            <!-- Job Grid / Matrix list -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {#each jobs as job (job.id)}
                <button
                  type="button"
                  onclick={() => selectJob(job)}
                  class="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:border-violet-400 dark:hover:border-violet-600 transition-all flex items-center justify-between text-left cursor-pointer group shadow-2xs"
                >
                  <div class="flex items-center gap-2 truncate pr-2">
                    {#if job.status === 'in_progress'}
                      <RefreshCw class="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                    {:else if job.conclusion === 'success'}
                      <CheckCircle2 class="w-4 h-4 text-emerald-500 shrink-0" />
                    {:else if job.conclusion === 'failure'}
                      <XCircle class="w-4 h-4 text-rose-500 shrink-0" />
                    {:else}
                      <Circle class="w-4 h-4 text-zinc-400 shrink-0" />
                    {/if}
                    <span class="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400">
                      {job.name}
                    </span>
                  </div>
                  <span class="text-[10px] font-mono text-zinc-400 shrink-0">
                    {formatDuration(job.started_at, job.completed_at)}
                  </span>
                </button>
              {/each}
            </div>
          </div>

          <!-- Artifacts Explorer Card -->
          <div class="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 bg-zinc-50/50 dark:bg-zinc-950/40 shadow-xs">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <Package class="w-4 h-4 text-violet-500" />
                <span>{localeState.t('githubActions.artifacts')} ({artifacts.length})</span>
              </div>
              {#if isLoadingArtifacts}
                <RefreshCw class="w-3.5 h-3.5 animate-spin text-violet-500" />
              {/if}
            </div>

            {#if isLoadingArtifacts}
              <div class="p-4 text-xs text-zinc-400 text-center italic flex items-center justify-center gap-2">
                <RefreshCw class="w-4 h-4 animate-spin text-violet-500" />
                <span>{localeState.t('githubActions.refreshing')}</span>
              </div>
            {:else if artifacts.length === 0}
              <div class="p-4 text-xs text-zinc-400 dark:text-zinc-500 italic text-center rounded-lg bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800">
                {localeState.t('githubActions.noArtifacts')}
              </div>
            {:else}
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {#each artifacts as art (art.id)}
                  <div class="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shadow-2xs">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                      <div class="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500 shrink-0">
                        <Package class="w-4 h-4" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={art.name}>
                          {art.name}
                        </div>
                        <div class="text-[11px] font-mono text-zinc-400 mt-0.5 flex items-center gap-2">
                          <span>{formatBytes(art.size_in_bytes)}</span>
                          {#if art.expired}
                            <span class="text-rose-500 font-semibold">• {localeState.t('githubActions.expired')}</span>
                          {/if}
                        </div>
                      </div>
                    </div>

                    {#if !art.expired && art.archive_download_url}
                      <a
                        href={art.archive_download_url}
                        target="_blank"
                        rel="noreferrer"
                        class="h-7 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                        title={localeState.t('githubActions.downloadArtifact')}
                      >
                        <Download class="w-3.5 h-3.5 text-zinc-500" />
                        <span class="hidden sm:inline">Zip</span>
                      </a>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {:else if selectedJob}
        <!-- SPECIFIC JOB BREAKDOWN & TERMINAL LOG VIEWER -->
        <div class="flex flex-col h-full overflow-hidden">
          <!-- Job Header Bar -->
          <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0d1117] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {selectedJob.name}
              </h2>
              <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                {#if selectedJob.status === 'in_progress'}
                  <span class="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                    <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    {localeState.t('githubActions.startedAgo', { time: formatTimeAgo(selectedJob.started_at) })}
                  </span>
                {:else}
                  <span>
                    {localeState.t('githubActions.completedIn', { duration: formatDuration(selectedJob.started_at, selectedJob.completed_at) })}
                  </span>
                {/if}
              </div>
            </div>

            <!-- Right Toolset: Search, Expand All, Mode Switch, Download, Copy, GitHub Link -->
            <div class="flex items-center gap-2 flex-wrap shrink-0">
              <!-- Search inside logs -->
              <div class="relative w-48 sm:w-60">
                <Search class="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  bind:value={searchLogsQuery}
                  placeholder={localeState.t('githubActions.searchLogs')}
                  class="w-full pl-8 pr-7 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:border-violet-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 shadow-2xs font-mono"
                />
                {#if searchLogsQuery}
                  <button
                    type="button"
                    onclick={() => (searchLogsQuery = '')}
                    class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    title="Clear search"
                  >
                    <X class="w-3 h-3" />
                  </button>
                {/if}
              </div>

              <!-- Expand / Collapse All Steps -->
              {#if logDisplayMode === 'steps' && selectedJob.steps && selectedJob.steps.length > 0}
                <button
                  type="button"
                  onclick={handleToggleAllSteps}
                  class="h-8 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title={expandedStepNumbers.size === selectedJob.steps.length ? localeState.t('githubActions.collapseAll') : localeState.t('githubActions.expandAll')}
                >
                  <ChevronDown class="w-3.5 h-3.5 text-zinc-400 {expandedStepNumbers.size === selectedJob.steps.length ? 'rotate-180' : ''} transition-transform" />
                  <span>{expandedStepNumbers.size === selectedJob.steps.length ? localeState.t('githubActions.collapseAll') : localeState.t('githubActions.expandAll')}</span>
                </button>
              {/if}

              <!-- Toggle Steps / Raw Mode -->
              <button
                type="button"
                onclick={() => (logDisplayMode = logDisplayMode === 'steps' ? 'raw' : 'steps')}
                class="h-8 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title={logDisplayMode === 'steps' ? localeState.t('githubActions.rawLog') : localeState.t('githubActions.stepsView')}
              >
                {#if logDisplayMode === 'steps'}
                  <Terminal class="w-3.5 h-3.5 text-violet-500" />
                  <span>{localeState.t('githubActions.rawLog')}</span>
                {:else}
                  <FileText class="w-3.5 h-3.5 text-violet-500" />
                  <span>{localeState.t('githubActions.stepsView')}</span>
                {/if}
              </button>

              <!-- Download Log File -->
              <button
                type="button"
                onclick={handleDownloadLog}
                disabled={!jobLogs}
                class="h-8 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-40"
                title={localeState.t('githubActions.downloadLog')}
              >
                <Download class="w-3.5 h-3.5 text-zinc-400" />
              </button>

              <!-- Copy Full Logs -->
              <button
                type="button"
                onclick={handleCopyJobLogs}
                disabled={!jobLogs}
                class="h-8 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-40"
                title={localeState.t('githubActions.copyLogs')}
              >
                {#if copiedLogs}
                  <Check class="w-3.5 h-3.5 text-emerald-500" />
                {:else}
                  <Copy class="w-3.5 h-3.5 text-zinc-400" />
                {/if}
              </button>

              <!-- Open on GitHub -->
              <a
                href={selectedJob.html_url}
                target="_blank"
                rel="noreferrer"
                class="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                title="View Job on GitHub"
              >
                <ExternalLink class="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <!-- Main Log Viewer Content Area -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-50 dark:bg-[#0d1117]">
            {#if isLoadingLogs}
              <div class="flex flex-col items-center justify-center p-12 text-zinc-400 gap-2">
                <RefreshCw class="w-6 h-6 animate-spin text-violet-500" />
                <span class="text-xs">{localeState.t('githubActions.loadingLogs')}</span>
              </div>
            {:else if logDisplayMode === 'raw'}
              <!-- RAW CONTINUOUS TERMINAL LOG VIEW -->
              <div class="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 font-mono text-[11px] leading-relaxed p-4 shadow-inner max-h-[calc(100vh-270px)] overflow-y-auto select-text">
                {#if filteredLogLines.length === 0}
                  <div class="text-zinc-500 italic py-4 text-center">
                    {localeState.t('githubActions.noLogsAvailable')}
                  </div>
                {:else}
                  {#each filteredLogLines as line (line.lineNumber)}
                    <div class="flex items-start hover:bg-zinc-900/60 px-1 rounded transition-colors group">
                      <span class="text-zinc-600 w-12 text-right pr-3 select-none shrink-0 group-hover:text-zinc-400">
                        {line.lineNumber}
                      </span>
                      <span class="break-all flex-1 {line.isCommand ? 'text-cyan-400 font-semibold' : line.isError ? 'text-rose-400 font-semibold' : line.isWarn ? 'text-amber-400' : 'text-zinc-300'}">
                        {line.text}
                      </span>
                    </div>
                  {/each}
                {/if}
              </div>
            {:else}
              <!-- STEPS-ACCORDION TERMINAL VIEW -->
              <div class="space-y-2 max-w-5xl mx-auto">
                {#if !selectedJob.steps || selectedJob.steps.length === 0}
                  <div class="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center text-zinc-400 text-xs italic">
                    {localeState.t('githubActions.noLogsAvailable')}
                  </div>
                {:else}
                  {#each selectedJob.steps as step (step.number)}
                    {@const isExpanded = expandedStepNumbers.has(step.number)}
                    {@const stepLines = stepLogsMap.get(step.number) || []}
                    {@const displayLines = searchLogsQuery.trim() ? stepLines.filter((l) => l.text.toLowerCase().includes(searchLogsQuery.toLowerCase().trim())) : stepLines}

                    <div class="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-[#161b22] transition-colors shadow-2xs">
                      <!-- Step Header Toggle -->
                      <button
                        type="button"
                        onclick={() => handleToggleStep(step.number)}
                        class="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer {isExpanded ? 'bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800' : ''}"
                      >
                        <div class="flex items-center gap-2.5 min-w-0 flex-1">
                          <!-- Step Status Icon -->
                          <div class="shrink-0">
                            {#if step.status === 'in_progress'}
                              <RefreshCw class="w-3.5 h-3.5 text-amber-500 animate-spin" />
                            {:else if step.conclusion === 'success'}
                              <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500" />
                            {:else if step.conclusion === 'failure'}
                              <XCircle class="w-3.5 h-3.5 text-rose-500" />
                            {:else if step.conclusion === 'skipped'}
                              <Circle class="w-3.5 h-3.5 text-zinc-400" />
                            {:else}
                              <Circle class="w-3.5 h-3.5 text-zinc-400" />
                            {/if}
                          </div>

                          <!-- Step Name -->
                          <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {step.name}
                          </span>
                        </div>

                        <div class="flex items-center gap-3 shrink-0">
                          <!-- Duration -->
                          {#if step.started_at && step.completed_at}
                            <span class="text-[11px] font-mono text-zinc-400">
                              {formatDuration(step.started_at, step.completed_at)}
                            </span>
                          {/if}

                          <ChevronDown class="w-3.5 h-3.5 text-zinc-400 transition-transform {isExpanded ? 'rotate-180' : ''}" />
                        </div>
                      </button>

                      <!-- Step Log Lines Body -->
                      {#if isExpanded}
                        <div class="bg-zinc-950 font-mono text-[11px] leading-relaxed p-4 select-text overflow-x-auto max-h-96">
                          {#if step.conclusion === 'skipped'}
                            <div class="text-zinc-500 italic py-2">
                              {localeState.t('githubActions.stepSkipped')}
                            </div>
                          {:else if step.status === 'in_progress' && displayLines.length === 0}
                            <div class="text-amber-400/80 italic py-2 flex items-center gap-2">
                              <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                              <span>{localeState.t('githubActions.stepRunningNotice')}</span>
                            </div>
                          {:else if displayLines.length === 0}
                            <div class="text-zinc-600 italic py-2">
                              (No output for this step or waiting for server flush)
                            </div>
                          {:else}
                            {#each displayLines as line (line.lineNumber)}
                              <div class="flex items-start hover:bg-zinc-900/60 px-1 rounded transition-colors group">
                                <span class="text-zinc-600 w-10 text-right pr-3 select-none shrink-0 group-hover:text-zinc-400">
                                  {line.lineNumber}
                                </span>
                                <span class="break-all flex-1 {line.isCommand ? 'text-cyan-400 font-semibold' : line.isError ? 'text-rose-400 font-semibold' : line.isWarn ? 'text-amber-400' : 'text-zinc-300'}">
                                  {line.text}
                                </span>
                              </div>
                            {/each}
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/each}
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
