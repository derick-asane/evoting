"use server";

import { refresh } from "next/cache";

import {
  addCandidate,
  addPosition,
  closeVoting,
  getBallot,
  getElectionState,
  openRegistration,
  openVoting,
  registerOnChain,
} from "@/lib/election";
import { recordAudit } from "@/lib/audit";
import { checkInStudent } from "@/lib/check-in";
import { setCandidateExtras } from "@/lib/candidates";
import {
  issueActivationCodes,
  issueStudentReset,
  type ActivationCode,
} from "@/lib/password-reset";
import { createElection, findElection, setSupervised } from "@/lib/elections";
import { fileField, storePhoto, type PhotoFailure } from "@/lib/photos";
import { addUnionMember, removeUnionMember } from "@/lib/union";
import { DEFAULT_LOCALE, getDictionaryFor, t, type Dictionary } from "@/lib/i18n";
import { voterHash } from "@/lib/identity";
import { NotificationKind, notifyStudents } from "@/lib/notifications";
import { getUniversitySession } from "@/lib/session";
import {
  addEligibleStudents,
  isEnrolmentStatus,
  markRolledInto,
  pendingForElection,
  rolledIntoElection,
  setEnrolmentStatus,
} from "@/lib/students";
import { walletKeyOf, type University } from "@/lib/universities";

/**
 * The desk's own result shape.
 *
 * Carries the cleared student's name back so the person at the desk can read
 * it off the screen and check it against the card in their hand — the check is
 * the point, and it only works if the name is visible.
 */
export type CheckInState = {
  error?: string;
  notice?: string;
  clearedName?: string;
  clearedStudentId?: string;
};

export type AdminState = {
  error?: string;
  notice?: string;
  /**
   * Plain activation codes, returned exactly once for the committee to print.
   * Nothing stores these — after this response they exist only as hashes.
   */
  activationCodes?: ActivationCode[];
};

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Server Actions cannot read the route segment, so forms post their locale. */
function dictOf(form: FormData): Dictionary {
  return getDictionaryFor(field(form, "locale") || DEFAULT_LOCALE);
}

/**
 * Server Actions are reachable by direct POST, not just through the console UI,
 * so every one re-checks the session and re-checks that the election being
 * touched belongs to the signed-in university.
 */
async function requireUniversity(): Promise<University> {
  const university = await getUniversitySession();
  if (!university) throw new Error("Not authorised.");
  return university;
}

async function requireOwnElection(university: University, electionId: string) {
  const election = await findElection(electionId);
  if (!election || election.universityId !== university.id) {
    throw new Error("That election does not belong to this account.");
  }
  return election;
}

function describe(error: unknown, dict: Dictionary): string {
  const message = error instanceof Error ? error.message : String(error);
  // viem wraps reverts in a long trace; the custom error name is the useful part.
  const custom = message.match(
    /(NotAdmin|NotRelayer|WrongPhase|NoCandidates|UnknownCandidate|NotOnRoll|AlreadyRegistered|AlreadyVoted|ReceiptInUse|EmptyValue)/,
  );
  if (!custom) return message.split("\n")[0];

  const explanations: Record<string, string> = {
    NotAdmin: dict.chain.notAdmin,
    WrongPhase: dict.chain.wrongPhase,
    NoCandidates: dict.chain.noCandidates,
    AlreadyRegistered: dict.chain.alreadyRegistered,
    EmptyValue: dict.chain.emptyValue,
  };
  return (
    explanations[custom[1]] ?? t(dict.chain.rejected, { error: custom[1] })
  );
}

export async function createElectionAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();

  const result = await createElection(university, field(form, "title"));
  if (!result.ok) {
    return {
      error:
        result.code === "titleTooShort"
          ? dict.errors.giveTitle
          : dict.chain.deployFailed,
    };
  }

  await recordAudit({ universityId: university.id, actor: `committee:${university.contactEmail}`, action: "election.created", summary: `Deployed "${result.election.title}" at ${result.election.address}.`, targetId: result.election.id });

  refresh();
  return {
    notice: t(dict.notices.deployed, {
      title: result.election.title,
      address: result.election.address,
    }),
  };
}

