<script lang="ts">
  import type { BranchInfo } from '../../types';
  import {
    MoreHorizontal,
    Sun,
    Moon,
    Monitor,
    BookOpen,
    LifeBuoy,
    Upload,
    Command,
    History,
    Bug,
    FolderGit2,
    Box,
    Database,
    ShieldCheck,
    Globe,
    Sparkles,
    RefreshCw,
  } from 'lucide-svelte';
  import { themeState } from '../../state/themeState.svelte';
  import { localeState } from '../../state/localeState.svelte';
  import { updateState } from '../../state/updateState.svelte';

  interface Props {
    currentBranch?: BranchInfo;
    commitLimit: number;
    showToolsMenu: boolean;
    onToggleToolsMenu: () => void;
    onCloseToolsMenu: () => void;
    onOpenGuide?: () => void;
    onOpenPlaybook?: () => void;
    onPush?: () => void;
    onOpenPalette?: () => void;
    onOpenTimeMachine?: () => void;
    onOpenBisect?: () => void;
    onOpenWorktrees?: () => void;
    onOpenSubmodules?: () => void;
    onOpenLfs?: () => void;
    onOpenTrash: () => void;
    onLimitChange: (limit: number) => void;
  }

  let {
    currentBranch,
    commitLimit = 2000,
    showToolsMenu = $bindable(false),
    onToggleToolsMenu,
    onCloseToolsMenu,
    onOpenGuide,
    onOpenPlaybook,
    onPush,
    onOpenPalette,
    onOpenTimeMachine,
    onOpenBisect,
    onOpenWorktrees,
    onOpenSubmodules,
    onOpenLfs,
    onOpenTrash,
    onLimitChange,
  }: Props = $props();
</script>

