<script lang="ts">
  import type { CurrentRepoIdentity, RepoSummary } from '../types';
  import { CheckCircle, ShieldCheck, AlertTriangle, UserCheck, Globe } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    statusMessage: string;
    repoSummary: RepoSummary | null;
    visibleCommitsCount: number;
    dirtyFilesCount: number;
    stagedFilesCount: number;
    currentIdentity?: CurrentRepoIdentity | null;
    onOpenTrash: () => void;
    onOpenIdentity?: () => void;
  }

  let {
    statusMessage,
    repoSummary,
    visibleCommitsCount,
    dirtyFilesCount,
    stagedFilesCount,
    currentIdentity = null,
    onOpenTrash,
    onOpenIdentity,
  }: Props = $props();
</script>

<footer class="h-7 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-100 dark:bg-zinc-950 px-3 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 font-mono select-none z-20 shrink-0">
  <div class="flex items-center gap-3 truncate">
    <div class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 shrink-0">
      <CheckCircle class="w-3 h-3 shrink-0" />
      <span class="truncate max-w-[500px]">{statusMessage}</span>
    </div>

    {#if repoSummary}
      <span class="text-zinc-300 dark:text-zinc-600">|</span>
      <span class="text-zinc-700 dark:text-zinc-400 font-semibold shrink-0">{visibleCommitsCount.toLocaleString()} {localeState.t('statusBar.commits')}</span>
      {#if repoSummary.is_detached}
        <span class="text-zinc-300 dark:text-zinc-600">|</span>
        <span class="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700/60 font-semibold flex items-center gap-1">
          <AlertTriangle class="w-3 h-3 text-amber-500 dark:text-amber-400" />
          <span>{localeState.t('statusBar.detachedHead')}</span>
        </span>
      {/if}
      {#if dirtyFilesCount > 0 || stagedFilesCount > 0}
        <span class="text-zinc-300 dark:text-zinc-600">|</span>
        <span class="text-amber-600 dark:text-amber-400 font-semibold shrink-0">{dirtyFilesCount} {localeState.t('statusBar.unstaged')}</span>
        <span class="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">{stagedFilesCount} {localeState.t('statusBar.staged')}</span>
      {/if}
    {/if}
  </div>

  <div class="flex items-center gap-3 text-zinc-500 shrink-0">
    <div class="flex items-center gap-1.5 hidden sm:flex">
      <span class="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">Ctrl+K</span>
      <span>{localeState.t('statusBar.paletteTip')}</span>
    </div>
    <div class="flex items-center gap-1.5 hidden sm:flex">
      <span class="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">Ctrl+Z</span>
      <span>{localeState.t('statusBar.timeMachineTip')}</span>
    </div>
    {#if currentIdentity?.name}
      <button
        onclick={onOpenIdentity}
        class="flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium cursor-pointer transition-colors"
        title={localeState.t('statusBar.gitAuthorTip', { name: `${currentIdentity.name} <${currentIdentity.email || ''}>` })}
      >
        <UserCheck class="w-3 h-3" />
        <span class="truncate max-w-[120px]">{currentIdentity.name}</span>
      </button>
    {/if}
    <button
      onclick={onOpenTrash}
      class="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium cursor-pointer transition-colors"
      title={localeState.t('statusBar.trashTooltip')}
    >
      <ShieldCheck class="w-3 h-3" />
      <span>Trash</span>
    </button>
    <!-- Quick Language Toggle Button -->
    <button
      onclick={() => localeState.toggleLocale()}
      class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-800 font-semibold text-[10px] cursor-pointer transition-all"
      title={localeState.t('statusBar.langToggleTooltip')}
    >
      <Globe class="w-2.5 h-2.5 text-zinc-400" />
      <span>{localeState.locale === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</span>
    </button>
  </div>
</footer>
