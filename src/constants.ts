/**
 * The known values of the Blockchain Commons registry
 * (BCR-2023-002, appendix A), as `KnownValue` constants, plus their
 * codepoints as one `as const` table for `switch` labels.
 *
 * @module constants
 */
import { KnownValue } from "./known-value.js";

/** Codepoints of the registry constants, for `case` labels and comparisons. */
export const KNOWN_VALUE_CODEPOINTS: Readonly<{
  /** `''` (the unit value). */
  readonly UNIT: 0;
  /** `isA`. */
  readonly IS_A: 1;
  /** `id`. */
  readonly ID: 2;
  /** `signed`. */
  readonly SIGNED: 3;
  /** `note`. */
  readonly NOTE: 4;
  /** `hasRecipient`. */
  readonly HAS_RECIPIENT: 5;
  /** `sskrShare`. */
  readonly SSKR_SHARE: 6;
  /** `controller`. */
  readonly CONTROLLER: 7;
  /** `key`. */
  readonly KEY: 8;
  /** `dereferenceVia`. */
  readonly DEREFERENCE_VIA: 9;
  /** `entity`. */
  readonly ENTITY: 10;
  /** `name`. */
  readonly NAME: 11;
  /** `language`. */
  readonly LANGUAGE: 12;
  /** `issuer`. */
  readonly ISSUER: 13;
  /** `holder`. */
  readonly HOLDER: 14;
  /** `salt`. */
  readonly SALT: 15;
  /** `date`. */
  readonly DATE: 16;
  /** `Unknown`. */
  readonly UNKNOWN_VALUE: 17;
  /** `version`. */
  readonly VERSION_VALUE: 18;
  /** `hasSecret`. */
  readonly HAS_SECRET: 19;
  /** `edits`. */
  readonly DIFF_EDITS: 20;
  /** `validFrom`. */
  readonly VALID_FROM: 21;
  /** `validUntil`. */
  readonly VALID_UNTIL: 22;
  /** `position`. */
  readonly POSITION: 23;
  /** `nickname`. */
  readonly NICKNAME: 24;
  /** `value`. */
  readonly VALUE: 25;
  /** `attestation`. */
  readonly ATTESTATION: 26;
  /** `verifiableAt`. */
  readonly VERIFIABLE_AT: 27;
  /** `attachment`. */
  readonly ATTACHMENT: 50;
  /** `vendor`. */
  readonly VENDOR: 51;
  /** `conformsTo`. */
  readonly CONFORMS_TO: 52;
  /** `allow`. */
  readonly ALLOW: 60;
  /** `deny`. */
  readonly DENY: 61;
  /** `endpoint`. */
  readonly ENDPOINT: 62;
  /** `delegate`. */
  readonly DELEGATE: 63;
  /** `provenance`. */
  readonly PROVENANCE: 64;
  /** `privateKey`. */
  readonly PRIVATE_KEY: 65;
  /** `service`. */
  readonly SERVICE: 66;
  /** `capability`. */
  readonly CAPABILITY: 67;
  /** `provenanceGenerator`. */
  readonly PROVENANCE_GENERATOR: 68;
  /** `All`. */
  readonly PRIVILEGE_ALL: 70;
  /** `Authorize`. */
  readonly PRIVILEGE_AUTH: 71;
  /** `Sign`. */
  readonly PRIVILEGE_SIGN: 72;
  /** `Encrypt`. */
  readonly PRIVILEGE_ENCRYPT: 73;
  /** `Elide`. */
  readonly PRIVILEGE_ELIDE: 74;
  /** `Issue`. */
  readonly PRIVILEGE_ISSUE: 75;
  /** `Access`. */
  readonly PRIVILEGE_ACCESS: 76;
  /** `Delegate`. */
  readonly PRIVILEGE_DELEGATE: 80;
  /** `Verify`. */
  readonly PRIVILEGE_VERIFY: 81;
  /** `Update`. */
  readonly PRIVILEGE_UPDATE: 82;
  /** `Transfer`. */
  readonly PRIVILEGE_TRANSFER: 83;
  /** `Elect`. */
  readonly PRIVILEGE_ELECT: 84;
  /** `Burn`. */
  readonly PRIVILEGE_BURN: 85;
  /** `Revoke`. */
  readonly PRIVILEGE_REVOKE: 86;
  /** `body`. */
  readonly BODY: 100;
  /** `result`. */
  readonly RESULT: 101;
  /** `error`. */
  readonly ERROR: 102;
  /** `OK`. */
  readonly OK_VALUE: 103;
  /** `Processing`. */
  readonly PROCESSING_VALUE: 104;
  /** `sender`. */
  readonly SENDER: 105;
  /** `senderContinuation`. */
  readonly SENDER_CONTINUATION: 106;
  /** `recipientContinuation`. */
  readonly RECIPIENT_CONTINUATION: 107;
  /** `content`. */
  readonly CONTENT: 108;
  /** `Seed`. */
  readonly SEED_TYPE: 200;
  /** `PrivateKey`. */
  readonly PRIVATE_KEY_TYPE: 201;
  /** `PublicKey`. */
  readonly PUBLIC_KEY_TYPE: 202;
  /** `MasterKey`. */
  readonly MASTER_KEY_TYPE: 203;
  /** `asset`. */
  readonly ASSET: 300;
  /** `Bitcoin`. */
  readonly BITCOIN_VALUE: 301;
  /** `Ethereum`. */
  readonly ETHEREUM_VALUE: 302;
  /** `Tezos`. */
  readonly TEZOS_VALUE: 303;
  /** `network`. */
  readonly NETWORK: 400;
  /** `MainNet`. */
  readonly MAIN_NET_VALUE: 401;
  /** `TestNet`. */
  readonly TEST_NET_VALUE: 402;
  /** `BIP32Key`. */
  readonly BIP32_KEY_TYPE: 500;
  /** `chainCode`. */
  readonly CHAIN_CODE: 501;
  /** `DerivationPath`. */
  readonly DERIVATION_PATH_TYPE: 502;
  /** `parentPath`. */
  readonly PARENT_PATH: 503;
  /** `childrenPath`. */
  readonly CHILDREN_PATH: 504;
  /** `parentFingerprint`. */
  readonly PARENT_FINGERPRINT: 505;
  /** `PSBT`. */
  readonly PSBT_TYPE: 506;
  /** `OutputDescriptor`. */
  readonly OUTPUT_DESCRIPTOR_TYPE: 507;
  /** `outputDescriptor`. */
  readonly OUTPUT_DESCRIPTOR: 508;
  /** `Graph`. */
  readonly GRAPH: 600;
  /** `SourceTargetGraph`. */
  readonly SOURCE_TARGET_GRAPH: 601;
  /** `ParentChildGraph`. */
  readonly PARENT_CHILD_GRAPH: 602;
  /** `Digraph`. */
  readonly DIGRAPH: 603;
  /** `AcyclicGraph`. */
  readonly ACYCLIC_GRAPH: 604;
  /** `Multigraph`. */
  readonly MULTIGRAPH: 605;
  /** `Pseudograph`. */
  readonly PSEUDOGRAPH: 606;
  /** `GraphFragment`. */
  readonly GRAPH_FRAGMENT: 607;
  /** `DAG`. */
  readonly DAG: 608;
  /** `Tree`. */
  readonly TREE: 609;
  /** `Forest`. */
  readonly FOREST: 610;
  /** `CompoundGraph`. */
  readonly COMPOUND_GRAPH: 611;
  /** `Hypergraph`. */
  readonly HYPERGRAPH: 612;
  /** `Dihypergraph`. */
  readonly DIHYPERGRAPH: 613;
  /** `node`. */
  readonly NODE: 700;
  /** `edge`. */
  readonly EDGE: 701;
  /** `source`. */
  readonly SOURCE: 702;
  /** `target`. */
  readonly TARGET: 703;
  /** `parent`. */
  readonly PARENT: 704;
  /** `child`. */
  readonly CHILD: 705;
  /** `Self`. */
  readonly SELF: 706;
}> = /*#__PURE__*/ Object.freeze({
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
} as const);

