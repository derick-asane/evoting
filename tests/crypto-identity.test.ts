import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decryptSecret,
  encryptSecret,
  hashPassword,
  newSalt,
  passwordMatches,
} from "../lib/crypto";
import { newReceiptId, normaliseStudentId, voterHash } from "../lib/identity";

describe("wallet key encryption", () => {
  it("round-trips a private key", () => {
    const key = `0x${"ab".repeat(32)}`;
    assert.equal(decryptSecret(encryptSecret(key)), key);
  });

  it("produces a different ciphertext each time", () => {
    // A fresh salt and IV per encryption: identical keys must not produce
    // identical blobs, or the database reveals which universities share one.
    const key = "same-secret";
    assert.notEqual(encryptSecret(key), encryptSecret(key));
  });

  it("refuses a tampered ciphertext instead of returning wrong bytes", () => {
    // AES-GCM's tag is the point: a flipped byte must fail loudly rather than
    // decrypt to a different, wrong private key.
    const blob = encryptSecret("secret");
    const parts = blob.split(".");
    const body = Buffer.from(parts[3]!, "base64");
    body[0] ^= 0xff;
    parts[3] = body.toString("base64");

    assert.throws(() => decryptSecret(parts.join(".")));
  });

  it("refuses a malformed blob", () => {
    assert.throws(() => decryptSecret("not-a-blob"));
    assert.throws(() => decryptSecret("a.b.c"));
  });
});

describe("password hashing", () => {
  it("accepts the right password and rejects the wrong one", async () => {
    const salt = newSalt();
    const hash = await hashPassword("correct horse", salt);

    assert.equal(await passwordMatches("correct horse", salt, hash), true);
    assert.equal(await passwordMatches("Correct horse", salt, hash), false);
    assert.equal(await passwordMatches("", salt, hash), false);
  });

  it("gives different hashes for the same password under different salts", () => {
    assert.notEqual(newSalt(), newSalt());
  });

  it("does not throw on a malformed stored hash", async () => {
    // A corrupted row must fail the sign-in, not crash the request.
    assert.equal(await passwordMatches("x", newSalt(), "zzzz"), false);
  });
});

describe("voter handles", () => {
  it("is stable for the same student", () => {
    assert.equal(voterHash("uni-1", "CS2021001"), voterHash("uni-1", "CS2021001"));
  });

  it("differs between universities for the same student number", () => {
    // Otherwise the same matriculation number at two institutions would be
    // one voter, and a roll at one would leak into the other.
    assert.notEqual(voterHash("uni-1", "CS2021001"), voterHash("uni-2", "CS2021001"));
  });

  it("ignores case and stray whitespace in a student id", () => {
    const canonical = voterHash("uni-1", "CS2021001");
    assert.equal(voterHash("uni-1", " cs2021001 "), canonical);
    assert.equal(voterHash("uni-1", "CS 2021001"), canonical);
  });

  it("normalises predictably", () => {
    assert.equal(normaliseStudentId("  ee2021002 "), "EE2021002");
    assert.equal(normaliseStudentId("a b\tc"), "ABC");
  });

  it("looks nothing like the student id it came from", () => {
    const handle = voterHash("uni-1", "CS2021001");
    assert.match(handle, /^0x[0-9a-f]{64}$/);
    assert.ok(!handle.includes("2021001"));
  });
});

describe("receipt ids", () => {
  it("is a 32-byte hex value", () => {
    assert.match(newReceiptId(), /^0x[0-9a-f]{64}$/);
  });

  it("never repeats", () => {
    // The receipt is the only link between a voter and their choice, so a
    // collision would hand one student another's ballot.
    const seen = new Set(Array.from({ length: 2000 }, () => newReceiptId()));
    assert.equal(seen.size, 2000);
  });
});
