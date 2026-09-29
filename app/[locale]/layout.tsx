import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark } from "@/app/components/icons";
import { LocaleSwitch } from "@/app/components/locale-switch";
import { getDictionaryFor, isLocale, LOCALES } from "@/lib/i18n";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Reserved for display headlines, so the UI keeps one voice and the page another. */
const display = Instrument_Serif({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Campus Ballot",
    template: "%s · Campus Ballot",
  },
  description:
    "Student union elections with every ballot recorded on a blockchain.",
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionaryFor(locale);
  const other = locale === "en" ? "fr" : "en";

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-page">
        <a href="#main" className="skip-link">
          {dict.nav.skipToContent}
        </a>
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3.5">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-2.5 font-semibold tracking-tight"
            >
              <BrandMark size={30} />
              {dict.brand.name}
            </Link>

            <div className="ml-auto flex items-center gap-1 text-sm">
              <LocaleSwitch
                current={locale}
                other={other}
                label={dict.locale.switchTo}
              />
              <Link
                href={`/${locale}/university/login`}
                className="rounded-xl px-3 py-2 font-medium text-ink-soft transition hover:bg-surface-muted hover:text-ink"
              >
                {dict.nav.universitySignIn}
              </Link>
              <Link
                href={`/${locale}/university/signup`}
                className="rounded-xl bg-brand px-3.5 py-2 font-semibold text-brand-ink shadow-card transition hover:bg-brand-bright"
              >
                {dict.nav.createAccount}
              </Link>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          {children}
        </main>

        <footer className="mt-8 border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-6xl px-6 py-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-sm">
                <div className="flex items-center gap-2 font-semibold tracking-tight">
                  <BrandMark size={22} />
                  {dict.brand.name}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {dict.brand.tagline}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
                <FooterFact
                  term={dict.footer.oneStudent}
                  detail={dict.footer.oneStudentDetail}
                />
                <FooterFact
                  term={dict.footer.secretBallot}
                  detail={dict.footer.secretBallotDetail}
                />
                <FooterFact
                  term={dict.footer.openCount}
                  detail={dict.footer.openCountDetail}
                />
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

function FooterFact({ term, detail }: { term: string; detail: string }) {
  return (
    <dl>
      <dt className="font-medium">{term}</dt>
      <dd className="text-ink-faint">{detail}</dd>
    </dl>
  );
}
