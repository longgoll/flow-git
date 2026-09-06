import {
  type Locale,
  type TranslationKey,
  dictionaries,
  getNestedTranslation,
  interpolate,
} from "../i18n";

const STORAGE_KEY = "flowgit_locale";

export class LocaleState {
  currentLocale = $state<Locale>("vi");

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "vi" || saved === "en") {
        this.currentLocale = saved;
      } else {
        // Default to Vietnamese or browser preference
        const navLang = typeof navigator !== "undefined" ? navigator.language : "vi";
        this.currentLocale = navLang.toLowerCase().startsWith("vi") ? "vi" : "en";
      }
    }
  }

  get locale(): Locale {
    return this.currentLocale;
  }

  get isVietnamese(): boolean {
    return this.currentLocale === "vi";
  }

  get isEnglish(): boolean {
    return this.currentLocale === "en";
  }

  setLocale(locale: Locale) {
    this.currentLocale = locale;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, locale);
    }
  }

  toggleLocale() {
    const next: Locale = this.currentLocale === "vi" ? "en" : "vi";
    this.setLocale(next);
  }

  /**
   * Translate a key with optional dynamic interpolation params
   * e.g. localeState.t('statusBar.gitAuthorTip', { name: 'Dev' })
   */
  t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = dictionaries[this.currentLocale] || dictionaries.vi;
    const raw = getNestedTranslation(dict, key);
    return interpolate(raw, params);
  };
}

export const localeState = new LocaleState();
