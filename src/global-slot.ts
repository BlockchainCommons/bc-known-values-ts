/**
 * The process-wide slot holding the global registry and its directory
 * configuration.
 *
 * @module global-slot
 */
import type { KnownValuesStore } from "./known-values-store.js";
import type { DirectoryConfig } from "./directory.js";

/**
 * What the slot holds: the global store once built, the directory
 * configuration set before the first access, and whether that access has
 * happened (the reference's `KNOWN_VALUES` `Once`, `CUSTOM_CONFIG` and
 * `CONFIG_LOCKED` statics).
 */
export interface GlobalSlot {
  store?: KnownValuesStore;
  config?: DirectoryConfig;
  locked: boolean;
}

/**
 * The slot is keyed on `globalThis` by a registered symbol rather than held
 * in a module variable so that every copy of this module in a process — the
 * ESM and CommonJS builds, or two bundled copies — resolves the SAME store
 * and configuration, as the reference's statics are one per process. The
 * `@1` names the slot's major version; bump it on a breaking change of what
 * the slot holds so incompatible copies do not share.
 */
const GLOBAL_KEY = Symbol.for("@blockchaincommons/known-values/global-store@1");

interface GlobalHolder {
  [GLOBAL_KEY]?: GlobalSlot;
}

/** The process-wide slot, created on first access. */
export function globalSlot(): GlobalSlot {
  return ((globalThis as GlobalHolder)[GLOBAL_KEY] ??= { locked: false });
}
