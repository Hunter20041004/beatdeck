#!/usr/bin/env node
/**
 * Embed subset web fonts in a deck, so every machine (headless Chromium, a phone, a projector laptop)
 * renders the typeface the deck was designed in instead of whatever system font happens to be installed.
 *
 * Collects every character the deck can show (stage text, BEATS lines, chrome) from the HTML, subsets
 * each source font to those characters, writes woff2 files plus a fonts.css with @font-face rules, and
 * links fonts.css from the deck's <head> if it is not linked yet. Re-run it after editing copy.
 *
 * Usage:
 *   node scripts/fonts.mjs <deck.html> --font "Noto Sans TC:400 900=/path/NotoSansTC[wght].ttf" \
 *        [--font "Outfit:600=/path/Outfit-SemiBold.ttf"] [--out <deck-dir>/fonts] [--extra "…"] [--link=false]
 *
 * --font  Family:weight=path. weight is one value (400) or a variable range (400 900); repeat per face.
 *         Sources: .ttf, .otf, .woff or .woff2 (not .ttc collections).
 */
import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';

function usage(msg) {
  if (msg) console.error(`fonts.mjs: ${msg}`);
  console.error(
    'Usage: node scripts/fonts.mjs <deck.html> --font "Family:weight=path" [--font …] [--out dir] [--extra "chars"] [--link=false]'
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
let input = null;
const fonts = [];
let outDir = null;
let extra = '';
let link = true;
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  const take = () => {
    const eq = a.indexOf('=');
    if (eq > 0) return a.slice(eq + 1);
    if (i + 1 >= argv.length) usage(`missing value for ${a}`);
    i += 1;
    return argv[i];
  };
  const name = a.startsWith('--') ? a.slice(2).split('=')[0] : null;
  if (!name) { if (input) usage(`unexpected argument ${a}`); input = a; continue; }
  if (name === 'font') fonts.push(take());
  else if (name === 'out') outDir = take();
  else if (name === 'extra') extra = take();
  else if (name === 'link') link = !/^(false|0)$/i.test(a.includes('=') ? a.split('=')[1] : 'true');
  else usage(`unknown flag --${name}`);
}
if (!input) usage('no deck given');
if (!fonts.length) usage('give at least one --font "Family:weight=path"');
if (!fs.existsSync(input)) usage(`deck not found: ${input}`);

const deckDir = path.dirname(path.resolve(input));
outDir = path.resolve(outDir || path.join(deckDir, 'fonts'));
const html = fs.readFileSync(input, 'utf8');

// Every character the deck can display: the whole file minus <style> blocks (BEATS strings live in the
// script, stage copy in the markup), entity-decoded, plus printable ASCII and common CJK punctuation so
// countUp digits, the HUD and small copy edits keep rendering in the same face.
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(nbsp|amp|lt|gt|quot|apos);/g, (_, n) => ({ nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[n]);
}
const text = decodeEntities(html.replace(/<style[\s\S]*?<\/style>/gi, ' ')) + extra;
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const punct = '，。、；：？！「」『』（）《》〈〉—–…·・‧％＋－×÷→←↑↓　';
const chars = new Set(Array.from(ascii + punct + text).filter((c) => c.codePointAt(0) >= 32));
const charString = Array.from(chars).join('');

function parseFace(spec) {
  const eq = spec.lastIndexOf('=');
  const colon = spec.lastIndexOf(':', eq);
  if (eq < 0 || colon < 0) usage(`bad --font "${spec}"; expected Family:weight=path`);
  const family = spec.slice(0, colon).trim();
  const weight = spec.slice(colon + 1, eq).trim() || '400';
  const file = spec.slice(eq + 1).trim();
  if (!family) usage(`no family in --font "${spec}"`);
  if (!/^\d{3}( \d{3})?$/.test(weight)) usage(`weight must be like 400 or "400 900" in --font "${spec}"`);
  if (!fs.existsSync(file)) usage(`font file not found: ${file}`);
  if (/\.ttc$/i.test(file)) usage(`${file}: .ttc collections are not supported; extract one face first`);
  return { family, weight, file };
}

const faces = fonts.map(parseFace);
fs.mkdirSync(outDir, { recursive: true });
const rules = [];
let total = 0;
for (const f of faces) {
  const src = fs.readFileSync(f.file);
  const buf = await subsetFont(src, charString, { targetFormat: 'woff2' });
  const slug = `${f.family.replace(/[^A-Za-z0-9]+/g, '')}-${f.weight.replace(' ', '-')}.woff2`;
  fs.writeFileSync(path.join(outDir, slug), buf);
  total += buf.length;
  rules.push(
    `@font-face{font-family:'${f.family.replace(/'/g, "\\'")}';font-style:normal;font-weight:${f.weight};font-display:swap;src:url('${slug}') format('woff2');}`
  );
  console.log(`  ${slug}  ${(buf.length / 1024).toFixed(1)} KB  (${f.family} ${f.weight})`);
}
const cssPath = path.join(outDir, 'fonts.css');
fs.writeFileSync(cssPath, `${rules.join('\n')}\n`, 'utf8');

let linked = '';
if (link) {
  const href = path.relative(deckDir, cssPath).split(path.sep).join('/');
  if (!html.includes(href)) {
    const tag = `<link rel="stylesheet" href="${href}">`;
    const next = /<\/title>/i.test(html) ? html.replace(/<\/title>/i, (m) => `${m}\n${tag}`) : html.replace(/<head>/i, (m) => `${m}\n${tag}`);
    fs.writeFileSync(input, next, 'utf8');
    linked = ` and linked ${href} from the deck`;
  }
}
console.log(
  `FONTS PASS (${faces.length} face(s), ${chars.size} characters, ${(total / 1024).toFixed(1)} KB) -> ${path.relative(process.cwd(), cssPath) || cssPath}${linked}`
);
console.log('Use these family names first in the deck\'s font stacks; bundle-share.mjs inlines them.');
