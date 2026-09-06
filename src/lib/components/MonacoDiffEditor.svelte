<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type * as MonacoType from 'monaco-editor';
  import { ensureMonacoInitialized, getLanguageFromPath } from '../monacoEnv';
  import { themeState } from '../state/themeState.svelte';

  interface Props {
    originalContent: string;
    modifiedContent: string;
    filePath: string;
    viewMode?: 'split' | 'unified';
    fontSize?: number;
    minimap?: boolean;
    ignoreTrimWhitespace?: boolean;
  }

  let {
    originalContent,
    modifiedContent,
    filePath,
    viewMode = 'unified',
    fontSize = 12,
    minimap = true,
    ignoreTrimWhitespace = false,
  }: Props = $props();

  let diffContainer: HTMLDivElement | null = $state(null);
  let diffEditor: MonacoType.editor.IStandaloneDiffEditor | null = null;
  let originalModel: MonacoType.editor.ITextModel | null = null;
  let modifiedModel: MonacoType.editor.ITextModel | null = null;
  let monaco: typeof MonacoType | null = null;

  let resolvedLang = $derived(getLanguageFromPath(filePath));

  function updateModels() {
    if (!monaco || !diffEditor) return;

    originalModel?.dispose();
    modifiedModel?.dispose();

    originalModel = monaco.editor.createModel(originalContent, resolvedLang);
    modifiedModel = monaco.editor.createModel(modifiedContent, resolvedLang);

    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel,
    });

    // Auto-reveal the first change so user doesn't have to scroll through unchanged lines
    setTimeout(() => {
      if (diffEditor) {
        try {
          const lineChanges = diffEditor.getLineChanges();
          if (lineChanges && lineChanges.length > 0) {
            const firstChange = lineChanges[0];
            const targetLine = firstChange.modifiedStartLineNumber || firstChange.originalStartLineNumber || 1;
            diffEditor.getModifiedEditor().revealLineInCenter(targetLine);
          }
        } catch (_) {}
      }
    }, 60);
  }

  onMount(() => {
    monaco = ensureMonacoInitialized();
    if (!diffContainer) return;

    diffEditor = monaco.editor.createDiffEditor(diffContainer, {
      theme: themeState.isDark ? 'flowgit-dark' : 'flowgit-light',
      readOnly: true,
      originalEditable: false,
      renderSideBySide: viewMode === 'split',
      fontSize,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      fontLigatures: true,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      renderWhitespace: 'selection',
      diffWordWrap: 'on',
      enableSplitViewResizing: true,
      renderOverviewRuler: true,
      renderValidationDecorations: 'off',
      ignoreTrimWhitespace,
      hideUnchangedRegions: {
        enabled: true,
        minimumLineCount: 8,
        contextLineCount: 3,
      },
    } as any);

    updateModels();
  });

  // React to theme changes
  $effect(() => {
    if (monaco) {
      monaco.editor.setTheme(themeState.isDark ? 'flowgit-dark' : 'flowgit-light');
    }
  });

  // Watch for changes in originalContent, modifiedContent, or filePath
  $effect(() => {
    // track dependencies
    void originalContent;
    void modifiedContent;
    void filePath;
    if (diffEditor && monaco) {
      updateModels();
    }
  });

  // Watch for viewMode or ignoreTrimWhitespace changes
  $effect(() => {
    if (diffEditor) {
      diffEditor.updateOptions({
        renderSideBySide: viewMode === 'split',
        fontSize,
        ignoreTrimWhitespace,
      });
    }
    void minimap;
  });

  onDestroy(() => {
    originalModel?.dispose();
    modifiedModel?.dispose();
    diffEditor?.dispose();
  });
</script>

<div class="relative w-full h-full min-h-[250px] overflow-hidden bg-white dark:bg-zinc-950">
  <div bind:this={diffContainer} class="w-full h-full"></div>
</div>
