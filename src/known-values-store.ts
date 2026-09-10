/**
 * A bidirectional registry of known values: codepoint → value and
 * assigned name → value.
 *
 * @module known-values-store
 */
import { type KnownValue, type KnownValueInput } from "./known-value.js";

export class KnownValuesStore implements Iterable<KnownValue> {
  private _byValue: Map<bigint, KnownValue>;
  private _byName: Map<string, KnownValue>;

  constructor(knownValues: Iterable<KnownValue> = []) {
    this._byValue = new Map();
    this._byName = new Map();
    for (const kv of knownValues) this.register(kv);
  }

  /**
   * Add or replace a value. A later registration of the same codepoint
   * replaces the earlier one and retires its name.
   */
  register(knownValue: KnownValue): void {
    const existing = this._byValue.get(knownValue.valueBigInt);
    const oldName = existing?.assignedName;
    if (oldName !== undefined && oldName !== "") this._byName.delete(oldName);
    this._byValue.set(knownValue.valueBigInt, knownValue);
    const name = knownValue.assignedName;
    if (name !== undefined && name !== "") this._byName.set(name, knownValue);
  }

  /** The registered value with this codepoint, if any. */
  byValue(value: KnownValueInput): KnownValue | undefined {
    return this._byValue.get(typeof value === "bigint" ? value : BigInt(value));
  }

  /** The registered value with this assigned name, if any. */
  byName(assignedName: string): KnownValue | undefined {
    return this._byName.get(assignedName);
  }

  /** The name this store assigns to the value's codepoint, if any. */
  assignedNameOf(knownValue: KnownValue): string | undefined {
    return this._byValue.get(knownValue.valueBigInt)?.assignedName;
  }

  /**
   * The store's name for the codepoint (the empty string for the unit
   * value 0, which the registry names `''`), else the value's own name.
   */
  nameOf(knownValue: KnownValue): string {
    return this.assignedNameOf(knownValue) ?? knownValue.name;
  }

  get size(): number {
    return this._byValue.size;
  }

  /** Registered values, in registration order. */
  values(): IterableIterator<KnownValue> {
    return this._byValue.values();
  }

  [Symbol.iterator](): Iterator<KnownValue> {
    return this._byValue.values();
  }

  clone(): KnownValuesStore {
    const cloned = new KnownValuesStore();
    cloned._byValue = new Map(this._byValue);
    cloned._byName = new Map(this._byName);
    return cloned;
  }
}
