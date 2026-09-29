import { en } from "./en";
import { fr } from "./fr";

/**
 * Locale plumbing with no framework imports, so this module is safe everywhere:
 * the proxy, Server Actions, Server Components and type-only client imports.
 *
 * The `[locale]`-segment helpers live in ./server, because `next/root-params`
 * works only in Server Components and cannot be bundled into the proxy.
 */

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/**
 * English defines the shape. Every other locale is checked against it, so a
 * missing French key fails the build instead of falling back at runtime.
 */
export type Dictionary = {
  readonly [Section in keyof typeof en]: {
    readonly [Key in keyof (typeof en)[Section]]: string;
  };
};

const dictionaries: Record<Locale, Dictionary> = { en, fr };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** For Server Actions and anywhere the locale is already in hand. */
export function getDictionaryFor(locale: string): Dictionary {
  return dictionaries[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

/**
 * Fills `{placeholders}` in a translated string.
 *
 * Interpolation rather than string concatenation, so translators can move a
 * value to wherever their grammar needs it.
 */
export function t(
  template: string,
  values: Record<string, string | number> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Locale-aware date formatting for ballot timestamps. */
export function formatDateTime(locale: Locale, epochSeconds: number): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(epochSeconds * 1000));
}

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB").format(value);
}
