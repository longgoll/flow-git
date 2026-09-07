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

/**
 * Kiểm tra xem ứng dụng có đang chạy trên Windows hay không.
 * Trên Windows, ứng dụng được phân phối qua Microsoft Store (MSIX) hoặc bộ cài riêng.
 * Microsoft Store tự động quản lý cập nhật ngầm. Việc tắt updater riêng trên Windows
 * giúp ứng dụng vượt qua 100% các tiêu chuẩn kiểm duyệt tự động (WACK) và chính sách Store Policy 10.2.1.
 */
export function isWindowsPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /windows|win32|win64/i.test(navigator.userAgent || navigator.platform || '');
}

export class UpdateState {
  // Chỉ hỗ trợ updater độc lập trên macOS và Linux. Ẩn và tắt hoàn toàn trên Windows.
  readonly isSupportedPlatform: boolean = !isWindowsPlatform();

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
  private periodicCheckInterval: ReturnType<typeof setInterval> | null = null;
  private readonly PERIODIC_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 giờ

  async checkForUpdates(manual: boolean = false): Promise<boolean> {
    if (!this.isSupportedPlatform) return false;
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

      // Phân biệt lỗi "chưa có release" với lỗi mạng thực sự.
      // Tauri updater trả về message này khi latest.json không tồn tại (404).
      const isNoReleaseYet =
        errMsg.includes('Could not fetch a valid release JSON') ||
        errMsg.includes('No releases') ||
        errMsg.includes('404');

      if (manual) {
        if (isNoReleaseYet) {
          // Chưa có release → coi như đang dùng bản mới nhất
          toast.success(
            localeState.t('updater.upToDateTitle'),
            localeState.t('updater.upToDateMsg')
          );
        } else {
          // Lỗi mạng thực sự → mới cảnh báo
          toast.warning(
            localeState.t('updater.checkFailedTitle'),
            localeState.t('updater.checkFailedMsg', { error: errMsg })
          );
        }
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

  /**
   * Bắt đầu kiểm tra cập nhật định kỳ mỗi 4 giờ (silent, không toast).
   * Nên gọi sau khi app mount xong.
   */
  startPeriodicCheck(): void {
    if (!this.isSupportedPlatform) return;
    this.stopPeriodicCheck(); // clear interval cũ nếu có
    this.periodicCheckInterval = setInterval(() => {
      this.checkForUpdates(false).catch(() => {});
    }, this.PERIODIC_INTERVAL_MS);
  }

  /**
   * Dừng kiểm tra định kỳ và giải phóng interval.
   * Nên gọi trong onDestroy để tránh memory leak.
   */
  stopPeriodicCheck(): void {
    if (this.periodicCheckInterval !== null) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }
  }
}

export const updateState = new UpdateState();
