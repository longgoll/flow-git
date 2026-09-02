<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type * as MonacoType from 'monaco-editor';
  import { ensureMonacoInitialized, getLanguageFromPath } from '../monacoEnv';

  interface Props {
    content: string;
    filePath?: string;
    language?: string;
    readOnly?: boolean;
    fontSize?: number;
    wordWrap?: 'on' | 'off';
    minimap?: boolean;
  }

  let {
    content,
    filePath = '',
    language,
    readOnly = true,
    fontSize = 12,
    wordWrap = 'on',
    minimap = true,
  }: Props = $props();

  let editorContainer: HTMLDivElement | null = $state(null);
  let editorInstance: MonacoType.editor.IStandaloneCodeEditor | null = null;
  let currentModel: MonacoType.editor.ITextModel | null = null;
  let monaco: typeof MonacoType | null = null;

  let resolvedLang = $derived(language || (filePath ? getLanguageFromPath(filePath) : 'plaintext'));

  onMount(() => {
    monaco = ensureMonacoInitialized();
    if (!editorContainer) return;

    currentModel = monaco.editor.createModel(content, resolvedLang);

    editorInstance = monaco.editor.create(editorContainer, {
      model: currentModel,
      theme: 'flowgit-dark',
      readOnly,
      fontSize,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      fontLigatures: true,
      lineNumbers: 'on',
      minimap: { enabled: minimap, renderCharacters: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      wordWrap,
      smoothScrolling: true,
      renderWhitespace: 'selection',
      padding: { top: 8, bottom: 8 },
    });
  });

  // React to content or language/filePath changes
  $effect(() => {
    if (!editorInstance || !monaco) return;

    if (currentModel) {
      if (currentModel.getValue() !== content) {
        currentModel.setValue(content);
      }
      monaco.editor.setModelLanguage(currentModel, resolvedLang);
    }
  });

  $effect(() => {
    if (editorInstance) {
      editorInstance.updateOptions({
        fontSize,
        wordWrap,
        minimap: { enabled: minimap },
        readOnly,
      });
    }
  });

  onDestroy(() => {
    currentModel?.dispose();
    editorInstance?.dispose();
  });
</script>

<div class="relative w-full h-full min-h-[200px] overflow-hidden bg-zinc-950">
  <div bind:this={editorContainer} class="w-full h-full"></div>
</div>
