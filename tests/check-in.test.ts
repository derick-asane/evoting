import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import {
  checkInStudent,
  consumePass,
  hasLivePass,
  recentCheckIns,
} from "../lib/check-in";
import { prisma } from "../lib/db";

/**
 * Supervised voting: a committee member matches a face to a student card, and
 * that opens a short window in which one ballot can be cast.
 *
 * This is the only control in the system that survives a student handing their
 * password over willingly, so the rules around the pass — single use, expiring,
 * one at a time, and only for someone actually on the roll — are what the whole
 * guarantee rests on.
 */

const SLUG = `test-desk-${randomUUID().slice(0, 8)}`;
const DESK = "desk@test.invalid";

let universityId: string;
let electionId: string;
let enrolledId: string;

let graduatedId: string;

before(async () => {
  const university = await prisma.university.create({
    data: {
      slug: SLUG,
      name: "Desk Test University",
      contactEmail: `${SLUG}@test.invalid`,
      passwordHash: "x",
      salt: "x",
      walletAddress: "0x0000000000000000000000000000000000000000",
      encryptedWalletKey: "x",
    },
  });
  universityId = university.id;

  const election = await prisma.election.create({
    data: {
      universityId,
      title: "Desk Test Election",
      address: "0x0000000000000000000000000000000000000001",
      deploymentBlock: 0,
      supervised: true,
    },
  });
  electionId = election.id;

  const make = async (studentId: string, status: "enrolled" | "graduated") =>
    (
      await prisma.student.create({
        data: { universityId, studentId, fullName: studentId, status },
      })
    ).id;

  enrolledId = await make("ON1", "enrolled");
  await make("OFF1", "enrolled"); // listed and enrolled, but never written to the roll
  graduatedId = await make("GRAD1", "graduated");

  // Only the first two are written to this election's roll.
  await prisma.rollEntry.createMany({
    data: [
      { studentId: enrolledId, electionId },
      { studentId: graduatedId, electionId },
    ],
  });
});

after(async () => {
  await prisma.university.deleteMany({ where: { id: universityId } });
  await prisma.$disconnect();
});

const checkIn = (studentId: string) =>
  checkInStudent({ universityId, electionId, studentId, issuedBy: DESK });

describe("the check-in desk", () => {
  it("clears a student who is enrolled and on the roll", async () => {
    const result = await checkIn("ON1");
    assert.equal(result.ok, true);
    assert.ok(await hasLivePass(universityId, "ON1", electionId));
  });

  it("refuses a second pass while one is still open", async () => {
    // Otherwise a student could collect a pass from each of two desks, or one
    // committee member could quietly hand out several for the same person.
    const again = await checkIn("ON1");
    assert.equal(again.ok, false);
    assert.equal(again.ok === false && again.code, "alreadyOpen");
  });

  it("spends the pass once and only once", async () => {
    assert.equal(await consumePass(universityId, "ON1", electionId), true);
    assert.equal(
      await consumePass(universityId, "ON1", electionId),
      false,
      "a spent pass must not authorise a second ballot",
    );
    assert.equal(await hasLivePass(universityId, "ON1", electionId), false);
  });

  it("lets only one of two simultaneous ballots spend the same pass", async () => {
    await checkIn("ON1");

    const [first, second] = await Promise.all([
      consumePass(universityId, "ON1", electionId),
      consumePass(universityId, "ON1", electionId),
    ]);

    assert.equal(
      [first, second].filter(Boolean).length,
      1,
      "exactly one of two racing ballots may spend the pass",
    );
  });

  it("refuses a student who is not on this election's roll", async () => {
    // The contract would reject the ballot anyway; catching it at the desk is
    // what stops a student being told they can vote and then turned away.
    const result = await checkIn("OFF1");
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "notOnRoll");
  });

  it("refuses a student who has left, even though they are on the roll", async () => {
    const result = await checkIn("GRAD1");
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "notEnrolled");
  });

  it("refuses a number that is on no records at all", async () => {
    const result = await checkIn("NOBODY");
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.code, "unknownStudent");
  });

  it("treats an expired pass as no pass", async () => {
    await prisma.votingPass.updateMany({
      where: { electionId, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    assert.equal(await hasLivePass(universityId, "ON1", electionId), false);
    assert.equal(await consumePass(universityId, "ON1", electionId), false);

    // And an expired one does not block a fresh check-in.
    assert.equal((await checkIn("ON1")).ok, true);
  });

  it("records who did the checking in", async () => {
    // A disputed ballot has to lead back to a named person at a known minute,
    // not to "the system".
    const rows = await recentCheckIns(electionId);
    assert.ok(rows.length > 0);
    for (const row of rows) assert.equal(row.issuedBy, DESK);
    assert.ok(rows.every((row) => row.studentId.length > 0));
  });
});
