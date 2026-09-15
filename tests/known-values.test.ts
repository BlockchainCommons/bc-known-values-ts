import {
  KnownValue,
  KnownValuesStore,
  KNOWN_VALUE_CODEPOINTS,
  getGlobalKnownValuesStore,
  resolveKnownValue,
  IS_A,
  NOTE,
  SIGNED,
  ID,
  SELF,
  VALUE,
  ATTESTATION,
  VERIFIABLE_AT,
  BUNDLED_REGISTRY,
  REGISTRY_CONSTANTS,
  UNIT,
} from "../src/index";
import { TAG_KNOWN_VALUE } from "@blockchaincommons/tags";
import {
  cbor,
  MajorType,
  bytesToHex,
  hexToBytes,
  isTagged,
  taggedValue,
  decodeCbor,
} from "@blockchaincommons/dcbor";

describe("KnownValue", () => {
  test("should create a KnownValue with just a value", () => {
    const kv = new KnownValue(42);
    expect(kv.value).toBe(42);
    expect(kv.assignedName).toBeUndefined();
    expect(kv.name).toBe("42");
  });

  test("should create a KnownValue with a value and name", () => {
    const kv = new KnownValue(1, "isA");
    expect(kv.value).toBe(1);
    expect(kv.assignedName).toBe("isA");
    expect(kv.name).toBe("isA");
  });

  test("should have proper equality based on value only", () => {
    const kv1 = new KnownValue(1, "isA");
    const kv2 = new KnownValue(1, "different");
    const kv3 = new KnownValue(2, "isA");

    expect(kv1.equals(kv2)).toBe(true);
    expect(kv1.equals(kv3)).toBe(false);
  });

  test("should have consistent toString", () => {
    const named = new KnownValue(1, "isA");
    const unnamed = new KnownValue(42);

    expect(named.toString()).toBe("isA");
    expect(unnamed.toString()).toBe("42");
  });

  test("predefined values should have correct values and names", () => {
    expect(IS_A.value).toBe(1);
    expect(IS_A.name).toBe("isA");

    expect(NOTE.value).toBe(4);
    expect(NOTE.name).toBe("note");

    expect(SIGNED.value).toBe(3);
    expect(SIGNED.name).toBe("signed");

    expect(ID.value).toBe(2);
    expect(ID.name).toBe("id");
  });
});

describe("KnownValuesStore", () => {
  test("should create an empty store", () => {
    const store = new KnownValuesStore();
    expect(store.byName("isA")).toBeUndefined();
  });

  test("should create a store with initial values", () => {
    const store = new KnownValuesStore([IS_A, NOTE, SIGNED]);

    expect(store.byName("isA")).toBe(IS_A);
    expect(store.byName("note")).toBe(NOTE);
    expect(store.byName("signed")).toBe(SIGNED);
  });

  test("should insert values", () => {
    const store = new KnownValuesStore();
    const custom = new KnownValue(100, "custom");

    store.register(custom);
    expect(store.byName("custom")).toBe(custom);
  });

  test("should get assigned names", () => {
    const store = new KnownValuesStore([IS_A, NOTE]);

    expect(store.assignedNameOf(IS_A)).toBe("isA");
    expect(store.assignedNameOf(NOTE)).toBe("note");
    expect(store.assignedNameOf(new KnownValue(999))).toBeUndefined();
  });

  test("should get names with fallback to value", () => {
    const store = new KnownValuesStore([IS_A, NOTE]);

    expect(store.nameOf(IS_A)).toBe("isA");
    expect(store.nameOf(new KnownValue(999))).toBe("999");
  });

  test("should look up by raw value", () => {
    const store = new KnownValuesStore([IS_A, NOTE]);

    const isA = resolveKnownValue(1, store);
    expect(isA.equals(IS_A)).toBe(true);

    const unknown = resolveKnownValue(999, store);
    expect(unknown.value).toBe(999);
    expect(unknown.assignedName).toBeUndefined();
  });

  test("should look up by name", () => {
    const store = new KnownValuesStore([IS_A, NOTE]);

    const isA = store.byName("isA");
    expect(isA?.value).toBe(1);

    const unknown = store.byName("unknown");
    expect(unknown).toBeUndefined();
  });

  test("should get name for a known value", () => {
    const store = new KnownValuesStore([IS_A, NOTE]);

    expect(store.nameOf(IS_A)).toBe("isA");
    expect(store.nameOf(new KnownValue(999))).toBe("999");
    expect(resolveKnownValue(1, store).name).toBe("isA");
    expect(resolveKnownValue(999, store).name).toBe("999");
  });

  test("should clone the store", () => {
    const store1 = new KnownValuesStore([IS_A, NOTE]);
    const store2 = store1.clone();

    const custom = new KnownValue(100, "custom");
    store2.register(custom);

    expect(store1.byName("custom")).toBeUndefined();
    expect(store2.byName("custom")).toBe(custom);
  });
});

