import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  estimateBeatSeconds,
  getBrowserExecutablePath,
  parseCliArgs,
  resolveDeckUrl,
  waitForDeckReady,
} from './lib/browser.mjs';
import { chromium } from 'playwright';

function printUsage() {
  console.error(
    'Usage: node scripts/record-video.mjs <deck.html> [--out deck.mp4] [--plan plan.json] [--fps 60] [--slow 3] [--audio track.wav] [--frames-only]'
  );
}

function ensureFfmpegAvailable() {
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (probe.error || probe.status !== 0) {
    throw new Error(
      'ffmpeg binary not found in PATH. Install ffmpeg (e.g. `brew install ffmpeg` on macOS or `apt install ffmpeg` on Linux) or pass `--frames-only` to skip MP4 encoding.'
    );
  }
}

function linkOrCopy(src, dst) {
  try {
    fs.linkSync(src, dst);
  } catch {
    fs.copyFileSync(src, dst);
  }
}

function deriveDeckName(deckInput) {
  if (/^https?:\/\//i.test(deckInput)) {
    const u = new URL(deckInput);
    const base = path.posix.basename(u.pathname, path.posix.extname(u.pathname));
    return base || 'deck';
  }
  const clean = deckInput.replace(/^file:\/\//i, '');
  const parsed = path.parse(path.resolve(clean));
  return parsed.name || 'deck';
}

function resolveFramesOutDir(flagOut, baseName) {
  if (!flagOut) {
    return path.resolve(`${baseName}-frames`);
  }
  const raw = path.resolve(String(flagOut));
  if (/\.(mp4|mov|webm)$/i.test(raw)) {
    const parsed = path.parse(raw);
    return path.join(parsed.dir, `${parsed.name}-frames`);
  }
  return raw;
}

function normalizePlan(rawPlan, deckBeats, speechRate) {
  const rawList = Array.isArray(rawPlan)
    ? rawPlan
    : Array.isArray(rawPlan?.beats)
      ? rawPlan.beats
      : Array.isArray(rawPlan?.cues)
        ? rawPlan.cues
        : Array.isArray(rawPlan?.events)
          ? rawPlan.events
          : null;

  if (!rawList || rawList.length === 0) {
    throw new Error('Plan JSON must contain a non-empty array of beat cues.');
  }

  let cursor = 0;
  let lastBeatIndex = 0;
  const events = rawList.map((item, idx) => {
    let beatIndex = null;
    if (typeof item.index === 'number') {
      beatIndex = item.index;
    } else if (typeof item.beat === 'number') {
      beatIndex = item.beat;
    } else if (typeof item.p === 'number') {
      beatIndex = item.p - 1;
    } else if (item.subtitle === undefined && item.say === undefined) {
      beatIndex = idx;
    }

    if (beatIndex !== null) {
      if (beatIndex < 0 || beatIndex >= deckBeats.length) {
        throw new Error(`Plan cue #${idx} references out-of-range beat index ${beatIndex}.`);
      }
      lastBeatIndex = beatIndex;
    }

    const deckBeat = deckBeats[beatIndex ?? lastBeatIndex] || {};
    const at =
      typeof item.at === 'number'
        ? item.at
        : typeof item.start === 'number'
          ? item.start
          : cursor;

    const dur =
      typeof item.duration === 'number' && item.duration > 0
        ? item.duration
        : beatIndex !== null
          ? estimateBeatSeconds(deckBeat, speechRate)
          : 1.5;

    const subtitle =
      item.subtitle !== undefined
        ? item.subtitle === null || item.subtitle === false
          ? ''
          : String(item.subtitle)
        : item.say !== undefined
          ? String(item.say)
          : beatIndex !== null
            ? deckBeat.say || ''
            : undefined;

    cursor = at + dur;
    return { beatIndex, at, duration: dur, subtitle };
  });

  events.sort((a, b) => a.at - b.at);

  let total =
    typeof rawPlan?.totalDuration === 'number'
      ? rawPlan.totalDuration
      : typeof rawPlan?.total === 'number'
        ? rawPlan.total
        : 0;

  if (!(total > 0)) {
    total = Math.max(...events.map((e) => e.at + e.duration));
  }

  return { events, total };
}

function buildAutoPlan(deckBeats, speechRate) {
  let cursor = 0;
  const events = deckBeats.map((beat, idx) => {
    const beatIndex = typeof beat.index === 'number' ? beat.index : idx;
    const dur = estimateBeatSeconds(beat, speechRate);
    const event = {
      beatIndex,
      at: cursor,
      duration: dur,
      subtitle: beat.say || '',
    };
    cursor += dur;
    return event;
  });
  return { events, total: cursor };
}

/**
 * Injected into page before scripts run to scale timers, Date.now(), rAF, and performance.now() by `slow`.
 * @param {number} slow
 */
function virtualClockInitScript(slow) {
  if (Math.abs(slow - 1) < 1e-6) return;
  const origSetTimeout = window.setTimeout.bind(window);
  const origSetInterval = window.setInterval.bind(window);
  const origPerfNow = performance.now.bind(performance);
  const origDateNow = Date.now.bind(Date);
  const origRAF = window.requestAnimationFrame.bind(window);
  const t0 = origPerfNow();
  const d0 = origDateNow();

  window.setTimeout = (fn, delay = 0, ...args) => {
    const ms = Number(delay) || 0;
    return origSetTimeout(fn, ms * slow, ...args);
  };

  window.setInterval = (fn, delay = 0, ...args) => {
    const ms = Number(delay) || 0;
    return origSetInterval(fn, ms * slow, ...args);
  };

  performance.now = () => t0 + (origPerfNow() - t0) / slow;
  Date.now = () => Math.round(d0 + (origDateNow() - d0) / slow);
  window.requestAnimationFrame = (cb) => origRAF((ts) => cb(t0 + (ts - t0) / slow));
}

async function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2), new Set(['frames-only']));
  if (positional.length === 0) {
    printUsage();
    process.exit(1);
  }

  const deckInput = positional[0];
  const framesOnly = Boolean(flags['frames-only']);
  const fps = flags.fps !== undefined ? Number(flags.fps) : 60;
  const slow = flags.slow !== undefined ? Number(flags.slow) : 3;
  const audioPath = flags.audio ? path.resolve(String(flags.audio)) : null;

  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error(`Invalid --fps value: ${flags.fps}`);
  }
  if (!Number.isFinite(slow) || slow <= 0) {
    throw new Error(`Invalid --slow value: ${flags.slow}`);
  }
  if (audioPath && !fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }
  if (!framesOnly) {
    ensureFfmpegAvailable();
  }

  const baseName = deriveDeckName(deckInput);
  const outPath = path.resolve(String(flags.out || `${baseName}.mp4`));
  const resampledOutDir = framesOnly ? resolveFramesOutDir(flags.out, baseName) : null;

  let rawPlan = null;
  if (flags.plan) {
    const planPath = path.resolve(String(flags.plan));
    if (!fs.existsSync(planPath)) {
      throw new Error(`Plan file not found: ${planPath}`);
    }
    rawPlan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  }

  const executablePath = getBrowserExecutablePath();
  if (!fs.existsSync(executablePath)) {
    throw new Error(
      `Playwright bundled Chromium not found at ${executablePath}. Run: npx playwright install chromium`
    );
  }

  let workDir = null;
  let browser = null;
  let context = null;

  try {
    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beatdeck-rec-'));
    const rawFramesDir = path.join(workDir, 'raw');
    const resampledDir = framesOnly ? resampledOutDir : path.join(workDir, 'frames');
    fs.mkdirSync(rawFramesDir, { recursive: true });
    fs.mkdirSync(resampledDir, { recursive: true });

    if (framesOnly) {
      for (const name of fs.readdirSync(resampledDir)) {
        if (/^s\d+\.jpg$/i.test(name)) {
          fs.unlinkSync(path.join(resampledDir, name));
        }
      }
    } else {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
    }

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    await context.addInitScript(virtualClockInitScript, slow);
    const page = await context.newPage();

    const cdp = await context.newCDPSession(page);
    await cdp.send('Animation.enable');
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / slow });

    await page.goto(resolveDeckUrl(deckInput, { video: true, p: 1 }), {
      waitUntil: 'domcontentloaded',
    });
    await waitForDeckReady(page);

    const { meta, beats } = await page.evaluate(() => {
      const api = window.__beatdeck;
      if (!api || typeof api.list !== 'function') {
        throw new Error('window.__beatdeck is not defined on deck.');
      }
      return { meta: api.meta || {}, beats: api.list() };
    });

    const speechRate = Number(meta.speechRate) > 0 ? Number(meta.speechRate) : 3.6;
    const plan = rawPlan ? normalizePlan(rawPlan, beats, speechRate) : buildAutoPlan(beats, speechRate);

    const received = [];
    const pendingWrites = [];
    let frameSeq = 0;

    cdp.on('Page.screencastFrame', (evt) => {
      const hrSec = Number(process.hrtime.bigint()) / 1e9;
      cdp.send('Page.screencastFrameAck', { sessionId: evt.sessionId }).catch(() => {});
      const idx = ++frameSeq;
      const framePath = path.join(rawFramesDir, `r${String(idx).padStart(6, '0')}.jpg`);
      const metaTs = typeof evt.metadata?.timestamp === 'number' ? evt.metadata.timestamp : null;
      const buf = Buffer.from(evt.data, 'base64');
      pendingWrites.push(
        fs.promises.writeFile(framePath, buf).then(() => {
          received.push({ path: framePath, metaTs, hrSec });
        })
      );
    });

    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 95,
      maxWidth: 1920,
      maxHeight: 1080,
      everyNthFrame: 1,
    });

    // Warm up compositor, apply t <= 0 initial cues, then anchor t = 0 cleanly
    await new Promise((r) => setTimeout(r, 100));
    const initialEvents = plan.events.filter((e) => e.at <= 0);
    const laterEvents = plan.events.filter((e) => e.at > 0);

    for (const ev of initialEvents) {
      await page.evaluate(
        ({ idx, sub }) => {
          if (idx !== null) window.__beatdeck.goTo(idx);
          if (sub !== undefined) window.__beatdeck.setSubtitle(sub);
        },
        { idx: ev.beatIndex, sub: ev.subtitle }
      );
    }
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const t0HrSec = Number(process.hrtime.bigint()) / 1e9;
    const startWallMs = Date.now();

    for (const ev of laterEvents) {
      const targetWallMs = startWallMs + ev.at * slow * 1000;
      const waitMs = targetWallMs - Date.now();
      if (waitMs > 0) {
        await new Promise((r) => setTimeout(r, waitMs));
      }
      await page.evaluate(
        ({ idx, sub }) => {
          if (idx !== null) window.__beatdeck.goTo(idx);
          if (sub !== undefined) window.__beatdeck.setSubtitle(sub);
        },
        { idx: ev.beatIndex, sub: ev.subtitle }
      );
    }

    const endTargetWallMs = startWallMs + (plan.total + 0.8) * slow * 1000;
    const remainingMs = endTargetWallMs - Date.now();
    if (remainingMs > 0) {
      await new Promise((r) => setTimeout(r, remainingMs));
    }

    await cdp.send('Page.stopScreencast').catch(() => {});
    await new Promise((r) => setTimeout(r, 100));
    await Promise.all(pendingWrites);

    if (received.length === 0) {
      throw new Error('No screencast frames were captured from Chromium.');
    }

    // Discard pre-roll frames before t=0 (keep latest pre-roll frame only if no post-t0 frame exists)
    received.sort((a, b) => a.hrSec - b.hrSec);
    let postFrames = received.filter((f) => f.hrSec >= t0HrSec);
    if (postFrames.length === 0) {
      postFrames = [received[received.length - 1]];
    }

    // Anchor compositor metadata.timestamp against t0HrSec when available
    const withMeta = postFrames.filter((f) => f.metaTs !== null);
    let t0MetaTs = null;
    if (withMeta.length > 0) {
      const minClockOffset = Math.min(...withMeta.map((f) => f.hrSec - f.metaTs));
      t0MetaTs = t0HrSec - minClockOffset;
    }

    for (const f of postFrames) {
      const wallSec =
        f.metaTs !== null && t0MetaTs !== null ? f.metaTs - t0MetaTs : f.hrSec - t0HrSec;
      f.vTime = Math.max(0, wallSec / slow);
    }
    postFrames.sort((a, b) => a.vTime - b.vTime);

    const totalFrames = Math.max(1, Math.round(plan.total * fps));
    let ptr = 0;
    for (let k = 0; k < totalFrames; k += 1) {
      const targetVTime = k / fps;
      while (ptr + 1 < postFrames.length && postFrames[ptr + 1].vTime <= targetVTime) {
        ptr += 1;
      }
      const dstPath = path.join(resampledDir, `s${String(k + 1).padStart(6, '0')}.jpg`);
      linkOrCopy(postFrames[ptr].path, dstPath);
    }

    // Frame-drop report separating static holds (>= 0.25s) from active-motion intervals (< 0.25s)
    const inWindow = postFrames.filter((f) => f.vTime >= 0 && f.vTime <= plan.total + 0.05);
    const activeDrops = [];
    let staticHolds = 0;
    let activeMotionTime = 0;
    let activeMotionFrames = 0;

    for (let i = 1; i < inWindow.length; i += 1) {
      const dt = inWindow[i].vTime - inWindow[i - 1].vTime;
      if (dt >= 0.25) {
        staticHolds += 1;
      } else {
        activeMotionTime += dt;
        activeMotionFrames += 1;
        if (dt > 1 / 30) {
          activeDrops.push({ at: inWindow[i - 1].vTime, dt });
        }
      }
    }
    activeDrops.sort((a, b) => b.dt - a.dt);

    const activeMotionFps =
      activeMotionTime > 0 ? (activeMotionFrames / activeMotionTime).toFixed(1) : 'static';
    console.log('--- Frame-Drop Report ---');
    console.log(
      `Duration: ${plan.total.toFixed(2)}s @ ${fps}fps (slow=${slow}x) -> ${totalFrames} output frames`
    );
    console.log(
      `Received frames: ${inWindow.length} (static holds >=250ms: ${staticHolds}, active-motion fps: ${activeMotionFps})`
    );
    console.log(`Active-motion drops (1/30s < dt < 0.25s): ${activeDrops.length}`);
    if (activeDrops.length > 0) {
      const worst = activeDrops
        .slice(0, 5)
        .map((g) => `${(g.dt * 1000).toFixed(1)}ms @ ${g.at.toFixed(2)}s`)
        .join(', ');
      console.log(`Worst active drops: ${worst}`);
    }

    if (framesOnly) {
      console.log(`FRAMES PASS -> ${resampledDir}`);
      return;
    }

    const ffmpegArgs = [
      '-y',
      '-framerate',
      String(fps),
      '-start_number',
      '1',
      '-i',
      path.join(resampledDir, 's%06d.jpg'),
    ];
    if (audioPath) {
      ffmpegArgs.push('-i', audioPath, '-c:a', 'aac', '-b:a', '192k', '-shortest');
    }
    ffmpegArgs.push(
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'medium',
      '-crf',
      '16',
      '-movflags',
      '+faststart',
      outPath
    );

    try {
      execFileSync('ffmpeg', ffmpegArgs, { stdio: 'pipe' });
    } catch (err) {
      const stderr = err.stderr ? err.stderr.toString('utf8').trim() : '';
      throw new Error(`ffmpeg failed (${err.status ?? 'error'}): ${stderr || err.message}`);
    }

    const sizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
    console.log(`VIDEO PASS (${sizeMB} MB) -> ${outPath}`);
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (workDir) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  console.error(`RECORD VIDEO ERROR: ${err.message}`);
  process.exit(1);
});
