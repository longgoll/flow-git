<script lang="ts">
  import {
    GitPullRequest,
    GitBranch,
    ArrowRight,
    X,
    Check,
    AlertCircle,
    Loader2,
    Key,
  } from 'lucide-svelte';
  import type { AccountProfile, BranchInfo, GitHubPullRequest, GitHubBranchComparison } from '../types';
  import {
    createGitHubPullRequest,
    compareGitHubBranches,
    getStoredGitHubToken,
    saveGitHubToken,
  } from '../api/githubApi';
  import {
    getRemoteAdapter,
    parseRemoteProvider,
    getStoredGitLabToken,
    getStoredBitbucketToken,
  } from '../api/remoteProviderApi';
  import { getActiveAccount } from '../api/auth';
  import { toast } from '../state/toastState.svelte';
  import { localeState } from '../state/localeState.svelte';

  interface Props {
    isOpen: boolean;
    remoteOriginUrl?: string | null;
    branches?: BranchInfo[];
    activeAccount?: AccountProfile | null;
    onOpenAuth?: () => void;
    initialSourceBranch?: string;
    initialTargetBranch?: string;
    onClose: () => void;
    onSuccess: (newPR: GitHubPullRequest) => void;
  }

  let {
    isOpen = false,
    remoteOriginUrl = '',
    branches = [],
    activeAccount = null,
    onOpenAuth,
    initialSourceBranch = '',
    initialTargetBranch = '',
    onClose,
    onSuccess,
  }: Props = $props();

  let adapter = $derived(getRemoteAdapter(remoteOriginUrl));
  let parsedRemote = $derived(parseRemoteProvider(remoteOriginUrl));
  let repoOwner = $derived(parsedRemote?.owner || '');
  let repoName = $derived(parsedRemote?.repo || '');
  let providerLabel = $derived(adapter?.getLabel() || 'GitHub');
  let prTerm = $derived(adapter?.getPRTerm() || 'Pull Request');

  // Filter list of valid branch names (excluding remotes / origin prefix if local)
  let branchNames = $derived.by(() => {
    const list: string[] = [];
    for (const b of branches) {
      const name = b.shorthand.replace(/^origin\//, '');
      if (name && !list.includes(name) && name !== 'HEAD') {
        list.push(name);
      }
    }
    return list;
  });

  // State
  let sourceBranch = $state('');
  let targetBranch = $state('');
  let title = $state('');
  let description = $state('');
  let isDraft = $state(false);
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  // Branch Comparison state
  let branchComparison = $state<GitHubBranchComparison | null>(null);
  let isComparing = $state(false);

  // Token state
  let patToken = $state(getStoredGitHubToken());

  // Sync token when activeAccount changes
  $effect(() => {
    if (activeAccount?.token) {
      patToken = activeAccount.token;
      saveGitHubToken(activeAccount.token);
    }
  });

  // Sync defaults when modal opens or branches update
  $effect(() => {
    if (isOpen) {
      errorMessage = '';
      if (!patToken) {
        if (parsedRemote?.type === 'gitlab') {
          patToken = getStoredGitLabToken();
        } else if (parsedRemote?.type === 'bitbucket') {
          patToken = getStoredBitbucketToken();
        } else {
          patToken = getStoredGitHubToken();
          if (!patToken) {
            getActiveAccount('github')
              .then((acc) => {
                if (acc?.token) {
                  patToken = acc.token;
                  saveGitHubToken(acc.token);
                }
              })
              .catch(() => {});
          }
        }
      }

      // Determine default base branch
      if (initialTargetBranch && branchNames.includes(initialTargetBranch)) {
        targetBranch = initialTargetBranch;
      } else if (branchNames.includes('main')) {
        targetBranch = 'main';
      } else if (branchNames.includes('master')) {
        targetBranch = 'master';
      } else if (branchNames.length > 0) {
        targetBranch = branchNames[0];
      }

      // Determine default compare/source branch
      if (initialSourceBranch && branchNames.includes(initialSourceBranch)) {
        sourceBranch = initialSourceBranch;
      } else {
        const headBranch = branches.find((b) => b.is_head)?.shorthand;
        if (headBranch && branchNames.includes(headBranch) && headBranch !== targetBranch) {
          sourceBranch = headBranch;
        } else {
          sourceBranch = branchNames.find((b) => b !== targetBranch) || '';
        }
      }

      // Auto-fill title & description if blank
      initDefaultContent(sourceBranch, targetBranch);
      runBranchComparison(sourceBranch, targetBranch);
    }
  });

  async function runBranchComparison(src: string, tgt: string) {
    if (!src || !tgt || src === tgt || !repoOwner || !repoName) {
      branchComparison = null;
      return;
    }
    try {
      isComparing = true;
      const currentToken = patToken.trim() || getStoredGitHubToken();
      const comp = await compareGitHubBranches(repoOwner, repoName, tgt, src, currentToken);
      branchComparison = comp;
    } catch (e) {
      console.warn('Could not compare branches for preview:', e);
      branchComparison = null;
    } finally {
      isComparing = false;
    }
  }



  function initDefaultContent(src: string, tgt: string) {
    if (!title.trim() && src) {
      // Prettify title: "feat/login" -> "Feat: Login"
      const clean = src.replace(/^(feature|feat|fix|bugfix|chore|docs|refactor)\//i, (m) => {
        return m.slice(0, -1).toUpperCase() + ': ';
      });
      title = clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    if (!description.trim() && src) {
      description = `## 📝 Tóm tắt thay đổi\n- Tích hợp và hợp nhất các thay đổi từ nhánh \`${src}\` vào \`${tgt}\`.\n\n## 🔍 Kiểm tra\n- [x] Đã kiểm tra hoạt động ổn định trên môi trường cục bộ.`;
    }
  }

  async function handleCreatePR() {
    errorMessage = '';

    if (!repoOwner || !repoName) {
      errorMessage = localeState.t('pullRequest.create.unrecognizedRepo');
      return;
    }

    if (!sourceBranch || !targetBranch) {
      errorMessage = localeState.t('pullRequest.create.selectBothBranches');
      return;
    }

    if (sourceBranch === targetBranch) {
      errorMessage = localeState.t('pullRequest.create.sameBranchesNotice');
      return;
    }

    if (!title.trim()) {
      errorMessage = localeState.t('pullRequest.create.enterTitlePrompt');
      return;
    }

    const currentToken = patToken.trim() || getStoredGitHubToken();
    if (!currentToken) {
      if (onOpenAuth) {
        onOpenAuth();
      }
      errorMessage = localeState.t('pullRequest.create.authPrompt');
      return;
    }

    try {
      isSubmitting = true;
      const newPR = adapter
        ? await adapter.createPullRequest({
            title: title.trim(),
            body: description.trim(),
            head: sourceBranch,
            base: targetBranch,
            draft: isDraft,
            token: currentToken,
          })
        : await createGitHubPullRequest(
            repoOwner,
            repoName,
            title.trim(),
            description.trim(),
            sourceBranch,
            targetBranch,
            isDraft,
            currentToken
          );

      toast.success(
        localeState.t('pullRequest.create.createdSuccessToast', { number: newPR.number }),
        localeState.t('pullRequest.create.createdSuccessToastDesc', { title: newPR.title })
      );
      onSuccess(newPR);
      onClose();
    } catch (err: any) {
      errorMessage = err.message || String(err);
      toast.error(localeState.t('pullRequest.create.createFailedToast'), errorMessage);
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    onclick={onClose}
  >
    <div
      class="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/60">
            <GitPullRequest class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{prTerm === 'Merge Request' ? localeState.t('pullRequest.reviewer.createMR') : localeState.t('pullRequest.create.title')}</span>
              <span class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
                {providerLabel}
              </span>
            </h2>
            <p class="text-xs text-zinc-500 font-mono">
              {repoOwner ? `${repoOwner}/${repoName}` : providerLabel}
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body Form -->
      <div class="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
        {#if errorMessage}
          <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <div class="flex-1 break-words">{errorMessage}</div>
          </div>
        {/if}

        <!-- Visual Branch Flow Indicator: Compare (Nguồn) -> Base (Đích) -->
        <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
          <div class="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span class="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400">
              <GitBranch class="w-3.5 h-3.5" />
              <span>{localeState.t('pullRequest.create.sourceBranch')}</span>
            </span>
            <span class="text-[11px] text-zinc-400">{localeState.t('pullRequest.create.mergeIntoText')}</span>
            <span class="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <GitBranch class="w-3.5 h-3.5" />
              <span>{localeState.t('pullRequest.create.targetBranch')}</span>
            </span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <!-- Compare Branch (Nguồn) -->
            <div class="flex-1 relative">
              <select
                bind:value={sourceBranch}
                onchange={() => {
                  initDefaultContent(sourceBranch, targetBranch);
                  runBranchComparison(sourceBranch, targetBranch);
                }}
                class="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold rounded-lg bg-white dark:bg-zinc-900 border border-cyan-400 dark:border-cyan-600/70 text-cyan-900 dark:text-cyan-200 focus:ring-2 focus:ring-cyan-500/20 outline-hidden shadow-xs"
              >
                {#each branchNames as b}
                  <option value={b}>{b}</option>
                {/each}
              </select>
              <GitBranch class="w-3.5 h-3.5 text-cyan-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div class="flex flex-col items-center justify-center px-1 text-zinc-400">
              <ArrowRight class="w-4 h-4 stroke-[2.5] text-cyan-600 dark:text-cyan-400" />
            </div>

            <!-- Base Branch (Đích) -->
            <div class="flex-1 relative">
              <select
                bind:value={targetBranch}
                onchange={() => {
                  initDefaultContent(sourceBranch, targetBranch);
                  runBranchComparison(sourceBranch, targetBranch);
                }}
                class="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 outline-hidden shadow-xs"
              >
                {#each branchNames as b}
                  <option value={b}>{b}</option>
                {/each}
              </select>
              <GitBranch class="w-3.5 h-3.5 text-emerald-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <!-- Branch Comparison Preview Card -->
          {#if isComparing}
            <div class="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-center gap-2">
              <Loader2 class="w-3.5 h-3.5 animate-spin text-cyan-500" />
              <span>{localeState.t('pullRequest.create.comparing')}</span>
            </div>
          {:else if branchComparison}
            {#if branchComparison.total_commits > 0}
              <div class="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                  <Check class="w-3.5 h-3.5 stroke-[3]" />
                  <span>{localeState.t('pullRequest.create.readyToMerge')}</span>
                  <span class="font-mono font-bold">{localeState.t('pullRequest.create.commitsCount', { count: branchComparison.total_commits })}</span>
                  <span>•</span>
                  <span class="font-mono">{localeState.t('pullRequest.create.filesChangedCount', { count: branchComparison.files?.length || 0 })}</span>
                </div>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
                  {branchComparison.status.toUpperCase()}
                </span>
              </div>
            {:else}
              <div class="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
                <AlertCircle class="w-3.5 h-3.5 shrink-0" />
                <span>{localeState.t('pullRequest.create.noCommitsBetween', { source: sourceBranch, target: targetBranch })}</span>
              </div>
            {/if}
          {:else if sourceBranch === targetBranch}
            <div class="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
              <AlertCircle class="w-3.5 h-3.5 shrink-0" />
              <span>{localeState.t('pullRequest.create.sameBranchesNotice')}</span>
            </div>
          {:else}
            <div class="text-[11px] text-zinc-500 dark:text-zinc-400 text-center">
              {localeState.t('pullRequest.create.willBeIntegratedInto', { source: sourceBranch, target: targetBranch })}
            </div>
          {/if}
        </div>

        <!-- PR Title -->
        <div class="space-y-1.5">
          <label for="pr-title" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {localeState.t('pullRequest.create.titleLabel')} <span class="text-rose-500">*</span>
          </label>
          <input
            id="pr-title"
            type="text"
            bind:value={title}
            placeholder={localeState.t('pullRequest.create.titlePlaceholder')}
            class="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-hidden transition-all"
          />
        </div>

        <!-- PR Description -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="pr-desc" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {localeState.t('pullRequest.create.descriptionLabel')}
            </label>
            <div class="flex items-center gap-3">
              <button
                type="button"
                onclick={() => initDefaultContent(sourceBranch, targetBranch)}
                class="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {localeState.t('pullRequest.create.fillDefault')}
              </button>
            </div>
          </div>
          <textarea
            id="pr-desc"
            bind:value={description}
            rows="6"
            placeholder={localeState.t('pullRequest.create.descriptionPlaceholder')}
            class="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-hidden transition-all resize-none"
          ></textarea>
        </div>

        <!-- Draft Checkbox -->
        <label class="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            bind:checked={isDraft}
            class="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <span class="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
            {localeState.t('pullRequest.create.draftCheckbox')}
          </span>
        </label>

        <!-- System Auth Banner if not authenticated -->
        {#if !patToken}
          <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-3">
            <div class="space-y-0.5">
              <div class="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <AlertCircle class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{localeState.t('pullRequest.create.tokenTitle')}</span>
              </div>
              <p class="text-[11px] text-amber-700 dark:text-amber-400">
                {localeState.t('pullRequest.create.tokenHelp')}
              </p>
            </div>
            {#if onOpenAuth}
              <button
                type="button"
                onclick={onOpenAuth}
                class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                {localeState.t('toolbar.signIn')}
              </button>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Footer Actions -->
      <div class="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
        <div class="flex items-center gap-2">
          {#if activeAccount?.username}
            <div class="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              {#if activeAccount.avatar_url}
                <img src={activeAccount.avatar_url} alt="Avatar" class="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600" />
              {/if}
              <span>@{activeAccount.username}</span>
            </div>
          {:else if onOpenAuth}
            <button
              type="button"
              onclick={onOpenAuth}
              class="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <Key class="w-3.5 h-3.5" />
              <span>{localeState.t('toolbar.signIn')}</span>
            </button>
          {/if}
        </div>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            onclick={onClose}
            disabled={isSubmitting}
            class="px-4 py-2 text-xs font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            {localeState.t('pullRequest.create.cancelBtn')}
          </button>
          <button
            type="button"
            onclick={handleCreatePR}
            disabled={isSubmitting || !title.trim()}
            class="px-5 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
          >
            {#if isSubmitting}
              <Loader2 class="w-4 h-4 animate-spin" />
              <span>{localeState.t('pullRequest.create.creating')}</span>
            {:else}
              <Check class="w-4 h-4" />
              <span>{isDraft ? localeState.t('pullRequest.create.createDraftBtn') : (prTerm === 'Merge Request' ? localeState.t('pullRequest.reviewer.createMR') : localeState.t('pullRequest.create.createBtn'))}</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
