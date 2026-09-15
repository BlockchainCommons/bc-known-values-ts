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
export type KnownValuesErrorCode = "InvalidParameter" | "Io" | "Json" | "AlreadyInitialized";

/**
 * The argument an `InvalidParameter` error names: a codepoint that is not an
 * unsigned 64-bit integer, a name that is not a string, a value that is not a
 * `KnownValue`, or a path list, path or configuration of the wrong type.
 */
export type KnownValuesParameter =
  | "value"
  | "name"
  | "knownValue"
  | "knownValues"
  | "assignedName"
  | "paths"
  | "path"
  | "config"
  | "text";

/**
 * The structured payload of a {@link KnownValuesError}, discriminated by `code`.
 * Only `InvalidParameter` carries data: `e.details.code === "InvalidParameter"`
 * narrows to `{ parameter, value }`.
 */
export type KnownValuesErrorDetails =
  | {
      /** One of the reference's variants; the message is its `Display` text. */
      readonly code: Exclude<KnownValuesErrorCode, "InvalidParameter">;
    }
  | {
      /** An argument outside its domain. */
      readonly code: "InvalidParameter";
      /** The argument. */
      readonly parameter: KnownValuesParameter;
      /** The value received, as passed. */
      readonly value: unknown;
    };

/** What a codepoint must be: the `u64` domain in its two TypeScript forms. */
const U64_DOMAIN = "an integer in [0, 9007199254740991] or a bigint in [0, 18446744073709551615]";

/** What each parameter must be. */
const EXPECTATIONS: Record<KnownValuesParameter, string> = {
  value: U64_DOMAIN,
  name: "a string",
  knownValue: "a KnownValue",
  knownValues: "an iterable of KnownValue",
  assignedName: "a string",
  paths: "an array of strings",
  path: "a string",
  config: "a DirectoryConfig",
  text: "a string",
};

/**
 * The received value, rendered exactly: a `bigint` with its `n` suffix, an
 * unsafe integer `number` by its exact digits (`String` would round them),
 * a string quoted, and objects by their constructor name.
 */
function render(value: unknown): string {
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "number") {
    return Number.isInteger(value) && !Number.isSafeInteger(value)
      ? BigInt(value).toString()
      : String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "function") return "function";
  if (Array.isArray(value)) return "Array";
  if (typeof value === "object" && value !== null) {
    const ctor = (value as { constructor?: { name?: unknown } }).constructor;
    return typeof ctor?.name === "string" && ctor.name !== "" ? ctor.name : "object";
  }
  return String(value);
}

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
export class KnownValuesError extends Error {
  /** Always `"KnownValuesError"`; the cross-copy identity {@link KnownValuesError.isKnownValuesError} checks. */
  override readonly name = "KnownValuesError";
  /** The discriminant; equals `details.code`. */
  readonly code: KnownValuesErrorCode;
  /** The structured payload. */
  readonly details: KnownValuesErrorDetails;

  private constructor(message: string, details: KnownValuesErrorDetails) {
    super(message);
    this.code = details.code;
    this.details = details;
  }

  /** An argument outside its domain: `<parameter> must be <expectation>, got <value>`. */
  static invalidParameter(parameter: KnownValuesParameter, value: unknown): KnownValuesError {
    const got = parameter === "name" || parameter === "assignedName" ? typeof value : render(value);
    return new KnownValuesError(`${parameter} must be ${EXPECTATIONS[parameter]}, got ${got}`, {
      code: "InvalidParameter",
      parameter,
      value,
    });
  }

  /** A registry file or directory that cannot be read; `message` is the reference's `IO error: …` text. */
  static io(message: string): KnownValuesError {
    return new KnownValuesError(message, { code: "Io" });
  }

  /** A registry file that does not parse; `message` is the reference's text (the serde_json message, prefixed by the loader with the file). */
  static json(message: string): KnownValuesError {
    return new KnownValuesError(message, { code: "Json" });
  }

  /** The directory configuration was changed after the global store was built. */
  static alreadyInitialized(): KnownValuesError {
    return new KnownValuesError(
      "Cannot modify directory configuration after KNOWN_VALUES has been accessed",
      { code: "AlreadyInitialized" },
    );
  }

  /**
   * Whether `x` is a `KnownValuesError`, from this module copy or another
   * (a CommonJS and an ESM copy in one process): checks the `name` and the
   * presence of `code`, not `instanceof`.
   */
  static isKnownValuesError(x: unknown): x is KnownValuesError {
    return (
      x instanceof Error &&
      x.name === "KnownValuesError" &&
      typeof (x as { code?: unknown }).code === "string"
    );
  }

  /** `code === c`. */
  is(c: KnownValuesErrorCode): boolean {
    return this.code === c;
  }
}
