<script lang="ts">
  import type { LayoutMode, PickaxeSearchResult } from '../../types';
  import { localeState } from '../../state/localeState.svelte';
  import { searchCommitsPickaxe } from '../../api/repo';
  import {
    Search,
    X,
    GitMerge,
    UserCheck,
    User,
    Calendar,
    RotateCcw,
    Check,
    ChevronDown,
    Rows2,
    Columns3,
    Code2,
    Loader2,
    FileText,
    SlidersHorizontal,
  } from 'lucide-svelte';

  interface Props {
    searchQuery: string;
    repoPath?: string;
    filterHideMerges?: boolean;
    filterMyCommits?: boolean;
    layoutMode?: LayoutMode;
    authors?: Array<{ name: string; email: string; count: number }>;
    filterAuthor?: string;
    filterDateRange?: 'all' | '24h' | '7d' | '30d' | 'custom';
    filterDateFrom?: string | null;
    filterDateTo?: string | null;
    onSearchChange: (query: string) => void;
    onSelectCommit?: (commitId: string) => void;
    onToggleHideMerges?: () => void;
    onToggleMyCommits?: () => void;
    onSelectAuthor?: (author: string) => void;
    onSelectDateRange?: (range: 'all' | '24h' | '7d' | '30d' | 'custom') => void;
    onSetCustomDates?: (from: string | null, to: string | null) => void;
    onClearAllFilters?: () => void;
    onChangeLayoutMode?: (mode: LayoutMode) => void;
  }

  let {
    searchQuery = $bindable(''),
    repoPath = '',
    filterHideMerges = false,
    filterMyCommits = false,
    layoutMode = 'horizontal',
    authors = [],
    filterAuthor = '',
    filterDateRange = 'all',
    filterDateFrom = null,
    filterDateTo = null,
    onSearchChange,
    onSelectCommit,
    onToggleHideMerges,
    onToggleMyCommits,
    onSelectAuthor,
    onSelectDateRange,
    onSetCustomDates,
    onClearAllFilters,
    onChangeLayoutMode,
  }: Props = $props();

  let isAuthorMenuOpen = $state<boolean>(false);
  let isDateMenuOpen = $state<boolean>(false);
  let authorSearch = $state<string>('');

  let customFrom = $state<string>('');
  let customTo = $state<string>('');

  $effect(() => {
    customFrom = filterDateFrom || '';
    customTo = filterDateTo || '';
  });

  let filteredAuthors = $derived.by(() => {
    if (!authorSearch.trim()) return authors;
    const q = authorSearch.toLowerCase().trim();
    return authors.filter(
      (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
    );
  });

  let hasActiveFilters = $derived(
    Boolean(
      searchQuery.trim() ||
      filterHideMerges ||
      filterMyCommits ||
      filterAuthor ||
      filterDateRange !== 'all'
    )
  );

  let isPickaxeMode = $state<boolean>(false);
  let isPickaxeLoading = $state<boolean>(false);
  let pickaxeResults = $state<PickaxeSearchResult[]>([]);
  let isPickaxeDropdownOpen = $state<boolean>(false);
  let isFilterPopoverOpen = $state<boolean>(false);
  let pickaxeDebounceTimer: any = null;

  let activeFilterCount = $derived(
    (filterHideMerges ? 1 : 0) +
    (filterMyCommits ? 1 : 0) +
    (filterAuthor ? 1 : 0) +
    (filterDateRange !== 'all' ? 1 : 0) +
    (isPickaxeMode ? 1 : 0)
  );

  async function triggerPickaxeSearch() {
    if (!repoPath || !searchQuery.trim()) {
      pickaxeResults = [];
      isPickaxeDropdownOpen = false;
      return;
    }
    isPickaxeLoading = true;
    try {
      pickaxeResults = await searchCommitsPickaxe(repoPath, searchQuery.trim(), false, 30);
      isPickaxeDropdownOpen = true;
    } catch (err) {
      console.error('Pickaxe search error:', err);
      pickaxeResults = [];
    } finally {
      isPickaxeLoading = false;
    }
  }

  function togglePickaxeMode() {
    isPickaxeMode = !isPickaxeMode;
    if (isPickaxeMode && searchQuery.trim()) {
      triggerPickaxeSearch();
    } else {
      isPickaxeDropdownOpen = false;
      pickaxeResults = [];
    }
  }

  function handleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    searchQuery = val;
    onSearchChange(val);

    if (isPickaxeMode) {
      clearTimeout(pickaxeDebounceTimer);
      if (val.trim()) {
        pickaxeDebounceTimer = setTimeout(() => {
          triggerPickaxeSearch();
        }, 350);
      } else {
        pickaxeResults = [];
        isPickaxeDropdownOpen = false;
      }
    }
  }

  function handleSelectPickaxeCommit(commitId: string) {
    isPickaxeDropdownOpen = false;
    if (onSelectCommit) {
      onSelectCommit(commitId);
    } else {
      searchQuery = commitId;
      onSearchChange(commitId);
    }
  }

  function applyCustomDate() {
    if (onSetCustomDates) {
      onSetCustomDates(customFrom || null, customTo || null);
    }
    isDateMenuOpen = false;
  }
