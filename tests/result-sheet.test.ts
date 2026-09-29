import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resultSheetToCsv, type ResultSheet } from "../lib/result-sheet";

function sheetWith(
  candidates: ResultSheet["positions"][number]["candidates"],
): ResultSheet {
  return {
    electionTitle: "Test Election",
    universityName: "Test University",
    contractAddress: "0xabc",
    chainId: 31337,
    final: true,
    generatedAt: new Date("2026-01-01T00:00:00Z"),
    registered: 10,
    ballotsCast: 5,
    turnoutPercent: 50,
    loggedLines: 5,
    reconciles: true,
    positions: [
      { title: "President", ballotsCast: 5, tied: false, candidates },
    ],
  };
}

const CANDIDATE = {
  name: "Ada Lovelace",
  party: "Analytical",
  votes: 3,
  sharePercent: 60,
  leading: true,
};

describe("result CSV", () => {
  it("writes a header and one row per candidate", () => {
    const csv = resultSheetToCsv(sheetWith([CANDIDATE]));
    const lines = csv.trim().split("\r\n");

    assert.equal(lines.length, 2);
    assert.match(lines[0]!, /"Position","Candidate","Party","Votes"/);
    assert.match(lines[1]!, /"Ada Lovelace"/);
    assert.match(lines[1]!, /"Elected"/);
  });

  it("starts with a byte-order mark so Excel reads it as UTF-8", () => {
    // Without it, accented names arrive mangled in the committee's copy.
    assert.ok(resultSheetToCsv(sheetWith([CANDIDATE])).startsWith("﻿"));
  });

  it("neutralises a candidate name that would run as a formula", () => {
    // Candidate names are user input and land in a file someone opens in
    // Excel. Without this guard, a name beginning with = executes on open.
    const csv = resultSheetToCsv(
      sheetWith([
        {
          ...CANDIDATE,
          name: '=HYPERLINK("http://evil","click")',
          party: "+1+1",
        },
        { ...CANDIDATE, name: "@SUM(A1:A9)", party: "-2+3", leading: false },
      ]),
    );

    for (const dangerous of ['"=HYPER', '"+1+1"', '"@SUM', '"-2+3"']) {
      assert.ok(
        !csv.includes(dangerous),
        `unescaped formula found: ${dangerous}`,
      );
    }
    assert.ok(csv.includes(`"'=HYPERLINK`), "should be prefixed with a quote");
    assert.ok(csv.includes(`"'@SUM(A1:A9)"`));
    assert.ok(csv.includes(`"'+1+1"`));
    assert.ok(csv.includes(`"'-2+3"`));
  });

  it("escapes embedded quotes rather than breaking the row", () => {
    const csv = resultSheetToCsv(
      sheetWith([{ ...CANDIDATE, name: 'Ada "The Engine" Lovelace' }]),
    );
    assert.ok(csv.includes('"Ada ""The Engine"" Lovelace"'));
    assert.equal(csv.trim().split("\r\n").length, 2, "must stay on one row");
  });

  it("keeps a name containing a newline inside its quoted field", () => {
    const csv = resultSheetToCsv(
      sheetWith([{ ...CANDIDATE, name: "Ada\nLovelace" }]),
    );
    // Two data lines visually, but still one quoted field — the row count in
    // the header is what matters for a parser.
    assert.ok(csv.includes('"Ada\nLovelace"'));
  });

  it("reports a tie as a tie rather than inventing a winner", () => {
    const sheet = sheetWith([
      { ...CANDIDATE, votes: 2, leading: false },
      { ...CANDIDATE, name: "Alan Turing", votes: 2, leading: false },
    ]);
    sheet.positions[0]!.tied = true;

    const csv = resultSheetToCsv(sheet);
    assert.ok(csv.includes('"Tied"'));
    assert.ok(!csv.includes('"Elected"'));
  });

  it("says Leading rather than Elected while voting is open", () => {
    const sheet = sheetWith([CANDIDATE]);
    sheet.final = false;
    assert.ok(resultSheetToCsv(sheet).includes('"Leading"'));
  });

  it("carries the contract address on every row", () => {
    // A row pasted into another spreadsheet stays traceable to its source.
    const csv = resultSheetToCsv(
      sheetWith([CANDIDATE, { ...CANDIDATE, name: "Alan Turing", leading: false }]),
    );
    const dataRows = csv.trim().split("\r\n").slice(1);
    assert.equal(dataRows.length, 2);
    for (const row of dataRows) assert.ok(row.includes('"0xabc"'));
  });
});
