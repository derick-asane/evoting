import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";

import { hashPassword, newSalt } from "../lib/crypto";
import { prisma } from "../lib/db";
import { issueStudentReset, redeemStudentReset } from "../lib/password-reset";
import { verifyCredentials } from "../lib/students";

/**
 * Password reset codes.
 *
 * Builds its own throwaway university so nothing here can disturb a real one,
 * and removes it afterwards.
 */

const SLUG = `test-reset-${randomUUID().slice(0, 8)}`;
const STUDENT = "TEST0001";
const ORIGINAL = "original-password";

let universityId: string;

before(async () => {
  const salt = newSalt();
  const university = await prisma.university.create({
    data: {
      slug: SLUG,
      name: `Test ${SLUG}`,
      contactEmail: `${SLUG}@example.test`,
      passwordHash: await hashPassword("committee-password", salt),
      salt,
      walletAddress: `0x${"11".repeat(20)}`,
      encryptedWalletKey: "unused-in-these-tests",
    },
  });
  universityId = university.id;

  const studentSalt = newSalt();
  await prisma.student.create({
    data: {
      universityId,
      studentId: STUDENT,
      fullName: "Test Student",
      passwordHash: await hashPassword(ORIGINAL, studentSalt),
      salt: studentSalt,
      activatedAt: new Date(),
    },
  });
});

after(async () => {
  // Cascades through students and their reset codes.
  await prisma.university.deleteMany({ where: { id: universityId } });
  await prisma.$disconnect();
});

describe("issuing a reset code", () => {
  it("refuses a student who is not on the records", async () => {
    const result = await issueStudentReset(universityId, "NOSUCHSTUDENT");
    assert.equal(result.ok, false);
  });

  it("returns a readable code and the student's name", async () => {
    const result = await issueStudentReset(universityId, STUDENT);
    assert.ok(result.ok);
    assert.equal(result.studentName, "Test Student");
    // Grouped, and drawn from an alphabet with no O/0 or I/1/L to read aloud.
    assert.match(result.code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789-]{14}$/);
    assert.ok(result.expiresAt.getTime() > Date.now());
  });

  it("never stores the code in a readable form", async () => {
    const issued = await issueStudentReset(universityId, STUDENT);
    assert.ok(issued.ok);

    const rows = await prisma.passwordReset.findMany({
      where: { student: { universityId } },
      select: { tokenHash: true },
    });
    const bare = issued.code.replace(/-/g, "");
    for (const row of rows) {
      assert.ok(!row.tokenHash.includes(bare), "code found in the database");
    }
  });
});

describe("redeeming a reset code", () => {
  it("rejects a code that was never issued", async () => {
    const result = await redeemStudentReset({
      code: "AAAA-BBBB-CCCC",
      password: "brand-new-password",
      confirm: "brand-new-password",
    });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "badCode");
  });

  it("rejects mismatched confirmation before touching the code", async () => {
    const issued = await issueStudentReset(universityId, STUDENT);
    assert.ok(issued.ok);

    const result = await redeemStudentReset({
      code: issued.code,
      password: "brand-new-password",
      confirm: "something-else",
    });
    assert.equal(result.ok === false && result.code, "mismatch");

    // The code must survive a typo in the confirmation field.
    const retry = await redeemStudentReset({
      code: issued.code,
      password: "brand-new-password",
      confirm: "brand-new-password",
    });
    assert.equal(retry.ok, true);
  });

  it("rejects a password that is too short", async () => {
    const issued = await issueStudentReset(universityId, STUDENT);
    assert.ok(issued.ok);

    const result = await redeemStudentReset({
      code: issued.code,
      password: "short",
      confirm: "short",
    });
    assert.equal(result.ok === false && result.code, "passwordShort");
  });

  it("replaces the old password and revokes it", async () => {
    const issued = await issueStudentReset(universityId, STUDENT);
    assert.ok(issued.ok);

    await redeemStudentReset({
      code: issued.code,
      password: "a-fresh-password",
      confirm: "a-fresh-password",
    });

    assert.ok(await verifyCredentials(universityId, STUDENT, "a-fresh-password"));
    assert.equal(
      await verifyCredentials(universityId, STUDENT, ORIGINAL),
      null,
      "the old password must stop working",
    );
  });

  it("refuses to reuse a code", async () => {
    const issued = await issueStudentReset(universityId, STUDENT);
    assert.ok(issued.ok);

    await redeemStudentReset({
      code: issued.code,
      password: "first-use-password",
      confirm: "first-use-password",
    });
    const replay = await redeemStudentReset({
      code: issued.code,
      password: "second-use-password",
      confirm: "second-use-password",
    });

    assert.equal(replay.ok === false && replay.code, "used");
    assert.equal(
      await verifyCredentials(universityId, STUDENT, "second-use-password"),
      null,
      "a replayed code must not change the password",
    );
  });

  it("voids an earlier unused code when a new one is issued", async () => {
    const first = await issueStudentReset(universityId, STUDENT);
    const second = await issueStudentReset(universityId, STUDENT);
    assert.ok(first.ok && second.ok);

    const stale = await redeemStudentReset({
      code: first.code,
      password: "stale-code-password",
      confirm: "stale-code-password",
    });
    assert.equal(stale.ok, false, "a superseded code must stop working");

    const current = await redeemStudentReset({
      code: second.code,
      password: "current-code-password",
      confirm: "current-code-password",
    });
    assert.equal(current.ok, true);
  });

  it("rejects an expired code", async () => {
    const issued = await issueStudentReset(universityId, STUDENT);
    assert.ok(issued.ok);

    await prisma.passwordReset.updateMany({
      where: { student: { universityId }, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await redeemStudentReset({
      code: issued.code,
      password: "too-late-password",
      confirm: "too-late-password",
    });
    assert.equal(result.ok === false && result.code, "expired");
  });

  it("lets only one of two simultaneous redemptions win", async () => {
    // The code is the whole credential. If two requests racing it could both
    // succeed, the second would silently overwrite the first person's
    // password — so the claim and the write share one transaction.
    const issued = await issueStudentReset(universityId, STUDENT);
    assert.ok(issued.ok);

    const [a, b] = await Promise.all([
      redeemStudentReset({
        code: issued.code,
        password: "racer-one-password",
        confirm: "racer-one-password",
      }),
      redeemStudentReset({
        code: issued.code,
        password: "racer-two-password",
        confirm: "racer-two-password",
      }),
    ]);

    const winners = [a, b].filter((result) => result.ok);
    assert.equal(winners.length, 1, "exactly one redemption should succeed");
  });
});
