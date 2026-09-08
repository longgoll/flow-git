<script lang="ts">
  import {
    ExternalLink,
    Lock,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
  } from 'lucide-svelte';
  import type { GitHubAttestationItem } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    attestations: GitHubAttestationItem[];
    isLoading: boolean;
    remoteInfo: { owner: string; repo: string } | null;
    onRefresh: () => void;
  }

  let {
    attestations,
    isLoading,
    remoteInfo,
    onRefresh,
  }: Props = $props();
</script>

<div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 overflow-y-auto">
  <!-- View Header -->
  <div class="p-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30 flex flex-wrap items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
          <ShieldCheck class="w-4 h-4" />
        </div>
        <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {localeState.t('githubActions.attestationsTitle')}
        </h2>
      </div>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
        {localeState.t('githubActions.attestationsSubtitle')}
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
          href="https://github.com/{remoteInfo.owner}/{remoteInfo.repo}/attestations"
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
    <!-- Security Banner -->
    <div class="p-5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs flex items-start gap-3.5">
      <div class="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
        <Lock class="w-4 h-4" />
      </div>
      <div class="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
        <strong class="text-zinc-900 dark:text-zinc-100 font-semibold block mb-1">
          Cryptographic Artifact Provenance (Sigstore)
        </strong>
        GitHub Artifact Attestations allow workflows to sign artifacts (executables, containers, packages) using temporary OIDC certificates, guaranteeing their integrity and confirming that binaries were built directly inside GitHub Actions without tampering.
      </div>
    </div>

    <!-- Attestations List / Empty State -->
    {#if isLoading && attestations.length === 0}
      <div class="p-16 flex flex-col items-center justify-center text-zinc-400 gap-2">
        <RefreshCw class="w-6 h-6 animate-spin text-violet-500" />
        <span class="text-xs">{localeState.t('githubActions.refreshing')}</span>
      </div>
    {:else if attestations.length === 0}
      <div class="p-16 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
        <ShieldAlert class="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2" />
        <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          {localeState.t('githubActions.noAttestations')}
        </div>
        <p class="text-xs text-zinc-400 max-w-md">
          To sign builds, configure the <code class="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-violet-600 dark:text-violet-400 font-mono">actions/attest-build-provenance</code> action in your release workflow.
        </p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each attestations as att (att.id)}
          <div class="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <ShieldCheck class="w-5 h-5 text-emerald-500 shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  Attestation #{att.id}
                </div>
                {#if att.bundle_url}
                  <a
                    href={att.bundle_url}
                    target="_blank"
                    rel="noreferrer"
                    class="text-[11px] text-violet-500 hover:underline font-mono truncate block"
                  >
                    {att.bundle_url}
                  </a>
                {/if}
              </div>
            </div>

            <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 shrink-0">
              Verified
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
