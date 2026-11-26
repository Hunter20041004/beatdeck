# Craft and Direction

Beatdeck treats a presentation as a short directed film on a fixed `1920x1080` canvas rather than a stack of formatted text boxes. Design decisions flow from the subject and the speaker's story—never from a reusable visual theme.

---

## 1. Invent One Visual World Per Topic

Before writing CSS or scripting beats, establish the **single physical or conceptual world** the audience inhabits for the entire talk:

- **Derive the metaphor from the domain**:
  - Software architecture or system flow -> an architectural cross-section, blueprint table, or signal schematic.
  - Field research or civic infrastructure -> a topographic map, dispatch board, or field notebook.
  - Product craft or editorial workflow -> a director's light-table, specimen sheet, or workbench.
  - Historical or strategic narrative -> a continuous spatial timeline where earlier events stay anchored off-camera.
- **Use a `#world` camera inside `#stage`**:
  - Keep `#stage` at `1920x1080` as the viewport frame, and optionally translate/scale an inner `#world` canvas across beats so the camera glides from wide context to fine detail and pulls back out for synthesis.
  - When `?still` is active, disable transitions so the camera snaps directly to each beat's settled transform for crisp screenshots and PDFs.
- **Pick palette and typography with intent**:
  - Choose one dominant ground (warm paper, slate, deep charcoal, linen, newsprint), one crisp ink with high contrast, and at most one or two purposeful accents.
  - Pair a display or editorial serif/sans for headlines with a clean body sans and monospace only where technical tokens genuinely belong.
  - Include system font fallbacks (`'Noto Serif TC'`, `'Noto Sans TC'`, `system-ui`, `sans-serif`, `serif`) so offline or sandboxed renders retain balanced proportions.

### Visual Anti-Patterns to Reject

- Purple-blue "AI glow" gradients, neon glassmorphism, or dark SaaS boilerplate.
- Card-inside-card nesting (borders around blocks that already sit inside bordered panels).
- Three-column icon grids with generic bullet summaries.
- Emoji characters used as UI icons or badges—draw crisp inline SVGs or typographic markers instead.
- Repeating the same split layout on consecutive beats.

---

## 2. Beat-Driven Storytelling (`BEATS`)

A **beat** is the smallest atomic unit of meaning: **one idea and one visual change**.

- **Start with a human scene**: Open Beat 1 with a recognizable person, moment, friction, or physical stake before showing KPIs, benchmarks, or architecture diagrams.
- **One change per beat**: Do not introduce a new chart, a headline shift, and three callouts simultaneously. Let each beat advance either the argument or the camera focus cleanly.
- **Audience-first vocabulary**: Omit internal repository names, implementation scaffolding, or engineering jargon unless the audience actually cares about those internals.
- **Speakable `say` lines**: Write `say` as natural spoken prose—never copy-pasted slide bullets. Aim for ~15–30 English words or ~30–60 CJK characters per beat so narration paces smoothly.
- **Use `pdfSkip: true` thoughtfully**: If two rapid beats exist purely for live-talk pacing or progressive reveal (e.g., step 1 highlight -> step 2 highlight on the same diagram), mark the intermediate state `pdfSkip: true` so static slide and storyboard PDFs stay uncluttered.

---

## 3. Single Source of Truth

Keep narrative, timing, and metadata in a single `BEATS` array inside the deck:

```js
const BEATS = [
  {
    id: "opening",
    chapter: "01 · Friction",
    speaker: "Host",
    say: "At 11:40 PM, nobody needs forty more bullet slides—they need to see why the system broke.",
    note: "Pause 1s after the clock visual settles.",
    duration: 5.5,
    pdfSkip: false,
    // Deck-specific visual cues: camera coordinates, active layer, highlighted node, etc.
  }
];
```

One `BEATS` array automatically powers:
1. **Live Talk**: Current chapter HUD and `N` speaker-notes drawer.
2. **Speaker Script (`講稿` / `script.md`)**: Timestamped Markdown table with per-speaker totals via `scripts/script-export.mjs`.
3. **PDF Handouts**: Clean `1920x1080` slides or `2`/`3`-column storyboard sheets with captions via `scripts/pdf-export.mjs`.
4. **Timed Video**: Auto-computed beat transitions and `#subtitle` updates via `scripts/record-video.mjs`.

Never maintain a separate script document that can drift from the deck. Edit `BEATS` and re-export.

---

## 4. Multi-Mode Delivery Design

Design the stage once so all five delivery modes work without forks:

- **Live Presentation**: Keyboard (`ArrowRight`/`Space`, `ArrowLeft`), click zones (left 25% / right 75%), `F` fullscreen, and `N` speaker-notes drawer.
- **Presenter PiP Recording (`C` Safe Zone)**: Pressing `C` displays a `400x300` safe-zone frame in the bottom-right corner of `#stage` (`x: 1520..1920, y: 780..1080` minus padding). If the talk will be recorded with a webcam overlay, keep essential headlines, labels, and focal graphics outside that corner.
- **Static Slides & Storyboard PDF**: `?still` disables all animations/transitions and hides interactive chrome; `?still&bare` also hides `#subtitle` for clean storyboard thumbnails.
- **Self-Contained Share HTML**: `scripts/bundle-share.mjs` inlines local stylesheets, scripts, fonts, and images into one portable HTML file.
- **Deterministic 60fps MP4**: `?video` hides interactive chrome while preserving `#stage` and optional `#subtitle`, allowing virtual-clock screencast capture at slow playback rate for zero dropped frames.

---

## 5. Typography Discipline & CJK / Latin Line Locking

Uncontrolled line wrapping destroys visual balance—especially when mixing CJK headlines with Latin words or large inline numbers, or when font metrics shift slightly across machines.

- **Lock intended line breaks explicitly**:
  - Put `<br>` where lines should break cleanly by meaning, not arbitrary box width.
  - Add `data-expected-lines="K"` on critical headlines, callouts, and subtitles so `scripts/lint.mjs` fails immediately if any text wraps onto `K + 1` lines.
  - Any element containing `<br>` inside `#stage` is also automatically checked by `lint.mjs` (defaulting expected visual lines to `brCount + 1` unless overridden by `data-expected-lines`).
- **Keep inactive beats truly hidden**:
  - Elements belonging to inactive beats must use `display: none`, `visibility: hidden`, or `opacity: 0` so the linter inspects only the active beat's visible geometry and text bounds.
- **Never block indefinitely on web fonts**:
  - Race `document.fonts.ready` against a short timeout (e.g., `1500ms`) before setting `document.body.dataset.ready = "1"`, and declare realistic system fallbacks so headless renders stay crisp even offline.

---

## 6. Three-Lens Verification Gate Before Delivery

Before marking a deck finished:

1. **Automated Chromium Lint**: Run `node scripts/lint.mjs <deck.html>`. Confirm zero runtime errors, zero broken `<img>` tags, zero text overflowing `1920x1080`, and zero unexpected line wraps across every beat.
2. **Audience Lens**: Step through `?still&p=1..N` (or export a storyboard PDF) without reading speaker notes. Verify each visual change clearly communicates its beat and no jargon leaks onto the canvas.
3. **Speaker & Fact Lens**: Read `script-export.mjs` output aloud at natural pace (`~3.6` CJK chars/s or `~2.5` Latin words/s), verify every claim and number against source material, and toggle `C` if the deck will be recorded with presenter PiP.
