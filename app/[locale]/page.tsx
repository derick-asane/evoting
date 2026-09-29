import Link from "next/link";

import { BallotHero } from "@/app/components/hero-art";
import {
  BallotIcon,
  LedgerIcon,
  LockIcon,
  ShieldIcon,
} from "@/app/components/icons";
import {
  ButtonLink,
  Card,
  PhaseBadge,
  SectionHeading,
} from "@/app/components/ui";
import { PHASE_KEY, getElectionState } from "@/lib/election";
import { currentElection } from "@/lib/elections";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { listUniversities } from "@/lib/universities";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [dict, locale, universities] = await Promise.all([
    getDictionary(),
    getLocale(),
    listUniversities(),
  ]);

  const entries = await Promise.all(
    universities.map(async (university) => {
      const election = await currentElection(university.id);
      if (!election) return { university, election: null, state: null };
      try {
        return {
          university,
          election,
          state: await getElectionState(election.address),
        };
      } catch {
        // The chain may be unreachable; still list the institution.
        return { university, election, state: null };
      }
    }),
  );

  const totalBallots = entries.reduce(
    (sum, entry) => sum + (entry.state?.totalVotes ?? 0),
    0,
  );

  return (
    <div className="space-y-20">
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative -mx-6 -mt-10 overflow-hidden px-6 pb-16 pt-14 sm:rounded-3xl">
        <div className="bg-aurora absolute inset-0 -z-20" aria-hidden />
        <div
          className="bg-grid absolute inset-0 -z-10 opacity-[0.35] [mask-image:radial-gradient(75%_65%_at_50%_35%,black,transparent)]"
          aria-hidden
        />

        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-surface/70 px-3 py-1 text-xs font-semibold text-brand backdrop-blur">
              <LockIcon size={14} />
              {dict.home.badge}
            </span>

            <h1 className="mt-5 text-balance font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
              {dict.home.titleLead}{" "}
              <span className="text-brand">{dict.home.titleAccent}</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              {dict.home.lead}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={`/${locale}/university/signup`} withArrow>
                {dict.home.createAccount}
              </ButtonLink>
              <ButtonLink
                href={`/${locale}/university/login`}
                variant="secondary"
              >
                {dict.home.signIn}
              </ButtonLink>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
              <HeroFact
                value={universities.length}
                label={dict.home.statInstitutions}
              />
              <HeroFact value={totalBallots} label={dict.home.statBallots} />
              <HeroFact value="0" label={dict.home.statAlterable} />
            </div>
          </div>

          <BallotHero className="hidden lg:block" />
        </div>
      </section>

      {/* -------------------------------------------------------- Institutions */}
      <section>
        <SectionHeading
          eyebrow={dict.home.institutionsEyebrow}
          title={dict.home.institutionsTitle}
          lead={dict.home.institutionsLead}
        />

        <div className="mt-7">
          {entries.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-soft">
                {dict.home.noUniversities}{" "}
                <Link
                  href={`/${locale}/university/signup`}
                  className="font-medium text-brand underline underline-offset-4"
                >
                  {dict.home.createFirst}
                </Link>{" "}
                {dict.home.createFirstTail}
              </p>
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {entries.map(({ university, election, state }) => (
                <li key={university.id}>
                  <Link
                    href={`/${locale}/u/${university.slug}`}
                    className="block h-full"
                  >
                    <Card interactive className="h-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-wash text-brand">
                            <BallotIcon size={19} />
                          </span>
                          <div>
                            <h3 className="font-semibold leading-tight">
                              {university.name}
                            </h3>
                            <p className="mt-0.5 text-sm text-ink-soft">
                              {election ? election.title : dict.home.noElection}
                            </p>
                          </div>
                        </div>
                        {state ? (
                          <PhaseBadge
                            phase={state.phase}
                            label={dict.phase[PHASE_KEY[state.phase]]}
                          />
                        ) : null}
                      </div>

                      {state ? (
                        <div className="mt-5">
                          <Turnout
                            cast={state.totalVotes}
                            roll={state.registered}
                            label={dict.common.turnout}
                            of={dict.common.of}
                          />
                        </div>
                      ) : null}
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------ Guarantees */}
      <section>
        <SectionHeading
          eyebrow={dict.home.trustEyebrow}
          title={dict.home.trustTitle}
          lead={dict.home.trustLead}
        />

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          <Guarantee
            icon={<ShieldIcon size={19} />}
            title={dict.home.guaranteeOneTitle}
            rule={dict.home.guaranteeOneRule}
          >
            {dict.home.guaranteeOneBody}
          </Guarantee>
          <Guarantee
            icon={<LockIcon size={19} />}
            title={dict.home.guaranteeSecretTitle}
            rule={dict.home.guaranteeSecretRule}
          >
            {dict.home.guaranteeSecretBody}
          </Guarantee>
          <Guarantee
            icon={<LedgerIcon size={19} />}
            title={dict.home.guaranteeCountTitle}
            rule={dict.home.guaranteeCountRule}
          >
            {dict.home.guaranteeCountBody}
          </Guarantee>
        </div>
      </section>
    </div>
  );
}

function HeroFact({ value, label }: { value: number | string; label: string }) {
  // Its own list, so the label and the number stay a paired term and value.
  //
  // The term comes first in the DOM, as a definition list requires; the number
  // is lifted above it with flex-col-reverse. Writing them in visual order
  // instead produces a list a screen reader reads backwards.
  return (
    <dl className="flex flex-col-reverse">
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </dt>
      <dd className="numeric text-2xl font-semibold">{value}</dd>
    </dl>
  );
}

function Turnout({
  cast,
  roll,
  label,
  of,
}: {
  cast: number;
  roll: number;
  label: string;
  of: string;
}) {
  const share = roll > 0 ? Math.round((cast / roll) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="text-ink-soft">{label}</span>
        <span className="numeric font-medium">
          {cast} {of} {roll}
          <span className="ml-1.5 text-ink-faint">{share}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${Math.max(share, cast > 0 ? 3 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function Guarantee({
  icon,
  title,
  rule,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  rule: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-wash text-brand">
        {icon}
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
        {children}
      </p>
      <p className="mt-4 border-t border-line pt-3 font-mono text-xs text-ink-faint">
        {rule}
      </p>
    </Card>
  );
}
