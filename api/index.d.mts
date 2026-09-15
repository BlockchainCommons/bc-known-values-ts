import { Cbor, CborCodec, CborTagged, Tag, ToCbor } from "@blockchaincommons/dcbor";
import { Digest, DigestProvider } from "@blockchaincommons/components";
//#region src/known-value.d.ts
/** What a known value can be built from. */
type KnownValueInput = number | bigint;
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
export declare class KnownValue implements ToCbor, CborTagged, DigestProvider {
  private readonly _value;
  private readonly _assignedName;
  /**
   * @param value - The codepoint (an unsigned 64-bit integer)
   * @param assignedName - The name the registry gives it, if any
   * @throws KnownValuesError `InvalidParameter` when `value` is not a non-negative safe
   *   integer `number` or a `bigint` in `0 ..= 2⁶⁴ − 1`, or `assignedName` is not a string
   */
  constructor(value: KnownValueInput, assignedName?: string);
  /**
   * The same as the constructor, for call chains.
   *
   * @throws KnownValuesError as the constructor does
   */
  static from(value: KnownValueInput, assignedName?: string): KnownValue;
  /**
   * Whether `x` is a `KnownValue`, from this module copy or another: checks
   * the brand, not `instanceof`.
   */
  static isKnownValue(x: unknown): x is KnownValue;
  /** The codepoint, as a `number` when it is a safe integer and a `bigint` otherwise. */
  get value(): number | bigint;
  /** The codepoint as a `bigint`. */
  get valueBigInt(): bigint;
  /** The registry name, if one was assigned. */
  get assignedName(): string | undefined;
  /** The assigned name, or the decimal codepoint when there is none. */
  get name(): string;
  /**
   * Two known values are equal when their codepoints are, whatever their
   * names and whichever module copy built them; anything that is not a
   * `KnownValue` is not equal.
   */
  equals(other: unknown): boolean;
  /** `name`. */
  toString(): string;
  /** SHA-256 of the tagged CBOR. */
  digest(): Digest;
  /**
   * Tagged-CBOR codec. `decode` requires `#6.40000(n)` — the tag is part of
   * the type, as in the reference's `TryFrom<CBOR>`; use `fromUntaggedCbor`
   * for the bare unsigned integer. `tags` is named from the global tags store
   * at each access, as the reference's `cbor_tags()` is.
   */
  static get codec(): CborCodec<KnownValue>;
  /** The known-value tag (40000), named as the global tags store names it at the time. */
  cborTags(): Tag[];
  /** The bare unsigned integer. */
  untaggedCbor(): Cbor;
  /** `#6.40000(value)`. */
  toCbor(): Cbor;
  /**
   * Decode `#6.40000(n)` (the reference's `TryFrom<CBOR>`). Negative content
   * wraps as {@link KnownValue.fromUntaggedCbor} describes.
   *
   * @throws CborError (dcbor's, with a code) — `WrongType` for an untagged value or a
   *   non-integer content, `WrongTag` for another tag (both tags named as the global
   *   tags store names them)
   */
  static fromCbor(cborValue: Cbor): KnownValue;
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
  static fromUntaggedCbor(cborValue: Cbor): KnownValue;
}
//#endregion
//#region src/error.d.ts
/**
 * The single error type thrown by this package.
 *
 * @module error
 */
/**
 * Machine-readable discriminant for a {@link KnownValuesError}. `Io`, `Json`
 * and `AlreadyInitialized` are the reference's `LoadError` and `ConfigError`
 * variants; `InvalidParameter` is JS-only (an argument outside its domain).
 */
type KnownValuesErrorCode = "InvalidParameter" | "Io" | "Json" | "AlreadyInitialized";
/**
 * The argument an `InvalidParameter` error names: a codepoint that is not an
 * unsigned 64-bit integer, a name that is not a string, a value that is not a
 * `KnownValue`, or a path list, path or configuration of the wrong type.
 */
type KnownValuesParameter = "value" | "name" | "knownValue" | "knownValues" | "assignedName" | "paths" | "path" | "config" | "text";
/**
 * The structured payload of a {@link KnownValuesError}, discriminated by `code`.
 * Only `InvalidParameter` carries data: `e.details.code === "InvalidParameter"`
 * narrows to `{ parameter, value }`.
 */
type KnownValuesErrorDetails = {
  /** One of the reference's variants; the message is its `Display` text. */
  readonly code: Exclude<KnownValuesErrorCode, "InvalidParameter">;
} | {
  /** An argument outside its domain. */
  readonly code: "InvalidParameter";
  /** The argument. */
  readonly parameter: KnownValuesParameter;
  /** The value received, as passed. */
  readonly value: unknown;
};
/**
 * Thrown for an argument outside its domain (`InvalidParameter`, JS-only),
 * a registry file that cannot be read (`Io`) or parsed (`Json`), and a
 * directory configuration changed after the global store was built
 * (`AlreadyInitialized`). Branch on `code`; the messages of the last three
 * are the reference's `Display` strings.
 *
 * Instances come from the static factories only.
 *
 * @example
 * ```ts
 * try {
 *   setDirectoryConfig(new DirectoryConfig());
 * } catch (e) {
 *   if (KnownValuesError.isKnownValuesError(e) && e.is("AlreadyInitialized")) {
 *     // the global store has already been built
 *   }
 * }
 * ```
 */
