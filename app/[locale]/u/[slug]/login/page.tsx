import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AuthForms } from "./auth-forms";
import { AuthShell } from "@/app/components/auth-shell";
import { Notice } from "@/app/components/ui";
import { t } from "@/lib/i18n";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getStudentSession } from "@/lib/session";
import { findUniversityBySlug } from "@/lib/universities";

export const metadata = { title: "Student sign in" };

export default async function StudentLoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/u/[slug]/login">) {
  const { slug } = await params;
  const [dict, locale, university, query] = await Promise.all([
    getDictionary(),
    getLocale(),
    findUniversityBySlug(slug),
    searchParams,
  ]);
  if (!university) notFound();

  const justReset = query.reset === "done";

  const session = await getStudentSession();
  if (session?.universityId === university.id) {
    redirect(`/${locale}/u/${slug}/vote`);
  }

  return (
    <AuthShell
      eyebrow={dict.auth.studentEyebrow}
      title={dict.student.signInTitle}
      lead={t(dict.student.signInLead, { university: university.name })}
      panelTitle={dict.auth.panelStudentTitle}
      panelPoints={[
        dict.auth.panelStudentPoint1,
        dict.auth.panelStudentPoint2,
        dict.auth.panelStudentPoint3,
      ]}
      footer={
        <Link
          href={`/${locale}/u/${slug}/reset`}
          className="font-medium text-brand underline underline-offset-4"
        >
          {dict.security.forgotPassword}
        </Link>
      }
    >
      {justReset ? (
        <div className="mb-5">
          <Notice tone="success">{dict.security.resetDone}</Notice>
        </div>
      ) : null}

      <AuthForms
        slug={slug}
        locale={locale}
        labels={{
          tabSignIn: dict.student.tabSignIn,
          tabActivate: dict.student.tabActivate,
          studentId: dict.student.studentId,
          password: dict.student.password,
          choosePassword: dict.student.choosePassword,
          confirmPassword: dict.student.confirmPassword,
          activationCode: dict.student.activationCode,
          activateHint: dict.student.activateHint,
          activateNoCode: dict.student.activateNoCode,
          passwordHint: dict.student.passwordHint,
          signIn: dict.student.tabSignIn,
          activateSubmit: dict.student.activateSubmit,
          working: dict.common.working,
          showPassword: dict.auth.showPassword,
          hidePassword: dict.auth.hidePassword,
          secureNotice: dict.auth.secureNotice,
        }}
      />
    </AuthShell>
  );
}
