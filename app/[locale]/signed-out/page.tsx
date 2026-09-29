import { ButtonLink, Card } from "@/app/components/ui";
import { CheckIcon } from "@/app/components/icons";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { findUniversityBySlug } from "@/lib/universities";

export const dynamic = "force-dynamic";
export const metadata = { title: "Signed out" };

/**
 * Where sign-out lands. A blank redirect to the home page leaves people
 * wondering whether it worked, which matters more than usual when the thing
 * they just did was vote.
 */
export default async function SignedOutPage({
  searchParams,
}: PageProps<"/[locale]/signed-out">) {
  const [dict, locale, query] = await Promise.all([
    getDictionary(),
    getLocale(),
    searchParams,
  ]);

  const slug = typeof query.from === "string" ? query.from : undefined;
  const university = slug ? await findUniversityBySlug(slug) : null;
  const home = university ? `/${locale}/u/${university.slug}` : `/${locale}`;
  const signIn = university
    ? `/${locale}/u/${university.slug}/login`
    : `/${locale}/university/login`;

  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-positive-wash text-positive">
        <CheckIcon size={26} />
      </span>
      <h1 className="font-display text-3xl tracking-tight">
        {dict.auth.signedOutTitle}
      </h1>
      <p className="mx-auto mt-3 max-w-sm leading-relaxed text-ink-soft">
        {dict.auth.signedOutBody}
      </p>

      <Card className="mt-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href={signIn}>{dict.auth.signBackIn}</ButtonLink>
          <ButtonLink href={home} variant="secondary">
            {dict.auth.backHome}
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
