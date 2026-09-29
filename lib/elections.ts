import "server-only";

import type { Hex } from "viem";

import { deployElection } from "./chain";
import { snapshotBallot } from "./ballot-snapshot";
import { prisma } from "./db";
import type { Election } from "./generated/prisma/client";
import { walletKeyOf, type University } from "./universities";

/**
 * An election, as this database records it.
 *
 * `address` is typed as a hex string on the way out because the contract calls
 * need it that way; Postgres stores it as plain text.
 */
export type ElectionRecord = Omit<Election, "address"> & { address: Hex };

function toRecord(election: Election): ElectionRecord {
  return { ...election, address: election.address as Hex };
}

export async function listElections(
  universityId: string,
): Promise<ElectionRecord[]> {
  const elections = await prisma.election.findMany({
    where: { universityId },
    orderBy: { createdAt: "desc" },
  });
  return elections.map(toRecord);
}

export async function findElection(id: string): Promise<ElectionRecord | null> {
  const election = await prisma.election.findUnique({ where: { id } });
  return election ? toRecord(election) : null;
}

/** The election a university is currently running, if any. */
export async function currentElection(
  universityId: string,
): Promise<ElectionRecord | null> {
  const election = await prisma.election.findFirst({
    where: { universityId },
    orderBy: { createdAt: "desc" },
  });
  return election ? toRecord(election) : null;
}

/** Why an election could not be created. Translated by the caller. */
export type CreateElectionFailure = "titleTooShort" | "deployFailed";

/**
 * Deploys a new election contract for this university, signed by their own
 * wallet, then records where it lives.
 */
export async function createElection(
  university: University,
  title: string,
): Promise<
  { ok: true; election: ElectionRecord } | { ok: false; code: CreateElectionFailure }
> {
  const trimmed = title.trim();
  if (trimmed.length < 3) return { ok: false, code: "titleTooShort" };

  let deployed: Awaited<ReturnType<typeof deployElection>>;
  try {
    deployed = await deployElection(walletKeyOf(university), trimmed);
  } catch (error) {
    console.error("Election deployment failed", error);
    return { ok: false, code: "deployFailed" };
  }

  // The contract is already on-chain by this point, so the row is written
  // after the deployment rather than inside a transaction with it.
  const election = await prisma.election.create({
    data: {
      universityId: university.id,
      title: trimmed,
      address: deployed.address,
      deploymentBlock: deployed.blockNumber,
    },
  });

  await snapshotBallot(deployed.address);

  return { ok: true, election: toRecord(election) };
}

/**
 * Turns supervised voting on or off.
 *
 * Off-chain on purpose. Whether a committee member looked at a student card is
 * a fact about a desk in a room, not about the ballot, and the contract has no
 * way to verify it — putting it on chain would give it an authority it has not
 * earned. What the chain records is unchanged either way: a voter hash checked
 * in, and a ballot cast.
 */
export async function setSupervised(
  electionId: string,
  supervised: boolean,
): Promise<void> {
  await prisma.election.update({
    where: { id: electionId },
    data: { supervised },
  });
}

export { readBallotSnapshot, type BallotSnapshot } from "./ballot-snapshot";
