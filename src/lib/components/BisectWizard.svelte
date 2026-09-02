<script lang="ts">
  import type { BisectStatus, CommitNode } from '../types';
  import {
    Bug,
    CheckCircle2,
    RotateCcw,
    Sparkles,
    Award
  } from 'lucide-svelte';

  interface Props {
    isOpen: boolean;
    status: BisectStatus | null;
    commits: CommitNode[];
    isLoading: boolean;
    onStartBisect: (badSha: string, goodSha: string) => void;
    onBisectStep: (isGood: boolean) => void;
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
    onAbortBisect,
    onClose,
  }: Props = $props();

  let selectedBad = $state<string>('');
  let selectedGood = $state<string>('');

  $effect(() => {
    if (commits.length >= 2 && !selectedBad && !selectedGood) {
      selectedBad = commits[0].id;
      selectedGood = commits[Math.min(commits.length - 1, 10)].id;
    }
  });

  let progressPercentage = $derived.by(() => {
    if (!status || status.total_commits_count === 0) return 0;
    return Math.min(100, Math.round((status.tested_commits_count / status.total_commits_count) * 100));
  });
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Bug class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-zinc-100 flex items-center gap-2">
              Visual Git Bisect Wizard
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Binary Bug Hunter
              </span>
            </h3>
            <p class="text-xs text-zinc-400">
              Binary search pinpointing the exact commit that introduced a bug.
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="text-zinc-400 hover:text-zinc-200 text-sm cursor-pointer p-1"
        >
          ✕
        </button>
      </div>

      <!-- Body Content -->
      <div class="p-6 overflow-y-auto space-y-6">
        {#if !status?.is_active && !status?.culprit_commit_id}
          <!-- Start Bisect Setup Form -->
          <div class="space-y-4">
            <div class="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <label for="bad-commit-select" class="block text-xs font-semibold text-rose-400">
                1. Select Bad Commit (Where bug is currently present 🐞):
              </label>
              <select
                id="bad-commit-select"
                bind:value={selectedBad}
                class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500"
              >
                {#each commits.slice(0, 30) as c}
                  <option value={c.id}>
                    [{c.short_id}] {c.summary.slice(0, 50)} ({c.author_name})
                  </option>
                {/each}
              </select>
            </div>

            <div class="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <label for="good-commit-select" class="block text-xs font-semibold text-emerald-400">
                2. Select Good Commit (Older commit known to work properly ✅):
              </label>
              <select
                id="good-commit-select"
                bind:value={selectedGood}
                class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500"
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
              <span>Launch Bisect Wizard</span>
            </button>
          </div>
        {:else if status?.culprit_commit_id}
          <!-- Bisect Done: Culprit Found -->
          <div class="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-4">
            <div class="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Award class="w-6 h-6" />
            </div>

            <div>
              <h4 class="text-sm font-bold text-emerald-300">
                First Bad Commit Pinpointed! 🎯
              </h4>
              <p class="text-xs text-zinc-400 mt-1">
                The exact commit that introduced the bug has been identified.
              </p>
            </div>

            <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-left font-mono space-y-1">
              <div class="text-xs font-bold text-rose-400">
                Culprit Commit: {status.culprit_commit_id.slice(0, 10)}
              </div>
              <div class="text-xs text-zinc-300">
                {commits.find((c) => c.id === status?.culprit_commit_id)?.summary || 'Culprit commit details'}
              </div>
            </div>

            <div class="flex items-center justify-center gap-3 pt-2">
              <button
                onclick={onAbortBisect}
                class="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 cursor-pointer transition-colors"
              >
                Reset & Return to Original HEAD
              </button>
            </div>
          </div>
        {:else}
          <!-- Bisect In Progress -->
          <div class="space-y-5">
            <!-- Progress Banner -->
            <div class="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-zinc-400 font-medium">Bisect Progress:</span>
                <span class="text-purple-400 font-mono font-bold">
                  ~{status?.estimated_steps_remaining} step{status?.estimated_steps_remaining !== 1 ? 's' : ''} remaining ({status?.tested_commits_count}/{status?.total_commits_count} commits tested)
                </span>
              </div>
              <div class="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
                  style="width: {progressPercentage}%"
                ></div>
              </div>
            </div>

            <!-- Current Midpoint Commit Card -->
            <div class="bg-zinc-950 border-2 border-purple-500/40 rounded-xl p-4 space-y-3 relative overflow-hidden">
              <div class="flex items-center justify-between">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Currently Testing Commit (Detached HEAD)
                </span>
                <span class="font-mono text-xs font-bold text-zinc-300">
                  {status?.current_commit_id?.slice(0, 8)}
                </span>
              </div>

              <div class="text-sm font-semibold text-zinc-100">
                {status?.current_commit_summary || 'Loading commit info...'}
              </div>
              <div class="text-xs text-zinc-400">
                Author: {status?.current_commit_author || 'Unknown'}
              </div>
            </div>

            <!-- 2 Big Decision Buttons -->
            <div class="grid grid-cols-2 gap-4 pt-2">
              <button
                onclick={() => onBisectStep(true)}
                disabled={isLoading}
                class="py-4 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                <CheckCircle2 class="w-6 h-6 text-emerald-400" />
                <span>Code Chạy Tốt (Pass / Good ✅)</span>
                <span class="text-[10px] font-normal text-emerald-400/80">Không có lỗi ở commit này</span>
              </button>

              <button
                onclick={() => onBisectStep(false)}
                disabled={isLoading}
                class="py-4 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                <Bug class="w-6 h-6 text-rose-400" />
                <span>Code Bị Lỗi (Fail / Bad 🐞)</span>
                <span class="text-[10px] font-normal text-rose-400/80">Lỗi xuất hiện ở commit này</span>
              </button>
            </div>

            <!-- Abort Bisect Action -->
            <div class="flex items-center justify-center pt-2">
              <button
                onclick={onAbortBisect}
                class="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-rose-400 cursor-pointer transition-colors"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Abort Bisect & Restore Original Branch</span>
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
