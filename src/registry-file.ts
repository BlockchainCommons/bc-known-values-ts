/**
 * Registry-file reader.
 *
 * A registry file is parsed exactly as the reference parses it with
 * `serde_json::from_str::<RegistryFile>`: the same grammar, the same accepted
 * inputs, the same resulting values, and on failure the same message with the
 * same line and column. The reader is therefore a port of serde_json's
 * deserializer (`de.rs`, `read.rs`) and of the visitors serde derives for the
 * four structs, not a wrapper around `JSON.parse`.
 *
 * Positions are byte based: the text is read as UTF-8, `line` counts newline
 * bytes and `column` counts bytes since the last newline, like serde_json.
 *
 * @module registry-file
 */

import { KnownValuesError } from "./error.js";

/** One entry of a registry file. */
export interface RegistryEntry {
  /** The codepoint, an unsigned 64-bit integer. */
  readonly codepoint: bigint;
  /** The name. */
  readonly name: string;
  /** The entry type, when given and not `null`. */
  readonly type?: string;
  /** The URI, when given and not `null`. */
  readonly uri?: string;
  /** The description, when given and not `null`. */
  readonly description?: string;
}

/** The `ontology` block of a registry file. */
export interface OntologyInfo {
  /** The registry's name. */
  readonly name?: string;
  /** Its `source_url`. */
  readonly sourceUrl?: string;
  /** Its `start_code_point`, an unsigned 64-bit integer. */
  readonly startCodePoint?: bigint;
  /** Its `processing_strategy`. */
  readonly processingStrategy?: string;
}

/** The `generated` block of a registry file. */
export interface GeneratedInfo {
  /** The generating tool. */
  readonly tool?: string;
}

/** A parsed registry file. */
export interface RegistryFile {
  /** The `ontology` block, when given and not `null`. */
  readonly ontology?: OntologyInfo;
  /** The `generated` block, when given and not `null`. */
  readonly generated?: GeneratedInfo;
  /** The entries, in file order; duplicates are kept. */
  readonly entries: readonly RegistryEntry[];
  /**
   * The `statistics` value, when given and not `null`: any JSON value, with
   * objects as plain objects (a repeated key keeps its last value), arrays as
   * arrays, JSON integers as `bigint`, JSON numbers with a fraction or an
   * exponent as `number`, and `null` as `null`.
   */
  readonly statistics?: unknown;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * A parse error before it becomes a `KnownValuesError`. `line === 0` marks an
 * error raised by a visitor (a type, length or field error) whose position is
 * filled in by the deserializer that receives it, as serde_json's
 * `fix_position` does; every error leaving the deserializer is positioned.
 */
class ParseError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number,
  ) {
    super(message);
  }

  /** The reference's `Display` text of a positioned error. */
  display(): string {
    return `${this.message} at line ${this.line} column ${this.column}`;
  }
}

/** A visitor error, positioned later. */
function dataError(message: string): ParseError {
  return new ParseError(message, 0, 0);
}

const EOF_WHILE_PARSING_LIST = "EOF while parsing a list";
const EOF_WHILE_PARSING_OBJECT = "EOF while parsing an object";
const EOF_WHILE_PARSING_STRING = "EOF while parsing a string";
const EOF_WHILE_PARSING_VALUE = "EOF while parsing a value";
const EXPECTED_COLON = "expected `:`";
const EXPECTED_LIST_COMMA_OR_END = "expected `,` or `]`";
const EXPECTED_OBJECT_COMMA_OR_END = "expected `,` or `}`";
const EXPECTED_SOME_IDENT = "expected ident";
const EXPECTED_SOME_VALUE = "expected value";
const INVALID_ESCAPE = "invalid escape";
const INVALID_NUMBER = "invalid number";
const NUMBER_OUT_OF_RANGE = "number out of range";
const CONTROL_CHARACTER_WHILE_PARSING_STRING =
  "control character (\\u0000-\\u001F) found while parsing a string";
const KEY_MUST_BE_A_STRING = "key must be a string";
const LONE_LEADING_SURROGATE_IN_HEX_ESCAPE = "lone leading surrogate in hex escape";
const TRAILING_COMMA = "trailing comma";
const TRAILING_CHARACTERS = "trailing characters";
const UNEXPECTED_END_OF_HEX_ESCAPE = "unexpected end of hex escape";
const RECURSION_LIMIT_EXCEEDED = "recursion limit exceeded";

// ---------------------------------------------------------------------------
// Rust renderings used in `invalid type` messages
// ---------------------------------------------------------------------------

/**
 * An `f64` as serde_json prints it: the shortest digits that round-trip,
 * positional notation when the decimal exponent is in `-5..=15` (always with
 * a fractional part), otherwise `d.ddde±x` with a signed, unpadded exponent.
 */
function formatFloat(value: number): string {
  const negative = value < 0 || Object.is(value, -0);
  const exponential = Math.abs(value).toExponential();
  const e = exponential.indexOf("e");
  const digits = exponential.slice(0, e).replace(".", "");
  const exponent = Number(exponential.slice(e + 1));
  let body: string;
  if (exponent < -5 || exponent > 15) {
    body = exponential;
  } else if (exponent < 0) {
    body = `0.${"0".repeat(-exponent - 1)}${digits}`;
  } else if (digits.length - 1 <= exponent) {
    body = `${digits}${"0".repeat(exponent - (digits.length - 1))}.0`;
  } else {
    body = `${digits.slice(0, exponent + 1)}.${digits.slice(exponent + 1)}`;
  }
  return negative ? `-${body}` : body;
}

/**
 * The code points that Rust's `Debug` for `str` writes as `\u{…}` (the
 * non-printable and grapheme-extending characters), as inclusive ranges
 * encoded pairwise in base 36: the gap after the previous range, a dot, and
 * the range's length; ranges separated by commas.
 */
