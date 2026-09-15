/**
 * The one-line rendering of a parsed registry file that the fixture
 * expectations use, the twin of the rendering the Rust oracle prints.
 */
import type { RegistryFile } from "../src/registry-file.js";

/** A string as serde_json's `to_string` prints it (equal to `JSON.stringify` for valid Unicode). */
const q = (s: string): string => JSON.stringify(s);

/** An optional string, `null` when absent. */
const opt = (s: string | undefined): string => (s === undefined ? "null" : q(s));

/**
 * `entries=[<codepoint>:<name>:<type>:<uri>:<description>;…]|ontology=<name>,<source_url>,<start_code_point>,<processing_strategy>|generated=<tool>|statistics=present|absent`
 * with absent values as `null`, and `ontology`/`generated` as `null` when absent.
 */
export function renderRegistryFile(f: RegistryFile): string {
  const entries = f.entries.map(
    (e) => `${e.codepoint}:${q(e.name)}:${opt(e.type)}:${opt(e.uri)}:${opt(e.description)}`,
  );
  const o = f.ontology;
  const ontology =
    o === undefined
      ? "null"
      : `${opt(o.name)},${opt(o.sourceUrl)},${
          o.startCodePoint === undefined ? "null" : String(o.startCodePoint)
        },${opt(o.processingStrategy)}`;
  const generated = f.generated === undefined ? "null" : opt(f.generated.tool);
  const statistics = f.statistics === undefined ? "absent" : "present";
  return `entries=[${entries.join(";")}]|ontology=${ontology}|generated=${generated}|statistics=${statistics}`;
}
