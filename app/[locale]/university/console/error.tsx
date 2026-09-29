"use client"; // Error boundaries must be Client Components

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Catches anything thrown while rendering the committee console.
 *
 * The usual cause is the election chain being unreachable — a stopped node, a
 * flaky RPC. The committee should see that plainly rather than a stack trace
 * in the middle of running an election.
 *
 * A client component cannot read the `[locale]` route param, so the copy is
 * chosen from the path. Two locales, two short strings; not worth a provider.
 */
const COPY = {
  en: {
    title: "This page could not be loaded",
    chain: "The election chain is not responding right now. Your ballot and every vote already cast are unaffected — they live in the contract, not in this page.",
    generic: "Something went wrong loading this page. Nothing you have already submitted is affected.",
    retry: "Try again",
    detail: "Technical detail",
  },
  fr: {
    title: "Cette page n'a pas pu être chargée",
    chain: "La chaîne du scrutin ne répond pas pour le moment. Votre bulletin et toutes les voix déjà déposées ne sont pas affectés : ils résident dans le contrat, pas dans cette page.",
    generic: "Une erreur est survenue lors du chargement de cette page. Rien de ce que vous avez déjà soumis n'est affecté.",
    retry: "Réessayer",
    detail: "Détail technique",
  },
} as const;

/**
 * Chain-side failures, as viem and undici phrase them.
 *
 * Covers both a node that is not answering and a contract address that no
 * longer holds code — the second happens when a development chain is restarted
 * while the database still points at the old deployment, and reads as
 * "returned no data".
 */
function looksLikeChainFailure(message: string): boolean {
  return /ECONNREFUSED|fetch failed|HttpRequestError|timed out|ETIMEDOUT|ENOTFOUND|socket hang up|returned no data|ContractFunctionExecutionError|is not a contract/i.test(
    message,
  );
}

export default function ConsoleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const pathname = usePathname();
  const copy = pathname.startsWith("/fr") ? COPY.fr : COPY.en;

  useEffect(() => {
    console.error("Console failed to render", error);
  }, [error]);

  const chainDown = looksLikeChainFailure(error.message);

  return (
    <div className="mx-auto max-w-xl py-8 text-center">
      <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-warning-wash text-warning">
        <svg
          viewBox="0 0 24 24"
          className="size-7"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 4.5 2.8 20h18.4L12 4.5Z" strokeLinejoin="round" />
          <path d="M12 10.2v4M12 17.3h.01" />
        </svg>
      </span>

      <h1 className="font-display text-2xl tracking-tight">{copy.title}</h1>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-soft">
        {chainDown ? copy.chain : copy.generic}
      </p>

      <button
        type="button"
        onClick={retry}
        className="mt-6 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-ink shadow-card transition hover:bg-brand-bright"
      >
        {copy.retry}
      </button>

      {error.digest ? (
        <p className="mt-6 font-mono text-xs text-ink-faint">
          {copy.detail}: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
