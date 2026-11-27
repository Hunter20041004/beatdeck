import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const INSTALL_HINT =
  'Run `npx playwright install chromium` inside the skill directory, or set BEATDECK_CHROMIUM=/path/to/chrome.';

let warnedFallback = false;

/**
 * Look for another Playwright-managed Chromium revision next to the expected one
 * (e.g. `chromium-1243/` when the installed Playwright expects `chromium-1255/`).
 * Stays inside Playwright's own browsers cache; never touches system Chrome.
 * @param {string} expectedPath
 * @returns {string | null}
 */
function findSiblingRevision(expectedPath) {
  const parts = expectedPath.split(path.sep);
  const revIdx = parts.findIndex((p) => /^chromium-\d+$/.test(p));
  if (revIdx <= 0) return null;
  const cacheRoot = parts.slice(0, revIdx).join(path.sep) || path.sep;
  const relInside = parts.slice(revIdx + 1);
  let entries;
  try {
    entries = fs.readdirSync(cacheRoot);
  } catch {
    return null;
  }
  const candidates = entries
    .map((name) => ({ name, rev: Number((name.match(/^chromium-(\d+)$/) || [])[1]) }))
    .filter((e) => Number.isFinite(e.rev) && e.name !== parts[revIdx])
    .sort((a, b) => b.rev - a.rev);
  for (const c of candidates) {
    const candidatePath = path.join(cacheRoot, c.name, ...relInside);
    if (fs.existsSync(candidatePath)) return candidatePath;
  }
  return null;
}

/**
 * Resolve the Chromium executable used by every Beatdeck CLI tool.
 * Order: `BEATDECK_CHROMIUM` env override → Playwright's bundled Chromium →
 * another Chromium revision in the same Playwright browsers cache (with a warning).
 * Never silently falls back to a system Google Chrome install.
 * @returns {string}
 */
export function getBrowserExecutablePath() {
  const override = process.env.BEATDECK_CHROMIUM;
  if (override) {
    if (!fs.existsSync(override)) {
      throw new Error(`BEATDECK_CHROMIUM points to a missing file: ${override}`);
    }
    return override;
  }

  let bundled = '';
  try {
    bundled = chromium.executablePath();
  } catch {
    bundled = '';
  }
  if (bundled && fs.existsSync(bundled)) return bundled;

  const sibling = bundled ? findSiblingRevision(bundled) : null;
  if (sibling) {
    if (!warnedFallback) {
      warnedFallback = true;
      console.warn(
        `[beatdeck] Playwright expects ${bundled} (missing); using installed revision ${sibling}. ${INSTALL_HINT}`
      );
    }
    return sibling;
  }

  throw new Error(
    `Playwright Chromium not found${bundled ? ` at ${bundled}` : ''}. ${INSTALL_HINT}`
  );
}

/**
 * Launch headless Chromium using the resolved executable.
 * @param {import('playwright').LaunchOptions} [options]
 * @returns {Promise<import('playwright').Browser>}
 */
export async function launchBrowser(options = {}) {
  const executablePath = getBrowserExecutablePath();
  return chromium.launch({ headless: true, ...options, executablePath });
}

/**
 * Resolve a local file path or http(s)/file URL to a URL string with optional query params.
 * @param {string} input
 * @param {Record<string, string | number | boolean | undefined>} [params]
 * @returns {string}
 */
