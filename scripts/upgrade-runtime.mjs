#!/usr/bin/env node
/**
 * Upgrade a deck to the current runtime: replaces everything from the "RUNTIME (keep)" marker to the
 * closing </script> with templates/skeleton.html's runtime. DESIGN, META, BEATS, CHOREO, MOTION and the
 * scenes are left alone.
 *
 * Usage: node scripts/upgrade-runtime.mjs <deck.html> [--out <path>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MARK = '// ============ RUNTIME (keep) ============';

function runtimeOf(src, label) {
  const i = src.indexOf(MARK);
  if (i < 0) throw new Error(`${label}: no "${MARK}" marker`);
  const start = src.lastIndexOf('\n', i) + 1;
  const end = src.indexOf('</script>', i);
  if (end < 0) throw new Error(`${label}: no </script> after the runtime marker`);
  return { start, end };
}

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
if (!input) {
  console.error('Usage: node scripts/upgrade-runtime.mjs <deck.html> [--out <path>]');
  process.exit(1);
}
const out = outIdx >= 0 ? args[outIdx + 1] : input;
const skel = fs.readFileSync(path.join(ROOT, 'templates', 'skeleton.html'), 'utf8');
const deck = fs.readFileSync(input, 'utf8');
const a = runtimeOf(skel, 'skeleton');
const b = runtimeOf(deck, input);
const next = deck.slice(0, b.start) + skel.slice(a.start, a.end) + deck.slice(b.end);
fs.writeFileSync(out, next, 'utf8');
console.log(next === deck ? `RUNTIME already current -> ${out}` : `RUNTIME upgraded -> ${out}`);
