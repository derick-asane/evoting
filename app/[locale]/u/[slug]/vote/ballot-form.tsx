"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { castBallot, type VoteState } from "@/app/actions/vote";
import { CheckIcon } from "@/app/components/icons";
import { Portrait } from "@/app/components/portrait";
import {
  Card,
  CardTitle,
  Mono,
  Notice,
  buttonStyles,
  seriesColor,
} from "@/app/components/ui";
import type { Candidate } from "@/lib/election-model";

const EMPTY: VoteState = {};

/** A candidate plus the face and pitch stored alongside them. */
export type BallotCandidate = Candidate & {
  photoId: string | null;
  manifesto: string | null;
};

/** One post on the ballot, with everyone standing for it. */
export type BallotPosition = {
  id: number;
  title: string;
  candidates: BallotCandidate[];
};

type Labels = {
  title: string;
  hint: string;
  legend: string;
  abstain: string;
  submit: string;
  submitting: string;
  finalWarning: string;
  confirmLabel: string;
  confirmHint: string;
  partiallyVoted: string;
  recordedTitle: string;
  recordedLead: string;
  yourChoices: string;
  leftBlank: string;
  receiptTitle: string;
  receiptBody: string;
  transaction: string;
  copyReceipt: string;
  copiedReceipt: string;
  downloadReceipt: string;
  verifyMine: string;
  seeCount: string;
};

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

const ABSTAIN = "abstain";