export function resolveDeckUrl(input, params = {}) {
  if (!input || typeof input !== 'string') {
    throw new Error('Deck path or URL is required.');
  }

  let url;
  if (/^(https?|file):\/\//i.test(input)) {
    url = new URL(input);
  } else {
    const absPath = path.resolve(input);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Deck file not found: ${absPath}`);
    }
    url = new URL(pathToFileURL(absPath).href);
  }

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === false || value === null) continue;
    url.searchParams.set(key, value === true ? '1' : String(value));
  }
  return url.toString();
}

/**
 * Wait until the deck signals `document.body.dataset.ready === "1"` and fonts settle.
 * @param {import('playwright').Page} page
 * @param {number} [timeoutMs=15000]
 */
export async function waitForDeckReady(page, timeoutMs = 15000) {
  await page.waitForFunction(
    () => document.body && document.body.dataset && document.body.dataset.ready === '1',
    null,
    { timeout: timeoutMs }
  );
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
  });
}

/**
 * Launch Playwright's bundled headless Chromium, open a page at `url`, invoke `fn(page, context)`,
 * and always close context and browser in `try/finally`.
 *
 * Signature supports both `withPage(url, fn)` and `withPage(url, options, fn)`.
 * @template T
 * @param {string} url
 * @param {object | ((page: import('playwright').Page, context: import('playwright').BrowserContext) => Promise<T>)} optionsOrFn
 * @param {(page: import('playwright').Page, context: import('playwright').BrowserContext) => Promise<T>} [maybeFn]
 * @returns {Promise<T>}
 */
export async function withPage(url, optionsOrFn, maybeFn) {
  const options = typeof optionsOrFn === 'function' ? {} : (optionsOrFn || {});
  const fn = typeof optionsOrFn === 'function' ? optionsOrFn : maybeFn;
  if (typeof fn !== 'function') {
    throw new Error('withPage requires a callback function.');
  }

  const targetUrl = resolveDeckUrl(url);
  const browser = await launchBrowser();
  let context;
  try {
    context = await browser.newContext({
      viewport: options.viewport ?? { width: 1920, height: 1080 },
      deviceScaleFactor: options.deviceScaleFactor ?? 1,
    });
    if (options.initScript) {
      await context.addInitScript(options.initScript);
    }
    const page = await context.newPage();
    if (typeof options.onPageCreated === 'function') {
      await options.onPageCreated(page, context);
    }
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    if (options.waitForReady !== false) {
      await waitForDeckReady(page, options.readyTimeoutMs ?? 15000);
    }
    return await fn(page, context);
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    await browser.close().catch(() => {});
  }
}

/**
 * Estimate narration duration in seconds for a beat.
 * Uses explicit `beat.duration` when provided, otherwise CJK chars / rate + Latin words / 2.5.
 * @param {{ say?: string, duration?: number }} beat
 * @param {number} [rate=3.6]
 * @returns {number}
 */
export function estimateBeatSeconds(beat, rate = 3.6) {
  if (typeof beat?.duration === 'number' && Number.isFinite(beat.duration) && beat.duration > 0) {
    return Number(beat.duration.toFixed(1));
  }
  const say = typeof beat?.say === 'string' ? beat.say.trim() : '';
  if (!say) return 1.5;

  const cjkChars = (say.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff]/g) || []).length;
  const withoutCjk = say.replace(/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff]/g, ' ');
  const latinWords = (withoutCjk.match(/[A-Za-z0-9]+(?:[._'-][A-Za-z0-9]+)*/g) || []).length;
  const effectiveRate = Number.isFinite(rate) && rate > 0 ? rate : 3.6;
  const raw = cjkChars / effectiveRate + latinWords / 2.5;
  return Number(Math.max(1.5, raw).toFixed(1));
}

/**
 * Simple CLI argument parser supporting positional args and `--flag value` / `--boolean-flag`.
 * @param {string[]} argv
 * @param {Set<string>} [booleanFlags]
 * @returns {{ positional: string[], flags: Record<string, string | boolean> }}
 */
export function parseCliArgs(argv, booleanFlags = new Set()) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        const rawVal = arg.slice(eqIdx + 1);
        if (booleanFlags.has(key)) {
          const norm = rawVal.trim().toLowerCase();
          if (norm === 'false' || norm === '0') {
            flags[key] = false;
          } else if (norm === 'true' || norm === '1' || norm === '') {
            flags[key] = true;
          } else {
            throw new Error(`Invalid boolean value for --${key}: ${rawVal}`);
          }
        } else {
          if (rawVal === '') {
            throw new Error(`Missing value for flag --${key}`);
          }
          flags[key] = rawVal;
        }
      } else {
        const key = arg.slice(2);
        if (booleanFlags.has(key)) {
          flags[key] = true;
        } else {
          if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
            throw new Error(`Missing value for flag --${key}`);
          }
          flags[key] = argv[i + 1];
          i += 1;
        }
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

/**
 * Init script for a page clock whose speed can change at runtime: `window.__bdSetClockRate(r)`
 * makes timers, rAF, performance.now() and Date.now() run r× as fast as real time (r = 0.125 is
 * 8× slow motion, r = 16 fast-forwards). Pair it with CDP `Animation.setPlaybackRate` for CSS/WAAPI.
 */
export function variableClockInitScript() {
  const origSetTimeout = window.setTimeout.bind(window);
  const origSetInterval = window.setInterval.bind(window);
  const origPerfNow = performance.now.bind(performance);
  const origDateNow = Date.now.bind(Date);
  const origRAF = window.requestAnimationFrame.bind(window);
  let rate = 1;
  let realAnchor = origPerfNow();
  let virtAnchor = realAnchor;
  const d0 = origDateNow();
  const p0 = realAnchor;
  const vnow = (real = origPerfNow()) => virtAnchor + (real - realAnchor) * rate;
  window.__bdSetClockRate = (r) => {
    const real = origPerfNow();
    virtAnchor = vnow(real);
    realAnchor = real;
    rate = r;
  };
  window.setTimeout = (fn, delay = 0, ...args) => origSetTimeout(fn, (Number(delay) || 0) / rate, ...args);
  window.setInterval = (fn, delay = 0, ...args) => origSetInterval(fn, (Number(delay) || 0) / rate, ...args);
  performance.now = () => vnow();
  Date.now = () => Math.round(d0 + (vnow() - p0));
  // Ignore the frame timestamp: CDP Animation.setPlaybackRate also scales it, which would count twice.
  window.requestAnimationFrame = (cb) => origRAF(() => cb(vnow()));
}

/**
 * Parse a 1-based beat selection such as "1,3-5,9" into sorted unique 0-based indices.
 * @param {string | undefined} spec
 * @param {number} total
 * @returns {number[]}
 */
export function parseBeatSelection(spec, total) {
  if (!spec) return Array.from({ length: total }, (_, i) => i);
  const out = new Set();
  for (const part of String(spec).split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`Invalid --beats segment "${part}" (use e.g. 1,3-5)`);
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let n = Math.min(a, b); n <= Math.max(a, b); n += 1) {
      if (n < 1 || n > total) throw new Error(`Beat ${n} out of range 1..${total}`);
      out.add(n - 1);
    }
  }
  return Array.from(out).sort((x, y) => x - y);
}
