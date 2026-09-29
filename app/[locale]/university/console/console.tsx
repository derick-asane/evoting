"use client";

import { useActionState, useState } from "react";

import {
  addCandidateAction,
  addPositionAction,
  addStudentsAction,
  advancePhaseAction,
  setEnrolmentAction,
  syncRollAction,
  type AdminState,
} from "@/app/actions/admin";
import {
  BallotIcon,
  GraduateIcon,
  UsersIcon,
} from "@/app/components/icons";
import {
  CandidateAvatar,
  Card,
  CardTitle,
  Field,
  Mono,
  Notice,
  PhaseBadge,
  Stat,
  buttonStyles,
} from "@/app/components/ui";
import { PhotoField } from "@/app/components/photo-field";
import { UnionTeam } from "./union-team";
import {
  ActivationCodes,
  ActivityLog,
  ResetIssuer,
  type AuditRowView,
} from "./security";
import { Supervision } from "./supervision";
import { PHASE_KEY, Phase } from "@/lib/election-model";
import type { Position } from "@/lib/election-model";
import type { Dictionary } from "@/lib/i18n";
import type { UnionRow } from "@/lib/union";

const EMPTY: AdminState = {};

export type BallotPositionView = Position;

type EnrolmentStatus = "enrolled" | "graduated" | "withdrawn";

type StudentRow = {
  studentId: string;
  fullName: string;
  programme: string;
  status: EnrolmentStatus;
  activated: boolean;
  onChain: boolean;
};

