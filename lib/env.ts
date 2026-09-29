import "server-only";

/**
 * Server-side configuration. Every value here is a secret or a chain endpoint
 * that must never reach the browser, so this module is server-only.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in ` +
        `(see README.md for where each value comes from).`,
    );
  }
  return value;
}

function hexKey(name: string): `0x${string}` {
  const value = required(name);
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${name} must be a 0x-prefixed 32-byte private key.`);
  }
  return value as `0x${string}`;
}

export const env = {
  /** JSON-RPC endpoint of the chain the elections live on. */
  get rpcUrl() {
    return process.env.RPC_URL ?? "http://127.0.0.1:8545";
  },

  get chainId() {
    return Number(process.env.CHAIN_ID ?? 31337);
  },

  /**
   * Funds each university's freshly generated wallet so they can pay for their
   * own election transactions. On a local chain this is a pre-funded dev
   * account; on a testnet it is whatever account you topped up from a faucet.
   */
  get funderKey() {
    return hexKey("FUNDER_PRIVATE_KEY");
  },

  /** How much ETH each new university wallet receives, in wei. */
  get universityFunding() {
    return BigInt(process.env.UNIVERSITY_FUNDING_WEI ?? String(10n ** 18n));
  },

  /**
   * Submits ballots for students so they never need a wallet. Shared across
   * every university — it can only submit votes the contract already accepts.
   */
  get relayerKey() {
    return hexKey("RELAYER_PRIVATE_KEY");
  },

  /** Encrypts each university's wallet key before it touches disk. */
  get keyEncryptionSecret() {
    return required("KEY_ENCRYPTION_SECRET");
  },

  /**
   * Mixed into every voter hash. Without it, anyone could hash a guessed
   * student ID and check the public roll for a match.
   */
  get voterPepper() {
    return required("VOTER_ID_PEPPER");
  },

  /** Signs session cookies. */
  get sessionSecret() {
    return new TextEncoder().encode(required("SESSION_SECRET"));
  },

  /**
   * Whether session cookies carry the `Secure` flag.
   *
   * This cannot be derived from NODE_ENV. A browser refuses to store a Secure
   * cookie that arrived over plain HTTP — `localhost` is the one exception —
   * so a production build served on a LAN address like http://192.168.1.20:3000
   * would set the flag and then silently drop every session. Nobody could sign
   * in, and it would work perfectly on the machine you tested it on.
   *
   * That is the normal way to run this offline, so the default is off and
   * HTTPS deployments opt in with COOKIE_SECURE=true.
   */
  get secureCookies() {
    return process.env.COOKIE_SECURE === "true";
  },
};
