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
  } from 'lucide-svelte';
  import { themeState } from '../../state/themeState.svelte';

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
      <!-- Theme Switcher in Dropdown -->
      <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        Giao diện (Theme)
      </div>
      <div class="grid grid-cols-3 gap-1 px-1 py-1 mb-1 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <button
          onclick={() => themeState.setTheme('light')}
          class="flex items-center justify-center gap-1 py-1 rounded text-xs transition-colors cursor-pointer {themeState.theme === 'light' ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 font-semibold shadow-xs border border-zinc-200 dark:border-zinc-700' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <Sun class="w-3 h-3 text-amber-500" />
          <span>Sáng</span>
        </button>
        <button
          onclick={() => themeState.setTheme('dark')}
          class="flex items-center justify-center gap-1 py-1 rounded text-xs transition-colors cursor-pointer {themeState.theme === 'dark' ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs border border-zinc-200 dark:border-zinc-700' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <Moon class="w-3 h-3 text-indigo-400" />
          <span>Tối</span>
        </button>
        <button
          onclick={() => themeState.setTheme('system')}
          class="flex items-center justify-center gap-1 py-1 rounded text-xs transition-colors cursor-pointer {themeState.theme === 'system' ? 'bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 font-semibold shadow-xs border border-zinc-200 dark:border-zinc-700' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
          <Monitor class="w-3 h-3 text-cyan-500" />
          <span>Auto</span>
        </button>
      </div>

      <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>

      <!-- Guides & Help in Dropdown -->
      <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        Guides & Rescue
      </div>
      {#if onOpenGuide}
        <button
          onclick={() => { onCloseToolsMenu(); onOpenGuide(); }}
          class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-zinc-700 dark:text-zinc-300 hover:text-cyan-900 dark:hover:text-cyan-200 transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-2">
            <BookOpen class="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
            <span>Playbook & Recipes</span>
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
            <span>Cứu hộ khẩn cấp (Rescue Kit)</span>
          </div>
        </button>
      {/if}

      <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>

      <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        Git Workflows
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
            <span>Command Palette</span>
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
            <span>Time Machine (Undo)</span>
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
          <span>Visual Git Bisect</span>
        </button>
      {/if}

      {#if onOpenWorktrees}
        <button
          onclick={() => { onCloseToolsMenu(); onOpenWorktrees(); }}
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <FolderGit2 class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Worktrees Manager</span>
        </button>
      {/if}

      {#if onOpenSubmodules}
        <button
          onclick={() => { onCloseToolsMenu(); onOpenSubmodules(); }}
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <Box class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Git Submodules</span>
        </button>
      {/if}

      {#if onOpenLfs}
        <button
          onclick={() => { onCloseToolsMenu(); onOpenLfs(); }}
          class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
        >
          <Database class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Git LFS Storage</span>
        </button>
      {/if}

      <button
        onclick={() => { onCloseToolsMenu(); onOpenTrash(); }}
        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
      >
        <ShieldCheck class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>48h Safe Discard Trash</span>
      </button>

      <div class="my-1 border-t border-zinc-200 dark:border-zinc-800"></div>

      <!-- Commit History Limit -->
      <div class="px-2.5 py-1.5">
        <div class="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center justify-between">
          <span>Commit Limit</span>
          <span class="font-mono text-zinc-600 dark:text-zinc-400">{commitLimit === 0 ? 'All' : commitLimit}</span>
        </div>
        <div class="grid grid-cols-4 gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-md border border-zinc-200 dark:border-zinc-800">
          {#each [500, 2000, 5000, 0] as lim}
            <button
              onclick={() => onLimitChange(lim)}
              class="py-0.5 rounded text-[10px] font-mono transition-colors text-center cursor-pointer {commitLimit === lim ? 'bg-cyan-600 text-white font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
              {lim === 0 ? 'All' : lim}
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
