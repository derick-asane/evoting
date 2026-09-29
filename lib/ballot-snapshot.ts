import "server-only";

import type { Hex } from "viem";

import { readElection } from "./chain";
import { prisma } from "./db";

/**
 * A redeployable description of an election's ballot.
 *
 * The contract is always the authority for anything shown to a voter. This
 * exists for one purpose: a local chain keeps its state in memory, so
 * restarting it destroys every contract while Postgres still holds the
 * accounts, rosters and photos. Keeping the ballot here means the chain can be
 * rebuilt without anyone retyping it.
 *
 * Votes are deliberately not mirrored. They cannot be restored, and a
 * "restored" tally nobody actually cast would be a lie.
 */
export type BallotSnapshot = {
  /** Last known phase, so a rebuild can return the election to where it was. */
  phase: number;
  positions: Array<{
    title: string;
    candidates: Array<{ name: string; party: string }>;
  }>;
};

/**
 * Records the ballot as it now stands on-chain, found by contract address.
 *
 * Keyed by address rather than election id so this can live inside the write
 * functions themselves. Every caller — a Server Action, a seed script, a
 * one-off repair — keeps the snapshot current without having to remember to,
 * which is what went wrong when only the actions maintained it.
 *
 * Reads the chain directly rather than through lib/election.ts, because that
 * module calls this one and the cycle would not resolve.
 */
export async function snapshotBallot(address: Hex): Promise<void> {
  const election = await prisma.election.findFirst({
    where: { address },
    select: { id: true },
  });
  // Deployed but not yet recorded — createElection snapshots it on insert.
  if (!election) return;

  const contract = readElection(address);

  try {
    const [positions, snapshotState] = await Promise.all([
      contract.read.getPositions(),
      contract.read.snapshot(),
    ]);

    const withCandidates = await Promise.all(
      positions.map(async (position, index) => ({
        title: position.title,
        candidates: (await contract.read.getCandidates([BigInt(index)])).map(
          (candidate) => ({ name: candidate.name, party: candidate.party }),
        ),
      })),
    );

    const snapshot: BallotSnapshot = {
      phase: Number(snapshotState[1]),
      positions: withCandidates,
    };

    await prisma.election.update({
      where: { id: election.id },
      data: { ballotSnapshot: snapshot },
    });
  } catch (error) {
    // Never fail the election operation this is describing. A stale snapshot
    // costs a rebuild; a failed phase change costs the election.
    console.error("Could not snapshot ballot", address, error);
  }
}

export function readBallotSnapshot(value: unknown): BallotSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<BallotSnapshot>;
  if (!Array.isArray(candidate.positions)) return null;
  return {
    phase: typeof candidate.phase === "number" ? candidate.phase : 0,
    positions: candidate.positions,
  };
}
