//! Replays a vector file against known-values 0.15.5 from crates.io.
//!
//!   cargo run --release --offline -- ../vectors/vectors.json                               # no default features
//!   cargo run --release --offline --features directory-loading -- ../vectors/vectors.json  # the reference's default
//!
//! Every recipe yields one outcome string on each side and the two are
//! compared textually: the TypeScript outcome is the vector's `expect`, the
//! reference's is computed here. A failure is `throw:<code>:<message>`: a
//! dcbor error's variant and `Display`, the reference's `LoadError` as `Io`
//! or `Json` and `ConfigError` as `AlreadyInitialized`, each with its
//! `Display` text (paths inside a temporary tree spelled `<root>`).
//!
//! The `directory`, `config`, `home` and `registryParse` kinds need the
//! `directory-loading` feature; the default build counts them as
//! `feature-gated`. `config` and `home` rows run in a child process each
//! (the reference's `KNOWN_VALUES` initialises once per process), with `HOME`
//! pointing into the row's tree so the machine's own registry directory is
//! never read. `domain` rows are the JavaScript input domain: `js-only`.
//! Anything else that differs is a MISMATCH; a recipe this program cannot
//! parse is `unparsable`. Both exit 1.
use bc_components::DigestProvider;
use dcbor::prelude::*;
use known_values::{KnownValue, KnownValuesStore, KNOWN_VALUES};
use serde::Deserialize;
use std::panic::{catch_unwind, AssertUnwindSafe};

#[derive(Deserialize)]
struct File { count: usize, vectors: Vec<Vector> }
#[derive(Deserialize)]
struct Vector { name: String, recipe: serde_json::Value, expect: String }
type J = serde_json::Value;

const JS_ONLY: &str = "js-only";
const FEATURE_GATED: &str = "feature-gated";

/// A recipe field this program cannot read exactly is an `unparsable` row.
macro_rules! need { ($e:expr, $what:expr) => { match $e { Some(v) => v, None => return format!("unparsable:{}", $what) } } }

fn s(v: &J, k: &str) -> Option<String> { v.get(k)?.as_str().map(|x| x.to_string()) }
/// An exact `u64` spelled as decimal digits.
fn u64_of(v: &J) -> Option<u64> { v.as_str()?.parse().ok() }
fn kv_of(v: &J, name_key: &str) -> Option<KnownValue> {
    let value = u64_of(v.get("v")?)?;
    Some(match s(v, name_key) { Some(n) => KnownValue::new_with_name(value, n), None => KnownValue::new(value) })
}

/// `taggedCborHex|digestHex|name|assignedName`.
fn describe(kv: &KnownValue) -> String {
    format!("{}|{}|{}|{}", hex::encode(kv.tagged_cbor_data()), kv.digest().hex(), kv.name(), kv.assigned_name().unwrap_or("-"))
}
/// `value|name|assignedName`.
fn brief(kv: &KnownValue) -> String { format!("{}|{}|{}", kv.value(), kv.name(), kv.assigned_name().unwrap_or("-")) }
/// A dcbor error: its variant and its `Display`.
fn cbor_throw(e: &dcbor::Error) -> String {
    let d = format!("{e:?}");
    let variant = d.split(|c: char| c == '(' || c == '{' || c == ' ').next().unwrap_or(&d);
    format!("throw:{variant}:{e}")
}
macro_rules! tri { ($e:expr) => { match $e { Ok(v) => v, Err(e) => return cbor_throw(&e) } } }

/// A store built from `ops`: `register(KnownValue(v, name?))` in order.
fn store_of(ops: &J) -> Option<KnownValuesStore> {
    let mut store = KnownValuesStore::new([]);
    for op in ops.as_array()? { store.insert(kv_of(op, "name")?); }
    Some(store)
}

