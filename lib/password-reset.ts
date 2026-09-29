import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { hashPassword, newSalt } from "./crypto";
import { prisma } from "./db";
import { ResetPurpose } from "./generated/prisma/client";
import { normaliseStudentId } from "./identity";

export { ResetPurpose };

/**
 * Single-use codes for setting a password, both the first one and a later
 * replacement.
 *
 * Students have no email address on file, so a code is issued by the committee
 * and handed to the student in person against a student card. For an election
 * that is a feature, not a workaround: an in-person check is a stronger
 * identity proof than an emailed link, and it keeps account recovery inside the
 * same office that decides eligibility.
 *
 * This is also the only thing standing between a matriculation number and
 * someone else's ballot. Matriculation numbers are sequential, printed on
 * cards and shared without a second thought — they are identifiers, not
 * secrets. Activation used to need nothing else, which meant any unclaimed
 * account belonged to whoever typed the number first.
 */

/** A reset is redeemed at the desk within the day. */
const RESET_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * An activation sheet is printed, cut up and handed out over the days before
 * an election, so its codes have to outlive that.
 */
const ACTIVATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Unambiguous alphabet: no O/0, no I/1/L. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = randomBytes(12);
  let code = "";
  for (let index = 0; index < 12; index++) {
    code += ALPHABET[bytes[index]! % ALPHABET.length];
    if (index % 4 === 3 && index !== 11) code += "-";
  }
  return code; // e.g. K3MP-7QXR-9TFA
}

/** Codes are looked up by hash, so the table never holds a usable code. */
function hashCode(code: string): string {
  return createHash("sha256")
    .update(code.replace(/-/g, "").toUpperCase())
    .digest("hex");
}

export type IssueResult =
  | { ok: true; code: string; expiresAt: Date; studentName: string }
  | { ok: false; code: "notFound" };

/** Issues a code for one student, invalidating any earlier unused ones. */
export async function issueStudentReset(
  universityId: string,
  studentId: string,
): Promise<IssueResult> {
  const student = await prisma.student.findUnique({
    where: {
      universityId_studentId: {
        universityId,
        studentId: normaliseStudentId(studentId),
      },
    },
    select: { id: true, fullName: true },
  });
  if (!student) return { ok: false, code: "notFound" };

  const plain = generateCode();
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.$transaction([
    // Only the newest code should work, so a re-issue voids the previous one.
    prisma.passwordReset.deleteMany({
      where: { studentRowId: student.id, usedAt: null },
    }),
    prisma.passwordReset.create({
      data: {
        studentRowId: student.id,
        purpose: ResetPurpose.reset,
        tokenHash: hashCode(plain),
        expiresAt,
      },
    }),
  ]);

  return { ok: true, code: plain, expiresAt, studentName: student.fullName };
}

/** One line of the sheet the committee prints and hands out. */
export type ActivationCode = {
  studentId: string;
  fullName: string;
  programme: string;
  code: string;
};

/**
 * Issues an activation code for every enrolled student who has not set a
 * password yet.
 *
 * Done in bulk because the alternative is a committee clicking through six
 * hundred students one at a time, and a control that is painful enough gets
 * worked around. The codes come back in plain form exactly once, as a sheet to
 * print; after this returns, only their hashes exist.
 *
 * Re-running it voids every outstanding activation code and issues new ones,
 * so a sheet that went missing can be cancelled by reprinting.
 */
export async function issueActivationCodes(universityId: string): Promise<{
  codes: ActivationCode[];
  expiresAt: Date;
}> {
  const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);

  const students = await prisma.student.findMany({
    where: {
      universityId,
      // A student who has already chosen a password does not need one, and
      // issuing one anyway would be a way to take over a live account.
      passwordHash: null,
      status: "enrolled",
    },
    select: { id: true, studentId: true, fullName: true, programme: true },
    orderBy: { studentId: "asc" },
  });

  if (students.length === 0) return { codes: [], expiresAt };

  const issued = students.map((student) => ({
    student,
    code: generateCode(),
  }));

  await prisma.$transaction([
    prisma.passwordReset.deleteMany({
      where: {
        studentRowId: { in: students.map((s) => s.id) },
        purpose: ResetPurpose.activation,
        usedAt: null,
      },
    }),
    prisma.passwordReset.createMany({
      data: issued.map(({ student, code }) => ({
        studentRowId: student.id,
        purpose: ResetPurpose.activation,
        tokenHash: hashCode(code),
        expiresAt,
      })),
    }),
  ]);

  return {
    codes: issued.map(({ student, code }) => ({
      studentId: student.studentId,
      fullName: student.fullName,
      programme: student.programme,
      code,
    })),
    expiresAt,
  };
}

