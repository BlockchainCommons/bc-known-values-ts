# Changelog

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