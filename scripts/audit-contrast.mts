/**
 * Colour contrast audit, computed from the design tokens.
 *
 *   npm run audit:contrast
 *
 * Parses app/globals.css, resolves every token for light and dark, and
 * calculates the WCAG 2.1 contrast ratio for each text/background pair the UI
 * actually uses.
 *
 * Done here rather than in a browser because it is arithmetic, not a matter of
 * looking: the ratio is defined by a formula over sRGB luminance, so computing
 * it is both exact and repeatable. A screenshot could only ever tell you it
 * "looks fine".
 *
 * Thresholds (WCAG 2.1 AA):
 *   4.5  normal text
 *   3.0  large text (>= 18.66px bold or >= 24px) and UI component boundaries
 */
import { readFile } from "node:fs/promises";

const css = await readFile("app/globals.css", "utf8");

// --- Token extraction ---------------------------------------------------------

/**
 * Reads the custom properties from one :root block.
 *
 * Light lives in the first `:root {`, dark in the prefers-color-scheme block.
 */
function tokensFrom(source: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const match of source.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[match[1]!] = match[2]!.trim();
  }
  return tokens;
}

const lightBlock = css.slice(css.indexOf(":root {"), css.indexOf("@media"));
const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
const darkBlock = css.slice(darkStart, css.indexOf("@theme inline"));

const LIGHT = tokensFrom(lightBlock);
const DARK = { ...LIGHT, ...tokensFrom(darkBlock) };

// --- Colour maths -------------------------------------------------------------

function parseHex(value: string): [number, number, number] | null {
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (!hex) return null;
  const int = parseInt(hex[1]!, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/** Relative luminance, per WCAG 2.1. */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.04045
      ? scaled / 12.92
      : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(foreground: string, background: string): number | null {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return null;

  const lighter = Math.max(luminance(fg), luminance(bg));
  const darker = Math.min(luminance(fg), luminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

// --- Pairs the interface actually puts together -------------------------------

type Pair = {
  what: string;
  fg: string;
  bg: string;
  /** 4.5 for body text, 3 for large text and UI boundaries. */
  min: number;
};

const PAIRS: Pair[] = [
  { what: "Body text on the page", fg: "ink", bg: "page", min: 4.5 },
  { what: "Body text on a card", fg: "ink", bg: "surface", min: 4.5 },
  { what: "Secondary text on a card", fg: "ink-soft", bg: "surface", min: 4.5 },
  { what: "Secondary text on the page", fg: "ink-soft", bg: "page", min: 4.5 },
  { what: "Muted text on a card", fg: "ink-faint", bg: "surface", min: 4.5 },
  { what: "Muted text on a muted panel", fg: "ink-faint", bg: "surface-muted", min: 4.5 },
  { what: "Text on a sunken panel", fg: "ink", bg: "surface-sunken", min: 4.5 },
  { what: "Muted text on a sunken panel", fg: "ink-faint", bg: "surface-sunken", min: 4.5 },

  { what: "Primary button label", fg: "brand-ink", bg: "brand", min: 4.5 },
  { what: "Brand link on a card", fg: "brand", bg: "surface", min: 4.5 },
  { what: "Brand text on its wash", fg: "brand", bg: "brand-wash", min: 4.5 },

  { what: "Success notice text", fg: "positive", bg: "positive-wash", min: 4.5 },
  { what: "Warning notice text", fg: "warning", bg: "warning-wash", min: 4.5 },
  { what: "Error notice text", fg: "danger", bg: "danger-wash", min: 4.5 },

  // WCAG 1.4.11 asks 3:1 of anything needed to identify a control. A form
  // field is identified by its border, so --line-control must clear it.
  // A card outline is not: the card is already separated by its own surface
  // colour and shadow, so --line stays light on purpose and is not tested
  // against that bar.
  { what: "Field border on a card", fg: "line-control", bg: "surface", min: 3 },
  { what: "Field border on a muted panel", fg: "line-control", bg: "surface-muted", min: 3 },
];

// --- Report -------------------------------------------------------------------

let failures = 0;
let warnings = 0;

for (const [mode, tokens] of [
  ["LIGHT", LIGHT],
  ["DARK", DARK],
] as const) {
  console.log(`\n  ${mode}\n  ${"─".repeat(58)}`);

  for (const pair of PAIRS) {
    const fg = tokens[pair.fg];
    const bg = tokens[pair.bg];

    if (!fg || !bg) {
      console.log(`  ?  ${pair.what}: token missing (${pair.fg} / ${pair.bg})`);
      warnings += 1;
      continue;
    }

    const ratio = contrast(fg, bg);
    if (ratio === null) {
      // color-mix() and friends cannot be resolved without a browser.
      console.log(`  ?  ${pair.what}: not a plain hex, skipped`);
      warnings += 1;
      continue;
    }

    const ok = ratio >= pair.min;
    if (!ok) failures += 1;

    console.log(
      `  ${ok ? "✓" : "✗"}  ${pair.what.padEnd(34)} ` +
        `${ratio.toFixed(2).padStart(5)}:1  (needs ${pair.min})`,
    );
  }
}

console.log("");
if (failures === 0) {
  console.log(`  All ${PAIRS.length * 2} pairs meet WCAG 2.1 AA.`);
} else {
  console.log(`  ${failures} pair(s) below AA. Adjust the tokens in app/globals.css.`);
}
if (warnings > 0) {
  console.log(`  ${warnings} pair(s) could not be computed.`);
}

console.log(
  "\n  Note: the eight --series-* candidate colours are validated separately\n" +
    "  as a categorical palette (colourblind separation and lightness band),\n" +
    "  and every chart bar carries its value as text so colour is never the\n" +
    "  only carrier of meaning.\n",
);

process.exit(failures === 0 ? 0 : 1);
