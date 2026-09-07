import type {
  BranchInfo,
  CommitNode,
  ConflictSimulationResult,
} from '../types';

export class ModalState {
  // Manual Open Repo Dialog
  showOpenDialog = $state<boolean>(false);
  inputRepoPath = $state<string>('f:/Dev/product/git-tool');

  // Drag & Drop Action Modal
  showDropActionModal = $state<boolean>(false);
  dropSourceCommit = $state<CommitNode | null>(null);
  dropTargetCommit = $state<CommitNode | null>(null);
  dropSimulation = $state<ConflictSimulationResult | null>(null);
  dropModalPosition = $state<{ x: number; y: number }>({ x: 0, y: 0 });

  // Worktree Manager
  showWorktreeModal = $state<boolean>(false);
  isWorktreeLoading = $state<boolean>(false);

  // Safe Delete Branch
  showDeleteBranchModal = $state<boolean>(false);
  deletingBranch = $state<BranchInfo | null>(null);
  isDeleteBranchLoading = $state<boolean>(false);

  // Create Branch
  showCreateBranchModal = $state<boolean>(false);
  createBranchBaseRef = $state<string>('');

  // Command Palette
  showCommandPalette = $state<boolean>(false);

  // AI Assistant Modal
  showAIModal = $state<boolean>(false);
  aiDiffContext = $state<string>('');

  // Submodules & LFS
  showSubmoduleModal = $state<boolean>(false);
  showLfsModal = $state<boolean>(false);

  // User Guide / Playbook
  showGuideModal = $state<boolean>(false);

  // Create Tag Modal
  showCreateTagModal = $state<boolean>(false);
  tagTargetCommit = $state<CommitNode | null>(null);
  isCreateTagLoading = $state<boolean>(false);

  // Clean Merged Branches
  showCleanMergedModal = $state<boolean>(false);
  isCleanMergedLoading = $state<boolean>(false);
  mergedBranches = $state<string[]>([]);

  // Squash Modal
  showSquashModal = $state<boolean>(false);
  squashTargetCommits = $state<CommitNode[]>([]);
  isSquashLoading = $state<boolean>(false);

  // Quick Hotfix (Smart Stash & Switch)
  showHotfixModal = $state<boolean>(false);
  activeHotfixBranch = $state<string | null>(null);
  hotfixStashed = $state<boolean>(false);

  // Visual Stash Shelf Drawer
  showStashShelfDrawer = $state<boolean>(false);
  selectedStashIndex = $state<number>(0);

  // Nuke File from History
  showNukeModal = $state<boolean>(false);
  nukeTargetFilePath = $state<string>('');

  // Remote Manager Modal
  showRemoteManagerModal = $state<boolean>(false);

  // Interactive Rebase Modal
  showInteractiveRebaseModal = $state<boolean>(false);
  interactiveRebaseOntoCommit = $state<CommitNode | null>(null);

  // Identity Switcher Modal
  showIdentityModal = $state<boolean>(false);

  // Git Playbook Modal
  showPlaybookModal = $state<boolean>(false);

  // Create Pull Request Modal
  showCreatePRModal = $state<boolean>(false);
  createPRSourceBranch = $state<string>('');

  // Init Repo Dialog
  showInitRepoModal = $state<boolean>(false);
  initRepoPath = $state<string>('');

  // Publish to GitHub Modal
  showPublishModal = $state<boolean>(false);
  publishRepoPath = $state<string>('');
  publishRepoName = $state<string>('');
  publishCurrentBranch = $state<string>('');

  // --- HELPER ACTIONS ---
  openCreateBranch(baseRef = '') {
    this.createBranchBaseRef = baseRef;
    this.showCreateBranchModal = true;
  }
  closeCreateBranch() {
    this.showCreateBranchModal = false;
    this.createBranchBaseRef = '';
  }

  openDeleteBranch(branch: BranchInfo) {
    this.deletingBranch = branch;
    this.showDeleteBranchModal = true;
  }
  closeDeleteBranch() {
    this.showDeleteBranchModal = false;
    this.deletingBranch = null;
  }

  openCreateTag(commit?: CommitNode | null) {
    this.tagTargetCommit = commit || null;
    this.showCreateTagModal = true;
  }
  closeCreateTag() {
    this.showCreateTagModal = false;
    this.tagTargetCommit = null;
  }

  openSquash(commits: CommitNode[]) {
    this.squashTargetCommits = commits;
    this.showSquashModal = true;
  }
  closeSquash() {
    this.showSquashModal = false;
    this.squashTargetCommits = [];
  }

  openInteractiveRebase(commit: CommitNode) {
    this.interactiveRebaseOntoCommit = commit;
    this.showInteractiveRebaseModal = true;
  }
  closeInteractiveRebase() {
    this.showInteractiveRebaseModal = false;
    this.interactiveRebaseOntoCommit = null;
  }

  openCreatePR(sourceBranch = '') {
    this.createPRSourceBranch = sourceBranch;
    this.showCreatePRModal = true;
  }
  closeCreatePR() {
    this.showCreatePRModal = false;
    this.createPRSourceBranch = '';
  }

  openNukeFile(filePath: string) {
    this.nukeTargetFilePath = filePath;
    this.showNukeModal = true;
  }
  closeNukeFile() {
    this.showNukeModal = false;
    this.nukeTargetFilePath = '';
  }

  openStashShelf(index: number = 0) {
    this.selectedStashIndex = index;
    this.showStashShelfDrawer = true;
  }
  closeStashShelf() {
    this.showStashShelfDrawer = false;
  }

  openDropAction(
    source: CommitNode,
    target: CommitNode,
    simulation: ConflictSimulationResult | null,
    position: { x: number; y: number }
  ) {
    this.dropSourceCommit = source;
    this.dropTargetCommit = target;
    this.dropSimulation = simulation;
    this.dropModalPosition = position;
    this.showDropActionModal = true;
  }
  closeDropAction() {
    this.showDropActionModal = false;
    this.dropSourceCommit = null;
    this.dropTargetCommit = null;
    this.dropSimulation = null;
  }
}

export const modalState = new ModalState();
