---
name: beatdeck
description: Methodology and headless Chromium CLI tooling for crafting film-like, beat-driven HTML presentations on a 1920x1080 stage with a single source of truth for live talks, speaker notes, script Markdown, storyboard PDFs, self-contained share bundles, and deterministic 60fps MP4 videos. Use when asked to create a presentation, pitch deck, talk, demo walkthrough, storyboard, or convert notes, code, or documents into a visual deck.
---

# Beatdeck

Beatdeck is a presentation craft methodology paired with a thin browser runtime contract (`window.__beatdeck` v1.0) and headless Chromium CLI tooling. Every presentation invents its own bespoke visual world, card-free composition, crafted hero visuals, and motion grammar—never a recycled slide template, bordered-card shell, or default color theme.

## Core Methodology

### 1. Single-World Stage & Card-Free Composition
- Build one coherent visual metaphor on a `1920×1080` logical `#stage` (navigated via camera pan/zoom on an inner `#world` canvas or choreographed transitions) instead of disconnected slide rectangles.
- Derive palette, paper/ink contrast, typography pairing, and motion grammar from the subject itself.
- **Ban the Default AI Slide-Card Shell**: Explicitly reject defaulting to `top dot-kicker + full-width header rule + 4 corner crop marks + bordered card boxes`. Also reject generic dark SaaS neon, purple-blue AI gradients, card-inside-card nesting, 3-column icon grids, and emoji UI icons (draw crisp inline SVGs or typographic markers instead).
- Vary beats across **5 Card-Free Structural Composition Archetypes** so decks break out of slide-box sameness:
  1. **Clean Canvas + Single Character/Hero**: Open ground, oversized display type on one side, single layered character or focal artifact on the other—zero borders and zero header chrome.
  2. **Full-Bleed Scene / Architectural Cross-Section**: Edge-to-edge cutaway or illustrated streetscape occupying `65–85%` of `#stage`, anchored by one minimal headline or marginal callout.
  3. **Real Product Window + Hairline Callouts**: Genuine app or game frame occupying most of the stage with thin SVG leader lines pointing directly to exact UI details.
  4. **Raw Physical Artifact / Print Spread**: Tactile broadsheet, 35mm film contact sheet, or ledger sheet rendered with real print rules—never web-app rounded cards.
  5. **Asymmetric Typographic Stage**: Oversized kinetic numbers or editorial headlines set directly on the canvas with zero enclosing boxes.

### 2. Beat-Driven Storytelling (`BEATS`)
- Deliver **one idea and one visual change per beat**. Never stack multiple unrelated reveals into a single beat.
- Open with a concrete human scene or lived friction before introducing metrics, benchmarks, or architecture diagrams.
- Write for the audience: omit internal repository names, file paths, and implementation jargon unless the audience specifically cares about them.

### 3. Film-Grade Intra-Beat Choreography
- Treat each beat as a directed micro-scene rather than a static fade-in: sequence multi-step actions with `at(ms, fn, { liveOnly })` inside `goTo()` (clearing all pending timers/rAFs on every beat transition).
- Reuse **persistent stage protagonists** (a recurring artifact, continuous cross-section, spine, browser frame, or map) that pan, zoom, or morph across adjacent beats instead of rebuilding disconnected boxes per beat.
- Match motion density to one of three **Motion Intensity Tiers**:
  - **`Measured`**: Calm architectural reveals, slow camera glides, crisp rule/type wipes (editorial dossiers, minimalist essays).
  - **`Choreographed`**: 2–3 sequenced `at()` steps per beat, SVG `stroke-dashoffset` line-drawing, `countUp` numeric roll-ups, and motif morphing (product demos, keynotes, research).
  - **`Kinetic`**: Dense multi-stage timelines, simulated `cursor`/`typewriter` UI interactions, tactile `stamp`/`strike`/`wipe` cues, and `{ liveOnly: true }` ambient life (games, launches, trailers).
