/**
 * Golden vector suite: the committed freeze of every tagged CBOR, digest,
 * registry name, lookup, decode message, directory load and configuration
 * run. Changes only through `bun run vectors:generate`. The `decode` rows
 * whose messages name the tag come last in the file and run after the tags
 * are registered, as the generator and the Rust harness run them.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { registerTags } from "@blockchaincommons/tags";
import * as src from "../src/index.js";
import { materialize, workingTreeAdapterFor, type Recipe, type Outcome } from "./vectors/recipes";

const here = dirname(fileURLToPath(import.meta.url));
const { count, vectors } = JSON.parse(readFileSync(join(here, "vectors/vectors.json"), "utf8")) as {
  count: number;
  vectors: { name: string; recipe: Recipe; expect: Outcome }[];
};
const api = workingTreeAdapterFor(src);
const isTagged = (r: Recipe): boolean => r.k === "decode" && r.tags === true;

describe("golden vectors (frozen)", () => {
  it("fixture is self-consistent and non-trivial", () => {
    expect(vectors.length).toBe(count);
    expect(vectors.length).toBeGreaterThanOrEqual(4000);
    const firstTagged = vectors.findIndex((v) => isTagged(v.recipe));
    expect(firstTagged).toBeGreaterThan(0);
    expect(vectors.slice(firstTagged).every((v) => isTagged(v.recipe))).toBe(true);
  });
  it("every vector before the tags are registered matches", { timeout: 300_000 }, () => {
    const bad: string[] = [];
    for (const v of vectors) {
      if (isTagged(v.recipe)) continue;
      const got = materialize(api, v.recipe, { messages: true });
      if (got !== v.expect) bad.push(`${v.name}: expected ${v.expect} got ${got}`);
    }
    expect(bad).toEqual([]);
  });
  it("every vector after the tags are registered matches", () => {
    registerTags();
    const bad: string[] = [];
    for (const v of vectors) {
      if (!isTagged(v.recipe)) continue;
      const got = materialize(api, v.recipe, { messages: true });
      if (got !== v.expect) bad.push(`${v.name}: expected ${v.expect} got ${got}`);
    }
    expect(bad).toEqual([]);
  });
});
