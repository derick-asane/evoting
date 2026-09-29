import { locale as routeLocale } from "next/root-params";

import {
  DEFAULT_LOCALE,
  getDictionaryFor,
  isLocale,
  type Dictionary,
  type Locale,
} from "./index";

/**
 * Reads the `[locale]` route segment directly, so the locale never has to be
 * threaded through props.
 *
 * Server Components only. `next/root-params` is not available in Server
 * Actions, Route Handlers or the proxy — those take the locale as an argument
 * and call `getDictionaryFor` from ./index instead.
 */
export async function getLocale(): Promise<Locale> {
  const value = (await routeLocale()) ?? DEFAULT_LOCALE;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<Dictionary> {
  return getDictionaryFor(await getLocale());
}