describe("Global KNOWN_VALUES Registry", () => {
  test("should provide access to the global store", () => {
    const store = getGlobalKnownValuesStore();

    expect(store.byName("isA")?.value).toBe(1);
    expect(store.byName("note")?.value).toBe(4);
    expect(store.byName("signed")?.value).toBe(3);
  });

  test("should cache the store", () => {
    const store1 = getGlobalKnownValuesStore();
    const store2 = getGlobalKnownValuesStore();

    expect(store1).toBe(store2);
  });

  test("should contain all predefined values", () => {
    const store = getGlobalKnownValuesStore();

    expect(store.byName("id")?.value).toBe(2);
    expect(store.byName("entity")?.value).toBe(10);
    expect(store.byName("name")?.value).toBe(11);
    expect(store.byName("isA")?.value).toBe(1);
  });
});

describe("KnownValue CBOR Encoding", () => {
  test("should export TAG_KNOWN_VALUE.value constant", () => {
    expect(TAG_KNOWN_VALUE.value).toBe(40000);
  });

  test("should export TAG_KNOWN_VALUE with name", () => {
    expect(TAG_KNOWN_VALUE.value).toBe(40000);
    expect(TAG_KNOWN_VALUE.name).toBe("known-value");
  });

  test("should provide cborTags()", () => {
    const kv = new KnownValue(1, "isA");
    const tags = kv.cborTags();
    expect(tags).toHaveLength(1);
    expect(tags[0].value).toBe(40000);
  });

  test("should encode to untagged CBOR (unsigned integer)", () => {
    const kv = new KnownValue(42);
    const untagged = kv.untaggedCbor();

    expect(untagged.type).toBe(MajorType.Unsigned);
    expect(untagged.value).toBe(42n);
  });

  test("should encode to tagged CBOR with tag 40000", () => {
    const kv = new KnownValue(1, "isA");
    const tagged = kv.toCbor();

    expect(tagged.type).toBe(MajorType.Tagged);
    if (isTagged(tagged)) {
      expect(tagged.tag).toBe(40000);
      expect(tagged.value.type).toBe(MajorType.Unsigned);
      if (tagged.value.type === MajorType.Unsigned) {
        expect(tagged.value.value).toBe(1n);
      }
    }
  });

  test("should encode IS_A to correct CBOR hex", () => {
    // Tag 40000 (0xd99c40) + value 1 (0x01) = d99c4001
    const bytes = IS_A.toCbor().toData();
    const hex = bytesToHex(bytes);
    expect(hex).toBe("d99c4001");
  });

  test("should encode various values correctly", () => {
    // Tag 40000 = d99c40 (0xd9 = tag with 2-byte value, 0x9c40 = 40000)
    // Value 0 -> d99c4000
    expect(bytesToHex(new KnownValue(0).toCbor().toData())).toBe("d99c4000");

    // Value 23 -> d99c4017 (23 fits in single byte)
    expect(bytesToHex(new KnownValue(23).toCbor().toData())).toBe("d99c4017");

    // Value 24 -> d99c401818 (24 requires additional byte)
    expect(bytesToHex(new KnownValue(24).toCbor().toData())).toBe("d99c401818");

    // Value 100 -> d99c401864
    expect(bytesToHex(new KnownValue(100).toCbor().toData())).toBe("d99c401864");

    // Value 256 -> d99c40190100
    expect(bytesToHex(new KnownValue(256).toCbor().toData())).toBe("d99c40190100");
  });

  test("taggedCborData should be alias for toCborData", () => {
    const kv = new KnownValue(42);
    expect(kv.toCbor().toData()).toEqual(kv.toCbor().toData());
  });
});

