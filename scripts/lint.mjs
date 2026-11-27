import { parseCliArgs, resolveDeckUrl, variableClockInitScript, waitForDeckReady, withPage } from './lib/browser.mjs';
import { checkSpine } from './lib/spine.mjs';
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
  console.error('Usage: node scripts/lint.mjs <deck.html> [--json] [--strict] [--motion=false]');
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
      // data-capture-dpr: the deviceScaleFactor the capture was taken at. A 2x capture holds UI text at twice
      // its CSS size, so what matters is the CSS-pixel scale: below ~1.1 a 16px UI label lands under 18px.
      const dpr = parseFloat(img.getAttribute('data-capture-dpr') || '') || 0;
      const name = img.getAttribute('src')?.split('/').pop() || describeEl(img);
      if (dpr > 0) {
        const cssScale = ratio * dpr;
        if (cssScale < 1.1) {
          warnings.push({
            type: 'small-capture',
            message: `Screenshot ${name} (captured at ${dpr}x) shows its UI at ${Math.round(cssScale * 100)}% of CSS size, so 16px labels land at ~${Math.round(16 * cssScale)}px on stage; crop tighter or enlarge`,
          });
        }
      } else if (ratio < 0.4) {
        warnings.push({
          type: 'small-capture',
          message: `Screenshot ${name} is shown at ${Math.round(ratio * 100)}% of its pixel size (${Math.round(shownW)}px wide); text inside is likely unreadable. Crop tighter or enlarge (add data-capture-dpr="2" to a 2x capture for an exact check)`,
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
      if (!allowList.includes('text-density') && !p.closest('svg') && !p.closest('[aria-hidden="true"]') && logicalFont >= 14) {
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

    // Font fallback: which characters no named family in their stack provides (they render in a system
    // font the author never chose), and which named families are only installed locally (viewers on another
    // machine or a phone get something else). Machine-dependent, so it is reported as a note, not a warning.
    const fonts = { missing: [], local: [] };
    try {
      const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[a-z-]+|emoji|math|fangsong|-apple-system|blinkmacsystemfont)$/i;
      const web = new Set(Array.from(document.fonts).filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^['"]|['"]$/g, '').toLowerCase()));
      const cv = document.createElement('canvas');
      cv.width = 56; cv.height = 56;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      const sigCache = new Map();
      const sig = (ch, font) => {
        const key = `${font}|${ch}`;
        if (sigCache.has(key)) return sigCache.get(key);
        cx.clearRect(0, 0, 56, 56);
        cx.font = `36px ${font}`;
        cx.fillStyle = '#000';
        cx.textBaseline = 'top';
        cx.fillText(ch, 6, 6);
        const d = cx.getImageData(0, 0, 56, 56).data;
        let h = 0;
        for (let i = 3; i < d.length; i += 4) h = (h * 31 + d[i]) | 0;
        sigCache.set(key, h);
        return h;
      };
      const has = (fam, ch) => sig(ch, `"${fam}", monospace`) !== sig(ch, 'monospace') || sig(ch, `"${fam}", serif`) !== sig(ch, 'serif');
      const missing = new Set();
      const local = new Set();
      const checked = new Set();
      const fw = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
      let fn;
      while ((fn = fw.nextNode())) {
        const el = fn.parentElement;
        if (!el || !isVisibleInStage(el) || el.closest('#subtitle') || allows(el, 'font-fallback')) continue;
        const fams = getComputedStyle(el).fontFamily.split(',').map((f) => f.trim().replace(/^['"]|['"]$/g, '')).filter((f) => f && !GENERIC.test(f));
        const stack = fams.join('|');
        for (const ch of new Set(Array.from(fn.nodeValue || '').filter((c) => c.trim() && c.codePointAt(0) > 32))) {
          const key = `${stack}|${ch}`;
          if (checked.has(key) || checked.size > 1500) continue;
          checked.add(key);
          const hit = fams.find((f) => has(f, ch));
          if (!hit) { if (fams.length) missing.add(ch); continue; }
          if (!web.has(hit.toLowerCase())) local.add(hit);
        }
      }
      fonts.missing = Array.from(missing);
      fonts.local = Array.from(local);
    } catch (_) { /* canvas unavailable: skip */ }

    return { issues, warnings, fingerprint, boxedCount: boxed.length, segments, headline, fonts };
  });
}

// Viewports that are not 16:9: a host pane (Claude artifact viewer, iframe, preview) rarely is.
const FIT_VIEWPORTS = [
  [1000, 515],
  [1280, 1000],
  [420, 800],
];

/**
 * Open the deck live (no ?still) at several non-16:9 sizes and check that #stage is fully visible
 * and centred, and that the keyboard and click controls still advance beats. The per-beat pass runs
 * at exactly 1920x1080, where a stage centred with `transform-origin: center` + bare `scale()` looks
 * right; at any other size such a stage drifts right and down out of view, which is how decks
 * opened inside Claude ended up skewed.
 * @param {import('playwright').BrowserContext} context
 * @param {string} input
 * @param {number} total
 */
async function checkStageFit(context, input, total) {
  const issues = [];
  const url = resolveDeckUrl(input);
  for (const [w, h] of FIT_VIEWPORTS) {
    const page = await context.newPage();
    try {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await waitForDeckReady(page);
      const r = await page.evaluate(() => {
        const b = document.getElementById('stage').getBoundingClientRect();
        return { l: b.left, t: b.top, r: b.right, b: b.bottom };
      });
      const fmt = `(${r.l.toFixed(0)}, ${r.t.toFixed(0)}, ${r.r.toFixed(0)}, ${r.b.toFixed(0)})`;
      if (r.l < -1 || r.t < -1 || r.r > w + 1 || r.b > h + 1) {
        issues.push({ type: 'stage-fit', message: `#stage leaves a ${w}x${h} viewport ${fmt}; fit it with an explicit translate + scale from transform-origin 0 0 (see stage-contract.md §1)` });
        continue;
      }
      if (Math.abs(r.l - (w - r.r)) > 2 || Math.abs(r.t - (h - r.b)) > 2) {
        issues.push({ type: 'stage-fit', message: `#stage is not centred in a ${w}x${h} viewport ${fmt}` });
        continue;
      }
      if (total < 2 || w !== FIT_VIEWPORTS[0][0]) continue;
      // Controls: ArrowRight and a click on the right of the viewport each advance one beat.
      const before = await page.evaluate(() => window.__beatdeck.current());
      await page.keyboard.press('ArrowRight');
      const afterKey = await page.evaluate(() => window.__beatdeck.current());
      if (afterKey !== before + 1) {
        issues.push({ type: 'controls', message: `ArrowRight did not advance the deck at ${w}x${h} (beat ${before} -> ${afterKey})` });
      }
      await page.evaluate(() => window.__beatdeck.goTo(0));
      await page.mouse.click(Math.round(w * 0.6), Math.round(h * 0.5));
      const afterClick = await page.evaluate(() => window.__beatdeck.current());
      if (afterClick !== 1) {
        issues.push({ type: 'controls', message: `Clicking the right of the viewport did not advance the deck at ${w}x${h} (beat 0 -> ${afterClick})` });
      }
    } finally {
      await page.close();
    }
  }
  return issues;
}

/** Installed before deck scripts: logs every element animation, tagged with the beat being entered. */
function motionProbeInitScript() {
  const log = (window.__bdMotionLog = []);
  window.__bdHelperLog = [];
  const beat = () => (typeof window.__bdMotionBeat === 'number' ? window.__bdMotionBeat : -1);
  const ignored = (el) =>
    !el || !el.closest || el.id === 'world' || el.id === 'stage' ||
    (el.classList && el.classList.contains('scene')) || el.hasAttribute('data-depth') ||
    Boolean(el.closest('#hud, #notes-drawer, #subtitle, #camera-safe-zone'));
  const norm = (e) => String(e || 'ease').replace(/\s+/g, '');
  const META_KEYS = new Set(['offset', 'easing', 'composite']);
  const origAnimate = Element.prototype.animate;
  Element.prototype.animate = function patchedAnimate(kf, opts) {
    const anim = origAnimate.call(this, kf, opts);
    try {
      if (!ignored(this)) {
        const o = typeof opts === 'number' ? { duration: opts } : opts || {};
        const props = new Set();
        let frames = 0;
        if (Array.isArray(kf)) {
          frames = kf.length;
          kf.forEach((f) => Object.keys(f).forEach((k) => { if (!META_KEYS.has(k)) props.add(k); }));
        } else if (kf) {
          Object.entries(kf).forEach(([k, v]) => {
            if (META_KEYS.has(k)) return;
            props.add(k);
            frames = Math.max(frames, Array.isArray(v) ? v.length : 1);
          });
        }
        // Largest positional jump in the keyframes (stage px), to catch elements flying in from far away.
        let shift = 0;
        const px = (v) => (String(v).match(/-?\d*\.?\d+px/g) || []).map((n) => Math.abs(parseFloat(n)));
        const vals = Array.isArray(kf) ? kf.flatMap((f) => [f.translate, f.transform]) : kf ? [].concat(kf.translate || [], kf.transform || []) : [];
        vals.forEach((v) => { if (v !== undefined) shift = Math.max(shift, ...px(v), 0); });
        // Only entrances count as travel; moving a visible element to a new place (re-sorting, FLIP) is fine.
        const firstOpacity = Array.isArray(kf) ? (kf[0] || {}).opacity : kf && [].concat(kf.opacity === undefined ? [] : kf.opacity)[0];
        if (!(firstOpacity !== undefined && Number(firstOpacity) === 0)) shift = 0;
        if (o.id === 'bd-change') return anim; // the runtime's own beat-change animations
        log.push({ beat: beat(), props: [...props], easing: norm(o.easing || 'linear'), frames, loop: o.iterations === Infinity, kind: o.id || '', shift });
      }
    } catch (_) { /* never break the deck */ }
    return anim;
  };
  document.addEventListener('transitionrun', (e) => {
    if (ignored(e.target)) return;
    const cs = getComputedStyle(e.target);
    const props = cs.transitionProperty.split(',').map((s) => s.trim());
    const eases = cs.transitionTimingFunction.split(/,(?![^(]*\))/).map((s) => s.trim());
    const i = Math.max(0, props.indexOf(e.propertyName));
    log.push({ beat: beat(), props: [e.propertyName], easing: norm(eases[i % eases.length]), frames: 2, loop: false });
  }, true);
  document.addEventListener('animationstart', (e) => {
    if (ignored(e.target)) return;
    const cs = getComputedStyle(e.target);
    log.push({ beat: beat(), props: [`@${e.animationName}`], easing: norm(cs.animationTimingFunction), frames: 3, loop: cs.animationIterationCount === 'infinite' });
  }, true);
  // rAF-driven helpers (draw, morph, followPath, countUp, typewriter) show up as DOM writes.
  const seen = new Set();
  new MutationObserver((muts) => {
    for (const m of muts) {
      const el = m.type === 'characterData' ? m.target.parentElement : m.target;
      if (ignored(el)) continue;
      let prop = null;
      if (m.type === 'attributes' && m.attributeName === 'd') prop = 'path-morph';
      else if (m.type === 'attributes' && m.attributeName === 'transform') prop = 'path-follow';
      else if (m.type === 'attributes' && m.attributeName === 'style' && el.style && el.style.strokeDashoffset) prop = 'stroke-draw';
      else if (m.type === 'characterData' || m.type === 'childList') prop = 'text-roll';
      if (!prop) continue;
      // A tween writes many frames; a one-off reset (innerHTML, class swap) is not motion.
      const hitKey = `${beat()}|${prop}`;
      if (!el.__bdHits || el.__bdHits.key !== hitKey) el.__bdHits = { key: hitKey, n: 0 };
      el.__bdHits.n += 1;
      if (el.__bdHits.n < 3) continue;
      const key = hitKey;
      if (seen.has(key)) continue;
      seen.add(key);
      log.push({ beat: beat(), props: [prop], easing: 'js', frames: 3, loop: false });
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['d', 'transform', 'style'], characterData: true, childList: true });
}

function overshoots(easing) {
  const lin = /^linear\((.*)\)$/.exec(easing); // springs are emitted as linear() curves
  if (lin) return lin[1].split(',').some((p) => { const v = parseFloat(p); return v > 1.005 || v < -0.005; });
  const m = /^cubic-bezier\(([^)]*)\)$/.exec(easing);
  if (!m) return false;
  const [, y1, , y2] = m[1].split(',').map(Number);
  return y1 < 0 || y1 > 1 || y2 < 0 || y2 > 1;
}

// Accents are loud on purpose. A premium deck spends them on one or two moments, never as decoration.
const ACCENT_KINDS = new Set(['stamp', 'shake', 'iris', 'cursor', 'typewriter', 'splitText']);
// Gestures that stay quiet however often they appear.
const QUIET_KINDS = new Set(['rise', 'unveil', 'focus', 'draw', 'countUp', 'morph', 'tween', 'ambient']);
// Beat changes that keep continuity or stay invisible; everything else is a "loud" change.
const QUIET_CHANGES = new Set(['cut', 'fade', 'dip', 'match', 'camera']);
const family = (t) => String(t || '').replace(/-(left|right|up|down)$/, '');

/**
 * Play every beat live (10x fast-forward) and look for motion excess, the thing that makes a deck feel
 * cheap: accents on every other beat, several gestures fighting in one beat, bouncy curves everywhere, a
 * different flashy beat change each time, elements flying in from far away. Also flags the opposite
 * extreme, a long deck with no signature moment at all.
 * @param {import('playwright').Browser} browser
 * @param {string} input
 * @param {number} total
 * @param {string[]} allow  META.lintAllow
 */
async function checkMotion(browser, input, total, allow) {
  const warnings = [];
  const context = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  try {
    await context.addInitScript(variableClockInitScript);
    await context.addInitScript(motionProbeInitScript);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Animation.enable');
    await page.goto(resolveDeckUrl(input, { bare: true, p: 1 }), { waitUntil: 'domcontentloaded' });
    await waitForDeckReady(page);
    const speed = 10;
    await page.evaluate((r) => window.__bdSetClockRate(r), speed);
    await cdp.send('Animation.setPlaybackRate', { playbackRate: speed });
    const transitions = [];
    const crossings = new Map(); // beat index -> Set of "moving element ⟂ frame" labels
    const protagonistBeats = [];
    let protagonistMarked = false;
    // Mid-motion geometry: a moving element that sits on top of a container's frame ([data-frame]: a phone,
    // a page, a tray) without being inside it reads as passing through the object. Final frames never show it.
    const sampleCrossings = () => page.evaluate(() => {
      const label = (el) => (el.id ? `#${el.id}` : '') + (el.classList.length ? `.${[...el.classList].slice(0, 2).join('.')}` : '') || el.tagName.toLowerCase();
      const allowed = (el, type) => Boolean(el.closest(`[data-lint-allow~="${type}"]`));
      // A scene on its way out during a beat change is not part of the new beat's physical space.
      const visible = (el) => !el.closest('.is-leaving') && (el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true);
      // Containers: anything marked data-frame, plus anything drawn with a bezel (a border of 6px or more).
      const bezel = (el) => {
        const cs = getComputedStyle(el);
        const w = Math.max(...['Top', 'Right', 'Bottom', 'Left'].map((k) => (cs[`border${k}Style`] === 'none' ? 0 : parseFloat(cs[`border${k}Width`]) || 0)));
        const r = el.getBoundingClientRect();
        return w >= 6 && r.width >= 120 && r.height >= 120;
      };
      const stage = document.getElementById('stage') || document.body;
      const frames = [...stage.querySelectorAll('*')].filter((el) => (el.hasAttribute('data-frame') || bezel(el)) && visible(el));
      if (!frames.length) return [];
      const movers = new Set();
      for (const a of document.getAnimations()) {
        if (a.id === 'bd-change' || a.playState !== 'running' || !a.effect || !a.effect.target) continue;
        if (a.effect.target instanceof Element) movers.add(a.effect.target);
      }
      const out = [];
      for (const m of movers) {
        if (!visible(m) || allowed(m, 'frame-crossing')) continue;
        const r = m.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        for (const f of frames) {
          if (f === m || f.contains(m) || m.contains(f) || allowed(f, 'frame-crossing')) continue;
          const q = f.getBoundingClientRect();
          const x0 = Math.max(r.left, q.left), x1 = Math.min(r.right, q.right);
          const y0 = Math.max(r.top, q.top), y1 = Math.min(r.bottom, q.bottom);
          if (x1 - x0 < 3 || y1 - y0 < 3) continue; // apart
          const inside = r.left >= q.left - 1 && r.right <= q.right + 1 && r.top >= q.top - 1 && r.bottom <= q.bottom + 1;
          // Only a mover that straddles the frame's edge and is drawn above it passes "through" the object.
          if (inside) continue;
          const probes = [[(x0 + x1) / 2, (y0 + y1) / 2], [x0 + 2, y0 + 2], [x1 - 2, y1 - 2]];
          const onTop = probes.some(([x, y]) => { const hit = document.elementFromPoint(x, y); return hit && (hit === m || m.contains(hit)); });
          if (onTop) out.push(`${label(m)} over ${label(f)}`);
        }
      }
      return out;
    });
    for (let i = 0; i < total; i += 1) {
      transitions.push(
        await page.evaluate((idx) => {
          window.__bdMotionBeat = idx;
          window.__beatdeck.goTo(idx);
          return document.body.dataset.beatTransition;
        }, i)
      );
      for (const wait of [40, 60, 90, 150]) {
        await page.waitForTimeout(wait);
        for (const c of await sampleCrossings()) {
          if (!crossings.has(i)) crossings.set(i, new Set());
          crossings.get(i).add(c);
        }
      }
      const p = await page.evaluate(() => {
        const marked = [...document.querySelectorAll('[data-protagonist]')];
        const seen = marked.some((el) => {
          const r = el.getBoundingClientRect();
          const ok = el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true;
          return ok && r.width > 8 && r.height > 8 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
        });
        return { marked: marked.length > 0, seen };
      });
      if (p.marked) protagonistMarked = true;
      if (p.seen) protagonistBeats.push(i);
    }
    // Bridges are the deck's own designed changes (MOTION.bridges); they are not stock showy effects.
    const bridges = new Set(await page.evaluate(() => (window.__beatdeck && window.__beatdeck.bridges) || []));
    const { log, helpers } = await page.evaluate(() => ({ log: window.__bdMotionLog || [], helpers: window.__bdHelperLog || [] }));
    const anims = Array.from({ length: total }, () => []);
    for (const r of log) if (r.beat >= 0 && r.beat < total && !r.loop) anims[r.beat].push(r);
    const kinds = Array.from({ length: total }, () => new Set());
    for (const h of helpers) if (h.beat >= 0 && h.beat < total) kinds[h.beat].add(h.kind);
    // Springs are tagged on their animations; count them only when they actually overshoot.
    anims.forEach((rs, i) => rs.forEach((r) => { if (r.kind === 'spring' && overshoots(r.easing)) kinds[i].add('spring'); }));
    const list = (idx) => idx.map((i) => i + 1).join(', ');
    const skip = (type) => allow.includes(type);

    const accentBeats = kinds.map((k, i) => ({ i, a: [...k].filter((x) => ACCENT_KINDS.has(x)) })).filter((b) => b.a.length);
    const accentBudget = Math.max(2, Math.ceil(total / 6));
    if (!skip('motion-accent-overuse') && accentBeats.length > accentBudget) {
      warnings.push({
        beat: 'deck',
        type: 'motion-accent-overuse',
        message: `${accentBeats.length} beats use accent effects (beats ${list(accentBeats.map((b) => b.i))}: ${[...new Set(accentBeats.flatMap((b) => b.a))].join(', ')}); a ${total}-beat deck has room for about ${accentBudget}. Keep the one or two where the story turns and let the rest rise, unveil or fade (craft-and-direction.md §2)`,
      });
    }

    if (!skip('motion-busy')) {
      kinds.forEach((k, i) => {
        const loud = [...k].filter((x) => !QUIET_KINDS.has(x));
        const accents = loud.filter((x) => ACCENT_KINDS.has(x));
        if (loud.length >= 3 || accents.length >= 2) {
          warnings.push({
            beat: `beat ${i + 1}`,
            type: 'motion-busy',
            message: `${loud.length} different effects compete in one beat (${loud.join(', ')}); give the beat one gesture and let everything else stay still`,
          });
        }
      });
    }

    const bouncy = anims.map((rs, i) => ({ i, n: rs.filter((r) => overshoots(r.easing)).length })).filter((b) => b.n > 0);
    const bounceBudget = Math.max(1, Math.ceil(total / 8));
    if (!skip('motion-bounce') && bouncy.length > bounceBudget) {
      warnings.push({
        beat: 'deck',
        type: 'motion-bounce',
        message: `overshooting curves (bouncy springs, snap) appear in ${bouncy.length} beats (beats ${list(bouncy.map((b) => b.i))}); bounce reads as playful or cheap outside a play-register deck. Use MOTION.ease.out or a critically damped spring`,
      });
    }

    const far = anims.map((rs, i) => ({ i, d: Math.max(0, ...rs.filter((r) => r.kind !== 'cursor' && !String(r.kind).startsWith('bd-')).map((r) => r.shift || 0)) })).filter((b) => b.d > 160);
    if (!skip('motion-travel') && far.length >= 2) {
      warnings.push({
        beat: 'deck',
        type: 'motion-travel',
        message: `elements fly in from ${Math.round(Math.max(...far.map((b) => b.d)))}px or more away in beats ${list(far.map((b) => b.i))}; premium entrances travel 8-40px. Move the camera or use a beat change for large travel (moving a visible element to a new place is fine)`,
      });
    }

    const changes = transitions.slice(1).filter((t) => typeof t === 'string' && t !== '');
    const loudChanges = changes.filter((t) => !QUIET_CHANGES.has(family(t)) && !bridges.has(t));
    const loudFamilies = [...new Set(loudChanges.map(family))];
    if (!skip('transition-variety') && changes.length >= 3 && (loudFamilies.length > 2 || loudChanges.length > Math.max(2, Math.ceil(changes.length / 4)))) {
      warnings.push({
        beat: 'deck',
        type: 'transition-variety',
        message: `${loudChanges.length} of ${changes.length} beat changes are showy (${loudFamilies.join(', ')}); keep most changes to fade, cut, match or camera, and give at most two story turns a distinct change`,
      });
    }

    if (!skip('frame-crossing')) {
      for (const [i, set] of crossings) {
        warnings.push({
          beat: `beat ${i + 1}`,
          type: 'frame-crossing',
          message: `mid-motion, a moving element is drawn across a container's frame (${[...set].slice(0, 3).join('; ')}); things that enter a phone, page or tray should be clipped by its opening (put the destination inside it with overflow: hidden) or pass under its frame (craft-and-direction §2.8)`,
        });
      }
    }

    // The heart of the deck (craft-and-direction §0): one protagonist, marked with data-protagonist,
    // that the audience meets early and keeps meeting.
    if (total >= 6) {
      if (!protagonistMarked) {
        if (!skip('protagonist')) warnings.push({ beat: 'deck', type: 'protagonist', message: 'no element is marked data-protagonist; name the subject\'s protagonist (the character, mechanism or finding its promise depends on) and mark where it appears (craft-and-direction §0)' });
      } else {
        const first = protagonistBeats.length ? protagonistBeats[0] : -1;
        const need = Math.ceil(total / 3);
        if (!skip('protagonist') && (first < 0 || first > 2 || protagonistBeats.length < need)) {
          warnings.push({
            beat: 'deck',
            type: 'protagonist',
            message: first < 0 ? 'the data-protagonist element never shows on stage' : `the protagonist first shows on beat ${first + 1} and in ${protagonistBeats.length} of ${total} beats; meet it within the first three beats and keep it in at least ${need}, so the deck is about it rather than a tour around it`,
          });
        }
      }
    }

    // Designed changes repeat into a pattern quickly: the same bridge back to back, or on most changes.
    const visibleChanges = changes.filter((t) => t !== 'cut');
    if (!skip('transition-repeat')) {
      const counts = new Map();
      visibleChanges.forEach((t) => { if (bridges.has(t)) counts.set(t, (counts.get(t) || 0) + 1); });
      const limit = Math.max(2, Math.ceil(visibleChanges.length / 3));
      const over = [...counts].filter(([, n]) => n > limit).map(([t, n]) => `${t} ×${n}`);
      const twice = visibleChanges.some((t, k) => k > 0 && bridges.has(t) && visibleChanges[k - 1] === t);
      if (over.length || twice) {
        warnings.push({
          beat: 'deck',
          type: 'transition-repeat',
          message: `${over.length ? `a designed change is used on most beat changes (${over.join(', ')}; at most ${limit} of ${visibleChanges.length})` : 'the same designed change plays twice in a row'}; give each story relation its own change from the deck's world and protagonist (craft-and-direction §2.7)`,
        });
      }
    }

    // A deck whose every visible change is a fade reads like a slide tool's default. A deck that already
    // spends a bridge, a match, a camera move or a showy change at a turn is fine.
    const visible = changes.filter((t) => t !== 'cut');
    if (!skip('transition-monotone') && visible.length >= 4 && visible.every((t) => t === 'fade' || t === 'dip')) {
      warnings.push({
        beat: 'deck',
        type: 'transition-monotone',
        message: `all ${visible.length} visible beat changes are fades; design one bridge from the deck's own visual signature (MOTION.bridges, craft-and-direction §2.7) and use it where each chapter starts, or use match / camera where two beats share an object`,
      });
    }

    // Hand-written decks may not call the helpers: any non-trivial property (a drawn stroke, a clip, a
    // morphing path, a rolling number) also counts as a moment that stands out.
    const SIMPLE = new Set(['opacity', 'transform', 'translate', 'scale', 'visibility', 'filter']);
    const signature = kinds.some((k) => [...k].some((x) => !QUIET_KINDS.has(x) || ['draw', 'morph', 'countUp'].includes(x))) ||
      loudChanges.length > 0 || anims.some((rs) => rs.some((r) => (r.kind === 'tween' || !QUIET_KINDS.has(r.kind)) && r.props.some((p) => !SIMPLE.has(p))));
    if (!skip('motion-no-signature') && total >= 6 && !signature) {
      warnings.push({
        beat: 'deck',
        type: 'motion-no-signature',
        message: 'no beat has a signature moment; quiet is right for most beats, but give the moment the story turns one gesture of its own (a drawn line, a match cut, a focus pull)',
      });
    }
  } finally {
    await context.close().catch(() => {});
  }
  return warnings;
}

async function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2), new Set(['json', 'strict', 'motion']));
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
          spine: meta.spine || null,
        };
      });

      if (!apiInfo || !Array.isArray(apiInfo.beats) || apiInfo.beats.length === 0) {
        throw new Error('window.__beatdeck missing or list() returned 0 beats.');
      }

      const failures = [];
      const warnings = [];
      const notes = [];
      const fontMissing = new Set();
      const fontLocal = new Set();
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
        for (const ch of inspected.fonts?.missing || []) fontMissing.add(ch);
        for (const f of inspected.fonts?.local || []) fontLocal.add(f);
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

      // The story spine (craft-and-direction §0.3): the structure the deck maker confirmed, and the
      // beats following it. Short decks (under six beats) rarely have sections.
      if (total >= 6 && !sayAllowed('spine')) {
        const problems = checkSpine(apiInfo.spine, apiInfo.beats);
        if (problems.length) {
          warnings.push({ beat: 'deck', type: 'spine', message: problems.join('. ') });
        }
      }

      for (const issue of await checkStageFit(page.context(), input, total)) {
        failures.push({ beat: 'deck', ...issue });
      }

      if (flags.motion !== false) {
        warnings.push(...(await checkMotion(page.context().browser(), input, total, apiInfo.lintAllow)));
      }

      if (fontMissing.size) {
        const sample = Array.from(fontMissing).slice(0, 16).join('');
        notes.push({
          beat: 'deck',
          type: 'font-fallback',
          message: `${fontMissing.size} character(s) that no named font in their stack provides on this machine (e.g. ${sample}); they render in a system fallback you did not choose. Embed the faces with fonts.mjs`,
        });
      }
      if (fontLocal.size) {
        notes.push({
          beat: 'deck',
          type: 'font-fallback',
          message: `Renders with locally installed font(s) that are not embedded: ${Array.from(fontLocal).join(', ')}. Viewers on another machine or a phone will see a different face; embed them with fonts.mjs`,
        });
      }

      return { total, failures, warnings, notes };
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
          notes: result.notes || [],
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
  for (const n of result.notes || []) {
    console.warn(`  NOTE [${n.beat}] (${n.type}) ${n.message}`);
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
