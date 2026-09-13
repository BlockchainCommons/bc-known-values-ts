# Divergences from the Rust reference implementation

This library is a TypeScript port of
[`BlockchainCommons/known-values-rust`](https://github.com/BlockchainCommons/known-values-rust),
tracked at version **0.15.5**
([`c1eefb4`](https://github.com/BlockchainCommons/known-values-rust/commit/c1eefb4b6c2c9855802e2649ef70bad9beed6f35)).

The tracked version and commit are recorded in
[`.github/versions.yml`](./.github/versions.yml), and the `upstream.yml`
workflow opens a tracking issue whenever the reference implementation moves
ahead of it.

This document is the deliberate record of every place the TypeScript behaviour
differs from the Rust reference. It has three kinds of entry:

1. **True behavioral divergences** - the same input produces a different outcome.
2. **JS-only input domain** - inputs that have no Rust analog, so there is nothing to diverge from.
3. **Mapping equivalences** - JS-specific inputs that are validated through the bytes they produce.

Every entry below is checked by `tests/rust-validation`, a Rust program that
pins `known-values = 0.15.5` **without its default features** (so the
reference's global store is its hard-coded list, not whatever
`~/.known-values` holds on the runner) and replays `tests/vectors/vectors.json`
through the reference: every construction, every decode, every lookup by
value in `0..=800` and every bundled codepoint above it, and every lookup by
name for the constants and a set of probes. The current run: **7 953
vectors — 4 493 match, 3 445 expected divergences (D1 3 433 · D2 1 · D4 4 ·
E1 7), 15 JS-only, 0 mismatches.**

## 1. True behavioral divergences

### D2. A negative integer inside tag 40000 (1 vector)

`d99c4020` (tag 40000 over −1) decodes in the reference to the known value
18446744073709551615: dcbor's `u64` conversion wraps the negative
(`dcbor/src/int.rs`, `(-1 - a) as u64`), so `d99c403bffffffffffffffff`
(tag 40000 over −2⁶⁴) even decodes to the unit value 0 — two distinct wire
strings for one codepoint, and `to_cbor` of the result is not the input.
TypeScript rejects both (`CborError` `WrongType`, "Expected unsigned
integer"). Known values are unsigned by definition (BCR-2023-002), so the
TypeScript behaviour is kept. The same wrap shows in construction:
`KnownValue::from(-1i32)` is 18446744073709551615 in the reference
(`known_value.rs`, `value as u64`) where `new KnownValue(-1)` is a
`RangeError` here. The fixes belong upstream: dcbor-rust should reject
`Negative` for unsigned targets, and known-values-rust's `From<i32>` should
be a `TryFrom` (or take `u32`).

### D4. `VALUE` (25) and `SELF` (706): an upstream omission (4 vectors)

The reference declares both constants (`known_values_registry.rs`) and
BCR-2023-002 Appendix A lists both, but its global store registers 102 of
its 104 constants — `VALUE` and `SELF` are missing from the
`KnownValuesStore::new([...])` list — so `known_value_named("value")`,
`known_value_named("Self")` and the two lookups by value answer "not found"
there and `25 value` / `706 Self` here. The port keeps them registered.

Executed through `bc-envelope` 0.43.0 and `bc-envelope-ts`, formatting
`"s" [ VALUE: "x" ]`:

| | reference | port |
|---|---|---|
| in memory | `'value'` (the constant carries its own static name; `notation.rs` falls back to it) | `'value'` |
| after a wire round trip | **`'25'`** (`cbor.rs` decodes an unnamed value; the store has nothing for 25) | `'value'` |

So the reference formats the same envelope two ways, and the port one way.
A Rust deployment whose `~/.known-values` holds the Research registry files
(which do carry 25 and 706) names them too; the omission bites exactly the
deterministic configuration. The one-line upstream fix — add `VALUE` and
`SELF` to the `KnownValuesStore::new([...])` list — is filed.

## 2. JS-only input domain

- **Bundled registries (`D1`, 3 433 vectors).** The TypeScript package ships
  13 JSON registries (3 546 rows: the Blockchain Commons constants, RDF,
  RDFS, OWL, Dublin Core, FOAF, SKOS, Solid, VC, GS1, schema.org) as a
  build-time table; the reference's global store holds only its hard-coded
  constants unless its `directory-loading` feature (on by default) finds
  files in `~/.known-values`, which makes the reference's store
  machine-dependent and the port's a fixed table. A browser has no home
  directory, so the bundle is the platform's form of "the registries are
  available". Executed: fed this package's `data/` directory, the
  reference's own `load_from_directory` returns the bundled table exactly
  (3 536 distinct `(codepoint, name)` rows) plus the one row the generator
  skips — the community file `100000_community_registry.json`, whose only
  entry is the Research repo's workflow test row `200000 testWorkflowEntry`.
  Every lookup the reference answers with "not found" and TypeScript
  answers with a bundled name above codepoint 800 is class D1; for every
  codepoint both know, the names are identical (a wrong name for a constant
  is a mismatch, not D1). The Blockchain Commons file carries `100 body`
  (absent from the upstream copy, filed) so that every constant is in the
  bundle. Load order is not a parity claim: the reference reads a directory
  in `fs::read_dir` order (unsorted) and the port in filename order; no
  bundled codepoint appears with two names, so only the resulting table is
  compared.

- **`resolveKnownValue`'s default store.** `resolveKnownValue(value)` looks
  the codepoint up in the global store when no store is given; the
  reference's `known_value_for_raw_value(raw, None)` consults nothing and
  returns the unnamed value. Pass a store explicitly for
  reference-identical behaviour (the reference's callers always do).

- **Argument faults.** The reference's types cannot express these; the port
  rejects every one with one `RangeError` (`KnownValue must be an unsigned
  64-bit integer, got …`): `new KnownValue(1.5 | NaN | Infinity | null |
  undefined | "1" | true | -1 | 2n ** 64n)`, `store.byValue(…)` and
  `resolveKnownValue(…)` with the same inputs (so `byValue(-1)` throws
  rather than answering "not found"), and a non-string assigned name
  (`new KnownValue(1, 5)`, `KnownValue name must be a string`). A `number`
  above 2⁵³ that has already lost precision is accepted as the integer it
  is; pass a `bigint` for exact codepoints above 2⁵³.

- **Immutability.** `KnownValue` instances and the `REGISTRY_CONSTANTS`,
  `KNOWN_VALUE_CODEPOINTS` and `BUNDLED_REGISTRY` tables are frozen; a
  mutation is a `TypeError` in strict mode. `BUNDLED_REGISTRY`'s
  `[codepoint, name]` rows are plain tuples (the table is frozen, the rows
  are not), so a row rewritten before the global store is first built would
  name that codepoint differently — the store is built from the rows once
  and copies nothing. The reference's `const` values cannot be touched
  either; this is parity by other means.

- **Identity.** `equals` compares codepoints, as the reference's `PartialEq`
  does. `===` is not meaningful: the global registry hands out the object
  it built from the bundled table, so `byValue(1) === IS_A` is `false`
  while `.equals(IS_A)` is `true`. A CommonJS and an ESM consumer in one
  process each get their own class and global store (`instanceof` across
  them is `false`, `equals` holds).

## 3. Mapping equivalences

- **Error taxonomy (`E1`, 7 vectors).** Both sides reject malformed or
  wrong-typed input; the reference reports its dcbor error, TypeScript a
  dcbor `CborError` with a code (`WrongTag`, `WrongType`, `Underrun`,
  `UnusedData`, `NonCanonicalNumeric`). This includes the untagged form
  (`01`, `1818`): the tag is part of the type on both sides
  (`TryFrom<CBOR>` = `from_tagged_cbor`; `KnownValue.fromCbor` =
  `codec.decode`), and both offer an explicit entry point for the content
  (`from_untagged_cbor` / `KnownValue.fromUntaggedCbor`). The harness
  requires both to reject.
- **Store semantics.** Executed sequences, identical on both sides:
  re-registering a codepoint under a new name retires the old name; the
  same name registered on another codepoint moves the name index and
  leaves the old by-value name in place; an unnamed registration over a
  named codepoint clears the name; `nameOf` / `name()` fall back to the
  codepoint string.
- **The unit value's empty name.** `byName("")` answers codepoint 0 on both
  sides (the reference indexes `Some("")`; the port indexes the empty
  string like any other name), and `assignedNameOf(UNIT)` / `nameOf(UNIT)`
  are `""` on both.
- **JS-only rows (15 vectors).** The `domain` recipes above are replayed by
  the differential suite against the frozen pre-redesign bundle and pinned
  as vectors; the harness counts them as JS-only.

## Maintenance

When the upstream reference moves:

1. Review the diff via the link in the `upstream.yml` tracking issue.
2. Port the relevant changes.
3. Update `.github/versions.yml` with the new version and commit.
4. Update the tracked version at the top of this file.
5. Add, amend, or remove divergence entries as the port requires.
