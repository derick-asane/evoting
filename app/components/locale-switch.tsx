"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { LinkIcon } from "./icons";

/**
 * Swaps the locale segment in the current path, so the visitor stays on the
 * page they were reading, and remembers the choice for next time.
 */
export function LocaleSwitch({
  current,
  other,
  label,
}: {
  current: string;
  other: string;
  label: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchLocale() {
    // One year, so the choice survives the gap between elections.
    document.cookie = `locale=${other}; path=/; max-age=31536000; samesite=lax`;

    const next = pathname.startsWith(`/${current}`)
      ? pathname.replace(`/${current}`, `/${other}`) || `/${other}`
      : `/${other}${pathname}`;

    startTransition(() => {
      router.push(next);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={pending}
      lang={other}
      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-muted hover:text-ink disabled:opacity-60"
    >
      <LinkIcon size={15} aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{other.toUpperCase()}</span>
    </button>
  );
}
