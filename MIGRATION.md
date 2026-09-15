# Migrating from `@bcts/known-values` to `@blockchaincommons/known-values`

`@blockchaincommons/known-values` is the successor to `@bcts/known-values`.

## TL;DR checklist

- [ ] Replace the `@bcts/known-values` dependency with `@blockchaincommons/known-values`.
- [ ] Rewrite import specifiers: `@bcts/known-values` becomes `@blockchaincommons/known-values`.
- [ ] Raise your Node floor to **22.12**.
- [ ] Ensure TypeScript **>= 5.7** to consume the published types.
- [ ] If you relied on the `browser` field or a global-script build, switch to the ESM or CJS entry point.

## 1. Package name and imports

```diff
- import { /* ... */ } from "@bcts/known-values";
+ import { /* ... */ } from "@blockchaincommons/known-values";
```

```diff
  "dependencies": {
-   "@bcts/known-values": "^1.0.0-beta.6"
+   "@blockchaincommons/known-values": "^1.0.0-beta.1"
  }
```

## 2. Version numbering restarts

`@bcts/known-values` versions moved in lockstep with every other `@bcts`
package, which is why it reached `1.0.0-beta.6`. Each extracted package now
versions independently and starts again at `1.0.0-beta.1`. A lower version
number here does **not** mean older code.

## 3. Node and TypeScript floors moved up

| | `@bcts/known-values` | `@blockchaincommons/known-values` |
|---|---|---|
| Node | `>= 18` | `>= 22.12` |
| TypeScript (consumers) | 6.x | `>= 5.7` |

## 4. The IIFE / global-script build is gone

`@bcts/known-values` shipped an additional IIFE bundle exposed through the `browser`
field. That build is dropped: IIFE entry points cannot share chunks, which forks
module-level singletons across entry points. Use the ESM entry (`import`) or the
CJS entry (`require`); both are declared in `exports` and validated in CI by
`publint` and `@arethetypeswrong/cli`.

---

# Migrating to 1.0.0-beta.3

- **The global registry is the reference's.** It starts from the 102
  constants the reference seeds (`VALUE` and `SELF` are exported with their
  names but not seeded) and then loads the `*.json` registry files of
  `~/.known-values`, exactly as `KNOWN_VALUES` does with the crate's default
  `directory-loading` feature. The bundled vocabularies are no longer
  registered: `byName("schema:Thing")`, `byName("value")` and
  `byName("Self")` are `undefined` by default. Call
  `setDirectoryConfig(new DirectoryConfig())` before the first use for a
  machine-independent registry (a reference build without the feature), or
  register `BUNDLED_REGISTRY` into a store of your own.
- **`resolveKnownValue(value, store)`** takes the store as a required second
  argument; `undefined` is the reference's `None` and yields an unnamed
  value. Pass `getGlobalKnownValuesStore()` for the old behaviour.
- **`KnownValuesError`** replaces `RangeError` for every argument fault
  (`InvalidParameter`), and carries the loader's `Io`, `Json` and
  `AlreadyInitialized` codes with the reference's texts.
- **Unsafe numbers are refused**: `new KnownValue(2 ** 53 + 2)` throws where
  it used to round; pass a `bigint`. `store.register`, the store constructor,
  `nameOf`, `assignedNameOf` require a `KnownValue` and `byName` a string;
  `equals` returns `false` for anything else (and `true` across module
  copies).
- **Negative content inside tag 40000 decodes**, wrapping to `2^64 + n` as
  the reference's `u64::try_from`; a port of `KnownValue::from(x as i32)`
  is `new KnownValue(BigInt.asUintN(64, BigInt(x)))`.
- `cborTags()` and the `WrongTag` message name the tag as the global dcbor
  tags store does at call time (`40000` before `registerTags()`,
  `known-value` after).
- One global registry and one directory configuration per process across the
  ESM and CommonJS builds.
- **New:** `DirectoryConfig`, `setDirectoryConfig`, `addSearchPaths`,
  `loadFromDirectory`, `loadFromConfig`, `store.loadFromDirectory`,
  `store.loadFromConfig`, `parseRegistryFile` and its types,
  `KnownValue.isKnownValue`, `KnownValuesError.isKnownValuesError`.

| Reference | TypeScript |
|---|---|
| `KnownValue::new`, `new_with_name`, `From<u64>`, `From<usize>` | `new KnownValue(value, name?)`, `KnownValue.from` |
| `From<i32>` (wraps) | `new KnownValue(BigInt.asUintN(64, BigInt(x)))` |
| `known_value_for_raw_value(raw, store)` | `resolveKnownValue(value, store)` (`undefined` is `None`) |
| `known_value_for_name(name, store)` | `store?.byName(name)` |
| `name_for_known_value(kv, store)` | `store?.nameOf(kv) ?? kv.name` |
| `DirectoryConfig::{new, default_only, with_paths, with_paths_and_default, default_directory, paths, add_path}` | `new DirectoryConfig(paths?)`, `DirectoryConfig.defaultOnly()`, `withPathsAndDefault`, `defaultDirectory()`, `paths`, `addPath` |
| `set_directory_config`, `add_search_paths`, `load_from_directory`, `load_from_config` | `setDirectoryConfig`, `addSearchPaths`, `loadFromDirectory`, `loadFromConfig` |
| `LoadResult { values, files_processed, errors }` | `{ values, filesProcessed, errors }` (`values.size`, `values.values()`, `errors.length > 0`) |
| `serde_json::from_str::<RegistryFile>` | `parseRegistryFile(text)` (camelCase fields, `bigint` codepoints) |
| `LoadError::Io` / `Json`, `ConfigError::AlreadyInitialized` | `KnownValuesError` `Io` / `Json` / `AlreadyInitialized` |
| `default-features = false` | `setDirectoryConfig(new DirectoryConfig())` before first access |

