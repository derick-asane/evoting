import { notFound } from "next/navigation";

import { ElectionResults } from "@/app/components/election-results";
import { Notice } from "@/app/components/ui";
import { currentElection } from "@/lib/elections";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { findUniversityBySlug } from "@/lib/universities";

export const dynamic = "force-dynamic";
export const metadata = { title: "Results" };

/** The current election's results. Past ones live under /e/[electionId]. */
export default async function ResultsPage({
  params,
}: PageProps<"/[locale]/u/[slug]/results">) {
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

  return <ElectionResults election={election} dict={dict} locale={locale} />;
}