- Every non-`liveOnly` `at()` step must execute synchronously when `?still` is active so snapshots and PDFs capture the final settled frame, while using standard `setTimeout` / `requestAnimationFrame` so `record-video.mjs` scales timing cleanly under its virtual clock.

| Primitive | Use Inside a Beat | `?still` Settlement |
| :--- | :--- | :--- |
| `at(ms, fn, { liveOnly })` | Sequence multi-step reveals at exact offsets | Non-`liveOnly` runs immediately; `liveOnly` skipped |
| `draw` (`stroke-dashoffset`) | Trace SVG connectors, routes, or chart curves | Sets `stroke-dashoffset: 0` immediately |
| `countUp` / `typewriter` | Roll verified metrics or reveal CLI/text lines | Renders final formatted number or full string |
| `cursor` / `stamp` / `wipe` | Simulate pointer clicks, stamps, strikes, or masks | Lands at final clicked, stamped, or open state |
| `ambient` (`liveOnly: true`) | Idle pulse, caret blink, or subtle background drift | Skipped so static exports stay crisp |

### 4. Single Source of Truth
Store every beat's metadata and spoken narration in one `BEATS` array inside the deck HTML:

```js
{
  id: "opening",
  chapter: "01 · Friction",
  speaker: "Host",
  say: "Natural spoken line (~15–30 English words or ~30–60 CJK chars).",
  duration: 5.5,   // optional explicit seconds override
  note: "Presenter cue shown only in speaker notes.",
  pdfSkip: false   // true skips intermediate reveal beats in PDF export
}
```

Live presenter notes (`N`), timestamped `講稿` / script Markdown, slides and storyboard PDFs, and timed video capture all read directly from `BEATS`.

### 5. Multi-Mode Delivery
One HTML file serves five delivery targets without forks:
- **Live Presentation**: Keyboard/click navigation, `F` fullscreen, and `N` speaker-notes drawer.
- **Presenter PiP Recording**: `C` toggles a `400×300` bottom-right webcam safe-zone overlay inside `1920×1080` stage coordinates so essential content stays uncovered.
- **Slides & Storyboard PDF**: `?still` disables transitions/animations and settles `at()` steps; `?still&bare` also hides subtitles for clean storyboard cards.
- **Self-Contained Share HTML**: Inlines local CSS, JS, fonts, and images into one portable offline HTML file.
- **Deterministic 60fps MP4**: `?video` hides presenter chrome while keeping `#stage` and optional `#subtitle` visible for virtual-clock screencast recording.

### 6. Typography Discipline & Verification
- Lock intended CJK and Latin line breaks explicitly with `<br>` and `data-expected-lines="K"` on headlines and callouts.
- Keep inactive beat elements cleanly hidden (`display: none`, `visibility: hidden`, or `opacity: 0`) so automated geometry checks inspect only the active beat.
- Always run [scripts/lint.mjs](scripts/lint.mjs) in headless Chromium before delivery to catch text overflowing `1920×1080`, unexpected line wraps, broken images, and console errors.

## Ordered Workflow

Follow this order where sequence affects correctness:

1. **Gather real material and target delivery modes first**
   - Confirm who the audience is and which outputs are needed (live talk, webcam PiP, offline HTML share, storyboard PDF, or MP4).
   - Pull real numbers, quotes, artifacts, and screenshots from user input or workspace files. Mark missing facts explicitly instead of inventing placeholder figures.
2. **Align visual direction, structural archetype & motion tier before scripting (Mandatory)**
   - Before crafting assets or writing `BEATS`, synthesize the topic, audience, and tone, then propose **2–3 genuinely distinct visual world directions** (never three color variations of one card layout).
   - For each direction, specify five concrete elements: **Spatial metaphor**, **Surface & palette**, **Typography voice** (with offline system fallbacks), **Visual signature**, and **Primary card-free composition archetype**, plus a recommended **Motion Intensity Tier** (`Measured`, `Choreographed`, or `Kinetic`).
   - Ask the user once to pick, combine, or adjust before building. Skip asking only if told "decide for me" or in automated headless runs—state the chosen direction, archetype, and tier clearly upfront. Read [references/craft-and-direction.md](references/craft-and-direction.md).
