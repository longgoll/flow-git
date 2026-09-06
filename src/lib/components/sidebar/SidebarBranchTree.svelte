<script lang="ts">
  import {
    GitBranch,
    Globe,
    ChevronDown,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    Check,
    RefreshCw,
    Trash2,
    Shield,
    Lock,
    Plus,
    CloudUpload,
    Upload,
    MoreVertical,
    X as CloseIcon,
  } from 'lucide-svelte';
  import type { BranchInfo } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  interface Props {
    branches: BranchInfo[];
    showLocalBranches: boolean;
    showRemoteBranches: boolean;
    isPushing?: boolean;
    editingBranchName: string | null;
    inlineNewName: string;
    onSelectBranch?: (branch: BranchInfo) => void;
    onDeleteBranch?: (branch: BranchInfo) => void;
    onRenameConfirm: (branch: BranchInfo) => Promise<void>;
    onRenameCancel: () => void;
    onStartRename: (branch: BranchInfo) => void;
    onPublishBranch?: (branch: BranchInfo) => void;
    onPushBranch?: (branch: BranchInfo, force?: boolean) => void;
    onFetchBranch?: (branch: BranchInfo) => void;
    onFetchPrune?: () => void;
    onCreateBranch?: () => void;
    onCleanMergedBranches?: () => void;
    onOpenContextMenu: (branch: BranchInfo, x: number, y: number) => void;
    isProtectedBranch: (branch: BranchInfo) => boolean;
  }

  let {
    branches = [],
    showLocalBranches = $bindable(true),
    showRemoteBranches = $bindable(true),
    isPushing = false,
    editingBranchName = $bindable(null),
    inlineNewName = $bindable(''),
    onSelectBranch,
    onDeleteBranch,
    onRenameConfirm,
    onRenameCancel,
    onStartRename,
    onPublishBranch,
    onPushBranch,
    onFetchBranch,
    onFetchPrune,
    onCreateBranch,
    onCleanMergedBranches,
    onOpenContextMenu,
    isProtectedBranch,
  }: Props = $props();

  let localBranches = $derived(branches.filter((b) => !b.is_remote));
  let remoteBranches = $derived(branches.filter((b) => b.is_remote));
</script>

