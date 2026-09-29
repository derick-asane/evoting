import { redirect } from "next/navigation";

import { Console } from "./console";
import { NewElection } from "./new-election";
import { UnionTeam } from "./union-team";
import { ActivationCodes, ActivityLog, ResetIssuer } from "./security";
import { universitySignOut } from "@/app/actions/auth";
import { AccountMenu } from "@/app/components/account-menu";
import { LinkIcon } from "@/app/components/icons";
import { Card, CardTitle, Mono } from "@/app/components/ui";
import { Phase, getBallot, getElectionState } from "@/lib/election";
import { currentElection } from "@/lib/elections";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getUniversitySession } from "@/lib/session";
import { listStudents, pendingForElection } from "@/lib/students";
import { listUnionRows } from "@/lib/union";
import { listAudit } from "@/lib/audit";
import { formatDateTime } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Committee console" };

export default async function ConsolePage() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);

  const university = await getUniversitySession();
  if (!university) redirect(`/${locale}/university/login`);

  const election = await currentElection(university.id);
  const students = await listStudents(university.id);
  const unionRows = await listUnionRows(university.id);
  const auditRows = (await listAudit(university.id)).map((row) => ({
    id: row.id,
    actor: row.actor,
    action: row.action,
    summary: row.summary,
    ip: row.ip,
    when: formatDateTime(locale, Math.floor(row.createdAt.getTime() / 1000)),
  }));

  const shell = (children: React.ReactNode) => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">
            {university.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {dict.console.title} · {dict.console.publicPageAt}{" "}
            <Mono>/{locale}/u/{university.slug}</Mono>
          </p>
        </div>
        <AccountMenu
          name={university.name}
          detail={university.contactEmail}
          signOut={universitySignOut}
          labels={{
            menu: dict.auth.accountMenu,
            signOut: dict.console.leaveConsole,
            question: dict.auth.signOutQuestion,
            body: dict.auth.signOutBody,
            confirm: dict.auth.confirmSignOut,
            cancel: dict.auth.cancel,
          }}
        />
      </div>
      {children}
    </div>
  );

  if (!election) {
    return shell(
      <>
        <NewElection
          locale={locale}
          labels={{
            startElection: dict.console.startElection,
            startElectionHint: dict.console.startElectionHint,
            electionTitle: dict.console.electionTitle,
            electionTitleHint: dict.console.electionTitleHint,
            deploy: dict.console.deploy,
            deploying: dict.console.deploying,
          }}
        />
        <Card>
          <CardTitle icon={<LinkIcon size={19} />} hint={dict.console.walletHint}>
            {dict.console.walletTitle}
          </CardTitle>
          <p className="break-all font-mono text-sm">{university.walletAddress}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {dict.console.walletBody}
          </p>
        </Card>
        <UnionTeam locale={locale} rows={unionRows} labels={dict.union} photo={dict.photo} />
        <ActivationCodes locale={locale} labels={dict.security} />
        <ResetIssuer locale={locale} labels={dict.security} />
        <ActivityLog rows={auditRows} labels={dict.security} />
      </>,
    );
  }

  const [state, positions, pending] = await Promise.all([
    getElectionState(election.address),
    getBallot(election.address),
    pendingForElection(university.id, election.id),
  ]);

  return shell(
    <Console
      locale={locale}
      walletAddress={university.walletAddress}
      election={{
        id: election.id,
        address: election.address,
        title: election.title,
        supervised: election.supervised,
      }}
      state={{
        phase: state.phase as Phase,
        registered: state.registered,
        totalBallots: state.totalBallots,
      }}
      positions={positions}
      students={students.map((student) => ({
        studentId: student.studentId,
        fullName: student.fullName,
        programme: student.programme,
        status: student.status,
        activated: Boolean(student.passwordHash),
        onChain: student.rolledInto.includes(election.id),
      }))}
      pendingCount={pending.length}
      labels={dict.console}
      phases={dict.phase}
      enrolment={dict.enrolment}
      common={dict.common}
      photo={dict.photo}
      unionRows={unionRows}
      union={dict.union}
      security={dict.security}
      checkIn={dict.checkIn}
      auditRows={auditRows}
    />,
  );
}
