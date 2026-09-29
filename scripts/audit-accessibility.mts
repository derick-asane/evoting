/**
 * Accessibility audit of the running app.
 *
 *   npm run audit:a11y                      # against http://127.0.0.1:3002
 *   npm run audit:a11y -- --base http://...
 *
 * Fetches each page's server-rendered HTML and runs axe-core over it in jsdom.
 *
 * What this catches: missing labels and accessible names, bad heading order,
 * missing landmarks and lang, duplicate ids, ARIA misuse — the structural
 * faults that make a page unusable with a screen reader.
 *
 * What it cannot catch, and why: jsdom has no layout engine, so anything
 * depending on computed geometry or painted colour is unreliable here. Colour
 * contrast is checked separately and properly by audit-contrast.mts, which
 * computes the ratios from the design tokens. Interactive state (open menus,
 * focus rings, the error boundary) is not in the server HTML at all, so it is
 * out of scope for this script and needs a real browser.
 */
import { readFile } from "node:fs/promises";

import { JSDOM } from "jsdom";

const baseFlag = process.argv.indexOf("--base");
const BASE =
  baseFlag >= 0 && process.argv[baseFlag + 1]
    ? process.argv[baseFlag + 1]!
    : "http://127.0.0.1:3002";

/** Every distinct page shape a visitor can land on. */
const PAGES = [
  "/en",
  "/fr",
  "/en/university/login",
  "/en/university/signup",
  "/en/signed-out",
  "/en/u/riverside-university",
  "/en/u/riverside-university/login",
  "/en/u/riverside-university/reset",
  "/en/u/riverside-university/results",
  "/en/u/riverside-university/elections",
  "/en/u/riverside-university/verify",
  "/en/u/aics-cameroon/union",
];

/**
 * Rules that jsdom cannot judge honestly.
 *
 * Both depend on painted pixels: without a layout engine axe either guesses or
 * reports a false positive. Contrast is covered by the sibling script; target
 * size is checked there too, from the class names.
 */
const UNRELIABLE_IN_JSDOM = ["color-contrast", "target-size"];

type Finding = {
  page: string;
  id: string;
  impact: string;
  help: string;
  nodes: string[];
};

const axeScript = await readFile("node_modules/axe-core/axe.min.js", "utf8");

const findings: Finding[] = [];
let audited = 0;

/**
 * Set when the port belongs to a different app.
 *
 * A dev machine often has several Next projects running, and whichever one
 * grabbed this port first answers happily. Without this check the audit
 * reports violations from an unrelated codebase, or a wall of 404s that look
 * like broken routes — both of which waste a long time before anyone thinks
 * to question the port.
 */
let wrongApp: string | null = null;

for (const path of PAGES) {
  let html: string;
  try {
    const response = await fetch(`${BASE}${path}`);
    if (!response.ok) {
      console.log(`  ! ${path} returned ${response.status}, skipped`);
      continue;
    }
    html = await response.text();
  } catch (error) {
    console.error(`Could not reach ${BASE}${path}. Is the app running?`);
    process.exit(1);
  }

  // Checked on the first page that answers, and then never again. Bailing out
  // here rather than from a separate probe keeps the exit on the normal path;
  // calling process.exit while a fetch socket is still open trips a libuv
  // assertion on Windows that prints a crash over the explanation.
  if (audited === 0 && !html.includes("<title>Campus Ballot</title>")) {
    wrongApp = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "(no title)";
    break;
  }

  const dom = new JSDOM(html, {
    url: `${BASE}${path}`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });

  // axe needs these globals present on the window it runs in.
  dom.window.eval(axeScript);

  const results = await dom.window.axe.run(dom.window.document, {
    resultTypes: ["violations"],
    rules: Object.fromEntries(
      UNRELIABLE_IN_JSDOM.map((id) => [id, { enabled: false }]),
    ),
  });

  audited += 1;

  for (const violation of results.violations as Array<{
    id: string;
    impact: string | null;
    help: string;
    nodes: Array<{ html: string }>;
  }>) {
    findings.push({
      page: path,
      id: violation.id,
      impact: violation.impact ?? "unknown",
      help: violation.help,
      nodes: violation.nodes
        .slice(0, 3)
        .map((node: { html: string }) => node.html.slice(0, 120)),
    });
  }

  dom.window.close();
}

// --- Report -------------------------------------------------------------------

if (wrongApp) {
  console.error(
    `\n  ${BASE} is serving a different app — its title is "${wrongApp}",\n` +
      `  not "Campus Ballot". Nothing was audited.\n\n` +
      `  Start this app and point the audit at its port:\n\n` +
      `    npm run audit:a11y -- --base http://127.0.0.1:<port>\n`,
  );
  // exitCode rather than process.exit(): the loop broke out with a fetch
  // socket still open, and exiting on top of one trips a libuv assertion on
  // Windows that prints a crash line over the message above. Letting Node
  // wind down by itself avoids that.
  process.exitCode = 1;
} else {
  console.log(`\n  Audited ${audited} pages with axe-core.\n`);

  if (findings.length === 0) {
    console.log("  No structural accessibility violations found.\n");
  } else {
    const ORDER = ["critical", "serious", "moderate", "minor", "unknown"];
    findings.sort((a, b) => ORDER.indexOf(a.impact) - ORDER.indexOf(b.impact));

    // Group by rule: one broken pattern usually repeats across pages.
    const byRule = new Map<string, Finding[]>();
    for (const finding of findings) {
      const list = byRule.get(finding.id) ?? [];
      list.push(finding);
      byRule.set(finding.id, list);
    }

    for (const [id, group] of byRule) {
      const first = group[0]!;
      console.log(`  [${first.impact.toUpperCase()}] ${id}`);
      console.log(`    ${first.help}`);
      console.log(`    on: ${group.map((f) => f.page).join(", ")}`);
      for (const node of first.nodes) console.log(`      ${node}`);
      console.log("");
    }

    console.log(
      `  ${findings.length} violation(s) across ${byRule.size} rule(s).\n`,
    );
  }

  console.log(
    "  Not covered here: colour contrast and tap-target size (see\n" +
      "  npm run audit:contrast), and anything only visible after JavaScript\n" +
      "  runs — open menus, focus rings, the error boundary. Those need a real\n" +
      "  browser.\n",
  );

  process.exit(findings.length === 0 ? 0 : 1);
}
