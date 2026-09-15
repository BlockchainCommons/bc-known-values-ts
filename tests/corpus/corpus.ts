/**
 * Deterministic corpus: values at every dCBOR head cliff, every bundled
 * registry entry (read from the JSON source of truth, not from the
 * package), the global registry's names, resolutions and store semantics,
 * a decode table, registry-file parses, directory loads, configuration
 * sequences and home-directory runs. Pure and deterministic: every tree is
 * spelled out here and materialised in a temporary directory at run time,
 * and no tree makes an outcome depend on the host's directory order (one
 * failing file per strictly loaded directory, no codepoint duplicated across
 * files, lists rendered sorted).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DOMAIN_CASES,
  type ConfigStep,
  type Recipe,
  type StoreOp,
  type StoreQuery,
  type Tree,
  type TreeEntry,
} from "../vectors/recipes";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "..", "data");
const fixturesDir = join(here, "..", "fixtures");

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

/** The constants the reference seeds its store with: `[codepoint, name]` in its order. */
export function referenceSeed(): { codepoint: number; name: string }[] {
  return JSON.parse(readFileSync(join(fixturesDir, "reference-seed.json"), "utf8")) as {
    codepoint: number;
    name: string;
  }[];
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
  yield { k: "kv", v: "7", name: "é" };
  yield { k: "kv", v: "8", name: "tab\tname" };
}
function* registry(): Generator<Recipe> {
  for (const [cp, name] of registryEntries()) yield { k: "kv", v: String(cp), name };
}
/** The negative and edge probes of a lookup by name. */
export const NAME_PROBES: readonly string[] = [
  "",
  "isA",
  "Unknown",
  "nope",
  "IsA",
  "schema:Thing",
  "rdf:Alt",
  "1",
  "value",
  "Self",
  "body",
  "testWorkflowEntry",
];
function* lookups(): Generator<Recipe> {
  const seen = new Set<string>();
  for (const key of [...referenceSeed().map((e) => e.name), ...NAME_PROBES]) {
    if (seen.has(key)) continue;
    seen.add(key);
    yield { k: "lookup", by: "name", key };
  }
}
const RESOLVE_VALUES: string[] = [
  ...Array.from({ length: 121 }, (_, i) => String(i)),
  "706",
  "1000",
  "2000",
  "10844",
  "9007199254740993",
  "18446744073709551615",
];
function* resolves(): Generator<Recipe> {
  for (const v of RESOLVE_VALUES) {
    yield { k: "resolve", v, store: "none" };
    yield { k: "resolve", v, store: "global" };
  }
  // an unnamed registration is a stored hit, printed as itself
  yield { k: "resolve", v: "1", store: "recipe", ops: [{ v: "1" }] };
  yield { k: "resolve", v: "1", store: "recipe", ops: [{ v: "1", name: "one" }] };
  yield { k: "resolve", v: "2", store: "recipe", ops: [{ v: "1", name: "one" }] };
  yield { k: "resolve", v: "0", store: "recipe", ops: [{ v: "0", name: "" }] };
}
const S = (v: string, name?: string): StoreOp => (name === undefined ? { v } : { v, name });
const STORE_SEQUENCES: { ops: StoreOp[]; queries: StoreQuery[] }[] = [
  {
    ops: [S("1", "a"), S("2", "a")],
    queries: [{ named: "a" }, { assigned: "1" }, { assigned: "2" }],
  },
  {
    ops: [S("1", "a"), S("2", "a"), S("1", "b")],
    queries: [{ named: "a" }, { named: "b" }, { assigned: "1" }, { assigned: "2" }],
  },
  {
    ops: [S("1", "a"), S("2", "a"), S("1", "b"), S("2")],
    queries: [{ assigned: "2" }, { name: "2" }, { named: "a" }, { named: "b" }],
  },
  { ops: [S("5", "x"), S("5", "x")], queries: [{ named: "x" }, { assigned: "5" }] },
  {
    ops: [S("5", "x"), S("6", "x"), S("6", "y")],
    queries: [{ named: "x" }, { assigned: "5" }, { named: "y" }, { assigned: "6" }],
  },
  { ops: [S("42")], queries: [{ assigned: "42" }, { name: "42" }, { named: "42" }] },
  { ops: [S("0", "")], queries: [{ named: "" }, { assigned: "0" }, { name: "0" }] },
  { ops: [S("1", "")], queries: [{ named: "" }, { name: "1" }, { assigned: "1" }] },
  { ops: [], queries: [{ named: "isA" }, { assigned: "1" }, { name: "1" }] },
  {
    ops: [S("18446744073709551615", "max"), S("9007199254740993", "big")],
    queries: [{ named: "max" }, { name: "18446744073709551615" }, { named: "big" }],
  },
];
function* stores(): Generator<Recipe> {
  for (const s of STORE_SEQUENCES) yield { k: "store", ops: s.ops, queries: s.queries };
}
function* nameFors(): Generator<Recipe> {
  yield { k: "nameFor", v: "25", name: "value", store: "none" };
  yield { k: "nameFor", v: "25", name: "value", store: "global" };
  yield { k: "nameFor", v: "25", store: "global" };
  yield { k: "nameFor", v: "1", name: "foo", store: "global" };
  yield { k: "nameFor", v: "1", store: "none" };
  yield { k: "nameFor", v: "1", store: "global" };
  yield { k: "nameFor", v: "18446744073709551615", name: "max", store: "global" };
  yield { k: "nameFor", v: "0", store: "global" };
  yield { k: "nameFor", v: "0", name: "zero", store: "global" };
}
const DECODE_HEX: string[] = [
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
  "1818",
  "d99c4161",
  "d8640c",
  "d99c41",
  "d99c4001ff",
  "d99c40c24100",
  "d99c40c24101",
  "d99c40d99c4001",
  "d99c40f97e00",
  "d99c40f5",
  "d99c40a0",
  "d99c4060",
  "d99c40f6",
  // negative content wraps as the reference's u64 conversion
  "d99c4020",
  "d99c4038ff",
  "d99c403bfffffffffffffffe",
  "d99c403bffffffffffffffff",
  // non-canonical heads
  "da00009c4001",
  "d99c401b0000000000000001",
  "d99c40f93c00",
  "d99c40fa4f000000",
  "d99c40fb43e0000000000000",
  "d99c40fb43f0000000000000",
  "d99c40fbc3e0000000000000",
  "d99c40fa7f800000",
  "d99c40fb4410000000000000",
  // whole float heads dcbor turns into integer nodes
  "d99c40fa4f000001",
  "d99c40facf800000",
  "d99c40fadf000000",
  "d99c40fb43e0000000000001",
  "d99c40fbc3e0000000000001",
  "d99c40fa4f800000",
  "d99c40fa5f000000",
  "d99c40fbc3f0000000000001",
];
/** Rows whose messages name the tag: generated after the tags are registered. */
const DECODE_TAGGED_HEX: string[] = ["d8640c", "d99c4101", "d99c40d99c4101", "d8c80c", "d99c4001"];
function* decodes(): Generator<Recipe> {
  for (const hex of DECODE_HEX) yield { k: "decode", hex };
  for (const hex of DECODE_TAGGED_HEX) yield { k: "decode", hex, tags: true };
}
const UNTAGGED_HEX: string[] = [
  "00",
  "01",
  "1818",
  "1bffffffffffffffff",
  "20",
  "38ff",
  "3bfffffffffffffffe",
  "3bffffffffffffffff",
  "c24101",
  "d99c4001",
  "fa4f000000",
  "fa4f800000",
  "fa4f000001",
  "f93c00",
  "60",
  "f6",
  "f5",
];
function* untagged(): Generator<Recipe> {
  for (const hex of UNTAGGED_HEX) yield { k: "untagged", hex };
}
/** The registry-file fixtures the parser suite also runs, when present. */
function* registryFiles(): Generator<Recipe> {
  const file = join(fixturesDir, "registry-files", "cases.json");
  if (!existsSync(file)) return;
  const { cases } = JSON.parse(readFileSync(file, "utf8")) as {
    cases: { name: string; hex: string }[];
  };
  for (const c of cases) yield { k: "registryParse", hex: c.hex, note: c.name };
}

