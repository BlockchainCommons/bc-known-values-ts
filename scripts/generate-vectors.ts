/**
 * Vector generator. Materialises recipes with the WORKING TREE, error
 * messages included, in the order the Rust harness replays them: the
 * `decode` rows whose messages name the tag come last, after the tags are
 * registered. The directory configuration is pinned empty first, so the
 * machine's `~/.known-values` cannot reach an outcome (the `config` and
 * `home` rows run in child processes of their own).
 *
 *   bun scripts/generate-vectors.ts                 # the golden set → tests/vectors/vectors.json
 *   bun scripts/generate-vectors.ts --full <path>   # the whole corpus → <path> (not committed)
 *
 * Regenerating the golden file is a deliberate, reviewed act.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DirectoryConfig, setDirectoryConfig } from "../src/directory.ts";

setDirectoryConfig(new DirectoryConfig());

const { registerTags } = await import("@blockchaincommons/tags");
const { materialize, recipeName, workingTreeAdapterFor } = await import(
  "../tests/vectors/recipes.ts"
);
const { allRecipes, goldenRecipes } = await import("../tests/corpus/corpus.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fullIndex = process.argv.indexOf("--full");
const full = fullIndex !== -1;
const out = full ? process.argv[fullIndex + 1] : join(root, "tests/vectors/vectors.json");
if (out === undefined) throw new Error("--full needs an output path");

const api = workingTreeAdapterFor(await import("../src/index.ts"));
const recipes = [...(full ? allRecipes() : goldenRecipes())];
const tagged = recipes.filter((r) => r.k === "decode" && r.tags === true);
const rest = recipes.filter((r) => !(r.k === "decode" && r.tags === true));
const row = (recipe: (typeof recipes)[number]) => ({
  name: recipeName(recipe),
  recipe,
  expect: materialize(api, recipe, { messages: true }),
});
const vectors = rest.map(row);
registerTags();
vectors.push(...tagged.map(row));

writeFileSync(out, JSON.stringify({ count: vectors.length, vectors }, null, 1) + "\n");
console.log(`wrote ${vectors.length} ${full ? "corpus" : "golden"} vectors to ${out}`);
