/**
 * Recipes: the pure data from which every vector is materialised, and the
 * adapters that run a recipe against the frozen baseline bundle or the
 * working tree.
 *
 * - `kv`: construct `KnownValue(v, name?)` and report its tagged CBOR, its
 *   digest, `name()` and the assigned name.
 * - `decode`: decode tagged CBOR bytes.
 * - `lookup`: resolve a value or a name in the global registry.
 * - `domain`: a named JS-only input case; the outcome is `ok:<value>` or
 *   `throw:<class>`; the harness counts it as JS-only.
 */
import { rustShapedAdapterFor } from "./baseline-adapter";
import { redesignedShapedAdapterFor } from "./redesigned-adapter";

export type Recipe =
  | { k: "kv"; v: string; name?: string }
  | { k: "decode"; hex: string }
  | { k: "lookup"; by: "value" | "name"; key: string }
  | { k: "domain"; case: string };

/** The JS-only cases, by name; each adapter runs them from its own table. */
export const DOMAIN_CASES: readonly string[] = [
  "new.1.5",
  "new.NaN",
  "new.Infinity",
  "new.null",
  "new.undefined",
  "new.string1",
  "new.true",
  "new.name5",
  "new.2^53+2",
  "new.-1",
  "new.2^64",
  "byValue.1.5",
  "byValue.-1",
  "byValue.string1",
  "resolve.1.5",
];

/** The frozen bundle has no `resolveKnownValue`; everything else runs on both sides. */
export function isBaselineSupported(r: Recipe): boolean {
  return !(r.k === "domain" && r.case.startsWith("resolve."));
}

export type Outcome = string;

export interface VectorApi {
  run(r: Recipe): Outcome;
  errorCode(e: unknown): string;
}

export const hex = (u: Uint8Array): string => Buffer.from(u).toString("hex");
export const unhex = (h: string): Uint8Array => Uint8Array.from(Buffer.from(h, "hex"));

export function recipeName(r: Recipe): string {
  switch (r.k) {
    case "kv":
      return `kv ${r.v}${r.name === undefined ? "" : ` "${r.name}"`}`;
    case "decode":
      return `decode ${r.hex}`;
    case "lookup":
      return `lookup ${r.by} ${r.key}`;
    case "domain":
      return `domain ${r.case}`;
  }
}

export function materialize(api: VectorApi, r: Recipe): Outcome {
  try {
    return api.run(r);
  } catch (e) {
    return `throw:${api.errorCode(e)}`;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any -- the frozen baseline and the working tree expose different module shapes; each adapter narrows what it touches. */
export function baselineAdapterFor(m: any): VectorApi {
  return rustShapedAdapterFor(m);
}
export function redesignedAdapterFor(m: any): VectorApi {
  return redesignedShapedAdapterFor(m);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
