<script lang="ts">
  import { ShieldAlert, AlertTriangle, Package, X, ArrowRight, ShieldCheck, KeyRound, EyeOff } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';
  import type { SecretFinding } from '../types';

  export interface RiskyFileItem {
    path: string;
    type: 'secret' | 'large_binary';
    reason: string;
  }

  interface Props {
    riskyFiles?: RiskyFileItem[];
    secretFindings?: SecretFinding[];
    onConfirmCommit: () => void;
    onUnstageRisky: (files: string[]) => void;
    onAddToGitignore?: (pattern: string) => void;
    onCancel: () => void;
  }

  let {
    riskyFiles = [],
    secretFindings = [],
    onConfirmCommit,
    onUnstageRisky,
    onAddToGitignore,
    onCancel
  }: Props = $props();

  // Combined list of files to unstage
  let allViolatingPaths = $derived.by(() => {
    const set = new Set<string>();
    for (const r of riskyFiles) set.add(r.path);
    for (const s of secretFindings) set.add(s.file_path);
    return Array.from(set);
  });

  let totalIssuesCount = $derived(riskyFiles.length + secretFindings.length);
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none"
  role="dialog"
  aria-modal="true"
>
  <div
    class="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-rose-300 dark:border-rose-500/40 rounded-2xl shadow-2xl shadow-rose-950/20 overflow-hidden flex flex-col font-sans text-zinc-900 dark:text-zinc-100"
  >
    <!-- Modal Header -->
    <div class="px-6 py-4 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/70 dark:to-amber-950/50 border-b border-rose-200 dark:border-rose-500/20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-xs">
          <ShieldAlert class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            {localeState.t('safety.secretShield.title')}
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 font-bold">
              {localeState.t('safety.secretShield.secretsFound', { count: totalIssuesCount })}
            </span>
          </h2>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {localeState.t('safety.secretShield.subtitle')}
          </p>
        </div>
      </div>
      <button
        type="button"
        onclick={onCancel}
        class="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Findings List -->
    <div class="p-6 max-h-96 overflow-y-auto space-y-3">
      <!-- Detailed Secret Findings (Content-level & Filename-level from Backend) -->
      {#each secretFindings as finding}
        <div class="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 hover:border-rose-300 dark:hover:border-rose-700/60 transition-colors space-y-2">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-2.5 min-w-0">
              <div class="mt-0.5 p-1 rounded-md bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400">
                <KeyRound class="w-3.5 h-3.5" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs text-zinc-900 dark:text-zinc-100 font-bold truncate select-text" title={finding.file_path}>
                    {finding.file_path}
                  </span>
                  {#if finding.line_number}
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {localeState.t('safety.secretShield.line')} {finding.line_number}
                    </span>
                  {/if}
                </div>
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {finding.description}
                </p>
              </div>
            </div>

            <span class="px-2 py-0.5 rounded text-[10px] font-mono shrink-0 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 font-bold">
              {finding.rule_name}
            </span>
          </div>

          <!-- Masked Snippet Preview if present -->
          {#if finding.snippet_masked}
            <div class="mt-1 p-2 rounded-lg bg-zinc-900 text-emerald-400 font-mono text-[11px] border border-zinc-800 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 truncate">
                <EyeOff class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span class="truncate select-text">{finding.snippet_masked}</span>
              </div>
              <span class="text-[9px] uppercase tracking-wider text-zinc-500 shrink-0">Masked</span>
            </div>
          {/if}

          <!-- Quick Actions per item -->
          <div class="pt-1 flex items-center justify-end gap-2 text-xs">
            {#if onAddToGitignore && (finding.file_path.includes('.env') || finding.file_path.endsWith('.key') || finding.file_path.endsWith('.pem'))}
              <button
                type="button"
                onclick={() => onAddToGitignore && onAddToGitignore(finding.file_path)}
                class="px-2 py-0.5 rounded text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                + {localeState.t('safety.secretShield.addToGitignore')}
              </button>
            {/if}
            <button
              type="button"
              onclick={() => onUnstageRisky([finding.file_path])}
              class="px-2 py-0.5 rounded text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
            >
              {localeState.t('safety.secretShield.unstageFile')}
            </button>
          </div>
        </div>
      {/each}

      <!-- Fallback / Extra Risky Files (Binaries, etc.) -->
      {#each riskyFiles as item}
        <div class="flex items-start justify-between gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border {item.type === 'secret' ? 'border-rose-200 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-700/60' : 'border-amber-200 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700/60'} transition-colors">
          <div class="flex items-start gap-2.5 min-w-0">
            {#if item.type === 'secret'}
              <div class="mt-0.5 p-1 rounded-md bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400">
                <AlertTriangle class="w-3.5 h-3.5" />
              </div>
            {:else}
              <div class="mt-0.5 p-1 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400">
                <Package class="w-3.5 h-3.5" />
              </div>
            {/if}

            <div class="min-w-0">
              <span class="font-mono text-xs text-zinc-900 dark:text-zinc-100 font-medium truncate block select-text" title={item.path}>
                {item.path}
              </span>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {item.reason}
              </p>
            </div>
          </div>

          <span class="px-2 py-0.5 rounded text-[10px] font-mono shrink-0 {item.type === 'secret' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 font-semibold' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 font-semibold'}">
            {item.type === 'secret' ? localeState.t('safety.preCommit.secretType') : localeState.t('safety.preCommit.binaryType')}
          </span>
        </div>
      {/each}

      <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2.5">
        <ShieldCheck class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>
          {localeState.t('safety.secretShield.safeTip')}
        </span>
      </div>
    </div>

    <!-- Actions Footer -->
    <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
      <button
        type="button"
        onclick={onCancel}
        class="px-3.5 py-1.5 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        {localeState.t('common.cancel')}
      </button>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={onConfirmCommit}
          class="px-3.5 py-1.5 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-700/60 transition-colors cursor-pointer"
          title={localeState.t('safety.preCommit.bypassTitle')}
        >
          {localeState.t('safety.secretShield.bypassWarning')}
        </button>

        <button
          type="button"
          onclick={() => onUnstageRisky(allViolatingPaths)}
          class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
        >
          <span>{localeState.t('safety.secretShield.unstageAllRisky', { count: allViolatingPaths.length })}</span>
          <ArrowRight class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</div>

