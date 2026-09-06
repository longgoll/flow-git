<script lang="ts">
  import { marked } from 'marked';

  interface Props {
    content?: string | null;
    class?: string;
  }

  let { content = '', class: customClass = '' }: Props = $props();

  // Configure marked for GitHub Flavored Markdown
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  let renderedHtml = $derived.by(() => {
    if (!content || !content.trim()) return '';
    try {
      return marked.parse(content) as string;
    } catch (e) {
      console.error('Failed to parse markdown', e);
      return `<p>${content}</p>`;
    }
  });
</script>

<div class="markdown-body {customClass}">
  {@html renderedHtml}
</div>

<style>
  .markdown-body {
    font-size: 0.8125rem;
    line-height: 1.6;
    color: inherit;
    word-break: break-word;
  }

  :global(.markdown-body h1) {
    font-size: 1.25rem;
    font-weight: 700;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid rgba(150, 150, 150, 0.2);
  }

  :global(.markdown-body h2) {
    font-size: 1.05rem;
    font-weight: 600;
    margin-top: 0.875rem;
    margin-bottom: 0.375rem;
    padding-bottom: 0.2rem;
    border-bottom: 1px solid rgba(150, 150, 150, 0.15);
  }

  :global(.markdown-body h3) {
    font-size: 0.9375rem;
    font-weight: 600;
    margin-top: 0.75rem;
    margin-bottom: 0.25rem;
  }

  :global(.markdown-body p) {
    margin-bottom: 0.625rem;
  }

  :global(.markdown-body p:last-child) {
    margin-bottom: 0;
  }

  :global(.markdown-body ul) {
    list-style-type: disc;
    padding-left: 1.25rem;
    margin-bottom: 0.625rem;
  }

  :global(.markdown-body ol) {
    list-style-type: decimal;
    padding-left: 1.25rem;
    margin-bottom: 0.625rem;
  }

  :global(.markdown-body li) {
    margin-bottom: 0.25rem;
  }

  :global(.markdown-body blockquote) {
    padding-left: 0.75rem;
    border-left: 3px solid rgba(139, 92, 246, 0.6);
    color: rgba(140, 140, 140, 1);
    margin-bottom: 0.625rem;
    font-style: italic;
  }

  :global(.markdown-body pre) {
    background: rgba(15, 23, 42, 0.08);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    overflow-x: auto;
    margin-bottom: 0.75rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.75rem;
    border: 1px solid rgba(150, 150, 150, 0.15);
  }

  :global(.dark .markdown-body pre) {
    background: rgba(15, 15, 20, 0.9);
    border-color: rgba(60, 60, 70, 0.6);
  }

  :global(.markdown-body code:not(pre code)) {
    background: rgba(139, 92, 246, 0.1);
    color: rgb(124, 58, 237);
    padding: 0.15rem 0.35rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.75rem;
  }

  :global(.dark .markdown-body code:not(pre code)) {
    background: rgba(167, 139, 250, 0.15);
    color: rgb(196, 181, 253);
  }

  :global(.markdown-body hr) {
    border: 0;
    border-top: 1px solid rgba(150, 150, 150, 0.2);
    margin: 0.875rem 0;
  }

  :global(.markdown-body input[type="checkbox"]) {
    margin-right: 0.4rem;
    vertical-align: middle;
    accent-color: #8b5cf6;
  }

  :global(.markdown-body a) {
    color: #0284c7;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  :global(.dark .markdown-body a) {
    color: #38bdf8;
  }

  :global(.markdown-body table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0.75rem;
    font-size: 0.75rem;
  }

  :global(.markdown-body th),
  :global(.markdown-body td) {
    padding: 0.375rem 0.625rem;
    border: 1px solid rgba(150, 150, 150, 0.2);
    text-align: left;
  }

  :global(.markdown-body th) {
    background: rgba(150, 150, 150, 0.08);
    font-weight: 600;
  }
</style>
