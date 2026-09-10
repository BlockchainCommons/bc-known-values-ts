/**
 * Baseline vs working tree micro-benchmarks (Phase 2.3).
 *
 *   bun run build && bun bench/benchmark.mjs
 */
import * as baseline from "../tests/baseline/known-values-baseline.mjs";
import * as current from "../dist/index.mjs";

function time(fn, iters = 5) {
  fn();
  let best = Infinity;
  for (let i = 0; i < iters; i++) { const t0 = performance.now(); fn(); best = Math.min(best, performance.now() - t0); }
  return best;
}
const t0 = performance.now(); baseline.KNOWN_VALUES.get(); const tb0 = performance.now() - t0;
const t1 = performance.now(); current.getGlobalKnownValuesStore(); const tc0 = performance.now() - t1;
console.log(`${"case".padEnd(44)} ${"baseline".padStart(10)} ${"current".padStart(10)} ${"speedup".padStart(8)}`);
console.log(`${"first global store build".padEnd(44)} ${tb0.toFixed(1).padStart(8)}ms ${tc0.toFixed(1).padStart(8)}ms ${(tb0 / tc0).toFixed(2).padStart(7)}×`);
const bs = baseline.KNOWN_VALUES.get(), cs = current.getGlobalKnownValuesStore();
const cases = {
  "byValue ×1M": [
    () => { let n = 0; for (let i = 0; i < 1_000_000; i++) if (bs.knownValueForValue(i & 1023) !== undefined) n++; return n; },
    () => { let n = 0; for (let i = 0; i < 1_000_000; i++) if (cs.byValue(i & 1023) !== undefined) n++; return n; },
  ],
  "byName ×1M": [
    () => { let n = 0; for (let i = 0; i < 1_000_000; i++) if (bs.knownValueNamed(i & 1 ? "isA" : "note") !== undefined) n++; return n; },
    () => { let n = 0; for (let i = 0; i < 1_000_000; i++) if (cs.byName(i & 1 ? "isA" : "note") !== undefined) n++; return n; },
  ],
  "tagged CBOR encode + digest ×20k": [
    () => { for (let i = 0; i < 20_000; i++) new baseline.KnownValue(i).digest(); },
    () => { for (let i = 0; i < 20_000; i++) new current.KnownValue(i).digest(); },
  ],
  "value() / .value ×1M": [
    () => { let n = 0; for (let i = 0; i < 1_000_000; i++) n += baseline.IS_A.value(); return n; },
    () => { let n = 0; for (let i = 0; i < 1_000_000; i++) n += current.IS_A.value; return n; },
  ],
};
for (const [name, [b, c]] of Object.entries(cases)) {
  const tb = time(b), tc = time(c);
  console.log(`${name.padEnd(44)} ${tb.toFixed(1).padStart(8)}ms ${tc.toFixed(1).padStart(8)}ms ${(tb / tc).toFixed(2).padStart(7)}×`);
}
