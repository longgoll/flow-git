<script lang="ts">
  import { onMount } from 'svelte';
  import {
    GitPullRequest,
    ExternalLink,
    MessageSquare,
    FileText,
    CheckCircle2,
    Download,
    RefreshCw,
    Key,
    User,
    Send,
    Plus,
    X,
    Search,
    ShieldAlert,
    MessageCircle,
    Check,
  } from 'lucide-svelte';
  import type { BranchInfo, GitHubPRComment, GitHubPRFile, GitHubPullRequest } from '../types';
  import {
    fetchGitHubPullRequests,
    fetchGitHubPullRequestFiles,
    fetchGitHubPullRequestComments,
    createGitHubInlineComment,
    submitGitHubPullRequestReview,
    parseGitHubRemote,
    saveGitHubToken,
    getStoredGitHubToken,
  } from '../api/githubApi';
  import { getActiveAccount } from '../api/auth';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    remoteOriginUrl?: string | null;
    localBranches?: BranchInfo[];
    onCheckoutBranch?: (branchName: string) => Promise<void>;
    onClose?: () => void;
  }

  let {
    remoteOriginUrl = '',
    localBranches = [],
    onCheckoutBranch,
    onClose,
  }: Props = $props();

  // Detection & Config
  let parsedRemote = $derived(parseGitHubRemote(remoteOriginUrl));
  let repoOwner = $state('');
  let repoName = $state('');
  let patToken = $state(getStoredGitHubToken());
  let showTokenInput = $state(false);

  // Data state
  let prList = $state<GitHubPullRequest[]>([]);
  let isLoadingPRs = $state(false);
  let selectedPR = $state<GitHubPullRequest | null>(null);
  let prFilter = $state<'open' | 'closed' | 'all'>('open');
  let searchQuery = $state('');

  // Selected PR Details state
  let activeTab = $state<'conversation' | 'files'>('files');
  let prFiles = $state<GitHubPRFile[]>([]);
  let prComments = $state<GitHubPRComment[]>([]);
  let isLoadingDetails = $state(false);
  let selectedFileIndex = $state(0);

  // Review & Inline comment state
  let inlineCommentLine = $state<{ file: string; line: number } | null>(null);
  let inlineCommentText = $state('');
  let isPostingComment = $state(false);

  let showReviewModal = $state(false);
  let reviewEvent = $state<'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'>('COMMENT');
  let reviewBody = $state('');
  let isSubmittingReview = $state(false);

  // Sync state with detected remote
  $effect(() => {
    if (parsedRemote) {
      repoOwner = parsedRemote.owner;
      repoName = parsedRemote.repo;
    }
  });

  onMount(async () => {
    if (!patToken) {
      try {
        const activeAcc = await getActiveAccount('github');
        if (activeAcc?.token) {
          patToken = activeAcc.token;
          saveGitHubToken(activeAcc.token);
        }
      } catch (err) {
        console.warn('Could not load active account token', err);
      }
    }
    if (repoOwner && repoName) {
      loadPullRequests();
    }
  });

  async function loadPullRequests() {
    if (!repoOwner || !repoName) return;
    try {
      isLoadingPRs = true;
      if (!patToken) {
        try {
          const activeAcc = await getActiveAccount('github');
          if (activeAcc?.token) {
            patToken = activeAcc.token;
            saveGitHubToken(activeAcc.token);
          }
        } catch {}
      }
      const list = await fetchGitHubPullRequests(repoOwner, repoName, patToken, prFilter);
      prList = list;
      if (list.length > 0 && !selectedPR) {
        selectPR(list[0]);
      }
    } catch (err: any) {
      toast.error('Lỗi tải Pull Requests', err.message || String(err));
    } finally {
      isLoadingPRs = false;
    }
  }

  async function selectPR(pr: GitHubPullRequest) {
    selectedPR = pr;
    inlineCommentLine = null;
    inlineCommentText = '';
    selectedFileIndex = 0;
    try {
      isLoadingDetails = true;
      const [files, comments] = await Promise.all([
        fetchGitHubPullRequestFiles(repoOwner, repoName, pr.number, patToken).catch(() => []),
        fetchGitHubPullRequestComments(repoOwner, repoName, pr.number, patToken).catch(() => []),
      ]);
      prFiles = files;
      prComments = comments;
    } catch (err: any) {
      toast.error('Lỗi tải chi tiết PR', err.message || String(err));
    } finally {
      isLoadingDetails = false;
    }
  }

  function handleSaveToken() {
    saveGitHubToken(patToken);
    showTokenInput = false;
    toast.success('Đã lưu Token GitHub', 'Token của bạn đã được cập nhật.');
    loadPullRequests();
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

  function isLocalLinked(pr: GitHubPullRequest): boolean {
    const headRef = pr.head.ref;
    return localBranches.some((b) => !b.is_remote && b.shorthand === headRef);
  }

  async function handleCheckoutToLocal() {
    if (!selectedPR || !onCheckoutBranch) return;
    try {
      await onCheckoutBranch(selectedPR.head.ref);
      toast.success('Đã chuyển sang nhánh PR', `Đang đứng tại nhánh '${selectedPR.head.ref}'.`);
    } catch (err: any) {
      toast.error('Không thể checkout nhánh PR', err.message || String(err));
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
      toast.success('Đã gửi nhận xét inline', 'Bình luận đã được ghi nhận trên GitHub PR.');
    } catch (err: any) {
      toast.error('Không thể gửi bình luận', err.message || String(err));
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
      toast.success('Đã gửi Review thành công', `Đã gửi đánh giá (${reviewEvent}) cho PR #${selectedPR.number}.`);
      loadPullRequests();
    } catch (err: any) {
      toast.error('Không thể gửi Review', err.message || String(err));
    } finally {
      isSubmittingReview = false;
    }
  }

  function getLineComments(filePath: string, line: number) {
    return prComments.filter((c) => c.path === filePath && c.line === line);
  }
</script>

<div class="h-full w-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans select-none overflow-hidden">
  <!-- Top Bar: Repo Identity & GitHub Auth -->
  <div class="h-12 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/80 px-4 flex items-center justify-between gap-4 shrink-0">
    <div class="flex items-center gap-3">
      <div class="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-800/40 text-violet-600 dark:text-violet-400">
        <GitPullRequest class="w-4 h-4" />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Cloud Code Review</span>
        {#if repoOwner && repoName}
          <span class="text-xs font-mono px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-cyan-700 dark:text-cyan-300">
            {repoOwner}/{repoName}
          </span>
        {:else}
          <span class="text-xs text-amber-600 dark:text-amber-400">Chưa xác định GitHub Remote (origin)</span>
        {/if}
      </div>
    </div>

    <!-- Controls: Token, Refresh, Close -->
    <div class="flex items-center gap-2">
      {#if !patToken}
        <button
          onclick={() => (showTokenInput = true)}
          class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Key class="w-3.5 h-3.5" />
          <span>Nhập GitHub Token (PAT)</span>
        </button>
      {:else}
        <button
          onclick={() => (showTokenInput = !showTokenInput)}
          class="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Thay đổi GitHub Personal Access Token"
        >
          <Key class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Token đã kết nối</span>
        </button>
      {/if}

      <button
        onclick={loadPullRequests}
        disabled={isLoadingPRs}
        class="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
        title="Tải lại danh sách PRs"
      >
        <RefreshCw class="w-3.5 h-3.5 {isLoadingPRs ? 'animate-spin text-violet-600 dark:text-violet-400' : ''}" />
      </button>

      {#if onClose}
        <button
          onclick={onClose}
          class="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          title="Đóng giao diện PR Review"
        >
          <X class="w-4 h-4" />
        </button>
      {/if}
    </div>
  </div>

  <!-- Token Input Drawer (Optional) -->
  {#if showTokenInput}
    <div class="p-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
      <div class="flex items-center gap-2 flex-1 max-w-xl">
        <Key class="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
        <input
          type="password"
          bind:value={patToken}
          placeholder="GitHub Personal Access Token (ghp_...)"
          class="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
        />
        <button
          onclick={handleSaveToken}
          class="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs cursor-pointer shadow-xs"
        >
          Lưu Token
        </button>
      </div>
      <p class="text-[11px] text-zinc-600 dark:text-zinc-400 hidden md:block">
        Cần quyền <code class="text-cyan-700 dark:text-cyan-300">repo</code> để gửi nhận xét inline và duyệt PR.
      </p>
    </div>
  {/if}

  <!-- Main Content Split -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Panel: PR List -->
    <div class="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/70 dark:bg-zinc-950/60 shrink-0">
      <!-- Search & Filters -->
      <div class="p-2.5 border-b border-zinc-200 dark:border-zinc-800/80 space-y-2">
        <div class="relative">
          <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Tìm PR theo tên hoặc số..."
            class="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div class="flex items-center gap-1">
          {#each (['open', 'closed', 'all'] as const) as f}
            <button
              onclick={() => { prFilter = f; loadPullRequests(); }}
              class="flex-1 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer capitalize {prFilter === f ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
              {f}
            </button>
          {/each}
        </div>
      </div>

      <!-- PR Items -->
      <div class="flex-1 overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-900">
        {#if isLoadingPRs}
          <div class="p-6 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
            <RefreshCw class="w-4 h-4 animate-spin text-violet-600 dark:text-violet-400" />
            <span>Đang tải danh sách PRs từ GitHub...</span>
          </div>
        {:else if filteredPRs.length === 0}
          <div class="p-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
            Không tìm thấy Pull Request nào.
          </div>
        {:else}
          {#each filteredPRs as pr}
            {@const isSelected = selectedPR?.number === pr.number}
            {@const linked = isLocalLinked(pr)}
            <button
              type="button"
              onclick={() => selectPR(pr)}
              class="w-full p-3 text-left transition-colors cursor-pointer block {isSelected ? 'bg-violet-100/70 dark:bg-violet-950/30 border-l-2 border-violet-500' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900/50'}"
            >
              <div class="flex items-start justify-between gap-2">
                <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-200 line-clamp-2">
                  #{pr.number} {pr.title}
                </span>
                {#if linked}
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 shrink-0" title="Nhánh này đã tồn tại dưới máy của bạn">
                    Local
                  </span>
                {:else}
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 shrink-0" title="Chỉ tồn tại trên GitHub Remote">
                    Cloud
                  </span>
                {/if}
              </div>

              <div class="mt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <span class="flex items-center gap-1.5">
                  <User class="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                  {pr.user.login}
                </span>
                <span class="font-mono text-[10px] text-zinc-500">
                  {pr.base.ref} &larr; {pr.head.ref}
                </span>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Right Panel: PR Review Studio -->
    {#if selectedPR}
      <div class="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
        <!-- PR Header Details -->
        <div class="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/40 flex items-start justify-between gap-4 shrink-0">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold {selectedPR.state === 'open' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60' : 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800/60'}">
                {selectedPR.state.toUpperCase()}
              </span>
              <h1 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                #{selectedPR.number} {selectedPR.title}
              </h1>
            </div>

            <div class="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
              <span>Bởi <strong class="text-zinc-900 dark:text-zinc-200">{selectedPR.user.login}</strong></span>
              <span>•</span>
              <span class="font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                Nhánh: <code class="text-violet-700 dark:text-violet-300">{selectedPR.head.ref}</code> &rarr; <code class="text-zinc-700 dark:text-zinc-300">{selectedPR.base.ref}</code>
              </span>
            </div>
          </div>

          <!-- Actions: Checkout to Local, Review, Open GitHub -->
          <div class="flex items-center gap-2 shrink-0">
            {#if onCheckoutBranch}
              <button
                onclick={handleCheckoutToLocal}
                class="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Tải nhánh PR này về máy để chạy và kiểm thử độc lập"
              >
                <Download class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Checkout to Local</span>
              </button>
            {/if}

            <button
              onclick={() => (showReviewModal = true)}
              class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <CheckCircle2 class="w-3.5 h-3.5" />
              <span>Submit Review</span>
            </button>

            <a
              href={selectedPR.html_url}
              target="_blank"
              rel="noreferrer"
              class="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title="Mở trên GitHub.com"
            >
              <ExternalLink class="w-4 h-4" />
            </a>
          </div>
        </div>

        <!-- Tab Selector: Conversation vs Files Changed -->
        <div class="px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/40 dark:bg-zinc-900/20 flex items-center gap-4 text-xs shrink-0">
          <button
            onclick={() => (activeTab = 'files')}
            class="py-2.5 font-medium flex items-center gap-1.5 border-b-2 transition-all cursor-pointer {activeTab === 'files' ? 'border-violet-500 text-violet-700 dark:text-violet-300 font-semibold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            <FileText class="w-3.5 h-3.5" />
            <span>Files Changed ({prFiles.length})</span>
          </button>
          <button
            onclick={() => (activeTab = 'conversation')}
            class="py-2.5 font-medium flex items-center gap-1.5 border-b-2 transition-all cursor-pointer {activeTab === 'conversation' ? 'border-violet-500 text-violet-700 dark:text-violet-300 font-semibold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            <MessageSquare class="w-3.5 h-3.5" />
            <span>Description & Conversation ({prComments.length})</span>
          </button>
        </div>

        <!-- Tab Body -->
        {#if isLoadingDetails}
          <div class="flex-1 flex flex-col items-center justify-center text-xs text-zinc-500 gap-2">
            <RefreshCw class="w-5 h-5 animate-spin text-violet-600 dark:text-violet-400" />
            <span>Đang tải tệp thay đổi và thảo luận từ GitHub...</span>
          </div>
        {:else if activeTab === 'conversation'}
          <div class="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl">
            <!-- Author PR Description Card -->
            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800/60 pb-2">
                <User class="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <span class="font-medium text-zinc-900 dark:text-zinc-200">{selectedPR.user.login}</span>
                <span>đã mở PR này:</span>
              </div>
              <div class="text-xs text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed pt-1 select-text">
                {selectedPR.body || 'Không có mô tả chi tiết.'}
              </div>
            </div>

            <!-- Comments Timeline -->
            {#if prComments.length > 0}
              <div class="space-y-3 pt-2">
                <h3 class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Thảo luận & Nhận xét ({prComments.length})
                </h3>
                {#each prComments as comment}
                  <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-1.5 select-text">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-medium text-cyan-700 dark:text-cyan-300">@{comment.user.login}</span>
                      {#if comment.path && comment.line}
                        <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                          {comment.path}:{comment.line}
                        </span>
                      {/if}
                    </div>
                    <p class="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{comment.body}</p>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          <!-- Files Changed Split: File List & Diff Viewer -->
          <div class="flex-1 flex overflow-hidden">
            <!-- Modified Files Sidebar -->
            <div class="w-64 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/40 divide-y divide-zinc-200/60 dark:divide-zinc-900/60 shrink-0">
              {#each prFiles as file, idx}
                <button
                  type="button"
                  onclick={() => (selectedFileIndex = idx)}
                  class="w-full p-2.5 text-left text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 {selectedFileIndex === idx ? 'bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-white font-medium shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/40'}"
                >
                  <span class="font-mono text-[11px] truncate flex-1" title={file.filename}>
                    {file.filename}
                  </span>
                  <div class="flex items-center gap-1 text-[10px] font-mono shrink-0">
                    {#if file.additions > 0}
                      <span class="text-emerald-600 dark:text-emerald-400 font-semibold">+{file.additions}</span>
                    {/if}
                    {#if file.deletions > 0}
                      <span class="text-rose-600 dark:text-rose-400 font-semibold">-{file.deletions}</span>
                    {/if}
                  </div>
                </button>
              {/each}
            </div>

            <!-- Diff Content & Inline Commenting -->
            <div class="flex-1 overflow-y-auto p-4 font-mono text-xs select-text">
              {#if prFiles[selectedFileIndex]}
                {@const activeFile = prFiles[selectedFileIndex]}
                <div class="mb-3 flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <span class="font-bold text-zinc-900 dark:text-zinc-200 font-mono">{activeFile.filename}</span>
                  <span class="text-[11px] text-zinc-500">
                    +{activeFile.additions} / -{activeFile.deletions} dòng
                  </span>
                </div>

                {#if activeFile.patch}
                  <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-900">
                    {#each activeFile.patch.split('\n') as line, lineIdx}
                      {@const isAdd = line.startsWith('+')}
                      {@const isDel = line.startsWith('-')}
                      {@const isHeader = line.startsWith('@@')}
                      {@const currentLineNumber = lineIdx + 1}
                      {@const lineComments = getLineComments(activeFile.filename, currentLineNumber)}

                      <div class="group flex flex-col {isAdd ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200' : isDel ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200' : isHeader ? 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-400 font-bold' : 'text-zinc-800 dark:text-zinc-300'} hover:bg-zinc-100 dark:hover:bg-zinc-900/60 transition-colors">
                        <div class="flex items-center pr-3">
                          <span class="w-10 px-2 py-0.5 text-right text-[10px] text-zinc-400 dark:text-zinc-600 select-none shrink-0 border-r border-zinc-200 dark:border-zinc-850">
                            {currentLineNumber}
                          </span>

                          <span class="px-3 py-0.5 flex-1 whitespace-pre-wrap break-all select-text font-mono">
                            {line}
                          </span>

                          <!-- Inline Comment trigger button -->
                          <button
                            onclick={() => {
                              inlineCommentLine = { file: activeFile.filename, line: currentLineNumber };
                            }}
                            class="opacity-0 group-hover:opacity-100 p-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white transition-opacity cursor-pointer ml-2 shadow-xs"
                            title="Thêm bình luận trên dòng này"
                          >
                            <Plus class="w-3 h-3" />
                          </button>
                        </div>

                        <!-- Existing Inline Comments on this line -->
                        {#if lineComments.length > 0}
                          <div class="ml-10 p-2.5 bg-zinc-50 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
                            {#each lineComments as c}
                              <div class="text-[11px]">
                                <span class="font-semibold text-cyan-700 dark:text-cyan-300">@{c.user.login}:</span>
                                <span class="text-zinc-800 dark:text-zinc-200 ml-1">{c.body}</span>
                              </div>
                            {/each}
                          </div>
                        {/if}

                        <!-- Inline Comment Box if active on this line -->
                        {#if inlineCommentLine?.file === activeFile.filename && inlineCommentLine?.line === currentLineNumber}
                          <div class="ml-10 p-3 bg-zinc-50 dark:bg-zinc-900 border-t border-violet-200 dark:border-violet-800/40 space-y-2">
                            <textarea
                              bind:value={inlineCommentText}
                              placeholder="Nhập nhận xét của bạn trên dòng code này..."
                              rows={2}
                              class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg p-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none font-sans"
                            ></textarea>
                            <div class="flex items-center justify-end gap-2">
                              <button
                                onclick={() => { inlineCommentLine = null; inlineCommentText = ''; }}
                                class="px-2.5 py-1 rounded text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                              >
                                Hủy
                              </button>
                              <button
                                onclick={handlePostInlineComment}
                                disabled={isPostingComment || !inlineCommentText.trim()}
                                class="px-3 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Send class="w-3 h-3" />
                                <span>Gửi nhận xét</span>
                              </button>
                            </div>
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {:else}
                  <div class="p-6 text-center text-zinc-400 dark:text-zinc-500">
                    Tệp nhị phân hoặc không có diff chi tiết.
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 text-xs p-6">
        <GitPullRequest class="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" />
        <p>Chọn một Pull Request từ danh sách bên trái để bắt đầu Review.</p>
      </div>
    {/if}
  </div>
</div>

<!-- Submit Review Modal -->
{#if showReviewModal}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    role="dialog"
    aria-modal="true"
  >
    <div class="w-full max-w-lg bg-white dark:bg-zinc-950 border border-violet-300 dark:border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
      <div class="px-6 py-4 bg-zinc-100/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 text-violet-600 dark:text-violet-400" />
          Submit Pull Request Review
        </h2>
        <button
          onclick={() => (showReviewModal = false)}
          class="p-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-4">
        <!-- Review Action Type -->
        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            onclick={() => (reviewEvent = 'COMMENT')}
            class="p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex flex-col items-center gap-1 {reviewEvent === 'COMMENT' ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}"
          >
            <MessageCircle class="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>Comment</span>
          </button>
          <button
            type="button"
            onclick={() => (reviewEvent = 'APPROVE')}
            class="p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex flex-col items-center gap-1 {reviewEvent === 'APPROVE' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}"
          >
            <Check class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Approve</span>
          </button>
          <button
            type="button"
            onclick={() => (reviewEvent = 'REQUEST_CHANGES')}
            class="p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex flex-col items-center gap-1 {reviewEvent === 'REQUEST_CHANGES' ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}"
          >
            <ShieldAlert class="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Request Changes</span>
          </button>
        </div>

        <!-- Summary comment -->
        <div class="space-y-1.5">
          <label for="review-summary" class="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Tổng kết đánh giá (Tùy chọn):
          </label>
          <textarea
            id="review-summary"
            bind:value={reviewBody}
            placeholder="Viết nhận xét tổng thể về PR này..."
            rows={3}
            class="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none font-sans"
          ></textarea>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onclick={() => (showReviewModal = false)}
            class="px-4 py-2 rounded-xl text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onclick={handleSubmitReview}
            disabled={isSubmittingReview}
            class="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSubmittingReview ? 'Đang gửi...' : 'Gửi Đánh Giá'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
