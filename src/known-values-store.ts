/**
 * A bidirectional registry of known values: codepoint → value and
 * assigned name → value.
 *
 * @module known-values-store
 */
import { KnownValue, type KnownValueInput, toBigInt } from "./known-value.js";
import { KnownValuesError } from "./error.js";
import {
  type DirectoryConfig,
  type LoadResult,
  loadFromConfig,
  loadFromDirectory,
} from "./directory.js";

/** The argument checked as a `KnownValue` before any store read or write. */
function checked(x: unknown): KnownValue {
  if (!KnownValue.isKnownValue(x)) throw KnownValuesError.invalidParameter("knownValue", x);
  return x;
}

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
export class KnownValuesStore implements Iterable<KnownValue> {
  private _byValue: Map<bigint, KnownValue>;
  private _byName: Map<string, KnownValue>;

  /**
   * @param knownValues - Registered in order, as `register` would.
   * @throws KnownValuesError `InvalidParameter` when `knownValues` is not iterable or holds a non-`KnownValue`
   */
  constructor(knownValues: Iterable<KnownValue> = []) {
    this._byValue = new Map();
    this._byName = new Map();
    if (
      typeof knownValues !== "object" ||
      knownValues === null ||
      typeof (knownValues as { [Symbol.iterator]?: unknown })[Symbol.iterator] !== "function"
    ) {
      throw KnownValuesError.invalidParameter("knownValues", knownValues);
    }
    const values = [...knownValues].map(checked);
    for (const kv of values) this.register(kv);
  }

  /**
   * Add or replace a value. A later registration of the same codepoint
   * replaces the earlier one and retires its name; the same name on another
   * codepoint moves the name index (see the class doc).
   *
   * @throws KnownValuesError `InvalidParameter` when `knownValue` is not a `KnownValue`
   */
  register(knownValue: KnownValue): void {
    const kv = checked(knownValue);
    const existing = this._byValue.get(kv.valueBigInt);
    const oldName = existing?.assignedName;
    if (oldName !== undefined) this._byName.delete(oldName);
    this._byValue.set(kv.valueBigInt, kv);
    const name = kv.assignedName;
    if (name !== undefined) this._byName.set(name, kv);
  }

  /**
   * The registered value with this codepoint, if any.
   *
   * @throws KnownValuesError `InvalidParameter` when `value` is not a non-negative safe
   *   integer `number` or a `bigint` in `0 ..= 2⁶⁴ − 1`
   */
  byValue(value: KnownValueInput): KnownValue | undefined {
    return this._byValue.get(toBigInt(value));
  }

  /**
   * The registered value with this assigned name, if any.
   *
   * @throws KnownValuesError `InvalidParameter` when `assignedName` is not a string
   */
  byName(assignedName: string): KnownValue | undefined {
    if (typeof assignedName !== "string") {
      throw KnownValuesError.invalidParameter("assignedName", assignedName);
    }
    return this._byName.get(assignedName);
  }

  /**
   * The name this store assigns to the value's codepoint, if any.
   *
   * @throws KnownValuesError `InvalidParameter` when `knownValue` is not a `KnownValue`
   */
  assignedNameOf(knownValue: KnownValue): string | undefined {
    return this._byValue.get(checked(knownValue).valueBigInt)?.assignedName;
  }

  /**
   * The store's name for the codepoint, else the value's own name.
   *
   * @throws KnownValuesError `InvalidParameter` when `knownValue` is not a `KnownValue`
   */
  nameOf(knownValue: KnownValue): string {
    const kv = checked(knownValue);
    return this._byValue.get(kv.valueBigInt)?.assignedName ?? kv.name;
  }

  /**
   * Register every entry of the `.json` registry files in `path`, in the
   * host's directory order (the reference's `load_from_directory`): a
   * missing path or a non-directory registers nothing; the first unreadable
   * or unparsable file stops the load with nothing registered.
   *
   * @returns How many values the directory held
   * @throws KnownValuesError `Io` or `Json` for the first failing file or directory
   */
  loadFromDirectory(path: string): number {
    const values = loadFromDirectory(path);
    for (const kv of values) this.register(kv);
    return values.length;
  }

  /**
   * Register the values of every configured directory, tolerating per-file
   * errors (the reference's `load_from_config`): later directories replace
   * earlier ones by codepoint, and the result lists the directories
   * processed and every error met.
   */
  loadFromConfig(config: DirectoryConfig): LoadResult {
    const result = loadFromConfig(config);
    for (const kv of result.values.values()) this.register(kv);
    return result;
  }

  /** How many codepoints are registered. */
  get size(): number {
    return this._byValue.size;
  }

  /** Registered values, in registration order. */
  values(): IterableIterator<KnownValue> {
    return this._byValue.values();
  }

  /** Registered values, in registration order. */
  [Symbol.iterator](): Iterator<KnownValue> {
    return this._byValue.values();
  }

  /** An independent registry with the same entries (the frozen values are shared). */
  clone(): KnownValuesStore {
    const cloned = new KnownValuesStore();
    cloned._byValue = new Map(this._byValue);
    cloned._byName = new Map(this._byName);
    return cloned;
  }
}
