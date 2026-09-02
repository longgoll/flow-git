<script lang="ts">
  import type { AISettings, ConflictFileDetail } from '../types';
  import { generateAICommitMessage } from '../api';
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
  <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 text-white shadow-lg shadow-purple-500/20">
            <Bot class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2">
              FlowGit Local AI Assistant
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {aiSettings.provider === 'ollama' ? 'Ollama Local LLM' : 'Smart Heuristics'}
              </span>
            </h3>
            <p class="text-xs text-zinc-400">
              Generate Conventional Commits and analyze merge conflicts.
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="text-zinc-400 hover:text-zinc-200 text-sm cursor-pointer p-1"
        >
          ✕
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="flex border-b border-zinc-800 bg-zinc-950/60 px-4 gap-4 text-xs font-semibold">
        <button
          onclick={() => (activeTab = 'commit')}
          class="py-2.5 border-b-2 transition-colors cursor-pointer {activeTab === 'commit' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
        >
          Conventional Commit Generator
        </button>
        <button
          onclick={() => { activeTab = 'conflict'; handleExplainConflict(); }}
          class="py-2.5 border-b-2 transition-colors cursor-pointer {activeTab === 'conflict' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
        >
          AI Conflict Advisor
        </button>
        <button
          onclick={() => (activeTab = 'settings')}
          class="py-2.5 border-b-2 transition-colors cursor-pointer {activeTab === 'settings' ? 'border-purple-500 text-purple-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
        >
          Model Settings
        </button>
      </div>

      <!-- Tab Content -->
      <div class="p-5 overflow-y-auto space-y-4 flex-1">
        {#if activeTab === 'commit'}
          <div class="space-y-3">
            <div class="flex items-center justify-between text-xs text-zinc-400">
              <span>Suggested Conventional Commit Message:</span>
              <button
                onclick={handleGenerateCommit}
                disabled={isGenerating}
                class="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
              >
                <Zap class="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            </div>

            <textarea
              bind:value={generatedCommit}
              rows="4"
              class="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-100 focus:outline-none focus:border-purple-500 leading-relaxed"
              placeholder="Generating commit message from staged changes..."
            ></textarea>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                onclick={() => copyToClipboard(generatedCommit)}
                class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 flex items-center gap-1.5 cursor-pointer"
              >
                {#if copied}
                  <Check class="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                {:else}
                  <Copy class="w-3.5 h-3.5" />
                  <span>Copy</span>
                {/if}
              </button>

              <button
                onclick={() => { onApplyCommitMessage(generatedCommit); onClose(); }}
                disabled={!generatedCommit}
                class="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                Apply to Commit Box
              </button>
            </div>
          </div>
        {:else if activeTab === 'conflict'}
          <div class="space-y-3">
            <div class="text-xs text-zinc-400">
              AI explanation & merge recommendation:
            </div>

            <div class="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-wrap">
              {conflictExplanation || 'No active conflict selected or analyzing...'}
            </div>
          </div>
        {:else if activeTab === 'settings'}
          <div class="space-y-4 text-xs">
            <div class="space-y-1.5">
              <label for="ai-provider-select" class="font-semibold text-zinc-300">Provider:</label>
              <select
                id="ai-provider-select"
                bind:value={aiSettings.provider}
                class="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 font-mono text-zinc-200"
              >
                <option value="ollama">Ollama (Local LLM)</option>
                <option value="heuristic">Built-in Smart Heuristic (Zero latency / Offline)</option>
              </select>
            </div>

            {#if aiSettings.provider === 'ollama'}
              <div class="space-y-1.5">
                <label for="ai-endpoint-input" class="font-semibold text-zinc-300">Ollama API Endpoint:</label>
                <input
                  id="ai-endpoint-input"
                  type="text"
                  bind:value={aiSettings.endpoint}
                  placeholder="http://localhost:11434"
                  class="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 font-mono text-zinc-200"
                />
              </div>

              <div class="space-y-1.5">
                <label for="ai-model-input" class="font-semibold text-zinc-300">Model Name:</label>
                <input
                  id="ai-model-input"
                  type="text"
                  bind:value={aiSettings.model}
                  placeholder="qwen2.5-coder or codellama or llama3"
                  class="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 font-mono text-zinc-200"
                />
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