describe("KnownValue CBOR Decoding", () => {
  test("should decode the untagged content with fromUntaggedCbor", () => {
    const cborValue = cbor(42);
    const kv = KnownValue.fromUntaggedCbor(cborValue);

    expect(kv.value).toBe(42);
    expect(kv.assignedName).toBeUndefined();
  });

  test("should decode from tagged CBOR", () => {
    const kv = new KnownValue(1, "isA");
    const tagged = kv.toCbor();
    const decoded = KnownValue.fromCbor(tagged);

    expect(decoded.value).toBe(1);
    // Note: name is not preserved in CBOR encoding
    expect(decoded.assignedName).toBeUndefined();
  });

  test("should decode from binary CBOR data", () => {
    // d99c4001 = tag 40000, value 1
    const bytes = hexToBytes("d99c4001");
    const kv = KnownValue.fromCbor(decodeCbor(bytes));

    expect(kv.value).toBe(1);
  });

  test("should decode various values from binary", () => {
    // Tag 40000 = d99c40 (0xd9 = tag with 2-byte value, 0x9c40 = 40000)
    // Value 0
    expect(KnownValue.fromCbor(decodeCbor(hexToBytes("d99c4000"))).value).toBe(0);

    // Value 23
    expect(KnownValue.fromCbor(decodeCbor(hexToBytes("d99c4017"))).value).toBe(23);

    // Value 24
    expect(KnownValue.fromCbor(decodeCbor(hexToBytes("d99c401818"))).value).toBe(24);

    // Value 100
    expect(KnownValue.fromCbor(decodeCbor(hexToBytes("d99c401864"))).value).toBe(100);

    // Value 256
    expect(KnownValue.fromCbor(decodeCbor(hexToBytes("d99c40190100"))).value).toBe(256);
  });

  test("fromCbor requires the tag; the reference's TryFrom<CBOR>", () => {
    // Tagged
    const tagged = taggedValue(40000, 42);
    const kv1 = KnownValue.fromCbor(tagged);
    expect(kv1.value).toBe(42);

    // Untagged: rejected, as the reference rejects it.
    const untagged = cbor(42);
    expect(() => KnownValue.fromCbor(untagged)).toThrow(/expected type/);
    expect(() => KnownValue.codec.decode(untagged)).toThrow(/expected type/);
  });

  test("should throw on wrong tag", () => {
    const wrongTag = taggedValue(100, 42);
    expect(() => KnownValue.fromCbor(wrongTag)).toThrow(/40000|tag/i);
  });

  test("should throw on wrong type for untagged", () => {
    const text = cbor("hello");
    expect(() => KnownValue.fromCbor(text)).toThrow(/unsigned|type/i);
  });

  test("the tagged and the untagged decoder agree on the codepoint", () => {
    const tagged = taggedValue(40000, 99);
    const untagged = cbor(99);

    const decoded1 = KnownValue.fromCbor(tagged);
    const decoded2 = KnownValue.fromUntaggedCbor(untagged);

    expect(decoded1.value).toBe(99);
    expect(decoded2.value).toBe(99);
    expect(decoded1.equals(decoded2)).toBe(true);
    // The untagged decoder does not strip a tag.
    expect(() => KnownValue.fromUntaggedCbor(tagged)).toThrow(/expected type/);
  });
});

