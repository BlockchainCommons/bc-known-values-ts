/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FROZEN: the adapter over the baseline bundle; `working-tree-adapter.ts` is
 * the working-tree twin. It runs only the recipe kinds the bundle can express.
 */
import { type VectorApi, hex, unhex } from "./recipes";

const bad = (x: unknown): any => x;

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
          const kv = store.knownValueNamed(r.key);
          return kv === undefined
            ? "-"
            : `${kv.valueBigInt()}|${kv.name()}|${kv.assignedName() ?? "-"}`;
        }
        case "domain": {
          const store = m.KNOWN_VALUES.get();
          const cases: Record<string, () => unknown> = {
            "new.1.5": () => new m.KnownValue(1.5).name(),
            "new.NaN": () => new m.KnownValue(NaN).name(),
            "new.Infinity": () => new m.KnownValue(Infinity).name(),
            "new.null": () => new m.KnownValue(bad(null)).name(),
            "new.undefined": () => new m.KnownValue(bad(undefined)).name(),
            "new.string1": () => new m.KnownValue(bad("1")).name(),
            "new.true": () => new m.KnownValue(bad(true)).name(),
            "new.name5": () => typeof new m.KnownValue(1, bad(5)).name(),
            "new.2^53+2": () => String(new m.KnownValue(2 ** 53 + 2).valueBigInt()),
            "new.-1": () => new m.KnownValue(-1).name(),
            "new.2^64": () => new m.KnownValue(2n ** 64n).name(),
            "byValue.1.5": () => store.knownValueForValue(1.5)?.name() ?? "-",
            "byValue.-1": () => store.knownValueForValue(-1)?.name() ?? "-",
            "byValue.string1": () => store.knownValueForValue(bad("1"))?.name() ?? "-",
            "byName.5": () => store.knownValueNamed(bad(5))?.name() ?? "-",
            "new.2^53-1": () => String(new m.KnownValue(2 ** 53 - 1).valueBigInt()),
            "new.bigint2^53+1": () => String(new m.KnownValue(2n ** 53n + 1n).valueBigInt()),
            "register.plainObject": () => {
              const s = new m.KnownValuesStore();
              s.insert(bad({}));
              return s.size;
            },
            "register.lookalike": () => {
              const s = new m.KnownValuesStore();
              s.insert(bad({ valueBigInt: () => 7n, assignedName: () => "p", name: () => "p" }));
              return s.size;
            },
            "store.ctor.notIterable": () => new m.KnownValuesStore(bad(5)).size,
            "store.ctor.plainObject": () => new m.KnownValuesStore(bad([{}])).size,
            "nameOf.plainObject": () =>
              new m.KnownValuesStore().name(bad({ valueBigInt: () => 1n })),
            "assignedNameOf.plainObject": () =>
              new m.KnownValuesStore().assignedName(bad({ valueBigInt: () => 1n })) ?? "-",
            "equals.undefined": () => m.IS_A.equals(undefined),
            "equals.lookalike": () => m.IS_A.equals({ _value: 1n, valueBigInt: () => 1n }),
          };
          const f = cases[r.case];
          if (f === undefined) throw new Error("baseline: unsupported domain case");
          try {
            return `ok:${String(f())}`;
          } catch (e) {
            const x = e as { constructor: { name: string }; code?: string };
            return `throw:${x.constructor.name}${x.code === undefined ? "" : `:${x.code}`}`;
          }
        }
        default:
          throw new Error("baseline: unsupported recipe kind");
      }
    },
  };
}
