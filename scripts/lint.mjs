import { parseCliArgs, resolveDeckUrl, waitForDeckReady, withPage } from './lib/browser.mjs';

function printUsage() {
  console.error('Usage: node scripts/lint.mjs <deck.html>');
}

/**
 * Run in-page layout, image, overflow, and line-wrap checks for the active beat.
 * @param {import('playwright').Page} page
 */
async function inspectActiveBeat(page) {
  return page.evaluate(async () => {
    const issues = [];
    const stage = document.getElementById('stage');
    if (!stage) {
      issues.push({ type: 'stage', message: 'Missing #stage element' });
      return issues;
    }

    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) {
      issues.push({ type: 'stage', message: '#stage has zero dimensions' });
      return issues;
    }

    if (stage.offsetWidth !== 1920 || stage.offsetHeight !== 1080) {
      issues.push({
        type: 'stage',
        message: `#stage intrinsic size must be 1920x1080 (got ${stage.offsetWidth}x${stage.offsetHeight})`,
      });
    }

    const scale = stageRect.width / 1920;
    const logicalWidth = stageRect.width / scale;
    const logicalHeight = stageRect.height / scale;
    if (Math.abs(logicalHeight - 1080) > 1) {
      issues.push({
        type: 'stage',
        message: `#stage rendered aspect ratio does not match 1920x1080 (logical height ${logicalHeight.toFixed(1)})`,
      });
    }

    function getElementVisualRects(el) {
      if (getComputedStyle(el).display === 'contents') {
        const r = document.createRange();
        r.selectNodeContents(el);
        return Array.from(r.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? [r] : [];
    }

    function isVisibleInStage(el) {
      let cur = el;
      while (cur && cur.nodeType === 1) {
        const st = getComputedStyle(cur);
        if (st.display === 'none') return false;
        if (parseFloat(st.opacity) <= 0.01) return false;
        if (cur === el && st.visibility !== 'visible') return false;
        if (cur === stage) break;
        cur = cur.parentElement;
      }
      return getElementVisualRects(el).length > 0;
    }

    function describeEl(el) {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls =
        typeof el.className === 'string' && el.className.trim()
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48);
      return `${tag}${id}${cls}${text ? ` ("${text}")` : ''}`;
    }

    // (b) Check all visible <img> inside #stage
    const imgs = Array.from(stage.querySelectorAll('img'));
    for (const img of imgs) {
      if (!isVisibleInStage(img)) continue;
      if (!img.complete) {
        await Promise.race([
          new Promise((res) => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', res, { once: true });
          }),
          new Promise((res) => setTimeout(res, 500)),
        ]);
      }
      if (!img.complete || img.naturalWidth <= 0) {
        issues.push({
          type: 'image',
          message: `Broken or incomplete <img>: ${img.getAttribute('src') || describeEl(img)}`,
        });
      }
    }

    // (c) Check visible text rects inside #stage stay within logical 1920x1080 bounds
    const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let textNode;
    while ((textNode = walker.nextNode())) {
      if (!textNode.nodeValue || !textNode.nodeValue.trim()) continue;
      const parent = textNode.parentElement;
      if (!parent) continue;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;
      if (!isVisibleInStage(parent)) continue;

      range.selectNodeContents(textNode);
      const rects = Array.from(range.getClientRects());
      for (const r of rects) {
        if (r.width <= 0.5 || r.height <= 0.5) continue;
        const left = (r.left - stageRect.left) / scale;
        const top = (r.top - stageRect.top) / scale;
        const right = (r.right - stageRect.left) / scale;
        const bottom = (r.bottom - stageRect.top) / scale;
        if (left < -1 || top < -1 || right > logicalWidth + 1 || bottom > logicalHeight + 1) {
          issues.push({
            type: 'overflow',
            message: `Text overflows #stage (${left.toFixed(1)}, ${top.toFixed(1)}, ${right.toFixed(1)}, ${bottom.toFixed(1)}) in ${describeEl(parent)}`,
          });
          break;
        }
      }
    }

    // (d) Line-wrap check for elements with data-expected-lines, data-lint-lines, or direct <br>
    const allElements = Array.from(stage.querySelectorAll('*'));
    for (const el of allElements) {
      const hasExpectedAttr = el.hasAttribute('data-expected-lines');
      const hasLintAttr = el.hasAttribute('data-lint-lines');
      const directBrs = Array.from(el.children).filter((c) => c.tagName === 'BR').length;
      if (!hasExpectedAttr && !hasLintAttr && directBrs === 0) continue;
      if (!isVisibleInStage(el)) continue;

      // Skip elements positioned completely offscreen (e.g. off-viewport inactive elements)
      const visRects = getElementVisualRects(el);
      const anyOnStage = visRects.some(
        (r) =>
          r.right >= stageRect.left - 10 &&
          r.left <= stageRect.right + 10 &&
          r.bottom >= stageRect.top - 10 &&
          r.top <= stageRect.bottom + 10
      );
      if (!anyOnStage) {
        continue;
      }

      let expectedLines;
      if (hasExpectedAttr) {
        expectedLines = parseInt(el.getAttribute('data-expected-lines') || '', 10);
      } else if (hasLintAttr) {
        const raw = el.getAttribute('data-lint-lines');
        const parsed = parseInt(raw || '', 10);
        expectedLines = Number.isFinite(parsed) && parsed > 0 ? parsed : directBrs + 1;
      } else {
        expectedLines = directBrs + 1;
      }

      if (!Number.isFinite(expectedLines) || expectedLines <= 0) continue;

      const textRects = [];
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let tn;
      while ((tn = tw.nextNode())) {
        if (!tn.nodeValue || !tn.nodeValue.trim()) continue;
        const p = tn.parentElement;
        if (!p || !isVisibleInStage(p)) continue;
        range.selectNodeContents(tn);
        for (const r of range.getClientRects()) {
          if (r.width <= 0.5 || r.height <= 0.5) continue;
          textRects.push({
            top: r.top,
            bottom: r.bottom,
            h: r.height,
          });
        }
      }

      if (textRects.length === 0) continue;
      textRects.sort((a, b) => a.top - b.top || a.bottom - b.bottom);

      const clusters = [{ top: textRects[0].top, bottom: textRects[0].bottom, h: textRects[0].h }];
      for (let i = 1; i < textRects.length; i += 1) {
        const rect = textRects[i];
        const cur = clusters[clusters.length - 1];
        const overlap = Math.min(cur.bottom, rect.bottom) - Math.max(cur.top, rect.top);
        if (overlap > Math.min(cur.h, rect.h) * 0.25) {
          cur.top = Math.min(cur.top, rect.top);
          cur.bottom = Math.max(cur.bottom, rect.bottom);
          cur.h = Math.max(cur.h, rect.h);
        } else {
          clusters.push({ top: rect.top, bottom: rect.bottom, h: rect.h });
        }
      }

      const actualLines = clusters.length;
      if (actualLines > expectedLines) {
        issues.push({
          type: 'line-wrap',
          message: `Unexpected line wrap: actual ${actualLines} > expected ${expectedLines} on ${describeEl(el)}`,
        });
      }
    }

    return issues;
  });
}

