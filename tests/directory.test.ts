/**
 * The directory loader and the process-wide configuration: extension and
 * path rules, strict and tolerant loads over a temporary tree, the error
 * texts, the injected-filesystem cases the host cannot produce on demand,
 * the home-directory rule, and the configuration lock.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";
import { rmSync } from "node:fs";
import { userInfo } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it, expect } from "vitest";
import {
  DirectoryConfig,
  IS_A,
  type KnownValue,
  KnownValuesError,
  KnownValuesStore,
  addSearchPaths,
  getGlobalKnownValuesStore,
  loadFromConfig,
  loadFromDirectory,
  setDirectoryConfig,
} from "../src/index.js";
import { type FilesystemAdapter, useFilesystemAdapter } from "../src/directory.js";
import { categories } from "./corpus/corpus";
import { materializeTree, relativize } from "./vectors/working-tree-adapter";

const here = dirname(fileURLToPath(import.meta.url));
/** The corpus tree every `directory` recipe uses. */
const TREE = (() => {
  const directories = categories["directories"];
  if (directories === undefined) throw new Error("no directory category");
  for (const r of directories()) if (r.k === "directory") return r.tree;
  throw new Error("no directory recipe");
})();
const names = (values: Iterable<KnownValue>): string[] =>
  [...values]
    .sort((a, b) => (a.valueBigInt < b.valueBigInt ? -1 : a.valueBigInt > b.valueBigInt ? 1 : 0))
    .map((kv) => `${kv.valueBigInt}:${kv.name}`);
const failure = (f: () => unknown): KnownValuesError => {
  try {
    f();
  } catch (e) {
    if (KnownValuesError.isKnownValuesError(e)) return e;
    throw e;
  }
  throw new Error("expected a throw");
};

