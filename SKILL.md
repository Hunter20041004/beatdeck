---
name: beatdeck
description: Craft film-like, beat-driven HTML presentations on a 1920x1080 stage, with headless Chromium tooling that turns one deck file into a live talk with speaker notes, a timestamped script, slides/storyboard PDFs, an offline share HTML, and a deterministic 60fps MP4. Use whenever the user wants a presentation, slide deck, pitch deck, keynote, talk, lecture, demo walkthrough, storyboard, explainer/promo video built from slides, or asks to turn notes, docs, code, or data into a visual deck (also 簡報, 投影片, 提案簡報, 講稿), even if they never say "Beatdeck".
---

# Beatdeck

A deck is a short directed film on one `1920×1080` stage. Every deck invents its own visual world, hero visuals, and motion grammar from its subject. Never a recycled slide template, bordered-card shell, or default theme. One HTML file is the single source of truth for every output, held together by the `window.__beatdeck` v1.0 runtime contract.

`<skill-dir>` means the folder containing this file. Run tools from the user's workspace as `node <skill-dir>/scripts/<tool>.mjs …`. On first use, if `<skill-dir>/node_modules/` is missing, run `cd <skill-dir> && npm install && npx playwright install chromium`.

## Principles

1. **One world, card-free composition.** Build one coherent spatial metaphor (optionally a `#world` canvas the camera pans across) instead of disconnected slide boxes. Reject the default AI slide shell (dot-kicker + header rule + corner crop marks + bordered card grids), dark-SaaS neon, purple-blue AI gradients, card-inside-card, 3-column icon grids, and emoji used as icons. Rotate among the five card-free archetypes: *clean canvas + single hero*, *full-bleed scene / cross-section*, *real product window + hairline callouts*, *raw physical artifact / print spread*, *asymmetric typographic stage*.
2. **One idea, one visual change per beat.** Open on a concrete human scene or friction before metrics or architecture. Write for the audience, never for the makers.
   - Leave out internal process: revision or iteration counts (「調整了幾次」「第二版」), review rounds, which agents or tools built it, bug-fix tallies, resubmission notes (「補交」), commit hashes, file paths, ticket IDs, and internal jargon.
   - Show the result in the audience's terms. Facts only the speaker needs go in the beat's `note`.
