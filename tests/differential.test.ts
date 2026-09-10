/**
 * Differential suite (Phase 1.3): every corpus recipe through the frozen
 * baseline bundle and the working tree; outcomes must be identical except
 * for enumerated tombstones.
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
  materialize,
  recipeName,
  type Recipe,
} from "./vectors/recipes";

const here = dirname(fileURLToPath(import.meta.url));
const BASELINE_SHA256 = "8e71c50e6115269bba68406e28b0a242515eb4e6b6077243b86dd0cc1344d95e";

/**
 * Tombstones: the only allowed differences.
 * T1 (landed with W2): decoding rejects through dcbor's typed accessors, so
 *    a rejected decode is a `CborError` (with a code) where the baseline
 *    threw a bare `Error`.
 * T2 (landed with W2): `KnownValue.fromCbor` accepts the untagged form
 *    (the bare unsigned integer), where the baseline's `fromCborData`
 *    required the tag.
 */
const TOMBSTONES: {
  id: string;
  landed: boolean;
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
      const diffs: string[] = [];
      for (const recipe of gen()) {
        n++;
        const a = materialize(baseline, recipe);
        const b = materialize(current, recipe);
        const tomb = TOMBSTONES.find((t) => t.matches(recipe, a, b));
        if (a !== b && tomb?.landed !== true)
          diffs.push(`${recipeName(recipe)}: ${a.slice(0, 90)} !== ${b.slice(0, 90)}`);
      }
      expect(n).toBeGreaterThan(0);
      expect(diffs).toEqual([]);
    });
  }
});
