/**
 * Screen Wake Lock API manager
 * Keeps the Android device screen turned on during lyric playback / performance
 */
class WakeLockManager {
  private sentinel: any = null;
  private isRequested: boolean = false;

  public isSupported(): boolean {
    return 'wakeLock' in navigator;
  }

  public async request(): Promise<boolean> {
    if (!this.isSupported()) return false;
    this.isRequested = true;

    try {
      if (!this.sentinel || this.sentinel.released) {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
        
        this.sentinel.addEventListener('release', () => {
          this.sentinel = null;
          // If we still want it requested, try re-acquiring on visibility change
        });
      }
      return true;
    } catch (err) {
      console.warn('Screen WakeLock error:', err);
      return false;
    }
  }

  public async release(): Promise<void> {
    this.isRequested = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch (err) {
        console.warn('WakeLock release error:', err);
      } finally {
        this.sentinel = null;
      }
    }
  }

  public initVisibilityListener(): void {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && this.isRequested) {
        await this.request();
      }
    });
  }
}

export const wakeLock = new WakeLockManager();
wakeLock.initVisibilityListener();