export async function addPositionAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();
  const election = await requireOwnElection(university, field(form, "electionId"));

  const title = field(form, "title");
  if (!title) return { error: dict.errors.positionNeedsTitle };

  try {
    await addPosition(election.address, walletKeyOf(university), title);
  } catch (error) {
    return { error: describe(error, dict) };
  }


  await recordAudit({
    universityId: university.id,
    actor: `committee:${university.contactEmail}`,
    action: "position.added",
    summary: `Added the position "${title}" to "${election.title}".`,
    targetId: election.id,
  });

  refresh();
  return { notice: t(dict.notices.positionAdded, { title }) };
}

export async function addCandidateAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();
  const election = await requireOwnElection(university, field(form, "electionId"));

  const name = field(form, "name");
  if (!name) return { error: dict.errors.candidateNeedsName };

  const positionId = Number(field(form, "positionId"));
  if (!Number.isInteger(positionId) || positionId < 0) {
    return { error: dict.errors.pickPosition };
  }

  // Validate the photo before touching the chain: a rejected upload after a
  // successful transaction would leave a candidate on the ballot with no way
  // to retry the add.
  const file = fileField(form, "photo");
  let photoId: string | undefined;
  if (file) {
    const stored = await storePhoto(file);
    if (!stored.ok) return { error: photoError(stored.code, dict) };
    photoId = stored.photoId;
  }

  try {
    await addCandidate(
      election.address,
      walletKeyOf(university),
      positionId,
      name,
      field(form, "party"),
    );
  } catch (error) {
    return { error: describe(error, dict) };
  }

  // The contract appends within a position, so the new candidate is that
  // position's last one. Read it back rather than assuming, so the stored
  // index always matches the chain.
  const ballot = await getBallot(election.address);
  const candidateIndex = (ballot[positionId]?.candidates.length ?? 1) - 1;

  const manifesto = field(form, "manifesto");
  if (photoId || manifesto) {
    await setCandidateExtras(election.id, positionId, candidateIndex, {
      photoId,
      manifesto: manifesto || null,
    });
  }


  await recordAudit({
    universityId: university.id,
    actor: `committee:${university.contactEmail}`,
    action: "candidate.added",
    summary:
      `Added ${name} for "${ballot[positionId]?.title ?? positionId}" ` +
      `in "${election.title}".`,
    targetId: election.id,
  });

  refresh();
  return { notice: t(dict.notices.candidateAdded, { name }) };
}

function photoError(code: PhotoFailure, dict: Dictionary): string {
  const messages: Record<PhotoFailure, string> = {
    tooLarge: dict.errors.photoTooLarge,
    unsupportedType: dict.errors.photoUnsupported,
    empty: dict.errors.photoEmpty,
  };
  return messages[code];
}

/** Adds or replaces a candidate's portrait after they are already on the ballot. */
export async function setCandidatePhotoAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();
  const election = await requireOwnElection(university, field(form, "electionId"));

  const positionId = Number(field(form, "positionId"));
  const index = Number(field(form, "candidateIndex"));
  if (
    !Number.isInteger(positionId) ||
    positionId < 0 ||
    !Number.isInteger(index) ||
    index < 0
  ) {
    return { error: dict.errors.invalidCandidate };
  }

  // Check against the chain, so a crafted POST cannot attach a photo to a
  // candidate slot that does not exist.
  const ballot = await getBallot(election.address);
  if (index >= (ballot[positionId]?.candidates.length ?? 0)) {
    return { error: dict.errors.invalidCandidate };
  }

  const file = fileField(form, "photo");
  if (!file) return { error: dict.errors.photoEmpty };

  const stored = await storePhoto(file);
  if (!stored.ok) return { error: photoError(stored.code, dict) };

  await setCandidateExtras(election.id, positionId, index, {
    photoId: stored.photoId,
  });

  await recordAudit({
    universityId: university.id,
    actor: `committee:${university.contactEmail}`,
    action: "candidate.photo_updated",
    summary: `Updated the photo for ${ballot[positionId]?.candidates[index]?.name ?? index}.`,
    targetId: election.id,
  });

  refresh();
  return { notice: dict.notices.photoUpdated };
}

