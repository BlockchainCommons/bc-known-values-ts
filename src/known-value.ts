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
  asTaggedValue,
  cbor,
  expectTaggedContent,
  expectUnsigned,
  taggedValue,
} from "@blockchaincommons/dcbor";
import { TAG_KNOWN_VALUE } from "@blockchaincommons/tags";
import { Digest, type DigestProvider } from "@blockchaincommons/components";

/** What a known value can be built from. */
export type KnownValueInput = number | bigint;

/** The one domain check: a `number` that is a safe integer, or a `bigint`, in `0 ..= 2⁶⁴ − 1`. */
export function toBigInt(value: KnownValueInput): bigint {
  let v: bigint;
  if (typeof value === "bigint") {
    v = value;
  } else if (typeof value === "number" && Number.isInteger(value)) {
    v = BigInt(value);
  } else {
    throw new RangeError(`KnownValue must be an unsigned 64-bit integer, got ${describe(value)}`);
  }
  if (v < 0n || v > 0xffffffffffffffffn) {
    throw new RangeError(`KnownValue must be an unsigned 64-bit integer, got ${v}`);
  }
  return v;
}

/** A short rendering of a rejected codepoint for the error message. */
function describe(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean" || value === null)
    return String(value);
  return typeof value;
}

let CODEC: CborCodec<KnownValue> | undefined;
const CBOR_TAGS: readonly Tag[] = /*#__PURE__*/ Object.freeze([TAG_KNOWN_VALUE]);

/**
 * A known value: a codepoint (an unsigned 64-bit integer) with, optionally,
 * the name a registry assigns it.
 *
 * **Equality is by codepoint** (`equals`), whatever the names; `===` is not
 * meaningful — the global registry hands out the object it built from the
 * bundled table, not the exported constant, so
 * `getGlobalKnownValuesStore().byValue(1) === IS_A` is `false` while
 * `.equals(IS_A)` is `true`. Instances are frozen (a constant cannot be
 * renamed process-wide) and every constructor argument is checked: the
 * codepoint must be a safe-integer `number` or a `bigint` in
 * `0 ..= 2⁶⁴ − 1` (a `bigint` above 2⁵³), the name a `string`.
 *
 * Two module graphs (CommonJS and ESM in one process) each have their own
 * class and their own global registry: `instanceof` across them is `false`,
 * `equals` still holds.
 */
export class KnownValue implements ToCbor, CborTagged, DigestProvider {
  private readonly _value: bigint;
  private readonly _assignedName: string | undefined;

  /**
   * @param value - The codepoint (an unsigned 64-bit integer)
   * @param assignedName - The name the registry gives it, if any
   * @throws RangeError when `value` is not a safe-integer `number` or a `bigint` in `0 ..= 2⁶⁴ − 1`, or `assignedName` is not a string
   */
  constructor(value: KnownValueInput, assignedName?: string) {
    this._value = toBigInt(value);
    if (assignedName !== undefined && typeof assignedName !== "string") {
      throw new RangeError(`KnownValue name must be a string, got ${typeof assignedName}`);
    }
    this._assignedName = assignedName;
    // A known value has no mutable state; freezing makes that true at
    // runtime too (a constant cannot be renamed process-wide).
    Object.freeze(this);
  }

  /**
   * The same as the constructor, for call chains.
   *
   * @throws RangeError as the constructor does
   */
  static from(value: KnownValueInput, assignedName?: string): KnownValue {
    return new KnownValue(value, assignedName);
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

  /** Two known values are equal when their codepoints are, whatever their names. */
  equals(other: KnownValue): boolean {
    return this._value === other._value;
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
   * Tagged-CBOR codec; `decode` also accepts the untagged form (the bare
   * unsigned integer), which the reference's decoder does not — recorded in
   * `RUST_DIVERGENCES.md`.
   */
  static get codec(): CborCodec<KnownValue> {
    return (CODEC ??= {
      tags: [TAG_KNOWN_VALUE],
      encode: (kv) => kv.toCbor(),
      decode: (c) => {
        const content =
          asTaggedValue(c) === undefined ? c : expectTaggedContent(c, TAG_KNOWN_VALUE.value);
        return new KnownValue(expectUnsigned(content));
      },
    });
  }

  /** The known-value tag (40000). */
  cborTags(): Tag[] {
    return [...CBOR_TAGS];
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
   * Decode tagged (`#6.40000(n)`) or untagged (`n`) CBOR.
   *
   * @throws CborError (dcbor's, with a code: `WrongTag`, `WrongType`, …) when the CBOR is not a known value
   */
  static fromCbor(cborValue: Cbor): KnownValue {
    return KnownValue.codec.decode(cborValue);
  }
}
