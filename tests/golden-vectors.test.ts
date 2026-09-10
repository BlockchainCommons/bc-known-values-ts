/**
 * Golden vector suite (Phase 1.2): the committed freeze of every tagged
 * CBOR, digest, registry name and lookup. Changes only through
 * `bun run vectors:generate`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import * as src from "../src/index.js";
import { materialize, redesignedAdapterFor, type Recipe, type Outcome } from "./vectors/recipes";

const here = dirname(fileURLToPath(import.meta.url));
const { count, vectors } = JSON.parse(readFileSync(join(here, "vectors/vectors.json"), "utf8")) as {
  count: number;
  vectors: { name: string; recipe: Recipe; expect: Outcome }[];
};
const api = redesignedAdapterFor(src);

describe("golden vectors (frozen)", () => {
  it("fixture is self-consistent and non-trivial", () => {
    expect(vectors.length).toBe(count);
    expect(vectors.length).toBeGreaterThanOrEqual(4000);
  });
  it("every vector matches", () => {
    const bad: string[] = [];
    for (const v of vectors) {
      const got = materialize(api, v.recipe);
      if (got !== v.expect) bad.push(`${v.name}: expected ${v.expect} got ${got}`);
    }
    expect(bad).toEqual([]);
  });
});