/**
 * Issues a one-time password reset code for a student.
 *
 * The code is shown to the committee member, who hands it over after checking
 * a student card. It is never emailed and never stored in readable form.
 */
/**
 * Turns supervised voting on or off for one election.
 *
 * Supervised means a committee member has to check a student in at a desk,
 * against their student card, before that student can cast. It is the only
 * control here that survives a student handing over their password of their
 * own accord — a password check cannot tell a voter from someone who bought
 * their login, and a person looking at a face can.
 */
export async function setSupervisedAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();
  const election = await requireOwnElection(university, field(form, "electionId"));

  const supervised = field(form, "supervised") === "true";
  await setSupervised(election.id, supervised);

  await recordAudit({
    universityId: university.id,
    actor: `committee:${university.contactEmail}`,
    action: supervised ? "supervision.enabled" : "supervision.disabled",
    summary: supervised
      ? `Supervised voting turned on for "${election.title}": ballots now need a check-in at the desk.`
      : `Supervised voting turned off for "${election.title}": a password is now all that is needed to cast.`,
    targetId: election.id,
  });

  refresh();
  return {
    notice: supervised
      ? dict.notices.supervisionOn
      : dict.notices.supervisionOff,
  };
}

/**
 * Checks one student in at the desk.
 *
 * The committee member has already looked at the student card; this records
 * that they did, against their own account, and opens a short window in which
 * that student can cast one ballot.
 */
export async function checkInAction(
  _previous: CheckInState,
  form: FormData,
): Promise<CheckInState> {
  const dict = dictOf(form);
  const university = await requireUniversity();
  const election = await requireOwnElection(university, field(form, "electionId"));

  const studentId = field(form, "studentId");
  if (!studentId) return { error: dict.errors.listStudentIds };

  const result = await checkInStudent({
    universityId: university.id,
    electionId: election.id,
    studentId,
    issuedBy: university.contactEmail,
  });

  if (!result.ok) {
    const messages: Record<typeof result.code, string> = {
      unknownStudent: dict.errors.checkInUnknown,
      notEnrolled: dict.errors.checkInNotEnrolled,
      notOnRoll: dict.errors.checkInNotOnRoll,
      alreadyOpen: dict.errors.checkInAlreadyOpen,
    };
    return { error: messages[result.code] };
  }

  await recordAudit({
    universityId: university.id,
    actor: `committee:${university.contactEmail}`,
    action: "checkin.issued",
    summary: `Checked in ${result.studentId} (${result.fullName}) against their student card.`,
    targetId: result.studentId,
  });

  refresh();
  return {
    clearedName: result.fullName,
    clearedStudentId: result.studentId,
    notice: t(dict.notices.checkedIn, {
      name: result.fullName,
      minutes: Math.max(
        1,
        Math.round((result.expiresAt.getTime() - Date.now()) / 60000),
      ),
    }),
  };
}

/**
 * Prints an activation code for every enrolled student who has not set a
 * password yet.
 *
 * In bulk because the alternative is issuing six hundred codes one at a time,
 * and a control that tedious gets abandoned on election week — which would put
 * back the hole it exists to close.
 */
