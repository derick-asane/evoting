import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { scrypt as scryptCallback } from "node:crypto";

import { env } from "./env";

const scryptAsync = promisify(scryptCallback);

// --- Wallet key encryption --------------------------------------------------

/**
 * Each university's wallet key is encrypted before it is written to disk, so
 * a leaked data file alone does not let anyone administer their election.
 *
 * AES-256-GCM: the tag makes tampering detectable rather than silently
 * producing a different (wrong) key.
 */
function encryptionKey(salt: Buffer): Buffer {
  return scryptSync(env.keyEncryptionSecret, salt, 32);
}

export function encryptSecret(plaintext: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(salt), iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return [
    salt.toString("base64"),
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const [salt, iv, tag, ciphertext] = payload.split(".");
  if (!salt || !iv || !tag || !ciphertext) {
    throw new Error("Stored key is malformed.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(Buffer.from(salt, "base64")),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

// --- Password hashing -------------------------------------------------------

export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return derived.toString("hex");
}

export function newSalt(): string {
  return randomBytes(16).toString("hex");
}

export async function passwordMatches(
  password: string,
  salt: string,
  expectedHex: string,
): Promise<boolean> {
  const candidate = Buffer.from(await hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHex, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
