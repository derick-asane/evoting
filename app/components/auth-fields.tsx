"use client";

import { useId, useState, type ReactNode } from "react";

import { EyeIcon, EyeOffIcon } from "./icons";

const INPUT =
  "w-full rounded-xl border border-line bg-surface py-2.5 pl-10 text-sm outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-4 focus:ring-brand/12";

/** Text input with a leading icon, so the field reads at a glance. */
export function IconField({
  label,
  name,
  icon,
  type = "text",
  hint,
  autoComplete,
  placeholder,
  required = true,
  className = "",
}: {
  label: string;
  name: string;
  icon: ReactNode;
  type?: string;
  hint?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  /** Extra input classes, for fields that want a monospace or wider tracking. */
  className?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
          {icon}
        </span>
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`${INPUT} pr-3.5 ${className}`}
        />
      </div>
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Password field with a reveal toggle.
 *
 * Typing a password you cannot see is the most common reason a sign-in fails
 * twice in a row, so the toggle is worth the few lines.
 */
export function PasswordField({
  label,
  name,
  icon,
  hint,
  autoComplete = "current-password",
  showLabel,
  hideLabel,
}: {
  label: string;
  name: string;
  icon: ReactNode;
  hint?: string;
  autoComplete?: string;
  showLabel: string;
  hideLabel: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
          {icon}
        </span>
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          className={`${INPUT} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink-faint transition hover:bg-surface-muted hover:text-ink"
        >
          {visible ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
        </button>
      </div>
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}

/** Submit button with an inline spinner while the action is in flight. */
export function SubmitButton({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink shadow-card transition hover:bg-brand-bright disabled:opacity-70"
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Spinner() {
  return (
    <svg
      className="size-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
