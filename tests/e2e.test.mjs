import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getBrowserExecutablePath, parseCliArgs } from '../scripts/lib/browser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEMO_DECK = path.join(ROOT, 'examples', 'beatdeck-intro', 'deck.html');

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
</body>
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

    console.log('ALL E2E TESTS PASSED');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('E2E TEST FAILED:', err);
  process.exit(1);
});
