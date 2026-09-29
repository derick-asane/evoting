"use server";

import { redirect } from "next/navigation";

import { recordAudit } from "@/lib/audit";
import { getDictionaryFor, DEFAULT_LOCALE, t, type Dictionary } from "@/lib/i18n";
import { redeemStudentReset } from "@/lib/password-reset";
import {
  checkLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/throttle";
import {
  createStudentSession,
  createUniversitySession,
  destroyStudentSession,
  destroyUniversitySession,
  getStudentSession,
} from "@/lib/session";
import { findStudent, verifyCredentials } from "@/lib/students";
import {
  createUniversity,
  findUniversityById,
  findUniversityBySlug,
  verifyUniversityLogin,
} from "@/lib/universities";

export type FormState = { error?: string; notice?: string };

/** "Try again in N minutes", rounded up so it never reads as 0. */
function lockoutMessage(seconds: number, dict: Dictionary): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return t(dict.errors.tooManyAttempts, { minutes });
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Server Actions cannot read the `[locale]` route segment (`next/root-params`
 * is Server Components only), so every localised form posts its locale.
 */
function localeOf(form: FormData): string {
  return field(form, "locale") || DEFAULT_LOCALE;
}

// --- Students ---------------------------------------------------------------

export async function studentSignIn(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form);
  const dict = getDictionaryFor(locale);

  const slug = field(form, "slug");
  const studentId = field(form, "studentId");
  const password = form.get("password");

  if (!studentId || typeof password !== "string" || !password) {
    return { error: dict.errors.enterCredentials };
  }

  const university = await findUniversityBySlug(slug);
  if (!university) return { error: dict.errors.unknownUniversity };

  // Throttle on the identifier before any password work, and on an identifier
  // that may not exist, so a lockout never confirms an account is real.
  const throttleKey = `${university.id}:${studentId.toUpperCase()}`;
  const allowed = await checkLoginAllowed("student", throttleKey);
  if (allowed.blocked) {
    return { error: lockoutMessage(allowed.retryAfterSeconds, dict) };
  }

  const student = await verifyCredentials(university.id, studentId, password);
  if (!student) {
    await recordLoginFailure("student", throttleKey);
    // Deliberately vague: distinguishing "no such student" from "wrong
    // password" would let anyone test whether an ID is on the roll.
    return { error: dict.errors.badCredentials };
  }

  await clearLoginFailures("student", throttleKey);

  await createStudentSession({
    universityId: university.id,
    universitySlug: university.slug,
    studentId: student.studentId,
    fullName: student.fullName,
  });
  redirect(`/${locale}/u/${university.slug}/vote`);
}

/**
 * Claims an account using the activation code the committee handed over.
 *
 * The code is the identity proof, not the matriculation number. A number on
 * its own used to be enough here, which meant every account nobody had logged
 * into yet belonged to whoever typed the number first.
 */
export async function studentActivate(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form);
  const dict = getDictionaryFor(locale);

  const slug = field(form, "slug");
  const code = field(form, "code");
  const password = form.get("password");
  const confirm = form.get("confirmPassword");

  if (!code || typeof password !== "string" || !password) {
    return { error: dict.errors.enterCodeAndPassword };
  }
  if (password !== confirm) {
    return { error: dict.errors.passwordsDoNotMatch };
  }

  const university = await findUniversityBySlug(slug);
  if (!university) return { error: dict.errors.unknownUniversity };

  // Throttled on the code, because the code is now the thing worth guessing.
  const allowed = await checkLoginAllowed("student", `activate:${code}`);
  if (allowed.blocked) {
    return { error: lockoutMessage(allowed.retryAfterSeconds, dict) };
  }

  const result = await redeemStudentReset({
    code,
    password,
    confirm: typeof confirm === "string" ? confirm : "",
  });

  if (!result.ok) {
    await recordLoginFailure("student", `activate:${code}`);
    const messages: Record<typeof result.code, string> = {
      badCode: dict.errors.resetBadCode,
      expired: dict.errors.resetExpired,
      used: dict.errors.activateCodeUsed,
      passwordShort: dict.reasons.activatePasswordShort,
      mismatch: dict.errors.passwordsDoNotMatch,
    };
    return { error: messages[result.code] };
  }

  // A code issued by one committee must not open a session at another
  // institution, whichever login page it was typed into.
  if (result.universityId !== university.id) {
    return { error: dict.errors.resetBadCode };
  }

  await clearLoginFailures("student", `activate:${code}`);

  const student = await findStudent(result.universityId, result.studentId);
  if (!student) return { error: dict.errors.resetBadCode };

  await recordAudit({
    universityId: result.universityId,
    actor: `student:${result.studentId}`,
    action: "account.activated",
    summary: `${result.studentId} claimed their account with an activation code.`,
    targetId: result.studentId,
  });

  await createStudentSession({
    universityId: university.id,
    universitySlug: university.slug,
    studentId: student.studentId,
    fullName: student.fullName,
  });
  redirect(`/${locale}/u/${university.slug}/vote`);
}