// General
/** 0 — `''` (the unit value): The Unit type, and its sole inhabitant '', which is a value conveying no information. */
export const UNIT: KnownValue = new KnownValue(0, "");
/** 1 — `isA`: The subject is an instance of the class identified by the object. */
export const IS_A: KnownValue = new KnownValue(1, "isA");
/** 2 — `id`: The object is an unambiguous identifier of the subject within a given context. */
export const ID: KnownValue = new KnownValue(2, "id");
/** 3 — `signed`: The object is a cryptographic signature of the subject. */
export const SIGNED: KnownValue = new KnownValue(3, "signed");
/** 4 — `note`: The object is a human-readable note about the subject. */
export const NOTE: KnownValue = new KnownValue(4, "note");
/** 5 — `hasRecipient`: The subject can be decrypted using the private key that decrypts the content key in the object. */
export const HAS_RECIPIENT: KnownValue = new KnownValue(5, "hasRecipient");
/** 6 — `sskrShare`: The subject can be decrypted by a quorum of SSKR shares including the one in the object. */
export const SSKR_SHARE: KnownValue = new KnownValue(6, "sskrShare");
/** 7 — `controller`: The object is the subject's controlling entity. */
export const CONTROLLER: KnownValue = new KnownValue(7, "controller");
/** 8 — `key`: The entity identified by the subject holds the private half of the public keys(s) in the object. */
export const KEY: KnownValue = new KnownValue(8, "key");
/** 9 — `dereferenceVia`: The content referenced by the subject can be dereferenced using the object. */
export const DEREFERENCE_VIA: KnownValue = new KnownValue(9, "dereferenceVia");
/** 10 — `entity`: The entity referenced by the subject is specified in the object. */
export const ENTITY: KnownValue = new KnownValue(10, "entity");
/** 11 — `name`: The subject is known by the name in the object. */
export const NAME: KnownValue = new KnownValue(11, "name");
/** 12 — `language`: The subject is written in the language of the ISO language code object. */
export const LANGUAGE: KnownValue = new KnownValue(12, "language");
/** 13 — `issuer`: The object is the subject's issuing entity. */
export const ISSUER: KnownValue = new KnownValue(13, "issuer");
/** 14 — `holder`: The object identifies the entity to which the subject has been issued. */
export const HOLDER: KnownValue = new KnownValue(14, "holder");
/** 15 — `salt`: The object is random salt used to decorrelate the digest of the subject. */
export const SALT: KnownValue = new KnownValue(15, "salt");
/** 16 — `date`: The object is a primary datestamp of the subject. */
export const DATE: KnownValue = new KnownValue(16, "date");
/** 17 — `Unknown`: Placeholder for an unknown value. */
export const UNKNOWN_VALUE: KnownValue = new KnownValue(17, "Unknown");
/** 18 — `version`: The object is the version of the subject. */
export const VERSION_VALUE: KnownValue = new KnownValue(18, "version");
/** 19 — `hasSecret`: The subject can be decrypted using the secret that decrypts the content key in the object. */
export const HAS_SECRET: KnownValue = new KnownValue(19, "hasSecret");
/** 20 — `edits`: The object is a set of edits used by the Envelope.transform(edits:) method. */
export const DIFF_EDITS: KnownValue = new KnownValue(20, "edits");
/** 21 — `validFrom`: The subject is valid from the date in the object. */
export const VALID_FROM: KnownValue = new KnownValue(21, "validFrom");
/** 22 — `validUntil`: The subject is valid until the date in the object. */
export const VALID_UNTIL: KnownValue = new KnownValue(22, "validUntil");
/** 23 — `position`: The position of an item in a series or sequence of items. */
export const POSITION: KnownValue = new KnownValue(23, "position");
/** 24 — `nickname`: The subject is a nickname for the object. */
export const NICKNAME: KnownValue = new KnownValue(24, "nickname");
/** 25 — `value`: The object is the value of the subject. */
export const VALUE: KnownValue = new KnownValue(25, "value");
/** 26 — `attestation`: The object is an attestation of the subject. */
export const ATTESTATION: KnownValue = new KnownValue(26, "attestation");
/** 27 — `verifiableAt`: The object is a date at which the subject can be verified. */
export const VERIFIABLE_AT: KnownValue = new KnownValue(27, "verifiableAt");

