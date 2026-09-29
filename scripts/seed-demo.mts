/**
 * Drives a whole multi-position election end to end against the running chain,
 * asserting the guarantees as it goes, and leaves behind a demo university you
 * can sign into.
 *
 *   npm run seed
 *
 * Clears only its own demo university. `--reset-all` wipes every account,
 * which is almost never what you want.
 *
 * Node resolves `server-only` through the react-server condition (set in the
 * npm script), which is why these server modules can be imported here.
 */
import assert from "node:assert/strict";

import {
  Phase,
  addCandidate,
  addPosition,
  closeVoting,
  getBallot,
  getBallotBox,
  getElectionState,
  hasVotedFor,
  lookupReceipt,
  openRegistration,
  openVoting,
  outstandingPositions,
  registerOnChain,
  submitBallot,
} from "../lib/election";
import { createElection } from "../lib/elections";
import { newReceiptId, voterHash } from "../lib/identity";
import { listForStudent, notifyStudents } from "../lib/notifications";
import { issueActivationCodes, redeemStudentReset } from "../lib/password-reset";
import {
  addEligibleStudents,
  markRolledInto,
  pendingForElection,
  rolledIntoElection,
  setEnrolmentStatus,
} from "../lib/students";
import { createUniversity, walletKeyOf } from "../lib/universities";
import { prisma } from "../lib/db";
import { NotificationKind } from "../lib/notifications";

/**
 * Wipe every university, not just the demo one. Almost never what you want —
 * it destroys real accounts alongside the fixture.
 */
const RESET_ALL = process.argv.includes("--reset-all");

const DEMO_SLUG = "riverside-university";

const ROSTER = [
  { studentId: "CS2021001", fullName: "Ada Lovelace", programme: "Computer Science" },
  { studentId: "EE2021002", fullName: "Alan Turing", programme: "Electrical Engineering" },
  { studentId: "PH2021003", fullName: "Grace Hopper", programme: "Physics" },
  { studentId: "CS2021004", fullName: "Katherine Johnson", programme: "Computer Science" },
  { studentId: "ME2021005", fullName: "Mary Jackson", programme: "Mechanical Engineering" },
];

const PASSWORD = "student-password";
const ADMIN_PASSWORD = "committee-password";

const PRESIDENT = 0;
const SECRETARY = 1;

function step(message: string) {
  console.log(`\n▸ ${message}`);
}

// Clear only this script's own fixture by default.
//
// It used to wipe the whole universities table, which meant running the seed to
// check something took real accounts down with it. A seed should never be able
// to destroy data it did not create.
if (RESET_ALL) {
  const { count } = await prisma.university.deleteMany({});
  console.log(`--reset-all: removed ALL ${count} universities`);
} else {
  const { count } = await prisma.university.deleteMany({
    where: { slug: DEMO_SLUG },
  });
  console.log(
    count > 0
      ? `Replaced the existing "${DEMO_SLUG}" demo. Other accounts untouched.`
      : "No existing demo to replace. Other accounts untouched.",
  );
}

// --- 1. A university signs up ------------------------------------------------

step("Creating the university account");
const signup = await createUniversity({
  name: "Riverside University",
  contactEmail: "committee@riverside.edu",
  password: ADMIN_PASSWORD,
});
assert.ok(signup.ok, signup.ok ? "" : `signup failed: ${(signup as { code: string }).code}`);
const university = signup.university;
const key = walletKeyOf(university);
console.log(`  ${university.name} → wallet ${university.walletAddress}`);

// --- 2. They deploy their election -------------------------------------------

step("Deploying the election contract from the university wallet");
const created = await createElection(university, "Students' Union 2026");
assert.ok(created.ok, created.ok ? "" : `deploy failed: ${(created as { code: string }).code}`);
const election = created.election;
console.log(`  ${election.title} → ${election.address}`);

