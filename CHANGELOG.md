# Changelog

## 1.0.0-beta.3 - 2026-09-15

### Changed (breaking)

- **The global registry equals the reference's.** `getGlobalKnownValuesStore()`
  starts from the 102 constants the reference seeds, in its order, then
  loads the `*.json` registry files of the configured directories
  (`~/.known-values` by default), later entries replacing earlier ones by
  codepoint, exactly as the crate's `KNOWN_VALUES` does. `VALUE` (25) and
  `SELF` (706) stay exported with their names but are not seeded, as in the
  reference; the bundled vocabularies (`BUNDLED_REGISTRY`) are no longer
  registered by default.
- **`resolveKnownValue(value, store)`** requires the store: `undefined` is
  the reference's `None` and yields an unnamed value.
- **`KnownValuesError`** (`InvalidParameter`, `Io`, `Json`,
  `AlreadyInitialized`) replaces `RangeError`. A `number` above
  `Number.MAX_SAFE_INTEGER` is refused instead of rounded; the store's
  `register`, constructor, `nameOf` and `assignedNameOf` require a
  `KnownValue`, `byName` a string; every check runs before the store is
  touched. `equals` is `false` for anything that is not a `KnownValue` and
  compares codepoints across module copies (`KnownValue.isKnownValue`).
- **Negative content inside tag 40000 decodes**, wrapping to `2^64 + n` as
  the reference's `u64::try_from` (`40000(-1)` is 18446744073709551615); a
  whole float head that dcbor turns into an integer node follows the same
  rule. A bignum, a text or the tagged form stay `WrongType`.
- **Tag names follow the global tags store** at call time: `cborTags()` and
  `codec.tags` are `40000` before `registerTags()` and `known-value` after,
  and a `WrongTag` message names both tags the way the reference's does
  (`expected CBOR tag known-value, but got 100`).
- **One global registry and one directory configuration per process**,
  shared by the ESM and CommonJS builds (a `globalThis` slot).
- `BUNDLED_REGISTRY` rows are frozen.
- Dependency floors: `@blockchaincommons/components`, `dcbor` and `tags`
  `^1.0.0-beta.3`.

### Added

- `DirectoryConfig` (`defaultOnly`, `withPathsAndDefault`, `defaultDirectory`,
  `paths`, `addPath`), `setDirectoryConfig`, `addSearchPaths`,
  `loadFromDirectory`, `loadFromConfig` (`LoadResult`),
  `store.loadFromDirectory`, `store.loadFromConfig`: the reference's
  directory loading, with its extension rule (`.json`, case-sensitive, no
  recursion), its strict and tolerant modes, its `IO error: …` and
  `JSON parse error in <file>: …` texts, and its `AlreadyInitialized` lock.
  The host filesystem is reached through `process.getBuiltinModule`, so a
  host without one (a browser) behaves as a machine without the directory.
- `parseRegistryFile(text)` and the `RegistryFile`, `RegistryEntry`,
  `OntologyInfo`, `GeneratedInfo` types: a registry-file reader with the
  reference's serde_json semantics, message for message (`bigint`
  codepoints; `null` and absent optionals both `undefined`).
- `KnownValue.isKnownValue`, `KnownValuesError.isKnownValuesError`.

## 1.0.0-beta.2 - 2026-09-12

Compatibility and maintenance updates against `known-values-rust` 0.15.5.
Tagged decoding is aligned; registry defaults, negative values, and error
representation differences remain documented.

### Changed

- `KnownValue.fromCbor` and `KnownValue.codec.decode` require tag 40000,
  as the reference's `TryFrom<CBOR>` (`from_tagged_cbor`) does. A bare
  integer is rejected with dcbor's `CborError` code `WrongType`, another tag
  with `WrongTag`. Every other `@blockchaincommons` codec already worked this
  way; known-values was the last lenient decoder in the stack.

### Added

- `KnownValue.fromUntaggedCbor(cbor)` decodes the bare unsigned integer —
  the content of tag 40000 — for callers that hold it, such as a tag
  summariser (`bc-envelope-ts` uses it); the reference's
  `from_untagged_cbor`.

## 1.0.0-beta.1 - 2026-09-09

Initial beta implementation.