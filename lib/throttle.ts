import "server-only";

import { headers } from "next/headers";

import { prisma } from "./db";

/**
 * Sign-in throttling.
 *
 * Without this, a student password is one unbounded loop away from being
 * guessed, and student IDs run in predictable ranges — an attacker knows the
 * usernames before they start.
 *
 * Two counters run at once:
 *   - per account, which stops one account being hammered;
 *   - per IP, which stops one attacker spraying one password across many
 *     accounts, where no single account ever trips its own limit.
 */

const ACCOUNT_LIMIT = 5;
const IP_LIMIT = 20;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

export type ThrottleScope = "student" | "university" | "ip";

export type ThrottleState =
  | { blocked: false }
  | { blocked: true; retryAfterSeconds: number };

/** Best-effort client address. Absent behind a proxy that strips headers. */
export async function clientIp(): Promise<string | null> {
  try {
    const header = await headers();
    const forwarded = header.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
    return header.get("x-real-ip");
  } catch {
    return null;
  }
}

function limitFor(scope: ThrottleScope): number {
  return scope === "ip" ? IP_LIMIT : ACCOUNT_LIMIT;
}

async function check(
  scope: ThrottleScope,
  identifier: string,
): Promise<ThrottleState> {
  const row = await prisma.authThrottle.findUnique({
    where: { scope_identifier: { scope, identifier } },
    select: { lockedUntil: true },
  });

  if (!row?.lockedUntil) return { blocked: false };

  const remaining = row.lockedUntil.getTime() - Date.now();
  if (remaining <= 0) return { blocked: false };

  return { blocked: true, retryAfterSeconds: Math.ceil(remaining / 1000) };
}

/**
 * Whether this attempt should be refused before any password is compared.
 *
 * Checked for an identifier whether or not it names a real account, so a
 * "too many attempts" response never confirms that an account exists.
 */
export async function checkLoginAllowed(
  scope: Exclude<ThrottleScope, "ip">,
  identifier: string,
): Promise<ThrottleState> {
  const ip = await clientIp();

  const [account, address] = await Promise.all([
    check(scope, identifier.toLowerCase()),
    ip ? check("ip", ip) : Promise.resolve<ThrottleState>({ blocked: false }),
  ]);

  if (account.blocked) return account;
  return address;
}

async function recordFailure(
  scope: ThrottleScope,
  identifier: string,
): Promise<void> {
  const now = new Date();
  const limit = limitFor(scope);

  const existing = await prisma.authThrottle.findUnique({
    where: { scope_identifier: { scope, identifier } },
  });

  // A window that has gone quiet starts over, so an occasional typo months
  // apart never accumulates into a lockout.
  const windowExpired =
    existing && now.getTime() - existing.windowStarted.getTime() > WINDOW_MS;

  const failedCount = !existing || windowExpired ? 1 : existing.failedCount + 1;
  const lockedUntil =
    failedCount >= limit ? new Date(now.getTime() + LOCKOUT_MS) : null;

  await prisma.authThrottle.upsert({
    where: { scope_identifier: { scope, identifier } },
    create: {
      scope,
      identifier,
      failedCount,
      windowStarted: now,
      lastFailedAt: now,
      lockedUntil,
    },
    update: {
      failedCount,
      lastFailedAt: now,
      ...(windowExpired ? { windowStarted: now } : {}),
      lockedUntil,
    },
  });
}

export async function recordLoginFailure(
  scope: Exclude<ThrottleScope, "ip">,
  identifier: string,
): Promise<void> {
  const ip = await clientIp();
  await Promise.all([
    recordFailure(scope, identifier.toLowerCase()),
    ip ? recordFailure("ip", ip) : Promise.resolve(),
  ]);
}

/** Clears the counters for an account after a correct password. */
export async function clearLoginFailures(
  scope: Exclude<ThrottleScope, "ip">,
  identifier: string,
): Promise<void> {
  const ip = await clientIp();

  await prisma.authThrottle
    .deleteMany({
      where: {
        OR: [
          { scope, identifier: identifier.toLowerCase() },
          ...(ip ? [{ scope: "ip", identifier: ip }] : []),
        ],
      },
    })
    .catch(() => undefined);
}
