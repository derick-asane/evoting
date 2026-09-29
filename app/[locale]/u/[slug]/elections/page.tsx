import Link from "next/link";
import { notFound } from "next/navigation";

import { BallotIcon, LedgerIcon } from "@/app/components/icons";
import { Card, Mono, Notice, PhaseBadge } from "@/app/components/ui";
import { PHASE_KEY, getElectionState } from "@/lib/election";
import { listElections } from "@/lib/elections";
import { formatDateTime, t } from "@/lib/i18n";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { findUniversityBySlug } from "@/lib/universities";

export const dynamic = "force-dynamic";
export const metadata = { title: "Past elections" };

export default async function ElectionsPage({
  params,
}: PageProps<"/[locale]/u/[slug]/elections">) {
  const { slug } = await params;
  const [dict, locale, university] = await Promise.all([
    getDictionary(),
    getLocale(),
    findUniversityBySlug(slug),
  ]);
  if (!university) notFound();

  const elections = await listElections(university.id);

  // Read each contract for its own state; the database only records where it
  // lives, never what it says.
  const entries = await Promise.all(
    elections.map(async (election) => {
      try {
        return { election, state: await getElectionState(election.address) };
      } catch {
        return { election, state: null };
      }
    }),
  );

  const base = `/${locale}/u/${slug}`;

  return (
    <div className="space-y-6">
      <div>
        <span className="mb-3 inline-flex size-11 items-center justify-center rounded-2xl bg-brand-wash text-brand">
          <LedgerIcon size={21} />
        </span>
        <h1 className="font-display text-3xl tracking-tight">
          {dict.archive.title}
        </h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
          {dict.archive.lead}
        </p>
      </div>

      {entries.length === 0 ? (
        <Notice tone="warning">{dict.archive.empty}</Notice>
      ) : (
        <ul className="space-y-4">
          {entries.map(({ election, state }, index) => (
            <li key={election.id}>
              <Link href={`${base}/e/${election.id}`} className="block">
                <Card interactive>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-wash text-brand">
                        <BallotIcon size={19} />
                      </span>
                      <div>
                        <h2 className="font-semibold leading-tight">
                          {election.title}
                          {index === 0 ? (
                            <span className="ml-2 rounded-full bg-brand-wash px-2 py-0.5 text-xs font-medium text-brand">
                              {dict.archive.current}
                            </span>
                          ) : null}
                        </h2>
                        <p className="mt-1 text-sm text-ink-soft">
                          {t(dict.archive.deployedOn, {
                            date: formatDateTime(
                              locale,
                              Math.floor(election.createdAt.getTime() / 1000),
                            ),
                          })}
                        </p>
                      </div>
                    </div>
                    {state ? (
                      <PhaseBadge
                        phase={state.phase}
                        label={dict.phase[PHASE_KEY[state.phase]]}
                      />
                    ) : (
                      <span className="text-xs text-danger">
                        {dict.archive.unreachable}
                      </span>
                    )}
                  </div>

                  {state ? (
                    <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                      {/* One list per pair, so each label stays bound to its
                          own value rather than to the whole group. */}
                      <dl>
                        <dt className="text-ink-faint">
                          {dict.results.positionsLabel}
                        </dt>
                        <dd className="numeric font-medium">
                          {state.positionCount}
                        </dd>
                      </dl>
                      <dl>
                        <dt className="text-ink-faint">
                          {dict.common.ballotsCast}
                        </dt>
                        <dd className="numeric font-medium">
                          {state.totalBallots} {dict.common.of} {state.registered}
                        </dd>
                      </dl>
                    </div>
                  ) : null}

                  <p className="mt-4 border-t border-line pt-3 text-xs text-ink-faint">
                    <Mono>{election.address}</Mono>
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