export async function studentSignOut(): Promise<void> {
  const session = await getStudentSession();
  await destroyStudentSession();
  redirect(
    session
      ? `/${DEFAULT_LOCALE}/signed-out?from=${encodeURIComponent(session.universitySlug)}`
      : `/${DEFAULT_LOCALE}/signed-out`,
  );
}

/**
 * Sets a new password from a code issued by the committee.
 *
 * Throttled on the code itself: without that, the code space is guessable by
 * an attacker willing to loop.
 */
export async function studentResetPassword(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form);
  const dict = getDictionaryFor(locale);

  const code = field(form, "code");
  const password = form.get("password");
  const confirm = form.get("confirmPassword");

  if (!code || typeof password !== "string" || !password) {
    return { error: dict.errors.enterCodeAndPassword };
  }

  const allowed = await checkLoginAllowed("student", `reset:${code}`);
  if (allowed.blocked) {
    return { error: lockoutMessage(allowed.retryAfterSeconds, dict) };
  }

  const result = await redeemStudentReset({
    code,
    password,
    confirm: typeof confirm === "string" ? confirm : "",
  });

  if (!result.ok) {
    await recordLoginFailure("student", `reset:${code}`);
    const messages: Record<typeof result.code, string> = {
      badCode: dict.errors.resetBadCode,
      expired: dict.errors.resetExpired,
      used: dict.errors.resetUsed,
      passwordShort: dict.reasons.activatePasswordShort,
      mismatch: dict.errors.passwordsDoNotMatch,
    };
    return { error: messages[result.code] };
  }

  await clearLoginFailures("student", `reset:${code}`);
  await recordAudit({
    universityId: result.universityId,
    actor: `student:${result.studentId}`,
    action: "password.reset_redeemed",
    summary: `${result.studentId} set a new password using a reset code.`,
    targetId: result.studentId,
  });

  const university = await findUniversityById(result.universityId);
  redirect(
    university
      ? `/${locale}/u/${university.slug}/login?reset=done`
      : `/${locale}`,
  );
}

// --- Universities -----------------------------------------------------------

export async function universitySignUp(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form);
  const dict = getDictionaryFor(locale);

  const name = field(form, "name");
  const contactEmail = field(form, "contactEmail");
  const password = form.get("password");
  const confirm = form.get("confirmPassword");

  if (typeof password !== "string" || !password) {
    return { error: dict.errors.choosePassword };
  }
  if (password !== confirm) {
    return { error: dict.errors.passwordsDoNotMatch };
  }

  const result = await createUniversity({ name, contactEmail, password });
  if (!result.ok) {
    const messages = {
      nameTooShort: dict.reasons.signUpNameTooShort,
      badSlug: dict.reasons.signUpBadSlug,
      badEmail: dict.reasons.signUpBadEmail,
      passwordShort: dict.reasons.signUpPasswordShort,
      nameTaken: dict.reasons.signUpNameTaken,
      emailTaken: dict.reasons.signUpEmailTaken,
      chainUnreachable: dict.reasons.signUpChainUnreachable,
    };
    return { error: messages[result.code] };
  }

  await createUniversitySession(result.university.id);
  redirect(`/${locale}/university/console`);
}

export async function universitySignIn(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const locale = localeOf(form);
  const dict = getDictionaryFor(locale);

  const contactEmail = field(form, "contactEmail");
  const password = form.get("password");

  if (!contactEmail || typeof password !== "string" || !password) {
    return { error: dict.errors.enterEmailAndPassword };
  }

  const allowed = await checkLoginAllowed("university", contactEmail);
  if (allowed.blocked) {
    return { error: lockoutMessage(allowed.retryAfterSeconds, dict) };
  }

  const university = await verifyUniversityLogin(contactEmail, password);
  if (!university) {
    await recordLoginFailure("university", contactEmail);
    return { error: dict.errors.badEmailOrPassword };
  }

  await clearLoginFailures("university", contactEmail);
  await recordAudit({
    universityId: university.id,
    actor: `committee:${university.contactEmail}`,
    action: "auth.committee_signed_in",
    summary: "Signed in to the committee console.",
  });

  await createUniversitySession(university.id);
  redirect(`/${locale}/university/console`);
}

export async function universitySignOut(): Promise<void> {
  await destroyUniversitySession();
  redirect(`/${DEFAULT_LOCALE}/signed-out`);
}
