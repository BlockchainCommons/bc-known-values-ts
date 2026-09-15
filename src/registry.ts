/**
 * The global registry: the reference's seed of BCR-2023-002 constants, then
 * the registry files of the configured directories (`~/.known-values` by
 * default), built on first use.
 *
 * @module registry
 */
import { KnownValue, type KnownValueInput } from "./known-value.js";
import { KnownValuesStore } from "./known-values-store.js";
import { DirectoryConfig } from "./directory.js";
import { globalSlot } from "./global-slot.js";
import {
  ACYCLIC_GRAPH,
  ALLOW,
  ASSET,
  ATTACHMENT,
  ATTESTATION,
  BIP32_KEY_TYPE,
  BITCOIN_VALUE,
  BODY,
  CAPABILITY,
  CHAIN_CODE,
  CHILD,
  CHILDREN_PATH,
  COMPOUND_GRAPH,
  CONFORMS_TO,
  CONTENT,
  CONTROLLER,
  DAG,
  DATE,
  DELEGATE,
  DENY,
  DEREFERENCE_VIA,
  DERIVATION_PATH_TYPE,
  DIFF_EDITS,
  DIGRAPH,
  DIHYPERGRAPH,
  EDGE,
  ENDPOINT,
  ENTITY,
  ERROR,
  ETHEREUM_VALUE,
  FOREST,
  GRAPH,
  GRAPH_FRAGMENT,
  HAS_RECIPIENT,
  HAS_SECRET,
  HOLDER,
  HYPERGRAPH,
  ID,
  IS_A,
  ISSUER,
  KEY,
  LANGUAGE,
  MAIN_NET_VALUE,
  MASTER_KEY_TYPE,
  MULTIGRAPH,
  NAME,
  NETWORK,
  NICKNAME,
  NODE,
  NOTE,
  OK_VALUE,
  OUTPUT_DESCRIPTOR,
  OUTPUT_DESCRIPTOR_TYPE,
  PARENT,
  PARENT_CHILD_GRAPH,
  PARENT_FINGERPRINT,
  PARENT_PATH,
  POSITION,
  PRIVATE_KEY,
  PRIVATE_KEY_TYPE,
  PRIVILEGE_ACCESS,
  PRIVILEGE_ALL,
  PRIVILEGE_AUTH,
  PRIVILEGE_BURN,
  PRIVILEGE_DELEGATE,
  PRIVILEGE_ELECT,
  PRIVILEGE_ELIDE,
  PRIVILEGE_ENCRYPT,
  PRIVILEGE_ISSUE,
  PRIVILEGE_REVOKE,
  PRIVILEGE_SIGN,
  PRIVILEGE_TRANSFER,
  PRIVILEGE_UPDATE,
  PRIVILEGE_VERIFY,
  PROCESSING_VALUE,
  PROVENANCE,
  PROVENANCE_GENERATOR,
  PSBT_TYPE,
  PSEUDOGRAPH,
  PUBLIC_KEY_TYPE,
  RECIPIENT_CONTINUATION,
  RESULT,
  SALT,
  SEED_TYPE,
  SENDER,
  SENDER_CONTINUATION,
  SERVICE,
  SIGNED,
  SOURCE,
  SOURCE_TARGET_GRAPH,
  SSKR_SHARE,
  TARGET,
  TEST_NET_VALUE,
  TEZOS_VALUE,
  TREE,
  UNIT,
  UNKNOWN_VALUE,
  VALID_FROM,
  VALID_UNTIL,
  VENDOR,
  VERIFIABLE_AT,
  VERSION_VALUE,
} from "./constants.js";

/**
 * The constants the reference registers in its global store, in its order:
 * 102 of the 104 exported constants. `VALUE` (25) and `SELF` (706) are
 * declared and exported with their names but not registered, as in the
 * reference.
 */