<div class="relative tools-menu-container">
  <button
    onclick={onToggleToolsMenu}
    class="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all cursor-pointer {showToolsMenu ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-700' : ''}"
    title="More Git Tools, Guides & Settings"
  >
    <MoreHorizontal class="w-4 h-4" />
  </button>

  {#if showToolsMenu}
    <div class="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl p-1.5 z-50 text-xs font-sans animate-in fade-in slide-in-from-top-1 duration-150">
      <!-- Language Switcher in Dropdown -->
      <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
        <span>{localeState.t('language.title')}</span>
        <Globe class="w-3 h-3 text-zinc-400" />
      </div>
      <div class="grid grid-cols-2 gap-1 px-1 py-1 mb-1.5 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <button
          onclick={() => localeState.setLocale('vi')}
          class="flex items-center justify-center gap-1.5 py-1 rounded text-xs transition-colors cursor-pointer {localeState.locale === 'vi' ? 'bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 font-semibold shadow-xs border border-zinc-200 dark:border-zinc-700' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <span>🇻🇳</span>
          <span>Tiếng Việt</span>
        </button>
        <button
          onclick={() => localeState.setLocale('en')}
          class="flex items-center justify-center gap-1.5 py-1 rounded text-xs transition-colors cursor-pointer {localeState.locale === 'en' ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 font-semibold shadow-xs border border-zinc-200 dark:border-zinc-700' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <span>🇬🇧</span>
          <span>English</span>
        </button>
      </div>

      <!-- Theme Switcher in Dropdown -->
      <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {localeState.t('theme.title')}
      </div>
      <div class="grid grid-cols-3 gap-1 px-1 py-1 mb-1 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <button
          onclick={() => themeState.setTheme('light')}
          class="flex items-center justify-center gap-1 py-1 rounded text-xs transition-colors cursor-pointer {themeState.theme === 'light' ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 font-semibold shadow-xs border border-zinc-200 dark:border-zinc-700' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <Sun class="w-3 h-3 text-amber-500" />
          <span>{localeState.t('theme.light')}</span>
        </button>
        <button
          onclick={() => themeState.setTheme('dark')}
          class="flex items-center justify-center gap-1 py-1 rounded text-xs transition-colors cursor-pointer {themeState.theme === 'dark' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs border border-zinc-200 dark:border-zinc-700' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <Moon class="w-3 h-3 text-indigo-400" />
          <span>{localeState.t('theme.dark')}</span>
        </button>
        <button
          onclick={() => themeState.setTheme('system')}
          class="flex items-center justify-center gap-1 py-1 rounded text-xs transition-colors cursor-pointer {themeState.theme === 'system' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs border border-zinc-200 dark:border-zinc-700' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <Monitor class="w-3 h-3 text-cyan-500" />
          <span>{localeState.t('theme.system')}</span>
        </button>
      </div>

      <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>

      <!-- Guides & Help in Dropdown -->
      <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {localeState.t('toolbar.guidesTitle')}
      </div>
      {#if onOpenGuide}
        <button
          onclick={() => { onCloseToolsMenu(); onOpenGuide(); }}
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-zinc-700 dark:text-zinc-300 hover:text-cyan-900 dark:hover:text-cyan-200 transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-2">
            <BookOpen class="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span>{localeState.t('toolbar.playbook')}</span>
          </div>
          <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">F1</span>
        </button>
      {/if}
      {#if onOpenPlaybook}
        <button
          onclick={() => { onCloseToolsMenu(); onOpenPlaybook(); }}
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-950/40 text-zinc-700 dark:text-zinc-300 hover:text-amber-900 dark:hover:text-amber-200 transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-2">
            <LifeBuoy class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{localeState.t('toolbar.rescueKit')}</span>
          </div>
        </button>
      {/if}

      <!-- Auto-Updater Section -->
      <button
        onclick={async () => {
          onCloseToolsMenu();
          await updateState.checkForUpdates(true);
        }}
        disabled={updateState.isChecking}
        class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-zinc-700 dark:text-zinc-300 hover:text-emerald-900 dark:hover:text-emerald-200 transition-colors cursor-pointer disabled:opacity-50"
      >
        <div class="flex items-center gap-2">
          {#if updateState.isChecking}
            <RefreshCw class="w-3.5 h-3.5 text-emerald-500 animate-spin" />
          {:else if updateState.updateAvailable}
            <Sparkles class="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          {:else}
            <Sparkles class="w-3.5 h-3.5 text-emerald-500" />
          {/if}
          <span>{updateState.isChecking ? localeState.t('updater.checking') : localeState.t('updater.checkForUpdates')}</span>
        </div>
        {#if updateState.updateAvailable}
          <!-- Hiển thị version cũ → mới -->
          <div class="flex items-center gap-1">
            <span class="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">v{APP_VERSION}</span>
            <span class="text-zinc-400">→</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
              v{updateState.updateInfo?.version}
            </span>
          </div>
        {:else}
          <span class="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">v{APP_VERSION}</span>
        {/if}
      </button>
      {#if updateState.updateAvailable}
        <button
          onclick={() => { onCloseToolsMenu(); updateState.openModal(); }}
          class="w-full flex items-center justify-center gap-1.5 mx-0 px-2.5 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] transition-all cursor-pointer"
        >
          <Sparkles class="w-3 h-3" />
          <span>{localeState.t('updater.viewDetails')}</span>
        </button>
      {/if}

      <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>

      <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {localeState.t('toolbar.gitWorkflows')}
      </div>

      {#if onPush}
        <button
          onclick={() => { onCloseToolsMenu(); onPush(); }}
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-2">
            <Upload class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{currentBranch && !currentBranch.upstream_name ? `Publish nhánh ${currentBranch.shorthand}` : 'Push to Remote'}</span>
          </div>
          {#if currentBranch && currentBranch.ahead_count > 0}
            <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">+{currentBranch.ahead_count}</span>
          {/if}
        </button>
      {/if}

      {#if onOpenPalette}
        <button
          onclick={() => { onCloseToolsMenu(); onOpenPalette(); }}
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-2">
            <Command class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>{localeState.t('toolbar.commandPalette')}</span>
          </div>
          <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">Ctrl+K</span>
        </button>
      {/if}

      {#if onOpenTimeMachine}
        <button
          onclick={() => { onCloseToolsMenu(); onOpenTimeMachine(); }}
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-2">
            <History class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{localeState.t('toolbar.reflogTimeMachine')}</span>
          </div>
          <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">Ctrl+Z</span>
        </button>
      {/if}

      {#if onOpenBisect}
        <button
          onclick={() => { onCloseToolsMenu(); onOpenBisect(); }}
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <Bug class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>{localeState.t('toolbar.gitBisect')}</span>
        </button>
      {/if}

      {#if onOpenWorktrees}
        <button
          onclick={() => { onCloseToolsMenu(); onOpenWorktrees(); }}
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <FolderGit2 class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>{localeState.t('toolbar.worktrees')}</span>
        </button>
      {/if}

      {#if onOpenSubmodules}
        <button
          onclick={() => { onCloseToolsMenu(); onOpenSubmodules(); }}
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <Box class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{localeState.t('toolbar.submodules')}</span>
        </button>
      {/if}

      {#if onOpenLfs}
        <button
          onclick={() => { onCloseToolsMenu(); onOpenLfs(); }}
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <Database class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>{localeState.t('toolbar.gitLfs')}</span>
        </button>
      {/if}

      <button
        onclick={() => { onCloseToolsMenu(); onOpenTrash(); }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
      >
        <ShieldCheck class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>{localeState.t('toolbar.safeTrash')}</span>
      </button>

      <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>

      <!-- Commit History Limit -->
      <div class="px-2.5 py-1.5">
        <div class="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center justify-between">
          <span>{localeState.t('toolbar.commitLimit')}</span>
          <span class="font-mono text-zinc-600 dark:text-zinc-400">{commitLimit === 0 ? localeState.t('common.all') : commitLimit}</span>
        </div>
        <div class="grid grid-cols-4 gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-md border border-zinc-200 dark:border-zinc-800">
          {#each [500, 2000, 5000, 0] as lim}
            <button
              onclick={() => onLimitChange(lim)}
              class="py-0.5 rounded text-[10px] font-mono transition-colors text-center cursor-pointer {commitLimit === lim ? 'bg-cyan-600 text-white font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
              {lim === 0 ? localeState.t('common.all') : lim}
            </button>
          {/each}
        </div>
      </div>

      <!-- Footer: version hiện tại -->
      <div class="px-2.5 pt-1.5 pb-0.5 flex items-center justify-between">
        <span class="text-[10px] text-zinc-400 dark:text-zinc-600">FlowGit</span>
        <span class="font-mono text-[10px] text-zinc-400 dark:text-zinc-600">v{APP_VERSION}</span>
      </div>
    </div>
  {/if}
</div>
