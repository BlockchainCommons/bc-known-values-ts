/**
 * Tag names in `WrongTag` messages and in `cborTags()` follow the global
 * dcbor tags store at call time, as the reference's `cbor_tags()` and
 * `from_tagged_cbor` do: numbers before `registerTags()`, names after. This
 * file registers the tags itself, so it must not share a process with a
 * suite that expects them unregistered (vitest runs each file apart).
 */
import { describe, it, expect } from "vitest";
import { CborError, Tag, decodeCbor, hexToBytes, taggedValue } from "@blockchaincommons/dcbor";
import { registerTags } from "@blockchaincommons/tags";
import { IS_A, KnownValue } from "../src/index.js";

const message = (f: () => unknown): string => {
  try {
    f();
    return "no throw";
  } catch (e) {
    return CborError.isCborError(e) ? `${e.code}: ${e.message}` : `not a CborError: ${String(e)}`;
  }
};
const inMemory = taggedValue(Tag.from(100, "foo"), 1);
const wire = decodeCbor(hexToBytes("d8640c"));
const nested = decodeCbor(hexToBytes("d99c40d99c4101"));

describe("before the tags are registered", () => {
  it("names tags by value, except an in-memory tag that carries its own name", () => {
    expect(IS_A.cborTags().map((t) => [t.value, t.name])).toEqual([[40000, undefined]]);
    expect(KnownValue.codec.tags?.[0]?.name).toBeUndefined();
    expect(message(() => KnownValue.fromCbor(inMemory))).toBe(
      "WrongTag: expected CBOR tag 40000, but got foo",
    );
    expect(message(() => KnownValue.fromCbor(wire))).toBe(
      "WrongTag: expected CBOR tag 40000, but got 100",
    );
    expect(message(() => KnownValue.fromCbor(nested))).toBe(
      "WrongType: the decoded CBOR value was not the expected type",
    );
  });
});

describe("after the tags are registered", () => {
  it("names the known-value tag and the registered actual tag", () => {
    registerTags();
    expect(IS_A.cborTags().map((t) => [t.value, t.name])).toEqual([[40000, "known-value"]]);
    expect(KnownValue.codec.tags?.[0]?.name).toBe("known-value");
    expect(message(() => KnownValue.fromCbor(inMemory))).toBe(
      "WrongTag: expected CBOR tag known-value, but got foo",
    );
    expect(message(() => KnownValue.fromCbor(wire))).toBe(
      "WrongTag: expected CBOR tag known-value, but got 100",
    );
    expect(message(() => KnownValue.fromCbor(decodeCbor(hexToBytes("d99c4101"))))).toBe(
      "WrongTag: expected CBOR tag known-value, but got 40001",
    );
  });
});