export declare class KnownValuesError extends Error {
  /** Always `"KnownValuesError"`; the cross-copy identity {@link KnownValuesError.isKnownValuesError} checks. */
  override readonly name = "KnownValuesError";
  /** The discriminant; equals `details.code`. */
  readonly code: KnownValuesErrorCode;
  /** The structured payload. */
  readonly details: KnownValuesErrorDetails;
  private constructor();
  /** An argument outside its domain: `<parameter> must be <expectation>, got <value>`. */
  static invalidParameter(parameter: KnownValuesParameter, value: unknown): KnownValuesError;
  /** A registry file or directory that cannot be read; `message` is the reference's `IO error: …` text. */
  static io(message: string): KnownValuesError;
  /** A registry file that does not parse; `message` is the reference's text (the serde_json message, prefixed by the loader with the file). */
  static json(message: string): KnownValuesError;
  /** The directory configuration was changed after the global store was built. */
  static alreadyInitialized(): KnownValuesError;
  /**
   * Whether `x` is a `KnownValuesError`, from this module copy or another
   * (a CommonJS and an ESM copy in one process): checks the `name` and the
   * presence of `code`, not `instanceof`.
   */
  static isKnownValuesError(x: unknown): x is KnownValuesError;
  /** `code === c`. */
  is(c: KnownValuesErrorCode): boolean;
}
//#endregion
//#region src/directory.d.ts
/**
 * The directories the global registry loads registry files from, in order
 * (a later directory replaces an earlier one by codepoint). The default is
 * the one directory `~/.known-values`; an empty configuration loads nothing
 * and makes the global registry equal to a reference build without the
 * `directory-loading` feature.
 */
export declare class DirectoryConfig {
  private readonly _paths;
  /**
   * @param paths - The directories, in order (none by default)
   * @throws KnownValuesError `InvalidParameter` when `paths` is not an array of strings
   */
  constructor(paths?: readonly string[]);
  /** The default directory only. */
  static defaultOnly(): DirectoryConfig;
  /** `paths`, then the default directory. */
  static withPathsAndDefault(paths: readonly string[]): DirectoryConfig;
  /**
   * `~/.known-values`: the home directory is a non-empty `HOME`, else the
   * account's home from the user database, else `.` (the reference's
   * `dirs::home_dir().unwrap_or(".")`).
   */
  static defaultDirectory(): string;
  /** The directories, in order. */
  get paths(): readonly string[];
  /**
   * Appends a directory.
   *
   * @throws KnownValuesError `InvalidParameter` when `path` is not a string
   */
  addPath(path: string): void;
}
/**
 * Sets the directories the global registry will load from. Must be called
 * before the first `getGlobalKnownValuesStore()`; the configuration is
 * process-wide, shared by every copy of this module.
 *
 * @throws KnownValuesError `AlreadyInitialized` once the global registry has been built
 */
export declare function setDirectoryConfig(config: DirectoryConfig): void;
/**
 * Appends directories to the configuration the global registry will load
 * from, starting from the default configuration when none was set.
 *
 * @throws KnownValuesError `AlreadyInitialized` once the global registry has been built
 */
export declare function addSearchPaths(paths: readonly string[]): void;
/** One error a tolerant load met, with the file or directory it belongs to. */
interface LoadFailure {
  /** The file that failed to read or parse, or the directory that failed to list. */
  readonly path: string;
  /** The failure: `Io` or `Json`, with the reference's text. */
  readonly error: KnownValuesError;
}
/** What `loadFromConfig` reports: the values by codepoint, the directories processed, the errors met. */
interface LoadResult {
  /**
   * The loaded values by codepoint, a later directory or file replacing an
   * earlier one; iteration is in first-seen codepoint order.
   */
  readonly values: ReadonlyMap<bigint, KnownValue>;
  /** The directories whose entries were read to the end (missing ones included). */
  readonly filesProcessed: readonly string[];
  /** Every error met, with the file or directory it belongs to. */
  readonly errors: readonly LoadFailure[];
}
/**
 * The values of every `.json` registry file in `path`, in the host's
 * directory order (the reference's `load_from_directory`): a missing path
 * or a non-directory yields none; the first unreadable or unparsable file
 * fails the whole load.
 *
 * @throws KnownValuesError `Io` (`IO error: …`) or `Json` (`JSON parse error in <file>: …`)
 */
export declare function loadFromDirectory(path: string): KnownValue[];
/**
 * The values of every configured directory (the reference's
 * `load_from_config`): per-file errors are tolerated and reported; a
 * directory that cannot be read to the end is reported as one error, its
 * partial values discarded and its path left out of `filesProcessed`.
 */
