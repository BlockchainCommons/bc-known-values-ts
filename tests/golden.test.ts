/**
 * Golden snapshots: the hard-coded constants table, the global registry's
 * size and its low-range name table, and the decode rejection table.
 */
import { describe, it, expect } from "vitest";
import * as src from "../src/index.js";
import { KnownValue, getGlobalKnownValuesStore } from "../src/index.js";
import { hexToBytes, decodeCbor } from "@blockchaincommons/dcbor";
import {
  BODY,
  BUNDLED_REGISTRY,
  IS_A,
  KNOWN_VALUE_CODEPOINTS,
  KnownValuesStore,
  REGISTRY_CONSTANTS,
  UNIT,
  resolveKnownValue,
} from "../src/index.js";

/** `ok:<value>` or `throw:<class>:<message>` for a freeze entry. */
const outcome = (f: () => unknown): string => {
  try {
    const v = f();
    return `ok:${typeof v === "string" ? v : JSON.stringify(v)}`;
  } catch (e) {
    const err = e as Error;
    return `throw:${err.name}:${err.message.slice(0, 70)}`;
  }
};

const constants = Object.entries(src)
  .filter((e): e is [string, KnownValue] => e[1] instanceof KnownValue)
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
    expect(store.byName("isA")?.valueBigInt).toBe(1n);
    expect(store.byName("schema:Thing")?.name).toBe("schema:Thing");
    expect(store.byValue(706)?.name).toBe("Self");
    expect(store.byValue(999_999_999)).toBeUndefined();
  });
});

describe("golden: rejections", () => {
  it("decode table", () => {
    const rows: string[] = [];
    for (const h of [
      "01",
      "d99c4020",
      "d99c4161",
      "d8640c",
      "d99c41",
      "d99c4001ff",
      "d99c40c24100",
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

/**
 * Freeze additions: what the port does today for findings B1, B2, B4 and
 * B5. Each entry flips as the port changes and the flip is reviewed in the
 * snapshot diff.
 */
describe("golden: freeze additions", () => {
  it("B1: constants and tables are mutable", () => {
    const frozen = [
      ["IS_A", Object.isFrozen(IS_A)],
      ["every constant", REGISTRY_CONSTANTS.every((kv) => Object.isFrozen(kv))],
      ["REGISTRY_CONSTANTS", Object.isFrozen(REGISTRY_CONSTANTS)],
      ["KNOWN_VALUE_CODEPOINTS", Object.isFrozen(KNOWN_VALUE_CODEPOINTS)],
      ["BUNDLED_REGISTRY", Object.isFrozen(BUNDLED_REGISTRY)],
      ["BUNDLED_REGISTRY[0]", Object.isFrozen(BUNDLED_REGISTRY[0])],
    ].map(([n, v]) => `isFrozen(${String(n)}): ${String(v)}`);
    // The mutate-then-lookup scenario on a fresh store holding the constant
    // object; the mutation is undone so the rest of the file is unaffected.
    const mutable = BODY as unknown as { _assignedName: string | undefined };
    const original = mutable._assignedName;
    const store = new KnownValuesStore([BODY]);
    const scenario: string[] = [];
    try {
      scenario.push(
        `mutate BODY._assignedName: ${outcome(() => {
          mutable._assignedName = "hacked";
          return BODY.name;
        })}`,
      );
      scenario.push(`store.byValue(100).name: ${outcome(() => store.byValue(100)?.name)}`);
      scenario.push(`store.byName("body"): ${outcome(() => store.byName("body")?.name ?? "-")}`);
    } finally {
      try {
        mutable._assignedName = original;
      } catch {
        // frozen: nothing to undo
      }
    }
    expect([...frozen, ...scenario]).toMatchSnapshot();
  });
  it("B2/B4/B5: the unit name, the test artefact, the missing codepoint", () => {
    const bundled = new Set(BUNDLED_REGISTRY.map(([cp]) => cp));
    expect([
      `new KnownValuesStore([UNIT]).byName(""): ${outcome(() => new KnownValuesStore([UNIT]).byName("")?.value ?? "-")}`,
      `global byName(""): ${outcome(() => getGlobalKnownValuesStore().byName("")?.value ?? "-")}`,
      `resolveKnownValue(200000).name: ${outcome(() => resolveKnownValue(200000).name)}`,
      `constants not in BUNDLED_REGISTRY: ${JSON.stringify(
        REGISTRY_CONSTANTS.filter((kv) => !bundled.has(Number(kv.value))).map(
          (kv) => `${String(kv.value)}:${kv.name}`,
        ),
      )}`,
      `global byValue(100) === BODY: ${String(getGlobalKnownValuesStore().byValue(100) === BODY)}`,
      `global byValue(1) === IS_A: ${String(getGlobalKnownValuesStore().byValue(1) === IS_A)}`,
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
      `new KnownValue(2 ** 53 + 2).valueBigInt: ${outcome(() => String(new KnownValue(2 ** 53 + 2).valueBigInt))}`,
      `new KnownValue(-1): ${outcome(() => new KnownValue(-1))}`,
      `new KnownValue(2n ** 64n): ${outcome(() => new KnownValue(2n ** 64n))}`,
      `store.byValue(1.5): ${outcome(() => store.byValue(1.5)?.name ?? "-")}`,
      `store.byValue(-1): ${outcome(() => store.byValue(-1)?.name ?? "-")}`,
      `store.byValue("1"): ${outcome(() => store.byValue(bad("1") as number)?.name ?? "-")}`,
      `resolveKnownValue(1.5): ${outcome(() => resolveKnownValue(1.5))}`,
    ]).toMatchSnapshot();
  });
});
