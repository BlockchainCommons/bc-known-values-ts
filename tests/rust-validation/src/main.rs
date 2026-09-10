//! Replays tests/vectors/vectors.json through known-values 0.15.5.
//!
//!   cargo run --release -- ../vectors/vectors.json
//!
//! `kv` and `decode` outcomes are `taggedCborHex|digestHex|name|assignedName`;
//! `lookup` outcomes are `value|name|assignedName` or `-`.
use bc_components::DigestProvider;
use dcbor::prelude::*;
use known_values::{KnownValue, KnownValuesStore, KNOWN_VALUES};
use serde::Deserialize;

#[derive(Deserialize)]
struct File {
    count: usize,
    vectors: Vec<Vector>,
}
#[derive(Deserialize)]
struct Vector {
    name: String,
    recipe: serde_json::Value,
    expect: String,
}

fn describe(kv: &KnownValue) -> String {
    format!(
        "{}|{}|{}|{}",
        hex::encode(kv.tagged_cbor_data()),
        kv.digest().hex(),
        kv.name(),
        kv.assigned_name().unwrap_or("-")
    )
}

fn run(r: &serde_json::Value) -> String {
    match r["k"].as_str().unwrap() {
        "kv" => {
            let v: u64 = r["v"].as_str().unwrap().parse().unwrap();
            let kv = match r.get("name").and_then(|n| n.as_str()) {
                Some(n) => KnownValue::new_with_name(v, n.to_string()),
                None => KnownValue::new(v),
            };
            describe(&kv)
        }
        "decode" => {
            let bytes = hex::decode(r["hex"].as_str().unwrap()).unwrap();
            match CBOR::try_from_data(&bytes).and_then(KnownValue::try_from) {
                Ok(kv) => describe(&kv),
                Err(e) => format!("throw:{:?}", e).split('(').next().unwrap().to_string(),
            }
        }
        "lookup" => {
            let guard = KNOWN_VALUES.get();
            let store = guard.as_ref().unwrap();
            let kv = if r["by"] == "value" {
                let v: u64 = r["key"].as_str().unwrap().parse().unwrap();
                // The reference's lookup falls back to an unnamed value; only a
                // registered (named) hit counts as found, as in TypeScript.
                let kv = KnownValuesStore::known_value_for_raw_value(v, Some(store));
                if kv.assigned_name().is_some() { Some(kv) } else { None }
            } else {
                store.known_value_named(r["key"].as_str().unwrap()).cloned()
            };
            match kv {
                Some(kv) => format!("{}|{}|{}", kv.value(), kv.name(), kv.assigned_name().unwrap_or("-")),
                None => "-".to_string(),
            }
        }
        k => panic!("unhandled {k}"),
    }
}

/// D1: the bundled JSON registries extend beyond the reference's hard-coded
/// list, so a lookup the reference answers with `-` may have a name here.
/// D2: the reference accepts a negative integer inside tag 40000 and wraps
/// it to u64; TypeScript rejects it.
/// E1: both reject a decode with different error taxonomies.
fn expected_divergence(r: &serde_json::Value, got: &str, want: &str) -> Option<&'static str> {
    if r["k"] == "lookup" && got == "-" && want != "-" {
        return Some("D1");
    }
    if r["k"] == "decode" && r["hex"].as_str().unwrap_or("").starts_with("d99c402") && want.starts_with("throw:") && !got.starts_with("throw:") {
        return Some("D2");
    }
    if r["k"] == "decode" && got.starts_with("throw:") && want.starts_with("throw:") {
        return Some("E1");
    }
    // D3: TypeScript's `fromCbor` accepts the untagged form; the reference's
    // `TryFrom<CBOR>` requires the tag.
    if r["k"] == "decode" && !r["hex"].as_str().unwrap_or("").starts_with("d9") && got.starts_with("throw:") && !want.starts_with("throw:") {
        return Some("D3");
    }
    None
}

fn main() {
    let path = std::env::args().nth(1).expect("path");
    let file: File = serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
    assert_eq!(file.count, file.vectors.len());
    let (mut ok, mut expected, mut mismatch) = (0, 0, 0);
    let mut by_class = std::collections::BTreeMap::new();
    for v in &file.vectors {
        let got = run(&v.recipe);
        if got == v.expect {
            ok += 1;
        } else if let Some(class) = expected_divergence(&v.recipe, &got, &v.expect) {
            expected += 1;
            *by_class.entry(class).or_insert(0) += 1;
        } else {
            mismatch += 1;
            eprintln!("MISMATCH {}\n  rust: {}\n  ts:   {}", v.name, got, v.expect);
        }
    }
    for (c, n) in by_class {
        println!("expected-divergence [{c}] x{n}");
    }
    println!("{} vectors - {ok} match, {expected} expected-divergence, {mismatch} MISMATCH", file.vectors.len());
    std::process::exit(if mismatch == 0 { 0 } else { 1 });
}