<!-- LOCAL BRANCHES -->
<div>
  <div class="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
    <button
      onclick={() => (showLocalBranches = !showLocalBranches)}
      class="flex items-center gap-1.5 cursor-pointer flex-1 text-left"
    >
      <GitBranch class="w-3.5 h-3.5 text-zinc-400" />
      <span>{localeState.t('sidebar.localBranches')}</span>
      <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({localBranches.length})</span>
    </button>
    <div class="flex items-center gap-1">
      {#if onCreateBranch}
        <button
          onclick={(e) => { e.stopPropagation(); onCreateBranch(); }}
          class="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors cursor-pointer"
          title={localeState.t('sidebar.createBranch')}
        >
          <Plus class="w-3 h-3" />
        </button>
      {/if}
      {#if onFetchPrune}
        <button
          onclick={(e) => { e.stopPropagation(); onFetchPrune(); }}
          class="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors cursor-pointer"
          title={localeState.t('sidebar.fetchPruneAll')}
        >
          <RefreshCw class="w-3 h-3" />
        </button>
      {/if}
      {#if onCleanMergedBranches}
        <button
          onclick={(e) => { e.stopPropagation(); onCleanMergedBranches(); }}
          class="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          title={localeState.t('sidebar.cleanMergedBranches')}
        >
          <Trash2 class="w-3 h-3" />
        </button>
      {/if}
      <button
        onclick={() => (showLocalBranches = !showLocalBranches)}
        class="p-0.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 cursor-pointer"
      >
        {#if showLocalBranches}
          <ChevronDown class="w-3.5 h-3.5" />
        {:else}
          <ChevronRight class="w-3.5 h-3.5" />
        {/if}
      </button>
    </div>
  </div>

  {#if showLocalBranches}
    <div class="mt-1 space-y-0.5 pl-1">
      {#each localBranches as branch (branch.name)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          oncontextmenu={(e) => {
            e.preventDefault();
            onOpenContextMenu(branch, Math.min(e.clientX, window.innerWidth - 220), Math.min(e.clientY, window.innerHeight - 260));
          }}
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all group {branch.is_head ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-950 dark:text-cyan-200 font-semibold border border-cyan-200/90 dark:border-cyan-800/60 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-zinc-200'}"
        >
          {#if editingBranchName === branch.shorthand}
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
            <div class="flex items-center gap-1.5 flex-1 pr-1" onclick={(e) => e.stopPropagation()}>
              <!-- svelte-ignore a11y_autofocus -->
              <input
                type="text"
                bind:value={inlineNewName}
                autofocus
                onkeydown={(e) => {
                  if (e.key === 'Enter') onRenameConfirm(branch);
                  if (e.key === 'Escape') onRenameCancel();
                }}
                class="w-full px-1.5 py-0.5 text-[11px] font-mono bg-white dark:bg-zinc-900 text-zinc-900 dark:text-cyan-200 border border-cyan-500 rounded outline-hidden focus:ring-1 focus:ring-cyan-400"
                placeholder="New branch name..."
              />
              <button
                onclick={() => onRenameConfirm(branch)}
                class="p-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-600/50 cursor-pointer"
                title="Lưu tên mới (Enter)"
              >
                <Check class="w-3 h-3" />
              </button>
              <button
                onclick={onRenameCancel}
                class="p-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer"
                title="Hủy (Esc)"
              >
                <CloseIcon class="w-3 h-3" />
              </button>
            </div>
          {:else}
            <button
              onclick={() => onSelectBranch?.(branch)}
              ondblclick={(e) => {
                e.stopPropagation();
                onStartRename(branch);
              }}
              class="flex items-center gap-2 truncate pr-1 flex-1 text-left cursor-pointer"
              title="Nhấp đúp để đổi tên nhánh (Double-click to rename)"
            >
              {#if branch.is_head}
                <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {:else}
                <span class="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600 group-hover:bg-zinc-600 dark:group-hover:bg-zinc-400 shrink-0"></span>
              {/if}
              <span class="truncate font-mono text-[11px]">{branch.shorthand}</span>
            </button>
          {/if}

          <div class="flex items-center gap-1 shrink-0">
            <!-- If no upstream configured: show Publish button -->
            {#if !branch.upstream_name}
              <button
                onclick={(e) => { e.stopPropagation(); onPublishBranch?.(branch); }}
                disabled={isPushing}
                class="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 hover:bg-cyan-200 dark:hover:bg-cyan-900 border border-cyan-300 dark:border-cyan-700/60 text-cyan-800 dark:text-cyan-300 hover:text-cyan-950 dark:hover:text-white text-[10px] font-medium transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title={`Publish nhánh "${branch.shorthand}" lên remote origin (git push -u origin ${branch.shorthand})`}
              >
                <CloudUpload class="w-3 h-3 text-cyan-600 dark:text-cyan-400 {isPushing ? 'animate-bounce' : ''}" />
                <span class="text-[9px] font-mono font-semibold">Publish</span>
              </button>
            {:else}
              <!-- Ahead / Behind Badge -->
              {#if branch.ahead_count > 0 || branch.behind_count > 0}
                <div class="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-400 shrink-0">
                  {#if branch.ahead_count > 0}
                    <span class="flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ArrowUp class="w-2.5 h-2.5" />{branch.ahead_count}
                    </span>
                  {/if}
                  {#if branch.behind_count > 0}
                    <span class="flex items-center text-amber-600 dark:text-amber-400 font-semibold">
                      <ArrowDown class="w-2.5 h-2.5" />{branch.behind_count}
                    </span>
                  {/if}
                </div>
              {/if}

              <!-- Push to upstream button -->
              {#if onPushBranch}
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    if (branch.ahead_count > 0) {
                      onPushBranch?.(branch);
                    }
                  }}
                  disabled={isPushing || branch.ahead_count === 0}
                  class="{branch.ahead_count > 0
                    ? 'flex p-1 rounded bg-emerald-100 dark:bg-emerald-950/70 hover:bg-emerald-200 dark:hover:bg-emerald-900/90 border border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 cursor-pointer shadow-xs'
                    : 'opacity-0 group-hover:opacity-25 hidden group-hover:flex p-1 rounded text-zinc-400 dark:text-zinc-500 cursor-not-allowed'} transition-all"
                  title={branch.ahead_count > 0
                    ? `Push ${branch.ahead_count} commit mới lên ${branch.upstream_name || 'origin'}`
                    : `Đã đồng bộ mới nhất (Không có commit nào để push)`}
                >
                  <Upload class="w-3 h-3" />
                </button>
              {/if}

              {#if onFetchBranch}
                <button
                  onclick={(e) => { e.stopPropagation(); onFetchBranch(branch); }}
                  class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-cyan-100 dark:hover:bg-cyan-950/60 text-zinc-400 dark:text-zinc-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all cursor-pointer"
                  title={`Đồng bộ / Fetch nhánh ${branch.shorthand}`}
                >
                  <RefreshCw class="w-3 h-3" />
                </button>
              {/if}
            {/if}

            <!-- Branch Actions Menu Button (3-dots) -->
            <button
              onclick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onOpenContextMenu(branch, Math.min(rect.right, window.innerWidth - 220), Math.min(rect.bottom + 4, window.innerHeight - 260));
              }}
              class="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-all cursor-pointer"
              title="Tùy chọn nhánh"
            >
              <MoreVertical class="w-3 h-3" />
            </button>

            {#if !branch.is_head && onDeleteBranch}
              {#if isProtectedBranch(branch)}
                <div
                  class="opacity-0 group-hover:opacity-100 p-0.5 text-amber-500/80 dark:text-amber-400/70 shrink-0"
                  title="Nhánh cốt lõi (Protected Branch)"
                >
                  <Shield class="w-3 h-3" />
                </div>
              {/if}
              <button
                onclick={(e) => { e.stopPropagation(); onDeleteBranch(branch); }}
                class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer shrink-0"
                title={`Xóa nhánh ${branch.shorthand}${isProtectedBranch(branch) ? ' (Cần gõ tên xác nhận)' : ''}`}
              >
                <Trash2 class="w-3 h-3" />
              </button>
            {/if}
          </div>
        </div>
      {/each}
      {#if localBranches.length === 0}
        <div class="px-2 py-1 text-[11px] text-zinc-400 dark:text-zinc-600 italic">No local branches</div>
      {/if}
    </div>
  {/if}
</div>

<!-- REMOTE BRANCHES -->
<div>
  <div class="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
    <button
      onclick={() => (showRemoteBranches = !showRemoteBranches)}
      class="flex items-center gap-1.5 cursor-pointer flex-1 text-left"
    >
      <Globe class="w-3.5 h-3.5 text-zinc-400" />
      <span>{localeState.t('sidebar.remoteBranches')}</span>
      <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({remoteBranches.length})</span>
    </button>
    <div class="flex items-center gap-1">
      {#if onFetchPrune}
        <button
          onclick={(e) => { e.stopPropagation(); onFetchPrune(); }}
          class="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-purple-600 dark:hover:text-purple-300 transition-colors cursor-pointer"
          title="Fetch & Prune (Dọn dẹp các nhánh remote đã bị xóa)"
        >
          <RefreshCw class="w-3 h-3" />
        </button>
      {/if}
      <button
        onclick={() => (showRemoteBranches = !showRemoteBranches)}
        class="p-0.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 cursor-pointer"
      >
        {#if showRemoteBranches}
          <ChevronDown class="w-3.5 h-3.5" />
        {:else}
          <ChevronRight class="w-3.5 h-3.5" />
        {/if}
      </button>
    </div>
  </div>

  {#if showRemoteBranches}
    <div class="mt-1 space-y-0.5 pl-1">
      {#each remoteBranches as branch (branch.name)}
        <div class="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/60 hover:text-zinc-950 dark:hover:text-zinc-200 transition-colors group">
          <div class="flex items-center gap-2 truncate flex-1">
            <span class="w-1.5 h-1.5 rounded-full bg-purple-500/60 shrink-0"></span>
            <span class="truncate font-mono text-[11px]">{branch.shorthand}</span>
          </div>
          {#if onDeleteBranch}
            {#if isProtectedBranch(branch)}
              <div
                class="opacity-0 group-hover:opacity-100 p-0.5 text-purple-600/70 dark:text-purple-400/60 shrink-0"
                title="Nhánh Remote cốt lõi (Protected Upstream Branch)"
              >
                <Lock class="w-3 h-3" />
              </div>
            {/if}
            <button
              onclick={(e) => { e.stopPropagation(); onDeleteBranch(branch); }}
              class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer shrink-0"
              title={`Xóa reference remote ${branch.shorthand}${isProtectedBranch(branch) ? ' (Cần gõ tên xác nhận)' : ''}`}
            >
              <Trash2 class="w-3 h-3" />
            </button>
          {/if}
        </div>
      {/each}
      {#if remoteBranches.length === 0}
        <div class="px-2 py-1 text-[11px] text-zinc-400 dark:text-zinc-600 italic">No remote branches</div>
      {/if}
    </div>
  {/if}
</div>
