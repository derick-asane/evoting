import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";

const LOCALE_COOKIE = "locale";

/**
 * Every route lives under `/[locale]`, so a request without one is redirected
 * to the visitor's best match.
 *
 * Order of preference: a locale they chose here before, then what their browser
 * asks for, then English. In Next.js 16 this file is `proxy.ts` — the old
 * `middleware` convention is deprecated.
 */
function pickLocale(request: NextRequest): string {
  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
  if (chosen && (LOCALES as readonly string[]).includes(chosen)) {
    return chosen;
  }

  // Accept-Language, best quality first: "fr-CA,fr;q=0.9,en;q=0.8"
  const header = request.headers.get("accept-language");
  if (header) {
    const ranked = header
      .split(",")
      .map((part) => {
        const [tag, ...params] = part.trim().split(";");
        const quality = params
          .map((param) => param.trim())
          .find((param) => param.startsWith("q="));
        return {
          tag: tag.trim().toLowerCase(),
          quality: quality ? Number(quality.slice(2)) : 1,
        };
      })
      .filter((entry) => entry.tag && !Number.isNaN(entry.quality))
      .sort((a, b) => b.quality - a.quality);

    for (const { tag } of ranked) {
      const base = tag.split("-")[0];
      if ((LOCALES as readonly string[]).includes(base)) return base;
    }
  }

  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return;

  const locale = pickLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, route handlers, the favicon, and anything that looks
  // like a file. `api` matters: those routes have no locale segment, so
  // redirecting them to /en/api/... would 404 every uploaded photo.
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};
