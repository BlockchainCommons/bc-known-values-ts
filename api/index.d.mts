import { Cbor, CborNumber, CborTaggedDecodable, CborTaggedEncodable, Tag } from "@blockchaincommons/dcbor-compat";
import { Digest, DigestProvider } from "@blockchaincommons/components";
//#region src/known-value.d.ts
/**
 * The numeric value for the CBOR tag used for Known Values.
 * This is Tag 40000 as defined in the Blockchain Commons registry.
 */
declare const TAG_KNOWN_VALUE: CborNumber;
/**
 * The CBOR tag used for Known Values.
 * This is Tag 40000 as defined in the Blockchain Commons registry.
 */
declare const KNOWN_VALUE_TAG: Tag;
/**
 * Type for values that can be used to create a KnownValue.
 * Supports both number (for values up to 2^53-1) and bigint (for full 64-bit range).
 */
type KnownValueInput = number | bigint;
declare class KnownValue implements CborTaggedEncodable, CborTaggedDecodable<KnownValue>, DigestProvider {
  private readonly _value;
  private readonly _assignedName;
  /**
   * Creates a new KnownValue with the given numeric value and optional name.
   *
   * @param value - The numeric value (number or bigint). Numbers are converted to bigint internally.
   * @param assignedName - Optional human-readable name for the value
   *
   * @example
   * ```typescript
   * const knownValue = new KnownValue(42);
   * console.log(knownValue.value()); // 42
   *
   * const namedValue = new KnownValue(1, 'isA');
   * console.log(namedValue.name()); // "isA"
   *
   * // Using bigint for large values
   * const largeValue = new KnownValue(9007199254740993n);
   * ```
   */
  constructor(value: KnownValueInput, assignedName?: string);
  /**
   * Returns the numeric value of the KnownValue.
   *
   * This is the raw unsigned integer that identifies the concept.
   * Returns a number for backward compatibility. For values > MAX_SAFE_INTEGER,
   * use `valueBigInt()`.
   *
   * @example
   * ```typescript
   * import { IS_A, NOTE } from '@blockchaincommons/known-values';
   * console.log(IS_A.value()); // 1
   * console.log(NOTE.value()); // 4
   * ```
   */
  value(): number;
  /**
   * Returns the numeric value of the KnownValue as a bigint.
   *
   * Use this for values that may exceed Number.MAX_SAFE_INTEGER (2^53-1).
   *
   * @example
   * ```typescript
   * const largeValue = new KnownValue(9007199254740993n);
   * console.log(largeValue.valueBigInt()); // 9007199254740993n
   * ```
   */
  valueBigInt(): bigint;
  /**
   * Returns the assigned name of the KnownValue, if one exists.
   *
   * @example
   * ```typescript
   * const namedValue = new KnownValue(1, 'isA');
   * console.log(namedValue.assignedName()); // "isA"
   *
   * const unnamedValue = new KnownValue(42);
   * console.log(unnamedValue.assignedName()); // undefined
   * ```
   */
  assignedName(): string | undefined;
  /**
   * Returns a human-readable name for the KnownValue.
   *
   * If the KnownValue has an assigned name, that name is returned.
   * Otherwise, the string representation of the numeric value is returned.
   *
   * @example
   * ```typescript
   * const namedValue = new KnownValue(1, 'isA');
   * console.log(namedValue.name()); // "isA"
   *
   * const unnamedValue = new KnownValue(42);
   * console.log(unnamedValue.name()); // "42"
   * ```
   */
  name(): string;
  /**
   * Compares this KnownValue with another for equality.
   * Equality is based solely on the numeric value, ignoring the name.
   *
   * @param other - The KnownValue to compare with
   * @returns true if the values are equal
   *
   * @example
   * ```typescript
   * const kv1 = new KnownValue(1, 'isA');
   * const kv2 = new KnownValue(1, 'different');
   * console.log(kv1.equals(kv2)); // true (same value, different name)
   * ```
   */
  equals(other: KnownValue): boolean;
  /**
   * Hash code based on the numeric value.
   * Useful for using KnownValue in hash-based collections.
   */
  hashCode(): number;
  /**
   * Returns the cryptographic digest of this KnownValue.
   *
   * The digest is computed from the tagged CBOR encoding of the value,
   * providing a unique content-addressable identifier.
   *
   * This is used for Envelope integration where KnownValues are hashed
   * for tree construction.
   *
   * @returns A Digest of the tagged CBOR encoding
   *
   * @example
   * ```typescript
   * const kv = new KnownValue(1, "isA");
   * const digest = kv.digest();
   * console.log(digest.hex()); // SHA-256 hash of the CBOR encoding
   * ```
   */
  digest(): Digest;
  /**
   * String representation of the KnownValue.
   *
   * If a name is assigned, the name is displayed. Otherwise, the numeric value
   * is displayed.
   */
  toString(): string;
  /**
   * Returns the CBOR tags associated with KnownValue.
   *
   * The primary tag is TAG_KNOWN_VALUE (201).
   *
   * @returns Array containing the KnownValue tag
   */
  cborTags(): Tag[];
  /**
   * Returns the untagged CBOR encoding of this KnownValue.
   *
   * The untagged representation is simply the unsigned integer value.
   *
   * @returns CBOR representation of the value (unsigned integer)
   */
  untaggedCbor(): Cbor;
  /**
   * Returns the tagged CBOR encoding of this KnownValue.
   *
   * This wraps the unsigned integer value with tag 201.
   *
   * @returns Tagged CBOR representation
   *
   * @example
   * ```typescript
   * const kv = new KnownValue(1, 'isA');
   * const tagged = kv.taggedCbor();
   * console.log(tagged.toHex()); // "d8c901" (tag 201, value 1)
   * ```
   */
  taggedCbor(): Cbor;
  /**
   * Returns the tagged CBOR encoding as binary data.
   *
   * @returns Binary CBOR representation
   *
   * @example
   * ```typescript
   * const kv = new KnownValue(1, 'isA');
   * const bytes = kv.toCborData();
   * // bytes is Uint8Array containing the CBOR encoding
   * ```
   */
  toCborData(): Uint8Array;
  /**
   * Alias for `toCborData()` to match the dcbor interface.
   */
  taggedCborData(): Uint8Array;
  /**
   * Creates a KnownValue from untagged CBOR (an unsigned integer).
   * Instance method for interface compliance.
   *
   * @param cborValue - The CBOR value (must be an unsigned integer)
   * @returns A new KnownValue
   * @throws {Error} If the CBOR is not an unsigned integer
   */
  fromUntaggedCbor(cborValue: Cbor): KnownValue;
  /**
   * Creates a KnownValue from tagged CBOR (tag 201).
   * Instance method for interface compliance.
   *
   * @param cborValue - The tagged CBOR value
   * @returns A new KnownValue
   * @throws {Error} If the CBOR is not properly tagged or contains invalid data
   */
  fromTaggedCbor(cborValue: Cbor): KnownValue;
  /**
   * Creates a KnownValue from untagged CBOR (an unsigned integer).
   *
   * @param cborValue - The CBOR value (must be an unsigned integer)
   * @returns A new KnownValue
   * @throws {Error} If the CBOR is not an unsigned integer
   *
   * @example
   * ```typescript
   * const cborValue = cbor(42);
   * const kv = KnownValue.fromUntaggedCbor(cborValue);
   * console.log(kv.value()); // 42
   * ```
   */
  static fromUntaggedCbor(cborValue: Cbor): KnownValue;
  /**
   * Creates a KnownValue from tagged CBOR (tag 201).
   *
   * @param cborValue - The tagged CBOR value
   * @returns A new KnownValue
   * @throws {Error} If the CBOR is not properly tagged or contains invalid data
   *
   * @example
   * ```typescript
   * const kv = KnownValue.fromTaggedCbor(taggedCborValue);
   * ```
   */
  static fromTaggedCbor(cborValue: Cbor): KnownValue;
  /**
   * Creates a KnownValue from binary CBOR data.
   *
   * @param data - Binary CBOR data (must be a tagged KnownValue)
   * @returns A new KnownValue
   * @throws {Error} If the data cannot be decoded or is not a valid KnownValue
   *
   * @example
   * ```typescript
   * const bytes = new Uint8Array([0xd8, 0xc9, 0x01]); // tag 201, value 1
   * const kv = KnownValue.fromCborData(bytes);
   * console.log(kv.value()); // 1
   * ```
   */
  static fromCborData(data: Uint8Array): KnownValue;
  /**
   * Creates a KnownValue from a CBOR value, automatically detecting
   * whether it's tagged or untagged.
   *
   * @param cborValue - The CBOR value (tagged or untagged)
   * @returns A new KnownValue
   * @throws {Error} If the CBOR cannot be converted to a KnownValue
   *
   * @example
   * ```typescript
   * // Works with both tagged and untagged
   * const kv1 = KnownValue.fromCbor(cbor(42));
   * const kv2 = KnownValue.fromCbor(taggedCborValue);
   * ```
   */
  static fromCbor(cborValue: Cbor): KnownValue;
}
//#endregion
//#region src/known-values-store.d.ts
/**
 * A store that maps between Known Values and their assigned names.
 *
 * The `KnownValuesStore` provides a bidirectional mapping between:
 * - Numeric values (bigint) and their corresponding KnownValue instances
 * - String names and their corresponding KnownValue instances
 *
 * This enables efficient lookup in both directions, making it possible to:
 * - Find the name for a given numeric value
 * - Find the numeric value for a given name
 * - Retrieve complete KnownValue instances by either name or value
 *
 * The store is typically populated with predefined Known Values from the
 * registry, but can also be extended with custom values.
 *
 * @example
 * ```typescript
 * import { KnownValuesStore, IS_A, NOTE, SIGNED } from '@blockchaincommons/known-values';
 *
 * // Create a store with predefined Known Values
 * const store = new KnownValuesStore([IS_A, NOTE, SIGNED]);
 *
 * // Look up a Known Value by name
 * const isA = store.knownValueNamed('isA');
 * console.log(isA?.value()); // 1
 *
 * // Look up a name for a raw value
 * const name = store.name(new KnownValue(3));
 * console.log(name); // "signed"
 *
 * // Insert a custom Known Value
 * const customStore = store.clone();
 * customStore.insert(new KnownValue(100, 'customValue'));
 * console.log(customStore.knownValueNamed('customValue')?.value()); // 100
 * ```
 */