fn run(r: &J) -> String {
    let k = need!(s(r, "k"), "k");
    match k.as_str() {
        "kv" => describe(&need!(kv_of(r, "name"), "v")),
        "decode" => {
            let bytes = need!(s(r, "hex").and_then(|h| hex::decode(h).ok()), "hex");
            describe(&tri!(CBOR::try_from_data(&bytes).and_then(KnownValue::try_from)))
        }
        "untagged" => {
            let bytes = need!(s(r, "hex").and_then(|h| hex::decode(h).ok()), "hex");
            describe(&tri!(CBOR::try_from_data(&bytes).and_then(KnownValue::from_untagged_cbor)))
        }
        "lookup" => {
            let guard = KNOWN_VALUES.get();
            let store = guard.as_ref().unwrap();
            match store.known_value_named(&need!(s(r, "key"), "key")) { Some(kv) => brief(kv), None => "-".into() }
        }
        "resolve" => {
            let v = need!(r.get("v").and_then(u64_of), "v");
            match need!(s(r, "store"), "store").as_str() {
                "none" => brief(&KnownValuesStore::known_value_for_raw_value(v, None)),
                "global" => {
                    let guard = KNOWN_VALUES.get();
                    brief(&KnownValuesStore::known_value_for_raw_value(v, guard.as_ref()))
                }
                "recipe" => {
                    let store = need!(r.get("ops").and_then(store_of), "ops");
                    brief(&KnownValuesStore::known_value_for_raw_value(v, Some(&store)))
                }
                other => format!("unhandled:resolve store {other}"),
            }
        }
        "store" => {
            let store = need!(r.get("ops").and_then(store_of), "ops");
            let mut out = Vec::new();
            for q in need!(r.get("queries").and_then(|q| q.as_array()), "queries") {
                if let Some(name) = s(q, "named") {
                    out.push(match store.known_value_named(&name) { Some(kv) => kv.value().to_string(), None => "-".into() });
                } else if let Some(v) = q.get("assigned").and_then(u64_of) {
                    out.push(store.assigned_name(&KnownValue::new(v)).map(|n| n.to_string()).unwrap_or_else(|| "-".into()));
                } else if let Some(v) = q.get("name").and_then(u64_of) {
                    out.push(store.name(KnownValue::new(v)));
                } else {
                    return "unparsable:query".into();
                }
            }
            out.join(";")
        }
        "nameFor" => {
            let kv = need!(kv_of(r, "name"), "v");
            match need!(s(r, "store"), "store").as_str() {
                "none" => KnownValuesStore::name_for_known_value(kv, None),
                "global" => {
                    let guard = KNOWN_VALUES.get();
                    KnownValuesStore::name_for_known_value(kv, guard.as_ref())
                }
                other => format!("unhandled:nameFor store {other}"),
            }
        }
        "registryParse" | "directory" | "config" | "home" => {
            #[cfg(not(feature = "directory-loading"))]
            { FEATURE_GATED.into() }
            #[cfg(feature = "directory-loading")]
            { loading::run(&k, r) }
        }
        "domain" => JS_ONLY.into(),
        k => format!("unhandled:kind {k}"),
    }
}

#[cfg(feature = "directory-loading")]
mod loading {
    use super::{brief, s, u64_of, J};
    use known_values::{DirectoryConfig, KnownValue, LoadError, RegistryFile, KNOWN_VALUES};
    use std::path::{Path, PathBuf};

