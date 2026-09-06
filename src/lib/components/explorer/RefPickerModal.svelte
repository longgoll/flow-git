<script lang="ts">
  import type { BranchInfo, CommitNode, TagInfo } from '../../types';
  import {
    GitBranch,
    GitCommit,
    Tag,
    Search,
    X,
    Check,
    FolderGit2,
  } from 'lucide-svelte';

  interface Props {
    isOpen: boolean;
    selectedCommitOid: string | null;
    currentBranchName?: string;
    branches?: BranchInfo[];
    tags?: TagInfo[];
    commits?: CommitNode[];
    onSelect: (target: { commitOid: string | null; label: string }) => void;
    onClose: () => void;
  }

  let {
    isOpen = false,
    selectedCommitOid = null,
    currentBranchName = 'HEAD',
    branches = [],
    tags = [],
    commits = [],
    onSelect,
    onClose,
  }: Props = $props();

  type TabType = 'workingtree' | 'branches' | 'tags' | 'commits';
  let activeTab = $state<TabType>('branches');
  let searchQuery = $state<string>('');

  let filteredBranches = $derived(
    branches.filter(
      (b) =>
        b.shorthand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  let filteredTags = $derived(
    tags.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  let filteredCommits = $derived(
    commits.filter(
      (c) =>
        c.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.short_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.author_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  function handleSelectWorkingTree() {
    onSelect({ commitOid: null, label: 'Working Tree (Live Files)' });
    onClose();
  }

  function handleSelectBranch(b: BranchInfo) {
    onSelect({ commitOid: b.target_commit_id, label: `Branch: ${b.shorthand}` });
    onClose();
  }

  function handleSelectTag(t: TagInfo) {
    onSelect({ commitOid: t.target_commit_id, label: `Tag: ${t.name}` });
    onClose();
  }

  function handleSelectCommit(c: CommitNode) {
    onSelect({ commitOid: c.id, label: `${c.short_id} - ${c.summary.slice(0, 24)}` });
    onClose();
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150 select-none font-sans"
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
      class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 text-zinc-900 dark:text-zinc-100"
    >
      <!-- Header -->
      <div class="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <FolderGit2 class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Chọn Điểm Khám Phá Mã Nguồn (Target Ref)</h3>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">Duyệt live working tree hoặc snapshot tại branch/tag/commit bất kỳ</p>
          </div>
        </div>
        <button
          onclick={onClose}
          class="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Quick Working Tree Card -->
      <div class="p-3 bg-zinc-100/60 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Live Working Tree</span>
          <span class="text-[10px] text-zinc-500 font-mono">({currentBranchName})</span>
        </div>
        <button
          onclick={handleSelectWorkingTree}
          class="px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all {selectedCommitOid === null ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 border border-zinc-200 dark:border-zinc-700'}"
        >
          {selectedCommitOid === null ? 'Đang chọn' : 'Xem Live Files'}
        </button>
      </div>

      <!-- Navigation Tabs & Search -->
      <div class="p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
        <div class="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg text-xs font-medium">
          <button
            onclick={() => { activeTab = 'branches'; searchQuery = ''; }}
            class="flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-all {activeTab === 'branches' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            <GitBranch class="w-3.5 h-3.5" />
            <span>Branches ({branches.length})</span>
          </button>
          <button
            onclick={() => { activeTab = 'tags'; searchQuery = ''; }}
            class="flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-all {activeTab === 'tags' ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 font-semibold shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            <Tag class="w-3.5 h-3.5" />
            <span>Tags ({tags.length})</span>
          </button>
          <button
            onclick={() => { activeTab = 'commits'; searchQuery = ''; }}
            class="flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-all {activeTab === 'commits' ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 font-semibold shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            <GitCommit class="w-3.5 h-3.5" />
            <span>Commits ({commits.length})</span>
          </button>
        </div>

        <div class="relative w-full">
          <Search class="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder={activeTab === 'branches' ? 'Lọc tên nhánh...' : activeTab === 'tags' ? 'Lọc thẻ tag...' : 'Lọc commit message hoặc hash...'}
            class="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <!-- Tab Content List -->
      <div class="flex-1 overflow-y-auto p-2 divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-80">
        {#if activeTab === 'branches'}
          {#if filteredBranches.length === 0}
            <div class="py-8 text-center text-xs text-zinc-400">Không tìm thấy nhánh phù hợp</div>
          {:else}
            {#each filteredBranches as branch}
              {@const isSelected = selectedCommitOid === branch.target_commit_id}
              <button
                onclick={() => handleSelectBranch(branch)}
                class="w-full px-3 py-2 rounded-lg text-left flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer {isSelected ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300'}"
              >
                <div class="flex items-center gap-2 truncate min-w-0">
                  <GitBranch class="w-3.5 h-3.5 {branch.is_head ? 'text-emerald-500' : branch.is_remote ? 'text-indigo-400' : 'text-cyan-500'} shrink-0" />
                  <span class="truncate text-xs font-mono">{branch.shorthand}</span>
                  {#if branch.is_head}
                    <span class="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium">HEAD</span>
                  {/if}
                  {#if branch.is_remote}
                    <span class="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-[10px] font-medium">remote</span>
                  {/if}
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-[10px] text-zinc-400 font-mono">{branch.target_commit_id.slice(0, 7)}</span>
                  {#if isSelected}
                    <Check class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  {/if}
                </div>
              </button>
            {/each}
          {/if}

        {:else if activeTab === 'tags'}
          {#if filteredTags.length === 0}
            <div class="py-8 text-center text-xs text-zinc-400">Không tìm thấy tag phù hợp</div>
          {:else}
            {#each filteredTags as tag}
              {@const isSelected = selectedCommitOid === tag.target_commit_id}
              <button
                onclick={() => handleSelectTag(tag)}
                class="w-full px-3 py-2 rounded-lg text-left flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer {isSelected ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300'}"
              >
                <div class="flex items-center gap-2 truncate min-w-0">
                  <Tag class="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span class="truncate text-xs font-mono">{tag.name}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-[10px] text-zinc-400 font-mono">{tag.target_commit_id.slice(0, 7)}</span>
                  {#if isSelected}
                    <Check class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  {/if}
                </div>
              </button>
            {/each}
          {/if}

        {:else if activeTab === 'commits'}
          {#if filteredCommits.length === 0}
            <div class="py-8 text-center text-xs text-zinc-400">Không tìm thấy commit phù hợp</div>
          {:else}
            {#each filteredCommits as commit}
              {@const isSelected = selectedCommitOid === commit.id}
              <button
                onclick={() => handleSelectCommit(commit)}
                class="w-full px-3 py-2 rounded-lg text-left flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer {isSelected ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 font-semibold' : 'text-zinc-700 dark:text-zinc-300'}"
              >
                <div class="truncate min-w-0 pr-2">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">{commit.short_id}</span>
                    <span class="text-xs text-zinc-800 dark:text-zinc-200 truncate">{commit.summary}</span>
                  </div>
                  <div class="text-[10px] text-zinc-400 mt-0.5">
                    {commit.author_name}
                  </div>
                </div>
                {#if isSelected}
                  <Check class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                {/if}
              </button>
            {/each}
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}