const t = (text: string): TreeEntry => ({ text });
const entries = (rows: string): TreeEntry => t(`{"entries":[${rows}]}`);
/** The valid directories `A` and `B`, a plain file, and directories the loader must ignore or accept by name. */
const VALID_TREE: Tree = {
  "A/01_valid.json": t(
    '{"ontology":{"name":"a","source_url":"https://a.example","start_code_point":1000,"processing_strategy":"manual"},"generated":{"tool":"hand"},"entries":[{"codepoint":1000,"name":"thousand","type":"property","uri":"https://a.example#thousand","description":"one thousand"},{"codepoint":1,"name":"isAOverride"}],"statistics":{"count":2}}',
  ),
  "A/02_unknown_fields.json": t(
    '{"entries":[{"codepoint":1001,"name":"x","extra":{"deep":[1,2,{"k":null}]}}],"other":true}',
  ),
  "A/13_null_optional.json": t(
    '{"ontology":null,"generated":{"tool":null},"entries":[{"codepoint":1013,"name":"nul","type":null,"uri":null,"description":null}],"statistics":null}',
  ),
  "A/31_escape.json": entries('{"codepoint":1031,"name":"tab\\tname"}'),
  "A/05_big.json": entries('{"codepoint":9007199254740993,"name":"big"}'),
  "A/06_u64max.json": entries('{"codepoint":18446744073709551615,"name":"max"}'),
  "A/21_non_nfc.json": entries('{"codepoint":1014,"name":"é"}'),
  "A/18_dupname.json": entries('{"codepoint":5000,"name":"dupName"}'),
  "A/19_dupcp_in_file.json": entries(
    '{"codepoint":6000,"name":"first"},{"codepoint":6000,"name":"second"}',
  ),
  "A/17_UPPER.JSON": entries('{"codepoint":1017,"name":"upper"}'),
  "A/.json": entries('{"codepoint":1018,"name":"dotonly"}'),
  "A/..json": entries('{"codepoint":1050,"name":"dotdot"}'),
  "A/nested": null,
  "A/nested/inner.json": entries('{"codepoint":1019,"name":"nested"}'),
  "A/notes.txt": entries('{"codepoint":1020,"name":"txt"}'),
  "B/01_override.json": entries(
    '{"codepoint":1000,"name":"thousandB"},{"codepoint":5001,"name":"dupNameB"}',
  ),
  plainfile: t("not a directory"),
  empty: null,
  "no-home": null,
};
/** One failing file per directory, so a strict load's first error is the host order's only error. */
const ERROR_TREE: Tree = {
  "E03/03_float.json": entries('{"codepoint":1002.0,"name":"x"}'),
  "E04/04_exp.json": entries('{"codepoint":1e3,"name":"x"}'),
  "E07/07_over.json": entries('{"codepoint":18446744073709551616,"name":"x"}'),
  "E08/08_neg.json": entries('{"codepoint":-1,"name":"x"}'),
  "E09/09_dupfield.json": entries('{"codepoint":1,"codepoint":2,"name":"x"}'),
  "E10/10_bom.json": { hex: `efbbbf${Buffer.from('{"entries":[]}').toString("hex")}` },
  "E11/11_trailing.json": t('{"entries":[]} x'),
  "E12/12_type_num.json": entries('{"codepoint":1,"name":"x","type":5}'),
  "E14/14_missing_entries.json": t('{"ontology":{"name":"a"}}'),
  "E15/15_surrogate.json": entries('{"codepoint":1,"name":"\\ud800"}'),
  "E16/16_ontology_bad.json": t('{"ontology":{"start_code_point":"5"},"entries":[]}'),
  "E20/20_invalid_utf8.json": { hex: `${Buffer.from('{"entries":[]}').toString("hex")}ff` },
  "E22/22_empty.json": t(""),
  "E24/24_entries_obj.json": t('{"entries":{}}'),
  "E25/25_codepoint_string.json": entries('{"codepoint":"1015","name":"x"}'),
  "E26/26_name_missing.json": entries('{"codepoint":1}'),
  "E28/28_dup_top.json": t('{"entries":[],"entries":[]}'),
  "E29/29_neg_zero.json": entries('{"codepoint":-0,"name":"x"}'),
  "E30/30_uri_num.json": entries('{"codepoint":1,"name":"x","uri":7}'),
  "E32/32_leadzero.json": entries('{"codepoint":01020,"name":"x"}'),
  "ED/sub.json": null,
  "ED/ok.json": entries('{"codepoint":1060,"name":"okInED"}'),
};
const TREE: Tree = { ...VALID_TREE, ...ERROR_TREE };
function* directories(): Generator<Recipe> {
  const strict = (path: string, note: string): Recipe => ({
    k: "directory",
    tree: TREE,
    mode: "strict",
    paths: [path],
    note,
  });
  yield strict("A", "valid files, ignored names, an accepted `..json`");
  yield strict("B", "one file");
  yield strict("nonexistent", "a missing directory");
  yield strict("plainfile", "a file where a directory is expected");
  yield strict("empty", "an empty directory");
  for (const dir of Object.keys(ERROR_TREE).map((p) => p.slice(0, p.indexOf("/")))) {
    if (dir === "ED") continue;
    yield strict(dir, `the failing file ${dir}`);
  }
  yield strict("ED", "an entry named like a file that is a directory");
  const config = (paths: string[], note: string): Recipe => ({
    k: "directory",
    tree: TREE,
    mode: "config",
    paths,
    note,
  });
  yield config(["A", "B", "nonexistent", "plainfile", "empty"], "later directories win");
  yield config(["B", "A"], "the other order");
  yield config(["E03", "E08", "E20", "ED", "A"], "per-file errors tolerated");
  yield config(
    Object.keys(ERROR_TREE)
      .map((p) => p.slice(0, p.indexOf("/")))
      .filter((d, i, a) => a.indexOf(d) === i),
    "every failing file at once",
  );
  yield config([], "no directories");
  yield config(["A", "A"], "the same directory twice");
}
const seq = (...steps: ConfigStep[]): ConfigStep[] => steps;
function* configs(): Generator<Recipe> {
  const c = (sequence: ConfigStep[], note: string): Recipe => ({
    k: "config",
    tree: TREE,
    sequence,
    note,
  });
  yield c(
    seq(
      { set: ["A"] },
      { access: true },
      { named: "thousand" },
      { resolve: "1" },
      { set: ["B"] },
      { add: ["B"] },
    ),
    "set, then a late set and add",
  );
  yield c(
    seq({ add: ["A"] }, { access: true }, { named: "isAOverride" }, { named: "value" }),
    "add starts from the default configuration",
  );
  yield c(
    seq(
      { set: ["A", "B"] },
      { access: true },
      { resolve: "1000" },
      { named: "thousandB" },
      { named: "thousand" },
    ),
    "a later directory wins",
  );
  yield c(
    seq(
      { access: true },
      { named: "isA" },
      { named: "value" },
      { named: "Self" },
      { resolve: "25" },
      { resolve: "706" },
    ),
    "no configuration: the seed",
  );
  yield c(
    seq({ set: [] }, { access: true }, { named: "thousand" }, { resolve: "1" }),
    "an empty configuration",
  );
  yield c(
    seq({ set: ["E03"] }, { access: true }, { named: "x" }, { resolve: "1" }),
    "a failing file is tolerated",
  );
  yield c(seq({ add: ["A"] }, { add: ["B"] }, { access: true }, { resolve: "1000" }), "add twice");
  yield c(
    seq(
      { set: ["A"] },
      { set: ["B"] },
      { access: true },
      { resolve: "1000" },
      { named: "thousand" },
    ),
    "set replaces set",
  );
  yield c(seq({ named: "isA" }, { set: ["A"] }), "a lookup locks the configuration");
}
const HOME_TREE: Tree = {
  "h1/.known-values/reg.json": entries(
    '{"codepoint":7000,"name":"custom7000"},{"codepoint":25,"name":"value"}',
  ),
  "h1/.known-values/notes.txt": t("ignored"),
  h2: null,
  "h3/.known-values": t("a file, not a directory"),
};
function* homes(): Generator<Recipe> {
  const h = (home: string, queries: ConfigStep[], note: string): Recipe => ({
    k: "home",
    tree: HOME_TREE,
    home,
    queries,
    note,
  });
  yield h(
    "h1",
    seq({ named: "custom7000" }, { resolve: "25" }, { named: "value" }, { resolve: "1" }),
    "a registry directory in HOME",
  );
  yield h("h2", seq({ named: "custom7000" }, { resolve: "25" }), "no registry directory in HOME");
  yield h("h3", seq({ named: "custom7000" }, { resolve: "25" }), "HOME's registry path is a file");
}
function* domain(): Generator<Recipe> {
  for (const c of DOMAIN_CASES) yield { k: "domain", case: c };
}

export const categories: Record<string, () => Generator<Recipe>> = {
  cliffs,
  registry,
  lookups,
  resolves,
  stores,
  nameFors,
  decodes,
  untagged,
  registryFiles,
  directories,
  configs,
  homes,
  domain,
};

export function* allRecipes(): Generator<Recipe> {
  for (const g of Object.values(categories)) yield* g();
}
/** Golden subset: the whole corpus (it is small enough to freeze entirely). */
export function* goldenRecipes(): Generator<Recipe> {
  yield* allRecipes();
}
