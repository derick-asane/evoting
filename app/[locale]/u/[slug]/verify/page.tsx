import { notFound } from "next/navigation";

import { VerifyForm } from "./verify-form";
import { ShieldIcon } from "@/app/components/icons";
import { listElections } from "@/lib/elections";
import { t } from "@/lib/i18n";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { findUniversityBySlug } from "@/lib/universities";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify a ballot" };

export default async function VerifyPage({
  params,
}: PageProps<"/[locale]/u/[slug]/verify">) {
  const { slug } = await params;
  const [dict, locale, university] = await Promise.all([
    getDictionary(),
    getLocale(),
    findUniversityBySlug(slug),
  ]);
  if (!university) notFound();

  // Receipts are checked against every election this university has run, so a
  // code from a previous year still works.
  const elections = await listElections(university.id);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-wash text-brand">
          <ShieldIcon size={22} />
        </span>
        <h1 className="font-display text-3xl tracking-tight">
          {dict.verify.title}
        </h1>
        <p className="mt-2 leading-relaxed text-ink-soft">
          {dict.verify.leadAnyElection}
        </p>
        {elections.length > 0 ? (
          <p className="mt-1 text-sm text-ink-faint">
            {t(dict.verify.searchesCount, { count: elections.length })}
          </p>
        ) : null}
      </div>
      <VerifyForm
        slug={slug}
        locale={locale}
        labels={{
          receiptCode: dict.verify.receiptCode,
          submit: dict.verify.submit,
          checking: dict.verify.checking,
          foundTitle: dict.verify.foundTitle,
          foundIn: dict.verify.foundIn,
          foundWarning: dict.verify.foundWarning,
        }}
      />
    </div>
  );
}
