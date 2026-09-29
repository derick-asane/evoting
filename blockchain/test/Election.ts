import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { keccak256, toHex } from "viem";

const { viem, networkHelpers } = await network.create();

const PHASE = { Setup: 0, Registration: 1, Voting: 2, Ended: 3 } as const;

/** Positions, in the order the fixtures add them. */
const PRESIDENT = 0n;
const SECRETARY = 1n;

const voterHash = (id: string) => keccak256(toHex(`voter:${id}`));
const receipt = (id: string) => keccak256(toHex(`receipt:${id}`));

/** Deployed, with the relayer set to a dedicated account (not the admin). */
async function deployElection() {
  const [admin, relayer, outsider] = await viem.getWalletClients();
  const election = await viem.deployContract("Election", [
    "Students Union 2026",
    relayer.account.address,
  ]);
  return { election, admin, relayer, outsider };
}

/** Two positions, each with candidates, roll open. */
async function deployWithBallot() {
  const ctx = await networkHelpers.loadFixture(deployElection);
  await ctx.election.write.addPosition(["President"]);
  await ctx.election.write.addPosition(["Secretary General"]);

  await ctx.election.write.addCandidate([PRESIDENT, "Ada Lovelace", "Analytical"]);
  await ctx.election.write.addCandidate([PRESIDENT, "Alan Turing", "Enigma"]);
  await ctx.election.write.addCandidate([SECRETARY, "Grace Hopper", "Compiler"]);
  await ctx.election.write.addCandidate([SECRETARY, "Katherine Johnson", "Orbit"]);

  await ctx.election.write.openRegistration();
  return ctx;
}

/** Roll sealed with three voters, polls open. */
async function deployVotingOpen() {
  const ctx = await networkHelpers.loadFixture(deployWithBallot);
  await ctx.election.write.registerVoters([
    [voterHash("alice"), voterHash("bob"), voterHash("carol")],
  ]);
  await ctx.election.write.openVoting();
  return ctx;
}

