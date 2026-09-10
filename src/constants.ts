/**
 * The known values of the Blockchain Commons registry
 * (BCR-2023-002, appendix A), as `KnownValue` constants, plus their
 * codepoints as one `as const` table for `switch` labels.
 *
 * @module constants
 */
import { KnownValue } from "./known-value.js";

/** Codepoints of the registry constants, for `case` labels and comparisons. */
export const KNOWN_VALUE_CODEPOINTS = {
  // General
  UNIT: 0,
  IS_A: 1,
  ID: 2,
  SIGNED: 3,
  NOTE: 4,
  HAS_RECIPIENT: 5,
  SSKR_SHARE: 6,
  CONTROLLER: 7,
  KEY: 8,
  DEREFERENCE_VIA: 9,
  ENTITY: 10,
  NAME: 11,
  LANGUAGE: 12,
  ISSUER: 13,
  HOLDER: 14,
  SALT: 15,
  DATE: 16,
  UNKNOWN_VALUE: 17,
  VERSION_VALUE: 18,
  HAS_SECRET: 19,
  DIFF_EDITS: 20,
  VALID_FROM: 21,
  VALID_UNTIL: 22,
  POSITION: 23,
  NICKNAME: 24,
  VALUE: 25,
  ATTESTATION: 26,
  VERIFIABLE_AT: 27,
  // Attachments
  ATTACHMENT: 50,
  VENDOR: 51,
  CONFORMS_TO: 52,
  // XID Documents
  ALLOW: 60,
  DENY: 61,
  ENDPOINT: 62,
  DELEGATE: 63,
  PROVENANCE: 64,
  PRIVATE_KEY: 65,
  SERVICE: 66,
  CAPABILITY: 67,
  PROVENANCE_GENERATOR: 68,
  // XID Privileges
  PRIVILEGE_ALL: 70,
  PRIVILEGE_AUTH: 71,
  PRIVILEGE_SIGN: 72,
  PRIVILEGE_ENCRYPT: 73,
  PRIVILEGE_ELIDE: 74,
  PRIVILEGE_ISSUE: 75,
  PRIVILEGE_ACCESS: 76,
  PRIVILEGE_DELEGATE: 80,
  PRIVILEGE_VERIFY: 81,
  PRIVILEGE_UPDATE: 82,
  PRIVILEGE_TRANSFER: 83,
  PRIVILEGE_ELECT: 84,
  PRIVILEGE_BURN: 85,
  PRIVILEGE_REVOKE: 86,
  // Expression and Function Calls
  BODY: 100,
  RESULT: 101,
  ERROR: 102,
  OK_VALUE: 103,
  PROCESSING_VALUE: 104,
  SENDER: 105,
  SENDER_CONTINUATION: 106,
  RECIPIENT_CONTINUATION: 107,
  CONTENT: 108,
  // Cryptography
  SEED_TYPE: 200,
  PRIVATE_KEY_TYPE: 201,
  PUBLIC_KEY_TYPE: 202,
  MASTER_KEY_TYPE: 203,
  // Cryptocurrency Assets
  ASSET: 300,
  BITCOIN_VALUE: 301,
  ETHEREUM_VALUE: 302,
  TEZOS_VALUE: 303,
  // Cryptocurrency Networks
  NETWORK: 400,
  MAIN_NET_VALUE: 401,
  TEST_NET_VALUE: 402,
  // Bitcoin
  BIP32_KEY_TYPE: 500,
  CHAIN_CODE: 501,
  DERIVATION_PATH_TYPE: 502,
  PARENT_PATH: 503,
  CHILDREN_PATH: 504,
  PARENT_FINGERPRINT: 505,
  PSBT_TYPE: 506,
  OUTPUT_DESCRIPTOR_TYPE: 507,
  OUTPUT_DESCRIPTOR: 508,
  // Graphs
  GRAPH: 600,
  SOURCE_TARGET_GRAPH: 601,
  PARENT_CHILD_GRAPH: 602,
  DIGRAPH: 603,
  ACYCLIC_GRAPH: 604,
  MULTIGRAPH: 605,
  PSEUDOGRAPH: 606,
  GRAPH_FRAGMENT: 607,
  DAG: 608,
  TREE: 609,
  FOREST: 610,
  COMPOUND_GRAPH: 611,
  HYPERGRAPH: 612,
  DIHYPERGRAPH: 613,
  NODE: 700,
  EDGE: 701,
  SOURCE: 702,
  TARGET: 703,
  PARENT: 704,
  CHILD: 705,
  SELF: 706,
} as const;

