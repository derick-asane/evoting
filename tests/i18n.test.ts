import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { en } from "../lib/i18n/en";
import { fr } from "../lib/i18n/fr";
import { LOCALES, getDictionaryFor, t } from "../lib/i18n";

/** Every "section.key" in a dictionary, flattened. */
function keysOf(dictionary: Record<string, Record<string, string>>): string[] {
  return Object.entries(dictionary).flatMap(([section, entries]) =>
    Object.keys(entries).map((key) => `${section}.${key}`),
  );
}

function valueAt(
  dictionary: Record<string, Record<string, string>>,
  path: string,
): string {
  const [section, key] = path.split(".") as [string, string];
  return dictionary[section]![key]!;
}

/** The {placeholders} a string expects, as a sorted list. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
}

const english = en as unknown as Record<string, Record<string, string>>;
const french = fr as unknown as Record<string, Record<string, string>>;

describe("translations", () => {
  it("has a dictionary for every declared locale", () => {
    for (const locale of LOCALES) {
      assert.ok(getDictionaryFor(locale), `no dictionary for ${locale}`);
    }
  });

  it("falls back to English for an unknown locale rather than throwing", () => {
    assert.equal(getDictionaryFor("de").nav.results, en.nav.results);
    assert.equal(getDictionaryFor("").nav.results, en.nav.results);
  });

  it("French covers every English key", () => {
    const missing = keysOf(english).filter((path) => {
      const [section, key] = path.split(".") as [string, string];
      return french[section]?.[key] === undefined;
    });
    assert.deepEqual(missing, [], `missing from fr: ${missing.join(", ")}`);
  });

  it("French adds no keys English does not have", () => {
    const englishKeys = new Set(keysOf(english));
    const extra = keysOf(french).filter((path) => !englishKeys.has(path));
    assert.deepEqual(extra, [], `extra in fr: ${extra.join(", ")}`);
  });

  it("has no blank strings in either locale", () => {
    for (const [name, dictionary] of [
      ["en", english],
      ["fr", french],
    ] as const) {
      const blank = keysOf(dictionary).filter(
        (path) => valueAt(dictionary, path).trim() === "",
      );
      assert.deepEqual(blank, [], `blank in ${name}: ${blank.join(", ")}`);
    }
  });

  it("keeps the same placeholders in both locales", () => {
    // A translation that drops {count} renders a sentence missing its number;
    // one that invents {name} renders the braces literally to the voter.
    const mismatched = keysOf(english).filter((path) => {
      const expected = placeholders(valueAt(english, path));
      const actual = placeholders(valueAt(french, path));
      return JSON.stringify(expected) !== JSON.stringify(actual);
    });
    assert.deepEqual(
      mismatched,
      [],
      `placeholder mismatch: ${mismatched.join(", ")}`,
    );
  });

  it("is untranslated only where the word is the same in both languages", () => {
    // Catches copy-paste: a French value identical to English is usually a
    // forgotten translation rather than a deliberate one.
    const ALLOWED = new Set([
      "brand.name",
      "union.memberPhoto",
      "ballot.transaction",
      "photo.label",
      "results.receipt",
      "student.password",
      // "code" and "codes" are spelled the same in French.
      "security.activationCount",
      "security.activationColumnCode",
    ]);
    const identical = keysOf(english).filter(
      (path) =>
        !ALLOWED.has(path) &&
        valueAt(english, path) === valueAt(french, path) &&
        valueAt(english, path).length > 3,
    );
    assert.deepEqual(
      identical,
      [],
      `untranslated in fr: ${identical.join(", ")}`,
    );
  });
});

describe("interpolation", () => {
  it("substitutes named values", () => {
    assert.equal(t("{a} and {b}", { a: "x", b: "y" }), "x and y");
  });

  it("leaves an unknown placeholder visible rather than printing undefined", () => {
    assert.equal(t("{a} and {b}", { a: "x" }), "x and {b}");
  });

  it("accepts numbers", () => {
    assert.equal(t("{count} votes", { count: 3 }), "3 votes");
  });

  it("is a no-op on a string with no placeholders", () => {
    assert.equal(t("plain"), "plain");
  });
});