describe("loadFromDirectory", () => {
  const root = materializeTree(TREE);
  afterEach(() => useFilesystemAdapter(null));
  it("loads the .json files of a directory and only those", () => {
    const values = loadFromDirectory(join(root, "A"));
    expect(names(values)).toEqual([
      "1:isAOverride",
      "1000:thousand",
      "1001:x",
      "1013:nul",
      "1014:e\u0301",
      "1031:tab\tname",
      "1050:dotdot",
      "5000:dupName",
      "6000:first",
      "6000:second",
      "9007199254740993:big",
      "18446744073709551615:max",
    ]);
  });
  it("yields nothing for a missing path, a file, or an empty directory", () => {
    expect(loadFromDirectory(join(root, "nonexistent"))).toEqual([]);
    expect(loadFromDirectory(join(root, "plainfile"))).toEqual([]);
    expect(loadFromDirectory(join(root, "empty"))).toEqual([]);
  });
  it("fails on the first unreadable or unparsable file with the reference's text", () => {
    const e = failure(() => loadFromDirectory(join(root, "E08")));
    expect(e.code).toBe("Json");
    expect(relativize(e.message, root)).toBe(
      "JSON parse error in <root>/E08/08_neg.json: invalid value: integer `-1`, expected u64 at line 1 column 27",
    );
    const io = failure(() => loadFromDirectory(join(root, "E20")));
    expect(io.code).toBe("Io");
    expect(io.message).toBe("IO error: stream did not contain valid UTF-8");
    const dir = failure(() => loadFromDirectory(join(root, "ED")));
    expect(dir.code).toBe("Io");
    expect(dir.message).toBe("IO error: Is a directory (os error 21)");
  });
  it("registers into a store and counts", () => {
    const store = new KnownValuesStore([IS_A]);
    expect(store.loadFromDirectory(join(root, "B"))).toBe(2);
    expect(store.byValue(1000)?.name).toBe("thousandB");
    expect(store.byValue(1)).toBe(IS_A);
    expect(store.loadFromDirectory(join(root, "nonexistent"))).toBe(0);
  });
  it("cleans up", () => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe("loadFromConfig", () => {
  const root = materializeTree(TREE);
  it("tolerates file errors, replaces by codepoint across directories, reports every directory", () => {
    const result = loadFromConfig(
      new DirectoryConfig(
        ["A", "B", "nonexistent", "plainfile", "E08", "ED"].map((p) => join(root, p)),
      ),
    );
    expect(result.values.get(1000n)?.name).toBe("thousandB");
    expect(result.values.get(6000n)?.name).toBe("second");
    expect(result.values.get(1060n)?.name).toBe("okInED");
    expect([...result.values.keys()].indexOf(1000n)).toBeLessThan(
      [...result.values.keys()].indexOf(5001n),
    );
    expect(result.filesProcessed.map((p) => relativize(p, root))).toEqual([
      "<root>/A",
      "<root>/B",
      "<root>/nonexistent",
      "<root>/plainfile",
      "<root>/E08",
      "<root>/ED",
    ]);
    expect(result.errors.map((e) => `${relativize(e.path, root)}:${e.error.code}`).sort()).toEqual([
      "<root>/E08/08_neg.json:Json",
      "<root>/ED/sub.json:Io",
    ]);
    const store = new KnownValuesStore([IS_A]);
    const again = store.loadFromConfig(new DirectoryConfig([join(root, "A")]));
    expect(again.errors).toEqual([]);
    expect(store.byValue(1)?.name).toBe("isAOverride");
    expect(store.nameOf(IS_A)).toBe("isAOverride");
  });
  it("discards a directory's partial values when its listing fails midway", () => {
    const good = new TextEncoder().encode('{"entries":[{"codepoint":9001,"name":"partial"}]}');
    const broken: FilesystemAdapter = {
      separator: "/",
      isDirectory: (p) => p === "/d" || p === "/ok",
      *entries(p) {
        yield "1.json";
        if (p === "/d") {
          const e = new Error("Input/output error") as Error & { code: string };
          e.code = "EIO";
          throw e;
        }
      },
      readFile: () => good,
      homeEnv: () => undefined,
      userHome: () => undefined,
      errno: (code) => (code === "EIO" ? 5 : undefined),
    };
    useFilesystemAdapter(broken);
    try {
      const result = loadFromConfig(new DirectoryConfig(["/d", "/ok"]));
      expect([...result.values.values()].map((kv) => kv.name)).toEqual(["partial"]);
      expect(result.filesProcessed).toEqual(["/ok"]);
      expect(result.errors.map((e) => `${e.path}:${e.error.code}:${e.error.message}`)).toEqual([
        "/d:Io:IO error: Input/output error (os error 5)",
      ]);
      expect(failure(() => loadFromDirectory("/d")).message).toBe(
        "IO error: Input/output error (os error 5)",
      );
    } finally {
      useFilesystemAdapter(null);
    }
  });
  it("treats every directory as missing on a host without a filesystem", () => {
    useFilesystemAdapter(undefined);
    try {
      expect(loadFromDirectory(join(root, "A"))).toEqual([]);
      const result = loadFromConfig(new DirectoryConfig([join(root, "A")]));
      expect(result.values.size).toBe(0);
      expect(result.filesProcessed).toEqual([join(root, "A")]);
      expect(DirectoryConfig.defaultDirectory()).toBe("./.known-values");
    } finally {
      useFilesystemAdapter(null);
    }
  });
  it("cleans up", () => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe("DirectoryConfig", () => {
  it("keeps paths in order and copies them out", () => {
    const c = new DirectoryConfig(["a"]);
    c.addPath("b");
    expect(c.paths).toEqual(["a", "b"]);
    (c.paths as string[]).push("c");
    expect(c.paths).toEqual(["a", "b"]);
    expect(DirectoryConfig.withPathsAndDefault(["x"]).paths).toEqual([
      "x",
      DirectoryConfig.defaultDirectory(),
    ]);
    expect(DirectoryConfig.defaultOnly().paths).toEqual([DirectoryConfig.defaultDirectory()]);
  });
  it("derives the default directory from HOME, else the user database, else the current directory", () => {
    const home = process.env["HOME"];
    try {
      process.env["HOME"] = "/tmp/somewhere";
      expect(DirectoryConfig.defaultDirectory()).toBe("/tmp/somewhere/.known-values");
      process.env["HOME"] = "/tmp/slash/";
      expect(DirectoryConfig.defaultDirectory()).toBe("/tmp/slash/.known-values");
      process.env["HOME"] = "";
      expect(DirectoryConfig.defaultDirectory()).toBe(`${userInfo().homedir}/.known-values`);
    } finally {
      if (home === undefined) delete process.env["HOME"];
      else process.env["HOME"] = home;
    }
  });
});

describe("the configuration lock", () => {
  it("refuses changes once the global registry has been built", () => {
    getGlobalKnownValuesStore();
    const e = failure(() => setDirectoryConfig(new DirectoryConfig()));
    expect(e.code).toBe("AlreadyInitialized");
    expect(e.message).toBe(
      "Cannot modify directory configuration after KNOWN_VALUES has been accessed",
    );
    expect(failure(() => addSearchPaths(["x"])).code).toBe("AlreadyInitialized");
  });
  it("in a fresh process, a configured directory names the global registry's entries", () => {
    const root = materializeTree(TREE);
    try {
      const run = (steps: unknown, home: string): string => {
        const result = spawnSync("bun", [join(here, "vectors/child.ts"), JSON.stringify(steps)], {
          env: { ...process.env, KNOWN_VALUES_CHILD_ROOT: root, HOME: home },
          encoding: "utf8",
        });
        expect(result.status, result.stderr).toBe(0);
        return result.stdout;
      };
      expect(
        run([{ set: ["A"] }, { named: "thousand" }, { set: ["B"] }], join(root, "no-home")),
      ).toBe(
        "ok;1000|thousand|thousand;throw:AlreadyInitialized:Cannot modify directory configuration after KNOWN_VALUES has been accessed",
      );
      expect(run([{ named: "thousand" }, { named: "isA" }], join(root, "no-home"))).toBe(
        "-;1|isA|isA",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
