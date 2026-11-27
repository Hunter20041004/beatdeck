import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getBrowserExecutablePath, launchBrowser, parseCliArgs } from '../scripts/lib/browser.mjs';
import { checkText, isSloganHeadline } from '../scripts/lib/copy-rules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEMO_DECK = path.join(ROOT, 'examples', 'beatdeck-intro', 'deck.html');
const MOTION_DECK = path.join(ROOT, 'examples', 'motion-gallery', 'deck.html');

// 1x1 valid PNG (68 bytes)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

function runNode(scriptRelPath, args = []) {
  const scriptPath = path.join(ROOT, scriptRelPath);
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

// Minimal stage fit + key/click navigation for hand-written fixtures, so they meet lint's
// stage-fit and controls checks (stage-contract.md §1). Injected right before </body>.
const FIXTURE_STAGE_RUNTIME = `<style>
  html, body { overflow: hidden; }
  #stage { position: absolute !important; left: 0; top: 0; transform-origin: 0 0; }
</style>
<script>
  (() => {
    const st = document.getElementById('stage');
    const fit = () => {
      const w = window.innerWidth, h = window.innerHeight, s = Math.min(w / 1920, h / 1080);
      st.style.transform = 'translate(' + (w - 1920 * s) / 2 + 'px,' + (h - 1080 * s) / 2 + 'px) scale(' + s + ')';
    };
    fit();
    window.addEventListener('resize', fit);
    const go = (d) => window.__beatdeck.goTo(Math.max(0, Math.min(window.__beatdeck.list().length - 1, window.__beatdeck.current() + d)));
    window.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
    document.addEventListener('click', (e) => go(e.clientX < window.innerWidth * 0.25 ? -1 : 1));
  })();
</script>
`;

function buildNegativeFixtureHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #111; }
  #stage {
    position: relative;
    width: 1920px;
    height: 1080px;
    background: #f6f2ea;
    overflow: hidden;
  }
  .overflow-box {
    position: absolute;
    left: 1780px;
    top: 100px;
    width: 400px;
    font-size: 36px;
    color: #18181b;
  }
  .wrap-box {
    position: absolute;
    left: 100px;
    top: 240px;
    width: 220px;
    font-size: 32px;
    line-height: 1.25;
    color: #18181b;
  }
</style>
</head>
<body>
  <div id="stage">
    <div class="overflow-box">This text clearly overflows past 1920px stage right edge</div>
    <h1 class="wrap-box" data-expected-lines="1">This headline wraps across multiple lines unexpectedly</h1>
  </div>
  <script>
    window.__beatdeck = {
      version: '1.0',
      meta: { title: 'Negative Fixture', width: 1920, height: 1080 },
      list: () => [{ index: 0, id: 'bad', chapter: 'Bad', speaker: 'Tester', say: 'Bad layout' }],
      current: () => 0,
      goTo: () => {},
      setSubtitle: () => {},
    };
    document.fonts.ready.then(() => { document.body.dataset.ready = '1'; });
  </script>
</body>
</html>`;
}

function buildCraftWarningFixtureHtml() {
  const cards = (prefix) =>
    [0, 1, 2, 3]
      .map(
        (i) =>
          `<div class="card" style="left:${120 + i * 430}px">${prefix} card ${i + 1}<div class="inner">Nested panel</div></div>`
      )
      .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; }
  #stage { position: relative; width: 1920px; height: 1080px; background: #fff; overflow: hidden; font: 28px/1.2 sans-serif; }
  .beat { display: none; }
  .beat.on { display: block; }
  .card { position: absolute; top: 300px; width: 380px; height: 320px; padding: 20px; box-sizing: border-box; border: 2px solid #999; border-radius: 12px; }
  .inner { margin-top: 40px; height: 140px; padding: 10px; border: 1px solid #bbb; }
  .a { position: absolute; left: 120px; top: 120px; font-size: 64px; }
  .b { position: absolute; left: 300px; top: 140px; font-size: 32px; }
</style>
</head>
<body>
  <div id="stage">
    <div class="beat on" id="b0">${cards('First')}<img alt="capture" style="position:absolute;left:1500px;top:40px;width:300px;height:169px" src="data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'%3E%3Crect width='1600' height='900' fill='%23ccc'/%3E%3C/svg%3E"><p class="a">Headline \u{1F680}</p><p class="b">Colliding label</p></div>
    <div class="beat" id="b1">${cards('Second')}</div>
  </div>
  <script>
    let cur = 0;
    window.__beatdeck = {
      version: '1.0',
      meta: { title: 'Craft Warnings', width: 1920, height: 1080 },
      list: () => [{ index: 0, say: 'one' }, { index: 1, say: 'two' }],
      current: () => cur,
      goTo: (i) => { cur = i; document.querySelectorAll('.beat').forEach((b, k) => b.classList.toggle('on', k === i)); },
      setSubtitle: () => {},
    };
    document.body.dataset.ready = '1';
  </script>
${FIXTURE_STAGE_RUNTIME}</body>
</html>`;
}

