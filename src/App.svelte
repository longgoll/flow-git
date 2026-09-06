<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Toolbar from "./lib/components/Toolbar.svelte";
  import Sidebar from "./lib/components/Sidebar.svelte";
  import CommitGraph from "./lib/components/CommitGraph.svelte";
  import CommitDetail from "./lib/components/CommitDetail.svelte";
  import WorkingTree from "./lib/components/WorkingTree.svelte";
  import ComparisonViewer from "./lib/components/ComparisonViewer.svelte";
  import ConflictResolver from "./lib/components/ConflictResolver.svelte";
  import ThreeColumnLayout from "./lib/components/ThreeColumnLayout.svelte";
  import FocusView from "./lib/components/FocusView.svelte";
  import StackedCommitsFlow from "./lib/components/StackedCommitsFlow.svelte";
  import DagCanvasMap from "./lib/components/DagCanvasMap.svelte";
  import RepositoryExplorer from "./lib/components/RepositoryExplorer.svelte";
  import StatusBar from "./lib/components/StatusBar.svelte";
  import ModalsContainer from "./lib/components/ModalsContainer.svelte";
  import CreateBranchModal from "./lib/components/CreateBranchModal.svelte";
  import QuickHotfixModal from "./lib/components/QuickHotfixModal.svelte";
  import PullRequestReviewer from "./lib/components/PullRequestReviewer.svelte";
  import CreatePullRequestModal from "./lib/components/CreatePullRequestModal.svelte";
  import NukeHistoryModal from "./lib/components/NukeHistoryModal.svelte";
  import RemoteManagerModal from "./lib/components/RemoteManagerModal.svelte";
  import InteractiveRebaseModal from "./lib/components/InteractiveRebaseModal.svelte";
  import IdentitySwitcherModal from "./lib/components/IdentitySwitcherModal.svelte";
  import GitPlaybookModal from "./lib/components/GitPlaybookModal.svelte";
  import RepoAlertBanner from "./lib/components/RepoAlertBanner.svelte";
  import RecentPushBanner from "./lib/components/RecentPushBanner.svelte";
  import ToastContainer from "./lib/components/ToastContainer.svelte";
  import { toast } from "./lib/state/toastState.svelte";
  import { RepoState } from "./lib/state/repoState.svelte";
  import { WorkingTreeState } from "./lib/state/workingTreeState.svelte";
  import { RemoteState } from "./lib/state/remoteState.svelte";
  import { GitSafetyState } from "./lib/state/gitSafetyState.svelte";
  import { abortCurrentOperation, skipRebaseStep } from "./lib/api/action";
  import { getRemotes, fetchRemote } from "./lib/api/remote";
  import { getCurrentRepoIdentity } from "./lib/api/identity";
  import { addToGitignore, generateStandardGitignore } from "./lib/api/ignore";
  import type {
    BranchInfo,
    CommitNode,
    ComparisonResult,
    ConflictSimulationResult,
    CurrentRepoIdentity,
    LayoutMode,
    RemoteInfo,
    RepoOperationState,
    ViewMode,
  } from "./lib/types";
  import {
    compareTwoCommits,
    continueRebase,
    createBranch,
    checkoutBranch,
    createTag,
    createWorktree,
    deleteBranch,
    deleteMergedBranches,
    deleteTag,
    deleteWorktree,
    executeCherryPick,
    executeMerge,
    executeRebase,
    getMergedBranches,
    getRemoteUrl,
    listenRepoStatus,
    listWorktrees,
    nukeFileFromHistory,
    renameBranch,
    resetToCommit,
    revertCommit,
    squashCommits,
    stashPop,
    stashSave,
  } from "./lib/api";
  import { Info } from "lucide-svelte";

  // Instantiate Svelte 5 Rune State Stores
  const repo = new RepoState();
  const wt = new WorkingTreeState();
  const remote = new RemoteState();
  const safety = new GitSafetyState();

  // Panels Visibility & Layout state
  let isSidebarOpen = $state<boolean>(true);
  let viewMode = $state<ViewMode>("graph");
  let layoutMode = $state<LayoutMode>("horizontal");
  let showGuideModal = $state<boolean>(false);

  // Commit Detail Resizable Splitter state
  let detailPanelHeight = $state<number>(280);
  let isResizingDetail = $state<boolean>(false);
  let resizeStartY = 0;
  let resizeStartHeight = 0;

  function handleStartResizeDetail(e: MouseEvent) {
    isResizingDetail = true;
    resizeStartY = e.clientY;
    resizeStartHeight = detailPanelHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingDetail) return;
      const deltaY = resizeStartY - moveEvent.clientY; // Kéo lên trên thì tăng chiều cao
      const newH = Math.max(140, Math.min(window.innerHeight * 0.75, resizeStartHeight + deltaY));
      detailPanelHeight = newH;
    };

    const onMouseUp = () => {
      isResizingDetail = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  // Phase 3: Drag & Drop DropActionModal state
  let showDropActionModal = $state<boolean>(false);
  let dropSourceCommit = $state<CommitNode | null>(null);
  let dropTargetCommit = $state<CommitNode | null>(null);
  let dropSimulation = $state<ConflictSimulationResult | null>(null);
  let dropModalPosition = $state<{ x: number; y: number }>({ x: 0, y: 0 });

  // Phase 3: Worktree Manager state
  let showWorktreeModal = $state<boolean>(false);
  let isWorktreeLoading = $state<boolean>(false);

  // Phase 3: Offline PR Comparison state
  let comparisonResult = $state<ComparisonResult | null>(null);
  let isComparisonLoading = $state<boolean>(false);

  // Files Explorer state
  let explorerInitialFilePath = $state<string | null>(null);

  // Dialog for manual repo path entry
  let showOpenDialog = $state<boolean>(false);
  let inputRepoPath = $state<string>("f:/Dev/product/git-tool");

  // Safe Delete Branch state
  let showDeleteBranchModal = $state<boolean>(false);
  let deletingBranch = $state<BranchInfo | null>(null);
  let isDeleteBranchLoading = $state<boolean>(false);

  // Create Branch state
  let showCreateBranchModal = $state<boolean>(false);
  let createBranchBaseRef = $state<string>("");

  // Modals state
  let showCommandPalette = $state<boolean>(false);
  let showAIModal = $state<boolean>(false);
  let aiDiffContext = $state<string>("");
  let showSubmoduleModal = $state<boolean>(false);
  let showLfsModal = $state<boolean>(false);
  let showRemoteManagerModal = $state<boolean>(false);
  let showPlaybookModal = $state<boolean>(false);
  let remotes = $state<RemoteInfo[]>([]);

  // Tag Modal state
  let showCreateTagModal = $state<boolean>(false);
  let tagTargetCommit = $state<CommitNode | null>(null);
  let isCreateTagLoading = $state<boolean>(false);

  // Squash Modal state
  let showSquashModal = $state<boolean>(false);
  let squashTargetCommits = $state<CommitNode[]>([]);
  let isSquashLoading = $state<boolean>(false);

  // Clean Merged Branches state
  let showCleanMergedModal = $state<boolean>(false);
  let mergedBranches = $state<string[]>([]);
  let isCleanMergedLoading = $state<boolean>(false);

  // Quick Hotfix state
  let showQuickHotfixModal = $state<boolean>(false);
  let activeHotfixBranch = $state<string | null>(null);
  let hotfixStashed = $state<boolean>(false);

  // Nuke File from History state
  let showNukeModal = $state<boolean>(false);
  let nukeTargetFilePath = $state<string>("");

  // Remote origin URL for Cloud Review PR
  let originRemoteUrl = $state<string | null>(null);

  // Interactive Rebase state
  let showInteractiveRebaseModal = $state<boolean>(false);
  let interactiveRebaseOntoCommit = $state<CommitNode | null>(null);

  // Identity Switcher state
  let showIdentityModal = $state<boolean>(false);
  let currentIdentity = $state<CurrentRepoIdentity | null>(null);

  // Publish to GitHub state
  let showPublishModal = $state<boolean>(false);

  // Create Pull Request state
  let showCreatePRModal = $state<boolean>(false);
  let createPRSourceBranch = $state<string>("");
  let recentPushedBranch = $state<string | null>(null);

  function handleOpenCreatePR(sourceBranch?: string) {
    createPRSourceBranch = sourceBranch || repo.repoSummary?.current_branch || "";
    showCreatePRModal = true;
  }

  let unlistenWatcher: (() => void) | null = null;

  async function loadRemotesList(path: string) {
    if (!path) return;
    try {
      remotes = await getRemotes(path);
    } catch (e) {
      console.error("Failed to load remotes:", e);
    }
  }

  async function loadIdentity(path: string) {
    if (!path) return;
    try {
      currentIdentity = await getCurrentRepoIdentity(path);
    } catch (e) {
      console.error("Failed to load repo identity:", e);
    }
  }

  function handleOpenInteractiveRebase(commit: CommitNode) {
    interactiveRebaseOntoCommit = commit;
    showInteractiveRebaseModal = true;
  }

  async function handleFetchSpecificRemote(name: string) {
    if (!repo.currentRepoPath) return;
    repo.statusMessage = `Đang fetch remote '${name}'...`;
    try {
      const msg = await fetchRemote(repo.currentRepoPath, name);
      toast.success(`Fetch '${name}' thành công`, msg);
      repo.statusMessage = `Fetch ${name} hoàn tất.`;
      await loadRepository(repo.currentRepoPath);
      await loadRemotesList(repo.currentRepoPath);
    } catch (e: any) {
      toast.error(`Fetch '${name}' thất bại`, e?.message || e);
    }
  }

  async function refreshWorkingTreeAndDiff() {
    await repo.refreshWorkingTreeOnly(async (wtStatus) => {
      wt.workingTreeStatus = wtStatus;
      if (wt.selectedFilePath) {
        await wt.loadFileDiff(
          repo.currentRepoPath,
          wt.selectedFilePath,
          wt.selectedFileIsStaged,
        );
      }
    });
  }

  let showInitRepoModal = $state(false);
  let initRepoPath = $state('');

  async function loadRepository(path: string) {
    try {
      originRemoteUrl = await getRemoteUrl(path).catch(() => null);
      await loadRemotesList(path);
      await loadIdentity(path);
      await repo.loadRepo(path, (wtStatus) => {
        wt.workingTreeStatus = wtStatus;
        // Auto select first file if available
        if (wtStatus.staged.length > 0) {
          wt.selectFile(path, wtStatus.staged[0], true);
        } else if (wtStatus.unstaged.length > 0) {
          wt.selectFile(path, wtStatus.unstaged[0], false);
        } else if (wtStatus.untracked.length > 0) {
          wt.selectFile(path, wtStatus.untracked[0], false);
        }
      });
      repo.showWelcomeScreen = false;
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (
        msg.includes('could not find repository') ||
        msg.includes('InvalidRepo') ||
        msg.includes('Failed to open repository')
      ) {
        initRepoPath = path;
        showInitRepoModal = true;
      } else {
        toast.error('Lỗi mở repository', msg);
      }
      throw err;
    }
  }

  async function handleConfirmInitRepo(defaultBranch: string) {
    if (!initRepoPath) return;
    const targetPath = initRepoPath;
    try {
      await repo.initRepo(targetPath, defaultBranch, (wtStatus) => {
        wt.workingTreeStatus = wtStatus;
        if (wtStatus.untracked.length > 0) {
          wt.selectFile(targetPath, wtStatus.untracked[0], false);
        }
      });
      originRemoteUrl = await getRemoteUrl(targetPath).catch(() => null);
      await loadRemotesList(targetPath);
      await loadIdentity(targetPath);
      showInitRepoModal = false;
      initRepoPath = '';
      repo.showWelcomeScreen = false;
      toast.success(
        'Khởi tạo Git thành công',
        `Đã tạo kho Git mới với nhánh ${defaultBranch || 'main'}`
      );
    } catch (err: any) {
      toast.error('Khởi tạo thất bại', err?.message || String(err));
      throw err;
    }
  }

  onMount(async () => {
    try {
      unlistenWatcher = await listenRepoStatus(async (_path) => {
        if (repo.currentRepoPath) {
          await refreshWorkingTreeAndDiff();
        }
      });

      repo.initRecentRepos();
      await remote.initAccount();

      const repoToOpen = repo.recentRepos[0] || "f:/Dev/product/git-tool";
      try {
        await loadRepository(repoToOpen);
      } catch {
        repo.showWelcomeScreen = true;
      }
    } catch (e) {
      console.error("onMount failed gracefully:", e);
      repo.showWelcomeScreen = true;
    }

    window.addEventListener("keydown", handleGlobalKeydown);
  });

  onDestroy(() => {
    if (unlistenWatcher) unlistenWatcher();
    window.removeEventListener("keydown", handleGlobalKeydown);
  });

  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      showCommandPalette = !showCommandPalette;
    } else if (e.key === "F1" || ((e.ctrlKey || e.metaKey) && e.key === "/")) {
      e.preventDefault();
      showGuideModal = !showGuideModal;
    } else if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
      e.preventDefault();
      isSidebarOpen = !isSidebarOpen;
    } else if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "z" || e.key === "Z") &&
      !e.shiftKey &&
      !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)
    ) {
      e.preventDefault();
      handleUndo();
    } else if (
      ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) ||
      ((e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "z" || e.key === "Z"))
    ) {
      if (!["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        handleRedo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === "1") {
      e.preventDefault();
      viewMode = "graph";
    } else if ((e.ctrlKey || e.metaKey) && e.key === "2") {
      e.preventDefault();
      viewMode = "changes";
    } else if (
      e.key === " " &&
      !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)
    ) {
      if (viewMode === "changes" && wt.selectedFilePath) {
        e.preventDefault();
        if (wt.selectedFileIsStaged) {
          wt.unstageFile(
            repo.currentRepoPath,
            wt.selectedFilePath,
            refreshWorkingTreeAndDiff,
          );
        } else {
          wt.stageFile(
            repo.currentRepoPath,
            wt.selectedFilePath,
            refreshWorkingTreeAndDiff,
          );
        }
      }
    }
  }

  // Drag & Drop
  function handleOpenDropAction(
    source: CommitNode,
    target: CommitNode,
    sim: ConflictSimulationResult | null,
    pos: { x: number; y: number },
  ) {
    dropSourceCommit = source;
    dropTargetCommit = target;
    dropSimulation = sim;
    dropModalPosition = pos;
    showDropActionModal = true;
  }

  async function handleCherryPickDrop(source: CommitNode) {
    if (!repo.currentRepoPath) return;
    showDropActionModal = false;
    repo.statusMessage = `Cherry-picking commit ${source.short_id}...`;
    try {
      const newSha = await executeCherryPick(repo.currentRepoPath, source.id);
      repo.statusMessage = `Cherry-pick succeeded: ${newSha.slice(0, 7)}`;
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.statusMessage = `Cherry-pick failed: ${e?.message || e}`;
    }
  }

  async function handleMergeDrop(source: CommitNode) {
    if (!repo.currentRepoPath) return;
    showDropActionModal = false;
    repo.statusMessage = `Merging commit ${source.short_id} into HEAD...`;
    try {
      const newSha = await executeMerge(repo.currentRepoPath, source.id);
      repo.statusMessage = `Merge succeeded: ${newSha.slice(0, 7)}`;
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.statusMessage = `Merge failed: ${e?.message || e}`;
    }
  }

  async function handleRebaseDrop(_source: CommitNode, target: CommitNode) {
    if (!repo.currentRepoPath) return;
    showDropActionModal = false;
    const targetRef = target.refs?.[0]?.shorthand || target.id;
    repo.statusMessage = `Rebasing onto ${targetRef}...`;
    try {
      const res = await executeRebase(repo.currentRepoPath, targetRef);
      if (res.status === "completed") {
        toast.success(res.message);
        repo.statusMessage = res.message;
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === "conflict") {
        toast.warning(res.message);
        repo.statusMessage = res.message;
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        viewMode = "conflict";
      }
    } catch (e: any) {
      toast.error(`Rebase thất bại: ${e?.message || e}`);
      repo.statusMessage = `Rebase failed: ${e?.message || e}`;
    }
  }

  async function handleRebaseBranch(branch: BranchInfo) {
    if (!repo.currentRepoPath) return;
    repo.statusMessage = `Rebasing HEAD onto ${branch.shorthand}...`;
    try {
      const res = await executeRebase(repo.currentRepoPath, branch.shorthand);
      if (res.status === "completed") {
        toast.success(res.message);
        repo.statusMessage = res.message;
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === "conflict") {
        toast.warning(res.message);
        repo.statusMessage = res.message;
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        viewMode = "conflict";
      }
    } catch (e: any) {
      toast.error(`Rebase thất bại: ${e?.message || e}`);
      repo.statusMessage = `Rebase failed: ${e?.message || e}`;
    }
  }

  // Worktree Handlers
  async function handleOpenWorktreesModal() {
    if (!repo.currentRepoPath) return;
    showWorktreeModal = true;
    isWorktreeLoading = true;
    try {
      repo.worktrees = await listWorktrees(repo.currentRepoPath);
    } finally {
      isWorktreeLoading = false;
    }
  }

  async function handleCreateWorktree(
    name: string,
    targetPath: string,
    branchName?: string,
  ) {
    if (!repo.currentRepoPath) return;
    await createWorktree(repo.currentRepoPath, name, targetPath, branchName);
    repo.worktrees = await listWorktrees(repo.currentRepoPath);
    repo.statusMessage = `Created worktree '${name}' successfully.`;
  }

  async function handleDeleteWorktree(name: string) {
    if (!repo.currentRepoPath) return;
    await deleteWorktree(repo.currentRepoPath, name);
    repo.worktrees = await listWorktrees(repo.currentRepoPath);
    repo.statusMessage = `Removed worktree '${name}'.`;
  }

  // Branch Creation
  function handleOpenCreateBranch(baseRef?: string) {
    createBranchBaseRef = baseRef || "";
    showCreateBranchModal = true;
  }

  async function handleConfirmCreateBranch(
    newName: string,
    fromRef: string,
    checkout: boolean,
  ) {
    if (!repo.currentRepoPath) return;
    try {
      await createBranch(repo.currentRepoPath, newName, fromRef, checkout);
      repo.statusMessage = `✓ Tạo nhánh '${newName}' từ '${fromRef}' thành công${checkout ? " và đã checkout" : ""}.`;
      showCreateBranchModal = false;
      createBranchBaseRef = "";
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.statusMessage = `Lỗi tạo nhánh: ${e?.message || e}`;
    }
  }

  let isOperatingAlert = $state<boolean>(false);
  let repoOpState = $derived<RepoOperationState>(
    wt.workingTreeStatus?.operation_state ?? { type: "Normal" },
  );

  async function handleContinueRebaseAlert() {
    if (!repo.currentRepoPath) return;
    isOperatingAlert = true;
    try {
      const res = await continueRebase(repo.currentRepoPath);
      if (res.status === "completed") {
        toast.success(res.message);
        repo.statusMessage = res.message;
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === "conflict") {
        toast.warning(res.message);
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        viewMode = "conflict";
      }
    } catch (err: any) {
      toast.error(`Tiếp tục rebase thất bại: ${err?.message || err}`);
    } finally {
      isOperatingAlert = false;
    }
  }

  async function handleSkipRebaseAlert() {
    if (!repo.currentRepoPath) return;
    isOperatingAlert = true;
    try {
      const res = await skipRebaseStep(repo.currentRepoPath);
      if (res.status === "completed") {
        toast.success(res.message);
        repo.statusMessage = res.message;
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === "conflict") {
        toast.warning(res.message);
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        viewMode = "conflict";
      }
    } catch (err: any) {
      toast.error(`Bỏ qua commit thất bại: ${err?.message || err}`);
    } finally {
      isOperatingAlert = false;
    }
  }

  async function handleAbortCurrentOperationAlert() {
    if (!repo.currentRepoPath) return;
    isOperatingAlert = true;
    try {
      const msg = await abortCurrentOperation(repo.currentRepoPath);
      toast.info(msg);
      repo.statusMessage = msg;
      safety.isRebasing = false;
      await loadRepository(repo.currentRepoPath);
    } catch (err: any) {
      toast.error(`Hủy thao tác thất bại: ${err?.message || err}`);
    } finally {
      isOperatingAlert = false;
    }
  }

  function handleCreateBranchFromDetached() {
    createBranchBaseRef = repo.repoSummary?.head_commit_id || "";
    showCreateBranchModal = true;
  }

  // Branch Remote Operations (Push / Publish)
  async function handlePublishBranch(branch: BranchInfo) {
    if (!repo.currentRepoPath) return;
    repo.statusMessage = `Đang publish nhánh '${branch.shorthand}' lên remote origin...`;
    const res = await remote.publishBranch(
      repo.currentRepoPath,
      branch.shorthand,
      "origin",
      () => loadRepository(repo.currentRepoPath),
    );
    repo.statusMessage = res.message;
    if (res.success && branch.shorthand !== "main" && branch.shorthand !== "master") {
      recentPushedBranch = branch.shorthand;
      toast.success(
        `Đã publish nhánh '${branch.shorthand}'`,
        `Bạn có muốn tạo Pull Request cho nhánh này không?`,
        {
          label: "Tạo Pull Request",
          onClick: () => handleOpenCreatePR(branch.shorthand),
        },
        8000,
      );
    }
  }

  async function handlePushBranch(branch: BranchInfo, force = false) {
    if (!repo.currentRepoPath) return;
    repo.statusMessage = `Đang push nhánh '${branch.shorthand}'...`;
    const res = await remote.pushBranch(
      repo.currentRepoPath,
      branch.shorthand,
      "origin",
      force,
      !branch.upstream_name,
      () => loadRepository(repo.currentRepoPath),
    );
    repo.statusMessage = res.message;
    if (res.success && branch.shorthand !== "main" && branch.shorthand !== "master") {
      recentPushedBranch = branch.shorthand;
      toast.success(
        `Đã push nhánh '${branch.shorthand}'`,
        `Bạn có muốn tạo Pull Request vào nhánh chính không?`,
        {
          label: "Tạo Pull Request",
          onClick: () => handleOpenCreatePR(branch.shorthand),
        },
        8000,
      );
    }
  }

  async function handlePushCurrentBranch() {
    if (!repo.currentRepoPath) return;
    const current = repo.branches.find((b) => b.is_head);
    if (current && !current.upstream_name) {
      await handlePublishBranch(current);
    } else if (current) {
      await handlePushBranch(current, false);
    } else {
      repo.statusMessage = `Đang push lên remote...`;
      const res = await remote.executeRemote(
        repo.currentRepoPath,
        "push",
        "origin",
        undefined,
        false,
        false,
        () => loadRepository(repo.currentRepoPath),
      );
      repo.statusMessage = res.message;
    }
  }

  // Branch Checkout (switch existing branch)
  async function handleCheckoutBranch(branch: BranchInfo) {
    if (!repo.currentRepoPath || branch.is_head) return;
    try {
      repo.statusMessage = `Checking out '${branch.shorthand}'...`;
      await checkoutBranch(repo.currentRepoPath, branch.shorthand);
      repo.statusMessage = `✓ Đã chuyển sang nhánh '${branch.shorthand}'.`;
      toast.info("Đã chuyển nhánh", `Hiện đang ở nhánh '${branch.shorthand}'.`);
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.statusMessage = `Lỗi checkout: ${e?.message || e}`;
      toast.error("Lỗi chuyển nhánh", e?.message || String(e));
    }
  }

  // Branch Rename
  async function handleRenameBranch(branch: BranchInfo, newName: string) {
    if (!repo.currentRepoPath) return;
    try {
      await renameBranch(repo.currentRepoPath, branch.shorthand, newName);
      toast.success(
        "Đổi tên nhánh thành công",
        `Nhánh '${branch.shorthand}' đã được đổi thành '${newName}'.`,
      );
      repo.statusMessage = `Đổi tên nhánh '${branch.shorthand}' -> '${newName}'`;
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      toast.error("Lỗi đổi tên nhánh", e?.message || String(e));
    }
  }

  // Branch Deletion
  function handleDeleteBranch(branch: BranchInfo) {
    if (!repo.currentRepoPath) return;
    deletingBranch = branch;
    showDeleteBranchModal = true;
  }

  async function handleConfirmDeleteBranch(
    branch: BranchInfo,
    deleteOnRemoteServer = false,
  ) {
    if (!repo.currentRepoPath) return;
    isDeleteBranchLoading = true;
    try {
      if (branch.is_remote && deleteOnRemoteServer) {
        const remoteParts = branch.shorthand.split("/");
        const remoteName = remoteParts[0] || "origin";
        const remoteBranchName = remoteParts.slice(1).join("/");
        await remote.executeRemote(
          repo.currentRepoPath,
          "push",
          remoteName,
          `:${remoteBranchName}`,
          false,
        );
      } else {
        await deleteBranch(
          repo.currentRepoPath,
          branch.shorthand,
          branch.is_remote,
        );
      }
      repo.statusMessage = `Đã xóa nhánh ${branch.shorthand} thành công`;
      toast.success(
        "Đã xóa nhánh",
        `Nhánh '${branch.shorthand}' đã được xóa an toàn.`,
      );
      showDeleteBranchModal = false;
      deletingBranch = null;
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.statusMessage = `Lỗi xóa nhánh: ${e?.message || e}`;
      toast.error("Lỗi xóa nhánh", e?.message || String(e));
    } finally {
      isDeleteBranchLoading = false;
    }
  }

  // Compare Commits
  async function handleCompareCommits(c1: CommitNode, c2: CommitNode) {
    if (!repo.currentRepoPath) return;
    repo.selectedCommitIds = [c1.id, c2.id];
    viewMode = "compare";
    isComparisonLoading = true;
    repo.statusMessage = `Comparing ${c1.short_id} .. ${c2.short_id}...`;
    try {
      comparisonResult = await compareTwoCommits(
        repo.currentRepoPath,
        c1.id,
        c2.id,
      );
      repo.statusMessage = `Comparison ready: ${comparisonResult.files_changed.length} files changed`;
    } catch (e: any) {
      repo.statusMessage = `Comparison failed: ${e?.message || e}`;
    } finally {
      isComparisonLoading = false;
    }
  }

  // Undo / Redo
  async function handleUndo() {
    repo.statusMessage = "Time Machine: Undoing last action...";
    try {
      const record = await safety.undo(repo.currentRepoPath, () =>
        loadRepository(repo.currentRepoPath),
      );
      if (record) {
        repo.statusMessage = `Time Machine: Undid ${record.description}`;
        toast.info(
          "Đã hoàn tác (Time Machine)",
          `Đã hoàn tác: ${record.description}`,
          {
            label: "Làm lại (Redo)",
            onClick: () => handleRedo(),
          },
        );
      }
    } catch (e: any) {
      repo.statusMessage = `Undo failed: ${e?.message || e}`;
      toast.warning("Không thể hoàn tác", e?.message || String(e));
    }
  }

  async function handleRedo() {
    repo.statusMessage = "Time Machine: Redoing action...";
    try {
      const record = await safety.redo(repo.currentRepoPath, () =>
        loadRepository(repo.currentRepoPath),
      );
      if (record) {
        repo.statusMessage = `Time Machine: Redid ${record.description}`;
        toast.info(
          "Đã làm lại (Time Machine)",
          `Đã khôi phục: ${record.description}`,
        );
      }
    } catch (e: any) {
      repo.statusMessage = `Redo failed: ${e?.message || e}`;
      toast.warning("Không thể làm lại", e?.message || String(e));
    }
  }

  // AI Assistant Context
  function handleOpenAI() {
    if (wt.fileDiffDetail) {
      aiDiffContext = wt.fileDiffDetail.hunks
        .map((h) => h.header + "\n" + h.lines.map((l) => l.content).join("\n"))
        .join("\n");
    } else {
      aiDiffContext = "Changes across staged files";
    }
    showAIModal = true;
  }

  // --- COMMIT CONTEXT ACTIONS ---
  function handleOpenCreateBranchFromCommit(commit: CommitNode) {
    createBranchBaseRef = commit.id;
    showCreateBranchModal = true;
  }

  function handleOpenCreateTag(commit: CommitNode) {
    tagTargetCommit = commit;
    showCreateTagModal = true;
  }

  async function handleConfirmCreateTag(tagName: string, message?: string) {
    if (!tagTargetCommit) return;
    isCreateTagLoading = true;
    try {
      await createTag(
        repo.currentRepoPath,
        tagName,
        tagTargetCommit.id,
        message,
      );
      toast.success(
        "Đã tạo Tag",
        `Tag ${tagName} đã được tạo tại ${tagTargetCommit.short_id}`,
      );
      showCreateTagModal = false;
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      toast.warning("Lỗi tạo Tag", e?.message || String(e));
    } finally {
      isCreateTagLoading = false;
    }
  }

  async function handleDeleteTag(tagName: string) {
    try {
      await deleteTag(repo.currentRepoPath, tagName);
      toast.info("Đã xóa Tag", `Đã xóa tag ${tagName}`);
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      toast.warning("Lỗi xóa Tag", e?.message || String(e));
    }
  }

  async function handleRevertCommit(commit: CommitNode) {
    repo.statusMessage = `Reverting commit ${commit.short_id}...`;
    try {
      const newSha = await revertCommit(repo.currentRepoPath, commit.id);
      toast.success(
        "Revert thành công",
        `Đã tạo commit đảo ngược: ${newSha.slice(0, 7)}`,
      );
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      repo.statusMessage = `Revert failed: ${e?.message || e}`;
      toast.warning("Lỗi Revert commit", e?.message || String(e));
    }
  }

  async function handleResetToCommit(
    commit: CommitNode,
    mode: "soft" | "mixed" | "hard",
  ) {
    repo.statusMessage = `Resetting (${mode}) to ${commit.short_id}...`;
    try {
      await resetToCommit(repo.currentRepoPath, commit.id, mode);
      toast.info(
        "Reset hoàn tất",
        `HEAD đã đưa về ${commit.short_id} (${mode})`,
      );
      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();
    } catch (e: any) {
      repo.statusMessage = `Reset failed: ${e?.message || e}`;
      toast.warning("Lỗi Reset commit", e?.message || String(e));
    }
  }

  // --- SQUASH COMMITS ---
  function handleOpenSquash(commits: CommitNode[]) {
    squashTargetCommits = commits;
    showSquashModal = true;
  }

  async function handleConfirmSquash(commitIds: string[], message: string) {
    isSquashLoading = true;
    try {
      const newSha = await squashCommits(
        repo.currentRepoPath,
        commitIds,
        message,
      );
      toast.success(
        "Squash thành công",
        `Đã gộp ${commitIds.length} commit thành ${newSha.slice(0, 7)}`,
      );
      showSquashModal = false;
      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();
    } catch (e: any) {
      toast.warning("Lỗi Squash commit", e?.message || String(e));
    } finally {
      isSquashLoading = false;
    }
  }

  // --- CLEAN MERGED BRANCHES ---
  async function handleOpenCleanMerged() {
    isCleanMergedLoading = true;
    showCleanMergedModal = true;
    try {
      mergedBranches = await getMergedBranches(repo.currentRepoPath);
    } catch (e: any) {
      toast.warning("Lỗi kiểm tra nhánh merged", e?.message || String(e));
    } finally {
      isCleanMergedLoading = false;
    }
  }

  async function handleConfirmCleanMerged(branchesToDelete: string[]) {
    isCleanMergedLoading = true;
    try {
      const deletedCount = await deleteMergedBranches(
        repo.currentRepoPath,
        branchesToDelete,
      );
      toast.success(
        "Dọn dẹp hoàn tất",
        `Đã xóa ${deletedCount} nhánh đã merge.`,
      );
      showCleanMergedModal = false;
      await loadRepository(repo.currentRepoPath);
    } catch (e: any) {
      toast.warning("Lỗi dọn dẹp nhánh", e?.message || String(e));
    } finally {
      isCleanMergedLoading = false;
    }
  }

  // --- QUICK HOTFIX (SMART STASH & SWITCH) ---
  async function handleStartQuickHotfix(
    hotfixBranchName: string,
    baseBranch: string,
  ) {
    if (!repo.currentRepoPath) return;
    try {
      if (wt.workingTreeStatus && wt.workingTreeStatus.total_dirty_count > 0) {
        await stashSave(
          repo.currentRepoPath,
          `Auto-stash trước hotfix: ${hotfixBranchName} (${new Date().toLocaleTimeString()})`,
          true,
        );
        hotfixStashed = true;
      } else {
        hotfixStashed = false;
      }

      await createBranch(repo.currentRepoPath, hotfixBranchName, baseBranch);
      await checkoutBranch(repo.currentRepoPath, hotfixBranchName);
      activeHotfixBranch = hotfixBranchName;

      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();

      toast.success(
        `Bắt đầu Quick Hotfix: ${hotfixBranchName}`,
        hotfixStashed
          ? 'Toàn bộ code dở dang đã được gom vào Stash an toàn. Khi fix xong, bấm "Khôi phục code dở" trên Toolbar.'
          : "Working tree sạch sẽ. Đã chuyển sang nhánh hotfix.",
        hotfixStashed
          ? {
              label: "Xem Changes",
              onClick: () => (viewMode = "changes"),
            }
          : undefined,
      );
    } catch (err: any) {
      toast.error("Lỗi khi bắt đầu Quick Hotfix", err?.message || String(err));
      throw err;
    }
  }

  async function handleRestoreHotfixStash() {
    if (!repo.currentRepoPath) return;
    try {
      if (hotfixStashed) {
        await stashPop(repo.currentRepoPath, 0);
        hotfixStashed = false;
      }
      const finishedBranch = activeHotfixBranch;
      activeHotfixBranch = null;

      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();

      toast.success(
        "Đã khôi phục code dở dang",
        `Đã hoàn tất khôi phục code từ Stash cho phiên hotfix '${finishedBranch}'.`,
      );
    } catch (err: any) {
      toast.error("Lỗi khôi phục code dở dang", err?.message || String(err));
    }
  }

  // --- NUKE FILE FROM HISTORY ---
  async function handleConfirmNukeFile(filePath: string) {
    if (!repo.currentRepoPath) return;
    try {
      const res = await nukeFileFromHistory(repo.currentRepoPath, filePath);
      toast.success("Xóa vĩnh viễn thành công", res);
      showNukeModal = false;
      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();
    } catch (err: any) {
      toast.error("Lỗi khi xóa tệp khỏi lịch sử", err?.message || String(err));
      throw err;
    }
  }
