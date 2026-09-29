"use client";

import { useEffect, useRef, useState } from "react";

import { Spinner } from "./auth-fields";
import { ChevronDownIcon, LogoutIcon, UserIcon } from "./icons";

/**
 * Account control in the header: identity, then a deliberate sign-out.
 *
 * Signing out mid-election is the kind of thing people do by accident on a
 * shared library machine, so it asks once before dropping the session.
 */
export function AccountMenu({
  name,
  detail,
  signOut,
  labels,
}: {
  name: string;
  detail?: string;
  signOut: () => Promise<void>;
  labels: {
    menu: string;
    signOut: string;
    question: string;
    body: string;
    confirm: string;
    cancel: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setConfirming(false);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={labels.menu}
        className="flex items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-2.5 transition hover:bg-surface-muted"
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-brand-wash text-xs font-semibold text-brand">
          {initials || <UserIcon size={15} />}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
          {name}
        </span>
        <ChevronDownIcon
          size={15}
          className={`text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-surface shadow-float"
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-wash text-sm font-semibold text-brand">
              {initials || <UserIcon size={17} />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              {detail ? (
                <p className="truncate font-mono text-xs text-ink-faint">
                  {detail}
                </p>
              ) : null}
            </div>
          </div>

          {confirming ? (
            <div className="p-4">
              <p className="text-sm font-medium">{labels.question}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                {labels.body}
              </p>
              <form
                action={async () => {
                  setLeaving(true);
                  await signOut();
                }}
                className="mt-3.5 flex gap-2"
              >
                <button
                  type="submit"
                  disabled={leaving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70"
                >
                  {leaving ? <Spinner /> : null}
                  {labels.confirm}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-lg border border-line px-3 py-2 text-sm font-medium transition hover:bg-surface-muted"
                >
                  {labels.cancel}
                </button>
              </form>
            </div>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => setConfirming(true)}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-ink-soft transition hover:bg-surface-muted hover:text-danger"
            >
              <LogoutIcon size={17} />
              {labels.signOut}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
