<script lang="ts">
  import type { CurrentRepoIdentity, GitIdentity, SigningConfig } from '../types';
  import {
    getCurrentRepoIdentity,
    setRepoIdentity,
    listIdentityProfiles,
    saveIdentityProfile,
    deleteIdentityProfile,
  } from '../api/identity';
  import { getSigningConfig, setSigningConfig } from '../api/signing';
  import {
    UserCheck,
    X,
    Plus,
    Trash2,
    Check,
    RefreshCw,
    ShieldCheck,
    Key,
    Lock,
  } from 'lucide-svelte';
  import { toast } from '../state/toastState.svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    isOpen: boolean;
    repoPath: string;
    onClose: () => void;
    onIdentityChanged?: () => void;
  }

  let { isOpen = false, repoPath = '', onClose, onIdentityChanged }: Props = $props();

  let activeTab = $state<'profiles' | 'signing'>('profiles');
  let currentRepoIdentity = $state<CurrentRepoIdentity | null>(null);
  let profiles = $state<GitIdentity[]>([]);
  let isLoading = $state<boolean>(false);

  // Signing state
  let signingConfig = $state<SigningConfig | null>(null);
  let isSigningLoading = $state<boolean>(false);
  let signEnabled = $state<boolean>(false);
  let signFormat = $state<'ssh' | 'openpgp'>('ssh');
  let signingKey = $state<string>('');
  let isSavingSigning = $state<boolean>(false);

  // Form to create or edit a profile
  let showAddForm = $state<boolean>(false);
  let newLabel = $state<string>('');
  let newName = $state<string>('');
  let newEmail = $state<string>('');
  let applyGlobal = $state<boolean>(false);

  $effect(() => {
    if (isOpen && repoPath) {
      loadData();
      loadSigningData();
    }
  });

  async function loadSigningData() {
    if (!repoPath) return;
    isSigningLoading = true;
    try {
      const cfg = await getSigningConfig(repoPath);
      signingConfig = cfg;
      signEnabled = cfg.gpg_sign;
      signFormat = cfg.gpg_format === 'ssh' ? 'ssh' : 'openpgp';
      signingKey = cfg.signing_key || '';
      if (!signingKey && cfg.available_ssh_keys.length > 0 && signFormat === 'ssh') {
        signingKey = cfg.available_ssh_keys[0];
      }
    } catch (e) {
      console.error('Failed to load signing config:', e);
    } finally {
      isSigningLoading = false;
    }
  }

  async function handleSaveSigningConfig() {
    if (!repoPath) return;
    isSavingSigning = true;
    try {
      const res = await setSigningConfig(repoPath, signEnabled, signFormat, signingKey, applyGlobal);
      signingConfig = res;
      toast.success(
        localeState.t('auth.signing.saveSuccessTitle'),
        localeState.t('auth.signing.saveSuccessMsg')
      );
    } catch (e: any) {
      toast.error(localeState.t('auth.signing.saveErrorTitle'), e?.message || String(e));
    } finally {
      isSavingSigning = false;
    }
  }

  async function loadData() {
    if (!repoPath) return;
    isLoading = true;
    try {
      const [current, list] = await Promise.all([
        getCurrentRepoIdentity(repoPath),
        listIdentityProfiles(),
      ]);
      currentRepoIdentity = current;
      profiles = list;

      // If list is empty, initialize default suggestions
      if (list.length === 0) {
        profiles = [
          {
            id: 'work',
            label: 'Công ty (Work)',
            name: current?.name || 'Tên Công Việc',
            email: current?.email || 'user@company.com',
          },
          {
            id: 'personal',
            label: 'Cá nhân (Personal)',
            name: current?.name || 'Tên Cá Nhân',
            email: 'user@gmail.com',
          },
        ];
        // Save these defaults
        for (const p of profiles) {
          await saveIdentityProfile(p);
        }
      }
    } catch (err: any) {
      console.error('Failed to load identity data:', err);
    } finally {
      isLoading = false;
    }
  }

  async function handleApplyProfile(profile: GitIdentity) {
    if (!repoPath) return;
    try {
      await setRepoIdentity(repoPath, profile.name, profile.email, applyGlobal);
      toast.success(
        localeState.t('modals.identitySwitcher.applySuccessTitle'),
        localeState.t('modals.identitySwitcher.applySuccessMsg', {
          label: profile.label,
          name: profile.name,
          email: profile.email,
          scope: applyGlobal
            ? localeState.t('modals.identitySwitcher.globalScope')
            : localeState.t('modals.identitySwitcher.repoScope'),
        })
      );
      await loadData();
      onIdentityChanged?.();
      onClose();
    } catch (err: any) {
      toast.error(localeState.t('modals.identitySwitcher.applyError'), err?.message || err);
    }
  }

  async function handleSaveNewProfile() {
    if (!newLabel.trim() || !newName.trim() || !newEmail.trim()) {
      toast.warning(
        localeState.t('modals.identitySwitcher.missingInfoTitle'),
        localeState.t('modals.identitySwitcher.missingInfoMsg')
      );
      return;
    }

    const newProfile: GitIdentity = {
      id: `profile-${Date.now()}`,
      label: newLabel.trim(),
      name: newName.trim(),
      email: newEmail.trim(),
    };

    try {
      await saveIdentityProfile(newProfile);
      toast.success(
        localeState.t('modals.identitySwitcher.saveSuccessTitle'),
        localeState.t('modals.identitySwitcher.saveSuccessMsg', { label: newProfile.label })
      );
      newLabel = '';
      newName = '';
      newEmail = '';
      showAddForm = false;
      await loadData();
    } catch (err: any) {
      toast.error(localeState.t('modals.identitySwitcher.saveError'), err?.message || err);
    }
  }

  async function handleDeleteProfile(id: string) {
    try {
      await deleteIdentityProfile(id);
      await loadData();
      toast.info(
        localeState.t('modals.identitySwitcher.deleteSuccessTitle'),
        localeState.t('modals.identitySwitcher.deleteSuccessMsg')
      );
    } catch (err: any) {
      toast.error(localeState.t('modals.identitySwitcher.deleteError'), err?.message || err);
    }
  }

  function getAvatarColor(label: string): string {
    const l = label.toLowerCase();
    if (l.includes('work') || l.includes('công')) return 'bg-blue-600 text-white';
    if (l.includes('per') || l.includes('cá nhân')) return 'bg-emerald-600 text-white';
    return 'bg-purple-600 text-white';
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose();
    }}
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-inner">
            <UserCheck class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {localeState.t('modals.identitySwitcher.title')}
            </h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {localeState.t('modals.identitySwitcher.subtitle')}
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Tabs (Profiles vs Signing) -->
      <div class="px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 bg-white dark:bg-zinc-900 text-xs font-medium">
        <button
          onclick={() => (activeTab = 'profiles')}
          class="py-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer {activeTab === 'profiles' ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          <UserCheck class="w-3.5 h-3.5" />
          <span>{localeState.t('auth.signing.tabProfiles')}</span>
        </button>
        <button
          onclick={() => (activeTab = 'signing')}
          class="py-2.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer {activeTab === 'signing' ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-semibold' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          <ShieldCheck class="w-3.5 h-3.5" />
          <span>{localeState.t('auth.signing.tabSigning')}</span>
          {#if signingConfig?.gpg_sign}
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          {/if}
        </button>
      </div>

      {#if activeTab === 'profiles'}
        <!-- Current Repo Active Author -->
        <div class="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <span class="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
            {localeState.t('modals.identitySwitcher.currentAuthorLabel')}
          </span>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
              {currentRepoIdentity?.name || localeState.t('modals.identitySwitcher.notConfigured')}
            </span>
            <span class="text-xs text-teal-600 dark:text-teal-400 font-mono">
              &lt;{currentRepoIdentity?.email || 'no-email'}&gt;
            </span>
            {#if currentRepoIdentity?.is_local}
              <span class="px-1.5 py-0.5 rounded text-[10px] bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-mono font-semibold">
                {localeState.t('modals.identitySwitcher.localConfigBadge')}
              </span>
            {:else}
              <span class="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono border border-zinc-200 dark:border-transparent">
                {localeState.t('modals.identitySwitcher.inheritGlobalBadge')}
              </span>
            {/if}
          </div>
        </div>

        <button
          onclick={() => (showAddForm = !showAddForm)}
          class="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-200 dark:border-transparent"
        >
          <Plus class="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>{localeState.t('modals.identitySwitcher.createProfileBtn')}</span>
        </button>
      </div>

      <!-- Add New Profile Form (Collapsible) -->
      {#if showAddForm}
        <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-950/90 border-b border-zinc-200 dark:border-zinc-800 space-y-3 animate-in slide-in-from-top duration-150">
          <h3 class="text-xs font-bold text-zinc-800 dark:text-zinc-300">{localeState.t('modals.identitySwitcher.addFormTitle')}</h3>
          <div class="grid grid-cols-3 gap-2">
            <input
              type="text"
              bind:value={newLabel}
              placeholder={localeState.t('modals.identitySwitcher.labelPlaceholder')}
              class="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-hidden font-sans"
            />
            <input
              type="text"
              bind:value={newName}
              placeholder={localeState.t('modals.identitySwitcher.namePlaceholder')}
              class="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-hidden font-sans"
            />
            <input
              type="email"
              bind:value={newEmail}
              placeholder={localeState.t('modals.identitySwitcher.emailPlaceholder')}
              class="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-hidden font-sans"
            />
          </div>
          <div class="flex items-center justify-end gap-2">
            <button
              onclick={() => (showAddForm = false)}
              class="px-3 py-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs cursor-pointer"
            >
              {localeState.t('common.cancel')}
            </button>
            <button
              onclick={handleSaveNewProfile}
              class="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              {localeState.t('modals.identitySwitcher.saveProfileBtn')}
            </button>
          </div>
        </div>
      {/if}

      <!-- Profiles List -->
      <div class="p-6 max-h-[420px] overflow-y-auto space-y-2.5">
        {#if isLoading}
          <div class="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
            <RefreshCw class="w-6 h-6 animate-spin text-teal-600 dark:text-teal-400" />
            <span class="text-xs font-mono">{localeState.t('modals.identitySwitcher.loadingProfiles')}</span>
          </div>
        {:else}
          {#each profiles as profile (profile.id)}
            {@const isCurrent = currentRepoIdentity?.email === profile.email}
            <div
              class="p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 {isCurrent ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-300 dark:border-teal-700/60 shadow-xs' : 'bg-white dark:bg-zinc-950/70 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}"
            >
              <!-- Avatar & Profile Details -->
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl {getAvatarColor(profile.label)} flex items-center justify-center text-xs font-bold shrink-0 shadow-inner uppercase">
                  {profile.label.slice(0, 2)}
                </div>

                <div class="truncate">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {profile.label}
                    </span>
                    {#if isCurrent}
                      <span class="px-2 py-0.5 rounded-full text-[10px] bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 font-bold flex items-center gap-1 border border-teal-200 dark:border-teal-500/30">
                        <Check class="w-2.5 h-2.5" />
                        {localeState.t('modals.identitySwitcher.activeBadge')}
                      </span>
                    {/if}
                  </div>
                  <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    <span>{profile.name}</span>
                    <span class="text-zinc-400 dark:text-zinc-600">•</span>
                    <span class="font-mono text-zinc-800 dark:text-zinc-300 text-[11px]">{profile.email}</span>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-2 shrink-0">
                {#if !isCurrent}
                  <button
                    onclick={() => handleApplyProfile(profile)}
                    class="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-600/20 hover:bg-teal-100 dark:hover:bg-teal-600/30 text-teal-800 dark:text-teal-300 text-xs font-semibold border border-teal-200 dark:border-teal-500/40 transition-colors cursor-pointer"
                  >
                    {localeState.t('modals.identitySwitcher.applyBtn')}
                  </button>
                {/if}

                <button
                  onclick={() => handleDeleteProfile(profile.id)}
                  class="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title={localeState.t('modals.identitySwitcher.deleteProfileTooltip')}
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
      {:else if activeTab === 'signing'}
        <div class="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {#if isSigningLoading}
            <div class="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <RefreshCw class="w-6 h-6 animate-spin text-teal-600 dark:text-teal-400" />
              <span class="text-xs font-mono">{localeState.t('auth.signing.loadingConfig')}</span>
            </div>
          {:else}
            <!-- Feature explanation banner -->
            <div class="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 flex items-start gap-3">
              <div class="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 shrink-0">
                <ShieldCheck class="w-5 h-5" />
              </div>
              <div class="text-xs space-y-1">
                <h4 class="font-semibold text-zinc-900 dark:text-zinc-100">
                  {localeState.t('auth.signing.bannerTitle')}
                </h4>
                <p class="text-zinc-500 dark:text-zinc-400 leading-relaxed text-[11px]">
                  {localeState.t('auth.signing.bannerDesc')}
                </p>
              </div>
            </div>

            <!-- Toggle commit.gpgsign -->
            <div class="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 flex items-center justify-between">
              <div>
                <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Lock class="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  {localeState.t('auth.signing.enableSigning')}
                </span>
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {localeState.t('auth.signing.enableSigningHint')} (<code>commit.gpgsign</code>)
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={signEnabled}
                  class="sr-only peer"
                />
                <div class="w-10 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            <!-- Format selection (SSH vs OpenPGP) -->
            <div class="space-y-2 {signEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none transition-opacity'}">
              <span class="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {localeState.t('auth.signing.formatLabel')}
              </span>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onclick={() => (signFormat = 'ssh')}
                  class="p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer {signFormat === 'ssh' ? 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-400 dark:border-teal-600 text-teal-900 dark:text-teal-200 shadow-xs' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'}"
                >
                  <Key class="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <div class="text-xs font-semibold flex items-center gap-1.5">
                      SSH Key
                      <span class="text-[9px] px-1 py-0.2 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-mono font-normal">Git 2.34+</span>
                    </div>
                    <p class="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                      {localeState.t('auth.signing.sshDesc')}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onclick={() => (signFormat = 'openpgp')}
                  class="p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer {signFormat === 'openpgp' ? 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-400 dark:border-teal-600 text-teal-900 dark:text-teal-200 shadow-xs' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'}"
                >
                  <ShieldCheck class="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <div class="text-xs font-semibold">GPG / OpenPGP</div>
                    <p class="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                      {localeState.t('auth.signing.gpgDesc')}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <!-- Key selection -->
            <div class="space-y-2 {signEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none transition-opacity'}">
              <span class="block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {signFormat === 'ssh' ? localeState.t('auth.signing.sshKeyPath') : localeState.t('auth.signing.gpgKeyId')}
              </span>

              {#if signFormat === 'ssh'}
                {#if signingConfig?.available_ssh_keys && signingConfig.available_ssh_keys.length > 0}
                  <div class="space-y-1.5">
                    <select
                      bind:value={signingKey}
                      class="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-500 text-zinc-800 dark:text-zinc-200"
                    >
                      {#each signingConfig.available_ssh_keys as k}
                        <option value={k}>{k}</option>
                      {/each}
                      <option value="">{localeState.t('auth.signing.customKeyOption')}</option>
                    </select>
                  </div>
                {/if}
                <input
                  type="text"
                  bind:value={signingKey}
                  placeholder="~/.ssh/id_ed25519.pub hoặc ssh-ed25519 AAAAC3NzaC1..."
                  class="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-500 text-zinc-800 dark:text-zinc-200"
                />
              {:else}
                <input
                  type="text"
                  bind:value={signingKey}
                  placeholder="Ví dụ: 3AA5C34371567BD2 hoặc email@example.com"
                  class="w-full px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-teal-500 text-zinc-800 dark:text-zinc-200"
                />
              {/if}
              <p class="text-[10px] text-zinc-400 dark:text-zinc-500">
                {signFormat === 'ssh' ? localeState.t('auth.signing.sshKeyHint') : localeState.t('auth.signing.gpgKeyHint')}
              </p>
            </div>

            <!-- Save button inside tab -->
            <div class="pt-2 flex justify-end">
              <button
                type="button"
                onclick={handleSaveSigningConfig}
                disabled={isSavingSigning}
                class="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                {#if isSavingSigning}
                  <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                  <span>{localeState.t('auth.signing.saving')}</span>
                {:else}
                  <Check class="w-3.5 h-3.5" />
                  <span>{localeState.t('auth.signing.saveConfig')}</span>
                {/if}
              </button>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Footer -->
      <div class="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
        <label class="flex items-center gap-2 cursor-pointer text-xs text-zinc-600 dark:text-zinc-400 select-none">
          <input
            type="checkbox"
            bind:checked={applyGlobal}
            class="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-teal-600 focus:ring-0 cursor-pointer"
          />
          <span>{localeState.t('modals.identitySwitcher.applyGlobalCheckbox')}</span>
        </label>

        <button
          onclick={onClose}
          class="px-4 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer transition-colors border border-zinc-200 dark:border-transparent"
        >
          {localeState.t('common.close')}
        </button>
      </div>
    </div>
  </div>
{/if}
