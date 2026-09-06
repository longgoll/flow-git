<script lang="ts">
  import { GitFork } from 'lucide-svelte';
  import AIAssistantModal from './AIAssistantModal.svelte';
  import AuthCredentialModal from './AuthCredentialModal.svelte';
  import BisectWizard from './BisectWizard.svelte';
  import CleanMergedBranchesModal from './CleanMergedBranchesModal.svelte';
  import CommandPalette from './CommandPalette.svelte';
  import CreateTagModal from './CreateTagModal.svelte';
  import DeleteBranchModal from './DeleteBranchModal.svelte';
  import DropActionModal from './DropActionModal.svelte';
  import LfsManager from './LfsManager.svelte';
  import SquashModal from './SquashModal.svelte';
  import SubmoduleManager from './SubmoduleManager.svelte';
  import TimeMachineDrawer from './TimeMachineDrawer.svelte';
  import TrashInspector from './TrashInspector.svelte';
  import UserGuideModal from './UserGuideModal.svelte';
  import WelcomeScreen from './WelcomeScreen.svelte';
  import InitRepoDialog from './InitRepoDialog.svelte';
  import PublishRepoModal from './PublishRepoModal.svelte';
  import WorktreeManager from './WorktreeManager.svelte';
  import CreateBranchModal from './CreateBranchModal.svelte';
  import QuickHotfixModal from './QuickHotfixModal.svelte';
  import NukeHistoryModal from './NukeHistoryModal.svelte';
  import RemoteManagerModal from './RemoteManagerModal.svelte';
  import InteractiveRebaseModal from './InteractiveRebaseModal.svelte';
  import IdentitySwitcherModal from './IdentitySwitcherModal.svelte';
  import GitPlaybookModal from './GitPlaybookModal.svelte';
  import CreatePullRequestModal from './CreatePullRequestModal.svelte';
  import type {
    AccountProfile,
    ActionRecord,
    BisectStatus,
    BranchInfo,
    CommitNode,
    ConflictFileDetail,
    ConflictSimulationResult,
    GitCredentials,
    TagInfo,
    TrashSnapshotItem,
    ViewMode,
    WorktreeInfo,
  } from '../types';

  interface Props {
    // Current Repo
    currentRepoPath: string;

    // Open Repo Dialog State
    showOpenDialog: boolean;
    inputRepoPath: string;
    onCloseOpenDialog: () => void;
    onConfirmManualOpen: () => void;

    // Drop Action Modal
    showDropActionModal: boolean;
    dropSourceCommit: CommitNode | null;
    dropTargetCommit: CommitNode | null;
    dropSimulation: ConflictSimulationResult | null;
    dropModalPosition: { x: number; y: number };
    onCherryPickDrop: (source: CommitNode, target: CommitNode) => Promise<void>;
    onMergeDrop: (source: CommitNode, target: CommitNode) => Promise<void>;
    onRebaseDrop?: (source: CommitNode, target: CommitNode) => Promise<void>;
    onCloseDropAction: () => void;

    // Worktree Manager
    showWorktreeModal: boolean;
    worktrees: WorktreeInfo[];
    branches: BranchInfo[];
    isWorktreeLoading: boolean;
    onCloseWorktree: () => void;
    onCreateWorktree: (name: string, targetPath: string, branchName?: string) => Promise<void>;
    onDeleteWorktree: (name: string) => Promise<void>;
    onOpenWorktreeFolder: (path: string) => void;

    // Trash Inspector
    showTrashModal: boolean;
    trashSnapshots: TrashSnapshotItem[];
    isTrashLoading: boolean;
    onCloseTrash: () => void;
    onRestoreTrash: (snapshotId: number) => Promise<void>;
    onDeleteTrash: (snapshotId: number) => Promise<void>;

    // Bisect Wizard
    showBisectModal: boolean;
    bisectStatus: BisectStatus | null;
    commits: CommitNode[];
    isBisectLoading: boolean;
    onStartBisect: (badId: string, goodId: string) => Promise<void>;
    onBisectStep: (isGood: boolean) => Promise<void>;
    onAbortBisect: () => Promise<void>;
    onCloseBisect: () => void;

    // Time Machine Drawer
    showTimeMachineDrawer: boolean;
    actionRecords: ActionRecord[];
    isActionLoading: boolean;
    onUndoAction: () => Promise<void>;
    onRedoAction: () => Promise<void>;
    onTimeTravel: (id: number) => Promise<void>;
    onCloseTimeMachine: () => void;

    // Command Palette
    showCommandPalette: boolean;
    tags: TagInfo[];
    onSelectBranch: (branch: BranchInfo) => void;
    onChangeViewMode: (mode: ViewMode) => void;
    onOpenTrash: () => void;
    onOpenWorktreesModal: () => void;
    onOpenBisect: () => void;
    onOpenTimeMachine: () => void;
    onOpenAI: () => void;
    onSmartSync: () => void;
    onStageAll: () => void;
    onUnstageAll: () => void;
    onDiscardAll: () => void;
    onPush: () => void;
    onPull: () => void;
    onFetch: () => void;
    onCloseCommandPalette: () => void;

    // AI Assistant Modal
    showAIModal: boolean;
    aiDiffContext: string;
    conflictDetail: ConflictFileDetail | null;
    onApplyCommitMessage: (msg: string) => void;
    onCloseAI: () => void;

    // Submodules & LFS
    showSubmoduleModal: boolean;
    onCloseSubmodule: () => void;
    showLfsModal: boolean;
    onCloseLfs: () => void;

    // Auth Credential Modal
    showAuthModal: boolean;
    authModalType: string;
    authModalRemoteUrl: string;
    onConfirmAuth: (creds: GitCredentials, profile?: AccountProfile) => void;
    onCancelAuth: () => void;

    // Delete Branch Modal
    showDeleteBranchModal?: boolean;
    deletingBranch?: BranchInfo | null;
    isDeleteBranchLoading?: boolean;
    onCloseDeleteBranch?: () => void;
    onConfirmDeleteBranch?: (branch: BranchInfo, deleteOnRemoteServer?: boolean) => Promise<void>;

    // Welcome Screen
    showWelcomeScreen: boolean;
    activeAccount: AccountProfile | null;
    recentRepos: string[];
    onSelectRepo: (path: string) => void;
    onOpenAuthFromWelcome: () => void;
    onCloseWelcome: () => void;

    // Init Repo Dialog
    showInitRepoModal?: boolean;
    initRepoPath?: string;
    onConfirmInitRepo?: (defaultBranch: string) => Promise<void> | void;
    onCloseInitRepo?: () => void;

    // Publish to GitHub Modal
    showPublishModal?: boolean;
    publishRepoPath?: string;
    publishRepoName?: string;
    publishCurrentBranch?: string;
    onPublishSuccess?: () => void;
    onClosePublish?: () => void;

    // User Guide / Playbook
    showGuideModal?: boolean;
    onCloseGuide?: () => void;

    // Create Tag Modal
    showCreateTagModal?: boolean;
    tagTargetCommit?: CommitNode | null;
    isCreateTagLoading?: boolean;
    onCloseCreateTag?: () => void;
    onConfirmCreateTag?: (tagName: string, message?: string) => Promise<void>;

    // Squash Commits Modal
    showSquashModal?: boolean;
    squashTargetCommits?: CommitNode[];
    isSquashLoading?: boolean;
    onCloseSquash?: () => void;
    onConfirmSquash?: (commitIds: string[], message: string) => Promise<void>;

    // Clean Merged Branches Modal
    showCleanMergedModal?: boolean;
    mergedBranches?: string[];
    isCleanMergedLoading?: boolean;
    onCloseCleanMerged?: () => void;
    onConfirmCleanMerged?: (branchesToDelete: string[]) => Promise<void>;

    // Create Branch Modal
    showCreateBranchModal?: boolean;
    createBranchBaseRef?: string;
    currentBranchName?: string;
    onConfirmCreateBranch?: (name: string, targetRef: string, checkout: boolean) => Promise<void>;
    onCloseCreateBranch?: () => void;

    // Quick Hotfix Modal
    showQuickHotfixModal?: boolean;
    dirtyFilesCount?: number;
    onStartQuickHotfix?: (hotfixBranchName: string, baseBranch: string) => Promise<void> | void;
    onCloseQuickHotfix?: () => void;

    // Nuke History Modal
    showNukeModal?: boolean;
    nukeTargetFilePath?: string;
    onConfirmNukeFile?: (path: string) => Promise<void>;
    onCloseNukeModal?: () => void;

    // Remote Manager Modal
    showRemoteManagerModal?: boolean;
    onCloseRemoteManager?: () => void;
    onRemotesChanged?: () => Promise<void>;

    // Interactive Rebase Modal
    showInteractiveRebaseModal?: boolean;
    interactiveRebaseOntoCommit?: CommitNode | null;
    onCloseInteractiveRebase?: () => void;
    onInteractiveRebaseSuccess?: (res: { status: string }) => Promise<void>;

    // Identity Switcher Modal
    showIdentityModal?: boolean;
    onCloseIdentityModal?: () => void;
    onIdentityChanged?: () => Promise<void>;

    // Git Playbook Recipes Modal
    showPlaybookModal?: boolean;
    onClosePlaybookModal?: () => void;
    onPlaybookOpenTrash?: () => void;
    onPlaybookOpenTimeMachine?: () => void;
    onRepoRefreshed?: () => Promise<void>;

    // Create Pull Request Modal
    showCreatePRModal?: boolean;
    originRemoteUrl?: string | null;
    createPRSourceBranch?: string | null;
    onCloseCreatePR?: () => void;
    onCreatePRSuccess?: (newPR?: any) => Promise<void> | void;
  }

  let {
    currentRepoPath = '',
    showOpenDialog = false,
    inputRepoPath = $bindable(''),
    onCloseOpenDialog,
    onConfirmManualOpen,
    showDropActionModal = false,
    dropSourceCommit = null,
    dropTargetCommit = null,
    dropSimulation = null,
    dropModalPosition = { x: 0, y: 0 },
    onCherryPickDrop,
    onMergeDrop,
    onRebaseDrop,
    onCloseDropAction,
    showWorktreeModal = false,
    worktrees = [],
    branches = [],
    isWorktreeLoading = false,
    onCloseWorktree,
    onCreateWorktree,
    onDeleteWorktree,
    onOpenWorktreeFolder,
    showTrashModal = false,
    trashSnapshots = [],
    isTrashLoading = false,
    onCloseTrash,
    onRestoreTrash,
    onDeleteTrash,
    showBisectModal = false,
    bisectStatus = null,
    commits = [],
    isBisectLoading = false,
    onStartBisect,
    onBisectStep,
    onAbortBisect,
    onCloseBisect,
    showTimeMachineDrawer = false,
    actionRecords = [],
    isActionLoading = false,
    onUndoAction,
    onRedoAction,
    onTimeTravel,
    onCloseTimeMachine,
    showCommandPalette = false,
    tags = [],
    onSelectBranch,
    onChangeViewMode,
    onOpenTrash,
    onOpenWorktreesModal,
    onOpenBisect,
    onOpenTimeMachine,
    onOpenAI,
    onSmartSync,
    onStageAll,
    onUnstageAll,
    onDiscardAll,
    onPush,
    onPull,
    onFetch,
    onCloseCommandPalette,
    showAIModal = false,
    aiDiffContext = '',
    conflictDetail = null,
    onApplyCommitMessage,
    onCloseAI,
    showSubmoduleModal = false,
    onCloseSubmodule,
    showLfsModal = false,
    onCloseLfs,
    showAuthModal = false,
    authModalType = 'token',
    authModalRemoteUrl = 'origin',
    onConfirmAuth,
    onCancelAuth,
    showDeleteBranchModal = false,
    deletingBranch = null,
    isDeleteBranchLoading = false,
    onCloseDeleteBranch = () => {},
    onConfirmDeleteBranch = async () => {},
    showWelcomeScreen = false,
    activeAccount = null,
    recentRepos = [],
    onSelectRepo,
    onOpenAuthFromWelcome,
    onCloseWelcome,
    showInitRepoModal = false,
    initRepoPath = '',
    onConfirmInitRepo,
    onCloseInitRepo,
    showPublishModal = false,
    publishRepoPath = '',
    publishRepoName = '',
    publishCurrentBranch = 'main',
    onPublishSuccess = () => {},
    onClosePublish = () => {},
    showGuideModal = false,
    onCloseGuide,
    showCreateTagModal = false,
    tagTargetCommit = null,
    isCreateTagLoading = false,
    onCloseCreateTag,
    onConfirmCreateTag,
    showSquashModal = false,
    squashTargetCommits = [],
    isSquashLoading = false,
    onCloseSquash,
    onConfirmSquash,
    showCleanMergedModal = false,
    mergedBranches = [],
    isCleanMergedLoading = false,
    onCloseCleanMerged,
    onConfirmCleanMerged,
    showCreateBranchModal = false,
    createBranchBaseRef = '',
    currentBranchName = 'main',
    onConfirmCreateBranch,
    onCloseCreateBranch,
    showQuickHotfixModal = false,
    dirtyFilesCount = 0,
    onStartQuickHotfix,
    onCloseQuickHotfix,
    showNukeModal = false,
    nukeTargetFilePath = '',
    onConfirmNukeFile,
    onCloseNukeModal,
    showRemoteManagerModal = false,
    onCloseRemoteManager,
    onRemotesChanged,
    showInteractiveRebaseModal = false,
    interactiveRebaseOntoCommit = null,
    onCloseInteractiveRebase,
    onInteractiveRebaseSuccess,
    showIdentityModal = false,
    onCloseIdentityModal,
    onIdentityChanged,
    showPlaybookModal = false,
    onClosePlaybookModal,
    onPlaybookOpenTrash,
    onPlaybookOpenTimeMachine,
    onRepoRefreshed,
    showCreatePRModal = false,
    originRemoteUrl = '',
    createPRSourceBranch = '',
    onCloseCreatePR,
    onCreatePRSuccess,
  }: Props = $props();
