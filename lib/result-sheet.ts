import "server-only";

import PDFDocument from "pdfkit";

import { Phase, getBallot, getBallotBox, getElectionState } from "./election";
import type { ElectionRecord } from "./elections";
import type { University } from "./universities";

/**
 * The official result of one election, assembled from the chain.
 *
 * Every number here is read back from the contract at the moment of export —
 * nothing is cached, and nothing comes from the application database. The
 * document is a snapshot of what the chain said, not of what we believe.
 */
export type ResultSheet = {
  electionTitle: string;
  universityName: string;
  contractAddress: string;
  chainId: number;
  final: boolean;
  generatedAt: Date;
  registered: number;
  ballotsCast: number;
  turnoutPercent: number;
  /** Ballot lines in the public log, for the reconciliation line. */
  loggedLines: number;
  reconciles: boolean;
  positions: Array<{
    title: string;
    ballotsCast: number;
    tied: boolean;
    candidates: Array<{
      name: string;
      party: string;
      votes: number;
      sharePercent: number;
      leading: boolean;
    }>;
  }>;
};

export async function buildResultSheet(
  university: University,
  election: ElectionRecord,
  chainId: number,
): Promise<ResultSheet> {
  const [state, ballot, box] = await Promise.all([
    getElectionState(election.address),
    getBallot(election.address),
    getBallotBox(election.address, BigInt(election.deploymentBlock)),
  ]);

  const logged = new Map<number, number>();
  for (const line of box) {
    logged.set(line.positionId, (logged.get(line.positionId) ?? 0) + 1);
  }

  const positions = ballot.map((position) => {
    const ranked = [...position.candidates].sort((a, b) => b.voteCount - a.voteCount);
    const top = ranked[0]?.voteCount ?? 0;
    const winners = ranked.filter((c) => c.voteCount === top && top > 0);

    return {
      title: position.title,
      ballotsCast: position.ballotsCast,
      // A tie is reported as a tie rather than resolved by list order.
      tied: winners.length > 1,
      candidates: ranked.map((candidate) => ({
        name: candidate.name,
        party: candidate.party,
        votes: candidate.voteCount,
        sharePercent:
          position.ballotsCast > 0
            ? (candidate.voteCount / position.ballotsCast) * 100
            : 0,
        leading: winners.length === 1 && candidate.voteCount === top,
      })),
    };
  });

  const reconciles = ballot.every((position) => {
    const tallied = position.candidates.reduce((sum, c) => sum + c.voteCount, 0);
    return (
      tallied === position.ballotsCast &&
      tallied === (logged.get(position.id) ?? 0)
    );
  });

  return {
    electionTitle: state.title,
    universityName: university.name,
    contractAddress: election.address,
    chainId,
    final: state.phase === Phase.Ended,
    generatedAt: new Date(),
    registered: state.registered,
    ballotsCast: state.totalBallots,
    turnoutPercent:
      state.registered > 0 ? (state.totalBallots / state.registered) * 100 : 0,
    loggedLines: box.length,
    reconciles,
    positions,
  };
}

// --- CSV ---------------------------------------------------------------------

/**
 * Escapes one CSV field.
 *
 * A leading `=`, `+`, `-` or `@` makes Excel and Sheets treat the value as a
 * formula, so a candidate who registers as `=HYPERLINK(...)` would execute in
 * whoever opens the file. Prefixing with an apostrophe keeps it inert text.
 */
