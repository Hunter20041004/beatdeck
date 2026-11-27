# Export, Linting, and Recording CLI

All CLI tools run in Node.js (`>= 20`) using Playwright's bundled headless Chromium (`scripts/lib/browser.mjs`). No system Chrome installation or Python dependencies are required.

Resolve `<skill-dir>` (the directory containing `SKILL.md`). If `<skill-dir>/node_modules/` is missing, run the one-time setup inside `<skill-dir>`:

```bash
cd <skill-dir> && npm install && npx playwright install chromium
```

Invoke tools from the user's workspace using `node <skill-dir>/scripts/<tool>.mjs <path/to/deck.html> ...`, passing explicit `--out` paths when saving into the workspace.

`record-video.mjs` additionally requires `ffmpeg` on `PATH` unless run with `--frames-only` (`ffprobe` is used only by `npm test` to verify encoded video streams).

### Chromium Resolution

Every tool launches Chromium through `scripts/lib/browser.mjs` in this order:

1. `BEATDECK_CHROMIUM=/path/to/chrome` (explicit override; errors if the file is missing).
2. Playwright's bundled Chromium for the installed `playwright` version.
3. Another Chromium revision already present in the same Playwright browsers cache (e.g. a sandbox with a pre-installed browser one revision behind). A one-line warning names both paths.

It never silently falls back to a system Google Chrome install. If nothing is found, the error tells you to run `npx playwright install chromium` or set `BEATDECK_CHROMIUM`.

---

## 0. Skeleton Scaffold (`scripts/new-deck.mjs`)

```bash
node <skill-dir>/scripts/new-deck.mjs <out/deck.html> [--title "Deck Title"] [--lang en] [--beats 6 | --ids opening,shift,proof] [--force]
```

Writes `templates/skeleton.html` with the requested beats: a contract-complete, **style-free** deck that already passes lint errors. Each beat gets a `BEATS` entry (`TODO` chapter/say, `cam: { x, y, scale }` for the `#world` camera) and a placeholder `<section class="scene" data-beat="<id>" data-beatdeck-skeleton>`. `CHOREO[id](sceneEl, { at, animate, draw, countUp, typewriter, isStill, isVideo })` holds per-beat choreography; every helper settles to its final state under `?still`. Refuses to overwrite an existing file unless `--force`. The title is HTML- and JS-escaped safely.

Lint keeps warning (`skeleton`) until every placeholder scene is replaced, so a skeleton can never ship as a finished deck under `--strict`.

---

## 1. Layout, Contract & Craft Linter (`scripts/lint.mjs`)

```bash
node <skill-dir>/scripts/lint.mjs <deck.html> [--strict] [--json]
```

Loads `<deck.html>?still&p=1` at `1920×1080`, verifies `#stage` intrinsic dimensions (`1920×1080`) and `window.__beatdeck` with at least one beat, and steps through every beat (`goTo(i)`):

- **Runtime errors**: Fails on any `pageerror` or console `error`.
- **Broken images**: Checks every visible `<img>` inside `#stage` has `complete && naturalWidth > 0`.
- **Stage containment**: Verifies visible text rectangles inside `#stage` remain within `1920×1080` logical bounds (`±1px` tolerance).
- **Line-wrap guard**: Checks every visible element inside `#stage` that defines `data-expected-lines`, `data-lint-lines`, or contains `<br>` tags. Visual lines are clustered via `Range.getClientRects()` by vertical overlap so mixed CJK characters and large inline numbers are counted accurately. Fails if `actualLines > expectedLines`.

Craft **warnings** (printed as `WARN`, fatal only with `--strict`):