export function BallotForm({
  electionId,
  positions,
  base,
  locale,
  labels,
  partial,
}: {
  electionId: string;
  positions: BallotPosition[];
  base: string;
  locale: string;
  labels: Labels;
  /** True when some posts were already voted for in an earlier ballot. */
  partial: boolean;
}) {
  const [state, action, pending] = useActionState(castBallot, EMPTY);

  // One selection per position. `ABSTAIN` is an explicit choice to skip, which
  // is different from having not looked at the position yet.
  const [choices, setChoices] = useState<Record<number, string>>({});

  if (state.receipt) {
    return <Receipt receipt={state.receipt} base={base} labels={labels} />;
  }

  const chosenCount = Object.values(choices).filter(
    (value) => value !== ABSTAIN,
  ).length;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="electionId" value={electionId} />
      <input type="hidden" name="locale" value={locale} />

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {partial ? <Notice tone="info">{labels.partiallyVoted}</Notice> : null}

      <p className="text-sm text-ink-soft">{labels.hint}</p>

      {positions.map((position) => (
        <Card key={position.id}>
          <CardTitle>{position.title}</CardTitle>

          <fieldset className="space-y-2.5" disabled={pending}>
            <legend className="sr-only">
              {fill(labels.legend, { position: position.title })}
            </legend>

            {position.candidates.map((candidate) => {
              const selected = choices[position.id] === String(candidate.id);
              return (
                <label
                  key={candidate.id}
                  className="flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition"
                  style={{
                    borderColor: selected
                      ? seriesColor(candidate.id)
                      : "var(--line)",
                    background: selected
                      ? `color-mix(in oklab, ${seriesColor(candidate.id)} 8%, transparent)`
                      : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    name={`position-${position.id}`}
                    value={candidate.id}
                    checked={selected}
                    onChange={() =>
                      setChoices((current) => ({
                        ...current,
                        [position.id]: String(candidate.id),
                      }))
                    }
                    className="sr-only"
                  />
                  <Portrait
                    photoId={candidate.photoId}
                    name={candidate.name}
                    index={candidate.id}
                    size={56}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {candidate.name}
                    </span>
                    {candidate.party ? (
                      <span className="block truncate text-sm text-ink-soft">
                        {candidate.party}
                      </span>
                    ) : null}
                    {candidate.manifesto ? (
                      <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
                        {candidate.manifesto}
                      </span>
                    ) : null}
                  </span>
                  <Tick selected={selected} colour={seriesColor(candidate.id)} />
                </label>
              );
            })}

            {/* An explicit abstain option, so leaving a post blank is a
                deliberate act rather than something you forgot to fill in. */}
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3.5 text-sm transition ${
                choices[position.id] === ABSTAIN
                  ? "border-ink-faint bg-surface-muted"
                  : "border-line text-ink-soft hover:bg-surface-muted"
              }`}
            >
              <input
                type="radio"
                name={`position-${position.id}`}
                value={ABSTAIN}
                checked={choices[position.id] === ABSTAIN}
                onChange={() =>
                  setChoices((current) => ({
                    ...current,
                    [position.id]: ABSTAIN,
                  }))
                }
                className="sr-only"
              />
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full border-2"
                style={{
                  borderColor:
                    choices[position.id] === ABSTAIN
                      ? "var(--ink-faint)"
                      : "var(--line-strong)",
                }}
                aria-hidden
              >
                {choices[position.id] === ABSTAIN ? (
                  <span className="size-2 rounded-full bg-ink-faint" />
                ) : null}
              </span>
              {labels.abstain}
            </label>
          </fieldset>
        </Card>
      ))}

      <Card>
        {/* The password again, at the last step.
            A session cookie says somebody signed in on this browser in the
            last four hours; in a shared lab that is often not the person now
            sitting here. This is the final point at which anything can be
            stopped — after it the ballot is on a chain that cannot forget. */}
        <div className="mb-4">
          <label
            htmlFor="confirm-password"
            className="mb-1.5 block text-sm font-medium"
          >
            {labels.confirmLabel}
          </label>
          <input
            id="confirm-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-line-control bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/12"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            {labels.confirmHint}
          </p>
        </div>

        <button
          type="submit"
          disabled={pending || chosenCount === 0}
          className={`${buttonStyles.primary} w-full`}
        >
          {pending ? labels.submitting : labels.submit}
        </button>
        <p className="mt-3 text-center text-xs text-ink-faint">
          {labels.finalWarning}
        </p>
      </Card>
    </form>
  );
}

function Tick({ selected, colour }: { selected: boolean; colour: string }) {
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition"
      style={{
        borderColor: selected ? colour : "var(--line-strong)",
        background: selected ? colour : "transparent",
        color: "var(--surface)",
      }}
      aria-hidden
    >
      {selected ? <CheckIcon size={14} /> : null}
    </span>
  );
}

function Receipt({
  receipt,
  base,
  labels,
}: {
  receipt: NonNullable<VoteState["receipt"]>;
  base: string;
  labels: Labels;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-positive-wash text-positive">
          <CheckIcon size={20} />
        </span>
        <h2 className="text-lg font-semibold tracking-tight">
          {labels.recordedTitle}
        </h2>
      </div>

      <p className="text-sm leading-relaxed text-ink-soft">
        {fill(labels.recordedLead, { block: receipt.blockNumber })}
      </p>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold">{labels.yourChoices}</h3>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {receipt.choices.map((choice) => (
            <li
              key={choice.position}
              className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5 text-sm"
            >
              <span className="text-ink-soft">{choice.position}</span>
              <span className="font-medium">{choice.candidate}</span>
            </li>
          ))}
        </ul>
        {receipt.abstained.length > 0 ? (
          <p className="mt-2 text-xs text-ink-faint">
            {fill(labels.leftBlank, {
              positions: receipt.abstained.join(", "),
            })}
          </p>
        ) : null}
      </div>

      <div className="mt-5 rounded-2xl border border-warning/30 bg-warning-wash p-4">
        <h3 className="text-sm font-semibold text-warning">
          {labels.receiptTitle}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-warning/90">
          {labels.receiptBody}
        </p>
        <p className="mt-3 break-all rounded-xl bg-surface p-3 font-mono text-xs">
          {receipt.receiptId}
        </p>

        {/* Two ways off this screen with the code in hand, because once the
            page is gone the receipt cannot be recovered. */}
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton
            value={receipt.receiptId}
            label={labels.copyReceipt}
            copiedLabel={labels.copiedReceipt}
          />
          <DownloadButton receipt={receipt} label={labels.downloadReceipt} />
        </div>
      </div>

      <dl className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4 text-sm">
        <dt className="text-ink-soft">{labels.transaction}</dt>
        <dd>
          <Mono>{receipt.txHash}</Mono>
        </dd>
      </dl>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`${base}/verify`} className={buttonStyles.primary}>
          {labels.verifyMine}
        </Link>
        <Link href={`${base}/results`} className={buttonStyles.secondary}>
          {labels.seeCount}
        </Link>
      </div>
    </Card>
  );
}

const SMALL_BUTTON =
  "inline-flex items-center gap-1.5 rounded-lg border border-warning/40 bg-surface px-3 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning-wash";

function CopyButton({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused (insecure origin, permissions). The
      // code is on screen to select by hand, so this needs no error state.
    }
  }

  return (
    <button type="button" onClick={copy} className={SMALL_BUTTON}>
      {copied ? <CheckIcon size={13} /> : null}
      {copied ? copiedLabel : label}
    </button>
  );
}

/** Saves the receipt as a text file, built in the browser — never sent anywhere. */
function DownloadButton({
  receipt,
  label,
}: {
  receipt: NonNullable<VoteState["receipt"]>;
  label: string;
}) {
  function download() {
    const contents = [
      "Campus Ballot — vote receipt",
      "",
      `Receipt code : ${receipt.receiptId}`,
      "",
      "Recorded choices:",
      ...receipt.choices.map((c) => `  ${c.position}: ${c.candidate}`),
      ...(receipt.abstained.length > 0
        ? ["", `Left blank: ${receipt.abstained.join(", ")}`]
        : []),
      "",
      `Block        : ${receipt.blockNumber}`,
      `Transaction  : ${receipt.txHash}`,
      "",
      "Keep this private. It is the only thing that links you to your choices,",
      "and the only way to verify how your ballot was recorded.",
      "",
    ].join("\n");

    const url = URL.createObjectURL(
      new Blob([contents], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `vote-receipt-${receipt.receiptId.slice(2, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={download} className={SMALL_BUTTON}>
      {label}
    </button>
  );
}
