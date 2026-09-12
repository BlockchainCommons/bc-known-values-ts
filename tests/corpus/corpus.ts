/**
 * Deterministic corpus: values at every dCBOR head cliff, every bundled
 * registry entry (read from the JSON source of truth, not from the
 * package), lookups by value over the whole low range and by name, and a
 * decode/reject table. Pure and deterministic.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DOMAIN_CASES, type Recipe } from "../vectors/recipes";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "data");

/** Every `[codepoint, name]` of the bundled registries, in load order. */
export function registryEntries(): [number, string][] {
  const out: [number, string][] = [];
  const files = readdirSync(dataDir)
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => Number(a.split("_")[0]) - Number(b.split("_")[0]));
  for (const f of files) {
    const doc = JSON.parse(readFileSync(join(dataDir, f), "utf8")) as {
      entries: { codepoint: number; name: string }[];
    };
    for (const e of doc.entries) out.push([e.codepoint, e.name]);
  }
  return out;
}

export const CLIFFS: string[] = [
  "0",
  "1",
  "23",
  "24",
  "25",
  "255",
  "256",
  "65535",
  "65536",
  "4294967295",
  "4294967296",
  "9007199254740991",
  "9007199254740992",
  "9007199254740993",
  "18446744073709551615",
];

function* cliffs(): Generator<Recipe> {
  for (const v of CLIFFS) {
    yield { k: "kv", v };
    yield { k: "kv", v, name: `n${v}` };
  }
  yield { k: "kv", v: "1", name: "" };
}
function* registry(): Generator<Recipe> {
  for (const [cp, name] of registryEntries()) yield { k: "kv", v: String(cp), name };
}
function* lookups(): Generator<Recipe> {
  for (let v = 0; v <= 800; v++) yield { k: "lookup", by: "value", key: String(v) };
  const seen = new Set<number>();
  for (const [cp, name] of registryEntries()) {
    if (cp > 800 && !seen.has(cp)) {
      seen.add(cp);
      yield { k: "lookup", by: "value", key: String(cp) };
    }
    yield { k: "lookup", by: "name", key: name };
  }
  for (const key of ["", "isA", "Unknown", "nope", "IsA", "schema:Thing", "1"]) {
    yield { k: "lookup", by: "name", key };
  }
}
function* decodes(): Generator<Recipe> {
  for (const hex of [
    "d99c4000",
    "d99c4001",
    "d99c4017",
    "d99c401818",
    "d99c401864",
    "d99c40190100",
    "d99c401a00010000",
    "d99c401b0020000000000000",
    "d99c401bffffffffffffffff",
    "01",
    "1818", // untagged: rejected by fromCborData
    "d99c4020", // negative
    "d99c4161", // text
    "d8640c", // tag 100
    "d99c41", // tag 40001 truncated
    "d99c4001ff", // trailing byte
    "d99c40c24100", // bignum inside
  ])
    yield { k: "decode", hex };
}

function* domain(): Generator<Recipe> {
  for (const c of DOMAIN_CASES) yield { k: "domain", case: c };
}

export const categories: Record<string, () => Generator<Recipe>> = {
  cliffs,
  registry,
  lookups,
  decodes,
  domain,
};

/** The names the reference registers (its 102 constants, `VALUE` and `SELF` omitted) plus the two it omits: every constant's name is a golden lookup. */
function constantNames(): string[] {
  return registryEntries()
    .filter(([cp]) => cp <= 800)
    .map(([, name]) => name)
    .concat(["body"]);
}
/** The negative and edge probes of a lookup by name. */
export const NAME_PROBES: readonly string[] = [
  "",
  "isA",
  "Unknown",
  "nope",
  "IsA",
  "schema:Thing",
  "1",
  "value",
  "Self",
  "testWorkflowEntry",
];
export function* allRecipes(): Generator<Recipe> {
  for (const g of Object.values(categories)) yield* g();
}
/**
 * Golden subset: everything except the vocabulary lookups by name (the
 * registry `kv` rows already pin every name); the constants' names and the
 * probes are looked up by name, and the domain cases ride along as
 * JS-only rows.
 */
export function* goldenRecipes(): Generator<Recipe> {
  yield* cliffs();
  yield* registry();
  for (const r of lookups()) if (r.k === "lookup" && r.by === "value") yield r;
  const seen = new Set<string>();
  for (const key of [...constantNames(), ...NAME_PROBES]) {
    if (seen.has(key)) continue;
    seen.add(key);
    yield { k: "lookup", by: "name", key };
  }
  yield* decodes();
  yield* domain();
}
