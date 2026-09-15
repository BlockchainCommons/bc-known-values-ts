/**
 * Differential suite: every corpus recipe the frozen baseline bundle can run
 * (`isBaselineSupported`) goes through the bundle and the working tree;
 * outcomes must be identical except for the allowed differences listed
 * below, each of which must be hit exactly as many times per category as it
 * says. The bundle predates the directory loader, the registry-file parser,
 * the error class, the untagged decoder's wrap, `resolveKnownValue`'s store
 * argument and the store guards, so those kinds are skipped, and the
 * per-category skip counts are asserted too.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { describe, it, expect } from "vitest";
import * as baselineMod from "./baseline/known-values-baseline.mjs";
import * as src from "../src/index.js";
import { categories } from "./corpus/corpus";
import {
  baselineAdapterFor,
  workingTreeAdapterFor,
  isBaselineSupported,
  materialize,
  recipeName,
  type Recipe,
} from "./vectors/recipes";

const here = dirname(fileURLToPath(import.meta.url));
const BASELINE_SHA256 = "64a82be2f4975e38383dd4cd0089d0185e4d440dc189d6b520ed4c8bc5590367";

/**
 * The allowed differences between the baseline and the working tree. Each
 * names the recipes it covers and, per category, the number of rows it must
 * cover; a difference no entry covers, or a count that moves, fails.
 */
interface AllowedDifference {
  readonly id: string;
  readonly hits: Readonly<Record<string, number>>;
  readonly matches: (r: Recipe, baselineOutcome: string, currentOutcome: string) => boolean;
}
const NEGATIVE_CONTENT = new Set([
  "d99c4020",
  "d99c4038ff",
  "d99c403bfffffffffffffffe",
  "d99c403bffffffffffffffff",
]);
const WHOLE_FLOAT_HEADS = new Set([
  "d99c40fa4f000001",
  "d99c40facf800000",
  "d99c40fadf000000",
  "d99c40fb43e0000000000001",
  "d99c40fbc3e0000000000001",
]);
const ALLOWED_DIFFERENCES: readonly AllowedDifference[] = [
  {
    // A rejected decode is dcbor's `CborError` reported by its code where the
    // baseline threw a bare `Error` or an uncoded `CborError`; the untagged
    // form is rejected on both sides (the tag is part of the type).
    id: "decode-errors-have-codes",
    hits: { decodes: 26 },
    matches: (r, a, b) =>
      r.k === "decode" &&
      (a === "throw:Error" || a === "throw:CborError") &&
      [
        "WrongType",
        "WrongTag",
        "Underrun",
        "UnusedData",
        "NonCanonicalNumeric",
        "OutOfRange",
      ].includes(b.replace("throw:", "")),
  },
  {
    // Negative content inside tag 40000 wraps to `2^64 + n`, as the
    // reference's `u64::try_from`; the baseline rejected it.
    id: "negative-content-wraps",
    hits: { decodes: 4 },
    matches: (r, a, b) =>
      r.k === "decode" &&
      NEGATIVE_CONTENT.has(r.hex) &&
      a.startsWith("throw:") &&
      !b.startsWith("throw:"),
  },
  {
    // A whole float head dcbor turns into an integer node decodes, as the
    // reference; the baseline's dcbor rejected it.
    id: "whole-float-heads",
    hits: { decodes: 5 },
    matches: (r, a, b) =>
      r.k === "decode" &&
      WHOLE_FLOAT_HEADS.has(r.hex) &&
      a.startsWith("throw:") &&
      !b.startsWith("throw:"),
  },
  {
    // `byName("")` answers the unit value where the baseline answered `-`.
    id: "unit-name",
    hits: { lookups: 1 },
    matches: (r, a, b) => r.k === "lookup" && r.key === "" && a === "-" && b === "0||",
  },
  {
    // The global registry is the reference's seed: the bundled vocabulary
    // names, `value`, `Self` and the workflow test row no longer resolve.
    id: "reference-seed",
    hits: { lookups: 5 },
    matches: (r, a, b) => r.k === "lookup" && a !== "-" && b === "-",
  },
  {
    // Argument faults are the package's `KnownValuesError` where the
    // baseline threw a built-in or accepted the input: the enumerated cases.
    id: "argument-faults",
    hits: { domain: 20 },
    matches: (r, a, b) =>
      r.k === "domain" &&
      [
        "new.-1",
        "new.2^64",
        "new.1.5",
        "new.NaN",
        "new.Infinity",
        "new.null",
        "new.undefined",
        "new.string1",
        "new.true",
        "new.name5",
        "byValue.1.5",
        "byValue.-1",
        "byValue.string1",
        "byName.5",
        "register.plainObject",
        "register.lookalike",
        "store.ctor.notIterable",
        "store.ctor.plainObject",
        "nameOf.plainObject",
        "assignedNameOf.plainObject",
      ].includes(r.case) &&
      a !== b &&
      b === "throw:KnownValuesError:InvalidParameter",
  },
  {
    // An unsafe integer `number` is refused instead of rounded.
    id: "unsafe-numbers",
    hits: { domain: 1 },
    matches: (r, a, b) =>
      r.k === "domain" &&
      r.case === "new.2^53+2" &&
      a.startsWith("ok:") &&
      b === "throw:KnownValuesError:InvalidParameter",
  },
  {
    // `equals` is `false` for anything that is not a `KnownValue`.
    id: "equals-non-values",
    hits: { domain: 2 },
    matches: (r, a, b) =>
      r.k === "domain" &&
      (r.case === "equals.undefined" || r.case === "equals.lookalike") &&
      a !== b &&
      b === "ok:false",
  },
];

