/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FROZEN: the adapter over the pre-redesign bundle. Never edited by the
 * mechanical API passes; `redesigned-adapter.ts` is the working-tree twin.
 */
import { type VectorApi, hex, unhex } from "./recipes";

export function rustShapedAdapterFor(m: any): VectorApi {
  const describe = (kv: any): string =>
    `${hex(kv.toCborData())}|${kv.digest().hex()}|${kv.name()}|${kv.assignedName() ?? "-"}`;
  return {
    errorCode: (e) => String((e as any)?.name ?? "Error"),
    run(r) {
      switch (r.k) {
        case "kv":
          return describe(new m.KnownValue(BigInt(r.v), r.name));
        case "decode":
          return describe(m.KnownValue.fromCborData(unhex(r.hex)));
        case "lookup": {
          const store = m.KNOWN_VALUES.get();
          const kv =
            r.by === "value"
              ? store.knownValueForValue(BigInt(r.key))
              : store.knownValueNamed(r.key);
          return kv === undefined
            ? "-"
            : `${kv.valueBigInt()}|${kv.name()}|${kv.assignedName() ?? "-"}`;
        }
      }
    },
  };
}