const DEBUG_ESCAPED_RANGES =
  "0.v,2.0,1l.0,y.x,c.0,gi.33,8.1,6.3,7.0,1.0,k.0,68.6,4m.0,12.1,1e.1,3.19,1.0,1.1,1.1,1.8,r.3,6.g,a.a,1.0,1a.k,g.0,2t.7,1.5,2.1,1.3,w.1,1.0,u.s,2h.a,1.d,17.8,7.2,o.3,1.8,1.2,1.6,f.0,p.4,1.0,b.4,w.f,16.1k,1j.0,1.0,4.7,4.0,3.6,a.1,t.0,2.0,8.1,2.1,m.0,7.0,1.2,4.2,1.0,2.5,2.1,2.0,1.c,2.0,3.3,o.4,1.0,6.3,2.1,m.0,7.0,2.0,2.0,2.3,3.n,4.0,1.6,a.1,3.0,1.b,1.0,9.0,3.0,m.0,7.0,2.0,5.2,4.7,1.0,2.2,1.e,2.3,c.6,1.7,2.0,8.1,2.1,m.0,7.0,2.0,5.2,1.1,1.5,2.1,2.e,2.0,3.3,i.a,1.0,6.2,3.0,4.2,2.0,1.0,2.2,2.2,3.2,c.4,1.0,2.2,3.0,3.2,1.k,l.5,3.0,8.0,3.0,n.0,g.2,1.2,4.i,3.0,2.1,2.3,a.6,a.0,b.0,3.0,n.0,a.0,5.2,2.1,1.0,2.m,3.0,2.3,a.0,3.d,b.0,3.0,15.1,1.0,2.4,3.0,3.0,2.3,3.0,a.3,q.1,2.0,i.2,o.0,9.0,1.1,7.8,2.5,7.6,a.1,3.b,1c.0,2.a,8.7,d.10,2.0,1.0,5.0,o.0,1.0,a.0,2.8,1.1,5.0,1.8,a.1,4.v,o.1,r.0,1.0,1.0,e.0,10.h,1.4,1.1,5.1c,8.0,6.0,d.10,19.3,1.5,1.1,2.1,p.1,4.2,g.3,d.0,2.1,6.0,f.0,14.0,1.4,1.1,3z.1,6g.0,4.1,7.0,1.0,4.1,15.0,4.1,x.0,4.1,7.0,1.0,4.1,f.0,1l.0,4.1,1v.4,t.2,q.5,2e.1,6.1,hs.0,s.2,2h.6,i.c,j.2,2.8,i.d,d.0,3.e,1g.1,1.6,8.0,2.a,9.2,a.5,a.5,b.4,a.5,2h.6,5.1,y.0,1.4,1y.9,v.3,4.1,3.3,2.0,6.6,1.2,16.1,5.a,18.3,q.5,b.2,1l.1,2.2,1k.0,1.8,1.0,2.7,6.c,a.5,a.5,e.2d,1c.9,4.2,8.0,t.8,c.1,w.3,2.5,1k.0,1.1,3.0,1.c,1c.7,2.4,f.2,1q.4,17.1,b.a,1.c,1.6,4.0,6.0,3.1,1.4,5c.1r,7q.1,6.1,12.1,6.1,8.0,1.0,1.0,1.0,v.1,1h.0,f.0,e.1,6.0,j.1,3.0,9.g,o.7,1b.g,2.1,r.0,d.2,y.1p,3w.3,ii.l,b.k,1ec.1,ah.2,2.4,19.0,1.4,1.1,1k.6,2.e,n.8,7.0,7.0,7.0,7.0,7.0,7.0,7.0,7.w,2m.x,q.0,2h.b,5y.p,g.0,15.5,g.0,2e.3,2t.4,17.0,1f.0,16.0,2e.8,1c.0,mlp.2,1j.8,9o.j,1b.3,1.9,w.1,28.1,6.7,65.j,h.0,3.0,4.0,p.1,5.3,a.5,1k.7,1w.9,c.n,d.0,12.7,p.a,1.b,u.5,1c.0,2.3,2.1,2.0,d.0,b.3,7.0,p.0,15.5,2.1,2.a,3.0,8.0,1.1,a.1,w.0,1f.0,1.2,2.1,5.1,1.0,1.n,h.1,8.a,6.1,6.1,6.8,7.0,7.0,1o.3,39.0,2.0,4.2,a.5,8mc.b,n.3,1d.6ir,a6.1,2y.11,7.b,5.4,1.0,o.0,5.0,1.0,2.0,2.0,i2.v,g.f,a.l,z.0,j.0,4.3,5.0,3r.3,4d.2,u.2,6.1,6.1,6.1,3.2,7.0,7.c,2.1,c.0,q.0,j.0,2.0,f.1,e.x,3f.4,3.3,19.2,2g.0,d.2,1.1a,19.3m,t.2,1d.f,r.3,10.8,u.4,12.9,u.0,11.3,e.15,4e.1,a.5,10.3,10.3,14.7,1g.a,c.0,f.0,7.0,2.0,b.0,f.0,7.0,2.2,1g.b,8n.8,m.9,8.n,6.0,16.0,9.1w,6.1,1.0,18.0,2.2,1.1,n.0,20.7,9.1b,j.0,2.4,x.2,r.4,r.11,1k.3,k.1,1b.e,4.0,3.0,t.9,9.6,9.6,1s.v,11.5,c.8,1i.2,t.1,r.4,q.6,4.b,7.27,21.1i,1f.c,1f.6,16.b,a.5,12.7,o.7,2.5r,v.0,16.2,1.1,2.f,6.7,9.12,14.7,m.a,9.l,i.3,4.11,s.j,n.8,1.0,1i.e,7.3,u.0,2.1,1.b,1d.3,2.1,2.0,4.d,p.6,a.8,10.4,1.8,i.7,z.0,3.a,1g.8,1.0,8.3,2.0,g.0,k.a,i.0,s.2,2.3,6.0,2.1q,7.0,1.0,4.0,f.0,b.5,1b.0,3.c,a.7,2.0,8.1,2.1,m.0,7.0,2.0,5.2,1.0,1.0,4.1,2.1,2.2,1.b,7.r,a.0,1.1,1.0,12.0,1.0,2.e,1.0,2.2,1.0,3.0,2.12,1k.7,2.2,1.0,l.0,1.0,3.t,1c.0,2.5,1.0,2.0,1.1,1.1,4.7,a.4l,1b.0,2.5,4.1,1.1,r.z,1f.7,2.0,1.1,4.a,a.5,d.i,17.0,1.0,2.7,2.5,a.5,k.r,r.2,1.0,2.3,1.8,n.54,1b.8,1.1,1.2r,2b.b,8.1,1.1,8.0,2.0,o.0,5.0,2.5,4.0,3.8,a.1x,8.1,16.7,4.0,4.q,1.9,14.5,2.3,8.8,1.5,2.2,1a.c,1.1,9.c,21.6,a.2e,1.2,1.0,1.2f,y.d,a.5,9.0,12.d,1.0,6.9,t.2,w.o,1.6,1.1,1.22,7.0,2.0,12.k,1.8,a.5,6.0,2.0,11.3,2.0,1.0,1.6,a.5,18.3,a.6t,j.1,4.8,f.0,10.7,2.2,n.2d,1.e,1e.c,pn.2t,33.0,5.a,5g.217,2r.c,ts.g,6.o,32z.4,g7.5a0,u.b,3.2,a.1c5,ft.6,v.0,a.3,29.0,a.5,u.6,1.9,1c.6,f.9,a.0,7.0,l.4,j.bz,1m.5h,2j.4,p.1,p.17,23.4,1k.a,d.1r,4.d,5.8,5p2.14,w.2o,37.6po,4.0,7.0,2.0,83.e,1.s,3.1,1.d,4.7,b0.1s3,2z.4,d.2,9.6,a.1,1.1,1.31b,71.2,c4.5,n.e,h.2m,38.1n,6u.9,13.1,1o.4,3.l,2.6,u.3,1p.k,1u.2,1.3d,k.b,k.b,2f.8,p.3q,2d.0,1z.0,2.1,1.1,2.1,4.0,c.0,1.0,7.0,1t.0,4.1,8.0,7.0,s.0,4.0,5.0,1.2,7.0,9g.1,84.1,fm.1i,4.1d,8.0,e.0,7.vn,v.5,6.78,1q.41,19.9,7.1,a.3,2.8v,u.h,18.3,a.4,1.cv,s.3,a.5x,u.1,b.3,1.5b,v.0,3.0,2.0,7.1,5.8,2.67,7.0,4.0,2.0,f.0,5h.1,9.1b,1w.6,1.3,a.3,2.ls,1w.23,1p.5d,4.0,r.0,2.0,1.1,1.0,a.0,4.0,1.0,1.5,1.3,1.0,1.0,1.0,3.0,2.0,1.1,1.0,1.0,1.0,1.0,1.0,2.0,1.1,4.0,7.0,4.0,4.0,1.0,a.0,h.4,3.0,5.0,h.1f,2.7h,18.3,2s.b,f.1,f.0,f.0,11.9,4u.1j,t.c,18.3,9.6,2.d,6.49,rd.2,h.2,d.2,62.5,c.3,1.e,c.3,1k.7,a.5,14.7,u.1,c.3,2.d,9.12,9k.7,e.1,d.2,b.2,1l.0,1.3,g.1,c.3,a.6,43.0,2v.sk,wyo.v,3dq.1,4ge.1,5rl.e,ha.1wh,f2.15t,3t7.4,6ju.jdl1";

