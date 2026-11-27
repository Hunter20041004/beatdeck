/**
 * The story spine (craft-and-direction §0.3): the structure the deck maker confirmed before any look.
 *
 *   META.spine = { promise, protagonist, shape, from, to,
 *                  sections: [{ chapter, claim, why }] }
 *
 * `why` names how a section follows the previous one (but, so, because, for example, compared with,
 * then), optionally followed by a few words. A section that follows only because it comes next is a
 * list item, which is what turns a deck into a feature tour.
 */

// Connectives that only say "this comes next". Matched against the whole `why` (or its head before a colon).
const LIST_ONLY = /^(?:and(?: also)?|also|next|then next|another(?: thing)?|plus|in addition|additionally|moreover|furthermore|besides|另外|還有|接著|然後|此外|再來|再者|其次|以及|同時|另一個|下一個|下一步)$/i;

const text = (v) => (typeof v === 'string' ? v.trim() : '');

/** The relation word(s) of a `why`: everything before the first colon, dash or comma. */
export function whyHead(why) {
  return text(why).split(/[:：,，;；—–]/)[0].replace(/[\s.。!！…]+$/u, '').trim();
}

export function isListOnlyWhy(why) {
  return LIST_ONLY.test(whyHead(why));
}

export function normalizeSpine(spine) {
  if (!spine || typeof spine !== 'object') return null;
  const sections = Array.isArray(spine.sections)
    ? spine.sections.filter((s) => s && typeof s === 'object').map((s) => ({ chapter: text(s.chapter), claim: text(s.claim), why: text(s.why) }))
    : [];
  return {
    promise: text(spine.promise),
    protagonist: text(spine.protagonist),
    shape: text(spine.shape),
    from: text(spine.from),
    to: text(spine.to),
    sections,
  };
}

/**
 * Check a spine against the beats that are meant to follow it.
 * @param {object} spine  META.spine
 * @param {Array<{chapter?: string}>} beats
 * @returns {string[]} problems, each one sentence
 */
export function checkSpine(spine, beats) {
  const s = normalizeSpine(spine);
  if (!s || s.sections.length === 0) {
    return ['no META.spine; write the structure the deck maker confirmed (promise, from → to, and 3–6 sections with a claim and why each follows the last) before building (craft-and-direction §0.3)'];
  }
  const out = [];
  const missing = [];
  if (!s.promise) missing.push('promise');
  if (!s.to) missing.push('to (what the audience should think or do walking out)');
  if (missing.length) out.push(`META.spine has no ${missing.join(' and no ')}`);

  const noClaim = [];
  const noWhy = [];
  const listy = [];
  s.sections.forEach((sec, k) => {
    const name = sec.chapter || `section ${k + 1}`;
    if (!sec.claim) noClaim.push(name);
    if (k > 0 && !sec.why) noWhy.push(name);
    else if (sec.why && isListOnlyWhy(sec.why)) listy.push(`${name} ("${sec.why}")`);
  });
  if (noClaim.length) out.push(`sections without a claim: ${noClaim.join(', ')}; give each one full sentence the audience would agree with after it`);
  if (noWhy.length) out.push(`sections without a why: ${noWhy.join(', ')}; name how each follows the previous one (but, so, because, for example, compared with, then)`);
  if (listy.length) out.push(`sections that follow only because they come next: ${listy.join(', ')}; merge, cut, or find the real relation`);

  const order = new Map();
  s.sections.forEach((sec, k) => { if (sec.chapter && !order.has(sec.chapter)) order.set(sec.chapter, k); });
  const stray = new Set();
  const back = [];
  const used = new Set();
  let at = -1;
  (beats || []).forEach((b, i) => {
    const ch = text(b && b.chapter);
    if (!ch) return; // a beat without a chapter continues the current section
    if (!order.has(ch)) { stray.add(ch); return; }
    const k = order.get(ch);
    if (k < at) back.push(`beat ${i + 1} returns to "${ch}"`);
    at = Math.max(at, k);
    used.add(k);
  });
  if (stray.size) out.push(`beats use chapters the spine does not have: ${[...stray].slice(0, 4).map((c) => `"${c}"`).join(', ')}; each beat's chapter is one of META.spine.sections`);
  if (back.length) out.push(`${back.slice(0, 3).join('; ')}; sections run in spine order and do not come back`);
  const skipped = s.sections.filter((sec, k) => sec.chapter && !used.has(k)).map((sec) => `"${sec.chapter}"`);
  if (skipped.length && !stray.size) out.push(`no beat belongs to ${skipped.slice(0, 4).join(', ')}; build that section or take it out of the spine with the deck maker`);
  return out;
}

/**
 * Seconds per spine section, in spine order, from per-beat seconds.
 * @returns {Array<{chapter, claim, why, beats, sec}>}
 */
export function sectionTimes(spine, beats, secondsOf) {
  const s = normalizeSpine(spine);
  if (!s || !s.sections.length) return [];
  const rows = s.sections.map((sec) => ({ ...sec, beats: 0, sec: 0 }));
  const index = new Map(rows.map((r, k) => [r.chapter, k]));
  let current = -1;
  (beats || []).forEach((b, i) => {
    const ch = text(b && b.chapter);
    if (ch && index.has(ch)) current = index.get(ch);
    if (current < 0) return;
    rows[current].beats += 1;
    rows[current].sec += secondsOf(b, i);
  });
  return rows;
}