3. **Hero Asset Craft & Fidelity Pass (Mandatory before deck assembly)**
   - Never draw hero visuals hastily inline while writing 2,500 lines of deck code. Craft and inspect focal assets first:
   - **Route A — Real Product, Game, or Physical Assets** (software, websites, games, hardware):
     - Gather or capture genuine high-res screenshots, renders, or photographs first; stage them large (`65–85%` of `#stage`) with crisp framing and hairline callouts. Never replace a real product or game screen with crude CSS/SVG wireframes.
   - **Route B — Zero-Screenshot Proposals, Coursework & Concept Talks** (when no product exists yet):
     - Pick one of **4 zero-screenshot high-craft visual routes**:
       1. **Architectural / Physical Cross-Section Illustration** using SVG `<pattern>` halftone/hatching, layered depths, and contextual micro-props.
       2. **Expressive Multi-Gradient Animated Character / Mascot** staged on a pure uncluttered canvas.
       3. **Tactile Conceptual Artifact** (realistic printed dossier, ledger, ticket, or instrument with realistic paper texture and crisp micro-typography).
       4. **Editorial Full-Stage Data Visualization** (charts/timelines driving the whole stage, never trapped inside dashboard cards).
   - **3-Layer Fidelity Bar** (every bespoke SVG/visual asset must satisfy ALL three before assembly):
     1. **Accurate Silhouette & Structure**: Domain-authentic proportions, never generic rectangles + circles.
     2. **Materiality & Shading Layer**: SVG `<pattern>` halftone dots/hatching, multi-stop gradients, paper grain, radial atmosphere, or depth shadows.
     3. **Secondary Micro-Details**: Environmental context props, scale ticks, rivets/annotations, browser favicons/tabs, or architectural trim.
   - **Standalone Gate**: Render and inspect hero assets visually at `1920×1080` BEFORE assembling `BEATS` and writing deck choreography.
4. **Author `BEATS`, choreograph timelines, and build the `1920×1080` stage**
   - Script `BEATS` with one idea and one visual transformation per beat, speakable `say` lines, and `pdfSkip: true` on intermediate micro-steps.
   - Implement `at(ms, fn, { liveOnly })` timelines and keep inactive beat elements cleanly hidden (`display: none`, `visibility: hidden`, or `opacity: 0`) so automated layout checks inspect only active content.
5. **Wire the `window.__beatdeck` v1.0 contract**
   - Implement `#stage` scaling, `?p=N`/`?still`/`?video`/`?bare`, `document.body.dataset.ready = "1"` after `document.fonts.ready` (with timeout fallback), `window.__beatdeck` (`version`, `meta`, `list()`, `current()`, `goTo(index)`, `setSubtitle(text)`), `at()` `?still` convergence, and live controls (`ArrowRight`/`Space`/`PageDown`/right-75% click, `ArrowLeft`/`PageUp`/`Backspace`/left-25% click, `Home`/`End`, `F`, `N`, `C`).
   - Read [references/stage-contract.md](references/stage-contract.md) and inspect [examples/beatdeck-intro/deck.html](examples/beatdeck-intro/deck.html).
6. **Run headless lint and three-perspective review before shipping**
   - Resolve `<skill-dir>` (if `<skill-dir>/node_modules/` is missing, run `cd <skill-dir> && npm install && npx playwright install chromium`). Run `node <skill-dir>/scripts/lint.mjs <path/to/deck.html>` until exit status is `0`.
   - Review sequentially via **Audience** (`?still&p=1..N` cold check, zero card-shell monotony), **Speaker** (read `say` aloud at `3.6` CJK chars/s or `2.5` Latin words/s; toggle `C` for PiP clearance), and **Fact & Layout Lint**.