export declare function loadFromConfig(config: DirectoryConfig): LoadResult;
//#endregion
//#region src/known-values-store.d.ts
/**
 * A bidirectional registry of known values: codepoint → value and assigned
 * name → value.
 *
 * `register` replaces by codepoint: a later registration of the same
 * codepoint replaces the earlier value and retires its name. A later
 * registration of the same *name* on another codepoint moves the name index
 * to it; the earlier codepoint keeps its own `assignedName` and both count
 * in `size` (the reference behaves the same). The empty name of the unit
 * value is indexed like any other, so `byName("")` answers codepoint 0.
 * Iteration is in registration order; a replaced codepoint keeps its
 * original position. Values are frozen, so `clone()` may share them.
 *
 * Every argument is checked before the store is touched: a value that is
 * not a `KnownValue`, or a name that is not a string, is a
 * `KnownValuesError` `InvalidParameter`.
 */
export declare class KnownValuesStore implements Iterable<KnownValue> {
  private _byValue;
  private _byName;
  /**
   * @param knownValues - Registered in order, as `register` would.
   * @throws KnownValuesError `InvalidParameter` when `knownValues` is not iterable or holds a non-`KnownValue`
   */
  constructor(knownValues?: Iterable<KnownValue>);
  /**
   * Add or replace a value. A later registration of the same codepoint
   * replaces the earlier one and retires its name; the same name on another
   * codepoint moves the name index (see the class doc).
   *
   * @throws KnownValuesError `InvalidParameter` when `knownValue` is not a `KnownValue`
   */
  register(knownValue: KnownValue): void;
  /**
   * The registered value with this codepoint, if any.
   *
   * @throws KnownValuesError `InvalidParameter` when `value` is not a non-negative safe
   *   integer `number` or a `bigint` in `0 ..= 2⁶⁴ − 1`
   */
  byValue(value: KnownValueInput): KnownValue | undefined;
  /**
   * The registered value with this assigned name, if any.
   *
   * @throws KnownValuesError `InvalidParameter` when `assignedName` is not a string
   */
  byName(assignedName: string): KnownValue | undefined;
  /**
   * The name this store assigns to the value's codepoint, if any.
   *
   * @throws KnownValuesError `InvalidParameter` when `knownValue` is not a `KnownValue`
   */
  assignedNameOf(knownValue: KnownValue): string | undefined;
  /**
   * The store's name for the codepoint, else the value's own name.
   *
   * @throws KnownValuesError `InvalidParameter` when `knownValue` is not a `KnownValue`
   */
  nameOf(knownValue: KnownValue): string;
  /**
   * Register every entry of the `.json` registry files in `path`, in the
   * host's directory order (the reference's `load_from_directory`): a
   * missing path or a non-directory registers nothing; the first unreadable
   * or unparsable file stops the load with nothing registered.
   *
   * @returns How many values the directory held
   * @throws KnownValuesError `Io` or `Json` for the first failing file or directory
   */
  loadFromDirectory(path: string): number;
  /**
   * Register the values of every configured directory, tolerating per-file
   * errors (the reference's `load_from_config`): later directories replace
   * earlier ones by codepoint, and the result lists the directories
   * processed and every error met.
   */
  loadFromConfig(config: DirectoryConfig): LoadResult;
  /** How many codepoints are registered. */
  get size(): number;
  /** Registered values, in registration order. */
  values(): IterableIterator<KnownValue>;
  /** Registered values, in registration order. */
  [Symbol.iterator](): Iterator<KnownValue>;
  /** An independent registry with the same entries (the frozen values are shared). */
  clone(): KnownValuesStore;
}
//#endregion
//#region src/registry.d.ts
/**
 * The process-wide registry, built on first call and shared by every copy
 * of this module in the process (the ESM and CommonJS builds): the
 * reference's 102 seeded constants, then the entries of the registry files
 * in the configured directories (`~/.known-values` unless
 * `setDirectoryConfig` or `addSearchPaths` said otherwise before the first
 * call), later entries replacing earlier ones by codepoint. Hosts without a
 * filesystem load nothing. Errors met while loading are tolerated, as the
 * reference's `load_from_config` tolerates them; `loadFromConfig` reports
 * them for a store of your own.
 */
export declare function getGlobalKnownValuesStore(): KnownValuesStore;
/** Run `action` with the global registry. */
export declare function withKnownValues<T>(action: (store: KnownValuesStore) => T): T;
/**
 * The registered value for a codepoint, or a bare `KnownValue` when `store`
 * does not know it or is `undefined` (the reference's
 * `known_value_for_raw_value(raw, None)`): pass
 * `getGlobalKnownValuesStore()` to resolve through the global registry.
 *
 * @throws KnownValuesError `InvalidParameter` when `value` is not a non-negative safe
 *   integer `number` or a `bigint` in `0 ..= 2⁶⁴ − 1`
 */
