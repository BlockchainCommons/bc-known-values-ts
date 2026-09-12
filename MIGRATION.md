# Migrating from `@bcts/known-values` to `@blockchaincommons/known-values`

`@blockchaincommons/known-values` is the canonical home of this library. It was extracted from the
[`paritytech/bcts`](https://github.com/paritytech/bcts) monorepo, where it was
published as `@bcts/known-values`, into its own Blockchain Commons repository at
[`BlockchainCommons/known-values-ts`](https://github.com/BlockchainCommons/bc-known-values-ts).

`1.0.0-beta.1` is both the extraction and the redesign: the package name
changes **and** the API changes (the second part of this guide). The wire —
tagged CBOR, digests, registry names — does not. `@bcts/known-values` remains
published for one beta cycle as a thin re-export of this package, so nothing
breaks the moment you update, but the redesigned names below apply the moment
you import `@blockchaincommons/known-values`.

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

`@bcts/known-values` versions moved in lockstep with every other package in the
monorepo, which is why it reached `1.0.0-beta.6`. Each extracted package now
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

## 5. Peer packages renamed too

Every sibling library moved from the `@bcts` scope to `@blockchaincommons`. If
you depend on more than one, rename them together so a single copy of each
shared type is resolved:

| Old | New |
|---|---|
| `@bcts/dcbor` | `@blockchaincommons/dcbor` |
| `@bcts/<name>` | `@blockchaincommons/<name>` |

## 6. What did not change

- The public API: every exported name, signature and type is identical.
- The wire format. Encodings produced by `@bcts/known-values` decode here, and the reverse.
- Parity with the Rust reference implementation. See [`RUST_DIVERGENCES.md`](./RUST_DIVERGENCES.md).

---

# Migrating to the redesigned API

`1.0.0-beta.1` also redesigns the TypeScript surface. **Every wire byte is
unchanged**: tagged CBOR, digests and the registry names are verified against
a frozen pre-redesign baseline and against `known-values-rust` 0.15.5 by
`tests/rust-validation`.

Validating against the reference then changed what the package *accepts and
holds*, not its names:

- Every `KnownValue`, `REGISTRY_CONSTANTS`, `KNOWN_VALUE_CODEPOINTS` and
  `BUNDLED_REGISTRY` are **frozen**; assigning to a constant throws
  `TypeError` in strict mode where it silently renamed a wire predicate.
- **Argument faults are one `RangeError`** with the package's message:
  `new KnownValue(1.5 | NaN | null | undefined | "1" | true)`,
  `store.byValue(…)` and `resolveKnownValue(…)` with the same inputs, and a
  non-string assigned name. `"1"` and `true` were accepted before;
  `byValue(-1)` returned `undefined` and now throws.
- **`byName("")` answers the unit value** (codepoint 0), as the reference
  does; it returned `undefined`.
- **`200000 testWorkflowEntry`** (the Research repo's workflow test row) is
  no longer bundled: `resolveKnownValue(200000).name` is `"200000"`.
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
| `KnownValue.fromTaggedCbor(c)`, `fromUntaggedCbor(c)`, instance `fromX` | `KnownValue.fromCbor(c)` (tagged or untagged) or `KnownValue.codec` |
| `KnownValue.fromCborData(bytes)` | `KnownValue.fromCbor(decodeCbor(bytes))` or `decodeWith(bytes, KnownValue.codec)` |
| decode errors: bare `Error` | dcbor `CborError` with a code (`WrongTag`, `WrongType`, …) |
| `store.insert(kv)` | `store.register(kv)` |
| `store.knownValueForValue(v)`, `store.knownValueNamed(n)` | `store.byValue(v)`, `store.byName(n)` |
| `store.assignedName(kv)`, `store.name(kv)` | `store.assignedNameOf(kv)`, `store.nameOf(kv)` |
| `KnownValuesStore.knownValueForRawValue(v, store?)` | `resolveKnownValue(v, store?)` (global store by default) |
| `KnownValuesStore.knownValueForName(n, store?)` | `store?.byName(n)` |
| `KnownValuesStore.nameForKnownValue(kv, store?)` | `store?.nameOf(kv) ?? kv.name` |
| `KNOWN_VALUES.get()`, `LazyKnownValues` | `getGlobalKnownValuesStore()`, `withKnownValues(fn)` |
| `IS_A_RAW` … (104 `bigint` constants) | `KNOWN_VALUE_CODEPOINTS.IS_A` … (one `as const` table of `number`s) |
| `loadBundledRegistries()`, `RegistryEntry`, `RegistryFile` | `BUNDLED_REGISTRY` (`readonly [codepoint, name][]`, generated from `data/*.json`) |
| `KNOWN_VALUE_TAG` | `TAG_KNOWN_VALUE` from `@blockchaincommons/tags` |

New: `KnownValue.from(v, name?)`, `store.size`, `store.values()`, `for (const kv of store)`,
`REGISTRY_CONSTANTS`. The store also gains a second-argument-free
`resolveKnownValue`. The JSON registries are no longer imported at runtime
(no `resolveJsonModule` needed); `scripts/generate-registry.mjs` regenerates
`src/registry.generated.ts` from them.
