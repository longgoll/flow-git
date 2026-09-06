<script lang="ts">
  import type { LayoutMode } from '../../types';
  import { localeState } from '../../state/localeState.svelte';
  import {
    Search,
    X,
    GitMerge,
    UserCheck,
    Rows2,
    Columns3,
  } from 'lucide-svelte';

  interface Props {
    searchQuery: string;
    filterHideMerges?: boolean;
    filterMyCommits?: boolean;
    layoutMode?: LayoutMode;
    onSearchChange: (query: string) => void;
    onToggleHideMerges?: () => void;
    onToggleMyCommits?: () => void;
    onChangeLayoutMode?: (mode: LayoutMode) => void;
  }

  let {
    searchQuery = $bindable(''),
    filterHideMerges = false,
    filterMyCommits = false,
    layoutMode = 'horizontal',
    onSearchChange,
    onToggleHideMerges,
    onToggleMyCommits,
    onChangeLayoutMode,
  }: Props = $props();

  function handleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    searchQuery = val;
    onSearchChange(val);
  }
</script>

<!-- Commit Search Filter -->
<div class="relative min-w-[60px] w-20 sm:w-28 md:w-32 lg:w-36 focus-within:!w-48 transition-all duration-150 shrink-0">
  <Search class="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-2 top-2 pointer-events-none" />
  <input
    type="text"
    placeholder={localeState.t('toolbar.filterPlaceholder')}
    value={searchQuery}
    oninput={handleInput}
    class="w-full bg-zinc-100 dark:bg-zinc-900/70 hover:bg-zinc-200/60 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 focus:border-cyan-500/60 rounded-md pl-7 pr-6 py-1 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
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

<!-- Smart Filter Toggles -->
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

<!-- Layout Toggle: Horizontal vs 3-Column -->
{#if onChangeLayoutMode}
  <div class="hidden 2xl:flex items-center bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-md p-0.5 shrink-0" title={localeState.t('toolbar.layoutToggle')}>
    <button
      onclick={() => onChangeLayoutMode?.('horizontal')}
      class="p-1 rounded text-xs transition-all cursor-pointer {layoutMode === 'horizontal' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-sm border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
      title={localeState.t('toolbar.layoutHorizontal')}
    >
      <Rows2 class="w-3.5 h-3.5" />
    </button>
    <button
      onclick={() => onChangeLayoutMode?.('three-column')}
      class="p-1 rounded text-xs transition-all cursor-pointer {layoutMode === 'three-column' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-sm border border-zinc-200 dark:border-zinc-700/60' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}"
      title={localeState.t('toolbar.layoutThreeColumn')}
    >
      <Columns3 class="w-3.5 h-3.5" />
    </button>
  </div>
{/if}