---

# Migrating to the 1.0.0-beta.1 API

`1.0.0-beta.1` also reshapes the TypeScript surface. **Every wire byte is
unchanged**: tagged CBOR, digests and the registry names are verified against
a frozen `@bcts/known-values` baseline and against `known-values-rust` 0.15.5 by
`tests/rust-validation`.

Validating against the reference then changed what the package *accepts and
holds*, not its names:

- Every `KnownValue`, `REGISTRY_CONSTANTS`, `KNOWN_VALUE_CODEPOINTS` and
  `BUNDLED_REGISTRY` are **frozen**; assigning to a constant throws
  `TypeError` in strict mode where it silently renamed a wire predicate.
- **Argument faults are one error** (`KnownValuesError` since 1.0.0-beta.3) with the package's message:
  `new KnownValue(1.5 | NaN | null | undefined | "1" | true)`,
  `store.byValue(…)` and `resolveKnownValue(…)` with the same inputs, and a
  non-string assigned name. `"1"` and `true` were accepted before;
  `byValue(-1)` returned `undefined` and now throws.
- **`byName("")` answers the unit value** (codepoint 0), as the reference
  does; it returned `undefined`.
- **`200000 testWorkflowEntry`** (the Research repo's workflow test row) is
  no longer bundled: `resolveKnownValue(200000, store).name` is `"200000"`.
- **`100 body`** is in the bundled table, so `byValue(100)` returns the
  registry's object like every other codepoint (it returned the `BODY`
  constant itself).
- `resolveKnownValue` takes `KnownValueInput`; `cborTags()` returns a copy
  of a frozen array; `data/` left the npm tarball (it is the generator's
  input).

| Before | After |
|---|---|
| `kv.value()` (number, throws above 2^53) | `kv.value` (`number`, or `bigint` above 2^53) |
| `kv.valueBigInt()`, `kv.assignedName()`, `kv.name()` | `kv.valueBigInt`, `kv.assignedName`, `kv.name` (getters) |
| `kv.hashCode()` | gone (compare with `equals` or by `value`) |
| `kv.taggedCbor()`, `kv.toCborData()`, `kv.taggedCborData()` | `kv.toCbor()`, `kv.toCbor().toData()` |
| `KnownValue.fromTaggedCbor(c)`, `fromUntaggedCbor(c)`, instance `fromX` | `KnownValue.fromCbor(c)` (tag 40000 required, as the reference's `TryFrom<CBOR>`) or `KnownValue.codec`; `KnownValue.fromUntaggedCbor(c)` for the bare integer |
| `KnownValue.fromCborData(bytes)` | `KnownValue.fromCbor(decodeCbor(bytes))` or `decodeWith(bytes, KnownValue.codec)` |
| decode errors: bare `Error` | dcbor `CborError` with a code (`WrongTag`, `WrongType`, …) |
| `store.insert(kv)` | `store.register(kv)` |
| `store.knownValueForValue(v)`, `store.knownValueNamed(n)` | `store.byValue(v)`, `store.byName(n)` |
| `store.assignedName(kv)`, `store.name(kv)` | `store.assignedNameOf(kv)`, `store.nameOf(kv)` |
| `KnownValuesStore.knownValueForRawValue(v, store?)` | `resolveKnownValue(v, store)` |
| `KnownValuesStore.knownValueForName(n, store?)` | `store?.byName(n)` |
| `KnownValuesStore.nameForKnownValue(kv, store?)` | `store?.nameOf(kv) ?? kv.name` |
| `KNOWN_VALUES.get()`, `LazyKnownValues` | `getGlobalKnownValuesStore()`, `withKnownValues(fn)` |
| `IS_A_RAW` … (104 `bigint` constants) | `KNOWN_VALUE_CODEPOINTS.IS_A` … (one `as const` table of `number`s) |
| `loadBundledRegistries()`, `RegistryEntry`, `RegistryFile` | `BUNDLED_REGISTRY` (`readonly [codepoint, name][]`, generated from `data/*.json`) |
| `KNOWN_VALUE_TAG` | `TAG_KNOWN_VALUE` from `@blockchaincommons/tags` |

New: `KnownValue.from(v, name?)`, `store.size`, `store.values()`, `for (const kv of store)`,
`REGISTRY_CONSTANTS`. The JSON registries are no longer imported at runtime
(no `resolveJsonModule` needed); `scripts/generate-registry.ts` regenerates
`src/registry.generated.ts` from them.