export type RedeemFailure =
  | "badCode"
  | "expired"
  | "used"
  | "passwordShort"
  | "mismatch";

/**
 * Exchanges a code for a new password.
 *
 * The code is the only credential, so it is marked used in the same
 * transaction that sets the password — two people racing the same code cannot
 * both succeed.
 */
export async function redeemStudentReset(input: {
  code: string;
  password: string;
  confirm: string;
}): Promise<
  | {
      ok: true;
      studentId: string;
      universityId: string;
      /** Which kind of code this was, so the caller can word the result. */
      purpose: ResetPurpose;
    }
  | { ok: false; code: RedeemFailure }
> {
  if (input.password !== input.confirm) return { ok: false, code: "mismatch" };
  if (input.password.length < 8) return { ok: false, code: "passwordShort" };

  const supplied = input.code.trim();
  if (!supplied) return { ok: false, code: "badCode" };

  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashCode(supplied) },
    include: {
      student: {
        select: {
          id: true,
          studentId: true,
          universityId: true,
          activatedAt: true,
        },
      },
    },
  });

  // Compare the hashes rather than returning on lookup alone, so a partially
  // guessed code cannot be distinguished by timing.
  if (!reset || !reset.student) return { ok: false, code: "badCode" };
  const expected = Buffer.from(reset.tokenHash, "hex");
  const actual = Buffer.from(hashCode(supplied), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, code: "badCode" };
  }

  if (reset.usedAt) return { ok: false, code: "used" };
  if (reset.expiresAt.getTime() < Date.now()) return { ok: false, code: "expired" };

  const salt = newSalt();
  const passwordHash = await hashPassword(input.password, salt);

  const [claimed] = await prisma.$transaction([
    prisma.passwordReset.updateMany({
      where: { id: reset.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.student.update({
      where: { id: reset.student.id },
      data: {
        salt,
        passwordHash,
        // First activation only. A later reset must not move this date, or the
        // record of when the account was claimed is lost every time someone
        // forgets their password.
        activatedAt: reset.student.activatedAt ?? new Date(),
      },
    }),
  ]);

  if (claimed.count === 0) return { ok: false, code: "used" };

  return {
    ok: true,
    studentId: reset.student.studentId,
    universityId: reset.student.universityId,
    purpose: reset.purpose,
  };
}

/** Same flow for a committee account, used by the CLI recovery script. */
export async function issueUniversityReset(
  contactEmail: string,
): Promise<{ ok: true; code: string; expiresAt: Date } | { ok: false }> {
  const university = await prisma.university.findUnique({
    where: { contactEmail: contactEmail.trim().toLowerCase() },
    select: { id: true },
  });
  if (!university) return { ok: false };

  const plain = generateCode();
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.$transaction([
    prisma.passwordReset.deleteMany({
      where: { universityId: university.id, usedAt: null },
    }),
    prisma.passwordReset.create({
      data: { universityId: university.id, tokenHash: hashCode(plain), expiresAt },
    }),
  ]);

  return { ok: true, code: plain, expiresAt };
}

export async function redeemUniversityReset(input: {
  code: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; code: RedeemFailure }> {
  if (input.password.length < 10) return { ok: false, code: "passwordShort" };

  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashCode(input.code.trim()) },
    select: { id: true, universityId: true, usedAt: true, expiresAt: true },
  });

  if (!reset?.universityId) return { ok: false, code: "badCode" };
  if (reset.usedAt) return { ok: false, code: "used" };
  if (reset.expiresAt.getTime() < Date.now()) return { ok: false, code: "expired" };

  const salt = newSalt();
  const passwordHash = await hashPassword(input.password, salt);

  const [claimed] = await prisma.$transaction([
    prisma.passwordReset.updateMany({
      where: { id: reset.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.university.update({
      where: { id: reset.universityId },
      data: { salt, passwordHash },
    }),
  ]);

  return claimed.count === 0 ? { ok: false, code: "used" } : { ok: true };
}
