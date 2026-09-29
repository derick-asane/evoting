import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { env } from "./env";
import { findUniversityById, type University } from "./universities";

const STUDENT_COOKIE = "student_session";
const UNIVERSITY_COOKIE = "university_session";
const MAX_AGE_SECONDS = 60 * 60 * 4;

export type StudentSession = {
  universityId: string;
  universitySlug: string;
  studentId: string;
  fullName: string;
};

async function sign(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(env.sessionSecret);
}

async function write(name: string, token: string): Promise<void> {
  const store = await cookies();
  store.set(name, token, {
    httpOnly: true,
    // See env.secureCookies: tying this to NODE_ENV breaks every LAN
    // deployment, which is the normal way to run this offline.
    secure: env.secureCookies,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

async function read<T>(name: string): Promise<T | null> {
  const store = await cookies();
  const token = store.get(name)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, env.sessionSecret, {
      algorithms: ["HS256"],
    });
    return payload as T;
  } catch {
    // Expired, tampered with, or signed by an older secret. Treat as signed out.
    return null;
  }
}

// --- Student sessions -------------------------------------------------------

export async function createStudentSession(session: StudentSession): Promise<void> {
  await write(STUDENT_COOKIE, await sign({ ...session }));
}

export async function getStudentSession(): Promise<StudentSession | null> {
  const payload = await read<StudentSession>(STUDENT_COOKIE);
  if (!payload?.studentId || !payload.universityId) return null;
  return {
    universityId: payload.universityId,
    universitySlug: payload.universitySlug,
    studentId: payload.studentId,
    fullName: payload.fullName,
  };
}

export async function destroyStudentSession(): Promise<void> {
  const store = await cookies();
  store.delete(STUDENT_COOKIE);
}

// --- University sessions ----------------------------------------------------

export async function createUniversitySession(universityId: string): Promise<void> {
  await write(UNIVERSITY_COOKIE, await sign({ universityId }));
}

/** The signed-in university, re-read from the store on every call. */
export async function getUniversitySession(): Promise<University | null> {
  const payload = await read<{ universityId?: string }>(UNIVERSITY_COOKIE);
  if (!payload?.universityId) return null;
  return findUniversityById(payload.universityId);
}

export async function destroyUniversitySession(): Promise<void> {
  const store = await cookies();
  store.delete(UNIVERSITY_COOKIE);
}