</script>

<!-- Open Repo Modal Dialog -->
{#if showOpenDialog}
  <div class="fixed inset-0 z-50 bg-black/50 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <GitFork class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Open Git Repository
        </h3>
        <button
          onclick={onCloseOpenDialog}
          class="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 text-sm cursor-pointer"
        >
          ✕
        </button>
      </div>

      <p class="text-xs text-zinc-600 dark:text-zinc-400">
        Enter absolute directory path to a Git repository on your system:
      </p>

      <input
        type="text"
        bind:value={inputRepoPath}
        placeholder="f:/Dev/product/git-tool"
        class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-cyan-500"
      />

      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          onclick={onCloseOpenDialog}
          class="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-transparent text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={onConfirmManualOpen}
          class="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs cursor-pointer shadow-lg shadow-cyan-600/30 transition-all"
        >
          Open Repo
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Drop Action Modal for Drag & Drop Execution -->
<DropActionModal
  isOpen={showDropActionModal}
  sourceCommit={dropSourceCommit}
  targetCommit={dropTargetCommit}
  simulation={dropSimulation}
  position={dropModalPosition}
  onCherryPick={onCherryPickDrop}
  onMerge={onMergeDrop}
  onRebase={onRebaseDrop}
  onCancel={onCloseDropAction}
/>

<!-- Git Worktree Manager Modal -->
<WorktreeManager
  isOpen={showWorktreeModal}
  {worktrees}
  {branches}
  isLoading={isWorktreeLoading}
  onClose={onCloseWorktree}
  onCreateWorktree={onCreateWorktree}
  onDeleteWorktree={onDeleteWorktree}
  onOpenWorktree={onOpenWorktreeFolder}
/>

<!-- Safe Discard 48h Trash Inspector Modal -->
<TrashInspector
  isOpen={showTrashModal}
  snapshots={trashSnapshots}
  isLoading={isTrashLoading}
  onClose={onCloseTrash}
  onRestore={onRestoreTrash}
  onDelete={onDeleteTrash}
/>

<!-- Visual Git Bisect Bug Hunter Modal -->
<BisectWizard
  isOpen={showBisectModal}
  status={bisectStatus}
  {commits}
  isLoading={isBisectLoading}
  onStartBisect={onStartBisect}
  onBisectStep={onBisectStep}
  onAbortBisect={onAbortBisect}
  onClose={onCloseBisect}
/>

<!-- Safe-Flight Time Machine Drawer -->
<TimeMachineDrawer
  isOpen={showTimeMachineDrawer}
  actions={actionRecords}
  isLoading={isActionLoading}
  onUndo={onUndoAction}
  onRedo={onRedoAction}
  onTimeTravel={onTimeTravel}
  onClose={onCloseTimeMachine}
/>

<!-- Command Palette (Ctrl + K) -->
<CommandPalette
  isOpen={showCommandPalette}
  {branches}
  {tags}
  onSelectBranch={onSelectBranch}
  onChangeViewMode={onChangeViewMode}
  onOpenTrash={onOpenTrash}
  onOpenWorktrees={onOpenWorktreesModal}
  onOpenBisect={onOpenBisect}
  onOpenTimeMachine={onOpenTimeMachine}
  onOpenAI={onOpenAI}
  onSmartSync={onSmartSync}
  onStageAll={onStageAll}
  onUnstageAll={onUnstageAll}
  onDiscardAll={onDiscardAll}
  onUndo={onUndoAction}
  onRedo={onRedoAction}
  onPush={onPush}
  onPull={onPull}
  onFetch={onFetch}
  onOpenGuide={() => { showGuideModal = true; }}
  onClose={onCloseCommandPalette}
/>

<!-- Local AI Assistant Modal -->
<AIAssistantModal
  isOpen={showAIModal}
  diffContext={aiDiffContext}
  {conflictDetail}
  onApplyCommitMessage={onApplyCommitMessage}
  onClose={onCloseAI}
/>

<!-- Git Submodules Explorer Modal -->
<SubmoduleManager
  repoPath={currentRepoPath}
  isOpen={showSubmoduleModal}
  onClose={onCloseSubmodule}
/>

<!-- Git LFS Asset Manager Modal -->
<LfsManager
  repoPath={currentRepoPath}
  isOpen={showLfsModal}
  onClose={onCloseLfs}
/>

<!-- Interactive SSH Passphrase & HTTPS Auth Modal -->
<AuthCredentialModal
  isOpen={showAuthModal}
  authType={authModalType}
  remoteUrl={authModalRemoteUrl}
  onConfirm={onConfirmAuth}
  onCancel={onCancelAuth}
/>

<!-- Safe Delete Branch Modal Dialog -->
<DeleteBranchModal
  show={showDeleteBranchModal}
  branch={deletingBranch}
  isLoading={isDeleteBranchLoading}
  onClose={onCloseDeleteBranch}
  onConfirmDelete={onConfirmDeleteBranch}
/>

<!-- Welcome / Onboarding Screen -->
<WelcomeScreen
  isOpen={showWelcomeScreen}
  {activeAccount}
  {recentRepos}
  onSelectRepo={onSelectRepo}
  onOpenAuth={onOpenAuthFromWelcome}
  onClose={onCloseWelcome}
/>

<!-- FlowGit Playbook & Real-World User Guide Modal -->
<UserGuideModal
  isOpen={showGuideModal}
  onClose={() => onCloseGuide?.()}
/>

<!-- Create Tag Modal -->
<CreateTagModal
  isOpen={showCreateTagModal}
  commit={tagTargetCommit}
  isLoading={isCreateTagLoading}
  onClose={() => onCloseCreateTag?.()}
  onConfirm={async (name, msg) => {
    if (onConfirmCreateTag) await onConfirmCreateTag(name, msg);
  }}
/>

<!-- Squash Commits Modal -->
<SquashModal
  isOpen={showSquashModal}
  commits={squashTargetCommits}
  isLoading={isSquashLoading}
  onClose={() => onCloseSquash?.()}
  onConfirmSquash={async (ids, msg) => {
    if (onConfirmSquash) await onConfirmSquash(ids, msg);
  }}
/>

<!-- Clean Merged Branches Modal -->
<CleanMergedBranchesModal
  isOpen={showCleanMergedModal}
  {mergedBranches}
  isLoading={isCleanMergedLoading}
  onClose={() => onCloseCleanMerged?.()}
  onConfirmDelete={async (branches) => {
    if (onConfirmCleanMerged) await onConfirmCleanMerged(branches);
  }}
/>

<!-- Init Repository Dialog (when directory is not a Git repo) -->
<InitRepoDialog
  isOpen={showInitRepoModal}
  folderPath={initRepoPath}
  onInit={async (branch) => {
    if (onConfirmInitRepo) await onConfirmInitRepo(branch);
  }}
  onCancel={() => onCloseInitRepo?.()}
/>

<!-- Publish to GitHub Modal -->
<PublishRepoModal
  isOpen={showPublishModal}
  repoPath={publishRepoPath}
  repoName={publishRepoName}
  currentBranch={publishCurrentBranch}
  {activeAccount}
  onSuccess={onPublishSuccess}
  onClose={onClosePublish}
/>

<!-- Create Branch Modal -->
{#if showCreateBranchModal}
  <CreateBranchModal
    open={showCreateBranchModal}
    {branches}
    currentBranch={createBranchBaseRef || currentBranchName || "main"}
    onConfirm={async (name, targetRef, checkout) => {
      if (onConfirmCreateBranch) await onConfirmCreateBranch(name, targetRef, checkout);
    }}
    onClose={() => onCloseCreateBranch?.()}
  />
{/if}

<!-- Quick Hotfix Modal -->
<QuickHotfixModal
  isOpen={showQuickHotfixModal}
  currentBranch={currentBranchName || ""}
  {dirtyFilesCount}
  {branches}
  onStartHotfix={async (name, base) => {
    if (onStartQuickHotfix) await onStartQuickHotfix(name, base);
  }}
  onClose={() => onCloseQuickHotfix?.()}
/>

<!-- Nuke File from History Modal -->
<NukeHistoryModal
  isOpen={showNukeModal}
  filePath={nukeTargetFilePath}
  onConfirm={async (path) => {
    if (onConfirmNukeFile) await onConfirmNukeFile(path);
  }}
  onClose={() => onCloseNukeModal?.()}
/>

<!-- Multi-Remote Management Modal -->
<RemoteManagerModal
  isOpen={showRemoteManagerModal}
  repoPath={currentRepoPath}
  onClose={() => onCloseRemoteManager?.()}
  onRemotesChanged={onRemotesChanged}
/>

<!-- Interactive Rebase Modal -->
{#if showInteractiveRebaseModal}
  <InteractiveRebaseModal
    isOpen={showInteractiveRebaseModal}
    repoPath={currentRepoPath}
    ontoCommit={interactiveRebaseOntoCommit}
    onClose={() => onCloseInteractiveRebase?.()}
    onSuccess={onInteractiveRebaseSuccess}
  />
{/if}

<!-- Git Identity Profile Switcher Modal -->
<IdentitySwitcherModal
  isOpen={showIdentityModal}
  repoPath={currentRepoPath}
  onClose={() => onCloseIdentityModal?.()}
  onIdentityChanged={onIdentityChanged}
/>

<!-- Git Emergency Playbook Recipes Modal -->
<GitPlaybookModal
  isOpen={showPlaybookModal}
  repoPath={currentRepoPath}
  currentBranch={currentBranchName || ""}
  onClose={() => onClosePlaybookModal?.()}
  onOpenTrash={() => onPlaybookOpenTrash?.()}
  onOpenTimeMachine={() => onPlaybookOpenTimeMachine?.()}
  onRepoRefreshed={onRepoRefreshed}
/>

<!-- Create Pull Request Modal -->
<CreatePullRequestModal
  isOpen={showCreatePRModal}
  remoteOriginUrl={originRemoteUrl}
  {branches}
  initialSourceBranch={createPRSourceBranch || ''}
  onClose={() => onCloseCreatePR?.()}
  onSuccess={(newPR) => onCreatePRSuccess?.(newPR)}
/>
