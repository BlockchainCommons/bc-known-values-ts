/**
 * Differential suite: every corpus recipe through the frozen baseline
 * bundle and the working tree; outcomes must be identical except for
 * enumerated tombstones.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import * as baselineMod from "./baseline/known-values-baseline.mjs";
import * as src from "../src/index.js";
import { categories } from "./corpus/corpus";
import {
  baselineAdapterFor,
  redesignedAdapterFor,
  isBaselineSupported,
  materialize,
  recipeName,
  type Recipe,
} from "./vectors/recipes";

const here = dirname(fileURLToPath(import.meta.url));
const BASELINE_SHA256 = "64a82be2f4975e38383dd4cd0089d0185e4d440dc189d6b520ed4c8bc5590367";

/**
 * Tombstones: the only allowed differences.
 * T1: decoding rejects through dcbor's typed accessors, so a rejected
 *    decode is a `CborError` (with a code) where the baseline threw a bare
 *    `Error`.
 * T2: `KnownValue.fromCbor` accepts the untagged form (the bare unsigned
 *    integer), where the baseline's `fromCborData` required the tag.
 * T2b: a negative or above-64-bit codepoint is a `RangeError` where the
 *    baseline accepted it.
 * T3 (B2): `byName("")` answers the unit value (`0||`) where the baseline
 *    answers `-`.
 * T4: argument faults are the package's `RangeError` (`null`, `undefined`,
 *    `"1"`, `true`, `-1` in a lookup, a numeric name) where the baseline
 *    threw V8's `TypeError` or accepted the input.
 * T5 (B4): `200000` has no name where the baseline had `testWorkflowEntry`
 *    (the workflow test row is no longer bundled).
 */
const TOMBSTONES: {
  id: string;
  landed: boolean;
  /** For a pending tombstone: the exact number of rows it must cover today. */
  rowsBeforeLanding?: number;
  matches: (r: Recipe, baselineOutcome: string, currentOutcome: string) => boolean;
}[] = [
  {
    id: "T1",
    landed: true,
    matches: (r, a, b) => r.k === "decode" && a === "throw:Error" && b === "throw:CborError",
  },
  {
    id: "T2",
    landed: true,
    matches: (r, a, b) =>
      r.k === "decode" && !r.hex.startsWith("d9") && a === "throw:Error" && !b.startsWith("throw:"),
  },
  {
    id: "T2b-range-check",
    landed: true,
    matches: (r, a, b) =>
      r.k === "domain" &&
      (r.case === "new.-1" || r.case === "new.2^64") &&
      a.startsWith("ok:") &&
      b === "throw:RangeError",
  },
  {
    id: "T3-unit-name",
    landed: true,
    matches: (r, a, b) =>
      r.k === "lookup" && r.by === "name" && r.key === "" && a === "-" && b === "0||",
  },
  {
    id: "T4-argument-faults",
    landed: true,
    matches: (r, a, b) => r.k === "domain" && a !== b && b === "throw:RangeError",
  },
  {
    id: "T5-test-artefact",
    landed: true,
    matches: (r, a, b) =>
      r.k === "lookup" &&
      ((r.by === "value" && r.key === "200000") ||
        (r.by === "name" && r.key === "testWorkflowEntry")) &&
      a.includes("testWorkflowEntry") &&
      b === "-",
  },
];

const baseline = baselineAdapterFor(baselineMod);
const current = redesignedAdapterFor(src);

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
      const pendingHits: Record<string, number> = {};
      for (const recipe of gen()) {
        if (!isBaselineSupported(recipe)) {
          skipped++;
          continue;
        }
        n++;
        const a = materialize(baseline, recipe);
        const b = materialize(current, recipe);
        if (a === b) continue;
        const tomb = TOMBSTONES.find((t) => t.matches(recipe, a, b));
        if (tomb === undefined)
          diffs.push(`${recipeName(recipe)}: ${a.slice(0, 90)} !== ${b.slice(0, 90)}`);
        else if (!tomb.landed) pendingHits[tomb.id] = (pendingHits[tomb.id] ?? 0) + 1;
      }
      expect(n + skipped).toBeGreaterThan(0);
      expect(diffs).toEqual([]);
      for (const t of TOMBSTONES)
        if (!t.landed && (pendingHits[t.id] ?? 0) !== 0)
          expect(pendingHits[t.id]).toBe(t.rowsBeforeLanding);
    });
  }
});
