import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "./form";
import { AuthShell } from "@/app/components/auth-shell";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getUniversitySession } from "@/lib/session";

export const metadata = { title: "Create a university account" };

export default async function SignUpPage() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  if (await getUniversitySession()) redirect(`/${locale}/university/console`);

  return (
    <AuthShell
      eyebrow={dict.auth.universityEyebrow}
      title={dict.university.signUpTitle}
      lead={dict.university.signUpLead}
      panelTitle={dict.auth.panelUniversityTitle}
      panelPoints={[
        dict.auth.panelUniversityPoint1,
        dict.auth.panelUniversityPoint2,
        dict.auth.panelUniversityPoint3,
      ]}
      footer={
        <>
          {dict.university.alreadyRegistered}{" "}
          <Link
            href={`/${locale}/university/login`}
            className="font-medium text-brand underline underline-offset-4"
          >
            {dict.university.signIn}
          </Link>
        </>
      }
    >
      <SignUpForm
        locale={locale}
        labels={{
          institutionName: dict.university.institutionName,
          institutionNameHint: dict.university.institutionNameHint,
          contactEmail: dict.university.contactEmail,
          contactEmailHint: dict.university.contactEmailHint,
          adminPassword: dict.university.adminPassword,
          adminPasswordHint: dict.university.adminPasswordHint,
          confirmPassword: dict.university.confirmPassword,
          creating: dict.university.creating,
          submit: dict.university.createAccount,
          showPassword: dict.auth.showPassword,
          hidePassword: dict.auth.hidePassword,
          secureNotice: dict.auth.secureNotice,
        }}
      />
    </AuthShell>
  );
}
