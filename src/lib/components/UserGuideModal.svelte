<script lang="ts">
  import {
    BookOpen,
    Search,
    X,
    Keyboard,
    Play,
    Lightbulb,
    Briefcase,
    AlertTriangle,
    CheckCircle2,
    ShieldCheck,
  } from 'lucide-svelte';
  import { guideItems, shortcuts } from '../data/guideData';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen = false, onClose }: Props = $props();

  let searchQuery = $state<string>('');
  let activeTab = $state<'recipes' | 'features' | 'shortcuts'>('recipes');
  let selectedItemId = $state<string>('rebase-behind-main');

  // Filtering
  let filteredItems = $derived.by(() => {
    let list = guideItems.filter((item) => item.category === activeTab);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.problem.toLowerCase().includes(q) ||
        item.solution.toLowerCase().includes(q)
    );
  });

  let selectedItem = $derived.by(() => {
    return guideItems.find((i) => i.id === selectedItemId) || filteredItems[0] || guideItems[0];
  });

  function selectTab(tab: 'recipes' | 'features' | 'shortcuts') {
    activeTab = tab;
    if (tab === 'recipes') selectedItemId = 'rebase-behind-main';
    if (tab === 'features') selectedItemId = 'living-graph';
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 bg-black/50 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-150 select-none"
    role="dialog"
    aria-modal="true"
  >
    <!-- Modal Container -->
    <div
      class="w-full max-w-5xl h-[85vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-200 font-sans"
    >
      <!-- Top Header -->
      <header class="h-14 px-6 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <BookOpen class="w-4 h-4" />
          </div>
          <div>
            <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {localeState.t('assistant.guide.title')}
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 font-mono font-semibold">
                FlowGit
              </span>
            </h2>
            <p class="text-[11px] text-zinc-500 dark:text-zinc-400">
              {localeState.t('assistant.guide.subtitle')}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Search Bar -->
          <div class="relative w-64">
            <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder={localeState.t('assistant.guide.searchPlaceholder')}
              class="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors select-text"
            />
          </div>

          <button
            onclick={onClose}
            class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            title="Đóng (Esc)"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </header>

      <!-- Category Tabs -->
      <div class="px-6 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center gap-2 shrink-0">
        <button
          onclick={() => selectTab('recipes')}
          class="px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'recipes' ? 'border-cyan-600 dark:border-cyan-400 text-cyan-800 dark:text-cyan-300 font-bold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <Lightbulb class="w-3.5 h-3.5" />
          <span>{localeState.t('assistant.guide.tabRecipes')}</span>
        </button>

        <button
          onclick={() => selectTab('features')}
          class="px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'features' ? 'border-cyan-600 dark:border-cyan-400 text-cyan-800 dark:text-cyan-300 font-bold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <Briefcase class="w-3.5 h-3.5" />
          <span>{localeState.t('assistant.guide.tabFeatures')}</span>
        </button>

        <button
          onclick={() => selectTab('shortcuts')}
          class="px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'shortcuts' ? 'border-cyan-600 dark:border-cyan-400 text-cyan-800 dark:text-cyan-300 font-bold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <Keyboard class="w-3.5 h-3.5" />
          <span>{localeState.t('assistant.guide.tabShortcuts')}</span>
        </button>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 flex overflow-hidden">
        {#if activeTab === 'shortcuts'}
          <!-- Shortcuts Full View -->
          <div class="flex-1 p-6 overflow-y-auto space-y-6">
            <div>
              <h3 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">Bảng phím tắt toàn hệ thống</h3>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">Tăng tốc độ thao tác Git tối đa mà không cần rời tay khỏi bàn phím.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              {#each shortcuts as sc}
                <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between">
                  <span class="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{sc.desc}</span>
                  <kbd class="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-cyan-800 dark:text-cyan-300 font-mono text-xs font-bold shadow-xs">
                    {sc.key}
                  </kbd>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <!-- Left List (Items) -->
          <aside class="w-80 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/60 flex flex-col shrink-0 overflow-y-auto p-3 space-y-1.5">
            {#each filteredItems as item}
              {@const Icon = item.icon}
              <button
                onclick={() => (selectedItemId = item.id)}
                class="w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 {selectedItemId === item.id ? 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-600/50 shadow-sm' : 'bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/60 hover:bg-zinc-100/80 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'}"
              >
                <div class="p-2 rounded-lg {selectedItemId === item.id ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'} shrink-0 mt-0.5">
                  <Icon class="w-4 h-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-1 mb-0.5">
                    <span class="text-xs font-bold truncate {selectedItemId === item.id ? 'text-cyan-900 dark:text-cyan-200' : 'text-zinc-800 dark:text-zinc-200'}">
                      {item.title}
                    </span>
                  </div>
                  <p class="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {item.subtitle}
                  </p>
                  {#if item.badge}
                    <span class="inline-block mt-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 font-semibold">
                      {item.badge}
                    </span>
                  {/if}
                </div>
              </button>
            {/each}
          </aside>

          <!-- Right Detail Panel -->
          <main class="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-white dark:bg-zinc-950">
            {#if selectedItem}
              {@const MainIcon = selectedItem.icon}
              <!-- Header of Selected Item -->
              <div class="space-y-2 border-b border-zinc-200 dark:border-zinc-800 pb-5">
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30">
                    {selectedItem.category === 'recipes' ? 'KỊCH BẢN THỰC CHIẾN' : 'TÍNH NĂNG CÔNG CỤ'}
                  </span>
                  {#if selectedItem.badge}
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                      {selectedItem.badge}
                    </span>
                  {/if}
                </div>

                <h1 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                  <MainIcon class="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span>{selectedItem.title}</span>
                </h1>
                <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {selectedItem.subtitle}
                </p>
              </div>

              <!-- Problem & Solution Callouts -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1.5">
                  <div class="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                    <AlertTriangle class="w-4 h-4" />
                    <span>{localeState.t('assistant.guide.problemHeading')}</span>
                  </div>
                  <p class="text-xs text-rose-900 dark:text-rose-200/90 leading-relaxed">
                    {selectedItem.problem}
                  </p>
                </div>

                <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-1.5">
                  <div class="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 class="w-4 h-4" />
                    <span>{localeState.t('assistant.guide.solutionHeading')}</span>
                  </div>
                  <p class="text-xs text-emerald-900 dark:text-emerald-200/90 leading-relaxed">
                    {selectedItem.solution}
                  </p>
                </div>
              </div>

              <!-- Step by Step Guide -->
              <div class="space-y-3 pt-2">
                <h3 class="text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Play class="w-4 h-4 text-cyan-600 dark:text-cyan-400 fill-current" />
                  <span>{localeState.t('assistant.guide.stepsHeading')}</span>
                </h3>

                <div class="space-y-3">
                  {#each selectedItem.steps as step, idx}
                    <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 space-y-2">
                      <div class="flex items-center gap-2.5">
                        <span class="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 class="text-xs font-bold text-zinc-900 dark:text-zinc-100">{step.title}</h4>
                      </div>
                      <p class="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed pl-7.5">
                        {step.desc}
                      </p>
                      {#if step.tip}
                        <div class="ml-7.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
                          <Lightbulb class="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                          <span>{step.tip}</span>
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Pro Tips -->
              {#if selectedItem.proTips && selectedItem.proTips.length > 0}
                <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div class="flex items-center gap-2 text-xs font-bold text-cyan-800 dark:text-cyan-300">
                    <ShieldCheck class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Mẹo an toàn (No-Fear Git Tips)</span>
                  </div>
                  <ul class="space-y-1.5 pl-6 list-disc text-xs text-zinc-700 dark:text-zinc-300">
                    {#each selectedItem.proTips as tip}
                      <li>{tip}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
            {/if}
          </main>
        {/if}
      </div>
    </div>
  </div>
{/if}
