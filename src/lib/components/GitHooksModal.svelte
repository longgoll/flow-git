<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Anchor,
    X,
    Save,
    RotateCcw,
    Sparkles,
    FileCode,
    AlertCircle,
    Info,
    RefreshCw,
  } from 'lucide-svelte';
  import MonacoEditor from './MonacoEditor.svelte';
  import { getGitHooks, saveGitHook, toggleGitHook } from '../api';
  import { localeState } from '../state/localeState.svelte';
  import { toast } from '../state/toastState.svelte';
  import type { GitHookInfo } from '../types';

  interface Props {
    repoPath: string;
    onClose: () => void;
  }

  let { repoPath, onClose }: Props = $props();

  let hooks = $state<GitHookInfo[]>([]);
  let selectedHookName = $state<string>('pre-commit');
  let currentEditorContent = $state<string>('');
  let isLoading = $state<boolean>(true);
  let isSaving = $state<boolean>(false);
  let isToggling = $state<boolean>(false);
  let hasUnsavedChanges = $state<boolean>(false);

  let selectedHook = $derived(
    hooks.find((h) => h.name === selectedHookName) || hooks[0]
  );

  let activeHooksCount = $derived(hooks.filter((h) => h.enabled).length);

  const TEMPLATES: Record<string, { labelKey: string; script: string }> = {
    'commit-msg': {
      labelKey: 'gitHooks.templates.conventionalCommits',
      script: `#!/bin/sh
# FlowGit Commit Message Hook
# Kiểm tra định dạng commit message theo chuẩn Conventional Commits

commit_msg_file="$1"
commit_msg=$(cat "$commit_msg_file")

pattern="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\\(.+\\))?: .{1,100}"

if ! echo "$commit_msg" | grep -Eq "$pattern"; then
  echo "❌ Lỗi: Commit message không đúng chuẩn Conventional Commits!"
  echo "Ví dụ hợp lệ: feat(auth): add login with GitHub"
  exit 1
fi

exit 0
`,
    },
    'pre-commit': {
      labelKey: 'gitHooks.templates.eslintPrettier',
      script: `#!/bin/sh
# FlowGit Pre-Commit Hook
# Chạy linter hoặc test trước khi hoàn tất commit

echo "🔍 Đang kiểm tra code trước khi commit..."

# Ví dụ kiểm tra với npm:
# npm run lint || { echo "❌ Linting thất bại!"; exit 1; }
# npm test || { echo "❌ Unit test thất bại!"; exit 1; }

exit 0
`,
    },
    'pre-push': {
      labelKey: 'gitHooks.templates.preventPushMain',
      script: `#!/bin/sh
# FlowGit Pre-Push Hook
# Ngăn chặn push trực tiếp lên nhánh được bảo vệ (main / master)

current_branch=$(git symbolic-ref --short HEAD 2>/dev/null)

if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
  echo "⛔ CẢNH BÁO: Không được phép push trực tiếp lên nhánh '$current_branch'!"
  echo "Vui lòng tạo nhánh tính năng và mở Pull Request."
  exit 1
fi

exit 0
`,
    },
    'post-merge': {
      labelKey: 'gitHooks.templates.autoNpmInstall',
      script: `#!/bin/sh
# FlowGit Post-Merge Hook
# Tự động cập nhật dependencies sau khi merge hoặc pull

echo "📦 Đang kiểm tra thay đổi package.json..."

if git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD | grep -E "package(-lock)?\\.json"; then
  echo "🔄 Phát hiện dependencies thay đổi. Đang chạy npm install..."
  npm install
fi

exit 0
`,
    },
  };

  onMount(async () => {
    await loadHooks();
  });

  async function loadHooks() {
    if (!repoPath) return;
    isLoading = true;
    try {
      const list = await getGitHooks(repoPath);
      hooks = list;
      if (list.length > 0) {
        const found = list.find((h) => h.name === selectedHookName) || list[0];
        selectedHookName = found.name;
        currentEditorContent = found.content;
        hasUnsavedChanges = false;
      }
    } catch (err: any) {
      toast.error(localeState.t('gitHooks.saveFailed'), err?.message || err);
    } finally {
      isLoading = false;
    }
  }

  function handleSelectHook(hook: GitHookInfo) {
    if (hook.name === selectedHookName) return;
    selectedHookName = hook.name;
    currentEditorContent = hook.content;
    hasUnsavedChanges = false;
  }

  async function handleToggle(hook: GitHookInfo, e: MouseEvent) {
    e.stopPropagation();
    if (!repoPath || isToggling) return;
    isToggling = true;
    const targetStatus = !hook.enabled;
    try {
      await toggleGitHook(repoPath, hook.name, targetStatus);
      hook.enabled = targetStatus;
      hook.exists = true;
      toast.success(
        localeState.t('gitHooks.toggleSuccess', {
          name: hook.name,
          status: targetStatus
            ? localeState.t('gitHooks.statusEnabled')
            : localeState.t('gitHooks.statusDisabled'),
        }),
        ''
      );
    } catch (err: any) {
      toast.error(localeState.t('gitHooks.toggleFailed'), err?.message || err);
    } finally {
      isToggling = false;
    }
  }

  async function handleSaveHook() {
    if (!repoPath || !selectedHook || isSaving) return;
    isSaving = true;
    try {
      await saveGitHook(
        repoPath,
        selectedHook.name,
        currentEditorContent,
        selectedHook.enabled
      );
      selectedHook.content = currentEditorContent;
      selectedHook.exists = true;
      hasUnsavedChanges = false;
      toast.success(localeState.t('gitHooks.savedSuccess'), '');
    } catch (err: any) {
      toast.error(localeState.t('gitHooks.saveFailed'), err?.message || err);
    } finally {
      isSaving = false;
    }
  }

  function handleApplySample() {
    if (!selectedHook?.sample_content) return;
    currentEditorContent = selectedHook.sample_content;
    hasUnsavedChanges = true;
    toast.info(localeState.t('gitHooks.restoreSample'), '');
  }

  function handleApplyTemplate(script: string) {
    currentEditorContent = script;
    hasUnsavedChanges = true;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal Backdrop -->
<div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
  <div class="w-full max-w-5xl h-[680px] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-zinc-950/50">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
          <Anchor class="w-5 h-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {localeState.t('gitHooks.title')}
            </h2>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              {activeHooksCount}/8 {localeState.t('gitHooks.active')}
            </span>
          </div>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-sans">
            {localeState.t('gitHooks.subtitle')}
          </p>
        </div>
      </div>

      <button
        onclick={onClose}
        class="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Body: 2-Column Split -->
    <div class="flex-1 min-h-0 flex overflow-hidden">
      <!-- Left Column: Hooks Navigation -->
      <div class="w-72 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-950/30 shrink-0">
        <div class="p-3 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
          <span>Git Lifecycle Hooks</span>
          <span class="font-mono text-zinc-400">.git/hooks/</span>
        </div>

        {#if isLoading}
          <div class="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <RefreshCw class="w-5 h-5 animate-spin text-amber-500" />
            <span class="text-xs font-mono">Loading hooks...</span>
          </div>
        {:else}
          <div class="flex-1 overflow-y-auto p-2 space-y-1">
            {#each hooks as hook}
              {@const isSelected = selectedHookName === hook.name}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                onclick={() => handleSelectHook(hook)}
                class="w-full flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-left {isSelected ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100 shadow-xs' : 'border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'}"
              >
                <div class="min-w-0 flex-1 pr-2">
                  <div class="flex items-center gap-1.5">
                    <FileCode class="w-3.5 h-3.5 shrink-0 {isSelected ? 'text-amber-500' : 'text-zinc-400'}" />
                    <span class="text-xs font-mono font-bold truncate">{hook.name}</span>
                  </div>
                  <div class="mt-1 flex items-center gap-1">
                    {#if hook.enabled}
                      <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        {localeState.t('gitHooks.active')}
                      </span>
                    {:else if hook.exists}
                      <span class="px-1.5 py-0.2 rounded text-[9px] font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {localeState.t('gitHooks.disabled')}
                      </span>
                    {:else}
                      <span class="px-1.5 py-0.2 rounded text-[9px] font-medium text-zinc-400 opacity-60">
                        {localeState.t('gitHooks.notConfigured')}
                      </span>
                    {/if}
                  </div>
                </div>

                <!-- Toggle Switch -->
                <button
                  type="button"
                  onclick={(e) => handleToggle(hook, e)}
                  disabled={isToggling}
                  title={hook.enabled ? localeState.t('gitHooks.disableHook') : localeState.t('gitHooks.enableHook')}
                  class="shrink-0 w-8 h-4.5 rounded-full transition-colors relative cursor-pointer {hook.enabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}"
                >
                  <span
                    class="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform shadow-xs {hook.enabled ? 'translate-x-3.5' : 'translate-x-0'}"
                  ></span>
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Right Column: Detail, Editor & Templates -->
      <div class="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900">
        {#if selectedHook}
          <!-- Hook Info & Action Toolbar -->
          <div class="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 bg-zinc-50/50 dark:bg-zinc-950/30">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedHook.name}
                </span>
                {#if hasUnsavedChanges}
                  <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes"></span>
                {/if}
                <span class="font-mono text-[11px] text-zinc-400 truncate">
                  .git/hooks/{selectedHook.name}{selectedHook.enabled ? '' : '.disabled'}
                </span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 shrink-0">
              <!-- Templates dropdown / quick insert -->
              {#if TEMPLATES[selectedHook.name]}
                {@const tpl = TEMPLATES[selectedHook.name]}
                <button
                  onclick={() => handleApplyTemplate(tpl.script)}
                  class="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-amber-500 text-zinc-700 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 bg-white dark:bg-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={localeState.t('gitHooks.useTemplate')}
                >
                  <Sparkles class="w-3.5 h-3.5 text-amber-500" />
                  <span>{localeState.t(tpl.labelKey as any)}</span>
                </button>
              {/if}

              <!-- Sample Restore -->
              {#if selectedHook.sample_content}
                <button
                  onclick={handleApplySample}
                  class="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={localeState.t('gitHooks.restoreSample')}
                >
                  <RotateCcw class="w-3 h-3" />
                  <span>{localeState.t('gitHooks.restoreSample')}</span>
                </button>
              {/if}

              <!-- Save Button -->
              <button
                onclick={handleSaveHook}
                disabled={isSaving}
                class="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {#if isSaving}
                  <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                  <span>{localeState.t('gitHooks.saving')}</span>
                {:else}
                  <Save class="w-3.5 h-3.5" />
                  <span>{localeState.t('gitHooks.saveChanges')}</span>
                {/if}
              </button>
            </div>
          </div>

          <!-- Description Banner -->
          <div class="px-5 py-2.5 bg-zinc-100/70 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800/80 flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <Info class="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span class="leading-relaxed">
              {localeState.t(selectedHook.description_key as any)}
            </span>
          </div>

          <!-- Monaco Editor Area -->
          <div class="flex-1 relative min-h-0 bg-white dark:bg-zinc-950">
            <MonacoEditor
              content={currentEditorContent}
              language="shell"
              readOnly={false}
              onChange={(val) => {
                currentEditorContent = val;
                hasUnsavedChanges = true;
              }}
              onSave={handleSaveHook}
            />
          </div>
        {:else}
          <div class="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <AlertCircle class="w-8 h-8 text-zinc-500 opacity-60" />
            <p class="text-xs">{localeState.t('gitHooks.noHooksFound')}</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Footer -->
    <div class="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2 text-[11px] text-zinc-500">
        <span class="font-mono bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">Ctrl + S</span>
        <span>{localeState.t('gitHooks.shortcutTip')}</span>
      </div>

      <button
        onclick={onClose}
        class="px-4 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
      >
        {localeState.t('common.close')}
      </button>
    </div>
  </div>
</div>
