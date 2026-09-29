"use client";

import Link from "next/link";
import { useActionState } from "react";

import { setSupervisedAction, type AdminState } from "@/app/actions/admin";
import { ShieldIcon } from "@/app/components/icons";
import { Card, CardTitle, Notice, buttonStyles } from "@/app/components/ui";
import type { Dictionary } from "@/lib/i18n";

const EMPTY: AdminState = {};

/**
 * The supervision switch.
 *
 * Kept next to a link to the desk, because turning it on without anyone
 * staffing the desk stops every student from voting — the two belong on screen
 * together.
 */
export function Supervision({
  electionId,
  supervised,
  locale,
  labels,
}: {
  electionId: string;
  supervised: boolean;
  locale: string;
  labels: Dictionary["checkIn"];
}) {
  const [state, action, pending] = useActionState(setSupervisedAction, EMPTY);

  return (
    <Card>
      <CardTitle icon={<ShieldIcon size={19} />} hint={labels.consoleHint}>
        {labels.consoleTitle}
      </CardTitle>

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.notice ? <Notice tone="success">{state.notice}</Notice> : null}

      <p
        className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
          supervised
            ? "border-positive/30 bg-positive-wash text-positive"
            : "border-line bg-surface-muted text-ink-soft"
        }`}
      >
        {supervised ? labels.consoleOn : labels.consoleOff}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <form action={action}>
          <input type="hidden" name="electionId" value={electionId} />
          <input type="hidden" name="locale" value={locale} />
          <input
            type="hidden"
            name="supervised"
            value={supervised ? "false" : "true"}
          />
          <button
            type="submit"
            disabled={pending}
            className={supervised ? buttonStyles.secondary : buttonStyles.primary}
          >
            {supervised ? labels.consoleDisable : labels.consoleEnable}
          </button>
        </form>

        <Link
          href={`/${locale}/university/check-in`}
          className={buttonStyles.secondary}
        >
          {labels.consoleOpenDesk}
        </Link>
      </div>
    </Card>
  );
}
