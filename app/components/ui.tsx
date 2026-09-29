import Link from "next/link";
import type { ReactNode } from "react";

import { AlertIcon, ArrowIcon, CheckIcon } from "./icons";
import { Phase } from "@/lib/election-model";

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface p-6 shadow-card ${
        interactive ? "card-hover" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function CardTitle({
  children,
  hint,
  icon,
}: {
  children: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      {icon ? (
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-wash text-brand">
          {icon}
        </span>
      ) : null}
      <div>
        <h2 className="text-base font-semibold tracking-tight">{children}</h2>
        {hint ? (
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {lead ? <p className="mt-2 leading-relaxed text-ink-soft">{lead}</p> : null}
    </div>
  );
}

const PHASE_STYLE: Record<Phase, string> = {
  [Phase.Setup]: "bg-surface-sunken text-ink-soft ring-line-strong",
  [Phase.Registration]: "bg-warning-wash text-warning ring-warning/25",
  [Phase.Voting]: "bg-positive-wash text-positive ring-positive/25",
  [Phase.Ended]: "bg-brand-wash text-brand ring-brand/25",
};

/**
 * The label is passed in rather than looked up, so this stays usable from
 * client components without dragging the dictionary into the browser bundle.
 */
export function PhaseBadge({ phase, label }: { phase: Phase; label: string }) {
  const live = phase === Phase.Voting;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${PHASE_STYLE[phase]}`}
    >
      <span className="relative flex size-2">
        {live ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
        ) : null}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      {label}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  // Each tile is its own <dl> so that <dt>/<dd> are direct children, which is
  // what pairs the label with its value for a screen reader. Wrapping them in a
  // div inside a shared <dl> silently breaks that pairing.
  return (
    <dl
      className={`relative overflow-hidden rounded-2xl border p-5 ${
        accent
          ? "border-brand/25 bg-brand-wash"
          : "border-line bg-surface shadow-card"
      }`}
    >
      <dt className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {label}
        {icon ? <span aria-hidden>{icon}</span> : null}
      </dt>
      <dd className="numeric mt-2 text-3xl font-semibold">{value}</dd>
      {sub ? <dd className="mt-0.5 text-xs text-ink-soft">{sub}</dd> : null}
    </dl>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success" | "warning";
  children: ReactNode;
}) {
  const tones = {
    info: "border-line bg-surface-muted text-ink",
    error: "border-danger/30 bg-danger-wash text-danger",
    success: "border-positive/30 bg-positive-wash text-positive",
    warning: "border-warning/30 bg-warning-wash text-warning",
  } as const;

  const Glyph = tone === "success" ? CheckIcon : AlertIcon;

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm leading-relaxed ${tones[tone]}`}
    >
      {tone !== "info" ? (
        <Glyph size={17} className="mt-0.5 shrink-0" />
      ) : null}
      <span>{children}</span>
    </p>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required = true,
  hint,
  defaultValue,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  hint?: string;
  defaultValue?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line-control bg-surface px-3.5 py-2.5 text-sm outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-4 focus:ring-brand/12"
      />
      {hint ? (
        <span className="mt-1.5 block text-xs leading-relaxed text-ink-soft">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <code className="break-all rounded-md bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.85em] text-ink-soft">
      {children}
    </code>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60";

export const buttonStyles = {
  primary: `${BUTTON_BASE} bg-brand text-brand-ink shadow-card hover:bg-brand-bright`,
  secondary: `${BUTTON_BASE} border border-line bg-surface hover:border-line-strong hover:bg-surface-muted`,
  ghost: `${BUTTON_BASE} text-ink-soft hover:bg-surface-muted hover:text-ink`,
} as const;

export function ButtonLink({
  href,
  children,
  variant = "primary",
  withArrow = false,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttonStyles;
  withArrow?: boolean;
}) {
  return (
    <Link href={href} className={buttonStyles[variant]}>
      {children}
      {withArrow ? <ArrowIcon size={16} /> : null}
    </Link>
  );
}

/** Colour for a candidate, fixed by their ballot position. */
export function seriesColor(index: number): string {
  return `var(--series-${(index % 8) + 1})`;
}

/** Initials avatar tinted with the candidate's own series colour. */
export function CandidateAvatar({
  name,
  index,
  size = 40,
}: {
  name: string;
  index: number;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        color: seriesColor(index),
        background: `color-mix(in oklab, ${seriesColor(index)} 16%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${seriesColor(index)} 30%, transparent)`,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
