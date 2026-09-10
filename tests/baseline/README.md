# Frozen baseline build

`known-values-baseline.mjs` is the self-contained ESM bundle of `@blockchaincommons/known-values` built from
commit `1a10e096e8a2e9256fc5e6a67b8714d8043f1ffa`, the pre-redesign wire-format reference. Sibling
`@blockchaincommons/*` packages are INLINED from their own frozen baseline
bundles (@blockchaincommons/crypto, @blockchaincommons/rand, @blockchaincommons/sskr, @blockchaincommons/tags, @blockchaincommons/components, @blockchaincommons/uniform-resources, @blockchaincommons/shamir), so this bundle keeps the
pre-redesign behaviour of its dependencies after they change.
`known-values-baseline.d.mts` is the public surface at that commit (Phase 0.5).

`tests/differential.test.ts` runs every corpus recipe through this bundle and
the working tree and asserts identical outcomes; it pins the sha256 below so
an accidental rebuild cannot turn the differential into a self-comparison.

Baseline commit: 1a10e096e8a2e9256fc5e6a67b8714d8043f1ffa
Baseline sha256: 8e71c50e6115269bba68406e28b0a242515eb4e6b6077243b86dd0cc1344d95e