7. **Export deliverables**
   - Generate script Markdown, PDFs, offline share HTML, or 60fps MP4 via `node <skill-dir>/scripts/<tool>.mjs <path/to/deck.html> --out <output-path>`. Read [references/export-and-recording.md](references/export-and-recording.md).

## Runtime Contract & Controls (`window.__beatdeck` v1.0)

Every deck implements a minimal shared interface so all tools work regardless of visual style:

| Surface | Requirement |
| :--- | :--- |
| `#stage` | `1920×1080` logical pixel container, centered and aspect-fit scaled into the viewport. |
| Ready signal | Wait for `document.fonts.ready` (with a bounded timeout fallback), render initial beat, then set `document.body.dataset.ready = "1"`. |
| `?p=N` | Jump to 1-based beat `N` (clamped `1..BEATS.length`). |
| `?still` | Add class `still` on `body`, disable CSS transitions/animations, settle non-`liveOnly` `at()` steps synchronously, hide chrome/notes/camera/subtitles. |
| `?video` | Add class `video` on `body`, hide chrome/notes/camera, keep `#stage` and `#subtitle` visible. |
| `?bare` | Add class `bare` on `body`, hide chrome/notes/camera **and** `#subtitle` (combine `?still&bare` for storyboards). |
| Global API | `window.__beatdeck` exposes `version: "1.0"`, `meta`, `list()`, `current()`, `goTo(index)`, and `setSubtitle(text)`. |
| Live keys | `ArrowRight`/`Space`/`PageDown`/right 75% click (next), `ArrowLeft`/`PageUp`/`Backspace`/left 25% click (prev), `Home`/`End`, `F` fullscreen, `N` notes, `C` `400×300` bottom-right PiP safe zone. |
| Lint hooks | `data-expected-lines="K"` (or `<br>` elements) inside `#stage`; all visible text within `1920×1080`; visible `<img>` loaded. |

## CLI Tooling

Resolve `<skill-dir>` (the folder containing this `SKILL.md`), ensure `<skill-dir>/node_modules/` is installed (Node >= 20, Playwright bundled Chromium; `ffmpeg` required for MP4 unless `--frames-only`), and invoke from the user's workspace with explicit `--out` paths:

| Deliverable | Command |
| :--- | :--- |
| Layout, line-wrap & contract check | `node <skill-dir>/scripts/lint.mjs <deck.html>` |
| Timestamped speaker script (`講稿`) | `node <skill-dir>/scripts/script-export.mjs <deck.html> [--out script.md] [--rate 3.6]` |
| Full-bleed slides or storyboard PDF | `node <skill-dir>/scripts/pdf-export.mjs <deck.html> [--mode slides\|storyboard] [--out deck.pdf] [--cols 2]` |
| Offline single-file share HTML | `node <skill-dir>/scripts/bundle-share.mjs <deck.html> [--out deck-share.html]` |
| Deterministic 60fps H.264 MP4 | `node <skill-dir>/scripts/record-video.mjs <deck.html> [--out deck.mp4] [--plan plan.json] [--fps 60] [--slow 3] [--audio track.wav] [--frames-only]` |

## References & Examples

- [references/craft-and-direction.md](references/craft-and-direction.md) — Direction proposals, card-free composition archetypes, hero asset craft pass, motion tiers, storytelling & review gate.
- [references/stage-contract.md](references/stage-contract.md) — Exact `window.__beatdeck` v1.0 specification, URL query modes, `at()` timer pattern, controls, and linting hooks.
- [references/export-and-recording.md](references/export-and-recording.md) — Detailed CLI usage for [scripts/lint.mjs](scripts/lint.mjs), [scripts/script-export.mjs](scripts/script-export.mjs), [scripts/pdf-export.mjs](scripts/pdf-export.mjs), [scripts/bundle-share.mjs](scripts/bundle-share.mjs), and [scripts/record-video.mjs](scripts/record-video.mjs).
- [examples/beatdeck-intro/deck.html](examples/beatdeck-intro/deck.html) — Working 12-beat showcase implementing the full contract and intra-beat choreography.
