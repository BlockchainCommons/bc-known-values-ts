/**
 * The global registry: the BCR-2023-002 constants, then the bundled
 * registries (later rows override earlier ones), built on first use.
 *
 * @module registry
 */
import { KnownValue } from "./known-value.js";
import { KnownValuesStore } from "./known-values-store.js";
import { REGISTRY_CONSTANTS } from "./constants.js";
import { BUNDLED_REGISTRY } from "./registry.generated.js";

let GLOBAL: KnownValuesStore | undefined;

/** The process-wide registry, built on first call. */
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
 */
export function resolveKnownValue(
  value: number | bigint,
  store: KnownValuesStore = getGlobalKnownValuesStore(),
): KnownValue {
  return store.byValue(value) ?? new KnownValue(value);
}