// General
export const UNIT: KnownValue = new KnownValue(0, "");
export const IS_A: KnownValue = new KnownValue(1, "isA");
export const ID: KnownValue = new KnownValue(2, "id");
export const SIGNED: KnownValue = new KnownValue(3, "signed");
export const NOTE: KnownValue = new KnownValue(4, "note");
export const HAS_RECIPIENT: KnownValue = new KnownValue(5, "hasRecipient");
export const SSKR_SHARE: KnownValue = new KnownValue(6, "sskrShare");
export const CONTROLLER: KnownValue = new KnownValue(7, "controller");
export const KEY: KnownValue = new KnownValue(8, "key");
export const DEREFERENCE_VIA: KnownValue = new KnownValue(9, "dereferenceVia");
export const ENTITY: KnownValue = new KnownValue(10, "entity");
export const NAME: KnownValue = new KnownValue(11, "name");
export const LANGUAGE: KnownValue = new KnownValue(12, "language");
export const ISSUER: KnownValue = new KnownValue(13, "issuer");
export const HOLDER: KnownValue = new KnownValue(14, "holder");
export const SALT: KnownValue = new KnownValue(15, "salt");
export const DATE: KnownValue = new KnownValue(16, "date");
export const UNKNOWN_VALUE: KnownValue = new KnownValue(17, "Unknown");
export const VERSION_VALUE: KnownValue = new KnownValue(18, "version");
export const HAS_SECRET: KnownValue = new KnownValue(19, "hasSecret");
export const DIFF_EDITS: KnownValue = new KnownValue(20, "edits");
export const VALID_FROM: KnownValue = new KnownValue(21, "validFrom");
export const VALID_UNTIL: KnownValue = new KnownValue(22, "validUntil");
export const POSITION: KnownValue = new KnownValue(23, "position");
export const NICKNAME: KnownValue = new KnownValue(24, "nickname");
export const VALUE: KnownValue = new KnownValue(25, "value");
export const ATTESTATION: KnownValue = new KnownValue(26, "attestation");
export const VERIFIABLE_AT: KnownValue = new KnownValue(27, "verifiableAt");

// Attachments
export const ATTACHMENT: KnownValue = new KnownValue(50, "attachment");
export const VENDOR: KnownValue = new KnownValue(51, "vendor");
export const CONFORMS_TO: KnownValue = new KnownValue(52, "conformsTo");

// XID Documents
export const ALLOW: KnownValue = new KnownValue(60, "allow");
export const DENY: KnownValue = new KnownValue(61, "deny");
export const ENDPOINT: KnownValue = new KnownValue(62, "endpoint");
export const DELEGATE: KnownValue = new KnownValue(63, "delegate");
export const PROVENANCE: KnownValue = new KnownValue(64, "provenance");
export const PRIVATE_KEY: KnownValue = new KnownValue(65, "privateKey");
export const SERVICE: KnownValue = new KnownValue(66, "service");
export const CAPABILITY: KnownValue = new KnownValue(67, "capability");
export const PROVENANCE_GENERATOR: KnownValue = new KnownValue(68, "provenanceGenerator");

// XID Privileges
export const PRIVILEGE_ALL: KnownValue = new KnownValue(70, "All");
export const PRIVILEGE_AUTH: KnownValue = new KnownValue(71, "Authorize");
export const PRIVILEGE_SIGN: KnownValue = new KnownValue(72, "Sign");
export const PRIVILEGE_ENCRYPT: KnownValue = new KnownValue(73, "Encrypt");
export const PRIVILEGE_ELIDE: KnownValue = new KnownValue(74, "Elide");
export const PRIVILEGE_ISSUE: KnownValue = new KnownValue(75, "Issue");
export const PRIVILEGE_ACCESS: KnownValue = new KnownValue(76, "Access");
export const PRIVILEGE_DELEGATE: KnownValue = new KnownValue(80, "Delegate");
export const PRIVILEGE_VERIFY: KnownValue = new KnownValue(81, "Verify");
export const PRIVILEGE_UPDATE: KnownValue = new KnownValue(82, "Update");
export const PRIVILEGE_TRANSFER: KnownValue = new KnownValue(83, "Transfer");
export const PRIVILEGE_ELECT: KnownValue = new KnownValue(84, "Elect");
export const PRIVILEGE_BURN: KnownValue = new KnownValue(85, "Burn");
export const PRIVILEGE_REVOKE: KnownValue = new KnownValue(86, "Revoke");

