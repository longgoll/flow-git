<script lang="ts">
  import type { CurrentRepoIdentity, GitIdentity } from '../types';
  import {
    getCurrentRepoIdentity,
    setRepoIdentity,
    listIdentityProfiles,
    saveIdentityProfile,
    deleteIdentityProfile,
  } from '../api/identity';
  import {
    UserCheck,
    X,
    Plus,
    Trash2,
    Check,
    RefreshCw,
  } from 'lucide-svelte';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    isOpen: boolean;
    repoPath: string;
    onClose: () => void;
    onIdentityChanged?: () => void;
  }

  let { isOpen = false, repoPath = '', onClose, onIdentityChanged }: Props = $props();

  let currentRepoIdentity = $state<CurrentRepoIdentity | null>(null);
  let profiles = $state<GitIdentity[]>([]);
  let isLoading = $state<boolean>(false);

  // Form to create or edit a profile
  let showAddForm = $state<boolean>(false);
  let newLabel = $state<string>('');
  let newName = $state<string>('');
  let newEmail = $state<string>('');
  let applyGlobal = $state<boolean>(false);

  $effect(() => {
    if (isOpen && repoPath) {
      loadData();
    }
  });

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
        'Đã đổi tác giả Git',
        `Áp dụng ${profile.label} (${profile.name} <${profile.email}>)${applyGlobal ? ' toàn cục (Global)' : ' cho repo này'}`
      );
      await loadData();
      onIdentityChanged?.();
      onClose();
    } catch (err: any) {
      toast.error('Không thể đổi hồ sơ', err?.message || err);
    }
  }

  async function handleSaveNewProfile() {
    if (!newLabel.trim() || !newName.trim() || !newEmail.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập đầy đủ tên nhãn, họ tên và email.');
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
      toast.success('Đã lưu hồ sơ mới', `Hồ sơ "${newProfile.label}" đã được thêm vào danh sách.`);
      newLabel = '';
      newName = '';
      newEmail = '';
      showAddForm = false;
      await loadData();
    } catch (err: any) {
      toast.error('Lỗi khi lưu', err?.message || err);
    }
  }

  async function handleDeleteProfile(id: string) {
    try {
      await deleteIdentityProfile(id);
      await loadData();
      toast.info('Đã xóa hồ sơ', 'Hồ sơ đã được gỡ khỏi danh sách.');
    } catch (err: any) {
      toast.error('Lỗi khi xóa', err?.message || err);
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
              Chuyển đổi Hồ sơ Tác giả Git (Identity Switcher)
            </h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Chuyển nhanh giữa tài khoản Công ty và Cá nhân để tránh commit nhầm email
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

      <!-- Current Repo Active Author -->
      <div class="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <span class="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
            Tác giả hiện tại (Repo Local):
          </span>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
              {currentRepoIdentity?.name || 'Chưa cấu hình'}
            </span>
            <span class="text-xs text-teal-600 dark:text-teal-400 font-mono">
              &lt;{currentRepoIdentity?.email || 'no-email'}&gt;
            </span>
            {#if currentRepoIdentity?.is_local}
              <span class="px-1.5 py-0.5 rounded text-[10px] bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-mono font-semibold">
                Local .git/config
              </span>
            {:else}
              <span class="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono border border-zinc-200 dark:border-transparent">
                Kế thừa Global
              </span>
            {/if}
          </div>
        </div>

        <button
          onclick={() => (showAddForm = !showAddForm)}
          class="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-200 dark:border-transparent"
        >
          <Plus class="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Tạo hồ sơ</span>
        </button>
      </div>

      <!-- Add New Profile Form (Collapsible) -->
      {#if showAddForm}
        <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-950/90 border-b border-zinc-200 dark:border-zinc-800 space-y-3 animate-in slide-in-from-top duration-150">
          <h3 class="text-xs font-bold text-zinc-800 dark:text-zinc-300">Thêm hồ sơ mới</h3>
          <div class="grid grid-cols-3 gap-2">
            <input
              type="text"
              bind:value={newLabel}
              placeholder="Tên nhãn (vd: Open Source)"
              class="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-hidden font-sans"
            />
            <input
              type="text"
              bind:value={newName}
              placeholder="Họ và tên Git"
              class="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-hidden font-sans"
            />
            <input
              type="email"
              bind:value={newEmail}
              placeholder="Email commit"
              class="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-hidden font-sans"
            />
          </div>
          <div class="flex items-center justify-end gap-2">
            <button
              onclick={() => (showAddForm = false)}
              class="px-3 py-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs cursor-pointer"
            >
              Hủy
            </button>
            <button
              onclick={handleSaveNewProfile}
              class="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              Lưu hồ sơ
            </button>
          </div>
        </div>
      {/if}

      <!-- Profiles List -->
      <div class="p-6 max-h-[420px] overflow-y-auto space-y-2.5">
        {#if isLoading}
          <div class="py-12 flex flex-col items-center justify-center text-zinc-500 gap-2">
            <RefreshCw class="w-6 h-6 animate-spin text-teal-600 dark:text-teal-400" />
            <span class="text-xs font-mono">Đang tải danh sách hồ sơ tác giả...</span>
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
                        Đang chọn
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
                    Áp dụng
                  </button>
                {/if}

                <button
                  onclick={() => handleDeleteProfile(profile.id)}
                  class="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  title="Xóa hồ sơ này"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
        <label class="flex items-center gap-2 cursor-pointer text-xs text-zinc-600 dark:text-zinc-400 select-none">
          <input
            type="checkbox"
            bind:checked={applyGlobal}
            class="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-teal-600 focus:ring-0 cursor-pointer"
          />
          <span>Áp dụng toàn cục (`git config --global`)</span>
        </label>

        <button
          onclick={onClose}
          class="px-4 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer transition-colors border border-zinc-200 dark:border-transparent"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
{/if}
