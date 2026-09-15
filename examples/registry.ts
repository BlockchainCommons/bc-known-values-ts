/**
 * A store of your own, the global registry, registry files, and a known
 * value on the wire.
 *
 *   bun examples/registry.ts
 */
import { decodeCbor, encodeCbor } from "@blockchaincommons/dcbor";
import { diagnostic } from "@blockchaincommons/dcbor/diagnostic";
import { registerTags } from "@blockchaincommons/tags";
import {
  BUNDLED_REGISTRY,
  DirectoryConfig,
  IS_A,
  KnownValue,
  KnownValuesStore,
  NOTE,
  VALUE,
  getGlobalKnownValuesStore,
  resolveKnownValue,
  setDirectoryConfig,
} from "@blockchaincommons/known-values";

// The global registry loads `~/.known-values/*.json` on first use, as the
// reference does; an empty configuration, set before that first use, keeps it
// at the reference's 102 seeded constants wherever this runs.
setDirectoryConfig(new DirectoryConfig());

// A private store: the constants you use plus one of your own.
const store = new KnownValuesStore([IS_A, NOTE]);
store.register(new KnownValue(70_000, "myPredicate"));
console.log("byName(myPredicate):", store.byName("myPredicate")?.value); // 70000
console.log("nameOf(4):", store.nameOf(new KnownValue(4))); // "note"

// The global registry: the reference's seed. VALUE (25) and SELF (706) are
// exported constants with their names but, as in the reference, not seeded.
const registry = getGlobalKnownValuesStore();
console.log("global size:", registry.size); // 102
console.log("resolve(1, registry):", resolveKnownValue(1, registry).name); // "isA"
console.log("resolve(1, undefined):", resolveKnownValue(1, undefined).name); // "1": no store, no name
console.log("byName(value):", registry.byName("value")?.value); // undefined
console.log("VALUE.name:", VALUE.name); // "value": the constant carries it

// The bundled Research registries, for a host without a registry directory.
const vocabularies = new KnownValuesStore();
for (const [codepoint, name] of BUNDLED_REGISTRY) vocabularies.register(new KnownValue(codepoint, name));
console.log("bundled schema:Thing:", vocabularies.byName("schema:Thing")?.value); // 10844

// On the wire: tag 40000 over the codepoint, through the codec.
const bytes = encodeCbor(KnownValue.codec.encode(IS_A));
console.log("bytes:", Buffer.from(bytes).toString("hex")); // d99c4001
const decoded = KnownValue.codec.decode(decodeCbor(bytes)); // a bare value: the wire carries no name
console.log("decoded:", decoded.value, "→", resolveKnownValue(decoded.value, registry).name); // 1 → "isA"

// Annotated diagnostic notation names the tag once the BC tags are registered.
registerTags();
console.log(diagnostic(IS_A.toCbor(), { annotate: true })); // 40000(1)   / known-value /