type ConsoleLabels = Dictionary["console"];
type PhaseLabels = Dictionary["phase"];
type EnrolmentLabels = Dictionary["enrolment"];
type CommonLabels = Dictionary["common"];

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function Console({
  locale,
  walletAddress,
  election,
  state,
  positions,
  students,
  pendingCount,
  labels,
  phases,
  enrolment,
  common,
  photo,
  unionRows,
  union,
  security,
  checkIn,
  auditRows,
}: {
  locale: string;
  walletAddress: string;
  election: { id: string; address: string; title: string; supervised: boolean };
  state: { phase: Phase; registered: number; totalBallots: number };
  positions: BallotPositionView[];
  students: StudentRow[];
  pendingCount: number;
  labels: ConsoleLabels;
  phases: PhaseLabels;
  enrolment: EnrolmentLabels;
  common: CommonLabels;
  photo: Dictionary["photo"];
  unionRows: UnionRow[];
  union: Dictionary["union"];
  security: Dictionary["security"];
  checkIn: Dictionary["checkIn"];
  auditRows: AuditRowView[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <PhaseBadge phase={state.phase} label={phases[PHASE_KEY[state.phase]]} />
            <h2 className="mt-2.5 text-lg font-semibold tracking-tight">
              {election.title}
            </h2>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <Stat label={labels.positionsStat} value={positions.length} />
          <Stat label={labels.studentsListed} value={students.length} />
          <Stat label={labels.onChainRoll} value={state.registered} />
          <Stat label={common.ballotsCast} value={state.totalBallots} accent />
        </div>
        <div className="mt-5 space-y-1 border-t border-line pt-4 text-xs text-ink-faint">
          <p>
            {labels.contract} <Mono>{election.address}</Mono>
          </p>
          <p>
            {labels.administeredBy} <Mono>{walletAddress}</Mono>
          </p>
        </div>
      </Card>

      <PhaseControls
        locale={locale}
        electionId={election.id}
        phase={state.phase}
        pendingCount={pendingCount}
        registered={state.registered}
        labels={labels}
      />

      {state.phase === Phase.Setup ? (
        <>
          <PositionForm locale={locale} electionId={election.id} labels={labels} />
          {positions.length > 0 ? (
            <CandidateForm
              locale={locale}
              electionId={election.id}
              positions={positions}
              labels={labels}
              photo={photo}
            />
          ) : null}
        </>
      ) : null}

      <UnionTeam
        locale={locale}
        rows={unionRows}
        labels={union}
        photo={photo}
      />

      <Supervision
        electionId={election.id}
        supervised={election.supervised}
        locale={locale}
        labels={checkIn}
      />

      <ActivationCodes locale={locale} labels={security} />
      <ResetIssuer locale={locale} labels={security} />

      <StudentSection
        locale={locale}
        electionId={election.id}
        students={students}
        pendingCount={pendingCount}
        phase={state.phase}
        labels={labels}
        enrolment={enrolment}
      />

      {positions.length > 0 ? (
        <Card>
          <CardTitle icon={<BallotIcon size={19} />}>{labels.ballot}</CardTitle>
          <div className="space-y-5">
            {positions.map((position) => (
              <div key={position.id}>
                <h3 className="mb-1.5 text-sm font-semibold">{position.title}</h3>
                {position.candidates.length === 0 ? (
                  <p className="text-sm text-ink-faint">{labels.noCandidatesYet}</p>
                ) : (
                  <ul className="divide-y divide-line text-sm">
                    {position.candidates.map((candidate) => (
                      <li key={candidate.id} className="flex items-center gap-3 py-2.5">
                        <CandidateAvatar name={candidate.name} index={candidate.id} size={28} />
                        <span className="min-w-0 flex-1 truncate">
                          {candidate.name}
                          {candidate.party ? (
                            <span className="ml-2 text-ink-soft">{candidate.party}</span>
                          ) : null}
                        </span>
                        <span className="numeric shrink-0 text-ink-soft">
                          {candidate.voteCount} {common.votes}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <ActivityLog rows={auditRows} labels={security} />
    </div>
  );
}

function PhaseControls({
  locale,
  electionId,
  phase,
  pendingCount,
  registered,
  labels,
}: {
  locale: string;
  electionId: string;
  phase: Phase;
  pendingCount: number;
  registered: number;
  labels: ConsoleLabels;
}) {
  const [state, action, pending] = useActionState(advancePhaseAction, EMPTY);
  const [acknowledged, setAcknowledged] = useState(false);

  // Opening the polls seals the roll permanently.
  const openingVoting = phase === Phase.Registration;
  const emptyRoll = openingVoting && registered === 0;
  const wouldLockOut = openingVoting && pendingCount > 0 && !emptyRoll;
  const blocked = emptyRoll || (wouldLockOut && !acknowledged);

  const steps = [
    {
      target: "registration",
      label: labels.openRegistration,
      from: Phase.Setup,
      warning: labels.openRegistrationWarning,
    },
    {
      target: "voting",
      label: labels.openVoting,
      from: Phase.Registration,
      warning:
        pendingCount > 0
          ? fill(labels.openVotingPending, { count: pendingCount })
          : labels.openVotingWarning,
    },
    {
      target: "ended",
      label: labels.closePolls,
      from: Phase.Voting,
      warning: labels.closePollsWarning,
    },
  ];

  const step = steps.find((candidate) => candidate.from === phase);
  const stageNames = [
    labels.stepSetup,
    labels.stepRegistration,
    labels.stepVoting,
    labels.stepClosed,
  ];

  return (
    <Card>
      <CardTitle hint={labels.stageHint}>{labels.stage}</CardTitle>

      <ol className="mb-5 flex flex-wrap items-center gap-1.5 text-xs">
        {stageNames.map((label, index) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-3 py-1.5 font-medium ${
                index === phase
                  ? "bg-brand text-brand-ink"
                  : index < phase
                    ? "bg-positive-wash text-positive"
                    : "bg-surface-sunken text-ink-faint"
              }`}
            >
              {index < phase ? "✓ " : ""}
              {label}
            </span>
            {index < stageNames.length - 1 ? (
              <span className="text-ink-faint" aria-hidden>
                ›
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.notice ? <Notice tone="success">{state.notice}</Notice> : null}

      {step ? (
        <form action={action} className="mt-4">
          <input type="hidden" name="electionId" value={electionId} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="target" value={step.target} />

          {emptyRoll ? (
            <div className="mb-3">
              <Notice tone="error">{labels.emptyRollBlock}</Notice>
            </div>
          ) : (
            <p className="mb-3 text-sm text-ink-soft">{step.warning}</p>
          )}

          {wouldLockOut ? (
            <label className="mb-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-wash p-3 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-0.5 size-4 accent-[var(--warning)]"
              />
              <span className="text-warning">
                {fill(labels.confirmLockout, { count: pendingCount })}
              </span>
            </label>
          ) : null}

          <button
            type="submit"
            disabled={pending || blocked}
            className={buttonStyles.primary}
          >
            {pending ? labels.submitting : step.label}
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">{labels.finished}</p>
      )}
    </Card>
  );
}

function PositionForm({
  locale,
  electionId,
  labels,
}: {
  locale: string;
  electionId: string;
  labels: ConsoleLabels;
}) {
  const [state, action, pending] = useActionState(addPositionAction, EMPTY);

  return (
    <Card>
      <CardTitle icon={<BallotIcon size={19} />} hint={labels.addPositionHint}>
        {labels.addPosition}
      </CardTitle>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.notice ? <Notice tone="success">{state.notice}</Notice> : null}
      <form
        action={action}
        className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
      >
        <input type="hidden" name="electionId" value={electionId} />
        <input type="hidden" name="locale" value={locale} />
        <Field label={labels.positionTitle} name="title" />
        <button
          type="submit"
          disabled={pending}
          className={`${buttonStyles.primary} h-[42px]`}
        >
          {pending ? labels.adding : labels.add}
        </button>
      </form>
    </Card>
  );
}

function CandidateForm({
  locale,
  electionId,
  positions,
  labels,
  photo,
}: {
  locale: string;
  electionId: string;
  positions: BallotPositionView[];
  labels: ConsoleLabels;
  photo: Dictionary["photo"];
}) {
  const [state, action, pending] = useActionState(addCandidateAction, EMPTY);

  return (
    <Card>
      <CardTitle icon={<BallotIcon size={19} />} hint={labels.addCandidateHint}>
        {labels.addCandidate}
      </CardTitle>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.notice ? <Notice tone="success">{state.notice}</Notice> : null}
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="electionId" value={electionId} />
        <input type="hidden" name="locale" value={locale} />

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            {labels.standingFor}
          </span>
          <select
            name="positionId"
            defaultValue={String(positions[0]?.id ?? 0)}
            className="w-full rounded-xl border border-line-control bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-brand"
          >
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.title}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={labels.candidateName} name="name" />
          <Field label={labels.candidateParty} name="party" required={false} />
        </div>
        <PhotoField
          label={photo.label}
          hint={photo.hint}
          name="photo"
          nameHint={photo.none}
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            {labels.candidateManifesto}
          </span>
          <textarea
            name="manifesto"
            rows={2}
            className="w-full rounded-xl border border-line-control bg-surface px-3.5 py-2.5 text-sm outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-4 focus:ring-brand/12"
          />
        </label>
        <button type="submit" disabled={pending} className={buttonStyles.primary}>
          {pending ? labels.adding : labels.add}
        </button>
      </form>
    </Card>
  );
}

function StudentSection({
  locale,
  electionId,
  students,
  pendingCount,
  phase,
  labels,
  enrolment,
}: {
  locale: string;
  electionId: string;
  students: StudentRow[];
  pendingCount: number;
  phase: Phase;
  labels: ConsoleLabels;
  enrolment: EnrolmentLabels;
}) {
  const [addState, addAction, adding] = useActionState(addStudentsAction, EMPTY);
  const [syncState, syncAction, syncing] = useActionState(syncRollAction, EMPTY);
  const [statusState, statusAction, updatingStatus] = useActionState(
    setEnrolmentAction,
    EMPTY,
  );

  const enrolled = students.filter((student) => student.status === "enrolled");
  const activated = enrolled.filter((student) => student.activated).length;
  const departed = students.length - enrolled.length;

  return (
    <Card>
      <CardTitle icon={<UsersIcon size={19} />} hint={labels.studentsHint}>
        {labels.studentsTitle}
      </CardTitle>

      {addState.error ? <Notice tone="error">{addState.error}</Notice> : null}
      {addState.notice ? <Notice tone="success">{addState.notice}</Notice> : null}

      <form action={addAction} className="mt-4 space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">
            {labels.pasteRoster}
          </span>
          <textarea
            name="roster"
            rows={4}
            placeholder={
              "CS2021001, Ada Lovelace, Computer Science\nEE2021002, Alan Turing, Electrical Engineering"
            }
            className="w-full rounded-xl border border-line-control bg-surface px-3.5 py-2.5 font-mono text-xs outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-4 focus:ring-brand/12"
          />
          <span className="mt-1.5 block text-xs leading-relaxed text-ink-soft">
            {labels.rosterHint}
          </span>
        </label>
        <button type="submit" disabled={adding} className={buttonStyles.secondary}>
          {adding ? labels.adding : labels.addToList}
        </button>
      </form>

      <div className="mt-6 border-t border-line pt-5">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <GraduateIcon size={17} className="text-ink-faint" />
          {labels.endOfYear}
        </h3>
        <p className="mb-3 text-sm leading-relaxed text-ink-soft">
          {labels.endOfYearBody}
        </p>

        {statusState.error ? <Notice tone="error">{statusState.error}</Notice> : null}
        {statusState.notice ? (
          <Notice tone="success">{statusState.notice}</Notice>
        ) : null}

        <form action={statusAction} className="mt-3 space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <textarea
            name="studentIds"
            rows={2}
            placeholder="CS2021001, EE2021002"
            className="w-full rounded-xl border border-line-control bg-surface px-3.5 py-2.5 font-mono text-xs outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-4 focus:ring-brand/12"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              name="status"
              defaultValue="graduated"
              className="rounded-xl border border-line-control bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-brand"
            >
              <option value="graduated">{enrolment.graduated}</option>
              <option value="withdrawn">{enrolment.withdrawn}</option>
              <option value="enrolled">{enrolment.reEnrolled}</option>
            </select>
            <button
              type="submit"
              disabled={updatingStatus}
              className={buttonStyles.secondary}
            >
              {updatingStatus ? labels.updating : labels.updateStatus}
            </button>
            {departed > 0 ? (
              <span className="text-xs text-ink-faint">
                {fill(labels.notEnrolledCount, { count: departed })}
              </span>
            ) : null}
          </div>
        </form>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <p className="mb-3 text-sm text-ink-soft">
          {fill(labels.activatedSummary, {
            activated,
            total: enrolled.length,
          })}{" "}
          {pendingCount > 0
            ? fill(labels.pendingSummary, { count: pendingCount })
            : labels.allOnRoll}
        </p>

        {syncState.error ? <Notice tone="error">{syncState.error}</Notice> : null}
        {syncState.notice ? <Notice tone="success">{syncState.notice}</Notice> : null}

        <form action={syncAction} className="mt-3">
          <input type="hidden" name="electionId" value={electionId} />
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            disabled={syncing || pendingCount === 0 || phase !== Phase.Registration}
            className={buttonStyles.primary}
          >
            {syncing ? labels.writingRoll : labels.writeRoll}
          </button>
          {phase !== Phase.Registration ? (
            <span className="ml-3 text-xs text-ink-faint">
              {labels.onlyDuringRegistration}
            </span>
          ) : null}
        </form>
      </div>

      {students.length > 0 ? (
        <div className="mt-6 max-h-80 overflow-auto border-t border-line pt-4">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.1em] text-ink-faint">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {labels.colStudentId}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {labels.colName}
                </th>
                <th scope="col" className="py-2 font-medium">
                  {labels.colStatus}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map((student) => (
                <tr key={student.studentId}>
                  <td className="py-2.5 pr-4 font-mono text-xs">
                    {student.studentId}
                  </td>
                  <td className="py-2.5 pr-4">
                    {student.fullName}
                    {student.programme ? (
                      <span className="block text-xs text-ink-faint">
                        {student.programme}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5">
                    <StatusPill
                      student={student}
                      labels={labels}
                      enrolment={enrolment}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  );
}

function StatusPill({
  student,
  labels,
  enrolment,
}: {
  student: StudentRow;
  labels: ConsoleLabels;
  enrolment: EnrolmentLabels;
}) {
  // Enrolment comes first: a graduated student's activation and roll history
  // no longer decides anything about the next election.
  const [label, style] =
    student.status === "graduated"
      ? [enrolment.graduated, "bg-brand-wash text-brand"]
      : student.status === "withdrawn"
        ? [enrolment.withdrawn, "bg-danger-wash text-danger"]
        : student.onChain
          ? [labels.statusOnRoll, "bg-positive-wash text-positive"]
          : student.activated
            ? [labels.statusActivated, "bg-warning-wash text-warning"]
            : [labels.statusNotActivated, "bg-surface-sunken text-ink-faint"];

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
