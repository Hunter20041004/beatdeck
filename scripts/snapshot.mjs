import fs from 'node:fs';
import path from 'node:path';
import { parseBeatSelection, parseCliArgs, resolveDeckUrl, waitForDeckReady, withPage } from './lib/browser.mjs';

export { parseBeatSelection };

function printUsage() {
  console.error(
    'Usage: node scripts/snapshot.mjs <deck.html> [--out dir] [--beats 1,3-5] [--cols 4] [--bare] [--sheet=false]\n' +
      '       node scripts/snapshot.mjs <hero.html> --raw [--out dir] [--wait 300]'
  );
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSheetHtml(shots, meta, cols) {
  const cards = shots
    .map((s) => {
      const label = [s.id, s.chapter].filter(Boolean).map(escapeHtml).join(' · ');
      const skip = s.pdfSkip ? '<span class="skip">pdfSkip</span>' : '';
      return `<figure><img src="${s.dataUrl}" alt="Beat ${s.beatNum}"><figcaption><b>${String(
        s.beatNum
      ).padStart(2, '0')}</b><span>${label}</span>${skip}</figcaption></figure>`;
    })
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1920px; padding: 32px; background: #1b1b1d; color: #e7e5e0;
    font: 15px/1.3 system-ui, 'Noto Sans TC', sans-serif; }
  h1 { font-size: 20px; font-weight: 600; margin-bottom: 20px; color: #fff; }
  .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 22px 18px; }
  figure img { width: 100%; aspect-ratio: 16 / 9; display: block; background: #000; }
  figcaption { display: flex; gap: 10px; align-items: baseline; margin-top: 7px; white-space: nowrap; overflow: hidden; }
  figcaption b { font-variant-numeric: tabular-nums; color: #fff; }
  figcaption span { overflow: hidden; text-overflow: ellipsis; color: #b9b6ae; }
  .skip { margin-left: auto; color: #e0a458; font-size: 12px; }
</style></head><body><h1>${escapeHtml(meta.title || 'Beatdeck')} — ${shots.length} beat(s)</h1>
<div class="grid">${cards}</div></body></html>`;
}

async function settleFrames(page) {
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 30))))
  );
}

async function snapshotRaw(input, outDir, waitMs) {
  const base = path.basename(input).replace(/\.[^.]+$/, '') || 'page';
  const outPath = path.join(outDir, `${base}.png`);
  await withPage(input, { waitForReady: false }, async (page) => {
    await page.waitForLoadState('load');
    await page.evaluate(() =>
      document.fonts && document.fonts.ready
        ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))])
        : null
    );
    if (waitMs > 0) await page.waitForTimeout(waitMs);
    await settleFrames(page);
    await page.screenshot({ path: outPath, type: 'png' });
  });
  console.log(`SNAPSHOT PASS (raw 1920x1080) -> ${outPath}`);
}

async function main() {
  const { positional, flags } = parseCliArgs(
    process.argv.slice(2),
    new Set(['raw', 'bare', 'sheet'])
  );
  if (positional.length === 0) {
    printUsage();
    process.exit(1);
  }
  const input = positional[0];
  const isUrl = /^(https?|file):\/\//i.test(input);
  const baseName = (isUrl ? new URL(input).pathname : input).split('/').pop().replace(/\.[^.]+$/, '') || 'deck';
  const defaultDir = isUrl
    ? path.resolve(`${baseName}-snapshots`)
    : path.join(path.dirname(path.resolve(input)), `${baseName}-snapshots`);
  const outDir = path.resolve(String(flags.out || defaultDir));
  fs.mkdirSync(outDir, { recursive: true });

  if (flags.raw) {
    const waitMs = flags.wait !== undefined ? Number(flags.wait) : 300;
    if (!Number.isFinite(waitMs) || waitMs < 0) throw new Error(`Invalid --wait value: ${flags.wait}`);
    await snapshotRaw(input, outDir, waitMs);
    return;
  }

  const cols = flags.cols !== undefined ? parseInt(String(flags.cols), 10) : 4;
  if (!Number.isFinite(cols) || cols < 1 || cols > 8) throw new Error(`Invalid --cols "${flags.cols}" (1-8).`);
  const wantSheet = flags.sheet !== false;
  const modeParams = flags.bare ? { still: true, bare: true } : { still: true };

  const firstUrl = resolveDeckUrl(input, { ...modeParams, p: 1 });
  const shots = await withPage(firstUrl, async (page) => {
    const { meta, beats } = await page.evaluate(() => {
      const api = window.__beatdeck;
      if (!api || typeof api.list !== 'function') throw new Error('window.__beatdeck is not defined on deck.');
      return { meta: api.meta || {}, beats: api.list() };
    });
    if (!Array.isArray(beats) || beats.length === 0) throw new Error('window.__beatdeck.list() returned 0 beats.');
    const selection = parseBeatSelection(flags.beats, beats.length);
    const pad = String(beats.length).length < 2 ? 2 : String(beats.length).length;

    const result = [];
    for (const idx of selection) {
      if (idx !== 0 || result.length > 0) {
        await page.goto(resolveDeckUrl(input, { ...modeParams, p: idx + 1 }), { waitUntil: 'domcontentloaded' });
        await waitForDeckReady(page);
      }
      await settleFrames(page);
      const beat = beats[idx] || {};
      const file = path.join(outDir, `beat-${String(idx + 1).padStart(pad, '0')}.png`);
      const buf = await page.screenshot({ path: file, type: 'png' });
      result.push({
        beatNum: idx + 1,
        id: beat.id || '',
        chapter: beat.chapter || '',
        pdfSkip: Boolean(beat.pdfSkip),
        file,
        dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
      });
    }

    if (wantSheet && result.length > 0) {
      await page.setViewportSize({ width: 1920, height: 200 });
      await page.setContent(buildSheetHtml(result, meta, cols), { waitUntil: 'load' });
      const sheetPath = path.join(outDir, 'contact-sheet.png');
      await page.screenshot({ path: sheetPath, type: 'png', fullPage: true });
      result.sheet = sheetPath;
    }
    return result;
  });

  console.log(`SNAPSHOT PASS (${shots.length} beat(s)) -> ${outDir}`);
  for (const s of shots) console.log(`  beat ${s.beatNum}: ${s.file}`);
  if (shots.sheet) console.log(`  contact sheet: ${shots.sheet}`);
}

main().catch((err) => {
  console.error(`SNAPSHOT ERROR: ${err.message}`);
  process.exit(1);
});
