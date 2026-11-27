# Craft and Direction

Beatdeck treats a presentation as a short directed film on a fixed `1920x1080` canvas rather than a stack of formatted text boxes. Design decisions flow from the subject and the speaker's story—never from a reusable slide shell or theme.

---

## 1. Visual Direction Proposals & Alignment

Never jump straight into writing `BEATS` or CSS with a single default aesthetic. Before crafting assets or scripting beats, synthesize the user's subject, audience, and tone, then propose **2–3 genuinely distinct visual world directions**, each with its motion register (§2).

### How to Craft Non-Generic Proposals
Each proposal must inhabit a different physical or conceptual world—never three color swaps of the same boxed layout. Specify these concrete elements for every option:
1. **Spatial Metaphor**: What physical or mental space does the `1920x1080` stage represent? (e.g., an editorial light-table, a dispatch console, a folded architectural blueprint, an archival streetscape elevation, a sunlit studio wall, a broadcast control deck).
2. **Surface & Palette**: Exact paper/ground tone, primary ink contrast, and 1–2 purposeful accents derived from the topic's real artifacts.
3. **Typography Voice**: Display/serif/sans/mono pairing tuned to the subject (with realistic CJK/Latin system fallbacks for offline headless rendering).
4. **Visual Signature**: One recurring structural motif or camera move that belongs uniquely to this topic (e.g., a vertical day/night split line, a continuous ledger spine, a zooming microscope reticle).
5. **Primary Card-Free Archetype**: Which structural composition archetype(s) from Section 3 anchor the deck without falling back on boxed cards.
6. **Motion Register**: How this deck moves (see §2): the register for this kind of presentation, the default entrance and beat change, and the two or three signature moments (which beats, which gesture, why there; §2.5).
7. **Copy Voice**: Who is speaking, in what register (plain-spoken engineer, editorial narrator, founder pitching), and a short list of words this speaker would never say. Draw the banned list from [ai-tells.md](ai-tells.md) plus anything the user's industry overuses.

### Alignment Protocol
- Present the 2–3 directions side by side, highlight which one you recommend, and ask the user **once** to pick, combine, or tweak before you start crafting hero assets.
- Skip asking only if the user explicitly tells you to decide for them or when running in a non-interactive headless pipeline—in that case, state the chosen direction, archetype, and register upfront in your plan/summary before writing HTML.
- If the user may be away for hours (an async project thread, a queued task), ask once and keep working on the direction you recommend while you wait; switch if their answer differs. A stalled thread costs more than a redone hero asset.

---

## 2. Motion: Fit First, Restraint Always

Motion is where decks most often look cheap. The cause is almost never too little motion; it is effects used as decoration: a stamp on every claim, letters bouncing in, a different flashy transition at every click, things flying across the stage. Audiences read that as a template showing off, and it pulls their eyes away from the speaker. Premium motion is mostly invisible: soft, consistent, precisely timed, and it spends its one loud gesture on the moment the story turns.

Decide motion in three steps, in this order: **register** (from what the talk is for), **beat intent** (from what each beat does), **signature** (two or three moments where the content itself moves, §2.5). Then apply the craft defaults in §2.4.

### 2.1 Register: what is this presentation for?

The register sets the deck's whole motion budget. Name it in the direction proposal and in the `MOTION` comment.

| Presentation | Register | Default beat change | Default entrance | Signature moments (§2.5) | Avoid |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Investor / business pitch** | Confident, calm | `dip`, `cut` at the turn | `rise`, `unveil` on the headline | 2: the problem landing, the key number | stamps, shakes, typed text, bounce |
| **Research / thesis / academic** | Precise, explanatory | `dip`, `match` between chart states | `rise`; data `draw`n in order | 2: the method at work, the finding (a `morph` or `draw`) | anything that moves without meaning |
| **Product / software demo** | Clear, functional | `match` between UI states, `dip` | panels `rise`; real UI state changes | 2–3: each moment the product does the thing (`cursor` once) | fake typing everywhere, zooms |
| **Story / documentary / brand** | Cinematic, paced | `dip` (fade through black), `camera` pans, one hard `cut` | `unveil`, slow `rise` with long holds | 2–3: the reveal, the turn | fast tempo, bounce |
| **Teaching / class / training** | Patient, stepwise | `dip`, `camera` along one diagram | `rise` one point at a time; `focus` the current step | 2: the setup, the "aha" step | anything fast or decorative |
| **Game / consumer launch / event** | Lively, playful | `push-*`, `zoom`, `cut` | springs with a little overshoot allowed | 2–3 | still no effect on every beat |

If the deck's world has a material (a dossier, a map, a factory floor), let it flavour the *signature* only: a paper world may stamp once at the verdict, a map world draws its route, a machine world lets one gauge snap. The material never licenses an effect on every beat.

### 2.2 Beat intent: what does this beat do?

