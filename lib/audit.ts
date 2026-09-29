import "server-only";

import { prisma } from "./db";
import { clientIp } from "./throttle";

/**
 * Append-only record of committee activity.
 *
 * The chain already proves what happened to ballots. This covers the off-chain
 * half — who uploaded a roster, who opened the polls, who reset whose password
 * — which is what actually gets asked about when a result is challenged.
 *
 * Nothing here records how anyone voted, and nothing here is ever updated or
 * deleted by application code.
 */
export type AuditAction =
  | "election.created"
  | "position.added"
  | "candidate.added"
  | "candidate.photo_updated"
  | "roster.imported"
  | "roll.written"
  | "phase.registration_opened"
  | "phase.voting_opened"
  | "phase.voting_closed"
  | "enrolment.changed"
  | "union.member_added"
  | "union.member_removed"
  | "password.reset_issued"
  | "password.reset_redeemed"
  | "password.activation_codes_issued"
  | "account.activated"
  | "ballot.cast"
  | "checkin.issued"
  | "supervision.enabled"
  | "supervision.disabled"
  | "auth.committee_signed_in";

export async function recordAudit(input: {
  universityId: string | null;
  actor: string;
  action: AuditAction;
  summary: string;
  targetId?: string;
}): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        universityId: input.universityId,
        actor: input.actor,
        action: input.action,
        summary: input.summary,
        targetId: input.targetId ?? null,
        ip: await clientIp(),
      },
    });
  } catch (error) {
    // An audit write must never take down the action it is describing: losing
    // a log line is bad, failing an election operation is worse.
    console.error("Audit write failed", input.action, error);
  }
}

export type AuditRow = {
  id: string;
  actor: string;
  action: string;
  summary: string;
  ip: string | null;
  createdAt: Date;
};

export function listAudit(
  universityId: string,
  limit = 50,
): Promise<AuditRow[]> {
  return prisma.auditEvent.findMany({
    where: { universityId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      actor: true,
      action: true,
      summary: true,
      ip: true,
      createdAt: true,
    },
  });
}
