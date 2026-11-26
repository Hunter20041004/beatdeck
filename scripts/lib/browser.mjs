import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

/**
 * Return the executable path of Playwright's bundled Chromium.
 * Never falls back to system Chrome or hardcoded user paths.
 * @returns {string}
 */
export function getBrowserExecutablePath() {
  const execPath = chromium.executablePath();
  if (!execPath) {
    throw new Error(
      'Playwright Chromium executable path is unavailable. Run: npx playwright install chromium'
    );
  }
  return execPath;
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

  const executablePath = getBrowserExecutablePath();
  if (!fs.existsSync(executablePath)) {
    throw new Error(
      `Playwright bundled Chromium not found at ${executablePath}. Run: npx playwright install chromium`
    );
  }

  const targetUrl = resolveDeckUrl(url);
  const browser = await chromium.launch({ headless: true });
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
