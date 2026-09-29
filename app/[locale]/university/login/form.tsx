"use client";

import { useActionState } from "react";

import { universitySignIn, type FormState } from "@/app/actions/auth";
import {
  IconField,
  PasswordField,
  SubmitButton,
} from "@/app/components/auth-fields";
import { KeyIcon, LockIcon, MailIcon } from "@/app/components/icons";
import { Notice } from "@/app/components/ui";

const EMPTY: FormState = {};

export function SignInForm({
  locale,
  labels,
}: {
  locale: string;
  labels: {
    contactEmail: string;
    adminPassword: string;
    signingIn: string;
    submit: string;
    showPassword: string;
    hidePassword: string;
    secureNotice: string;
  };
}) {
  const [state, action, pending] = useActionState(universitySignIn, EMPTY);

  return (
    <div>
      {state.error ? (
        <div className="mb-4">
          <Notice tone="error">{state.error}</Notice>
        </div>
      ) : null}
      <form action={action} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <IconField
          label={labels.contactEmail}
          name="contactEmail"
          type="email"
          icon={<MailIcon size={17} />}
          autoComplete="email"
          placeholder="committee@university.edu"
        />
        <PasswordField
          label={labels.adminPassword}
          name="password"
          icon={<KeyIcon size={17} />}
          autoComplete="current-password"
          showLabel={labels.showPassword}
          hideLabel={labels.hidePassword}
        />
        <SubmitButton pending={pending} pendingLabel={labels.signingIn}>
          {labels.submit}
        </SubmitButton>
      </form>

      <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
        <LockIcon size={14} className="mt-0.5 shrink-0" />
        {labels.secureNotice}
      </p>
    </div>
  );
}
