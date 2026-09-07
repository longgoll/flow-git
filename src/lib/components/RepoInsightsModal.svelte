<script lang="ts">
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
  } from 'lucide-svelte';
  import type { RepoState } from '../state/repoState.svelte';
  import { localeState } from '../state/localeState.svelte';
  import { getAuthorColor, getAuthorInitials } from '../utils/graphRenderer';

  interface Props {
    repo: RepoState;
    onClose: () => void;
  }

  let { repo, onClose }: Props = $props();

  let commits = $derived(repo.rawCommits || []);
  let totalCommits = $derived(commits.length);

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

  // 2. Punch Card Matrix (7 days x 24 hours)
  // Day index: 0 = Mon, 1 = Tue, ..., 6 = Sun
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

    for (const c of commits) {
      if (!c.timestamp) continue;
      const d = new Date(c.timestamp * 1000);
      // JS getDay(): 0 = Sun, 1 = Mon... -> Map to Mon=0..Sun=6
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

  // 3. Time of Day breakdown
  let timeOfDayStats = $derived.by(() => {
    let morning = 0;   // 6 - 12
    let afternoon = 0; // 12 - 18
    let evening = 0;   // 18 - 24
    let night = 0;     // 0 - 6

    for (const c of commits) {
      if (!c.timestamp) continue;
      const hour = new Date(c.timestamp * 1000).getHours();
      if (hour >= 6 && hour < 12) morning++;
      else if (hour >= 12 && hour < 18) afternoon++;
      else if (hour >= 18 && hour < 24) evening++;
      else night++;
    }

    const t = totalCommits || 1;
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

  // 4. Weekday vs Weekend breakdown
  let weekdayStats = $derived.by(() => {
    let weekday = 0;
    let weekend = 0;

    for (const c of commits) {
      if (!c.timestamp) continue;
      const day = new Date(c.timestamp * 1000).getDay();
      if (day === 0 || day === 6) weekend++;
      else weekday++;
    }

    const t = totalCommits || 1;
    return {
      weekday,
      weekdayPct: Math.round((weekday / t) * 100),
      weekend,
      weekendPct: Math.round((weekend / t) * 100),
    };
  });

  // 5. Commit Velocity Monthly Timeline (Last 12 months)
  let monthlyTimeline = $derived.by(() => {
    if (commits.length === 0) return [];
    const map = new Map<string, number>();

    for (const c of commits) {
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

  // 6. Repo Age
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
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none font-sans"
  role="dialog"
  aria-modal="true"
>
  <div
    class="w-full max-w-5xl h-[88vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100"
  >
    <!-- Header -->
    <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
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

      <button
        onclick={onClose}
        class="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        title={localeState.t('insights.close')}
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Scrollable Body -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
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
            {localeState.t('insights.totalCommitsDesc')}
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

      <!-- Commit Velocity Timeline (Bar Chart) -->
      {#if monthlyTimeline.length > 0}
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

      <!-- Top Contributors Leaderboard -->
      <div class="p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 shadow-xs space-y-4">
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <Trophy class="w-4 h-4 text-amber-500" />
            {localeState.t('insights.contributorsTitle')}
          </h3>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {localeState.t('insights.contributorsSubtitle')}
          </p>
        </div>

        <div class="space-y-2">
          {#each contributors.slice(0, 10) as author, idx}
            <div class="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-4 shadow-2xs hover:border-cyan-500/40 transition-colors">
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
            </div>
          {/each}
        </div>
      </div>
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
