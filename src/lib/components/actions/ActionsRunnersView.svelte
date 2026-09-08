<script lang="ts">
  import {
    Activity,
    Cpu,
    ExternalLink,
    RefreshCw,
    Server,
  } from 'lucide-svelte';
  import type { GitHubRunnerItem } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    runners: GitHubRunnerItem[];
    isLoading: boolean;
    remoteInfo: { owner: string; repo: string } | null;
    onRefresh: () => void;
  }

  let {
    runners,
    isLoading,
    remoteInfo,
    onRefresh,
  }: Props = $props();

  let onlineCount = $derived(runners.filter((r) => r.status === 'online').length);
  let busyCount = $derived(runners.filter((r) => r.busy).length);
</script>

<div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 overflow-y-auto">
  <!-- View Header -->
  <div class="p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30 flex flex-wrap items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
          <Server class="w-4 h-4" />
        </div>
        <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {localeState.t('githubActions.runnersTitle')}
        </h2>
      </div>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
        {localeState.t('githubActions.runnersSubtitle')}
      </p>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onclick={onRefresh}
        disabled={isLoading}
        class="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
      >
        <RefreshCw class="w-3.5 h-3.5 {isLoading ? 'animate-spin text-violet-500' : ''}" />
        <span>{localeState.t('githubActions.refresh')}</span>
      </button>

      {#if remoteInfo}
        <a
          href="https://github.com/{remoteInfo.owner}/{remoteInfo.repo}/settings/actions/runners"
          target="_blank"
          rel="noreferrer"
          class="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          title={localeState.t('githubActions.openOnGitHub')}
        >
          <ExternalLink class="w-3.5 h-3.5" />
          <span>GitHub</span>
        </a>
      {/if}
    </div>
  </div>

  <!-- Main Content Area -->
  <div class="p-6 space-y-6 max-w-6xl w-full mx-auto">
    <!-- Stat Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div class="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
          Total Runners
        </div>
        <div class="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
          {runners.length}
        </div>
      </div>

      <div class="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          Online
        </div>
        <div class="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
          {onlineCount}
        </div>
      </div>

      <div class="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div class="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          Busy (Running Job)
        </div>
        <div class="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
          {busyCount}
        </div>
      </div>
    </div>

    <!-- Runners Grid -->
    {#if isLoading && runners.length === 0}
      <div class="p-16 flex flex-col items-center justify-center text-zinc-400 gap-2">
        <RefreshCw class="w-6 h-6 animate-spin text-violet-500" />
        <span class="text-xs">{localeState.t('githubActions.refreshing')}</span>
      </div>
    {:else if runners.length === 0}
      <div class="p-16 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
        <Server class="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2" />
        <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          {localeState.t('githubActions.noRunners')}
        </div>
        <p class="text-xs text-zinc-400 max-w-sm mb-4">
          GitHub provides hosted runners (ubuntu-latest, windows-latest, macos-latest) by default. You can also connect self-hosted machines.
        </p>
        {#if remoteInfo}
          <a
            href="https://github.com/{remoteInfo.owner}/{remoteInfo.repo}/settings/actions/runners/new"
            target="_blank"
            rel="noreferrer"
            class="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Cpu class="w-3.5 h-3.5" />
            <span>Add Self-Hosted Runner</span>
          </a>
        {/if}
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each runners as runner (runner.id)}
          <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 font-bold text-xs">
                  {runner.os?.slice(0, 3).toUpperCase() || 'SYS'}
                </div>
                <div>
                  <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {runner.name}
                  </h3>
                  <div class="text-[11px] text-zinc-400 font-mono">
                    ID: #{runner.id} • {runner.os}
                  </div>
                </div>
              </div>

              <!-- Status Badge -->
              <div class="flex items-center gap-1.5">
                {#if runner.status === 'online'}
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {localeState.t('githubActions.runnerOnline')}
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                    <span class="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                    {localeState.t('githubActions.runnerOffline')}
                  </span>
                {/if}
              </div>
            </div>

            <!-- Busy / Idle State -->
            <div class="flex items-center gap-2 text-xs">
              <span class="text-zinc-400">State:</span>
              {#if runner.busy}
                <span class="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <Activity class="w-3 h-3 animate-pulse" />
                  {localeState.t('githubActions.runnerBusy')}
                </span>
              {:else}
                <span class="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                  {localeState.t('githubActions.runnerIdle')}
                </span>
              {/if}
            </div>

            <!-- Labels -->
            {#if runner.labels && runner.labels.length > 0}
              <div class="flex items-center gap-1.5 flex-wrap pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                {#each runner.labels as label}
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/50">
                    {label.name}
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