export async function issueActivationCodesAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();

  const { codes, expiresAt } = await issueActivationCodes(university.id);
  if (codes.length === 0) return { notice: dict.notices.activationNoneNeeded };

  await recordAudit({
    universityId: university.id,
    actor: `committee:${university.contactEmail}`,
    action: "password.activation_codes_issued",
    summary: `Issued ${codes.length} activation code(s); any earlier unused ones were voided.`,
  });

  // Deliberately no refresh() here. The codes exist only in this response —
  // re-rendering the page would throw them away before anyone could print
  // them, which is exactly how the vote receipt used to get lost.
  return {
    activationCodes: codes,
    notice: t(dict.notices.activationIssued, {
      count: codes.length,
      date: expiresAt.toLocaleDateString(),
    }),
  };
}

export async function issueResetCodeAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();

  const studentId = field(form, "studentId");
  if (!studentId) return { error: dict.errors.listStudentIds };

  const result = await issueStudentReset(university.id, studentId);
  if (!result.ok) return { error: dict.errors.resetStudentNotFound };

  await recordAudit({
    universityId: university.id,
    actor: `committee:${university.contactEmail}`,
    action: "password.reset_issued",
    summary: `Issued a password reset code for ${studentId}.`,
    targetId: studentId,
  });

  refresh();
  return {
    notice: t(dict.notices.resetIssued, {
      name: result.studentName,
      code: result.code,
    }),
  };
}

// --- Union roster -----------------------------------------------------------

export async function addUnionMemberAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();

  const file = fileField(form, "photo");
  let photoId: string | undefined;
  if (file) {
    const stored = await storePhoto(file);
    if (!stored.ok) return { error: photoError(stored.code, dict) };
    photoId = stored.photoId;
  }

  const parentId = field(form, "parentId");
  const result = await addUnionMember(university.id, {
    fullName: field(form, "fullName"),
    role: field(form, "role"),
    bio: field(form, "bio"),
    photoId,
    parentId: parentId || null,
  });

  if (!result.ok) {
    const messages = {
      nameRequired: dict.errors.memberNeedsName,
      roleRequired: dict.errors.memberNeedsRole,
      badParent: dict.errors.memberBadParent,
    };
    return { error: messages[result.code] };
  }

  refresh();
  return {
    notice: t(dict.notices.memberAdded, { name: field(form, "fullName") }),
  };
}

export async function removeUnionMemberAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();

  const removed = await removeUnionMember(university.id, field(form, "memberId"));
  if (!removed) return { error: dict.errors.memberNotFound };

  refresh();
  return { notice: dict.notices.memberRemoved };
}

export async function addStudentsAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();

  const raw = field(form, "roster");
  if (!raw) return { error: dict.errors.pasteStudents };

  // One student per line: STUDENT_ID, Full Name, Programme[, status]
  const entries = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [studentId = "", fullName = "", programme = "", status = ""] = line
        .split(",")
        .map((part) => part.trim());
      const normalised = status.toLowerCase();
      return {
        studentId,
        fullName,
        programme,
        status: isEnrolmentStatus(normalised) ? normalised : undefined,
      };
    })
    .filter((entry) => entry.studentId);

  if (entries.length === 0) return { error: dict.errors.noUsableLines };

  const { added, skipped } = await addEligibleStudents(university.id, entries);

  await recordAudit({ universityId: university.id, actor: `committee:${university.contactEmail}`, action: "roster.imported", summary: `Imported ${added} students (${skipped} skipped).` });

  refresh();
  return {
    notice:
      t(dict.notices.studentsAdded, { added }) +
      (skipped > 0 ? t(dict.notices.studentsSkipped, { skipped }) : "."),
  };
}

/**
 * Writes every activated student who is not yet on this election's roll to the
 * chain, in one transaction.
 */
