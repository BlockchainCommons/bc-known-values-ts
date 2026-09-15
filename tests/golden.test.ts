/**
 * Golden snapshots: the hard-coded constants table, the global registry's
 * size and its low-range name table, the decode table, and the pinned
 * behaviours (immutability, identity, the JavaScript input domain).
 */
import { describe, it, expect } from "vitest";
import * as src from "../src/index.js";
import { KnownValue, getGlobalKnownValuesStore } from "../src/index.js";
import { hexToBytes, decodeCbor } from "@blockchaincommons/dcbor";
import {
  BODY,
  BUNDLED_REGISTRY,
  DirectoryConfig,
  IS_A,
  KNOWN_VALUE_CODEPOINTS,
  KnownValuesStore,
  REGISTRY_CONSTANTS,
  UNIT,
  resolveKnownValue,
} from "../src/index.js";

/** `ok:<value>` or `throw:<class>:<code>:<message>` for a pinned behaviour. */
const outcome = (f: () => unknown): string => {
  try {
    const v = f();
    return `ok:${typeof v === "string" ? v : JSON.stringify(v)}`;
  } catch (e) {
    const err = e as Error & { code?: string };
    return `throw:${err.name}${err.code === undefined ? "" : `:${err.code}`}:${err.message.slice(0, 90)}`;
  }
};

const constants = Object.entries(src)
  .filter((e): e is [string, KnownValue] => KnownValue.isKnownValue(e[1]))
  .sort((a, b) => (a[1].valueBigInt < b[1].valueBigInt ? -1 : 1));

describe("golden: constants", () => {
  it("every exported KnownValue constant, sorted by value", () => {
    expect(
      constants.map(
        ([n, kv]) => `${n}=${kv.valueBigInt} "${kv.name}" ${kv.digest().toHex().slice(0, 16)}`,
      ),
    ).toMatchSnapshot();
    expect(constants.length).toBeGreaterThanOrEqual(104);
  });
});

describe("golden: registry", () => {
  const store = getGlobalKnownValuesStore();
  it("names for 0..120", () => {
    const rows: string[] = [];
    for (let v = 0; v <= 120; v++) {
      const kv = store.byValue(v);
      rows.push(`${v}: ${kv === undefined ? "-" : kv.name}`);
    }
    expect(rows).toMatchSnapshot();
  });
  it("registry size and a few probes", () => {
    expect(store.size).toBe(102);
    expect(store.byName("isA")?.valueBigInt).toBe(1n);
    expect(store.byName("schema:Thing")).toBeUndefined();
    expect(store.byValue(706)).toBeUndefined();
    expect(store.byValue(25)).toBeUndefined();
    expect(store.byValue(999_999_999)).toBeUndefined();
  });
});

describe("golden: decode table", () => {
  it("values and rejections", () => {
    const rows: string[] = [];
    for (const h of [
      "01",
      "d99c4020",
      "d99c403bffffffffffffffff",
      "d99c4161",
      "d8640c",
      "d99c41",
      "d99c4001ff",
      "d99c40c24100",
      "d99c40fa4f000001",
      "d99c40fa4f000000",
    ]) {
      try {
        rows.push(`${h}: ${KnownValue.fromCbor(decodeCbor(hexToBytes(h))).name}`);
      } catch (e) {
        rows.push(`${h}: throw ${(e as Error).name}: ${(e as Error).message.slice(0, 60)}`);
      }
    }
    expect(rows).toMatchSnapshot();
  });
});