export declare function resolveKnownValue(value: KnownValueInput, store: KnownValuesStore | undefined): KnownValue;
//#endregion
//#region src/registry-file.d.ts
/** One entry of a registry file. */
interface RegistryEntry {
  /** The codepoint, an unsigned 64-bit integer. */
  readonly codepoint: bigint;
  /** The name. */
  readonly name: string;
  /** The entry type, when given and not `null`. */
  readonly type?: string;
  /** The URI, when given and not `null`. */
  readonly uri?: string;
  /** The description, when given and not `null`. */
  readonly description?: string;
}
/** The `ontology` block of a registry file. */
interface OntologyInfo {
  /** The registry's name. */
  readonly name?: string;
  /** Its `source_url`. */
  readonly sourceUrl?: string;
  /** Its `start_code_point`, an unsigned 64-bit integer. */
  readonly startCodePoint?: bigint;
  /** Its `processing_strategy`. */
  readonly processingStrategy?: string;
}
/** The `generated` block of a registry file. */
interface GeneratedInfo {
  /** The generating tool. */
  readonly tool?: string;
}
/** A parsed registry file. */
interface RegistryFile {
  /** The `ontology` block, when given and not `null`. */
  readonly ontology?: OntologyInfo;
  /** The `generated` block, when given and not `null`. */
  readonly generated?: GeneratedInfo;
  /** The entries, in file order; duplicates are kept. */
  readonly entries: readonly RegistryEntry[];
  /**
   * The `statistics` value, when given and not `null`: any JSON value, with
   * objects as plain objects (a repeated key keeps its last value), arrays as
   * arrays, JSON integers as `bigint`, JSON numbers with a fraction or an
   * exponent as `number`, and `null` as `null`.
   */
  readonly statistics?: unknown;
}
/**
 * Parses the text of a registry file exactly as the reference does with
 * `serde_json::from_str::<RegistryFile>`.
 *
 * Unknown fields are skipped at every level, a repeated known field or a
 * missing required one is an error, `null` for an optional field reads as
 * absent, and a struct may also be given as an array of its fields in order.
 * Nesting is limited to 128 levels except while skipping unknown fields.
 *
 * @param text - The file's content; a JS string, so already valid Unicode.
 * @returns The parsed file.
 * @throws {KnownValuesError} With code `Json` and serde_json's message,
 *   including ` at line L column C` (byte-based), when `text` is not a
 *   registry file; with code `InvalidParameter` when `text` is not a string.
 *
 * @example
 * ```ts
 * const file = parseRegistryFile('{"entries":[{"codepoint":1000,"name":"myValue"}]}');
 * file.entries[0].codepoint; // 1000n
 * ```
 */
export declare function parseRegistryFile(text: string): RegistryFile;
//#endregion
//#region src/registry.generated.d.ts
/**
 * `[codepoint, name]` rows of the bundled registries, in load order: the
 * Research registry files as a frozen table of frozen rows, for hosts that
 * cannot read a directory. Not registered by default; register it to get the
 * names a reference build reads from its registry directory.
 */
