import "server-only";

import { prisma } from "./db";
import { deletePhotoIfOrphaned } from "./photos";

/**
 * Off-chain presentation for an on-chain candidate, keyed by their position on
 * the ballot. The contract remains the authority on who is standing and how
 * many votes they have.
 */
export type CandidateExtras = {
  photoId: string | null;
  manifesto: string | null;
};

/** `${positionIndex}:${candidateIndex}` — candidate numbering restarts per post. */
export function extrasKey(positionIndex: number, candidateIndex: number): string {
  return `${positionIndex}:${candidateIndex}`;
}

/** Profiles for one election, keyed by position and ballot position. */
export async function getCandidateExtras(
  electionId: string,
): Promise<Map<string, CandidateExtras>> {
  const profiles = await prisma.candidateProfile.findMany({
    where: { electionId },
    select: {
      positionIndex: true,
      candidateIndex: true,
      photoId: true,
      manifesto: true,
    },
  });

  return new Map(
    profiles.map((profile) => [
      extrasKey(profile.positionIndex, profile.candidateIndex),
      { photoId: profile.photoId, manifesto: profile.manifesto },
    ]),
  );
}

/**
 * Attaches a photo and manifesto to a candidate.
 *
 * Replacing a photo drops the previous one if nothing else references it, so
 * re-uploading a portrait does not leave the old bytes behind for good.
 */
export async function setCandidateExtras(
  electionId: string,
  positionIndex: number,
  candidateIndex: number,
  extras: { photoId?: string; manifesto?: string | null },
): Promise<void> {
  const where = {
    electionId_positionIndex_candidateIndex: {
      electionId,
      positionIndex,
      candidateIndex,
    },
  };

  const existing = await prisma.candidateProfile.findUnique({
    where,
    select: { photoId: true },
  });

  await prisma.candidateProfile.upsert({
    where,
    create: {
      electionId,
      positionIndex,
      candidateIndex,
      photoId: extras.photoId ?? null,
      manifesto: extras.manifesto ?? null,
    },
    update: {
      ...(extras.photoId ? { photoId: extras.photoId } : {}),
      ...(extras.manifesto !== undefined ? { manifesto: extras.manifesto } : {}),
    },
  });

  if (extras.photoId && existing?.photoId && existing.photoId !== extras.photoId) {
    await deletePhotoIfOrphaned(existing.photoId);
  }
}
