import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  getBrowserExecutablePath,
  parseCliArgs,
  resolveDeckUrl,
  waitForDeckReady,
} from './lib/browser.mjs';
import { chromium } from 'playwright';

function printUsage() {
  console.error(
    'Usage: node scripts/pdf-export.mjs <deck.html> [--mode slides|storyboard] [--out deck.pdf] [--cols 2]'
  );
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSlidesHtml(shots) {
  const pages = shots
    .map(
      (s) => `
    <section class="page">
      <img src="${s.imgUrl}" alt="Beat ${s.beatNum}">
    </section>`
    )
    .join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: 1920px 1080px; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1920px; background: #000; }
  .page {
    width: 1920px;
    height: 1080px;
    page-break-after: always;
    break-after: page;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .page img { width: 1920px; height: 1080px; display: block; object-fit: contain; }
</style>
</head>
<body>
${pages}
</body>
</html>`;
}

function buildStoryboardHtml(shots, meta, cols) {
  const groups = [];
  for (let i = 0; i < shots.length; i += cols) {
    groups.push(shots.slice(i, i + cols));
  }

  const title = escapeHtml(meta.title || 'Storyboard');
  const subtitle = meta.subtitle ? escapeHtml(meta.subtitle) : '';

  const pages = groups
    .map((group, pageIdx) => {
      const cards = group
        .map((s) => {
          const chapter = escapeHtml(s.chapter || '—');
          const speaker = s.speaker ? `<span class="speaker">${escapeHtml(s.speaker)}</span>` : '';
          const say = escapeHtml(s.say || '(visual beat)');
          return `
          <article class="card">
            <div class="frame-wrap">
              <img src="${s.imgUrl}" alt="Beat ${s.beatNum}">
            </div>
            <div class="card-meta">
              <span class="badge">Beat ${String(s.beatNum).padStart(2, '0')}</span>
              <span class="chapter">${chapter}</span>
              ${speaker}
            </div>
            <p class="say">${say}</p>
          </article>`;
        })
        .join('\n');

      return `
      <section class="sheet">
        <header class="sheet-header">
          <div>
            <h1>${title}</h1>
            ${subtitle ? `<p class="sub">${subtitle}</p>` : ''}
          </div>
          <div class="page-num">Storyboard · Page ${pageIdx + 1} / ${groups.length}</div>
        </header>
        <div class="grid cols-${cols}">
          ${cards}
        </div>
      </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: 1920px 1080px; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1920px;
    background: #F6F2EA;
    color: #18181B;
    font-family: 'Inter', 'Noto Sans TC', system-ui, -apple-system, sans-serif;
  }
  .sheet {
    width: 1920px;
    height: 1080px;
    padding: 56px 68px;
    display: flex;
    flex-direction: column;
    gap: 36px;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    background: #F6F2EA;
  }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  .sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 2px solid #D8D1C4;
    padding-bottom: 18px;
  }
  .sheet-header h1 {
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .sheet-header .sub {
    font-size: 16px;
    color: #52525B;
    margin-top: 4px;
  }
  .page-num {
    font-size: 16px;
    font-weight: 600;
    color: #52525B;
    font-variant-numeric: tabular-nums;
  }
  .grid {
    flex: 1;
    display: grid;
    gap: 36px;
    align-items: start;
  }
  .grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
  .grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
  .card {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .frame-wrap {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #18181B;
    border: 1px solid #C8C0B0;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 6px 20px rgba(24, 24, 27, 0.08);
  }
  .frame-wrap img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .badge {
    background: #18181B;
    color: #F6F2EA;
    font-size: 14px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 4px;
    font-variant-numeric: tabular-nums;
  }
  .chapter {
    font-size: 18px;
    font-weight: 700;
    color: #D9482B;
  }
  .speaker {
    font-size: 14px;
    color: #52525B;
    margin-left: auto;
  }
  .say {
    font-size: ${cols >= 3 ? '18px' : '22px'};
    line-height: 1.55;
    color: #27272A;
  }
</style>
</head>
<body>
${pages}
</body>
</html>`;
}

async function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  if (positional.length === 0) {
    printUsage();
    process.exit(1);
  }

  const deckInput = positional[0];
  const mode = String(flags.mode || 'slides').toLowerCase();
  if (mode !== 'slides' && mode !== 'storyboard') {
    throw new Error(`Invalid --mode "${mode}". Use "slides" or "storyboard".`);
  }

  const cols = flags.cols !== undefined ? parseInt(String(flags.cols), 10) : 2;
  if (cols !== 2 && cols !== 3) {
    throw new Error(`Invalid --cols "${flags.cols}". Use 2 or 3.`);
  }

  const defaultOut = mode === 'storyboard' ? 'storyboard.pdf' : 'deck.pdf';
  const outPath = path.resolve(String(flags.out || defaultOut));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const executablePath = getBrowserExecutablePath();
  if (!fs.existsSync(executablePath)) {
    throw new Error(
      `Playwright bundled Chromium not found at ${executablePath}. Run: npx playwright install chromium`
    );
  }

  let tmpDir = null;
  let browser = null;
  let context = null;

  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beatdeck-pdf-'));
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    const firstParams = mode === 'storyboard' ? { still: true, bare: true, p: 1 } : { still: true, p: 1 };
    await page.goto(resolveDeckUrl(deckInput, firstParams), { waitUntil: 'domcontentloaded' });
    await waitForDeckReady(page);

    const { meta, beats } = await page.evaluate(() => {
      const api = window.__beatdeck;
      if (!api || typeof api.list !== 'function') {
        throw new Error('window.__beatdeck is not defined on deck.');
      }
      return { meta: api.meta || {}, beats: api.list() };
    });

    const printableBeats = beats
      .map((b, idx) => ({
        ...b,
        _origIdx: typeof b.index === 'number' ? b.index : idx,
      }))
      .filter((b) => !b.pdfSkip);
    if (printableBeats.length === 0) {
      throw new Error('No printable beats found (all beats have pdfSkip=true or list is empty).');
    }

    const shots = [];
    for (let i = 0; i < printableBeats.length; i += 1) {
      const beat = printableBeats[i];
      const beatIndex = beat._origIdx;
      const params =
        mode === 'storyboard'
          ? { still: true, bare: true, p: beatIndex + 1 }
          : { still: true, p: beatIndex + 1 };

      if (i > 0 || beatIndex !== 0) {
        await page.goto(resolveDeckUrl(deckInput, params), { waitUntil: 'domcontentloaded' });
        await waitForDeckReady(page);
      }

      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      );

      const imgPath = path.join(tmpDir, `beat-${String(beatIndex + 1).padStart(4, '0')}.png`);
      await page.screenshot({ path: imgPath, type: 'png' });

      shots.push({
        beatNum: beatIndex + 1,
        chapter: beat.chapter || '',
        speaker: beat.speaker || '',
        say: beat.say || '',
        imgUrl: pathToFileURL(imgPath).href,
      });
    }

    const printHtml =
      mode === 'storyboard' ? buildStoryboardHtml(shots, meta, cols) : buildSlidesHtml(shots);
    const printHtmlPath = path.join(tmpDir, 'print.html');
    fs.writeFileSync(printHtmlPath, printHtml, 'utf8');

    await page.goto(pathToFileURL(printHtmlPath).href, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images).map((img) =>
          img.complete
            ? null
            : Promise.race([
                new Promise((r) => {
                  img.addEventListener('load', r, { once: true });
                  img.addEventListener('error', r, { once: true });
                }),
                new Promise((r) => setTimeout(r, 5000)),
              ])
        )
      );
    });

    await page.pdf({
      path: outPath,
      width: '1920px',
      height: '1080px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    const sizeKB = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`PDF EXPORT PASS (${mode}, ${shots.length} beat(s), ${sizeKB} KB) -> ${outPath}`);
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  console.error(`PDF EXPORT ERROR: ${err.message}`);
  process.exit(1);
});
