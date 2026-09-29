"use client";

import { useActionState } from "react";

import { studentResetPassword, type FormState } from "@/app/actions/auth";
import {
  IconField,
  PasswordField,
  SubmitButton,
} from "@/app/components/auth-fields";
import { KeyIcon, ShieldIcon } from "@/app/components/icons";
import { Notice } from "@/app/components/ui";

const EMPTY: FormState = {};

export function ResetForm({
  locale,
  labels,
}: {
  locale: string;
  labels: {
    resetCode: string;
    resetCodeHint: string;
    choosePassword: string;
    confirmPassword: string;
    passwordHint: string;
    submit: string;
    working: string;
    showPassword: string;
    hidePassword: string;
  };
}) {
  const [state, action, pending] = useActionState(studentResetPassword, EMPTY);

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
          label={labels.resetCode}
          name="code"
          icon={<ShieldIcon size={17} />}
          hint={labels.resetCodeHint}
          placeholder="K3MP-7QXR-9TFA"
          autoComplete="one-time-code"
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
          {labels.submit}
        </SubmitButton>
      </form>
    </div>
  );
}
