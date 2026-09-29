"use server";

import {
  Phase,
  getBallot,
  getElectionState,
  isOnRoll,
  outstandingPositions,
  submitBallot,
  type BallotLine,
} from "@/lib/election";
import { recordAudit } from "@/lib/audit";
import { consumePass, hasLivePass } from "@/lib/check-in";
import { findElection } from "@/lib/elections";
import { DEFAULT_LOCALE, getDictionaryFor, t } from "@/lib/i18n";
import { newReceiptId, voterHash } from "@/lib/identity";
import { NotificationKind, notifyBallotCast } from "@/lib/notifications";
import { getStudentSession } from "@/lib/session";
import { findStudent, verifyCredentials } from "@/lib/students";
import {
  checkLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/throttle";

export type VoteState = {
  error?: string;
  receipt?: {
    receiptId: string;
    txHash: string;
    blockNumber: number;
    /** One line per position the student actually voted for. */
    choices: Array<{ position: string; candidate: string }>;
    /** Positions deliberately left blank. */
    abstained: string[];
  };
};

/**
 * Casts the signed-in student's ballot across every position they chose.
 *
 * Every check here is repeated by the contract. These exist to give a useful
 * message instead of a raw revert — they are not the thing keeping the
 * election honest.
 */
export async function castBallot(
  _previous: VoteState,
  form: FormData,
): Promise<VoteState> {
  const rawLocale = form.get("locale");
  const dict = getDictionaryFor(
    typeof rawLocale === "string" && rawLocale ? rawLocale : DEFAULT_LOCALE,
  );

  const session = await getStudentSession();
  if (!session) return { error: dict.errors.sessionExpired };

  const electionId = form.get("electionId");
  if (typeof electionId !== "string") {
    return { error: dict.errors.noElectionSelected };
  }

  const election = await findElection(electionId);
  if (!election || election.universityId !== session.universityId) {
    // Also guards against a student posting another university's election id.
    return { error: dict.errors.wrongUniversity };
  }

  // A student who has left keeps their account and their past ballots, but
  // cannot take part in a live election.
  const student = await findStudent(session.universityId, session.studentId);
  if (!student || student.status !== "enrolled") {
    return {
      error: t(dict.errors.departed, {
        status: dict.enrolment[student?.status ?? "withdrawn"].toLowerCase(),
      }),
    };
  }

  // The password again, at the moment of casting.
  //
  // A session cookie only proves that somebody signed in on this browser at
  // some point in the last four hours. In a campus lab that is routinely not
  // the person now sitting at the machine. Asking once more turns "found a
  // logged-in screen" back into "knows the password", and it is the last
  // point at which anything can still be stopped — after this the ballot is
  // on a chain that by design cannot forget it.
  const password = form.get("password");
  if (typeof password !== "string" || !password) {
    return { error: dict.errors.confirmWithPassword };
  }

  const throttleKey = `cast:${session.universityId}:${session.studentId}`;
  const allowed = await checkLoginAllowed("student", throttleKey);
  if (allowed.blocked) {
    return {
      error: t(dict.errors.tooManyAttempts, {
        minutes: Math.max(1, Math.ceil(allowed.retryAfterSeconds / 60)),
      }),
    };
  }

  if (!(await verifyCredentials(session.universityId, session.studentId, password))) {
    await recordLoginFailure("student", throttleKey);
    return { error: dict.errors.wrongPasswordToVote };
  }
  await clearLoginFailures("student", throttleKey);

  const [state, ballot] = await Promise.all([
    getElectionState(election.address),
    getBallot(election.address),
  ]);

  if (state.phase !== Phase.Voting) {
    return {
      error:
        state.phase === Phase.Ended
          ? dict.errors.votingClosedNow
          : dict.errors.votingNotOpenNow,
    };
  }

  const handle = voterHash(session.universityId, session.studentId);
  if (!(await isOnRoll(election.address, handle))) {
    return { error: dict.errors.notOnRollYet };
  }

  // Checked early so a student who has not been checked in is told before
  // filling in a ballot, not after. The pass is actually spent further down,
  // once everything else about the ballot is known to be good.
  if (
    election.supervised &&
    !(await hasLivePass(session.universityId, session.studentId, election.id))
  ) {
    return { error: dict.errors.needCheckIn };
  }

  // Only positions this student still has a vote for can be submitted; the
  // contract enforces the same rule, this just gives a clearer message.
  const remaining = new Set(await outstandingPositions(election.address, handle));

  const lines: BallotLine[] = [];
  const abstained: string[] = [];

  for (const position of ballot) {
    if (!remaining.has(position.id)) continue;

    const raw = form.get(`position-${position.id}`);
    // "abstain" and a missing field both mean: leave this vote unspent.
    if (typeof raw !== "string" || raw === "" || raw === "abstain") {
      abstained.push(position.title);
      continue;
    }

    const candidateId = Number(raw);
    if (
      !Number.isInteger(candidateId) ||
      candidateId < 0 ||
      candidateId >= position.candidates.length
    ) {
      return { error: dict.errors.invalidCandidate };
    }

    lines.push({ positionId: position.id, candidateId });
  }

  if (lines.length === 0) {
    return { error: dict.errors.chooseAtLeastOne };
  }

  // Generated here, handed to the student, and deliberately never stored.
  const receiptId = newReceiptId();

  // Spend the check-in before submitting, not after.
  //
  // Claiming it first is what makes it single-use: the claim is conditional on
  // the pass still being unspent, so two ballots racing the same pass cannot
  // both get through. Doing it afterwards would leave a window in which one
  // check-in authorises two submissions.
  //
  // The cost is that a chain error burns the pass and the student has to see
  // the desk again. That is the right way round — a pass is permission to cast
  // one ballot, and it has now been used to try.
  if (election.supervised) {
    const claimed = await consumePass(
      session.universityId,
      session.studentId,
      election.id,
    );
    if (!claimed) return { error: dict.errors.needCheckIn };
  }

  let result: Awaited<ReturnType<typeof submitBallot>>;
  try {
    result = await submitBallot(election.address, handle, receiptId, lines);
  } catch (error) {
    console.error("Ballot submission failed", error);
    return {
      error: election.supervised
        ? dict.errors.ballotFailedCheckInAgain
        : dict.errors.ballotFailed,
    };
  }

  // Tell the student a ballot went out under their name.
  //
  // Nothing here can prevent an impersonation — by now the ballot is on the
  // chain. What it does is make one visible: a student who opens the site and
  // finds an alert for a ballot they never cast is how the committee learns
  // that a credential leaked, and that is the only way they ever will.
  //
  // Neither the alert nor the audit line records a choice. They say that a
  // ballot was cast and when, which is already public on the chain as the
  // VoterCheckedIn event.
  await notifyBallotCast({
    universityId: session.universityId,
    electionId: election.id,
    studentId: session.studentId,
    title: dict.notification.ballotCastTitle,
    body: t(dict.notification.ballotCastBody, {
      election: state.title,
      when: new Date().toLocaleString(),
    }),
  });

  await recordAudit({
    universityId: session.universityId,
    actor: `student:${session.studentId}`,
    action: "ballot.cast",
    summary: `A ballot was cast covering ${lines.length} position(s).`,
    targetId: election.id,
  });

  // Deliberately no refresh() here: it would re-render the page, which then
  // shows the "already voted" card and unmounts the receipt before the student
  // can read it. The receipt is shown once and never stored.

  return {
    receipt: {
      receiptId,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      choices: lines.map((line) => ({
        position: ballot[line.positionId]!.title,
        candidate: ballot[line.positionId]!.candidates[line.candidateId]!.name,
      })),
      abstained,
    },
  };
}
