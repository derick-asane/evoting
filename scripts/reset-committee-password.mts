/**
 * Recovers a locked-out committee account.
 *
 *   npm run admin:reset -- committee@university.edu
 *   npm run admin:reset -- committee@university.edu CODE 'new password'
 *
 * Students are reset by their own committee from the console. A committee has
 * no higher authority inside the app, so recovery lives here: whoever operates
 * the server runs it, which is the honest trust boundary rather than inventing
 * a super-admin that could quietly take over any election.
 */
import { prisma } from "../lib/db";
import {
  issueUniversityReset,
  redeemUniversityReset,
} from "../lib/password-reset";
import { recordAudit } from "../lib/audit";

const [email, code, password] = process.argv.slice(2);

if (!email) {
  console.error("Usage: npm run admin:reset -- <email> [code] [new password]");
  process.exit(1);
}

if (!code) {
  const issued = await issueUniversityReset(email);
  if (!issued.ok) {
    console.error(`No committee account for ${email}.`);
    process.exit(1);
  }

  console.log(`\nReset code for ${email}\n`);
  console.log(`    ${issued.code}\n`);
  console.log(`Valid until ${issued.expiresAt.toLocaleString()}, single use.`);
  console.log("Redeem it with:");
  console.log(
    `    npm run admin:reset -- ${email} ${issued.code} 'your new password'\n`,
  );
} else {
  if (!password) {
    console.error("Provide the new password as the third argument.");
    process.exit(1);
  }

  const result = await redeemUniversityReset({ code, password });
  if (!result.ok) {
    console.error(`Could not reset: ${result.code}`);
    process.exit(1);
  }

  const university = await prisma.university.findUnique({
    where: { contactEmail: email.trim().toLowerCase() },
    select: { id: true },
  });

  await recordAudit({
    universityId: university?.id ?? null,
    actor: `operator:cli`,
    action: "password.reset_redeemed",
    summary: `Committee password for ${email} was reset from the server CLI.`,
  });

  console.log(`\nPassword updated for ${email}. Sign in with it now.\n`);
}

await prisma.$disconnect();
