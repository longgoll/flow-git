<script lang="ts">
  import {
    Activity,
    CheckCircle2,
    Clock,
    ExternalLink,
    TrendingUp,
    Workflow,
    XCircle,
  } from 'lucide-svelte';
  import type { GitHubWorkflowRun } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    runs: GitHubWorkflowRun[];
    remoteInfo: { owner: string; repo: string } | null;
  }

  let { runs, remoteInfo }: Props = $props();

  function formatSeconds(sec: number): string {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m`;
  }

  let metrics = $derived.by(() => {
    const total = runs.length;
    if (total === 0) {
      return {
        total: 0,
        successCount: 0,
        successRate: 0,
        failureCount: 0,
        failureRate: 0,
        cancelledCount: 0,
        avgDurationSec: 0,
        avgDurationFormatted: '0s',
        workflowStats: [] as { name: string; count: number; successCount: number; rate: number }[],
        recentRunsTrend: [] as { id: number; run_number: number; conclusion: string | null; durationSec: number }[],
      };
    }

    let successCount = 0;
    let failureCount = 0;
    let cancelledCount = 0;
    let totalDurationSec = 0;
    let durationCount = 0;
    const workflowMap = new Map<string, { count: number; success: number }>();

    for (const r of runs) {
      if (r.conclusion === 'success') successCount++;
      else if (r.conclusion === 'failure' || r.conclusion === 'timed_out') failureCount++;
      else if (r.conclusion === 'cancelled') cancelledCount++;

      if (r.created_at && r.updated_at) {
        const start = new Date(r.run_started_at || r.created_at).getTime();
        const end = new Date(r.updated_at).getTime();
        if (end > start) {
          const sec = Math.round((end - start) / 1000);
          totalDurationSec += sec;
          durationCount++;
        }
      }

      const wfName = r.name || 'Workflow';
      const existing = workflowMap.get(wfName) || { count: 0, success: 0 };
      existing.count++;
      if (r.conclusion === 'success') existing.success++;
      workflowMap.set(wfName, existing);
    }

    const successRate = Math.round((successCount / total) * 100);
    const failureRate = Math.round((failureCount / total) * 100);
    const avgDurationSec = durationCount > 0 ? Math.round(totalDurationSec / durationCount) : 0;
    const avgDurationFormatted = formatSeconds(avgDurationSec);

    const workflowStats = Array.from(workflowMap.entries())
      .map(([name, stat]) => ({
        name,
        count: stat.count,
        successCount: stat.success,
        rate: Math.round((stat.success / stat.count) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const recentRunsTrend = runs.slice(0, 20).reverse().map((r) => {
      let sec = 0;
      if (r.created_at && r.updated_at) {
        const start = new Date(r.run_started_at || r.created_at).getTime();
        const end = new Date(r.updated_at).getTime();
        if (end > start) sec = Math.round((end - start) / 1000);
      }
      return {
        id: r.id,
        run_number: r.run_number,
        conclusion: r.conclusion,
        durationSec: sec,
      };
    });

    return {
      total,
      successCount,
      successRate,
      failureCount,
      failureRate,
      cancelledCount,
      avgDurationSec,
      avgDurationFormatted,
      workflowStats,
      recentRunsTrend,
    };
  });
</script>

<div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 overflow-y-auto">
  <!-- View Header -->
  <div class="p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30 flex flex-wrap items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
          <TrendingUp class="w-4 h-4" />
        </div>
        <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {localeState.t('githubActions.analyticsTitle')}
        </h2>
      </div>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
        {localeState.t('githubActions.analyticsSubtitle')}
      </p>
    </div>

    {#if remoteInfo}
      <a
        href="https://github.com/{remoteInfo.owner}/{remoteInfo.repo}/pulse"
        target="_blank"
        rel="noreferrer"
        class="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        title={localeState.t('githubActions.openOnGitHub')}
      >
        <ExternalLink class="w-3.5 h-3.5" />
        <span>GitHub Pulse</span>
      </a>
    {/if}
  </div>

  <!-- Main Content Area -->
  <div class="p-6 space-y-6 max-w-6xl w-full mx-auto">
    <!-- 4 Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Success Rate Card -->
      <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 shadow-2xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {localeState.t('githubActions.successRate')}
          </span>
          <CheckCircle2 class="w-4 h-4 text-emerald-500" />
        </div>
        <div class="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
          {metrics.successRate}%
        </div>
        <div class="text-[11px] text-zinc-400">
          {metrics.successCount} of {metrics.total} runs passed
        </div>
      </div>

      <!-- Average Duration Card -->
      <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 shadow-2xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {localeState.t('githubActions.averageDuration')}
          </span>
          <Clock class="w-4 h-4 text-violet-500" />
        </div>
        <div class="text-3xl font-extrabold font-mono text-zinc-900 dark:text-zinc-100">
          {metrics.avgDurationFormatted}
        </div>
        <div class="text-[11px] text-zinc-400">
          Average duration across pipeline
        </div>
      </div>

      <!-- Total Runs Card -->
      <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 shadow-2xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {localeState.t('githubActions.totalRunsCount')}
          </span>
          <Activity class="w-4 h-4 text-blue-500" />
        </div>
        <div class="text-3xl font-extrabold font-mono text-zinc-900 dark:text-zinc-100">
          {metrics.total}
        </div>
        <div class="text-[11px] text-zinc-400">
          Total recorded executions
        </div>
      </div>

      <!-- Failure Rate Card -->
      <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 shadow-2xs space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {localeState.t('githubActions.failureRate')}
          </span>
          <XCircle class="w-4 h-4 text-rose-500" />
        </div>
        <div class="text-3xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
          {metrics.failureRate}%
        </div>
        <div class="text-[11px] text-zinc-400">
          {metrics.failureCount} failed or timed out
        </div>
      </div>
    </div>

    <!-- Recent Execution Trends (Interactive Native SVG Timeline) -->
    <div class="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          <TrendingUp class="w-4 h-4 text-violet-500" />
          <span>{localeState.t('githubActions.runsTimeline')} (Last 20 Runs)</span>
        </div>
        <div class="flex items-center gap-3 text-[11px] text-zinc-400">
          <span class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span> Success
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-xs bg-rose-500"></span> Failure
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-xs bg-zinc-400"></span> Other
          </span>
        </div>
      </div>

      {#if metrics.recentRunsTrend.length === 0}
        <div class="py-12 text-center text-xs text-zinc-400 italic">
          No run history available to plot.
        </div>
      {:else}
        {@const maxSec = Math.max(...metrics.recentRunsTrend.map((t) => t.durationSec), 60)}
        <div class="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          {#each metrics.recentRunsTrend as point}
            {@const heightPercent = Math.max(12, Math.round((point.durationSec / maxSec) * 100))}
            <div
              class="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative cursor-pointer"
            >
              <!-- Tooltip on hover -->
              <div class="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div class="px-2.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white text-[10px] font-mono shadow-lg whitespace-nowrap">
                  <div>Run #{point.run_number}</div>
                  <div class="text-zinc-400 font-normal">{formatSeconds(point.durationSec)}</div>
                </div>
              </div>

              <!-- Bar -->
              <div
                class="w-full rounded-t-md transition-all duration-300 group-hover:opacity-80 {point.conclusion === 'success' ? 'bg-emerald-500' : point.conclusion === 'failure' ? 'bg-rose-500' : 'bg-zinc-400 dark:bg-zinc-600'}"
                style="height: {heightPercent}%;"
              ></div>

              <!-- Run number label -->
              <span class="text-[9px] font-mono text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 truncate">
                #{point.run_number}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Breakdown by Workflow Table -->
    <div class="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4">
      <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
        <Workflow class="w-4 h-4 text-violet-500" />
        <span>{localeState.t('githubActions.topWorkflows')}</span>
      </div>

      {#if metrics.workflowStats.length === 0}
        <div class="py-8 text-center text-xs text-zinc-400 italic">
          No workflows found.
        </div>
      {:else}
        <div class="divide-y divide-zinc-100 dark:divide-zinc-800">
          {#each metrics.workflowStats as stat}
            <div class="py-3 flex items-center justify-between gap-4">
              <div class="min-w-0 flex-1">
                <div class="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {stat.name}
                </div>
                <div class="text-[11px] text-zinc-400 mt-0.5">
                  {stat.count} runs total • {stat.successCount} passed
                </div>
              </div>

              <div class="w-48 flex items-center gap-3 shrink-0">
                <div class="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-violet-600 dark:bg-violet-500"
                    style="width: {stat.rate}%"
                  ></div>
                </div>
                <span class="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 w-10 text-right">
                  {stat.rate}%
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
