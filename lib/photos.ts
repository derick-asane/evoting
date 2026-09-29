import "server-only";

import { prisma } from "./db";

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Image formats we accept.
 *
 * SVG is deliberately absent: it is a document, it can carry script, and
 * serving one from our own origin would be a stored-XSS hole. Raster only.
 */
const SIGNATURES: Array<{ type: string; matches: (bytes: Uint8Array) => boolean }> = [
  {
    type: "image/jpeg",
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    type: "image/png",
    matches: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    type: "image/webp",
    matches: (b) =>
      // "RIFF" .... "WEBP"
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
];

export type PhotoFailure = "tooLarge" | "unsupportedType" | "empty";

/**
 * Stores an uploaded image and returns its id.
 *
 * The browser's declared MIME type is ignored — anyone can set it to anything.
 * The format is decided by inspecting the leading bytes, and that decided type
 * is what we later serve it as.
 */
export async function storePhoto(
  file: File,
): Promise<{ ok: true; photoId: string } | { ok: false; code: PhotoFailure }> {
  if (file.size === 0) return { ok: false, code: "empty" };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, code: "tooLarge" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength === 0) return { ok: false, code: "empty" };
  if (bytes.byteLength > MAX_PHOTO_BYTES) return { ok: false, code: "tooLarge" };

  const signature = SIGNATURES.find((candidate) => candidate.matches(bytes));
  if (!signature) return { ok: false, code: "unsupportedType" };

  const photo = await prisma.photo.create({
    data: {
      contentType: signature.type,
      bytes: Buffer.from(bytes),
      byteSize: bytes.byteLength,
    },
    select: { id: true },
  });

  return { ok: true, photoId: photo.id };
}

export async function getPhoto(
  id: string,
): Promise<{ contentType: string; bytes: Buffer } | null> {
  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { contentType: true, bytes: true },
  });
  if (!photo) return null;
  return { contentType: photo.contentType, bytes: Buffer.from(photo.bytes) };
}

/** Removes a photo nothing points at any more. */
export async function deletePhotoIfOrphaned(photoId: string): Promise<void> {
  const [profiles, members] = await Promise.all([
    prisma.candidateProfile.count({ where: { photoId } }),
    prisma.unionMember.count({ where: { photoId } }),
  ]);
  if (profiles === 0 && members === 0) {
    await prisma.photo.delete({ where: { id: photoId } }).catch(() => undefined);
  }
}

/** Reads an optional file field out of a form, treating an empty pick as absent. */
export function fileField(form: FormData, name: string): File | null {
  const value = form.get(name);
  if (!(value instanceof File)) return null;
  if (value.size === 0) return null;
  return value;
}