</script>

<div class="flex items-center gap-1.5 shrink-0">
  <!-- Commit Search Filter -->
  <div class="relative min-w-[50px] w-20 sm:w-24 md:w-28 lg:w-32 focus-within:!w-40 transition-all duration-150 shrink-0">
    <Search class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-2 top-2 pointer-events-none" />
    <input
      type="text"
      placeholder={isPickaxeMode ? 'Diff (-S)...' : localeState.t('toolbar.filterPlaceholder')}
      value={searchQuery}
      oninput={handleInput}
      class="w-full bg-zinc-100 dark:bg-zinc-900/70 hover:bg-zinc-200/60 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-900 border {isPickaxeMode ? 'border-cyan-500/80 bg-cyan-500/5 ring-1 ring-cyan-500/20' : 'border-zinc-200 dark:border-zinc-800/80 focus:border-cyan-500/60'} rounded-md pl-7 pr-6 py-1 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
    />
    {#if searchQuery}
      <button
        onclick={() => { searchQuery = ''; onSearchChange(''); pickaxeResults = []; isPickaxeDropdownOpen = false; }}
        class="absolute right-1 top-1 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
        title={localeState.t('toolbar.clearFilter')}
      >
        <X class="w-3 h-3" />
      </button>
    {/if}

    <!-- Pickaxe Results Popover -->
    {#if isPickaxeMode && isPickaxeDropdownOpen}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="fixed inset-0 z-40" onclick={() => (isPickaxeDropdownOpen = false)}></div>
      <div class="absolute left-0 top-8 w-80 max-h-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-100">
        <div class="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px]">
          <span class="font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
            <Code2 class="w-3.5 h-3.5" />
            Pickaxe Results (-S)
          </span>
          <span class="text-zinc-500">{pickaxeResults.length} commits</span>
        </div>
        <div class="flex-1 overflow-y-auto p-1 divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {#if isPickaxeLoading}
            <div class="p-6 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs font-mono">
              <Loader2 class="w-5 h-5 animate-spin text-cyan-500" />
              <span>Scanning diffs...</span>
            </div>
          {:else if pickaxeResults.length === 0}
            <div class="p-6 text-center text-zinc-500 text-xs font-mono">
              Không tìm thấy commit nào có thay đổi chứa "{searchQuery}".
            </div>
          {:else}
            {#each pickaxeResults as match}
              <button
                onclick={() => handleSelectPickaxeCommit(match.commit_id)}
                class="w-full text-left p-2 hover:bg-cyan-50/60 dark:hover:bg-cyan-950/40 rounded-lg transition-colors cursor-pointer group"
              >
                <div class="flex items-center justify-between text-xs font-mono">
                  <span class="font-bold text-cyan-600 dark:text-cyan-400">{match.short_id}</span>
                  <span class="text-[10px] text-zinc-500 truncate max-w-[120px]">{match.author_name}</span>
                </div>
                <div class="text-xs text-zinc-800 dark:text-zinc-200 font-medium truncate mt-0.5">
                  {match.summary}
                </div>
                <div class="mt-1 space-y-0.5 font-mono text-[10px]">
                  {#each match.matched_files.slice(0, 2) as file}
                    <div class="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 truncate">
                      <FileText class="w-2.5 h-2.5 shrink-0 text-cyan-500" />
                      <span class="truncate">{file.path}</span>
                      <span class="text-emerald-600 dark:text-emerald-400 shrink-0">+{file.additions}</span>
                      <span class="text-rose-600 dark:text-rose-400 shrink-0">-{file.deletions}</span>
                    </div>
                  {/each}
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Unified Filters Popover Button -->
  <div class="relative shrink-0">
    <button
      onclick={() => (isFilterPopoverOpen = !isFilterPopoverOpen)}
      class="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer {activeFilterCount > 0 ? 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-300 dark:border-cyan-700/60 text-cyan-800 dark:text-cyan-300 shadow-2xs font-semibold' : 'bg-zinc-100 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
      title="Bộ lọc commit"
    >
      <SlidersHorizontal class="w-3.5 h-3.5 {activeFilterCount > 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-400'}" />
      {#if activeFilterCount > 0}
        <span class="w-4 h-4 rounded-full bg-cyan-600 text-white font-mono text-[9px] flex items-center justify-center font-bold">
          {activeFilterCount}
        </span>
      {/if}
      <ChevronDown class="w-2.5 h-2.5 opacity-60 transition-transform {isFilterPopoverOpen ? 'rotate-180' : ''}" />
    </button>

    {#if isFilterPopoverOpen}
      <!-- Backdrop -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="fixed inset-0 z-40" onclick={() => (isFilterPopoverOpen = false)}></div>

      <!-- Popover Menu -->
      <div class="absolute right-0 mt-1 w-64 max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 p-2.5 text-xs font-sans animate-in fade-in zoom-in-95 duration-100 space-y-2">
        <div class="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800/80">
          <span class="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <SlidersHorizontal class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Bộ lọc commit
          </span>
          {#if hasActiveFilters && onClearAllFilters}
            <button
              onclick={() => {
                onClearAllFilters();
                isFilterPopoverOpen = false;
              }}
              class="text-[10px] text-rose-600 hover:text-rose-500 font-medium cursor-pointer"
            >
              Đặt lại
            </button>
          {/if}
        </div>

        <!-- Quick Toggles -->
        <div class="space-y-1">
          {#if onToggleHideMerges}
            <button
              type="button"
              onclick={onToggleHideMerges}
              class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer {filterHideMerges ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-medium' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
            >
              <span class="flex items-center gap-2">
                <GitMerge class="w-3.5 h-3.5 {filterHideMerges ? 'text-amber-600' : 'text-zinc-400'}" />
                {localeState.t('toolbar.hideMergesActive')}
              </span>
              {#if filterHideMerges}
                <Check class="w-3.5 h-3.5 text-amber-600" />
              {/if}
            </button>
          {/if}

          {#if onToggleMyCommits}
            <button
              type="button"
              onclick={onToggleMyCommits}
              class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer {filterMyCommits ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 font-medium' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
            >
              <span class="flex items-center gap-2">
                <UserCheck class="w-3.5 h-3.5 {filterMyCommits ? 'text-cyan-600' : 'text-zinc-400'}" />
                {localeState.t('toolbar.myCommitsActive')}
              </span>
              {#if filterMyCommits}
                <Check class="w-3.5 h-3.5 text-cyan-600" />
              {/if}
            </button>
          {/if}

          <button
            type="button"
            onclick={togglePickaxeMode}
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer {isPickaxeMode ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 font-medium' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
          >
            <span class="flex items-center gap-2">
              <Code2 class="w-3.5 h-3.5 {isPickaxeMode ? 'text-cyan-600' : 'text-zinc-400'}" />
              Tìm diff code (-S)
            </span>
            {#if isPickaxeMode}
              <Check class="w-3.5 h-3.5 text-cyan-600" />
            {/if}
          </button>
        </div>

        <!-- Filter Author Selector Button -->
        {#if onSelectAuthor}
          <div class="pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
            <div class="text-[10px] font-semibold text-zinc-400 uppercase mb-1">Tác giả</div>
            <button
              type="button"
              onclick={() => {
                isAuthorMenuOpen = true;
                isFilterPopoverOpen = false;
              }}
              class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-left cursor-pointer"
            >
              <div class="flex items-center gap-1.5 truncate pr-1">
                <User class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span class="truncate">{filterAuthor ? (authors.find(a => a.email === filterAuthor || a.name === filterAuthor)?.name || filterAuthor) : 'Tất cả tác giả'}</span>
              </div>
              <ChevronDown class="w-3 h-3 text-zinc-400 shrink-0" />
            </button>
          </div>
        {/if}

        <!-- Filter Date Range Selector Button -->
        {#if onSelectDateRange}
          <div class="pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
            <div class="text-[10px] font-semibold text-zinc-400 uppercase mb-1">Khoảng ngày</div>
            <button
              type="button"
              onclick={() => {
                isDateMenuOpen = true;
                isFilterPopoverOpen = false;
              }}
              class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-left cursor-pointer"
            >
              <div class="flex items-center gap-1.5 truncate pr-1">
                <Calendar class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span class="truncate">{filterDateRange === 'all' ? 'Toàn thời gian' : filterDateRange}</span>
              </div>
              <ChevronDown class="w-3 h-3 text-zinc-400 shrink-0" />
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Author Sub-Popover -->
    {#if isAuthorMenuOpen}
      <!-- Backdrop -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="fixed inset-0 z-40" onclick={() => (isAuthorMenuOpen = false)}></div>

      <!-- Popover -->
      <div class="absolute right-0 mt-1 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-2 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
        <div class="mb-2">
          <input
            type="text"
            placeholder="Search author..."
            bind:value={authorSearch}
            class="w-full px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md outline-hidden focus:border-cyan-500"
          />
        </div>

        <div class="max-h-56 overflow-y-auto space-y-0.5">
          <!-- All Authors option -->
          <button
            onclick={() => {
              onSelectAuthor?.('');
              isAuthorMenuOpen = false;
            }}
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer {!filterAuthor ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 font-semibold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
          >
            <span>{localeState.t('toolbar.allAuthors')}</span>
            {#if !filterAuthor}
              <Check class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            {/if}
          </button>

          <!-- Individual authors -->
          {#each filteredAuthors as a}
            {@const isSelected = filterAuthor === a.email || filterAuthor === a.name}
            <button
              onclick={() => {
                onSelectAuthor?.(a.email || a.name);
                isAuthorMenuOpen = false;
              }}
              class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer {isSelected ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 font-semibold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
            >
              <div class="truncate pr-2">
                <div class="truncate text-[11px]">{a.name}</div>
                {#if a.email}
                  <div class="truncate text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{a.email}</div>
                {/if}
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {a.count}
                </span>
                {#if isSelected}
                  <Check class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Date Range Sub-Popover -->
    {#if isDateMenuOpen}
      <!-- Backdrop -->
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="fixed inset-0 z-40" onclick={() => (isDateMenuOpen = false)}></div>

      <!-- Popover -->
      <div class="absolute right-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-2 text-xs font-sans animate-in fade-in zoom-in-95 duration-100 space-y-1">
        <button
          onclick={() => { onSelectDateRange?.('all'); isDateMenuOpen = false; }}
          class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer {filterDateRange === 'all' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
        >
          <span>{localeState.t('toolbar.allTime')}</span>
          {#if filterDateRange === 'all'}<Check class="w-3.5 h-3.5 text-amber-600" />{/if}
        </button>

        <button
          onclick={() => { onSelectDateRange?.('24h'); isDateMenuOpen = false; }}
          class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer {filterDateRange === '24h' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
        >
          <span>{localeState.t('toolbar.last24h')}</span>
          {#if filterDateRange === '24h'}<Check class="w-3.5 h-3.5 text-amber-600" />{/if}
        </button>

        <button
          onclick={() => { onSelectDateRange?.('7d'); isDateMenuOpen = false; }}
          class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer {filterDateRange === '7d' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
        >
          <span>{localeState.t('toolbar.last7d')}</span>
          {#if filterDateRange === '7d'}<Check class="w-3.5 h-3.5 text-amber-600" />{/if}
        </button>

        <button
          onclick={() => { onSelectDateRange?.('30d'); isDateMenuOpen = false; }}
          class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer {filterDateRange === '30d' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
        >
          <span>{localeState.t('toolbar.last30d')}</span>
          {#if filterDateRange === '30d'}<Check class="w-3.5 h-3.5 text-amber-600" />{/if}
        </button>

        <div class="h-px bg-zinc-200 dark:bg-zinc-800 my-1"></div>

        <!-- Custom range -->
        <div class="p-1 space-y-1.5">
          <div class="text-[10px] font-semibold uppercase text-zinc-400">{localeState.t('toolbar.customDate')}</div>
          <div class="space-y-1">
            <input
              type="date"
              bind:value={customFrom}
              class="w-full px-2 py-1 text-[11px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded font-mono"
            />
            <input
              type="date"
              bind:value={customTo}
              class="w-full px-2 py-1 text-[11px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded font-mono"
            />
          </div>
          <button
            onclick={() => {
              onSelectDateRange?.('custom');
              applyCustomDate();
            }}
            class="w-full py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all cursor-pointer"
          >
            Apply
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Clear All Filters Button -->
  {#if hasActiveFilters && onClearAllFilters}
    <button
      onclick={onClearAllFilters}
      class="p-1 rounded-md bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 transition-all cursor-pointer"
      title={localeState.t('toolbar.clearAllFilters')}
    >
      <RotateCcw class="w-3.5 h-3.5" />
    </button>
  {/if}

  <!-- Layout Toggle: Horizontal vs 3-Column -->
  {#if onChangeLayoutMode}
    <div class="hidden 2xl:flex items-center bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-md p-0.5 shrink-0" title={localeState.t('toolbar.layoutToggle')}>
      <button
        onclick={() => onChangeLayoutMode?.('horizontal')}
        class="p-1 rounded text-xs transition-all cursor-pointer {layoutMode === 'horizontal' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-xs border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
        title={localeState.t('toolbar.layoutHorizontal')}
      >
        <Rows2 class="w-3.5 h-3.5" />
      </button>
      <button
        onclick={() => onChangeLayoutMode?.('three-column')}
        class="p-1 rounded text-xs transition-all cursor-pointer {layoutMode === 'three-column' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-xs border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
        title={localeState.t('toolbar.layoutThreeColumn')}
      >
        <Columns3 class="w-3.5 h-3.5" />
      </button>
    </div>
  {/if}
</div>