declare class KnownValuesStore {
  private knownValuesByRawValue;
  private knownValuesByAssignedName;
  /**
   * Creates a new KnownValuesStore with the provided Known Values.
   *
   * This constructor takes an iterable of KnownValue instances and
   * populates the store with them, creating mappings from both raw
   * values and names to the corresponding KnownValue instances.
   *
   * @param knownValues - Iterable of KnownValue instances to populate the store
   *
   * @example
   * ```typescript
   * import { KnownValuesStore, IS_A, NOTE, SIGNED } from '@blockchaincommons/known-values';
   *
   * // Create a store with predefined Known Values
   * const store = new KnownValuesStore([IS_A, NOTE, SIGNED]);
   *
   * // Look up Known Values
   * console.log(store.knownValueNamed('isA')?.value()); // 1
   * console.log(store.knownValueNamed('note')?.value()); // 4
   * ```
   */
  constructor(knownValues?: Iterable<KnownValue>);
  /**
   * Inserts a KnownValue into the store.
   *
   * If the KnownValue has an assigned name, it will be indexed by both its
   * raw value and its name. If a KnownValue with the same raw value or name
   * already exists in the store, it will be replaced.
   *
   * @param knownValue - The KnownValue to insert
   *
   * @example
   * ```typescript
   * import { KnownValuesStore, KnownValue } from '@blockchaincommons/known-values';
   *
   * const store = new KnownValuesStore();
   * store.insert(new KnownValue(100, 'customValue'));
   * console.log(store.knownValueNamed('customValue')?.value()); // 100
   * ```
   */
  insert(knownValue: KnownValue): void;
  /**
   * Returns the assigned name for a KnownValue, if present in the store.
   *
   * @param knownValue - The KnownValue to look up
   * @returns The assigned name, or undefined if not found
   *
   * @example
   * ```typescript
   * import { KnownValuesStore, IS_A } from '@blockchaincommons/known-values';
   *
   * const store = new KnownValuesStore([IS_A]);
   * console.log(store.assignedName(IS_A)); // "isA"
   * console.log(store.assignedName(new KnownValue(999))); // undefined
   * ```
   */
  assignedName(knownValue: KnownValue): string | undefined;
  /**
   * Returns a human-readable name for a KnownValue.
   *
   * If the KnownValue has an assigned name in the store, that name is
   * returned. Otherwise, the KnownValue's default name (which may be its
   * numeric value as a string) is returned.
   *
   * @param knownValue - The KnownValue to get the name for
   * @returns The name (assigned or numeric)
   *
   * @example
   * ```typescript
   * import { KnownValuesStore, IS_A } from '@blockchaincommons/known-values';
   *
   * const store = new KnownValuesStore([IS_A]);
   * console.log(store.name(IS_A)); // "isA"
   * console.log(store.name(new KnownValue(999))); // "999"
   * ```
   */
  name(knownValue: KnownValue): string;
  /**
   * Looks up a KnownValue by its assigned name.
   *
   * Returns the KnownValue if found, or undefined if no KnownValue
   * with the given name exists in the store.
   *
   * @param assignedName - The name to look up
   * @returns The KnownValue, or undefined if not found
   *
   * @example
   * ```typescript
   * import { KnownValuesStore, IS_A } from '@blockchaincommons/known-values';
   *
   * const store = new KnownValuesStore([IS_A]);
   *
   * const isA = store.knownValueNamed('isA');
   * console.log(isA?.value()); // 1
   *
   * console.log(store.knownValueNamed('nonexistent')); // undefined
   * ```
   */
  knownValueNamed(assignedName: string): KnownValue | undefined;
  /**
   * Looks up a KnownValue by its raw numeric value.
   *
   * @param rawValue - The numeric value to look up (number or bigint)
   * @returns The KnownValue, or undefined if not found
   *
   * @example
   * ```typescript
   * import { KnownValuesStore, IS_A } from '@blockchaincommons/known-values';
   *
   * const store = new KnownValuesStore([IS_A]);
   * const isA = store.knownValueForValue(1);
   * console.log(isA?.name()); // "isA"
   * ```
   */
  knownValueForValue(rawValue: KnownValueInput): KnownValue | undefined;
  /**
   * Retrieves a KnownValue for a raw value, using a store if provided.
   *
   * This static method allows looking up a KnownValue by its raw numeric
   * value:
   * - If a store is provided and contains a mapping for the raw value, that
   *   KnownValue is returned
   * - Otherwise, a new KnownValue with no assigned name is created and
   *   returned
   *
   * @param rawValue - The numeric value to look up (number or bigint)
   * @param knownValues - Optional store to search in
   * @returns The KnownValue from the store or a new unnamed KnownValue
   *
   * @example
   * ```typescript
   * import { KnownValuesStore, IS_A } from '@blockchaincommons/known-values';
   *
   * const store = new KnownValuesStore([IS_A]);
   *
   * // Known value from store
   * const isA = KnownValuesStore.knownValueForRawValue(1, store);
   * console.log(isA.name()); // "isA"
   *
   * // Unknown value creates a new KnownValue
   * const unknown = KnownValuesStore.knownValueForRawValue(999, store);
   * console.log(unknown.name()); // "999"
   *
   * // No store provided also creates a new KnownValue
   * const unknown2 = KnownValuesStore.knownValueForRawValue(1, undefined);
   * console.log(unknown2.name()); // "1"
   * ```
   */
  static knownValueForRawValue(rawValue: KnownValueInput, knownValues?: KnownValuesStore): KnownValue;
  /**
   * Attempts to find a KnownValue by its name, using a store if provided.
   *
   * This static method allows looking up a KnownValue by its name:
   * - If a store is provided and contains a mapping for the name, that
   *   KnownValue is returned
   * - Otherwise, undefined is returned
   *
   * @param name - The name to look up
   * @param knownValues - Optional store to search in
   * @returns The KnownValue if found, or undefined
   *
   * @example
   * ```typescript
   * import { KnownValuesStore, IS_A } from '@blockchaincommons/known-values';
   *
   * const store = new KnownValuesStore([IS_A]);
   *
   * // Known value from store
   * const isA = KnownValuesStore.knownValueForName('isA', store);
   * console.log(isA?.value()); // 1
   *
   * // Unknown name returns undefined
   * console.log(KnownValuesStore.knownValueForName('unknown', store)); // undefined
   *
   * // No store provided also returns undefined
   * console.log(KnownValuesStore.knownValueForName('isA', undefined)); // undefined
   * ```
   */
  static knownValueForName(name: string, knownValues?: KnownValuesStore): KnownValue | undefined;
  /**
   * Returns a human-readable name for a KnownValue, using a store if provided.
   *
   * This static method allows getting a name for a KnownValue:
   * - If a store is provided and contains a mapping for the KnownValue, its
   *   assigned name is returned
   * - Otherwise, the KnownValue's default name (which may be its numeric
   *   value as a string) is returned
   *
   * @param knownValue - The KnownValue to get the name for
   * @param knownValues - Optional store to use for lookup
   * @returns The name (assigned or numeric)
   *
   * @example
   * ```typescript
   * import { KnownValuesStore, IS_A } from '@blockchaincommons/known-values';
   *
   * const store = new KnownValuesStore([IS_A]);
   *
   * // Known value from store
   * let name = KnownValuesStore.nameForKnownValue(IS_A, store);
   * console.log(name); // "isA"
   *
   * // Unknown value in store uses KnownValue's name method
   * name = KnownValuesStore.nameForKnownValue(new KnownValue(999), store);
   * console.log(name); // "999"
   *
   * // No store provided also uses KnownValue's name method
   * name = KnownValuesStore.nameForKnownValue(IS_A, undefined);
   * console.log(name); // "isA"
   * ```
   */
  static nameForKnownValue(knownValue: KnownValue, knownValues?: KnownValuesStore): string;
  /**
   * Creates a shallow clone of this store.
   *
   * @returns A new KnownValuesStore with the same entries
   */
  clone(): KnownValuesStore;
  /**
   * Internal helper method to insert a KnownValue into the store's maps.
   */
  private _insert;
}
//#endregion
//#region src/bundled-registries.d.ts
/**
 * A single entry in a known values JSON registry file.
 */