export async function syncRollAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();
  const election = await requireOwnElection(university, field(form, "electionId"));

  const pending = await pendingForElection(university.id, election.id);
  if (pending.length === 0) return { notice: dict.notices.allAlreadyOnRoll };

  const handles = pending.map((student) =>
    voterHash(university.id, student.studentId),
  );

  try {
    await registerOnChain(election.address, walletKeyOf(university), handles);
  } catch (error) {
    return { error: describe(error, dict) };
  }

  await markRolledInto(
    university.id,
    election.id,
    pending.map((student) => student.studentId),
  );

  await recordAudit({ universityId: university.id, actor: `committee:${university.contactEmail}`, action: "roll.written", summary: `Wrote ${pending.length} students to the on-chain roll of "${election.title}".`, targetId: election.id });

  refresh();
  return { notice: t(dict.notices.rollWritten, { count: pending.length }) };
}

export async function advancePhaseAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();
  const election = await requireOwnElection(university, field(form, "electionId"));
  const key = walletKeyOf(university);

  const target = field(form, "target");
  const steps: Record<string, { run: () => Promise<unknown>; notice: string }> = {
    registration: {
      run: () => openRegistration(election.address, key),
      notice: dict.notices.registrationOpen,
    },
    voting: {
      run: () => openVoting(election.address, key),
      notice: dict.notices.votingOpen,
    },
    ended: {
      run: () => closeVoting(election.address, key),
      notice: dict.notices.pollsClosed,
    },
  };

  const step = steps[target];
  if (!step) return { error: dict.errors.unknownPhase };

  // Opening the polls seals the roll for good. An empty roll would produce an
  // election that can never accept a ballot, so refuse it here rather than let
  // the committee discover it when the first student tries to vote.
  if (target === "voting") {
    const { registered } = await getElectionState(election.address);
    if (registered === 0) return { error: dict.console.emptyRollBlock };
  }

  try {
    await step.run();
  } catch (error) {
    return { error: describe(error, dict) };
  }


  const auditActions = {
    registration: "phase.registration_opened",
    voting: "phase.voting_opened",
    ended: "phase.voting_closed",
  } as const;

  await recordAudit({
    universityId: university.id,
    actor: `committee:${university.contactEmail}`,
    action: auditActions[target as keyof typeof auditActions],
    summary: `${step.notice} ("${election.title}")`,
    targetId: election.id,
  });

  // Only tell students once the chain has actually accepted the change, so an
  // alert can never announce a poll that did not open.
  let alerted = 0;
  if (target === "voting" || target === "ended") {
    const audience = await rolledIntoElection(university.id, election.id);
    const opening = target === "voting";

    alerted = await notifyStudents({
      universityId: university.id,
      electionId: election.id,
      studentIds: audience.map((student) => student.studentId),
      kind: opening ? NotificationKind.voting_open : NotificationKind.voting_closed,
      title: t(
        opening
          ? dict.notification.votingOpenTitle
          : dict.notification.votingClosedTitle,
        { election: election.title },
      ),
      body: opening
        ? dict.notification.votingOpenBody
        : dict.notification.votingClosedBody,
    });
  }

  refresh();
  return {
    notice:
      step.notice +
      (alerted > 0
        ? ` ${t(dict.notices.studentsNotified, { count: alerted })}`
        : ""),
  };
}

/**
 * Moves students off the enrolled roll, for example after graduation.
 *
 * They keep their account and every ballot they already cast, but they will
 * not be written to any future election roll.
 */
export async function setEnrolmentAction(
  _previous: AdminState,
  form: FormData,
): Promise<AdminState> {
  const dict = dictOf(form);
  const university = await requireUniversity();

  const status = field(form, "status");
  if (!isEnrolmentStatus(status)) return { error: dict.errors.unknownStatus };

  const ids = field(form, "studentIds")
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (ids.length === 0) return { error: dict.errors.listStudentIds };

  const { changed, unknown } = await setEnrolmentStatus(university.id, ids, status);

  refresh();
  return {
    notice:
      t(dict.notices.statusUpdated, {
        count: changed,
        status: dict.enrolment[status].toLowerCase(),
      }) +
      (unknown.length > 0
        ? t(dict.notices.notFound, { ids: unknown.join(", ") })
        : ""),
  };
}
