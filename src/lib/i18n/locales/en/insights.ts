import type { insights as viInsights } from "../vi/insights";

export const insights: typeof viInsights = {
  title: "Repository Pulse & Insights",
  subtitle: "Analyze commit velocity, team contributions, and development habits for this repository",
  badge: "Insights Studio",
  commandTitle: "Open Repository Pulse & Insights Dashboard (Git Analytics)",
  refresh: "Refresh",
  close: "Close",

  // Tabs
  tabOverview: "Overview",
  tabActivity: "Activity & Heatmap",
  tabContributors: "Contributors",
  tabHotspots: "Code Churn & Hotspots",

  // Metric cards
  totalCommits: "Total Commits",
  totalCommitsDesc: "Loaded commits in history",
  contributors: "Contributors",
  contributorsDesc: "Unique commit authors",
  activeBranches: "Active Branches",
  activeBranchesDesc: "Local & remote branches",
  repoAge: "Repository Age",
  repoAgeDesc: "Since first commit",

  // 52-Week Year Heatmap & Streaks
  heatmapTitle: "52-Week Activity Heatmap",
  heatmapSubtitle: "Daily commit intensity across the trailing 365 days",
  currentStreak: "Current Streak",
  longestStreak: "Longest Streak",
  activeDays: "Active Days",
  busiestDay: "Busiest Day",
  daysCount: "{count} days",
  less: "Less",
  more: "More",
  commitsOnDate: "{count} commits on {date}",

  // Sections
  activityTitle: "Commit Velocity Over Time",
  activitySubtitle: "Commit volume across months/weeks",
  punchCardTitle: "Commit Punch Card Heatmap",
  punchCardSubtitle: "Commit frequency by hour and day of week (Identify peak development hours)",
  contributorsTitle: "Top Contributors Leaderboard",
  contributorsSubtitle: "Contribution volume and percentage across developers",
  distributionTitle: "Work Habit Distribution",

  // Hotspots / Code Churn
  hotspotsTitle: "Code Churn & Hotspots",
  hotspotsSubtitle: "Most frequently modified files across git history",
  loadingHotspots: "Analyzing file change frequency...",
  hotspotEmpty: "No file churn data recorded.",
  changesCount: "{count} revisions",
  additions: "+{count}",
  deletions: "-{count}",

  // Punch Card Days & Hours
  days: {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
  },
  peakHour: "Peak productive hour:",
  commitsAt: "{count} commits at {hour}:00 on {day}",

  // Time distribution
  timeOfDay: {
    morning: "Morning (06:00 - 12:00)",
    afternoon: "Afternoon (12:00 - 18:00)",
    evening: "Evening (18:00 - 24:00)",
    night: "Late Night (00:00 - 06:00)",
  },
  workdaysVsWeekend: {
    title: "Weekdays vs Weekend",
    workdays: "Weekdays (Mon - Fri)",
    weekend: "Weekend (Sat - Sun)",
  },

  // Contributor details
  rank: "Rank",
  author: "Author",
  commitsCount: "{count} commits",
  percentage: "{pct}%",
  firstCommit: "First: {date}",
  latestCommit: "Latest: {date}",
  noData: "Not enough commit history available for analysis.",
};