3. **Direct inside the beat.** Sequence steps with `at(ms, fn, { liveOnly })`, carry persistent protagonists across beats, and pick one motion tier: `Measured`, `Choreographed`, or `Kinetic`. Every non-`liveOnly` step settles synchronously under `?still`, so snapshots, lint, and PDFs see the final frame.
4. **Real material, never invented facts.** Use real numbers, quotes, screenshots, and captures. Mark missing facts explicitly instead of inventing placeholders.
5. **No AI tells, visual or verbal.** AI-looking decks come from unexamined defaults:
   - **Visual:** purple-blue gradients, frosted glass, emoji icons, text walls, "Agenda" / "Thank you" slides.
   - **English copy:** stock phrases (*seamless*, *unlock the potential*, *in today's fast-paced world*), "not X, but Y" framing, em-dash and exclamation density.
   - **Chinese copy:** 套話 such as 賦能、助力、打造極致體驗、在當今…時代; 「不是…而是…」; 簡體字 or 大陸用語 in a Taiwan deck.

   Every word and pixel must be traceable to this subject, audience, and speaker. Read [references/ai-tells.md](references/ai-tells.md) before writing copy.
6. **Verify by looking, not by assuming.** Lint and render snapshots, then actually inspect the PNGs before calling a deck done.

## Workflow

Follow this order; each step gates the next.

1. **Gather.** Confirm the audience and the outputs needed (live talk, webcam PiP, share HTML, PDF, MP4). Pull real material from the user and the workspace.
2. **Align the direction (ask once).** Propose 2–3 *genuinely different* visual worlds. For each, give the spatial metaphor, surface & palette, typography voice (with offline CJK/Latin fallbacks), visual signature, primary archetype, recommended motion tier, and **copy voice** (who is speaking, in what register, and words this speaker would never use). Ask the user to pick, combine, or tweak. Skip asking only when told "decide for me" or when running non-interactively, and then state the chosen direction upfront. See [references/craft-and-direction.md](references/craft-and-direction.md).
3. **Craft hero assets first.** Build focal visuals *before* writing the deck.
   - **Route A, real product/game/hardware:** capture genuine high-res screens or photos and stage them at 65–85% of the stage with hairline callouts. Never substitute CSS/SVG wireframes.
   - **Route B, nothing to screenshot:** build one high-craft route: architectural cross-section, multi-gradient character, tactile artifact, or full-stage editorial data viz.
   - Each asset must clear the **3-layer fidelity bar**: accurate silhouette, materiality/shading, and secondary micro-details.
   - **Gate:** put the asset in its own HTML page, run `snapshot.mjs <hero.html> --raw`, and inspect the PNG before moving on.
4. **Scaffold and author.** Run `new-deck.mjs <deck.html> --title "…" --lang … --ids a,b,c` to get a contract-complete, style-free skeleton.
   - Replace the `DESIGN` tokens and every `data-beatdeck-skeleton` scene with the chosen world.
   - Fill `BEATS` with speakable `say` lines, using `pdfSkip: true` on intermediate micro-steps.
   - Write each beat's choreography in `CHOREO[id]` using the provided `at`, `animate`, `draw`, `countUp`, and `typewriter` helpers.
   - Lock intended line breaks with `<br>` / `data-expected-lines="K"`.
   - Write headlines as claims, not topic labels. Every number needs a source; mark anything missing as `[missing: …]` and ask the user instead of inventing it. Set `META.lang` (e.g. `zh-Hant`) so the language-specific checks run.
5. **Lint until clean.** Run `lint.mjs <deck.html> --strict`; use `--json` when parsing the output. Errors cover overflow, unexpected wraps, broken images, runtime errors, and contract violations. Craft warnings cover:
   - **Layout:** the card shell, nested cards, text collisions, repeated layouts, and leftover skeleton scenes.
   - **AI-tell visuals:** AI gradients, gradient text, frosted glass, text density, bullet stacks, and label headlines.
   - **AI-tell wording,** checked on stage *and* in `say`: stock phrases, contrast frames, em dashes, exclamation marks, placeholders, internal process details, narration that repeats the slide, and 簡體字, 大陸用語 and half-width punctuation in Chinese.

   Fix them by rewriting, not by synonym-swapping. Mark a genuinely intentional case with `data-lint-allow="<type>"` on stage or `META.lintAllow` for narration.
6. **Three-lens review.** Run `snapshot.mjs <deck.html>` and open `contact-sheet.png` and any doubtful `beat-NN.png`.
   - **Audience:** a cold read that also checks archetype variety.
   - **Speaker:** read the `say` lines aloud at 3.6 CJK chars/s or 2.5 Latin words/s, and toggle `C` to confirm the PiP corner stays clear.
   - **Fact & layout:** every number is sourced, and lint is clean.
   - Then run the five-question human checklist in [references/ai-tells.md](references/ai-tells.md) §6 (swap, source, speaker, glance, claim, need-to-know). Lint cannot judge whether a deck says something specific.
7. **Export** what was asked for (table below). See [references/export-and-recording.md](references/export-and-recording.md).

## Beat Data (single source of truth)

```js
{ id: "opening", chapter: "01 · Friction", speaker: "Host",
  say: "Natural spoken line (~15–30 English words or ~30–60 CJK chars).",
  duration: 5.5,          // optional seconds override
  note: "Presenter-only cue.",
  pdfSkip: false,         // true = skip in PDF exports
  cam: { x: 0, y: 0, scale: 1 } }   // skeleton-only: #world camera target
```

Speaker notes (`N`), script Markdown, PDFs, and video timing all read from `BEATS`.

## Runtime Contract (summary)

- `#stage` is `1920×1080`, aspect-fit scaled. Inactive beats are hidden with `display:none`, `visibility:hidden`, or `opacity:0`.
- `?p=N` (1-based) · `?still` (no motion, `at()` settled, chrome and subtitle hidden) · `?video` (chrome hidden, subtitle kept) · `?bare` (stage only).
- `document.body.dataset.ready = "1"` after `document.fonts.ready` (raced with a timeout) and the first render.
- `window.__beatdeck = { version: "1.0", meta, list(), current(), goTo(i), setSubtitle(text) }`.
- Live keys:
  - Next: `→` / `Space` / `PageDown` / clicking the right 75%.
  - Previous: `←` / `PageUp` / `Backspace` / clicking the left 25%.
  - `Home` / `End` jump to the ends; `F` fullscreen; `N` notes; `C` toggles the `400×300` bottom-right PiP safe zone.

`templates/skeleton.html` implements all of this. The full spec is in [references/stage-contract.md](references/stage-contract.md), and a complete crafted example is [examples/beatdeck-intro/deck.html](examples/beatdeck-intro/deck.html).

## CLI Tooling

| Purpose | Command |
| :--- | :--- |
| Scaffold contract skeleton | `new-deck.mjs <deck.html> [--title T] [--lang en] [--beats 6 \| --ids a,b,c] [--force]` |
| Layout, contract & craft lint | `lint.mjs <deck.html> [--strict] [--json]` |
| Beat PNGs + contact sheet / hero check | `snapshot.mjs <deck.html> [--beats 1,3-5] [--cols 4] [--bare] [--out dir]` · `snapshot.mjs <hero.html> --raw` |
| Timestamped speaker script (`講稿`) | `script-export.mjs <deck.html> [--out script.md] [--rate 3.6]` |
| Slides or storyboard PDF | `pdf-export.mjs <deck.html> [--mode slides\|storyboard] [--cols 2] [--out deck.pdf]` |
| Offline single-file share HTML | `bundle-share.mjs <deck.html> [--out deck-share.html]` |
| Deterministic 60fps MP4 | `record-video.mjs <deck.html> [--plan plan.json] [--fps 60] [--slow 3] [--audio a.wav] [--frames-only] [--out deck.mp4]` |

Requires Node ≥ 20 and Playwright Chromium. `ffmpeg` is needed for MP4 output. If Chromium can't be found, set `BEATDECK_CHROMIUM=/path/to/chrome`.
