"use server";

import type { Hex } from "viem";

import { getBallot, lookupReceipt } from "@/lib/election";
import { listElections } from "@/lib/elections";
import { DEFAULT_LOCALE, getDictionaryFor } from "@/lib/i18n";
import { findUniversityBySlug } from "@/lib/universities";

export type VerifyState = {
  error?: string;
  result?: {
    receiptId: string;
    /** Which election the receipt belongs to, since it searches all of them. */
    electionTitle: string;
    contractAddress: string;
    /** One line per position the ballot covered. */
    lines: Array<{ position: string; candidate: string; party: string }>;
  };
};

/**
 * Looks up one ballot by its receipt, across every election the university has
 * ever run.
 *
 * Searching all of them is the point: a receipt from a previous year must keep
 * working, and the holder should not have to know which contract their ballot
 * landed in. Elections are checked newest first, since recent receipts are the
 * ones people look up.
 *
 * Open to anyone — the receipt itself is the credential, which is why it is
 * random and shown only to the voter.
 */
export async function verifyReceipt(
  _previous: VerifyState,
  form: FormData,
): Promise<VerifyState> {
  const rawLocale = form.get("locale");
  const dict = getDictionaryFor(
    typeof rawLocale === "string" && rawLocale ? rawLocale : DEFAULT_LOCALE,
  );

  const slug = form.get("slug");
  if (typeof slug !== "string") return { error: dict.errors.unknownUniversity };

  const university = await findUniversityBySlug(slug);
  if (!university) return { error: dict.errors.unknownUniversity };

  const raw = form.get("receiptId");
  const receiptId = typeof raw === "string" ? raw.trim() : "";

  if (!/^0x[0-9a-fA-F]{64}$/.test(receiptId)) {
    return { error: dict.errors.badReceipt };
  }

  // Newest first — listElections already orders by createdAt desc.
  const elections = await listElections(university.id);

  for (const election of elections) {
    let found;
    try {
      found = await lookupReceipt(election.address, receiptId as Hex);
    } catch (error) {
      // One unreachable contract must not hide a receipt held in another.
      console.error(`Could not read election ${election.address}`, error);
      continue;
    }
    if (!found.found) continue;

    const ballot = await getBallot(election.address);

    return {
      result: {
        receiptId,
        electionTitle: election.title,
        contractAddress: election.address,
        lines: found.lines.map((line) => {
          const position = ballot[line.positionId];
          const candidate = position?.candidates[line.candidateId];
          return {
            position: position?.title ?? `#${line.positionId}`,
            candidate: candidate?.name ?? `#${line.candidateId}`,
            party: candidate?.party ?? "",
          };
        }),
      },
    };
  }

  return { error: dict.errors.receiptNotFoundAnywhere };
}
