# Frozen baseline build

`known-values-baseline.mjs` is the self-contained ESM bundle of `@blockchaincommons/known-values` built from
commit `1a10e096e8a2e9256fc5e6a67b8714d8043f1ffa`, the pre-redesign wire-format reference. `@blockchaincommons/components`
is INLINED from its own frozen baseline bundle, and the pre-redesign
`@blockchaincommons/dcbor-compat` is INLINED directly, so this bundle keeps the
pre-redesign behaviour of its dependencies after they change.
`known-values-baseline.d.mts` is the public surface at that commit.

`tests/differential.test.ts` runs every corpus recipe through this bundle and
the working tree and asserts identical outcomes; it pins the sha256 below so
an accidental rebuild cannot turn the differential into a self-comparison.

Baseline commit: 1a10e096e8a2e9256fc5e6a67b8714d8043f1ffa
Baseline sha256: 64a82be2f4975e38383dd4cd0089d0185e4d440dc189d6b520ed4c8bc5590367

## Historical reconstruction

`bun run baseline:build` runs the TypeScript baseline builder. Reconstruction
requires the recorded historical source revision and compatible sibling baselines;
current source imports APIs absent from those bundles. Keep the frozen artifacts
and hashes unchanged when running `bun run test:differential`.
