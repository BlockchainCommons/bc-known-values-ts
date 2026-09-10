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
import { KNOWN_VALUE } from "@blockchaincommons/tags";
import { Digest, type DigestProvider } from "@blockchaincommons/components";

/** What a known value can be built from. */
export type KnownValueInput = number | bigint;

const toBigInt = (value: KnownValueInput): bigint => {
  const v = typeof value === "bigint" ? value : BigInt(value);
  if (v < 0n || v > 0xffffffffffffffffn) {
    throw new RangeError(`KnownValue must be an unsigned 64-bit integer, got ${v}`);
  }
  return v;
};

let CODEC: CborCodec<KnownValue> | undefined;

export class KnownValue implements ToCbor, CborTagged, DigestProvider {
  private readonly _value: bigint;
  private readonly _assignedName: string | undefined;

  /**
   * @param value - The codepoint (an unsigned 64-bit integer)
   * @param assignedName - The name the registry gives it, if any
   */
  constructor(value: KnownValueInput, assignedName?: string) {
    this._value = toBigInt(value);
    this._assignedName = assignedName;
  }

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

  toString(): string {
    return this.name;
  }

  /** SHA-256 of the tagged CBOR. */
  digest(): Digest {
    return Digest.fromImage(this.toCbor().toData());
  }

  /** Tagged-CBOR codec; `decode` also accepts the untagged form. */
  static get codec(): CborCodec<KnownValue> {
    return (CODEC ??= {
      tags: [KNOWN_VALUE],
      encode: (kv) => kv.toCbor(),
      decode: (c) => {
        const content =
          asTaggedValue(c) === undefined ? c : expectTaggedContent(c, KNOWN_VALUE.value);
        return new KnownValue(expectUnsigned(content));
      },
    });
  }

  cborTags(): Tag[] {
    return [KNOWN_VALUE];
  }

  /** The bare unsigned integer. */
  untaggedCbor(): Cbor {
    return cbor(this._value);
  }

  /** `#6.40000(value)`. */
  toCbor(): Cbor {
    return taggedValue(KNOWN_VALUE, this.untaggedCbor());
  }

  /** Decode tagged (`#6.40000(n)`) or untagged (`n`) CBOR. */
  static fromCbor(cborValue: Cbor): KnownValue {
    return KnownValue.codec.decode(cborValue);
  }
}
