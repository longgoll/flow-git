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
    GitMerge,
    Sparkles,
    RotateCcw,
    ArrowRight,
    GitCommit,
    Eye,
    FileCode,
    XCircle,
    Clock,
    Bot,
    CheckCircle,
    Loader2,
  } from 'lucide-svelte';
  import type {
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
    deleteGitHubBranch,
    parseGitHubRemote,
    saveGitHubToken,
    getStoredGitHubToken,
  } from '../api/githubApi';
  import { getActiveAccount } from '../api/auth';
  import { formatRelativeTime } from '../utils/timeUtils';
  import { generateAIPRReview } from '../api/ai';
  import { toast } from '../state/toastState.svelte';
  import CreatePullRequestModal from './CreatePullRequestModal.svelte';
  import MarkdownViewer from './MarkdownViewer.svelte';

  interface Props {
    remoteOriginUrl?: string | null;
    localBranches?: BranchInfo[];
    onCheckoutBranch?: (branchName: string) => Promise<void>;
    onOpenCreatePR?: () => void;
    onClose?: () => void;
  }

  let {
    remoteOriginUrl = '',
    localBranches = [],
    onCheckoutBranch,
    onOpenCreatePR,
    onClose,
  }: Props = $props();

  // Detection & Config
  let parsedRemote = $derived(parseGitHubRemote(remoteOriginUrl));
  let repoOwner = $state('');
  let repoName = $state('');
  let patToken = $state(getStoredGitHubToken());
  let showTokenInput = $state(false);
  let showLocalCreatePRModal = $state(false);
  let activeAccountUsername = $state('');

  // Merge PR State
  let showMergeModal = $state(false);
  let mergeMethod = $state<'merge' | 'squash' | 'rebase'>('merge');
  let mergeCommitTitle = $state('');
  let mergeCommitMessage = $state('');
  let deleteBranchAfterMerge = $state(false);
  let isMerging = $state(false);

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

  // Quick Comment & AI Review state
  let quickCommentText = $state('');
  let isPostingQuickComment = $state(false);
  let isGeneratingReview = $state(false);
  let aiReviewResult = $state<string | null>(null);

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

  // Check if current authenticated user is PR author
  let isOwnPR = $derived(
    !!selectedPR &&
    !!activeAccountUsername &&
    selectedPR.user.login.toLowerCase() === activeAccountUsername.toLowerCase()
  );

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
        if (activeAcc?.username) {
          activeAccountUsername = activeAcc.username;
        }
      } catch (err) {
        console.warn('Could not load active account token', err);
      }
    } else {
      try {
        const activeAcc = await getActiveAccount('github');
        if (activeAcc?.username) {
          activeAccountUsername = activeAcc.username;
        }
      } catch {}
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
    quickCommentText = '';
    aiReviewResult = null;
    selectedFileIndex = 0;
    mergeCommitTitle = `Merge pull request #${pr.number} from ${pr.head.ref}`;
    mergeCommitMessage = pr.title;
    if (isOwnPR) {
      reviewEvent = 'COMMENT';
    }
    try {
      isLoadingDetails = true;
      const [files, comments, detail, commits, checks] = await Promise.all([
        fetchGitHubPullRequestFiles(repoOwner, repoName, pr.number, patToken).catch(() => []),
        fetchGitHubPullRequestComments(repoOwner, repoName, pr.number, patToken).catch(() => []),
        fetchGitHubPullRequestDetail(repoOwner, repoName, pr.number, patToken).catch(() => null),
        fetchGitHubPullRequestCommits(repoOwner, repoName, pr.number, patToken).catch(() => []),
        fetchGitHubCommitChecks(repoOwner, repoName, pr.head.sha, patToken).catch(() => null),
      ]);
      prFiles = files;
      prComments = comments;
      prCommits = commits;
      commitChecks = checks;
      if (detail) {
        selectedPR = { ...pr, ...detail };
      }
    } catch (err: any) {
      toast.error('Lỗi tải chi tiết PR', err.message || String(err));
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
      toast.success('Đã gửi nhận xét!', 'Bình luận đã được ghi nhận trên GitHub PR.');
    } catch (err: any) {
      toast.error('Không thể gửi bình luận', err.message || String(err));
    } finally {
      isPostingQuickComment = false;
    }
  }

  async function handleGenerateAIReview() {
    if (!selectedPR || prFiles.length === 0) return;
    try {
      isGeneratingReview = true;
      aiReviewResult = null;
      const review = await generateAIPRReview(selectedPR.title, prFiles);
      aiReviewResult = review;
      activeTab = 'conversation';
      toast.success('AI Code Review hoàn tất!', 'Đã tạo bản tóm tắt và đánh giá cho PR.');
    } catch (err: any) {
      toast.error('Lỗi sinh AI Review', err.message || String(err));
    } finally {
      isGeneratingReview = false;
    }
  }

  function isFileViewed(prNumber: number, filename: string): boolean {
    return !!viewedFiles[`${prNumber}:${filename}`];
  }

  function toggleFileViewed(prNumber: number, filename: string) {
    const key = `${prNumber}:${filename}`;
    viewedFiles[key] = !viewedFiles[key];
  }

  async function handleConfirmMerge() {
    if (!selectedPR) return;
    try {
      isMerging = true;
      await mergeGitHubPullRequest(
        repoOwner,
        repoName,
        selectedPR.number,
        mergeMethod,
        mergeCommitTitle.trim() || undefined,
        mergeCommitMessage.trim() || undefined,
        patToken
      );

      toast.success(
        'Hợp nhất Pull Request thành công!',
        `PR #${selectedPR.number} đã được merge vào nhánh '${selectedPR.base.ref}'.`
      );

      if (deleteBranchAfterMerge && selectedPR.head.ref) {
        try {
          await deleteGitHubBranch(repoOwner, repoName, selectedPR.head.ref, patToken);
          toast.info(`Đã xóa nhánh remote '${selectedPR.head.ref}'.`);
        } catch (delErr) {
          console.warn('Could not delete remote branch after merge', delErr);
        }
      }

      showMergeModal = false;
      await loadPullRequests();
      if (selectedPR) {
        selectedPR = { ...selectedPR, state: 'closed', merged: true };
      }
    } catch (err: any) {
      toast.error('Không thể merge Pull Request', err.message || String(err));
    } finally {
      isMerging = false;
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
      let errMsg = err.message || String(err);
      if (errMsg.includes('Can not approve your own pull request') || errMsg.includes('cannot approve your own pull request')) {
        errMsg = 'Bạn là tác giả của PR này nên không thể tự Approve. Vui lòng chọn mục "Comment" để gửi nhận xét.';
      }
      toast.error('Không thể gửi Review', errMsg);
    } finally {
      isSubmittingReview = false;
    }
  }

  function getLineComments(filePath: string, line: number) {
    return prComments.filter((c) => c.path === filePath && c.line === line);
  }

  // Resizable Files Sidebar State
  let filesSidebarWidth = $state(280);
  let isResizingFiles = $state(false);

  function handleStartResizeFiles(e: MouseEvent) {
    e.preventDefault();
    isResizingFiles = true;
    const startX = e.clientX;
    const startWidth = filesSidebarWidth;

    function onMouseMove(moveEvent: MouseEvent) {
      const delta = moveEvent.clientX - startX;
      filesSidebarWidth = Math.max(200, Math.min(520, startWidth + delta));
    }

    function onMouseUp() {
      isResizingFiles = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  interface ParsedDiffLine {
    type: 'header' | 'add' | 'del' | 'context';
    oldLineNumber: number | null;
    newLineNumber: number | null;
    content: string;
  }

  function parsePatchLines(patch: string): ParsedDiffLine[] {
    const rawLines = patch.split('\n');
    const result: ParsedDiffLine[] = [];
    let oldLine = 0;
    let newLine = 0;

    for (const line of rawLines) {
      if (line.startsWith('@@')) {
        const match = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
        if (match) {
          oldLine = parseInt(match[1], 10);
          newLine = parseInt(match[2], 10);
        }
        result.push({
          type: 'header',
          oldLineNumber: null,
          newLineNumber: null,
          content: line,
        });
      } else if (line.startsWith('+')) {
        result.push({
          type: 'add',
          oldLineNumber: null,
          newLineNumber: newLine,
          content: line.slice(1),
        });
        newLine++;
      } else if (line.startsWith('-')) {
        result.push({
          type: 'del',
          oldLineNumber: oldLine,
          newLineNumber: null,
          content: line.slice(1),
        });
        oldLine++;
      } else {
        const content = line.startsWith(' ') ? line.slice(1) : line;
        result.push({
          type: 'context',
          oldLineNumber: oldLine,
          newLineNumber: newLine,
          content,
        });
        oldLine++;
        newLine++;
      }
    }
    return result;
  }

  function getFileStatusBadge(file: GitHubPRFile): { label: string; bg: string; text: string; border: string } {
    if (file.status === 'added') {
      return { label: 'A', bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-800' };
    }
    if (file.status === 'deleted') {
      return { label: 'D', bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-300 dark:border-rose-800' };
    }
    if (file.status === 'renamed') {
      return { label: 'R', bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-300 dark:border-purple-800' };
    }
    return { label: 'M', bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-800' };
  }

  function getPRStatusBadge(pr: GitHubPullRequest) {
    if (pr.merged || pr.merged_at) {
      return {
        label: 'MERGED',
        bg: 'bg-purple-100 dark:bg-purple-950/80',
        text: 'text-purple-800 dark:text-purple-300',
        border: 'border-purple-300 dark:border-purple-800/60',
        icon: GitMerge,
      };
    }
    if (pr.draft) {
      return {
        label: 'DRAFT',
        bg: 'bg-zinc-100 dark:bg-zinc-900',
        text: 'text-zinc-600 dark:text-zinc-400',
        border: 'border-dashed border-zinc-300 dark:border-zinc-700',
        icon: FileCode,
      };
    }
    if (pr.state === 'closed') {
      return {
        label: 'CLOSED',
        bg: 'bg-rose-100 dark:bg-rose-950/80',
        text: 'text-rose-800 dark:text-rose-300',
        border: 'border-rose-300 dark:border-rose-800/60',
        icon: XCircle,
      };
    }
    return {
      label: 'OPEN',
      bg: 'bg-emerald-100 dark:bg-emerald-950/80',
      text: 'text-emerald-800 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-800/60',
      icon: GitPullRequest,
    };
  }

  interface SplitDiffRow {
    isHeader: boolean;
    headerContent?: string;
    left?: {
      type: 'del' | 'context' | 'empty';
      lineNumber: number | null;
      content: string;
    };
    right?: {
      type: 'add' | 'context' | 'empty';
      lineNumber: number | null;
      content: string;
    };
  }

  function parseSplitDiffRows(patch: string): SplitDiffRow[] {
    const unifiedLines = parsePatchLines(patch);
    const rows: SplitDiffRow[] = [];
    let i = 0;
    while (i < unifiedLines.length) {
      const line = unifiedLines[i];
      if (line.type === 'header') {
        rows.push({ isHeader: true, headerContent: line.content });
        i++;
      } else if (line.type === 'context') {
        rows.push({
          isHeader: false,
          left: { type: 'context', lineNumber: line.oldLineNumber, content: line.content },
          right: { type: 'context', lineNumber: line.newLineNumber, content: line.content },
        });
        i++;
      } else {
        const dels: ParsedDiffLine[] = [];
        const adds: ParsedDiffLine[] = [];
        while (i < unifiedLines.length && (unifiedLines[i].type === 'del' || unifiedLines[i].type === 'add')) {
          if (unifiedLines[i].type === 'del') dels.push(unifiedLines[i]);
          else adds.push(unifiedLines[i]);
          i++;
        }
        const maxLen = Math.max(dels.length, adds.length);
        for (let k = 0; k < maxLen; k++) {
          const d = dels[k];
          const a = adds[k];
          rows.push({
            isHeader: false,
            left: d ? { type: 'del', lineNumber: d.oldLineNumber, content: d.content } : undefined,
            right: a ? { type: 'add', lineNumber: a.newLineNumber, content: a.content } : undefined,
          });
        }
      }
    }
    return rows;
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

    <!-- Controls: Create PR, Token, Refresh, Close -->
    <div class="flex items-center gap-2">
      <button
        onclick={() => {
          if (onOpenCreatePR) {
            onOpenCreatePR();
          } else {
            showLocalCreatePRModal = true;
          }
        }}
        class="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        title="Tạo Pull Request mới lên GitHub"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>Tạo Pull Request</span>
      </button>

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
          <div class="p-6 text-center text-xs text-zinc-400 dark:text-zinc-500 space-y-3">
            {#if searchQuery.trim()}
              <div class="leading-relaxed">Không tìm thấy PR nào khớp với "<strong class="text-zinc-700 dark:text-zinc-300">{searchQuery}</strong>"</div>
              <button
                type="button"
                onclick={() => { searchQuery = ''; }}
                class="px-2.5 py-1 rounded-md bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw class="w-3 h-3" />
                <span>Xóa tìm kiếm</span>
              </button>
            {:else}
              <div>Chưa có Pull Request nào ({prFilter})</div>
              <button
                type="button"
                onclick={() => {
                  if (onOpenCreatePR) {
                    onOpenCreatePR();
                  } else {
                    showLocalCreatePRModal = true;
                  }
                }}
                class="px-3 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-900 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Tạo Pull Request mới</span>
              </button>
            {/if}
          </div>
        {:else}
          {#each filteredPRs as pr}
            {@const isSelected = selectedPR?.number === pr.number}
            {@const linked = isLocalLinked(pr)}
            {@const statusBadge = getPRStatusBadge(pr)}
            {@const StatusIcon = statusBadge.icon}
            <button
              type="button"
              onclick={() => selectPR(pr)}
              class="w-full p-3 text-left transition-colors cursor-pointer block {isSelected ? 'bg-violet-100/70 dark:bg-violet-950/30 border-l-2 border-violet-500' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900/50'}"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-1.5 min-w-0 flex-1">
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-bold border flex items-center gap-1 shrink-0 mt-0.5 {statusBadge.bg} {statusBadge.text} {statusBadge.border}">
                    <StatusIcon class="w-2.5 h-2.5" />
                    <span>{statusBadge.label}</span>
                  </span>
                  <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-200 line-clamp-2">
                    #{pr.number} {pr.title}
                  </span>
                </div>
                {#if linked}
                  <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 shrink-0" title="Nhánh này đã tồn tại dưới máy của bạn">
                    Local
                  </span>
                {/if}
              </div>

              <div class="mt-2 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <span class="flex items-center gap-1 truncate">
                  <User class="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <span class="truncate">{pr.user.login}</span>
                  <span>•</span>
                  <span class="text-[10px]">{formatRelativeTime(pr.created_at)}</span>
                </span>
                <span class="font-mono text-[10px] flex items-center gap-1 text-zinc-500 dark:text-zinc-400 shrink-0">
                  <span class="text-violet-600 dark:text-violet-400 font-medium">{pr.head.ref}</span>
                  <span class="text-zinc-400">&rarr;</span>
                  <span class="text-zinc-600 dark:text-zinc-400">{pr.base.ref}</span>
                </span>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Right Panel: PR Review Studio -->
    {#if selectedPR}
      {@const statusBadge = getPRStatusBadge(selectedPR)}
      {@const StatusIcon = statusBadge.icon}
      <div class="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
        <!-- PR Header Details -->
        <div class="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/40 flex items-start justify-between gap-4 shrink-0">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border {statusBadge.bg} {statusBadge.text} {statusBadge.border}">
                <StatusIcon class="w-3.5 h-3.5" />
                <span>{statusBadge.label}</span>
              </span>
              <h1 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                #{selectedPR.number} {selectedPR.title}
              </h1>
            </div>

            <div class="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
              <span>Bởi <strong class="text-zinc-900 dark:text-zinc-200">{selectedPR.user.login}</strong> ({formatRelativeTime(selectedPR.created_at)})</span>
              <span>•</span>
              <span class="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                <span>Nhánh:</span>
                <code class="px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-semibold">{selectedPR.head.ref}</code>
                <span class="text-zinc-400">&rarr;</span>
                <code class="px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">{selectedPR.base.ref}</code>
              </span>

              <!-- CI / GitHub Actions Checks Status -->
              {#if commitChecks && commitChecks.total_count > 0}
                <span>•</span>
                {#if commitChecks.state === 'success'}
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1" title="Tất cả bài kiểm thử CI đã vượt qua">
                    <CheckCircle class="w-3 h-3" />
                    <span>CI Passed ({commitChecks.total_count})</span>
                  </span>
                {:else if commitChecks.state === 'pending'}
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center gap-1" title="Các bài kiểm tra CI đang chạy...">
                    <Clock class="w-3 h-3 animate-spin" />
                    <span>CI Running...</span>
                  </span>
                {:else if commitChecks.state === 'failure'}
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center gap-1" title="Có bài kiểm tra CI bị lỗi!">
                    <XCircle class="w-3 h-3" />
                    <span>CI Failed</span>
                  </span>
                {/if}
              {/if}
            </div>
          </div>

          <!-- Actions: Checkout to Local, Review, Open GitHub -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- AI Review PR Button -->
            <button
              onclick={handleGenerateAIReview}
              disabled={isGeneratingReview || prFiles.length === 0}
              class="px-2.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 dark:hover:bg-violet-900/60 border border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              title="Sử dụng FlowGit AI phân tích nhanh các rủi ro và thay đổi trong PR này"
            >
              {#if isGeneratingReview}
                <Loader2 class="w-3.5 h-3.5 animate-spin" />
                <span>AI đang review...</span>
              {:else}
                <Sparkles class="w-3.5 h-3.5" />
                <span>✨ AI Review PR</span>
              {/if}
            </button>

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

            {#if selectedPR.state === 'open'}
              <button
                onclick={() => (showMergeModal = true)}
                class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                title="Hợp nhất Pull Request vào nhánh chính"
              >
                <GitMerge class="w-3.5 h-3.5" />
                <span>Merge</span>
              </button>

              <button
                onclick={() => {
                  if (isOwnPR) reviewEvent = 'COMMENT';
                  showReviewModal = true;
                }}
                class="px-3 py-1.5 rounded-lg bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <CheckCircle2 class="w-3.5 h-3.5" />
                <span>Submit Review</span>
              </button>
            {:else}
              <button
                onclick={() => {
                  reviewEvent = 'COMMENT';
                  showReviewModal = true;
                }}
                class="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Gửi bình luận vào PR đã đóng"
              >
                <MessageSquare class="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Thêm bình luận</span>
              </button>
            {/if}

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

        <!-- Tab Selector: Files Changed vs Conversation vs Commits -->
        <div class="px-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/40 dark:bg-zinc-900/20 flex items-center gap-4 text-xs shrink-0">
          <button
            onclick={() => (activeTab = 'files')}
            class="py-2.5 font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'files' ? 'border-violet-500 text-violet-700 dark:text-violet-300 font-semibold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            <FileText class="w-3.5 h-3.5" />
            <span>Files Changed</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {activeTab === 'files' ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}">
              {prFiles.length}
            </span>
          </button>
          <button
            onclick={() => (activeTab = 'conversation')}
            class="py-2.5 font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'conversation' ? 'border-violet-500 text-violet-700 dark:text-violet-300 font-semibold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            <MessageSquare class="w-3.5 h-3.5" />
            <span>Description & Conversation</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {activeTab === 'conversation' ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}">
              {prComments.length}
            </span>
          </button>
          <button
            onclick={() => (activeTab = 'commits')}
            class="py-2.5 font-medium flex items-center gap-2 border-b-2 transition-all cursor-pointer {activeTab === 'commits' ? 'border-violet-500 text-violet-700 dark:text-violet-300 font-semibold' : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}"
          >
            <GitCommit class="w-3.5 h-3.5" />
            <span>Commits</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono {activeTab === 'commits' ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-bold' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}">
              {prCommits.length}
            </span>
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
            <!-- AI Code Review Banner (if generated) -->
            {#if aiReviewResult}
              <div class="p-4 rounded-xl bg-violet-50/80 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 shadow-xs space-y-2.5 animate-in fade-in duration-200">
                <div class="flex items-center justify-between border-b border-violet-200/60 dark:border-violet-800/40 pb-2">
                  <div class="flex items-center gap-2 text-xs font-bold text-violet-900 dark:text-violet-200">
                    <Bot class="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <span>FlowGit AI Reviewer</span>
                  </div>
                  <button
                    type="button"
                    onclick={() => (aiReviewResult = null)}
                    class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
                <MarkdownViewer content={aiReviewResult} />
              </div>
            {/if}

            <!-- Author PR Description Card -->
            <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div class="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800/60 pb-2">
                <div class="flex items-center gap-2">
                  <User class="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  <span class="font-medium text-zinc-900 dark:text-zinc-200">{selectedPR.user.login}</span>
                  <span>đã mở PR này</span>
                </div>
                <span class="text-[11px] text-zinc-400">{formatRelativeTime(selectedPR.created_at)}</span>
              </div>
              <div class="pt-1 select-text">
                <MarkdownViewer content={selectedPR.body || 'Không có mô tả chi tiết.'} />
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
                      <div class="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                        {#if comment.path && comment.line}
                          <span>{comment.path}:{comment.line}</span>
                          <span>•</span>
                        {/if}
                        <span>{formatRelativeTime(comment.created_at)}</span>
                      </div>
                    </div>
                    <div class="pt-1">
                      <MarkdownViewer content={comment.body} />
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- GitHub Merge Pull Request Card -->
            {#if selectedPR.state === 'open'}
              <div class="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-xs space-y-3 mt-4">
                <div class="flex items-start gap-3">
                  <div class="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <Check class="w-4 h-4 stroke-[3]" />
                  </div>
                  <div class="space-y-0.5 flex-1">
                    <div class="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      No conflicts with base branch ({selectedPR.base.ref})
                    </div>
                    <div class="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Merging can be performed automatically on GitHub.
                    </div>
                  </div>
                </div>

                <div class="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onclick={() => (showMergeModal = true)}
                    class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md hover:shadow-emerald-500/20 cursor-pointer active:scale-98"
                  >
                    <GitMerge class="w-4 h-4" />
                    <span>Merge pull request</span>
                  </button>
                  <span class="text-[11px] text-zinc-400">
                    Sẵn sàng hợp nhất {selectedPR.head.ref} vào {selectedPR.base.ref}
                  </span>
                </div>
              </div>
            {:else if selectedPR.merged}
              <div class="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 flex items-center gap-3 mt-4">
                <div class="p-2 rounded-full bg-purple-100 dark:bg-purple-900/70 text-purple-700 dark:text-purple-300">
                  <GitMerge class="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <div class="text-xs font-bold text-purple-900 dark:text-purple-200">
                    Pull Request #{selectedPR.number} đã được Merge thành công
                  </div>
                  <div class="text-[11px] text-purple-700/80 dark:text-purple-400/80">
                    Toàn bộ thay đổi đã được tích hợp vào nhánh {selectedPR.base.ref}.
                  </div>
                </div>
              </div>
            {/if}

            <!-- Quick Comment Box directly at bottom of conversation -->
            <div class="p-4 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-2.5 mt-4">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <MessageSquare class="w-3.5 h-3.5 text-violet-500" />
                  <span>Viết bình luận nhanh</span>
                </span>
                <span class="text-[11px] text-zinc-400 font-mono">Ctrl + Enter để gửi</span>
              </div>
              <textarea
                bind:value={quickCommentText}
                onkeydown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handlePostQuickComment();
                  }
                }}
                rows={3}
                placeholder="Nhập nhận xét hoặc phản hồi của bạn về PR này..."
                class="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 resize-none font-sans"
              ></textarea>
              <div class="flex items-center justify-end">
                <button
                  type="button"
                  onclick={handlePostQuickComment}
                  disabled={isPostingQuickComment || !quickCommentText.trim()}
                  class="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {#if isPostingQuickComment}
                    <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                    <span>Đang gửi...</span>
                  {:else}
                    <Send class="w-3.5 h-3.5" />
                    <span>Gửi bình luận</span>
                  {/if}
                </button>
              </div>
            </div>
          </div>
        {:else if activeTab === 'commits'}
          <div class="flex-1 overflow-y-auto p-6 space-y-3 max-w-3xl">
            {#if prCommits.length === 0}
              <div class="p-8 text-center text-xs text-zinc-400">
                Chưa có dữ liệu commits hoặc PR chưa tải xong.
              </div>
            {:else}
              <div class="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Danh sách Commits ({prCommits.length})
              </div>
              <div class="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
                {#each prCommits as commit}
                  <div class="p-3.5 flex items-start justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-colors">
                    <div class="flex items-start gap-3 min-w-0 flex-1">
                      <div class="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mt-0.5 shrink-0">
                        <GitCommit class="w-4 h-4" />
                      </div>
                      <div class="space-y-1 min-w-0 flex-1">
                        <div class="text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-sans break-words">
                          {commit.commit.message.split('\n')[0]}
                        </div>
                        <div class="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span>{commit.commit.author.name}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(commit.commit.author.date)}</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <a
                        href={commit.html_url}
                        target="_blank"
                        rel="noreferrer"
                        class="px-2 py-0.5 rounded font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1"
                        title="Xem commit trên GitHub"
                      >
                        <span>{commit.sha.slice(0, 7)}</span>
                        <ExternalLink class="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          <!-- Files Changed Split: File List & Diff Viewer -->
          <div class="flex-1 flex overflow-hidden">
            <!-- Modified Files Sidebar (Resizable) -->
            <div
              style="width: {filesSidebarWidth}px;"
              class="border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto bg-zinc-50/60 dark:bg-zinc-950/40 divide-y divide-zinc-200/60 dark:divide-zinc-900/60 shrink-0"
            >
              <div class="p-2.5 bg-zinc-100/60 dark:bg-zinc-900/40 border-b border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>Tệp thay đổi</span>
                <span class="px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {prFiles.length}
                </span>
              </div>

              {#each prFiles as file, idx}
                {@const isSelected = selectedFileIndex === idx}
                {@const badge = getFileStatusBadge(file)}
                {@const parts = file.filename.split('/')}
                {@const basename = parts.pop() || file.filename}
                {@const dirname = parts.join('/')}
                {@const isViewed = isFileViewed(selectedPR.number, file.filename)}
                <div class="flex items-center w-full transition-colors {isSelected ? 'bg-violet-50 dark:bg-violet-950/50 border-l-3 border-violet-600 shadow-xs' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900/40 border-l-3 border-transparent'} {isViewed ? 'opacity-60' : ''}">
                  <button
                    type="button"
                    onclick={() => (selectedFileIndex = idx)}
                    class="p-2.5 text-left text-xs transition-colors cursor-pointer flex items-center justify-between gap-2.5 min-w-0 flex-1"
                    title={file.filename}
                  >
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      <span class="w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 border {badge.bg} {badge.text} {badge.border}">
                        {badge.label}
                      </span>
                      <div class="min-w-0 flex-1 leading-tight">
                        <div class="font-mono text-xs truncate font-medium {isSelected ? 'text-violet-950 dark:text-violet-100 font-semibold' : 'text-zinc-800 dark:text-zinc-200'}">
                          {basename}
                        </div>
                        {#if dirname}
                          <div class="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                            {dirname}/
                          </div>
                        {/if}
                      </div>
                    </div>

                    <div class="flex items-center gap-1 text-[10px] font-mono shrink-0">
                      {#if file.additions > 0}
                        <span class="text-emerald-600 dark:text-emerald-400 font-semibold">+{file.additions}</span>
                      {/if}
                      {#if file.deletions > 0}
                        <span class="text-rose-600 dark:text-rose-400 font-semibold">-{file.deletions}</span>
                      {/if}
                    </div>
                  </button>

                  <!-- Mark as Viewed Checkbox -->
                  <button
                    type="button"
                    onclick={() => { if (selectedPR) toggleFileViewed(selectedPR.number, file.filename); }}
                    class="p-1.5 mr-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer shrink-0 transition-colors"
                    title={isViewed ? 'Bỏ đánh dấu đã xem' : 'Đánh dấu đã xem'}
                  >
                    {#if isViewed}
                      <CheckCircle class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/60" />
                    {:else}
                      <div class="w-3.5 h-3.5 rounded border border-zinc-300 dark:border-zinc-700 hover:border-emerald-500"></div>
                    {/if}
                  </button>
                </div>
              {/each}
            </div>

            <!-- Vertical Splitter between File List & Diff -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <div
              role="separator"
              aria-orientation="vertical"
              onmousedown={handleStartResizeFiles}
              class="w-1.5 hover:w-2 bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-violet-500 active:bg-violet-600 cursor-col-resize transition-all shrink-0 flex items-center justify-center select-none {isResizingFiles ? 'bg-violet-600 w-2' : ''}"
              title="Kéo để thay đổi độ rộng danh sách tệp"
            ></div>

            <!-- Diff Content & Inline Commenting -->
            <div class="flex-1 overflow-y-auto p-4 font-mono text-xs select-text">
              {#if prFiles[selectedFileIndex]}
                {@const activeFile = prFiles[selectedFileIndex]}
                {@const parsedLines = activeFile.patch ? parsePatchLines(activeFile.patch) : []}
                {@const splitRows = activeFile.patch ? parseSplitDiffRows(activeFile.patch) : []}
                {@const activeViewed = isFileViewed(selectedPR.number, activeFile.filename)}
                <div class="mb-3 flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800 gap-3 flex-wrap">
                  <div class="flex items-center gap-2 min-w-0">
                    <FileText class="w-4 h-4 text-violet-500 shrink-0" />
                    <span class="font-bold text-zinc-900 dark:text-zinc-100 font-mono text-xs truncate">{activeFile.filename}</span>
                  </div>

                  <div class="flex items-center gap-2 text-xs shrink-0">
                    <!-- Diff Mode Toggle: Unified vs Split -->
                    <div class="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onclick={() => (diffMode = 'unified')}
                        class="px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer {diffMode === 'unified' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
                      >
                        Unified
                      </button>
                      <button
                        type="button"
                        onclick={() => (diffMode = 'split')}
                        class="px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer {diffMode === 'split' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}"
                      >
                        Split (2 cột)
                      </button>
                    </div>

                    <!-- Mark as Viewed Button -->
                    <button
                      type="button"
                      onclick={() => { if (selectedPR) toggleFileViewed(selectedPR.number, activeFile.filename); }}
                      class="px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer {activeViewed ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-emerald-500'}"
                    >
                      {#if activeViewed}
                        <CheckCircle class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Đã xem tệp</span>
                      {:else}
                        <Eye class="w-3.5 h-3.5" />
                        <span>Đánh dấu đã xem</span>
                      {/if}
                    </button>

                    <span class="px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      +{activeFile.additions} dòng
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-[11px] font-mono bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                      -{activeFile.deletions} dòng
                    </span>
                  </div>
                </div>

                {#if parsedLines.length > 0}
                  {#if diffMode === 'split'}
                    <!-- Split Diff (Side-by-side) View -->
                    <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
                      {#each splitRows as row}
                        {#if row.isHeader}
                          <div class="px-3 py-1.5 bg-zinc-100/90 dark:bg-zinc-900/90 border-y border-zinc-200 dark:border-zinc-800 text-cyan-800 dark:text-cyan-400 text-[11px] font-mono font-medium flex items-center gap-2 select-none">
                            <span class="px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold">Hunk</span>
                            <span>{row.headerContent}</span>
                          </div>
                        {:else}
                          <div class="grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800 border-b border-zinc-100 dark:border-zinc-900/50 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors">
                            <!-- Left Column: Old Lines / Deletions -->
                            <div class="flex items-center text-[11px] font-mono min-h-[1.5rem] {row.left?.type === 'del' ? 'bg-rose-500/10 text-rose-950 dark:text-rose-200' : 'text-zinc-800 dark:text-zinc-300'}">
                              <span class="w-10 px-1.5 py-0.5 text-right text-zinc-400 dark:text-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/40 select-none shrink-0 border-r border-zinc-200/60 dark:border-zinc-800/60 text-[10px]">
                                {row.left?.lineNumber ?? ''}
                              </span>
                              <span class="w-4 text-center font-bold shrink-0 select-none {row.left?.type === 'del' ? 'text-rose-600 dark:text-rose-400' : 'text-transparent'}">
                                {row.left?.type === 'del' ? '-' : ' '}
                              </span>
                              <span class="px-2 py-0.5 whitespace-pre-wrap break-all select-text leading-relaxed flex-1">
                                {row.left?.content ?? ''}
                              </span>
                            </div>

                            <!-- Right Column: New Lines / Additions -->
                            <div class="flex items-center text-[11px] font-mono min-h-[1.5rem] {row.right?.type === 'add' ? 'bg-emerald-500/10 text-emerald-950 dark:text-emerald-200' : 'text-zinc-800 dark:text-zinc-300'}">
                              <span class="w-10 px-1.5 py-0.5 text-right text-zinc-400 dark:text-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/40 select-none shrink-0 border-r border-zinc-200/60 dark:border-zinc-800/60 text-[10px]">
                                {row.right?.lineNumber ?? ''}
                              </span>
                              <span class="w-4 text-center font-bold shrink-0 select-none {row.right?.type === 'add' ? 'text-emerald-600 dark:text-emerald-400' : 'text-transparent'}">
                                {row.right?.type === 'add' ? '+' : ' '}
                              </span>
                              <span class="px-2 py-0.5 whitespace-pre-wrap break-all select-text leading-relaxed flex-1">
                                {row.right?.content ?? ''}
                              </span>
                            </div>
                          </div>
                        {/if}
                      {/each}
                    </div>
                  {:else}
                    <!-- Unified Diff View -->
                    <div class="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
                    {#each parsedLines as line}
                      {@const isAdd = line.type === 'add'}
                      {@const isDel = line.type === 'del'}
                      {@const isHeader = line.type === 'header'}
                      {@const commentTargetLine = line.newLineNumber || line.oldLineNumber || 0}
                      {@const lineComments = commentTargetLine > 0 ? getLineComments(activeFile.filename, commentTargetLine) : []}

                      {#if isHeader}
                        <div class="px-3 py-1.5 bg-zinc-100/90 dark:bg-zinc-900/90 border-y border-zinc-200 dark:border-zinc-800 text-cyan-800 dark:text-cyan-400 text-[11px] font-mono font-medium flex items-center gap-2 select-none">
                          <span class="px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold">Hunk</span>
                          <span>{line.content}</span>
                        </div>
                      {:else}
                        <div class="group flex flex-col {isAdd ? 'bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 border-l-2 border-emerald-500' : isDel ? 'bg-rose-500/10 text-rose-950 dark:text-rose-200 border-l-2 border-rose-500' : 'text-zinc-800 dark:text-zinc-300 border-l-2 border-transparent'} hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70 transition-colors">
                          <div class="flex items-center pr-3">
                            <!-- Dual Line Numbers: Old Line | New Line -->
                            <div class="flex items-center text-[10px] font-mono select-none shrink-0 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
                              <span class="w-10 px-1.5 py-0.5 text-right text-zinc-400 dark:text-zinc-600">
                                {line.oldLineNumber ?? ''}
                              </span>
                              <span class="w-10 px-1.5 py-0.5 text-right text-zinc-400 dark:text-zinc-600 border-l border-zinc-200/60 dark:border-zinc-800/60">
                                {line.newLineNumber ?? ''}
                              </span>
                            </div>

                            <!-- Prefix indicator (+, -, space) -->
                            <span class="w-5 text-center font-mono font-bold select-none shrink-0 {isAdd ? 'text-emerald-600 dark:text-emerald-400' : isDel ? 'text-rose-600 dark:text-rose-400' : 'text-transparent'}">
                              {isAdd ? '+' : isDel ? '-' : ' '}
                            </span>

                            <!-- Code Content -->
                            <span class="px-2 py-0.5 flex-1 whitespace-pre-wrap break-all select-text font-mono leading-relaxed">
                              {line.content}
                            </span>

                            <!-- Inline Comment trigger button -->
                            {#if commentTargetLine > 0}
                              <button
                                onclick={() => {
                                  inlineCommentLine = { file: activeFile.filename, line: commentTargetLine };
                                }}
                                class="opacity-0 group-hover:opacity-100 p-0.5 rounded bg-violet-600 hover:bg-violet-500 text-white transition-opacity cursor-pointer ml-2 shadow-xs"
                                title="Thêm bình luận tại dòng {commentTargetLine}"
                              >
                                <Plus class="w-3 h-3" />
                              </button>
                            {/if}
                          </div>

                          <!-- Existing Inline Comments on this line -->
                          {#if lineComments.length > 0}
                            <div class="ml-24 p-2.5 bg-zinc-50 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
                              {#each lineComments as c}
                                <div class="text-[11px]">
                                  <span class="font-semibold text-cyan-700 dark:text-cyan-300">@{c.user.login}:</span>
                                  <span class="text-zinc-800 dark:text-zinc-200 ml-1">{c.body}</span>
                                </div>
                              {/each}
                            </div>
                          {/if}

                          <!-- Inline Comment Box if active on this line -->
                          {#if inlineCommentLine?.file === activeFile.filename && inlineCommentLine?.line === commentTargetLine}
                            <div class="ml-24 p-3 bg-zinc-50 dark:bg-zinc-900 border-t border-violet-200 dark:border-violet-800/40 space-y-2">
                              <textarea
                                bind:value={inlineCommentText}
                                placeholder="Nhập nhận xét của bạn trên dòng {commentTargetLine}..."
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
                      {/if}
                    {/each}
                  </div>
                {/if}
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
      <div class="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50/50 dark:bg-zinc-950/40 text-center overflow-y-auto">
        {#if prList.length === 0 && !isLoadingPRs}
          <!-- PR Launchpad Empty State (No PRs in Repo) -->
          <div class="max-w-md w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div class="relative mb-5">
              <div class="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500/20 via-cyan-500/15 to-emerald-500/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10 dark:shadow-violet-950/30">
                <GitPullRequest class="w-8 h-8 text-violet-600 dark:text-violet-400" />
              </div>
              <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-white shadow-xs">
                <Sparkles class="w-3 h-3" />
              </div>
            </div>

            <h2 class="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1.5">
              Cloud Code Review Studio
            </h2>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
              {#if repoOwner && repoName}
                Kho lưu trữ <strong class="font-mono text-cyan-600 dark:text-cyan-400">{repoOwner}/{repoName}</strong> hiện chưa có Pull Request nào ở trạng thái <strong class="capitalize">{prFilter}</strong>.
              {:else}
                Kết nối GitHub Remote để xem và thẩm định Pull Request trực tiếp trong FlowGit.
              {/if}
            </p>

            <button
              type="button"
              onclick={() => {
                if (onOpenCreatePR) {
                  onOpenCreatePR();
                } else {
                  showLocalCreatePRModal = true;
                }
              }}
              class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-98 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-cyan-600/20 cursor-pointer transition-all mb-8"
            >
              <Plus class="w-4 h-4" />
              <span>Tạo Pull Request ngay</span>
            </button>

            <!-- Feature Showcase Cards -->
            <div class="w-full grid grid-cols-2 gap-2.5 text-left">
              <div class="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
                <div class="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  <FileText class="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span>Monaco Diff View</span>
                </div>
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                  Soi từng dòng code thay đổi với bộ tô màu cú pháp và highlight chuẩn IDE.
                </p>
              </div>

              <div class="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
                <div class="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  <MessageSquare class="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  <span>Inline Comments</span>
                </div>
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                  Nhận xét trực tiếp tại từng dòng code và thảo luận realtime với đồng đội.
                </p>
              </div>

              <div class="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
                <div class="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  <GitMerge class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>1-Click Merge</span>
                </div>
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                  Hợp nhất nhánh an toàn: Merge Commit, Squash hoặc Rebase kèm dọn dẹp nhánh.
                </p>
              </div>

              <div class="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
                <div class="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                  <Download class="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Checkout Local</span>
                </div>
                <p class="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                  Kéo nhánh PR về máy kiểm thử, chạy build và test độc lập không sợ conflict.
                </p>
              </div>
            </div>
          </div>
        {:else if filteredPRs.length === 0 && searchQuery.trim()}
          <!-- Search No Result -->
          <div class="max-w-sm w-full flex flex-col items-center animate-in fade-in duration-150">
            <div class="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-3">
              <Search class="w-5 h-5" />
            </div>
            <h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Không tìm thấy PR phù hợp
            </h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Không có kết quả nào khớp với từ khóa "<strong class="text-zinc-700 dark:text-zinc-300">{searchQuery}</strong>" trong bộ lọc <span class="capitalize font-mono">{prFilter}</span>.
            </p>
            <button
              type="button"
              onclick={() => { searchQuery = ''; }}
              class="px-3.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              <span>Xóa bộ lọc tìm kiếm</span>
            </button>
          </div>
        {:else}
          <!-- PRs exist, but none selected -->
          <div class="max-w-sm w-full flex flex-col items-center animate-in fade-in duration-150">
            <div class="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/60 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-3">
              <GitPullRequest class="w-6 h-6" />
            </div>
            <h3 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Sẵn sàng Review Pull Request
            </h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Chọn một Pull Request từ danh sách bên trái ({filteredPRs.length} PRs) để xem mã nguồn, lịch sử thảo luận và gửi đánh giá.
            </p>
            {#if filteredPRs.length > 0}
              <button
                type="button"
                onclick={() => selectPR(filteredPRs[0])}
                class="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <span>Xem PR mới nhất (#{filteredPRs[0].number})</span>
                <ArrowRight class="w-3.5 h-3.5" />
              </button>
            {/if}
          </div>
        {/if}
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
        {#if isOwnPR}
          <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs">
            Bạn là tác giả của PR này. Theo quy định GitHub, bạn chỉ có thể gửi <strong>Comment</strong>, không thể tự Approve chính mình.
          </div>
        {/if}

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
            disabled={isOwnPR}
            onclick={() => (reviewEvent = 'APPROVE')}
            title={isOwnPR ? 'Bạn là tác giả PR nên không thể tự Approve' : 'Chấp thuận PR'}
            class="p-2.5 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-1 {isOwnPR ? 'opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800 text-zinc-400' : 'cursor-pointer'} {reviewEvent === 'APPROVE' && !isOwnPR ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}"
          >
            <Check class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Approve</span>
          </button>
          <button
            type="button"
            disabled={isOwnPR}
            onclick={() => (reviewEvent = 'REQUEST_CHANGES')}
            title={isOwnPR ? 'Bạn là tác giả PR nên không thể Request Changes' : 'Yêu cầu sửa đổi'}
            class="p-2.5 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-1 {isOwnPR ? 'opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800 text-zinc-400' : 'cursor-pointer'} {reviewEvent === 'REQUEST_CHANGES' && !isOwnPR ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}"
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

<!-- Create Pull Request Modal -->
<CreatePullRequestModal
  isOpen={showLocalCreatePRModal}
  {remoteOriginUrl}
  branches={localBranches}
  onClose={() => (showLocalCreatePRModal = false)}
  onSuccess={async (newPR) => {
    showLocalCreatePRModal = false;
    await loadPullRequests();
    selectPR(newPR);
  }}
/>

<!-- Merge Pull Request Confirmation Modal -->
{#if showMergeModal && selectedPR}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    onclick={() => (showMergeModal = false)}
  >
    <div
      class="w-full max-w-lg bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-800/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-150"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
            <GitMerge class="w-4 h-4" />
          </div>
          <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Hợp nhất Pull Request #{selectedPR.number}
          </h2>
        </div>
        <button
          onclick={() => (showMergeModal = false)}
          class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-6 space-y-4 text-xs">
        <!-- Merge Method Selector -->
        <div class="space-y-1.5">
          <span class="font-semibold text-zinc-700 dark:text-zinc-300 block">Kiểu Merge:</span>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              onclick={() => (mergeMethod = 'merge')}
              class="p-2.5 rounded-xl border text-left cursor-pointer transition-all {mergeMethod === 'merge' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}"
            >
              <div class="font-semibold">Create Merge</div>
              <div class="text-[10px] opacity-75 font-normal">Giữ nguyên lịch sử</div>
            </button>
            <button
              type="button"
              onclick={() => (mergeMethod = 'squash')}
              class="p-2.5 rounded-xl border text-left cursor-pointer transition-all {mergeMethod === 'squash' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}"
            >
              <div class="font-semibold">Squash & Merge</div>
              <div class="text-[10px] opacity-75 font-normal">Gộp 1 commit</div>
            </button>
            <button
              type="button"
              onclick={() => (mergeMethod = 'rebase')}
              class="p-2.5 rounded-xl border text-left cursor-pointer transition-all {mergeMethod === 'rebase' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold' : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}"
            >
              <div class="font-semibold">Rebase & Merge</div>
              <div class="text-[10px] opacity-75 font-normal">Rebase nhánh</div>
            </button>
          </div>
        </div>

        <!-- Commit Title & Message -->
        <div class="space-y-1.5">
          <label for="merge-commit-title" class="font-semibold text-zinc-700 dark:text-zinc-300 block">
            Tiêu đề Commit Merge:
          </label>
          <input
            id="merge-commit-title"
            type="text"
            bind:value={mergeCommitTitle}
            class="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
          />
        </div>

        <div class="space-y-1.5">
          <label for="merge-commit-msg" class="font-semibold text-zinc-700 dark:text-zinc-300 block">
            Nội dung Commit Message:
          </label>
          <textarea
            id="merge-commit-msg"
            bind:value={mergeCommitMessage}
            rows="3"
            class="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden resize-none"
          ></textarea>
        </div>

        <!-- Delete Branch Checkbox -->
        <label class="flex items-center gap-2.5 cursor-pointer pt-1 select-none">
          <input
            type="checkbox"
            bind:checked={deleteBranchAfterMerge}
            class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <span class="text-zinc-700 dark:text-zinc-300">
            Tự động xóa nhánh remote <code class="text-emerald-700 dark:text-emerald-400 font-mono">{selectedPR.head.ref}</code> sau khi merge
          </span>
        </label>
      </div>

      <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onclick={() => (showMergeModal = false)}
          class="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="button"
          onclick={handleConfirmMerge}
          disabled={isMerging}
          class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 shadow-md hover:shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
        >
          {#if isMerging}
            <RefreshCw class="w-3.5 h-3.5 animate-spin" />
            <span>Đang merge...</span>
          {:else}
            <GitMerge class="w-3.5 h-3.5" />
            <span>Xác nhận Merge</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}


