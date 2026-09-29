import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BallotForm } from "./ballot-form";
import { GraduateIcon } from "@/app/components/icons";
import {
  ButtonLink,
  Card,
  CardTitle,
  Notice,
  PhaseBadge,
} from "@/app/components/ui";
import { extrasKey, getCandidateExtras } from "@/lib/candidates";
import {
  PHASE_KEY,
  Phase,
  getBallot,
  getElectionState,
  isOnRoll,
  outstandingPositions,
} from "@/lib/election";
import { currentElection } from "@/lib/elections";
import { t } from "@/lib/i18n";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { voterHash } from "@/lib/identity";
import { markAllRead } from "@/lib/notifications";
import { getStudentSession } from "@/lib/session";
import { hasLivePass } from "@/lib/check-in";
import { findStudent } from "@/lib/students";
import { findUniversityBySlug } from "@/lib/universities";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ballot" };

export default async function VotePage({
  params,
}: PageProps<"/[locale]/u/[slug]/vote">) {
  const { slug } = await params;
  const [dict, locale, university] = await Promise.all([
    getDictionary(),
    getLocale(),
    findUniversityBySlug(slug),
  ]);
  if (!university) notFound();

  const base = `/${locale}/u/${slug}`;

  const session = await getStudentSession();
  if (session?.universityId !== university.id) redirect(`${base}/login`);

  const election = await currentElection(university.id);
  if (!election) {
    return (
      <Notice tone="warning">
        {university.name} {dict.common.noElectionYet}
      </Notice>
    );
  }

  const handle = voterHash(university.id, session.studentId);
  const [state, ballot, onRoll, remaining, student, extras, checkedIn] =
    await Promise.all([
      getElectionState(election.address),
      getBallot(election.address),
      isOnRoll(election.address, handle),
      outstandingPositions(election.address, handle),
      findStudent(university.id, session.studentId),
      getCandidateExtras(election.id),
      // Only meaningful when the election is supervised; asked for anyway so
      // the branch below stays a plain read rather than a conditional await.
      election.supervised
        ? hasLivePass(university.id, session.studentId, election.id)
        : Promise.resolve(true),
    ]);

  // Reaching the ballot is what acknowledges the "voting is open" alert.
  // Idempotent, so a re-render cannot lose or duplicate anything.
  await markAllRead(university.id, session.studentId);

  const open = new Set(remaining);
  const positions = ballot
    .filter((position) => open.has(position.id))
    .map((position) => ({
      id: position.id,
      title: position.title,
      candidates: position.candidates.map((candidate) => ({
        ...candidate,
        photoId: extras.get(extrasKey(position.id, candidate.id))?.photoId ?? null,
        manifesto:
          extras.get(extrasKey(position.id, candidate.id))?.manifesto ?? null,
      })),
    }));

  // Every post used up means this student has finished voting.
  const finished = ballot.length > 0 && positions.length === 0;
  const partial = positions.length > 0 && positions.length < ballot.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <PhaseBadge phase={state.phase} label={dict.phase[PHASE_KEY[state.phase]]} />
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          {state.title}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {dict.student.signedInAs} {session.fullName} ({session.studentId})
        </p>
      </div>

      {student && student.status !== "enrolled" ? (
        <Card>
          <CardTitle icon={<GraduateIcon size={19} />}>
            {dict.ballot.departedTitle}
          </CardTitle>
          <p className="text-sm leading-relaxed text-ink-soft">
            {t(dict.ballot.departedBody, {
              status: dict.enrolment[student.status].toLowerCase(),
            })}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href={`${base}/verify`}>
              {dict.ballot.verifyPast}
            </ButtonLink>
            <ButtonLink href={`${base}/results`} variant="secondary">
              {dict.common.viewResults}
            </ButtonLink>
          </div>
        </Card>
      ) : state.phase !== Phase.Voting ? (
        <Notice tone="warning">
          {state.phase === Phase.Ended
            ? dict.ballot.votingClosed
            : dict.ballot.votingNotOpen}{" "}
          <Link href={`${base}/results`} className="underline underline-offset-4">
            {dict.common.viewResults}
          </Link>
        </Notice>
      ) : !onRoll ? (
        <Notice tone="warning">{dict.ballot.notOnRoll}</Notice>
      ) : !checkedIn ? (
        // Said before the ballot rather than after submitting it: a student
        // sent away having already chosen is a student who has to make every
        // choice twice.
        <Card>
          <CardTitle>{dict.ballot.checkInNeededTitle}</CardTitle>
          <p className="text-sm leading-relaxed text-ink-soft">
            {dict.errors.needCheckIn}
          </p>
        </Card>
      ) : finished ? (
        <Card>
          <CardTitle>{dict.ballot.alreadyVotedTitle}</CardTitle>
          <p className="text-sm leading-relaxed text-ink-soft">
            {dict.ballot.alreadyVotedBody}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href={`${base}/verify`}>
              {dict.ballot.verifyWithReceipt}
            </ButtonLink>
            <ButtonLink href={`${base}/results`} variant="secondary">
              {dict.ballot.seeRunningCount}
            </ButtonLink>
          </div>
        </Card>
      ) : (
        <BallotForm
          electionId={election.id}
          positions={positions}
          base={base}
          locale={locale}
          partial={partial}
          labels={{
            title: dict.ballot.title,
            hint: dict.ballot.hint,
            legend: dict.ballot.legend,
            abstain: dict.ballot.abstain,
            submit: dict.ballot.submit,
            submitting: dict.ballot.submitting,
            finalWarning: dict.ballot.finalWarning,
            confirmLabel: dict.ballot.confirmLabel,
            confirmHint: dict.ballot.confirmHint,
            partiallyVoted: dict.ballot.partiallyVoted,
            recordedTitle: dict.ballot.recordedTitle,
            recordedLead: dict.ballot.recordedLead,
            yourChoices: dict.ballot.yourChoices,
            leftBlank: dict.ballot.leftBlank,
            receiptTitle: dict.ballot.receiptTitle,
            receiptBody: dict.ballot.receiptBody,
            transaction: dict.ballot.transaction,
            copyReceipt: dict.ballot.copyReceipt,
            copiedReceipt: dict.ballot.copiedReceipt,
            downloadReceipt: dict.ballot.downloadReceipt,
            verifyMine: dict.ballot.verifyMine,
            seeCount: dict.ballot.seeCount,
          }}
        />
      )}
    </div>
  );
}
