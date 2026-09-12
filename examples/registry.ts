/**
 * A store of your own, the global registry, and a known value on the wire.
 *
 *   bun examples/registry.ts
 */
import { decodeCbor, encodeCbor } from "@blockchaincommons/dcbor";
import { diagnostic } from "@blockchaincommons/dcbor/diagnostic";
import { registerTags } from "@blockchaincommons/tags";
import {
  IS_A,
  KnownValue,
  KnownValuesStore,
  NOTE,
  getGlobalKnownValuesStore,
  resolveKnownValue,
} from "@blockchaincommons/known-values";

// A private store: the constants you use plus one of your own.
const store = new KnownValuesStore([IS_A, NOTE]);
store.register(new KnownValue(70_000, "myPredicate"));
console.log("byName(myPredicate):", store.byName("myPredicate")?.value); // 70000
console.log("nameOf(4):", store.nameOf(new KnownValue(4))); // "note"

// The global registry: the BCR-2023-002 constants plus the bundled vocabularies.
console.log("global size:", getGlobalKnownValuesStore().size);
console.log("resolve(1):", resolveKnownValue(1).name); // "isA" (the registry's object, equal to IS_A)
console.log("resolve(1).equals(IS_A):", resolveKnownValue(1).equals(IS_A)); // true

// On the wire: tag 40000 over the codepoint, through the codec.
const bytes = encodeCbor(KnownValue.codec.encode(IS_A));
console.log("bytes:", Buffer.from(bytes).toString("hex")); // d99c4001
const decoded = KnownValue.codec.decode(decodeCbor(bytes)); // a bare value: the wire carries no name
console.log("decoded:", decoded.value, "→", resolveKnownValue(decoded.value).name); // 1 → "isA"

// Annotated diagnostic notation names the tag once the BC tags are registered.
registerTags();
console.log(diagnostic(IS_A.toCbor(), { annotate: true })); // 40000(1)   / known-value /
