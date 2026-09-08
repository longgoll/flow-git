<script lang="ts">
  import type { AutoBisectLogStep, BisectStatus, CommitNode } from '../types';
  import { localeState } from '../state/localeState.svelte';
  import { isTauri } from '../api/client';
  import { listen } from '@tauri-apps/api/event';
  import {
    Bug,
    CheckCircle2,
    RotateCcw,
    Sparkles,
    Award,
    Terminal,
    Play,
    Loader2,
  } from 'lucide-svelte';

  interface Props {
    isOpen: boolean;
    status: BisectStatus | null;
    commits: CommitNode[];
    isLoading: boolean;
    onStartBisect: (badSha: string, goodSha: string) => void;
    onBisectStep: (isGood: boolean) => void;
    onRunAutoBisect?: (script: string) => Promise<any>;
    onAbortBisect: () => void;
    onClose: () => void;
  }

  let {
    isOpen,
    status,
    commits,
    isLoading,
    onStartBisect,
    onBisectStep,
    onRunAutoBisect,
    onAbortBisect,
    onClose,
  }: Props = $props();

  let selectedBad = $state<string>('');
  let selectedGood = $state<string>('');
  let bisectMode = $state<'manual' | 'auto'>('manual');
  let testScript = $state<string>('npm test');
  let isAutoRunning = $state<boolean>(false);
  let autoLogs = $state<AutoBisectLogStep[]>([]);

  $effect(() => {
    if (commits.length >= 2 && !selectedBad && !selectedGood) {
      selectedBad = commits[0].id;
      selectedGood = commits[Math.min(commits.length - 1, 10)].id;
    }
  });

  $effect(() => {
    if (isTauri && isOpen) {
      const unlisten = listen<AutoBisectLogStep>('bisect://step-log', (event) => {
        autoLogs = [...autoLogs, event.payload];
      });
      return () => {
        unlisten.then((fn) => fn());
      };
    }
    return undefined;
  });

  async function handleRunAuto() {
    if (!onRunAutoBisect || !testScript.trim()) return;
    isAutoRunning = true;
    autoLogs = [];
    try {
      await onRunAutoBisect(testScript.trim());
    } catch (e) {
      console.error('Auto bisect error:', e);
    } finally {
      isAutoRunning = false;
    }
  }

  let progressPercentage = $derived.by(() => {
    if (!status || status.total_commits_count === 0) return 0;
    return Math.min(100, Math.round((status.tested_commits_count / status.total_commits_count) * 100));
  });
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
    <div class="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-zinc-900 dark:text-zinc-100">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">
            <Bug class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {localeState.t('workflows.bisect.title')}
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                {localeState.t('workflows.bisect.badge')}
              </span>
            </h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              {localeState.t('workflows.bisect.subtitle')}
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="text-zinc-400 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-sm cursor-pointer p-1"
        >
          ✕
        </button>
      </div>

      <!-- Body Content -->
      <div class="p-6 overflow-y-auto space-y-6">
        {#if !status?.is_active && !status?.culprit_commit_id}
          <!-- Start Bisect Setup Form -->
          <div class="space-y-4">
            <div class="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
              <label for="bad-commit-select" class="block text-xs font-semibold text-rose-600 dark:text-rose-400">
                {localeState.t('workflows.bisect.selectBad')}
              </label>
              <select
                id="bad-commit-select"
                bind:value={selectedBad}
                class="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-purple-500"
              >
                {#each commits.slice(0, 30) as c}
                  <option value={c.id}>
                    [{c.short_id}] {c.summary.slice(0, 50)} ({c.author_name})
                  </option>
                {/each}
              </select>
            </div>

            <div class="bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
              <label for="good-commit-select" class="block text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {localeState.t('workflows.bisect.selectGood')}
              </label>
              <select
                id="good-commit-select"
                bind:value={selectedGood}
                class="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-purple-500"
              >
                {#each commits.slice(0, 50) as c}
                  <option value={c.id}>
                    [{c.short_id}] {c.summary.slice(0, 50)} ({c.author_name})
                  </option>
                {/each}
              </select>
            </div>

            <button
              onclick={() => onStartBisect(selectedBad, selectedGood)}
              disabled={isLoading || !selectedBad || !selectedGood || selectedBad === selectedGood}
              class="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles class="w-4 h-4" />
              <span>{localeState.t('workflows.bisect.launchBtn')}</span>
            </button>
          </div>
        {:else if status?.culprit_commit_id}
          <!-- Bisect Done: Culprit Found -->
          <div class="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/40 rounded-2xl p-6 text-center space-y-4">
            <div class="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center">
              <Award class="w-6 h-6" />
            </div>

            <div>
              <h4 class="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                {localeState.t('workflows.bisect.pinpointedTitle')}
              </h4>
              <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {localeState.t('workflows.bisect.pinpointedSubtitle')}
              </p>
            </div>

            <div class="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-left font-mono space-y-1 select-text shadow-xs">
              <div class="text-xs font-bold text-rose-600 dark:text-rose-400">
                {localeState.t('workflows.bisect.culpritCommit', { sha: status.culprit_commit_id.slice(0, 10) })}
              </div>
              <div class="text-xs text-zinc-800 dark:text-zinc-300">
                {commits.find((c) => c.id === status?.culprit_commit_id)?.summary || 'Culprit commit details'}
              </div>
            </div>

            <div class="flex items-center justify-center gap-3 pt-2">
              <button
                onclick={onAbortBisect}
                class="px-5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-transparent cursor-pointer transition-colors"
              >
                {localeState.t('workflows.bisect.resetHead')}
              </button>
            </div>
          </div>
        {:else}
          <!-- Bisect In Progress -->
          <div class="space-y-5">
            <!-- Progress Banner -->
            <div class="bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-zinc-600 dark:text-zinc-400 font-medium">{localeState.t('workflows.bisect.progressLabel')}</span>
                <span class="text-purple-600 dark:text-purple-400 font-mono font-bold">
                  {localeState.t('workflows.bisect.stepsRemainingDetail', {
                    steps: status?.estimated_steps_remaining ?? 0,
                    tested: status?.tested_commits_count ?? 0,
                    total: status?.total_commits_count ?? 0,
                  })}
                </span>
              </div>
              <div class="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
                  style="width: {progressPercentage}%"
                ></div>
              </div>
            </div>

            <!-- Current Midpoint Commit Card -->
            <div class="bg-white dark:bg-zinc-950 border-2 border-purple-300 dark:border-purple-500/40 rounded-xl p-4 space-y-3 relative overflow-hidden shadow-xs">
              <div class="flex items-center justify-between">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                  {localeState.t('workflows.bisect.testingCommit')}
                </span>
                <span class="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {status?.current_commit_id?.slice(0, 8)}
                </span>
              </div>

              <div class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {status?.current_commit_summary || localeState.t('workflows.bisect.loadingCommitInfo')}
              </div>
              <div class="text-xs text-zinc-500 dark:text-zinc-400">
                {localeState.t('workflows.bisect.author', { name: status?.current_commit_author || 'Unknown' })}
              </div>
            </div>

            <!-- Mode Selector: Manual vs Script -->
            <div class="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
              <button
                onclick={() => (bisectMode = 'manual')}
                class="flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all {bisectMode === 'manual' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
              >
                <span>{localeState.t('workflows.bisect.manualMode')}</span>
              </button>
              <button
                onclick={() => (bisectMode = 'auto')}
                class="flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all {bisectMode === 'auto' ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
              >
                <Terminal class="w-3.5 h-3.5" />
                <span>{localeState.t('workflows.bisect.autoMode')}</span>
              </button>
            </div>

            {#if bisectMode === 'manual'}
              <!-- 2 Big Decision Buttons -->
              <div class="grid grid-cols-2 gap-4 pt-1">
                <button
                  onclick={() => onBisectStep(true)}
                  disabled={isLoading}
                  class="py-4 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 dark:shadow-emerald-950/50 cursor-pointer"
                >
                  <CheckCircle2 class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <span>{localeState.t('workflows.bisect.passGood')}</span>
                  <span class="text-[10px] font-normal text-emerald-600 dark:text-emerald-400/80">{localeState.t('workflows.bisect.passGoodDesc')}</span>
                </button>

                <button
                  onclick={() => onBisectStep(false)}
                  disabled={isLoading}
                  class="py-4 px-4 rounded-xl bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/30 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all shadow-md shadow-rose-500/10 dark:shadow-rose-950/50 cursor-pointer"
                >
                  <Bug class="w-6 h-6 text-rose-600 dark:text-rose-400" />
                  <span>{localeState.t('workflows.bisect.failBad')}</span>
                  <span class="text-[10px] font-normal text-rose-600 dark:text-rose-400/80">{localeState.t('workflows.bisect.failBadDesc')}</span>
                </button>
              </div>
            {:else}
              <!-- Auto-Bisect Script Runner -->
              <div class="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 font-mono text-xs">
                <div>
                  <label for="auto-script-input" class="block font-sans text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    {localeState.t('workflows.bisect.scriptLabel')}
                  </label>
                  <div class="flex items-center gap-2">
                    <input
                      id="auto-script-input"
                      type="text"
                      bind:value={testScript}
                      placeholder="e.g. npm test or cargo test"
                      class="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-purple-500"
                    />
                    <button
                      onclick={handleRunAuto}
                      disabled={isAutoRunning || isLoading || !testScript.trim()}
                      class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-sans font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      {#if isAutoRunning}
                        <Loader2 class="w-3.5 h-3.5 animate-spin" />
                        <span>{localeState.t('workflows.bisect.runningAuto')}</span>
                      {:else}
                        <Play class="w-3.5 h-3.5" />
                        <span>{localeState.t('workflows.bisect.startAutoBtn')}</span>
                      {/if}
                    </button>
                  </div>
                </div>

                <!-- Presets -->
                <div class="flex items-center gap-1.5 pt-1">
                  <span class="font-sans text-[11px] text-zinc-500">{localeState.t('workflows.bisect.quickPresets')}:</span>
                  {#each ['npm test', 'cargo test', 'npm run lint', 'pytest'] as preset}
                    <button
                      onclick={() => (testScript = preset)}
                      class="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-[10px] text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors"
                    >
                      {preset}
                    </button>
                  {/each}
                </div>

                <!-- Terminal Step Logs -->
                {#if autoLogs.length > 0}
                  <div class="mt-3 p-3 rounded-lg bg-zinc-900 text-zinc-200 border border-zinc-800 max-h-40 overflow-y-auto space-y-1.5 text-[11px] select-text">
                    <div class="text-[10px] text-zinc-400 font-bold border-b border-zinc-800 pb-1 flex items-center justify-between">
                      <span>Execution Log ({autoLogs.length} steps)</span>
                    </div>
                    {#each autoLogs as log}
                      <div class="flex items-start gap-2">
                        <span class="{log.is_good ? 'text-emerald-400' : 'text-rose-400'} font-bold">
                          {log.is_good ? '✓' : '✗'}
                        </span>
                        <div class="flex-1 min-w-0">
                          <span class="font-semibold text-purple-400">Step {log.step}:</span>
                          <span class="text-zinc-400">[{log.commit_id.slice(0, 7)}]</span>
                          <span class="text-zinc-300">{log.commit_summary.slice(0, 35)}</span>
                          <span class="{log.is_good ? 'text-emerald-400' : 'text-rose-400'} font-bold">({log.is_good ? 'GOOD' : `BAD (exit ${log.exit_code})`})</span>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Abort Bisect Action -->
            <div class="flex items-center justify-center pt-2">
              <button
                onclick={onAbortBisect}
                class="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>{localeState.t('workflows.bisect.abortAndRestore')}</span>
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
