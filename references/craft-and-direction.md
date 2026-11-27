# Craft and Direction

Beatdeck treats a presentation as a short directed film on a fixed `1920x1080` canvas rather than a stack of formatted text boxes. Design decisions flow from the subject and the speaker's story—never from a reusable slide shell or theme.

---

## 1. Visual Direction Proposals & Alignment

Never jump straight into writing `BEATS` or CSS with a single default aesthetic. Before crafting assets or scripting beats, synthesize the user's subject, audience, and tone, then propose **2–3 genuinely distinct visual world directions** plus a recommended **Motion Intensity Tier**.

### How to Craft Non-Generic Proposals
Each proposal must inhabit a different physical or conceptual world—never three color swaps of the same boxed layout. Specify these concrete elements for every option:
1. **Spatial Metaphor**: What physical or mental space does the `1920x1080` stage represent? (e.g., an editorial light-table, a dispatch console, a folded architectural blueprint, an archival streetscape elevation, a sunlit studio wall, a broadcast control deck).
2. **Surface & Palette**: Exact paper/ground tone, primary ink contrast, and 1–2 purposeful accents derived from the topic's real artifacts.
3. **Typography Voice**: Display/serif/sans/mono pairing tuned to the subject (with realistic CJK/Latin system fallbacks for offline headless rendering).
4. **Visual Signature**: One recurring structural motif or camera move that belongs uniquely to this topic (e.g., a vertical day/night split line, a continuous ledger spine, a zooming microscope reticle).
5. **Primary Card-Free Archetype**: Which structural composition archetype(s) from Section 3 anchor the deck without falling back on boxed cards.
6. **Motion Personality**: How this world moves (see §2): its material, the 2–3 beat changes it uses, its entrance and emphasis verbs, its easing signature, and its one signature move.
7. **Copy Voice**: Who is speaking, in what register (plain-spoken engineer, editorial narrator, founder pitching), and a short list of words this speaker would never say. Draw the banned list from [ai-tells.md](ai-tells.md) plus anything the user's industry overuses.

### Alignment Protocol
- Present the 2–3 directions side by side, highlight which one you recommend (and which Motion Intensity Tier fits best), and ask the user **once** to pick, combine, or tweak before you start crafting hero assets.
- Skip asking only if the user explicitly tells you to decide for them or when running in a non-interactive headless pipeline—in that case, state the chosen direction, archetype, and tier upfront in your plan/summary before writing HTML.

---

## 2. Motion: Personality, Tier, Transitions, Rhythm

Motion is where decks most often look machine-made. Left alone, every element fades in and drifts up 20px on the same curve, every beat cross-fades into the next, and the audience learns the pattern by the third slide. Decide motion the same way you decide palette: from the subject's material, once, before writing choreography.

### 2.1 Motion personality (character)

A **tier** says how much moves; a **personality** says *how* it moves. Every direction proposal names one. Derive it from what the world is made of:

| World material | Beat changes | Entrance verbs | Emphasis / signature | Easing & tempo |
| :--- | :--- | :--- | :--- | :--- |
| **Paper / dossier / print** | `cut`, `wipe-*` | `wipe` a line at a time, slide in from the margin | `stamp` with `shake`, `strike` | short, firm `out`; no overshoot; holds between actions |
| **Machine / instrument / dashboard** | `push-*`, `cut` | `spring` with high stiffness, snap into detents | needle swing, `countUp` with a detent spring | fast in, crisp settle; small overshoot |
| **Film / documentary / editorial** | `blur` (rack focus), `camera`, `cut` | `splitText` by word, `iris` | `zoom` through a detail, `match` cut | slow `inOut`, long holds, one fast cut for the turn |
| **Map / journey / process** | `iris`, `camera` with `data-depth` | `draw` the route | `followPath` marker, `match` it into the next beat | eased travel, stops land with a soft spring |
| **Software / product** | `match` between states, `cover-*` | panels `cover` in, `wipe` new rows | `cursor` with clicks that change the UI | quick (200–400 ms), linear-feeling, no bounce |
| **Play / consumer / game** | `zoom`, `push-up` | `stagger` with `from: "random"` and a loose `spring` | squash on impact, `ambient` idle loop | loose springs (damping 6–12), lively tempo |
| **Data / research** | `fade`, `match` | `draw` axes then data | `morph` one chart state into the next | measured `inOut`; motion only where the data changes |