const owner = await (await import("../lib/chain")).readElection(election.address).read.admin();
assert.equal(
  owner.toLowerCase(),
  university.walletAddress.toLowerCase(),
  "the university's own wallet must be the contract admin",
);
console.log("  ✓ the university, not the platform, administers this contract");

// --- 3. Positions, candidates and the roster ---------------------------------

step("Configuring the positions this election fills");
await addPosition(election.address, key, "President");
await addPosition(election.address, key, "Secretary General");

await addCandidate(election.address, key, PRESIDENT, "Ada Lovelace", "Analytical Party");
await addCandidate(election.address, key, PRESIDENT, "Alan Turing", "Enigma Party");
await addCandidate(election.address, key, SECRETARY, "Grace Hopper", "Compiler Coalition");
await addCandidate(election.address, key, SECRETARY, "Katherine Johnson", "Orbit Party");

for (const position of await getBallot(election.address)) {
  console.log(
    `  ${position.title}: ${position.candidates.map((c) => c.name).join(", ")}`,
  );
}

step("Loading the eligible-student list");
const { added } = await addEligibleStudents(university.id, ROSTER);
console.log(`  ${added} students listed`);

step("The committee prints activation codes");
const { codes } = await issueActivationCodes(university.id);
assert.equal(codes.length, ROSTER.length, "every listed student needs a code");

step("Students activate their accounts with the code they were handed");
for (const issued of codes) {
  const result = await redeemStudentReset({
    code: issued.code,
    password: PASSWORD,
    confirm: PASSWORD,
  });
  assert.ok(result.ok, `activation failed for ${issued.studentId}`);
}

// Knowing a matriculation number is not enough. This is the whole point of
// the code: without it, any unclaimed account belongs to whoever types the
// number first, and matriculation numbers are printed on cards.
const guessed = await redeemStudentReset({
  code: "ZZZZ-ZZZZ-ZZZZ",
  password: PASSWORD,
  confirm: PASSWORD,
});
assert.equal(guessed.ok, false, "a made-up code must not activate anyone");

// And a code is spent once.
const replay = await redeemStudentReset({
  code: codes[0]!.code,
  password: "a-different-password",
  confirm: "a-different-password",
});
assert.equal(replay.ok, false, "an activation code must not work twice");

console.log(
  `  ${codes.length} activated by code; a guessed code and a replay were refused`,
);

// --- 4. Registration ----------------------------------------------------------

step("Opening registration and writing the roll to the chain");
await openRegistration(election.address, key);

const pending = await pendingForElection(university.id, election.id);
assert.equal(pending.length, ROSTER.length);

await registerOnChain(
  election.address,
  key,
  pending.map((student) => voterHash(university.id, student.studentId)),
);
await markRolledInto(
  university.id,
  election.id,
  pending.map((student) => student.studentId),
);

let state = await getElectionState(election.address);
assert.equal(state.registered, ROSTER.length);
console.log(`  ${state.registered} students on the on-chain roll`);

// --- 5. Voting ----------------------------------------------------------------

step("Opening the polls and alerting the students on the roll");
await openVoting(election.address, key);

const audience = await rolledIntoElection(university.id, election.id);
const alerted = await notifyStudents({
  universityId: university.id,
  electionId: election.id,
  studentIds: audience.map((student) => student.studentId),
  kind: NotificationKind.voting_open,
  title: `Voting is open: ${election.title}`,
  body: "The polls are open and you are on the roll. Sign in to cast your ballot.",
});
assert.equal(alerted, ROSTER.length, "every student on the roll must be alerted");

const inbox = await listForStudent(university.id, "CS2021001");
assert.equal(inbox.length, 1);
assert.equal(inbox[0].kind, NotificationKind.voting_open);
console.log(`  ✓ ${alerted} students alerted that voting opened`);

step("Casting ballots across both positions");

/** studentId → the lines they voted, so receipts can be checked later. */
const receipts = new Map<
  string,
  { receiptId: `0x${string}`; lines: Array<{ positionId: number; candidateId: number }> }
>();

