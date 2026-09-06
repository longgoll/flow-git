<script lang="ts">
  import { Tag, X } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';
  import type { CommitNode } from '../types';

  interface Props {
    isOpen: boolean;
    commit: CommitNode | null;
    isLoading?: boolean;
    onClose: () => void;
    onConfirm: (tagName: string, message?: string) => Promise<void>;
  }

  let {
    isOpen = false,
    commit,
    isLoading = false,
    onClose,
    onConfirm,
  }: Props = $props();

  let tagName = $state('');
  let tagMessage = $state('');
  let isAnnotated = $state(false);

  $effect(() => {
    if (isOpen) {
      tagName = '';
      tagMessage = '';
      isAnnotated = false;
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!tagName.trim() || isLoading) return;
    await onConfirm(tagName.trim(), isAnnotated && tagMessage.trim() ? tagMessage.trim() : undefined);
  }
</script>

{#if isOpen && commit}
  <div
    class="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100 select-none"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-200 font-sans"
    >
      <!-- Header -->
      <div class="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/40">
        <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
          <Tag class="w-4 h-4" />
          <span>{localeState.t('modals.createTag.title')}</span>
        </div>
        <button
          onclick={onClose}
          class="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Form Content -->
      <form onsubmit={handleSubmit} class="p-5 space-y-4">
        <!-- Target Commit Info -->
        <div class="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 text-xs space-y-1">
          <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-[11px]">
            <span>{localeState.t('modals.createTag.targetCommit')}</span>
            <span class="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{commit.short_id}</span>
          </div>
          <p class="text-zinc-800 dark:text-zinc-200 truncate font-medium">{commit.summary}</p>
        </div>

        <!-- Tag Name Input -->
        <div class="space-y-1.5">
          <label for="tag-name" class="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {localeState.t('modals.createTag.tagNameLabel')} <span class="text-rose-500 dark:text-rose-400">*</span>
          </label>
          <input
            id="tag-name"
            type="text"
            bind:value={tagName}
            placeholder={localeState.t('modals.createTag.placeholder')}
            class="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono select-text"
            required
          />
        </div>

        <!-- Annotated Checkbox -->
        <label class="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
          <input
            type="checkbox"
            bind:checked={isAnnotated}
            class="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-amber-500 focus:ring-amber-500/20"
          />
          <span>{localeState.t('modals.createTag.annotatedCheckbox')}</span>
        </label>

        {#if isAnnotated}
          <div class="space-y-1.5 animate-in fade-in duration-150">
            <label for="tag-msg" class="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {localeState.t('modals.createTag.tagMessageLabel')}
            </label>
            <textarea
              id="tag-msg"
              bind:value={tagMessage}
              placeholder={localeState.t('modals.createTag.tagMessagePlaceholder')}
              rows="3"
              class="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-amber-500 select-text"
            ></textarea>
          </div>
        {/if}

        <!-- Actions Footer -->
        <div class="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onclick={onClose}
            class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {localeState.t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={!tagName.trim() || isLoading}
            class="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20"
          >
            {isLoading ? localeState.t('modals.createTag.creating') : localeState.t('modals.createTag.createBtn')}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
