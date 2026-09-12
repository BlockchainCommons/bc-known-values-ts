/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The adapter over the working tree. Edited by the mechanical API passes
 * together with the rest of the tests.
 */
import { decodeCbor } from "@blockchaincommons/dcbor";
import { type VectorApi, hex, unhex } from "./recipes";

const bad = (x: unknown): any => x;

export function redesignedShapedAdapterFor(m: any): VectorApi {
  const describe = (kv: any): string =>
    `${hex(kv.toCbor().toData())}|${kv.digest().toHex()}|${kv.name}|${kv.assignedName ?? "-"}`;
  return {
    errorCode: (e) => String((e as any)?.name ?? "Error"),
    run(r) {
      switch (r.k) {
        case "kv":
          return describe(new m.KnownValue(BigInt(r.v), r.name));
        case "decode":
          return describe(m.KnownValue.fromCbor(decodeCbor(unhex(r.hex))));
        case "lookup": {
          const store = m.getGlobalKnownValuesStore();
          const kv = r.by === "value" ? store.byValue(BigInt(r.key)) : store.byName(r.key);
          return kv === undefined ? "-" : `${kv.valueBigInt}|${kv.name}|${kv.assignedName ?? "-"}`;
        }
        case "domain": {
          const store = m.getGlobalKnownValuesStore();
          const cases: Record<string, () => unknown> = {
            "new.1.5": () => new m.KnownValue(1.5).name,
            "new.NaN": () => new m.KnownValue(NaN).name,
            "new.Infinity": () => new m.KnownValue(Infinity).name,
            "new.null": () => new m.KnownValue(bad(null)).name,
            "new.undefined": () => new m.KnownValue(bad(undefined)).name,
            "new.string1": () => new m.KnownValue(bad("1")).name,
            "new.true": () => new m.KnownValue(bad(true)).name,
            "new.name5": () => typeof new m.KnownValue(1, bad(5)).name,
            "new.2^53+2": () => String(new m.KnownValue(2 ** 53 + 2).valueBigInt),
            "new.-1": () => new m.KnownValue(-1).name,
            "new.2^64": () => new m.KnownValue(2n ** 64n).name,
            "byValue.1.5": () => store.byValue(1.5)?.name ?? "-",
            "byValue.-1": () => store.byValue(-1)?.name ?? "-",
            "byValue.string1": () => store.byValue(bad("1"))?.name ?? "-",
            "resolve.1.5": () => m.resolveKnownValue(1.5).name,
          };
          const f = cases[r.case];
          if (f === undefined) throw new Error(`unknown domain case ${r.case}`);
          return `ok:${String(f())}`;
        }
      }
    },
  };
}