const BALLOTS: Array<[string, Array<{ positionId: number; candidateId: number }>]> = [
  ["CS2021001", [{ positionId: PRESIDENT, candidateId: 0 }, { positionId: SECRETARY, candidateId: 1 }]],
  ["EE2021002", [{ positionId: PRESIDENT, candidateId: 1 }, { positionId: SECRETARY, candidateId: 1 }]],
  ["PH2021003", [{ positionId: PRESIDENT, candidateId: 1 }, { positionId: SECRETARY, candidateId: 0 }]],
  // Votes for President only — a deliberate abstention on Secretary.
  ["CS2021004", [{ positionId: PRESIDENT, candidateId: 0 }]],
];

for (const [studentId, lines] of BALLOTS) {
  const handle = voterHash(university.id, studentId);
  const receiptId = newReceiptId();
  await submitBallot(election.address, handle, receiptId, lines);
  receipts.set(studentId, { receiptId, lines });
  console.log(`  ${studentId} voted on ${lines.length} position(s)`);
}

// --- 6. The guarantees --------------------------------------------------------

step("Checking the guarantees the contract is supposed to enforce");

// One vote per position, per student.
await assert.rejects(
  submitBallot(election.address, voterHash(university.id, "CS2021001"), newReceiptId(), [
    { positionId: PRESIDENT, candidateId: 1 },
  ]),
  /AlreadyVoted/,
  "a second vote for a position already used must be rejected",
);
console.log("  ✓ a second vote for the same position is rejected");

// The abstention left a vote unspent, and it still works.
const stillOpen = await outstandingPositions(
  election.address,
  voterHash(university.id, "CS2021004"),
);
assert.deepEqual(stillOpen, [SECRETARY], "the abstained position must remain open");
await submitBallot(
  election.address,
  voterHash(university.id, "CS2021004"),
  newReceiptId(),
  [{ positionId: SECRETARY, candidateId: 0 }],
);
console.log("  ✓ an abstained position stays open and can be voted later");

// Nobody off the roll can vote.
await assert.rejects(
  submitBallot(election.address, voterHash(university.id, "ZZ9999999"), newReceiptId(), [
    { positionId: PRESIDENT, candidateId: 0 },
  ]),
  /NotOnRoll/,
  "a student who is not on the roll must be rejected",
);
console.log("  ✓ a student who is not on the roll is rejected");

// Receipts resolve to every choice on that ballot.
for (const [studentId, { receiptId, lines }] of receipts) {
  const found = await lookupReceipt(election.address, receiptId);
  assert.equal(found.found, true, `receipt for ${studentId} should resolve`);
  assert.deepEqual(
    found.lines,
    lines,
    `receipt for ${studentId} must list every choice they made`,
  );
}
console.log("  ✓ every receipt resolves to the full set of choices made");

// A student who did not vote is not marked as having voted.
assert.equal(
  await hasVotedFor(election.address, voterHash(university.id, "ME2021005"), PRESIDENT),
  false,
);
console.log("  ✓ a student who abstained entirely is not marked as having voted");

// The public log contains no identity.
const box = await getBallotBox(election.address, BigInt(election.deploymentBlock));
const serialised = JSON.stringify(box);
for (const [studentId] of BALLOTS) {
  assert.ok(
    !serialised.includes(voterHash(university.id, studentId)),
    "the public ballot log must not contain any voter handle",
  );
}
console.log("  ✓ the public ballot log contains no student identity");

// --- 7. Close and reconcile ---------------------------------------------------

step("Closing the polls and reconciling each position");
await closeVoting(election.address, key);

state = await getElectionState(election.address);
assert.equal(state.phase, Phase.Ended);

const ballot = await getBallot(election.address);

// Recount the log independently, per position, and compare.
const recount = new Map<string, number>();
for (const line of box) {
  const slot = `${line.positionId}:${line.candidateId}`;
  recount.set(slot, (recount.get(slot) ?? 0) + 1);
}

