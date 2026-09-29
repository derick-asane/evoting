import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { randomUUID } from "node:crypto";

import { prisma } from "../lib/db";
import {
  checkLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "../lib/throttle";

/**
 * Sign-in throttling.
 *
 * These run against the real database with unique identifiers per test, so
 * they never touch a real account's counters.
 *
 * There is no request context here, so `clientIp()` returns null and only the
 * per-account counter is exercised. The IP counter shares the same code path
 * with a different limit.
 */

const ACCOUNT_LIMIT = 5;
const used: string[] = [];

/** A throttle key nothing else in the system will collide with. */
function freshKey(): string {
  const key = `test:${randomUUID()}`;
  used.push(key.toLowerCase());
  return key;
}

after(async () => {
  await prisma.authThrottle.deleteMany({
    where: { identifier: { in: used } },
  });
  await prisma.$disconnect();
});

describe("login throttling", () => {
  it("allows an identifier that has never failed", async () => {
    const state = await checkLoginAllowed("student", freshKey());
    assert.equal(state.blocked, false);
  });

  it("allows attempts right up to the limit, then blocks", async () => {
    const key = freshKey();

    for (let attempt = 1; attempt < ACCOUNT_LIMIT; attempt++) {
      await recordLoginFailure("student", key);
      const state = await checkLoginAllowed("student", key);
      assert.equal(
        state.blocked,
        false,
        `blocked early, after ${attempt} failure(s)`,
      );
    }

    await recordLoginFailure("student", key);
    const state = await checkLoginAllowed("student", key);
    assert.equal(state.blocked, true, "should block on the fifth failure");
    assert.ok(state.blocked && state.retryAfterSeconds > 0);
  });

  it("blocks an identifier that does not name any account", async () => {
    // The important one. If an unknown id never locked, the lockout itself
    // would tell an attacker which student numbers are real.
    const ghost = freshKey();
    for (let i = 0; i < ACCOUNT_LIMIT; i++) {
      await recordLoginFailure("student", ghost);
    }
    const state = await checkLoginAllowed("student", ghost);
    assert.equal(state.blocked, true);
  });

  it("clears the counter after a correct password", async () => {
    const key = freshKey();
    for (let i = 0; i < ACCOUNT_LIMIT; i++) {
      await recordLoginFailure("student", key);
    }
    assert.equal((await checkLoginAllowed("student", key)).blocked, true);

    await clearLoginFailures("student", key);
    assert.equal((await checkLoginAllowed("student", key)).blocked, false);
  });

  it("keeps student and university scopes apart", async () => {
    // Same text, different scope: locking a student must not lock a committee
    // account that happens to share the identifier.
    const shared = freshKey();
    for (let i = 0; i < ACCOUNT_LIMIT; i++) {
      await recordLoginFailure("student", shared);
    }

    assert.equal((await checkLoginAllowed("student", shared)).blocked, true);
    assert.equal((await checkLoginAllowed("university", shared)).blocked, false);
  });

  it("treats an identifier case-insensitively", async () => {
    // Otherwise CS2021001 and cs2021001 would each get their own allowance.
    const key = freshKey();
    for (let i = 0; i < ACCOUNT_LIMIT; i++) {
      await recordLoginFailure("student", key.toUpperCase());
    }
    assert.equal((await checkLoginAllowed("student", key.toLowerCase())).blocked, true);
  });

  it("starts a fresh window once the old one has gone quiet", async () => {
    const key = freshKey();
    for (let i = 0; i < ACCOUNT_LIMIT - 1; i++) {
      await recordLoginFailure("student", key);
    }

    // Push the window's start back beyond its 15-minute life.
    await prisma.authThrottle.update({
      where: { scope_identifier: { scope: "student", identifier: key.toLowerCase() } },
      data: { windowStarted: new Date(Date.now() - 20 * 60 * 1000) },
    });

    await recordLoginFailure("student", key);
    const state = await checkLoginAllowed("student", key);
    assert.equal(
      state.blocked,
      false,
      "an old window should reset rather than accumulate",
    );
  });

  it("stops blocking once the lockout has expired", async () => {
    const key = freshKey();
    for (let i = 0; i < ACCOUNT_LIMIT; i++) {
      await recordLoginFailure("student", key);
    }
    assert.equal((await checkLoginAllowed("student", key)).blocked, true);

    await prisma.authThrottle.update({
      where: { scope_identifier: { scope: "student", identifier: key.toLowerCase() } },
      data: { lockedUntil: new Date(Date.now() - 1000) },
    });

    assert.equal((await checkLoginAllowed("student", key)).blocked, false);
  });
});
