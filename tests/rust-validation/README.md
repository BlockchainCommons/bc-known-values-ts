# Rust reference cross-validation

Replays vector files against the `known-values` reference: the published
`known-values` 0.15.5 crate from crates.io (sources `known-values-rust`
commit `c1eefb4`) over `bc-components` 0.31.1, `dcbor` 0.25.2 and
`serde_json` 1.0.151. Nothing is patched. Two builds: without default
features (the crate's hard-coded seed only), and with `directory-loading`
(the crate's default, used by bc-envelope, dcbor-parse, dcbor-pattern and
bc-envelope-pattern), which also compares the registry-file, directory,
configuration and home-directory rows.

```sh
cd tests/rust-validation
cargo run --release --offline -- ../vectors/vectors.json                               # the golden file
bun run vectors:full                                                                     # writes target/corpus.json
cargo run --release --offline -- target/corpus.json                                     # the whole corpus
cargo run --release --offline --features directory-loading -- ../vectors/vectors.json  # the reference's default
cargo run --release --offline --features directory-loading -- target/corpus.json
```

Result lines on 2026-09-15 (the golden file is the whole corpus, so the golden and full lines agree):

```
4234 vectors - 4033 match, 32 js-only, 169 feature-gated, 0 unparsable, 0 MISMATCH
4234 vectors - 4033 match, 32 js-only, 169 feature-gated, 0 unparsable, 0 MISMATCH
4234 vectors - 4202 match, 32 js-only, 0 feature-gated, 0 unparsable, 0 MISMATCH [directory-loading]
4234 vectors - 4202 match, 32 js-only, 0 feature-gated, 0 unparsable, 0 MISMATCH [directory-loading]
```

## What is compared

Every recipe yields one outcome string on each side and the two are
compared textually. The TypeScript outcome is the vector's `expect`
(`scripts/generate-vectors.ts` materialises it with the working tree, error
messages included); the reference's is computed by `src/main.rs`.

- `kv`, `decode` and `untagged` print the tagged CBOR, the digest, the name
  and the assigned name; a failure is `throw:<dcbor variant>:<Display>`,
  identical to the port's `CborError` code and message. The `decode` rows
  marked `tags` come last in the file: the harness calls
  `bc_components::register_tags()` before the first of them (the generator
  calls `registerTags()` at the same point), so `WrongTag` messages name the
  tag as the tags store names it.
- `lookup`, `resolve`, `store` and `nameFor` replay the global registry's
  names, `known_value_for_raw_value` with no store, the global store or a
  store built from the row, the store's replacement and name-index
  semantics, and `name_for_known_value`.
- `registryParse` feeds bytes to `serde_json::from_str::<RegistryFile>`
  (after `std::str::from_utf8`) and prints the parsed file or the exact
  error; `directory` materialises the row's tree in a temporary directory
  and runs `load_from_directory` (strict) or `load_from_config` (tolerant),
  printing values sorted by codepoint, the directories processed and the
  errors sorted, with the temporary root spelled `<root>`; `config` and
  `home` run in a child process each, where the reference's `KNOWN_VALUES`
  is still uninitialised, with `HOME` pointing into the tree so the
  machine's own `~/.known-values` is never read. The default build counts
  these four kinds as `feature-gated`.
- The harness pins its own configuration first
  (`set_directory_config(DirectoryConfig::new())`), as the test suite's
  setup file pins the port's, so no row of the parent process reads the
  runner's home directory.
- `domain` rows are the JavaScript input domain (`js-only`).
- Integers are read exactly; a recipe field this program cannot read is
  `unparsable`. A panic, or any other difference, is a MISMATCH. Both make
  the process exit 1.

## Kept host facts

Directory entries are read in host order on both sides (`opendir` here,
`read_dir` there); the vectors keep outcomes independent of that order (one
failing file per strictly loaded directory, no codepoint duplicated across
files, lists rendered sorted). IO error texts follow the POSIX `strerror`
table for the codes a load meets (`Is a directory (os error 21)`, …). The
reference's name index is random when loaded names collide across
codepoints; the vectors avoid that case.

## Self-check

`mismatch.json` holds one `kv` row with its last digest digit flipped; the
run must exit 1 with `1 MISMATCH`.

## CI

The `rust-validation` job in `.github/workflows/ci.yml` points `HOME` at an
empty directory, checks the golden file against the working tree
(`bun run test:golden`), materialises the full corpus, builds the harness
against the pinned crates (`cargo run --locked --offline` after
`cargo fetch --locked`), runs the golden file and the corpus in both builds,
then the mismatch fixture. A MISMATCH anywhere fails the job.

## Maintenance

When the reference moves: update the pins in `Cargo.toml`, run
`cargo update -p known-values`, refresh `tests/fixtures/reference-seed.json`
from the `KnownValuesStore::new([...])` list in `known_values_registry.rs`,
re-check `directory_loader.rs` and the `serde_json` and `dirs` versions in
`Cargo.lock`, update `.github/versions.yml`, regenerate the vectors
(`bun run vectors:generate`), run the four replays and copy the result lines
above. A new difference is a bug on one side: fix it, or add the js-only or
feature-gated row with its reason in `src/main.rs` and here.
