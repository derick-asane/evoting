import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

/**
 * Every Server Action must re-check who is calling it.
 *
 * Server Actions are reachable by direct POST, not only through the UI that
 * renders them — so an action that trusts the page it came from is an open
 * endpoint. This reads the source and asserts the guard is present, which
 * catches the real failure: someone adds an action later and forgets.
 *
 * A static check rather than a runtime one because these read cookies through
 * `next/headers`, which needs a live request context that does not exist in a
 * test process. Shape is what is being defended here, and shape is what this
 * verifies.
 */

/** Exported async functions in a "use server" file. */
function exportedActions(source: string): string[] {
  return [...source.matchAll(/export async function (\w+)\s*\(/g)].map(
    (match) => match[1]!,
  );
}

/**
 * The arguments of one call, by balanced parentheses.
 *
 * Slicing to the end of the enclosing function instead would sweep up whatever
 * follows — including the receipt the student is handed, which contains their
 * choices legitimately and would look like a leak.
 */
function callArgs(source: string, name: string): string {
  const open = source.indexOf(`${name}(`) + name.length;
  assert.ok(open > name.length, `no call to ${name} found`);

  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "(") depth += 1;
    if (source[index] === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  throw new Error(`unbalanced parentheses in the call to ${name}`);
}

/** The body of one function, from its signature to the next top-level one. */
function bodyOf(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`);
  const rest = source.slice(start + 1);
  const next = rest.search(/\nexport (async )?function /);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("admin actions", () => {
  it("every action requires a signed-in university", async () => {
    const source = await readFile("app/actions/admin.ts", "utf8");
    assert.match(source, /^"use server";/, "must be a Server Action module");

    const actions = exportedActions(source);
    assert.ok(actions.length >= 8, `only found ${actions.length} actions`);

    const unguarded = actions.filter(
      (name) => !bodyOf(source, name).includes("requireUniversity()"),
    );
    assert.deepEqual(
      unguarded,
      [],
      `actions missing requireUniversity(): ${unguarded.join(", ")}`,
    );
  });

  it("every action touching an election checks that it belongs to the caller", async () => {
    const source = await readFile("app/actions/admin.ts", "utf8");

    // An action that reads an electionId from the form must prove ownership,
    // or one committee could drive another's election by posting its id.
    const takesElectionId = exportedActions(source).filter((name) =>
      bodyOf(source, name).includes('field(form, "electionId")'),
    );
    assert.ok(takesElectionId.length >= 4);

    const unchecked = takesElectionId.filter(
      (name) => !bodyOf(source, name).includes("requireOwnElection("),
    );
    assert.deepEqual(
      unchecked,
      [],
      `actions not checking ownership: ${unchecked.join(", ")}`,
    );
  });

  it("guards are defined to throw rather than return quietly", async () => {
    const source = await readFile("app/actions/admin.ts", "utf8");
    assert.match(
      source,
      /async function requireUniversity\(\)[\s\S]*?throw new Error/,
      "requireUniversity must throw when there is no session",
    );
    assert.match(
      source,
      /async function requireOwnElection\([\s\S]*?throw new Error/,
      "requireOwnElection must throw on someone else's election",
    );
  });
});

describe("student actions", () => {
  it("the ballot action verifies the session and the election's owner", async () => {
    const source = await readFile("app/actions/vote.ts", "utf8");
    const body = bodyOf(source, "castBallot");

    assert.match(body, /getStudentSession\(\)/);
    assert.match(
      body,
      /election\.universityId !== session\.universityId/,
      "must reject an election id from another university",
    );
    assert.match(body, /isOnRoll\(/, "must check the on-chain roll");
    assert.match(body, /status !== "enrolled"/, "must reject a departed student");
  });

  it("the ballot action re-checks the password at the moment of casting", async () => {
    // A session cookie only proves somebody signed in on this browser in the
    // last four hours. On a shared lab machine that is routinely not the
    // person now sitting at it, and this is the last point before the ballot
    // reaches a chain that cannot forget it.
    const source = await readFile("app/actions/vote.ts", "utf8");
    const body = bodyOf(source, "castBallot");

    assert.match(body, /verifyCredentials\(/, "must re-verify the password");
    assert.match(body, /recordLoginFailure\(/, "must throttle wrong guesses");

    // The check has to come before the ballot is submitted, or it guards
    // nothing.
    assert.ok(
      body.indexOf("verifyCredentials(") < body.indexOf("submitBallot("),
      "the password check must precede submission",
    );
  });

  it("the ballot action alerts the student that a ballot went out in their name", async () => {
    // Nothing can prevent an impersonation by this point. This is how one
    // becomes visible: the real student sees an alert for a ballot they did
    // not cast, and tells the committee.
    const source = await readFile("app/actions/vote.ts", "utf8");
    const body = bodyOf(source, "castBallot");

    assert.match(body, /notifyBallotCast\(/);
    assert.match(body, /recordAudit\(/);

    // Neither may carry a choice: they say a ballot was cast, never which
    // way, or they would undo the secrecy the contract is built around. The
    // receipt returned to the student does carry their choices, which is the
    // point of a receipt — so only these two calls are examined.
    for (const call of ["notifyBallotCast", "recordAudit"]) {
      const args = callArgs(body, call);
      for (const leak of ["candidateId", "candidate", "choices", "ballot["]) {
        assert.ok(
          !args.includes(leak),
          `${call} must not carry a choice (${leak})`,
        );
      }
    }
  });

  it("the ballot action never calls refresh()", async () => {
    // refresh() re-renders the page, which then shows the "already voted"
    // card and unmounts the receipt before the student can read it. The
    // receipt is shown once and never stored, so that loses it for good.
    const source = await readFile("app/actions/vote.ts", "utf8");
    assert.ok(
      !/^\s*refresh\(\);/m.test(source),
      "refresh() destroys the receipt",
    );
  });

  it("verification searches every election, not just the current one", async () => {
    // A receipt from a previous year must still resolve.
    const source = await readFile("app/actions/verify.ts", "utf8");
    assert.match(source, /listElections\(/);
    assert.ok(
      !source.includes("currentElection("),
      "verification must not be limited to the newest election",
    );
  });
});

describe("photo uploads", () => {
  it("decides the format from the bytes, not the browser's claim", async () => {
    const source = await readFile("lib/photos.ts", "utf8");
    assert.ok(
      !source.includes("file.type"),
      "the declared MIME type must not be trusted",
    );
    assert.match(source, /SIGNATURES/, "must match on magic bytes");
  });

  it("does not list SVG as an accepted format", async () => {
    // An SVG is a document that can carry script; serving one from our own
    // origin would be stored XSS.
    const source = await readFile("lib/photos.ts", "utf8");
    assert.ok(!/"image\/svg/.test(source));
  });

  it("serves uploads with sniffing disabled", async () => {
    const source = await readFile("app/api/photo/[id]/route.ts", "utf8");
    assert.match(source, /X-Content-Type-Options/);
    assert.match(source, /nosniff/);
  });
});

describe("locale routing", () => {
  it("excludes API routes from the locale redirect", async () => {
    // /api/photo/... has no locale segment; redirecting it to /en/api/...
    // would 404 every uploaded image.
    const source = await readFile("proxy.ts", "utf8");
    assert.match(source, /matcher/);
    assert.match(source, /\(\?!api\|/, "matcher must skip /api");
  });
});