| Type | Fires when |
| :--- | :--- |
| `card-shell` | ≥ 4 visible text-bearing boxes with a full border (or shadow + radius + fill), each 1.5–60% of the stage, on one beat. |
| `nested-card` | A boxed element sits inside another boxed element. |
| `emoji` | Visible text contains an emoji pictograph (draw an SVG or typographic mark instead). |
| `text-collision` | Glyph boxes from two different text nodes overlap (> 2px horizontally and > 35% of the smaller line height). |
| `layout-repeat` | Two consecutive beats share the same boxed-layout fingerprint (≥ 2 boxes, 60px grid). |
| `skeleton` | A `[data-beatdeck-skeleton]` placeholder from `new-deck.mjs` is still visible. |
| `ai-gradient` / `gradient-text` | A CSS gradient with ≥ 2 saturated stops in the blue–violet–pink range (hue spread ≥ 25°), or gradient-filled text. |
| `small-capture` | A raster `<img>` ≥ 600px wide shown below 40% of its pixel size; a DPR-2 capture at that scale puts UI text under ~11px on stage. Crop tighter or enlarge. |
| `glassmorphism` | ≥ 2 `backdrop-filter: blur()` panels on one beat. |
| `text-density` | > 80 word-equivalents on stage (Latin words + CJK chars ÷ 2; ignores SVG art and text under 14px). |
| `bullet-stack` | ≥ 6 visible `<li>` on one beat. |
| `label-headline` | The largest text on the beat is a topic label (Agenda, Overview, Thank you, Q&A, 議程, 謝謝聆聽…). |
| `ai-phrase` | Stock LLM phrasing in stage text or `say` (English and Chinese lists in `scripts/lib/copy-rules.mjs`). |
| `placeholder` | TODO, TBD, XX%, `[Company]`, lorem ipsum, John Doe, Acme, 某某, 〇〇. |
| `internal-process` | Process bookkeeping: iteration/revision counts, review rounds, resubmission notes, sub-agents, bug-fix tallies, commit hashes, source file paths (「調整了 N 次」「第二版修正」「補交」「修了 N 處」). `note` is not checked. |
| `read-aloud` | ≥ 70% of a beat's `say` 4-grams are printed on stage. |
| `metaphor-frame` | 「X 是一場／一種 Y」「就像一場…」 / "X is a gamble/journey/dance" in stage text or `say`. |
| `slogan-cadence` | 4+ headlines (and ≥ 40% of them) are two- or three-beat clipped slogans: 「短句，短句。」 or "Three lenses. Zero broken frames." (deck-level; headline = largest text on the beat). |
| `contrast-frame` | "Not X, but Y" / 「不是…而是…」 framing on 2+ beats (deck-level). |
| `em-dash` / `exclamation` | More than one em dash per four beats, or one exclamation run per six beats (deck-level). |
| `zh-punct` | Half-width `,.;:!?` between CJK characters (any `zh*` lang). |
| `zh-variant` / `zh-term` | Simplified-only characters or Mainland vocabulary when `lang` is `zh-Hant`/`zh-TW`/`zh-HK`/`zh-MO`. |

Wording checks run on every visible stage text node *and* on each beat's `say`. Warnings in narration are labelled `beat N (id) say`; deck-level ones are labelled `deck`. The rationale and the human checklist behind these rules are in [ai-tells.md](ai-tells.md).

Exempt a deliberate case with `data-lint-allow="<type> [<type>…]"` on the smallest enclosing element, or for narration deck-wide with `meta.lintAllow: ["<type>"]`.

- `--json` prints `{ pass, beats, strict, errors: [{beat,type,message}], warnings: [...] }` to stdout (or `{ pass: false, fatal }` when the deck cannot load). Parse this instead of scraping text.
- Exits `0` when every beat passes (warnings allowed unless `--strict`); exits `1` with per-beat diagnostics otherwise.

---

## 1b. Visual Snapshots & Contact Sheet (`scripts/snapshot.mjs`)

```bash
node <skill-dir>/scripts/snapshot.mjs <deck.html> [--out dir] [--beats 1,3-5] [--cols 4] [--bare] [--sheet=false]
node <skill-dir>/scripts/snapshot.mjs <hero.html> --raw [--out dir] [--wait 300]
```

Default `--out`: `<deckDir>/<name>-snapshots/`.

- **Deck mode:** captures each selected beat at `?still&p=N` (add `--bare` for stage-only `?still&bare`) as `beat-NN.png` (`1920×1080`), then composes `contact-sheet.png`, a `--cols`-wide grid labelled with beat number, id, chapter, and `pdfSkip`. Prints every written path so you can open them directly. Use it for the Audience lens and after every significant visual change.
- **`--raw` mode:** for the Hero Asset Standalone Gate. Loads any HTML page (no contract required) at `1920×1080`, waits for `load`, fonts, and `--wait` ms, and writes `<name>.png`.

---

## 2. Speaker Script Exporter (`scripts/script-export.mjs`)

```bash
node <skill-dir>/scripts/script-export.mjs <deck.html> [--out script.md] [--rate 3.6]
```

Reads `window.__beatdeck.meta` and `window.__beatdeck.list()`. When `--out` is omitted, writes Markdown directly to **`stdout`** (there is no default output file). Output contains:

- Deck title and total estimated duration (`mm:ss`).
- Per-speaker duration and beat breakdown.
- Timestamped table: `| Beat | Start | Sec | Chapter | Speaker | Line |` — when `beat.note` is non-empty, `*(Note: ...)*` is appended inside the `Line` cell.

### Duration Calculation

For each beat:
1. If `beat.duration` is explicitly set, that value (in seconds) is used.
2. Otherwise, duration is estimated from `beat.say`:
   - CJK characters (`\u3400-\u4dbf`, `\u4e00-\u9fff`, `\u3040-\u30ff`) divided by `--rate` (falls back to `meta.speechRate`, then `3.6` chars/s).
   - Latin words divided by `2.5` words/s.
   - Minimum `1.5s` when `say` is empty.

