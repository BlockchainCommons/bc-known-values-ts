/**
 * A known value: an unsigned integer that stands for a well-known
 * predicate, object or other vocabulary term, encoded as CBOR tag 40000 over
 * the integer ([BCR-2023-002](https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2023-002-known-value.md)).
 *
 * @module known-value
 */
import {
  type Cbor,
  type CborCodec,
  type CborTagged,
  type Tag,
  type ToCbor,
  cbor,
  expectUnsigned,
  extractTaggedContent,
  taggedValue,
  tagsForValues,
  validateTag,
} from "@blockchaincommons/dcbor";
import { TAG_KNOWN_VALUE } from "@blockchaincommons/tags";
import { Digest, type DigestProvider } from "@blockchaincommons/components";
import { KnownValuesError } from "./error.js";

/** What a known value can be built from. */
export type KnownValueInput = number | bigint;

const U64_MAX = 0xffffffffffffffffn;

/**
 * The one domain check: a `bigint` in `0 ..= 2⁶⁴ − 1`, or a non-negative
 * safe integer `number`. A `number` above `Number.MAX_SAFE_INTEGER` is
 * refused rather than rounded: the codepoint is the wire value.
 *
 * @throws KnownValuesError `InvalidParameter` otherwise
 */
export function toBigInt(value: KnownValueInput): bigint {
  if (typeof value === "bigint") {
    if (value >= 0n && value <= U64_MAX) return value;
  } else if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return BigInt(value);
  }
  throw KnownValuesError.invalidParameter("value", value);
}

/**
 * The brand every `KnownValue` carries, whichever copy of this module built
 * it (the ESM and CommonJS builds, or two bundled copies, in one process).
 */
const BRAND: unique symbol = Symbol.for("@blockchaincommons/known-values/type") as never;

let CODEC: CborCodec<KnownValue> | undefined;

/**
 * A known value: a codepoint (an unsigned 64-bit integer) with, optionally,
 * the name a registry assigns it.
 *
 * **Equality is by codepoint** (`equals`), whatever the names, and across
 * module copies. Compare with `equals`: `===` may hold for the constants the
 * global registry is seeded with but is not guaranteed, because directory
 * entries and registrations replace the registered objects. Instances are
 * frozen (a constant cannot be renamed process-wide) and every constructor
 * argument is checked: the codepoint must be a non-negative safe integer
 * `number` or a `bigint` in `0 ..= 2⁶⁴ − 1` (use `bigint` for exact
 * codepoints above the safe number range), the name a `string`.
 */
export class KnownValue implements ToCbor, CborTagged, DigestProvider {
  private readonly _value: bigint;
  private readonly _assignedName: string | undefined;
  /**
   * @param value - The codepoint (an unsigned 64-bit integer)
   * @param assignedName - The name the registry gives it, if any
   * @throws KnownValuesError `InvalidParameter` when `value` is not a non-negative safe
   *   integer `number` or a `bigint` in `0 ..= 2⁶⁴ − 1`, or `assignedName` is not a string
   */
  constructor(value: KnownValueInput, assignedName?: string) {
    this._value = toBigInt(value);
    if (assignedName !== undefined && typeof assignedName !== "string") {
      throw KnownValuesError.invalidParameter("name", assignedName);
    }
    this._assignedName = assignedName;
    // The cross-copy brand `isKnownValue` checks, then the freeze: a known
    // value has no mutable state (a constant cannot be renamed process-wide).
    Object.defineProperty(this, BRAND, { value: true });
    Object.freeze(this);
  }

  /**
   * The same as the constructor, for call chains.
   *
   * @throws KnownValuesError as the constructor does
   */
  static from(value: KnownValueInput, assignedName?: string): KnownValue {
    return new KnownValue(value, assignedName);
  }

  /**
   * Whether `x` is a `KnownValue`, from this module copy or another: checks
   * the brand, not `instanceof`.
   */
  static isKnownValue(x: unknown): x is KnownValue {
    return typeof x === "object" && x !== null && (x as { [BRAND]?: unknown })[BRAND] === true;
  }

  /** The codepoint, as a `number` when it is a safe integer and a `bigint` otherwise. */
  get value(): number | bigint {
    return this._value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(this._value) : this._value;
  }

  /** The codepoint as a `bigint`. */
  get valueBigInt(): bigint {
    return this._value;
  }

  /** The registry name, if one was assigned. */
  get assignedName(): string | undefined {
    return this._assignedName;
  }

  /** The assigned name, or the decimal codepoint when there is none. */
  get name(): string {
    return this._assignedName ?? this._value.toString();
  }

  /**
   * Two known values are equal when their codepoints are, whatever their
   * names and whichever module copy built them; anything that is not a
   * `KnownValue` is not equal.
   */
  equals(other: unknown): boolean {
    return KnownValue.isKnownValue(other) && this._value === other.valueBigInt;
  }

  /** `name`. */
  toString(): string {
    return this.name;
  }

  /** SHA-256 of the tagged CBOR. */
  digest(): Digest {
    return Digest.fromImage(this.toCbor().toData());
  }

  /**
   * Tagged-CBOR codec. `decode` requires `#6.40000(n)` — the tag is part of
   * the type, as in the reference's `TryFrom<CBOR>`; use `fromUntaggedCbor`
   * for the bare unsigned integer. `tags` is named from the global tags store
   * at each access, as the reference's `cbor_tags()` is.
   */
  static get codec(): CborCodec<KnownValue> {
    return (CODEC ??= {
      get tags(): Tag[] {
        return tagsForValues([TAG_KNOWN_VALUE.value]);
      },
      encode: (kv) => kv.toCbor(),
      decode: (c) => {
        validateTag(c, tagsForValues([TAG_KNOWN_VALUE.value]));
        return KnownValue.fromUntaggedCbor(extractTaggedContent(c));
      },
    });
  }

  /** The known-value tag (40000), named as the global tags store names it at the time. */
  cborTags(): Tag[] {
    return tagsForValues([TAG_KNOWN_VALUE.value]);
  }

  /** The bare unsigned integer. */
  untaggedCbor(): Cbor {
    return cbor(this._value);
  }

  /** `#6.40000(value)`. */
  toCbor(): Cbor {
    return taggedValue(TAG_KNOWN_VALUE, this.untaggedCbor());
  }

  /**
   * Decode `#6.40000(n)` (the reference's `TryFrom<CBOR>`). Negative content
   * wraps as {@link KnownValue.fromUntaggedCbor} describes.
   *
   * @throws CborError (dcbor's, with a code) — `WrongType` for an untagged value or a
   *   non-integer content, `WrongTag` for another tag (both tags named as the global
   *   tags store names them)
   */
  static fromCbor(cborValue: Cbor): KnownValue {
    return KnownValue.codec.decode(cborValue);
  }

  /**
   * Decode the bare integer `n` — the content of tag 40000 (the reference's
   * `from_untagged_cbor`), as a tag summariser or a decoder that has already
   * stripped the tag holds it. A negative integer node wraps to `2⁶⁴ + n`,
   * as the reference's `u64::try_from` does (dcbor's negative-to-unsigned
   * wrap), so `40000(-1)` is the codepoint 18446744073709551615; a whole
   * float head that dcbor turns into an integer node follows the same rule.
   *
   * @throws CborError `WrongType` when the CBOR is not an integer (a tagged value, a
   *   bignum, a text), `OutOfRange` for a negative below −2⁶⁴
   */
  static fromUntaggedCbor(cborValue: Cbor): KnownValue {
    return new KnownValue(expectUnsigned(cborValue, { width: 64, wrapNegative: true }));
  }
}
