import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCliArgs } from './lib/browser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(__dirname, '..', 'templates', 'skeleton.html');

function printUsage() {
  console.error(
    'Usage: node scripts/new-deck.mjs <out/deck.html> [--title "Deck Title"] [--lang en] [--beats 6 | --ids opening,shift,proof] [--force]'
  );
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsString(text) {
  return JSON.stringify(String(text)).replace(/</g, '\\u003c');
}

function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2), new Set(['force']));
  if (positional.length === 0) {
    printUsage();
    process.exit(1);
  }

  const outPath = path.resolve(positional[0]);
  if (fs.existsSync(outPath) && !flags.force) {
    throw new Error(`${outPath} already exists (pass --force to overwrite).`);
  }

  const title = String(flags.title || 'Untitled Beatdeck');
  const lang = String(flags.lang || 'en');
  if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(lang)) {
    throw new Error(`Invalid --lang "${lang}" (use a BCP 47 tag such as en, zh-Hant, ja).`);
  }

  let ids;
  if (flags.ids) {
    ids = String(flags.ids).split(',').map((s) => s.trim()).filter(Boolean);
    const bad = ids.find((id) => !/^[a-z0-9][a-z0-9-]*$/i.test(id));
    if (bad) throw new Error(`Invalid beat id "${bad}" (letters, digits and dashes only).`);
    if (new Set(ids).size !== ids.length) throw new Error('Beat ids must be unique.');
  } else {
    const n = flags.beats !== undefined ? parseInt(String(flags.beats), 10) : 6;
    if (!Number.isFinite(n) || n < 1 || n > 200) throw new Error(`Invalid --beats "${flags.beats}" (1-200).`);
    ids = Array.from({ length: n }, (_, i) => `beat-${String(i + 1).padStart(2, '0')}`);
  }

  const pad = (i) => String(i + 1).padStart(2, '0');
  const beatsJs = ids
    .map(
      (id, i) =>
        `    { id: ${jsString(id)}, chapter: "${pad(i)} · TODO chapter", speaker: "Host", say: "TODO: one speakable line for this beat.", note: "", pdfSkip: false, cam: { x: 0, y: 0, scale: 1 } },`
    )
    .join('\n');

  const scenesHtml = ids
    .map(
      (id, i) => `      <section class="scene" data-beat="${escapeHtml(id)}" data-beatdeck-skeleton>
        <h1 class="ph-title" data-expected-lines="1">${pad(i)} · ${escapeHtml(id)}</h1>
        <p class="ph-note" data-expected-lines="1">Placeholder scene: replace with the chosen composition archetype.</p>
      </section>`
    )
    .join('\n');

  const choreoJs = `    // ${jsString(ids[0])}: (scene, { at, tween, spring, stagger, splitText, wipe, draw, countUp, isStill }) => {
    //   const words = splitText(scene.querySelector("h1"), { by: "char" });
    //   stagger(words, (el, delay) => spring(el, { translate: ["0 0.6em", "0 0"], opacity: [0, 1] }, { delay }), { each: 40 });
    //   wipe(scene.querySelector(".photo"), { from: "left", delay: 300 });
    //   draw(scene.querySelector("path.route"), 900, { delay: 500, ease: "inOut" });
    //   countUp(scene.querySelector(".metric"), 92.5, 1200, { decimals: 1, suffix: "%", delay: 800 });
    //   at(1600, () => scene.classList.add("idle"), { liveOnly: true });
    // },`;

  const template = fs.readFileSync(TEMPLATE, 'utf8');
  const html = template
    // Function replacers so `$&`, `$$` etc. in user text are inserted literally.
    .replace('"{{TITLE}}"', () => jsString(title))
    .replace('"{{LANG}}"', () => jsString(lang))
    .replace(/\{\{TITLE\}\}/g, () => escapeHtml(title))
    .replace(/\{\{LANG\}\}/g, () => escapeHtml(lang))
    .replace('/*BEATDECK:BEATS*/', () => beatsJs)
    .replace('/*BEATDECK:CHOREO*/', () => choreoJs)
    .replace('<!--BEATDECK:SCENES-->', () => scenesHtml);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`NEW DECK (${ids.length} beat(s), contract-only skeleton) -> ${outPath}`);
  console.log('Next: replace DESIGN tokens + every data-beatdeck-skeleton scene, fill BEATS, then run lint.mjs.');
}

try {
  main();
} catch (err) {
  console.error(`NEW DECK ERROR: ${err.message}`);
  process.exit(1);
}
