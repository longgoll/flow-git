<script lang="ts">
  import { repoBindingState } from '../state/repoBindingState.svelte';
  import { localeState } from '../state/localeState.svelte';
  import { listAccounts } from '../api/auth';
  import { listIdentityProfiles, setRepoIdentity } from '../api/identity';
  import type { AccountProfile, GitIdentity, ProjectType, RepoBinding } from '../types';

  let {
    repoPath = '',
    compact = false,
  }: {
    repoPath: string;
    compact?: boolean;
  } = $props();

  let isOpen = $state(false);
  let accounts = $state<AccountProfile[]>([]);
  let identities = $state<GitIdentity[]>([]);

  let selectedTag = $state<ProjectType>('work');
  let selectedAccountId = $state<string>('');
  let selectedIdentityId = $state<string>('');

  let currentBinding = $derived(repoBindingState.bindings[repoPath] || null);
  let currentTag = $derived(currentBinding?.project_type || null);

  async function openConfigModal() {
    isOpen = true;
    try {
      const [accList, idenList] = await Promise.all([
        listAccounts(),
        listIdentityProfiles(),
      ]);
      accounts = accList;
      identities = idenList;

      if (currentBinding) {
        selectedTag = currentBinding.project_type;
        selectedAccountId = currentBinding.account_id || '';
        selectedIdentityId = currentBinding.identity_id || '';
      } else {
        selectedTag = 'work';
        selectedAccountId = '';
        selectedIdentityId = '';
      }
    } catch (e) {
      console.warn('Failed to load accounts/identities:', e);
    }
  }

  async function handleSave() {
    if (!repoPath) return;

    const binding: RepoBinding = {
      repo_path: repoPath,
      project_type: selectedTag,
      account_id: selectedAccountId || null,
      identity_id: selectedIdentityId || null,
      updated_at: Math.floor(Date.now() / 1000),
    };

    await repoBindingState.save(binding);

    // Apply author identity locally if selected
    if (selectedIdentityId) {
      const iden = identities.find((i) => i.id === selectedIdentityId);
      if (iden) {
        try {
          await setRepoIdentity(repoPath, iden.name, iden.email, false);
        } catch (e) {
          console.warn('Failed to set local repo identity:', e);
        }
      }
    }

    isOpen = false;
  }

  function getTagDetails(tag: ProjectType | null) {
    switch (tag) {
      case 'work':
        return {
          icon: '🏢',
          label: localeState.t('auth.token.projectTagging.tagWorkShort'),
          fullLabel: localeState.t('auth.token.projectTagging.tagWork'),
          classes: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/50 hover:bg-cyan-100 dark:hover:bg-cyan-900/40',
        };
      case 'personal':
        return {
          icon: '👤',
          label: localeState.t('auth.token.projectTagging.tagPersonalShort'),
          fullLabel: localeState.t('auth.token.projectTagging.tagPersonal'),
          classes: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
        };
      case 'client':
        return {
          icon: '💼',
          label: localeState.t('auth.token.projectTagging.tagClientShort'),
          fullLabel: localeState.t('auth.token.projectTagging.tagClient'),
          classes: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-900/40',
        };
      case 'opensource':
        return {
          icon: '🚀',
          label: localeState.t('auth.token.projectTagging.tagOpenSourceShort'),
          fullLabel: localeState.t('auth.token.projectTagging.tagOpenSource'),
          classes: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700/50 hover:bg-purple-100 dark:hover:bg-purple-900/40',
        };
      case 'other':
        return {
          icon: '🏷️',
          label: localeState.t('auth.token.projectTagging.tagOtherShort'),
          fullLabel: localeState.t('auth.token.projectTagging.tagOther'),
          classes: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700',
        };
      default:
        return {
          icon: '🏷️',
          label: localeState.t('auth.token.projectTagging.unassigned'),
          fullLabel: localeState.t('auth.token.projectTagging.selectTag'),
          classes: 'bg-transparent text-neutral-500 dark:text-neutral-400 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/40',
        };
    }
  }

  const tagInfo = $derived(getTagDetails(currentTag));
</script>

<!-- Tag Badge Trigger -->
<button
  type="button"
  onclick={openConfigModal}
  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer select-none {tagInfo.classes}"
  title={localeState.t('auth.token.projectTagging.changeIdentityTooltip')}
