<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type * as MonacoType from 'monaco-editor';
  import { ensureMonacoInitialized, getLanguageFromPath } from '../monacoEnv';
  import { themeState } from '../state/themeState.svelte';
  import type { BlameHunkItem } from '../types';

  interface Props {
    content: string;
    filePath?: string;
    language?: string;
    readOnly?: boolean;
    fontSize?: number;
    wordWrap?: 'on' | 'off';
    minimap?: boolean;
    targetLine?: number | null;
    blameHunks?: BlameHunkItem[];
    showInlineBlame?: boolean;
    onChange?: (newContent: string) => void;
    onSave?: () => void;
  }

  let {
    content,
    filePath = '',
    language,
    readOnly = true,
    fontSize = 12,
    wordWrap = 'on',
    minimap = true,
    targetLine = null,
    blameHunks = [],
    showInlineBlame = false,
    onChange,
    onSave,
  }: Props = $props();

  let editorContainer: HTMLDivElement | null = $state(null);
  let editorInstance: MonacoType.editor.IStandaloneCodeEditor | null = null;
  let currentModel: MonacoType.editor.ITextModel | null = null;
  let monaco: typeof MonacoType | null = null;
  let currentBlameDecorationIds: string[] = [];
  let hoverDisposable: MonacoType.IDisposable | null = null;

  function formatRelativeDate(timestamp: number): string {
    if (!timestamp) return '';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return 'vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d trước`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo trước`;
    return `${Math.floor(diff / 31536000)}y trước`;
  }

  function updateInlineBlame(lineNumber: number) {
    if (!editorInstance || !monaco || !currentModel) return;

    if (!showInlineBlame || !blameHunks || blameHunks.length === 0 || lineNumber <= 0) {
      if (currentBlameDecorationIds.length > 0) {
        currentBlameDecorationIds = editorInstance.deltaDecorations(currentBlameDecorationIds, []);
      }
      return;
    }

    const hunk = blameHunks.find(
      (h) => lineNumber >= h.final_start_line && lineNumber < h.final_start_line + h.lines_in_hunk
    );

    if (!hunk) {
      if (currentBlameDecorationIds.length > 0) {
        currentBlameDecorationIds = editorInstance.deltaDecorations(currentBlameDecorationIds, []);
      }
      return;
    }

    const maxCol = currentModel.getLineMaxColumn(lineNumber);
    const dateStr = formatRelativeDate(hunk.timestamp);
    const summary = hunk.summary ? ` • ${hunk.summary}` : '';
    const ghostText = `   👤 ${hunk.author_name}, ${dateStr}${summary}`;

    currentBlameDecorationIds = editorInstance.deltaDecorations(currentBlameDecorationIds, [
      {
        range: new monaco.Range(lineNumber, maxCol, lineNumber, maxCol),
        options: {
          after: {
            content: ghostText,
            inlineClassName: 'monaco-gitlens-ghost-text',
          },
          isWholeLine: false,
        },
      },
    ]);
  }

  function setupHoverProvider() {
    hoverDisposable?.dispose();
    if (!monaco || !showInlineBlame) return;

    hoverDisposable = monaco.languages.registerHoverProvider(resolvedLang, {
      provideHover: (model, position) => {
        if (!currentModel || model.id !== currentModel.id) return null;
        if (!showInlineBlame || !blameHunks || blameHunks.length === 0) return null;

        const line = position.lineNumber;
        const hunk = blameHunks.find(
          (h) => line >= h.final_start_line && line < h.final_start_line + h.lines_in_hunk
        );
        if (!hunk) return null;

        return {
          range: new monaco!.Range(line, 1, line, model.getLineMaxColumn(line)),
          contents: [
            { value: `**Commit \`${hunk.final_short_id}\`** — *${formatRelativeDate(hunk.timestamp)}*` },
            { value: `👤 **${hunk.author_name}** \`<${hunk.author_email}>\`` },
            { value: `> ${hunk.summary || '(không có commit message)'}` },
            { value: `*Dòng ${hunk.final_start_line} – ${hunk.final_start_line + hunk.lines_in_hunk - 1}*` },
          ],
        };
      },
    });
  }

  let resolvedLang = $derived(language || (filePath ? getLanguageFromPath(filePath) : 'plaintext'));

  onMount(() => {
    monaco = ensureMonacoInitialized();
    if (!editorContainer) return;

    currentModel = monaco.editor.createModel(content, resolvedLang);

    editorInstance = monaco.editor.create(editorContainer, {
      model: currentModel,
      theme: themeState.isDark ? 'flowgit-dark' : 'flowgit-light',
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
      renderValidationDecorations: 'off',
      padding: { top: 8, bottom: 8 },
    });

    editorInstance.onDidChangeModelContent(() => {
      if (editorInstance && currentModel) {
        const val = currentModel.getValue();
        onChange?.(val);
      }
    });

    // GitLens-style inline blame on cursor movement
    editorInstance.onDidChangeCursorPosition((e) => {
      updateInlineBlame(e.position.lineNumber);
    });

    // Bind Ctrl+S / Cmd+S
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    if (targetLine && targetLine > 0) {
      editorInstance.revealLineInCenter(targetLine);
      editorInstance.setPosition({ lineNumber: targetLine, column: 1 });
    }

    setupHoverProvider();
  });

  // React to theme changes
  $effect(() => {
    if (monaco) {
      monaco.editor.setTheme(themeState.isDark ? 'flowgit-dark' : 'flowgit-light');
    }
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

  // React to inline blame toggling or hunks updating
  $effect(() => {
    if (editorInstance) {
      setupHoverProvider();
      const pos = editorInstance.getPosition();
      if (pos) {
        updateInlineBlame(pos.lineNumber);
      } else {
        updateInlineBlame(0);
      }
    }
  });

  $effect(() => {
    if (editorInstance) {
      editorInstance.updateOptions({
        fontSize,
        wordWrap,
        minimap: { enabled: minimap },
        readOnly,
        renderValidationDecorations: 'off',
      });
    }
  });

  $effect(() => {
    if (editorInstance && targetLine && targetLine > 0) {
      editorInstance.revealLineInCenter(targetLine);
      editorInstance.setPosition({ lineNumber: targetLine, column: 1 });
    }
  });

  onDestroy(() => {
    hoverDisposable?.dispose();
    currentModel?.dispose();
    editorInstance?.dispose();
  });
</script>

<div class="relative w-full h-full min-h-[200px] overflow-hidden bg-white dark:bg-zinc-950">
  <div bind:this={editorContainer} class="w-full h-full"></div>
</div>

<style>
  :global(.monaco-gitlens-ghost-text) {
    color: rgba(113, 113, 122, 0.65) !important;
    font-style: italic !important;
    font-size: 0.85em !important;
    margin-left: 1.5rem !important;
    pointer-events: none !important;
    user-select: none !important;
  }
  :global(.dark .monaco-gitlens-ghost-text) {
    color: rgba(161, 161, 170, 0.55) !important;
  }
</style>