for (const position of ballot) {
  const tallied = position.candidates.reduce((sum, c) => sum + c.voteCount, 0);
  assert.equal(
    tallied,
    position.ballotsCast,
    `${position.title}: tallies must equal ballots cast for it`,
  );
  for (const candidate of position.candidates) {
    assert.equal(
      candidate.voteCount,
      recount.get(`${position.id}:${candidate.id}`) ?? 0,
      `independent recount disagrees for ${candidate.name}`,
    );
  }
}
console.log("  ✓ an independent recount of the log matches every position's tally");

await assert.rejects(
  submitBallot(election.address, voterHash(university.id, "ME2021005"), newReceiptId(), [
    { positionId: PRESIDENT, candidateId: 0 },
  ]),
  /WrongPhase/,
  "a ballot after the polls close must be rejected",
);
console.log("  ✓ a ballot cast after the polls closed is rejected");

console.log("\nFinal result");
for (const position of ballot) {
  console.log(`  ${position.title}`);
  for (const candidate of [...position.candidates].sort((a, b) => b.voteCount - a.voteCount)) {
    console.log(`    ${candidate.voteCount}  ${candidate.name} (${candidate.party})`);
  }
}
console.log(`  turnout: ${state.totalBallots}/${state.registered} students`);

// --- 8. The year turns over ---------------------------------------------------

step("Graduating students and starting next year's election");

const GRADUATING = ["CS2021001", "EE2021002"];
const { changed } = await setEnrolmentStatus(university.id, GRADUATING, "graduated");
assert.equal(changed, GRADUATING.length);
console.log(`  ${changed} students marked as graduated`);

// Their ballot from this year is untouched and still verifiable.
const graduateReceipt = receipts.get("CS2021001")!;
const stillThere = await lookupReceipt(election.address, graduateReceipt.receiptId);
assert.equal(stillThere.found, true);
assert.deepEqual(stillThere.lines, graduateReceipt.lines);
console.log("  ✓ a graduate's past ballot is still recorded and still verifiable");

// Next year's election is a brand new contract with a brand new roll.
const nextYear = await createElection(university, "Students' Union 2027");
assert.ok(nextYear.ok, "next year's election should deploy");
const next = nextYear.election;

await addPosition(next.address, key, "President");
await addCandidate(next.address, key, PRESIDENT, "Katherine Johnson", "Orbit Party");
await openRegistration(next.address, key);

const nextRoll = await pendingForElection(university.id, next.id);
const nextRollIds = nextRoll.map((student) => student.studentId);
for (const graduate of GRADUATING) {
  assert.ok(
    !nextRollIds.includes(graduate),
    `${graduate} has graduated and must not be on next year's roll`,
  );
}
console.log(`  ✓ graduates are excluded; next roll is ${nextRollIds.join(", ")}`);

await registerOnChain(
  next.address,
  key,
  nextRoll.map((student) => voterHash(university.id, student.studentId)),
);
await markRolledInto(university.id, next.id, nextRollIds);
await openVoting(next.address, key);

await assert.rejects(
  submitBallot(next.address, voterHash(university.id, "CS2021001"), newReceiptId(), [
    { positionId: PRESIDENT, candidateId: 0 },
  ]),
  /NotOnRoll/,
  "a graduate must not be able to vote in a later election",
);
console.log("  ✓ a graduate is refused by next year's contract");

await submitBallot(next.address, voterHash(university.id, "ME2021005"), newReceiptId(), [
  { positionId: PRESIDENT, candidateId: 0 },
]);
const nextState = await getElectionState(next.address);
assert.equal(nextState.totalBallots, 1);
console.log("  ✓ a still-enrolled student votes normally");

console.log("\nAll checks passed. Sign in to explore:");
console.log(`  University : committee@riverside.edu / ${ADMIN_PASSWORD}`);
console.log(`  Student    : any of ${ROSTER.map((r) => r.studentId).join(", ")} / ${PASSWORD}`);
console.log(`  Public page: /en/u/${university.slug} (or /fr/…)`);

await prisma.$disconnect();