// Attachments
/** 50 — `attachment`: Declares that the object is a vendor-defined attachment to the envelope. */
export const ATTACHMENT: KnownValue = new KnownValue(50, "attachment");
/** 51 — `vendor`: Declares the vendor of the subject. */
export const VENDOR: KnownValue = new KnownValue(51, "vendor");
/** 52 — `conformsTo`: An established standard to which the subject conforms. */
export const CONFORMS_TO: KnownValue = new KnownValue(52, "conformsTo");

// XID Documents
/** 60 — `allow`: The object is a set of permissions that allow the subject to perform the actions specified in the object. */
export const ALLOW: KnownValue = new KnownValue(60, "allow");
/** 61 — `deny`: The object is a set of permissions that deny the subject from performing the actions specified in the object. */
export const DENY: KnownValue = new KnownValue(61, "deny");
/** 62 — `endpoint`: The object is a service endpoint associated with the subject. */
export const ENDPOINT: KnownValue = new KnownValue(62, "endpoint");
/** 63 — `delegate`: The object is a delegate authorized by the subject. */
export const DELEGATE: KnownValue = new KnownValue(63, "delegate");
/** 64 — `provenance`: The object is a provenance mark associated with the subject. */
export const PROVENANCE: KnownValue = new KnownValue(64, "provenance");
/** 65 — `privateKey`: The object is a private key associated with the subject. */
export const PRIVATE_KEY: KnownValue = new KnownValue(65, "privateKey");
/** 66 — `service`: The object is a service associated with the subject. */
export const SERVICE: KnownValue = new KnownValue(66, "service");
/** 67 — `capability`: The object is a capability associated with the subject. */
export const CAPABILITY: KnownValue = new KnownValue(67, "capability");
/** 68 — `provenanceGenerator`: The object is a provenance mark generator associated with the subject. */
export const PROVENANCE_GENERATOR: KnownValue = new KnownValue(68, "provenanceGenerator");

