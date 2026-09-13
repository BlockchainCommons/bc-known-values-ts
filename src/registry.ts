/**
 * The global registry: the BCR-2023-002 constants, then the bundled
 * registries (later rows override earlier ones), built on first use.
 *
 * @module registry
 */
import { KnownValue, type KnownValueInput } from "./known-value.js";
import { KnownValuesStore } from "./known-values-store.js";
import { REGISTRY_CONSTANTS } from "./constants.js";
import { BUNDLED_REGISTRY } from "./registry.generated.js";

let GLOBAL: KnownValuesStore | undefined;

/**
 * The process-wide registry, built on first call: the BCR-2023-002
 * constants, then the bundled vocabularies (later rows override earlier
 * ones). One per module graph — a CommonJS and an ESM consumer in the same
 * process each get their own, and a registration in one is invisible in
 * the other.
 */
export function getGlobalKnownValuesStore(): KnownValuesStore {
  if (GLOBAL === undefined) {
    const store = new KnownValuesStore(REGISTRY_CONSTANTS);
    for (const [codepoint, name] of BUNDLED_REGISTRY)
      store.register(new KnownValue(codepoint, name));
    GLOBAL = store;
  }
  return GLOBAL;
}

/** Run `action` with the global registry. */
export function withKnownValues<T>(action: (store: KnownValuesStore) => T): T {
  return action(getGlobalKnownValuesStore());
}

/**
 * The registered value for a codepoint, or a bare `KnownValue` when the
 * store (the global one by default) does not know it.
 *
 * @throws RangeError when `value` is not an integer `number` or a `bigint` in `0 ..= 2⁶⁴ − 1`
 */
export function resolveKnownValue(
  value: KnownValueInput,
  store: KnownValuesStore = getGlobalKnownValuesStore(),
): KnownValue {
  return store.byValue(value) ?? new KnownValue(value);
}
