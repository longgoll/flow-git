import { check, type Update, type DownloadEvent } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { toast } from './toastState.svelte';
import { localeState } from './localeState.svelte';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

export class UpdateState {
  isChecking = $state<boolean>(false);
  isDownloading = $state<boolean>(false);
  updateAvailable = $state<boolean>(false);
  updateInfo = $state<UpdateInfo | null>(null);
  downloadProgress = $state<number>(0);
  downloadedBytes = $state<number>(0);
  totalBytes = $state<number>(0);
  errorMessage = $state<string | null>(null);
  showModal = $state<boolean>(false);
  lastChecked = $state<Date | null>(null);

  private currentUpdate: Update | null = null;

  async checkForUpdates(manual: boolean = false): Promise<boolean> {
    if (this.isChecking || this.isDownloading) return false;

    this.isChecking = true;
    this.errorMessage = null;

    try {
      const update = await check();
      this.lastChecked = new Date();

      if (update) {
        this.currentUpdate = update;
        this.updateAvailable = true;
        this.updateInfo = {
          version: update.version,
          currentVersion: update.currentVersion,
          body: update.body || '',
          date: update.date,
        };
        this.showModal = true;

        toast.info(
          localeState.t('updater.newVersionFoundTitle'),
          localeState.t('updater.newVersionFoundMsg', { version: update.version }),
          {
            label: localeState.t('updater.viewDetails'),
            onClick: () => {
              this.showModal = true;
            },
          }
        );
        return true;
      } else {
        this.updateAvailable = false;
        this.updateInfo = null;
        this.currentUpdate = null;

        if (manual) {
          toast.success(
            localeState.t('updater.upToDateTitle'),
            localeState.t('updater.upToDateMsg')
          );
        }
        return false;
      }
    } catch (err: any) {
      console.warn('Update check failed:', err);
      const errMsg = err?.message || String(err);
      this.errorMessage = errMsg;

      if (manual) {
        toast.warning(
          localeState.t('updater.checkFailedTitle'),
          localeState.t('updater.checkFailedMsg', { error: errMsg })
        );
      }
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  async downloadAndInstall(): Promise<void> {
    if (!this.currentUpdate || this.isDownloading) return;

    this.isDownloading = true;
    this.downloadProgress = 0;
    this.downloadedBytes = 0;
    this.totalBytes = 0;
    this.errorMessage = null;

    try {
      let downloaded = 0;
      let total = 0;

      await this.currentUpdate.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === 'Started') {
          total = event.data.contentLength || 0;
          this.totalBytes = total;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          this.downloadedBytes = downloaded;
          if (total > 0) {
            this.downloadProgress = Math.min(100, Math.round((downloaded / total) * 100));
          }
        } else if (event.event === 'Finished') {
          this.downloadProgress = 100;
        }
      });

      toast.success(
        localeState.t('updater.installSuccessTitle'),
        localeState.t('updater.installSuccessMsg')
      );

      // On macOS/Linux or if installer didn't close app automatically, relaunch
      try {
        await relaunch();
      } catch {
        // App may have already exited on Windows installer launch
      }
    } catch (err: any) {
      console.error('Download and install failed:', err);
      const errMsg = err?.message || String(err);
      this.errorMessage = errMsg;
      toast.error(
        localeState.t('updater.downloadFailedTitle'),
        errMsg
      );
    } finally {
      this.isDownloading = false;
    }
  }

  dismissModal(): void {
    this.showModal = false;
  }

  openModal(): void {
    this.showModal = true;
  }
}

export const updateState = new UpdateState();