// XID Privileges
/** 70 — `All`: The set of all allowed privileges. */
export const PRIVILEGE_ALL: KnownValue = new KnownValue(70, "All");
/** 71 — `Authorize`: Operational privilege: authorize actions on behalf of the subject. */
export const PRIVILEGE_AUTH: KnownValue = new KnownValue(71, "Authorize");
/** 72 — `Sign`: Operational privilege: sign documents on behalf of the subject. */
export const PRIVILEGE_SIGN: KnownValue = new KnownValue(72, "Sign");
/** 73 — `Encrypt`: Operational privilege: encrypt messages from the subject and decrypt messages to the subject. */
export const PRIVILEGE_ENCRYPT: KnownValue = new KnownValue(73, "Encrypt");
/** 74 — `Elide`: Operational privilege: elide the subject's documents. */
export const PRIVILEGE_ELIDE: KnownValue = new KnownValue(74, "Elide");
/** 75 — `Issue`: Operational privilege: issue documents on behalf of the subject. */
export const PRIVILEGE_ISSUE: KnownValue = new KnownValue(75, "Issue");
/** 76 — `Access`: Operational privilege: access resources on behalf of the subject. */
export const PRIVILEGE_ACCESS: KnownValue = new KnownValue(76, "Access");
/** 80 — `Delegate`: Management privilege: delegate the privileges of the subject to another entity. */
export const PRIVILEGE_DELEGATE: KnownValue = new KnownValue(80, "Delegate");
/** 81 — `Verify`: Management privilege: update the subject's documents, including the ability to reduce privileges. */
export const PRIVILEGE_VERIFY: KnownValue = new KnownValue(81, "Verify");
/** 82 — `Update`: Management privilege: update the subject's service endpoints. */
export const PRIVILEGE_UPDATE: KnownValue = new KnownValue(82, "Update");
/** 83 — `Transfer`: Management privilege: remove the inception key from the XID document. */
export const PRIVILEGE_TRANSFER: KnownValue = new KnownValue(83, "Transfer");
/** 84 — `Elect`: Management privilege: add or remove other verifiers (rotate keys). */
export const PRIVILEGE_ELECT: KnownValue = new KnownValue(84, "Elect");
/** 85 — `Burn`: Management privilege: transition to a new provenance mark chain. */
export const PRIVILEGE_BURN: KnownValue = new KnownValue(85, "Burn");
/** 86 — `Revoke`: Management privilege: revoke the XID entirely. */
export const PRIVILEGE_REVOKE: KnownValue = new KnownValue(86, "Revoke");

