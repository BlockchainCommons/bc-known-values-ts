/**
 * Golden snapshots (Phase 0.2): the hard-coded constants table, the global
 * registry's size and its low-range name table, and the decode rejection
 * table.
 */
import { describe, it, expect } from "vitest";
import * as src from "../src/index.js";
import { KnownValue, KNOWN_VALUES } from "../src/index.js";
import { hexToBytes } from "@blockchaincommons/dcbor";

const constants = Object.entries(src)
  .filter((e): e is [string, KnownValue] => e[1] instanceof KnownValue)
  .sort((a, b) => (a[1].valueBigInt() < b[1].valueBigInt() ? -1 : 1));

describe("golden: constants", () => {
  it("every exported KnownValue constant, sorted by value", () => {
    expect(
      constants.map(
        ([n, kv]) => `${n}=${kv.valueBigInt()} "${kv.name()}" ${kv.digest().toHex().slice(0, 16)}`,
      ),
    ).toMatchSnapshot();
    expect(constants.length).toBeGreaterThanOrEqual(104);
  });
});

describe("golden: registry", () => {
  const store = KNOWN_VALUES.get();
  it("names for 0..120", () => {
    const rows: string[] = [];
    for (let v = 0; v <= 120; v++) {
      const kv = store.knownValueForValue(v);
      rows.push(`${v}: ${kv === undefined ? "-" : kv.name()}`);
    }
    expect(rows).toMatchSnapshot();
  });
  it("registry size and a few probes", () => {
    expect(store.knownValueNamed("isA")?.valueBigInt()).toBe(1n);
    expect(store.knownValueNamed("schema:Thing")?.name()).toBe("schema:Thing");
    expect(store.knownValueForValue(706)?.name()).toBe("Self");
    expect(store.knownValueForValue(999_999_999)).toBeUndefined();
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
        rows.push(`${h}: ${KnownValue.fromCborData(hexToBytes(h)).name()}`);
      } catch (e) {
        rows.push(`${h}: throw ${(e as Error).name}: ${(e as Error).message.slice(0, 60)}`);
      }
    }
    expect(rows).toMatchSnapshot();
  });
});
