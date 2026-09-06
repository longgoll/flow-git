<script lang="ts">
  import type { BranchInfo } from '../types';
  import { GitBranch, X, Sparkles, AlertCircle, Check } from 'lucide-svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    open: boolean;
    branches: BranchInfo[];
    currentBranch?: string;
    onConfirm?: (newName: string, fromRef: string, checkout: boolean) => void;
    onClose?: () => void;
  }

  let {
    open = false,
    branches = [],
    currentBranch = 'main',
    onConfirm,
    onClose,
  }: Props = $props();

  let newBranchName = $state('');
  let fromRef = $state('');
  let checkoutAfter = $state(true);
  let inputEl = $state<HTMLInputElement | null>(null);

  // Khi modal mở, đặt lại state và focus vào input
  $effect(() => {
    if (open) {
      newBranchName = '';
      fromRef = currentBranch;
      checkoutAfter = true;
      // Focus sau khi animation xong
      setTimeout(() => inputEl?.focus(), 80);
    }
  });

  const INVALID_CHARS = /[\s~^:?*\[\\]/;
  const INVALID_SEQUENCES = /\.\.|\.lock$|@\{|^-/;

  let validationError = $derived.by(() => {
    const name = newBranchName.trim();
    if (!name) return '';
    if (INVALID_CHARS.test(name)) return localeState.t('modals.createBranch.invalidChars');
    if (INVALID_SEQUENCES.test(name)) return localeState.t('modals.createBranch.invalidSeq');
    if (name.length > 100) return localeState.t('modals.createBranch.tooLong');
    return '';
  });

  let isValid = $derived(newBranchName.trim().length > 0 && validationError === '');

  // Danh sách nhánh local để chọn làm gốc
  let localBranches = $derived(branches.filter((b) => !b.is_remote));

  function handleSubmit() {
    if (!isValid) return;
    onConfirm?.(newBranchName.trim(), fromRef, checkoutAfter);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && isValid) handleSubmit();
    if (e.key === 'Escape') onClose?.();
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-xs select-none"
    onclick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-label={localeState.t('modals.createBranch.title')}
    tabindex="-1"
  >
    <!-- Modal card -->
    <div class="relative w-full max-w-md mx-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl shadow-2xl overflow-hidden animate-in text-zinc-900 dark:text-zinc-100">

      <!-- Header gradient bar -->
      <div class="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"></div>

      <!-- Header -->
      <div class="flex items-center justify-between px-5 pt-4 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/25">
            <GitBranch class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{localeState.t('modals.createBranch.title')}</h2>
            <p class="text-[11px] text-zinc-500">{localeState.t('modals.createBranch.subtitle')}</p>
          </div>
        </div>
        <button
          onclick={onClose}
          class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label={localeState.t('common.close')}
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="px-5 pb-5 space-y-4">

        <!-- Tên nhánh mới -->
        <div class="space-y-1.5">
          <label for="new-branch-name" class="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            {localeState.t('modals.createBranch.branchNameLabel')}
          </label>
          <div class="relative">
            <input
              id="new-branch-name"
              bind:this={inputEl}
              bind:value={newBranchName}
              onkeydown={handleKeydown}
              type="text"
              placeholder={localeState.t('modals.createBranch.placeholder')}
              class="w-full px-3 py-2.5 pr-9 bg-zinc-50 dark:bg-zinc-800/80 border rounded-xl text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 outline-none transition-all select-text
                {validationError
                  ? 'border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : isValid
                    ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-zinc-300 dark:border-zinc-700/60 focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/15'}"
            />
            {#if isValid}
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400">
                <Check class="w-4 h-4" />
              </span>
            {:else if validationError}
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-rose-600 dark:text-rose-400">
                <AlertCircle class="w-4 h-4" />
              </span>
            {/if}
          </div>
          {#if validationError}
            <p class="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle class="w-3 h-3 shrink-0" />
              {validationError}
            </p>
          {/if}
        </div>

        <!-- Tạo từ nhánh nào -->
        <div class="space-y-1.5">
          <label for="from-branch" class="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            {localeState.t('modals.createBranch.fromBranchLabel')}
          </label>
          <select
            id="from-branch"
            bind:value={fromRef}
            class="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700/60 rounded-xl text-sm font-mono text-zinc-900 dark:text-zinc-200 outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/15 transition-all cursor-pointer appearance-none"
          >
            {#each localBranches as b (b.name)}
              <option value={b.shorthand}>{b.shorthand}{b.is_head ? ' (HEAD)' : ''}</option>
            {/each}
          </select>
          <p class="text-[10px] text-zinc-500 pl-0.5">
            Nhánh mới sẽ bắt đầu tại commit mới nhất của <span class="text-zinc-700 dark:text-zinc-400 font-mono">{fromRef}</span>
          </p>
        </div>

        <!-- Checkbox checkout -->
        <label class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/40 cursor-pointer group hover:border-cyan-500/30 transition-colors">
          <div class="relative shrink-0">
            <input
              type="checkbox"
              bind:checked={checkoutAfter}
              class="sr-only"
            />
            <div class="w-4 h-4 rounded border-2 transition-all flex items-center justify-center
              {checkoutAfter ? 'bg-cyan-600 dark:bg-cyan-500 border-cyan-600 dark:border-cyan-500' : 'bg-transparent border-zinc-300 dark:border-zinc-600 group-hover:border-zinc-400'}">
              {#if checkoutAfter}
                <Check class="w-3 h-3 text-white" />
              {/if}
            </div>
          </div>
          <div>
            <p class="text-[12px] font-medium text-zinc-800 dark:text-zinc-200">{localeState.t('modals.createBranch.checkoutCheckbox')}</p>
            <p class="text-[10px] text-zinc-500">Checkout và đặt HEAD vào nhánh sau khi tạo</p>
          </div>
        </label>

        <!-- Preview lệnh git tương đương -->
        {#if newBranchName.trim()}
          <div class="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 flex items-start gap-2 select-text">
            <Sparkles class="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-500/60" />
            <span>
              git checkout -b <span class="text-cyan-700 dark:text-cyan-300 font-semibold">{newBranchName.trim() || '…'}</span>
              <span class="text-zinc-400 dark:text-zinc-600"> {fromRef}</span>
            </span>
          </div>
        {/if}

        <!-- Actions -->
        <div class="flex gap-2.5 pt-1">
          <button
            onclick={onClose}
            class="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition-all cursor-pointer"
          >
            {localeState.t('common.cancel')}
          </button>
          <button
            onclick={handleSubmit}
            disabled={!isValid}
            class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2
              {isValid
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-transparent cursor-not-allowed'}"
          >
            <GitBranch class="w-4 h-4" />
            {localeState.t('modals.createBranch.createBtn')}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .animate-in {
    animation: slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-12px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  select option {
    background-color: #18181b;
    color: #e4e4e7;
  }
</style>
