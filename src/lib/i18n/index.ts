import { vi, type TranslationSchema } from "./vi";
import { en } from "./en";

export type Locale = "vi" | "en";
export type { TranslationSchema };

export const dictionaries: Record<Locale, TranslationSchema> = {
  vi,
  en,
};

/**
 * Type-safe dot notation path resolution helper
 */
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationSchema>;

/**
 * Resolve a keypath like "toolbar.guidesTitle" inside dictionary
 */
export function getNestedTranslation(
  dict: TranslationSchema,
  path: string
): string {
  const parts = path.split(".");
  let current: any = dict;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return path; // Fallback to path key if missing
    }
  }
  return typeof current === "string" ? current : path;
}

/**
 * Interpolate params into string: "Hello {name}" -> "Hello Alice"
 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in params ? String(params[key]) : `{${key}}`;
  });
}
