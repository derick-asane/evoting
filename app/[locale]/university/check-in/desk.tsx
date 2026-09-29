"use client";

import { useActionState, useEffect, useRef } from "react";

import { checkInAction, type CheckInState } from "@/app/actions/admin";
import { CheckIcon, IdIcon, UsersIcon } from "@/app/components/icons";
import { Card, CardTitle, Notice, buttonStyles } from "@/app/components/ui";
import type { Dictionary } from "@/lib/i18n";

const EMPTY: CheckInState = {};

export type DeskRowView = {
  id: string;
  studentId: string;
  fullName: string;
  issuedBy: string;
  issuedAt: string;
  state: "open" | "used" | "expired";
};

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/**
 * The desk.
 *
 * One field, one button, and the cleared student's name shown large enough to
 * read against the card in the operator's hand — that comparison is the whole
 * control, so the name is the biggest thing on the screen rather than a line
 * of confirmation text.
 */
export function CheckInDesk({
  electionId,
  locale,
  labels,
}: {
  electionId: string;
  locale: string;
  labels: Dictionary["checkIn"];
}) {
  const [state, action, pending] = useActionState(checkInAction, EMPTY);
  const input = useRef<HTMLInputElement>(null);

  // Back to the field after every student, so the operator can work through a
  // queue without reaching for the mouse.
  useEffect(() => {
    if (!pending) input.current?.focus();
  }, [pending, state]);

  return (
    <Card>
      <CardTitle icon={<IdIcon size={19} />} hint={labels.deskHint}>
        {labels.deskTitle}
      </CardTitle>

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}

      {state.clearedName ? (
        <div className="mt-4 rounded-2xl border border-positive/30 bg-positive-wash p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-positive text-surface">
              <CheckIcon size={20} />
            </span>
            <div className="min-w-0">
              {/* Large, because the operator reads this against the card. */}
              <p className="truncate text-xl font-semibold leading-tight">
                {state.clearedName}
              </p>
              <p className="font-mono text-sm text-ink-soft">
                {state.clearedStudentId}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {state.notice}
          </p>
        </div>
      ) : null}

      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input type="hidden" name="electionId" value={electionId} />
        <input type="hidden" name="locale" value={locale} />
        <div>
          <label htmlFor="desk-student" className="mb-1.5 block text-sm font-medium">
            {labels.studentId}
          </label>
          <input
            ref={input}
            id="desk-student"
            name="studentId"
            required
            autoFocus
            autoComplete="off"
            placeholder="CS2021001"
            className="w-full rounded-xl border border-line-control bg-surface px-3.5 py-2.5 font-mono text-base uppercase outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/12"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className={`${buttonStyles.primary} h-[46px] self-end`}
        >
          {pending ? labels.checkingIn : labels.checkIn}
        </button>
      </form>

      <p className="mt-4 rounded-xl bg-surface-sunken p-3 text-xs leading-relaxed text-ink-soft">
        {labels.cardReminder}
      </p>
    </Card>
  );
}

/** What the desk has done so far, so a disputed pass leads back to a person. */
export function CheckInLog({
  rows,
  issued,
  used,
  labels,
}: {
  rows: DeskRowView[];
  issued: number;
  used: number;
  labels: Dictionary["checkIn"];
}) {
  return (
    <Card>
      <CardTitle icon={<UsersIcon size={19} />} hint={labels.logHint}>
        {labels.logTitle}
      </CardTitle>

      <p className="text-sm text-ink-soft">
        {fill(labels.logTally, { issued, used })}
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">{labels.logEmpty}</p>
      ) : (
        <div className="mt-4 max-h-96 overflow-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="sticky top-0 bg-surface text-xs uppercase tracking-[0.1em] text-ink-faint">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {labels.logWhen}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {labels.logStudent}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {labels.logBy}
                </th>
                <th scope="col" className="py-2 font-medium">
                  {labels.logState}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-xs text-ink-faint">
                    {row.issuedAt}
                  </td>
                  <td className="py-2.5 pr-4">
                    {row.fullName}
                    <span className="block font-mono text-xs text-ink-faint">
                      {row.studentId}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-ink-soft">
                    {row.issuedBy}
                  </td>
                  <td className="py-2.5">
                    <State state={row.state} labels={labels} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function State({
  state,
  labels,
}: {
  state: DeskRowView["state"];
  labels: Dictionary["checkIn"];
}) {
  // Each state carries its own word, so the colour is never the only thing
  // saying what happened.
  const tones = {
    used: "border-positive/30 bg-positive-wash text-positive",
    open: "border-brand/30 bg-brand-wash text-brand",
    expired: "border-line bg-surface-muted text-ink-faint",
  } as const;

  const words = {
    used: labels.stateVoted,
    open: labels.stateOpen,
    expired: labels.stateExpired,
  } as const;

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[state]}`}
    >
      {words[state]}
    </span>
  );
}
