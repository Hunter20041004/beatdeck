import fs from 'node:fs';
import path from 'node:path';
import {
  launchBrowser,
  parseBeatSelection,
  parseCliArgs,
  resolveDeckUrl,
  variableClockInitScript,
  waitForDeckReady,
} from './lib/browser.mjs';

function printUsage() {
  console.error(
    'Usage: node scripts/filmstrip.mjs <deck.html> [--beats 2-4] [--times 0,120,280,500,900,1500,2600] [--slow 4] [--frames] [--out dir]'
  );
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSheet(rows, meta) {
  const body = rows
    .map((row) => {
      const frames = row.frames
        .map((f) => `<figure><img src="${f.dataUrl}"><figcaption>${f.ms} ms</figcaption></figure>`)
        .join('');
      const head = `<b>${String(row.beatNum).padStart(2, '0')}</b> ${escapeHtml(row.id)}<i>${escapeHtml(row.transition || 'enter')}</i>`;
      return `<section><h2>${head}</h2><div class="row">${frames}</div></section>`;
    })
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1920px; padding: 28px 32px; background: #1b1b1d; color: #e7e5e0; font: 14px/1.3 system-ui, 'Noto Sans TC', sans-serif; }
  h1 { font-size: 20px; font-weight: 600; margin-bottom: 18px; color: #fff; }
  section { margin-bottom: 22px; }
  h2 { font-size: 15px; font-weight: 500; margin-bottom: 8px; color: #fff; display: flex; gap: 10px; align-items: baseline; }
  h2 i { font-style: normal; color: #e0a458; font-size: 13px; }
  .row { display: grid; grid-template-columns: repeat(${rows[0]?.frames.length || 1}, 1fr); gap: 8px; }
  figure img { width: 100%; aspect-ratio: 16 / 9; display: block; background: #000; }
  figcaption { margin-top: 4px; color: #b9b6ae; font-variant-numeric: tabular-nums; font-size: 12px; }
</style></head><body><h1>${escapeHtml(meta.title || 'Beatdeck')} · motion filmstrip (time after the beat starts)</h1>${body}</body></html>`;
}

async function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2), new Set(['frames']));
  const fullFrames = flags.frames === true;
  if (positional.length === 0) {
    printUsage();
    process.exit(1);
  }
  const input = positional[0];
  const times = String(flags.times || '0,120,280,500,900,1500,2600')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  if (times.length === 0) throw new Error('--times needs at least one millisecond value');
  const slow = flags.slow !== undefined ? Number(flags.slow) : 4;
  if (!Number.isFinite(slow) || slow < 1) throw new Error(`Invalid --slow value: ${flags.slow}`);

  const isUrl = /^(https?|file):\/\//i.test(input);
  const baseName = (isUrl ? new URL(input).pathname : input).split('/').pop().replace(/\.[^.]+$/, '') || 'deck';
  const defaultDir = isUrl
    ? path.resolve(`${baseName}-filmstrip`)
    : path.join(path.dirname(path.resolve(input)), `${baseName}-filmstrip`);
  const outDir = path.resolve(String(flags.out || defaultDir));
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await launchBrowser();
  try {
    // --frames renders at full stage size and also saves every frame as its own PNG, for reading one moment closely.
    const vp = fullFrames ? { width: 1920, height: 1080 } : { width: 768, height: 432 };
    const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
    await context.addInitScript(variableClockInitScript);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Animation.enable');
    const setRate = async (r) => {
      await page.evaluate((x) => window.__bdSetClockRate(x), r);
      await cdp.send('Animation.setPlaybackRate', { playbackRate: r });
    };

    await page.goto(resolveDeckUrl(input, { bare: true, p: 1 }), { waitUntil: 'domcontentloaded' });
    await waitForDeckReady(page);
    const { meta, beats } = await page.evaluate(() => ({ meta: window.__beatdeck.meta || {}, beats: window.__beatdeck.list() }));
    const selection = parseBeatSelection(flags.beats, beats.length);
    const pad = String(beats.length).length < 2 ? 2 : String(beats.length).length;

    const rows = [];
    for (const idx of selection) {
      // Settle the previous beat at fast-forward so the transition starts from its final frame.
      const prev = Math.max(0, idx - 1);
      await setRate(16);
      await page.evaluate((i) => window.__beatdeck.goTo(i), prev);
      await page.waitForTimeout(260);
      await setRate(1 / slow);
      const t0 = await page.evaluate((i) => {
        window.__beatdeck.goTo(i);
        return performance.now();
      }, idx);
      const transition = await page.evaluate(() => document.body.dataset.beatTransition || '');
      const frames = [];
      for (const target of times) {
        const left = await page.evaluate(([start, tgt]) => start + tgt - performance.now(), [t0, target]);
        if (left > 0) await page.waitForTimeout(left * slow);
        const before = await page.evaluate(() => performance.now());
        const buf = await page.screenshot(fullFrames ? { type: 'png' } : { type: 'jpeg', quality: 82 });
        const after = await page.evaluate(() => performance.now());
        const ms = Math.round((before + after) / 2 - t0);
        if (fullFrames) {
          fs.writeFileSync(path.join(outDir, `frame-${String(idx + 1).padStart(pad, '0')}-${String(target).padStart(4, '0')}ms.png`), buf);
        }
        frames.push({ ms, dataUrl: `data:image/${fullFrames ? 'png' : 'jpeg'};base64,${buf.toString('base64')}` });
      }
      rows.push({ beatNum: idx + 1, id: beats[idx].id, transition: idx === 0 ? '' : transition, frames });
    }

    await setRate(1);
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
    await page.setViewportSize({ width: 1920, height: 200 });
    await page.setContent(buildSheet(rows, meta), { waitUntil: 'load' });
    const sheetPath = path.join(outDir, 'filmstrip.png');
    await page.screenshot({ path: sheetPath, type: 'png', fullPage: true });
    for (const row of rows) {
      const one = path.join(outDir, `motion-${String(row.beatNum).padStart(pad, '0')}.png`);
      await page.setContent(buildSheet([row], meta), { waitUntil: 'load' });
      await page.screenshot({ path: one, type: 'png', fullPage: true });
    }
    console.log(`FILMSTRIP PASS (${rows.length} beat(s) x ${times.length} frames, ${slow}x slow) -> ${sheetPath}${fullFrames ? ` (+ full-size frame-NN-MMMMms.png)` : ''}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error(`FILMSTRIP ERROR: ${err.message}`);
  process.exit(1);
});
