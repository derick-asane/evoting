import "server-only";

import { randomBytes } from "node:crypto";
import { keccak256, toHex, type Hex } from "viem";

import { env } from "./env";

/**
 * Turns a student ID into the opaque handle their election contract knows them
 * by.
 *
 * The chain never sees a student ID. It sees this hash, which is salted with a
 * server-side pepper so the public roll cannot be probed by hashing guessed
 * matriculation numbers (they run in predictable ranges, so an unpeppered hash
 * would be trivial to enumerate).
 *
 * The university id is mixed in as well, so the same student number at two
 * different institutions produces two unrelated handles.
 */
export function voterHash(universityId: string, studentId: string): Hex {
  return keccak256(
    toHex(`${env.voterPepper}:${universityId}:${normaliseStudentId(studentId)}`),
  );
}

/**
 * Student IDs get typed with stray spaces and inconsistent case. Normalise
 * before hashing so the same person always maps to the same handle.
 */
export function normaliseStudentId(studentId: string): string {
  return studentId.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * A fresh, unguessable receipt id for one ballot.
 *
 * This is the only value linking a student to their choice, and it is shown to
 * the student once and never stored server-side.
 */
export function newReceiptId(): Hex {
  return `0x${randomBytes(32).toString("hex")}` as Hex;
}
