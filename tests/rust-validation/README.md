# Rust cross-validation harness

Replays `tests/vectors/vectors.json` through `known-values = 0.15.5` with default
features disabled. The Rust store therefore uses its built-in constants rather
than reading registry files from the runner's home directory.

From this directory:

```sh
cargo run --release -- ../vectors/vectors.json
```

The current corpus reports 7,953 vectors: 4,493 exact matches, 3,445 classified
differences, 15 skipped runtime-domain recipes, and zero unexpected mismatches.
D1 covers registry contents, D2 negative CBOR conversion, D4 two missing Rust
registrations, and E1 different error representations when both sides reject.
An unexpected mismatch fails the run. See
[RUST_DIVERGENCES.md](../../RUST_DIVERGENCES.md) for the scope and remaining differences.
