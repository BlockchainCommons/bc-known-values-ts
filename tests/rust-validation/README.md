# Rust cross-validation harness

Replays `tests/vectors/vectors.json` through `known-values = 0.15.5` (the
tracked reference) and reports matches, expected divergences by class, and
mismatches. A mismatch fails the run.

    cargo run --release -- ../vectors/vectors.json
