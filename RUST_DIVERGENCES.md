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
pins `known-values = 0.15.5` and replays `tests/vectors/vectors.json` through
the reference. The current run: **7 828 vectors — 4 385 match, 3 443 expected
divergences, 0 mismatches.**

## 1. True behavioral divergences

### D2. A negative integer inside tag 40000 (1 vector)

`d99c4020` (tag 40000 over −1) decodes in the reference to the known value
18446744073709551615: dcbor's `u64` conversion wraps the negative. TypeScript
rejects it (`Expected unsigned integer`). Known values are unsigned by
definition (BCR-2023-002), so the TypeScript behaviour is kept.

## 2. JS-only input domain

- **Bundled registries (`D1`, 3 435 vectors).** The TypeScript package ships
  the 14 JSON registries (3 546 entries: RDF, RDFS, OWL, Dublin Core, FOAF,
  SKOS, Solid, VC, GS1, schema.org, community); the reference's global store
  holds only the hard-coded constants unless its `directory-loading` feature
  is used. Every lookup the reference answers with "not found" and TypeScript
  answers with a bundled name is class D1. For every codepoint both know
  (0–800), the names are identical.

## 3. Mapping equivalences

- **Error taxonomy (`E1`, 7 vectors).** Both sides reject malformed or
  wrong-typed input; the reference reports a dcbor error, TypeScript a plain
  `Error` (an error code in Phase 3). The harness requires both to reject.

## Maintenance

When the upstream reference moves:

1. Review the diff via the link in the `upstream.yml` tracking issue.
2. Port the relevant changes.
3. Update `.github/versions.yml` with the new version and commit.
4. Update the tracked version at the top of this file.
5. Add, amend, or remove divergence entries as the port requires.
