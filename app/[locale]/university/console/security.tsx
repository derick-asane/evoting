"use client";

import { useActionState } from "react";

import {
  issueActivationCodesAction,
  issueResetCodeAction,
  type AdminState,
} from "@/app/actions/admin";
import { IdIcon, KeyIcon, LedgerIcon } from "@/app/components/icons";
import { Card, CardTitle, Field, Notice, buttonStyles } from "@/app/components/ui";
import type { Dictionary } from "@/lib/i18n";

const EMPTY: AdminState = {};

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export type AuditRowView = {
  id: string;
  actor: string;
  action: string;
  summary: string;
  ip: string | null;
  when: string;
};

export function ResetIssuer({
  locale,
  labels,
}: {
  locale: string;
  labels: Dictionary["security"];
}) {
  const [state, action, pending] = useActionState(issueResetCodeAction, EMPTY);

  return (
    <Card>
      <CardTitle icon={<KeyIcon size={19} />} hint={labels.issueHint}>
        {labels.issueTitle}
      </CardTitle>

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}

      {/* The code appears once, here, and is never stored in readable form. */}
      {state.notice ? (
        <div className="rounded-xl border border-warning/30 bg-warning-wash p-4">
          <p className="break-words font-mono text-sm text-warning">
            {state.notice}
          </p>
        </div>
      ) : null}

      <form
        action={action}
        className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
      >
        <input type="hidden" name="locale" value={locale} />
        <Field label={labels.issueStudentId} name="studentId" />
        <button
          type="submit"
          disabled={pending}
          className={`${buttonStyles.secondary} h-[42px]`}
        >
          {pending ? labels.issuing : labels.issueCode}
        </button>
      </form>
    </Card>
  );
}

/**
 * Issues the activation sheet.
 *
 * The codes come back once, in the action result, and are never stored in
 * readable form — so this screen offers two ways to get them onto paper before
 * anyone navigates away.
 */
export function ActivationCodes({
  locale,
  labels,
}: {
  locale: string;
  labels: Dictionary["security"];
}) {
  const [state, action, pending] = useActionState(
    issueActivationCodesAction,
    EMPTY,
  );
  const codes = state.activationCodes ?? [];

  return (
    <Card>
      <CardTitle icon={<IdIcon size={19} />} hint={labels.activationHint}>
        {labels.activationTitle}
      </CardTitle>

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.notice ? <Notice tone="info">{state.notice}</Notice> : null}

      {codes.length === 0 ? (
        <form action={action} className="mt-4">
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            disabled={pending}
            className={buttonStyles.secondary}
          >
            {pending ? labels.issuing : labels.activationIssue}
          </button>
        </form>
      ) : (
        <div className="mt-4">
          <Notice tone="warning">{labels.activationWarning}</Notice>

          <div className="mt-3 flex flex-wrap gap-2">
            <DownloadCodes codes={codes} label={labels.activationDownload} />
            <button
              type="button"
              onClick={() => window.print()}
              className={buttonStyles.secondary}
            >
              {labels.activationPrint}
            </button>
            <span className="self-center text-xs text-ink-faint">
              {fill(labels.activationCount, { count: codes.length })}
            </span>
          </div>

          <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-line">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="sticky top-0 bg-surface-muted text-xs uppercase tracking-[0.1em] text-ink-faint">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {labels.activationColumnStudent}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {labels.activationColumnId}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {labels.activationColumnCode}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {codes.map((entry) => (
                  <tr key={entry.studentId}>
                    <td className="px-3 py-2">{entry.fullName}</td>
                    <td className="px-3 py-2 font-mono text-xs text-ink-soft">
                      {entry.studentId}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs font-semibold tracking-wider">
                      {entry.code}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Builds the sheet in the browser; the codes are never sent anywhere. */
function DownloadCodes({
  codes,
  label,
}: {
  codes: NonNullable<AdminState["activationCodes"]>;
  label: string;
}) {
  function download() {
    // Same formula guard as the result sheet: a name beginning with = would
    // otherwise execute when the committee opens this in Excel.
    const cell = (value: string) =>
      `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`;

    const rows = [
      ["Student", "Student ID", "Programme", "Activation code"].map(cell).join(","),
      ...codes.map((entry) =>
        [entry.fullName, entry.studentId, entry.programme, entry.code]
          .map(cell)
          .join(","),
      ),
    ];

    const url = URL.createObjectURL(
      new Blob([`﻿${rows.join("\r\n")}\r\n`], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `activation-codes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={download} className={buttonStyles.primary}>
      {label}
    </button>
  );
}

export function ActivityLog({
  rows,
  labels,
}: {
  rows: AuditRowView[];
  labels: Dictionary["security"];
}) {
  return (
    <Card>
      <CardTitle icon={<LedgerIcon size={19} />} hint={labels.auditHint}>
        {labels.auditTitle}
      </CardTitle>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">{labels.auditEmpty}</p>
      ) : (
        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="sticky top-0 bg-surface text-xs uppercase tracking-[0.1em] text-ink-faint">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {labels.auditWhen}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {labels.auditWho}
                </th>
                <th scope="col" className="py-2 font-medium">
                  {labels.auditWhat}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-xs text-ink-faint">
                    {row.when}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-ink-soft">
                    {row.actor}
                    {row.ip ? (
                      <span className="block text-ink-faint">{row.ip}</span>
                    ) : null}
                  </td>
                  <td className="py-2.5">
                    {row.summary}
                    <span className="mt-0.5 block font-mono text-xs text-ink-faint">
                      {row.action}
                    </span>
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
