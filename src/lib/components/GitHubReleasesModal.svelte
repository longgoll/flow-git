<script lang="ts">
  import {
    Calendar,
    Check,
    Copy,
    ExternalLink,
    FileDown,
    GitCommit,
    Globe,
    PackageOpen,
    RefreshCw,
    Search,
    Sparkles,
    Tag,
    X,
  } from 'lucide-svelte';
  import type { GitHubRelease } from '../types';
  import { listGitHubReleases, parseGitHubRemote } from '../api/githubApi';
  import { localeState } from '../state/localeState.svelte';
  import { toast } from '../state/toastState.svelte';
  import MarkdownViewer from './MarkdownViewer.svelte';

  interface Props {
    isOpen: boolean;
    remoteUrl?: string | null;
    initialTag?: string | null;
    onClose: () => void;
    onSelectCommit?: (commitId: string) => void;
  }

  let {
    isOpen = false,
    remoteUrl = null,
    initialTag = null,
    onClose,
    onSelectCommit,
  }: Props = $props();

  let releases = $state<GitHubRelease[]>([]);
  let selectedReleaseId = $state<number | null>(null);
  let isLoading = $state<boolean>(false);
  let errorMsg = $state<string | null>(null);
  let searchQuery = $state<string>('');
  let copiedNotes = $state<boolean>(false);

  let remoteInfo = $derived(parseGitHubRemote(remoteUrl));

  let filteredReleases = $derived.by(() => {
    if (!searchQuery.trim()) return releases;
    const q = searchQuery.toLowerCase().trim();
    return releases.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.tag_name.toLowerCase().includes(q) ||
        r.body?.toLowerCase().includes(q)
    );
  });

  let selectedRelease = $derived.by(() => {
    if (selectedReleaseId === null) return releases[0] || null;
    return releases.find((r) => r.id === selectedReleaseId) || releases[0] || null;
  });

  async function loadReleases() {
    if (!remoteInfo) {
      errorMsg = localeState.t('modals.gitHubReleases.noGitHubRemote');
      releases = [];
      return;
    }

    isLoading = true;
    errorMsg = null;
    try {
      const data = await listGitHubReleases(remoteInfo.owner, remoteInfo.repo);
      releases = data;

      if (data.length > 0) {
        if (initialTag) {
          const match = data.find((r) => r.tag_name.toLowerCase() === initialTag.toLowerCase());
          selectedReleaseId = match ? match.id : data[0].id;
        } else if (!selectedReleaseId) {
          selectedReleaseId = data[0].id;
        }
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      errorMsg = msg;
      toast.error('GitHub Releases', msg);
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    if (isOpen) {
      loadReleases();
    }
  });

  function handleCopyNotes() {
    if (!selectedRelease?.body) return;
    navigator.clipboard.writeText(selectedRelease.body);
    copiedNotes = true;
    setTimeout(() => {
      copiedNotes = false;
    }, 2000);
  }

  function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function handleJumpCommit(commitId: string) {
    if (!commitId) return;
    onSelectCommit?.(commitId);
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <div
    class="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150 select-none"
    role="dialog"
    aria-modal="true"
    aria-labelledby="releases-modal-title"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0" onclick={onClose}></div>

    <!-- Modal Box (GitHub-styled responsive dialog) -->
    <div
      class="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-200 font-sans z-10 flex flex-col animate-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60 shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
            <Globe class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 id="releases-modal-title" class="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {localeState.t('modals.gitHubReleases.title')}
              </h3>
              {#if remoteInfo}
                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {remoteInfo.owner}/{remoteInfo.repo}
                </span>
              {/if}
            </div>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              {localeState.t('modals.gitHubReleases.releasesList')}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          {#if remoteInfo}
            <a
              href={`https://github.com/${remoteInfo.owner}/${remoteInfo.repo}/releases/new`}
              target="_blank"
              rel="noreferrer"
              class="px-2.5 py-1.5 rounded-lg text-xs font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/50 hover:bg-cyan-100 dark:hover:bg-cyan-900 border border-cyan-200 dark:border-cyan-800/60 transition-colors flex items-center gap-1.5"
            >
              <Sparkles class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{localeState.t('modals.gitHubReleases.draftNewRelease')}</span>
            </a>
          {/if}

          <button
            onclick={loadReleases}
            disabled={isLoading}
            class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
            title={localeState.t('modals.gitHubReleases.refresh')}
          >
            <RefreshCw class="w-4 h-4 {isLoading ? 'animate-spin text-cyan-500' : ''}" />
          </button>

          <button
            onclick={onClose}
            class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Content 2-Column Split: Release List (Left) | Release Body (Right) -->
      <div class="flex-1 flex overflow-hidden">
        <!-- 1. Left Sidebar: Release List -->
        <div class="w-72 sm:w-80 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 flex flex-col shrink-0">
          <!-- Search Box -->
          <div class="p-3 border-b border-zinc-200/80 dark:border-zinc-800/60 shrink-0">
            <div class="relative">
              <Search class="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder={localeState.t('modals.gitHubReleases.searchPlaceholder')}
                bind:value={searchQuery}
                class="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:border-cyan-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <!-- List Items -->
          <div class="flex-1 overflow-y-auto p-2 space-y-1">
            {#if isLoading && releases.length === 0}
              <div class="p-6 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
                <div class="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                <span>{localeState.t('modals.gitHubReleases.loading')}</span>
              </div>
            {:else if errorMsg}
              <div class="p-4 text-center text-xs text-rose-500 dark:text-rose-400">
                {errorMsg}
              </div>
            {:else if filteredReleases.length === 0}
              <div class="p-6 text-center text-xs text-zinc-400 italic">
                {localeState.t('modals.gitHubReleases.noReleases')}
              </div>
            {:else}
              {#each filteredReleases as release (release.id)}
                {@const isSelected = selectedRelease?.id === release.id}
                <button
                  type="button"
                  onclick={() => (selectedReleaseId = release.id)}
                  class="w-full text-left p-2.5 rounded-xl text-xs transition-all cursor-pointer flex flex-col gap-1 border {isSelected ? 'bg-white dark:bg-zinc-800/90 border-cyan-400 dark:border-cyan-600/70 shadow-xs' : 'border-transparent hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'}"
                >
                  <div class="flex items-center justify-between gap-1.5">
                    <span class="font-bold truncate text-zinc-900 dark:text-zinc-100">
                      {release.name || release.tag_name}
                    </span>
                    {#if release.draft}
                      <span class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 shrink-0">
                        {localeState.t('modals.gitHubReleases.draftBadge')}
                      </span>
                    {:else if release.prerelease}
                      <span class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 shrink-0">
                        {localeState.t('modals.gitHubReleases.prereleaseBadge')}
                      </span>
                    {:else if release === releases[0]}
                      <span class="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
                        {localeState.t('modals.gitHubReleases.latestBadge')}
                      </span>
                    {/if}
                  </div>

                  <div class="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                    <span class="flex items-center gap-1">
                      <Tag class="w-3 h-3 text-amber-500" />
                      {release.tag_name}
                    </span>
                    <span>{formatDate(release.published_at || release.created_at)}</span>
                  </div>
                </button>
              {/each}
            {/if}
          </div>
        </div>

        <!-- 2. Right Pane: Release Details & Markdown Changelog -->
        <div class="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-zinc-900 p-6">
          {#if selectedRelease}
            <!-- Release Header Information -->
            <div class="pb-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <h2 class="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                      {selectedRelease.name || selectedRelease.tag_name}
                    </h2>
                    {#if selectedRelease.draft}
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300">
                        {localeState.t('modals.gitHubReleases.draftBadge')}
                      </span>
                    {:else if selectedRelease.prerelease}
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                        {localeState.t('modals.gitHubReleases.prereleaseBadge')}
                      </span>
                    {:else if selectedRelease === releases[0]}
                      <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400">
                        {localeState.t('modals.gitHubReleases.latestBadge')}
                      </span>
                    {/if}
                  </div>

                  <!-- Metadata Row -->
                  <div class="flex items-center gap-3 mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                    {#if selectedRelease.author}
                      <div class="flex items-center gap-1.5">
                        <img
                          src={selectedRelease.author.avatar_url}
                          alt={selectedRelease.author.login}
                          class="w-4 h-4 rounded-full"
                        />
                        <span class="font-medium text-zinc-700 dark:text-zinc-300">{selectedRelease.author.login}</span>
                        <span>{selectedRelease.draft ? 'drafted this' : 'published this'}</span>
                      </div>
                    {/if}

                    <div class="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar class="w-3.5 h-3.5 text-zinc-400" />
                      <span>{formatDate(selectedRelease.published_at || selectedRelease.created_at)}</span>
                    </div>

                    <!-- Clickable Tag -->
                    <button
                      onclick={() => handleJumpCommit(selectedRelease.target_commitish)}
                      class="flex items-center gap-1 font-mono text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800"
                      title={localeState.t('modals.gitHubReleases.jumpToCommit')}
                    >
                      <Tag class="w-3 h-3" />
                      <span>{selectedRelease.tag_name}</span>
                    </button>

                    <!-- Clickable Commit SHA -->
                    {#if selectedRelease.target_commitish}
                      <button
                        onclick={() => handleJumpCommit(selectedRelease.target_commitish)}
                        class="flex items-center gap-1 font-mono text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer bg-cyan-50 dark:bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-200 dark:border-cyan-800"
                        title={localeState.t('modals.gitHubReleases.jumpToCommit')}
                      >
                        <GitCommit class="w-3 h-3" />
                        <span>{selectedRelease.target_commitish.slice(0, 7)}</span>
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- Action buttons -->
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    onclick={handleCopyNotes}
                    class="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                    title={copiedNotes ? localeState.t('modals.gitHubReleases.copiedNotes') : localeState.t('modals.gitHubReleases.copyNotes')}
                  >
                    {#if copiedNotes}
                      <Check class="w-4 h-4 text-emerald-500" />
                    {:else}
                      <Copy class="w-4 h-4" />
                    {/if}
                  </button>

                  {#if selectedRelease.html_url}
                    <a
                      href={selectedRelease.html_url}
                      target="_blank"
                      rel="noreferrer"
                      class="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                      title={localeState.t('modals.gitHubReleases.openOnGitHub')}
                    >
                      <ExternalLink class="w-4 h-4" />
                    </a>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Release Body (Markdown Changelog) -->
            <div class="py-6 flex-1 select-text">
              {#if selectedRelease.body && selectedRelease.body.trim()}
                <MarkdownViewer
                  content={selectedRelease.body}
                  class="prose prose-sm dark:prose-invert max-w-none font-sans"
                />
              {:else}
                <p class="text-xs text-zinc-400 italic">
                  Không có ghi chú phát hành nào cho phiên bản này.
                </p>
              {/if}
            </div>

            <!-- Downloadable Assets (Binaries, Packages) -->
            {#if selectedRelease.assets && selectedRelease.assets.length > 0}
              <div class="pt-6 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                <h4 class="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
                  <PackageOpen class="w-4 h-4 text-indigo-500" />
                  <span>{localeState.t('modals.gitHubReleases.assets')} ({selectedRelease.assets.length})</span>
                </h4>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {#each selectedRelease.assets as asset (asset.id)}
                    <a
                      href={asset.browser_download_url}
                      target="_blank"
                      rel="noreferrer"
                      class="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500/50 hover:bg-cyan-50/20 dark:hover:bg-cyan-950/20 flex items-center justify-between group transition-all"
                    >
                      <div class="flex items-center gap-2 truncate pr-2">
                        <FileDown class="w-4 h-4 text-zinc-400 group-hover:text-cyan-500 shrink-0 transition-colors" />
                        <div class="truncate">
                          <div class="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                            {asset.name}
                          </div>
                          <div class="text-[10px] text-zinc-400">
                            {formatBytes(asset.size)}
                          </div>
                        </div>
                      </div>

                      <div class="text-[10px] text-zinc-400 font-mono shrink-0">
                        {localeState.t('modals.gitHubReleases.downloadsCount', { count: asset.download_count })}
                      </div>
                    </a>
                  {/each}
                </div>
              </div>
            {/if}
          {:else}
            <div class="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400 text-xs gap-3">
              <PackageOpen class="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
              <p>{localeState.t('modals.gitHubReleases.noReleasesDesc')}</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