Choose each beat's motion from its job, not from the helper list. The quiet column is the default; the accent column is only for a beat you have chosen as a signature moment.

| The beat… | Quiet (default) | Accent (signature beats only) |
| :--- | :--- | :--- |
| states a headline or thesis | `unveil` the headline, `rise` the support | `splitText` by word with a slow, even stagger |
| lists points or options | `rise` with `each: 80–120`, one at a time | none; build it across beats instead |
| compares before / after, A vs B | `match` the shared element; `focus` the winner | `wipe` the old state away, `strike` the replaced claim |
| lands a key number | `countUp` (1.2–1.8 s, `ease: "out"`), then hold | a single `draw` underline or ring |
| shows change over time / data | `draw` axes then series; `morph` between states | `followPath` a marker along the trend |
| goes deeper into a detail | `camera` move into it, or `zoom` with `origin` | `iris` from the detail |
| turns the story, delivers a verdict | a hard `cut`, then stillness | `stamp` (only if something is literally approved or stamped) |
| demonstrates a product | real state change with `match` | `cursor` with one meaningful click |
| breathes, recaps, closes | `dip`, long hold, almost nothing moves | none |

### 2.3 Budget and rhythm

- **Most beats are quiet.** About three quarters of the beats use only `rise`, `unveil`, `focus`, `draw`, `countUp` or `morph`, and change with `fade`, `dip`, `cut`, `match` or `camera`.
- **Accents are rare** (about one beat in six): stamp, shake, iris, cursor, typewriter, split type. Lint: `motion-accent-overuse`. This is a different thing from the two or three signature moments in §2.5, which make the content itself move.
- **One gesture per beat.** If a beat needs three effects to be interesting, the composition is the problem. Lint: `motion-busy`.
- **At most two showy beat-change types per deck**, each tied to a story turn. Lint: `transition-variety`.
- **Bounce is a register choice, not a default.** The default spring is critically damped and `ease.out` does not overshoot. Lint: `motion-bounce`.
- **Small travel.** Entrances move 8–40 px; large travel belongs to the camera. Lint: `motion-travel`.
- **Still is a move.** After the signature moment, hold. A beat where nothing moves for two seconds after one reveal reads as confidence.
- **Not nothing at all.** Quiet is the baseline, not the goal. A deck with no signature moment looks like a slide tool made it (§2.5). Lint: `motion-no-signature`.

### 2.4 Craft defaults (what "premium" means in numbers)

| Property | Premium range | Cheap tell |
| :--- | :--- | :--- |
| Entrance duration | 700–1100 ms | 200–400 ms pops |
| Beat change | 640–900 ms `dip` (out, then in, through the background; the default); `fade` only when the two layouts share most of their content; or a true `cut` | 300 ms slides on every click |
| Easing | `MOTION.ease.out` = `cubic-bezier(0.16, 1, 0.3, 1)`; `inOut` for camera | overshoot (`snap`, loose springs) everywhere |
| Distance | 8–40 px lift; masks instead of travel | elements flying in from off-stage |
| Stagger | 70–120 ms, from the reading start, ≤ 6 items | 30 ms machine-gun letters, random order |
| Blur | ≤ 6 px, on entrances only | blur used as a transition style |
| Scale | 0.98–1.02 on entrance | zoom pops, scale 1.5 → 1 |
| Rotation | none (a stamp may tilt 2–3°) | spinning anything |
| Simultaneity | one thing moves at a time, the rest is still | everything animates at once |

Write the chosen register, transition and easings into the deck's `MOTION` block. The skeleton's defaults already follow this table.

### 2.5 Signature moments: make the content move

Restraint keeps a deck from looking cheap; it does not make it memorable. A deck where every beat only fades and rises looks like any slide tool made it. The signature moments are where the deck earns its place, and the test is strict: **if a slide tool's animation pane could produce it, it is not a signature.** A signature moment makes the subject itself move, the way only code can, so the motion *is* the explanation.

Patterns that pass the test:

| Pattern | What moves | Example |
| :--- | :--- | :--- |
| **Living object** | One object (a schedule, a table, a map, a UI) persists across several beats; the beat change is an invisible `cut` and only what the story changes moves, with `carry()`. | A production board re-plans itself: the stopped job slides to another machine, the rush order drops in and pushes the next job later. |
| **The rule, performed** | A decision procedure runs on screen: rows re-sort as each criterion applies, an option is struck out and sinks to an "excluded" tray, a tie is bracketed, a threshold rolls and the order changes. | A policy table that picks P-C, then re-picks P-B when the threshold rolls from 5 to 0. |
| **Time as a driver** | A clock, a now-line, a countdown, a calendar runs, and the scene changes because time passed. | The clock runs to 10:08 and from that line on, the machine is hatched out. |
| **The subject's own physics** | The material of the topic sets the verb: a flashlight searches the dark, sound ripples before sight, an almanac tears off its pages, ink bleeds into a new verdict. | A horror game deck where every reveal is found by a torch, as in the game. |
| **History collapses into a summary** | Elements from earlier beats fly back from where they appeared and shrink into a recap, record or timeline (`carry(beatId, { scale: true })`). | A decision log whose nodes are the stop mark, the 40 minutes and the pick, flown in from their beats. |
| **State change in place** | Two states of the same image or diagram; only the difference transforms (a masked ghost of the old state dissolves, a path `morph`s, a number rolls). | Night 2 starts as an exact copy of night 1, then only the almanac card changes. |

