/**
 * Rebuilds every election on a fresh local chain.
 *
 *   npm run chain:rebuild
 *
 * A local Hardhat node keeps its state in memory, so restarting it destroys
 * every deployed contract while Postgres still holds the accounts, rosters,
 * union team and photos. Without this, recovering means retyping every ballot
 * by hand — which, on an offline setup with no hosted chain to fall back on,
 * is the difference between a five-second fix and a lost afternoon.
 *
 * What comes back: university wallets (re-funded), every election contract,
 * its positions and candidates, the sealed voter roll, and the phase it was
 * in.
 *
 * What does not: the votes. They lived only on the chain that is gone, and a
 * "restored" tally nobody actually cast would be a lie. Elections that had
 * already closed are rebuilt as closed, with empty tallies and a warning.
 */
import { publicClient, fundWallet } from "../lib/chain";
import { prisma } from "../lib/db";
import {
  addCandidate,
  addPosition,
  closeVoting,
  openRegistration,
  openVoting,
  registerOnChain,
  Phase,
} from "../lib/election";
import { readBallotSnapshot } from "../lib/ballot-snapshot";
import { deployElection } from "../lib/chain";
import { voterHash } from "../lib/identity";
import { walletKeyOf } from "../lib/universities";

const DRY_RUN = process.argv.includes("--dry-run");

function step(message: string) {
  console.log(`\n▸ ${message}`);
}

// --- Is a rebuild even needed? ----------------------------------------------

try {
  await publicClient.getBlockNumber();
} catch {
  console.error(
    "The chain at the configured RPC_URL is not answering.\n" +
      "Start it first:  npm --prefix blockchain run node",
  );
  process.exit(1);
}

const universities = await prisma.university.findMany({
  include: { elections: { orderBy: { createdAt: "asc" } } },
});

if (universities.length === 0) {
  console.log("No universities in the database. Nothing to rebuild.");
  await prisma.$disconnect();
  process.exit(0);
}

/** A contract is alive if its address still holds code. */
async function isDeployed(address: string): Promise<boolean> {
  const code = await publicClient.getCode({ address: address as `0x${string}` });
  return Boolean(code && code !== "0x");
}

step("Checking which contracts survived");
let alive = 0;
let dead = 0;
for (const university of universities) {
  for (const election of university.elections) {
    if (await isDeployed(election.address)) alive += 1;
    else dead += 1;
  }
}
console.log(`  ${alive} still deployed, ${dead} missing`);

if (dead === 0) {
  console.log("\nEvery contract is present. Nothing to do.");
  await prisma.$disconnect();
  process.exit(0);
}

if (DRY_RUN) {
  console.log(`\n--dry-run: would rebuild ${dead} election(s). No changes made.`);
  await prisma.$disconnect();
  process.exit(0);
}

// --- Rebuild -----------------------------------------------------------------

let rebuilt = 0;
let skipped = 0;
let votesLost = 0;

for (const university of universities) {
  step(`${university.name}`);

  // The wallet was funded on the chain that is gone.
  await fundWallet(university.walletAddress as `0x${string}`);
  const balance = await publicClient.getBalance({
    address: university.walletAddress as `0x${string}`,
  });
  console.log(`  wallet funded (${balance} wei)`);

  const key = walletKeyOf(university);

  for (const election of university.elections) {
    if (await isDeployed(election.address)) {
      console.log(`  · "${election.title}" still live, left alone`);
      continue;
    }

    const snapshot = readBallotSnapshot(election.ballotSnapshot);
    if (!snapshot) {
      console.log(
        `  ! "${election.title}" has no ballot snapshot — cannot rebuild it.\n` +
          `    (It predates snapshotting. Delete it or recreate it by hand.)`,
      );
      skipped += 1;
      continue;
    }

    const deployed = await deployElection(key, election.title);

    for (const [index, position] of snapshot.positions.entries()) {
      await addPosition(deployed.address, key, position.title);
      for (const candidate of position.candidates) {
        await addCandidate(
          deployed.address,
          key,
          index,
          candidate.name,
          candidate.party,
        );
      }
    }

    // Point the database at the new contract before advancing phases, so a
    // failure part-way leaves a row that matches something real.
    await prisma.election.update({
      where: { id: election.id },
      data: {
        address: deployed.address,
        deploymentBlock: deployed.blockNumber,
      },
    });

    // Restore how far the election had progressed.
    if (snapshot.phase >= Phase.Registration && snapshot.positions.length > 0) {
      await openRegistration(deployed.address, key);
    }

    if (snapshot.phase >= Phase.Voting) {
      const roll = await prisma.rollEntry.findMany({
        where: { electionId: election.id },
        include: { student: { select: { studentId: true } } },
      });

      if (roll.length > 0) {
        await registerOnChain(
          deployed.address,
          key,
          roll.map((entry) => voterHash(university.id, entry.student.studentId)),
        );
        await openVoting(deployed.address, key);
      } else {
        console.log(
          `    (no roll recorded, so "${election.title}" stops at registration)`,
        );
      }
    }

    if (snapshot.phase >= Phase.Ended && snapshot.phase >= Phase.Voting) {
      await closeVoting(deployed.address, key);
      votesLost += 1;
    }

    console.log(
      `  ✓ "${election.title}" → ${deployed.address}` +
        `  (${snapshot.positions.length} position(s), phase ${snapshot.phase})`,
    );
    rebuilt += 1;
  }
}

// --- Report -------------------------------------------------------------------

console.log(`\nRebuilt ${rebuilt} election(s).`);
if (skipped > 0) {
  console.log(`${skipped} could not be rebuilt (no snapshot).`);
}
console.log(
  "\nAccounts, students, union team and photos were untouched — they live in\n" +
    "Postgres, not on the chain.",
);
console.log(
  "Ballots already cast are GONE. They existed only on the chain that was\n" +
    "restarted, and nothing can bring them back. Every rebuilt election starts\n" +
    "with an empty tally.",
);

await prisma.$disconnect();
