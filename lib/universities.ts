import "server-only";

import type { Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { fundWallet } from "./chain";
import {
  decryptSecret,
  encryptSecret,
  hashPassword,
  newSalt,
  passwordMatches,
} from "./crypto";
import { prisma } from "./db";
import type { University } from "./generated/prisma/client";

export type { University };

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function listUniversities(): Promise<University[]> {
  return prisma.university.findMany({ orderBy: { name: "asc" } });
}

export function findUniversityBySlug(slug: string): Promise<University | null> {
  return prisma.university.findUnique({ where: { slug } });
}

export function findUniversityById(id: string): Promise<University | null> {
  return prisma.university.findUnique({ where: { id } });
}

/** Why a signup was refused. Translated by the caller, not here. */
export type SignUpFailure =
  | "nameTooShort"
  | "badSlug"
  | "badEmail"
  | "passwordShort"
  | "nameTaken"
  | "emailTaken"
  | "chainUnreachable";

/**
 * Creates a university account together with the wallet it will administer its
 * elections with.
 *
 * The wallet is generated here and funded from the platform account, but the
 * platform keeps no usable copy of the key beyond the encrypted blob — so the
 * university, not the platform, is the admin recorded in their contracts.
 */
export async function createUniversity(input: {
  name: string;
  contactEmail: string;
  password: string;
}): Promise<
  { ok: true; university: University } | { ok: false; code: SignUpFailure }
> {
  const name = input.name.trim();
  const contactEmail = input.contactEmail.trim().toLowerCase();
  const slug = toSlug(name);

  if (name.length < 3) return { ok: false, code: "nameTooShort" };
  if (!slug) return { ok: false, code: "badSlug" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
    return { ok: false, code: "badEmail" };
  }
  if (input.password.length < 10) return { ok: false, code: "passwordShort" };

  const [slugTaken, emailTaken] = await Promise.all([
    prisma.university.findUnique({ where: { slug }, select: { id: true } }),
    prisma.university.findUnique({
      where: { contactEmail },
      select: { id: true },
    }),
  ]);
  if (slugTaken) return { ok: false, code: "nameTaken" };
  if (emailTaken) return { ok: false, code: "emailTaken" };

  const walletKey = generatePrivateKey();
  const walletAddress = privateKeyToAccount(walletKey).address;

  // Fund before inserting: an account whose wallet cannot pay for gas is
  // useless, and failing here leaves no half-created row behind.
  try {
    await fundWallet(walletAddress);
  } catch (error) {
    console.error("Could not fund university wallet", error);
    return { ok: false, code: "chainUnreachable" };
  }

  const salt = newSalt();

  try {
    const university = await prisma.university.create({
      data: {
        slug,
        name,
        contactEmail,
        passwordHash: await hashPassword(input.password, salt),
        salt,
        walletAddress,
        encryptedWalletKey: encryptSecret(walletKey),
      },
    });
    return { ok: true, university };
  } catch (error) {
    // Two simultaneous signups can both pass the checks above; the unique
    // indexes are what actually decide it.
    if (isUniqueViolation(error)) {
      return { ok: false, code: "nameTaken" };
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function verifyUniversityLogin(
  contactEmail: string,
  password: string,
): Promise<University | null> {
  const university = await prisma.university.findUnique({
    where: { contactEmail: contactEmail.trim().toLowerCase() },
  });
  if (!university) return null;

  const matches = await passwordMatches(
    password,
    university.salt,
    university.passwordHash,
  );
  return matches ? university : null;
}

/** The university's wallet key, decrypted for one transaction. */
export function walletKeyOf(university: University): Hex {
  return decryptSecret(university.encryptedWalletKey) as Hex;
}
