import Link from "next/link";
import { notFound } from "next/navigation";

import { ResetForm } from "./reset-form";
import { AuthShell } from "@/app/components/auth-shell";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { findUniversityBySlug } from "@/lib/universities";

export const metadata = { title: "Set a new password" };

export default async function ResetPage({
  params,
}: PageProps<"/[locale]/u/[slug]/reset">) {
  const { slug } = await params;
  const [dict, locale, university] = await Promise.all([
    getDictionary(),
    getLocale(),
    findUniversityBySlug(slug),
  ]);
  if (!university) notFound();

  return (
    <AuthShell
      eyebrow={dict.auth.studentEyebrow}
      title={dict.security.resetTitle}
      lead={dict.security.resetLead}
      panelTitle={dict.auth.panelStudentTitle}
      panelPoints={[
        dict.auth.panelStudentPoint1,
        dict.auth.panelStudentPoint2,
        dict.auth.panelStudentPoint3,
      ]}
      footer={
        <Link
          href={`/${locale}/u/${slug}/login`}
          className="font-medium text-brand underline underline-offset-4"
        >
          {dict.student.tabSignIn}
        </Link>
      }
    >
      <ResetForm
        locale={locale}
        labels={{
          resetCode: dict.security.resetCode,
          resetCodeHint: dict.security.resetCodeHint,
          choosePassword: dict.student.choosePassword,
          confirmPassword: dict.student.confirmPassword,
          passwordHint: dict.student.passwordHint,
          submit: dict.security.resetSubmit,
          working: dict.common.working,
          showPassword: dict.auth.showPassword,
          hidePassword: dict.auth.hidePassword,
        }}
      />
    </AuthShell>
  );
}
