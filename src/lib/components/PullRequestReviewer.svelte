<script lang="ts">
  import { onMount } from 'svelte';
  import {
    GitPullRequest,
    RefreshCw,
    Key,
    Plus,
    X,
    FileText,
    MessageSquare,
    GitCommit,
    PanelLeftOpen,
  } from 'lucide-svelte';
  import type {
    AccountProfile,
    BranchInfo,
    GitHubPRComment,
    GitHubPRFile,
    GitHubPullRequest,
    GitHubPRCommit,
    GitHubCommitChecks,
  } from '../types';
  import {
    fetchGitHubPullRequests,
    fetchGitHubPullRequestFiles,
    fetchGitHubPullRequestComments,
    fetchGitHubPullRequestDetail,
    createGitHubInlineComment,
    createGitHubIssueComment,
    fetchGitHubPullRequestCommits,
    fetchGitHubCommitChecks,
    submitGitHubPullRequestReview,
    mergeGitHubPullRequest,
    updateGitHubPullRequestState,
    deleteGitHubBranch,
    saveGitHubToken,
    getStoredGitHubToken,
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
  import type { RemoteState } from '../state/remoteState.svelte';
  import CreatePullRequestModal from './CreatePullRequestModal.svelte';

  // Subcomponents
  import PRListSidebar from './pr-reviewer/PRListSidebar.svelte';
  import PRHeader from './pr-reviewer/PRHeader.svelte';
  import PRFilesTab from './pr-reviewer/PRFilesTab.svelte';
  import PRConversationTab from './pr-reviewer/PRConversationTab.svelte';
  import PRCommitsTab from './pr-reviewer/PRCommitsTab.svelte';
  import PRLaunchpadEmpty from './pr-reviewer/PRLaunchpadEmpty.svelte';
  import PRReviewModal from './pr-reviewer/PRReviewModal.svelte';
  import PRMergeModal from './pr-reviewer/PRMergeModal.svelte';
  import PRCloseModal from './pr-reviewer/PRCloseModal.svelte';

  interface Props {
    remote?: RemoteState;
    remoteOriginUrl?: string | null;
    localBranches?: BranchInfo[];
    activeAccount?: AccountProfile | null;
    onOpenAuth?: () => void;
    onCheckoutBranch?: (branchName: string) => Promise<void>;
    onOpenCreatePR?: () => void;
    onClose?: () => void;
    onPRCountChange?: (count: number) => void;
  }

  let {
    remote,
    remoteOriginUrl = '',
    localBranches = [],
    activeAccount = null,
    onOpenAuth,
    onCheckoutBranch,
    onOpenCreatePR,
    onClose,
    onPRCountChange,
  }: Props = $props();

  // Detection & Config
  let adapter = $derived(getRemoteAdapter(remoteOriginUrl));
  let parsedRemote = $derived(parseRemoteProvider(remoteOriginUrl));
  let providerType = $derived(parsedRemote?.type || 'github');
  let providerLabel = $derived(adapter?.getLabel() || 'GitHub');
  let prTerm = $derived(adapter?.getPRTerm() || 'Pull Request');
  let repoOwner = $derived(parsedRemote?.owner || '');
  let repoName = $derived(parsedRemote?.repo || '');
  let patToken = $state('');
  let showLocalCreatePRModal = $state(false);
  let activeAccountUsername = $state('');

  // Merge PR State
  let showMergeModal = $state(false);
  let mergeMethod = $state<'merge' | 'squash' | 'rebase'>('merge');
  let mergeCommitTitle = $state('');
  let mergeCommitMessage = $state('');
  let deleteBranchAfterMerge = $state(false);
  let isMerging = $state(false);

  // Close / Reopen PR State
  let showCloseModal = $state(false);
  let isTogglingPRState = $state(false);

  // Layout & Responsive State
  let loadError = $state<string | null>(null);
  let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);
  let isMobileView = $derived(windowWidth < 860);
  let mobilePane = $state<'list' | 'detail'>('list');
  let isSidebarCollapsed = $state(false);
  let sidebarWidth = $state(320);
  let isDraggingSidebar = $state(false);

  // Data state
  let prList = $state<GitHubPullRequest[]>([]);
  let isLoadingPRs = $state(false);
  let selectedPR = $state<GitHubPullRequest | null>(null);
  let prFilter = $state<'open' | 'closed' | 'all'>('open');
  let searchQuery = $state('');

  // Selected PR Details state
  let activeTab = $state<'conversation' | 'files' | 'commits'>('files');
  let prFiles = $state<GitHubPRFile[]>([]);
  let prComments = $state<GitHubPRComment[]>([]);
  let prCommits = $state<GitHubPRCommit[]>([]);
  let commitChecks = $state<GitHubCommitChecks | null>(null);
  let isLoadingDetails = $state(false);
  let selectedFileIndex = $state(0);

  // Quick Comment state
  let quickCommentText = $state('');
  let isPostingQuickComment = $state(false);

  // Viewed Files & Diff Mode state
  let viewedFiles = $state<Record<string, boolean>>({});
  let diffMode = $state<'unified' | 'split'>('unified');

  // Review & Inline comment state
  let inlineCommentLine = $state<{ file: string; line: number } | null>(null);
  let inlineCommentText = $state('');
  let isPostingComment = $state(false);

  let showReviewModal = $state(false);
  let reviewEvent = $state<'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'>('COMMENT');
  let reviewBody = $state('');
  let isSubmittingReview = $state(false);

  function startResize(e: MouseEvent) {
    e.preventDefault();
    isDraggingSidebar = true;
    const startX = e.clientX;
    const startW = sidebarWidth;

    function onMouseMove(moveEvent: MouseEvent) {
      const delta = moveEvent.clientX - startX;
      sidebarWidth = Math.max(220, Math.min(540, startW + delta));
    }

    function onMouseUp() {
      isDraggingSidebar = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // Check if current authenticated user is PR author
  let isOwnPR = $derived(
    !!selectedPR &&
    !!activeAccountUsername &&
    selectedPR.user.login.toLowerCase() === activeAccountUsername.toLowerCase()
  );

  // Sync state with detected remote & auto reload on repo switch
  $effect(() => {
    if (parsedRemote) {
      const ownerChanged = repoOwner !== parsedRemote.owner || repoName !== parsedRemote.repo;
      repoOwner = parsedRemote.owner;
      repoName = parsedRemote.repo;
      if (ownerChanged && repoOwner && repoName) {
        loadPullRequests();
      }
    }
  });

  // React to external PR creation trigger (e.g. from modal or command)
  $effect(() => {
    const trigger = remote?.prRefreshTrigger;
    if (trigger && trigger > 0) {
      const created = remote?.lastCreatedPR;
      if (created) {
        remote.lastCreatedPR = null;
        if (!prList.some((p) => p.id === created.id)) {
          prList = [created, ...prList];
        }
        selectPR(created);
      }
      loadPullRequests(true);
    }
  });

  // Sync token & account when activeAccount changes
  $effect(() => {
    if (activeAccount?.token) {
      patToken = activeAccount.token;
      saveGitHubToken(activeAccount.token);
    }
    if (activeAccount?.username) {
      activeAccountUsername = activeAccount.username;
    }
  });

  onMount(() => {
    const onResize = () => {
      windowWidth = window.innerWidth;
    };
    window.addEventListener('resize', onResize);

    (async () => {
      if (!patToken) {
        if (parsedRemote?.type === 'gitlab') {
          patToken = getStoredGitLabToken();
        } else if (parsedRemote?.type === 'bitbucket') {
          patToken = getStoredBitbucketToken();
        } else {
          patToken = getStoredGitHubToken();
          if (!patToken) {
            try {
              const activeAcc = await getActiveAccount('github');
              if (activeAcc?.token) {
                patToken = activeAcc.token;
                saveGitHubToken(activeAcc.token);
              }
              if (activeAcc?.username) {
                activeAccountUsername = activeAcc.username;
              }
            } catch (err) {
              console.warn('Could not load active account token', err);
            }
          }
        }
      }

      if (repoOwner && repoName) {
        loadPullRequests();
      }
    })();

    // Auto-refresh when returning to window (e.g. user created or modified PR in browser)
    const onWindowFocus = () => {
      if (repoOwner && repoName && !isLoadingPRs) {
        loadPullRequests(true);
      }
    };
    window.addEventListener('focus', onWindowFocus);

    // Periodic gentle refresh every 30s while viewing PR page
    const pollInterval = setInterval(() => {
      if (repoOwner && repoName && !isLoadingPRs) {
        loadPullRequests(true);
      }
    }, 30000);

    return () => {
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('resize', onResize);
      clearInterval(pollInterval);
    };
  });

  async function loadPullRequests(isBackground = false) {
    if (!repoOwner || !repoName) return;
    try {
      if (!isBackground) {
        isLoadingPRs = true;
      }
      loadError = null;
      if (!patToken) {
        if (parsedRemote?.type === 'gitlab') {
          patToken = getStoredGitLabToken();
        } else if (parsedRemote?.type === 'bitbucket') {
          patToken = getStoredBitbucketToken();
        } else {
          try {
            const activeAcc = await getActiveAccount('github');
            if (activeAcc?.token) {
              patToken = activeAcc.token;
              saveGitHubToken(activeAcc.token);
            }
          } catch {}
        }
      }
      const list = adapter
        ? await adapter.fetchPullRequests(prFilter, patToken)
        : await fetchGitHubPullRequests(repoOwner, repoName, patToken, prFilter);
      prList = list;
      const openCount = prFilter === 'open' ? list.length : list.filter((p) => p.state === 'open').length;
      onPRCountChange?.(openCount);
      if (remote) {
        remote.openPRCount = openCount;
      }
      if (list.length > 0 && !selectedPR) {
        selectPR(list[0]);
      } else if (selectedPR) {
        const currentInList = list.find((p) => p.id === selectedPR?.id);
        if (currentInList && (currentInList.state !== selectedPR.state || currentInList.title !== selectedPR.title)) {
          selectedPR = { ...selectedPR, ...currentInList };
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      loadError = errMsg;
      if (!isBackground && prList.length > 0) {
        toast.error(localeState.t('pullRequest.reviewer.loadPRError'), errMsg);
      }
    } finally {
      if (!isBackground) {
        isLoadingPRs = false;
      }
    }
  }

  async function selectPR(pr: GitHubPullRequest) {
    selectedPR = pr;
    if (isMobileView) {
      mobilePane = 'detail';
    }
    inlineCommentLine = null;
    inlineCommentText = '';
    quickCommentText = '';
    selectedFileIndex = 0;
    mergeCommitTitle = `Merge pull request #${pr.number} from ${pr.head.ref}`;
    mergeCommitMessage = pr.title;
    if (isOwnPR) {
      reviewEvent = 'COMMENT';
    }
    try {
      isLoadingDetails = true;
      const [files, comments, detail, commits, checks] = await Promise.all([
        adapter ? adapter.fetchPullRequestFiles(pr.number, patToken).catch(() => []) : fetchGitHubPullRequestFiles(repoOwner, repoName, pr.number, patToken).catch(() => []),
        adapter ? adapter.fetchPullRequestComments(pr.number, patToken).catch(() => []) : fetchGitHubPullRequestComments(repoOwner, repoName, pr.number, patToken).catch(() => []),
        providerType === 'github' ? fetchGitHubPullRequestDetail(repoOwner, repoName, pr.number, patToken).catch(() => null) : null,
        providerType === 'github' ? fetchGitHubPullRequestCommits(repoOwner, repoName, pr.number, patToken).catch(() => []) : [],
        providerType === 'github' ? fetchGitHubCommitChecks(repoOwner, repoName, pr.head.sha, patToken).catch(() => null) : null,
      ]);
      prFiles = files;
      prComments = comments;
      prCommits = commits;
      commitChecks = checks;
      if (detail) {
        selectedPR = { ...pr, ...detail };
      }
    } catch (err: any) {
      toast.error(localeState.t('pullRequest.reviewer.loadDetailError'), err.message || String(err));
    } finally {
      isLoadingDetails = false;
    }
  }

  async function handlePostQuickComment() {
    if (!selectedPR || !quickCommentText.trim()) return;
    try {
      isPostingQuickComment = true;
      const newComment = await createGitHubIssueComment(
        repoOwner,
        repoName,
        selectedPR.number,
        quickCommentText.trim(),
        patToken
      );
      prComments = [...prComments, newComment];
      quickCommentText = '';
      toast.success(
        localeState.t('pullRequest.reviewer.commentSuccess'),
        localeState.t('pullRequest.reviewer.commentSuccessDesc')
      );
    } catch (err: any) {
      toast.error(localeState.t('pullRequest.reviewer.commentError'), err.message || String(err));
    } finally {
      isPostingQuickComment = false;
    }
  }



  function toggleFileViewed(filename: string) {
    if (!selectedPR) return;
    const key = `${selectedPR.number}:${filename}`;
    viewedFiles[key] = !viewedFiles[key];
  }

  async function handleConfirmMerge() {
    if (!selectedPR) return;
    try {
      isMerging = true;
      if (adapter?.mergePullRequest) {
        await adapter.mergePullRequest(
          selectedPR.number,
          mergeMethod,
          mergeCommitMessage.trim() || undefined,
          patToken
        );
      } else {
        await mergeGitHubPullRequest(
          repoOwner,
          repoName,
          selectedPR.number,
          mergeMethod,
          mergeCommitTitle.trim() || undefined,
          mergeCommitMessage.trim() || undefined,
          patToken
        );
      }

      toast.success(
        localeState.t('pullRequest.reviewer.mergeSuccess'),
        localeState.t('pullRequest.reviewer.mergeSuccessDesc', {
          number: selectedPR.number,
          branch: selectedPR.base.ref,
        })
      );

      if (deleteBranchAfterMerge && selectedPR.head.ref) {
        try {
          await deleteGitHubBranch(repoOwner, repoName, selectedPR.head.ref, patToken);
          toast.info(
            localeState.t('pullRequest.reviewer.branchDeletedInfo', {
              branch: selectedPR.head.ref,
            })
          );
        } catch (delErr) {
          console.warn('Could not delete remote branch after merge', delErr);
        }
      }

      showMergeModal = false;
      if (selectedPR) {
        const mergedPR: GitHubPullRequest = {
          ...selectedPR,
          state: 'closed',
          merged: true,
          merged_at: new Date().toISOString(),
        };
        selectedPR = mergedPR;
        if (prFilter === 'open') {
          prList = prList.filter((p) => p.id !== mergedPR.id);
        } else {
          prList = prList.map((p) => (p.id === mergedPR.id ? mergedPR : p));
        }
      }
      if (remote) {
        remote.openPRCount = Math.max(0, (remote.openPRCount || 1) - 1);
      }
      onPRCountChange?.(Math.max(0, (remote?.openPRCount ?? prList.filter((p) => p.state === 'open').length)));
      await loadPullRequests(true);
    } catch (err: any) {
      toast.error(localeState.t('pullRequest.reviewer.mergeError'), err.message || String(err));
    } finally {
      isMerging = false;
    }
  }

  async function handleTogglePRState(targetState: 'open' | 'closed', comment?: string) {
    if (!repoOwner || !repoName || !selectedPR) return;
    try {
      isTogglingPRState = true;
      if (comment && comment.trim()) {
        await createGitHubIssueComment(repoOwner, repoName, selectedPR.number, comment.trim(), patToken).catch(() => {});
      }
      let updated: GitHubPullRequest;
      if (adapter?.closePullRequest && targetState === 'closed') {
        await adapter.closePullRequest(selectedPR.number, patToken);
        updated = { ...selectedPR, state: 'closed' };
      } else {
        updated = await updateGitHubPullRequestState(
          repoOwner,
          repoName,
          selectedPR.number,
          targetState,
          patToken
        );
      }
      selectedPR = updated;
      showCloseModal = false;
      if (prFilter === 'open' && targetState === 'closed') {
        prList = prList.filter((p) => p.id !== updated.id);
      } else {
        prList = prList.map((p) => (p.id === updated.id ? updated : p));
      }
      const newOpenCount = prList.filter((p) => p.state === 'open').length;
      if (remote) {
        remote.openPRCount = newOpenCount;
      }
      onPRCountChange?.(newOpenCount);
      toast.success(
        targetState === 'closed'
          ? localeState.t('pullRequest.reviewer.prClosed')
          : localeState.t('pullRequest.reviewer.prReopened'),
        localeState.t('pullRequest.reviewer.prStateUpdated', {
          number: selectedPR.number,
          state: targetState,
        })
      );
      if (comment && comment.trim()) {
        quickCommentText = '';
      }
      await loadPullRequests(true);
      await selectPR(updated);
    } catch (err: any) {
      toast.error(localeState.t('pullRequest.reviewer.opFailed'), err.message || String(err));
    } finally {
      isTogglingPRState = false;
    }
  }

  let filteredPRs = $derived.by(() => {
    if (!searchQuery.trim()) return prList;
    const q = searchQuery.toLowerCase().trim();
    return prList.filter(
      (pr) =>
        pr.title.toLowerCase().includes(q) ||
        pr.number.toString().includes(q) ||
        pr.user.login.toLowerCase().includes(q)
    );
  });

  async function handleCheckoutToLocal() {
    if (!selectedPR || !onCheckoutBranch) return;
    try {
      await onCheckoutBranch(selectedPR.head.ref);
      toast.success(
        localeState.t('pullRequest.reviewer.checkoutSuccess'),
        localeState.t('pullRequest.reviewer.checkoutSuccessDesc', {
          branch: selectedPR.head.ref,
        })
      );
    } catch (err: any) {
      toast.error(localeState.t('pullRequest.reviewer.checkoutError'), err.message || String(err));
    }
  }

  async function handlePostInlineComment() {
    if (!selectedPR || !inlineCommentLine || !inlineCommentText.trim()) return;
    const activeFile = prFiles[selectedFileIndex];
    if (!activeFile) return;

    try {
      isPostingComment = true;
      const newComment = await createGitHubInlineComment(
        repoOwner,
        repoName,
        selectedPR.number,
        selectedPR.head.sha,
        activeFile.filename,
        inlineCommentLine.line,
        'RIGHT',
        inlineCommentText.trim(),
        patToken
      );
      prComments = [...prComments, newComment];
      inlineCommentLine = null;
      inlineCommentText = '';
      toast.success(
        localeState.t('pullRequest.reviewer.inlineCommentSuccess'),
        localeState.t('pullRequest.reviewer.commentSuccessDesc')
      );
    } catch (err: any) {
      toast.error(localeState.t('pullRequest.reviewer.commentError'), err.message || String(err));
    } finally {
      isPostingComment = false;
    }
  }

  async function handleSubmitReview() {
    if (!selectedPR) return;
    try {
      isSubmittingReview = true;
      await submitGitHubPullRequestReview(
        repoOwner,
        repoName,
        selectedPR.number,
        reviewEvent,
        reviewBody.trim(),
        patToken
      );
      showReviewModal = false;
      reviewBody = '';
      toast.success(
        localeState.t('pullRequest.reviewer.reviewSuccess'),
        localeState.t('pullRequest.reviewer.reviewSuccessDesc', {
          event: reviewEvent,
          number: selectedPR.number,
        })
      );
      loadPullRequests();
    } catch (err: any) {
      let errMsg = err.message || String(err);
      if (errMsg.includes('Can not approve your own pull request') || errMsg.includes('cannot approve your own pull request')) {
        errMsg = localeState.t('pullRequest.reviewer.cannotApproveOwnPR');
      }
      toast.error(localeState.t('pullRequest.reviewer.reviewError'), errMsg);
    } finally {
      isSubmittingReview = false;
    }
  }
</script>

<div class="h-full w-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans select-none overflow-hidden">
  <!-- Top Bar: Repo Identity & GitHub Auth -->
  <div class="h-12 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/80 px-4 flex items-center justify-between gap-3 shrink-0">
    <div class="flex items-center gap-2.5 min-w-0">
      {#if isSidebarCollapsed && !isMobileView}
        <button
          onclick={() => (isSidebarCollapsed = false)}
          class="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
          title={localeState.t('pullRequest.reviewer.expandSidebar')}
        >
          <PanelLeftOpen class="w-4 h-4" />
        </button>
      {/if}
      <div class="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-800/40 text-violet-600 dark:text-violet-400 shrink-0">
        <GitPullRequest class="w-4 h-4" />
      </div>
      <div class="flex items-center gap-2 min-w-0 truncate">
        <span class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0 hidden md:inline">{localeState.t('pullRequest.reviewer.cloudCodeReview')}</span>
        {#if repoOwner && repoName}
          <span class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono shrink-0">
            {providerLabel}
          </span>
          <span class="text-xs font-mono px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-cyan-700 dark:text-cyan-300 truncate">
            {repoOwner}/{repoName}
          </span>
        {:else}
          <span class="text-xs text-amber-600 dark:text-amber-400 truncate">{localeState.t('pullRequest.reviewer.unidentifiedRemote')}</span>
        {/if}
      </div>
    </div>

    <!-- Controls: Create PR, Token, Refresh, Close -->
    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <button
        onclick={() => {
          if (onOpenCreatePR) {
            onOpenCreatePR();
          } else {
            showLocalCreatePRModal = true;
          }
        }}
        class="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        title={localeState.t('pullRequest.reviewer.createPRTitle')}
      >
        <Plus class="w-3.5 h-3.5 shrink-0" />
        <span class="hidden sm:inline">{prTerm === 'Merge Request' ? localeState.t('pullRequest.reviewer.createMR') : localeState.t('pullRequest.reviewer.createPR')}</span>
      </button>

      {#if activeAccount || activeAccountUsername}
        <button
          onclick={() => onOpenAuth?.()}
          class="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          title={localeState.t('toolbar.signedInAs', { username: activeAccount?.username || activeAccountUsername, provider: 'GitHub' })}
        >
          {#if activeAccount?.avatar_url}
            <img src={activeAccount.avatar_url} alt="Avatar" class="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 shrink-0" />
          {:else}
            <span class="w-4 h-4 rounded-full bg-cyan-600/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center text-[9px] font-bold shrink-0">
              {(activeAccount?.username || activeAccountUsername).slice(0, 2).toUpperCase()}
            </span>
          {/if}
          <span class="font-medium text-xs hidden sm:inline">@{activeAccount?.username || activeAccountUsername}</span>
        </button>
      {:else if onOpenAuth}
        <button
          onclick={onOpenAuth}
          class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          title={localeState.t('toolbar.signInTitle')}
        >
          <Key class="w-3.5 h-3.5 shrink-0" />
          <span class="hidden sm:inline">{localeState.t('toolbar.signIn')} GitHub</span>
        </button>
      {/if}

      <button
        onclick={() => loadPullRequests(false)}
        disabled={isLoadingPRs}
        class="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
        title={localeState.t('pullRequest.reviewer.refreshTitle')}
      >
        <RefreshCw class="w-3.5 h-3.5 {isLoadingPRs ? 'animate-spin text-violet-600 dark:text-violet-400' : ''}" />
      </button>

      {#if onClose}
        <button
          onclick={onClose}
          class="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
          title={localeState.t('pullRequest.reviewer.closeReviewTitle')}
        >
          <X class="w-4 h-4" />
        </button>
      {/if}
    </div>
  </div>

  <!-- Main Content Split -->
  <div class="flex-1 flex overflow-hidden relative">
    {#if isMobileView}
      <!-- Mobile Layout: Switch between List and Detail -->
      {#if mobilePane === 'list'}
        <div class="w-full h-full flex flex-col overflow-hidden">
          <PRListSidebar
            {filteredPRs}
            {selectedPR}
            {isLoadingPRs}
            {loadError}
            bind:searchQuery
            bind:prFilter
            onSelectPR={selectPR}
            onFilterChange={(f) => { prFilter = f; loadPullRequests(); }}
            onSearchChange={(q) => { searchQuery = q; }}
            onOpenCreatePR={() => {
              if (onOpenCreatePR) {
                onOpenCreatePR();
              } else {
                showLocalCreatePRModal = true;
              }
            }}
            onRetry={() => loadPullRequests(false)}
          />
        </div>
      {:else}
        <!-- Mobile Detail View -->
        <div class="w-full h-full flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
          {#if selectedPR}
            <PRHeader
              {selectedPR}
              {commitChecks}
              canCheckout={!!onCheckoutBranch}
              {isTogglingPRState}
              isMobileView={true}
              onBackToList={() => { mobilePane = 'list'; }}
              onCheckout={handleCheckoutToLocal}
              onOpenMergeModal={() => (showMergeModal = true)}
              onOpenCloseModal={() => (showCloseModal = true)}
              onReopenPR={() => handleTogglePRState('open')}
              onOpenReviewModal={() => {
                if (isOwnPR) reviewEvent = 'COMMENT';
                showReviewModal = true;
              }}
            />

            <!-- Tab Selector -->
            <div class="px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/40 dark:bg-zinc-900/20 flex items-center gap-4 text-xs shrink-0">
              <button
                onclick={() => (activeTab = 'files')}
                class="py-2.5 font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'files' ? 'border-violet-500 text-violet-700 dark:text-violet-300 font-semibold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
              >
                <FileText class="w-3.5 h-3.5" />
                <span>{localeState.t('pullRequest.reviewer.tabFiles')}</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {activeTab === 'files' ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}">
                  {prFiles.length}
                </span>
              </button>
              <button
                onclick={() => (activeTab = 'conversation')}
                class="py-2.5 font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'conversation' ? 'border-violet-500 text-violet-700 dark:text-violet-300 font-semibold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
              >
                <MessageSquare class="w-3.5 h-3.5" />
                <span>{localeState.t('pullRequest.reviewer.tabConversation')}</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {activeTab === 'conversation' ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}">
                  {prComments.length}
                </span>
              </button>
              <button
                onclick={() => (activeTab = 'commits')}
                class="py-2.5 font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'commits' ? 'border-violet-500 text-violet-700 dark:text-violet-300 font-semibold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
              >
                <GitCommit class="w-3.5 h-3.5" />
                <span>{localeState.t('pullRequest.reviewer.tabCommits')}</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {activeTab === 'commits' ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}">
                  {prCommits.length}
                </span>
              </button>
            </div>

            <!-- Tab Body -->
            {#if isLoadingDetails}
              <div class="flex-1 flex flex-col items-center justify-center text-xs text-zinc-500 gap-2">
                <RefreshCw class="w-5 h-5 animate-spin text-violet-600 dark:text-violet-400" />
                <span>{localeState.t('pullRequest.reviewer.loadingDetails')}</span>
              </div>
            {:else if activeTab === 'conversation'}
              <PRConversationTab
                {selectedPR}
                {prComments}
                bind:quickCommentText
                {isPostingQuickComment}
                {isTogglingPRState}
                onOpenMergeModal={() => (showMergeModal = true)}
                onOpenCloseModal={() => (showCloseModal = true)}
                onCloseWithComment={() => handleTogglePRState('closed', quickCommentText)}
                onReopenPR={() => handleTogglePRState('open', quickCommentText)}
                onPostQuickComment={handlePostQuickComment}
              />
            {:else if activeTab === 'commits'}
              <PRCommitsTab {prCommits} />
            {:else}
              <PRFilesTab
                {selectedPR}
                {prFiles}
                {prComments}
                bind:selectedFileIndex
                {viewedFiles}
                bind:diffMode
                bind:inlineCommentLine
                bind:inlineCommentText
                {isPostingComment}
                onSelectFile={(idx) => (selectedFileIndex = idx)}
                onToggleFileViewed={toggleFileViewed}
                onDiffModeChange={(mode) => (diffMode = mode)}
                onOpenInlineComment={(file, line) => {
                  inlineCommentLine = { file, line };
                }}
                onCloseInlineComment={() => {
                  inlineCommentLine = null;
                  inlineCommentText = '';
                }}
                onPostInlineComment={handlePostInlineComment}
              />
            {/if}
          {:else}
            <PRLaunchpadEmpty
              {repoOwner}
              {repoName}
              {prFilter}
              {searchQuery}
              totalPRCount={prList.length}
              {filteredPRs}
              {isLoadingPRs}
              {loadError}
              onRetry={() => loadPullRequests(false)}
              {onOpenAuth}
              onOpenCreatePR={() => {
                if (onOpenCreatePR) {
                  onOpenCreatePR();
                } else {
                  showLocalCreatePRModal = true;
                }
              }}
              onClearSearch={() => (searchQuery = '')}
              onSelectPR={selectPR}
            />
          {/if}
        </div>
      {/if}
    {:else}
      <!-- Desktop Layout: Collapsible & Resizable Sidebar + Detail Studio -->
      {#if !isSidebarCollapsed}
        <div style="width: {sidebarWidth}px;" class="h-full shrink-0 flex flex-col overflow-hidden">
          <PRListSidebar
            {filteredPRs}
            {selectedPR}
            {isLoadingPRs}
            {loadError}
            bind:searchQuery
            bind:prFilter
            onSelectPR={selectPR}
            onFilterChange={(f) => { prFilter = f; loadPullRequests(); }}
            onSearchChange={(q) => { searchQuery = q; }}
            onOpenCreatePR={() => {
              if (onOpenCreatePR) {
                onOpenCreatePR();
              } else {
                showLocalCreatePRModal = true;
              }
            }}
            onRetry={() => loadPullRequests(false)}
          />
        </div>

        <!-- Resize Handle -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
        <div
          role="separator"
          aria-orientation="vertical"
          tabindex="-1"
          onmousedown={startResize}
          class="w-1.5 h-full bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-violet-500 active:bg-violet-600 cursor-col-resize transition-colors flex items-center justify-center shrink-0 group relative z-10 select-none {isDraggingSidebar ? 'bg-violet-500!' : ''}"
          title="Kéo chuột để điều chỉnh độ rộng danh sách PR"
        >
          <div class="w-0.5 h-10 rounded-full bg-zinc-400 dark:bg-zinc-600 group-hover:bg-white transition-colors"></div>
        </div>
      {/if}

      <!-- Right Panel: PR Review Studio / Launchpad Empty -->
      {#if selectedPR}
        <div class="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950 min-w-0">
          <PRHeader
            {selectedPR}
            {commitChecks}
            canCheckout={!!onCheckoutBranch}
            {isTogglingPRState}
            isMobileView={false}
            {isSidebarCollapsed}
            onToggleSidebar={() => { isSidebarCollapsed = !isSidebarCollapsed; }}
            onCheckout={handleCheckoutToLocal}
            onOpenMergeModal={() => (showMergeModal = true)}
            onOpenCloseModal={() => (showCloseModal = true)}
            onReopenPR={() => handleTogglePRState('open')}
            onOpenReviewModal={() => {
              if (isOwnPR) reviewEvent = 'COMMENT';
              showReviewModal = true;
            }}
          />

          <!-- Tab Selector: Files Changed vs Conversation vs Commits -->
          <div class="px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/40 dark:bg-zinc-900/20 flex items-center gap-4 text-xs shrink-0">
            <button
              onclick={() => (activeTab = 'files')}
              class="py-2.5 font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'files' ? 'border-violet-500 text-violet-700 dark:text-violet-300 font-semibold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
              <FileText class="w-3.5 h-3.5" />
              <span>{localeState.t('pullRequest.reviewer.tabFiles')}</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {activeTab === 'files' ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}">
                {prFiles.length}
              </span>
            </button>
            <button
              onclick={() => (activeTab = 'conversation')}
              class="py-2.5 font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'conversation' ? 'border-violet-500 text-violet-700 dark:text-violet-300 font-semibold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
              <MessageSquare class="w-3.5 h-3.5" />
              <span>{localeState.t('pullRequest.reviewer.tabConversation')}</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {activeTab === 'conversation' ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}">
                {prComments.length}
              </span>
            </button>
            <button
              onclick={() => (activeTab = 'commits')}
              class="py-2.5 font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'commits' ? 'border-violet-500 text-violet-700 dark:text-violet-300 font-semibold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
              <GitCommit class="w-3.5 h-3.5" />
              <span>{localeState.t('pullRequest.reviewer.tabCommits')}</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {activeTab === 'commits' ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}">
                {prCommits.length}
              </span>
            </button>
          </div>

          <!-- Tab Body -->
          {#if isLoadingDetails}
            <div class="flex-1 flex flex-col items-center justify-center text-xs text-zinc-500 gap-2">
              <RefreshCw class="w-5 h-5 animate-spin text-violet-600 dark:text-violet-400" />
              <span>{localeState.t('pullRequest.reviewer.loadingDetails')}</span>
            </div>
          {:else if activeTab === 'conversation'}
            <PRConversationTab
              {selectedPR}
              {prComments}
              bind:quickCommentText
              {isPostingQuickComment}
              {isTogglingPRState}
              onOpenMergeModal={() => (showMergeModal = true)}
              onOpenCloseModal={() => (showCloseModal = true)}
              onCloseWithComment={() => handleTogglePRState('closed', quickCommentText)}
              onReopenPR={() => handleTogglePRState('open', quickCommentText)}
              onPostQuickComment={handlePostQuickComment}
            />
          {:else if activeTab === 'commits'}
            <PRCommitsTab {prCommits} />
          {:else}
            <PRFilesTab
              {selectedPR}
              {prFiles}
              {prComments}
              bind:selectedFileIndex
              {viewedFiles}
              bind:diffMode
              bind:inlineCommentLine
              bind:inlineCommentText
              {isPostingComment}
              onSelectFile={(idx) => (selectedFileIndex = idx)}
              onToggleFileViewed={toggleFileViewed}
              onDiffModeChange={(mode) => (diffMode = mode)}
              onOpenInlineComment={(file, line) => {
                inlineCommentLine = { file, line };
              }}
              onCloseInlineComment={() => {
                inlineCommentLine = null;
                inlineCommentText = '';
              }}
              onPostInlineComment={handlePostInlineComment}
            />
          {/if}
        </div>
      {:else}
        <PRLaunchpadEmpty
          {repoOwner}
          {repoName}
          {prFilter}
          {searchQuery}
          totalPRCount={prList.length}
          {filteredPRs}
          {isLoadingPRs}
          {loadError}
          onRetry={() => loadPullRequests(false)}
          {onOpenAuth}
          onOpenCreatePR={() => {
            if (onOpenCreatePR) {
              onOpenCreatePR();
            } else {
              showLocalCreatePRModal = true;
            }
          }}
          onClearSearch={() => (searchQuery = '')}
          onSelectPR={selectPR}
        />
      {/if}
    {/if}
  </div>
</div>

<!-- Submit Review Modal -->
<PRReviewModal
  isOpen={showReviewModal}
  {isOwnPR}
  bind:reviewEvent
  bind:reviewBody
  {isSubmittingReview}
  onClose={() => (showReviewModal = false)}
  onSubmit={handleSubmitReview}
/>

<!-- Create Pull Request Modal -->
<CreatePullRequestModal
  isOpen={showLocalCreatePRModal}
  {remoteOriginUrl}
  branches={localBranches}
  {activeAccount}
  {onOpenAuth}
  onClose={() => (showLocalCreatePRModal = false)}
  onSuccess={async (newPR) => {
    showLocalCreatePRModal = false;
    await loadPullRequests();
    selectPR(newPR);
  }}
/>

<!-- Merge Pull Request Confirmation Modal -->
<PRMergeModal
  isOpen={showMergeModal}
  {selectedPR}
  bind:mergeMethod
  bind:mergeCommitTitle
  bind:mergeCommitMessage
  bind:deleteBranchAfterMerge
  {isMerging}
  onClose={() => (showMergeModal = false)}
  onConfirm={handleConfirmMerge}
/>

<!-- Close Pull Request Confirmation Modal -->
<PRCloseModal
  isOpen={showCloseModal}
  {selectedPR}
  isClosing={isTogglingPRState}
  onClose={() => (showCloseModal = false)}
  onConfirm={(comment) => handleTogglePRState('closed', comment)}
/>
