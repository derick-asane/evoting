import type { ReactNode } from "react";

import { BrandMark, CheckIcon } from "./icons";

/**
 * Split-panel frame shared by every sign-in screen.
 *
 * The left panel is decorative but not empty: it restates the three guarantees,
 * which is exactly what someone about to hand over a password wants to read.
 * It collapses away below `lg`, where the form alone should own the screen.
 */
export function AuthShell({
  eyebrow,
  title,
  lead,
  panelTitle,
  panelPoints,
  footer,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  panelTitle: string;
  panelPoints: string[];
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-float">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          {/* ---------------------------------------------------- Art panel */}
          <aside className="relative hidden overflow-hidden bg-page-deep p-10 lg:flex lg:flex-col">
            <div className="bg-aurora absolute inset-0" aria-hidden />
            <div
              className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(80%_70%_at_30%_30%,black,transparent)]"
              aria-hidden
            />
            <SealArt />

            <div className="relative flex flex-1 flex-col">
              <div className="flex items-center gap-2.5 font-semibold tracking-tight">
                <BrandMark size={28} />
                Campus Ballot
              </div>

              <div className="mt-auto">
                <h2 className="font-display text-3xl leading-tight tracking-tight">
                  {panelTitle}
                </h2>
                <ul className="mt-6 space-y-3.5">
                  {panelPoints.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                        <CheckIcon size={12} />
                      </span>
                      <span className="leading-relaxed text-ink-soft">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          {/* --------------------------------------------------------- Form */}
          <div className="p-8 sm:p-10">
            <div className="mx-auto w-full max-w-sm">
              {eyebrow ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="font-display text-3xl leading-tight tracking-tight">
                {title}
              </h1>
              {lead ? (
                <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                  {lead}
                </p>
              ) : null}

              <div className="mt-7">{children}</div>

              {footer ? (
                <div className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-soft">
                  {footer}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A wax-seal motif: the ballot is closed, and closed things can be checked. */
function SealArt() {
  return (
    <svg
      viewBox="0 0 220 220"
      className="pointer-events-none absolute -right-10 top-1/2 w-64 -translate-y-1/2 opacity-[0.16]"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="110" cy="110" r="88" stroke="var(--brand)" strokeWidth="1.5" />
      <circle
        cx="110"
        cy="110"
        r="70"
        stroke="var(--brand)"
        strokeWidth="1.5"
        strokeDasharray="4 7"
      />
      <circle cx="110" cy="110" r="50" stroke="var(--brand)" strokeWidth="1.5" />
      <path
        d="m88 110 16 16 30-32"
        stroke="var(--brand)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {Array.from({ length: 12 }).map((_, index) => {
        const angle = (index / 12) * Math.PI * 2;
        return (
          <circle
            key={index}
            cx={110 + Math.cos(angle) * 88}
            cy={110 + Math.sin(angle) * 88}
            r="3"
            fill="var(--brand)"
          />
        );
      })}
    </svg>
  );
}
