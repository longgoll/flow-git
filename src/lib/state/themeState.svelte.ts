export type ThemeMode = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'flowgit_theme';

export class ThemeState {
  theme = $state<ThemeMode>('dark');
  systemIsDark = $state<boolean>(true);

  private mediaQuery: MediaQueryList | null = null;
  private mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        this.theme = saved;
      } else {
        this.theme = 'dark';
      }

      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemIsDark = this.mediaQuery.matches;

      this.mediaListener = (e: MediaQueryListEvent) => {
        this.systemIsDark = e.matches;
        if (this.theme === 'system') {
          this.applyTheme();
        }
      };

      if (this.mediaQuery.addEventListener) {
        this.mediaQuery.addEventListener('change', this.mediaListener);
      } else {
        // Fallback for older WebKit / WebView
        this.mediaQuery.addListener(this.mediaListener);
      }

      this.applyTheme();
    }
  }

  get isDark(): boolean {
    if (this.theme === 'system') {
      return this.systemIsDark;
    }
    return this.theme === 'dark';
  }

  setTheme(newTheme: ThemeMode) {
    this.theme = newTheme;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newTheme);
      this.applyTheme();
    }
  }

  toggleTheme() {
    const next: ThemeMode = this.isDark ? 'light' : 'dark';
    this.setTheme(next);
  }

  applyTheme() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const dark = this.isDark;

    if (dark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }
}

export const themeState = new ThemeState();
