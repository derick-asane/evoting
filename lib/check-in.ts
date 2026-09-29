import "server-only";

import { prisma } from "./db";
import { normaliseStudentId } from "./identity";

/**
 * Supervised voting: a committee member at a desk checks a student card
 * against the roll, and that opens a short window in which that student — and
 * only that student — can cast a ballot.
 *
 * This is the only control in the system that survives a student handing their
 * password over willingly. Authentication answers "are these the right
 * credentials?"; it cannot answer "is the right person freely choosing?" A
 * password check cannot tell a voter from someone who bought their login, and
 * no amount of cryptography can. A human matching a face to a card can.
 *
 * The cost is that it only works where students turn up in person, which for a
 * campus election is exactly the situation. Elections that run unsupervised
 * keep the old behaviour; this is per-election, not global.
 */

/**
 * How long a check-in stays valid.
 *
 * Long enough to read a ballot with several positions on it without being
 * rushed, short enough that a student who wanders off does not leave an open
 * door behind them.
 */
const PASS_TTL_MS = 15 * 60 * 1000;

export type CheckInFailure =
  | "unknownStudent"
  | "notEnrolled"
  | "notOnRoll"
  | "alreadyOpen";

export type CheckInResult =
  | {
      ok: true;
      studentId: string;
      fullName: string;
      programme: string;
      expiresAt: Date;
    }
  | { ok: false; code: CheckInFailure; fullName?: string };

/**
 * Checks one student in.
 *
 * Refuses to issue a second pass while one is still live, so a student cannot
 * collect passes from two desks and a committee member cannot quietly hand out
 * several for the same person.
 */
export async function checkInStudent(input: {
  universityId: string;
  electionId: string;
  studentId: string;
  /** The committee account at the desk, recorded on the pass. */
  issuedBy: string;
}): Promise<CheckInResult> {
  const student = await prisma.student.findUnique({
    where: {
      universityId_studentId: {
        universityId: input.universityId,
        studentId: normaliseStudentId(input.studentId),
      },
    },
    select: {
      id: true,
      studentId: true,
      fullName: true,
      programme: true,
      status: true,
    },
  });

  if (!student) return { ok: false, code: "unknownStudent" };
  if (student.status !== "enrolled") {
    return { ok: false, code: "notEnrolled", fullName: student.fullName };
  }

  // The desk must not be able to clear someone the committee never wrote to
  // the chain: the contract would reject the ballot anyway, and the student
  // would be sent away having been told they could vote.
  const onRoll = await prisma.rollEntry.findUnique({
    where: {
      studentId_electionId: {
        studentId: student.id,
        electionId: input.electionId,
      },
    },
    select: { studentId: true },
  });
  if (!onRoll) {
    return { ok: false, code: "notOnRoll", fullName: student.fullName };
  }

  const live = await findLivePass(student.id, input.electionId);
  if (live) {
    return { ok: false, code: "alreadyOpen", fullName: student.fullName };
  }

  const expiresAt = new Date(Date.now() + PASS_TTL_MS);
  await prisma.votingPass.create({
    data: {
      studentId: student.id,
      electionId: input.electionId,
      issuedBy: input.issuedBy,
      expiresAt,
    },
  });

  return {
    ok: true,
    studentId: student.studentId,
    fullName: student.fullName,
    programme: student.programme,
    expiresAt,
  };
}

/** An unused, unexpired pass, or null. */
async function findLivePass(
  studentRowId: string,
  electionId: string,
): Promise<{ id: string; expiresAt: Date } | null> {
  return prisma.votingPass.findFirst({
    where: {
      studentId: studentRowId,
      electionId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, expiresAt: true },
    orderBy: { issuedAt: "desc" },
  });
}

/** Whether this student currently holds a check-in for this election. */
export async function hasLivePass(
  universityId: string,
  studentId: string,
  electionId: string,
): Promise<boolean> {
  const student = await prisma.student.findUnique({
    where: {
      universityId_studentId: {
        universityId,
        studentId: normaliseStudentId(studentId),
      },
    },
    select: { id: true },
  });
  if (!student) return false;

  return (await findLivePass(student.id, electionId)) !== null;
}

/**
 * Spends the student's pass.
 *
 * Returns false when there was nothing live to spend, which is what makes a
 * pass single-use: the update is conditional on `usedAt` still being null, so
 * two ballots racing the same pass cannot both find it unspent.
 */
export async function consumePass(
  universityId: string,
  studentId: string,
  electionId: string,
): Promise<boolean> {
  const student = await prisma.student.findUnique({
    where: {
      universityId_studentId: {
        universityId,
        studentId: normaliseStudentId(studentId),
      },
    },
    select: { id: true },
  });
  if (!student) return false;

  const pass = await findLivePass(student.id, electionId);
  if (!pass) return false;

  const { count } = await prisma.votingPass.updateMany({
    where: { id: pass.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return count > 0;
}

export type DeskRow = {
  id: string;
  studentId: string;
  fullName: string;
  issuedBy: string;
  issuedAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  /**
   * Resolved here rather than by whoever renders the row.
   *
   * "Expired" is a fact about a moment, and reading the clock while a Server
   * Component renders is impure — Next rejects it. Working it out at the point
   * the rows are fetched keeps the page a plain function of its data.
   */
  state: "open" | "used" | "expired";
};

/** The desk's own log for this election, newest first. */
export async function recentCheckIns(
  electionId: string,
  limit = 25,
): Promise<DeskRow[]> {
  const rows = await prisma.votingPass.findMany({
    where: { electionId },
    orderBy: { issuedAt: "desc" },
    take: limit,
    select: {
      id: true,
      issuedBy: true,
      issuedAt: true,
      expiresAt: true,
      usedAt: true,
      student: { select: { studentId: true, fullName: true } },
    },
  });

  const now = Date.now();

  return rows.map((row) => ({
    id: row.id,
    studentId: row.student.studentId,
    fullName: row.student.fullName,
    issuedBy: row.issuedBy,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    state: row.usedAt
      ? ("used" as const)
      : row.expiresAt.getTime() > now
        ? ("open" as const)
        : ("expired" as const),
  }));
}

/** How many students have been checked in, and how many of those have voted. */
export async function checkInTally(
  electionId: string,
): Promise<{ issued: number; used: number }> {
  const [issued, used] = await Promise.all([
    prisma.votingPass.count({ where: { electionId } }),
    prisma.votingPass.count({ where: { electionId, usedAt: { not: null } } }),
  ]);
  return { issued, used };
}