</script>

<div
  class="h-screen w-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans select-none"
>
  <!-- Top Toolbar -->
  <Toolbar
    repoSummary={repo.repoSummary}
    branches={repo.branches}
    bind:searchQuery={repo.searchQuery}
    commitLimit={repo.commitLimit}
    isLoading={repo.isLoading}
    isSyncing={remote.isSyncing}
    isPushing={remote.isPushing}
    {viewMode}
    {layoutMode}
    filterHideMerges={repo.filterHideMerges}
    filterMyCommits={repo.filterMyCommits}
    dirtyFilesCount={wt.workingTreeStatus?.total_dirty_count || 0}
    stagedFilesCount={wt.workingTreeStatus?.total_staged_count || 0}
    conflictedFilesCount={safety.conflictedFiles.length}
    {isSidebarOpen}
    activeAccount={remote.activeAccount}
    onToggleSidebar={() => (isSidebarOpen = !isSidebarOpen)}
    onOpenRepo={() => (repo.showWelcomeScreen = true)}
    onRefresh={() => loadRepository(repo.currentRepoPath)}
    onSearchChange={(q) => (repo.searchQuery = q)}
    onLimitChange={(lim) => repo.handleLimitChange(lim)}
    onChangeViewMode={(mode) => (viewMode = mode)}
    onChangeLayoutMode={(mode) => (layoutMode = mode)}
    onToggleHideMerges={() => (repo.filterHideMerges = !repo.filterHideMerges)}
    onToggleMyCommits={() => (repo.filterMyCommits = !repo.filterMyCommits)}
    onOpenTrash={() => safety.openTrash(repo.currentRepoPath)}
    onOpenWorktrees={handleOpenWorktreesModal}
    onSmartSync={async () => {
      const res = await remote.runSmartSync(
        repo.currentRepoPath,
        undefined,
        () => loadRepository(repo.currentRepoPath),
      );
      repo.statusMessage = res.message;
    }}
    onPush={handlePushCurrentBranch}
    onPublishBranch={handlePublishBranch}
    remotesCount={remotes.length}
    onPublishRepo={() => (showPublishModal = true)}
    onOpenPalette={() => (showCommandPalette = true)}
    onOpenBisect={() => safety.openBisect(repo.currentRepoPath)}
    onOpenTimeMachine={() => safety.openTimeMachine(repo.currentRepoPath)}
    onOpenAI={handleOpenAI}
    onOpenSubmodules={() => (showSubmoduleModal = true)}
    onOpenLfs={() => (showLfsModal = true)}
    onOpenGuide={() => (showGuideModal = true)}
    onOpenPlaybook={() => (showPlaybookModal = true)}
    onOpenAuth={() => (remote.showAuthModal = true)}
    onOpenQuickHotfix={() => (showQuickHotfixModal = true)}
    {activeHotfixBranch}
    onRestoreHotfixStash={handleRestoreHotfixStash}
  />

  <!-- Main Work Area -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Navigation Sidebar -->
    {#if isSidebarOpen}
      <Sidebar
        repoSummary={repo.repoSummary}
        branches={repo.branches}
        tags={repo.tags}
        stashes={repo.stashes}
        worktrees={repo.worktrees}
        isPushing={remote.isPushing}
        onSelectBranch={handleCheckoutBranch}
        onDeleteBranch={handleDeleteBranch}
        onRenameBranch={handleRenameBranch}
        onPublishBranch={handlePublishBranch}
        onPushBranch={handlePushBranch}
        onFetchBranch={async (b) => {
          const res = await remote.runSmartSync(
            repo.currentRepoPath,
            b.shorthand,
            () => loadRepository(repo.currentRepoPath),
          );
          repo.statusMessage = res.message;
        }}
        onFetchPrune={() =>
          remote.executeRemote(
            repo.currentRepoPath,
            "fetch",
            "origin",
            undefined,
            false,
            () => loadRepository(repo.currentRepoPath),
          )}
        onCreateBranch={handleOpenCreateBranch}
        onCreateBranchFrom={(b) => handleOpenCreateBranch(b.shorthand)}
        onRebaseBranch={handleRebaseBranch}
        onCleanMergedBranches={handleOpenCleanMerged}
        onDeleteTag={handleDeleteTag}
        onOpenWorktrees={handleOpenWorktreesModal}
        onCreatePullRequest={(b) => handleOpenCreatePR(b.shorthand)}
        {remotes}
        onOpenRemoteManager={() => (showRemoteManagerModal = true)}
        onFetchRemote={handleFetchSpecificRemote}
        onPublishRepo={() => (showPublishModal = true)}
        onCloseSidebar={() => (isSidebarOpen = false)}
      />
    {/if}

    <!-- Center & Right Views -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <RepoAlertBanner
        operationState={repoOpState}
        isDetached={repo.repoSummary?.is_detached ?? false}
        currentBranch={repo.repoSummary?.current_branch}
        headCommitId={repo.repoSummary?.head_commit_id}
        isOperating={isOperatingAlert}
        onContinueRebase={handleContinueRebaseAlert}
        onSkipRebase={handleSkipRebaseAlert}
        onAbortOperation={handleAbortCurrentOperationAlert}
        onCreateBranchFromDetached={handleCreateBranchFromDetached}
      />
      <RecentPushBanner
        pushedBranch={recentPushedBranch}
        targetBranch={repo.branches.some((b) => b.shorthand === "main") ? "main" : "master"}
        onCompareAndPR={(b) => {
          recentPushedBranch = null;
          handleOpenCreatePR(b);
        }}
        onDismiss={() => (recentPushedBranch = null)}
      />
      {#if viewMode === "graph"}
        {#if layoutMode === "three-column"}
          <ThreeColumnLayout
            commits={repo.visibleCommits}
            selectedCommitId={repo.selectedCommitId}
            selectedCommitIds={repo.selectedCommitIds}
            commitDetail={repo.commitDetail}
            isDetailLoading={repo.isDetailLoading}
            repoPath={repo.currentRepoPath}
            hasMore={repo.hasMoreCommits}
            isLoadingMore={repo.isLoadingMoreCommits}
            onLoadMore={() => repo.handleLoadMoreCommits()}
            onSelectCommit={(c) => repo.handleSelectCommit(c)}
            onCompareCommits={handleCompareCommits}
            onCreateBranch={handleOpenCreateBranchFromCommit}
            onCreateTag={handleOpenCreateTag}
            onRevertCommit={handleRevertCommit}
            onResetCommit={handleResetToCommit}
            onSquashCommits={handleOpenSquash}
            onInteractiveRebase={handleOpenInteractiveRebase}
            onOpenDropAction={handleOpenDropAction}
          />
        {:else}
          <div
            class="flex-1 min-h-[200px] relative overflow-hidden flex flex-col"
          >
            <CommitGraph
              commits={repo.visibleCommits}
              selectedCommitId={repo.selectedCommitId}
              selectedCommitIds={repo.selectedCommitIds}
              repoPath={repo.currentRepoPath}
              hasMore={repo.hasMoreCommits}
              isLoadingMore={repo.isLoadingMoreCommits}
              onLoadMore={() => repo.handleLoadMoreCommits()}
              onSelectCommit={(c) => repo.handleSelectCommit(c)}
              onSelectMultipleCommits={(ids) => (repo.selectedCommitIds = ids)}
              onCompareCommits={handleCompareCommits}
              onCreateBranch={handleOpenCreateBranchFromCommit}
              onCreateTag={handleOpenCreateTag}
              onRevertCommit={handleRevertCommit}
              onResetCommit={handleResetToCommit}
              onSquashCommits={handleOpenSquash}
              onInteractiveRebase={handleOpenInteractiveRebase}
              onOpenDropAction={handleOpenDropAction}
            />

            {#if !repo.isDetailOpen && repo.selectedCommitId}
              <button
                onclick={() => (repo.isDetailOpen = true)}
                class="absolute bottom-3 right-4 px-3 py-1.5 rounded-lg bg-white/95 dark:bg-zinc-900/95 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/70 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white shadow-xl flex items-center gap-2 backdrop-blur-md cursor-pointer transition-all hover:scale-105 z-10"
                title="Mở bảng chi tiết commit"
              >
                <Info class="w-3.5 h-3.5 text-cyan-400" />
                <span>Commit Details</span>
              </button>
            {/if}
          </div>

          {#if repo.isDetailOpen}
            <!-- Resizable Splitter Bar -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
            <div
              role="separator"
              aria-orientation="horizontal"
              tabindex="-1"
              onmousedown={handleStartResizeDetail}
              class="h-1.5 w-full bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-cyan-500 active:bg-cyan-600 cursor-row-resize transition-colors flex items-center justify-center shrink-0 group relative z-10 select-none {isResizingDetail ? 'bg-cyan-500!' : ''}"
              title="Kéo chuột để điều chỉnh độ cao panel chi tiết"
            >
              <div class="w-10 h-0.5 rounded-full bg-zinc-400 dark:bg-zinc-600 group-hover:bg-white transition-colors"></div>
            </div>

            <div
              style={repo.isDetailMaximized ? 'height: 70%;' : `height: ${detailPanelHeight}px;`}
              class="shrink-0 transition-[height] duration-75 overflow-hidden"
            >
              <CommitDetail
                commitDetail={repo.commitDetail}
                isLoading={repo.isDetailLoading}
                isMaximized={repo.isDetailMaximized}
                repoPath={repo.currentRepoPath}
                onToggleMaximize={() =>
                  (repo.isDetailMaximized = !repo.isDetailMaximized)}
                onClose={() => (repo.isDetailOpen = false)}
                onSelectParent={(pid) => repo.handleSelectParent(pid)}
                onOpenFileInExplorer={(filePath) => {
                  explorerInitialFilePath = filePath;
                  viewMode = "files";
                }}
              />
            </div>
          {/if}
        {/if}
      {:else if viewMode === "focus"}
        <FocusView
          repoPath={repo.currentRepoPath}
          currentBranchName={repo.repoSummary?.current_branch}
          branches={repo.branches}
          selectedCommitId={repo.selectedCommitId}
          selectedCommitIds={repo.selectedCommitIds}
          commitDetail={repo.commitDetail}
          isDetailLoading={repo.isDetailLoading}
          onSelectCommit={(c) => repo.handleSelectCommit(c)}
          onSelectMultipleCommits={(ids) => (repo.selectedCommitIds = ids)}
          onSquashCommits={handleOpenSquash}
          onCompareCommits={handleCompareCommits}
          onOpenCreatePR={(source) => handleOpenCreatePR(source)}
          onCloseFocus={() => (viewMode = "graph")}
          onSyncWithBase={async (baseBranch) => {
            if (!repo.currentRepoPath) return;
            if (baseBranch) {
              repo.statusMessage = `Rebasing onto ${baseBranch}...`;
              try {
                const res = await executeRebase(
                  repo.currentRepoPath,
                  baseBranch,
                );
                if (res.status === "completed") {
                  toast.success(res.message);
                  repo.statusMessage = res.message;
                  await loadRepository(repo.currentRepoPath);
                } else if (res.status === "conflict") {
                  toast.warning(res.message);
                  safety.isRebasing = true;
                  await safety.loadConflictFiles(repo.currentRepoPath);
                  viewMode = "conflict";
                }
                return;
              } catch (e: any) {
                toast.error(`Rebase thất bại: ${e?.message || e}`);
              }
            }
            const res = await remote.runSmartSync(
              repo.currentRepoPath,
              undefined,
              () => loadRepository(repo.currentRepoPath),
            );
            repo.statusMessage = res.message;
          }}
        />
      {:else if viewMode === "stacked"}
        <StackedCommitsFlow
          repoPath={repo.currentRepoPath}
          currentBranch={repo.repoSummary?.current_branch}
          onRefreshRepo={() => loadRepository(repo.currentRepoPath)}
          onClose={() => (viewMode = "graph")}
          onPush={handlePushCurrentBranch}
        />
      {:else if viewMode === "dag"}
        <DagCanvasMap
          commits={repo.visibleCommits}
          repoPath={repo.currentRepoPath}
          onClose={() => (viewMode = "graph")}
        />
      {:else if viewMode === "changes"}
        <WorkingTree
          status={wt.workingTreeStatus}
          currentBranch={repo.repoSummary?.current_branch || ""}
          selectedFilePath={wt.selectedFilePath}
          selectedFileIsStaged={wt.selectedFileIsStaged}
          diffDetail={wt.fileDiffDetail}
          isDiffLoading={wt.isDiffLoading}
          isCommitLoading={wt.isCommitLoading}
          ignoreWhitespace={wt.ignoreWhitespace}
          onToggleIgnoreWhitespace={() =>
            wt.toggleIgnoreWhitespace(repo.currentRepoPath)}
          onCreateBranch={(base) => {
            createBranchBaseRef = base;
            showCreateBranchModal = true;
          }}
          onSelectFile={(f, isStaged) =>
            wt.selectFile(repo.currentRepoPath, f, isStaged)}
          onStageFile={(f) =>
            wt.stageFile(repo.currentRepoPath, f, refreshWorkingTreeAndDiff)}
          onUnstageFile={(f) =>
            wt.unstageFile(repo.currentRepoPath, f, refreshWorkingTreeAndDiff)}
          onStageAll={() =>
            wt.stageAll(repo.currentRepoPath, refreshWorkingTreeAndDiff)}
          onUnstageAll={() =>
            wt.unstageAll(repo.currentRepoPath, refreshWorkingTreeAndDiff)}
          onStageHunk={(idx) =>
            wt.stageHunk(repo.currentRepoPath, idx, refreshWorkingTreeAndDiff)}
          onUnstageHunk={(idx) =>
            wt.unstageHunk(
              repo.currentRepoPath,
              idx,
              refreshWorkingTreeAndDiff,
            )}
          onDiscardFile={async (f) => {
            await wt.discardFile(
              repo.currentRepoPath,
              f,
              refreshWorkingTreeAndDiff,
            );
            toast.warning(
              "Đã Discard thay đổi",
              `Tệp '${f}' đã được sao lưu an toàn trong Thùng rác 48h.`,
              {
                label: "Thùng rác",
                onClick: () => safety.openTrash(repo.currentRepoPath),
              },
            );
          }}
          onDiscardAll={async () => {
            await wt.discardAll(
              repo.currentRepoPath,
              refreshWorkingTreeAndDiff,
            );
            toast.warning(
              "Đã Discard tất cả thay đổi",
              "Toàn bộ tệp đã được sao lưu vào Thùng rác an toàn 48h.",
              {
                label: "Thùng rác",
                onClick: () => safety.openTrash(repo.currentRepoPath),
              },
            );
          }}
          onAddToGitignore={async (pattern) => {
            try {
              await addToGitignore(repo.currentRepoPath, pattern);
              toast.success(
                "Đã cập nhật .gitignore",
                `Đã thêm '${pattern}' vào .gitignore thành công.`
              );
              await refreshWorkingTreeAndDiff();
            } catch (err: any) {
              toast.error("Lỗi cập nhật .gitignore", err.message || String(err));
            }
          }}
          onGenerateGitignore={async () => {
            try {
              const added = await generateStandardGitignore(repo.currentRepoPath);
              toast.success(
                "Đã tạo .gitignore chuẩn",
                `Đã bổ sung ${added.length} quy tắc tương thích dự án.`
              );
              await refreshWorkingTreeAndDiff();
            } catch (err: any) {
              toast.error("Lỗi tạo .gitignore", err.message || String(err));
            }
          }}
          onCommit={async (msg, amend, noVerify = false) => {
            const sha = await wt.createCommit(
              repo.currentRepoPath,
              msg,
              amend,
              noVerify,
              () => loadRepository(repo.currentRepoPath),
            );
            repo.statusMessage = `Committed: ${sha.slice(0, 7)}`;
            toast.success(
              amend ? "Đã Amend Commit thành công" : "Đã tạo Commit thành công",
              `${sha.slice(0, 7)}: ${msg}`,
              {
                label: "Hoàn tác (Ctrl+Z)",
                onClick: () => handleUndo(),
              },
            );
          }}
          onOpenTrash={() => safety.openTrash(repo.currentRepoPath)}
        />
      {:else if viewMode === "compare"}
        <ComparisonViewer
          comparison={comparisonResult}
          isLoading={isComparisonLoading}
          repoPath={repo.currentRepoPath}
          onClose={() => (viewMode = "graph")}
        />
      {:else if viewMode === "conflict"}
        <ConflictResolver
          conflictDetail={safety.conflictFileDetail}
          conflictedFiles={safety.conflictedFiles}
          selectedFile={safety.selectedConflictFile}
          isLoading={safety.isConflictLoading}
          isRebasing={safety.isRebasing}
          onSelectFile={(f) =>
            safety.selectConflictFile(repo.currentRepoPath, f)}
          onResolveAndStage={async (content) => {
            await safety.resolveConflict(
              repo.currentRepoPath,
              content,
              refreshWorkingTreeAndDiff,
            );
            if (safety.conflictedFiles.length === 0 && !safety.isRebasing)
              viewMode = "changes";
          }}
          onContinueRebase={async () => {
            if (!repo.currentRepoPath) return;
            repo.statusMessage = "Continuing rebase...";
            try {
              const res = await continueRebase(repo.currentRepoPath);
              if (res.status === "completed") {
                toast.success("Rebase hoàn tất thành công!");
                safety.isRebasing = false;
                viewMode = "graph";
                await loadRepository(repo.currentRepoPath);
              } else if (res.status === "conflict") {
                toast.warning(
                  "Xung đột ở commit tiếp theo. Vui lòng giải quyết tiếp.",
                );
                await safety.loadConflictFiles(repo.currentRepoPath);
              }
            } catch (e: any) {
              toast.error(`Continue rebase failed: ${e?.message || e}`);
            }
          }}
          onAbortMerge={async () => {
            await safety.abortMerge(repo.currentRepoPath, () =>
              loadRepository(repo.currentRepoPath),
            );
            viewMode = "graph";
          }}
          onClose={() => (viewMode = "graph")}
        />
      {:else if viewMode === "files"}
        <RepositoryExplorer
          repoPath={repo.currentRepoPath}
          commits={repo.visibleCommits}
          initialFilePath={explorerInitialFilePath}
          onSelectCommit={(commitId) => {
            repo.selectedCommitId = commitId;
            viewMode = "graph";
          }}
          onNukeFile={(p) => {
            nukeTargetFilePath = p;
            showNukeModal = true;
          }}
        />
      {:else if viewMode === "pr"}
        <PullRequestReviewer
          remoteOriginUrl={originRemoteUrl}
          localBranches={repo.branches}
          onOpenCreatePR={() => handleOpenCreatePR()}
          onCheckoutBranch={async (b) => {
            await checkoutBranch(repo.currentRepoPath, b);
            await loadRepository(repo.currentRepoPath);
          }}
          onClose={() => (viewMode = "graph")}
        />
      {/if}
    </main>
  </div>

  <!-- Bottom Status Bar -->
  <StatusBar
    statusMessage={repo.statusMessage}
    repoSummary={repo.repoSummary}
    visibleCommitsCount={repo.visibleCommits.length}
    dirtyFilesCount={wt.workingTreeStatus?.total_dirty_count || 0}
    stagedFilesCount={wt.workingTreeStatus?.total_staged_count || 0}
    {currentIdentity}
    onOpenIdentity={() => (showIdentityModal = true)}
    onOpenTrash={() => safety.openTrash(repo.currentRepoPath)}
  />

  <!-- Modals Container -->
  <ModalsContainer
    currentRepoPath={repo.currentRepoPath}
    {showOpenDialog}
    bind:inputRepoPath
    onCloseOpenDialog={() => (showOpenDialog = false)}
    onConfirmManualOpen={async () => {
      if (inputRepoPath.trim()) {
        showOpenDialog = false;
        await loadRepository(inputRepoPath.trim());
      }
    }}
    {showDropActionModal}
    {dropSourceCommit}
    {dropTargetCommit}
    {dropSimulation}
    {dropModalPosition}
    onCherryPickDrop={handleCherryPickDrop}
    onMergeDrop={handleMergeDrop}
    onRebaseDrop={handleRebaseDrop}
    onCloseDropAction={() => (showDropActionModal = false)}
    {showWorktreeModal}
    worktrees={repo.worktrees}
    branches={repo.branches}
    {isWorktreeLoading}
    onCloseWorktree={() => (showWorktreeModal = false)}
    onCreateWorktree={handleCreateWorktree}
    onDeleteWorktree={handleDeleteWorktree}
    onOpenWorktreeFolder={(p) => {
      showWorktreeModal = false;
      loadRepository(p);
    }}
    showTrashModal={safety.showTrashModal}
    trashSnapshots={safety.trashSnapshots}
    isTrashLoading={safety.isTrashLoading}
    onCloseTrash={() => (safety.showTrashModal = false)}
    onRestoreTrash={(id) =>
      safety.restoreTrash(repo.currentRepoPath, id, refreshWorkingTreeAndDiff)}
    onDeleteTrash={(id) => safety.deleteTrash(repo.currentRepoPath, id)}
    showBisectModal={safety.showBisectModal}
    bisectStatus={safety.bisectStatus}
    commits={repo.rawCommits}
    isBisectLoading={safety.isBisectLoading}
    onStartBisect={async (bad, good) => {
      await safety.startBisect(repo.currentRepoPath, bad, good, () =>
        loadRepository(repo.currentRepoPath),
      );
    }}
    onBisectStep={async (isGood) => {
      await safety.bisectStep(repo.currentRepoPath, isGood, () =>
        loadRepository(repo.currentRepoPath),
      );
    }}
    onAbortBisect={() =>
      safety.abortBisect(repo.currentRepoPath, () =>
        loadRepository(repo.currentRepoPath),
      )}
    onCloseBisect={() => (safety.showBisectModal = false)}
    showTimeMachineDrawer={safety.showTimeMachineDrawer}
    actionRecords={safety.actionRecords}
    isActionLoading={safety.isActionLoading}
    onUndoAction={handleUndo}
    onRedoAction={handleRedo}
    onTimeTravel={(id) =>
      safety.timeTravel(repo.currentRepoPath, id, () =>
        loadRepository(repo.currentRepoPath),
      )}
    onCloseTimeMachine={() => (safety.showTimeMachineDrawer = false)}
    {showCommandPalette}
    tags={repo.tags}
    onSelectBranch={(b) => repo.handleSelectBranch(b)}
    onChangeViewMode={(mode: ViewMode) => (viewMode = mode)}
    onOpenTrash={() => safety.openTrash(repo.currentRepoPath)}
    onOpenWorktreesModal={handleOpenWorktreesModal}
    onOpenBisect={() => safety.openBisect(repo.currentRepoPath)}
    onOpenTimeMachine={() => safety.openTimeMachine(repo.currentRepoPath)}
    onOpenAI={handleOpenAI}
    onSmartSync={async () => {
      const res = await remote.runSmartSync(
        repo.currentRepoPath,
        undefined,
        () => loadRepository(repo.currentRepoPath),
      );
      repo.statusMessage = res.message;
    }}
    onStageAll={() =>
      wt.stageAll(repo.currentRepoPath, refreshWorkingTreeAndDiff)}
    onUnstageAll={() =>
      wt.unstageAll(repo.currentRepoPath, refreshWorkingTreeAndDiff)}
    onDiscardAll={() =>
      wt.discardAll(repo.currentRepoPath, refreshWorkingTreeAndDiff)}
    onPush={handlePushCurrentBranch}
    onPull={() =>
      remote.executeRemote(
        repo.currentRepoPath,
        "pull",
        "origin",
        undefined,
        false,
        () => loadRepository(repo.currentRepoPath),
      )}
    onFetch={() =>
      remote.executeRemote(
        repo.currentRepoPath,
        "fetch",
        "origin",
        undefined,
        false,
        () => loadRepository(repo.currentRepoPath),
      )}
    onCloseCommandPalette={() => (showCommandPalette = false)}
    {showAIModal}
    {aiDiffContext}
    conflictDetail={safety.conflictFileDetail}
    onApplyCommitMessage={(msg) =>
      (repo.statusMessage = `AI message: ${msg.slice(0, 40)}...`)}
    onCloseAI={() => (showAIModal = false)}
    {showSubmoduleModal}
    onCloseSubmodule={() => (showSubmoduleModal = false)}
    {showLfsModal}
    onCloseLfs={() => (showLfsModal = false)}
    showAuthModal={remote.showAuthModal}
    authModalType={remote.authModalType}
    authModalRemoteUrl={remote.authModalRemoteUrl}
    onConfirmAuth={(creds, profile) =>
      remote.confirmAuth(creds, profile, repo.currentRepoPath, () =>
        loadRepository(repo.currentRepoPath),
      )}
    onCancelAuth={() => remote.cancelAuth()}
    {showDeleteBranchModal}
    {deletingBranch}
    {isDeleteBranchLoading}
    onCloseDeleteBranch={() => {
      showDeleteBranchModal = false;
      deletingBranch = null;
    }}
    onConfirmDeleteBranch={handleConfirmDeleteBranch}
    showWelcomeScreen={repo.showWelcomeScreen}
    activeAccount={remote.activeAccount}
    recentRepos={repo.recentRepos}
    onSelectRepo={(path) => loadRepository(path)}
    onOpenAuthFromWelcome={() => (remote.showAuthModal = true)}
    onCloseWelcome={() => (repo.showWelcomeScreen = false)}
    {showInitRepoModal}
    {initRepoPath}
    onConfirmInitRepo={handleConfirmInitRepo}
    onCloseInitRepo={() => {
      showInitRepoModal = false;
      initRepoPath = '';
    }}
    {showPublishModal}
    publishRepoPath={repo.currentRepoPath}
    publishRepoName={repo.repoSummary?.name || ''}
    publishCurrentBranch={repo.repoSummary?.current_branch || 'main'}
    onPublishSuccess={async () => {
      if (repo.currentRepoPath) await loadRemotesList(repo.currentRepoPath);
    }}
    onClosePublish={() => (showPublishModal = false)}
    {showGuideModal}
    onCloseGuide={() => (showGuideModal = false)}
    {showCreateTagModal}
    {tagTargetCommit}
    {isCreateTagLoading}
    onCloseCreateTag={() => (showCreateTagModal = false)}
    onConfirmCreateTag={handleConfirmCreateTag}
    {showSquashModal}
    {squashTargetCommits}
    {isSquashLoading}
    onCloseSquash={() => (showSquashModal = false)}
    onConfirmSquash={handleConfirmSquash}
    {showCleanMergedModal}
    {mergedBranches}
    {isCleanMergedLoading}
    onCloseCleanMerged={() => (showCleanMergedModal = false)}
    onConfirmCleanMerged={handleConfirmCleanMerged}
  />
</div>

<!-- Create Branch Modal -->
<CreateBranchModal
  open={showCreateBranchModal}
  branches={repo.branches}
  currentBranch={createBranchBaseRef ||
    repo.repoSummary?.current_branch ||
    "main"}
  onConfirm={handleConfirmCreateBranch}
  onClose={() => {
    showCreateBranchModal = false;
    createBranchBaseRef = "";
  }}
/>

<!-- Quick Hotfix Modal -->
<QuickHotfixModal
  isOpen={showQuickHotfixModal}
  currentBranch={repo.repoSummary?.current_branch || ""}
  dirtyFilesCount={wt.workingTreeStatus?.total_dirty_count || 0}
  branches={repo.branches}
  onStartHotfix={handleStartQuickHotfix}
  onClose={() => (showQuickHotfixModal = false)}
/>

<!-- Nuke File from History Modal -->
<NukeHistoryModal
  isOpen={showNukeModal}
  filePath={nukeTargetFilePath}
  onConfirm={handleConfirmNukeFile}
  onClose={() => (showNukeModal = false)}
/>

<!-- Multi-Remote Management Modal -->
<RemoteManagerModal
  isOpen={showRemoteManagerModal}
  repoPath={repo.currentRepoPath}
  onClose={() => (showRemoteManagerModal = false)}
  onRemotesChanged={async () => {
    if (repo.currentRepoPath) {
      await loadRepository(repo.currentRepoPath);
      await loadRemotesList(repo.currentRepoPath);
    }
  }}
/>

<!-- Interactive Rebase Modal -->
<InteractiveRebaseModal
  isOpen={showInteractiveRebaseModal}
  repoPath={repo.currentRepoPath}
  ontoCommit={interactiveRebaseOntoCommit}
  onClose={() => {
    showInteractiveRebaseModal = false;
    interactiveRebaseOntoCommit = null;
  }}
  onSuccess={async (res) => {
    if (res.status === "completed") {
      await loadRepository(repo.currentRepoPath);
    } else if (res.status === "conflict") {
      safety.isRebasing = true;
      await safety.loadConflictFiles(repo.currentRepoPath);
      viewMode = "conflict";
    }
  }}
/>

<!-- Git Identity Profile Switcher Modal -->
<IdentitySwitcherModal
  isOpen={showIdentityModal}
  repoPath={repo.currentRepoPath}
  onClose={() => (showIdentityModal = false)}
  onIdentityChanged={async () => {
    if (repo.currentRepoPath) {
      await loadIdentity(repo.currentRepoPath);
    }
  }}
/>

<!-- Git Emergency Playbook Recipes Modal -->
<GitPlaybookModal
  isOpen={showPlaybookModal}
  repoPath={repo.currentRepoPath}
  currentBranch={repo.repoSummary?.current_branch || ''}
  onClose={() => (showPlaybookModal = false)}
  onOpenTrash={() => safety.openTrash(repo.currentRepoPath)}
  onOpenTimeMachine={() => safety.openTimeMachine(repo.currentRepoPath)}
  onRepoRefreshed={async () => {
    if (repo.currentRepoPath) {
      await loadRepository(repo.currentRepoPath);
    }
  }}
/>

<!-- Create Pull Request Modal -->
<CreatePullRequestModal
  isOpen={showCreatePRModal}
  remoteOriginUrl={originRemoteUrl}
  branches={repo.branches}
  initialSourceBranch={createPRSourceBranch}
  onClose={() => (showCreatePRModal = false)}
  onSuccess={async () => {
    showCreatePRModal = false;
    recentPushedBranch = null;
    viewMode = "pr";
    if (repo.currentRepoPath) {
      await loadRepository(repo.currentRepoPath);
    }
  }}
/>

<!-- Floating Interactive Toast Notifications -->
<ToastContainer />