Write the result into the deck's `MOTION` block (default transition, named easings, default spring) and keep it there. One deck uses **2–3 beat-change types** and **one signature move** that belongs to this subject alone (the stamp, the route marker, the rack focus). Everything else stays quiet so the signature lands.

### 2.2 Motion tier (density)

| Tier | Motion Grammar | Best Suited For |
| :--- | :--- | :--- |
| **`Measured`** | One action per beat, long holds, slow camera glides, hard cuts at turns. Few or zero loops. | Luxury editorial talks, archival dossiers, minimalist essays, board briefings. |
| **`Choreographed`** | 2–3 sequenced actions per beat via `at(ms, fn)`, drawn paths, roll-ups, persistent protagonists carried across beats with `match`. | Product demos, conference keynotes, research findings, technical walkthroughs. |
| **`Kinetic`** | Dense beat timelines, cursor interactions, stamps and impacts, random staggers, split type, `liveOnly` ambient motion. | Game showcases, consumer launches, interactive trailers, high-energy pitch reels. |

### 2.3 Beat changes (`MOTION.transition`, `beat.transition`)

Every beat change is a story decision. Pick it from what the story does at that boundary, not from the default:

| The story here… | Use | Notes |
| :--- | :--- | :--- |
| turns, delivers a verdict, contradicts | `cut` | The strongest change is often none. Let the new beat's first action carry the energy. |
| continues with the same subject | `match` (shared `data-match` elements fly to their new place) or `camera` (pan the `#world`) | Keeps the audience's eye on one protagonist. |
| goes deeper into a detail | `iris` (with `origin: "#selector"`) or `zoom` (with `origin`) | The origin should be the thing you zoom into. |
| moves forward in time or sequence | `push-left` / `push-up` | Going back automatically plays it in reverse. |
| lays something new over the last thing | `cover-*` / `reveal-*` | Panels, documents, layers. |
| replaces a statement | `wipe-*` | Hard-edged; pairs well with `strike`. |
| shifts focus or mood | `blur` | A rack focus; use sparingly. |
| needs nothing special | `fade` | Fine as a default, never on every beat (lint: `transition-monotony`). |

### 2.4 Rhythm

- **Vary tempo.** Alternate a busy beat with a still one. A beat with one slow action after a dense beat reads as emphasis.
- **Vary direction and origin.** Staggers can run `from: "center"`, `"end"`, `"edges"`, `"random"` or an index, not only left to right.
- **Exits matter.** The leaving beat keeps its final frame during the change; choose a change that moves it with intent (push it away, wipe over it, zoom through it).
- **Count the gestures.** No two consecutive beats should use the same entrance gesture with the same easing (lint: `motion-repeat`). If 3 of 4 beats only fade and slide, the deck has no motion design yet (lint: `motion-flat`).
- **Watch it, don't imagine it.** `snapshot.mjs` only sees the final frame. Run `filmstrip.mjs` and read each row left to right: is the first frame of a beat already interesting, does something different happen in each beat, does the signature move land?

---

## 3. Card-Free Stage Architecture & Anti-Patterns

- **Use a `#world` camera inside `#stage`**:
  - Keep `#stage` at `1920x1080` as the viewport frame, and optionally translate/scale an inner `#world` canvas across beats so the camera glides from wide context to fine detail and pulls back out for synthesis.
  - When `?still` is active, disable transitions so the camera snaps directly to each beat's settled transform for crisp screenshots and PDFs.
