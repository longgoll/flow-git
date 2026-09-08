import {
  type Locale,
  type TranslationKey,
  dictionaries,
  getNestedTranslation,
  interpolate,
} from "../i18n";

const STORAGE_KEY = "flowgit_locale";

/**
 * Phát hiện ngôn ngữ ưu tiên của máy (Hệ điều hành / Trình duyệt)
 * Duyệt theo thứ tự ưu tiên của hệ thống: nếu ngôn ngữ máy là Tiếng Việt thì dùng 'vi',
 * các ngôn ngữ khác sẽ mặc định ưu tiên 'en'.
 */
function detectSystemLocale(): Locale {
  if (typeof navigator === "undefined") return "vi";

  const candidates: string[] = [];
  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    candidates.push(...navigator.languages);
  }
  if (navigator.language) {
    candidates.push(navigator.language);
  }
  const navAny = navigator as unknown as Record<string, unknown>;
  if (typeof navAny.userLanguage === "string") {
    candidates.push(navAny.userLanguage);
  }
  if (typeof navAny.browserLanguage === "string") {
    candidates.push(navAny.browserLanguage);
  }
  if (typeof navAny.systemLanguage === "string") {
    candidates.push(navAny.systemLanguage);
  }

  for (const lang of candidates) {
    if (!lang || typeof lang !== "string") continue;
    const clean = lang.trim().toLowerCase();
    if (clean.startsWith("vi")) {
      return "vi";
    }
    if (clean.startsWith("en")) {
      return "en";
    }
  }

  // Nếu máy cài ngôn ngữ khác (ví dụ de, fr, ja...), chuẩn quốc tế fallback về en
  return "en";
}

export class LocaleState {
  currentLocale = $state<Locale>(detectSystemLocale());

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "vi" || saved === "en") {
        this.currentLocale = saved;
      } else {
        // Ưu tiên ngôn ngữ của máy khi app mới cài đặt
        this.currentLocale = detectSystemLocale();
      }

      if (typeof document !== "undefined") {
        document.documentElement.lang = this.currentLocale;
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
      if (typeof document !== "undefined") {
        document.documentElement.lang = locale;
      }
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