function csvField(value: string | number): string {
  const text = String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/**
 * The tallies as a spreadsheet.
 *
 * Each row carries the election and contract so a row pasted into another
 * sheet is still traceable back to the chain it came from.
 */
export function resultSheetToCsv(sheet: ResultSheet): string {
  const rows: string[] = [
    [
      "Election",
      "Contract",
      "Position",
      "Candidate",
      "Party",
      "Votes",
      "Share (%)",
      "Outcome",
    ]
      .map(csvField)
      .join(","),
  ];

  for (const position of sheet.positions) {
    for (const candidate of position.candidates) {
      rows.push(
        [
          sheet.electionTitle,
          sheet.contractAddress,
          position.title,
          candidate.name,
          candidate.party,
          candidate.votes,
          candidate.sharePercent.toFixed(1),
          candidate.leading
            ? sheet.final
              ? "Elected"
              : "Leading"
            : position.tied && candidate.votes > 0
              ? "Tied"
              : "",
        ]
          .map(csvField)
          .join(","),
      );
    }
  }

  // BOM so Excel opens UTF-8 names correctly instead of mangling accents.
  return `﻿${rows.join("\r\n")}\r\n`;
}

// --- PDF ---------------------------------------------------------------------

const INK = "#16181d";
const MUTED = "#5c6470";
const RULE = "#d8dde6";

/**
 * The result as a document a committee can file, sign and publish.
 *
 * Built with PDFKit rather than a headless browser: no Chromium to install,
 * and the layout is deterministic across machines.
 */
export function resultSheetToPdf(sheet: ResultSheet): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;

    const rule = () => {
      doc.moveDown(0.6);
      doc
        .strokeColor(RULE)
        .lineWidth(1)
        .moveTo(left, doc.y)
        .lineTo(left + width, doc.y)
        .stroke();
      doc.moveDown(0.8);
    };

    // --- Header
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(9)
      .text(sheet.universityName.toUpperCase(), { characterSpacing: 1.2 });

    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(20)
      .text(sheet.electionTitle, { lineGap: 2 });

    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(11)
      .text(
        sheet.final
          ? "Official final result"
          : "Provisional result — voting is still open",
      );

    rule();

    // --- Summary
    doc.fontSize(10).fillColor(INK);
    const summary: Array<[string, string]> = [
      ["Students on the roll", String(sheet.registered)],
      [
        "Ballots cast",
        `${sheet.ballotsCast}  (${sheet.turnoutPercent.toFixed(1)}% turnout)`,
      ],
      ["Ballot lines recorded", String(sheet.loggedLines)],
      [
        "Independent recount",
        sheet.reconciles
          ? "Tallies match the public log for every position"
          : "MISMATCH — investigate before relying on this result",
      ],
      ["Generated", sheet.generatedAt.toUTCString()],
    ];

    for (const [label, value] of summary) {
      doc
        .font("Helvetica")
        .fillColor(MUTED)
        .text(label, left, doc.y, { continued: true, width: 200 });
      doc
        .font("Helvetica-Bold")
        .fillColor(sheet.reconciles ? INK : label === "Independent recount" ? "#b42318" : INK)
        .text(`  ${value}`);
      doc.moveDown(0.25);
    }

    rule();

    // --- One block per position
    for (const position of sheet.positions) {
      // Keep a heading with at least its first row rather than stranding it.
      if (doc.y > doc.page.height - 160) doc.addPage();

      doc
        .font("Helvetica-Bold")
        .fillColor(INK)
        .fontSize(13)
        .text(position.title);
      doc
        .font("Helvetica")
        .fillColor(MUTED)
        .fontSize(9)
        .text(
          `${position.ballotsCast} vote${position.ballotsCast === 1 ? "" : "s"} cast` +
            (position.tied ? " — tied" : ""),
        );
      doc.moveDown(0.5);

      const columns = { name: left, votes: left + width - 150, share: left + width - 80 };

      doc.fontSize(9).fillColor(MUTED);
      doc.text("Candidate", columns.name, doc.y, { continued: true });
      doc.text("Votes", columns.votes, doc.y, { continued: true });
      doc.text("Share", columns.share, doc.y);
      doc.moveDown(0.3);

      for (const candidate of position.candidates) {
        if (doc.y > doc.page.height - 80) doc.addPage();

        const y = doc.y;
        doc
          .font(candidate.leading ? "Helvetica-Bold" : "Helvetica")
          .fillColor(INK)
          .fontSize(10)
          .text(
            candidate.party ? `${candidate.name} — ${candidate.party}` : candidate.name,
            columns.name,
            y,
            { width: width - 160 },
          );

        doc
          .font(candidate.leading ? "Helvetica-Bold" : "Helvetica")
          .text(String(candidate.votes), columns.votes, y);
        doc.text(`${candidate.sharePercent.toFixed(1)}%`, columns.share, y);

        doc.moveDown(0.35);
      }

      doc.moveDown(0.8);
    }

    // --- Provenance
    if (doc.y > doc.page.height - 140) doc.addPage();
    rule();

    doc
      .font("Helvetica-Bold")
      .fillColor(INK)
      .fontSize(10)
      .text("How to verify this document");
    doc.moveDown(0.3);
    doc
      .font("Helvetica")
      .fillColor(MUTED)
      .fontSize(9)
      .text(
        "These figures were read from the election contract at the time of " +
          "generation. They are not taken from any database, and this document " +
          "carries no authority the chain does not already give it. Read the " +
          "contract yourself and recount its BallotCast events — if your total " +
          "disagrees with this sheet, the chain is right and this sheet is wrong.",
        { width, lineGap: 1.5 },
      );
    doc.moveDown(0.5);
    doc
      .font("Courier")
      .fillColor(INK)
      .fontSize(9)
      .text(`Contract  ${sheet.contractAddress}`)
      .text(`Chain ID  ${sheet.chainId}`);

    doc.end();
  });
}

/** A filesystem-safe base name for the download. */
export function resultFileName(sheet: ResultSheet): string {
  const slug = sheet.electionTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const date = sheet.generatedAt.toISOString().slice(0, 10);
  return `${slug || "election"}-result-${date}`;
}
