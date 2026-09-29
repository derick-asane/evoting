import Link from "next/link";
import { notFound } from "next/navigation";

import { studentSignOut } from "@/app/actions/auth";
import { AccountMenu } from "@/app/components/account-menu";
import { AlertIcon, BellIcon } from "@/app/components/icons";
import { listForStudent } from "@/lib/notifications";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getStudentSession } from "@/lib/session";
import { findUniversityBySlug } from "@/lib/universities";

export default async function UniversityLayout({
  children,
  params,
}: LayoutProps<"/[locale]/u/[slug]">) {
  const { slug } = await params;
  const [dict, locale, university] = await Promise.all([
    getDictionary(),
    getLocale(),
    findUniversityBySlug(slug),
  ]);
  if (!university) notFound();

  const session = await getStudentSession();
  const signedIn = session?.universityId === university.id ? session : null;

  const unread = signedIn
    ? (await listForStudent(university.id, signedIn.studentId)).filter(
        (entry) => !entry.readAt,
      )
    : [];

  const base = `/${locale}/u/${slug}`;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-card">
        <Link href={base} className="font-semibold tracking-tight">
          {university.name}
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href={`${base}/results`}
            className="rounded-lg px-2.5 py-1.5 text-ink-soft transition hover:bg-surface-muted hover:text-ink"
          >
            {dict.nav.results}
          </Link>
          <Link
            href={`${base}/elections`}
            className="rounded-lg px-2.5 py-1.5 text-ink-soft transition hover:bg-surface-muted hover:text-ink"
          >
            {dict.archive.navLabel}
          </Link>
          <Link
            href={`${base}/union`}
            className="rounded-lg px-2.5 py-1.5 text-ink-soft transition hover:bg-surface-muted hover:text-ink"
          >
            {dict.union.navLabel}
          </Link>
          <Link
            href={`${base}/verify`}
            className="rounded-lg px-2.5 py-1.5 text-ink-soft transition hover:bg-surface-muted hover:text-ink"
          >
            {dict.nav.verify}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {signedIn ? (
            <AccountMenu
              name={signedIn.fullName}
              detail={signedIn.studentId}
              signOut={studentSignOut}
              labels={{
                menu: dict.auth.accountMenu,
                signOut: dict.nav.signOut,
                question: dict.auth.signOutQuestion,
                body: dict.auth.signOutBody,
                confirm: dict.auth.confirmSignOut,
                cancel: dict.auth.cancel,
              }}
            />
          ) : (
            <Link
              href={`${base}/login`}
              className="rounded-xl border border-line px-3 py-1.5 font-medium transition hover:bg-surface-muted"
            >
              {dict.nav.studentSignIn}
            </Link>
          )}
        </div>
      </div>

      {unread.length > 0 ? (
        /* "A ballot was cast in your name" is the one alert here that might be
           bad news, so it does not get the same friendly blue as "voting is
           open" — a student has to be able to tell the two apart at a glance,
           and the whole point of the alert is that it gets noticed. It also
           drops the call to action: there is nothing useful to click, the
           thing to do is talk to the committee. */
        (() => {
          const alarming = unread.some((entry) => entry.kind === "ballot_cast");
          const goToBallot = unread.some((entry) => entry.kind === "voting_open");

          return (
            <div
              role={alarming ? "alert" : "status"}
              className={`flex flex-wrap items-start gap-4 rounded-2xl border p-5 ${
                alarming
                  ? "border-warning/30 bg-warning-wash"
                  : "border-brand/25 bg-brand-wash"
              }`}
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  alarming
                    ? "bg-warning text-surface"
                    : "bg-brand text-brand-ink"
                }`}
              >
                {alarming ? <AlertIcon size={19} /> : <BellIcon size={19} />}
              </span>
              <div className="min-w-56 flex-1">
                {unread.slice(0, 2).map((notification) => (
                  <div key={notification.id} className="text-sm">
                    <p
                      className={`font-semibold ${
                        notification.kind === "ballot_cast"
                          ? "text-warning"
                          : "text-brand"
                      }`}
                    >
                      {notification.title}
                    </p>
                    <p className="mt-0.5 leading-relaxed text-ink">
                      {notification.body}
                    </p>
                  </div>
                ))}
              </div>
              {alarming ? null : (
                <Link
                  href={goToBallot ? `${base}/vote` : `${base}/results`}
                  className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-bright"
                >
                  {goToBallot
                    ? dict.notification.goToBallot
                    : dict.notification.viewResult}
                </Link>
              )}
            </div>
          );
        })()
      ) : null}

      {children}
    </div>
  );
}
