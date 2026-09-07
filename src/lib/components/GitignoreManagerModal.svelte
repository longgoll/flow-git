<script lang="ts">
  import { onMount } from 'svelte';
  import {
    FileCode,
    X,
    Save,
    Sparkles,
    Plus,
  } from 'lucide-svelte';
  import MonacoEditor from './MonacoEditor.svelte';
  import { getFileContent, saveFileContent, generateStandardGitignore } from '../api';
  import { localeState } from '../state/localeState.svelte';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    repoPath: string;
    onClose: () => void;
    onUpdated?: () => Promise<void>;
  }

  let { repoPath, onClose, onUpdated }: Props = $props();

  let content = $state<string>('');
  let initialContent = $state<string>('');
  let isLoading = $state<boolean>(true);
  let isSaving = $state<boolean>(false);
  let isGenerating = $state<boolean>(false);

  const PRESET_TEMPLATES = [
    {
      name: 'Node / Web',
      rules: [
        '# Node.js & Web build',
        'node_modules/',
        'dist/',
        'build/',
        '.next/',
        '.nuxt/',
        '.svelte-kit/',
        '.turbo/',
        '.env',
        '.env.local',
        '*.log',
      ].join('\n'),
    },
    {
      name: 'Rust / Tauri',
      rules: [
        '# Rust & Tauri builds',
        'target/',
        'src-tauri/target/',
        '*.rs.bk',
      ].join('\n'),
    },
    {
      name: 'Python',
      rules: [
        '# Python artifacts & virtual environments',
        '__pycache__/',
        '*.py[cod]',
        '*$py.class',
        '.venv/',
        'venv/',
        'env/',
        '.pytest_cache/',
      ].join('\n'),
    },
    {
      name: 'Go',
      rules: [
        '# Go binaries & vendor',
        'bin/',
        'vendor/',
        '*.exe',
      ].join('\n'),
    },
    {
      name: 'OS & IDE',
      rules: [
        '# OS metadata & Editor configs',
        '.DS_Store',
        'Thumbs.db',
        '.idea/',
        '.vscode/*',
        '!.vscode/settings.json',
        '!.vscode/extensions.json',
      ].join('\n'),
    },
  ];

  onMount(async () => {
    await loadGitignore();
  });

  async function loadGitignore() {
    if (!repoPath) return;
    isLoading = true;
    try {
      const res = await getFileContent(repoPath, '.gitignore');
      content = res?.content || '';
      initialContent = content;
    } catch {
      // .gitignore does not exist yet
      content = '';
      initialContent = '';
    } finally {
      isLoading = false;
    }
  }

  function appendTemplate(tplName: string, rules: string) {
    const trimmed = content.trim();
    if (!trimmed) {
      content = rules + '\n';
    } else {
      content = trimmed + '\n\n' + rules + '\n';
    }
    toast.info(
      localeState.t('workingTree.gitignoreModal.presetsTitle'),
      localeState.t('workingTree.gitignoreModal.templateAppended', { template: tplName })
    );
  }

  async function handleAutoGenerate() {
    if (!repoPath) return;
    isGenerating = true;
    try {
      const added = await generateStandardGitignore(repoPath);
      // Reload updated content
      await loadGitignore();
      toast.success(
        localeState.t('actions.switcher.gitignoreGeneratedTitle'),
        localeState.t('actions.switcher.gitignoreGeneratedMsg', { count: added.length })
      );
      if (onUpdated) await onUpdated();
    } catch (err: any) {
      toast.error(
        localeState.t('workingTree.gitignoreModal.saveError'),
        err?.message || String(err)
      );
    } finally {
      isGenerating = false;
    }
  }

  async function handleSave() {
    if (!repoPath) return;
    isSaving = true;
    try {
      await saveFileContent(repoPath, '.gitignore', content);
      initialContent = content;
      toast.success(
        localeState.t('workingTree.gitignoreModal.saveSuccess'),
        '.gitignore'
      );
      if (onUpdated) await onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(
        localeState.t('workingTree.gitignoreModal.saveError'),
        err?.message || String(err)
      );
    } finally {
      isSaving = false;
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none font-sans"
  role="dialog"
  aria-modal="true"
>
  <div
    class="w-full max-w-4xl h-[85vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100"
  >
    <!-- Header -->
    <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400">
          <FileCode class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{localeState.t('workingTree.gitignoreModal.title')}</span>
            <span class="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 border border-zinc-200 dark:border-zinc-700 font-normal">
              .gitignore
            </span>
          </h2>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {localeState.t('workingTree.gitignoreModal.subtitle')}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          onclick={onClose}
          class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          title={localeState.t('workingTree.gitignoreModal.btnCancel')}
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Quick Preset Bar -->
    <div class="px-6 py-2.5 bg-zinc-100/60 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 shrink-0 flex-wrap">
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          {localeState.t('workingTree.gitignoreModal.presetsTitle')}
        </span>
        <div class="flex items-center gap-1.5 flex-wrap">
          {#each PRESET_TEMPLATES as tpl}
            <button
              onclick={() => appendTemplate(tpl.name, tpl.rules)}
              class="px-2.5 py-1 rounded-md text-[11px] font-mono bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700/80 shadow-2xs flex items-center gap-1 cursor-pointer transition-all hover:border-cyan-500/50"
              title={`Thêm quy tắc ${tpl.name}`}
            >
              <Plus class="w-2.5 h-2.5 text-cyan-500" />
              <span>{tpl.name}</span>
            </button>
          {/each}
        </div>
      </div>

      <button
        onclick={handleAutoGenerate}
        disabled={isGenerating}
        class="px-3 py-1 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
      >
        <Sparkles class="w-3 h-3 text-amber-500" />
        <span>{localeState.t('workingTree.gitignoreModal.btnGenerateStandard')}</span>
      </button>
    </div>

    <!-- Editor Body -->
    <div class="flex-1 min-h-0 bg-white dark:bg-zinc-950 relative">
      {#if isLoading}
        <div class="h-full flex items-center justify-center gap-2 text-xs text-zinc-400">
          <div class="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
          <span>Đang tải file .gitignore...</span>
        </div>
      {:else}
        <MonacoEditor
          {content}
          filePath=".gitignore"
          language="ini"
          readOnly={false}
          fontSize={13}
          minimap={false}
          onChange={(newVal) => (content = newVal)}
          onSave={handleSave}
        />
      {/if}
    </div>

    <!-- Footer Controls -->
    <div class="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
      <div class="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
        {#if content !== initialContent}
          <span class="text-amber-600 dark:text-amber-400">● Có thay đổi chưa lưu (Ctrl + S để lưu)</span>
        {:else}
          <span>Mẹo: Dùng ký tự # cho dòng chú thích</span>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={onClose}
          class="px-4 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors"
        >
          {localeState.t('workingTree.gitignoreModal.btnCancel')}
        </button>

        <button
          type="button"
          onclick={handleSave}
          disabled={isSaving || content === initialContent}
          class="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {#if isSaving}
            <div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>{localeState.t('workingTree.gitignoreModal.btnSaving')}</span>
          {:else}
            <Save class="w-3.5 h-3.5" />
            <span>{localeState.t('workingTree.gitignoreModal.btnSave')}</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>
