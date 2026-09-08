<script lang="ts">
  import { repoBindingState } from '../state/repoBindingState.svelte';
  import { localeState } from '../state/localeState.svelte';
  import { listAccounts } from '../api/auth';
  import { listIdentityProfiles } from '../api/identity';
  import type { AccountProfile, GitIdentity, ProjectType } from '../types';

  let {
    repoPath = '',
  }: {
    repoPath: string;
  } = $props();

  let accounts = $state<AccountProfile[]>([]);
  let identities = $state<GitIdentity[]>([]);

  $effect(() => {
    if (repoPath && repoBindingState.shouldShowBanner(repoPath)) {
      loadProfiles();
    }
  });

  async function loadProfiles() {
    try {
      const [accs, idens] = await Promise.all([
        listAccounts(),
        listIdentityProfiles(),
      ]);
      accounts = accs;
      identities = idens;
    } catch (e) {
      console.warn('Banner load profiles error:', e);
    }
  }

  async function handleSelect(tag: ProjectType) {
    await repoBindingState.setQuickTag(repoPath, tag, accounts, identities);
  }

  function handleDismiss() {
    repoBindingState.dismissBanner(repoPath);
  }
</script>

{#if repoPath && repoBindingState.shouldShowBanner(repoPath)}
  <div class="px-4 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between gap-3 text-xs text-indigo-950 dark:text-indigo-200 animate-in fade-in slide-in-from-top-1 duration-150 select-none">
    <div class="flex items-center gap-2 min-w-0">
      <span class="text-base shrink-0">💡</span>
      <span class="font-medium truncate">
        {localeState.t('auth.token.projectTagging.bannerPrompt')}
      </span>
    </div>

    <div class="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onclick={() => handleSelect('work')}
        class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700/50 hover:bg-cyan-50 dark:hover:bg-cyan-900/40 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
      >
        <span>🏢</span>
        <span>{localeState.t('auth.token.projectTagging.tagWorkShort')}</span>
      </button>

      <button
        type="button"
        onclick={() => handleSelect('personal')}
        class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
      >
        <span>👤</span>
        <span>{localeState.t('auth.token.projectTagging.tagPersonalShort')}</span>
      </button>

      <button
        type="button"
        onclick={() => handleSelect('client')}
        class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/40 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
      >
        <span>💼</span>
        <span>{localeState.t('auth.token.projectTagging.tagClientShort')}</span>
      </button>

      <button
        type="button"
        onclick={handleDismiss}
        class="p-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer ml-1"
        title={localeState.t('auth.token.projectTagging.bannerDismiss')}
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </div>
{/if}
