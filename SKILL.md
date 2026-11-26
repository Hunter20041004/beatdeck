---
name: beatdeck
description: Methodology and headless Chromium CLI tooling for crafting film-like, beat-driven HTML presentations on a 1920x1080 stage with a single source of truth for live talks, speaker notes, script Markdown, storyboard PDFs, self-contained share bundles, and deterministic 60fps MP4 videos. Use when asked to create a presentation, pitch deck, talk, demo walkthrough, storyboard, or convert notes, code, or documents into a visual deck.
---

# Beatdeck

Beatdeck is a presentation craft methodology paired with a thin browser runtime contract (`window.__beatdeck` v1.0) and headless Chromium CLI tooling. Every presentation invents its own bespoke visual world, motion grammar, and narrative arc—never a recycled slide template, bullet-list box, or default color theme.

## Core Methodology

### 1. Single-World Stage
- Build one coherent visual metaphor on a `1920×1080` logical `#stage` (navigated via camera pan/zoom on an inner `#world` canvas or choreographed transitions) instead of disconnected slide rectangles.
- Derive palette, paper/ink contrast, typography pairing, and motion grammar from the subject itself.
- Reject generic dark SaaS neon, purple-blue AI gradients, card-inside-card boxes, 3-column icon grids, and emoji UI icons (draw crisp inline SVGs or typographic markers instead).

### 2. Beat-Driven Storytelling (`BEATS`)
- Deliver **one idea and one visual change per beat**. Never stack multiple unrelated reveals into a single beat.
- Open with a concrete human scene or lived friction before introducing metrics, benchmarks, or architecture diagrams.
- Write for the audience: omit internal repository names, file paths, and implementation jargon unless the audience specifically cares about them.

### 3. Film-Grade Intra-Beat Choreography
- Treat each beat as a directed micro-scene rather than a static fade-in: sequence multi-step actions with `at(ms, fn, { liveOnly })` inside `goTo()` (clearing all pending timers/rAFs on every beat transition).
- Reuse **persistent stage protagonists** (a recurring artifact, spine, browser frame, or map) that morph across adjacent beats instead of rebuilding disconnected layouts per beat.
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
- Always run [scripts/lint.mjs](scripts/lint.mjs) in headless Chromium before delivery to catch text overflowing `1920×1080`, unexpected line wraps, broken images, and console errors.

## Ordered Workflow

Follow this order where sequence affects correctness:

1. **Gather real material and target delivery modes first**
   - Confirm who the audience is and which outputs are needed (live talk, webcam PiP, offline HTML share, storyboard PDF, or MP4).
   - Pull real numbers, quotes, artifacts, and screenshots from user input or workspace files. Mark missing facts explicitly instead of inventing placeholder figures.
2. **Align visual direction & motion intensity before scripting (Mandatory)**
   - Before writing `BEATS` or CSS, synthesize the topic's subject matter, audience, and tone, then propose **2–3 genuinely distinct visual world directions** (never three color variations of the same layout).
   - For each direction, specify four concrete elements:
     - **Spatial metaphor**: What physical or conceptual world the `1920×1080` stage inhabits.
     - **Surface & palette**: Ground tone, ink contrast, and 1–2 purposeful accents derived from real artifacts.
     - **Typography voice**: Display/serif/sans/mono pairing with offline system fallbacks.
     - **Visual signature**: One recurring structural motif or camera grammar unique to the topic.
   - Recommend one of the **3 Motion Intensity Tiers** (`Measured`, `Choreographed`, or `Kinetic`) suited to the story and delivery mode.
   - Ask the user once to pick, combine, or adjust the visual direction and motion intensity before building. Skip this confirmation only if the user explicitly says "decide for me" (or equivalent) or in automated headless runs—in which case state your chosen visual direction and tier clearly before proceeding.
   - Read [references/craft-and-direction.md](references/craft-and-direction.md) for direction crafting, motion tiers, and the intra-beat choreography vocabulary.