---

## 3. PDF Exporter (`scripts/pdf-export.mjs`)

```bash
node <skill-dir>/scripts/pdf-export.mjs <deck.html> [--mode slides|storyboard] [--out deck.pdf] [--cols 2]
```

Exports printable `1920×1080` landscape PDFs while skipping any beat with `pdfSkip: true` (preserving original 1-based beat numbers):

- **`--mode slides`** (default; default `--out`: `./deck.pdf` in current working directory): Captures each non-skipped beat at `?still&p=N` and compiles one full-bleed `1920×1080` page per beat.
- **`--mode storyboard`** (default `--out`: `./storyboard.pdf` in current working directory): Captures each non-skipped beat at `?still&bare&p=N` (hiding subtitles and chrome) and lays out `--cols` (`2` or `3`) frame cards per page with beat number, chapter title, and `say` caption underneath.

Temporary frame images are cleaned up automatically after PDF rendering.

---

## 4. Self-Contained Share Bundler (`scripts/bundle-share.mjs`)

```bash
node <skill-dir>/scripts/bundle-share.mjs <deck.html> [--out deck-share.html]
```

Default `--out` when omitted: `<deckDir>/<name>-share.html` alongside the source deck.

Produces a single portable HTML file that works offline or via email/file-share:

- Resolves relative `<link rel="stylesheet" href="...">`, `<script src="...">`, `<img src="...">`, `<video poster="...">`, SVG `<image href/xlink:href>`, `srcset`, and CSS `@import` / `url(...)` references (leaving `http://`, `https://`, `data:`, and `#` untouched).
- Inlines local stylesheets and scripts and base64-encodes binary assets (`png`, `jpg`, `webp`, `svg`, `woff2`, `mp3`, etc.).
- Verifies no unresolved local asset paths remain and errors clearly if a referenced file is missing.

---

## 5. Deterministic 60fps Video Recorder (`scripts/record-video.mjs`)

```bash
node <skill-dir>/scripts/record-video.mjs <deck.html> [--out deck.mp4] [--plan plan.json] [--fps 60] [--slow 3] [--audio track.wav] [--frames-only]
```

Default `--out` when omitted: `./<name>.mp4` in the current working directory, or `<dir>/<name>-frames/` when `--frames-only` is passed (if `--out` ends in `.mp4`/`.mov`/`.webm` with `--frames-only`, it normalizes to `<stem>-frames`).

Captures CSS animations, camera pans, and beat transitions without dropped frames by running Chromium under a deterministic virtual clock:

1. **Schedule generation**: If `--plan` is omitted, reads `window.__beatdeck.list()` and computes sequential start times using `beat.duration` or estimated `say` duration.
2. **Slow-motion virtual clock**: Injects an init script scaling `setTimeout`, `setInterval`, `requestAnimationFrame`, `Date.now()`, and `performance.now()` by `--slow` (default `3`), sets CDP `Animation.enable` + `Animation.setPlaybackRate({ playbackRate: 1 / slow })` before page navigation, and opens `?video&p=1`.
3. **Frame capture & resampling**: Records frames via CDP `Page.startScreencast` (`1920×1080` JPEG) while firing `goTo()` and `setSubtitle()` on schedule, then resamples frames monotonically into `Math.round(total * fps)` numbered frames (`s%06d.jpg`) and prints a frame-drop report separating static holds from active-motion intervals.
4. **Encoding**: Encodes `yuv420p` H.264 MP4 (`libx264`, `-preset medium`, `-crf 16`, `-movflags +faststart`), muxing `--audio` if supplied. Pass `--frames-only` to retain the resampled `fps` frames (`s%06d.jpg`) in the output directory and skip `ffmpeg`.

### Custom `--plan plan.json` Schema

Use `--plan` when syncing beats to a pre-recorded voiceover or customizing subtitle cues. Note that `beat` / `index` inside `--plan` are **0-based** (whereas `?p=N` and the `p` field are 1-based):

```json
{
  "total": 24.0,
  "events": [
    { "at": 0.0, "beat": 0, "subtitle": "First spoken line." },
    { "at": 4.8, "beat": 1, "subtitle": "Second beat arrives on cue." },
    { "at": 9.5, "subtitle": "Mid-beat subtitle update without advancing." }
  ]
}
```

- **Supported aliases**: Top-level may be an array or `{ events | beats | cues, total | totalDuration }`; each item accepts `{ at | start, beat | index | p (1-based), subtitle | say, duration }`.
- **Subtitle-only cues**: Omit `beat`/`index`/`p` to update `#subtitle` mid-beat without calling `goTo()`.
