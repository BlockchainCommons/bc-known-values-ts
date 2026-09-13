/**
 * The redesigned surface: `from`, `value` narrowing, the codec, the store's
 * iteration and size, the global registry helpers.
 */
import { describe, it, expect } from "vitest";
import {
  decodeCbor,
  encodeCbor,
  decodeWith,
  hexToBytes as hex,
  CborError,
} from "@blockchaincommons/dcbor";
import {
  KnownValue,
  KnownValuesStore,
  KNOWN_VALUE_CODEPOINTS,
  REGISTRY_CONSTANTS,
  BUNDLED_REGISTRY,
  getGlobalKnownValuesStore,
  withKnownValues,
  resolveKnownValue,
  IS_A,
  NOTE,
} from "../src/index.js";

/** The dcbor error code a decode fails with. */
function codeOf(f: () => unknown): string | undefined {
  try {
    f();
    return undefined;
  } catch (e) {
    return CborError.isCborError(e) ? e.code : `not a CborError: ${String(e)}`;
  }
}

describe("KnownValue", () => {
  it("from and value narrowing", () => {
    expect(KnownValue.from(7, "seven").name).toBe("seven");
    expect(KnownValue.from(7).name).toBe("7");
    expect(typeof new KnownValue(2n ** 53n - 1n).value).toBe("number");
    expect(typeof new KnownValue(2n ** 53n).value).toBe("bigint");
    expect(new KnownValue(2n ** 64n - 1n).valueBigInt).toBe(2n ** 64n - 1n);
    expect(() => new KnownValue(-1)).toThrow(RangeError);
    expect(() => new KnownValue(2n ** 64n)).toThrow(RangeError);
    expect(String(IS_A)).toBe("isA");
    expect(IS_A.equals(new KnownValue(1, "other"))).toBe(true);
  });
  it("codec encodes tagged and decodes the tagged form only", () => {
    const c = KnownValue.codec;
    expect(c.tags?.[0]?.value).toBe(40000);
    expect(encodeCbor(c.encode(IS_A))).toEqual(IS_A.toCbor().toData());
    expect(decodeWith(IS_A.toCbor().toData(), c).equals(IS_A)).toBe(true);
    expect(IS_A.cborTags()[0]?.name).toBe("known-value");
    // The reference's `TryFrom<CBOR>`: the tag is part of the type.
    expect(() => c.decode(IS_A.untaggedCbor())).toThrow(CborError);
    expect(codeOf(() => KnownValue.fromCbor(IS_A.untaggedCbor()))).toBe("WrongType");
    expect(codeOf(() => KnownValue.fromCbor(decodeCbor(hex("d8640c"))))).toBe("WrongTag");
    expect(codeOf(() => KnownValue.fromCbor(decodeCbor(hex("d99c4020"))))).toBe("WrongType");
  });
  it("fromUntaggedCbor decodes the content of tag 40000", () => {
    expect(KnownValue.fromUntaggedCbor(IS_A.untaggedCbor()).equals(IS_A)).toBe(true);
    expect(KnownValue.fromUntaggedCbor(decodeCbor(hex("1818"))).value).toBe(24);
    expect(KnownValue.fromUntaggedCbor(decodeCbor(hex("1bffffffffffffffff"))).valueBigInt).toBe(
      2n ** 64n - 1n,
    );
    // Not an unsigned integer: a negative, the tagged form, a bignum.
    expect(codeOf(() => KnownValue.fromUntaggedCbor(decodeCbor(hex("20"))))).toBe("WrongType");
    expect(codeOf(() => KnownValue.fromUntaggedCbor(IS_A.toCbor()))).toBe("WrongType");
    expect(codeOf(() => KnownValue.fromUntaggedCbor(decodeCbor(hex("c24100"))))).toBe("WrongType");
  });
});

describe("KnownValuesStore", () => {
  it("iterates, counts and clones", () => {
    const store = new KnownValuesStore([IS_A, NOTE]);
    expect(store.size).toBe(2);
    expect([...store].map((kv) => kv.name)).toEqual(["isA", "note"]);
    expect([...store.values()].length).toBe(2);
    const copy = store.clone();
    copy.register(new KnownValue(1, "renamed"));
    expect(store.byName("isA")).toBe(IS_A);
    expect(copy.byName("isA")).toBeUndefined();
    expect(copy.byName("renamed")?.value).toBe(1);
    expect(store.assignedNameOf(new KnownValue(4))).toBe("note");
    expect(store.nameOf(new KnownValue(4))).toBe("note");
    expect(store.nameOf(new KnownValue(5))).toBe("5");
  });
});

describe("global registry", () => {
  it("is built once and covers the constants and the bundled rows", () => {
    const store = getGlobalKnownValuesStore();
    expect(getGlobalKnownValuesStore()).toBe(store);
    expect(store.size).toBeGreaterThan(BUNDLED_REGISTRY.length - 200);
    for (const kv of REGISTRY_CONSTANTS) expect(store.byValue(kv.value)?.name).toBe(kv.name);
    expect(withKnownValues((s) => s.byName("isA")?.value)).toBe(KNOWN_VALUE_CODEPOINTS.IS_A);
    expect(resolveKnownValue(1).name).toBe("isA");
    expect(resolveKnownValue(123456789).name).toBe("123456789");
    expect(resolveKnownValue(1, new KnownValuesStore()).name).toBe("1");
  });
});

describe("unit value name", () => {
  it("the registry names codepoint 0 with the empty string, not '0'", () => {
    const store = getGlobalKnownValuesStore();
    expect(store.nameOf(new KnownValue(0))).toBe("");
    expect(store.nameOf(new KnownValue(0, "x"))).toBe("");
    expect(new KnownValuesStore().nameOf(new KnownValue(0))).toBe("0");
  });
});
