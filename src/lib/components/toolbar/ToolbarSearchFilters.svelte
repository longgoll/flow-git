<script lang="ts">
  import type { LayoutMode } from '../../types';
  import { localeState } from '../../state/localeState.svelte';
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
  } from 'lucide-svelte';

  interface Props {
    searchQuery: string;
    filterHideMerges?: boolean;
    filterMyCommits?: boolean;
    layoutMode?: LayoutMode;
    authors?: Array<{ name: string; email: string; count: number }>;
    filterAuthor?: string;
    filterDateRange?: 'all' | '24h' | '7d' | '30d' | 'custom';
    filterDateFrom?: string | null;
    filterDateTo?: string | null;
    onSearchChange: (query: string) => void;
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
    filterHideMerges = false,
    filterMyCommits = false,
    layoutMode = 'horizontal',
    authors = [],
    filterAuthor = '',
    filterDateRange = 'all',
    filterDateFrom = null,
    filterDateTo = null,
    onSearchChange,
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

  function handleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    searchQuery = val;
    onSearchChange(val);
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
  <div class="relative min-w-[60px] w-20 sm:w-28 md:w-32 lg:w-36 focus-within:!w-48 transition-all duration-150 shrink-0">
    <Search class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-2 top-2 pointer-events-none" />
    <input
      type="text"
      placeholder={localeState.t('toolbar.filterPlaceholder')}
      value={searchQuery}
      oninput={handleInput}
      class="w-full bg-zinc-100 dark:bg-zinc-900/70 hover:bg-zinc-200/60 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 focus:border-cyan-500/60 rounded-md pl-7 pr-6 py-1 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
    />
    {#if searchQuery}
      <button
        onclick={() => { searchQuery = ''; onSearchChange(''); }}
        class="absolute right-1 top-1 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
        title={localeState.t('toolbar.clearFilter')}
      >
        <X class="w-3 h-3" />
      </button>
    {/if}
  </div>

  <!-- Smart Filter Toggles: Hide Merges & My Commits -->
  <div class="flex items-center bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-md p-0.5 shrink-0">
    {#if onToggleHideMerges}
      <button
        onclick={onToggleHideMerges}
        class="p-1 rounded text-xs font-medium flex items-center transition-all cursor-pointer {filterHideMerges ? 'bg-amber-500/20 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent'}"
        title={filterHideMerges ? localeState.t('toolbar.hideMergesActive') : localeState.t('toolbar.hideMergesInactive')}
      >
        <GitMerge class="w-3.5 h-3.5" />
      </button>
    {/if}

    {#if onToggleMyCommits}
      <button
        onclick={onToggleMyCommits}
        class="p-1 rounded text-xs font-medium flex items-center transition-all cursor-pointer {filterMyCommits ? 'bg-cyan-500/20 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-transparent'}"
        title={filterMyCommits ? localeState.t('toolbar.myCommitsActive') : localeState.t('toolbar.myCommitsInactive')}
      >
        <UserCheck class="w-3.5 h-3.5" />
      </button>
    {/if}
  </div>

  <!-- Author Filter Dropdown -->
  {#if onSelectAuthor}
    <div class="relative shrink-0">
      <button
        onclick={() => {
          isAuthorMenuOpen = !isAuthorMenuOpen;
          isDateMenuOpen = false;
        }}
        class="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer {filterAuthor ? 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-300 dark:border-cyan-700/60 text-cyan-800 dark:text-cyan-300 shadow-2xs' : 'bg-zinc-100 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        title={localeState.t('toolbar.filterAuthor')}
      >
        <User class="w-3.5 h-3.5 {filterAuthor ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-400'}" />
        <span class="max-w-[75px] truncate font-sans text-[11px]">
          {filterAuthor ? (authors.find(a => a.email === filterAuthor || a.name === filterAuthor)?.name || filterAuthor) : localeState.t('toolbar.filterAuthor')}
        </span>
        <ChevronDown class="w-2.5 h-2.5 opacity-60" />
      </button>

      {#if isAuthorMenuOpen}
        <!-- Backdrop -->
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div class="fixed inset-0 z-40" onclick={() => (isAuthorMenuOpen = false)}></div>

        <!-- Popover -->
        <div class="absolute left-0 mt-1 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-2 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
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
                onSelectAuthor('');
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
                  onSelectAuthor(a.email || a.name);
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
    </div>
  {/if}

  <!-- Date Range Filter Dropdown -->
  {#if onSelectDateRange}
    <div class="relative shrink-0">
      <button
        onclick={() => {
          isDateMenuOpen = !isDateMenuOpen;
          isAuthorMenuOpen = false;
        }}
        class="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer {filterDateRange !== 'all' ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 shadow-2xs' : 'bg-zinc-100 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        title={localeState.t('toolbar.filterDate')}
      >
        <Calendar class="w-3.5 h-3.5 {filterDateRange !== 'all' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'}" />
        <span class="text-[11px] font-sans">
          {#if filterDateRange === '24h'}
            24h
          {:else if filterDateRange === '7d'}
            7d
          {:else if filterDateRange === '30d'}
            30d
          {:else if filterDateRange === 'custom'}
            Date
          {:else}
            {localeState.t('toolbar.filterDate')}
          {/if}
        </span>
        <ChevronDown class="w-2.5 h-2.5 opacity-60" />
      </button>

      {#if isDateMenuOpen}
        <!-- Backdrop -->
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div class="fixed inset-0 z-40" onclick={() => (isDateMenuOpen = false)}></div>

        <!-- Popover -->
        <div class="absolute left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-2 text-xs font-sans animate-in fade-in zoom-in-95 duration-100 space-y-1">
          <button
            onclick={() => { onSelectDateRange('all'); isDateMenuOpen = false; }}
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer {filterDateRange === 'all' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
          >
            <span>{localeState.t('toolbar.allTime')}</span>
            {#if filterDateRange === 'all'}<Check class="w-3.5 h-3.5 text-amber-600" />{/if}
          </button>

          <button
            onclick={() => { onSelectDateRange('24h'); isDateMenuOpen = false; }}
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer {filterDateRange === '24h' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
          >
            <span>{localeState.t('toolbar.last24h')}</span>
            {#if filterDateRange === '24h'}<Check class="w-3.5 h-3.5 text-amber-600" />{/if}
          </button>

          <button
            onclick={() => { onSelectDateRange('7d'); isDateMenuOpen = false; }}
            class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer {filterDateRange === '7d' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}"
          >
            <span>{localeState.t('toolbar.last7d')}</span>
            {#if filterDateRange === '7d'}<Check class="w-3.5 h-3.5 text-amber-600" />{/if}
          </button>

          <button
            onclick={() => { onSelectDateRange('30d'); isDateMenuOpen = false; }}
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
                onSelectDateRange('custom');
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
  {/if}

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
