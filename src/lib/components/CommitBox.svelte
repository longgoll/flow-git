<script lang="ts">
  import {
    Sparkles,
    GitCommitHorizontal,
    History,
    ShieldAlert,
    GitFork,
    FileText,
    CheckCheck,
  } from 'lucide-svelte';
  import PreCommitWarningModal, { type RiskyFileItem } from './PreCommitWarningModal.svelte';
  import RepoTagBadge from './RepoTagBadge.svelte';
  import type { FileStatusItem, SecretFinding } from '../types';
  import { scanStagedSecrets } from '../api';
  import { localeState } from '../state/localeState.svelte';

  const PROTECTED_BRANCHES = new Set(['main', 'master', 'production', 'release']);

  interface Props {
    stagedCount: number;
    unstagedCount?: number;
    isLoading?: boolean;
    currentBranch?: string;
    repoPath?: string;
    stagedFiles?: FileStatusItem[];
    onCommit: (message: string, amend: boolean, noVerify?: boolean) => Promise<void>;
    onStageAll?: () => Promise<void>;
    onCreateBranch?: (baseBranch: string) => void;
    onUnstageFiles?: (files: string[]) => Promise<void>;
    onAddToGitignore?: (pattern: string) => Promise<void>;
  }

  let {
    stagedCount,
    unstagedCount = 0,
    isLoading = false,
    currentBranch = '',
    repoPath = '',
    stagedFiles = [],
    onCommit,
    onStageAll,
    onCreateBranch,
    onUnstageFiles,
    onAddToGitignore,
  }: Props = $props();

  let commitType = $state<string>('');
  let commitScope = $state<string>('');
  let commitSubject = $state<string>('');
  let commitBody = $state<string>('');
  let isAmend = $state<boolean>(false);
  let noVerify = $state<boolean>(false);
  let bypassSafetyShield = $state<boolean>(false);
  let showBodyInput = $state<boolean>(false);

  // Pre-commit Scan State
  let showPreCommitModal = $state<boolean>(false);
  let detectedRiskyFiles = $state<RiskyFileItem[]>([]);
  let detectedSecretFindings = $state<SecretFinding[]>([]);
  let isScanningSecrets = $state<boolean>(false);

  // Auto-save draft commit message to localStorage
  let lastLoadedRepo = '';
  $effect(() => {
    if (repoPath && repoPath !== lastLoadedRepo) {
      lastLoadedRepo = repoPath;
      try {
        const raw = localStorage.getItem(`flowgit_draft_commit_${encodeURIComponent(repoPath)}`);
        if (raw) {
          const draft = JSON.parse(raw);
          commitType = draft.type || '';
          commitScope = draft.scope || '';
          commitSubject = draft.subject || '';
          commitBody = draft.body || '';
          if (commitBody.trim()) {
            showBodyInput = true;
          }
        }
      } catch {}
    }
  });

  let saveTimer: any = null;
  $effect(() => {
    const p = repoPath;
    const t = commitType;
    const s = commitScope;
    const sub = commitSubject;
    const b = commitBody;

    if (!p) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        if (!t && !s && !sub && !b) {
          localStorage.removeItem(`flowgit_draft_commit_${encodeURIComponent(p)}`);
        } else {
          localStorage.setItem(
            `flowgit_draft_commit_${encodeURIComponent(p)}`,
            JSON.stringify({ type: t, scope: s, subject: sub, body: b })
          );
        }
      } catch {}
    }, 400);
  });

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

  // Có thể commit dạng "Stage All & Commit" khi stagedCount === 0 nhưng có unstaged
  let canSmartStageAndCommit = $derived(
    stagedCount === 0 && !isAmend && unstagedCount > 0 && typeof onStageAll === 'function'
  );

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
    showBodyInput = false;
    isAmend = false;
    noVerify = false;
    if (repoPath) {
      try {
        localStorage.removeItem(`flowgit_draft_commit_${encodeURIComponent(repoPath)}`);
      } catch {}
    }
  }

  async function handleFormSubmit() {
    if (!fullMessage.trim() || isLoading || isScanningSecrets) return;
    if (isProtected && !bypassSafetyShield) return;

    // Nếu stagedCount === 0 nhưng có unstaged files -> tự động stage all trước
    if (stagedCount === 0 && !isAmend) {
      if (canSmartStageAndCommit && onStageAll) {
        await onStageAll();
      } else {
        return;
      }
    }

    // Scan for dangerous secrets or heavy binary before commit
    if (!isAmend) {
      const risky = scanRiskyFiles();
      let backendSecrets: SecretFinding[] = [];
      if (repoPath) {
        try {
          isScanningSecrets = true;
          backendSecrets = await scanStagedSecrets(repoPath);
        } catch (err) {
          console.error('Failed to run backend secret scanner:', err);
        } finally {
          isScanningSecrets = false;
        }
      }

      if (risky.length > 0 || backendSecrets.length > 0) {
        detectedRiskyFiles = risky;
        detectedSecretFindings = backendSecrets;
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

<div class="border-t border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 p-3 space-y-2.5 font-sans select-none shrink-0 shadow-xs backdrop-blur-md">
  <!-- Commit Safety Shield Compact Ribbon -->
  {#if isProtected}
    <div class="px-2.5 py-1.5 rounded-lg border text-[11px] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 {bypassSafetyShield ? 'bg-amber-500/10 border-amber-400/40 text-amber-800 dark:text-amber-300' : 'bg-rose-500/10 border-rose-400/40 text-rose-800 dark:text-rose-300'}">
      <div class="flex items-center gap-1.5 min-w-0">
        <ShieldAlert class="w-3.5 h-3.5 shrink-0 {bypassSafetyShield ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}" />
        <span class="font-semibold truncate">
          {localeState.t('workingTree.commitBox.safetyShieldTitle')}:
          <span class="font-mono underline decoration-rose-400">{currentBranch}</span>
        </span>
      </div>

      <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {#if onCreateBranch}
          <button
            type="button"
            onclick={() => onCreateBranch(currentBranch)}
            class="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 hover:bg-cyan-200 dark:hover:bg-cyan-900/80 border border-cyan-300 dark:border-cyan-800/50 text-cyan-800 dark:text-cyan-300 text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
            title={localeState.t('workingTree.commitBox.createFeatureBranchTooltip')}
          >
            <GitFork class="w-2.5 h-2.5" />
            <span>{localeState.t('workingTree.commitBox.createFeatureBranch')}</span>
          </button>
        {/if}

        <label class="flex items-center gap-1 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer select-none">
          <input
            type="checkbox"
            bind:checked={bypassSafetyShield}
            class="w-3 h-3 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-amber-500 focus:ring-0 cursor-pointer"
          />
          <span>{bypassSafetyShield ? 'Bypass' : localeState.t('workingTree.commitBox.allowDirectCommit')}</span>
        </label>
      </div>
    </div>
  {/if}

  <!-- Author Identity & Conventional Commits in Compact Flex Bar -->
  <div class="flex items-center justify-between gap-1.5 text-xs">
    <div class="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
      <Sparkles class="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0 mr-0.5" />
      {#each conventionalTypes as item}
        <button
          type="button"
          onclick={() => selectType(item.type)}
          class="px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer whitespace-nowrap {item.color} {commitType === item.type ? 'ring-1 ring-cyan-500 font-bold shadow-2xs' : 'opacity-85'}"
          title={item.desc}
        >
          {item.label}
        </button>
      {/each}
    </div>

    {#if repoPath}
      <div class="shrink-0 hidden sm:flex items-center">
        <RepoTagBadge {repoPath} />
      </div>
    {/if}
  </div>

  <!-- Message Fields: Scope & Subject -->
  <div class="space-y-1.5">
    <div class="flex items-center gap-1.5">
      <input
        type="text"
        placeholder={localeState.t('workingTree.commitBox.scopePlaceholder')}
        bind:value={commitScope}
        class="w-20 sm:w-24 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-lg px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 font-mono shadow-2xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 transition-all shrink-0"
      />
      <input
        type="text"
        placeholder={localeState.t('workingTree.commitBox.summaryPlaceholder')}
        bind:value={commitSubject}
        onkeydown={handleKeyDown}
        class="flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-lg px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 transition-all font-sans font-medium shadow-2xs"
      />

      <!-- Description Toggle Button -->
      <button
        type="button"
        onclick={() => (showBodyInput = !showBodyInput)}
        class="p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 {showBodyInput || commitBody.trim() ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        title={showBodyInput ? localeState.t('workingTree.commitBox.hideDescription') : localeState.t('workingTree.commitBox.addDescription')}
      >
        <FileText class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Optional Expandable Description -->
    {#if showBodyInput || commitBody.trim()}
      <textarea
        placeholder={localeState.t('workingTree.commitBox.descriptionPlaceholder')}
        bind:value={commitBody}
        onkeydown={handleKeyDown}
        rows={2}
        class="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 transition-all font-sans resize-none shadow-2xs animate-in fade-in duration-100"
      ></textarea>
    {/if}
  </div>

  <!-- Bottom Controls: Amend & no-verify & Smart Commit Action -->
  <div class="flex items-center justify-between pt-0.5 gap-2">
    <div class="flex items-center gap-2.5 text-xs">
      <label class="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
        <input
          type="checkbox"
          bind:checked={isAmend}
          class="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-cyan-500 focus:ring-0 focus:outline-none cursor-pointer"
        />
        <span class="flex items-center gap-1">
          <History class="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
          <span class="hidden sm:inline">{localeState.t('workingTree.commitBox.amend')}</span>
        </span>
      </label>

      <label
        class="flex items-center gap-1 text-xs transition-colors cursor-pointer select-none px-1.5 py-0.5 rounded {noVerify ? 'text-amber-700 dark:text-amber-300 font-semibold bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 shadow-2xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-300'}"
        title={localeState.t('workingTree.commitBox.noVerifyTooltip')}
      >
        <input
          type="checkbox"
          bind:checked={noVerify}
          class="w-3 h-3 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-amber-500 focus:ring-0 focus:outline-none cursor-pointer"
        />
        <span class="text-[10px] font-mono">--no-verify</span>
      </label>
    </div>

    <!-- Commit Button (Adaptive for Staged vs Smart Stage All) -->
    <button
      type="button"
      onclick={() => handleFormSubmit()}
      disabled={isLoading || (!fullMessage.trim()) || (stagedCount === 0 && !isAmend && !canSmartStageAndCommit) || (isProtected && !bypassSafetyShield)}
      class="px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 {canSmartStageAndCommit ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white' : isProtected && !bypassSafetyShield ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'}"
      title={canSmartStageAndCommit ? localeState.t('workingTree.commitBox.stageAllAndCommitTooltip') : isProtected && !bypassSafetyShield ? localeState.t('workingTree.commitBox.protectedBranchTooltip') : localeState.t('workingTree.commitBox.ctrlEnterTip')}
    >
      {#if isLoading}
        <div class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        <span>{localeState.t('workingTree.commitBox.committing')}</span>
      {:else if isAmend}
        <GitCommitHorizontal class="w-3.5 h-3.5" />
        <span>{localeState.t('workingTree.commitBox.amendCommit')}</span>
      {:else if stagedCount === 0 && canSmartStageAndCommit}
        <CheckCheck class="w-3.5 h-3.5" />
        <span>{localeState.t('workingTree.commitBox.stageAllAndCommit')}</span>
      {:else}
        <GitCommitHorizontal class="w-3.5 h-3.5" />
        <span>{localeState.t('workingTree.commitBox.commitWithCount', { count: stagedCount })}</span>
      {/if}
    </button>
  </div>
</div>

<!-- Pre-commit Scanner Alert Modal -->
{#if showPreCommitModal}
  <PreCommitWarningModal
    riskyFiles={detectedRiskyFiles}
    secretFindings={detectedSecretFindings}
    onConfirmCommit={handleConfirmBypassCommit}
    onUnstageRisky={handleUnstageRisky}
    onAddToGitignore={onAddToGitignore}
    onCancel={() => (showPreCommitModal = false)}
  />
{/if}
