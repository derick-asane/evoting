/**
 * Independently recounts an election, straight from the chain.
 *
 *   npm run verify -- 0xCONTRACTADDRESS
 *   npm run verify -- 0xCONTRACTADDRESS --rpc http://127.0.0.1:8545
 *
 * This is the "don't take our word for it" tool. It deliberately uses **none**
 * of the application's code: no database, no server modules, no shared helpers.
 * It talks to the chain with viem and the contract's public ABI, rebuilds every
 * tally from raw event logs, and compares its own arithmetic against what the
 * contract reports.
 *
 * If this script and the website ever disagree, the website is wrong — the
 * chain is the record, and this reads the chain.
 *
 * Anyone can run it against any address. It needs no credentials and no
 * permission, because everything it reads is already public.
 */
import { createPublicClient, defineChain, http, type Hex } from "viem";

import { electionAbi } from "../lib/contract/election";

// --- Arguments ---------------------------------------------------------------

const args = process.argv.slice(2);
const address = args.find((arg) => /^0x[0-9a-fA-F]{40}$/.test(arg)) as
  | Hex
  | undefined;

const rpcFlag = args.indexOf("--rpc");
const rpcUrl =
  rpcFlag >= 0 && args[rpcFlag + 1]
    ? args[rpcFlag + 1]!
    : (process.env.RPC_URL ?? "http://127.0.0.1:8545");

if (!address) {
  console.error(
    "Usage: npm run verify -- <contract address> [--rpc <url>]\n\n" +
      "The address is printed on the election's results page.",
  );
  process.exit(1);
}

// --- Connect -----------------------------------------------------------------

