import type { patch as viPatch } from "../vi/patch";

export const patch: typeof viPatch = {
  title: "Patch File Manager",
  subtitle: "Export commits as patch files or apply external changes directly to your working tree",
  badge: "Patch Engine",
  commandTitle: "Apply Patch File (.patch / .diff) to Working Tree",
  contextExport: "Export as Patch (.patch)...",
  close: "Close",

  // Tabs
  tabApply: "Apply Patch",
  tabExport: "Export Patch",

  // Export Tab
  exportTitle: "Export Commit to Patch File",
  exportSubtitle: "Generate standard patch compatible with `git format-patch` and `git apply`",
  commitLabel: "Selected commit:",
  copyToClipboard: "Copy Patch Content",
  copied: "Copied to clipboard!",
  saveAsFile: "Save as .patch File...",
  savedSuccess: "Patch file saved successfully!",
  generatingPatch: "Generating patch from commit...",
  emptyPatch: "This commit has no file changes.",

  // Apply Tab
  applyTitle: "Import & Apply Patch",
  applySubtitle: "Drag & drop a .patch/.diff file or paste patch contents below",
  browseFile: "Browse File...",
  dropHint: "Drag and drop .patch or .diff file here",
  orPaste: "or paste patch text directly:",
  pastePlaceholder: "Paste unified diff or format-patch text here (starts with '--- a/...' or 'diff --git ...')...",
  optionsTitle: "Application Options",
  stageToIndex: "Stage directly to Index",
  stageToIndexDesc: "Automatically add affected files into the Staging area upon application",
  applyReverse: "Apply in reverse",
  applyReverseDesc: "Invert patch changes (useful for undoing previously applied patches)",

  // Validation / Dry-Run
  dryRunTitle: "Dry-Run Applicability Check",
  checking: "Validating...",
  statusClean: "Clean (Ready) — Patch applies cleanly with zero conflicts",
  statusConflict: "Cannot apply cleanly — Target file(s) might be missing or content diverged",
  affectedFiles: "Affected Files ({count})",
  noFiles: "No file deltas discovered in patch.",
  applyButton: "Apply to Working Tree",
  applying: "Applying patch...",
  applySuccess: "Patch applied successfully ({count} file(s))!",
  applyFailed: "Failed to apply patch: {error}",
};
