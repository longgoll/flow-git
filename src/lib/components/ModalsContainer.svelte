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
  import StashShelfDrawer from './StashShelfDrawer.svelte';
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
  import LostAndFoundModal from './LostAndFoundModal.svelte';
  import UpdateModal from './UpdateModal.svelte';
  import RepoInsightsModal from './RepoInsightsModal.svelte';
  import GitHooksModal from './GitHooksModal.svelte';
  import PatchManagerModal from './PatchManagerModal.svelte';
  import { resetToCommit } from '../api';
  import { toast } from '../state/toastState.svelte';
  import { localeState } from '../state/localeState.svelte';
  import type { ModalState } from '../state/modalState.svelte';
  import type { RepoState } from '../state/repoState.svelte';
  import type { WorkingTreeState } from '../state/workingTreeState.svelte';
  import type { GitSafetyState } from '../state/gitSafetyState.svelte';
  import type { RemoteState } from '../state/remoteState.svelte';
  import type { WorkspaceTabState } from '../state/workspaceTabState.svelte';
  import type {
    BranchInfo,
    CommitNode,
    ViewMode,
    WorktreeInfo,
  } from '../types';

  interface Props {
    modalState: ModalState;
    repo: RepoState;
    wt: WorkingTreeState;
    safety: GitSafetyState;
    remote: RemoteState;
    tabState: WorkspaceTabState;
    originRemoteUrl: string | null;

    // Operation handlers
    loadRepository: (path: string) => Promise<void>;
    refreshWorkingTreeAndDiff: () => Promise<void>;
    onChangeViewMode: (mode: ViewMode) => void;
    handleUndo: () => Promise<void>;
    handleRedo: () => Promise<void>;
    handlePushCurrentBranch: () => Promise<void>;
    handleConfirmDeleteBranch: (branch: BranchInfo, deleteOnRemoteServer?: boolean) => Promise<void>;
    handleConfirmCreateBranch: (name: string, targetRef: string, checkout: boolean) => Promise<void>;
    handleConfirmCreateTag: (tagName: string, message?: string) => Promise<void>;
    handleConfirmSquash: (commitIds: string[], message: string) => Promise<void>;
    handleConfirmCleanMerged: (branchesToDelete: string[]) => Promise<void>;
    handleStartQuickHotfix: (hotfixBranchName: string, baseBranch: string) => Promise<void>;
    handleConfirmNukeFile: (filePath: string) => Promise<void>;
    handleCherryPickDrop: (source: CommitNode, target: CommitNode) => Promise<void>;
    handleMergeDrop: (source: CommitNode, target: CommitNode) => Promise<void>;
    handleRebaseDrop: (source: CommitNode, target: CommitNode) => Promise<void>;
    handleCreateWorktree: (name: string, targetPath: string, branchName?: string) => Promise<void>;
    handleDeleteWorktree: (name: string) => Promise<void>;
    handleSelectWorktree: (wtItem: WorktreeInfo) => Promise<void>;
    handleConfirmInitRepo: (defaultBranch: string) => Promise<void>;
    loadRemotesList: (path: string) => Promise<void>;
    loadIdentity: (path: string) => Promise<void>;
    handleOpenAI: () => void;
    handleOpenWorktreesModal: () => void;
  }

  let {
    modalState,
    repo,
    wt,
    safety,
    remote,
    tabState,
    originRemoteUrl,
    loadRepository,
    refreshWorkingTreeAndDiff,
    onChangeViewMode,
    handleUndo,
    handleRedo,
    handlePushCurrentBranch,
    handleConfirmDeleteBranch,
    handleConfirmCreateBranch,
    handleConfirmCreateTag,
    handleConfirmSquash,
    handleConfirmCleanMerged,
    handleStartQuickHotfix,
    handleConfirmNukeFile,
    handleCherryPickDrop,
    handleMergeDrop,
    handleRebaseDrop,
    handleCreateWorktree,
    handleDeleteWorktree,
    handleSelectWorktree,
    handleConfirmInitRepo,
    loadRemotesList,
    loadIdentity,
    handleOpenAI,
    handleOpenWorktreesModal,
  }: Props = $props();