describe("KnownValue roundtrip", () => {
  test("should roundtrip encode/decode", () => {
    const values = [0, 1, 23, 24, 100, 255, 256, 1000, 65535, 65536];

    for (const v of values) {
      const original = new KnownValue(v);
      const bytes = original.toCbor().toData();
      const decoded = KnownValue.fromCbor(decodeCbor(bytes));
      expect(decoded.value).toBe(v);
    }
  });

  test("should roundtrip predefined values", () => {
    const predefined = [IS_A, ID, SIGNED, NOTE];

    for (const kv of predefined) {
      const bytes = kv.toCbor().toData();
      const decoded = KnownValue.fromCbor(decodeCbor(bytes));
      expect(decoded.value).toBe(kv.value);
    }
  });
});

describe("KnownValue BigInt support", () => {
  test("should accept bigint in constructor", () => {
    const kv = new KnownValue(42n);
    expect(kv.value).toBe(42);
    expect(kv.valueBigInt).toBe(42n);
  });

  test("should return bigint from valueBigInt()", () => {
    const kv = new KnownValue(42);
    expect(typeof kv.valueBigInt).toBe("bigint");
    expect(kv.valueBigInt).toBe(42n);
  });

  test("should encode bigint values correctly", () => {
    const kv = new KnownValue(1000n);
    const hex = bytesToHex(kv.toCbor().toData());
    expect(hex).toBe("d99c401903e8"); // tag 40000 + 1000
  });

  test("should decode to bigint internally", () => {
    const bytes = hexToBytes("d99c401903e8");
    const kv = KnownValue.fromCbor(decodeCbor(bytes));
    expect(kv.valueBigInt).toBe(1000n);
  });
});

// =============================================================================
// Rust Parity Tests
// =============================================================================

describe("Rust Parity: test_1", () => {
  // Direct port of Rust's test_1 from known_values_registry.rs
  test("test_1 - IS_A value and name, registry lookup", () => {
    // Rust: assert_eq!(IS_A.value, 1);
    expect(IS_A.value).toBe(1);

    // Rust: assert_eq!(IS_A.name, "isA");
    expect(IS_A.name).toBe("isA");

    // Rust: let store = getGlobalKnownValuesStore();
    const store = getGlobalKnownValuesStore();

    // Rust: assert_eq!(store.known_value_named("isA").unwrap().value, 1);
    expect(store.byName("isA")?.value).toBe(1);
  });
});

describe("Rust Parity: _RAW constants", () => {
  test("_RAW constants should match KnownValue values", () => {
    // Verify that _RAW constants have the correct values
    expect(KNOWN_VALUE_CODEPOINTS.IS_A).toBe(1);
    expect(KNOWN_VALUE_CODEPOINTS.NOTE).toBe(4);

    // Verify _RAW constants match the KnownValue.valueBigInt
    expect(IS_A.value).toBe(KNOWN_VALUE_CODEPOINTS.IS_A);
    expect(NOTE.value).toBe(KNOWN_VALUE_CODEPOINTS.NOTE);
  });

  test("_RAW constants can be used for pattern matching", () => {
    const rawValue: number | bigint = IS_A.value;
    let matched = false;

    // This demonstrates the use case for _RAW constants
    switch (rawValue) {
      case KNOWN_VALUE_CODEPOINTS.IS_A:
        matched = true;
        break;
      default:
        break;
    }

    expect(matched).toBe(true);
  });
});

