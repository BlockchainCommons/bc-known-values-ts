/**
 * Properties (Phase 0.3): tagged/untagged round trips over the whole
 * unsigned range, the digest definition, and store consistency under
 * random insert order.
 */
import { describe, it } from "vitest";
import fc from "fast-check";
import { encodeCbor, taggedValue, decodeCbor } from "@blockchaincommons/dcbor";
import { Digest } from "@blockchaincommons/components";
import { KnownValue, KnownValuesStore } from "../src/index.js";

const u64 = fc.bigInt({ min: 0n, max: (1n << 64n) - 1n });

describe("KnownValue properties", () => {
  it("round-trips through tagged and untagged CBOR", () => {
    fc.assert(
      fc.property(u64, (v) => {
        const kv = new KnownValue(v);
        const back = KnownValue.fromCborData(kv.toCborData());
        const back2 = KnownValue.fromUntaggedCbor(decodeCbor(encodeCbor(kv.untaggedCbor())));
        return back.equals(kv) && back2.equals(kv) && back.valueBigInt() === v;
      }),
      { numRuns: 300 },
    );
  });
  it("digest is the digest of the tagged CBOR", () => {
    fc.assert(
      fc.property(u64, (v) => {
        const kv = new KnownValue(v);
        return kv.digest().equals(Digest.fromImage(encodeCbor(taggedValue(40000, v))));
      }),
      { numRuns: 200 },
    );
  });
  it("store lookups agree with the last insert regardless of order", () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.nat(2000), { minLength: 1, maxLength: 30 }), (values) => {
        const pairs = values.map((v) => [v, `n${v}`] as const);
        const store = new KnownValuesStore();
        for (const [v, n] of pairs) store.insert(new KnownValue(v, n));
        return pairs.every(
          ([v, n]) =>
            store.knownValueForValue(v)?.name() === n &&
            store.knownValueNamed(n)?.valueBigInt() === BigInt(v),
        );
      }),
      { numRuns: 100 },
    );
  });
});
