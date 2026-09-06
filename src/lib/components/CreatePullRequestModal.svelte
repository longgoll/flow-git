<script lang="ts">
  import {
    GitPullRequest,
    GitBranch,
    ArrowRight,
    X,
    Check,
    AlertCircle,
    Loader2,
    Sparkles,
    Key,
  } from 'lucide-svelte';
  import type { BranchInfo, GitHubPullRequest, GitHubBranchComparison } from '../types';
  import {
    createGitHubPullRequest,
    compareGitHubBranches,
    parseGitHubRemote,
    getStoredGitHubToken,
    saveGitHubToken,
  } from '../api/githubApi';
  import { generateAIPRDescription } from '../api/ai';
  import { getActiveAccount } from '../api/auth';
  import { toast } from '../state/toastState.svelte';

  interface Props {
    isOpen: boolean;
    remoteOriginUrl?: string | null;
    branches?: BranchInfo[];
    initialSourceBranch?: string;
    initialTargetBranch?: string;
    onClose: () => void;
    onSuccess: (newPR: GitHubPullRequest) => void;
  }

  let {
    isOpen = false,
    remoteOriginUrl = '',
    branches = [],
    initialSourceBranch = '',
    initialTargetBranch = '',
    onClose,
    onSuccess,
  }: Props = $props();

  let parsedRemote = $derived(parseGitHubRemote(remoteOriginUrl));
  let repoOwner = $derived(parsedRemote?.owner || '');
  let repoName = $derived(parsedRemote?.repo || '');

  // Filter list of valid branch names (excluding remotes / origin prefix if local)
  let branchNames = $derived.by(() => {
    const list: string[] = [];
    for (const b of branches) {
      const name = b.shorthand.replace(/^origin\//, '');
      if (name && !list.includes(name) && name !== 'HEAD') {
        list.push(name);
      }
    }
    return list;
  });

  // State
  let sourceBranch = $state('');
  let targetBranch = $state('');
  let title = $state('');
  let description = $state('');
  let isDraft = $state(false);
  let isSubmitting = $state(false);
  let errorMessage = $state('');

  // Branch Comparison & AI state
  let branchComparison = $state<GitHubBranchComparison | null>(null);
  let isComparing = $state(false);
  let isGeneratingAI = $state(false);

  // Token state
  let patToken = $state(getStoredGitHubToken());
  let showTokenInput = $state(false);

  // Sync defaults when modal opens or branches update
  $effect(() => {
    if (isOpen) {
      errorMessage = '';
      if (!patToken) {
        getActiveAccount('github')
          .then((acc) => {
            if (acc?.token) {
              patToken = acc.token;
              saveGitHubToken(acc.token);
            }
          })
          .catch(() => {});
      }

      // Determine default base branch
      if (initialTargetBranch && branchNames.includes(initialTargetBranch)) {
        targetBranch = initialTargetBranch;
      } else if (branchNames.includes('main')) {
        targetBranch = 'main';
      } else if (branchNames.includes('master')) {
        targetBranch = 'master';
      } else if (branchNames.length > 0) {
        targetBranch = branchNames[0];
      }

      // Determine default compare/source branch
      if (initialSourceBranch && branchNames.includes(initialSourceBranch)) {
        sourceBranch = initialSourceBranch;
      } else {
        const headBranch = branches.find((b) => b.is_head)?.shorthand;
        if (headBranch && branchNames.includes(headBranch) && headBranch !== targetBranch) {
          sourceBranch = headBranch;
        } else {
          sourceBranch = branchNames.find((b) => b !== targetBranch) || '';
        }
      }

      // Auto-fill title & description if blank
      initDefaultContent(sourceBranch, targetBranch);
      runBranchComparison(sourceBranch, targetBranch);
    }
  });

  async function runBranchComparison(src: string, tgt: string) {
    if (!src || !tgt || src === tgt || !repoOwner || !repoName) {
      branchComparison = null;
      return;
    }
    try {
      isComparing = true;
      const currentToken = patToken.trim() || getStoredGitHubToken();
      const comp = await compareGitHubBranches(repoOwner, repoName, tgt, src, currentToken);
      branchComparison = comp;
    } catch (e) {
      console.warn('Could not compare branches for preview:', e);
      branchComparison = null;
    } finally {
      isComparing = false;
    }
  }

  async function handleAIGenerate() {
    if (!sourceBranch || !targetBranch) return;
    try {
      isGeneratingAI = true;
      const commitSummaries = branchComparison?.commits.map((c) => c.commit.message.split('\n')[0]) || [];
      const files = branchComparison?.files.map((f) => f.filename) || [];
      const res = await generateAIPRDescription(sourceBranch, targetBranch, commitSummaries, files);
      title = res.title;
      description = res.description;
      toast.success('AI đã sinh mô tả PR!', 'Tiêu đề và nội dung markdown đã được cập nhật.');
    } catch (err: any) {
      toast.error('Lỗi sinh mô tả AI', err.message || String(err));
    } finally {
      isGeneratingAI = false;
    }
  }

  function initDefaultContent(src: string, tgt: string) {
    if (!title.trim() && src) {
      // Prettify title: "feat/login" -> "Feat: Login"
      const clean = src.replace(/^(feature|feat|fix|bugfix|chore|docs|refactor)\//i, (m) => {
        return m.slice(0, -1).toUpperCase() + ': ';
      });
      title = clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    if (!description.trim() && src) {
      description = `## 📝 Tóm tắt thay đổi\n- Tích hợp và hợp nhất các thay đổi từ nhánh \`${src}\` vào \`${tgt}\`.\n\n## 🔍 Kiểm tra\n- [x] Đã kiểm tra hoạt động ổn định trên môi trường cục bộ.`;
    }
  }

  function handleSaveToken() {
    saveGitHubToken(patToken);
    showTokenInput = false;
    toast.success('Đã lưu Token GitHub', 'Token đã sẵn sàng để tạo Pull Request.');
  }

  async function handleCreatePR() {
    errorMessage = '';

    if (!repoOwner || !repoName) {
      errorMessage = 'Không xác định được kho lưu trữ GitHub từ Remote URL hiện tại.';
      return;
    }

    if (!sourceBranch || !targetBranch) {
      errorMessage = 'Vui lòng chọn đầy đủ nhánh nguồn (Compare) và nhánh đích (Base).';
      return;
    }

    if (sourceBranch === targetBranch) {
      errorMessage = 'Nhánh nguồn và nhánh đích không được trùng nhau.';
      return;
    }

    if (!title.trim()) {
      errorMessage = 'Vui lòng nhập tiêu đề cho Pull Request.';
      return;
    }

    const currentToken = patToken.trim() || getStoredGitHubToken();
    if (!currentToken) {
      showTokenInput = true;
      errorMessage = 'Vui lòng cung cấp GitHub Personal Access Token (PAT) để tạo Pull Request.';
      return;
    }

    try {
      isSubmitting = true;
      const newPR = await createGitHubPullRequest(
        repoOwner,
        repoName,
        title.trim(),
        description.trim(),
        sourceBranch,
        targetBranch,
        isDraft,
        currentToken
      );

      toast.success(
        `Đã tạo Pull Request #${newPR.number}`,
        `"${newPR.title}" đã được tạo thành công trên GitHub!`
      );
      onSuccess(newPR);
      onClose();
    } catch (err: any) {
      errorMessage = err.message || String(err);
      toast.error('Tạo Pull Request thất bại', errorMessage);
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    onclick={onClose}
  >
    <div
      class="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/60">
            <GitPullRequest class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Tạo Pull Request mới
            </h2>
            <p class="text-xs text-zinc-500 font-mono">
              {repoOwner ? `${repoOwner}/${repoName}` : 'GitHub Remote'}
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body Form -->
      <div class="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
        {#if errorMessage}
          <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <div class="flex-1 break-words">{errorMessage}</div>
          </div>
        {/if}

        <!-- Visual Branch Flow Indicator: Compare (Nguồn) -> Base (Đích) -->
        <div class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 space-y-3">
          <div class="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span class="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400">
              <GitBranch class="w-3.5 h-3.5" />
              <span>Nhánh nguồn (Compare)</span>
            </span>
            <span class="text-[11px] text-zinc-400">sẽ được hợp nhất vào</span>
            <span class="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <GitBranch class="w-3.5 h-3.5" />
              <span>Nhánh đích (Base)</span>
            </span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <!-- Compare Branch (Nguồn) -->
            <div class="flex-1 relative">
              <select
                bind:value={sourceBranch}
                onchange={() => {
                  initDefaultContent(sourceBranch, targetBranch);
                  runBranchComparison(sourceBranch, targetBranch);
                }}
                class="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold rounded-lg bg-white dark:bg-zinc-900 border border-cyan-400 dark:border-cyan-600/70 text-cyan-900 dark:text-cyan-200 focus:ring-2 focus:ring-cyan-500/20 outline-hidden shadow-xs"
              >
                {#each branchNames as b}
                  <option value={b}>{b}</option>
                {/each}
              </select>
              <GitBranch class="w-3.5 h-3.5 text-cyan-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div class="flex flex-col items-center justify-center px-1 text-zinc-400">
              <ArrowRight class="w-4 h-4 stroke-[2.5] text-cyan-600 dark:text-cyan-400" />
            </div>

            <!-- Base Branch (Đích) -->
            <div class="flex-1 relative">
              <select
                bind:value={targetBranch}
                onchange={() => {
                  initDefaultContent(sourceBranch, targetBranch);
                  runBranchComparison(sourceBranch, targetBranch);
                }}
                class="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 outline-hidden shadow-xs"
              >
                {#each branchNames as b}
                  <option value={b}>{b}</option>
                {/each}
              </select>
              <GitBranch class="w-3.5 h-3.5 text-emerald-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <!-- Branch Comparison Preview Card -->
          {#if isComparing}
            <div class="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-center gap-2">
              <Loader2 class="w-3.5 h-3.5 animate-spin text-cyan-500" />
              <span>Đang kiểm tra độ lệch commits giữa 2 nhánh...</span>
            </div>
          {:else if branchComparison}
            {#if branchComparison.total_commits > 0}
              <div class="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                  <Check class="w-3.5 h-3.5 stroke-[3]" />
                  <span>Sẵn sàng hợp nhất:</span>
                  <span class="font-mono font-bold">{branchComparison.total_commits} commits</span>
                  <span>•</span>
                  <span class="font-mono">{branchComparison.files?.length || 0} tệp thay đổi</span>
                </div>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
                  {branchComparison.status.toUpperCase()}
                </span>
              </div>
            {:else}
              <div class="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
                <AlertCircle class="w-3.5 h-3.5 shrink-0" />
                <span>Nhánh <strong>{sourceBranch}</strong> chưa có commit mới nào so với <strong>{targetBranch}</strong>.</span>
              </div>
            {/if}
          {:else if sourceBranch === targetBranch}
            <div class="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
              <AlertCircle class="w-3.5 h-3.5 shrink-0" />
              <span>Nhánh nguồn và đích đang trùng nhau. Vui lòng chọn hai nhánh khác nhau.</span>
            </div>
          {:else}
            <div class="text-[11px] text-zinc-500 dark:text-zinc-400 text-center">
              Các commit mới trên <strong class="text-cyan-700 dark:text-cyan-300 font-mono">{sourceBranch}</strong> sẽ được gửi yêu cầu tích hợp vào <strong class="text-emerald-700 dark:text-emerald-300 font-mono">{targetBranch}</strong>.
            </div>
          {/if}
        </div>

        <!-- PR Title -->
        <div class="space-y-1.5">
          <label for="pr-title" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Tiêu đề Pull Request <span class="text-rose-500">*</span>
          </label>
          <input
            id="pr-title"
            type="text"
            bind:value={title}
            placeholder="e.g. Thêm tính năng xác thực OAuth2..."
            class="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-hidden transition-all"
          />
        </div>

        <!-- PR Description -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="pr-desc" class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Mô tả chi tiết (Markdown)
            </label>
            <div class="flex items-center gap-3">
              <button
                type="button"
                onclick={handleAIGenerate}
                disabled={isGeneratingAI}
                class="text-[11px] text-violet-600 dark:text-violet-400 hover:text-violet-500 flex items-center gap-1 cursor-pointer font-medium disabled:opacity-50"
                title="Sử dụng FlowGit AI để sinh mô tả PR tự động"
              >
                {#if isGeneratingAI}
                  <Loader2 class="w-3 h-3 animate-spin" />
                  <span>Đang sinh mô tả...</span>
                {:else}
                  <Sparkles class="w-3 h-3" />
                  <span>✨ AI viết mô tả</span>
                {/if}
              </button>

              <button
                type="button"
                onclick={() => initDefaultContent(sourceBranch, targetBranch)}
                class="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Điền mẫu mặc định
              </button>
            </div>
          </div>
          <textarea
            id="pr-desc"
            bind:value={description}
            rows="6"
            placeholder="Mô tả những thay đổi quan trọng, hướng dẫn test..."
            class="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-hidden transition-all resize-none"
          ></textarea>
        </div>

        <!-- Draft Checkbox -->
        <label class="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            bind:checked={isDraft}
            class="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <span class="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
            Tạo dưới dạng Draft PR (Bản nháp - chưa sẵn sàng merge)
          </span>
        </label>

        <!-- Token Input Accordion if needed -->
        {#if showTokenInput || !patToken}
          <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
            <div class="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <Key class="w-4 h-4 text-amber-600" />
              <span>GitHub Personal Access Token</span>
            </div>
            <p class="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Cần token có quyền <code>repo</code> để tạo Pull Request. Token sẽ được lưu cục bộ trên máy bạn.
            </p>
            <div class="flex items-center gap-2">
              <input
                type="password"
                bind:value={patToken}
                placeholder="ghp_xxxxxxxxxxxx"
                class="flex-1 px-2.5 py-1 text-xs font-mono rounded-lg bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-800 text-zinc-900 dark:text-zinc-100 outline-hidden"
              />
              <button
                type="button"
                onclick={handleSaveToken}
                class="px-3 py-1 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                Lưu Token
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Actions -->
      <div class="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
        <button
          type="button"
          onclick={() => (showTokenInput = !showTokenInput)}
          class="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 flex items-center gap-1.5 cursor-pointer"
        >
          <Key class="w-3.5 h-3.5" />
          <span>{patToken ? 'Cập nhật Token GitHub' : 'Nhập Token GitHub'}</span>
        </button>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            onclick={onClose}
            disabled={isSubmitting}
            class="px-4 py-2 text-xs font-medium rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onclick={handleCreatePR}
            disabled={isSubmitting || !title.trim()}
            class="px-5 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-md hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
          >
            {#if isSubmitting}
              <Loader2 class="w-4 h-4 animate-spin" />
              <span>Đang tạo PR...</span>
            {:else}
              <Check class="w-4 h-4" />
              <span>Tạo Pull Request</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
