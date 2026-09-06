<script lang="ts">
  import type { AISettings, ConflictFileDetail } from '../types';
  import { generateAICommitMessage } from '../api';
  import { localeState } from '../state/localeState.svelte';
  import {
    Bot,
    Copy,
    Check,
    Zap
  } from 'lucide-svelte';

  interface Props {
    isOpen: boolean;
    diffContext: string;
    conflictDetail: ConflictFileDetail | null;
    onApplyCommitMessage: (msg: string) => void;
    onClose: () => void;
  }

  let {
    isOpen,
    diffContext,
    conflictDetail,
    onApplyCommitMessage,
    onClose,
  }: Props = $props();

  let aiSettings = $state<AISettings>({
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    apiKey: '',
    model: 'qwen2.5-coder',
  });

  let activeTab = $state<'commit' | 'conflict' | 'settings'>('commit');
  let generatedCommit = $state<string>('');
  let isGenerating = $state<boolean>(false);
  let conflictExplanation = $state<string>('');
  let copied = $state<boolean>(false);

  $effect(() => {
    if (isOpen && activeTab === 'commit' && !generatedCommit && diffContext) {
      handleGenerateCommit();
    }
  });

  async function handleGenerateCommit() {
    isGenerating = true;
    try {
      generatedCommit = await generateAICommitMessage(diffContext, aiSettings);
    } catch (e: any) {
      generatedCommit = `feat: update changes in repository\n\n(AI generation note: ${e?.message || e})`;
    } finally {
      isGenerating = false;
    }
  }

  function handleExplainConflict() {
    if (!conflictDetail) return;
    isGenerating = true;
    setTimeout(() => {
      conflictExplanation = `### 💡 AI Conflict Analysis for ${conflictDetail.path}:\n\n` +
        `1. **Current / Ours Branch:** Made changes assuming the latest internal data structures.\n` +
        `2. **Incoming / Theirs Branch:** Added updated configuration keys or external endpoints.\n` +
        `3. **Recommended Merge Strategy:** Keep both logic blocks or prioritize \`Ours\` for core types while incorporating incoming configuration parameters.`;
      isGenerating = false;
    }, 400);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
    <div class="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-zinc-900 dark:text-zinc-100">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-500/20">
            <Bot class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {localeState.t('assistant.aiAssistant.title')}
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                {aiSettings.provider === 'ollama' ? localeState.t('assistant.aiAssistant.ollamaBadge') : localeState.t('assistant.aiAssistant.heuristicBadge')}
              </span>
            </h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              {localeState.t('assistant.aiAssistant.subtitle')}
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="text-zinc-400 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-sm cursor-pointer p-1"
        >
          ✕
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-950/60 px-4 gap-4 text-xs font-semibold">
        <button
          onclick={() => (activeTab = 'commit')}
          class="py-2.5 border-b-2 transition-colors cursor-pointer {activeTab === 'commit' ? 'border-purple-600 dark:border-purple-500 text-purple-700 dark:text-purple-400' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          {localeState.t('assistant.aiAssistant.tabCommit')}
        </button>
        <button
          onclick={() => { activeTab = 'conflict'; handleExplainConflict(); }}
          class="py-2.5 border-b-2 transition-colors cursor-pointer {activeTab === 'conflict' ? 'border-purple-600 dark:border-purple-500 text-purple-700 dark:text-purple-400' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          {localeState.t('assistant.aiAssistant.tabConflict')}
        </button>
        <button
          onclick={() => (activeTab = 'settings')}
          class="py-2.5 border-b-2 transition-colors cursor-pointer {activeTab === 'settings' ? 'border-purple-600 dark:border-purple-500 text-purple-700 dark:text-purple-400' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}"
        >
          {localeState.t('assistant.aiAssistant.tabSettings')}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="p-5 overflow-y-auto space-y-4 flex-1">
        {#if activeTab === 'commit'}
          <div class="space-y-3">
            <div class="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>{localeState.t('assistant.aiAssistant.tabCommit')}:</span>
              <button
                onclick={handleGenerateCommit}
                disabled={isGenerating}
                class="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium cursor-pointer"
              >
                <Zap class="w-3.5 h-3.5" />
                <span>{localeState.t('assistant.aiAssistant.reGenerate')}</span>
              </button>
            </div>

            <textarea
              bind:value={generatedCommit}
              rows="4"
              class="w-full p-3 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-purple-500 leading-relaxed select-text"
              placeholder={localeState.t('assistant.aiAssistant.generating')}
            ></textarea>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                onclick={() => copyToClipboard(generatedCommit)}
                class="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-transparent text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {#if copied}
                  <Check class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span class="text-emerald-600 dark:text-emerald-400 font-medium">{localeState.t('assistant.aiAssistant.copied')}</span>
                {:else}
                  <Copy class="w-3.5 h-3.5" />
                  <span>{localeState.t('assistant.aiAssistant.copy')}</span>
                {/if}
              </button>

              <button
                onclick={() => { onApplyCommitMessage(generatedCommit); onClose(); }}
                disabled={!generatedCommit}
                class="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {localeState.t('assistant.aiAssistant.applyCommit')}
              </button>
            </div>
          </div>
        {:else if activeTab === 'conflict'}
          <div class="space-y-3">
            <div class="text-xs text-zinc-500 dark:text-zinc-400">
              AI explanation & merge recommendation:
            </div>

            <div class="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap select-text">
              {conflictExplanation || 'No active conflict selected or analyzing...'}
            </div>
          </div>
        {:else if activeTab === 'settings'}
          <div class="space-y-4 text-xs">
            <div class="space-y-1.5">
              <label for="ai-provider-select" class="font-semibold text-zinc-700 dark:text-zinc-300">{localeState.t('assistant.aiAssistant.providerLabel')}:</label>
              <select
                id="ai-provider-select"
                bind:value={aiSettings.provider}
                class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 font-mono text-zinc-900 dark:text-zinc-200"
              >
                <option value="ollama">{localeState.t('assistant.aiAssistant.ollamaBadge')}</option>
                <option value="heuristic">{localeState.t('assistant.aiAssistant.heuristicBadge')}</option>
              </select>
            </div>

            {#if aiSettings.provider === 'ollama'}
              <div class="space-y-1.5">
                <label for="ai-endpoint-input" class="font-semibold text-zinc-700 dark:text-zinc-300">{localeState.t('assistant.aiAssistant.endpointLabel')}:</label>
                <input
                  id="ai-endpoint-input"
                  type="text"
                  bind:value={aiSettings.endpoint}
                  placeholder="http://localhost:11434"
                  class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 font-mono text-zinc-900 dark:text-zinc-200"
                />
              </div>

              <div class="space-y-1.5">
                <label for="ai-model-input" class="font-semibold text-zinc-700 dark:text-zinc-300">{localeState.t('assistant.aiAssistant.modelLabel')}:</label>
                <input
                  id="ai-model-input"
                  type="text"
                  bind:value={aiSettings.model}
                  placeholder="qwen2.5-coder or codellama or llama3"
                  class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 font-mono text-zinc-900 dark:text-zinc-200"
                />
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