describe("Election", () => {
  describe("deployment", () => {
    it("records the admin, title, relayer and opening phase", async () => {
      const { election, admin, relayer } =
        await networkHelpers.loadFixture(deployElection);

      assert.equal(
        (await election.read.admin()).toLowerCase(),
        admin.account.address.toLowerCase(),
      );
      assert.equal(
        (await election.read.relayer()).toLowerCase(),
        relayer.account.address.toLowerCase(),
      );
      assert.equal(await election.read.title(), "Students Union 2026");
      assert.equal(await election.read.phase(), PHASE.Setup);
      assert.equal(await election.read.totalBallots(), 0n);
    });

    it("refuses an empty title", async () => {
      const [, relayer] = await viem.getWalletClients();
      await assert.rejects(
        viem.deployContract("Election", ["", relayer.account.address]),
        /EmptyValue/,
      );
    });
  });

  describe("building the ballot", () => {
    it("lets only the admin add positions and candidates", async () => {
      const { election, outsider } =
        await networkHelpers.loadFixture(deployElection);

      await viem.assertions.revertWithCustomError(
        election.write.addPosition(["Treasurer"], { account: outsider.account }),
        election,
        "NotAdmin",
      );
      await election.write.addPosition(["Treasurer"]);
      await viem.assertions.revertWithCustomError(
        election.write.addCandidate([0n, "Mallory", "Rogue"], {
          account: outsider.account,
        }),
        election,
        "NotAdmin",
      );
    });

    it("emits PositionAdded and CandidateAdded with sequential ids", async () => {
      const { election } = await networkHelpers.loadFixture(deployElection);

      await viem.assertions.emitWithArgs(
        election.write.addPosition(["President"]),
        election,
        "PositionAdded",
        [0n, "President"],
      );
      await viem.assertions.emitWithArgs(
        election.write.addCandidate([0n, "Ada Lovelace", "Analytical"]),
        election,
        "CandidateAdded",
        [0n, 0n, "Ada Lovelace", "Analytical"],
      );
      await viem.assertions.emitWithArgs(
        election.write.addCandidate([0n, "Alan Turing", "Enigma"]),
        election,
        "CandidateAdded",
        [0n, 1n, "Alan Turing", "Enigma"],
      );
    });

    it("keeps each position's candidates separate", async () => {
      const { election } = await networkHelpers.loadFixture(deployWithBallot);

      assert.equal(await election.read.positionCount(), 2n);
      const forPresident = await election.read.getCandidates([PRESIDENT]);
      const forSecretary = await election.read.getCandidates([SECRETARY]);

      assert.deepEqual(
        forPresident.map((c) => c.name),
        ["Ada Lovelace", "Alan Turing"],
      );
      assert.deepEqual(
        forSecretary.map((c) => c.name),
        ["Grace Hopper", "Katherine Johnson"],
      );
    });

    it("refuses a candidate for a position that does not exist", async () => {
      const { election } = await networkHelpers.loadFixture(deployElection);
      await election.write.addPosition(["President"]);

      await viem.assertions.revertWithCustomError(
        election.write.addCandidate([9n, "Nobody", ""]),
        election,
        "UnknownPosition",
      );
    });

    it("will not open registration with no positions", async () => {
      const { election } = await networkHelpers.loadFixture(deployElection);

      await viem.assertions.revertWithCustomError(
        election.write.openRegistration(),
        election,
        "NoPositions",
      );
    });

    it("will not open registration with a position nobody stands for", async () => {
      const { election } = await networkHelpers.loadFixture(deployElection);
      await election.write.addPosition(["President"]);
      await election.write.addCandidate([0n, "Ada Lovelace", ""]);
      await election.write.addPosition(["Treasurer"]); // left empty

      await viem.assertions.revertWithCustomError(
        election.write.openRegistration(),
        election,
        "NoCandidates",
      );
    });

    it("seals the ballot once registration opens", async () => {
      const { election } = await networkHelpers.loadFixture(deployWithBallot);

      assert.equal(await election.read.phase(), PHASE.Registration);
      await viem.assertions.revertWithCustomError(
        election.write.addPosition(["Late Post"]),
        election,
        "WrongPhase",
      );
      await viem.assertions.revertWithCustomError(
        election.write.addCandidate([PRESIDENT, "Late Entry", ""]),
        election,
        "WrongPhase",
      );
    });
  });

  describe("registration phase", () => {
    it("adds voters to the roll and counts them once each", async () => {
      const { election } = await networkHelpers.loadFixture(deployWithBallot);

      await election.write.registerVoter([voterHash("alice")]);
      assert.equal(await election.read.registeredCount(), 1n);
      assert.equal(await election.read.isRegistered([voterHash("alice")]), true);

      await viem.assertions.revertWithCustomError(
        election.write.registerVoter([voterHash("alice")]),
        election,
        "AlreadyRegistered",
      );
      assert.equal(await election.read.registeredCount(), 1n);
    });

    it("lets only the admin register voters, even in a batch", async () => {
      const { election, outsider } =
        await networkHelpers.loadFixture(deployWithBallot);

      await viem.assertions.revertWithCustomError(
        election.write.registerVoters([[voterHash("mallory")]], {
          account: outsider.account,
        }),
        election,
        "NotAdmin",
      );
    });

    it("seals the roll once voting opens", async () => {
      const { election } = await networkHelpers.loadFixture(deployVotingOpen);

      assert.equal(await election.read.phase(), PHASE.Voting);
      await viem.assertions.revertWithCustomError(
        election.write.registerVoter([voterHash("dave")]),
        election,
        "WrongPhase",
      );
    });
  });

  describe("casting a ballot across positions", () => {
    it("records every line of the ballot in one transaction", async () => {
      const { election, relayer } =
        await networkHelpers.loadFixture(deployVotingOpen);

      await election.write.castBallot(
        [voterHash("alice"), receipt("alice"), [PRESIDENT, SECRETARY], [0n, 1n]],
        { account: relayer.account },
      );

      assert.equal(await election.read.totalBallots(), 1n);
      assert.equal(await election.read.totalVotes(), 2n);

      const president = await election.read.getCandidates([PRESIDENT]);
      const secretary = await election.read.getCandidates([SECRETARY]);
      assert.equal(president[0].voteCount, 1n);
      assert.equal(president[1].voteCount, 0n);
      assert.equal(secretary[0].voteCount, 0n);
      assert.equal(secretary[1].voteCount, 1n);
    });

    it("treats a skipped position as an abstention, leaving that vote unspent", async () => {
      const { election, relayer } =
        await networkHelpers.loadFixture(deployVotingOpen);

      await election.write.castBallot(
        [voterHash("alice"), receipt("alice"), [PRESIDENT], [0n]],
        { account: relayer.account },
      );

      assert.equal(await election.read.hasVoted([voterHash("alice"), PRESIDENT]), true);
      assert.equal(await election.read.hasVoted([voterHash("alice"), SECRETARY]), false);

      const remaining = await election.read.outstandingPositions([
        voterHash("alice"),
      ]);
      assert.deepEqual(remaining, [SECRETARY]);

      // The unspent vote can still be used later, in a separate ballot.
      await election.write.castBallot(
        [voterHash("alice"), receipt("alice-2"), [SECRETARY], [0n]],
        { account: relayer.account },
      );
      assert.equal(await election.read.hasVoted([voterHash("alice"), SECRETARY]), true);
      assert.equal(await election.read.totalVotes(), 2n);
    });

    it("refuses a second vote for a position already used", async () => {
      const { election, relayer } =
        await networkHelpers.loadFixture(deployVotingOpen);

      await election.write.castBallot(
        [voterHash("alice"), receipt("a1"), [PRESIDENT, SECRETARY], [0n, 0n]],
        { account: relayer.account },
      );
      await viem.assertions.revertWithCustomError(
        election.write.castBallot(
          [voterHash("alice"), receipt("a2"), [PRESIDENT], [1n]],
          { account: relayer.account },
        ),
        election,
        "AlreadyVoted",
      );
      assert.equal(await election.read.totalVotes(), 2n);
    });

    it("refuses a ballot listing the same position twice", async () => {
      // The same one-vote-per-position guard covers this: the flag is set on
      // the first pass through the loop, so the repeat is AlreadyVoted.
      const { election, relayer } =
        await networkHelpers.loadFixture(deployVotingOpen);

      await viem.assertions.revertWithCustomError(
        election.write.castBallot(
          [voterHash("alice"), receipt("dup"), [PRESIDENT, PRESIDENT], [0n, 1n]],
          { account: relayer.account },
        ),
        election,
        "AlreadyVoted",
      );
      assert.equal(await election.read.totalBallots(), 0n);
    });

    it("records nothing at all when one line of the ballot is invalid", async () => {
      const { election, relayer } =
        await networkHelpers.loadFixture(deployVotingOpen);

      // Valid President choice, nonsense Secretary choice.
      await viem.assertions.revertWithCustomError(
        election.write.castBallot(
          [voterHash("alice"), receipt("mixed"), [PRESIDENT, SECRETARY], [0n, 99n]],
          { account: relayer.account },
        ),
        election,
        "UnknownCandidate",
      );

      // The valid half must not have survived the revert.
      assert.equal(await election.read.hasVoted([voterHash("alice"), PRESIDENT]), false);
      assert.equal(await election.read.totalVotes(), 0n);
      const president = await election.read.getCandidates([PRESIDENT]);
      assert.equal(president[0].voteCount, 0n);
    });

    it("rejects mismatched position and candidate lists", async () => {
      const { election, relayer } =
        await networkHelpers.loadFixture(deployVotingOpen);

      await viem.assertions.revertWithCustomError(
        election.write.castBallot(
          [voterHash("alice"), receipt("bad"), [PRESIDENT, SECRETARY], [0n]],
          { account: relayer.account },
        ),
        election,
        "LengthMismatch",
      );
    });

    it("rejects an empty ballot", async () => {
      const { election, relayer } =
        await networkHelpers.loadFixture(deployVotingOpen);

      await viem.assertions.revertWithCustomError(
        election.write.castBallot([voterHash("alice"), receipt("none"), [], []], {
          account: relayer.account,
        }),
        election,
        "EmptyBallot",
      );
    });

    it("refuses a voter who is not on the roll", async () => {
      const { election, relayer } =
        await networkHelpers.loadFixture(deployVotingOpen);

      await viem.assertions.revertWithCustomError(
        election.write.castBallot(
          [voterHash("mallory"), receipt("m"), [PRESIDENT], [0n]],
          { account: relayer.account },
        ),
        election,
        "NotOnRoll",
      );
    });

    it("refuses anyone but the relayer, including the admin", async () => {
      const { election, admin, outsider } =
        await networkHelpers.loadFixture(deployVotingOpen);

      for (const account of [outsider.account, admin.account]) {
        await viem.assertions.revertWithCustomError(
          election.write.castBallot(
            [voterHash("alice"), receipt("x"), [PRESIDENT], [0n]],
            { account },
          ),
          election,
          "NotRelayer",
        );
      }
    });

    it("refuses a receipt id that is already in use", async () => {
      const { election, relayer } =
        await networkHelpers.loadFixture(deployVotingOpen);

      await election.write.castBallot(
        [voterHash("alice"), receipt("shared"), [PRESIDENT], [0n]],
        { account: relayer.account },
      );
      await viem.assertions.revertWithCustomError(
        election.write.castBallot(
          [voterHash("bob"), receipt("shared"), [PRESIDENT], [1n]],
          { account: relayer.account },
        ),
        election,
        "ReceiptInUse",
      );
    });

    it("refuses ballots before the polls open and after they close", async () => {
      const { election, relayer } =
        await networkHelpers.loadFixture(deployWithBallot);

      await election.write.registerVoter([voterHash("alice")]);
      await viem.assertions.revertWithCustomError(
        election.write.castBallot(
          [voterHash("alice"), receipt("early"), [PRESIDENT], [0n]],
          { account: relayer.account },
        ),
        election,
        "WrongPhase",
      );

      await election.write.openVoting();
      await election.write.closeVoting();
      await viem.assertions.revertWithCustomError(
        election.write.castBallot(
          [voterHash("alice"), receipt("late"), [PRESIDENT], [0n]],
          { account: relayer.account },
        ),
        election,
        "WrongPhase",
      );
    });
  });

  describe("ballot secrecy", () => {
    it("emits the check-in and the ballot lines as unlinked events", async () => {
      const { election, relayer } =
        await networkHelpers.loadFixture(deployVotingOpen);

      // The check-in names the voter and how many positions, never the choices.
      await viem.assertions.emitWithArgs(
        election.write.castBallot(
          [voterHash("alice"), receipt("alice"), [PRESIDENT, SECRETARY], [1n, 0n]],
          { account: relayer.account },
        ),
        election,
        "VoterCheckedIn",
        [voterHash("alice"), 2n],
      );

      const publicClient = await viem.getPublicClient();
      const lines = await publicClient.getContractEvents({
        address: election.address,
        abi: election.abi,
        eventName: "BallotCast",
        fromBlock: 0n,
        strict: true,
      });

      assert.equal(lines.length, 2);

      // Nothing in any ballot line points back at the voter.
      const serialised = JSON.stringify(lines, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      );
      assert.ok(!serialised.includes(voterHash("alice")));
    });

    it("reveals every choice on a ballot only to whoever holds the receipt", async () => {
      const { election, relayer } =
        await networkHelpers.loadFixture(deployVotingOpen);

      await election.write.castBallot(
        [voterHash("alice"), receipt("alice"), [PRESIDENT, SECRETARY], [1n, 0n]],
        { account: relayer.account },
      );

      const [found, positionIds, candidateIds] = await election.read.verifyBallot([
        receipt("alice"),
      ]);
      assert.equal(found, true);
      assert.deepEqual(positionIds, [PRESIDENT, SECRETARY]);
      assert.deepEqual(candidateIds, [1n, 0n]);

      const [missing] = await election.read.verifyBallot([receipt("guess")]);
      assert.equal(missing, false);
    });
  });

  describe("a full election", () => {
    it("tallies each position independently and freezes the result", async () => {
      const { election, relayer } =
        await networkHelpers.loadFixture(deployVotingOpen);

      // alice and bob vote both posts; carol votes for President only.
      await election.write.castBallot(
        [voterHash("alice"), receipt("alice"), [PRESIDENT, SECRETARY], [0n, 1n]],
        { account: relayer.account },
      );
      await election.write.castBallot(
        [voterHash("bob"), receipt("bob"), [PRESIDENT, SECRETARY], [1n, 1n]],
        { account: relayer.account },
      );
      await election.write.castBallot(
        [voterHash("carol"), receipt("carol"), [PRESIDENT], [1n]],
        { account: relayer.account },
      );

      await election.write.closeVoting();

      const [title, phase, positionTotal, registered, ballots, votes] =
        await election.read.snapshot();
      assert.equal(title, "Students Union 2026");
      assert.equal(phase, PHASE.Ended);
      assert.equal(positionTotal, 2n);
      assert.equal(registered, 3n);
      assert.equal(ballots, 3n);
      assert.equal(votes, 5n); // 2 + 2 + 1

      const president = await election.read.getCandidates([PRESIDENT]);
      const secretary = await election.read.getCandidates([SECRETARY]);
      assert.equal(president[0].voteCount, 1n); // Ada
      assert.equal(president[1].voteCount, 2n); // Alan
      assert.equal(secretary[0].voteCount, 0n); // Grace
      assert.equal(secretary[1].voteCount, 2n); // Katherine

      // Each position's tallies account for exactly the ballots cast for it.
      const positions = await election.read.getPositions();
      assert.equal(positions[Number(PRESIDENT)].ballotsCast, 3n);
      assert.equal(positions[Number(SECRETARY)].ballotsCast, 2n);
      assert.equal(
        president.reduce((sum, c) => sum + c.voteCount, 0n),
        positions[Number(PRESIDENT)].ballotsCast,
      );
      assert.equal(
        secretary.reduce((sum, c) => sum + c.voteCount, 0n),
        positions[Number(SECRETARY)].ballotsCast,
      );
    });
  });

  describe("relayer rotation", () => {
    it("hands ballot submission to the new relayer only", async () => {
      const { election, relayer, outsider } =
        await networkHelpers.loadFixture(deployVotingOpen);

      await election.write.setRelayer([outsider.account.address]);

      await viem.assertions.revertWithCustomError(
        election.write.castBallot(
          [voterHash("alice"), receipt("a"), [PRESIDENT], [0n]],
          { account: relayer.account },
        ),
        election,
        "NotRelayer",
      );
      await election.write.castBallot(
        [voterHash("alice"), receipt("a"), [PRESIDENT], [0n]],
        { account: outsider.account },
      );
      assert.equal(await election.read.totalBallots(), 1n);
    });

    it("lets only the admin rotate the relayer", async () => {
      const { election, outsider } =
        await networkHelpers.loadFixture(deployElection);

      await viem.assertions.revertWithCustomError(
        election.write.setRelayer([outsider.account.address], {
          account: outsider.account,
        }),
        election,
        "NotAdmin",
      );
    });
  });
});