3. **Author `BEATS`, choreograph timelines, and build the `1920×1080` stage**
   - Script `BEATS` with one idea and one visual transformation per beat, speakable `say` lines, and `pdfSkip: true` on intermediate micro-steps.
   - Implement `at(ms, fn, { liveOnly })` timelines for intra-beat choreography and keep inactive beat elements cleanly hidden (`display: none`, `visibility: hidden`, or `opacity: 0`) so automated layout checks inspect only active content.
4. **Wire the `window.__beatdeck` v1.0 contract**
   - Implement `#stage` aspect-fit scaling, query params (`?p=N`, `?still`, `?video`, `?bare`), `document.body.dataset.ready = "1"` after `document.fonts.ready` (with timeout fallback), `window.__beatdeck` (`version`, `meta`, `list()`, `current()`, `goTo(index)`, `setSubtitle(text)`), `at()` `?still` convergence, and live controls (`ArrowRight`/`Space`/`PageDown`/right-75% click, `ArrowLeft`/`PageUp`/`Backspace`/left-25% click, `Home`/`End`, `F`, `N`, `C`).
   - Read [references/stage-contract.md](references/stage-contract.md) for exact signatures and the reference skeleton including `at()`. Inspect [examples/beatdeck-intro/deck.html](examples/beatdeck-intro/deck.html) for a complete working showcase.
5. **Run headless lint and three-perspective review before shipping**
   - Resolve `<skill-dir>` (the directory containing this `SKILL.md`). If `<skill-dir>/node_modules/` is missing, run one-time setup: `cd <skill-dir> && npm install && npx playwright install chromium`.
   - From the user's workspace, run `node <skill-dir>/scripts/lint.mjs <path/to/deck.html>` and fix every failure until exit status is `0`.
   - Review sequentially from three angles:
     - **Audience**: Step through `?still&p=1..N` cold; confirm each visual change communicates clearly without presenter rescue.
     - **Speaker**: Read exported `say` lines aloud at natural cadence (`3.6` CJK chars/s or `2.5` Latin words/s); toggle `C` if recording PiP to verify the `400×300` bottom-right zone is clear.
     - **Fact & Layout Lint**: Confirm every claim matches verified sources and `lint.mjs` passes cleanly.
6. **Export deliverables**
   - Generate script Markdown, PDFs, offline share HTML, or 60fps MP4 from the user's workspace via `node <skill-dir>/scripts/<tool>.mjs <path/to/deck.html> --out <output-path>`. Read [references/export-and-recording.md](references/export-and-recording.md) for default output paths, CLI flags, and `--plan` timing schemas.

## Runtime Contract & Controls (`window.__beatdeck` v1.0)

Every deck implements a minimal shared interface so all tools work regardless of visual style:

| Surface | Requirement |
| :--- | :--- |
| `#stage` | `1920×1080` logical pixel container, centered and aspect-fit scaled into the viewport. |
| Ready signal | Wait for `document.fonts.ready` (with a bounded timeout fallback), render initial beat, then set `document.body.dataset.ready = "1"`. |
| `?p=N` | Jump to 1-based beat `N` (clamped `1..BEATS.length`). |
| `?still` | Add class `still` on `body`, disable all CSS transitions/animations, settle non-`liveOnly` `at()` steps synchronously, hide chrome/notes/camera/subtitles. |
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

- [references/craft-and-direction.md](references/craft-and-direction.md) — Visual direction proposals, motion intensity tiers, intra-beat choreography, storytelling, typography & review gate.
- [references/stage-contract.md](references/stage-contract.md) — Exact `window.__beatdeck` v1.0 specification, URL query modes, `at()` timer pattern, controls, and linting hooks.
- [references/export-and-recording.md](references/export-and-recording.md) — Detailed CLI usage for [scripts/lint.mjs](scripts/lint.mjs), [scripts/script-export.mjs](scripts/script-export.mjs), [scripts/pdf-export.mjs](scripts/pdf-export.mjs), [scripts/bundle-share.mjs](scripts/bundle-share.mjs), and [scripts/record-video.mjs](scripts/record-video.mjs).
- [examples/beatdeck-intro/deck.html](examples/beatdeck-intro/deck.html) — Working 12-beat showcase implementing the full contract and intra-beat choreography.
