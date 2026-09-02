<script lang="ts">
  import type { RemoteInfo } from '../types';
  import {
    getRemotes,
    addRemote,
    removeRemote,
    setRemoteUrl,
    fetchRemote,
  } from '../api/remote';
  import {
    Globe,
    Plus,
    Trash2,
    Edit2,
    RefreshCw,
    X,
    AlertTriangle,
  } from 'lucide-svelte';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    isOpen: boolean;
    repoPath: string;
    onClose: () => void;
    onRemotesChanged?: () => void;
  }

  let { isOpen = false, repoPath = '', onClose, onRemotesChanged }: Props = $props();

  let remotes = $state<RemoteInfo[]>([]);
  let isLoading = $state<boolean>(false);
  let isFetchingName = $state<string | null>(null);

  // Add remote form
  let showAddForm = $state<boolean>(false);
  let newRemoteName = $state<string>('');
  let newRemoteUrl = $state<string>('');
  let isAdding = $state<boolean>(false);

  // Edit remote state
  let editingRemoteName = $state<string | null>(null);
  let editUrl = $state<string>('');
  let isSavingEdit = $state<boolean>(false);

  // Delete remote confirmation
  let deletingRemoteName = $state<string | null>(null);

  $effect(() => {
    if (isOpen && repoPath) {
      loadRemotes();
    }
  });

  async function loadRemotes() {
    if (!repoPath) return;
    isLoading = true;
    try {
      remotes = await getRemotes(repoPath);
    } catch (err: any) {
      console.error('Failed to load remotes:', err);
      toast.error('Lỗi nạp Remote', err?.message || err);
    } finally {
      isLoading = false;
    }
  }

  async function handleAddRemote() {
    const name = newRemoteName.trim();
    const url = newRemoteUrl.trim();
    if (!name || !url) {
      toast.warning('Vui lòng nhập tên và URL remote.');
      return;
    }

    isAdding = true;
    try {
      await addRemote(repoPath, name, url);
      toast.success('Đã thêm Remote', `Thêm remote '${name}' thành công.`);
      newRemoteName = '';
      newRemoteUrl = '';
      showAddForm = false;
      await loadRemotes();
      onRemotesChanged?.();
    } catch (err: any) {
      toast.error('Thêm Remote thất bại', err?.message || err);
    } finally {
      isAdding = false;
    }
  }

  function startEdit(remote: RemoteInfo) {
    editingRemoteName = remote.name;
    editUrl = remote.fetch_url || '';
  }

  async function handleSaveEdit(name: string) {
    const url = editUrl.trim();
    if (!url) {
      toast.warning('URL không được để trống.');
      return;
    }

    isSavingEdit = true;
    try {
      await setRemoteUrl(repoPath, name, url);
      toast.success('Cập nhật thành công', `Đã đổi URL cho remote '${name}'.`);
      editingRemoteName = null;
      await loadRemotes();
      onRemotesChanged?.();
    } catch (err: any) {
      toast.error('Cập nhật URL thất bại', err?.message || err);
    } finally {
      isSavingEdit = false;
    }
  }

  async function handleConfirmDelete(name: string) {
    try {
      await removeRemote(repoPath, name);
      toast.info(`Đã xóa remote '${name}'.`);
      deletingRemoteName = null;
      await loadRemotes();
      onRemotesChanged?.();
    } catch (err: any) {
      toast.error('Xóa remote thất bại', err?.message || err);
    }
  }

  async function handleFetch(name: string) {
    isFetchingName = name;
    try {
      const msg = await fetchRemote(repoPath, name);
      toast.success(`Đã fetch remote '${name}'`, msg);
      onRemotesChanged?.();
    } catch (err: any) {
      toast.error(`Fetch '${name}' thất bại`, err?.message || err);
    } finally {
      isFetchingName = null;
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 bg-black/80 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
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
      class="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Globe class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              Quản trị Đa Remote (Multi-Remote Hub)
            </h2>
            <p class="text-xs text-zinc-400 mt-0.5">
              Quản lý danh sách kho lưu trữ từ xa (origin, upstream, fork)
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 max-h-[480px] overflow-y-auto space-y-4">
        <!-- Remotes List -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Danh sách Remotes ({remotes.length})
            </span>
            {#if !showAddForm}
              <button
                onclick={() => (showAddForm = true)}
                class="px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/60 text-cyan-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus class="w-3 h-3" />
                <span>Thêm Remote mới</span>
              </button>
            {/if}
          </div>

          <!-- Add Form Card -->
          {#if showAddForm}
            <div class="p-4 rounded-xl bg-zinc-950 border border-cyan-500/40 space-y-3 animate-in fade-in duration-150">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-cyan-300">Thêm Remote mới</span>
                <button
                  onclick={() => (showAddForm = false)}
                  class="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label for="remote-name-input" class="block text-[11px] text-zinc-400 mb-1">Tên Remote</label>
                  <input
                    id="remote-name-input"
                    type="text"
                    bind:value={newRemoteName}
                    placeholder="ví dụ: upstream"
                    class="w-full px-2.5 py-1.5 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
                <div class="col-span-2">
                  <label for="remote-url-input" class="block text-[11px] text-zinc-400 mb-1">URL (Git HTTPS hoặc SSH)</label>
                  <input
                    id="remote-url-input"
                    type="text"
                    bind:value={newRemoteUrl}
                    placeholder="https://github.com/owner/repo.git"
                    class="w-full px-2.5 py-1.5 text-xs font-mono bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              <div class="flex items-center justify-end gap-2 pt-1">
                <button
                  onclick={() => (showAddForm = false)}
                  class="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onclick={handleAddRemote}
                  disabled={isAdding}
                  class="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isAdding ? 'Đang thêm...' : 'Lưu Remote'}
                </button>
              </div>
            </div>
          {/if}

          {#if isLoading}
            <div class="py-8 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <RefreshCw class="w-5 h-5 animate-spin text-cyan-400" />
              <span class="text-xs">Đang tải danh sách remotes...</span>
            </div>
          {:else if remotes.length === 0}
            <div class="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center text-zinc-500 text-xs">
              Kho lưu trữ này chưa có Remote nào được cấu hình.
            </div>
          {:else}
            {#each remotes as remote (remote.name)}
              <div class="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700/80 transition-all flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">
                      {remote.name}
                    </span>
                    {#if remote.name === 'origin'}
                      <span class="text-[10px] text-zinc-400 font-mono">(Mặc định)</span>
                    {/if}
                  </div>

                  <div class="flex items-center gap-1.5">
                    <!-- Fetch Button -->
                    <button
                      onclick={() => handleFetch(remote.name)}
                      disabled={isFetchingName === remote.name}
                      class="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-300 text-[11px] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                      title="Fetch cập nhật từ remote này"
                    >
                      <RefreshCw class="w-3 h-3 text-cyan-400 {isFetchingName === remote.name ? 'animate-spin' : ''}" />
                      <span>Fetch</span>
                    </button>

                    <!-- Edit URL Button -->
                    <button
                      onclick={() => startEdit(remote)}
                      class="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
                      title="Sửa URL remote"
                    >
                      <Edit2 class="w-3 h-3" />
                    </button>

                    <!-- Delete Button -->
                    {#if remote.name !== 'origin' || remotes.length > 1}
                      <button
                        onclick={() => (deletingRemoteName = remote.name)}
                        class="p-1 rounded bg-zinc-900 hover:bg-rose-950/50 border border-zinc-700/70 text-zinc-400 hover:text-rose-400 cursor-pointer transition-colors"
                        title="Xóa remote này"
                      >
                        <Trash2 class="w-3 h-3" />
                      </button>
                    {/if}
                  </div>
                </div>

                <!-- URL or Edit Form -->
                {#if editingRemoteName === remote.name}
                  <div class="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      bind:value={editUrl}
                      class="flex-1 px-2 py-1 text-xs font-mono bg-zinc-900 border border-cyan-500 rounded text-zinc-100 outline-hidden"
                    />
                    <button
                      onclick={() => handleSaveEdit(remote.name)}
                      disabled={isSavingEdit}
                      class="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs cursor-pointer"
                    >
                      Lưu
                    </button>
                    <button
                      onclick={() => (editingRemoteName = null)}
                      class="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                {:else}
                  <div class="space-y-0.5 font-mono text-[11px] text-zinc-400 break-all select-text">
                    {#if remote.fetch_url}
                      <div class="flex items-center gap-1 text-zinc-300">
                        <span class="text-zinc-600 text-[10px]">Fetch:</span>
                        <span>{remote.fetch_url}</span>
                      </div>
                    {/if}
                    {#if remote.push_url && remote.push_url !== remote.fetch_url}
                      <div class="flex items-center gap-1 text-zinc-400">
                        <span class="text-zinc-600 text-[10px]">Push:</span>
                        <span>{remote.push_url}</span>
                      </div>
                    {/if}
                  </div>
                {/if}

                <!-- Delete Confirmation Confirmation -->
                {#if deletingRemoteName === remote.name}
                  <div class="mt-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-center justify-between text-xs animate-in fade-in duration-150">
                    <div class="flex items-center gap-1.5 text-rose-300">
                      <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
                      <span>Xác nhận xóa remote '{remote.name}'?</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        onclick={() => (deletingRemoteName = null)}
                        class="px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 text-[11px] cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        onclick={() => handleConfirmDelete(remote.name)}
                        class="px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-medium cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
        <span class="text-[11px] text-zinc-500 font-mono">
          Tip: Đa remote giúp bạn push vào fork riêng và pull cập nhật từ upstream của team.
        </span>
        <button
          onclick={onClose}
          class="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium cursor-pointer transition-colors"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
{/if}