const REFERENCE_STORE_SEED: readonly KnownValue[] = /*#__PURE__*/ Object.freeze([
  UNIT,
  IS_A,
  ID,
  SIGNED,
  NOTE,
  HAS_RECIPIENT,
  SSKR_SHARE,
  CONTROLLER,
  KEY,
  DEREFERENCE_VIA,
  ENTITY,
  NAME,
  LANGUAGE,
  ISSUER,
  HOLDER,
  SALT,
  DATE,
  UNKNOWN_VALUE,
  VERSION_VALUE,
  HAS_SECRET,
  DIFF_EDITS,
  VALID_FROM,
  VALID_UNTIL,
  POSITION,
  NICKNAME,
  ATTESTATION,
  VERIFIABLE_AT,
  ATTACHMENT,
  VENDOR,
  CONFORMS_TO,
  ALLOW,
  DENY,
  ENDPOINT,
  DELEGATE,
  PROVENANCE,
  PRIVATE_KEY,
  SERVICE,
  CAPABILITY,
  PROVENANCE_GENERATOR,
  PRIVILEGE_ALL,
  PRIVILEGE_AUTH,
  PRIVILEGE_SIGN,
  PRIVILEGE_ENCRYPT,
  PRIVILEGE_ELIDE,
  PRIVILEGE_ISSUE,
  PRIVILEGE_ACCESS,
  PRIVILEGE_DELEGATE,
  PRIVILEGE_VERIFY,
  PRIVILEGE_UPDATE,
  PRIVILEGE_TRANSFER,
  PRIVILEGE_ELECT,
  PRIVILEGE_BURN,
  PRIVILEGE_REVOKE,
  BODY,
  RESULT,
  ERROR,
  OK_VALUE,
  PROCESSING_VALUE,
  SENDER,
  SENDER_CONTINUATION,
  RECIPIENT_CONTINUATION,
  CONTENT,
  SEED_TYPE,
  PRIVATE_KEY_TYPE,
  PUBLIC_KEY_TYPE,
  MASTER_KEY_TYPE,
  ASSET,
  BITCOIN_VALUE,
  ETHEREUM_VALUE,
  TEZOS_VALUE,
  NETWORK,
  MAIN_NET_VALUE,
  TEST_NET_VALUE,
  BIP32_KEY_TYPE,
  CHAIN_CODE,
  DERIVATION_PATH_TYPE,
  PARENT_PATH,
  CHILDREN_PATH,
  PARENT_FINGERPRINT,
  PSBT_TYPE,
  OUTPUT_DESCRIPTOR_TYPE,
  OUTPUT_DESCRIPTOR,
  GRAPH,
  SOURCE_TARGET_GRAPH,
  PARENT_CHILD_GRAPH,
  DIGRAPH,
  ACYCLIC_GRAPH,
  MULTIGRAPH,
  PSEUDOGRAPH,
  GRAPH_FRAGMENT,
  DAG,
  TREE,
  FOREST,
  COMPOUND_GRAPH,
  HYPERGRAPH,
  DIHYPERGRAPH,
  NODE,
  EDGE,
  SOURCE,
  TARGET,
  PARENT,
  CHILD,
]);

/** The seed the global store starts from (the reference's list, in its order). */
export function referenceStoreSeed(): readonly KnownValue[] {
  return REFERENCE_STORE_SEED;
}

/**
 * Locks the directory configuration and takes it: the one set before the
 * first access, else the default (`~/.known-values`). After this a
 * `setDirectoryConfig` or `addSearchPaths` throws `AlreadyInitialized`.
 */
function getAndLockConfig(): DirectoryConfig {
  const slot = globalSlot();
  slot.locked = true;
  const config = slot.config ?? DirectoryConfig.defaultOnly();
  delete slot.config;
  return config;
}

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
export function getGlobalKnownValuesStore(): KnownValuesStore {
  const slot = globalSlot();
  if (slot.store === undefined) {
    const store = new KnownValuesStore(REFERENCE_STORE_SEED);
    store.loadFromConfig(getAndLockConfig());
    slot.store = store;
  }
  return slot.store;
}

/** Run `action` with the global registry. */
export function withKnownValues<T>(action: (store: KnownValuesStore) => T): T {
  return action(getGlobalKnownValuesStore());
}

/**
 * The registered value for a codepoint, or a bare `KnownValue` when `store`
 * does not know it or is `undefined` (the reference's
 * `known_value_for_raw_value(raw, None)`): pass
 * `getGlobalKnownValuesStore()` to resolve through the global registry.
 *
 * @throws KnownValuesError `InvalidParameter` when `value` is not a non-negative safe
 *   integer `number` or a `bigint` in `0 ..= 2⁶⁴ − 1`
 */
export function resolveKnownValue(
  value: KnownValueInput,
  store: KnownValuesStore | undefined,
): KnownValue {
  return store?.byValue(value) ?? new KnownValue(value);
}
