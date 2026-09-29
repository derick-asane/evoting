import "server-only";

import type { Hex } from "viem";

import { snapshotBallot } from "./ballot-snapshot";
import {
  electionAbi,
  publicClient,
  readElection,
  relayElection,
  writeElection,
} from "./chain";
import {
  Phase,
  type BallotLine,
  type Candidate,
  type ElectionState,
  type Position,
} from "./election-model";

// Re-exported so server modules can keep importing everything from one place.
export {
  Phase,
  PHASE_KEY,
  PHASE_DESCRIPTION_KEY,
  type BallotLine,
  type Candidate,
  type ElectionState,
  type Position,
} from "./election-model";

export async function getElectionState(address: Hex): Promise<ElectionState> {
  const [title, phase, positionCount, registered, totalBallots, totalVotes] =
    await readElection(address).read.snapshot();

  return {
    title,
    phase: Number(phase) as Phase,
    positionCount: Number(positionCount),
    registered: Number(registered),
    totalBallots: Number(totalBallots),
    totalVotes: Number(totalVotes),
  };
}

/**
 * Every position with its candidates.
 *
 * One call per position after the initial list — fine for the handful of posts
 * a union elects, and it keeps the contract's storage layout simple.
 */
export async function getBallot(address: Hex): Promise<Position[]> {
  const contract = readElection(address);
  const positions = await contract.read.getPositions();

  return Promise.all(
    positions.map(async (position, id) => {
      const candidates = await contract.read.getCandidates([BigInt(id)]);
      return {
        id,
        title: position.title,
        ballotsCast: Number(position.ballotsCast),
        candidates: candidates.map((candidate, candidateId) => ({
          id: candidateId,
          name: candidate.name,
          party: candidate.party,
          voteCount: Number(candidate.voteCount),
        })),
      } satisfies Position;
    }),
  );
}

export function isOnRoll(address: Hex, handle: Hex): Promise<boolean> {
  return readElection(address).read.isRegistered([handle]);
}

/** Positions this voter has not yet used their vote for. */
export async function outstandingPositions(
  address: Hex,
  handle: Hex,
): Promise<number[]> {
  const remaining = await readElection(address).read.outstandingPositions([handle]);
  return remaining.map(Number);
}

export function hasVotedFor(
  address: Hex,
  handle: Hex,
  positionId: number,
): Promise<boolean> {
  return readElection(address).read.hasVoted([handle, BigInt(positionId)]);
}

/** What a ballot said, for whoever holds its receipt. */
export async function lookupReceipt(
  address: Hex,
  receiptId: Hex,
): Promise<{ found: boolean; lines: BallotLine[] }> {
  const [found, positionIds, candidateIds] = await readElection(
    address,
  ).read.verifyBallot([receiptId]);

  return {
    found,
    lines: positionIds.map((positionId, index) => ({
      positionId: Number(positionId),
      candidateId: Number(candidateIds[index]),
    })),
  };
}

// --- Writes -----------------------------------------------------------------

async function confirm(hash: Hex): Promise<Hex> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("The transaction was rejected by the chain.");
  }
  return hash;
}

/**
 * Submits one ballot covering one or more positions, and waits for it to be
 * mined, so the caller can show the student a transaction that is already
 * final. The contract records every line or none.
 */
export async function submitBallot(
  address: Hex,
  handle: Hex,
  receiptId: Hex,
  lines: BallotLine[],
): Promise<{ txHash: Hex; blockNumber: number }> {
  const txHash = await relayElection(address).write.castBallot([
    handle,
    receiptId,
    lines.map((line) => BigInt(line.positionId)),
    lines.map((line) => BigInt(line.candidateId)),
  ]);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error("The ballot transaction was rejected by the chain.");
  }
  return { txHash, blockNumber: Number(receipt.blockNumber) };
}

export async function addPosition(address: Hex, key: Hex, title: string) {
  const hash = await confirm(
    await writeElection(address, key).write.addPosition([title]),
  );
  await snapshotBallot(address);
  return hash;
}

export async function addCandidate(
  address: Hex,
  key: Hex,
  positionId: number,
  name: string,
  party: string,
) {
  const hash = await confirm(
    await writeElection(address, key).write.addCandidate([
      BigInt(positionId),
      name,
      party,
    ]),
  );
  await snapshotBallot(address);
  return hash;
}

export async function registerOnChain(address: Hex, key: Hex, handles: Hex[]) {
  return confirm(await writeElection(address, key).write.registerVoters([handles]));
}

export async function openRegistration(address: Hex, key: Hex) {
  const hash = await confirm(
    await writeElection(address, key).write.openRegistration(),
  );
  await snapshotBallot(address);
  return hash;
}

/**
 * Opens the polls.
 *
 * Refuses an empty roll. Sealing happens here and cannot be undone, so an
 * election opened with nobody registered can never accept a ballot — the guard
 * belongs at this level rather than in one caller, so scripts and actions are
 * both covered.
 */
export async function openVoting(address: Hex, key: Hex) {
  const registered = await readElection(address).read.registeredCount();
  if (registered === 0n) {
    throw new Error(
      "Refusing to open voting: the on-chain roll is empty, and opening the " +
        "polls seals it permanently. Register at least one voter first.",
    );
  }
  const hash = await confirm(await writeElection(address, key).write.openVoting());
  await snapshotBallot(address);
  return hash;
}

export async function closeVoting(address: Hex, key: Hex) {
  const hash = await confirm(await writeElection(address, key).write.closeVoting());
  await snapshotBallot(address);
  return hash;
}

// --- Audit ------------------------------------------------------------------

export type BallotRecord = {
  receiptId: Hex;
  positionId: number;
  candidateId: number;
  timestamp: number;
  blockNumber: number;
  txHash: Hex;
};

/**
 * Every ballot line in the box, newest first, straight from the chain logs.
 *
 * This is the whole audit trail: anyone can replay it and arrive at the same
 * tallies the contract reports. No entry names a student.
 */
export async function getBallotBox(
  address: Hex,
  fromBlock: bigint = 0n,
): Promise<BallotRecord[]> {
  const logs = await publicClient.getContractEvents({
    address,
    abi: electionAbi,
    eventName: "BallotCast",
    fromBlock,
    strict: true,
  });

  return logs
    .map((log) => ({
      receiptId: log.args.receiptId,
      positionId: Number(log.args.positionId),
      candidateId: Number(log.args.candidateId),
      timestamp: Number(log.args.timestamp),
      blockNumber: Number(log.blockNumber),
      txHash: log.transactionHash,
    }))
    .reverse();
}
