<script lang="ts">
  import { Sparkles, Download, RefreshCw, X, ArrowRight, AlertCircle } from 'lucide-svelte';
  import { updateState } from '../state/updateState.svelte';
  import { localeState } from '../state/localeState.svelte';

  function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
</script>

{#if updateState.isSupportedPlatform && updateState.showModal && updateState.updateInfo}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div
      class="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
      role="dialog"
      aria-modal="true"
    >
      <!-- Header with Gradient Accent -->
      <div class="relative px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent">
        <button
          onclick={() => updateState.dismissModal()}
          disabled={updateState.isDownloading}
          class="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
          title={localeState.t('common.close')}
        >
          <X class="w-4 h-4" />
        </button>

        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Sparkles class="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {localeState.t('updater.modalTitle')}
            </h2>
            <div class="flex items-center gap-2 text-xs mt-0.5">
              <span class="text-zinc-500 dark:text-zinc-400">
                {localeState.t('updater.currentVersion')}: <code class="font-mono text-zinc-600 dark:text-zinc-300 font-semibold">v{updateState.updateInfo.currentVersion}</code>
              </span>
              <ArrowRight class="w-3 h-3 text-emerald-500" />
              <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                v{updateState.updateInfo.version}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Body: Release Notes & Progress -->
      <div class="px-6 py-4 flex-1 overflow-y-auto space-y-4">
        {#if updateState.updateInfo.date}
          <div class="text-[11px] text-zinc-400 dark:text-zinc-500">
            {localeState.t('updater.releaseDate')}: {new Date(updateState.updateInfo.date).toLocaleDateString()}
          </div>
        {/if}

        <!-- Release Notes Box -->
        <div>
          <h3 class="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
            {localeState.t('updater.whatsNew')}
          </h3>
          <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed select-text">
            {#if updateState.updateInfo.body && updateState.updateInfo.body.trim()}
              {updateState.updateInfo.body}
            {:else}
              <span class="text-zinc-400 dark:text-zinc-500 italic">
                {localeState.t('updater.noReleaseNotes')}
              </span>
            {/if}
          </div>
        </div>

        <!-- Download Progress Bar (When downloading) -->
        {#if updateState.isDownloading}
          <div class="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <div class="flex items-center justify-between text-xs font-medium text-zinc-800 dark:text-zinc-200">
              <span class="flex items-center gap-1.5">
                <RefreshCw class="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                {localeState.t('updater.downloading')}
              </span>
              <span class="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {updateState.downloadProgress}%
              </span>
            </div>

            <!-- Progress track -->
            <div class="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                style="width: {updateState.downloadProgress}%"
              ></div>
            </div>

            {#if updateState.totalBytes > 0}
              <div class="text-[11px] text-zinc-500 dark:text-zinc-400 text-right font-mono">
                {formatBytes(updateState.downloadedBytes)} / {formatBytes(updateState.totalBytes)}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Error Alert if any -->
        {#if updateState.errorMessage}
          <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <div class="flex-1">
              <p class="font-medium">{localeState.t('updater.errorOccurred')}</p>
              <p class="text-[11px] mt-0.5 opacity-90">{updateState.errorMessage}</p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer Buttons -->
      <div class="px-6 py-4 bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
        <button
          onclick={() => updateState.dismissModal()}
          disabled={updateState.isDownloading}
          class="px-4 py-2 text-xs font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors disabled:opacity-40 cursor-pointer"
        >
          {localeState.t('updater.later')}
        </button>

        <button
          onclick={() => updateState.downloadAndInstall()}
          disabled={updateState.isDownloading}
          class="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          {#if updateState.isDownloading}
            <RefreshCw class="w-3.5 h-3.5 animate-spin" />
            <span>{localeState.t('updater.downloading')}</span>
          {:else}
            <Download class="w-3.5 h-3.5" />
            <span>{localeState.t('updater.installAndRestart')}</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
