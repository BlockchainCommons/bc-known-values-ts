/**
 * Runs a `config` or `home` recipe sequence in a fresh process, where the
 * global registry has not been built yet: `bun tests/vectors/child.ts
 * '<steps json>'` with `KNOWN_VALUES_CHILD_ROOT` naming the tree root and
 * `HOME` set by the parent. Prints the outcome, one `;`-joined string.
 */
import { join } from "node:path";
import process from "node:process";
import * as m from "../../src/index.js";
import type { ConfigStep } from "./recipes.js";

const root = process.env["KNOWN_VALUES_CHILD_ROOT"] ?? "";
const steps = JSON.parse(process.argv[2] ?? "[]") as ConfigStep[];
const brief = (kv: m.KnownValue): string =>
  `${kv.valueBigInt}|${kv.name}|${kv.assignedName ?? "-"}`;
const thrown = (e: unknown): string => {
  const x = e as { name?: string; code?: string; message?: string };
  const code =
    x.name === "KnownValuesError" || x.name === "CborError" ? String(x.code) : String(x.name);
  return `throw:${code}:${x.message ?? String(e)}`;
};
const out: string[] = [];
for (const s of steps) {
  try {
    if ("set" in s) {
      m.setDirectoryConfig(new m.DirectoryConfig(s.set.map((p) => join(root, p))));
      out.push("ok");
    } else if ("add" in s) {
      m.addSearchPaths(s.add.map((p) => join(root, p)));
      out.push("ok");
    } else if ("access" in s) {
      m.getGlobalKnownValuesStore();
      out.push("ok");
    } else if ("named" in s) {
      const kv = m.getGlobalKnownValuesStore().byName(s.named);
      out.push(kv === undefined ? "-" : brief(kv));
    } else {
      out.push(brief(m.resolveKnownValue(BigInt(s.resolve), m.getGlobalKnownValuesStore())));
    }
  } catch (e) {
    out.push(thrown(e));
  }
}
process.stdout.write(out.join(";"));
