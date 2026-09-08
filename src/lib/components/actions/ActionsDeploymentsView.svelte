<script lang="ts">
  import {
    CheckCircle2,
    Clock,
    ExternalLink,
    GitCommit,
    Globe,
    RefreshCw,
    Rocket,
    XCircle,
  } from 'lucide-svelte';
  import type { GitHubDeploymentItem } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    deployments: GitHubDeploymentItem[];
    isLoading: boolean;
    remoteInfo: { owner: string; repo: string } | null;
    onRefresh: () => void;
    onSelectCommit?: (commitId: string) => void;
  }

  let {
    deployments,
    isLoading,
    remoteInfo,
    onRefresh,
    onSelectCommit,
  }: Props = $props();

  function formatTimestamp(isoString: string): string {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  function getEnvBadgeClass(env: string): string {
    const e = env.toLowerCase();
    if (e.includes('prod')) {
      return 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-900/60';
    }
    if (e.includes('stag') || e.includes('dev')) {
      return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60';
    }
    return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60';
  }
</script>

<div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 overflow-y-auto">
  <!-- View Header -->
  <div class="p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30 flex flex-wrap items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
          <Rocket class="w-4 h-4" />
        </div>
        <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {localeState.t('githubActions.deploymentsTitle')}
        </h2>
      </div>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
        {localeState.t('githubActions.deploymentsSubtitle')}
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
          href="https://github.com/{remoteInfo.owner}/{remoteInfo.repo}/deployments"
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
    {#if isLoading && deployments.length === 0}
      <div class="p-16 flex flex-col items-center justify-center text-zinc-400 gap-2">
        <RefreshCw class="w-6 h-6 animate-spin text-violet-500" />
        <span class="text-xs">{localeState.t('githubActions.refreshing')}</span>
      </div>
    {:else if deployments.length === 0}
      <div class="p-16 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
        <Rocket class="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2" />
        <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          {localeState.t('githubActions.noDeployments')}
        </div>
      </div>
    {:else}
      <div class="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
        <table class="w-full text-left text-xs">
          <thead class="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
            <tr>
              <th class="py-3 px-4">{localeState.t('githubActions.deploymentEnv')}</th>
              <th class="py-3 px-4">{localeState.t('githubActions.deploymentStatus')}</th>
              <th class="py-3 px-4">{localeState.t('githubActions.deploymentCommit')}</th>
              <th class="py-3 px-4">{localeState.t('githubActions.deploymentTriggeredBy')}</th>
              <th class="py-3 px-4">{localeState.t('githubActions.deploymentTime')}</th>
              <th class="py-3 px-4 text-right">App Link</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {#each deployments as dep (dep.id)}
              {@const status = dep.latest_status?.state || 'pending'}
              {@const envUrl = dep.latest_status?.environment_url}
              <tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                <td class="py-3 px-4">
                  <span class="px-2.5 py-1 rounded-full text-xs font-semibold font-mono border {getEnvBadgeClass(dep.environment)}">
                    {dep.environment}
                  </span>
                </td>

                <td class="py-3 px-4">
                  <div class="flex items-center gap-1.5 font-medium">
                    {#if status === 'success'}
                      <CheckCircle2 class="w-4 h-4 text-emerald-500" />
                      <span class="text-emerald-700 dark:text-emerald-400">Success</span>
                    {:else if status === 'failure' || status === 'error'}
                      <XCircle class="w-4 h-4 text-rose-500" />
                      <span class="text-rose-700 dark:text-rose-400">Failed</span>
                    {:else if status === 'in_progress'}
                      <RefreshCw class="w-4 h-4 text-amber-500 animate-spin" />
                      <span class="text-amber-700 dark:text-amber-400">In Progress</span>
                    {:else}
                      <Clock class="w-4 h-4 text-zinc-400" />
                      <span class="text-zinc-500">{status}</span>
                    {/if}
                  </div>
                </td>

                <td class="py-3 px-4">
                  <button
                    type="button"
                    onclick={() => {
                      if (onSelectCommit && dep.sha) onSelectCommit(dep.sha);
                    }}
                    class="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 underline decoration-dotted flex items-center gap-1 cursor-pointer"
                    title="Focus on Commit Graph"
                  >
                    <GitCommit class="w-3.5 h-3.5 text-violet-500" />
                    <span>{dep.sha.slice(0, 7)}</span>
                  </button>
                </td>

                <td class="py-3 px-4">
                  {#if dep.creator}
                    <div class="flex items-center gap-1.5 font-medium text-zinc-800 dark:text-zinc-200">
                      {#if dep.creator.avatar_url}
                        <img src={dep.creator.avatar_url} alt={dep.creator.login} class="w-4 h-4 rounded-full" />
                      {/if}
                      <span>{dep.creator.login}</span>
                    </div>
                  {:else}
                    <span class="text-zinc-400">-</span>
                  {/if}
                </td>

                <td class="py-3 px-4 text-zinc-500 dark:text-zinc-400 text-[11px]">
                  {formatTimestamp(dep.created_at)}
                </td>

                <td class="py-3 px-4 text-right">
                  {#if envUrl}
                    <a
                      href={envUrl}
                      target="_blank"
                      rel="noreferrer"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 text-violet-700 dark:text-violet-300 font-semibold text-xs transition-colors shadow-2xs"
                    >
                      <Globe class="w-3.5 h-3.5" />
                      <span>{localeState.t('githubActions.openDeploymentUrl')}</span>
                    </a>
                  {:else}
                    <span class="text-zinc-400 text-[11px]">-</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
