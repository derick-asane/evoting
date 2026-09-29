import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm } from "./form";
import { AuthShell } from "@/app/components/auth-shell";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getUniversitySession } from "@/lib/session";

export const metadata = { title: "University sign in" };

export default async function UniversityLoginPage() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  if (await getUniversitySession()) redirect(`/${locale}/university/console`);

  return (
    <AuthShell
      eyebrow={dict.auth.universityEyebrow}
      title={dict.university.signInTitle}
      lead={dict.university.signInLead}
      panelTitle={dict.auth.panelUniversityTitle}
      panelPoints={[
        dict.auth.panelUniversityPoint1,
        dict.auth.panelUniversityPoint2,
        dict.auth.panelUniversityPoint3,
      ]}
      footer={
        <>
          {dict.university.noAccount}{" "}
          <Link
            href={`/${locale}/university/signup`}
            className="font-medium text-brand underline underline-offset-4"
          >
            {dict.university.createOne}
          </Link>
        </>
      }
    >
      <SignInForm
        locale={locale}
        labels={{
          contactEmail: dict.university.contactEmail,
          adminPassword: dict.university.adminPassword,
          signingIn: dict.university.signingIn,
          submit: dict.university.signIn,
          showPassword: dict.auth.showPassword,
          hidePassword: dict.auth.hidePassword,
          secureNotice: dict.auth.secureNotice,
        }}
      />
    </AuthShell>
  );
}
