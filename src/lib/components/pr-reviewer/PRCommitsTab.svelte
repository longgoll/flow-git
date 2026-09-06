<script lang="ts">
  import { GitCommit, ExternalLink } from 'lucide-svelte';
  import type { GitHubPRCommit } from '../../types';
  import { formatRelativeTime } from '../../utils/timeUtils';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    prCommits: GitHubPRCommit[];
  }

  let { prCommits = [] }: Props = $props();
</script>

<div class="flex-1 overflow-y-auto p-6 space-y-3 max-w-3xl">
  {#if prCommits.length === 0}
    <div class="p-8 text-center text-xs text-zinc-400">
      {localeState.t('pullRequest.reviewer.commitsTab.noCommitsData')}
    </div>
  {:else}
    <div class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
      {localeState.t('pullRequest.reviewer.commitsTab.commitsListTitle', { count: prCommits.length })}
    </div>
    <div class="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
      {#each prCommits as commit (commit.sha)}
        <div class="p-3.5 flex items-start justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-colors">
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <div class="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mt-0.5 shrink-0">
              <GitCommit class="w-4 h-4" />
            </div>
            <div class="space-y-1 min-w-0 flex-1">
              <div class="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-sans break-words">
                {commit.commit.message.split('\n')[0]}
              </div>
              <div class="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>{commit.commit.author.name}</span>
                <span>•</span>
                <span>{formatRelativeTime(commit.commit.author.date)}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <a
              href={commit.html_url}
              target="_blank"
              rel="noreferrer"
              class="px-2 py-0.5 rounded font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1"
              title={localeState.t('pullRequest.reviewer.commitsTab.viewCommitOnGitHub')}
            >
              <span>{commit.sha.slice(0, 7)}</span>
              <ExternalLink class="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
