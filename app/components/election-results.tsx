import {
  ChartIcon,
  LedgerIcon,
  ShieldIcon,
  UsersIcon,
} from "@/app/components/icons";
import { Portrait } from "@/app/components/portrait";
import {
  Card,
  CardTitle,
  Mono,
  Notice,
  PhaseBadge,
  Stat,
  buttonStyles,
  seriesColor,
} from "@/app/components/ui";
import { extrasKey, getCandidateExtras } from "@/lib/candidates";
import {
  PHASE_KEY,
  Phase,
  getBallot,
  getBallotBox,
  getElectionState,
} from "@/lib/election";
import type { ElectionRecord } from "@/lib/elections";
import { formatDateTime, t, type Dictionary, type Locale } from "@/lib/i18n";

/**
 * The full result of one election.
 *
 * Takes the election rather than looking up "the current one", so the archive
 * and the live results page render from exactly the same code — a past result
 * can never drift from how it was presented while the polls were open.
 */
export async function ElectionResults({
  election,
  dict,
  locale,
}: {
  election: ElectionRecord;
  dict: Dictionary;
  locale: Locale;
}) {
  const [state, ballot, box, extras] = await Promise.all([
    getElectionState(election.address),
    getBallot(election.address),
    getBallotBox(election.address, BigInt(election.deploymentBlock)),
    getCandidateExtras(election.id),
  ]);

  const turnout =
    state.registered > 0
      ? Math.round((state.totalBallots / state.registered) * 100)
      : 0;
  const ended = state.phase === Phase.Ended;

  // Every position's tallies must equal the ballot lines logged for it.
  const logged = new Map<number, number>();
  for (const line of box) {
    logged.set(line.positionId, (logged.get(line.positionId) ?? 0) + 1);
  }
  const reconciles = ballot.every((position) => {
    const tallied = position.candidates.reduce((sum, c) => sum + c.voteCount, 0);
    return (
      tallied === position.ballotsCast &&
      tallied === (logged.get(position.id) ?? 0)
    );
  });

  return (
    <div className="space-y-8">
      <div>
        <PhaseBadge phase={state.phase} label={dict.phase[PHASE_KEY[state.phase]]} />
        <h1 className="mt-3 font-display text-4xl tracking-tight">
          {ended ? dict.results.finalResult : dict.results.liveCount}
        </h1>
        <p className="mt-2 text-ink-soft">
          {t(dict.results.lead, { title: state.title })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={dict.common.ballotsCast}
          value={state.totalBallots}
          icon={<ChartIcon size={17} />}
          accent
        />
        <Stat
          label={dict.common.onTheRoll}
          value={state.registered}
          sub={`${turnout}% ${dict.common.turnout.toLowerCase()}`}
          icon={<UsersIcon size={17} />}
        />
        <Stat label={dict.results.positionsLabel} value={state.positionCount} />
      </div>

      {/* One card per post: each has its own winner and its own tallies. */}
      {ballot.map((position) => {
        const ranked = [...position.candidates].sort(
          (a, b) => b.voteCount - a.voteCount,
        );
        const leader = ranked[0];
        const tied =
          ranked.length > 1 && leader && ranked[1].voteCount === leader.voteCount;

        return (
          <Card key={position.id}>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                {position.title}
              </h2>
              <p className="text-sm text-ink-soft">
                {position.ballotsCast}{" "}
                {position.ballotsCast === 1 ? dict.common.vote : dict.common.votes}
                {position.ballotsCast > 0 ? (
                  <>
                    {" · "}
                    <span className="font-medium text-ink">
                      {tied
                        ? dict.results.tied
                        : `${ended ? dict.results.elected : dict.results.leading}: ${leader?.name ?? "—"}`}
                    </span>
                  </>
                ) : null}
              </p>
            </div>

            <ol className="space-y-5">
              {ranked.map((candidate) => {
                const share =
                  position.ballotsCast > 0
                    ? (candidate.voteCount / position.ballotsCast) * 100
                    : 0;
                const rounded = Math.round(share);
                return (
                  <li key={candidate.id}>
                    <div className="mb-2 flex items-center gap-3">
                      <Portrait
                        photoId={
                          extras.get(extrasKey(position.id, candidate.id))
                            ?.photoId ?? null
                        }
                        name={candidate.name}
                        index={candidate.id}
                        size={36}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {candidate.name}
                          {candidate.party ? (
                            <span className="ml-2 text-sm font-normal text-ink-soft">
                              {candidate.party}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      {/* Direct labels: the palette's light steps sit below
                          3:1, so every bar carries its value in text. */}
                      <p className="numeric shrink-0 text-sm text-ink-soft">
                        <span className="font-semibold text-ink">
                          {candidate.voteCount}
                        </span>{" "}
                        {candidate.voteCount === 1
                          ? dict.common.vote
                          : dict.common.votes}
                        <span className="ml-2 text-ink-faint">{rounded}%</span>
                      </p>
                    </div>
                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-surface-sunken"
                      role="img"
                      aria-label={`${candidate.name}: ${candidate.voteCount} ${
                        candidate.voteCount === 1
                          ? dict.common.vote
                          : dict.common.votes
                      }, ${rounded}%`}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${share}%`,
                          background: seriesColor(candidate.id),
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        );
      })}

      {/* The offline substitute for "look it up on a block explorer": a command
          anyone can run here to recount the election themselves. */}
      <Card>
        <CardTitle icon={<ShieldIcon size={19} />} hint={dict.results.recountHint}>
          {dict.results.recountTitle}
        </CardTitle>
        <p className="mb-2 text-sm text-ink-soft">{dict.results.recountRun}</p>
        <pre className="overflow-x-auto rounded-xl bg-surface-sunken p-4 font-mono text-xs leading-relaxed">
          <code>npm run verify -- {election.address}</code>
        </pre>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {dict.results.recountChecks}
        </p>
      </Card>

      <Card>
        <CardTitle icon={<LedgerIcon size={19} />} hint={dict.results.downloadHint}>
          {dict.results.downloadTitle}
        </CardTitle>
        {!ended ? (
          <div className="mb-4">
            <Notice tone="warning">{dict.results.provisionalNote}</Notice>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {/* Plain links, not fetches: the browser handles the download and
              the Content-Disposition filename without any client JavaScript. */}
          <a
            href={`/api/election/${election.id}/result?format=pdf`}
            className={buttonStyles.primary}
            download
          >
            {dict.results.downloadPdf}
          </a>
          <a
            href={`/api/election/${election.id}/result?format=csv`}
            className={buttonStyles.secondary}
            download
          >
            {dict.results.downloadCsv}
          </a>
        </div>
      </Card>

      <Card>
        <CardTitle icon={<LedgerIcon size={19} />} hint={dict.results.ballotBoxHint}>
          {dict.results.ballotBox}
        </CardTitle>

        <div className="mb-5">
          {reconciles ? (
            <Notice tone="success">
              {t(dict.results.reconcilesByPosition, { lines: box.length })}
            </Notice>
          ) : (
            <Notice tone="error">{dict.results.mismatchByPosition}</Notice>
          )}
        </div>

        {box.length === 0 ? (
          <p className="text-sm text-ink-soft">{dict.results.noBallots}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.1em] text-ink-faint">
                <tr>
                  <th scope="col" className="py-2.5 pr-4 font-medium">
                    {dict.results.receipt}
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">
                    {dict.results.position}
                  </th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">
                    {dict.results.choice}
                  </th>
                  <th scope="col" className="py-2.5 font-medium">
                    {dict.results.recorded}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {box.slice(0, 50).map((line, index) => (
                  <tr key={`${line.receiptId}-${line.positionId}-${index}`}>
                    <td className="py-2.5 pr-4 font-mono text-xs text-ink-faint">
                      {line.receiptId.slice(0, 10)}…{line.receiptId.slice(-6)}
                    </td>
                    <td className="py-2.5 pr-4 text-ink-soft">
                      {ballot[line.positionId]?.title ?? `#${line.positionId}`}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: seriesColor(line.candidateId) }}
                          aria-hidden
                        />
                        {ballot[line.positionId]?.candidates[line.candidateId]
                          ?.name ?? `#${line.candidateId}`}
                      </span>
                    </td>
                    <td className="py-2.5 text-ink-soft">
                      {formatDateTime(locale, line.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {box.length > 50 ? (
              <p className="mt-3 text-xs text-ink-faint">
                {t(dict.results.showingRecent, { total: box.length })}
              </p>
            ) : null}
          </div>
        )}

        <p className="mt-5 border-t border-line pt-4 text-xs text-ink-faint">
          {t(dict.results.source, { event: "BallotCast" })}{" "}
          <Mono>{election.address}</Mono>
        </p>
      </Card>
    </div>
  );
}
