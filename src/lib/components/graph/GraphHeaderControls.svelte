<script lang="ts">
  import {
    GitCompare,
    Globe,
    Sparkles,
    Eye,
    EyeOff,
    X,
    StretchHorizontal,
    AlignJustify,
    Menu,
    User,
    Calendar,
    Route,
    Map,
  } from 'lucide-svelte';
  import type { GraphDensity, GraphViewMode } from '../../types';
  import { localeState } from '../../state/localeState.svelte';

  export type DatePreset = 'all' | 'today' | 'week' | 'month' | 'quarter';

  interface Props {
    displayCount: number;
    totalCount: number;
    lockedLane: number | null;
    viewMode: GraphViewMode;
    autoCapsule: boolean;
    density?: GraphDensity;
    hiddenBranchesCount?: number;
    authorFilter?: string | null;
    datePreset?: DatePreset;
    ancestorPathCount?: number;
    showMinimap?: boolean;
    onUnlockLane: () => void;
    onToggleViewMode: (mode: GraphViewMode) => void;
    onToggleAutoCapsule: () => void;
    onChangeDensity?: (mode: GraphDensity) => void;
    onShowAllBranches?: () => void;
    onClearAuthorFilter?: () => void;
    onSelectDatePreset?: (preset: DatePreset) => void;
    onClearAncestorPath?: () => void;
    onToggleMinimap?: () => void;
  }

  let {
    displayCount,
    totalCount,
    lockedLane,
    viewMode = $bindable('micro'),
    autoCapsule = $bindable(true),
    density = 'comfortable',
    hiddenBranchesCount = 0,
    authorFilter = null,
    datePreset = 'all',
    ancestorPathCount = 0,
    showMinimap = false,
    onUnlockLane,
    onToggleViewMode,
    onToggleAutoCapsule,
    onChangeDensity,
    onShowAllBranches,
    onClearAuthorFilter,
    onSelectDatePreset,
    onClearAncestorPath,
    onToggleMinimap,
  }: Props = $props();

  let showDateMenu = $state(false);
</script>

