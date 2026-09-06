import type { timeMachine as viTimeMachine } from '../vi/timeMachine';

export const timeMachine: typeof viTimeMachine = {
  title: "Safe-Flight Time Machine",
  description: "Zero-risk instant undo for any Git operation.",
  undoBtn: "Undo (Ctrl + Z)",
  redoBtn: "Redo (Ctrl+Shift+Z)",
  noChanges: "No recorded Git state changes in session yet.",
  destructiveBadge: "Destructive",
  moderateBadge: "History Rewrite",
  safeBadge: "Safe",
  timeTravelBtn: "Time Travel",
  secondsAgo: "{count}s ago",
  minutesAgo: "{count}m ago",
  hoursAgo: "{count}h ago",
  daysAgo: "{count}d ago",
};
