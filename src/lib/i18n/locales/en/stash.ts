export const stash = {
  shelf: {
    title: "Visual Stash Shelf",
    subtitle: "Browse stashes, inspect changed files, and preview line-by-line diffs with Monaco Diff Editor before applying.",
    stashesCount: "Stashes ({count})",
    emptyList: "No stashed changes found",
    emptyListDesc: "You can temporarily shelve your uncommitted work using the 'New Stash' button below or from the Commit Box.",
    createNew: "New Stash",
    stashIndex: "stash@{index}",
    createdTime: "{time}",
    branchOrigin: "Branch: {branch}",
    changedFiles: "Changed Files ({count})",
    noFilesChanged: "No files changed in this stash.",
    totalStats: "+{additions} / -{deletions} lines",
    
    // Actions
    applyBtn: "Apply Stash",
    applyTooltip: "Apply these changes to the working directory while keeping the stash",
    popBtn: "Pop Stash",
    popTooltip: "Apply changes to the working directory and delete this stash",
    branchBtn: "Branch from Stash",
    branchTooltip: "Create a new Git branch anchored to this stash and check it out",
    dropBtn: "Drop Stash",
    dropTooltip: "Permanently delete this stash from Git",
    
    // Dialogs & Notifications
    confirmDropTitle: "Confirm Drop Stash",
    confirmDropMessage: "Are you sure you want to permanently delete stash@{index} ('{message}')? This action cannot be undone.",
    dropSuccess: "Stash stash@{index} dropped successfully.",
    applySuccess: "Applied stash@{index} to working tree.",
    popSuccess: "Applied and popped stash@{index} successfully.",
    branchDialogTitle: "Create new branch from stash@{index}",
    branchNamePlaceholder: "New branch name (e.g. feature/restored-work)...",
    createBranchConfirm: "Create Branch & Checkout",
    branchSuccess: "Created branch '{branch}' and applied stash@{index} successfully.",
    
    // Quick Create Modal
    createModalTitle: "Create New Stash",
    messagePlaceholder: "Optional message describing these shelved changes...",
    includeUntracked: "Include untracked files",
    createConfirm: "Create Stash",
    createSuccess: "Changes stashed successfully.",

    // Diff view
    diffTitle: "Stash Changes Diff",
    splitView: "Split (2 Panes)",
    unifiedView: "Unified (1 Pane)",
    ignoreWhitespace: "Ignore Whitespace",
    binaryNotice: "This is a binary file; text diff cannot be displayed.",
    selectFilePrompt: "Select a file from the list on the left to preview its diff",
    loadingDetail: "Loading stash details...",
    loadingDiff: "Analyzing file diff...",
    untrackedBadge: "Untracked",
  },
};
