/**
 * A bidirectional registry of known values: codepoint → value and
 * assigned name → value.
 *
 * @module known-values-store
 */
import { type KnownValue, type KnownValueInput, toBigInt } from "./known-value.js";

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
 */
export class KnownValuesStore implements Iterable<KnownValue> {
  private _byValue: Map<bigint, KnownValue>;
  private _byName: Map<string, KnownValue>;

  /** @param knownValues - Registered in order, as `register` would. */
  constructor(knownValues: Iterable<KnownValue> = []) {
    this._byValue = new Map();
    this._byName = new Map();
    for (const kv of knownValues) this.register(kv);
  }

  /**
   * Add or replace a value. A later registration of the same codepoint
   * replaces the earlier one and retires its name; the same name on another
   * codepoint moves the name index (see the class doc).
   */
  register(knownValue: KnownValue): void {
    const existing = this._byValue.get(knownValue.valueBigInt);
    const oldName = existing?.assignedName;
    if (oldName !== undefined) this._byName.delete(oldName);
    this._byValue.set(knownValue.valueBigInt, knownValue);
    const name = knownValue.assignedName;
    if (name !== undefined) this._byName.set(name, knownValue);
  }

  /**
   * The registered value with this codepoint, if any.
   *
   * @throws RangeError when `value` is not an integer `number` or a `bigint` in `0 ..= 2⁶⁴ − 1`
   */
  byValue(value: KnownValueInput): KnownValue | undefined {
    return this._byValue.get(toBigInt(value));
  }

  /** The registered value with this assigned name, if any. */
  byName(assignedName: string): KnownValue | undefined {
    return this._byName.get(assignedName);
  }

  /** The name this store assigns to the value's codepoint, if any. */
  assignedNameOf(knownValue: KnownValue): string | undefined {
    return this._byValue.get(knownValue.valueBigInt)?.assignedName;
  }

  /** The store's name for the codepoint, else the value's own name. */
  nameOf(knownValue: KnownValue): string {
    return this.assignedNameOf(knownValue) ?? knownValue.name;
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