// Expression and Function Calls
/** 100 — `body`: The object is the body of the request or expression identified by the subject. */
export const BODY: KnownValue = new KnownValue(100, "body");
/** 101 — `result`: The object is the success result of the request identified by the subject. */
export const RESULT: KnownValue = new KnownValue(101, "result");
/** 102 — `error`: The object is the failure result of the request identified by the subject. */
export const ERROR: KnownValue = new KnownValue(102, "error");
/** 103 — `OK`: The success result of a request that has no other return value. */
export const OK_VALUE: KnownValue = new KnownValue(103, "OK");
/** 104 — `Processing`: The "in processing" result of a request. */
export const PROCESSING_VALUE: KnownValue = new KnownValue(104, "Processing");
/** 105 — `sender`: The object identifies the sender, including a way to verify messages from the sender (e.g. public key). */
export const SENDER: KnownValue = new KnownValue(105, "sender");
/** 106 — `senderContinuation`: The object is a continuation owned by the sender. */
export const SENDER_CONTINUATION: KnownValue = new KnownValue(106, "senderContinuation");
/** 107 — `recipientContinuation`: The object is a continuation owned by the recipient. */
export const RECIPIENT_CONTINUATION: KnownValue = new KnownValue(107, "recipientContinuation");
/** 108 — `content`: The object is the content of the event. */
export const CONTENT: KnownValue = new KnownValue(108, "content");

// Cryptography
/** 200 — `Seed`: A cryptographic seed. */
export const SEED_TYPE: KnownValue = new KnownValue(200, "Seed");
/** 201 — `PrivateKey`: A cryptographic private key. */
export const PRIVATE_KEY_TYPE: KnownValue = new KnownValue(201, "PrivateKey");
/** 202 — `PublicKey`: A cryptographic public key. */
export const PUBLIC_KEY_TYPE: KnownValue = new KnownValue(202, "PublicKey");
/** 203 — `MasterKey`: A cryptographic master key. */
export const MASTER_KEY_TYPE: KnownValue = new KnownValue(203, "MasterKey");

// Cryptocurrency Assets
/** 300 — `asset`: Declares a cryptocurrency asset specifier, e.g. "Bitcoin", "Ethereum". */
export const ASSET: KnownValue = new KnownValue(300, "asset");
/** 301 — `Bitcoin`: The Bitcoin cryptocurrency ("BTC"). */
export const BITCOIN_VALUE: KnownValue = new KnownValue(301, "Bitcoin");
/** 302 — `Ethereum`: The Ethereum cryptocurrency ("ETH"). */
export const ETHEREUM_VALUE: KnownValue = new KnownValue(302, "Ethereum");
/** 303 — `Tezos`: The Tezos cryptocurrency ("XTZ"). */
export const TEZOS_VALUE: KnownValue = new KnownValue(303, "Tezos");

// Cryptocurrency Networks
/** 400 — `network`: Declares a cryptocurrency network, e.g. "MainNet", "TestNet". */
export const NETWORK: KnownValue = new KnownValue(400, "network");
/** 401 — `MainNet`: A cryptocurrency main network. */
export const MAIN_NET_VALUE: KnownValue = new KnownValue(401, "MainNet");
/** 402 — `TestNet`: A cryptocurrency test network. */
export const TEST_NET_VALUE: KnownValue = new KnownValue(402, "TestNet");

// Bitcoin
/** 500 — `BIP32Key`: A BIP-32 HD key. */
export const BIP32_KEY_TYPE: KnownValue = new KnownValue(500, "BIP32Key");
/** 501 — `chainCode`: Declares the chain code of a BIP-32 HD key. */
export const CHAIN_CODE: KnownValue = new KnownValue(501, "chainCode");
/** 502 — `DerivationPath`: A BIP-32 derivation path. */
export const DERIVATION_PATH_TYPE: KnownValue = new KnownValue(502, "DerivationPath");
/** 503 — `parentPath`: Declares the derivation path for a BIP-32 key. */
export const PARENT_PATH: KnownValue = new KnownValue(503, "parentPath");
/** 504 — `childrenPath`: Declares the allowable derivation paths from a BIP-32 key. */
export const CHILDREN_PATH: KnownValue = new KnownValue(504, "childrenPath");
/** 505 — `parentFingerprint`: Declares the parent fingerprint of a BIP-32 key. */
export const PARENT_FINGERPRINT: KnownValue = new KnownValue(505, "parentFingerprint");
/** 506 — `PSBT`: A Partially-Signed Bitcoin Transaction (PSBT). */
export const PSBT_TYPE: KnownValue = new KnownValue(506, "PSBT");
/** 507 — `OutputDescriptor`: A Bitcoin output descriptor. */
export const OUTPUT_DESCRIPTOR_TYPE: KnownValue = new KnownValue(507, "OutputDescriptor");
/** 508 — `outputDescriptor`: Declares a Bitcoin output descriptor associated with the subject. */
export const OUTPUT_DESCRIPTOR: KnownValue = new KnownValue(508, "outputDescriptor");