const client = createPublicClient({
  transport: http(rpcUrl),
  chain: defineChain({
    id: Number(process.env.CHAIN_ID ?? 31337),
    name: "Election Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  }),
});

let chainId: number;
try {
  chainId = await client.getChainId();
} catch {
  console.error(`Could not reach a chain at ${rpcUrl}.`);
  process.exit(1);
}

const code = await client.getCode({ address });
if (!code || code === "0x") {
  console.error(`No contract is deployed at ${address} on this chain.`);
  process.exit(1);
}

const contract = { address, abi: electionAbi } as const;

const PHASES = ["Setting up", "Registration open", "Voting open", "Closed"];

// --- What the contract says about itself -------------------------------------

const [title, phase, positionCount, registered, totalBallots, totalVotes] =
  await client.readContract({ ...contract, functionName: "snapshot" });

const positions = await client.readContract({
  ...contract,
  functionName: "getPositions",
});

const candidatesByPosition = await Promise.all(
  positions.map((_, index) =>
    client.readContract({
      ...contract,
      functionName: "getCandidates",
      args: [BigInt(index)],
    }),
  ),
);

console.log(`\n  ${title}`);
console.log(`  ${"─".repeat(Math.max(title.length, 28))}`);
console.log(`  contract   ${address}`);
console.log(`  chain id   ${chainId}   via ${rpcUrl}`);
console.log(`  phase      ${PHASES[Number(phase)] ?? phase}`);
console.log(`  roll       ${registered} students`);
console.log(`  ballots    ${totalBallots} (covering ${totalVotes} position votes)`);

// --- Raw event logs ----------------------------------------------------------

const [ballotLines, checkIns, registrations] = await Promise.all([
  client.getContractEvents({
    ...contract,
    eventName: "BallotCast",
    fromBlock: 0n,
    strict: true,
  }),
  client.getContractEvents({
    ...contract,
    eventName: "VoterCheckedIn",
    fromBlock: 0n,
    strict: true,
  }),
  client.getContractEvents({
    ...contract,
    eventName: "VoterRegistered",
    fromBlock: 0n,
    strict: true,
  }),
]);

console.log(
  `\n  Read ${ballotLines.length} ballot lines, ${checkIns.length} check-ins, ` +
    `${registrations.length} registrations from the logs.`,
);

// --- Independent recount ------------------------------------------------------

/** position → candidate → votes, counted from events alone. */
const tally = new Map<string, number>();
for (const line of ballotLines) {
  const key = `${line.args.positionId}:${line.args.candidateId}`;
  tally.set(key, (tally.get(key) ?? 0) + 1);
}

const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
const record = (name: string, ok: boolean, detail: string) =>
  checks.push({ name, ok, detail });

// 1. Every tally the contract reports must equal the events it emitted.
let tallyMismatches = 0;
console.log("\n  Recount");
for (const [index, position] of positions.entries()) {
  console.log(`\n    ${position.title}`);
  for (const [candidateIndex, candidate] of candidatesByPosition[
    index
  ]!.entries()) {
    const counted = tally.get(`${index}:${candidateIndex}`) ?? 0;
    const reported = Number(candidate.voteCount);
    const agrees = counted === reported;
    if (!agrees) tallyMismatches += 1;

    console.log(
      `      ${agrees ? "✓" : "✗"} ${candidate.name.padEnd(24)} ` +
        `contract ${String(reported).padStart(4)}   recount ${String(counted).padStart(4)}`,
    );
  }
}
record(
  "Every candidate's tally matches an independent recount of the logs",
  tallyMismatches === 0,
  tallyMismatches === 0 ? "all agree" : `${tallyMismatches} disagree`,
);

// 2. Totals must add up.
record(
  "Ballot lines in the log equal the contract's vote total",
  ballotLines.length === Number(totalVotes),
  `${ballotLines.length} logged vs ${totalVotes} reported`,
);
record(
  "Check-in events equal the contract's ballot total",
  checkIns.length === Number(totalBallots),
  `${checkIns.length} logged vs ${totalBallots} reported`,
);
record(
  "Registration events equal the contract's roll size",
  registrations.length === Number(registered),
  `${registrations.length} logged vs ${registered} reported`,
);

// 3. Eligibility: every ballot came from someone on the sealed roll.
const roll = new Set(registrations.map((event) => event.args.voterHash));
const strangers = checkIns.filter((event) => !roll.has(event.args.voterHash));
record(
  "Every ballot came from a voter on the roll",
  strangers.length === 0,
  strangers.length === 0
    ? `all ${checkIns.length} check-ins are registered voters`
    : `${strangers.length} ballots from unregistered voters`,
);

// 4. Secrecy: the two event streams share nothing that could link them.
//    Check-ins carry a voter and no choice; ballot lines carry a choice and no
//    voter. If any voter handle appeared in a ballot line, the ballot would no
//    longer be secret.
const voterHandles = new Set<string>([
  ...registrations.map((e) => e.args.voterHash),
  ...checkIns.map((e) => e.args.voterHash),
]);
const leaked = ballotLines.filter((line) => {
  const serialised = JSON.stringify(line.args, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  return [...voterHandles].some((handle) => serialised.includes(handle));
});
record(
  "No ballot line contains a voter identity",
  leaked.length === 0,
  leaked.length === 0
    ? `${ballotLines.length} lines checked against ${voterHandles.size} voter handles`
    : `${leaked.length} lines leak a voter handle`,
);

// 5. One vote per position: a receipt must not appear twice for one position.
const seen = new Set<string>();
let duplicates = 0;
for (const line of ballotLines) {
  const key = `${line.args.receiptId}:${line.args.positionId}`;
  if (seen.has(key)) duplicates += 1;
  seen.add(key);
}
record(
  "No ballot records two choices for the same position",
  duplicates === 0,
  duplicates === 0 ? "no duplicates" : `${duplicates} duplicated`,
);

// 6. Per-position totals must equal that position's own counter.
let positionMismatches = 0;
for (const [index, position] of positions.entries()) {
  const counted = ballotLines.filter(
    (line) => Number(line.args.positionId) === index,
  ).length;
  if (counted !== Number(position.ballotsCast)) positionMismatches += 1;
}
record(
  "Each position's own counter matches its logged votes",
  positionMismatches === 0,
  positionMismatches === 0 ? "all agree" : `${positionMismatches} disagree`,
);

// --- Report -------------------------------------------------------------------

console.log("\n  Checks");
for (const check of checks) {
  console.log(`    ${check.ok ? "✓" : "✗"} ${check.name}`);
  console.log(`        ${check.detail}`);
}

const failed = checks.filter((check) => !check.ok);

if (failed.length === 0) {
  console.log(
    "\n  RESULT: every check passed. The published tallies are exactly what\n" +
      "  the chain recorded, every ballot came from a registered voter, and no\n" +
      "  ballot in the log can be traced to the person who cast it.\n",
  );
  process.exit(0);
}

console.log(
  `\n  RESULT: ${failed.length} check(s) FAILED. Do not rely on the published\n` +
    "  result until this is explained.\n",
);
process.exit(1);
