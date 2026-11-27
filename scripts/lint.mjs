import { parseCliArgs, resolveDeckUrl, waitForDeckReady, withPage } from './lib/browser.mjs';
import {
  checkText,
  countContrastFrames,
  countEmDashes,
  countExclamations,
  isLabelHeadline,
  isSloganHeadline,
  narrationOverlap,
} from './lib/copy-rules.mjs';

function printUsage() {
  console.error('Usage: node scripts/lint.mjs <deck.html> [--json] [--strict]');
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

    // (e) Craft heuristics (warnings): card-shell density, nested cards, emoji icons, skeleton leftovers
    const warnings = [];
    const stageArea = 1920 * 1080;
    function hasVisibleColor(c) {
      if (!c || c === 'transparent') return false;
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return true;
      const parts = m[1].split(/[ ,/]+/).filter(Boolean);
      return parts.length < 4 || parseFloat(parts[3]) > 0.05;
    }
    function isBoxed(el) {
      if (el.closest('svg')) return false;
      if (el.id === 'subtitle' || el.id === 'world') return false;
      const st = getComputedStyle(el);
      const sides = ['Top', 'Right', 'Bottom', 'Left'].filter(
        (s) =>
          parseFloat(st[`border${s}Width`]) >= 1 &&
          st[`border${s}Style`] !== 'none' &&
          st[`border${s}Style`] !== 'hidden' &&
          hasVisibleColor(st[`border${s}Color`])
      ).length;
      const radius = parseFloat(st.borderTopLeftRadius) || 0;
      const shadowCard = st.boxShadow && st.boxShadow !== 'none' && radius >= 4 && hasVisibleColor(st.backgroundColor);
      if (sides < 4 && !shadowCard) return false;
      const r = el.getBoundingClientRect();
      const area = (r.width / scale) * (r.height / scale);
      if (area < stageArea * 0.015 || area > stageArea * 0.6) return false;
      return (el.textContent || '').trim().length > 0;
    }
    function allows(el, type) {
      const host = el && el.closest('[data-lint-allow]');
      return Boolean(host && host.getAttribute('data-lint-allow').split(/[\s,]+/).includes(type));
    }
    const boxed = allElements.filter(
      (el) => isVisibleInStage(el) && !allows(el, 'card-shell') && isBoxed(el)
    );
    if (boxed.length >= 4) {
      warnings.push({
        type: 'card-shell',
        message: `${boxed.length} bordered/shadowed card boxes on one beat (e.g. ${describeEl(boxed[0])}); compose on open canvas instead`,
      });
    }
    const boxedSet = new Set(boxed);
    for (const el of boxed) {
      let p = el.parentElement;
      while (p && p !== stage) {
        if (boxedSet.has(p)) {
          warnings.push({ type: 'nested-card', message: `Card inside card: ${describeEl(el)} sits in ${describeEl(p)}` });
          break;
        }
        p = p.parentElement;
      }
    }
    const emojiRe = /\p{Extended_Pictographic}/u;
    const emojiWalker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
    let en;
    while ((en = emojiWalker.nextNode())) {
      const v = en.nodeValue || '';
      if (!emojiRe.test(v) || !en.parentElement || !isVisibleInStage(en.parentElement)) continue;
      if (allows(en.parentElement, 'emoji')) continue;
      const ch = v.match(/\p{Extended_Pictographic}/u)[0];
      warnings.push({ type: 'emoji', message: `Emoji "${ch}" used in ${describeEl(en.parentElement)}; draw an inline SVG or typographic mark` });
      break;
    }
    // Text collisions: glyph boxes from different text nodes overlapping each other
    const textBoxes = [];
    const tw2 = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
    let t2;
    while ((t2 = tw2.nextNode())) {
      if (!t2.nodeValue || !t2.nodeValue.trim()) continue;
      const p = t2.parentElement;
      if (!p || p.closest('[aria-hidden="true"]#camera-safe-zone') || !isVisibleInStage(p)) continue;
      if (allows(p, 'text-collision')) continue;
      range.selectNodeContents(t2);
      for (const r of range.getClientRects()) {
        if (r.width <= 1 || r.height <= 1) continue;
        textBoxes.push({ node: t2, el: p, l: r.left, t: r.top, r: r.right, b: r.bottom, h: r.height });
      }
    }
    const reported = new Set();
    for (let i = 0; i < textBoxes.length && warnings.length < 40; i += 1) {
      const a = textBoxes[i];
      for (let j = i + 1; j < textBoxes.length; j += 1) {
        const b = textBoxes[j];
        if (a.node === b.node) continue;
        const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
        const oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        if (ox <= 2 * scale || oy <= Math.min(a.h, b.h) * 0.35) continue;
        const key = `${describeEl(a.el)}|${describeEl(b.el)}`;
        if (reported.has(key)) continue;
        reported.add(key);
        warnings.push({
          type: 'text-collision',
          message: `Text overlaps other text: ${describeEl(a.el)} ↔ ${describeEl(b.el)}`,
        });
      }
    }

    // Real captures shrunk so far that the UI text inside them cannot be read on a projector
    for (const img of imgs) {
      if (!isVisibleInStage(img) || !img.naturalWidth || img.naturalWidth < 600) continue;
      if (allows(img, 'small-capture')) continue;
      const shownW = img.getBoundingClientRect().width / scale;
      const ratio = shownW / img.naturalWidth;
      if (ratio < 0.4) {
        warnings.push({
          type: 'small-capture',
          message: `Screenshot ${img.getAttribute('src')?.split('/').pop() || describeEl(img)} is shown at ${Math.round(ratio * 100)}% of its pixel size (${Math.round(shownW)}px wide); text inside is likely unreadable. Crop tighter or enlarge`,
        });
      }
    }

    // AI-default visual treatments: purple-blue gradients, gradient text, glassmorphism
    function parseColors(str) {
      const out = [];
      const re = /rgba?\(([^)]+)\)/g;
      let m;
      while ((m = re.exec(str))) {
        const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
        if (p.length >= 3 && (p.length < 4 || p[3] > 0.15)) out.push(p.slice(0, 3));
      }
      return out;
    }
    function hsl([r, g, b]) {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (max + min) / 2;
      if (max === min) return { h: 0, s: 0, l };
      const d = max - min;
      const s2 = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      let h;
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      return { h: h * 60, s: s2, l };
    }
    function isAiGradient(bgImage) {
      if (!/gradient\(/.test(bgImage)) return false;
      const cols = parseColors(bgImage).map(hsl).filter((c) => c.s > 0.4 && c.l > 0.2 && c.l < 0.85);
      const cool = cols.filter((c) => c.h >= 200 && c.h <= 330);
      if (cool.length < 2) return false;
      const hs = cool.map((c) => c.h);
      return Math.max(...hs) - Math.min(...hs) >= 25;
    }
    let glassCount = 0;
    let aiGradientEl = null;
    let gradientTextEl = null;
    for (const el of allElements) {
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      if (!isVisibleInStage(el)) continue;
      const st = getComputedStyle(el);
      const bg = st.backgroundImage || '';
      const clip = st.backgroundClip || st.webkitBackgroundClip || '';
      if (/gradient\(/.test(bg) && /text/.test(clip) && !allows(el, 'gradient-text') && !gradientTextEl) gradientTextEl = el;
      if (!aiGradientEl && !allows(el, 'ai-gradient') && isAiGradient(bg)) aiGradientEl = el;
      const bf = st.backdropFilter || st.webkitBackdropFilter || '';
      if (/blur\(/.test(bf) && !allows(el, 'glassmorphism')) glassCount += 1;
    }
    if (!aiGradientEl && isAiGradient(getComputedStyle(stage).backgroundImage || '')) aiGradientEl = stage;
    if (aiGradientEl) {
      warnings.push({ type: 'ai-gradient', message: `Purple-blue "AI default" gradient on ${describeEl(aiGradientEl)}; derive color from the subject instead` });
    }
    if (gradientTextEl) {
      warnings.push({ type: 'gradient-text', message: `Gradient-filled text on ${describeEl(gradientTextEl)}; use one solid ink` });
    }
    if (glassCount >= 2) {
      warnings.push({ type: 'glassmorphism', message: `${glassCount} frosted-glass (backdrop blur) panels on one beat` });
    }

    // Copy extraction for wording checks (run in Node), density and bullet stacks
    const segments = [];
    let cjkCount = 0;
    let latinWords = 0;
    let topFont = 0;
    let topEl = null;
    const segWalker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
    let sn;
    while ((sn = segWalker.nextNode())) {
      const v = (sn.nodeValue || '').replace(/\s+/g, ' ').trim();
      if (!v) continue;
      const p = sn.parentElement;
      if (!p || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(p.tagName)) continue;
      if (p.closest('#subtitle') || !isVisibleInStage(p)) continue;
      const host = p.closest('[data-lint-allow]');
      const allowList = host ? host.getAttribute('data-lint-allow').split(/[\s,]+/).filter(Boolean) : [];
      segments.push({ text: v, allow: allowList });
      const logicalFont = (parseFloat(getComputedStyle(p).fontSize) || 0);
      if (!allowList.includes('text-density') && !p.closest('svg') && logicalFont >= 14) {
        cjkCount += (v.match(/[㐀-鿿぀-ヿ]/g) || []).length;
        latinWords += (v.replace(/[㐀-鿿぀-ヿ]/g, ' ').match(/[A-Za-z0-9]+(?:['’.-][A-Za-z0-9]+)*/g) || []).length;
      }
      const fs = parseFloat(getComputedStyle(p).fontSize) || 0;
      if (fs > topFont) { topFont = fs; topEl = p; }
    }
    const load = latinWords + cjkCount / 2;
    if (load > 80) {
      warnings.push({
        type: 'text-density',
        message: `~${Math.round(load)} word-equivalents on stage (${latinWords} words + ${cjkCount} CJK chars); move detail into the narration`,
      });
    }
    const lis = allElements.filter((el) => el.tagName === 'LI' && isVisibleInStage(el) && !allows(el, 'bullet-stack'));
    if (lis.length >= 6) {
      warnings.push({ type: 'bullet-stack', message: `${lis.length} visible bullet points on one beat` });
    }
    let headline = '';
    if (topEl) {
      let block = topEl;
      while (block.parentElement && block !== stage && getComputedStyle(block).display === 'inline') block = block.parentElement;
      if (!allows(block, 'label-headline')) headline = (block.textContent || '').replace(/\s+/g, ' ').trim();
    }

    const skeletonLeft = Array.from(stage.querySelectorAll('[data-beatdeck-skeleton]')).find((el) => isVisibleInStage(el));
    if (skeletonLeft) {
      warnings.push({ type: 'skeleton', message: `Skeleton placeholder still visible: ${describeEl(skeletonLeft)}` });
    }

    const fingerprint = boxed
      .map((el) => {
        const r = el.getBoundingClientRect();
        const q = (v) => Math.round(v / scale / 60);
        return `${q(r.left - stageRect.left)},${q(r.top - stageRect.top)},${q(r.width)},${q(r.height)}`;
      })
      .sort()
      .join('|');

    return { issues, warnings, fingerprint, boxedCount: boxed.length, segments, headline };
  });
}

async function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2), new Set(['json', 'strict']));
  if (positional.length === 0) {
    printUsage();
    process.exit(1);
  }
  const asJson = Boolean(flags.json);
  const strict = Boolean(flags.strict);

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
        const meta = api.meta || {};
        return {
          version: api.version,
          beats: api.list(),
          lang: meta.lang || document.documentElement.lang || '',
          lintAllow: Array.isArray(meta.lintAllow) ? meta.lintAllow : [],
        };
      });

      if (!apiInfo || !Array.isArray(apiInfo.beats) || apiInfo.beats.length === 0) {
        throw new Error('window.__beatdeck missing or list() returned 0 beats.');
      }

      const failures = [];
      const warnings = [];
      let prevFingerprint = null;
      const total = apiInfo.beats.length;
      const lang = apiInfo.lang;
      const sayAllowed = (type) => apiInfo.lintAllow.includes(type);
      const deckTally = { contrast: [], emDash: 0, exclaim: 0, slogans: [], headlines: 0 };

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

        const inspected = await inspectActiveBeat(page);
        if (Array.isArray(inspected)) {
          // #stage missing / zero-size short-circuit
          for (const issue of inspected) failures.push({ beat: currentBeatLabel, ...issue });
          continue;
        }
        for (const issue of inspected.issues) {
          failures.push({ beat: currentBeatLabel, ...issue });
        }
        for (const w of inspected.warnings) {
          warnings.push({ beat: currentBeatLabel, ...w });
        }
        if (
          prevFingerprint &&
          inspected.boxedCount >= 2 &&
          inspected.fingerprint === prevFingerprint
        ) {
          warnings.push({
            beat: currentBeatLabel,
            type: 'layout-repeat',
            message: 'Same boxed layout as the previous beat; vary the composition archetype',
          });
        }
        prevFingerprint = inspected.boxedCount >= 2 ? inspected.fingerprint : null;

        // Wording checks on on-stage copy and on the spoken `say` line
        const say = typeof beat.say === 'string' ? beat.say : '';
        const seen = new Set();
        const pushOnce = (where, w) => {
          const key = `${where}|${w.type}`;
          if (seen.has(key)) return;
          seen.add(key);
          warnings.push({ beat: `${currentBeatLabel} ${where}`, ...w });
        };
        for (const seg of inspected.segments) {
          for (const w of checkText(seg.text, { lang })) {
            if (!seg.allow.includes(w.type)) pushOnce('stage', w);
          }
        }
        for (const w of checkText(say, { lang })) {
          if (!sayAllowed(w.type)) pushOnce('say', w);
        }
        if (/\p{Extended_Pictographic}/u.test(say) && !sayAllowed('emoji')) {
          pushOnce('say', { type: 'emoji', message: 'Emoji inside spoken narration' });
        }
        const stageCopy = inspected.segments
          .filter((seg) => !seg.allow.includes('contrast-frame'))
          .map((seg) => seg.text)
          .join(' ');
        const contrastHits = countContrastFrames(stageCopy) + (sayAllowed('contrast-frame') ? 0 : countContrastFrames(say));
        if (contrastHits > 0) deckTally.contrast.push(`${i + 1}`);
        const dashCopy = inspected.segments.filter((seg) => !seg.allow.includes('em-dash')).map((seg) => seg.text).join(' ');
        deckTally.emDash += countEmDashes(dashCopy) + (sayAllowed('em-dash') ? 0 : countEmDashes(say));
        deckTally.exclaim += countExclamations(stageCopy) + (sayAllowed('exclamation') ? 0 : countExclamations(say));
        if (inspected.headline) {
          deckTally.headlines += 1;
          if (isSloganHeadline(inspected.headline)) deckTally.slogans.push(`${i + 1}`);
        }
        if (inspected.headline && isLabelHeadline(inspected.headline)) {
          pushOnce('stage', {
            type: 'label-headline',
            message: `Headline "${inspected.headline}" is a topic label (agenda / thank-you style); state the beat's claim instead`,
          });
        }
        if (!sayAllowed('read-aloud')) {
          const overlap = narrationOverlap(say, inspected.segments.map((seg) => seg.text).join(' '));
          if (overlap >= 0.7) {
            pushOnce('say', {
              type: 'read-aloud',
              message: `${Math.round(overlap * 100)}% of the narration is printed on stage; the speaker would be reading the slide`,
            });
          }
        }
      }

      if (deckTally.contrast.length >= 2) {
        warnings.push({
          beat: 'deck',
          type: 'contrast-frame',
          message: `"Not X, but Y" / 「不是…而是…」 framing on beats ${deckTally.contrast.join(', ')}; state the point directly`,
        });
      }
      if (
        !sayAllowed('slogan-cadence') &&
        deckTally.slogans.length >= 4 &&
        deckTally.slogans.length >= deckTally.headlines * 0.4
      ) {
        warnings.push({
          beat: 'deck',
          type: 'slogan-cadence',
          message: `${deckTally.slogans.length} of ${deckTally.headlines} headlines use the same punchy two-beat slogan rhythm (beats ${deckTally.slogans.join(', ')}); write plain headlines that say what happens`,
        });
      }
      const dashLimit = Math.max(1, Math.floor(total / 4));
      if (deckTally.emDash > dashLimit) {
        warnings.push({
          beat: 'deck',
          type: 'em-dash',
          message: `${deckTally.emDash} em dashes across stage copy and narration (limit ${dashLimit}); use periods, commas or colons`,
        });
      }
      const exclaimLimit = Math.max(1, Math.floor(total / 6));
      if (deckTally.exclaim > exclaimLimit) {
        warnings.push({
          beat: 'deck',
          type: 'exclamation',
          message: `${deckTally.exclaim} exclamation marks (limit ${exclaimLimit}); let the content carry the energy`,
        });
      }

      return { total, failures, warnings };
    }
  );

  for (const err of runtimeErrors) {
    result.failures.unshift({ beat: err.beat, type: 'runtime', message: err.message });
  }

  const failed = result.failures.length > 0 || (strict && result.warnings.length > 0);

  if (asJson) {
    process.stdout.write(
      `${JSON.stringify(
        {
          pass: !failed,
          beats: result.total,
          strict,
          errors: result.failures,
          warnings: result.warnings,
        },
        null,
        2
      )}\n`
    );
    process.exit(failed ? 1 : 0);
  }

  for (const w of result.warnings) {
    console.warn(`  WARN [${w.beat}] (${w.type}) ${w.message}`);
  }

  if (result.failures.length > 0) {
    console.error(`LINT FAIL: ${result.failures.length} issue(s) across ${result.total} beat(s):`);
    for (const f of result.failures) {
      console.error(`  [${f.beat}] (${f.type}) ${f.message}`);
    }
    process.exit(1);
  }

  if (strict && result.warnings.length > 0) {
    console.error(`LINT FAIL (--strict): ${result.warnings.length} craft warning(s) across ${result.total} beat(s).`);
    process.exit(1);
  }

  const warnNote = result.warnings.length ? ` with ${result.warnings.length} craft warning(s)` : '';
  console.log(`LINT PASS: ${result.total} beat(s) verified clean (1920x1080)${warnNote}.`);
}

main().catch((err) => {
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ pass: false, fatal: err.message }, null, 2)}\n`);
  } else {
    console.error(`LINT ERROR: ${err.message}`);
  }
  process.exit(1);
});
