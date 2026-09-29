import "server-only";

import { hashPassword, newSalt, passwordMatches } from "./crypto";
import { prisma } from "./db";
import { EnrolmentStatus, type Student } from "./generated/prisma/client";
import { normaliseStudentId } from "./identity";

export { EnrolmentStatus };
export type { Student };

export const ENROLMENT_LABEL: Record<EnrolmentStatus, string> = {
  enrolled: "Enrolled",
  graduated: "Graduated",
  withdrawn: "Withdrawn",
};

export function isEnrolmentStatus(value: string): value is EnrolmentStatus {
  return value === "enrolled" || value === "graduated" || value === "withdrawn";
}

/** A student plus the elections whose on-chain roll already contains them. */
export type StudentWithRoll = Student & { rolledInto: string[] };

function withRoll(
  student: Student & { rollEntries: Array<{ electionId: string }> },
): StudentWithRoll {
  const { rollEntries, ...rest } = student;
  return { ...rest, rolledInto: rollEntries.map((entry) => entry.electionId) };
}

export async function listStudents(
  universityId: string,
): Promise<StudentWithRoll[]> {
  const students = await prisma.student.findMany({
    where: { universityId },
    orderBy: { studentId: "asc" },
    include: { rollEntries: { select: { electionId: true } } },
  });
  return students.map(withRoll);
}

export async function findStudent(
  universityId: string,
  studentId: string,
): Promise<StudentWithRoll | null> {
  const student = await prisma.student.findUnique({
    where: {
      universityId_studentId: {
        universityId,
        studentId: normaliseStudentId(studentId),
      },
    },
    include: { rollEntries: { select: { electionId: true } } },
  });
  return student ? withRoll(student) : null;
}

/** Adds students to the records. Existing entries are left untouched. */
export async function addEligibleStudents(
  universityId: string,
  entries: Array<{
    studentId: string;
    fullName: string;
    programme: string;
    status?: EnrolmentStatus;
  }>,
): Promise<{ added: number; skipped: number }> {
  // De-duplicate within the pasted batch before the database sees it.
  const seen = new Set<string>();
  const rows = [];

  for (const entry of entries) {
    const studentId = normaliseStudentId(entry.studentId);
    if (!studentId || seen.has(studentId)) continue;
    seen.add(studentId);
    rows.push({
      universityId,
      studentId,
      fullName: entry.fullName.trim() || studentId,
      programme: entry.programme.trim(),
      status: entry.status ?? EnrolmentStatus.enrolled,
    });
  }

  // skipDuplicates leans on the (universityId, studentId) unique index, so a
  // re-pasted roster updates nobody and loses nobody.
  const { count } = await prisma.student.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return { added: count, skipped: entries.length - count };
}

/**
 * Updates enrolment status, for example at the end of an academic year.
 *
 * A student moved off `enrolled` keeps their account and their past ballots,
 * but will not be written to any future election roll.
 */
export async function setEnrolmentStatus(
  universityId: string,
  studentIds: string[],
  status: EnrolmentStatus,
): Promise<{ changed: number; unknown: string[] }> {
  const wanted = [...new Set(studentIds.map(normaliseStudentId).filter(Boolean))];
  if (wanted.length === 0) return { changed: 0, unknown: [] };

  const existing = await prisma.student.findMany({
    where: { universityId, studentId: { in: wanted } },
    select: { studentId: true },
  });
  const found = new Set(existing.map((student) => student.studentId));

  const { count } = await prisma.student.updateMany({
    // `status: { not: status }` keeps the count to students who actually moved.
    where: { universityId, studentId: { in: wanted }, status: { not: status } },
    data: { status, statusChangedAt: new Date() },
  });

  return {
    changed: count,
    unknown: wanted.filter((id) => !found.has(id)),
  };
}

/**
 * There is deliberately no `activateStudent(universityId, studentId, password)`
 * here any more.
 *
 * That function let anyone who knew a matriculation number claim the account
 * that number belonged to, by being the first to choose a password for it.
 * Matriculation numbers are sequential, printed on cards and handed around —
 * they identify a student, they do not authenticate one, so every account that
 * had not been claimed yet was claimable by a stranger.
 *
 * Setting a password now always costs a code issued by the committee against a
 * student card: `issueActivationCodes` and `redeemStudentReset` in
 * `lib/password-reset.ts`. Keeping a no-code path here "for the seed script"
 * would have put the hole straight back, one import away, so the seed uses the
 * code flow too.
 */

export async function verifyCredentials(
  universityId: string,
  studentId: string,
  password: string,
): Promise<Student | null> {
  const student = await prisma.student.findUnique({
    where: {
      universityId_studentId: {
        universityId,
        studentId: normaliseStudentId(studentId),
      },
    },
  });
  if (!student?.passwordHash || !student.salt) return null;

  const matches = await passwordMatches(
    password,
    student.salt,
    student.passwordHash,
  );
  // Graduated students may still sign in, to verify ballots they cast while
  // enrolled. The roll is what stops them voting again.
  return matches ? student : null;
}

/** Records that these students now appear on an election's on-chain roll. */
export async function markRolledInto(
  universityId: string,
  electionId: string,
  studentIds: string[],
): Promise<void> {
  const wanted = studentIds.map(normaliseStudentId).filter(Boolean);
  if (wanted.length === 0) return;

  const students = await prisma.student.findMany({
    where: { universityId, studentId: { in: wanted } },
    select: { id: true },
  });

  await prisma.rollEntry.createMany({
    data: students.map((student) => ({ studentId: student.id, electionId })),
    skipDuplicates: true,
  });
}

/**
 * Enrolled, activated students who are not yet on this election's on-chain
 * roll. Anyone who has graduated or withdrawn is excluded, so they are never
 * written to a roll and cannot vote in this or any later election.
 */
export async function pendingForElection(
  universityId: string,
  electionId: string,
): Promise<Student[]> {
  return prisma.student.findMany({
    where: {
      universityId,
      status: EnrolmentStatus.enrolled,
      passwordHash: { not: null },
      rollEntries: { none: { electionId } },
    },
    orderBy: { studentId: "asc" },
  });
}

/** Students already written to this election's roll — who to notify. */
export async function rolledIntoElection(
  universityId: string,
  electionId: string,
): Promise<Student[]> {
  return prisma.student.findMany({
    where: { universityId, rollEntries: { some: { electionId } } },
    orderBy: { studentId: "asc" },
  });
}