interface RegistryEntry {
  /** The unique numeric identifier for this known value. */
  codepoint: number;
  /** The canonical string name for this known value. */
  name: string;
  /** The type of entry (e.g., "property", "class", "value"). */
  type?: string;
  /** An optional URI reference for this known value. */
  uri?: string;
  /** An optional human-readable description. */
  description?: string;
}
/**
 * Root structure of a known values JSON registry file.
 */
interface RegistryFile {
  /** Metadata about this registry. */
  ontology?: {
    name?: string;
    source_url?: string;
    start_code_point?: number;
    processing_strategy?: string;
  };
  /** Information about how this file was generated. */
  generated?: {
    tool?: string;
    version?: string;
  };
  /** The known value entries in this registry. */
  entries: RegistryEntry[];
  /** Statistics about this registry (ignored during parsing). */
  statistics?: unknown;
}
/**
 * Loads all known values from the bundled JSON registry files.
 *
 * Returns a flat array of KnownValue instances parsed from all
 * bundled registry files. The caller is responsible for inserting
 * them into a KnownValuesStore (later entries override earlier ones
 * when codepoints match).
 */
declare function loadBundledRegistries(): KnownValue[];
//#endregion
//#region src/known-values-registry.d.ts
declare const UNIT_RAW = 0n;
declare const IS_A_RAW = 1n;
declare const ID_RAW = 2n;
declare const SIGNED_RAW = 3n;
declare const NOTE_RAW = 4n;
declare const HAS_RECIPIENT_RAW = 5n;
declare const SSKR_SHARE_RAW = 6n;
declare const CONTROLLER_RAW = 7n;
declare const KEY_RAW = 8n;
declare const DEREFERENCE_VIA_RAW = 9n;
declare const ENTITY_RAW = 10n;
declare const NAME_RAW = 11n;
declare const LANGUAGE_RAW = 12n;
declare const ISSUER_RAW = 13n;
declare const HOLDER_RAW = 14n;
declare const SALT_RAW = 15n;
declare const DATE_RAW = 16n;
declare const UNKNOWN_VALUE_RAW = 17n;
declare const VERSION_VALUE_RAW = 18n;
declare const HAS_SECRET_RAW = 19n;
declare const DIFF_EDITS_RAW = 20n;
declare const VALID_FROM_RAW = 21n;
declare const VALID_UNTIL_RAW = 22n;
declare const POSITION_RAW = 23n;
declare const NICKNAME_RAW = 24n;
declare const VALUE_RAW = 25n;
declare const ATTESTATION_RAW = 26n;
declare const VERIFIABLE_AT_RAW = 27n;
declare const ATTACHMENT_RAW = 50n;
declare const VENDOR_RAW = 51n;
declare const CONFORMS_TO_RAW = 52n;
declare const ALLOW_RAW = 60n;
declare const DENY_RAW = 61n;
declare const ENDPOINT_RAW = 62n;
declare const DELEGATE_RAW = 63n;
declare const PROVENANCE_RAW = 64n;
declare const PRIVATE_KEY_RAW = 65n;
declare const SERVICE_RAW = 66n;
declare const CAPABILITY_RAW = 67n;
declare const PROVENANCE_GENERATOR_RAW = 68n;
declare const PRIVILEGE_ALL_RAW = 70n;
declare const PRIVILEGE_AUTH_RAW = 71n;
declare const PRIVILEGE_SIGN_RAW = 72n;
declare const PRIVILEGE_ENCRYPT_RAW = 73n;
declare const PRIVILEGE_ELIDE_RAW = 74n;
declare const PRIVILEGE_ISSUE_RAW = 75n;
declare const PRIVILEGE_ACCESS_RAW = 76n;
declare const PRIVILEGE_DELEGATE_RAW = 80n;
declare const PRIVILEGE_VERIFY_RAW = 81n;
declare const PRIVILEGE_UPDATE_RAW = 82n;
declare const PRIVILEGE_TRANSFER_RAW = 83n;
declare const PRIVILEGE_ELECT_RAW = 84n;
declare const PRIVILEGE_BURN_RAW = 85n;
declare const PRIVILEGE_REVOKE_RAW = 86n;
declare const BODY_RAW = 100n;
declare const RESULT_RAW = 101n;
declare const ERROR_RAW = 102n;
declare const OK_VALUE_RAW = 103n;
declare const PROCESSING_VALUE_RAW = 104n;
declare const SENDER_RAW = 105n;
declare const SENDER_CONTINUATION_RAW = 106n;
declare const RECIPIENT_CONTINUATION_RAW = 107n;
declare const CONTENT_RAW = 108n;
declare const SEED_TYPE_RAW = 200n;
declare const PRIVATE_KEY_TYPE_RAW = 201n;
declare const PUBLIC_KEY_TYPE_RAW = 202n;
declare const MASTER_KEY_TYPE_RAW = 203n;
declare const ASSET_RAW = 300n;
declare const BITCOIN_VALUE_RAW = 301n;
declare const ETHEREUM_VALUE_RAW = 302n;
declare const TEZOS_VALUE_RAW = 303n;
declare const NETWORK_RAW = 400n;
declare const MAIN_NET_VALUE_RAW = 401n;
declare const TEST_NET_VALUE_RAW = 402n;
declare const BIP32_KEY_TYPE_RAW = 500n;
declare const CHAIN_CODE_RAW = 501n;
declare const DERIVATION_PATH_TYPE_RAW = 502n;
declare const PARENT_PATH_RAW = 503n;
declare const CHILDREN_PATH_RAW = 504n;
declare const PARENT_FINGERPRINT_RAW = 505n;
declare const PSBT_TYPE_RAW = 506n;
declare const OUTPUT_DESCRIPTOR_TYPE_RAW = 507n;
declare const OUTPUT_DESCRIPTOR_RAW = 508n;
declare const GRAPH_RAW = 600n;
declare const SOURCE_TARGET_GRAPH_RAW = 601n;
declare const PARENT_CHILD_GRAPH_RAW = 602n;
declare const DIGRAPH_RAW = 603n;
declare const ACYCLIC_GRAPH_RAW = 604n;
declare const MULTIGRAPH_RAW = 605n;
declare const PSEUDOGRAPH_RAW = 606n;
declare const GRAPH_FRAGMENT_RAW = 607n;
declare const DAG_RAW = 608n;
declare const TREE_RAW = 609n;
declare const FOREST_RAW = 610n;
declare const COMPOUND_GRAPH_RAW = 611n;
declare const HYPERGRAPH_RAW = 612n;
declare const DIHYPERGRAPH_RAW = 613n;
declare const NODE_RAW = 700n;
declare const EDGE_RAW = 701n;
declare const SOURCE_RAW = 702n;
declare const TARGET_RAW = 703n;
declare const PARENT_RAW = 704n;
declare const CHILD_RAW = 705n;
declare const UNIT: KnownValue;
declare const IS_A: KnownValue;
declare const ID: KnownValue;
declare const SIGNED: KnownValue;
declare const NOTE: KnownValue;
declare const HAS_RECIPIENT: KnownValue;
declare const SSKR_SHARE: KnownValue;
declare const CONTROLLER: KnownValue;
declare const KEY: KnownValue;
declare const DEREFERENCE_VIA: KnownValue;
declare const ENTITY: KnownValue;
declare const NAME: KnownValue;
declare const LANGUAGE: KnownValue;
declare const ISSUER: KnownValue;
declare const HOLDER: KnownValue;
declare const SALT: KnownValue;
declare const DATE: KnownValue;
declare const UNKNOWN_VALUE: KnownValue;
declare const VERSION_VALUE: KnownValue;
declare const HAS_SECRET: KnownValue;
declare const DIFF_EDITS: KnownValue;
declare const VALID_FROM: KnownValue;
declare const VALID_UNTIL: KnownValue;
declare const POSITION: KnownValue;
declare const NICKNAME: KnownValue;
declare const VALUE: KnownValue;
declare const ATTESTATION: KnownValue;
declare const VERIFIABLE_AT: KnownValue;
declare const ATTACHMENT: KnownValue;
declare const VENDOR: KnownValue;
declare const CONFORMS_TO: KnownValue;
declare const ALLOW: KnownValue;
declare const DENY: KnownValue;
declare const ENDPOINT: KnownValue;
declare const DELEGATE: KnownValue;
declare const PROVENANCE: KnownValue;
declare const PRIVATE_KEY: KnownValue;
declare const SERVICE: KnownValue;
declare const CAPABILITY: KnownValue;
declare const PROVENANCE_GENERATOR: KnownValue;
declare const PRIVILEGE_ALL: KnownValue;
declare const PRIVILEGE_AUTH: KnownValue;
declare const PRIVILEGE_SIGN: KnownValue;
declare const PRIVILEGE_ENCRYPT: KnownValue;
declare const PRIVILEGE_ELIDE: KnownValue;
declare const PRIVILEGE_ISSUE: KnownValue;
declare const PRIVILEGE_ACCESS: KnownValue;
declare const PRIVILEGE_DELEGATE: KnownValue;
declare const PRIVILEGE_VERIFY: KnownValue;
declare const PRIVILEGE_UPDATE: KnownValue;
declare const PRIVILEGE_TRANSFER: KnownValue;
declare const PRIVILEGE_ELECT: KnownValue;
declare const PRIVILEGE_BURN: KnownValue;
declare const PRIVILEGE_REVOKE: KnownValue;
declare const BODY: KnownValue;
declare const RESULT: KnownValue;
declare const ERROR: KnownValue;
declare const OK_VALUE: KnownValue;
declare const PROCESSING_VALUE: KnownValue;
declare const SENDER: KnownValue;
declare const SENDER_CONTINUATION: KnownValue;
declare const RECIPIENT_CONTINUATION: KnownValue;
declare const CONTENT: KnownValue;
declare const SEED_TYPE: KnownValue;
declare const PRIVATE_KEY_TYPE: KnownValue;
declare const PUBLIC_KEY_TYPE: KnownValue;
declare const MASTER_KEY_TYPE: KnownValue;
declare const ASSET: KnownValue;
declare const BITCOIN_VALUE: KnownValue;
declare const ETHEREUM_VALUE: KnownValue;
declare const TEZOS_VALUE: KnownValue;
declare const NETWORK: KnownValue;
declare const MAIN_NET_VALUE: KnownValue;
declare const TEST_NET_VALUE: KnownValue;
declare const BIP32_KEY_TYPE: KnownValue;
declare const CHAIN_CODE: KnownValue;
declare const DERIVATION_PATH_TYPE: KnownValue;
declare const PARENT_PATH: KnownValue;
declare const CHILDREN_PATH: KnownValue;
declare const PARENT_FINGERPRINT: KnownValue;
declare const PSBT_TYPE: KnownValue;
declare const OUTPUT_DESCRIPTOR_TYPE: KnownValue;
declare const OUTPUT_DESCRIPTOR: KnownValue;
declare const GRAPH: KnownValue;
declare const SOURCE_TARGET_GRAPH: KnownValue;
declare const PARENT_CHILD_GRAPH: KnownValue;
declare const DIGRAPH: KnownValue;
declare const ACYCLIC_GRAPH: KnownValue;
declare const MULTIGRAPH: KnownValue;
declare const PSEUDOGRAPH: KnownValue;
declare const GRAPH_FRAGMENT: KnownValue;
declare const DAG: KnownValue;
declare const TREE: KnownValue;
declare const FOREST: KnownValue;
declare const COMPOUND_GRAPH: KnownValue;
declare const HYPERGRAPH: KnownValue;
declare const DIHYPERGRAPH: KnownValue;
declare const NODE: KnownValue;
declare const EDGE: KnownValue;
declare const SOURCE: KnownValue;
declare const TARGET: KnownValue;
declare const PARENT: KnownValue;
declare const CHILD: KnownValue;
declare const SELF_RAW = 706n;
declare const SELF: KnownValue;
/**
 * A lazily initialized singleton that holds the global registry of known
 * values.
 *
 * This class provides thread-safe, lazy initialization of the global
 * KnownValuesStore that contains all the predefined Known Values in the
 * registry. The store is created only when first accessed, and subsequent
 * accesses reuse the same instance.
 *
 * This is used internally by the crate and should not typically be needed by
 * users of the API, who should access Known Values through the constants
 * exposed in the `known_values` module.
 */
