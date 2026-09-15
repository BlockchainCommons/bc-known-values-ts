/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The adapter over the working tree: one function per recipe kind, each
 * returning the outcome string the Rust harness prints for the same recipe.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeCbor } from "@blockchaincommons/dcbor";
import { type ConfigStep, type Tree, type VectorApi, entryBytes, hex, unhex } from "./recipes";
import { renderRegistryFile } from "../registry-file-render";

const here = dirname(fileURLToPath(import.meta.url));
const bad = (x: unknown): any => x;

/** Writes a recipe tree under a fresh temporary directory; returns its root. */
export function materializeTree(tree: Tree): string {
  const root = mkdtempSync(join(tmpdir(), "known-values-"));
  for (const [rel, entry] of Object.entries(tree)) {
    const path = join(root, rel);
    if (entry === null) {
      mkdirSync(path, { recursive: true });
    } else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, entryBytes(entry));
    }
  }
  return root;
}

/** A path or message with the tree root spelled `<root>` and the host separator `/`. */
export const relativize = (s: string, root: string): string =>
  s.split(root).join("<root>").split("\\").join("/");

export function workingTreeAdapterOver(m: any): VectorApi {
  const describe = (kv: any): string =>
    `${hex(kv.toCbor().toData())}|${kv.digest().toHex()}|${kv.name}|${kv.assignedName ?? "-"}`;
  const brief = (kv: any): string => `${kv.valueBigInt}|${kv.name}|${kv.assignedName ?? "-"}`;
  const kvOf = (v: string, name?: string): any => new m.KnownValue(BigInt(v), name);
  const storeOf = (ops: { v: string; name?: string }[]): any => {
    const store = new m.KnownValuesStore();
    for (const op of ops) store.register(kvOf(op.v, op.name));
    return store;
  };
  const errorCode = (e: unknown): string => {
    const x = e as any;
    const name = String(x?.name ?? "Error");
    if (name === "KnownValuesError" || name === "CborError") return String(x.code);
    return name;
  };
  const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));
  const thrown = (e: unknown): string => `throw:${errorCode(e)}:${errorMessage(e)}`;
  /** Values sorted by codepoint, as `v:name`. */
  const valueList = (values: Iterable<any>): string =>
    [...values]
      .sort((a, b) => (a.valueBigInt < b.valueBigInt ? -1 : a.valueBigInt > b.valueBigInt ? 1 : 0))
      .map((kv) => `${kv.valueBigInt}:${kv.name}`)
      .join(";");
  /** Runs `steps` in a fresh process (the global registry initialises once per process). */
  const inChild = (tree: Tree, home: string | undefined, steps: ConfigStep[]): string => {
    const root = materializeTree(tree);
    try {
      const env: Record<string, string | undefined> = {
        ...process.env,
        KNOWN_VALUES_CHILD_ROOT: root,
      };
      // An inert default configuration: the child's HOME has no registry directory
      // unless the recipe points it at one.
      env["HOME"] = home === undefined ? join(root, "no-home") : join(root, home);
      const result = spawnSync("bun", [join(here, "child.ts"), JSON.stringify(steps)], {
        env,
        encoding: "utf8",
      });
      if (result.status !== 0) {
        return `child-failed:${(result.stderr ?? "").trim().split("\n").slice(-3).join(" ")}`;
      }
      return relativize(result.stdout.trim(), root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };
  const domainCases: Record<string, () => unknown> = {
    "new.1.5": () => new m.KnownValue(1.5).name,
    "new.NaN": () => new m.KnownValue(NaN).name,
    "new.Infinity": () => new m.KnownValue(Infinity).name,
    "new.null": () => new m.KnownValue(bad(null)).name,
    "new.undefined": () => new m.KnownValue(bad(undefined)).name,
    "new.string1": () => new m.KnownValue(bad("1")).name,
    "new.true": () => new m.KnownValue(bad(true)).name,
    "new.name5": () => typeof new m.KnownValue(1, bad(5)).name,
    "new.2^53-1": () => String(new m.KnownValue(2 ** 53 - 1).valueBigInt),
    "new.2^53+2": () => String(new m.KnownValue(2 ** 53 + 2).valueBigInt),
    "new.bigint2^53+1": () => String(new m.KnownValue(2n ** 53n + 1n).valueBigInt),
    "new.-1": () => new m.KnownValue(-1).name,
    "new.2^64": () => new m.KnownValue(2n ** 64n).name,
    "byValue.1.5": () => m.getGlobalKnownValuesStore().byValue(1.5)?.name ?? "-",
    "byValue.-1": () => m.getGlobalKnownValuesStore().byValue(-1)?.name ?? "-",
    "byValue.string1": () => m.getGlobalKnownValuesStore().byValue(bad("1"))?.name ?? "-",
    "byName.5": () => m.getGlobalKnownValuesStore().byName(bad(5))?.name ?? "-",
    "register.plainObject": () => {
      const s = new m.KnownValuesStore();
      s.register(bad({}));
      return s.size;
    },
    "register.lookalike": () => {
      const s = new m.KnownValuesStore();
      s.register(bad({ valueBigInt: 7n, assignedName: "p", name: "p" }));
      return s.size;
    },
    "store.ctor.notIterable": () => new m.KnownValuesStore(bad(5)).size,
    "store.ctor.plainObject": () => new m.KnownValuesStore(bad([{}])).size,
    "nameOf.plainObject": () => new m.KnownValuesStore().nameOf(bad({ valueBigInt: 1n })),
    "assignedNameOf.plainObject": () =>
      new m.KnownValuesStore().assignedNameOf(bad({ valueBigInt: 1n })) ?? "-",
    "equals.undefined": () => m.IS_A.equals(undefined),
    "equals.lookalike": () => m.IS_A.equals({ _value: 1n, valueBigInt: 1n }),
    "resolve.1.5": () => m.resolveKnownValue(1.5, undefined).name,
    "config.paths.notArray": () => new m.DirectoryConfig(bad("a")).paths.length,
    "config.paths.number": () => new m.DirectoryConfig(bad([1])).paths.length,
    "config.addPath.number": () => {
      const c = new m.DirectoryConfig();
      c.addPath(bad(1));
      return c.paths.length;
    },
    "setDirectoryConfig.plainObject": () => {
      m.setDirectoryConfig(bad({}));
      return "set";
    },
    "addSearchPaths.string": () => {
      m.addSearchPaths(bad("a"));
      return "added";
    },
    "loadFromDirectory.number": () => m.loadFromDirectory(bad(5)).length,
  };
  return {
    errorCode,
    errorMessage,
    run(r) {
      switch (r.k) {
        case "kv":
          return describe(kvOf(r.v, r.name));
        case "decode":
          return describe(m.KnownValue.fromCbor(decodeCbor(unhex(r.hex))));
        case "untagged":
          return describe(m.KnownValue.fromUntaggedCbor(decodeCbor(unhex(r.hex))));
        case "lookup": {
          const kv = m.getGlobalKnownValuesStore().byName(r.key);
          return kv === undefined ? "-" : brief(kv);
        }
        case "resolve": {
          const store =
            r.store === "none"
              ? undefined
              : r.store === "global"
                ? m.getGlobalKnownValuesStore()
                : storeOf(r.ops ?? []);
          return brief(m.resolveKnownValue(BigInt(r.v), store));
        }
        case "store": {
          const store = storeOf(r.ops);
          return r.queries
            .map((q) => {
              if ("named" in q) {
                const kv = store.byName(q.named);
                return kv === undefined ? "-" : String(kv.valueBigInt);
              }
              if ("assigned" in q) return store.assignedNameOf(kvOf(q.assigned)) ?? "-";
              return store.nameOf(kvOf(q.name));
            })
            .join(";");
        }
        case "nameFor": {
          const kv = kvOf(r.v, r.name);
          const store = r.store === "none" ? undefined : m.getGlobalKnownValuesStore();
          return store?.nameOf(kv) ?? kv.name;
        }
        case "registryParse": {
          const bytes = unhex(r.hex);
          let text: string;
          try {
            text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
          } catch {
            return "throw:Io:stream did not contain valid UTF-8";
          }
          return `ok:${renderRegistryFile(m.parseRegistryFile(text))}`;
        }
        case "directory": {
          const root = materializeTree(r.tree);
          try {
            const [first] = r.paths;
            if (r.mode === "strict") {
              if (first === undefined) throw new Error("a strict load names one directory");
              const values = m.loadFromDirectory(join(root, first));
              return `ok:${values.length}:${valueList(values)}`;
            }
            const result = m.loadFromConfig(
              new m.DirectoryConfig(r.paths.map((p) => join(root, p))),
            );
            const processed = result.filesProcessed.map((p: string) => relativize(p, root));
            const errors = [...result.errors]
              .map(
                (e: any) =>
                  `${relativize(e.path, root)}:${e.error.code}:${relativize(e.error.message, root)}`,
              )
              .sort();
            return `values=[${valueList(result.values.values())}]|processed=[${processed.join(";")}]|errors=[${errors.join(";")}]`;
          } catch (e) {
            return relativize(thrown(e), root);
          } finally {
            rmSync(root, { recursive: true, force: true });
          }
        }
        case "config":
          return inChild(r.tree, undefined, r.sequence);
        case "home":
          return inChild(r.tree, r.home, r.queries);
        case "domain": {
          const f = domainCases[r.case];
          if (f === undefined) throw new Error(`unknown domain case ${r.case}`);
          try {
            return `ok:${String(f())}`;
          } catch (e) {
            const x = e as { constructor: { name: string }; code?: string };
            return `throw:${x.constructor.name}${x.code === undefined ? "" : `:${x.code}`}`;
          }
        }
      }
    },
  };
}
