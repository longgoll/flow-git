<script lang="ts">
  import {
    Database,
    Plus,
    RefreshCw,
    Rocket,
    Server,
    ShieldCheck,
    TrendingUp,
    Workflow,
  } from 'lucide-svelte';
  import type { GitHubWorkflow } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    activeView: 'list' | 'detail' | 'caches' | 'runners' | 'deployments' | 'attestations' | 'analytics';
    selectedWorkflowId: number | 'all';
    workflows: GitHubWorkflow[];
    isLoadingWorkflows: boolean;
    remoteInfo: { owner: string; repo: string } | null;
    cachesCount?: number;
    runnersCount?: number;
    deploymentsCount?: number;
    attestationsCount?: number;
    onSelectWorkflow: (id: number | 'all') => void;
    onSelectView: (view: 'list' | 'caches' | 'runners' | 'deployments' | 'attestations' | 'analytics') => void;
  }

  let {
    activeView,
    selectedWorkflowId,
    workflows,
    isLoadingWorkflows,
    remoteInfo,
    cachesCount = 0,
    runnersCount = 0,
    deploymentsCount = 0,
    attestationsCount = 0,
    onSelectWorkflow,
    onSelectView,
  }: Props = $props();
</script>

<aside class="w-64 sm:w-72 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-col shrink-0">
  <!-- Sidebar Header with Actions Title & New Workflow button -->
  <div class="p-3.5 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-2 bg-white/50 dark:bg-zinc-900/50">
    <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
      Actions
    </h3>
    {#if remoteInfo}
      <a
        href="https://github.com/{remoteInfo.owner}/{remoteInfo.repo}/actions/new"
        target="_blank"
        rel="noreferrer"
        class="h-7 px-2.5 rounded-md bg-[#1f883d] hover:bg-[#1a7f37] active:bg-[#156c2e] text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
        title={localeState.t('githubActions.newWorkflow')}
      >
        <Plus class="w-3.5 h-3.5" />
        <span>{localeState.t('githubActions.newWorkflow')}</span>
      </a>
    {/if}
  </div>

  <!-- Workflows Category -->
  <div class="flex-1 overflow-y-auto p-2 space-y-0.5">
    <div class="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
      {localeState.t('githubActions.workflows')}
    </div>

    <!-- All Workflows item -->
    <button
      type="button"
      onclick={() => {
        onSelectView('list');
        onSelectWorkflow('all');
      }}
      class="w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer {activeView === 'list' && selectedWorkflowId === 'all' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
    >
      <div class="flex items-center gap-2.5 truncate">
        <Workflow class="w-4 h-4 {activeView === 'list' && selectedWorkflowId === 'all' ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400'} shrink-0" />
        <span class="truncate">{localeState.t('githubActions.allWorkflows')}</span>
      </div>
    </button>

    {#if isLoadingWorkflows}
      <div class="p-4 flex items-center justify-center text-zinc-400 gap-2">
        <RefreshCw class="w-3.5 h-3.5 animate-spin text-violet-500" />
        <span class="text-xs">{localeState.t('githubActions.refreshing')}</span>
      </div>
    {:else}
      {#each workflows as wf (wf.id)}
        <button
          type="button"
          onclick={() => {
            onSelectView('list');
            onSelectWorkflow(wf.id);
          }}
          class="w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer {activeView === 'list' && selectedWorkflowId === wf.id ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <div class="flex items-center gap-2.5 truncate">
            <Workflow class="w-4 h-4 {activeView === 'list' && selectedWorkflowId === wf.id ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400'} shrink-0" />
            <span class="truncate" title={wf.name}>{wf.name}</span>
          </div>
        </button>
      {/each}
    {/if}

    <!-- Divider -->
    <div class="pt-3 pb-1">
      <div class="h-px bg-zinc-200 dark:border-zinc-800/80 mx-2"></div>
    </div>

    <!-- Management Category -->
    <div class="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
      {localeState.t('githubActions.management')}
    </div>

    <!-- Management Item: Caches -->
    <button
      type="button"
      onclick={() => onSelectView('caches')}
      class="w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-all group cursor-pointer {activeView === 'caches' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
    >
      <div class="flex items-center gap-2.5 truncate">
        <Database class="w-4 h-4 {activeView === 'caches' ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200'} shrink-0" />
        <span>{localeState.t('githubActions.caches')}</span>
      </div>
      {#if cachesCount > 0}
        <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono font-bold">
          {cachesCount}
        </span>
      {/if}
    </button>

    <!-- Management Item: Deployments -->
    <button
      type="button"
      onclick={() => onSelectView('deployments')}
      class="w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-all group cursor-pointer {activeView === 'deployments' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
    >
      <div class="flex items-center gap-2.5 truncate">
        <Rocket class="w-4 h-4 {activeView === 'deployments' ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200'} shrink-0" />
        <span>{localeState.t('githubActions.deployments')}</span>
      </div>
      {#if deploymentsCount > 0}
        <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono font-bold">
          {deploymentsCount}
        </span>
      {/if}
    </button>

    <!-- Management Item: Attestations -->
    <button
      type="button"
      onclick={() => onSelectView('attestations')}
      class="w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-all group cursor-pointer {activeView === 'attestations' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
    >
      <div class="flex items-center gap-2.5 truncate">
        <ShieldCheck class="w-4 h-4 {activeView === 'attestations' ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200'} shrink-0" />
        <span>{localeState.t('githubActions.attestations')}</span>
      </div>
      {#if attestationsCount > 0}
        <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono font-bold">
          {attestationsCount}
        </span>
      {/if}
    </button>

    <!-- Management Item: Runners -->
    <button
      type="button"
      onclick={() => onSelectView('runners')}
      class="w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-all group cursor-pointer {activeView === 'runners' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
    >
      <div class="flex items-center gap-2.5 truncate">
        <Server class="w-4 h-4 {activeView === 'runners' ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200'} shrink-0" />
        <span>{localeState.t('githubActions.runners')}</span>
      </div>
      {#if runnersCount > 0}
        <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono font-bold">
          {runnersCount}
        </span>
      {/if}
    </button>

    <!-- Management Item: Analytics & Performance -->
    <button
      type="button"
      onclick={() => onSelectView('analytics')}
      class="w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-all group cursor-pointer {activeView === 'analytics' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
    >
      <div class="flex items-center gap-2.5 truncate">
        <TrendingUp class="w-4 h-4 {activeView === 'analytics' ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200'} shrink-0" />
        <span>{localeState.t('githubActions.performanceMetrics')}</span>
      </div>
    </button>
  </div>
</aside>
