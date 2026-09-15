/**
 * The global registry starts from the reference's seed: the constants
 * `KnownValuesStore::new([...])` lists in `known_values_registry.rs`, in its
 * order, extracted into `tests/fixtures/reference-seed.json`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { REGISTRY_CONSTANTS, SELF, VALUE, getGlobalKnownValuesStore } from "../src/index.js";
import { referenceStoreSeed } from "../src/registry.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, "fixtures/reference-seed.json"), "utf8")) as {
  codepoint: number;
  name: string;
}[];

describe("the reference seed", () => {
  it("is the fixture, in order", () => {
    expect(fixture.length).toBe(102);
    expect(
      referenceStoreSeed().map((kv) => ({ codepoint: Number(kv.value), name: kv.name })),
    ).toEqual(fixture);
    expect(Object.isFrozen(referenceStoreSeed())).toBe(true);
  });
  it("is every exported constant except VALUE and SELF, which keep their names", () => {
    const seeded = new Set(referenceStoreSeed());
    const omitted = REGISTRY_CONSTANTS.filter((kv) => !seeded.has(kv));
    expect(omitted).toEqual([VALUE, SELF]);
    expect(VALUE.name).toBe("value");
    expect(SELF.name).toBe("Self");
  });
  it("is what the global registry holds under an empty directory configuration", () => {
    const store = getGlobalKnownValuesStore();
    expect([...store].map((kv) => ({ codepoint: Number(kv.value), name: kv.name }))).toEqual(
      fixture,
    );
    expect(store.byName("value")).toBeUndefined();
    expect(store.byName("Self")).toBeUndefined();
    expect(store.byValue(25)).toBeUndefined();
    expect(store.byValue(706)).toBeUndefined();
    expect(store.nameOf(VALUE)).toBe("value");
  });
});