describe("golden: pinned behaviours", () => {
  it("constants and tables are frozen", () => {
    const frozen = [
      ["IS_A", Object.isFrozen(IS_A)],
      ["every constant", REGISTRY_CONSTANTS.every((kv) => Object.isFrozen(kv))],
      ["REGISTRY_CONSTANTS", Object.isFrozen(REGISTRY_CONSTANTS)],
      ["KNOWN_VALUE_CODEPOINTS", Object.isFrozen(KNOWN_VALUE_CODEPOINTS)],
      ["BUNDLED_REGISTRY", Object.isFrozen(BUNDLED_REGISTRY)],
      ["BUNDLED_REGISTRY[0]", Object.isFrozen(BUNDLED_REGISTRY[0])],
      ["every bundled row", BUNDLED_REGISTRY.every((row) => Object.isFrozen(row))],
    ].map(([n, v]) => `isFrozen(${String(n)}): ${String(v)}`);
    const mutable = BODY as unknown as { _assignedName: string | undefined };
    const store = new KnownValuesStore([BODY]);
    const scenario = [
      `mutate BODY._assignedName: ${outcome(() => {
        mutable._assignedName = "hacked";
        return BODY.name;
      })}`,
      `store.byValue(100).name: ${outcome(() => store.byValue(100)?.name)}`,
      `store.byName("body"): ${outcome(() => store.byName("body")?.name ?? "-")}`,
    ];
    expect([...frozen, ...scenario]).toMatchSnapshot();
  });
  it("the unit name, the bundled rows, the seeded constant identity", () => {
    const bundled = new Set(BUNDLED_REGISTRY.map(([cp]) => cp));
    const global = getGlobalKnownValuesStore();
    expect([
      `new KnownValuesStore([UNIT]).byName(""): ${outcome(() => new KnownValuesStore([UNIT]).byName("")?.value ?? "-")}`,
      `global byName(""): ${outcome(() => global.byName("")?.value ?? "-")}`,
      `resolveKnownValue(200000, global).name: ${outcome(() => resolveKnownValue(200000, global).name)}`,
      `resolveKnownValue(25, undefined).name: ${outcome(() => resolveKnownValue(25, undefined).name)}`,
      `constants not in BUNDLED_REGISTRY: ${JSON.stringify(
        REGISTRY_CONSTANTS.filter((kv) => !bundled.has(Number(kv.value))).map(
          (kv) => `${String(kv.value)}:${kv.name}`,
        ),
      )}`,
      `constants not in the global store: ${JSON.stringify(
        REGISTRY_CONSTANTS.filter((kv) => global.byValue(kv.value) === undefined).map(
          (kv) => `${String(kv.value)}:${kv.name}`,
        ),
      )}`,
      `global byValue(100) === BODY: ${String(global.byValue(100) === BODY)}`,
      `global byValue(1) === IS_A: ${String(global.byValue(1) === IS_A)}`,
      `IS_A.equals(lookalike): ${String(IS_A.equals({ valueBigInt: 1n, _value: 1n }))}`,
    ]).toMatchSnapshot();
  });
  it("the JS input domain", () => {
    const store = getGlobalKnownValuesStore();
    const bad = (x: unknown): unknown => x;
    expect([
      `new KnownValue(1.5): ${outcome(() => new KnownValue(1.5))}`,
      `new KnownValue(NaN): ${outcome(() => new KnownValue(NaN))}`,
      `new KnownValue(Infinity): ${outcome(() => new KnownValue(Infinity))}`,
      `new KnownValue(null): ${outcome(() => new KnownValue(bad(null) as number))}`,
      `new KnownValue(undefined): ${outcome(() => new KnownValue(bad(undefined) as number))}`,
      `new KnownValue("1"): ${outcome(() => new KnownValue(bad("1") as number).value)}`,
      `new KnownValue(true): ${outcome(() => new KnownValue(bad(true) as number).value)}`,
      `new KnownValue(1, 5).name: ${outcome(() => typeof new KnownValue(1, bad(5) as string).name)}`,
      `new KnownValue(2 ** 53 - 1).valueBigInt: ${outcome(() => String(new KnownValue(2 ** 53 - 1).valueBigInt))}`,
      `new KnownValue(2 ** 53 + 2): ${outcome(() => String(new KnownValue(2 ** 53 + 2).valueBigInt))}`,
      `new KnownValue(2n ** 53n + 1n).valueBigInt: ${outcome(() => String(new KnownValue(2n ** 53n + 1n).valueBigInt))}`,
      `new KnownValue(-1): ${outcome(() => new KnownValue(-1))}`,
      `new KnownValue(2n ** 64n): ${outcome(() => new KnownValue(2n ** 64n))}`,
      `store.byValue(1.5): ${outcome(() => store.byValue(1.5)?.name ?? "-")}`,
      `store.byValue(-1): ${outcome(() => store.byValue(-1)?.name ?? "-")}`,
      `store.byValue("1"): ${outcome(() => store.byValue(bad("1") as number)?.name ?? "-")}`,
      `store.byName(5): ${outcome(() => store.byName(bad(5) as string)?.name ?? "-")}`,
      `store.register({}): ${outcome(() => new KnownValuesStore().register(bad({}) as KnownValue))}`,
      `resolveKnownValue(1.5, undefined): ${outcome(() => resolveKnownValue(1.5, undefined))}`,
      `new DirectoryConfig("a"): ${outcome(() => new DirectoryConfig(bad("a") as string[]))}`,
    ]).toMatchSnapshot();
  });
});