export declare const BUNDLED_REGISTRY: readonly (readonly [number, string])[];
//#endregion
//#region src/constants.d.ts
/** Codepoints of the registry constants, for `case` labels and comparisons. */
export declare const KNOWN_VALUE_CODEPOINTS: Readonly<{
  /** `''` (the unit value). */
  readonly UNIT: 0;
  /** `isA`. */
  readonly IS_A: 1;
  /** `id`. */
  readonly ID: 2;
  /** `signed`. */
  readonly SIGNED: 3;
  /** `note`. */
  readonly NOTE: 4;
  /** `hasRecipient`. */
  readonly HAS_RECIPIENT: 5;
  /** `sskrShare`. */
  readonly SSKR_SHARE: 6;
  /** `controller`. */
  readonly CONTROLLER: 7;
  /** `key`. */
  readonly KEY: 8;
  /** `dereferenceVia`. */
  readonly DEREFERENCE_VIA: 9;
  /** `entity`. */
  readonly ENTITY: 10;
  /** `name`. */
  readonly NAME: 11;
  /** `language`. */
  readonly LANGUAGE: 12;
  /** `issuer`. */
  readonly ISSUER: 13;
  /** `holder`. */
  readonly HOLDER: 14;
  /** `salt`. */
  readonly SALT: 15;
  /** `date`. */
  readonly DATE: 16;
  /** `Unknown`. */
  readonly UNKNOWN_VALUE: 17;
  /** `version`. */
  readonly VERSION_VALUE: 18;
  /** `hasSecret`. */
  readonly HAS_SECRET: 19;
  /** `edits`. */
  readonly DIFF_EDITS: 20;
  /** `validFrom`. */
  readonly VALID_FROM: 21;
  /** `validUntil`. */
  readonly VALID_UNTIL: 22;
  /** `position`. */
  readonly POSITION: 23;
  /** `nickname`. */
  readonly NICKNAME: 24;
  /** `value`. */
  readonly VALUE: 25;
  /** `attestation`. */
  readonly ATTESTATION: 26;
  /** `verifiableAt`. */
  readonly VERIFIABLE_AT: 27;
  /** `attachment`. */
  readonly ATTACHMENT: 50;
  /** `vendor`. */
  readonly VENDOR: 51;
  /** `conformsTo`. */
  readonly CONFORMS_TO: 52;
  /** `allow`. */
  readonly ALLOW: 60;
  /** `deny`. */
  readonly DENY: 61;
  /** `endpoint`. */
  readonly ENDPOINT: 62;
  /** `delegate`. */
  readonly DELEGATE: 63;
  /** `provenance`. */
  readonly PROVENANCE: 64;
  /** `privateKey`. */
  readonly PRIVATE_KEY: 65;
  /** `service`. */
  readonly SERVICE: 66;
  /** `capability`. */
  readonly CAPABILITY: 67;
  /** `provenanceGenerator`. */
  readonly PROVENANCE_GENERATOR: 68;
  /** `All`. */
  readonly PRIVILEGE_ALL: 70;
  /** `Authorize`. */
  readonly PRIVILEGE_AUTH: 71;
  /** `Sign`. */
  readonly PRIVILEGE_SIGN: 72;
  /** `Encrypt`. */
  readonly PRIVILEGE_ENCRYPT: 73;
  /** `Elide`. */
  readonly PRIVILEGE_ELIDE: 74;
  /** `Issue`. */
  readonly PRIVILEGE_ISSUE: 75;
  /** `Access`. */
  readonly PRIVILEGE_ACCESS: 76;
  /** `Delegate`. */
  readonly PRIVILEGE_DELEGATE: 80;
  /** `Verify`. */
  readonly PRIVILEGE_VERIFY: 81;
  /** `Update`. */
  readonly PRIVILEGE_UPDATE: 82;
  /** `Transfer`. */
  readonly PRIVILEGE_TRANSFER: 83;
  /** `Elect`. */
  readonly PRIVILEGE_ELECT: 84;
  /** `Burn`. */
  readonly PRIVILEGE_BURN: 85;
  /** `Revoke`. */
  readonly PRIVILEGE_REVOKE: 86;
  /** `body`. */
  readonly BODY: 100;
  /** `result`. */
  readonly RESULT: 101;
  /** `error`. */
  readonly ERROR: 102;
  /** `OK`. */
  readonly OK_VALUE: 103;
  /** `Processing`. */
  readonly PROCESSING_VALUE: 104;
  /** `sender`. */
  readonly SENDER: 105;
  /** `senderContinuation`. */
  readonly SENDER_CONTINUATION: 106;
  /** `recipientContinuation`. */
  readonly RECIPIENT_CONTINUATION: 107;
  /** `content`. */
  readonly CONTENT: 108;
  /** `Seed`. */
  readonly SEED_TYPE: 200;
  /** `PrivateKey`. */
  readonly PRIVATE_KEY_TYPE: 201;
  /** `PublicKey`. */
  readonly PUBLIC_KEY_TYPE: 202;
  /** `MasterKey`. */
  readonly MASTER_KEY_TYPE: 203;
  /** `asset`. */
  readonly ASSET: 300;
  /** `Bitcoin`. */
  readonly BITCOIN_VALUE: 301;
  /** `Ethereum`. */
  readonly ETHEREUM_VALUE: 302;
  /** `Tezos`. */
  readonly TEZOS_VALUE: 303;
  /** `network`. */
  readonly NETWORK: 400;
  /** `MainNet`. */
  readonly MAIN_NET_VALUE: 401;
  /** `TestNet`. */
  readonly TEST_NET_VALUE: 402;
  /** `BIP32Key`. */
  readonly BIP32_KEY_TYPE: 500;
  /** `chainCode`. */
  readonly CHAIN_CODE: 501;
  /** `DerivationPath`. */
  readonly DERIVATION_PATH_TYPE: 502;
  /** `parentPath`. */
  readonly PARENT_PATH: 503;
  /** `childrenPath`. */
  readonly CHILDREN_PATH: 504;
  /** `parentFingerprint`. */
  readonly PARENT_FINGERPRINT: 505;
  /** `PSBT`. */
  readonly PSBT_TYPE: 506;
  /** `OutputDescriptor`. */
  readonly OUTPUT_DESCRIPTOR_TYPE: 507;
  /** `outputDescriptor`. */
  readonly OUTPUT_DESCRIPTOR: 508;
  /** `Graph`. */
  readonly GRAPH: 600;
  /** `SourceTargetGraph`. */
  readonly SOURCE_TARGET_GRAPH: 601;
  /** `ParentChildGraph`. */
  readonly PARENT_CHILD_GRAPH: 602;
  /** `Digraph`. */
  readonly DIGRAPH: 603;
  /** `AcyclicGraph`. */
  readonly ACYCLIC_GRAPH: 604;
  /** `Multigraph`. */
  readonly MULTIGRAPH: 605;
  /** `Pseudograph`. */
  readonly PSEUDOGRAPH: 606;
  /** `GraphFragment`. */
  readonly GRAPH_FRAGMENT: 607;
  /** `DAG`. */
  readonly DAG: 608;
  /** `Tree`. */
  readonly TREE: 609;
  /** `Forest`. */
  readonly FOREST: 610;
  /** `CompoundGraph`. */
  readonly COMPOUND_GRAPH: 611;
  /** `Hypergraph`. */
  readonly HYPERGRAPH: 612;
  /** `Dihypergraph`. */
  readonly DIHYPERGRAPH: 613;
  /** `node`. */
  readonly NODE: 700;
  /** `edge`. */
  readonly EDGE: 701;
  /** `source`. */
  readonly SOURCE: 702;
  /** `target`. */
  readonly TARGET: 703;
  /** `parent`. */
  readonly PARENT: 704;
  /** `child`. */
  readonly CHILD: 705;
  /** `Self`. */
  readonly SELF: 706;
}>;
/** 0 — `''` (the unit value): The Unit type, and its sole inhabitant '', which is a value conveying no information. */
export declare const UNIT: KnownValue;
/** 1 — `isA`: The subject is an instance of the class identified by the object. */
export declare const IS_A: KnownValue;
/** 2 — `id`: The object is an unambiguous identifier of the subject within a given context. */
export declare const ID: KnownValue;
/** 3 — `signed`: The object is a cryptographic signature of the subject. */
export declare const SIGNED: KnownValue;
/** 4 — `note`: The object is a human-readable note about the subject. */
export declare const NOTE: KnownValue;
/** 5 — `hasRecipient`: The subject can be decrypted using the private key that decrypts the content key in the object. */
export declare const HAS_RECIPIENT: KnownValue;
/** 6 — `sskrShare`: The subject can be decrypted by a quorum of SSKR shares including the one in the object. */
export declare const SSKR_SHARE: KnownValue;
/** 7 — `controller`: The object is the subject's controlling entity. */
export declare const CONTROLLER: KnownValue;
/** 8 — `key`: The entity identified by the subject holds the private half of the public keys(s) in the object. */
export declare const KEY: KnownValue;
/** 9 — `dereferenceVia`: The content referenced by the subject can be dereferenced using the object. */
export declare const DEREFERENCE_VIA: KnownValue;
/** 10 — `entity`: The entity referenced by the subject is specified in the object. */
export declare const ENTITY: KnownValue;
/** 11 — `name`: The subject is known by the name in the object. */
export declare const NAME: KnownValue;
/** 12 — `language`: The subject is written in the language of the ISO language code object. */
export declare const LANGUAGE: KnownValue;
/** 13 — `issuer`: The object is the subject's issuing entity. */
export declare const ISSUER: KnownValue;
/** 14 — `holder`: The object identifies the entity to which the subject has been issued. */
export declare const HOLDER: KnownValue;
/** 15 — `salt`: The object is random salt used to decorrelate the digest of the subject. */
export declare const SALT: KnownValue;
/** 16 — `date`: The object is a primary datestamp of the subject. */
export declare const DATE: KnownValue;
/** 17 — `Unknown`: Placeholder for an unknown value. */
export declare const UNKNOWN_VALUE: KnownValue;
/** 18 — `version`: The object is the version of the subject. */
export declare const VERSION_VALUE: KnownValue;
/** 19 — `hasSecret`: The subject can be decrypted using the secret that decrypts the content key in the object. */
export declare const HAS_SECRET: KnownValue;
/** 20 — `edits`: The object is a set of edits used by the Envelope.transform(edits:) method. */
export declare const DIFF_EDITS: KnownValue;
/** 21 — `validFrom`: The subject is valid from the date in the object. */
export declare const VALID_FROM: KnownValue;
/** 22 — `validUntil`: The subject is valid until the date in the object. */
export declare const VALID_UNTIL: KnownValue;
/** 23 — `position`: The position of an item in a series or sequence of items. */
export declare const POSITION: KnownValue;
/** 24 — `nickname`: The subject is a nickname for the object. */
export declare const NICKNAME: KnownValue;
/** 25 — `value`: The object is the value of the subject. */
export declare const VALUE: KnownValue;
/** 26 — `attestation`: The object is an attestation of the subject. */
export declare const ATTESTATION: KnownValue;
/** 27 — `verifiableAt`: The object is a date at which the subject can be verified. */
export declare const VERIFIABLE_AT: KnownValue;
/** 50 — `attachment`: Declares that the object is a vendor-defined attachment to the envelope. */
export declare const ATTACHMENT: KnownValue;
/** 51 — `vendor`: Declares the vendor of the subject. */
export declare const VENDOR: KnownValue;
/** 52 — `conformsTo`: An established standard to which the subject conforms. */
export declare const CONFORMS_TO: KnownValue;
/** 60 — `allow`: The object is a set of permissions that allow the subject to perform the actions specified in the object. */
export declare const ALLOW: KnownValue;
/** 61 — `deny`: The object is a set of permissions that deny the subject from performing the actions specified in the object. */
export declare const DENY: KnownValue;
/** 62 — `endpoint`: The object is a service endpoint associated with the subject. */
export declare const ENDPOINT: KnownValue;
/** 63 — `delegate`: The object is a delegate authorized by the subject. */
export declare const DELEGATE: KnownValue;
/** 64 — `provenance`: The object is a provenance mark associated with the subject. */
export declare const PROVENANCE: KnownValue;
/** 65 — `privateKey`: The object is a private key associated with the subject. */
export declare const PRIVATE_KEY: KnownValue;
/** 66 — `service`: The object is a service associated with the subject. */
export declare const SERVICE: KnownValue;
/** 67 — `capability`: The object is a capability associated with the subject. */
export declare const CAPABILITY: KnownValue;
/** 68 — `provenanceGenerator`: The object is a provenance mark generator associated with the subject. */
export declare const PROVENANCE_GENERATOR: KnownValue;
/** 70 — `All`: The set of all allowed privileges. */
export declare const PRIVILEGE_ALL: KnownValue;
/** 71 — `Authorize`: Operational privilege: authorize actions on behalf of the subject. */
export declare const PRIVILEGE_AUTH: KnownValue;
/** 72 — `Sign`: Operational privilege: sign documents on behalf of the subject. */
export declare const PRIVILEGE_SIGN: KnownValue;
/** 73 — `Encrypt`: Operational privilege: encrypt messages from the subject and decrypt messages to the subject. */
export declare const PRIVILEGE_ENCRYPT: KnownValue;
/** 74 — `Elide`: Operational privilege: elide the subject's documents. */
export declare const PRIVILEGE_ELIDE: KnownValue;
/** 75 — `Issue`: Operational privilege: issue documents on behalf of the subject. */
export declare const PRIVILEGE_ISSUE: KnownValue;
/** 76 — `Access`: Operational privilege: access resources on behalf of the subject. */
export declare const PRIVILEGE_ACCESS: KnownValue;
/** 80 — `Delegate`: Management privilege: delegate the privileges of the subject to another entity. */
export declare const PRIVILEGE_DELEGATE: KnownValue;
/** 81 — `Verify`: Management privilege: update the subject's documents, including the ability to reduce privileges. */
export declare const PRIVILEGE_VERIFY: KnownValue;
/** 82 — `Update`: Management privilege: update the subject's service endpoints. */
export declare const PRIVILEGE_UPDATE: KnownValue;
/** 83 — `Transfer`: Management privilege: remove the inception key from the XID document. */
export declare const PRIVILEGE_TRANSFER: KnownValue;
/** 84 — `Elect`: Management privilege: add or remove other verifiers (rotate keys). */
export declare const PRIVILEGE_ELECT: KnownValue;
/** 85 — `Burn`: Management privilege: transition to a new provenance mark chain. */
export declare const PRIVILEGE_BURN: KnownValue;
/** 86 — `Revoke`: Management privilege: revoke the XID entirely. */
export declare const PRIVILEGE_REVOKE: KnownValue;
/** 100 — `body`: The object is the body of the request or expression identified by the subject. */
export declare const BODY: KnownValue;
/** 101 — `result`: The object is the success result of the request identified by the subject. */
export declare const RESULT: KnownValue;
/** 102 — `error`: The object is the failure result of the request identified by the subject. */
export declare const ERROR: KnownValue;
/** 103 — `OK`: The success result of a request that has no other return value. */
export declare const OK_VALUE: KnownValue;
/** 104 — `Processing`: The "in processing" result of a request. */
export declare const PROCESSING_VALUE: KnownValue;
/** 105 — `sender`: The object identifies the sender, including a way to verify messages from the sender (e.g. public key). */
export declare const SENDER: KnownValue;
/** 106 — `senderContinuation`: The object is a continuation owned by the sender. */
export declare const SENDER_CONTINUATION: KnownValue;
/** 107 — `recipientContinuation`: The object is a continuation owned by the recipient. */
export declare const RECIPIENT_CONTINUATION: KnownValue;
/** 108 — `content`: The object is the content of the event. */
export declare const CONTENT: KnownValue;
/** 200 — `Seed`: A cryptographic seed. */
export declare const SEED_TYPE: KnownValue;
/** 201 — `PrivateKey`: A cryptographic private key. */
export declare const PRIVATE_KEY_TYPE: KnownValue;
/** 202 — `PublicKey`: A cryptographic public key. */
export declare const PUBLIC_KEY_TYPE: KnownValue;
/** 203 — `MasterKey`: A cryptographic master key. */
export declare const MASTER_KEY_TYPE: KnownValue;
/** 300 — `asset`: Declares a cryptocurrency asset specifier, e.g. "Bitcoin", "Ethereum". */
export declare const ASSET: KnownValue;
/** 301 — `Bitcoin`: The Bitcoin cryptocurrency ("BTC"). */
export declare const BITCOIN_VALUE: KnownValue;
/** 302 — `Ethereum`: The Ethereum cryptocurrency ("ETH"). */
export declare const ETHEREUM_VALUE: KnownValue;
/** 303 — `Tezos`: The Tezos cryptocurrency ("XTZ"). */
export declare const TEZOS_VALUE: KnownValue;
/** 400 — `network`: Declares a cryptocurrency network, e.g. "MainNet", "TestNet". */
export declare const NETWORK: KnownValue;
/** 401 — `MainNet`: A cryptocurrency main network. */
export declare const MAIN_NET_VALUE: KnownValue;
/** 402 — `TestNet`: A cryptocurrency test network. */
export declare const TEST_NET_VALUE: KnownValue;
/** 500 — `BIP32Key`: A BIP-32 HD key. */
export declare const BIP32_KEY_TYPE: KnownValue;
/** 501 — `chainCode`: Declares the chain code of a BIP-32 HD key. */
export declare const CHAIN_CODE: KnownValue;
/** 502 — `DerivationPath`: A BIP-32 derivation path. */
export declare const DERIVATION_PATH_TYPE: KnownValue;
/** 503 — `parentPath`: Declares the derivation path for a BIP-32 key. */
export declare const PARENT_PATH: KnownValue;
/** 504 — `childrenPath`: Declares the allowable derivation paths from a BIP-32 key. */
export declare const CHILDREN_PATH: KnownValue;
/** 505 — `parentFingerprint`: Declares the parent fingerprint of a BIP-32 key. */
export declare const PARENT_FINGERPRINT: KnownValue;
/** 506 — `PSBT`: A Partially-Signed Bitcoin Transaction (PSBT). */
export declare const PSBT_TYPE: KnownValue;
/** 507 — `OutputDescriptor`: A Bitcoin output descriptor. */
export declare const OUTPUT_DESCRIPTOR_TYPE: KnownValue;
/** 508 — `outputDescriptor`: Declares a Bitcoin output descriptor associated with the subject. */
export declare const OUTPUT_DESCRIPTOR: KnownValue;
/** 600 — `Graph`: A graph. All other assertions in the envelope must be either node or edge. */
export declare const GRAPH: KnownValue;
/** 601 — `SourceTargetGraph`: A graph with edges that have source and target assertions. */
export declare const SOURCE_TARGET_GRAPH: KnownValue;
/** 602 — `ParentChildGraph`: A graph with edges that have parent and child assertions. */
export declare const PARENT_CHILD_GRAPH: KnownValue;
/** 603 — `Digraph`: A directed graph. Implies SourceTargetGraph. source and target are distinct. */
export declare const DIGRAPH: KnownValue;
/** 604 — `AcyclicGraph`: A graph that does not admit cycles. Implies SourceTargetGraph. */
export declare const ACYCLIC_GRAPH: KnownValue;
/** 605 — `Multigraph`: A multigraph (admits parallel edges). Implies SourceTargetGraph. */
export declare const MULTIGRAPH: KnownValue;
/** 606 — `Pseudograph`: A pseudograph (admits self-loops and parallel edges). Implies Multigraph. */
export declare const PSEUDOGRAPH: KnownValue;
/** 607 — `GraphFragment`: A fragment of a graph. May have references to external nodes and edges that are not resolvable in the fragment. */
export declare const GRAPH_FRAGMENT: KnownValue;
/** 608 — `DAG`: A directed acyclic graph. Implies Digraph and AcyclicGraph. */
export declare const DAG: KnownValue;
/** 609 — `Tree`: A tree. Implies ParentChildGraph. Exactly one node must have no parent. All other nodes must have exactly one parent. */
export declare const TREE: KnownValue;
/** 610 — `Forest`: A forest (set of trees). Implies ParentChildGraph. */
export declare const FOREST: KnownValue;
/** 611 — `CompoundGraph`: A compound graph (a graph with subgraphs). Implies Forest and SourceTargetGraph. */
export declare const COMPOUND_GRAPH: KnownValue;
/** 612 — `Hypergraph`: An undirected hypergraph (edges may connect more than two nodes). */
export declare const HYPERGRAPH: KnownValue;
/** 613 — `Dihypergraph`: A directed hypergraph (edges may connect more than two nodes and have a direction). Implies Hypergraph and Digraph. */
export declare const DIHYPERGRAPH: KnownValue;
/** 700 — `node`: A node in a graph. */
export declare const NODE: KnownValue;
/** 701 — `edge`: An edge in a graph. */
export declare const EDGE: KnownValue;
/** 702 — `source`: Identifies the source node of the subject edge of a SourceTargetGraph. */
export declare const SOURCE: KnownValue;
/** 703 — `target`: Identifies the target node of the subject edge of a SourceTargetGraph. */
export declare const TARGET: KnownValue;
/** 704 — `parent`: Identifies the parent node of the subject edge of a ParentChildGraph. */
export declare const PARENT: KnownValue;
/** 705 — `child`: Identifies a child node of the subject edge of a ParentChildGraph. */
export declare const CHILD: KnownValue;
/** 706 — `Self`: A reference to the subject itself. */
export declare const SELF: KnownValue;
/** Every registry constant, in codepoint order. */
export declare const REGISTRY_CONSTANTS: readonly KnownValue[];
//#endregion
export type { GeneratedInfo, KnownValueInput, KnownValuesErrorCode, KnownValuesErrorDetails, KnownValuesParameter, LoadFailure, LoadResult, OntologyInfo, RegistryEntry, RegistryFile };
//# sourceMappingURL=index.d.mts.map