declare class LazyKnownValues {
  private _data;
  /**
   * Gets the global KnownValuesStore, initializing it if necessary.
   *
   * This method guarantees that initialization occurs exactly once.
   */
  get(): KnownValuesStore;
}
/**
 * The global registry of Known Values.
 *
 * This static instance provides access to all standard Known Values defined in
 * the registry specification. It is lazily initialized on first access.
 *
 * Most users should not need to interact with this directly, as the predefined
 * Known Values are exposed as constants in the `known_values` module.
 *
 * @example
 * ```typescript
 * import { KNOWN_VALUES } from '@blockchaincommons/known-values';
 *
 * // Access the global store
 * const knownValues = KNOWN_VALUES.get();
 *
 * // Look up a Known Value by name
 * const isA = knownValues.knownValueNamed('isA');
 * console.log(isA?.value()); // 1
 * ```
 */
declare const KNOWN_VALUES: LazyKnownValues;
//#endregion
export { ACYCLIC_GRAPH, ACYCLIC_GRAPH_RAW, ALLOW, ALLOW_RAW, ASSET, ASSET_RAW, ATTACHMENT, ATTACHMENT_RAW, ATTESTATION, ATTESTATION_RAW, BIP32_KEY_TYPE, BIP32_KEY_TYPE_RAW, BITCOIN_VALUE, BITCOIN_VALUE_RAW, BODY, BODY_RAW, CAPABILITY, CAPABILITY_RAW, CHAIN_CODE, CHAIN_CODE_RAW, CHILD, CHILDREN_PATH, CHILDREN_PATH_RAW, CHILD_RAW, COMPOUND_GRAPH, COMPOUND_GRAPH_RAW, CONFORMS_TO, CONFORMS_TO_RAW, CONTENT, CONTENT_RAW, CONTROLLER, CONTROLLER_RAW, DAG, DAG_RAW, DATE, DATE_RAW, DELEGATE, DELEGATE_RAW, DENY, DENY_RAW, DEREFERENCE_VIA, DEREFERENCE_VIA_RAW, DERIVATION_PATH_TYPE, DERIVATION_PATH_TYPE_RAW, DIFF_EDITS, DIFF_EDITS_RAW, DIGRAPH, DIGRAPH_RAW, DIHYPERGRAPH, DIHYPERGRAPH_RAW, EDGE, EDGE_RAW, ENDPOINT, ENDPOINT_RAW, ENTITY, ENTITY_RAW, ERROR, ERROR_RAW, ETHEREUM_VALUE, ETHEREUM_VALUE_RAW, FOREST, FOREST_RAW, GRAPH, GRAPH_FRAGMENT, GRAPH_FRAGMENT_RAW, GRAPH_RAW, HAS_RECIPIENT, HAS_RECIPIENT_RAW, HAS_SECRET, HAS_SECRET_RAW, HOLDER, HOLDER_RAW, HYPERGRAPH, HYPERGRAPH_RAW, ID, ID_RAW, ISSUER, ISSUER_RAW, IS_A, IS_A_RAW, KEY, KEY_RAW, KNOWN_VALUES, KNOWN_VALUE_TAG, KnownValue, type KnownValueInput, KnownValuesStore, LANGUAGE, LANGUAGE_RAW, LazyKnownValues, MAIN_NET_VALUE, MAIN_NET_VALUE_RAW, MASTER_KEY_TYPE, MASTER_KEY_TYPE_RAW, MULTIGRAPH, MULTIGRAPH_RAW, NAME, NAME_RAW, NETWORK, NETWORK_RAW, NICKNAME, NICKNAME_RAW, NODE, NODE_RAW, NOTE, NOTE_RAW, OK_VALUE, OK_VALUE_RAW, OUTPUT_DESCRIPTOR, OUTPUT_DESCRIPTOR_RAW, OUTPUT_DESCRIPTOR_TYPE, OUTPUT_DESCRIPTOR_TYPE_RAW, PARENT, PARENT_CHILD_GRAPH, PARENT_CHILD_GRAPH_RAW, PARENT_FINGERPRINT, PARENT_FINGERPRINT_RAW, PARENT_PATH, PARENT_PATH_RAW, PARENT_RAW, POSITION, POSITION_RAW, PRIVATE_KEY, PRIVATE_KEY_RAW, PRIVATE_KEY_TYPE, PRIVATE_KEY_TYPE_RAW, PRIVILEGE_ACCESS, PRIVILEGE_ACCESS_RAW, PRIVILEGE_ALL, PRIVILEGE_ALL_RAW, PRIVILEGE_AUTH, PRIVILEGE_AUTH_RAW, PRIVILEGE_BURN, PRIVILEGE_BURN_RAW, PRIVILEGE_DELEGATE, PRIVILEGE_DELEGATE_RAW, PRIVILEGE_ELECT, PRIVILEGE_ELECT_RAW, PRIVILEGE_ELIDE, PRIVILEGE_ELIDE_RAW, PRIVILEGE_ENCRYPT, PRIVILEGE_ENCRYPT_RAW, PRIVILEGE_ISSUE, PRIVILEGE_ISSUE_RAW, PRIVILEGE_REVOKE, PRIVILEGE_REVOKE_RAW, PRIVILEGE_SIGN, PRIVILEGE_SIGN_RAW, PRIVILEGE_TRANSFER, PRIVILEGE_TRANSFER_RAW, PRIVILEGE_UPDATE, PRIVILEGE_UPDATE_RAW, PRIVILEGE_VERIFY, PRIVILEGE_VERIFY_RAW, PROCESSING_VALUE, PROCESSING_VALUE_RAW, PROVENANCE, PROVENANCE_GENERATOR, PROVENANCE_GENERATOR_RAW, PROVENANCE_RAW, PSBT_TYPE, PSBT_TYPE_RAW, PSEUDOGRAPH, PSEUDOGRAPH_RAW, PUBLIC_KEY_TYPE, PUBLIC_KEY_TYPE_RAW, RECIPIENT_CONTINUATION, RECIPIENT_CONTINUATION_RAW, RESULT, RESULT_RAW, type RegistryEntry, type RegistryFile, SALT, SALT_RAW, SEED_TYPE, SEED_TYPE_RAW, SELF, SELF_RAW, SENDER, SENDER_CONTINUATION, SENDER_CONTINUATION_RAW, SENDER_RAW, SERVICE, SERVICE_RAW, SIGNED, SIGNED_RAW, SOURCE, SOURCE_RAW, SOURCE_TARGET_GRAPH, SOURCE_TARGET_GRAPH_RAW, SSKR_SHARE, SSKR_SHARE_RAW, TAG_KNOWN_VALUE, TARGET, TARGET_RAW, TEST_NET_VALUE, TEST_NET_VALUE_RAW, TEZOS_VALUE, TEZOS_VALUE_RAW, TREE, TREE_RAW, UNIT, UNIT_RAW, UNKNOWN_VALUE, UNKNOWN_VALUE_RAW, VALID_FROM, VALID_FROM_RAW, VALID_UNTIL, VALID_UNTIL_RAW, VALUE, VALUE_RAW, VENDOR, VENDOR_RAW, VERIFIABLE_AT, VERIFIABLE_AT_RAW, VERSION_VALUE, VERSION_VALUE_RAW, loadBundledRegistries };
//# sourceMappingURL=index.d.mts.map