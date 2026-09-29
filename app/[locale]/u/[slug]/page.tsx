import { notFound } from "next/navigation";

import {
  BallotIcon,
  ChartIcon,
  UsersIcon,
} from "@/app/components/icons";
import { Portrait } from "@/app/components/portrait";
import {
  ButtonLink,
  Card,
  CardTitle,
  Mono,
  Notice,
  PhaseBadge,
  Stat,
} from "@/app/components/ui";
import {
  PHASE_DESCRIPTION_KEY,
  PHASE_KEY,
  Phase,
  getBallot,
  getElectionState,
} from "@/lib/election";
import { extrasKey, getCandidateExtras } from "@/lib/candidates";
import { currentElection } from "@/lib/elections";
import { countUnionMembers } from "@/lib/union";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getStudentSession } from "@/lib/session";
import { findUniversityBySlug } from "@/lib/universities";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/u/[slug]">) {
  const { slug } = await params;
  const university = await findUniversityBySlug(slug);
  return { title: university?.name ?? "University" };
}

export default async function UniversityHome({
  params,
}: PageProps<"/[locale]/u/[slug]">) {
  const { slug } = await params;
  const [dict, locale, university] = await Promise.all([
    getDictionary(),
    getLocale(),
    findUniversityBySlug(slug),
  ]);
  if (!university) notFound();

  const election = await currentElection(university.id);

  if (!election) {
    return (
      <Notice tone="warning">
        {university.name} {dict.common.noElectionYet}
      </Notice>
    );
  }

  const [state, ballot, session, extras, unionSize] = await Promise.all([
    getElectionState(election.address),
    getBallot(election.address),
    getStudentSession(),
    getCandidateExtras(election.id),
    countUnionMembers(university.id),
  ]);

  const signedIn = session?.universityId === university.id;
  const turnout =
    state.registered > 0
      ? Math.round((state.totalBallots / state.registered) * 100)
      : 0;
  const base = `/${locale}/u/${slug}`;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-8 shadow-card">
        <div
          className="bg-aurora absolute inset-0 opacity-70"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <PhaseBadge phase={state.phase} label={dict.phase[PHASE_KEY[state.phase]]} />
            <h1 className="mt-4 text-balance font-display text-4xl leading-tight tracking-tight sm:text-5xl">
              {state.title}
            </h1>
            <p className="mt-3 leading-relaxed text-ink-soft">
              {dict.phase[PHASE_DESCRIPTION_KEY[state.phase]]}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {state.phase === Phase.Voting ? (
              <ButtonLink
                href={signedIn ? `${base}/vote` : `${base}/login`}
                withArrow
              >
                {signedIn ? dict.common.castBallot : dict.common.signInToVote}
              </ButtonLink>
            ) : null}
            <ButtonLink href={`${base}/results`} variant="secondary">
              {dict.common.viewResults}
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={dict.results.positionsLabel}
          value={state.positionCount}
          icon={<BallotIcon size={17} />}
        />
        <Stat
          label={dict.common.onTheRoll}
          value={state.registered}
          icon={<UsersIcon size={17} />}
        />
        <Stat
          label={dict.common.ballotsCast}
          value={state.totalBallots}
          sub={state.registered > 0 ? `${turnout}% ${dict.common.turnout.toLowerCase()}` : undefined}
          icon={<ChartIcon size={17} />}
          accent
        />
      </div>

      {/* One card per post, so a voter can see the whole slate before voting. */}
      {ballot.length > 0 ? (
        ballot.map((position) => (
          <Card key={position.id}>
            <CardTitle icon={<BallotIcon size={19} />}>{position.title}</CardTitle>
            <ul className="grid gap-3 sm:grid-cols-2">
              {position.candidates.map((candidate) => {
                const extra = extras.get(extrasKey(position.id, candidate.id));
                return (
                  <li
                    key={candidate.id}
                    className="flex items-start gap-4 rounded-xl border border-line bg-surface-muted px-4 py-3.5"
                  >
                    <Portrait
                      photoId={extra?.photoId ?? null}
                      name={candidate.name}
                      index={candidate.id}
                      size={56}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{candidate.name}</p>
                      {candidate.party ? (
                        <p className="truncate text-sm text-ink-soft">
                          {candidate.party}
                        </p>
                      ) : null}
                      {extra?.manifesto ? (
                        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                          {extra.manifesto}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))
      ) : (
        <Notice tone="warning">{dict.student.noCandidates}</Notice>
      )}

      {unionSize > 0 ? (
        <ButtonLink href={`${base}/union`} variant="secondary" withArrow>
          {dict.union.seeTeam}
        </ButtonLink>
      ) : null}

      <p className="text-xs text-ink-faint">
        {dict.common.electionContract} <Mono>{election.address}</Mono>
      </p>
    </div>
  );
}