const baseline = baselineAdapterFor(baselineMod);
const current = workingTreeAdapterFor(src);
/**
 * `DIFFERENTIAL_MEASURE=<path>` writes the observed hits per difference and
 * category, the skip counts, and the unallowed rows, to that file instead of
 * asserting them.
 */
const measure = process.env["DIFFERENTIAL_MEASURE"];
const observed: Record<string, Record<string, number>> = {};
const skips: Record<string, number> = {};
const unallowed: Record<string, string[]> = {};
/** How many rows of each category the baseline cannot run. */
const EXPECTED_SKIPS: Readonly<Record<string, number>> = {
  resolves: 258,
  stores: 10,
  nameFors: 9,
  decodes: 5,
  untagged: 17,
  registryFiles: 125,
  directories: 32,
  configs: 9,
  homes: 3,
  domain: 7,
};

describe("differential: baseline vs working tree", () => {
  it("baseline bundle integrity", () => {
    const sha = createHash("sha256")
      .update(readFileSync(join(here, "baseline/known-values-baseline.mjs")))
      .digest("hex");
    expect(sha).toBe(BASELINE_SHA256);
  });
  for (const [name, gen] of Object.entries(categories)) {
    it(`category ${name}`, { timeout: 600_000 }, () => {
      let n = 0;
      let skipped = 0;
      const diffs: string[] = [];
      const hits: Record<string, number> = {};
      for (const recipe of gen()) {
        if (!isBaselineSupported(recipe)) {
          skipped++;
          continue;
        }
        n++;
        const a = materialize(baseline, recipe);
        const b = materialize(current, recipe);
        if (a === b) continue;
        const allowed = ALLOWED_DIFFERENCES.find((d) => d.matches(recipe, a, b));
        if (allowed === undefined)
          diffs.push(`${recipeName(recipe)}: ${a.slice(0, 90)} !== ${b.slice(0, 90)}`);
        else hits[allowed.id] = (hits[allowed.id] ?? 0) + 1;
      }
      expect(n + skipped).toBeGreaterThan(0);
      if (measure !== undefined) {
        for (const [id, count] of Object.entries(hits)) (observed[id] ??= {})[name] = count;
        skips[name] = skipped;
        if (diffs.length > 0) unallowed[name] = diffs;
        return;
      }
      expect(diffs).toEqual([]);
      expect(skipped, `skipped in ${name}`).toBe(EXPECTED_SKIPS[name] ?? 0);
      for (const d of ALLOWED_DIFFERENCES)
        expect(hits[d.id] ?? 0, `${d.id} in ${name}`).toBe(d.hits[name] ?? 0);
    });
  }
  it("every allowed difference is hit", () => {
    if (measure !== undefined) {
      writeFileSync(measure, JSON.stringify({ observed, skips, unallowed }, null, 1));
      return;
    }
    for (const d of ALLOWED_DIFFERENCES)
      expect(
        Object.values(d.hits).reduce((s, x) => s + x, 0),
        d.id,
      ).toBeGreaterThan(0);
  });
});
