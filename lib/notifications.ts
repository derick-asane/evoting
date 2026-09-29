import "server-only";

import { prisma } from "./db";
import { NotificationKind, type Notification } from "./generated/prisma/client";
import { normaliseStudentId } from "./identity";

export { NotificationKind };
export type { Notification };

/**
 * Raises one notification per student.
 *
 * Delivery is in-app: the student sees it next time they open the site. The
 * `deliverExternally` seam below is where email or SMS would hook in — that is
 * deliberately left unconfigured rather than half-wired, so nothing silently
 * fails to send.
 */
export async function notifyStudents(input: {
  universityId: string;
  electionId: string;
  /** Matriculation numbers, as the rest of the app refers to students. */
  studentIds: string[];
  kind: NotificationKind;
  title: string;
  body: string;
}): Promise<number> {
  const wanted = input.studentIds.map(normaliseStudentId).filter(Boolean);
  if (wanted.length === 0) return 0;

  const students = await prisma.student.findMany({
    where: { universityId: input.universityId, studentId: { in: wanted } },
    select: { id: true },
  });
  if (students.length === 0) return 0;

  // skipDuplicates + the (studentId, electionId, kind) unique index means
  // re-running a phase change cannot spam anyone with a second copy.
  const { count } = await prisma.notification.createMany({
    data: students.map((student) => ({
      universityId: input.universityId,
      studentId: student.id,
      electionId: input.electionId,
      kind: input.kind,
      title: input.title,
      body: input.body,
    })),
    skipDuplicates: true,
  });

  if (count > 0) await deliverExternally(count, input.title);
  return count;
}

/**
 * Raises the "a ballot was cast in your name" alert.
 *
 * Separate from `notifyStudents` because that one uses `skipDuplicates`, which
 * is right for a phase change nobody should hear about twice and wrong here: a
 * student may cast more than one partial ballot in the same election, and the
 * second one is exactly as worth knowing about as the first. So this updates
 * the existing alert in place and marks it unread again.
 */
export async function notifyBallotCast(input: {
  universityId: string;
  electionId: string;
  /** Matriculation number. */
  studentId: string;
  title: string;
  body: string;
}): Promise<void> {
  const student = await prisma.student.findUnique({
    where: {
      universityId_studentId: {
        universityId: input.universityId,
        studentId: normaliseStudentId(input.studentId),
      },
    },
    select: { id: true },
  });
  if (!student) return;

  try {
    await prisma.notification.upsert({
      where: {
        studentId_electionId_kind: {
          studentId: student.id,
          electionId: input.electionId,
          kind: NotificationKind.ballot_cast,
        },
      },
      create: {
        universityId: input.universityId,
        studentId: student.id,
        electionId: input.electionId,
        kind: NotificationKind.ballot_cast,
        title: input.title,
        body: input.body,
      },
      update: {
        title: input.title,
        body: input.body,
        createdAt: new Date(),
        // Unread again, so a second ballot is not hidden by having dismissed
        // the first.
        readAt: null,
      },
    });
  } catch (error) {
    // The ballot is already on the chain. Failing the action now would tell
    // the student their vote did not count, which would be a lie.
    console.error("Ballot-cast alert failed", error);
  }
}

/**
 * Where an email or SMS provider would be called.
 *
 * Left as a logging stub on purpose: wiring a real sender needs credentials and
 * a deliverability story, and a half-configured one would fail quietly on
 * election day. See README for what to add here.
 */
async function deliverExternally(count: number, title: string): Promise<void> {
  console.info(`[notify] ${count} in-app notification(s) raised: "${title}"`);
}

export async function listForStudent(
  universityId: string,
  studentId: string,
): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: {
      universityId,
      student: { studentId: normaliseStudentId(studentId) },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function unreadCount(
  universityId: string,
  studentId: string,
): Promise<number> {
  return prisma.notification.count({
    where: {
      universityId,
      student: { studentId: normaliseStudentId(studentId) },
      readAt: null,
    },
  });
}

export async function markAllRead(
  universityId: string,
  studentId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      universityId,
      student: { studentId: normaliseStudentId(studentId) },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}