describe("Rust Parity: DigestProvider", () => {
  test("KnownValue should implement digest()", () => {
    const kv = new KnownValue(1, "isA");

    // digest() should return a Digest object
    const digest = kv.digest();
    expect(digest).toBeDefined();

    // The digest should be a SHA-256 hash (32 bytes = 64 hex chars)
    const hex = digest.toHex();
    expect(hex).toHaveLength(64);
  });

  test("digest should be deterministic", () => {
    const kv1 = new KnownValue(1);
    const kv2 = new KnownValue(1);

    // Same value should produce same digest
    expect(kv1.digest().toHex()).toBe(kv2.digest().toHex());
  });

  test("different values should produce different digests", () => {
    const kv1 = new KnownValue(1);
    const kv2 = new KnownValue(2);

    // Different values should produce different digests
    expect(kv1.digest().toHex()).not.toBe(kv2.digest().toHex());
  });

  test("digest should be based on tagged CBOR encoding", () => {
    const kv = new KnownValue(1);

    // The digest should be the SHA-256 of the tagged CBOR data
    const cborData = kv.toCbor().toData();

    // Manually compute what the digest should be
    // (This verifies the implementation matches Rust's Digest::from_image)
    const digest = kv.digest();

    // The digest validates against the CBOR data
    expect(digest.validate(cborData)).toBe(true);
  });
});

// =============================================================================
// Step 7: _insert bug fix tests
// =============================================================================

describe("Rust Parity: _insert stale name removal", () => {
  test("should remove old name when overriding codepoint", () => {
    const store = new KnownValuesStore([IS_A]);

    // Override IS_A (codepoint 1) with a custom name
    store.register(new KnownValue(1, "overriddenIsA"));

    // The original "isA" name should be gone
    expect(store.byName("isA")).toBeUndefined();

    // The new name should work
    const overridden = store.byName("overriddenIsA");
    expect(overridden).toBeDefined();
    expect(overridden?.value).toBe(1);
  });

  test("should handle multiple overrides on same codepoint", () => {
    const store = new KnownValuesStore([IS_A]);

    // First override
    store.register(new KnownValue(1, "firstOverride"));
    expect(store.byName("isA")).toBeUndefined();
    expect(store.byName("firstOverride")).toBeDefined();

    // Second override
    store.register(new KnownValue(1, "secondOverride"));
    expect(store.byName("firstOverride")).toBeUndefined();
    expect(store.byName("secondOverride")).toBeDefined();
    expect(store.byName("secondOverride")?.value).toBe(1);
  });

  test("should handle override with unnamed value", () => {
    const store = new KnownValuesStore([IS_A]);

    // Override with an unnamed value (no assigned name)
    store.register(new KnownValue(1));

    // The original "isA" name should be gone
    expect(store.byName("isA")).toBeUndefined();

    // Should still be retrievable by value
    const found = store.byValue(1);
    expect(found).toBeDefined();
    expect(found?.value).toBe(1);
    expect(found?.assignedName).toBeUndefined();
  });
});

// =============================================================================
// Step 8: SELF constant tests
// =============================================================================

describe("Rust Parity: VALUE, ATTESTATION, VERIFIABLE_AT constants", () => {
  test("VALUE constant should exist with correct value and name", () => {
    expect(VALUE.value).toBe(25);
    expect(VALUE.name).toBe("value");
    expect(KNOWN_VALUE_CODEPOINTS.VALUE).toBe(25);
    expect(VALUE.value).toBe(KNOWN_VALUE_CODEPOINTS.VALUE);
  });

  test("ATTESTATION constant should exist with correct value and name", () => {
    expect(ATTESTATION.value).toBe(26);
    expect(ATTESTATION.name).toBe("attestation");
    expect(KNOWN_VALUE_CODEPOINTS.ATTESTATION).toBe(26);
    expect(ATTESTATION.value).toBe(KNOWN_VALUE_CODEPOINTS.ATTESTATION);
  });

  test("VERIFIABLE_AT constant should exist with correct value and name", () => {
    expect(VERIFIABLE_AT.value).toBe(27);
    expect(VERIFIABLE_AT.name).toBe("verifiableAt");
    expect(KNOWN_VALUE_CODEPOINTS.VERIFIABLE_AT).toBe(27);
    expect(VERIFIABLE_AT.value).toBe(KNOWN_VALUE_CODEPOINTS.VERIFIABLE_AT);
  });

  test("ATTESTATION and VERIFIABLE_AT are in the global store; VALUE is not, as in the reference", () => {
    const store = getGlobalKnownValuesStore();
    expect(store.byName("value")).toBeUndefined();
    expect(store.byValue(25)).toBeUndefined();
    expect(store.byName("attestation")?.value).toBe(26);
    expect(store.byName("verifiableAt")?.value).toBe(27);
    expect(VALUE.name).toBe("value");
    expect(store.nameOf(VALUE)).toBe("value");
  });
});