// Expression and Function Calls
export const BODY: KnownValue = new KnownValue(100, "body");
export const RESULT: KnownValue = new KnownValue(101, "result");
export const ERROR: KnownValue = new KnownValue(102, "error");
export const OK_VALUE: KnownValue = new KnownValue(103, "OK");
export const PROCESSING_VALUE: KnownValue = new KnownValue(104, "Processing");
export const SENDER: KnownValue = new KnownValue(105, "sender");
export const SENDER_CONTINUATION: KnownValue = new KnownValue(106, "senderContinuation");
export const RECIPIENT_CONTINUATION: KnownValue = new KnownValue(107, "recipientContinuation");
export const CONTENT: KnownValue = new KnownValue(108, "content");

// Cryptography
export const SEED_TYPE: KnownValue = new KnownValue(200, "Seed");
export const PRIVATE_KEY_TYPE: KnownValue = new KnownValue(201, "PrivateKey");
export const PUBLIC_KEY_TYPE: KnownValue = new KnownValue(202, "PublicKey");
export const MASTER_KEY_TYPE: KnownValue = new KnownValue(203, "MasterKey");

// Cryptocurrency Assets
export const ASSET: KnownValue = new KnownValue(300, "asset");
export const BITCOIN_VALUE: KnownValue = new KnownValue(301, "Bitcoin");
export const ETHEREUM_VALUE: KnownValue = new KnownValue(302, "Ethereum");
export const TEZOS_VALUE: KnownValue = new KnownValue(303, "Tezos");

// Cryptocurrency Networks
export const NETWORK: KnownValue = new KnownValue(400, "network");
export const MAIN_NET_VALUE: KnownValue = new KnownValue(401, "MainNet");
export const TEST_NET_VALUE: KnownValue = new KnownValue(402, "TestNet");

// Bitcoin
export const BIP32_KEY_TYPE: KnownValue = new KnownValue(500, "BIP32Key");
export const CHAIN_CODE: KnownValue = new KnownValue(501, "chainCode");
export const DERIVATION_PATH_TYPE: KnownValue = new KnownValue(502, "DerivationPath");
export const PARENT_PATH: KnownValue = new KnownValue(503, "parentPath");
export const CHILDREN_PATH: KnownValue = new KnownValue(504, "childrenPath");
export const PARENT_FINGERPRINT: KnownValue = new KnownValue(505, "parentFingerprint");
export const PSBT_TYPE: KnownValue = new KnownValue(506, "PSBT");
export const OUTPUT_DESCRIPTOR_TYPE: KnownValue = new KnownValue(507, "OutputDescriptor");
export const OUTPUT_DESCRIPTOR: KnownValue = new KnownValue(508, "outputDescriptor");

// Graphs
export const GRAPH: KnownValue = new KnownValue(600, "Graph");
export const SOURCE_TARGET_GRAPH: KnownValue = new KnownValue(601, "SourceTargetGraph");
export const PARENT_CHILD_GRAPH: KnownValue = new KnownValue(602, "ParentChildGraph");
export const DIGRAPH: KnownValue = new KnownValue(603, "Digraph");
export const ACYCLIC_GRAPH: KnownValue = new KnownValue(604, "AcyclicGraph");
export const MULTIGRAPH: KnownValue = new KnownValue(605, "Multigraph");
export const PSEUDOGRAPH: KnownValue = new KnownValue(606, "Pseudograph");
export const GRAPH_FRAGMENT: KnownValue = new KnownValue(607, "GraphFragment");
export const DAG: KnownValue = new KnownValue(608, "DAG");
export const TREE: KnownValue = new KnownValue(609, "Tree");
export const FOREST: KnownValue = new KnownValue(610, "Forest");
export const COMPOUND_GRAPH: KnownValue = new KnownValue(611, "CompoundGraph");
export const HYPERGRAPH: KnownValue = new KnownValue(612, "Hypergraph");
export const DIHYPERGRAPH: KnownValue = new KnownValue(613, "Dihypergraph");
export const NODE: KnownValue = new KnownValue(700, "node");
export const EDGE: KnownValue = new KnownValue(701, "edge");
export const SOURCE: KnownValue = new KnownValue(702, "source");
export const TARGET: KnownValue = new KnownValue(703, "target");
export const PARENT: KnownValue = new KnownValue(704, "parent");
export const CHILD: KnownValue = new KnownValue(705, "child");
export const SELF: KnownValue = new KnownValue(706, "Self");

/** Every registry constant, in codepoint order. */
export const REGISTRY_CONSTANTS: readonly KnownValue[] = [
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
  VALUE,
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
  SELF,
];
