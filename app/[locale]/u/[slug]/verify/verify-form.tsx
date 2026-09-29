"use client";

import { useActionState } from "react";

import { verifyReceipt, type VerifyState } from "@/app/actions/verify";
import { CheckIcon } from "@/app/components/icons";
import { Card, Notice, buttonStyles } from "@/app/components/ui";

const EMPTY: VerifyState = {};

type Labels = {
  receiptCode: string;
  submit: string;
  checking: string;
  foundTitle: string;
  foundIn: string;
  foundWarning: string;
};

export function VerifyForm({
  slug,
  locale,
  labels,
}: {
  slug: string;
  locale: string;
  labels: Labels;
}) {
  const [state, action, pending] = useActionState(verifyReceipt, EMPTY);

  return (
    <Card>
      <form action={action} className="space-y-4">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="locale" value={locale} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            {labels.receiptCode}
          </span>
          <input
            name="receiptId"
            required
            spellCheck={false}
            placeholder="0x…"
            className="w-full rounded-xl border border-line-control bg-surface px-3.5 py-2.5 font-mono text-sm outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-4 focus:ring-brand/12"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className={`${buttonStyles.primary} w-full`}
        >
          {pending ? labels.checking : labels.submit}
        </button>
      </form>

      {state.error ? (
        <div className="mt-4">
          <Notice tone="error">{state.error}</Notice>
        </div>
      ) : null}

      {state.result ? (
        <div className="mt-5 rounded-2xl border border-positive/30 bg-positive-wash p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-positive">
            <CheckIcon size={17} />
            {labels.foundTitle}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {labels.foundIn.replace("{election}", state.result.electionTitle)}
          </p>
          <ul className="mt-3 divide-y divide-positive/20 rounded-xl bg-surface">
            {state.result.lines.map((line) => (
              <li
                key={line.position}
                className="flex flex-wrap items-baseline justify-between gap-2 px-3.5 py-2.5 text-sm"
              >
                <span className="text-ink-soft">{line.position}</span>
                <span className="font-medium">
                  {line.candidate}
                  {line.party ? (
                    <span className="ml-1.5 font-normal text-ink-soft">
                      ({line.party})
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            {labels.foundWarning}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