<div class="h-9 px-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/40 flex items-center justify-between text-xs select-none shrink-0 font-sans gap-2">
  <!-- Left: Status, Commit Counts & Active Filters -->
  <div class="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 min-w-0 overflow-x-auto no-scrollbar py-0.5">
    <span class="font-mono text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">
      {#if displayCount !== totalCount}
        {localeState.t('graph.headerControls.commitsCount', { display: displayCount, total: totalCount })}
      {:else}
        {localeState.t('graph.headerControls.commitsCountSimple', { count: displayCount })}
      {/if}
    </span>

    <!-- Active Author Filter Chip -->
    {#if authorFilter}
      <span class="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-700/60 text-[10px] font-medium flex items-center gap-1.5 shrink-0 animate-in fade-in duration-100">
        <User class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
        <span class="truncate max-w-[130px]" title={authorFilter}>{localeState.t('graph.headerControls.authorFilter', { name: authorFilter })}</span>
        {#if onClearAuthorFilter}
          <button
            onclick={onClearAuthorFilter}
            class="p-0.5 rounded hover:bg-cyan-200/60 dark:hover:bg-cyan-800/60 transition-colors cursor-pointer"
            title={localeState.t('graph.headerControls.clearAuthorFilter')}
          >
            <X class="w-2.5 h-2.5" />
          </button>
        {/if}
      </span>
    {/if}

    <!-- Ancestor Path Badge -->
    {#if ancestorPathCount > 0}
      <span class="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 text-[10px] font-mono font-medium flex items-center gap-1.5 shrink-0 animate-in fade-in duration-100">
        <Route class="w-3 h-3 text-amber-600 dark:text-amber-400" />
        <span>{localeState.t('graph.headerControls.ancestorPathBadge', { count: ancestorPathCount })}</span>
        {#if onClearAncestorPath}
          <button
            onclick={onClearAncestorPath}
            class="p-0.5 rounded hover:bg-amber-200/60 dark:hover:bg-amber-800/60 transition-colors cursor-pointer"
            title={localeState.t('graph.headerControls.clearAncestorPath')}
          >
            <X class="w-2.5 h-2.5" />
          </button>
        {/if}
      </span>
    {/if}

    {#if lockedLane !== null}
      <span class="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-mono text-[10px] font-medium flex items-center gap-1 shrink-0 animate-in fade-in duration-100">
        <Eye class="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
        <span>{localeState.t('graph.headerControls.lockedLane', { lane: lockedLane })}</span>
        <button
          onclick={onUnlockLane}
          class="p-0.5 rounded hover:bg-indigo-200/60 dark:hover:bg-indigo-800/60 transition-colors cursor-pointer"
          title={localeState.t('graph.headerControls.unlockLaneTooltip')}
        >
          <X class="w-2.5 h-2.5" />
        </button>
      </span>
    {/if}

    {#if hiddenBranchesCount > 0}
      <span class="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-sans text-[10px] font-medium flex items-center gap-1.5 shrink-0 animate-in fade-in duration-100">
        <EyeOff class="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
        <span>{localeState.t('graph.headerControls.hiddenBranchesCount', { count: hiddenBranchesCount })}</span>
        {#if onShowAllBranches}
          <button
            onclick={onShowAllBranches}
            class="px-1 py-0.2 rounded bg-amber-200/80 dark:bg-amber-900/80 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 font-bold transition-colors cursor-pointer text-[9px]"
            title={localeState.t('graph.headerControls.showAllBranchesTooltip')}
          >
            {localeState.t('graph.headerControls.showAllBranches')}
          </button>
        {/if}
      </span>
    {/if}
  </div>

  <!-- Right: Date Filter, Density, View Modes, Minimap & Capsules -->
  <div class="flex items-center gap-1.5 shrink-0">
    <!-- Date Range Preset Dropdown -->
    <div class="relative">
      <button
        onclick={() => (showDateMenu = !showDateMenu)}
        class="px-2 py-0.5 rounded-md border text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer {datePreset !== 'all' ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'}"
        title={localeState.t('graph.headerControls.dateFilterTooltip')}
      >
        <Calendar class="w-3 h-3 {datePreset !== 'all' ? 'text-indigo-500' : 'text-zinc-400'}" />
        <span class="hidden sm:inline">
          {datePreset === 'all' ? localeState.t('graph.headerControls.dateFilter') : datePreset === 'today' ? localeState.t('graph.headerControls.dateToday') : datePreset === 'week' ? localeState.t('graph.headerControls.dateWeek') : datePreset === 'month' ? localeState.t('graph.headerControls.dateMonth') : localeState.t('graph.headerControls.dateQuarter')}
        </span>
      </button>

      {#if showDateMenu}
        <!-- Backdrop to close -->
        <button
          type="button"
          aria-label="Close menu"
          class="fixed inset-0 z-40 bg-transparent cursor-default w-full h-full border-0 p-0 m-0"
          onclick={() => (showDateMenu = false)}
        ></button>
        <div class="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 py-1 text-xs animate-in fade-in duration-100">
          {#each (['all', 'today', 'week', 'month', 'quarter'] as const) as preset}
            <button
              onclick={() => {
                onSelectDatePreset?.(preset);
                showDateMenu = false;
              }}
              class="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between cursor-pointer {datePreset === preset ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-950/30' : 'text-zinc-700 dark:text-zinc-300'}"
            >
              <span>{preset === 'all' ? localeState.t('graph.headerControls.dateAll') : preset === 'today' ? localeState.t('graph.headerControls.dateToday') : preset === 'week' ? localeState.t('graph.headerControls.dateWeek') : preset === 'month' ? localeState.t('graph.headerControls.dateMonth') : localeState.t('graph.headerControls.dateQuarter')}</span>
              {#if datePreset === preset}
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Density Toggle: Comfortable (36px) | Compact (28px) | Ultra (20px) -->
    {#if onChangeDensity}
      <div
        class="flex items-center p-0.5 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-xs"
        title={localeState.t('graph.headerControls.densityTooltip')}
      >
        <button
          onclick={() => onChangeDensity('comfortable')}
          class="p-1 rounded text-[11px] transition-all cursor-pointer {density === 'comfortable' ? 'bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
          title={localeState.t('graph.headerControls.densityComfortable')}
        >
          <StretchHorizontal class="w-3 h-3" />
        </button>
        <button
          onclick={() => onChangeDensity('compact')}
          class="p-1 rounded text-[11px] transition-all cursor-pointer {density === 'compact' ? 'bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
          title={localeState.t('graph.headerControls.densityCompact')}
        >
          <AlignJustify class="w-3 h-3" />
        </button>
        <button
          onclick={() => onChangeDensity('ultra')}
          class="p-1 rounded text-[11px] transition-all cursor-pointer {density === 'ultra' ? 'bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}"
          title={localeState.t('graph.headerControls.densityUltra')}
        >
          <Menu class="w-3 h-3" />
        </button>
      </div>
    {/if}

    <div class="flex items-center p-0.5 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-xs">
      <button
        onclick={() => onToggleViewMode('micro')}
        class="px-2 py-0.5 rounded text-[11px] transition-all flex items-center gap-1.5 cursor-pointer {viewMode === 'micro' ? 'bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        title={localeState.t('graph.headerControls.microDagTooltip')}
      >
        <GitCompare class="w-3 h-3" />
        <span class="hidden md:inline">{localeState.t('graph.headerControls.microDag')}</span>
      </button>

      <button
        onclick={() => onToggleViewMode('macro')}
        class="px-2 py-0.5 rounded text-[11px] transition-all flex items-center gap-1.5 cursor-pointer {viewMode === 'macro' ? 'bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        title={localeState.t('graph.headerControls.macroMapTooltip')}
      >
        <Globe class="w-3 h-3" />
        <span class="hidden md:inline">{localeState.t('graph.headerControls.macroMap')}</span>
      </button>
    </div>

    <!-- Minimap Toggle -->
    {#if onToggleMinimap}
      <button
        onclick={onToggleMinimap}
        class="px-2 py-0.5 rounded-md border text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer {showMinimap ? 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-300 dark:border-cyan-700/60 text-cyan-700 dark:text-cyan-300 font-semibold' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}"
        title={localeState.t('graph.headerControls.minimapTooltip')}
      >
        <Map class="w-3 h-3 {showMinimap ? 'text-cyan-500' : 'text-zinc-400'}" />
        <span class="hidden lg:inline">{showMinimap ? localeState.t('graph.headerControls.minimapOn') : localeState.t('graph.headerControls.minimapOff')}</span>
      </button>
    {/if}

    <!-- Semantic Capsules Toggle -->
    <button
      onclick={onToggleAutoCapsule}
      class="px-2 py-0.5 rounded-md border text-[11px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer {autoCapsule ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 font-semibold' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}"
      title={localeState.t('graph.headerControls.capsulesTooltip')}
    >
      <Sparkles class="w-3 h-3 {autoCapsule ? 'text-emerald-500' : 'text-zinc-400'}" />
      <span class="hidden lg:inline">{autoCapsule ? localeState.t('graph.headerControls.capsulesOn') : localeState.t('graph.headerControls.capsulesOff')}</span>
    </button>
  </div>
</div>
