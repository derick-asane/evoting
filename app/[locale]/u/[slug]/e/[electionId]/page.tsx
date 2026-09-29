import { notFound } from "next/navigation";

import { ElectionResults } from "@/app/components/election-results";
import { findElection } from "@/lib/elections";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { findUniversityBySlug } from "@/lib/universities";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/u/[slug]/e/[electionId]">) {
  const { electionId } = await params;
  const election = await findElection(electionId);
  return { title: election?.title ?? "Election" };
}

/**
 * One election, current or past.
 *
 * Renders the same component as the live results page, so an archived result
 * cannot drift from how it looked while the polls were open.
 */
export default async function ArchivedElectionPage({
  params,
}: PageProps<"/[locale]/u/[slug]/e/[electionId]">) {
  const { slug, electionId } = await params;

  const [dict, locale, university, election] = await Promise.all([
    getDictionary(),
    getLocale(),
    findUniversityBySlug(slug),
    findElection(electionId),
  ]);

  // The election must belong to the university in the URL, or one institution's
  // link could be used to render another's result under their name.
  if (!university || !election || election.universityId !== university.id) {
    notFound();
  }

  return <ElectionResults election={election} dict={dict} locale={locale} />;
}