- **Pick palette and typography with intent**:
  - Choose one dominant ground (warm paper, slate, deep charcoal, linen, newsprint), one crisp ink with high contrast, and at most one or two purposeful accents.
  - Pair a display or editorial serif/sans for headlines with a clean body sans and monospace only where technical tokens genuinely belong.
  - Include system font fallbacks (`'Noto Serif TC'`, `'Noto Sans TC'`, `system-ui`, `sans-serif`, `serif`) so offline or sandboxed renders retain balanced proportions.

### Ban the Default AI Slide-Card Shell
Even with distinct color palettes, writing a deck in one pass tends to collapse into the exact same **default AI slide-card shell**:
> **Forbidden Default Shell**: `top dot-kicker bar + full-width horizontal header rule + 4 corner crop marks + bordered card boxes arranged in grids or 2-column splits`.

Reject this shell outright. Let content breathe directly on the canvas and vary structural skeletons across beats using the **5 Card-Free Composition Archetypes**:

1. **Clean Canvas + Single Character/Hero**
   - Open, uncluttered ground with oversized display typography on one side and a single layered character, mascot, or focal physical artifact on the other—zero enclosing borders, zero header chrome, zero corner brackets.
2. **Full-Bleed Scene / Architectural Cross-Section**
   - Edge-to-edge cutaway, streetscape, or environmental panorama occupying `65–85%` of `#stage` (or panning across `#world`), anchored by one minimal headline or marginal callout.
3. **Real Product Window + Hairline Callouts**
   - An actual high-res application, website, or game frame occupying most of the stage, annotated directly via thin SVG hairline leader lines (`stroke-dashoffset`) pointing to exact UI details.
4. **Raw Physical Artifact / Print Spread**
   - A tactile broadsheet newspaper spread, 35mm film contact sheet, archival dossier page, or printed ledger rendered with real print rules and paper grain—never web-app rounded-corner cards with drop shadows.
5. **Asymmetric Typographic Stage**
   - Oversized kinetic numbers, bold editorial statements, or typographic redactions set directly onto open canvas space with zero enclosing boxes.

### Visual Anti-Patterns to Reject

- Recycling the `dot-kicker + header rule + corner marks + bordered cards` shell across topics.
- Replacing a real product, website, or game screen with crude CSS/SVG geometric wireframe boxes.
- Purple-blue "AI glow" gradients, neon glassmorphism, or dark SaaS boilerplate.
- Card-inside-card nesting (borders around blocks that already sit inside bordered panels).
- Three-column icon grids with generic bullet summaries.
- Emoji characters used as UI icons or badges—draw crisp inline SVGs or typographic markers instead.
- Repeating the same split layout on consecutive beats.
- Frosted-glass panels, gradient-filled headline text, "Agenda" and "Thank you / Q&A" slides, and text walls. The full visual and wording catalog, including Traditional Chinese 套話 and Taiwan localization, is in [ai-tells.md](ai-tells.md).

---

## 4. Mandatory Step 3: Hero Asset Craft & Fidelity Pass

Insert a dedicated **Hero Asset Craft & Fidelity Pass** *between* Visual Direction Alignment (Step 2) and Full Deck Assembly (Step 4). **Never** draw hero visuals hastily inline while writing 2,500 lines of deck code—otherwise focal illustrations degrade into 10-line rectangles and circles.

### Choose Your Asset Route

#### Route A — Real Product, Game, or Physical Assets
*(Use for software products, websites, games, developer tools, or hardware.)*
- Gather or capture genuine high-resolution screenshots, renders, or photographs **before** writing HTML/CSS.
- Stage real captures large (`65–85%` of `#stage`) with crisp framing and hairline SVG callouts pointing to concrete UI or hardware details.
- Crop to the part of the screen the beat is about. A full-window capture shrunk to a corner shows "a screenshot" but nothing the audience can read; UI text should land at ≥ 18px on stage (lint: `small-capture`).
- **Never** substitute a crude CSS/SVG wireframe mockup when a real product screen or photograph can be captured or provided.

