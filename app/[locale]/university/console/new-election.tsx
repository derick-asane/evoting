"use client";

import { useActionState } from "react";

import { createElectionAction, type AdminState } from "@/app/actions/admin";
import { BallotIcon } from "@/app/components/icons";
import { Card, CardTitle, Field, Notice, buttonStyles } from "@/app/components/ui";

const EMPTY: AdminState = {};

export function NewElection({
  locale,
  labels,
}: {
  locale: string;
  labels: {
    startElection: string;
    startElectionHint: string;
    electionTitle: string;
    electionTitleHint: string;
    deploy: string;
    deploying: string;
  };
}) {
  const [state, action, pending] = useActionState(createElectionAction, EMPTY);

  return (
    <Card>
      <CardTitle icon={<BallotIcon size={19} />} hint={labels.startElectionHint}>
        {labels.startElection}
      </CardTitle>

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.notice ? <Notice tone="success">{state.notice}</Notice> : null}

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <Field
          label={labels.electionTitle}
          name="title"
          hint={labels.electionTitleHint}
        />
        <button type="submit" disabled={pending} className={buttonStyles.primary}>
          {pending ? labels.deploying : labels.deploy}
        </button>
      </form>
    </Card>
  );
}
