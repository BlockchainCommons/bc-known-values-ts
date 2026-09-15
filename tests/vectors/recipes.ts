/**
 * Recipes: the pure data from which every vector is materialised, and the
 * adapters that run a recipe against the frozen baseline bundle or the
 * working tree. Every recipe yields one outcome string; the Rust harness
 * computes the same string from the reference and compares.
 *
 * - `kv`: construct `KnownValue(v, name?)` and report its tagged CBOR, its
 *   digest, `name` and the assigned name.
 * - `decode`: decode tagged CBOR bytes (`tags: true` rows run after the tags
 *   are registered, so tag names appear in the messages).
 * - `untagged`: decode the bare content of tag 40000.
 * - `lookup`: resolve a name in the global registry.
 * - `resolve`: `resolveKnownValue(v, store)` with no store, the global one, or
 *   a store built from `ops`; always prints a value.
 * - `store`: apply registrations to a fresh store and answer queries.
 * - `nameFor`: the reference's `name_for_known_value(kv, store)`.
 * - `registryParse`: parse registry-file bytes.
 * - `directory`: a strict load of one directory or a tolerant load of several,
 *   over a temporary tree the recipe describes.
 * - `config`: the global registry in a fresh process, under a sequence of
 *   configuration calls.
 * - `home`: the global registry in a fresh process whose `HOME` points into
 *   the tree.
 * - `domain`: a named JS-only input case; the outcome is `ok:<value>` or
 *   `throw:<class>:<code>`; the harness counts it as JS-only.
 *
 * A failure is `throw:<code>` or, with `messages`, `throw:<code>:<message>`:
 * a `KnownValuesError`'s code and message, a dcbor `CborError`'s code and
 * message, and any other error's class name.
 */
import { rustShapedAdapterFor } from "./baseline-adapter";
import { workingTreeAdapterOver } from "./working-tree-adapter";

/** A file in a recipe tree: text, exact bytes, or a directory (`null`). */
export type TreeEntry = { text: string } | { hex: string } | null;
/** A directory tree by tree-relative path; a `null` entry is a directory. */
export type Tree = Record<string, TreeEntry>;
/** `register(new KnownValue(v, name?))`. */
export type StoreOp = { v: string; name?: string };
/** A query on a store: the value named, the assigned name of a codepoint, the store's name for it. */
export type StoreQuery = { named: string } | { assigned: string } | { name: string };
/** One step of a `config` sequence. */
export type ConfigStep =
  | { set: string[] }
  | { add: string[] }
  | { access: true }
  | { named: string }
  | { resolve: string };

export type Recipe =
  | { k: "kv"; v: string; name?: string }
  | { k: "decode"; hex: string; tags?: true }
  | { k: "untagged"; hex: string }
  | { k: "lookup"; by: "name"; key: string }
  | { k: "resolve"; v: string; store: "none" | "global" | "recipe"; ops?: StoreOp[] }
  | { k: "store"; ops: StoreOp[]; queries: StoreQuery[] }
  | { k: "nameFor"; v: string; name?: string; store: "none" | "global" }
  | { k: "registryParse"; hex: string; note: string }
  | { k: "directory"; tree: Tree; mode: "strict" | "config"; paths: string[]; note: string }
  | { k: "config"; tree: Tree; sequence: ConfigStep[]; note: string }
  | { k: "home"; tree: Tree; home: string; queries: ConfigStep[]; note: string }
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
  "new.2^53-1",
  "new.2^53+2",
  "new.bigint2^53+1",
  "new.-1",
  "new.2^64",
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
  "equals.undefined",
  "equals.lookalike",
  "resolve.1.5",
  "config.paths.notArray",
  "config.paths.number",
  "config.addPath.number",
  "setDirectoryConfig.plainObject",
  "addSearchPaths.string",
  "loadFromDirectory.number",
];

/**
 * The frozen bundle has none of the newer surface: `resolveKnownValue`'s
 * store argument, the error class, the untagged decoder's wrap, the
 * directory loader, the registry-file parser, or the store guards.
 */
export function isBaselineSupported(r: Recipe): boolean {
  switch (r.k) {
    case "kv":
    case "decode":
    case "lookup":
      return r.k !== "decode" || r.tags !== true;
    case "domain":
      return !(
        r.case.startsWith("resolve.") ||
        r.case.startsWith("config.") ||
        r.case.startsWith("setDirectoryConfig.") ||
        r.case.startsWith("addSearchPaths.") ||
        r.case.startsWith("loadFromDirectory.")
      );
    default:
      return false;
  }
}

export type Outcome = string;

export interface VectorApi {
  run(r: Recipe): Outcome;
  errorCode(e: unknown): string;
  /** The error's message; absent on the frozen baseline (messages are not compared there). */
  errorMessage?(e: unknown): string;
}

export const hex = (u: Uint8Array): string => Buffer.from(u).toString("hex");
export const unhex = (h: string): Uint8Array => Uint8Array.from(Buffer.from(h, "hex"));
/** The bytes of a tree entry. */
export const entryBytes = (e: Exclude<TreeEntry, null>): Uint8Array =>
  "hex" in e ? unhex(e.hex) : new TextEncoder().encode(e.text);

const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n)}…` : s);
const opsName = (ops: StoreOp[]): string =>
  ops.map((o) => (o.name === undefined ? o.v : `${o.v}=${o.name}`)).join(",");

export function recipeName(r: Recipe): string {
  switch (r.k) {
    case "kv":
      return `kv ${r.v}${r.name === undefined ? "" : ` "${r.name}"`}`;
    case "decode":
      return `decode ${r.hex}${r.tags ? " (tags registered)" : ""}`;
    case "untagged":
      return `untagged ${r.hex}`;
    case "lookup":
      return `lookup ${r.by} ${JSON.stringify(r.key)}`;
    case "resolve":
      return `resolve ${r.v} store=${r.store}${r.ops ? ` [${opsName(r.ops)}]` : ""}`;
    case "store":
      return `store [${opsName(r.ops)}] ${r.queries.map((q) => JSON.stringify(q)).join(" ")}`;
    case "nameFor":
      return `nameFor ${r.v}${r.name === undefined ? "" : `=${r.name}`} store=${r.store}`;
    case "registryParse":
      return `registryParse ${r.note}`;
    case "directory":
      return `directory ${r.mode} [${r.paths.join(",")}] ${r.note}`;
    case "config":
      return `config ${r.note}`;
    case "home":
      return `home ${JSON.stringify(clip(r.home, 20))} ${r.note}`;
    case "domain":
      return `domain ${r.case}`;
  }
}

export interface MaterializeOptions {
  /** Append the error message to a `throw:` outcome (the Rust harness compares it). */
  messages?: boolean;
}

export function materialize(
  api: VectorApi,
  r: Recipe,
  { messages = false }: MaterializeOptions = {},
): Outcome {
  try {
    return api.run(r);
  } catch (e) {
    const code = api.errorCode(e);
    if (!messages || api.errorMessage === undefined) return `throw:${code}`;
    return `throw:${code}:${api.errorMessage(e)}`;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any -- the frozen baseline and the working tree expose different module shapes; each adapter narrows what it touches. */
export function baselineAdapterFor(m: any): VectorApi {
  return rustShapedAdapterFor(m);
}
/** The working tree. */
export function workingTreeAdapterFor(m: any): VectorApi {
  return workingTreeAdapterOver(m);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
