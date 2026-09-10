/**
 * Recipes (Phase 1.1): the pure data from which every vector is
 * materialised, and the adapters that run a recipe against the frozen
 * baseline bundle or the working tree.
 *
 * - `kv`: construct `KnownValue(v, name?)` and report its tagged CBOR, its
 *   digest, `name()` and the assigned name.
 * - `decode`: decode tagged CBOR bytes.
 * - `lookup`: resolve a value or a name in the global registry.
 */
import { rustShapedAdapterFor } from "./baseline-adapter";
import { redesignedShapedAdapterFor } from "./redesigned-adapter";

export type Recipe =
  | { k: "kv"; v: string; name?: string }
  | { k: "decode"; hex: string }
  | { k: "lookup"; by: "value" | "name"; key: string };

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
  }
}

export function materialize(api: VectorApi, r: Recipe): Outcome {
  try {
    return api.run(r);
  } catch (e) {
    return `throw:${api.errorCode(e)}`;
  }
}

export function baselineAdapterFor(m: any): VectorApi {
  return rustShapedAdapterFor(m);
}
export function redesignedAdapterFor(m: any): VectorApi {
  return redesignedShapedAdapterFor(m);
}
