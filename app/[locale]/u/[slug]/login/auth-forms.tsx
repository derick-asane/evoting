"use client";

import { useActionState, useState } from "react";

import { studentActivate, studentSignIn, type FormState } from "@/app/actions/auth";
import {
  IconField,
  PasswordField,
  SubmitButton,
} from "@/app/components/auth-fields";
import { IdIcon, KeyIcon, LockIcon } from "@/app/components/icons";
import { Notice } from "@/app/components/ui";

const EMPTY: FormState = {};

export type AuthLabels = {
  tabSignIn: string;
  tabActivate: string;
  studentId: string;
  password: string;
  choosePassword: string;
  confirmPassword: string;
  activationCode: string;
  activateHint: string;
  activateNoCode: string;
  passwordHint: string;
  signIn: string;
  activateSubmit: string;
  working: string;
  showPassword: string;
  hidePassword: string;
  secureNotice: string;
};

export function AuthForms({
  slug,
  locale,
  labels,
}: {
  slug: string;
  locale: string;
  labels: AuthLabels;
}) {
  const [mode, setMode] = useState<"signin" | "activate">("signin");
  const [signInState, signInAction, signingIn] = useActionState(studentSignIn, EMPTY);
  const [activateState, activateAction, activating] = useActionState(
    studentActivate,
    EMPTY,
  );

  const state = mode === "signin" ? signInState : activateState;
  const pending = mode === "signin" ? signingIn : activating;

  return (
    <div>
      {/* Sliding indicator rather than two separate buttons, so the pair reads
          as one control with a current position. */}
      <div
        role="tablist"
        className="relative mb-6 grid grid-cols-2 rounded-xl bg-surface-sunken p-1"
      >
        <span
          className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-lg bg-surface shadow-card transition-transform duration-200 ease-out"
          style={{
            transform: mode === "signin" ? "translateX(0.25rem)" : "translateX(calc(100% + 0.25rem))",
          }}
          aria-hidden
        />
        <Tab active={mode === "signin"} onClick={() => setMode("signin")}>
          {labels.tabSignIn}
        </Tab>
        <Tab active={mode === "activate"} onClick={() => setMode("activate")}>
          {labels.tabActivate}
        </Tab>
      </div>

      {state.error ? (
        <div className="mb-4">
          <Notice tone="error">{state.error}</Notice>
        </div>
      ) : null}

      {mode === "signin" ? (
        <form action={signInAction} className="space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="locale" value={locale} />
          <IconField
            label={labels.studentId}
            name="studentId"
            icon={<IdIcon size={17} />}
            autoComplete="username"
            placeholder="CS2021001"
          />
          <PasswordField
            label={labels.password}
            name="password"
            icon={<KeyIcon size={17} />}
            autoComplete="current-password"
            showLabel={labels.showPassword}
            hideLabel={labels.hidePassword}
          />
          <SubmitButton pending={pending} pendingLabel={labels.working}>
            {labels.signIn}
          </SubmitButton>
        </form>
      ) : (
        <form action={activateAction} className="space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="locale" value={locale} />
          {/* The code, not the student ID. A matriculation number identifies a
              student; it does not prove you are one. */}
          <IconField
            label={labels.activationCode}
            name="code"
            icon={<KeyIcon size={17} />}
            autoComplete="one-time-code"
            placeholder="K3MP-7QXR-9TFA"
            hint={labels.activateHint}
            className="font-mono uppercase tracking-wider"
          />
          <PasswordField
            label={labels.choosePassword}
            name="password"
            icon={<KeyIcon size={17} />}
            autoComplete="new-password"
            hint={labels.passwordHint}
            showLabel={labels.showPassword}
            hideLabel={labels.hidePassword}
          />
          <PasswordField
            label={labels.confirmPassword}
            name="confirmPassword"
            icon={<KeyIcon size={17} />}
            autoComplete="new-password"
            showLabel={labels.showPassword}
            hideLabel={labels.hidePassword}
          />
          <SubmitButton pending={pending} pendingLabel={labels.working}>
            {labels.activateSubmit}
          </SubmitButton>

          {/* Says plainly why the code exists, so a student who turns up
              without one knows to go to the committee rather than assuming
              the site is broken. */}
          <p className="rounded-xl bg-surface-sunken p-3 text-xs leading-relaxed text-ink-soft">
            {labels.activateNoCode}
          </p>
        </form>
      )}

      <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
        <LockIcon size={14} className="mt-0.5 shrink-0" />
        {labels.secureNotice}
      </p>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative z-10 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? "text-ink" : "text-ink-soft hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