Rules for them: give each deck **two or three** such moments, each tied to the beat where the idea lives; build them from the deck's own objects, never from stock effects; keep their craft premium (soft curves, real timing, one thing moving at a time); and make sure `?still` lands on the explained end state.

### 2.6 Watch it, don't imagine it

`snapshot.mjs` only sees the final frame. Run `filmstrip.mjs` (add `--frames --times …` to save full-size PNGs of single moments) and read each row: does the motion help the audience read the beat in the right order? Would the beat be worse with no motion at all? If not, remove it. Does the signature moment land, and is it the only one that shouts?

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
- **Exception for signature moments:** when the idea is the product's own UI changing (a timetable re-planning, rows re-sorting, a rule firing), a still capture cannot move. Rebuild that one component in the DOM from the product's real data, colours and type, and keep a real capture of the same state on the same or the next beat as proof. Mark 2x captures with `data-capture-dpr="2"` so the `small-capture` check measures their UI text exactly.

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
| `spring(el, keyframes, { stiffness, damping, mass, delay })` | Real damped-spring settle. The default is critically damped (no bounce); lower `damping` only in a play register. | Physical arrivals, snaps. |
| `rise(els, { y, ms, each, delay, blur })` | **Quiet default.** Short lift with a fade on a long deceleration, staggered. | Most content on most beats. |
| `unveil(el, { from, ms, delay })` | **Quiet.** Text rises out of its own baseline mask. | Headlines, key statements (one per beat). |
| `focus(keep, { dim, within })` | **Quiet emphasis.** Everything marked `data-focus` (or `within`) recedes except `keep`. | Pointing at one item without effects. |
| `carry(fromBeat, { select, ms, delay, each, size, scale })` | **Living objects.** Elements sharing `data-match` with another beat (default: the previous one) start where they were there and travel here. Pair with `transition: "cut"`. `size: true` also eases width and height, so text reflows (a block that halves to make room); `scale: true` eases a transform scale, so text scales with it (shrinking into a summary). Never use `scale` when only one side changes: the text stretches. | Schedules re-planning, rows re-sorting, earlier details flying into a summary (§2.5). |
| `stagger(els, (el, delay, i) => …, { each, from, delay, seed })` | Offsets a group; `from`: `start`, `end`, `center`, `edges`, `random` (seeded), or an index. | Crowds, grids, letters. |
| `splitText(el, { by: "char" \| "word" })` | **Accent.** Wraps text in inline-block spans (keeps `<br>`), returns them. Use `char` for CJK. | Kinetic type with `stagger`. |
| `wipe(el, { from })` / `iris(el, { x, y })` | Hard-edged clip reveal / circular aperture (**accent**). | Replacing statements, revealing photos. |
| `stamp(el, { rotate, impact })` / `shake(el, { amp })` | **Accent.** Ink-stamp hit, optional jolt of another element. | Something literally stamped or approved, once per deck. |
| `strike(el, { color, thickness })` | Draws a rule through text. | Corrections, before/after. |
| `draw(path, ms, { delay, ease })` | Stroke drawing. | Routes, signatures, chart lines. |
| `followPath(svgEl, path, { rotate })` | Moves an SVG element along a path. | Journeys, flows, a marker riding a chart. |
| `morph(path, toD, { fromD })` | Interpolates two `d` strings with the same command structure. | Chart state changes, shapes that transform. |
| `cursor(pointer, steps)` | **Accent.** Moves a pointer through `[x, y]` / `{ x, y, click, onClick, hold }` steps and presses. | Product walkthroughs. |
| `countUp(el, to, ms, opts)` / `typewriter(el, text, ms)` | Number roll-up / typed text. Typewriter only for things that are actually typed. | Metrics, search boxes, commands. |
| `ambient(el, keyframes, { ms })` | Infinite idle loop, live only. | A blinking caret, a slow breathing glow. |
| `data-depth="0.4"` (markup) | Parallax: drifts at that fraction of a `cam` move. | Depth during `camera` changes. |
| `data-match="key"` (markup) | Pairs elements across beats for the `match` change. | Persistent protagonists. |

`examples/motion-gallery/deck.html` shows each beat change and helper once, with when to use it. It is a catalogue, deliberately denser than any real deck should be; size a real deck's motion with §2.

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
