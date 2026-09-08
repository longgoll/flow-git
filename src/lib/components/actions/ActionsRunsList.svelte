<script lang="ts">
  import {
    Activity,
    CheckCircle2,
    ChevronRight,
    Circle,
    Clock,
    Play,
    RefreshCw,
    Search,
    X,
    XCircle,
  } from 'lucide-svelte';
  import type { GitHubWorkflow, GitHubWorkflowRun } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    runs: GitHubWorkflowRun[];
    workflows: GitHubWorkflow[];
    isLoadingRuns: boolean;
    searchQuery: string;
    filterStatus: 'all' | 'success' | 'failure' | 'in_progress' | 'queued';
    filterBranch: string;
    availableBranches: string[];
    onSelectRun: (run: GitHubWorkflowRun) => void;
    onSelectCommit?: (commitId: string) => void;
    onOpenRunWorkflowModal: () => void;
  }

  let {
    runs,
    workflows,
    isLoadingRuns,
    searchQuery = $bindable(),
    filterStatus = $bindable(),
    filterBranch = $bindable(),
    availableBranches,
    onSelectRun,
    onSelectCommit,
    onOpenRunWorkflowModal,
  }: Props = $props();

  function formatTimestamp(isoString: string): string {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
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
</script>

<section class="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950">
  <!-- Filter Toolbar -->
  <div class="p-3 border-b border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/40 dark:bg-zinc-900/30">
    <div class="flex items-center gap-2 flex-1 min-w-[240px]">
      <div class="relative flex-1">
        <Search class="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder={localeState.t('githubActions.searchPlaceholder')}
          class="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-violet-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 shadow-2xs"
        />
        {#if searchQuery}
          <button
            type="button"
            onclick={() => (searchQuery = '')}
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>
    </div>

    <!-- Status & Branch Dropdowns -->
    <div class="flex items-center gap-2 shrink-0">
      <!-- Status Filter -->
      <select
        bind:value={filterStatus}
        class="px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer shadow-2xs"
      >
        <option value="all">{localeState.t('githubActions.allStatuses')}</option>
        <option value="success">{localeState.t('githubActions.statusSuccess')}</option>
        <option value="failure">{localeState.t('githubActions.statusFailure')}</option>
        <option value="in_progress">{localeState.t('githubActions.statusInProgress')}</option>
        <option value="queued">{localeState.t('githubActions.statusQueued')}</option>
      </select>

      <!-- Branch Filter -->
      {#if availableBranches.length > 0}
        <select
          bind:value={filterBranch}
          class="px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-violet-500 cursor-pointer shadow-2xs"
        >
          <option value="all">{localeState.t('githubActions.allBranches')}</option>
          {#each availableBranches as b}
            <option value={b}>{b}</option>
          {/each}
        </select>
      {/if}

      <!-- "Run workflow" (workflow_dispatch) Button -->
      {#if workflows.length > 0}
        <button
          type="button"
          onclick={onOpenRunWorkflowModal}
          class="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
          title={localeState.t('githubActions.runWorkflowDesc')}
        >
          <Play class="w-3.5 h-3.5 fill-current" />
          <span>{localeState.t('githubActions.runWorkflow')}</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Runs Stream -->
  <div class="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900/80">
    {#if isLoadingRuns && runs.length === 0}
      <div class="flex flex-col items-center justify-center p-16 text-zinc-400 gap-2">
        <RefreshCw class="w-7 h-7 animate-spin text-violet-500" />
        <span class="text-xs">{localeState.t('githubActions.refreshing')}</span>
      </div>
    {:else if runs.length === 0}
      <div class="flex flex-col items-center justify-center p-16 text-center text-zinc-400">
        <Activity class="w-10 h-10 mb-3 opacity-30" />
        <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          {localeState.t('githubActions.noRunsFound')}
        </div>
        <p class="text-xs text-zinc-400 max-w-sm">
          {localeState.t('githubActions.noRunsDesc')}
        </p>
      </div>
    {:else}
      {#each runs as run (run.id)}
        <div
          role="button"
          tabindex="0"
          onclick={() => onSelectRun(run)}
          onkeydown={(e) => { if (e.key === 'Enter') onSelectRun(run); }}
          class="px-5 py-4 hover:bg-zinc-50/90 dark:hover:bg-zinc-900/60 transition-all cursor-pointer flex items-center justify-between gap-4 group"
        >
          <!-- Left: Status Icon + Titles -->
          <div class="flex items-start gap-3.5 min-w-0 flex-1">
            <!-- Status Icon -->
            <div class="mt-0.5 shrink-0">
              {#if run.conclusion === 'success'}
                <div class="w-5 h-5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              {:else if run.conclusion === 'failure' || run.conclusion === 'timed_out'}
                <div class="w-5 h-5 rounded-full bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center">
                  <XCircle class="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
              {:else if run.status === 'in_progress'}
                <div class="w-5 h-5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
                  <RefreshCw class="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
                </div>
              {:else if run.status === 'queued' || run.status === 'waiting'}
                <div class="w-5 h-5 rounded-full bg-zinc-500/10 dark:bg-zinc-500/20 flex items-center justify-center">
                  <Clock class="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                </div>
              {:else}
                <div class="w-5 h-5 rounded-full bg-zinc-500/10 dark:bg-zinc-500/20 flex items-center justify-center">
                  <Circle class="w-3.5 h-3.5 text-zinc-400" />
                </div>
              {/if}
            </div>

            <!-- Details -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2.5 flex-wrap mb-1">
                <span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">
                  {run.display_title || run.name}
                </span>

                {#if run.head_branch}
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 shrink-0 shadow-2xs">
                    {run.head_branch}
                  </span>
                {/if}
              </div>

              <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                <span class="font-medium text-zinc-700 dark:text-zinc-300">
                  {run.name} #{run.run_number}
                </span>
                <span>: Commit</span>

                <!-- Commit SHA -->
                <button
                  type="button"
                  onclick={(e) => {
                    e.stopPropagation();
                    if (onSelectCommit) onSelectCommit(run.head_sha);
                  }}
                  class="font-mono text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 underline decoration-dotted flex items-center gap-1 cursor-pointer font-medium"
                  title="View commit in graph"
                >
                  <span>{run.head_sha.slice(0, 7)}</span>
                </button>

                {#if run.actor}
                  <span>pushed by</span>
                  <div class="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                    {#if run.actor.avatar_url}
                      <img src={run.actor.avatar_url} alt={run.actor.login} class="w-4 h-4 rounded-full" />
                    {/if}
                    <span>{run.actor.login}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <!-- Right: Date & Duration & Arrow -->
          <div class="flex items-center gap-4 shrink-0 text-right">
            <div class="flex flex-col items-end text-xs text-zinc-500 dark:text-zinc-400">
              <span class="font-medium">{formatTimestamp(run.created_at)}</span>
              <span class="text-[11px] font-mono mt-0.5 text-zinc-400">
                {#if run.status === 'in_progress'}
                  <span class="text-amber-600 dark:text-amber-400 font-semibold">{localeState.t('githubActions.statusInProgress')}</span>
                {:else}
                  {formatDuration(run.run_started_at || run.created_at, run.updated_at)}
                {/if}
              </span>
            </div>

            <ChevronRight class="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      {/each}
    {/if}
  </div>
</section>