#### Route B — Zero-Screenshot Proposals, Coursework & Concept Talks
*(Use when no finished product exists yet, e.g., concept pitches, cultural proposals, coursework, or systems essays.)*
Pick one of **4 zero-screenshot high-craft visual routes**:
1. **Architectural / Physical Cross-Section Illustration**: Rich multi-bay cutaway or elevation built with reusable SVG `<pattern>` halftone dots or diagonal section hatching, layered architectural depths, and contextual micro-props.
2. **Expressive Multi-Gradient Animated Character / Mascot**: A custom layered SVG figure or emblem with multi-stop gradients, subtle expressive posing or secondary motion, staged on a pure uncluttered canvas.
3. **Tactile Conceptual Artifact**: A realistic printed dossier, ledger, boarding ticket, broadsheet, or physical instrument featuring paper grain, hairline print rules, stamps, and crisp micro-typography.
4. **Editorial Full-Stage Data Visualization**: Bespoke charts, timelines, or spatial maps that drive the entire `1920x1080` stage directly—never shrunk or trapped inside dashboard cards.

### The 3-Layer Fidelity Bar
Every bespoke SVG or crafted visual asset must satisfy **all three layers** before full deck assembly:
1. **Accurate Silhouette & Structure**: Domain-authentic proportions and recognizable contours (e.g., curved arcade arches, roof-tile profiles, realistic window mullions, anatomical or mechanical joints—never generic rectangles + circles).
2. **Materiality & Shading Layer**: Depth and tactile surface via reusable SVG `<pattern>` halftone dots or hatching, multi-stop linear/radial gradients, fine paper grain, warm atmospheric glow, or cast shadows.
3. **Secondary Micro-Details**: Environmental context props, architectural dimension ticks, scale markers, rivets/annotations, browser favicons/tabs, or foreground/background depth cues.

### Standalone Visual Gate
Render and visually inspect the hero asset(s) on a `1920x1080` canvas **before** scripting `BEATS` and writing deck choreography:

1. Put the asset alone in a scratch page (e.g. `hero.html`, `<body style="margin:0">` plus the SVG at `1920x1080`).
2. Run `node <skill-dir>/scripts/snapshot.mjs hero.html --raw --out <dir>` and **open the PNG**.
3. Check it against the 3-layer bar: does the silhouette read as the real thing at a glance, is there material/shading depth, are there secondary micro-details? Is there open breathing room for type?

Iterate on the asset alone until it passes. Only then assemble the full deck around it.

---

## 5. Intra-Beat Choreographic Vocabulary & Rules

Instead of treating a beat as one instantaneous state swap, direct what happens **inside** the beat using a scheduled timeline (`at(ms, fn, { liveOnly })`) and persistent visual elements.

### Core Rules
1. **Always cancel pending timers on `goTo()`**: Stepping backward or clicking quickly must clear every scheduled `at()` timer from the previous beat before starting the new beat's timeline.
2. **Deterministic `?still` convergence**: When `?still` is active, every non-`liveOnly` `at()` callback must execute **synchronously** during `goTo()` (with final CSS values applied and transitions disabled), so `lint.mjs`, `pdf-export.mjs`, and `?still&p=N` snapshots capture the exact completed state of the beat.
3. **Never block `?still` with infinite loops**: Any continuous breathing, cursor blink, shimmer, or ambient loop **must** pass `{ liveOnly: true }` so `?still` skips it cleanly.
4. **Virtual-clock compatibility**: Use standard `setTimeout`, `requestAnimationFrame`, `performance.now()`, and CSS transitions/animations (never unscaled external wall clocks) so `scripts/record-video.mjs` (`--slow`) scales every choreographed beat accurately without dropped frames.
5. **Persistent protagonists across beats**: Whenever possible, carry a central artifact (a continuous streetscape, timeline spine, browser frame, map path, or focal figure) across adjacent beats and pan, zoom, or morph its state instead of fading out an entire layout and fading in a brand-new box.

### Motion Vocabulary

