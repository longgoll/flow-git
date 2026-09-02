<script lang="ts">
  import { Sparkles, GitCommitHorizontal, History, ShieldAlert, GitFork } from 'lucide-svelte';
  import PreCommitWarningModal, { type RiskyFileItem } from './PreCommitWarningModal.svelte';
  import type { FileStatusItem } from '../types';

  const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'dev', 'trunk', 'head', 'release', 'production']);

  interface Props {
    stagedCount: number;
    isLoading?: boolean;
    currentBranch?: string;
    stagedFiles?: FileStatusItem[];
    onCommit: (message: string, amend: boolean, noVerify?: boolean) => Promise<void>;
    onCreateBranch?: (baseBranch: string) => void;
    onUnstageFiles?: (files: string[]) => Promise<void>;
  }

  let {
    stagedCount,
    isLoading = false,
    currentBranch = '',
    stagedFiles = [],
    onCommit,
    onCreateBranch,
    onUnstageFiles,
  }: Props = $props();

  let commitType = $state<string>('');
  let commitScope = $state<string>('');
  let commitSubject = $state<string>('');
  let commitBody = $state<string>('');
  let isAmend = $state<boolean>(false);
  let noVerify = $state<boolean>(false);
  let bypassSafetyShield = $state<boolean>(false);

  // Pre-commit Scan State
  let showPreCommitModal = $state<boolean>(false);
  let detectedRiskyFiles = $state<RiskyFileItem[]>([]);

  let isProtected = $derived.by(() => {
    if (!currentBranch) return false;
    const clean = currentBranch.toLowerCase().trim().replace(/^refs\/heads\//, '');
    return PROTECTED_BRANCHES.has(clean);
  });

  const conventionalTypes = [
    { type: 'feat', label: 'feat', desc: 'A new feature', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60' },
    { type: 'fix', label: 'fix', desc: 'A bug fix', color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/60' },
    { type: 'refactor', label: 'refactor', desc: 'Code change that neither fixes a bug nor adds a feature', color: 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60' },
    { type: 'perf', label: 'perf', desc: 'Performance improvement', color: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40 hover:bg-purple-100 dark:hover:bg-purple-900/60' },
    { type: 'docs', label: 'docs', desc: 'Documentation only', color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40 hover:bg-blue-100 dark:hover:bg-blue-900/60' },
    { type: 'chore', label: 'chore', desc: 'Maintenance tasks', color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800' },
  ];

  function selectType(t: string) {
    if (commitType === t) {
      commitType = '';
    } else {
      commitType = t;
    }
  }

  let fullMessage = $derived.by(() => {
    let header = '';
    if (commitType) {
      header += commitType;
      if (commitScope.trim()) {
        header += `(${commitScope.trim()})`;
      }
      header += ': ';
    }
    header += commitSubject.trim();

    if (commitBody.trim()) {
      return `${header}\n\n${commitBody.trim()}`;
    }
    return header;
  });

  function scanRiskyFiles(): RiskyFileItem[] {
    const list: RiskyFileItem[] = [];
    for (const f of stagedFiles) {
      const p = f.path.toLowerCase();
      // Secret patterns
      if (p.endsWith('.env') || p.includes('.env.') || p.startsWith('.env.')) {
        list.push({ path: f.path, type: 'secret', reason: 'Tệp chứa biến môi trường nhạy cảm (.env)' });
      } else if (p.includes('id_rsa') || p.includes('id_ed25519') || p.includes('id_ecdsa')) {
        list.push({ path: f.path, type: 'secret', reason: 'SSH Private Key bí mật' });
      } else if (p.endsWith('.pem') || p.endsWith('.key') || p.endsWith('.pfx') || p.endsWith('.p12') || p.endsWith('.keystore')) {
        list.push({ path: f.path, type: 'secret', reason: 'Chứng chỉ / Khóa bảo mật riêng tư' });
      } else if (p.endsWith('credentials.json') || p.endsWith('client_secret.json')) {
        list.push({ path: f.path, type: 'secret', reason: 'Tệp định danh OAuth / Credentials bí mật' });
      }
      // Large binary patterns
      else if (/\.(zip|tar|gz|7z|rar|iso|exe|dll|so|dylib|bin|weights|onnx|h5|pt|parquet)$/i.test(p)) {
        list.push({ path: f.path, type: 'large_binary', reason: 'Tệp nén / nhị phân lớn (khuyên dùng Git LFS)' });
      }
    }
    return list;
  }

  async function executeActualCommit() {
    if (!fullMessage.trim()) return;
    await onCommit(fullMessage.trim(), isAmend, noVerify);
    // Reset form after successful commit
    commitSubject = '';
    commitBody = '';
    commitScope = '';
    commitType = '';
    isAmend = false;
    noVerify = false;
  }

  async function handleFormSubmit() {
    if (!fullMessage.trim() || isLoading) return;
    if (stagedCount === 0 && !isAmend) return;
    if (isProtected && !bypassSafetyShield) return;

    // Scan for dangerous secrets or heavy binary before commit
    if (!isAmend) {
      const risky = scanRiskyFiles();
      if (risky.length > 0) {
        detectedRiskyFiles = risky;
        showPreCommitModal = true;
        return;
      }
    }

    await executeActualCommit();
  }

  async function handleConfirmBypassCommit() {
    showPreCommitModal = false;
    await executeActualCommit();
  }

  async function handleUnstageRisky(files: string[]) {
    showPreCommitModal = false;
    if (onUnstageFiles) {
      await onUnstageFiles(files);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleFormSubmit();
    }
  }
</script>

<div class="border-t border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 p-3.5 space-y-3 font-sans select-none">
  <!-- Commit Safety Shield Banner -->
  {#if isProtected}
    <div class="p-2.5 rounded-xl border transition-all {bypassSafetyShield ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/40 text-amber-800 dark:text-amber-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/50 text-rose-800 dark:text-rose-300'}">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-start gap-2 min-w-0">
          <ShieldAlert class="w-4 h-4 shrink-0 mt-0.5 {bypassSafetyShield ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}" />
          <div class="text-[11px] leading-snug">
            <p class="font-semibold flex items-center gap-1.5">
              <span>Commit Safety Shield</span>
              <span class="px-1.5 py-0.2 rounded text-[10px] font-mono {bypassSafetyShield ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/40' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700/50'}">
                {currentBranch}
              </span>
            </p>
            <p class="text-zinc-600 dark:text-zinc-400 mt-0.5">
              {bypassSafetyShield
                ? 'Bạn đã mở khóa chế độ Bypass. Thao tác commit trực tiếp vào nhánh bảo vệ sẽ được cho phép.'
                : 'Bạn đang chuẩn bị commit thẳng vào nhánh bảo vệ. Hãy tạo nhánh tính năng để bảo vệ nhánh chính.'}
            </p>
          </div>
        </div>

        {#if onCreateBranch}
          <button
            type="button"
            onclick={() => onCreateBranch(currentBranch)}
            class="px-2.5 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 hover:bg-cyan-200 dark:hover:bg-cyan-900/80 border border-cyan-300 dark:border-cyan-800/50 hover:border-cyan-400 text-cyan-800 dark:text-cyan-300 text-[11px] font-medium flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-xs active:scale-98"
            title="Tạo nhánh Feature từ vị trí commit này"
          >
            <GitFork class="w-3 h-3" />
            <span>Tạo nhánh Feature</span>
          </button>
        {/if}
      </div>

      <div class="mt-2 pt-1.5 border-t border-rose-200 dark:border-rose-900/30 flex items-center justify-between text-[11px]">
        <label class="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-300 cursor-pointer select-none">
          <input
            type="checkbox"
            bind:checked={bypassSafetyShield}
            class="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-amber-500 focus:ring-0 cursor-pointer"
          />
          <span>Cho phép commit thẳng (Tôi hiểu rủi ro)</span>
        </label>
      </div>
    </div>
  {/if}

  <!-- Conventional Commits Quick Pickers -->
  <div class="space-y-1.5">
    <div class="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
      <span class="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
        <Sparkles class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
        Conventional Commits
      </span>
      <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl + Enter to commit</span>
    </div>

    <div class="flex flex-wrap gap-1">
      {#each conventionalTypes as item}
        <button
          type="button"
          onclick={() => selectType(item.type)}
          class="px-2 py-0.5 rounded text-[11px] font-mono border transition-all cursor-pointer {item.color} {commitType === item.type ? 'ring-1 ring-cyan-500 font-bold shadow-xs' : 'opacity-80'}"
          title={item.desc}
        >
          {item.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Message Fields -->
  <div class="space-y-2">
    <!-- Scope & Subject -->
    <div class="flex items-center gap-2">
      <input
        type="text"
        placeholder="scope (opt)"
        bind:value={commitScope}
        class="w-24 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
      />
      <input
        type="text"
        placeholder="Commit summary message..."
        bind:value={commitSubject}
        onkeydown={handleKeyDown}
        class="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
      />
    </div>

    <!-- Extended Description -->
    <textarea
      placeholder="Optional extended description (Markdown supported)..."
      bind:value={commitBody}
      onkeydown={handleKeyDown}
      rows={2}
      class="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono resize-none"
    ></textarea>
  </div>

  <!-- Bottom Controls: Amend toggle & Commit Button -->
  <div class="flex items-center justify-between pt-1">
    <div class="flex items-center gap-3">
      <label class="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
        <input
          type="checkbox"
          bind:checked={isAmend}
          class="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-cyan-500 focus:ring-0 focus:outline-none cursor-pointer"
        />
        <span class="flex items-center gap-1">
          <History class="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
          Amend
        </span>
      </label>

      <label
        class="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-300 cursor-pointer select-none"
        title="Bỏ qua Git pre-commit hooks (Husky, formatters, linters) khi cần commit khẩn cấp"
      >
        <input
          type="checkbox"
          bind:checked={noVerify}
          class="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-amber-500 focus:ring-0 focus:outline-none cursor-pointer"
        />
        <span class="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">--no-verify</span>
      </label>
    </div>

    <button
      type="button"
      onclick={() => handleFormSubmit()}
      disabled={isLoading || (!fullMessage.trim()) || (stagedCount === 0 && !isAmend) || (isProtected && !bypassSafetyShield)}
      class="px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed {isProtected && !bypassSafetyShield ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'}"
      title={isProtected && !bypassSafetyShield ? 'Nhánh bảo vệ: Bật checkbox Cho phép commit hoặc Tạo nhánh Feature' : ''}
    >
      {#if isLoading}
        <div class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        <span>Committing...</span>
      {:else}
        <GitCommitHorizontal class="w-4 h-4" />
        <span>{isAmend ? 'Amend Commit' : `Commit (${stagedCount} staged)`}</span>
      {/if}
    </button>
  </div>
</div>

<!-- Pre-commit Scanner Alert Modal -->
{#if showPreCommitModal}
  <PreCommitWarningModal
    riskyFiles={detectedRiskyFiles}
    onConfirmCommit={handleConfirmBypassCommit}
    onUnstageRisky={handleUnstageRisky}
    onCancel={() => (showPreCommitModal = false)}
  />
{/if}
