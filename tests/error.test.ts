/**
 * Every argument fault of the public surface is a `KnownValuesError`
 * `InvalidParameter`, raised before any store is read or written; no
 * `RangeError` or `TypeError` escapes.
 */
import { describe, it, expect } from "vitest";
import {
  DirectoryConfig,
  IS_A,
  KnownValue,
  KnownValuesError,
  KnownValuesStore,
  addSearchPaths,
  getGlobalKnownValuesStore,
  loadFromConfig,
  loadFromDirectory,
  resolveKnownValue,
  setDirectoryConfig,
} from "../src/index.js";

const bad = (x: unknown): never => x as never;

/** The error a thunk throws, checked to be this package's. */
function fault(f: () => unknown): KnownValuesError {
  try {
    f();
  } catch (e) {
    expect(KnownValuesError.isKnownValuesError(e), `${String(e)}`).toBe(true);
    return e as KnownValuesError;
  }
  throw new Error("expected a throw");
}

describe("KnownValuesError", () => {
  it("has the code, the details and the message shape", () => {
    const e = fault(() => new KnownValue(1.5));
    expect(e.name).toBe("KnownValuesError");
    expect(e.code).toBe("InvalidParameter");
    expect(e.is("InvalidParameter")).toBe(true);
    expect(e.details).toEqual({ code: "InvalidParameter", parameter: "value", value: 1.5 });
    expect(e.message).toBe(
      "value must be an integer in [0, 9007199254740991] or a bigint in [0, 18446744073709551615], got 1.5",
    );
    expect(e instanceof Error).toBe(true);
    expect(KnownValuesError.isKnownValuesError(new RangeError("x"))).toBe(false);
    expect(KnownValuesError.alreadyInitialized().message).toBe(
      "Cannot modify directory configuration after KNOWN_VALUES has been accessed",
    );
    expect(KnownValuesError.io("IO error: x").is("Io")).toBe(true);
    expect(KnownValuesError.json("expected value at line 1 column 1").details).toEqual({
      code: "Json",
    });
  });
  it("renders the received value exactly", () => {
    expect(fault(() => new KnownValue(2 ** 53 + 2)).message).toContain("got 9007199254740994");
    expect(fault(() => new KnownValue(2n ** 64n)).message).toContain("got 18446744073709551616n");
    expect(fault(() => new KnownValue(bad("1"))).message).toContain('got "1"');
    expect(fault(() => new KnownValue(bad(null))).message).toContain("got null");
    expect(fault(() => new KnownValue(bad([1]))).message).toContain("got Array");
    expect(fault(() => new KnownValue(bad({}))).message).toContain("got Object");
    expect(fault(() => new KnownValue(1, bad(5))).message).toBe(
      "name must be a string, got number",
    );
  });
});

describe("the codepoint domain", () => {
  it("accepts safe integers and 64-bit bigints exactly", () => {
    expect(new KnownValue(0).value).toBe(0);
    expect(new KnownValue(-0).value).toBe(0);
    expect(new KnownValue(2 ** 53 - 1).valueBigInt).toBe(9007199254740991n);
    expect(new KnownValue(2n ** 53n + 1n).valueBigInt).toBe(9007199254740993n);
    expect(new KnownValue(2n ** 64n - 1n).valueBigInt).toBe(18446744073709551615n);
  });
  it("rejects everything else before any store read", () => {
    for (const v of [
      1.5,
      NaN,
      Infinity,
      -Infinity,
      -1,
      2 ** 53,
      2 ** 53 + 2,
      1e300,
      -1n,
      2n ** 64n,
    ]) {
      expect(fault(() => new KnownValue(v)).details).toMatchObject({
        parameter: "value",
        value: v,
      });
      expect(fault(() => getGlobalKnownValuesStore().byValue(v)).code).toBe("InvalidParameter");
      expect(fault(() => resolveKnownValue(v, undefined)).code).toBe("InvalidParameter");
    }
    for (const v of [null, undefined, "1", true, {}, [], Symbol("s"), () => 1]) {
      expect(fault(() => new KnownValue(bad(v))).code).toBe("InvalidParameter");
    }
  });
});

describe("store guards", () => {
  it("register, the constructor, nameOf and assignedNameOf need a KnownValue", () => {
    const store = new KnownValuesStore();
    const lookalike = { valueBigInt: 7n, assignedName: "p", name: "p" };
    for (const x of [{}, lookalike, null, 7, "isA", undefined]) {
      expect(fault(() => store.register(bad(x))).details).toMatchObject({
        parameter: "knownValue",
      });
      expect(fault(() => store.nameOf(bad(x))).details).toMatchObject({ parameter: "knownValue" });
      expect(fault(() => store.assignedNameOf(bad(x))).details).toMatchObject({
        parameter: "knownValue",
      });
    }
    expect(store.size).toBe(0);
    expect(fault(() => new KnownValuesStore(bad([IS_A, {}]))).details).toMatchObject({
      parameter: "knownValue",
    });
    expect(fault(() => new KnownValuesStore(bad(5))).details).toMatchObject({
      parameter: "knownValues",
    });
    expect(fault(() => new KnownValuesStore(bad(null))).details).toMatchObject({
      parameter: "knownValues",
    });
  });
  it("byName needs a string", () => {
    const store = new KnownValuesStore([IS_A]);
    for (const x of [5, null, undefined, {}, 1n]) {
      expect(fault(() => store.byName(bad(x))).details).toMatchObject({
        parameter: "assignedName",
        value: x,
      });
    }
    expect(store.byName("isA")).toBe(IS_A);
  });
  it("equals is false for anything that is not a KnownValue", () => {
    expect(IS_A.equals(undefined)).toBe(false);
    expect(IS_A.equals(null)).toBe(false);
    expect(IS_A.equals(1)).toBe(false);
    expect(IS_A.equals({ _value: 1n, valueBigInt: 1n })).toBe(false);
    expect(IS_A.equals(new KnownValue(1, "another"))).toBe(true);
    expect(KnownValue.isKnownValue(IS_A)).toBe(true);
    expect(KnownValue.isKnownValue({ valueBigInt: 1n })).toBe(false);
  });
});

describe("directory guards", () => {
  it("configuration and loader arguments", () => {
    expect(fault(() => new DirectoryConfig(bad("a"))).details).toMatchObject({
      parameter: "paths",
    });
    expect(fault(() => new DirectoryConfig(bad([1]))).details).toMatchObject({
      parameter: "path",
      value: 1,
    });
    expect(fault(() => DirectoryConfig.withPathsAndDefault(bad(null))).details).toMatchObject({
      parameter: "paths",
    });
    const config = new DirectoryConfig();
    expect(fault(() => config.addPath(bad(1))).details).toMatchObject({ parameter: "path" });
    expect(config.paths).toEqual([]);
    expect(fault(() => setDirectoryConfig(bad({}))).details).toMatchObject({ parameter: "config" });
    expect(fault(() => addSearchPaths(bad("a"))).details).toMatchObject({ parameter: "paths" });
    expect(fault(() => loadFromDirectory(bad(5))).details).toMatchObject({ parameter: "path" });
    expect(fault(() => loadFromConfig(bad(5))).details).toMatchObject({ parameter: "config" });
  });
});