All helpers arrive in `CHOREO[id](scene, helpers)`. Every one is `?still`-safe (it lands on its final frame instantly), cancels cleanly when the presenter moves on, and runs under `record-video.mjs` slow motion. `ease` accepts a `MOTION.ease` name (`out`, `in`, `inOut`, `snap`, `linear`), any CSS easing, or a spring `{ stiffness, damping, mass }`.

| Helper | What it does | Good for |
| :--- | :--- | :--- |
| `at(ms, fn, { liveOnly })` | Schedule a step inside the beat. | Sequencing; `liveOnly` loops. |
| `tween(el, keyframes, { ms, delay, ease })` | Web Animations keyframes, held at both ends. One tween per property per element per beat; chain with keyframe offsets. | Any custom move. |
| `spring(el, keyframes, { stiffness, damping, mass, delay })` | Real damped-spring settle (overshoot included). | Physical arrivals, snaps, squash. |
| `stagger(els, (el, delay, i) => …, { each, from, delay, seed })` | Offsets a group; `from`: `start`, `end`, `center`, `edges`, `random` (seeded), or an index. | Crowds, grids, letters. |
| `splitText(el, { by: "char" \| "word" })` | Wraps text in inline-block spans (keeps `<br>`), returns them. Use `char` for CJK. | Kinetic type with `stagger`. |
| `wipe(el, { from })` / `iris(el, { x, y })` | Hard-edged clip reveal / circular aperture. | Replacing statements, revealing photos. |
| `stamp(el, { rotate, impact })` / `shake(el, { amp })` | Ink-stamp hit, optional jolt of another element. | Verdicts, approvals, impacts. |
| `strike(el, { color, thickness })` | Draws a rule through text. | Corrections, before/after. |
| `draw(path, ms, { delay, ease })` | Stroke drawing. | Routes, signatures, chart lines. |
| `followPath(svgEl, path, { rotate })` | Moves an SVG element along a path. | Journeys, flows, a marker riding a chart. |
| `morph(path, toD, { fromD })` | Interpolates two `d` strings with the same command structure. | Chart state changes, shapes that transform. |
| `cursor(pointer, steps)` | Moves a pointer through `[x, y]` / `{ x, y, click, onClick, hold }` steps and presses. | Product walkthroughs. |
| `countUp(el, to, ms, opts)` / `typewriter(el, text, ms)` | Number roll-up / typed text. Typewriter only for things that are actually typed. | Metrics, search boxes, commands. |
| `ambient(el, keyframes, { ms })` | Infinite idle loop, live only. | A blinking caret, a slow breathing glow. |
| `data-depth="0.4"` (markup) | Parallax: drifts at that fraction of a `cam` move. | Depth during `camera` changes. |
| `data-match="key"` (markup) | Pairs elements across beats for the `match` change. | Persistent protagonists. |

`examples/motion-gallery/deck.html` shows each beat change and helper once, with when to use it.

--- | :--- | :--- |
| **`at(ms, fn, { liveOnly })`** | Sequences beat actions at explicit millisecond offsets (e.g., `0ms` camera settle, `280ms` path draw, `620ms` stamp). | Non-`liveOnly` runs immediately in order; `liveOnly` skipped. |
| **Persistent protagonist** | Shared DOM/SVG element anchored in `#world` or `#stage` whose class/transform evolves across consecutive beats. | Snaps directly to target transform/state. |
| **`draw` (`stroke-dashoffset`)** | Animates SVG strokes from `offset = totalLength` to `0` to trace connectors, signatures, routes, or chart curves. | Sets `stroke-dashoffset: 0` immediately. |
| **`countUp`** | Rolls key numbers from `0` (or prior value) to the verified target figure using `requestAnimationFrame` easing. | Writes the final formatted target number immediately. |
| **`typewriter`** | Reveals command lines, queries, or dialogue character-by-character or token-by-token. | Renders full final string immediately. |
| **`cursor`** | Moves a crisp SVG pointer along waypoints and triggers hover/click ripples on UI targets before a state flip. | Lands at final target waypoint with clicked state applied. |
| **`stamp` / `strike` / `wipe`** | Tactile editorial gestures: ink-stamp impact (`scale(1.25)->1`), horizontal redaction/strikethrough rule, or `clip-path` mask reveal. | Applies settled `scale(1)`, full strike width, and open `clip-path`. |
| **`ambient` (`liveOnly: true`)** | Subtle idle pulse, film-grain drift, blinking caret, or floating telemetry once the beat has settled. | Omitted (`liveOnly: true`) so static exports stay razor-sharp. |