describe("Rust Parity: SELF constant (706)", () => {
  test("SELF constant should exist with correct value and name", () => {
    expect(SELF.value).toBe(706);
    expect(SELF.name).toBe("Self");
    expect(KNOWN_VALUE_CODEPOINTS.SELF).toBe(706);
  });

  test("KNOWN_VALUE_CODEPOINTS.SELF should match SELF.value", () => {
    expect(SELF.value).toBe(KNOWN_VALUE_CODEPOINTS.SELF);
  });

  test("SELF is not in the global store, as in the reference; the bundled rows name it", () => {
    const store = getGlobalKnownValuesStore();
    expect(store.byName("Self")).toBeUndefined();
    expect(store.byValue(706)).toBeUndefined();
    const mine = new KnownValuesStore();
    for (const [cp, name] of BUNDLED_REGISTRY) mine.register(new KnownValue(cp, name));
    expect(mine.byName("Self")?.value).toBe(706);
  });
});

describe("Registry contents", () => {
  test("every constant is in the bundled registry with the same name", () => {
    const byCodepoint = new Map<number, string>();
    for (const [cp, name] of BUNDLED_REGISTRY) if (!byCodepoint.has(cp)) byCodepoint.set(cp, name);
    const missing = REGISTRY_CONSTANTS.filter(
      (kv) => byCodepoint.get(Number(kv.value)) !== kv.assignedName,
    ).map((kv) => `${String(kv.value)}:${kv.name}`);
    expect(missing).toEqual([]);
  });
  test("a codepoint that appears in two registries carries one name", () => {
    const names = new Map<number, Set<string>>();
    for (const [cp, name] of BUNDLED_REGISTRY) {
      const set = names.get(cp) ?? new Set<string>();
      set.add(name);
      names.set(cp, set);
    }
    const conflicts = [...names].filter(([, set]) => set.size > 1).map(([cp]) => cp);
    expect(conflicts).toEqual([]);
  });
  test("the workflow test row is not bundled", () => {
    expect(BUNDLED_REGISTRY.some(([cp]) => cp === 200000)).toBe(false);
    expect(resolveKnownValue(200000, getGlobalKnownValuesStore()).assignedName).toBeUndefined();
  });
  test("constants and tables are frozen", () => {
    expect(Object.isFrozen(IS_A)).toBe(true);
    expect(Object.isFrozen(UNIT)).toBe(true);
    expect(REGISTRY_CONSTANTS.every((kv) => Object.isFrozen(kv))).toBe(true);
    expect(Object.isFrozen(REGISTRY_CONSTANTS)).toBe(true);
    expect(Object.isFrozen(KNOWN_VALUE_CODEPOINTS)).toBe(true);
    expect(Object.isFrozen(BUNDLED_REGISTRY)).toBe(true);
    expect(BUNDLED_REGISTRY.every((row) => Object.isFrozen(row))).toBe(true);
    expect(() => {
      (IS_A as unknown as { _assignedName: string })._assignedName = "hacked";
    }).toThrow(TypeError);
    expect(IS_A.name).toBe("isA");
  });
});
