import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker';

// Configure Monaco Environment for Vite
let initialized = false;

export function ensureMonacoInitialized(): typeof monaco {
  if (initialized) return monaco;

  self.MonacoEnvironment = {
    getWorker(_: unknown, label: string) {
      if (label === 'json') {
        return new jsonWorker();
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new cssWorker();
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new htmlWorker();
      }
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker();
      }
      return new editorWorker();
    },
  };

  // Define FlowGit Custom Dark Theme matching zinc-950
  monaco.editor.defineTheme('flowgit-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '71717a', fontStyle: 'italic' },
      { token: 'keyword', foreground: '22d3ee' },
      { token: 'string', foreground: '34d399' },
      { token: 'number', foreground: 'fbbf24' },
      { token: 'type', foreground: '38bdf8' },
      { token: 'function', foreground: 'a78bfa' },
      { token: 'variable', foreground: 'e4e4e7' },
      { token: 'identifier', foreground: 'f4f4f5' },
    ],
    colors: {
      'editor.background': '#09090b', // zinc-950
      'editor.foreground': '#e4e4e7', // zinc-200
      'editor.lineHighlightBackground': '#18181b80', // zinc-900 / 50%
      'editor.selectionBackground': '#0e749060', // cyan-700 / 40%
      'editorLineNumber.foreground': '#52525b', // zinc-600
      'editorLineNumber.activeForeground': '#22d3ee', // cyan-400
      'editorCursor.foreground': '#22d3ee',
      'editorGutter.background': '#09090b',
      'diffEditor.insertedTextBackground': '#10b98125', // emerald-500 / 15%
      'diffEditor.removedTextBackground': '#f43f5e25', // rose-500 / 15%
      'diffEditor.insertedLineBackground': '#064e3b30',
      'diffEditor.removedLineBackground': '#88133730',
      'scrollbarSlider.background': '#27272a80',
      'scrollbarSlider.hoverBackground': '#3f3f4690',
      'scrollbarSlider.activeBackground': '#52525b',
    },
  });

  // Define FlowGit Custom Light Theme matching zinc-50 / white
  monaco.editor.defineTheme('flowgit-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '71717a', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0891b2' }, // cyan-600
      { token: 'string', foreground: '059669' }, // emerald-600
      { token: 'number', foreground: 'd97706' }, // amber-600
      { token: 'type', foreground: '0284c7' }, // sky-600
      { token: 'function', foreground: '7c3aed' }, // violet-600
      { token: 'variable', foreground: '27272a' }, // zinc-800
      { token: 'identifier', foreground: '18181b' }, // zinc-900
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#18181b', // zinc-900
      'editor.lineHighlightBackground': '#f4f4f580', // zinc-100
      'editor.selectionBackground': '#bae6fd80', // sky-200
      'editorLineNumber.foreground': '#a1a1aa', // zinc-400
      'editorLineNumber.activeForeground': '#0891b2', // cyan-600
      'editorCursor.foreground': '#0891b2',
      'editorGutter.background': '#fafafa',
      'diffEditor.insertedTextBackground': '#10b98120',
      'diffEditor.removedTextBackground': '#f43f5e20',
      'diffEditor.insertedLineBackground': '#dcfce760',
      'diffEditor.removedLineBackground': '#ffe4e660',
      'scrollbarSlider.background': '#d4d4d880',
      'scrollbarSlider.hoverBackground': '#a1a1aa90',
      'scrollbarSlider.activeBackground': '#71717a',
    },
  });

  initialized = true;
  return monaco;
}

export function getLanguageFromPath(filePath: string): string {
  const clean = filePath.toLowerCase().trim();
  const ext = clean.split('.').pop() || '';

  const extMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    rs: 'rust',
    py: 'python',
    json: 'json',
    jsonc: 'json',
    html: 'html',
    htm: 'html',
    svelte: 'html',
    vue: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    less: 'less',
    md: 'markdown',
    markdown: 'markdown',
    toml: 'ini',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    ps1: 'powershell',
    go: 'go',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    cc: 'cpp',
    cs: 'csharp',
    java: 'java',
    kt: 'kotlin',
    sql: 'sql',
    xml: 'xml',
    svg: 'xml',
    dockerfile: 'dockerfile',
    gitignore: 'ini',
    gitattributes: 'ini',
    env: 'ini',
  };

  return extMap[ext] || 'plaintext';
}