---

## 6. Beat-Driven Storytelling (`BEATS`)

A **beat** is the smallest atomic unit of meaning: **one idea and one visual change**.

- **Start with a human scene**: Open Beat 1 with a recognizable person, moment, friction, or physical stake before showing KPIs, benchmarks, or architecture diagrams.
- **One change per beat**: Do not introduce a new chart, a headline shift, and three callouts simultaneously. Let each beat advance either the argument or the camera focus cleanly.
- **Audience-first vocabulary**: Omit internal repository names, implementation scaffolding, or engineering jargon unless the audience actually cares about those internals.
- **Speakable `say` lines**: Write `say` as natural spoken prose—never copy-pasted slide bullets. Aim for ~15–30 English words or ~30–60 CJK characters per beat so narration paces smoothly.
- **Use `pdfSkip: true` thoughtfully**: If two rapid beats exist purely for live-talk pacing or progressive reveal (e.g., step 1 highlight -> step 2 highlight on the same diagram), mark the intermediate state `pdfSkip: true` so static slide and storyboard PDFs stay uncluttered.

---

## 7. Single Source of Truth

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

## 8. Multi-Mode Delivery Design

Design the stage once so all five delivery modes work without forks:

- **Live Presentation**: Keyboard (`ArrowRight`/`Space`, `ArrowLeft`), click zones (left 25% / right 75%), `F` fullscreen, and `N` speaker-notes drawer.
- **Presenter PiP Recording (`C` Safe Zone)**: Pressing `C` displays a `400x300` safe-zone frame in the bottom-right corner of `#stage` (`x: 1520..1920, y: 780..1080` minus padding). If the talk will be recorded with a webcam overlay, keep essential headlines, labels, and focal graphics outside that corner.
- **Static Slides & Storyboard PDF**: `?still` disables all animations/transitions, settles non-`liveOnly` `at()` choreography, and hides interactive chrome; `?still&bare` also hides `#subtitle` for clean storyboard thumbnails.
- **Self-Contained Share HTML**: `scripts/bundle-share.mjs` inlines local stylesheets, scripts, fonts, and images into one portable HTML file.
- **Deterministic 60fps MP4**: `?video` hides interactive chrome while preserving `#stage` and optional `#subtitle`, allowing virtual-clock screencast capture at slow playback rate for zero dropped frames.

---

## 9. Typography Discipline & CJK / Latin Line Locking

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

## 10. Three-Lens Verification Gate Before Delivery

Before marking a deck finished:

1. **Automated Chromium Lint**: Run `node scripts/lint.mjs <deck.html> --strict`. Confirm zero runtime errors, zero broken `<img>` tags, zero text overflowing `1920x1080`, zero unexpected line wraps, and zero craft warnings (card shell, nested cards, emoji icons, text collisions, repeated layouts, leftover skeleton scenes) across every beat. Intentional exceptions get `data-lint-allow="<type>"` on the smallest enclosing element, never on `#stage`.
2. **Audience Lens**: Run `node scripts/snapshot.mjs <deck.html>` and open `contact-sheet.png` first (archetype variety, rhythm, monotony at a glance), then any `beat-NN.png` that looks doubtful at full size, without reading speaker notes. Verify each visual change clearly communicates its beat, hero visuals satisfy the 3-layer craft bar, beats avoid repetitive bordered-card shells, and no jargon leaks onto the canvas.
3. **Speaker & Fact Lens**: Read `script-export.mjs` output aloud at natural pace (`~3.6` CJK chars/s or `~2.5` Latin words/s), verify every claim and number against source material, and toggle `C` if the deck will be recorded with presenter PiP.
