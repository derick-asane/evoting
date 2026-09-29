import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client";

/**
 * One Prisma client for the process.
 *
 * Next's dev server re-evaluates modules on every edit, so without a cache each
 * reload would open a new pool and exhaust Postgres' connection limit within a
 * few saves.
 *
 * The connection string is cached alongside the client: editing DATABASE_URL
 * makes Next reload the environment but would otherwise leave this holding a
 * client built from the old credentials, which fails as an authentication
 * error that looks nothing like its cause.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaUrl?: string;
};

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Missing DATABASE_URL. Set it in .env (see .env.example), then run " +
        "`npx prisma migrate dev`.",
    );
  }
  return url;
}

function getClient(): PrismaClient {
  const url = connectionString();

  if (globalForPrisma.prisma && globalForPrisma.prismaUrl === url) {
    return globalForPrisma.prisma;
  }

  // Let the old pool drain rather than leaking its sockets.
  void globalForPrisma.prisma?.$disconnect().catch(() => undefined);

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaUrl = url;
  }

  return client;
}

/**
 * Resolved per call in development so an edited DATABASE_URL takes effect on
 * the next request; created once in production, where the env never changes
 * under a running process.
 */
export const prisma: PrismaClient =
  process.env.NODE_ENV === "production"
    ? getClient()
    : (new Proxy({} as PrismaClient, {
        get(_target, property, receiver) {
          return Reflect.get(getClient(), property, receiver);
        },
      }) as PrismaClient);