async function main() {
  const { positional } = parseCliArgs(process.argv.slice(2));
  if (positional.length === 0) {
    printUsage();
    process.exit(1);
  }

  const input = positional[0];
  const initialUrl = resolveDeckUrl(input, { still: true, p: 1 });

  let currentBeatLabel = 'beat 1';
  const runtimeErrors = [];

  const result = await withPage(
    initialUrl,
    {
      viewport: { width: 1920, height: 1080 },
      onPageCreated(page) {
        page.on('pageerror', (err) => {
          runtimeErrors.push({ beat: currentBeatLabel, message: `pageerror: ${err.message}` });
        });
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            runtimeErrors.push({ beat: currentBeatLabel, message: `console.error: ${msg.text()}` });
          }
        });
      },
    },
    async (page) => {
      const apiInfo = await page.evaluate(() => {
        const api = window.__beatdeck;
        if (!api || typeof api.list !== 'function' || typeof api.goTo !== 'function') {
          return null;
        }
        return {
          version: api.version,
          beats: api.list(),
        };
      });

      if (!apiInfo || !Array.isArray(apiInfo.beats) || apiInfo.beats.length === 0) {
        throw new Error('window.__beatdeck missing or list() returned 0 beats.');
      }

      const failures = [];
      const total = apiInfo.beats.length;

      for (let i = 0; i < total; i += 1) {
        const beat = apiInfo.beats[i];
        currentBeatLabel = `beat ${i + 1}/${total}${beat.id ? ` (${beat.id})` : ''}`;

        if (i > 0) {
          const switched = await page.evaluate((idx) => {
            window.__beatdeck.goTo(idx);
            return window.__beatdeck.current() === idx;
          }, i);

          if (!switched) {
            await page.goto(resolveDeckUrl(input, { still: true, p: i + 1 }), {
              waitUntil: 'domcontentloaded',
            });
            await waitForDeckReady(page);
          }
        }

        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 20)))
            )
        );

        const beatIssues = await inspectActiveBeat(page);
        for (const issue of beatIssues) {
          failures.push({ beat: currentBeatLabel, ...issue });
        }
      }

      return { total, failures };
    }
  );

  for (const err of runtimeErrors) {
    result.failures.unshift({ beat: err.beat, type: 'runtime', message: err.message });
  }

  if (result.failures.length > 0) {
    console.error(`LINT FAIL: ${result.failures.length} issue(s) across ${result.total} beat(s):`);
    for (const f of result.failures) {
      console.error(`  [${f.beat}] (${f.type}) ${f.message}`);
    }
    process.exit(1);
  }

  console.log(`LINT PASS: ${result.total} beat(s) verified clean (1920x1080).`);
}

main().catch((err) => {
  console.error(`LINT ERROR: ${err.message}`);
  process.exit(1);
});