    /// The rendering the TypeScript parser tests and this harness share.
    fn q(s: &str) -> String { serde_json::to_string(s).unwrap() }
    fn opt(s: &Option<String>) -> String { s.as_ref().map(|s| q(s)).unwrap_or_else(|| "null".into()) }
    fn render(f: &RegistryFile) -> String {
        let entries: Vec<String> = f.entries.iter().map(|e| format!("{}:{}:{}:{}:{}", e.codepoint, q(&e.name), opt(&e.entry_type), opt(&e.uri), opt(&e.description))).collect();
        let ontology = match &f.ontology { None => "null".to_string(), Some(o) => format!("{},{},{},{}", opt(&o.name), opt(&o.source_url), o.start_code_point.map(|n| n.to_string()).unwrap_or_else(|| "null".into()), opt(&o.processing_strategy)) };
        let generated = match &f.generated { None => "null".to_string(), Some(g) => opt(&g.tool) };
        format!("entries=[{}]|ontology={}|generated={}|statistics={}", entries.join(";"), ontology, generated, if f.statistics.is_some() { "present" } else { "absent" })
    }
    fn load_throw(e: &LoadError, root: &str) -> String {
        let code = match e { LoadError::Io(_) => "Io", LoadError::Json { .. } => "Json" };
        format!("throw:{code}:{}", relativize(&e.to_string(), root))
    }
    /// A path or message with the tree root spelled `<root>` and `/` separators.
    fn relativize(text: &str, root: &str) -> String { text.replace(root, "<root>").replace('\\', "/") }
    /// Values sorted by codepoint as `v:name`.
    fn value_list<'a>(values: impl Iterator<Item = &'a KnownValue>) -> String {
        let mut v: Vec<&KnownValue> = values.collect();
        v.sort_by_key(|kv| kv.value());
        v.iter().map(|kv| format!("{}:{}", kv.value(), kv.name())).collect::<Vec<_>>().join(";")
    }
    /// Writes a recipe tree under a fresh temporary directory; returns its root.
    pub fn materialize_tree(tree: &J) -> Option<PathBuf> {
        static COUNTER: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
        let n = COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        let root = std::env::temp_dir().join(format!("known-values-{}-{n}", std::process::id()));
        std::fs::create_dir_all(&root).ok()?;
        for (rel, entry) in tree.as_object()? {
            let path = root.join(rel);
            if entry.is_null() {
                std::fs::create_dir_all(&path).ok()?;
            } else {
                if let Some(parent) = path.parent() { std::fs::create_dir_all(parent).ok()?; }
                let bytes = if let Some(h) = entry.get("hex") { hex::decode(h.as_str()?).ok()? } else { entry.get("text")?.as_str()?.as_bytes().to_vec() };
                std::fs::write(&path, bytes).ok()?;
            }
        }
        Some(root)
    }
    fn paths_of(root: &Path, v: &J) -> Option<Vec<PathBuf>> { Some(v.as_array()?.iter().map(|p| Some(root.join(p.as_str()?))).collect::<Option<Vec<_>>>()?) }

    pub fn run(kind: &str, r: &J) -> String {
        match kind {
            "registryParse" => {
                let bytes = need!(s(r, "hex").and_then(|h| hex::decode(h).ok()), "hex");
                let Ok(text) = std::str::from_utf8(&bytes) else { return "throw:Io:stream did not contain valid UTF-8".into(); };
                match serde_json::from_str::<RegistryFile>(text) { Ok(f) => format!("ok:{}", render(&f)), Err(e) => format!("throw:Json:{e}") }
            }
            "directory" => {
                let root = need!(r.get("tree").and_then(materialize_tree), "tree");
                let root_str = root.to_string_lossy().to_string();
                let paths = need!(r.get("paths").and_then(|p| paths_of(&root, p)), "paths");
                let out = match need!(s(r, "mode"), "mode").as_str() {
                    "strict" => match known_values::load_from_directory(&paths[0]) {
                        Ok(values) => format!("ok:{}:{}", values.len(), value_list(values.iter())),
                        Err(e) => load_throw(&e, &root_str),
                    },
                    "config" => {
                        let result = known_values::load_from_config(&DirectoryConfig::with_paths(paths));
                        let processed: Vec<String> = result.files_processed.iter().map(|p| relativize(&p.to_string_lossy(), &root_str)).collect();
                        let mut errors: Vec<String> = result.errors.iter().map(|(p, e)| {
                            let code = match e { LoadError::Io(_) => "Io", LoadError::Json { .. } => "Json" };
                            format!("{}:{code}:{}", relativize(&p.to_string_lossy(), &root_str), relativize(&e.to_string(), &root_str))
                        }).collect();
                        errors.sort();
                        format!("values=[{}]|processed=[{}]|errors=[{}]", value_list(result.values.values()), processed.join(";"), errors.join(";"))
                    }
                    other => format!("unhandled:directory mode {other}"),
                };
                let _ = std::fs::remove_dir_all(&root);
                out
            }
            "config" | "home" => {
                // A fresh process: the reference initialises its store once.
                let root = need!(r.get("tree").and_then(materialize_tree), "tree");
                let root_str = root.to_string_lossy().to_string();
                let steps = if kind == "config" { r.get("sequence") } else { r.get("queries") };
                let steps = need!(steps, "steps").to_string();
                let home = match s(r, "home") { Some(h) => root.join(h), None => root.join("no-home") };
                let exe = std::env::current_exe().expect("current_exe");
                let output = std::process::Command::new(exe)
                    .arg("--child").arg(&steps)
                    .env("KNOWN_VALUES_CHILD_ROOT", &root_str)
                    .env("HOME", &home)
                    .output();
                let _ = std::fs::remove_dir_all(&root);
                match output {
                    Ok(o) if o.status.success() => relativize(String::from_utf8_lossy(&o.stdout).trim(), &root_str),
                    Ok(o) => format!("child-failed:{}", String::from_utf8_lossy(&o.stderr).trim()),
                    Err(e) => format!("child-failed:{e}"),
                }
            }
            other => format!("unhandled:kind {other}"),
        }
    }

    /// The child process: runs a `config` or `home` sequence against the fresh global store.
    pub fn child(steps: &str) {
        let root = PathBuf::from(std::env::var("KNOWN_VALUES_CHILD_ROOT").unwrap_or_default());
        let steps: Vec<J> = serde_json::from_str(steps).expect("steps");
        let mut out = Vec::new();
        for step in &steps {
            let paths = |v: &J| paths_of(&root, v).unwrap_or_default();
            if let Some(p) = step.get("set") {
                out.push(match known_values::set_directory_config(DirectoryConfig::with_paths(paths(p))) { Ok(()) => "ok".to_string(), Err(e) => format!("throw:AlreadyInitialized:{e}") });
            } else if let Some(p) = step.get("add") {
                out.push(match known_values::add_search_paths(paths(p)) { Ok(()) => "ok".to_string(), Err(e) => format!("throw:AlreadyInitialized:{e}") });
            } else if step.get("access").is_some() {
                let _guard = KNOWN_VALUES.get();
                out.push("ok".to_string());
            } else if let Some(name) = s(step, "named") {
                let guard = KNOWN_VALUES.get();
                out.push(match guard.as_ref().unwrap().known_value_named(&name) { Some(kv) => brief(kv), None => "-".into() });
            } else if let Some(v) = step.get("resolve").and_then(u64_of) {
                let guard = KNOWN_VALUES.get();
                out.push(brief(&known_values::KnownValuesStore::known_value_for_raw_value(v, guard.as_ref())));
            } else {
                out.push("unparsable:step".to_string());
            }
        }
        print!("{}", out.join(";"));
    }
}

