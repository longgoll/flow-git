<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Activity,
    X,
    Users,
    GitCommit,
    GitBranch,
    Clock,
    Flame,
    Trophy,
    Calendar,
    Sun,
    Moon,
    Sunrise,
    Sunset,
    BarChart3,
    FileCode,
    RefreshCw,
    Search,
    Zap,
    FileText,
  } from 'lucide-svelte';
  import type { RepoState } from '../state/repoState.svelte';
  import type { FileChurnInfo } from '../types';
  import { getRepoFileChurn } from '../api/repo';
  import { localeState } from '../state/localeState.svelte';
  import { getAuthorColor, getAuthorInitials } from '../utils/graphRenderer';

  interface Props {
    repo: RepoState;
    onClose: () => void;
  }

  let { repo, onClose }: Props = $props();

  type TabType = 'overview' | 'activity' | 'contributors' | 'hotspots';
  let activeTab = $state<TabType>('overview');

  let commits = $derived(repo.rawCommits || []);
  let totalCommits = $derived(commits.length);

  // Author filter for Heatmap & Analytics
  let selectedAuthorFilter = $state<string | null>(null);

  let filteredCommits = $derived.by(() => {
    if (!selectedAuthorFilter) return commits;
    return commits.filter((c) => {
      const email = (c.author_email || '').toLowerCase().trim();
      const name = (c.author_name || '').toLowerCase().trim();
      return email === selectedAuthorFilter || name === selectedAuthorFilter;
    });
  });

  // 1. Contributors Analysis
  interface ContributorStats {
    name: string;
    email: string;
    count: number;
    firstTimestamp: number;
    lastTimestamp: number;
    pct: number;
  }

  let contributors = $derived.by(() => {
    if (commits.length === 0) return [];
    const map = new Map<string, { name: string; email: string; count: number; first: number; last: number }>();

    for (const c of commits) {
      const key = (c.author_email || c.author_name || 'unknown').toLowerCase().trim();
      const existing = map.get(key);
      const ts = c.timestamp || 0;
      if (existing) {
        existing.count++;
        if (ts > 0) {
          if (ts < existing.first) existing.first = ts;
          if (ts > existing.last) existing.last = ts;
        }
      } else {
        map.set(key, {
          name: c.author_name || 'Unknown',
          email: c.author_email || '',
          count: 1,
          first: ts,
          last: ts,
        });
      }
    }

    const list: ContributorStats[] = [];
    for (const item of map.values()) {
      list.push({
        name: item.name,
        email: item.email,
        count: item.count,
        firstTimestamp: item.first,
        lastTimestamp: item.last,
        pct: totalCommits > 0 ? Math.round((item.count / totalCommits) * 100) : 0,
      });
    }

    return list.sort((a, b) => b.count - a.count);
  });

  // 2. 52-Week GitHub-style Heatmap Grid & Streak Analytics
  interface HeatmapDay {
    dateStr: string; // YYYY-MM-DD
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
    dayOfWeek: number; // 0=Mon, 6=Sun
  }

  interface HeatmapWeek {
    days: (HeatmapDay | null)[]; // 7 days (Mon=0..Sun=6)
    monthLabel?: string;
  }

  interface StreakStats {
    currentStreak: number;
    longestStreak: number;
    activeDays: number;
    totalDays: number;
    busiestDay: { date: string; count: number } | null;
  }

  let heatmapData = $derived.by((): { weeks: HeatmapWeek[]; streaks: StreakStats } => {
    const dayMap = new Map<string, number>();
    for (const c of filteredCommits) {
      if (!c.timestamp) continue;
      const d = new Date(c.timestamp * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    }

    // Generate 52 weeks up to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // End on upcoming Sunday to fill the last column cleanly
    const end = new Date(today);
    const dayOfWeek = end.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    end.setDate(end.getDate() + daysUntilSunday);

    // Start 52 weeks (364 days) before
    const start = new Date(end);
    start.setDate(start.getDate() - 52 * 7 + 1);

    // Max count for quartile scaling
    let maxCount = 0;
    for (const count of dayMap.values()) {
      if (count > maxCount) maxCount = count;
    }

    const weeks: HeatmapWeek[] = [];
    let currentWeek: (HeatmapDay | null)[] = [];
    let lastMonth = -1;

    // Streaks tracking
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let activeDays = 0;
    let totalDays = 0;
    let busiestDay: { date: string; count: number } | null = null;

    const cur = new Date(start);
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = cur.getMonth();
      const dNum = cur.getDate();
      const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      const count = dayMap.get(key) || 0;

      // Map JS Sunday=0, Mon=1... to Mon=0..Sun=6
      const jsDay = cur.getDay();
      const mappedDay = jsDay === 0 ? 6 : jsDay - 1;

      // Quartile / threshold level
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count > 0) {
        if (count >= 10 || (maxCount > 8 && count >= maxCount * 0.75)) level = 4;
        else if (count >= 6 || (maxCount > 5 && count >= maxCount * 0.5)) level = 3;
        else if (count >= 3 || (maxCount > 2 && count >= maxCount * 0.25)) level = 2;
        else level = 1;
      }

      if (cur <= today) {
        totalDays++;
        if (count > 0) {
          activeDays++;
          tempStreak++;
          if (tempStreak > longestStreak) longestStreak = tempStreak;
          if (!busiestDay || count > busiestDay.count) {
            busiestDay = { date: key, count };
          }
        } else {
          tempStreak = 0;
        }
      }

      const isFuture = cur > today;
      currentWeek.push(
        isFuture
          ? null
          : {
              dateStr: key,
              count,
              level,
              dayOfWeek: mappedDay,
            }
      );

      if (mappedDay === 6 || cur.getTime() === end.getTime()) {
        let monthLabel: string | undefined;
        if (m !== lastMonth) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthLabel = monthNames[m];
          lastMonth = m;
        }

        weeks.push({ days: currentWeek, monthLabel });
        currentWeek = [];
      }

      cur.setDate(cur.getDate() + 1);
    }

    currentStreak = tempStreak;

    return {
      weeks,
      streaks: {
        currentStreak,
        longestStreak,
        activeDays,
        totalDays,
        busiestDay,
      },
    };
  });

  // 3. Punch Card Matrix (7 days x 24 hours)
  interface PunchCardData {
    matrix: number[][]; // [day][hour]
    maxCount: number;
    peakDay: number;
    peakHour: number;
    peakCount: number;
  }

  let punchCard = $derived.by((): PunchCardData => {
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let maxCount = 0;
    let peakDay = 0;
    let peakHour = 0;
    let peakCount = 0;

    for (const c of filteredCommits) {
      if (!c.timestamp) continue;
      const d = new Date(c.timestamp * 1000);
      const jsDay = d.getDay();
      const day = jsDay === 0 ? 6 : jsDay - 1;
      const hour = d.getHours();

      matrix[day][hour]++;
      const count = matrix[day][hour];
      if (count > maxCount) maxCount = count;
      if (count > peakCount) {
        peakCount = count;
        peakDay = day;
        peakHour = hour;
      }
    }

    return { matrix, maxCount: maxCount || 1, peakDay, peakHour, peakCount };
  });

  // 4. Time of Day breakdown
  let timeOfDayStats = $derived.by(() => {
    let morning = 0;
    let afternoon = 0;
    let evening = 0;
    let night = 0;

    for (const c of filteredCommits) {
      if (!c.timestamp) continue;
      const hour = new Date(c.timestamp * 1000).getHours();
      if (hour >= 6 && hour < 12) morning++;
      else if (hour >= 12 && hour < 18) afternoon++;
      else if (hour >= 18 && hour < 24) evening++;
      else night++;
    }

    const t = filteredCommits.length || 1;
    return {
      morning,
      morningPct: Math.round((morning / t) * 100),
      afternoon,
      afternoonPct: Math.round((afternoon / t) * 100),
      evening,
      eveningPct: Math.round((evening / t) * 100),
      night,
      nightPct: Math.round((night / t) * 100),
    };
  });

  // 5. Weekday vs Weekend breakdown
  let weekdayStats = $derived.by(() => {
    let weekday = 0;
    let weekend = 0;

    for (const c of filteredCommits) {
      if (!c.timestamp) continue;
      const day = new Date(c.timestamp * 1000).getDay();
      if (day === 0 || day === 6) weekend++;
      else weekday++;
    }

    const t = filteredCommits.length || 1;
    return {
      weekday,
      weekdayPct: Math.round((weekday / t) * 100),
      weekend,
      weekendPct: Math.round((weekend / t) * 100),
    };
  });

  // 6. Commit Velocity Monthly Timeline (Last 12 months)
  let monthlyTimeline = $derived.by(() => {
    if (filteredCommits.length === 0) return [];
    const map = new Map<string, number>();

    for (const c of filteredCommits) {
      if (!c.timestamp) continue;
      const d = new Date(c.timestamp * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + 1);
    }

    const sortedKeys = Array.from(map.keys()).sort();
    const recentKeys = sortedKeys.slice(-12);
    let max = 0;
    for (const k of recentKeys) {
      const v = map.get(k) || 0;
      if (v > max) max = v;
    }

    return recentKeys.map((k) => ({
      label: k,
      count: map.get(k) || 0,
      pct: max > 0 ? Math.round(((map.get(k) || 0) / max) * 100) : 0,
    }));
  });

  // 7. Repo Age
  let repoAgeStr = $derived.by(() => {
    if (commits.length === 0) return '—';
    const timestamps = commits.map((c) => c.timestamp).filter(Boolean) as number[];
    if (timestamps.length === 0) return '—';
    const oldest = Math.min(...timestamps);
    const newest = Math.max(...timestamps);
    const diffSec = newest - oldest;
    const days = Math.floor(diffSec / 86400);
    if (days < 30) return `${days} ngày`;
    if (days < 365) return `${Math.floor(days / 30)} tháng`;
    const years = (days / 365).toFixed(1);
    return `${years} năm`;
  });

  // 8. File Churn & Hotspots
  let fileHotspots = $state<FileChurnInfo[]>([]);
  let isLoadingHotspots = $state(false);
  let hotspotSearchQuery = $state('');

  async function loadFileHotspots() {
    if (!repo.repoSummary?.path) return;
    isLoadingHotspots = true;
    try {
      fileHotspots = await getRepoFileChurn(repo.repoSummary.path, 500);
    } catch (e) {
      console.error('Failed to load file churn hotspots:', e);
    } finally {
      isLoadingHotspots = false;
    }
  }

  let filteredHotspots = $derived.by(() => {
    if (!hotspotSearchQuery.trim()) return fileHotspots;
    const q = hotspotSearchQuery.toLowerCase().trim();
    return fileHotspots.filter((f) => f.path.toLowerCase().includes(q));
  });

  let maxHotspotChanges = $derived.by(() => {
    return fileHotspots.reduce((max, f) => Math.max(max, f.changes_count), 1);
  });

  onMount(() => {
    loadFileHotspots();
  });

  const DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  function formatDate(ts: number) {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString();
  }

  function getPunchCardCellColor(count: number, max: number) {
    if (count === 0) return 'bg-zinc-100 dark:bg-zinc-800/40 border-transparent';
    const ratio = count / max;
    if (ratio > 0.75) return 'bg-cyan-500 text-white font-bold shadow-xs';
    if (ratio > 0.5) return 'bg-cyan-400 dark:bg-cyan-600/80 text-white';
    if (ratio > 0.25) return 'bg-cyan-200 dark:bg-cyan-900/60 text-cyan-900 dark:text-cyan-200';
    return 'bg-cyan-100/70 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300';
  }

  function getHeatmapCellColor(level: 0 | 1 | 2 | 3 | 4) {
    switch (level) {
      case 4:
        return 'bg-emerald-500 dark:bg-emerald-400 border-emerald-600 dark:border-emerald-300 shadow-2xs';
      case 3:
        return 'bg-emerald-400 dark:bg-emerald-600 border-emerald-500 dark:border-emerald-500';
      case 2:
        return 'bg-emerald-300 dark:bg-emerald-800 border-emerald-400 dark:border-emerald-700';
      case 1:
        return 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-900/60';
      default:
        return 'bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200/50 dark:border-zinc-800/50';
    }
  }

  function getFileExtension(path: string): string {
    const parts = path.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none font-sans"
  role="dialog"
  aria-modal="true"
>
  <div
    class="w-full max-w-5xl h-[88vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100"
  >
    <!-- Header with Studio Tab Navigation -->
    <div class="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-300 dark:border-cyan-700/60 text-cyan-600 dark:text-cyan-400 shadow-xs">
          <Activity class="w-5 h-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {localeState.t('insights.title')}
            </h2>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300/60 dark:border-cyan-700/60">
              {localeState.t('insights.badge')}
            </span>
          </div>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {localeState.t('insights.subtitle')}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Tab Bar -->
        <div class="flex items-center p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/60 border border-zinc-300/50 dark:border-zinc-700/50 text-xs">
          <button
            onclick={() => (activeTab = 'overview')}
            class="px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer {activeTab === 'overview' ? 'bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}"
          >
            {localeState.t('insights.tabOverview')}
          </button>
          <button
            onclick={() => (activeTab = 'activity')}
            class="px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer {activeTab === 'activity' ? 'bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}"
          >
            {localeState.t('insights.tabActivity')}
          </button>
          <button
            onclick={() => (activeTab = 'contributors')}
            class="px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer {activeTab === 'contributors' ? 'bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}"
          >
            {localeState.t('insights.tabContributors')}
          </button>
          <button
            onclick={() => (activeTab = 'hotspots')}
            class="px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer {activeTab === 'hotspots' ? 'bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}"
          >
            {localeState.t('insights.tabHotspots')}
          </button>
        </div>

        <button
          onclick={onClose}
          class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          title={localeState.t('insights.close')}
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Scrollable Body -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      {#if activeTab === 'overview' || activeTab === 'activity'}
        <!-- 4 Overview Metric Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <!-- Card 1: Commits -->
          <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-2xs">
            <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span class="text-xs font-medium">{localeState.t('insights.totalCommits')}</span>
              <GitCommit class="w-4 h-4 text-cyan-500" />
            </div>
            <div class="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-2">
              {totalCommits.toLocaleString()}
            </div>
            <div class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {selectedAuthorFilter ? `Lọc theo tác giả: ${selectedAuthorFilter}` : localeState.t('insights.totalCommitsDesc')}
            </div>
          </div>

          <!-- Card 2: Contributors -->
          <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-2xs">
            <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span class="text-xs font-medium">{localeState.t('insights.contributors')}</span>
              <Users class="w-4 h-4 text-purple-500" />
            </div>
            <div class="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-2">
              {contributors.length}
            </div>
            <div class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {localeState.t('insights.contributorsDesc')}
            </div>
          </div>

          <!-- Card 3: Active Branches -->
          <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-2xs">
            <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span class="text-xs font-medium">{localeState.t('insights.activeBranches')}</span>
              <GitBranch class="w-4 h-4 text-emerald-500" />
            </div>
            <div class="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-2">
              {repo.branches.length}
            </div>
            <div class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {localeState.t('insights.activeBranchesDesc')}
            </div>
          </div>

          <!-- Card 4: Repo Age -->
          <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-2xs">
            <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span class="text-xs font-medium">{localeState.t('insights.repoAge')}</span>
              <Clock class="w-4 h-4 text-amber-500" />
            </div>
            <div class="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-2">
              {repoAgeStr}
            </div>
            <div class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {localeState.t('insights.repoAgeDesc')}
            </div>
          </div>
        </div>

        <!-- 52-WEEK GITHUB STYLE HEATMAP & STREAKS -->
        <div class="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Calendar class="w-4 h-4 text-emerald-500" />
                {localeState.t('insights.heatmapTitle')}
              </h3>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {localeState.t('insights.heatmapSubtitle')}
              </p>
            </div>

            <!-- Streak Badges -->
            <div class="flex items-center gap-2 flex-wrap">
              <div class="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-[11px] text-emerald-800 dark:text-emerald-300 font-mono flex items-center gap-1.5">
                <Zap class="w-3.5 h-3.5 text-emerald-500" />
                <span>{localeState.t('insights.currentStreak')}:</span>
                <strong class="font-bold">{heatmapData.streaks.currentStreak} {localeState.t('insights.daysCount', { count: '' })}</strong>
              </div>
              <div class="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-[11px] text-amber-800 dark:text-amber-300 font-mono flex items-center gap-1.5">
                <Flame class="w-3.5 h-3.5 text-amber-500" />
                <span>{localeState.t('insights.longestStreak')}:</span>
                <strong class="font-bold">{heatmapData.streaks.longestStreak} {localeState.t('insights.daysCount', { count: '' })}</strong>
              </div>
            </div>
          </div>

          <!-- Heatmap 52 Columns Grid -->
          <div class="overflow-x-auto pb-2">
            <div class="min-w-[780px] space-y-1.5">
              <!-- Month labels -->
              <div class="flex text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pl-7 h-4">
                {#each heatmapData.weeks as week}
                  <div class="w-3.5 shrink-0 text-[10px] font-mono truncate">
                    {week.monthLabel || ''}
                  </div>
                {/each}
              </div>

              <!-- Days grid (7 rows) -->
              <div class="flex gap-1.5 items-start">
                <!-- Day Labels (Mon, Wed, Fri) -->
                <div class="flex flex-col gap-1 text-[9px] font-mono text-zinc-400 dark:text-zinc-500 pr-1 select-none shrink-0 w-6">
                  <span class="h-3 leading-3">T2</span>
                  <span class="h-3 leading-3"></span>
                  <span class="h-3 leading-3">T4</span>
                  <span class="h-3 leading-3"></span>
                  <span class="h-3 leading-3">T6</span>
                  <span class="h-3 leading-3"></span>
                  <span class="h-3 leading-3">CN</span>
                </div>

                <!-- 52 Week Columns -->
                <div class="flex gap-1">
                  {#each heatmapData.weeks as week}
                    <div class="flex flex-col gap-1 shrink-0">
                      {#each week.days as day}
                        {#if day}
                          <div
                            class="w-3 h-3 rounded-xs transition-all hover:scale-130 cursor-pointer border {getHeatmapCellColor(day.level)}"
                            title={`${day.dateStr}: ${day.count} commits`}
                          ></div>
                        {:else}
                          <div class="w-3 h-3 rounded-xs opacity-0"></div>
                        {/if}
                      {/each}
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Legend -->
              <div class="flex items-center justify-end gap-2 pt-2 text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                <span>{localeState.t('insights.less')}</span>
                <div class="w-2.5 h-2.5 rounded-xs bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800/50"></div>
                <div class="w-2.5 h-2.5 rounded-xs bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-900/60"></div>
                <div class="w-2.5 h-2.5 rounded-xs bg-emerald-300 dark:bg-emerald-800 border border-emerald-400 dark:border-emerald-700"></div>
                <div class="w-2.5 h-2.5 rounded-xs bg-emerald-400 dark:bg-emerald-600 border border-emerald-500 dark:border-emerald-500"></div>
                <div class="w-2.5 h-2.5 rounded-xs bg-emerald-500 dark:bg-emerald-400 border border-emerald-600 dark:border-emerald-300"></div>
                <span>{localeState.t('insights.more')}</span>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- TAB: OVERVIEW ONLY (Monthly Velocity) -->
      {#if activeTab === 'overview' && monthlyTimeline.length > 0}
        <!-- Commit Velocity Timeline (Bar Chart) -->
        <div class="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <BarChart3 class="w-4 h-4 text-cyan-500" />
                {localeState.t('insights.activityTitle')}
              </h3>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {localeState.t('insights.activitySubtitle')}
              </p>
            </div>
          </div>

          <!-- Bar Chart Visualization -->
          <div class="h-32 flex items-end gap-2 pt-4 px-2 border-b border-zinc-200 dark:border-zinc-800">
            {#each monthlyTimeline as item}
              <div class="flex-1 flex flex-col items-center gap-1.5 group relative">
                <!-- Hover Tooltip -->
                <div class="absolute -top-8 px-2 py-1 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-10 whitespace-nowrap">
                  {item.label}: {item.count} commits
                </div>

                <div
                  style="height: {Math.max(6, (item.pct / 100) * 88)}px;"
                  class="w-full max-w-10 rounded-t-md bg-gradient-to-t from-cyan-600 to-teal-400 dark:from-cyan-500 dark:to-teal-300 transition-all group-hover:brightness-110 shadow-xs"
                ></div>
                <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate w-full text-center">
                  {item.label.slice(2)}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- TAB: ACTIVITY FULL (Punch Card & Habit Breakdowns) -->
      {#if activeTab === 'activity'}
        <!-- Commit Punch Card Heatmap -->
        <div class="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Flame class="w-4 h-4 text-amber-500" />
                {localeState.t('insights.punchCardTitle')}
              </h3>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {localeState.t('insights.punchCardSubtitle')}
              </p>
            </div>

            {#if punchCard.peakCount > 0}
              <div class="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-[11px] text-amber-800 dark:text-amber-300 font-mono flex items-center gap-1.5">
                <Flame class="w-3.5 h-3.5 text-amber-500" />
                <span>{localeState.t('insights.peakHour')}</span>
                <strong class="font-bold">{DAY_NAMES[punchCard.peakDay]} lúc {punchCard.peakHour}:00 ({punchCard.peakCount} commits)</strong>
              </div>
            {/if}
          </div>

          <!-- 7 x 24 Grid -->
          <div class="overflow-x-auto">
            <div class="min-w-[620px] space-y-1">
              <!-- Hour headers -->
              <div class="flex items-center text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pl-8">
                {#each Array(24) as _, h}
                  <div class="flex-1 text-center truncate">
                    {h % 3 === 0 ? `${h}h` : ''}
                  </div>
                {/each}
              </div>

              <!-- Day rows -->
              {#each DAY_NAMES as dayName, dayIdx}
                <div class="flex items-center gap-1">
                  <span class="w-7 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0 font-medium">
                    {dayName}
                  </span>
                  <div class="flex-1 flex items-center gap-1">
                    {#each Array(24) as _, hour}
                      {@const count = punchCard.matrix[dayIdx][hour]}
                      <div
                        class="flex-1 h-5 rounded-xs flex items-center justify-center text-[9px] font-mono transition-all hover:scale-115 cursor-pointer {getPunchCardCellColor(count, punchCard.maxCount)}"
                        title={`${dayName} lúc ${hour}:00 — ${count} commits`}
                      >
                        {count > 0 && count >= punchCard.maxCount * 0.4 ? count : ''}
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Work Habits (Time of Day & Weekday vs Weekend) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Time of Day -->
          <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-2xs space-y-3">
            <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Sunrise class="w-4 h-4 text-amber-500" />
              {localeState.t('insights.distributionTitle')}
            </h4>
            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <Sun class="w-3.5 h-3.5 text-amber-500" />
                  {localeState.t('insights.timeOfDay.morning')}
                </span>
                <span class="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{timeOfDayStats.morningPct}% ({timeOfDayStats.morning})</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div style="width: {timeOfDayStats.morningPct}%;" class="h-full bg-amber-500 rounded-full"></div>
              </div>

              <div class="flex items-center justify-between pt-1">
                <span class="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <Sunset class="w-3.5 h-3.5 text-orange-500" />
                  {localeState.t('insights.timeOfDay.afternoon')}
                </span>
                <span class="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{timeOfDayStats.afternoonPct}% ({timeOfDayStats.afternoon})</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div style="width: {timeOfDayStats.afternoonPct}%;" class="h-full bg-orange-500 rounded-full"></div>
              </div>

              <div class="flex items-center justify-between pt-1">
                <span class="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <Moon class="w-3.5 h-3.5 text-indigo-400" />
                  {localeState.t('insights.timeOfDay.evening')}
                </span>
                <span class="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{timeOfDayStats.eveningPct}% ({timeOfDayStats.evening})</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div style="width: {timeOfDayStats.eveningPct}%;" class="h-full bg-indigo-500 rounded-full"></div>
              </div>

              <div class="flex items-center justify-between pt-1">
                <span class="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <Moon class="w-3.5 h-3.5 text-purple-400" />
                  {localeState.t('insights.timeOfDay.night')}
                </span>
                <span class="font-mono font-semibold text-zinc-900 dark:text-zinc-100">{timeOfDayStats.nightPct}% ({timeOfDayStats.night})</span>
              </div>
              <div class="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div style="width: {timeOfDayStats.nightPct}%;" class="h-full bg-purple-500 rounded-full"></div>
              </div>
            </div>
          </div>

          <!-- Weekdays vs Weekend -->
          <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <h4 class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <Calendar class="w-4 h-4 text-cyan-500" />
                {localeState.t('insights.workdaysVsWeekend.title')}
              </h4>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                So sánh nhịp độ làm việc giữa ngày thường và 2 ngày cuối tuần
              </p>
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-emerald-600 dark:text-emerald-400">
                  {localeState.t('insights.workdaysVsWeekend.workdays')}
                </span>
                <span class="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {weekdayStats.weekdayPct}% ({weekdayStats.weekday} commits)
                </span>
              </div>
              <div class="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex">
                <div style="width: {weekdayStats.weekdayPct}%;" class="h-full bg-emerald-500"></div>
                <div style="width: {weekdayStats.weekendPct}%;" class="h-full bg-amber-500"></div>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-amber-600 dark:text-amber-400">
                  {localeState.t('insights.workdaysVsWeekend.weekend')}
                </span>
                <span class="font-mono font-bold text-amber-700 dark:text-amber-300">
                  {weekdayStats.weekendPct}% ({weekdayStats.weekend} commits)
                </span>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- TAB: CONTRIBUTORS -->
      {#if activeTab === 'contributors'}
        <!-- Top Contributors Leaderboard -->
        <div class="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Trophy class="w-4 h-4 text-amber-500" />
                {localeState.t('insights.contributorsTitle')}
              </h3>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {localeState.t('insights.contributorsSubtitle')}
              </p>
            </div>

            {#if selectedAuthorFilter}
              <button
                onclick={() => (selectedAuthorFilter = null)}
                class="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>Đang lọc: <strong>{selectedAuthorFilter}</strong></span>
                <X class="w-3 h-3" />
              </button>
            {/if}
          </div>

          <div class="space-y-2">
            {#each contributors as author, idx}
              {@const isSelected = selectedAuthorFilter === (author.email || author.name).toLowerCase().trim()}
              <button
                type="button"
                onclick={() => {
                  const key = (author.email || author.name).toLowerCase().trim();
                  selectedAuthorFilter = isSelected ? null : key;
                }}
                class="w-full text-left p-3 rounded-xl bg-white dark:bg-zinc-900 border transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-4 {isSelected ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/20 dark:bg-cyan-950/20' : 'border-zinc-200 dark:border-zinc-800/80 hover:border-cyan-500/40'}"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <!-- Rank Badge -->
                  <div class="w-6 text-center font-bold text-xs font-mono text-zinc-400 dark:text-zinc-500">
                    {#if idx === 0}
                      🥇
                    {:else if idx === 1}
                      🥈
                    {:else if idx === 2}
                      🥉
                    {:else}
                      #{idx + 1}
                    {/if}
                  </div>

                  <!-- Avatar -->
                  <div
                    style="background-color: {getAuthorColor(author.name)};"
                    class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
                  >
                    {getAuthorInitials(author.name)}
                  </div>

                  <div class="min-w-0">
                    <div class="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                      {author.name}
                    </div>
                    <div class="text-[11px] font-mono text-zinc-400 truncate">
                      {author.email}
                    </div>
                  </div>
                </div>

                <!-- Commits & Progress -->
                <div class="w-48 shrink-0 flex flex-col items-end gap-1">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {author.count.toLocaleString()} commits
                    </span>
                    <span class="text-[11px] font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                      ({author.pct}%)
                    </span>
                  </div>
                  <div class="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      style="width: {author.pct}%;"
                      class="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full"
                    ></div>
                  </div>
                  <div class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {formatDate(author.firstTimestamp)} ➔ {formatDate(author.lastTimestamp)}
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- TAB: HOTSPOTS / CODE CHURN -->
      {#if activeTab === 'hotspots'}
        <div class="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Flame class="w-4 h-4 text-orange-500" />
                {localeState.t('insights.hotspotsTitle')}
              </h3>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {localeState.t('insights.hotspotsSubtitle')}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <div class="relative w-56">
                <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  bind:value={hotspotSearchQuery}
                  placeholder="Lọc tệp tin..."
                  class="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:outline-hidden focus:border-cyan-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                />
              </div>

              <button
                onclick={loadFileHotspots}
                disabled={isLoadingHotspots}
                class="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
                title="Quét lại file churn"
              >
                <RefreshCw class="w-3.5 h-3.5 {isLoadingHotspots ? 'animate-spin text-cyan-500' : ''}" />
              </button>
            </div>
          </div>

          {#if isLoadingHotspots}
            <div class="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400 text-xs">
              <RefreshCw class="w-6 h-6 animate-spin text-cyan-500" />
              <span>{localeState.t('insights.loadingHotspots')}</span>
            </div>
          {:else if filteredHotspots.length === 0}
            <div class="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
              <FileText class="w-8 h-8 opacity-40" />
              <span>{localeState.t('insights.hotspotEmpty')}</span>
            </div>
          {:else}
            <div class="space-y-2">
              {#each filteredHotspots as hotspot, idx}
                {@const pct = Math.round((hotspot.changes_count / maxHotspotChanges) * 100)}
                <div class="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-2xs hover:border-orange-500/40 transition-colors flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-6 text-center font-bold text-xs font-mono text-zinc-400">
                      #{idx + 1}
                    </div>

                    <div class="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                      <FileCode class="w-4 h-4" />
                    </div>

                    <div class="min-w-0 flex-1">
                      <div class="text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 truncate" title={hotspot.path}>
                        {hotspot.path}
                      </div>
                      <div class="flex items-center gap-3 text-[10px] font-mono text-zinc-400 mt-0.5">
                        <span class="text-emerald-600 dark:text-emerald-400 font-semibold">+{hotspot.additions.toLocaleString()}</span>
                        <span class="text-rose-600 dark:text-rose-400 font-semibold">-{hotspot.deletions.toLocaleString()}</span>
                        <span class="text-zinc-400">({getFileExtension(hotspot.path).toUpperCase() || 'FILE'})</span>
                      </div>
                    </div>
                  </div>

                  <!-- Hotness Meter -->
                  <div class="w-44 shrink-0 flex flex-col items-end gap-1.5">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                        {hotspot.changes_count}
                      </span>
                      <span class="text-[11px] text-zinc-500 dark:text-zinc-400">
                        lần sửa
                      </span>
                    </div>
                    <div class="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        style="width: {pct}%;"
                        class="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                      ></div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
      <span class="text-[11px] font-mono text-zinc-500">
        Dữ liệu thống kê dựa trên {totalCommits.toLocaleString()} commits
      </span>

      <button
        onclick={onClose}
        class="px-4 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors"
      >
        {localeState.t('insights.close')}
      </button>
    </div>
  </div>
</div>
