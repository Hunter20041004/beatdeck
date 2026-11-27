import fs from 'node:fs';
import path from 'node:path';
import { estimateBeatSeconds, parseCliArgs, resolveDeckUrl, withPage } from './lib/browser.mjs';
import { normalizeSpine, sectionTimes } from './lib/spine.mjs';

function printUsage() {
  console.error('Usage: node scripts/script-export.mjs <deck.html> [--out script.md] [--rate <num>]');
}

function escapeCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n+/g, ' ')
    .trim();
}

function formatStart(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  return `${String(mins).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
}

async function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  if (positional.length === 0) {
    printUsage();
    process.exit(1);
  }

  const deckInput = positional[0];
  const cliRate = flags.rate !== undefined ? Number(flags.rate) : undefined;
  if (cliRate !== undefined && (!Number.isFinite(cliRate) || cliRate <= 0)) {
    throw new Error(`Invalid --rate value: ${flags.rate}`);
  }

  const url = resolveDeckUrl(deckInput, { still: true, p: 1 });
  const { meta, beats } = await withPage(url, async (page) => {
    return page.evaluate(() => {
      const api = window.__beatdeck;
      if (!api || typeof api.list !== 'function') {
        throw new Error('window.__beatdeck is not defined on deck.');
      }
      return {
        meta: api.meta || {},
        beats: api.list(),
      };
    });
  });

  if (!Array.isArray(beats) || beats.length === 0) {
    throw new Error('window.__beatdeck.list() returned no beats.');
  }

  const rate = cliRate ?? (Number(meta.speechRate) > 0 ? Number(meta.speechRate) : 3.6);
  let cursor = 0;
  const rows = [];
  const speakerStats = new Map();

  for (let i = 0; i < beats.length; i += 1) {
    const beat = beats[i];
    const sec = estimateBeatSeconds(beat, rate);
    const speaker = (beat.speaker && String(beat.speaker).trim()) || 'Presenter';
    const chapter = (beat.chapter && String(beat.chapter).trim()) || '-';
    const say = (beat.say && String(beat.say).trim()) || '';
    const note = (beat.note && String(beat.note).trim()) || '';
    const lineBase = say || '(visual beat)';
    const lineText = note ? `${lineBase} *(Note: ${escapeCell(note)})*` : lineBase;

    rows.push({
      beatNum: i + 1,
      start: formatStart(cursor),
      sec: sec.toFixed(1),
      chapter,
      speaker,
      line: lineText,
    });

    const prev = speakerStats.get(speaker) || { beats: 0, sec: 0 };
    prev.beats += 1;
    prev.sec += sec;
    speakerStats.set(speaker, prev);

    cursor += sec;
  }

  const totalSec = Number(cursor.toFixed(1));
  const title = escapeCell(meta.title || path.basename(deckInput));
  const subtitle = meta.subtitle ? escapeCell(meta.subtitle) : '';
  const lines = [];
  lines.push(`# ${title}`);
  if (subtitle) {
    lines.push('');
    lines.push(`> ${subtitle}`);
  }
  lines.push('');
  lines.push(`- **Beats**: ${beats.length}`);
  lines.push(`- **Estimated Duration**: ${formatStart(totalSec)} (${totalSec.toFixed(1)}s)`);
  lines.push(`- **Speech Rate**: ${rate} CJK chars/s, 2.5 Latin words/s`);
  lines.push('');
  // The confirmed structure (craft-and-direction §0.3), so the speaker rehearses the argument, not only the lines.
  const spine = normalizeSpine(meta.spine);
  if (spine && spine.sections.length) {
    lines.push('## Story Spine');
    lines.push('');
    if (spine.promise) lines.push(`- **Promise**: ${escapeCell(spine.promise)}`);
    if (spine.protagonist) lines.push(`- **Protagonist**: ${escapeCell(spine.protagonist)}`);
    if (spine.shape) lines.push(`- **Shape**: ${escapeCell(spine.shape)}`);
    if (spine.from || spine.to) lines.push(`- **From → to**: ${escapeCell(spine.from || '?')} → ${escapeCell(spine.to || '?')}`);
    lines.push('');
    lines.push('| Section | Follows because | Claim | Beats | Time | Share |');
    lines.push('| --- | --- | --- | ---: | ---: | ---: |');
    for (const r of sectionTimes(spine, beats, (b) => estimateBeatSeconds(b, rate))) {
      const pct = totalSec > 0 ? ((r.sec / totalSec) * 100).toFixed(0) : '0';
      lines.push(`| ${escapeCell(r.chapter || '-')} | ${escapeCell(r.why || '-')} | ${escapeCell(r.claim || '-')} | ${r.beats} | ${formatStart(r.sec)} | ${pct}% |`);
    }
    lines.push('');
  }
  lines.push('## Speaker Breakdown');
  lines.push('');
  lines.push('| Speaker | Beats | Seconds | Share |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const [speaker, stat] of speakerStats.entries()) {
    const pct = totalSec > 0 ? ((stat.sec / totalSec) * 100).toFixed(1) : '0.0';
    lines.push(`| ${escapeCell(speaker)} | ${stat.beats} | ${stat.sec.toFixed(1)}s | ${pct}% |`);
  }
  lines.push('');
  lines.push('## Script');
  lines.push('');
  lines.push('| Beat | Start | Sec | Chapter | Speaker | Line |');
  lines.push('| ---: | --- | ---: | --- | --- | --- |');
  for (const r of rows) {
    lines.push(
      `| ${r.beatNum} | ${r.start} | ${r.sec} | ${escapeCell(r.chapter)} | ${escapeCell(r.speaker)} | ${escapeCell(r.line)} |`
    );
  }
  lines.push('');

  const markdown = lines.join('\n');
  if (flags.out) {
    const outPath = path.resolve(String(flags.out));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, markdown, 'utf8');
    console.log(`Wrote script (${beats.length} beats, ${totalSec.toFixed(1)}s) -> ${outPath}`);
  } else {
    process.stdout.write(markdown);
  }
}

main().catch((err) => {
  console.error(`SCRIPT EXPORT ERROR: ${err.message}`);
  process.exit(1);
});