fn main() {
    assert_eq!(usize::BITS, 64, "the reference's usize fields are compared as 64-bit integers");
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) == Some("--child") {
        #[cfg(feature = "directory-loading")]
        { loading::child(args.get(2).map(String::as_str).unwrap_or("[]")); return; }
        #[cfg(not(feature = "directory-loading"))]
        { eprintln!("the child mode needs --features directory-loading"); std::process::exit(2); }
    }
    // The build under test must not read this machine's registry directory:
    // the configuration is pinned empty before any row touches the store, as
    // the TypeScript suite pins it; `config` and `home` rows use child processes.
    #[cfg(feature = "directory-loading")]
    known_values::set_directory_config(known_values::DirectoryConfig::new()).expect("pin the configuration first");
    let path = args.get(1).expect("usage: known-values-validation <vectors.json> [--verbose]");
    let verbose = args.iter().any(|a| a == "--verbose") || std::env::var("VERBOSE").is_ok();
    let file: File = serde_json::from_str(&std::fs::read_to_string(path).expect("read vectors")).expect("parse vectors");
    assert_eq!(file.count, file.vectors.len(), "the file's count must equal its vectors");
    std::panic::set_hook(Box::new(|_| {}));

    let (mut ok, mut js_only, mut gated, mut unparsable, mut mismatch) = (0usize, 0usize, 0usize, 0usize, 0usize);
    let mut tags_registered = false;
    let cut = |x: &str| if verbose { x.to_string() } else { x.chars().take(200).collect::<String>() };
    for v in &file.vectors {
        let tagged_row = v.recipe.get("tags").and_then(|t| t.as_bool()) == Some(true);
        if tagged_row && !tags_registered { bc_components::register_tags(); tags_registered = true; }
        if !tagged_row && tags_registered && v.recipe.get("k").and_then(|k| k.as_str()) == Some("decode") {
            mismatch += 1;
            eprintln!("MISMATCH {}\n  a decode row without `tags` after the first registered-tags row; the file must list them last", v.name);
            continue;
        }
        let got = match catch_unwind(AssertUnwindSafe(|| run(&v.recipe))) {
            Ok(s) => s,
            Err(p) => {
                let text = p.downcast_ref::<&str>().map(|s| s.to_string()).or_else(|| p.downcast_ref::<String>().cloned()).unwrap_or_else(|| "non-string panic payload".into());
                mismatch += 1;
                eprintln!("MISMATCH {}\n  reference panicked: {}\n  ts: {}", v.name, cut(&text), cut(&v.expect));
                continue;
            }
        };
        if got == v.expect { ok += 1; continue; }
        if got == JS_ONLY { js_only += 1; continue; }
        if got == FEATURE_GATED { gated += 1; continue; }
        if let Some(what) = got.strip_prefix("unparsable:") { unparsable += 1; eprintln!("UNPARSABLE {} ({what})", v.name); continue; }
        mismatch += 1;
        let (g, w): (Vec<&str>, Vec<&str>) = (got.split('|').collect(), v.expect.split('|').collect());
        let field = (0..g.len().max(w.len())).find(|&i| g.get(i) != w.get(i)).unwrap_or(0);
        eprintln!("MISMATCH {} [field {field}/{}]\n  rust: {}\n  ts:   {}", v.name, w.len(), cut(g.get(field).unwrap_or(&"")), cut(w.get(field).unwrap_or(&"")));
    }
    let build = if cfg!(feature = "directory-loading") { " [directory-loading]" } else { "" };
    println!("{} vectors - {ok} match, {js_only} js-only, {gated} feature-gated, {unparsable} unparsable, {mismatch} MISMATCH{build}", file.vectors.len());
    std::process::exit(if mismatch == 0 && unparsable == 0 { 0 } else { 1 });
}
