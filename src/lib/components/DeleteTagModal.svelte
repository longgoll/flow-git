<script lang="ts">
  import { AlertTriangle, GitCommit, MessageSquare, Tag, Trash2, X } from 'lucide-svelte';
  import type { TagInfo } from '../types';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    show: boolean;
    tag: TagInfo | null;
    isLoading?: boolean;
    onClose: () => void;
    onConfirmDelete: (tag: TagInfo) => Promise<void>;
  }

  let {
    show,
    tag,
    isLoading = false,
    onClose,
    onConfirmDelete,
  }: Props = $props();

  async function handleConfirm() {
    if (!tag || isLoading) return;
    await onConfirmDelete(tag);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!show) return;
    if (e.key === 'Escape' && !isLoading) {
      e.preventDefault();
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show && tag}
  <div
    class="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-tag-title"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0"
      onclick={() => {
        if (!isLoading) onClose();
      }}
    ></div>

    <div
      class="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-200 font-sans z-10 animate-in zoom-in-95 duration-150"
    >
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/50">
        <div class="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold text-sm">
          <div class="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center">
            <Trash2 class="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <span id="delete-tag-title">{localeState.t('modals.deleteTag.title')}</span>
        </div>
        <button
          onclick={onClose}
          disabled={isLoading}
          class="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 space-y-4">
        <p class="text-xs text-zinc-600 dark:text-zinc-300">
          {localeState.t('modals.deleteTag.description')}
        </p>

        <!-- Tag Details Card -->
        <div class="p-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{localeState.t('modals.deleteTag.tagName')}</span>
            <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 font-mono text-xs font-bold">
              <Tag class="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>{tag.name}</span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{localeState.t('modals.deleteTag.targetCommit')}</span>
            <div class="flex items-center gap-1 font-mono text-xs text-cyan-600 dark:text-cyan-400">
              <GitCommit class="w-3 h-3" />
              <span>{tag.target_commit_id.slice(0, 7)}</span>
            </div>
          </div>

          {#if tag.message}
            <div class="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/50">
              <span class="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mb-1">
                <MessageSquare class="w-2.5 h-2.5" />
                {localeState.t('modals.deleteTag.message')}
              </span>
              <p class="text-xs text-zinc-700 dark:text-zinc-300 italic bg-white/60 dark:bg-zinc-900/60 p-2 rounded-md border border-zinc-200/40 dark:border-zinc-800">
                "{tag.message}"
              </p>
            </div>
          {/if}
        </div>

        <!-- Warning Callout -->
        <div class="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
          <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <span class="leading-relaxed">{localeState.t('modals.deleteTag.warning')}</span>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5 bg-zinc-50/80 dark:bg-zinc-950/40">
        <button
          type="button"
          onclick={onClose}
          disabled={isLoading}
          class="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          {localeState.t('modals.deleteTag.cancelBtn')}
        </button>

        <button
          type="button"
          onclick={handleConfirm}
          disabled={isLoading}
          class="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-all cursor-pointer shadow-sm hover:shadow-rose-600/25 flex items-center gap-1.5 disabled:opacity-60"
        >
          {#if isLoading}
            <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>{localeState.t('modals.deleteTag.deleting')}</span>
          {:else}
            <Trash2 class="w-3.5 h-3.5" />
            <span>{localeState.t('modals.deleteTag.confirmBtn')}</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
