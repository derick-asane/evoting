import "server-only";

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getContract,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { electionAbi, electionBytecode } from "./contract/election";
import { env } from "./env";

export { electionAbi, electionBytecode };

const chain = defineChain({
  id: env.chainId,
  name: "Election Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [env.rpcUrl] } },
});

/** Reads. Used by every public page. */
export const publicClient = createPublicClient({
  chain,
  transport: http(env.rpcUrl),
});

export function walletFor(key: Hex) {
  return createWalletClient({
    account: privateKeyToAccount(key),
    chain,
    transport: http(env.rpcUrl),
  });
}

/** Read-only handle on one election contract. */
export function readElection(address: Hex) {
  return getContract({ address, abi: electionAbi, client: publicClient });
}

/** Handle that signs with a specific university's wallet. */
export function writeElection(address: Hex, key: Hex) {
  return getContract({
    address,
    abi: electionAbi,
    client: { public: publicClient, wallet: walletFor(key) },
  });
}

/** Handle that signs ballots with the shared platform relayer. */
export function relayElection(address: Hex) {
  return writeElection(address, env.relayerKey);
}

export function relayerAddress(): Hex {
  return privateKeyToAccount(env.relayerKey).address;
}

/**
 * Tops up a university wallet so it can pay for its own election
 * transactions. Without this a newly generated wallet holds no gas and every
 * administrative call would fail.
 */
export async function fundWallet(to: Hex): Promise<void> {
  const balance = await publicClient.getBalance({ address: to });
  if (balance >= env.universityFunding) return;

  const funder = walletFor(env.funderKey);
  const hash = await funder.sendTransaction({
    to,
    value: env.universityFunding - balance,
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

/** Deploys a fresh Election contract, signed by the university's own wallet. */
export async function deployElection(
  key: Hex,
  title: string,
): Promise<{ address: Hex; blockNumber: number }> {
  const wallet = walletFor(key);

  const hash = await wallet.deployContract({
    abi: electionAbi,
    bytecode: electionBytecode,
    args: [title, relayerAddress()],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error("The election contract could not be deployed.");
  }

  return {
    address: receipt.contractAddress,
    blockNumber: Number(receipt.blockNumber),
  };
}