/** The decoded table: `[start0, end0, start1, end1, …]`, ascending. */
let debugEscapedBounds: number[] | undefined;

function isDebugEscaped(codePoint: number): boolean {
  if (debugEscapedBounds === undefined) {
    debugEscapedBounds = [];
    let previousEnd = -1;
    for (const pair of DEBUG_ESCAPED_RANGES.split(",")) {
      const dot = pair.indexOf(".");
      const start = previousEnd + 1 + parseInt(pair.slice(0, dot), 36);
      const end = start + parseInt(pair.slice(dot + 1), 36);
      debugEscapedBounds.push(start, end);
      previousEnd = end;
    }
  }
  const bounds = debugEscapedBounds;
  let low = 0;
  let high = bounds.length / 2;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (bounds[2 * middle + 1] < codePoint) low = middle + 1;
    else high = middle;
  }
  return low < bounds.length / 2 && bounds[2 * low] <= codePoint;
}

/** A string as Rust's `Debug` for `str` prints it. */
function formatDebugStr(text: string): string {
  let out = '"';
  for (const character of text) {
    const codePoint =
      character.length === 1
        ? character.charCodeAt(0)
        : 0x10000 + ((character.charCodeAt(0) - 0xd800) << 10) + (character.charCodeAt(1) - 0xdc00);
    switch (codePoint) {
      case 0x00:
        out += "\\0";
        break;
      case 0x09:
        out += "\\t";
        break;
      case 0x0a:
        out += "\\n";
        break;
      case 0x0d:
        out += "\\r";
        break;
      case 0x22:
        out += '\\"';
        break;
      case 0x5c:
        out += "\\\\";
        break;
      default:
        out += isDebugEscaped(codePoint) ? `\\u{${codePoint.toString(16)}}` : character;
    }
  }
  return `${out}"`;
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/** A parsed number: an exact `u64`, a negative `i64`, or an `f64`. */
type ParserNumber =
  | { readonly kind: "u64" | "i64"; readonly value: bigint }
  | { readonly kind: "f64"; readonly value: number };

/** serde's `Unexpected` rendering of a number. */
function unexpectedNumber(number: ParserNumber): string {
  return number.kind === "f64"
    ? `floating point \`${formatFloat(number.value)}\``
    : `integer \`${number.value}\``;
}

/** `u64::MAX / 10` and `u64::MAX % 10`, the digit-accumulation overflow guard. */
const U64_MAX_DIV_10 = 1844674407370955161n;
const U64_MAX_MOD_10 = 5n;
/** `i32::MAX / 10` and `i32::MAX % 10`, the exponent-accumulation overflow guard. */
const I32_MAX_DIV_10 = 214748364;
const I32_MAX_MOD_10 = 7;
const I32_MIN = -2147483648;
const I32_MAX = 2147483647;

/** `10^0 … 10^308` as `f64`s. */
const POW10: readonly number[] = Array.from({ length: 309 }, (_, i) => Number(`1e${i}`));

function saturatingAddI32(a: number, b: number): number {
  return Math.min(I32_MAX, Math.max(I32_MIN, a + b));
}

const TAB = 0x09;
const NEWLINE = 0x0a;
const CARRIAGE_RETURN = 0x0d;
const SPACE = 0x20;
const QUOTE = 0x22;
const PLUS = 0x2b;
const COMMA = 0x2c;
const MINUS = 0x2d;
const DOT = 0x2e;
const SLASH = 0x2f;
const ZERO = 0x30;
const NINE = 0x39;
const COLON = 0x3a;
const UPPER_E = 0x45;
const LEFT_BRACKET = 0x5b;
const BACKSLASH = 0x5c;
const RIGHT_BRACKET = 0x5d;
const LOWER_B = 0x62;
const LOWER_E = 0x65;
const LOWER_F = 0x66;
const LOWER_N = 0x6e;
const LOWER_R = 0x72;
const LOWER_T = 0x74;
const LOWER_U = 0x75;
const LEFT_BRACE = 0x7b;
const RIGHT_BRACE = 0x7d;

function isDigit(byte: number): boolean {
  return byte >= ZERO && byte <= NINE;
}

function hexValue(byte: number): number {
  if (byte >= 0x30 && byte <= 0x39) return byte - 0x30;
  if (byte >= 0x41 && byte <= 0x46) return byte - 0x41 + 10;
  if (byte >= 0x61 && byte <= 0x66) return byte - 0x61 + 10;
  return -1;
}

/** Appends the UTF-8 encoding of a Unicode scalar value. */
function pushUtf8(out: number[], codePoint: number): void {
  if (codePoint < 0x80) {
    out.push(codePoint);
  } else if (codePoint < 0x800) {
    out.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
  } else if (codePoint < 0x10000) {
    out.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
  } else {
    out.push(
      0xf0 | (codePoint >> 18),
      0x80 | ((codePoint >> 12) & 0x3f),
      0x80 | ((codePoint >> 6) & 0x3f),
      0x80 | (codePoint & 0x3f),
    );
  }
}

/** Decodes UTF-8 without dropping a leading byte-order mark. */
const UTF8 = new TextDecoder("utf-8", { ignoreBOM: true });

// ---------------------------------------------------------------------------
// Struct descriptions (what serde derives for the four structs)
// ---------------------------------------------------------------------------

interface FieldSpec {
  /** The JSON name. */
  readonly name: string;
  /** Reads the value after the colon. */
  readonly read: (de: Deserializer) => unknown;
  /** An `Option`: absent from an object means `undefined`. */
  readonly optional: boolean;
  /** `#[serde(default)]`: absent from an object or an array means `undefined`. */
  readonly defaulted: boolean;
}

interface StructSpec<T> {
  /** The Rust type name, as `expected struct <name>` shows it. */
  readonly name: string;
  readonly fields: readonly FieldSpec[];
  /** Builds the value from the field values, in `fields` order. */
  readonly build: (values: readonly unknown[]) => T;
}

/** A tracker of whether the first element or key of a container was seen. */
interface Access {
  first: boolean;
}

// ---------------------------------------------------------------------------
// The deserializer (serde_json's `Deserializer<StrRead>`)
// ---------------------------------------------------------------------------

class Deserializer {
  private readonly bytes: Uint8Array;
  /** Index of the next byte `next()` or `peek()` returns. */
  private index = 0;
  private remainingDepth = 128;
  private readonly scratch: number[] = [];

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  // -- Reading -------------------------------------------------------------

  private peek(): number | undefined {
    return this.index < this.bytes.length ? this.bytes[this.index] : undefined;
  }

  private next(): number | undefined {
    return this.index < this.bytes.length ? this.bytes[this.index++] : undefined;
  }

  private discard(): void {
    this.index += 1;
  }

  /** The next byte, or `0` at the end. */
  private peekOrNull(): number {
    return this.peek() ?? 0;
  }

  /** Consumes and returns the next byte, or `0` at the end. */
  private nextOrNull(): number {
    return this.next() ?? 0;
  }

  /** The first byte of a value, past whitespace. */
  private parseValueStart(): number {
    const byte = this.parseWhitespace();
    if (byte === undefined) throw this.peekError(EOF_WHILE_PARSING_VALUE);
    return byte;
  }

  private positionOfIndex(i: number): { line: number; column: number } {
    let startOfLine = 0;
    let line = 1;
    for (let k = 0; k < i; k += 1) {
      if (this.bytes[k] === NEWLINE) {
        startOfLine = k + 1;
        line += 1;
      }
    }
    return { line, column: i - startOfLine };
  }

  /** An error caused by the byte `next()` returned. */
  private error(message: string): ParseError {
    const { line, column } = this.positionOfIndex(this.index);
    return new ParseError(message, line, column);
  }

  /** An error caused by the byte `peek()` returned. */
  private peekError(message: string): ParseError {
    const { line, column } = this.positionOfIndex(Math.min(this.bytes.length, this.index + 1));
    return new ParseError(message, line, column);
  }

  /** Gives a visitor error the position of the byte last consumed. */
  private fixPosition(failure: ParseError): ParseError {
    return failure.line === 0 ? this.error(failure.message) : failure;
  }

  private parseWhitespace(): number | undefined {
    for (;;) {
      const byte = this.peek();
      if (byte === SPACE || byte === NEWLINE || byte === TAB || byte === CARRIAGE_RETURN) {
        this.discard();
      } else {
        return byte;
      }
    }
  }

  /** Rejects anything but whitespace after the top-level value. */
  end(): void {
    if (this.parseWhitespace() !== undefined) throw this.peekError(TRAILING_CHARACTERS);
  }

  private parseIdent(ident: string): void {
    for (let k = 0; k < ident.length; k += 1) {
      const byte = this.next();
      if (byte === undefined) throw this.error(EOF_WHILE_PARSING_VALUE);
      if (byte !== ident.charCodeAt(k)) throw this.error(EXPECTED_SOME_IDENT);
    }
  }

  /**
   * The `invalid type` error for a value of the wrong kind starting with the
   * peeked `byte`, consuming the value when it is a scalar so that the
   * position is the one serde_json reports.
   */
  private peekInvalidType(byte: number, expected: string): ParseError {
    let unexpected: string;
    if (byte === LOWER_N) {
      this.discard();
      this.parseIdent("ull");
      unexpected = "null";
    } else if (byte === LOWER_T) {
      this.discard();
      this.parseIdent("rue");
      unexpected = "boolean `true`";
    } else if (byte === LOWER_F) {
      this.discard();
      this.parseIdent("alse");
      unexpected = "boolean `false`";
    } else if (byte === MINUS) {
      this.discard();
      unexpected = unexpectedNumber(this.parseInteger(false));
    } else if (isDigit(byte)) {
      unexpected = unexpectedNumber(this.parseInteger(true));
    } else if (byte === QUOTE) {
      this.discard();
      unexpected = `string ${formatDebugStr(this.parseStr())}`;
    } else if (byte === LEFT_BRACKET) {
      unexpected = "sequence";
    } else if (byte === LEFT_BRACE) {
      unexpected = "map";
    } else {
      return this.peekError(EXPECTED_SOME_VALUE);
    }
    return this.fixPosition(dataError(`invalid type: ${unexpected}, expected ${expected}`));
  }

  // -- Numbers -------------------------------------------------------------

  private parseInteger(positive: boolean): ParserNumber {
    const first = this.next();
    if (first === undefined) throw this.error(EOF_WHILE_PARSING_VALUE);
    if (first === ZERO) {
      // There can be only one leading '0'.
      if (isDigit(this.peekOrNull())) throw this.peekError(INVALID_NUMBER);
      return this.parseNumber(positive, 0n);
    }
    if (!isDigit(first)) throw this.error(INVALID_NUMBER);
    let significand = BigInt(first - ZERO);
    for (;;) {
      const byte = this.peekOrNull();
      if (!isDigit(byte)) return this.parseNumber(positive, significand);
      const digit = BigInt(byte - ZERO);
      // Kept as a u64 until it would overflow, then continued as an f64.
      if (
        significand >= U64_MAX_DIV_10 &&
        (significand > U64_MAX_DIV_10 || digit > U64_MAX_MOD_10)
      ) {
        return { kind: "f64", value: this.parseLongInteger(positive, significand) };
      }
      this.discard();
      significand = significand * 10n + digit;
    }
  }

  private parseNumber(positive: boolean, significand: bigint): ParserNumber {
    const byte = this.peekOrNull();
    if (byte === DOT) {
      return { kind: "f64", value: this.parseDecimal(positive, significand, 0) };
    }
    if (byte === LOWER_E || byte === UPPER_E) {
      return { kind: "f64", value: this.parseExponent(positive, significand, 0) };
    }
    if (positive) return { kind: "u64", value: significand };
    // `(significand as i64).wrapping_neg()`: an f64 on underflow or `-0`.
    const negated = BigInt.asIntN(64, -BigInt.asIntN(64, significand));
    if (negated >= 0n) return { kind: "f64", value: -Number(significand) };
    return { kind: "i64", value: negated };
  }

  private parseDecimal(
    positive: boolean,
    significand: bigint,
    exponentBeforeDecimalPoint: number,
  ): number {
    this.discard();
    let exponentAfterDecimalPoint = 0;
    for (;;) {
      const byte = this.peekOrNull();
      if (!isDigit(byte)) break;
      const digit = BigInt(byte - ZERO);
      if (
        significand >= U64_MAX_DIV_10 &&
        (significand > U64_MAX_DIV_10 || digit > U64_MAX_MOD_10)
      ) {
        const exponent = exponentBeforeDecimalPoint + exponentAfterDecimalPoint;
        return this.parseDecimalOverflow(positive, significand, exponent);
      }
      this.discard();
      significand = significand * 10n + digit;
      exponentAfterDecimalPoint -= 1;
    }
    // At least one digit must follow the decimal point.
    if (exponentAfterDecimalPoint === 0) {
      if (this.peek() !== undefined) throw this.peekError(INVALID_NUMBER);
      throw this.peekError(EOF_WHILE_PARSING_VALUE);
    }
    const exponent = exponentBeforeDecimalPoint + exponentAfterDecimalPoint;
    const byte = this.peekOrNull();
    if (byte === LOWER_E || byte === UPPER_E) {
      return this.parseExponent(positive, significand, exponent);
    }
    return this.f64FromParts(positive, significand, exponent);
  }

  private parseExponent(positive: boolean, significand: bigint, startingExp: number): number {
    this.discard();
    let positiveExp = true;
    const sign = this.peekOrNull();
    if (sign === PLUS) {
      this.discard();
    } else if (sign === MINUS) {
      this.discard();
      positiveExp = false;
    }
    const first = this.next();
    if (first === undefined) throw this.error(EOF_WHILE_PARSING_VALUE);
    // A digit must follow the exponent place.
    if (!isDigit(first)) throw this.error(INVALID_NUMBER);
    let exp = first - ZERO;
    for (;;) {
      const byte = this.peekOrNull();
      if (!isDigit(byte)) break;
      this.discard();
      const digit = byte - ZERO;
      if (exp >= I32_MAX_DIV_10 && (exp > I32_MAX_DIV_10 || digit > I32_MAX_MOD_10)) {
        return this.parseExponentOverflow(positive, significand === 0n, positiveExp);
      }
      exp = exp * 10 + digit;
    }
    const finalExp = saturatingAddI32(startingExp, positiveExp ? exp : -exp);
    return this.f64FromParts(positive, significand, finalExp);
  }

  private f64FromParts(positive: boolean, significand: bigint, exponent: number): number {
    let f = Number(significand);
    for (;;) {
      const magnitude = Math.abs(exponent);
      if (magnitude <= 308) {
        const pow = POW10[magnitude];
        if (exponent >= 0) {
          f *= pow;
          if (!Number.isFinite(f)) throw this.error(NUMBER_OUT_OF_RANGE);
        } else {
          f /= pow;
        }
        break;
      }
      if (f === 0) break;
      if (exponent >= 0) throw this.error(NUMBER_OUT_OF_RANGE);
      f /= 1e308;
      exponent += 308;
    }
    return positive ? f : -f;
  }

  /** The digits after a significand that no longer fits a u64. */
  private parseLongInteger(positive: boolean, significand: bigint): number {
    let exponent = 0;
    for (;;) {
      const byte = this.peekOrNull();
      if (isDigit(byte)) {
        this.discard();
        exponent += 1;
      } else if (byte === DOT) {
        return this.parseDecimal(positive, significand, exponent);
      } else if (byte === LOWER_E || byte === UPPER_E) {
        return this.parseExponent(positive, significand, exponent);
      } else {
        return this.f64FromParts(positive, significand, exponent);
      }
    }
  }

  /** The fraction digits past the point where the significand fills a u64. */
  private parseDecimalOverflow(positive: boolean, significand: bigint, exponent: number): number {
    while (isDigit(this.peekOrNull())) this.discard();
    const byte = this.peekOrNull();
    if (byte === LOWER_E || byte === UPPER_E) {
      return this.parseExponent(positive, significand, exponent);
    }
    return this.f64FromParts(positive, significand, exponent);
  }

  /** An exponent that no longer fits an i32: an error or zero, never an infinity. */
  private parseExponentOverflow(
    positive: boolean,
    zeroSignificand: boolean,
    positiveExp: boolean,
  ): number {
    if (!zeroSignificand && positiveExp) throw this.error(NUMBER_OUT_OF_RANGE);
    while (isDigit(this.peekOrNull())) this.discard();
    return positive ? 0 : -0;
  }

  // -- Strings -------------------------------------------------------------

  /** Advances to the next `"`, `\` or control character, or to the end. */
  private skipToEscape(): void {
    while (this.index < this.bytes.length) {
      const byte = this.bytes[this.index];
      if (byte === QUOTE || byte === BACKSLASH || byte < 0x20) return;
      this.index += 1;
    }
  }

  /** Parses a string after its opening quote, with escapes expanded and validated. */
  private parseStr(): string {
    this.scratch.length = 0;
    let start = this.index;
    for (;;) {
      this.skipToEscape();
      if (this.index === this.bytes.length) throw this.error(EOF_WHILE_PARSING_STRING);
      const byte = this.bytes[this.index];
      if (byte === QUOTE) {
        let text: string;
        if (this.scratch.length === 0) {
          text = UTF8.decode(this.bytes.subarray(start, this.index));
        } else {
          for (let k = start; k < this.index; k += 1) this.scratch.push(this.bytes[k]);
          text = UTF8.decode(Uint8Array.from(this.scratch));
        }
        this.index += 1;
        return text;
      }
      if (byte === BACKSLASH) {
        for (let k = start; k < this.index; k += 1) this.scratch.push(this.bytes[k]);
        this.index += 1;
        this.parseEscape();
        start = this.index;
      } else {
        this.index += 1;
        throw this.error(CONTROL_CHARACTER_WHILE_PARSING_STRING);
      }
    }
  }

  /** Skips a string after its opening quote, validating only its escapes' shape. */
  private ignoreStr(): void {
    for (;;) {
      this.skipToEscape();
      if (this.index === this.bytes.length) throw this.error(EOF_WHILE_PARSING_STRING);
      const byte = this.bytes[this.index];
      if (byte === QUOTE) {
        this.index += 1;
        return;
      }
      if (byte === BACKSLASH) {
        this.index += 1;
        this.ignoreEscape();
      } else {
        throw this.error(CONTROL_CHARACTER_WHILE_PARSING_STRING);
      }
    }
  }

  private nextOrEof(): number {
    const byte = this.next();
    if (byte === undefined) throw this.error(EOF_WHILE_PARSING_STRING);
    return byte;
  }

  private peekOrEof(): number {
    const byte = this.peek();
    if (byte === undefined) throw this.error(EOF_WHILE_PARSING_STRING);
    return byte;
  }

  /** Parses an escape after its backslash into `scratch`. */
  private parseEscape(): void {
    const byte = this.nextOrEof();
    switch (byte) {
      case QUOTE:
      case BACKSLASH:
      case SLASH:
        this.scratch.push(byte);
        break;
      case LOWER_B:
        this.scratch.push(0x08);
        break;
      case LOWER_F:
        this.scratch.push(0x0c);
        break;
      case LOWER_N:
        this.scratch.push(NEWLINE);
        break;
      case LOWER_R:
        this.scratch.push(CARRIAGE_RETURN);
        break;
      case LOWER_T:
        this.scratch.push(TAB);
        break;
      case LOWER_U:
        this.parseUnicodeEscape();
        break;
      default:
        throw this.error(INVALID_ESCAPE);
    }
  }

  /** Four hex digits after `\u`. */
  private decodeHexEscape(): number {
    if (this.index + 4 > this.bytes.length) {
      this.index = this.bytes.length;
      throw this.error(EOF_WHILE_PARSING_STRING);
    }
    const a = hexValue(this.bytes[this.index]);
    const b = hexValue(this.bytes[this.index + 1]);
    const c = hexValue(this.bytes[this.index + 2]);
    const d = hexValue(this.bytes[this.index + 3]);
    this.index += 4;
    if (a < 0 || b < 0 || c < 0 || d < 0) throw this.error(INVALID_ESCAPE);
    return (a << 12) | (b << 8) | (c << 4) | d;
  }

  /** A `\u` escape after its `\u`, with a surrogate pair required to be complete. */
  private parseUnicodeEscape(): void {
    const n = this.decodeHexEscape();
    if (n >= 0xdc00 && n <= 0xdfff) throw this.error(LONE_LEADING_SURROGATE_IN_HEX_ESCAPE);
    if (n < 0xd800 || n > 0xdbff) {
      pushUtf8(this.scratch, n);
      return;
    }
    // A leading surrogate: a trailing surrogate escape must follow.
    if (this.peekOrEof() !== BACKSLASH) {
      this.discard();
      throw this.error(UNEXPECTED_END_OF_HEX_ESCAPE);
    }
    this.discard();
    if (this.peekOrEof() !== LOWER_U) {
      this.discard();
      throw this.error(UNEXPECTED_END_OF_HEX_ESCAPE);
    }
    this.discard();
    const n2 = this.decodeHexEscape();
    if (n2 < 0xdc00 || n2 > 0xdfff) throw this.error(LONE_LEADING_SURROGATE_IN_HEX_ESCAPE);
    pushUtf8(this.scratch, (((n - 0xd800) << 10) | (n2 - 0xdc00)) + 0x10000);
  }

  /** Skips an escape after its backslash; a `\u` needs four hex digits only. */
  private ignoreEscape(): void {
    const byte = this.nextOrEof();
    switch (byte) {
      case QUOTE:
      case BACKSLASH:
      case SLASH:
      case LOWER_B:
      case LOWER_F:
      case LOWER_N:
      case LOWER_R:
      case LOWER_T:
        break;
      case LOWER_U:
        this.decodeHexEscape();
        break;
      default:
        throw this.error(INVALID_ESCAPE);
    }
  }

  // -- Containers ----------------------------------------------------------

  private parseObjectColon(): void {
    const byte = this.parseWhitespace();
    if (byte === COLON) {
      this.discard();
    } else if (byte !== undefined) {
      throw this.peekError(EXPECTED_COLON);
    } else {
      throw this.peekError(EOF_WHILE_PARSING_OBJECT);
    }
  }

  private endSeq(): void {
    const byte = this.parseWhitespace();
    if (byte === RIGHT_BRACKET) {
      this.discard();
    } else if (byte === COMMA) {
      this.discard();
      if (this.parseWhitespace() === RIGHT_BRACKET) throw this.peekError(TRAILING_COMMA);
      throw this.peekError(TRAILING_CHARACTERS);
    } else if (byte !== undefined) {
      throw this.peekError(TRAILING_CHARACTERS);
    } else {
      throw this.peekError(EOF_WHILE_PARSING_LIST);
    }
  }

  private endMap(): void {
    const byte = this.parseWhitespace();
    if (byte === RIGHT_BRACE) {
      this.discard();
    } else if (byte === COMMA) {
      throw this.peekError(TRAILING_COMMA);
    } else if (byte !== undefined) {
      throw this.peekError(TRAILING_CHARACTERS);
    } else {
      throw this.peekError(EOF_WHILE_PARSING_OBJECT);
    }
  }

  private hasNextElement(seq: Access): boolean {
    const byte = this.parseWhitespace();
    if (byte === undefined) throw this.peekError(EOF_WHILE_PARSING_LIST);
    if (byte === RIGHT_BRACKET) return false;
    if (seq.first) {
      seq.first = false;
      return true;
    }
    if (byte === COMMA) {
      this.discard();
      const next = this.parseWhitespace();
      if (next === RIGHT_BRACKET) throw this.peekError(TRAILING_COMMA);
      if (next === undefined) throw this.peekError(EOF_WHILE_PARSING_VALUE);
      return true;
    }
    throw this.peekError(EXPECTED_LIST_COMMA_OR_END);
  }

  private hasNextKey(map: Access): boolean {
    const byte = this.parseWhitespace();
    if (byte === undefined) throw this.peekError(EOF_WHILE_PARSING_OBJECT);
    if (byte === RIGHT_BRACE) return false;
    if (map.first) {
      map.first = false;
      if (byte === QUOTE) return true;
      throw this.peekError(KEY_MUST_BE_A_STRING);
    }
    if (byte === COMMA) {
      this.discard();
      const next = this.parseWhitespace();
      if (next === QUOTE) return true;
      if (next === RIGHT_BRACE) throw this.peekError(TRAILING_COMMA);
      if (next === undefined) throw this.peekError(EOF_WHILE_PARSING_VALUE);
      throw this.peekError(KEY_MUST_BE_A_STRING);
    }
    throw this.peekError(EXPECTED_OBJECT_COMMA_OR_END);
  }

  /** The next key, or `undefined` at the closing brace. */
  private nextKey(map: Access): string | undefined {
    if (!this.hasNextKey(map)) return undefined;
    this.discard();
    return this.parseStr();
  }

  /**
   * Runs `visit` on the array or object whose opening bracket is the peeked
   * byte, under the recursion limit, then consumes the closing bracket. The
   * closing bracket is consumed even after a failed visit, and a visitor
   * error takes its position after that.
   */
  private nested<T>(visit: () => T, end: () => void): T {
    this.remainingDepth -= 1;
    if (this.remainingDepth === 0) throw this.peekError(RECURSION_LIMIT_EXCEEDED);
    this.discard();
    let result: T | undefined;
    let failure: ParseError | undefined;
    try {
      result = visit();
    } catch (e) {
      failure = e as ParseError;
    }
    this.remainingDepth += 1;
    try {
      end();
    } catch (e) {
      failure ??= e as ParseError;
    }
    if (failure !== undefined) throw this.fixPosition(failure);
    return result as T;
  }

  private nestedSeq<T>(visit: () => T): T {
    return this.nested(visit, () => {
      this.endSeq();
    });
  }

  private nestedMap<T>(visit: () => T): T {
    return this.nested(visit, () => {
      this.endMap();
    });
  }

  // -- Deserialize implementations ----------------------------------------

  /** `u64`. */
  deserializeU64(): bigint {
    const byte = this.parseValueStart();
    let number: ParserNumber;
    if (byte === MINUS) {
      this.discard();
      number = this.parseInteger(false);
    } else if (isDigit(byte)) {
      number = this.parseInteger(true);
    } else {
      throw this.peekInvalidType(byte, "u64");
    }
    if (number.kind === "u64") return number.value;
    const problem = number.kind === "i64" ? "invalid value" : "invalid type";
    throw this.fixPosition(dataError(`${problem}: ${unexpectedNumber(number)}, expected u64`));
  }

  /** `String`. */
  deserializeString(): string {
    const byte = this.parseValueStart();
    if (byte !== QUOTE) throw this.peekInvalidType(byte, "a string");
    this.discard();
    return this.parseStr();
  }

  /** `Option<T>`: `null` is `undefined`, anything else is read by `some`. */
  deserializeOption<T>(some: () => T): T | undefined {
    if (this.parseWhitespace() === LOWER_N) {
      this.discard();
      this.parseIdent("ull");
      return undefined;
    }
    return some();
  }

  /** `Vec<T>`. */
  deserializeSeq<T>(element: () => T): T[] {
    const byte = this.parseValueStart();
    if (byte !== LEFT_BRACKET) throw this.peekInvalidType(byte, "a sequence");
    return this.nestedSeq(() => {
      const values: T[] = [];
      const seq: Access = { first: true };
      while (this.hasNextElement(seq)) values.push(element());
      return values;
    });
  }

  /** A derived struct, from an object or from an array of its fields in order. */
  deserializeStruct<T>(spec: StructSpec<T>): T {
    const byte = this.parseValueStart();
    if (byte === LEFT_BRACKET) return this.nestedSeq(() => this.visitStructSeq(spec));
    if (byte === LEFT_BRACE) return this.nestedMap(() => this.visitStructMap(spec));
    throw this.peekInvalidType(byte, `struct ${spec.name}`);
  }

  private visitStructMap<T>(spec: StructSpec<T>): T {
    const values: unknown[] = spec.fields.map(() => undefined);
    const seen: boolean[] = spec.fields.map(() => false);
    const map: Access = { first: true };
    for (;;) {
      const key = this.nextKey(map);
      if (key === undefined) break;
      const i = spec.fields.findIndex((field) => field.name === key);
      if (i < 0) {
        this.parseObjectColon();
        this.ignoreValue();
      } else {
        if (seen[i]) throw dataError(`duplicate field \`${key}\``);
        this.parseObjectColon();
        values[i] = spec.fields[i].read(this);
        seen[i] = true;
      }
    }
    spec.fields.forEach((field, i) => {
      if (!seen[i] && !field.optional && !field.defaulted) {
        throw dataError(`missing field \`${field.name}\``);
      }
    });
    return spec.build(values);
  }

  private visitStructSeq<T>(spec: StructSpec<T>): T {
    const values: unknown[] = [];
    const seq: Access = { first: true };
    const count = spec.fields.length;
    const expecting = `struct ${spec.name} with ${count} element${count === 1 ? "" : "s"}`;
    for (const [i, field] of spec.fields.entries()) {
      if (this.hasNextElement(seq)) {
        values.push(field.read(this));
      } else if (field.defaulted) {
        values.push(undefined);
      } else {
        throw dataError(`invalid length ${i}, expected ${expecting}`);
      }
    }
    return spec.build(values);
  }

  /** `serde_json::Value`. */
  deserializeValue(): unknown {
    const byte = this.parseValueStart();
    if (byte === LOWER_N) {
      this.discard();
      this.parseIdent("ull");
      return null;
    }
    if (byte === LOWER_T) {
      this.discard();
      this.parseIdent("rue");
      return true;
    }
    if (byte === LOWER_F) {
      this.discard();
      this.parseIdent("alse");
      return false;
    }
    if (byte === MINUS) {
      this.discard();
      return this.parseInteger(false).value;
    }
    if (isDigit(byte)) return this.parseInteger(true).value;
    if (byte === QUOTE) {
      this.discard();
      return this.parseStr();
    }
    if (byte === LEFT_BRACKET) {
      return this.nestedSeq(() => {
        const values: unknown[] = [];
        const seq: Access = { first: true };
        while (this.hasNextElement(seq)) values.push(this.deserializeValue());
        return values;
      });
    }
    if (byte === LEFT_BRACE) {
      return this.nestedMap(() => {
        const object: Record<string, unknown> = {};
        const map: Access = { first: true };
        for (;;) {
          const key = this.nextKey(map);
          if (key === undefined) return object;
          this.parseObjectColon();
          const value = this.deserializeValue();
          Object.defineProperty(object, key, {
            value,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
      });
    }
    throw this.peekError(EXPECTED_SOME_VALUE);
  }

  /** `IgnoredAny`: skips one value of any shape, without a depth limit. */
  private ignoreValue(): void {
    const stack: number[] = [];
    let enclosing: number | undefined;
    for (;;) {
      const byte = this.parseValueStart();
      let frame: number | undefined;
      if (byte === LOWER_N) {
        this.discard();
        this.parseIdent("ull");
      } else if (byte === LOWER_T) {
        this.discard();
        this.parseIdent("rue");
      } else if (byte === LOWER_F) {
        this.discard();
        this.parseIdent("alse");
      } else if (byte === MINUS) {
        this.discard();
        this.ignoreInteger();
      } else if (isDigit(byte)) {
        this.ignoreInteger();
      } else if (byte === QUOTE) {
        this.discard();
        this.ignoreStr();
      } else if (byte === LEFT_BRACKET || byte === LEFT_BRACE) {
        if (enclosing !== undefined) stack.push(enclosing);
        this.discard();
        frame = byte;
      } else {
        throw this.peekError(EXPECTED_SOME_VALUE);
      }

      let acceptComma: boolean;
      if (frame !== undefined) {
        acceptComma = false;
      } else if (enclosing !== undefined) {
        frame = enclosing;
        acceptComma = true;
      } else {
        // A bare scalar: the enclosing frame is restored after every iteration.
        return;
      }

      for (;;) {
        const next = this.parseWhitespace();
        if (next === undefined) {
          throw this.peekError(
            frame === LEFT_BRACKET ? EOF_WHILE_PARSING_LIST : EOF_WHILE_PARSING_OBJECT,
          );
        }
        if (next === COMMA && acceptComma) {
          this.discard();
          break;
        }
        const closes =
          (next === RIGHT_BRACKET && frame === LEFT_BRACKET) ||
          (next === RIGHT_BRACE && frame === LEFT_BRACE);
        if (!closes) {
          if (acceptComma) {
            throw this.peekError(
              frame === LEFT_BRACKET ? EXPECTED_LIST_COMMA_OR_END : EXPECTED_OBJECT_COMMA_OR_END,
            );
          }
          break;
        }
        this.discard();
        frame = stack.pop();
        if (frame === undefined) return;
        acceptComma = true;
      }

      if (frame === LEFT_BRACE) {
        const key = this.parseWhitespace();
        if (key === QUOTE) this.discard();
        else if (key !== undefined) throw this.peekError(KEY_MUST_BE_A_STRING);
        else throw this.peekError(EOF_WHILE_PARSING_OBJECT);
        this.ignoreStr();
        const colon = this.parseWhitespace();
        if (colon === COLON) this.discard();
        else if (colon !== undefined) throw this.peekError(EXPECTED_COLON);
        else throw this.peekError(EOF_WHILE_PARSING_OBJECT);
      }

      enclosing = frame;
    }
  }

  private ignoreInteger(): void {
    const first = this.nextOrNull();
    if (first === ZERO) {
      // There can be only one leading '0'.
      if (isDigit(this.peekOrNull())) throw this.peekError(INVALID_NUMBER);
    } else if (isDigit(first)) {
      while (isDigit(this.peekOrNull())) this.discard();
    } else {
      throw this.error(INVALID_NUMBER);
    }
    const byte = this.peekOrNull();
    if (byte === DOT) this.ignoreDecimal();
    else if (byte === LOWER_E || byte === UPPER_E) this.ignoreExponent();
  }

  private ignoreDecimal(): void {
    this.discard();
    let atLeastOneDigit = false;
    while (isDigit(this.peekOrNull())) {
      this.discard();
      atLeastOneDigit = true;
    }
    if (!atLeastOneDigit) throw this.peekError(INVALID_NUMBER);
    const byte = this.peekOrNull();
    if (byte === LOWER_E || byte === UPPER_E) this.ignoreExponent();
  }

  private ignoreExponent(): void {
    this.discard();
    const sign = this.peekOrNull();
    if (sign === PLUS || sign === MINUS) this.discard();
    // A digit must follow the exponent place.
    if (!isDigit(this.nextOrNull())) throw this.error(INVALID_NUMBER);
    while (isDigit(this.peekOrNull())) this.discard();
  }
}

// ---------------------------------------------------------------------------
// The four structs
// ---------------------------------------------------------------------------

const readU64 = (de: Deserializer): bigint => de.deserializeU64();
const readString = (de: Deserializer): string => de.deserializeString();
const readOptionalU64 = (de: Deserializer): bigint | undefined =>
  de.deserializeOption(() => de.deserializeU64());
const readOptionalString = (de: Deserializer): string | undefined =>
  de.deserializeOption(() => de.deserializeString());

function required(name: string, read: (de: Deserializer) => unknown): FieldSpec {
  return { name, read, optional: false, defaulted: false };
}

function optional(name: string, read: (de: Deserializer) => unknown): FieldSpec {
  return { name, read, optional: true, defaulted: false };
}

const REGISTRY_ENTRY: StructSpec<RegistryEntry> = {
  name: "RegistryEntry",
  fields: [
    required("codepoint", readU64),
    required("name", readString),
    optional("type", readOptionalString),
    optional("uri", readOptionalString),
    optional("description", readOptionalString),
  ],
  build: ([codepoint, name, type, uri, description]) => ({
    codepoint: codepoint as bigint,
    name: name as string,
    ...(type === undefined ? {} : { type: type as string }),
    ...(uri === undefined ? {} : { uri: uri as string }),
    ...(description === undefined ? {} : { description: description as string }),
  }),
};

const ONTOLOGY_INFO: StructSpec<OntologyInfo> = {
  name: "OntologyInfo",
  fields: [
    optional("name", readOptionalString),
    optional("source_url", readOptionalString),
    optional("start_code_point", readOptionalU64),
    optional("processing_strategy", readOptionalString),
  ],
  build: ([name, sourceUrl, startCodePoint, processingStrategy]) => ({
    ...(name === undefined ? {} : { name: name as string }),
    ...(sourceUrl === undefined ? {} : { sourceUrl: sourceUrl as string }),
    ...(startCodePoint === undefined ? {} : { startCodePoint: startCodePoint as bigint }),
    ...(processingStrategy === undefined
      ? {}
      : { processingStrategy: processingStrategy as string }),
  }),
};

const GENERATED_INFO: StructSpec<GeneratedInfo> = {
  name: "GeneratedInfo",
  fields: [optional("tool", readOptionalString)],
  build: ([tool]) => (tool === undefined ? {} : { tool: tool as string }),
};

const REGISTRY_FILE: StructSpec<RegistryFile> = {
  name: "RegistryFile",
  fields: [
    optional("ontology", (de) => de.deserializeOption(() => de.deserializeStruct(ONTOLOGY_INFO))),
    optional("generated", (de) => de.deserializeOption(() => de.deserializeStruct(GENERATED_INFO))),
    required("entries", (de) => de.deserializeSeq(() => de.deserializeStruct(REGISTRY_ENTRY))),
    {
      name: "statistics",
      read: (de) => de.deserializeOption(() => de.deserializeValue()),
      optional: true,
      defaulted: true,
    },
  ],
  build: ([ontology, generated, entries, statistics]) => ({
    ...(ontology === undefined ? {} : { ontology: ontology as OntologyInfo }),
    ...(generated === undefined ? {} : { generated: generated as GeneratedInfo }),
    entries: entries as RegistryEntry[],
    ...(statistics === undefined ? {} : { statistics }),
  }),
};

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Parses the text of a registry file exactly as the reference does with
 * `serde_json::from_str::<RegistryFile>`.
 *
 * Unknown fields are skipped at every level, a repeated known field or a
 * missing required one is an error, `null` for an optional field reads as
 * absent, and a struct may also be given as an array of its fields in order.
 * Nesting is limited to 128 levels except while skipping unknown fields.
 *
 * @param text - The file's content; a JS string, so already valid Unicode.
 * @returns The parsed file.
 * @throws {KnownValuesError} With code `Json` and serde_json's message,
 *   including ` at line L column C` (byte-based), when `text` is not a
 *   registry file; with code `InvalidParameter` when `text` is not a string.
 *
 * @example
 * ```ts
 * const file = parseRegistryFile('{"entries":[{"codepoint":1000,"name":"myValue"}]}');
 * file.entries[0].codepoint; // 1000n
 * ```
 */
export function parseRegistryFile(text: string): RegistryFile {
  if (typeof text !== "string") throw KnownValuesError.invalidParameter("text", text);
  const de = new Deserializer(new TextEncoder().encode(text));
  try {
    const file = de.deserializeStruct(REGISTRY_FILE);
    de.end();
    return file;
  } catch (e) {
    throw KnownValuesError.json((e as ParseError).display());
  }
}