// Graphs
/** 600 — `Graph`: A graph. All other assertions in the envelope must be either node or edge. */
export const GRAPH: KnownValue = new KnownValue(600, "Graph");
/** 601 — `SourceTargetGraph`: A graph with edges that have source and target assertions. */
export const SOURCE_TARGET_GRAPH: KnownValue = new KnownValue(601, "SourceTargetGraph");
/** 602 — `ParentChildGraph`: A graph with edges that have parent and child assertions. */
export const PARENT_CHILD_GRAPH: KnownValue = new KnownValue(602, "ParentChildGraph");
/** 603 — `Digraph`: A directed graph. Implies SourceTargetGraph. source and target are distinct. */
export const DIGRAPH: KnownValue = new KnownValue(603, "Digraph");
/** 604 — `AcyclicGraph`: A graph that does not admit cycles. Implies SourceTargetGraph. */
export const ACYCLIC_GRAPH: KnownValue = new KnownValue(604, "AcyclicGraph");
/** 605 — `Multigraph`: A multigraph (admits parallel edges). Implies SourceTargetGraph. */
export const MULTIGRAPH: KnownValue = new KnownValue(605, "Multigraph");
/** 606 — `Pseudograph`: A pseudograph (admits self-loops and parallel edges). Implies Multigraph. */
export const PSEUDOGRAPH: KnownValue = new KnownValue(606, "Pseudograph");
/** 607 — `GraphFragment`: A fragment of a graph. May have references to external nodes and edges that are not resolvable in the fragment. */
export const GRAPH_FRAGMENT: KnownValue = new KnownValue(607, "GraphFragment");
/** 608 — `DAG`: A directed acyclic graph. Implies Digraph and AcyclicGraph. */
export const DAG: KnownValue = new KnownValue(608, "DAG");
/** 609 — `Tree`: A tree. Implies ParentChildGraph. Exactly one node must have no parent. All other nodes must have exactly one parent. */
export const TREE: KnownValue = new KnownValue(609, "Tree");
/** 610 — `Forest`: A forest (set of trees). Implies ParentChildGraph. */
export const FOREST: KnownValue = new KnownValue(610, "Forest");
/** 611 — `CompoundGraph`: A compound graph (a graph with subgraphs). Implies Forest and SourceTargetGraph. */
export const COMPOUND_GRAPH: KnownValue = new KnownValue(611, "CompoundGraph");
/** 612 — `Hypergraph`: An undirected hypergraph (edges may connect more than two nodes). */
export const HYPERGRAPH: KnownValue = new KnownValue(612, "Hypergraph");
/** 613 — `Dihypergraph`: A directed hypergraph (edges may connect more than two nodes and have a direction). Implies Hypergraph and Digraph. */
export const DIHYPERGRAPH: KnownValue = new KnownValue(613, "Dihypergraph");
/** 700 — `node`: A node in a graph. */
export const NODE: KnownValue = new KnownValue(700, "node");
/** 701 — `edge`: An edge in a graph. */
export const EDGE: KnownValue = new KnownValue(701, "edge");
/** 702 — `source`: Identifies the source node of the subject edge of a SourceTargetGraph. */
export const SOURCE: KnownValue = new KnownValue(702, "source");
/** 703 — `target`: Identifies the target node of the subject edge of a SourceTargetGraph. */
export const TARGET: KnownValue = new KnownValue(703, "target");
/** 704 — `parent`: Identifies the parent node of the subject edge of a ParentChildGraph. */
export const PARENT: KnownValue = new KnownValue(704, "parent");
/** 705 — `child`: Identifies a child node of the subject edge of a ParentChildGraph. */
export const CHILD: KnownValue = new KnownValue(705, "child");
/** 706 — `Self`: A reference to the subject itself. */
export const SELF: KnownValue = new KnownValue(706, "Self");

/** Every registry constant, in codepoint order. */
export const REGISTRY_CONSTANTS: readonly KnownValue[] = /*#__PURE__*/ Object.freeze([
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
]);