</script>

<!-- Open Repo Modal Dialog -->
{#if modalState.showOpenDialog}
  <div class="fixed inset-0 z-50 bg-black/50 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <GitFork class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          {localeState.t('modals.openRepo.title')}
        </h3>
        <button
          onclick={() => (modalState.showOpenDialog = false)}
          class="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 text-sm cursor-pointer"
        >
          ✕
        </button>
      </div>

      <p class="text-xs text-zinc-600 dark:text-zinc-400">
        {localeState.t('modals.openRepo.inputPrompt')}
      </p>

      <input
        type="text"
        bind:value={modalState.inputRepoPath}
        placeholder={localeState.t('modals.openRepo.placeholder')}
        class="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-cyan-500"
      />

      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          onclick={() => (modalState.showOpenDialog = false)}
          class="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-transparent text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors"
        >
          {localeState.t('common.cancel')}
        </button>
        <button
          onclick={async () => {
            if (modalState.inputRepoPath.trim()) {
              modalState.showOpenDialog = false;
              const tab = tabState.openTab({ path: modalState.inputRepoPath.trim() });
              await loadRepository(tab.path);
            }
          }}
          class="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs cursor-pointer shadow-lg shadow-cyan-600/30 transition-all"
        >
          {localeState.t('modals.openRepo.openBtn')}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Drop Action Modal for Drag & Drop Execution -->
<DropActionModal
  isOpen={modalState.showDropActionModal}
  sourceCommit={modalState.dropSourceCommit}
  targetCommit={modalState.dropTargetCommit}
  simulation={modalState.dropSimulation}
  position={modalState.dropModalPosition}
  onCherryPick={handleCherryPickDrop}
  onMerge={handleMergeDrop}
  onRebase={handleRebaseDrop}
  onCancel={() => modalState.closeDropAction()}
/>

<!-- Git Worktree Manager Modal -->
<WorktreeManager
  isOpen={modalState.showWorktreeModal}
  worktrees={repo.worktrees}
  branches={repo.branches}
  isLoading={modalState.isWorktreeLoading}
  onClose={() => (modalState.showWorktreeModal = false)}
  onCreateWorktree={handleCreateWorktree}
  onDeleteWorktree={handleDeleteWorktree}
  onOpenWorktree={(p) => {
    modalState.showWorktreeModal = false;
    const wtItem = repo.worktrees.find((w) => w.path === p);
    if (wtItem) {
      handleSelectWorktree(wtItem);
    } else {
      const tab = tabState.openTab({ path: p, isWorktree: true });
      loadRepository(tab.path);
    }
  }}
/>

<!-- Safe Discard 48h Trash Inspector Modal -->
<TrashInspector
  isOpen={safety.showTrashModal}
  snapshots={safety.trashSnapshots}
  isLoading={safety.isTrashLoading}
  onClose={() => (safety.showTrashModal = false)}
  onRestore={(id) => safety.restoreTrash(repo.currentRepoPath, id, refreshWorkingTreeAndDiff)}
  onRestoreAll={() => safety.restoreAllTrash(repo.currentRepoPath, refreshWorkingTreeAndDiff)}
  onDelete={(id) => safety.deleteTrash(repo.currentRepoPath, id)}
/>

<!-- Visual Git Bisect Bug Hunter Modal -->
<BisectWizard
  isOpen={safety.showBisectModal}
  status={safety.bisectStatus}
  commits={repo.rawCommits}
  isLoading={safety.isBisectLoading}
  onStartBisect={async (bad, good) => {
    await safety.startBisect(repo.currentRepoPath, bad, good, () =>
      loadRepository(repo.currentRepoPath)
    );
  }}
  onBisectStep={async (isGood) => {
    await safety.bisectStep(repo.currentRepoPath, isGood, () =>
      loadRepository(repo.currentRepoPath)
    );
  }}
  onRunAutoBisect={async (script) => {
    await safety.runAutoBisect(repo.currentRepoPath, script, () =>
      loadRepository(repo.currentRepoPath)
    );
  }}
  onAbortBisect={() =>
    safety.abortBisect(repo.currentRepoPath, () =>
      loadRepository(repo.currentRepoPath)
    )
  }
  onClose={() => (safety.showBisectModal = false)}
/>

<!-- Safe-Flight Time Machine Drawer -->
<TimeMachineDrawer
  isOpen={safety.showTimeMachineDrawer}
  actions={safety.actionRecords}
  isLoading={safety.isActionLoading}
  onUndo={handleUndo}
  onRedo={handleRedo}
  onTimeTravel={(id) =>
    safety.timeTravel(repo.currentRepoPath, id, () =>
      loadRepository(repo.currentRepoPath)
    )
  }
  onOpenLostAndFound={() => safety.openLostAndFound(repo.currentRepoPath)}
  onClose={() => (safety.showTimeMachineDrawer = false)}
/>

<!-- Visual Stash Shelf Drawer with Monaco Diff Preview -->
<StashShelfDrawer
  isOpen={modalState.showStashShelfDrawer}
  repoPath={repo.currentRepoPath}
  stashes={repo.stashes}
  initialIndex={modalState.selectedStashIndex}
  onClose={() => (modalState.showStashShelfDrawer = false)}
  onRefresh={async () => {
    await loadRepository(repo.currentRepoPath);
    await refreshWorkingTreeAndDiff();
  }}
/>

<!-- Visual Reflog & Lost and Found Modal -->
<LostAndFoundModal
  isOpen={safety.showLostAndFoundModal}
  repoPath={repo.currentRepoPath}
  reflogEntries={safety.reflogEntries}
  isLoading={safety.isReflogLoading}
  onRescueCommit={async (commitId, branchName) => {
    await safety.rescueCommitToBranch(
      repo.currentRepoPath,
      commitId,
      branchName,
      () => loadRepository(repo.currentRepoPath)
    );
  }}
  onResetToCommit={async (commitId) => {
    try {
      await resetToCommit(repo.currentRepoPath, commitId, 'mixed');
      toast.info(
        localeState.t('safety.lostAndFound.resetSuccess', { sha: commitId.slice(0, 7) })
      );
      await loadRepository(repo.currentRepoPath);
      await refreshWorkingTreeAndDiff();
      await safety.refreshReflog(repo.currentRepoPath);
    } catch (err: any) {
      toast.error('Reset failed', err?.message || String(err));
    }
  }}
  onClose={() => (safety.showLostAndFoundModal = false)}
/>

<!-- Command Palette (Ctrl + K) -->
<CommandPalette
  isOpen={modalState.showCommandPalette}
  branches={repo.branches}
  tags={repo.tags}
  onSelectBranch={(b) => repo.handleSelectBranch(b)}
  onChangeViewMode={(mode: ViewMode) => onChangeViewMode(mode)}
  onOpenTrash={() => safety.openTrash(repo.currentRepoPath)}
  onOpenWorktrees={handleOpenWorktreesModal}
  onOpenBisect={() => safety.openBisect(repo.currentRepoPath)}
  onOpenTimeMachine={() => safety.openTimeMachine(repo.currentRepoPath)}
  onOpenLostAndFound={() => safety.openLostAndFound(repo.currentRepoPath)}
  onOpenStashShelf={() => modalState.openStashShelf(0)}
  onOpenAI={handleOpenAI}
  onSmartSync={async () => {
    const res = await remote.runSmartSync(
      repo.currentRepoPath,
      undefined,
      () => loadRepository(repo.currentRepoPath)
    );
    repo.statusMessage = res.message;
  }}
  onStageAll={() => wt.stageAll(repo.currentRepoPath, refreshWorkingTreeAndDiff)}
  onUnstageAll={() => wt.unstageAll(repo.currentRepoPath, refreshWorkingTreeAndDiff)}
  onDiscardAll={async () => {
    const ids = await wt.discardAll(repo.currentRepoPath, refreshWorkingTreeAndDiff);
    await safety.refreshTrashSnapshots(repo.currentRepoPath);
    toast.warning(
      localeState.t('actions.switcher.discardedAllTitle'),
      localeState.t('actions.switcher.discardedAllMsg', { count: ids.length }),
      {
        label: localeState.t('actions.switcher.undoAllBtn'),
        onClick: async () => {
          await safety.restoreAllTrash(repo.currentRepoPath, refreshWorkingTreeAndDiff);
          toast.success(
            localeState.t('actions.switcher.restoredAllTitle'),
            localeState.t('actions.switcher.restoredAllMsg')
          );
        },
      }
    );
  }}
  onUndo={handleUndo}
  onRedo={handleRedo}
  onPush={handlePushCurrentBranch}
  onPull={() =>
    remote.executeRemote(
      repo.currentRepoPath,
      'pull',
      'origin',
      undefined,
      false,
      () => loadRepository(repo.currentRepoPath)
    )
  }
  onFetch={() =>
    remote.executeRemote(
      repo.currentRepoPath,
      'fetch',
      'origin',
      undefined,
      false,
      () => loadRepository(repo.currentRepoPath)
    )
  }
  onOpenGuide={() => { modalState.showGuideModal = true; }}
  onOpenInsights={() => modalState.openInsights()}
  onOpenGitHooks={() => modalState.openGitHooks()}
  onClose={() => (modalState.showCommandPalette = false)}
/>

<!-- Local AI Assistant Modal -->
<AIAssistantModal
  isOpen={modalState.showAIModal}
  diffContext={modalState.aiDiffContext}
  conflictDetail={safety.conflictFileDetail}
  onApplyCommitMessage={(msg) =>
    (repo.statusMessage = `AI message: ${msg.slice(0, 40)}...`)}
  onClose={() => (modalState.showAIModal = false)}
/>

<!-- Git Submodules Explorer Modal -->
<SubmoduleManager
  repoPath={repo.currentRepoPath}
  isOpen={modalState.showSubmoduleModal}
  onClose={() => (modalState.showSubmoduleModal = false)}
  onOpenSubmoduleRepo={(subPath) => {
    loadRepository(subPath);
    modalState.showSubmoduleModal = false;
  }}
/>

<!-- Git LFS Asset Manager Modal -->
<LfsManager
  repoPath={repo.currentRepoPath}
  isOpen={modalState.showLfsModal}
  onClose={() => (modalState.showLfsModal = false)}
/>

<!-- Interactive SSH Passphrase & HTTPS Auth Modal -->
<AuthCredentialModal
  isOpen={remote.showAuthModal}
  authType={remote.authModalType}
  remoteUrl={remote.authModalRemoteUrl}
  onConfirm={(creds, profile) =>
    remote.confirmAuth(creds, profile, repo.currentRepoPath, () =>
      loadRepository(repo.currentRepoPath)
    )
  }
  onCancel={() => remote.cancelAuth()}
/>

<!-- Safe Delete Branch Modal Dialog -->
<DeleteBranchModal
  show={modalState.showDeleteBranchModal}
  branch={modalState.deletingBranch}
  isLoading={modalState.isDeleteBranchLoading}
  onClose={() => modalState.closeDeleteBranch()}
  onConfirmDelete={handleConfirmDeleteBranch}
/>

<!-- Welcome / Onboarding Screen -->
<WelcomeScreen
  isOpen={repo.showWelcomeScreen}
  activeAccount={remote.activeAccount}
  recentRepos={repo.recentRepos}
  onSelectRepo={async (path) => {
    repo.showWelcomeScreen = false;
    try {
      const tab = tabState.openTab({ path });
      await loadRepository(tab.path);
    } catch (err: any) {
      toast.error(localeState.t('actions.switcher.openRepoError'), err?.message || String(err));
    }
  }}
  onOpenAuth={() => (remote.showAuthModal = true)}
  onClose={() => (repo.showWelcomeScreen = false)}
/>

<!-- FlowGit Playbook & Real-World User Guide Modal -->
<UserGuideModal
  isOpen={modalState.showGuideModal}
  onClose={() => (modalState.showGuideModal = false)}
/>

<!-- Create Tag Modal -->
<CreateTagModal
  isOpen={modalState.showCreateTagModal}
  commit={modalState.tagTargetCommit}
  isLoading={modalState.isCreateTagLoading}
  onClose={() => modalState.closeCreateTag()}
  onConfirm={async (name, msg) => {
    await handleConfirmCreateTag(name, msg);
  }}
/>

<!-- Squash Commits Modal -->
<SquashModal
  isOpen={modalState.showSquashModal}
  commits={modalState.squashTargetCommits}
  isLoading={modalState.isSquashLoading}
  onClose={() => modalState.closeSquash()}
  onConfirmSquash={async (ids, msg) => {
    await handleConfirmSquash(ids, msg);
  }}
/>

<!-- Clean Merged Branches Modal -->
<CleanMergedBranchesModal
  isOpen={modalState.showCleanMergedModal}
  mergedBranches={modalState.mergedBranches}
  isLoading={modalState.isCleanMergedLoading}
  onClose={() => (modalState.showCleanMergedModal = false)}
  onConfirmDelete={async (branches) => {
    await handleConfirmCleanMerged(branches);
  }}
/>

<!-- Init Repository Dialog (when directory is not a Git repo) -->
<InitRepoDialog
  isOpen={modalState.showInitRepoModal}
  folderPath={modalState.initRepoPath}
  onInit={async (branch) => {
    await handleConfirmInitRepo(branch);
  }}
  onCancel={() => {
    modalState.showInitRepoModal = false;
    modalState.initRepoPath = '';
  }}
/>

<!-- Publish to GitHub Modal -->
<PublishRepoModal
  isOpen={modalState.showPublishModal}
  repoPath={modalState.publishRepoPath || repo.currentRepoPath}
  repoName={modalState.publishRepoName || repo.repoSummary?.name || ''}
  currentBranch={modalState.publishCurrentBranch || repo.repoSummary?.current_branch || 'main'}
  activeAccount={remote.activeAccount}
  onSuccess={async () => {
    if (repo.currentRepoPath) await loadRemotesList(repo.currentRepoPath);
  }}
  onClose={() => (modalState.showPublishModal = false)}
/>

<!-- Create Branch Modal -->
{#if modalState.showCreateBranchModal}
  <CreateBranchModal
    open={modalState.showCreateBranchModal}
    branches={repo.branches}
    currentBranch={modalState.createBranchBaseRef || repo.repoSummary?.current_branch || 'main'}
    onConfirm={async (name, targetRef, checkout) => {
      await handleConfirmCreateBranch(name, targetRef, checkout);
    }}
    onClose={() => modalState.closeCreateBranch()}
  />
{/if}

<!-- Quick Hotfix Modal -->
<QuickHotfixModal
  isOpen={modalState.showHotfixModal}
  currentBranch={repo.repoSummary?.current_branch || ''}
  dirtyFilesCount={wt.workingTreeStatus?.total_dirty_count || 0}
  branches={repo.branches}
  onStartHotfix={async (name, base) => {
    await handleStartQuickHotfix(name, base);
  }}
  onClose={() => (modalState.showHotfixModal = false)}
/>

<!-- Nuke File from History Modal -->
<NukeHistoryModal
  isOpen={modalState.showNukeModal}
  filePath={modalState.nukeTargetFilePath}
  onConfirm={async (path) => {
    await handleConfirmNukeFile(path);
  }}
  onClose={() => modalState.closeNukeFile()}
/>

<!-- Multi-Remote Management Modal -->
<RemoteManagerModal
  isOpen={modalState.showRemoteManagerModal}
  repoPath={repo.currentRepoPath}
  onClose={() => (modalState.showRemoteManagerModal = false)}
  onRemotesChanged={async () => {
    if (repo.currentRepoPath) {
      await loadRepository(repo.currentRepoPath);
      await loadRemotesList(repo.currentRepoPath);
    }
  }}
/>

<!-- Interactive Rebase Modal -->
{#if modalState.showInteractiveRebaseModal}
  <InteractiveRebaseModal
    isOpen={modalState.showInteractiveRebaseModal}
    repoPath={repo.currentRepoPath}
    ontoCommit={modalState.interactiveRebaseOntoCommit}
    onClose={() => modalState.closeInteractiveRebase()}
    onSuccess={async (res) => {
      if (res.status === 'completed') {
        await loadRepository(repo.currentRepoPath);
      } else if (res.status === 'conflict') {
        safety.isRebasing = true;
        await safety.loadConflictFiles(repo.currentRepoPath);
        onChangeViewMode('conflict');
      }
    }}
  />
{/if}

<!-- Git Identity Profile Switcher Modal -->
<IdentitySwitcherModal
  isOpen={modalState.showIdentityModal}
  repoPath={repo.currentRepoPath}
  onClose={() => (modalState.showIdentityModal = false)}
  onIdentityChanged={async () => {
    if (repo.currentRepoPath) {
      await loadIdentity(repo.currentRepoPath);
    }
  }}
/>

<!-- Git Emergency Playbook Recipes Modal -->
<GitPlaybookModal
  isOpen={modalState.showPlaybookModal}
  repoPath={repo.currentRepoPath}
  currentBranch={repo.repoSummary?.current_branch || ''}
  onClose={() => (modalState.showPlaybookModal = false)}
  onOpenTrash={() => safety.openTrash(repo.currentRepoPath)}
  onOpenTimeMachine={() => safety.openTimeMachine(repo.currentRepoPath)}
  onOpenLostAndFound={() => safety.openLostAndFound(repo.currentRepoPath)}
  onRepoRefreshed={async () => {
    if (repo.currentRepoPath) {
      await loadRepository(repo.currentRepoPath);
    }
  }}
/>

<!-- Create Pull Request Modal -->
<CreatePullRequestModal
  isOpen={modalState.showCreatePRModal}
  remoteOriginUrl={originRemoteUrl}
  branches={repo.branches}
  activeAccount={remote.activeAccount}
  onOpenAuth={() => (remote.showAuthModal = true)}
  initialSourceBranch={modalState.createPRSourceBranch || ''}
  onClose={() => modalState.closeCreatePR()}
  onSuccess={async (newPR) => {
    modalState.closeCreatePR();
    onChangeViewMode('pr');
    remote.triggerPRRefresh(newPR);
    if (repo.currentRepoPath) {
      await loadRepository(repo.currentRepoPath);
    }
  }}
/>

<!-- FlowGit Auto-Updater Modal -->
<UpdateModal />

<!-- Repository Pulse & Insights Modal -->
{#if modalState.showInsightsModal}
  <RepoInsightsModal
    {repo}
    onClose={() => modalState.closeInsights()}
  />
{/if}

<!-- Git Hooks Manager Modal -->
{#if modalState.showGitHooksModal && repo.currentRepoPath}
  <GitHooksModal
    repoPath={repo.currentRepoPath}
    onClose={() => modalState.closeGitHooks()}
  />
{/if}

<!-- Patch File Manager Modal (Export / Apply) -->
{#if modalState.showPatchModal}
  <PatchManagerModal
    {repo}
    initialMode={modalState.patchModalMode}
    initialCommitId={modalState.patchModalCommitId}
    onApplySuccess={refreshWorkingTreeAndDiff}
    onClose={() => modalState.closePatchModal()}
  />
{/if}