function buildAiTellFixtureHtml() {
  const words = Array.from({ length: 7 }, (_, i) =>
    `<li>Item ${i + 1} covers regional quarterly figures across every market segment we track</li>`
  ).join('');
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; }
  #stage { position: relative; width: 1920px; height: 1080px; background: #f4f1ea; overflow: hidden; font: 28px/1.3 sans-serif; }
  .beat { display: none; position: absolute; inset: 0; }
  .beat.on { display: block; }
  .grad { position: absolute; left: 0; top: 0; width: 1920px; height: 200px; background: linear-gradient(90deg, #6d28d9, #2563eb); }
  h1 { position: absolute; left: 100px; top: 260px; margin: 0; font-size: 120px; background: linear-gradient(90deg, #7c3aed, #db2777); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .glass { position: absolute; top: 500px; width: 400px; height: 200px; backdrop-filter: blur(12px); background: rgba(255,255,255,0.3); }
  .copy { position: absolute; left: 100px; top: 760px; width: 1700px; }
  ul { position: absolute; left: 100px; top: 80px; width: 1700px; margin: 0; }
  .copy2 { position: absolute; left: 100px; top: 760px; width: 1700px; }
</style>
</head>
<body>
  <div id="stage">
    <div class="beat on">
      <div class="grad"></div>
      <h1>議程</h1>
      <div class="glass" style="left:100px">A</div><div class="glass" style="left:600px">B</div>
      <p class="copy">在當今數位時代，我們以AI賦能團隊,打造極致體驗。这个視頻很棒——真的。經過三輪審查與 5 次調整。躲起來，是一場賭。</p>
    </div>
    <div class="beat">
      <ul>${words}</ul>
      <p class="copy2">Quarterly revenue grew in every region we measured this year. TODO 不僅省時，更省錢 — Done! <span data-lint-allow="ai-phrase">我們的賦能方案</span></p>
    </div>
  </div>
  <script>
    let cur = 0;
    window.__beatdeck = {
      version: '1.0',
      meta: { title: 'AI Tells', lang: 'zh-Hant', width: 1920, height: 1080 },
      list: () => [
        { index: 0, id: 'one', say: '這不是工具，而是夥伴！' },
        { index: 1, id: 'two', say: "Quarterly revenue grew in every region we measured this year, let's delve in." },
      ],
      current: () => cur,
      goTo: (i) => { cur = i; document.querySelectorAll('.beat').forEach((b, k) => b.classList.toggle('on', k === i)); },
      setSubtitle: () => {},
    };
    document.body.dataset.ready = '1';
  </script>
${FIXTURE_STAGE_RUNTIME}</body>
</html>`;
}

function buildRegressionFixtures(tmpDir) {
  const regDir = path.join(tmpDir, 'regression');
  fs.mkdirSync(regDir, { recursive: true });
  fs.writeFileSync(path.join(regDir, 'my img.png'), TINY_PNG);

  // Fixture A: bundle-share + script-export note + pdfSkip index mapping + display:contents lint pass
  const bundleAndPdfDeck = path.join(regDir, 'bundle-pdf-note.html');
  fs.writeFileSync(
    bundleAndPdfDeck,
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
  #stage { position: relative; width: 1920px; height: 1080px; background: #f6f2ea; overflow: hidden; }
  .contents-wrap { display: contents; }
  .card { position: absolute; left: 120px; top: 120px; font-size: 36px; color: #18181b; }
</style>
</head>
<body>
  <div id="stage">
    <div class="contents-wrap" data-expected-lines="1">
      <span class="card" id="headline">Beat 01</span>
    </div>
    <img src="my%20img.png" data-src="ignored-lazy.png" alt="tiny" style="position:absolute;left:40px;top:40px;width:32px;height:32px;">
  </div>
  <script>
    const sampleHtml = '<img src="x.png">';
    const BEATS = [
      { index: 0, chapter: 'Skip', speaker: 'Host', say: 'Skipped slide', note: 'Pause 1s', pdfSkip: true },
      { index: 1, chapter: 'Keep A', speaker: 'Host', say: 'Kept second beat', note: 'Cue visual' },
      { index: 2, chapter: 'Keep B', speaker: 'Guest', say: 'Kept third beat' }
    ];
    let cur = 0;
    const h = document.getElementById('headline');
    window.__beatdeck = {
      version: '1.0',
      meta: { title: 'Regression\\nDeck', subtitle: 'Line1\\nLine2', width: 1920, height: 1080 },
      list: () => BEATS,
      current: () => cur,
      goTo: (i) => { cur = i; h.textContent = 'Beat 0' + (i + 1) + ' (' + sampleHtml.length + ')'; },
      setSubtitle: () => {},
    };
    document.fonts.ready.then(() => { document.body.dataset.ready = '1'; });
  </script>
${FIXTURE_STAGE_RUNTIME}</body>
</html>`,
    'utf8'
  );

  // Fixture B: non-1920x1080 #stage + display:contents unexpected line-wrap
  const badStageDeck = path.join(regDir, 'bad-stage.html');
  fs.writeFileSync(
    badStageDeck,
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; }
  #stage { position: relative; width: 1280px; height: 720px; background: #fff; }
  .contents-box { display: contents; }
  .narrow { position: absolute; left: 40px; top: 40px; width: 140px; font-size: 32px; }
</style>
</head>
<body>
  <div id="stage">
    <div class="contents-box" data-expected-lines="1">
      <div class="narrow">Wraps across multiple lines inside display contents</div>
    </div>
  </div>
  <script>
    window.__beatdeck = {
      version: '1.0',
      meta: { title: 'Bad Stage', width: 1920, height: 1080 },
      list: () => [{ index: 0, chapter: 'Bad', say: 'Wrong stage size' }],
      current: () => 0,
      goTo: () => {},
      setSubtitle: () => {},
    };
    document.fonts.ready.then(() => { document.body.dataset.ready = '1'; });
  </script>
</body>
</html>`,
    'utf8'
  );

  return { bundleAndPdfDeck, badStageDeck };
}

async function runTests() {
  assert.ok(fs.existsSync(DEMO_DECK), `Demo deck not found at ${DEMO_DECK}`);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beatdeck-e2e-'));
  try {
    // 1) Verify Playwright bundled Chromium isolation
    const execPath = getBrowserExecutablePath();
    console.log('1) Browser executablePath:', execPath);
    assert.ok(fs.existsSync(execPath), `Playwright Chromium executable does not exist: ${execPath}`);
    assert.ok(
      !execPath.includes('Google Chrome.app'),
      `Browser executable must not use system Google Chrome.app: ${execPath}`
    );

    // 2) Run lint.mjs on demo deck (must exit 0)
    console.log('2) Running lint.mjs on demo deck...');
    const lintDemo = runNode('scripts/lint.mjs', [DEMO_DECK]);
    assert.equal(
      lintDemo.status,
      0,
      `lint.mjs failed on demo deck:\n${lintDemo.stdout}\n${lintDemo.stderr}`
    );
    console.log('   ', lintDemo.stdout.trim());

    // 3) Run lint.mjs on negative fixture (must exit non-zero and catch both overflow & line-wrap)
    console.log('3) Running lint.mjs on negative fixture...');
    const negPath = path.join(tmpDir, 'negative-deck.html');
    fs.writeFileSync(negPath, buildNegativeFixtureHtml(), 'utf8');
    const lintNeg = runNode('scripts/lint.mjs', [negPath]);
    assert.notEqual(lintNeg.status, 0, 'lint.mjs unexpectedly passed on negative fixture');
    assert.match(lintNeg.stderr, /overflow/i, 'Negative lint should report overflow');
    assert.match(lintNeg.stderr, /line-wrap/i, 'Negative lint should report line-wrap');
    console.log('   Negative fixture caught expected failures.');

    // 4) Run script-export.mjs
    console.log('4) Running script-export.mjs...');
    const scriptOut = path.join(tmpDir, 'script.md');
    const scriptRes = runNode('scripts/script-export.mjs', [DEMO_DECK, '--out', scriptOut]);
    assert.equal(
      scriptRes.status,
      0,
      `script-export.mjs failed:\n${scriptRes.stdout}\n${scriptRes.stderr}`
    );
    const md = fs.readFileSync(scriptOut, 'utf8');
    assert.match(md, /Beatdeck/i);
    assert.match(md, /\| Beat \| Start \| Sec \| Chapter \| Speaker \| Line \|/);
    assert.match(md, /\| 1 \| 00:00\.0 \|/);
    console.log('   ', scriptRes.stdout.trim());

    // 5) Run pdf-export.mjs --mode slides and --mode storyboard
    console.log('5) Running pdf-export.mjs (slides & storyboard)...');
    const slidesPdf = path.join(tmpDir, 'slides.pdf');
    const storyboardPdf = path.join(tmpDir, 'storyboard.pdf');

    const pdfSlidesRes = runNode('scripts/pdf-export.mjs', [
      DEMO_DECK,
      '--mode',
      'slides',
      '--out',
      slidesPdf,
    ]);
    assert.equal(
      pdfSlidesRes.status,
      0,
      `pdf-export slides failed:\n${pdfSlidesRes.stdout}\n${pdfSlidesRes.stderr}`
    );
    const slidesBuf = fs.readFileSync(slidesPdf);
    assert.equal(slidesBuf.subarray(0, 5).toString('utf8'), '%PDF-');
    assert.ok(slidesBuf.length > 10 * 1024, `slides.pdf too small: ${slidesBuf.length}`);
    console.log('   ', pdfSlidesRes.stdout.trim());

    const pdfBoardRes = runNode('scripts/pdf-export.mjs', [
      DEMO_DECK,
      '--mode',
      'storyboard',
      '--cols',
      '2',
      '--out',
      storyboardPdf,
    ]);
    assert.equal(
      pdfBoardRes.status,
      0,
      `pdf-export storyboard failed:\n${pdfBoardRes.stdout}\n${pdfBoardRes.stderr}`
    );
    const boardBuf = fs.readFileSync(storyboardPdf);
    assert.equal(boardBuf.subarray(0, 5).toString('utf8'), '%PDF-');
    assert.ok(boardBuf.length > 10 * 1024, `storyboard.pdf too small: ${boardBuf.length}`);
    console.log('   ', pdfBoardRes.stdout.trim());

    // 6) Run bundle-share.mjs -> verify HTML exists and passes lint.mjs
    console.log('6) Running bundle-share.mjs...');
    const shareOut = path.join(tmpDir, 'deck-share.html');
    const bundleRes = runNode('scripts/bundle-share.mjs', [DEMO_DECK, '--out', shareOut]);
    assert.equal(
      bundleRes.status,
      0,
      `bundle-share.mjs failed:\n${bundleRes.stdout}\n${bundleRes.stderr}`
    );
    assert.ok(fs.existsSync(shareOut), 'deck-share.html was not created');
    const lintShare = runNode('scripts/lint.mjs', [shareOut]);
    assert.equal(
      lintShare.status,
      0,
      `Bundled share HTML failed lint.mjs:\n${lintShare.stdout}\n${lintShare.stderr}`
    );
    console.log('   ', bundleRes.stdout.trim());

    // 7) Run record-video.mjs on a quick 2-beat 4-second plan at 30fps, slow=2
    console.log('7) Running record-video.mjs (2 beats, 4s @ 30fps, slow=2)...');
    const ffmpegCheck = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    assert.equal(
      ffmpegCheck.status,
      0,
      'ffmpeg is required for record-video.mjs e2e test (install ffmpeg or check PATH).'
    );

    const planPath = path.join(tmpDir, 'plan.json');
    fs.writeFileSync(
      planPath,
      JSON.stringify(
        {
          totalDuration: 4,
          beats: [
            { beat: 0, at: 0, duration: 2, subtitle: 'Beat 1: Static slides keep audiences asleep.' },
            { beat: 1, at: 2, duration: 2, subtitle: 'Beat 2: Direct one visual stage per beat.' },
          ],
        },
        null,
        2
      ),
      'utf8'
    );

    const mp4Out = path.join(tmpDir, 'demo-clip.mp4');
    const recRes = runNode('scripts/record-video.mjs', [
      DEMO_DECK,
      '--plan',
      planPath,
      '--fps',
      '30',
      '--slow',
      '2',
      '--out',
      mp4Out,
    ]);
    assert.equal(
      recRes.status,
      0,
      `record-video.mjs failed:\n${recRes.stdout}\n${recRes.stderr}`
    );
    assert.ok(fs.existsSync(mp4Out), 'MP4 output was not created');

    const probeOut = execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=codec_name,width,height',
        '-of',
        'json',
        mp4Out,
      ],
      { encoding: 'utf8' }
    );
    const probeJson = JSON.parse(probeOut);
    const stream = probeJson.streams?.[0];
    assert.ok(stream, `No video stream found by ffprobe in ${mp4Out}`);
    assert.equal(stream.codec_name, 'h264', `Expected h264 codec, got ${stream.codec_name}`);
    assert.equal(stream.width, 1920, `Expected width 1920, got ${stream.width}`);
    assert.equal(stream.height, 1080, `Expected height 1080, got ${stream.height}`);
    console.log('   ffprobe verified:', JSON.stringify(stream));

    // 8) Regression suite for review fixes
    console.log('8) Running regression tests...');

    // 8a) parseCliArgs missing value throws & --flag=false returns boolean false
    assert.throws(() => parseCliArgs(['deck.html', '--out']), /Missing value for flag --out/);
    assert.throws(
      () => parseCliArgs(['deck.html', '--out', '--fps', '60']),
      /Missing value for flag --out/
    );
    const parsedBool = parseCliArgs(
      ['deck.html', '--frames-only=false'],
      new Set(['frames-only'])
    );
    assert.equal(parsedBool.flags['frames-only'], false);

    const { bundleAndPdfDeck, badStageDeck } = buildRegressionFixtures(tmpDir);

    // 8b) script-export preserves beat.note & collapses multiline title/subtitle
    const regScript = runNode('scripts/script-export.mjs', [bundleAndPdfDeck]);
    assert.equal(regScript.status, 0, regScript.stderr);
    assert.match(regScript.stdout, /# Regression Deck/);
    assert.match(regScript.stdout, /> Line1 Line2/);
    assert.match(regScript.stdout, /\*\(Note: Pause 1s\)\*/);

    // 8c) bundle-share ignores script string '<img src="x.png">', ignores data-src, decodes %20
    const regShareOut = path.join(tmpDir, 'reg-share.html');
    const regBundle = runNode('scripts/bundle-share.mjs', [bundleAndPdfDeck, '--out', regShareOut]);
    assert.equal(regBundle.status, 0, regBundle.stderr);
    const bundledHtml = fs.readFileSync(regShareOut, 'utf8');
    assert.match(bundledHtml, /src="data:image\/png;base64,/);
    assert.match(bundledHtml, /data-src="ignored-lazy\.png"/);
    assert.match(bundledHtml, /const sampleHtml = '<img src="x\.png">';/);

    // 8d) lint.mjs passes display:contents valid deck and fails non-1920x1080 #stage + display:contents wrap
    const regLintOk = runNode('scripts/lint.mjs', [bundleAndPdfDeck]);
    assert.equal(regLintOk.status, 0, regLintOk.stderr);

    const regLintBad = runNode('scripts/lint.mjs', [badStageDeck]);
    assert.notEqual(regLintBad.status, 0, 'badStageDeck must fail lint.mjs');
    assert.match(regLintBad.stderr, /1920x1080/);
    assert.match(regLintBad.stderr, /line-wrap/i);

    // 8e) pdf-export preserves original beat indices across pdfSkip
    const regPdfOut = path.join(tmpDir, 'reg-skip.pdf');
    const regPdf = runNode('scripts/pdf-export.mjs', [
      bundleAndPdfDeck,
      '--mode',
      'slides',
      '--out',
      regPdfOut,
    ]);
    assert.equal(regPdf.status, 0, regPdf.stderr);
    assert.match(regPdf.stdout, /2 beat\(s\)/);
    assert.equal(fs.readFileSync(regPdfOut).subarray(0, 5).toString('utf8'), '%PDF-');

    // 8f) record-video --frames-only normalizes .mp4 --out to -frames dir & reports active-motion stats
    const framesMp4Arg = path.join(tmpDir, 'frames-only-check.mp4');
    const expectedFramesDir = path.join(tmpDir, 'frames-only-check-frames');
    const shortPlan = path.join(tmpDir, 'frames-plan.json');
    fs.writeFileSync(
      shortPlan,
      JSON.stringify({ total: 1.5, events: [{ at: 0, beat: 0, duration: 1.5, subtitle: 'Test' }] }),
      'utf8'
    );
    const framesRes = runNode('scripts/record-video.mjs', [
      bundleAndPdfDeck,
      '--plan',
      shortPlan,
      '--fps',
      '20',
      '--slow',
      '1',
      '--frames-only',
      '--out',
      framesMp4Arg,
    ]);
    assert.equal(framesRes.status, 0, framesRes.stderr);
    assert.equal(fs.existsSync(framesMp4Arg), false, 'Must not create a .mp4 directory/file in --frames-only');
    assert.ok(fs.existsSync(path.join(expectedFramesDir, 's000001.jpg')), 'Expected s000001.jpg');
    assert.match(framesRes.stdout, /Active-motion drops/);
    console.log('   Regression tests passed.');

    // 9) v1.3 tooling: new-deck scaffold, lint --json/--strict craft warnings, snapshot, browser override
    console.log('9) Running v1.3 tooling tests...');

    // 9a) new-deck.mjs scaffolds a contract-valid skeleton that lint passes but --strict rejects
    const skelPath = path.join(tmpDir, 'skeleton', 'deck.html');
    const scaffold = runNode('scripts/new-deck.mjs', [
      skelPath, '--title', 'Skeleton </script> "Check"', '--lang', 'zh-Hant', '--ids', 'opening,shift,proof',
    ]);
    assert.equal(scaffold.status, 0, scaffold.stderr);
    const refuse = runNode('scripts/new-deck.mjs', [skelPath]);
    assert.notEqual(refuse.status, 0, 'new-deck must refuse to overwrite without --force');
    const skelLint = runNode('scripts/lint.mjs', [skelPath, '--json']);
    assert.equal(skelLint.status, 0, skelLint.stdout + skelLint.stderr);
    const skelReport = JSON.parse(skelLint.stdout);
    assert.equal(skelReport.beats, 3);
    assert.equal(skelReport.errors.length, 0);
    assert.equal(skelReport.warnings.filter((w) => w.type === 'skeleton').length, 3);
    const skelStrict = runNode('scripts/lint.mjs', [skelPath, '--strict']);
    assert.notEqual(skelStrict.status, 0, 'lint --strict must fail while skeleton placeholders remain');
    const skelScript = runNode('scripts/script-export.mjs', [skelPath]);
    assert.equal(skelScript.status, 0, skelScript.stderr);
    assert.match(skelScript.stdout, /# Skeleton <\/script> "Check"/);
    // `$` sequences in --title must be inserted literally (no String.replace pattern expansion)
    const dollarPath = path.join(tmpDir, 'skeleton', 'dollar.html');
    const dollar = runNode('scripts/new-deck.mjs', [dollarPath, '--title', 'Save $$ and $& now', '--beats', '1']);
    assert.equal(dollar.status, 0, dollar.stderr);
    const dollarHtml = fs.readFileSync(dollarPath, 'utf8');
    assert.ok(dollarHtml.includes('<title>Save $$ and $&amp; now</title>'), 'title tag must keep $ sequences');
    assert.ok(dollarHtml.includes('title: "Save $$ and $& now"'), 'META.title must keep $ sequences');

    // 9b) craft fixture triggers card-shell, nested-card, emoji and text-collision warnings
    const craftPath = path.join(tmpDir, 'craft-warn.html');
    fs.writeFileSync(craftPath, buildCraftWarningFixtureHtml(), 'utf8');
    const craftLint = runNode('scripts/lint.mjs', [craftPath, '--json']);
    assert.equal(craftLint.status, 0, 'craft warnings alone must not fail lint without --strict');
    const craftTypes = new Set(JSON.parse(craftLint.stdout).warnings.map((w) => w.type));
    for (const t of ['card-shell', 'nested-card', 'emoji', 'text-collision', 'layout-repeat', 'small-capture']) {
      assert.ok(craftTypes.has(t), `expected ${t} warning, got ${[...craftTypes].join(', ')}`);
    }

    // 9c) snapshot.mjs writes selected beat PNGs + contact sheet, and --raw captures a hero page
    const snapDir = path.join(tmpDir, 'snaps');
    const snap = runNode('scripts/snapshot.mjs', [DEMO_DECK, '--beats', '1,3-4', '--out', snapDir]);
    assert.equal(snap.status, 0, snap.stderr);
    for (const name of ['beat-01.png', 'beat-03.png', 'beat-04.png', 'contact-sheet.png']) {
      const buf = fs.readFileSync(path.join(snapDir, name));
      assert.equal(buf.subarray(1, 4).toString('latin1'), 'PNG', `${name} is not a PNG`);
    }
    assert.equal(fs.existsSync(path.join(snapDir, 'beat-02.png')), false);
    const heroPath = path.join(tmpDir, 'hero.html');
    fs.writeFileSync(heroPath, '<!doctype html><body style="margin:0;background:#123"><svg width="1920" height="1080"><circle cx="960" cy="540" r="300" fill="#e0542b"/></svg></body>', 'utf8');
    const rawSnap = runNode('scripts/snapshot.mjs', [heroPath, '--raw', '--out', snapDir]);
    assert.equal(rawSnap.status, 0, rawSnap.stderr);
    assert.ok(fs.existsSync(path.join(snapDir, 'hero.png')), 'raw snapshot hero.png missing');

    // 9d) BEATDECK_CHROMIUM override is honored and validated
    const badOverride = spawnSync(process.execPath, [path.join(ROOT, 'scripts/lint.mjs'), DEMO_DECK], {
      cwd: ROOT, encoding: 'utf8', env: { ...process.env, BEATDECK_CHROMIUM: path.join(tmpDir, 'no-such-chrome') },
    });
    assert.notEqual(badOverride.status, 0);
    assert.match(badOverride.stderr, /BEATDECK_CHROMIUM points to a missing file/);
    console.log('   v1.3 tooling tests passed.');

    // 10) AI-tell checks: visual defaults + EN/zh-Hant wording on stage and in narration
    console.log('10) Running AI-tell lint tests...');
    const aiPath = path.join(tmpDir, 'ai-tells.html');
    fs.writeFileSync(aiPath, buildAiTellFixtureHtml(), 'utf8');
    const aiLint = runNode('scripts/lint.mjs', [aiPath, '--json']);
    assert.equal(aiLint.status, 0, 'AI-tell warnings alone must not fail lint without --strict');
    const aiWarnings = JSON.parse(aiLint.stdout).warnings;
    const aiTypes = new Set(aiWarnings.map((w) => w.type));
    for (const t of [
      'ai-gradient', 'gradient-text', 'glassmorphism', 'label-headline', 'ai-phrase', 'zh-punct',
      'zh-variant', 'zh-term', 'contrast-frame', 'exclamation', 'em-dash', 'bullet-stack',
      'text-density', 'read-aloud', 'placeholder', 'internal-process', 'metaphor-frame',
    ]) {
      assert.ok(aiTypes.has(t), `expected ${t} warning, got ${[...aiTypes].join(', ')}`);
    }
    assert.ok(
      aiWarnings.some((w) => w.type === 'ai-phrase' && /beat 2\/2 \(two\) say/.test(w.beat) && /delve/.test(w.message)),
      'narration ai-phrase must be reported against the say line'
    );
    assert.ok(
      !aiWarnings.some((w) => w.type === 'ai-phrase' && /beat 2\/2 \(two\) stage/.test(w.beat)),
      'data-lint-allow="ai-phrase" must exempt the stage span'
    );
    // Slogan cadence is a deck-level headline rhythm check
    assert.equal(isSloganHeadline('死一次，只賠一夜。'), true);
    assert.equal(isSloganHeadline('Three lenses.Zero broken frames.'), true);
    assert.equal(isSloganHeadline('被怪看見躲進衣櫃，牠會守在門口等你出來'), false);
    assert.equal(isSloganHeadline('Beatdeck v1.3 ships today.'), false);
    const aiStrict = runNode('scripts/lint.mjs', [aiPath, '--strict']);
    assert.notEqual(aiStrict.status, 0, 'lint --strict must fail on AI tells');
    const demoStrict = runNode('scripts/lint.mjs', [DEMO_DECK, '--strict']);
    assert.equal(demoStrict.status, 0, `demo deck must pass --strict:\n${demoStrict.stderr}`);
    console.log('   AI-tell lint tests passed.');

    // 11) Stage fitting: centred and fully visible at any viewport size, not only 1920x1080
    console.log('11) Checking stage fit at several viewport sizes...');
    const fitBrowser = await launchBrowser();
    try {
      for (const file of [DEMO_DECK, skelPath]) {
        for (const [w, h] of [[1000, 515], [1280, 1000], [420, 800]]) {
          const page = await fitBrowser.newPage({ viewport: { width: w, height: h } });
          await page.goto(pathToFileURL(file).href);
          await page.waitForFunction(() => document.body.dataset.ready === '1');
          const r = await page.evaluate(() => {
            const b = document.getElementById('stage').getBoundingClientRect();
            return { l: b.left, t: b.top, r: b.right, b: b.bottom };
          });
          await page.close();
          const where = `${path.basename(path.dirname(file))}/${path.basename(file)} @ ${w}x${h}: ${JSON.stringify(r)}`;
          assert.ok(r.l >= -1 && r.t >= -1 && r.r <= w + 1 && r.b <= h + 1, `stage leaves the viewport ${where}`);
          assert.ok(Math.abs(r.l - (w - r.r)) <= 2 && Math.abs(r.t - (h - r.b)) <= 2, `stage not centred ${where}`);
        }
      }
    } finally {
      await fitBrowser.close();
    }
    console.log('   Stage fit checks passed.');

    // 12) lint catches the old centre-origin scaling (the "opens skewed inside Claude" bug) and dead controls
    console.log('12) Checking lint stage-fit / controls failures...');
    const skelSrc = fs.readFileSync(skelPath, 'utf8');
    const legacyFit = skelSrc
      .replace(/#viewport \{[^}]*\}/, '#viewport { position: relative; width: 100%; height: 100%; display: grid; place-items: center; }')
      .replace('position: absolute; left: 0; top: 0; width: 1920px; height: 1080px;\n    transform-origin: 0 0;', 'position: relative; width: 1920px; height: 1080px; flex: none;\n    transform-origin: center center;')
      .replace(/stage\.style\.transform = `translate\([^`]*`;/, 'stage.style.transform = `scale(${s})`;');
    assert.notEqual(legacyFit, skelSrc, 'legacy-fit fixture must differ from the skeleton');
    const legacyPath = path.join(tmpDir, 'legacy-fit.html');
    fs.writeFileSync(legacyPath, legacyFit, 'utf8');
    const legacyLint = runNode('scripts/lint.mjs', [legacyPath]);
    assert.notEqual(legacyLint.status, 0, 'lint must fail a deck scaled around its centre');
    assert.match(legacyLint.stderr, /\(stage-fit\)/);
    const deadKeysPath = path.join(tmpDir, 'dead-keys.html');
    fs.writeFileSync(deadKeysPath, skelSrc.replace('window.addEventListener("keydown"', 'window.addEventListener("keydown-disabled"'), 'utf8');
    const deadKeysLint = runNode('scripts/lint.mjs', [deadKeysPath]);
    assert.notEqual(deadKeysLint.status, 0, 'lint must fail a deck whose keyboard navigation is dead');
    assert.match(deadKeysLint.stderr, /\(controls\) ArrowRight/);
    console.log('   Stage-fit / controls lint failures caught.');

    // 13) Motion: gallery passes strict lint, helpers settle under ?still, beat changes play and clean up,
    //     filmstrip renders, lint flags effect excess and asks a quiet deck for one signature moment.
    console.log('13) Checking motion helpers, beat changes, filmstrip and motion lint...');
    const galleryLint = runNode('scripts/lint.mjs', [MOTION_DECK, '--strict', '--json']);
    assert.equal(galleryLint.status, 0, `motion gallery must pass lint --strict:\n${galleryLint.stdout}${galleryLint.stderr}`);

    const motionBrowser = await launchBrowser();
    try {
      const page = await (await motionBrowser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const stillAt = async (p) => {
        await page.goto(`${pathToFileURL(MOTION_DECK).href}?still&p=${p}`);
        await page.waitForFunction(() => document.body.dataset.ready === '1');
      };
      await stillAt(2);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.s2-stamp')).opacity), '1', 'stamp must settle visible under ?still');
      await stillAt(3);
      assert.match(await page.evaluate(() => getComputedStyle(document.querySelector('.s3-new')).clipPath), /^inset\(0(px|%)?( 0(px|%)?)*\)$|^none$/, 'wipe must settle open under ?still');
      await stillAt(4);
      const marker = await page.evaluate(() => document.querySelector('#b4-marker').getAttribute('transform'));
      assert.match(marker || '', /^translate\(17[12]\d/, `followPath must settle at the end of the route, got ${marker}`);
      await stillAt(5);
      assert.equal(await page.evaluate(() => document.querySelector('#b5-num').textContent), '12', 'countUp must settle on its target');
      await stillAt(7);
      const d = await page.evaluate(() => document.querySelector('#b7-curve').getAttribute('d'));
      assert.notEqual(d.split('L').length, 2, 'morph must settle on the spring curve');

      await page.goto(pathToFileURL(MOTION_DECK).href);
      await page.waitForFunction(() => document.body.dataset.ready === '1');
      const state = () => page.evaluate(() => ({
        t: document.body.dataset.beatTransition,
        leaving: document.querySelectorAll('.scene.is-leaving').length,
        active: document.querySelectorAll('.scene.is-active').length,
      }));
      await page.evaluate(() => window.__beatdeck.goTo(1));
      assert.deepEqual(await state(), { t: 'cut', leaving: 0, active: 1 }, 'cut must not keep a leaving scene');
      await page.evaluate(() => window.__beatdeck.goTo(2));
      assert.deepEqual(await state(), { t: 'wipe', leaving: 1, active: 1 }, 'wipe must keep the old scene during the change');
      await page.evaluate(() => { window.__beatdeck.goTo(3); window.__beatdeck.goTo(4); });
      assert.equal((await state()).leaving, 1, 'a change interrupted by the next one must finish first');
      await page.waitForTimeout(1300);
      assert.deepEqual(await state(), { t: 'match', leaving: 0, active: 1 }, 'leaving scene must be released after the change');
      await page.evaluate(() => window.__beatdeck.goTo(3));
      assert.equal((await state()).t, 'match', 'going back must replay the left beat\'s change');
      assert.deepEqual(errors, [], `runtime errors while changing beats: ${errors.join('; ')}`);
    } finally {
      await motionBrowser.close();
    }

    const stripDir = path.join(tmpDir, 'filmstrip');
    const strip = runNode('scripts/filmstrip.mjs', [MOTION_DECK, '--beats', '5', '--times', '0,400', '--out', stripDir]);
    assert.equal(strip.status, 0, strip.stderr);
    assert.ok(fs.existsSync(path.join(stripDir, 'filmstrip.png')) && fs.existsSync(path.join(stripDir, 'motion-05.png')));

    // A deck that throws effects at every beat must be flagged as excessive...
    const ids6 = ['a', 'b', 'c', 'd', 'e', 'f'];
    const makeFixture = (name, choreo, changes) => {
      const file = path.join(tmpDir, name, 'deck.html');
      assert.equal(runNode('scripts/new-deck.mjs', [file, '--ids', ids6.join(',')]).status, 0);
      let src = fs.readFileSync(file, 'utf8');
      const before = src;
      src = src.replace(/\/\/ "a": \(scene[\s\S]*?\/\/ \},/, ids6.map((id) => `"${id}": ${choreo},`).join('\n'));
      if (changes) ids6.forEach((id, k) => { src = src.replace(`{ id: "${id}",`, `{ id: "${id}", transition: "${changes[k % changes.length]}",`); });
      assert.notEqual(src, before, `${name} fixture must inject choreography`);
      fs.writeFileSync(file, src, 'utf8');
      return file;
    };
    const loudPath = makeFixture(
      'loud-motion',
      '(scene, { spring, stamp, shake, splitText, stagger }) => { const h = scene.querySelector("h1"); stagger(splitText(h), (el, delay) => spring(el, { translate: ["0 300px", "0 0"], opacity: [0, 1] }, { delay, damping: 8 }), { each: 30 }); stamp(scene.querySelector("p"), { impact: h }); }',
      ['iris', 'zoom', 'push-left', 'blur', 'cover-up']
    );
    const loudTypes = new Set(JSON.parse(runNode('scripts/lint.mjs', [loudPath, '--json']).stdout).warnings.map((w) => w.type));
    for (const t of ['motion-accent-overuse', 'motion-busy', 'motion-bounce', 'motion-travel', 'transition-variety']) {
      assert.ok(loudTypes.has(t), `lint must flag ${t} on a deck that uses effects everywhere (got ${[...loudTypes].join(', ')})`);
    }
    // ...while a quiet deck passes the excess checks and is only asked for a signature moment and a bridge.
    const quietPath = makeFixture('quiet-motion', '(scene, { rise, unveil }) => { unveil(scene.querySelector("h1")); rise(scene.querySelectorAll("p"), { delay: 200 }); }');
    const quietTypes = JSON.parse(runNode('scripts/lint.mjs', [quietPath, '--json']).stdout).warnings.map((w) => w.type).filter((t) => /^motion-|^transition-/.test(t));
    assert.deepEqual(quietTypes.sort(), ['motion-no-signature', 'transition-monotone'], `a quiet all-fade deck must only be asked for a signature moment and a bridge (got ${quietTypes.join(', ')})`);
    // carry(): an element shared with the previous beat starts where it was there.
    const carryPath = path.join(tmpDir, 'carry', 'deck.html');
    assert.equal(runNode('scripts/new-deck.mjs', [carryPath, '--ids', 'a,b']).status, 0);
    let carrySrc = fs.readFileSync(carryPath, 'utf8');
    carrySrc = carrySrc
      .replace(/(<section class="scene" data-beat="a"[^>]*>)/, '$1<div class="bd-probe" data-match="m" style="position:absolute;left:100px;top:500px;width:40px;height:40px"></div>')
      .replace(/(<section class="scene" data-beat="b"[^>]*>)/, '$1<div class="bd-probe" data-match="m" style="position:absolute;left:900px;top:500px;width:40px;height:40px"></div>')
      .replace(/\/\/ "a": \(scene[\s\S]*?\/\/ \},/, '"b": (scene, { carry }) => { carry(null, { ms: 4000 }); },')
      .replace('{ id: "b",', '{ id: "b", transition: "cut",');
    fs.writeFileSync(carryPath, carrySrc, 'utf8');
    const carryBrowser = await launchBrowser();
    try {
      const page = await (await carryBrowser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
      await page.goto(pathToFileURL(carryPath).href);
      await page.waitForFunction(() => document.body.dataset.ready === '1');
      await page.evaluate(() => window.__beatdeck.goTo(1));
      const kf = await page.evaluate(() => {
        const a = document.querySelector('[data-beat="b"] .bd-probe').getAnimations()[0];
        return a ? a.effect.getKeyframes()[0].translate : null;
      });
      assert.match(String(kf), /^-800px/, `carry must start the element where it was in the previous beat (got ${kf})`);
      await page.goto(`${pathToFileURL(carryPath).href}?still&p=2`);
      await page.waitForFunction(() => document.body.dataset.ready === '1');
      const settled = await page.evaluate(() => document.querySelector('[data-beat="b"] .bd-probe').getBoundingClientRect().left);
      assert.equal(Math.round(settled), 900, 'carry must settle at its own place under ?still');
    } finally {
      await carryBrowser.close();
    }
    const noMotion = JSON.parse(runNode('scripts/lint.mjs', [loudPath, '--json', '--motion=false']).stdout);
    assert.ok(!noMotion.warnings.some((w) => /^motion-|^transition-/.test(w.type)), '--motion=false must skip the motion pass');
    console.log('   Motion checks passed.');

    // 14) v1.7: fixes from the cold test
    console.log('14) Checking v1.7 fixes (fonts, carry size, placeholders, frames)...');
    // [missing: …] is the skill's own gap marker; on stage it must not pass --strict.
    assert.ok(checkText('網址：[missing: 正式網址]').some((w) => w.type === 'placeholder'), '[missing: …] must be a placeholder');
    assert.ok(checkText('Ship date: [ Missing: date ]').some((w) => w.type === 'placeholder'), '[missing: …] match must be case/space tolerant');

    // carry({ size: true }) eases width instead of stretching with scale.
    const sizePath = path.join(tmpDir, 'carry-size', 'deck.html');
    assert.equal(runNode('scripts/new-deck.mjs', [sizePath, '--ids', 'a,b']).status, 0);
    let sizeSrc = fs.readFileSync(sizePath, 'utf8');
    sizeSrc = sizeSrc
      .replace(/(<section class="scene" data-beat="a"[^>]*>)/, '$1<div class="bd-probe" data-match="m" style="position:absolute;left:100px;top:500px;width:400px;height:40px;padding:0 10px">課</div>')
      .replace(/(<section class="scene" data-beat="b"[^>]*>)/, '$1<div class="bd-probe" data-match="m" style="position:absolute;left:100px;top:500px;width:200px;height:40px;padding:0 10px">課</div>')
      .replace(/\/\/ "a": \(scene[\s\S]*?\/\/ \},/, '"b": (scene, { carry }) => { carry(null, { size: true, ms: 4000 }); },')
      .replace('{ id: "b",', '{ id: "b", transition: "cut",');
    fs.writeFileSync(sizePath, sizeSrc, 'utf8');
    const sizeBrowser = await launchBrowser();
    try {
      const page = await (await sizeBrowser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
      await page.goto(pathToFileURL(sizePath).href);
      await page.waitForFunction(() => document.body.dataset.ready === '1');
      await page.evaluate(() => window.__beatdeck.goTo(1));
      const kf = await page.evaluate(() => {
        const a = document.querySelector('[data-beat="b"] .bd-probe').getAnimations()[0];
        const k = a ? a.effect.getKeyframes() : [];
        return k.length ? { w0: k[0].width, w1: k[k.length - 1].width, scale: k[0].scale } : null;
      });
      assert.ok(kf, 'carry size must animate');
      assert.equal(kf.w0, '400px', `size must start at the previous content width (got ${kf.w0})`);
      assert.equal(kf.w1, '200px', `size must end at its own content width (got ${kf.w1})`);
      assert.ok(!kf.scale, 'size must not use a transform scale');
    } finally {
      await sizeBrowser.close();
    }

    // fonts.mjs subsets a face to the deck's characters and links it; lint notes text that falls back.
    const fontPath = path.join(tmpDir, 'fonts', 'deck.html');
    assert.equal(runNode('scripts/new-deck.mjs', [fontPath, '--ids', 'a', '--lang', 'zh-Hant']).status, 0);
    let fontSrc = fs.readFileSync(fontPath, 'utf8');
    fontSrc = fontSrc.replace(/(<section class="scene" data-beat="a"[^>]*>)/, '$1<p class="ff" style="position:absolute;left:200px;top:800px;font:40px BeatdeckFixtureFace, BeatdeckNoSuchFace">選課測試</p>');
    fs.writeFileSync(fontPath, fontSrc, 'utf8');
    const before = JSON.parse(runNode('scripts/lint.mjs', [fontPath, '--json', '--motion=false']).stdout);
    assert.ok(before.notes.some((n) => n.type === 'font-fallback' && /選|課/.test(n.message)), 'lint must note CJK text no named font provides');
    assert.equal(before.pass, true, 'font-fallback notes must never fail lint');
    const cjkSource = ['/usr/share/fonts/opentype/unifont/unifont.otf', '/usr/share/fonts/truetype/unifont/unifont.ttf'].find((f) => fs.existsSync(f));
    if (cjkSource) {
      const fontsRun = runNode('scripts/fonts.mjs', [fontPath, '--font', `BeatdeckFixtureFace:400=${cjkSource}`]);
      assert.equal(fontsRun.status, 0, fontsRun.stdout + fontsRun.stderr);
      assert.ok(fs.existsSync(path.join(tmpDir, 'fonts', 'fonts', 'BeatdeckFixtureFace-400.woff2')), 'fonts.mjs must write the subset');
      assert.match(fs.readFileSync(fontPath, 'utf8'), /<link rel="stylesheet" href="fonts\/fonts.css">/, 'fonts.mjs must link fonts.css');
      const after = JSON.parse(runNode('scripts/lint.mjs', [fontPath, '--json', '--motion=false']).stdout);
      assert.ok(!after.notes.some((n) => n.type === 'font-fallback' && /選|課/.test(n.message)), `embedded face must clear the note: ${JSON.stringify(after.notes)}`);
    } else {
      console.log('   (no Unifont on this machine: skipped the fonts.mjs round trip)');
    }
    const badFont = runNode('scripts/fonts.mjs', [fontPath, '--font', 'NoWeight=/nope.ttf']);
    assert.notEqual(badFont.status, 0, 'fonts.mjs must reject a malformed --font');

    // filmstrip --frames saves full-size PNGs of single moments.
    const framesDir = path.join(tmpDir, 'frames');
    const framesRun = runNode('scripts/filmstrip.mjs', [MOTION_DECK, '--beats', '2', '--times', '0,300', '--frames', '--out', framesDir]);
    assert.equal(framesRun.status, 0, framesRun.stdout + framesRun.stderr);
    const framePng = fs.readdirSync(framesDir).filter((f) => /^frame-02-0300ms\.png$/.test(f));
    assert.equal(framePng.length, 1, `filmstrip --frames must write frame-02-0300ms.png (got ${fs.readdirSync(framesDir)})`);
    console.log('   v1.7 checks passed.');

    // 15) v1.8: bridges, transition-monotone, rotate hint
    console.log('15) Checking v1.8 bridges, transition-monotone and the rotate hint...');
    const fadePath = path.join(tmpDir, 'bridge', 'deck.html');
    assert.equal(runNode('scripts/new-deck.mjs', [fadePath, '--ids', 'a,b,c,d,e,f', '--lang', 'zh-Hant']).status, 0);
    const fades = JSON.parse(runNode('scripts/lint.mjs', [fadePath, '--json']).stdout);
    assert.ok(fades.warnings.some((w) => w.type === 'transition-monotone'), 'an all-dip deck must get transition-monotone');
    let bridgeSrc = fs.readFileSync(fadePath, 'utf8');
    bridgeSrc = bridgeSrc
      .replace('    bridges: {},', `    bridges: {
      spine: ({ from, to, layer, run, reverse }) => {
        const bar = document.createElement("div");
        bar.className = "probe-bar";
        bar.style.cssText = "position:absolute;top:0;bottom:0;width:14px;background:#c33";
        layer.append(bar);
        run(bar, { left: reverse ? ["1920px", "-14px"] : ["-14px", "1920px"] });
        run(from, { opacity: [1, 0.2] });
        return run(to, { clipPath: [reverse ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)", "inset(0 0 0 0)"] });
      },
    },`)
      .replace('{ id: "c",', '{ id: "c", transition: { type: "spine", ms: 3000 },')
      .replace('{ id: "e",', '{ id: "e", transition: "spine",');
    fs.writeFileSync(fadePath, bridgeSrc, 'utf8');
    const bridged = JSON.parse(runNode('scripts/lint.mjs', [fadePath, '--json']).stdout);
    assert.ok(!bridged.warnings.some((w) => w.type === 'transition-monotone'), 'a bridge must clear transition-monotone');
    assert.ok(!bridged.warnings.some((w) => w.type === 'transition-variety'), 'bridges must not count as showy stock changes');
    assert.ok(!bridged.errors.some((f) => /runtime|console|page/i.test(`${f.type} ${f.message}`)), `bridge must not throw: ${JSON.stringify(bridged.errors)}`);
    const bridgeBrowser = await launchBrowser();
    try {
      const page = await (await bridgeBrowser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(pathToFileURL(fadePath).href);
      await page.waitForFunction(() => document.body.dataset.ready === '1');
      assert.deepEqual(await page.evaluate(() => window.__beatdeck.bridges), ['spine']);
      await page.evaluate(() => { window.__beatdeck.goTo(1); window.__beatdeck.goTo(2); });
      const mid = await page.evaluate(() => ({ t: document.body.dataset.beatTransition, layer: Boolean(document.querySelector('#stage > .bd-bridge .probe-bar')) }));
      assert.equal(mid.t, 'spine');
      assert.ok(mid.layer, 'the bridge must draw in a layer above the scenes');
      await page.evaluate(() => window.__beatdeck.goTo(1)); // clicking on mid-change cancels and cleans up, then plays reversed
      await page.waitForFunction(() => !document.querySelector('.bd-bridge'), null, { timeout: 5000 });
      assert.deepEqual(errors, [], 'bridge must run without page errors');
      await page.goto(pathToFileURL(fadePath).href + '?still&p=3');
      await page.waitForFunction(() => document.body.dataset.ready === '1');
      assert.equal(await page.evaluate(() => document.querySelectorAll('.bd-bridge').length), 0, '?still must never play a bridge');

      const phone = await bridgeBrowser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const pp = await phone.newPage();
      await pp.goto(pathToFileURL(fadePath).href);
      await pp.waitForFunction(() => document.body.dataset.ready === '1');
      const hint = await pp.evaluate(() => { const el = document.getElementById('rotate-hint'); return { shown: getComputedStyle(el).display !== 'none', text: el.textContent }; });
      assert.ok(hint.shown && /橫向/.test(hint.text), `portrait phone must show the rotate hint (${JSON.stringify(hint)})`);
      await pp.setViewportSize({ width: 844, height: 390 });
      assert.equal(await pp.evaluate(() => getComputedStyle(document.getElementById('rotate-hint')).display), 'none', 'landscape must hide the hint');
    } finally {
      await bridgeBrowser.close();
    }
    console.log('   v1.8 checks passed.');

    console.log('ALL E2E TESTS PASSED');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('E2E TEST FAILED:', err);
  process.exit(1);
});