>
  <span class="text-xs">{tagInfo.icon}</span>
  {#if !compact}
    <span>{tagInfo.label}</span>
  {/if}
</button>

<!-- Configuration Popover Modal -->
{#if isOpen}
  <div
    class="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-xs z-[110] flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) isOpen = false;
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') isOpen = false;
    }}
  >
    <div
      class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100"
    >
      <!-- Modal Header -->
      <div class="px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/60">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-xs">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </div>
          <div>
            <h3 class="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              {localeState.t('auth.token.projectTagging.headerTitle')}
            </h3>
            <p class="text-[11px] text-neutral-500 dark:text-neutral-400">
              {localeState.t('auth.token.projectTagging.headerDesc')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onclick={() => (isOpen = false)}
          aria-label={localeState.t('common.close')}
          class="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 space-y-4 text-xs">
        <!-- 1. Select Tag -->
        <div class="space-y-1.5">
          <span class="font-semibold text-neutral-700 dark:text-neutral-300 block">
            {localeState.t('auth.token.projectTagging.selectTag')}:
          </span>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              onclick={() => (selectedTag = 'work')}
              class="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer {selectedTag === 'work'
                ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-cyan-900 dark:text-cyan-100 ring-2 ring-cyan-500/20 font-semibold shadow-xs'
                : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900'}"
            >
              <span class="text-base">🏢</span>
              <div>
                <span class="block text-xs">{localeState.t('auth.token.projectTagging.tagWorkShort')}</span>
                <span class="block text-[10px] text-neutral-400">GitLab / Company</span>
              </div>
            </button>

            <button
              type="button"
              onclick={() => (selectedTag = 'personal')}
              class="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer {selectedTag === 'personal'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20 font-semibold shadow-xs'
                : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900'}"
            >
              <span class="text-base">👤</span>
              <div>
                <span class="block text-xs">{localeState.t('auth.token.projectTagging.tagPersonalShort')}</span>
                <span class="block text-[10px] text-neutral-400">GitHub / Personal</span>
              </div>
            </button>

            <button
              type="button"
              onclick={() => (selectedTag = 'client')}
              class="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer {selectedTag === 'client'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/20 font-semibold shadow-xs'
                : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900'}"
            >
              <span class="text-base">💼</span>
              <div>
                <span class="block text-xs">{localeState.t('auth.token.projectTagging.tagClientShort')}</span>
                <span class="block text-[10px] text-neutral-400">Freelance / Client</span>
              </div>
            </button>

            <button
              type="button"
              onclick={() => (selectedTag = 'opensource')}
              class="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer {selectedTag === 'opensource'
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-100 ring-2 ring-purple-500/20 font-semibold shadow-xs'
                : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900'}"
            >
              <span class="text-base">🚀</span>
              <div>
                <span class="block text-xs">{localeState.t('auth.token.projectTagging.tagOpenSourceShort')}</span>
                <span class="block text-[10px] text-neutral-400">Public Repos</span>
              </div>
            </button>
          </div>
        </div>

        <!-- 2. Select Git Account -->
        <div class="space-y-1.5 pt-1">
          <label for="acc-select" class="font-semibold text-neutral-700 dark:text-neutral-300 block">
            {localeState.t('auth.token.projectTagging.assignedAccountLabel')}
          </label>
          <select
            id="acc-select"
            bind:value={selectedAccountId}
            class="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-indigo-500"
          >
            <option value="">{localeState.t('auth.token.projectTagging.autoDetectAccount')}</option>
            {#each accounts as acc (acc.id)}
              <option value={acc.id}>
                {acc.provider.toUpperCase()}: @{acc.username} {acc.name ? `(${acc.name})` : ''}
              </option>
            {/each}
          </select>
        </div>

        <!-- 3. Select Author Identity -->
        <div class="space-y-1.5 pt-1">
          <label for="iden-select" class="font-semibold text-neutral-700 dark:text-neutral-300 block">
            {localeState.t('auth.token.projectTagging.assignedIdentityLabel')}
          </label>
          <select
            id="iden-select"
            bind:value={selectedIdentityId}
            class="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-indigo-500"
          >
            <option value="">{localeState.t('auth.token.projectTagging.autoDetectIdentity')}</option>
            {#each identities as iden (iden.id)}
              <option value={iden.id}>
                {iden.label}: {iden.name} &lt;{iden.email}&gt;
              </option>
            {/each}
          </select>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-end gap-2">
        <button
          type="button"
          onclick={() => (isOpen = false)}
          class="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
        >
          {localeState.t('common.cancel')}
        </button>
        <button
          type="button"
          onclick={handleSave}
          class="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          {localeState.t('common.save')}
        </button>
      </div>
    </div>
  </div>
{/if}
