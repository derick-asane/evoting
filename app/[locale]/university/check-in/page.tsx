import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckInDesk, CheckInLog, type DeskRowView } from "./desk";
import { Card, Mono, Notice } from "@/app/components/ui";
import { checkInTally, recentCheckIns } from "@/lib/check-in";
import { Phase, getElectionState } from "@/lib/election";
import { currentElection } from "@/lib/elections";
import { formatDateTime } from "@/lib/i18n";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getUniversitySession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Check-in desk" };

/**
 * A screen for one job: clearing students to vote, one at a time.
 *
 * Deliberately its own page rather than a card in the console. Whoever runs
 * the desk has this open for hours and does nothing else with it, and the
 * console is full of controls that would be dangerous to reach for by
 * accident with a queue in front of you.
 */
export default async function CheckInPage() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);

  const university = await getUniversitySession();
  if (!university) redirect(`/${locale}/university/login`);

  const election = await currentElection(university.id);
  const consoleHref = `/${locale}/university/console`;

  if (!election) {
    return (
      <Shell title={dict.checkIn.title} back={consoleHref} backLabel={dict.checkIn.backToConsole}>
        <Card>
          <p className="text-sm text-ink-soft">{dict.checkIn.noElection}</p>
        </Card>
      </Shell>
    );
  }

  const [state, rows, tally] = await Promise.all([
    getElectionState(election.address).catch(() => null),
    recentCheckIns(election.id),
    checkInTally(election.id),
  ]);

  const view: DeskRowView[] = rows.map((row) => ({
    id: row.id,
    studentId: row.studentId,
    fullName: row.fullName,
    issuedBy: row.issuedBy,
    issuedAt: formatDateTime(locale, Math.floor(row.issuedAt.getTime() / 1000)),
    state: row.state,
  }));

  return (
    <Shell
      title={dict.checkIn.title}
      back={consoleHref}
      backLabel={dict.checkIn.backToConsole}
      subtitle={election.title}
    >
      {!election.supervised ? (
        <Notice tone="warning">{dict.checkIn.notSupervised}</Notice>
      ) : null}

      {state && state.phase !== Phase.Voting ? (
        <Notice tone="info">{dict.checkIn.notVoting}</Notice>
      ) : null}

      <CheckInDesk
        electionId={election.id}
        locale={locale}
        labels={dict.checkIn}
      />

      <CheckInLog
        rows={view}
        issued={tally.issued}
        used={tally.used}
        labels={dict.checkIn}
      />
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  back,
  backLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  back: string;
  backLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href={back}
          className="text-sm text-ink-soft underline underline-offset-4 transition hover:text-ink"
        >
          {backLabel}
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-ink-soft">
            <Mono>{subtitle}</Mono>
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
