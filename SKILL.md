---
name: beatdeck
description: Craft film-like, beat-driven HTML presentations on a 1920x1080 stage, with headless Chromium tooling that turns one deck file into a live talk with speaker notes, a timestamped script, slides/storyboard PDFs, an offline share HTML, and a deterministic 60fps MP4. Use whenever the user wants a presentation, slide deck, pitch deck, keynote, talk, lecture, demo walkthrough, storyboard, explainer/promo video built from slides, or asks to turn notes, docs, code, or data into a visual deck (also 簡報, 投影片, 提案簡報, 講稿), even if they never say "Beatdeck".
---

# Beatdeck

A deck is a short directed film on one `1920×1080` stage. Every deck invents its own visual world, hero visuals, and motion grammar from its subject. Never a recycled slide template, bordered-card shell, or default theme. One HTML file is the single source of truth for every output, held together by the `window.__beatdeck` v1.0 runtime contract.

`<skill-dir>` means the folder containing this file. Run tools from the user's workspace as `node <skill-dir>/scripts/<tool>.mjs …`. On first use, if `<skill-dir>/node_modules/` is missing, run `cd <skill-dir> && npm install && npx playwright install chromium`.

## Principles

0. **Find the heart first.** Before any look, read how the subject describes itself (README opening, spec, pitch, brand guide) and write its promise in one sentence. Name its **protagonist**: the character, mechanism, artifact or finding that promise depends on. A named mascot or assistant almost always is it. The deck is about the protagonist, and the features are its supporting cast: meet it within three beats, keep it on stage, give it the signature moments, and build the world for it. A deck that tours features in order is a manual (craft-and-direction §0).
   - **Then lay the spine and confirm it with the deck maker.** Where the audience starts and where they should end, three to six sections that each carry one claim, and *why* each follows the last (*but*, *so*, *because*, *for example*, *compared with*, *then*). The structure is the deck maker's argument: agree on it before any look, because visuals and motion polish a sound spine and cannot fix a wrong one (craft-and-direction §0.3).
1. **One world, card-free composition.** Build one coherent spatial metaphor (optionally a `#world` canvas the camera pans across) instead of disconnected slide boxes. Reject the default AI slide shell (dot-kicker + header rule + corner crop marks + bordered card grids), dark-SaaS neon, purple-blue AI gradients, card-inside-card, 3-column icon grids, and emoji used as icons. Rotate among the five card-free archetypes: *clean canvas + single hero*, *full-bleed scene / cross-section*, *real product window + hairline callouts*, *raw physical artifact / print spread*, *asymmetric typographic stage*.
2. **One idea, one visual change per beat.** Open on a concrete human scene or friction before metrics or architecture. Write for the audience, never for the makers.
   - Leave out internal process: revision or iteration counts (「調整了幾次」「第二版」), review rounds, which agents or tools built it, bug-fix tallies, resubmission notes (「補交」), commit hashes, file paths, ticket IDs, and internal jargon.
   - Show the result in the audience's terms. Facts only the speaker needs go in the beat's `note`.
3. **Motion fits the talk, and restraint is the default.** Cheap motion comes from effects used as decoration, not from too few effects. Pick a **register** from what the presentation is for (pitch: calm and confident; research: precise; product demo: functional; story: cinematic; teaching: stepwise; game launch: lively). Most beats stay quiet (`rise`, `unveil`, `focus`, `draw`, `countUp`; change with `dip`, `cut`, `match`, `camera`). Each beat change says how two beats relate (same object next state, closer look, before/after, time passes, the protagonist acts, new chapter): build a small vocabulary of two to four designed changes from the world and the protagonist (`MOTION.bridges`), never the same one twice in a row, and let quiet `dip` / invisible `cut` fill the rest (craft-and-direction §2.7). The stage is physical: objects keep their layers, enter containers through their openings and never pass through a bezel or each other, including mid-motion (§2.8). Choose **two or three signature moments** where the idea lives and make the *content itself* move there, the way only code can: a living object that re-plans across beats (`carry` with invisible `cut`s), a rule performed on screen (rows re-sorting, an option struck out), time driving the scene, the subject's own physics (a flashlight, ink, a tear-off calendar), history collapsing into a summary. If a slide tool's animation pane could do it, it is not a signature (craft-and-direction §2.5). Accent helpers (`wipe`, `iris`, `stamp`, `cursor`, split type) stay rare. One gesture per beat, no bounce unless the register is playful, entrances travel 8–40 px over 700–1100 ms. Every non-`liveOnly` step settles synchronously under `?still`, so snapshots, lint, and PDFs see the final frame. See [references/craft-and-direction.md](references/craft-and-direction.md) §2 and §5.
4. **Real material, never invented facts.** Use real numbers, quotes, screenshots, and captures. Mark missing facts explicitly instead of inventing placeholders.
5. **No AI tells, visual or verbal.** AI-looking decks come from unexamined defaults:
   - **Visual:** purple-blue gradients, frosted glass, emoji icons, text walls, "Agenda" / "Thank you" slides.
   - **English copy:** stock phrases (*seamless*, *unlock the potential*, *in today's fast-paced world*), "not X, but Y" framing, em-dash and exclamation density.
   - **Chinese copy:** 套話 such as 賦能、助力、打造極致體驗、在當今…時代; 「不是…而是…」; 簡體字 or 大陸用語 in a Taiwan deck.

   Every word and pixel must be traceable to this subject, audience, and speaker. Read [references/ai-tells.md](references/ai-tells.md) before writing copy.
6. **Verify by looking, not by assuming.** Lint and render snapshots, then actually inspect the PNGs before calling a deck done.

## Workflow

Follow this order; each step gates the next.

1. **Gather.** Confirm the audience, and ask what the deck is *for* in the user's words rather than tool names: presenting live (with a webcam in the corner?), sending it to someone to read, printing or attaching it, or recording a video. Map the answer to outputs (live talk, PiP safe zone, share HTML, PDF, MP4). Pull real material from the user and the workspace. **Find the heart** (principle 0): from the subject's own description, write the promise in one sentence and name the protagonist; if you cannot tell, ask with the step-2 message. Then list every fact the story needs that the material does not give (a number, a date, a URL, a name) and ask for them **in one message** with the spine in step 2, instead of one at a time while authoring.
2. **Confirm the spine (ask once).** Before any look, show the deck maker the structure's logic as one short block (craft-and-direction §0.3): the promise and the protagonist, the audience **from → to** (what they believe walking in, what they should think or do walking out), the shape, and three to six sections, each with its chapter name, its one claim, what the protagonist does there, **why it follows the previous section** (a named relation, never "and also"), and a rough share of the time. Run the claim, why, start, end and protagonist tests on it first. Ask: does it start where your audience is, is this the order you would argue it in, what is missing or skippable. Send the missing facts from step 1 in the same message. Skip asking only under "decide for me" or non-interactively, and then state the spine upfront. If the user may be away for a while (an async thread, a queued task), ask, then carry on with your spine while you wait, and rework it if their answer differs. Record the agreed spine in `META.spine`.
3. **Align the direction (ask once).** Propose 2–3 *genuinely different* visual worlds for the confirmed spine. For each, give the spatial metaphor, surface & palette, typography voice (with offline CJK/Latin fallbacks), visual signature, primary archetype, **motion register** (default entrance and beat change, which two or three beats get a signature moment, and the deck's designed beat changes with the relation each one carries), and **copy voice**. Each direction is a different place for the same protagonist and the same argument, and says how it looks and moves there (who is speaking, in what register, and words this speaker would never use). The spine's relations pick the designed changes at section boundaries, and its turn (*but*) and proof (*for example*) are where the signature moments go. Ask the user to pick, combine, or tweak, under the same skip and async rules as step 2. See [references/craft-and-direction.md](references/craft-and-direction.md).
4. **Outline check.** Before building anything, show the beat list grouped under the spine's sections: per beat, one line for what the audience should take away, a first draft of the `say` line, where the protagonist appears and acts, and which beats carry a signature moment or a designed change (and which relation). Every beat moves its section's claim; a beat that fits no section is a question for the deck maker or a cut. Ask the user to reorder, cut or add beats; the order of sections is already settled. Under the same async rule, keep going on your outline while you wait and fold in their answer.
5. **Craft hero assets first.** Build focal visuals *before* writing the deck.
   - **The protagonist is asset number one.** Rebuild it at full fidelity from the subject's own files (SVG, colours, proportions, expressions); a character must look and behave like itself, never reduced to a chat panel or logo. Mark it `data-protagonist` wherever it appears.
   - **Route A, real product/game/hardware:** capture genuine high-res screens or photos and stage them at 65–85% of the stage with hairline callouts. Never substitute CSS/SVG wireframes. Crop each capture to the region the beat talks about, so the UI text in it stays readable on a projector (≥ 18px on stage).
   - **Route B, nothing to screenshot:** build one high-craft route: architectural cross-section, multi-gradient character, tactile artifact, or full-stage editorial data viz.
   - When a signature moment needs the product's own UI to move (a timetable re-planning, a list re-sorting), rebuild *that one component* in the DOM from the product's real data, colours and type, and show a real capture of the same state nearby. That is a faithful rebuild, not a wireframe.
   - Each asset must clear the **3-layer fidelity bar**: accurate silhouette, materiality/shading, and secondary micro-details.
   - **Gate:** put the asset in its own HTML page, run `snapshot.mjs <hero.html> --raw`, and inspect the PNG before moving on.
6. **Scaffold and author.** Run `new-deck.mjs <deck.html> --title "…" --lang … --ids a,b,c` to get a contract-complete, style-free skeleton.
   - Replace the `DESIGN` tokens, the `MOTION` block, and every `data-beatdeck-skeleton` scene with the chosen world.
   - Fill `BEATS` with speakable `say` lines, using `pdfSkip: true` on intermediate micro-steps. Each beat's `chapter` is a section of `META.spine`, in spine order.
   - Give beats a `transition` where the story turns, continues, or goes deeper, and write each beat's choreography in `CHOREO[id]` with the helpers (`rise`, `unveil`, `focus` for the quiet default; `tween`, `spring`, `stagger`, `splitText`, `wipe`, `iris`, `stamp`, `strike`, `draw`, `followPath`, `morph`, `cursor`, `countUp`, `typewriter`, `ambient`, `at`). `examples/motion-gallery/deck.html` shows each one.
   - Lock intended line breaks with `<br>` / `data-expected-lines="K"`.
   - Embed the deck's fonts with `fonts.mjs` (it subsets each face to the characters the deck uses and links `fonts/fonts.css`). Without it, lint, snapshots and every viewer render whatever font that machine happens to have; lint reports this as a `font-fallback` note. Re-run it after editing copy.
   - Write headlines as plain claims that say what happens. Avoid topic labels, metaphor equations, and the clipped two-beat slogan rhythm. Every number needs a source; mark anything missing as `[missing: …]` and ask the user instead of inventing it. Set `META.lang` (e.g. `zh-Hant`) so the language-specific checks run.
7. **Lint until clean.** Run `lint.mjs <deck.html> --strict`; use `--json` when parsing the output. Errors cover overflow, unexpected wraps, broken images, runtime errors, and contract violations. Craft warnings cover:
   - **Structure:** a missing or incomplete `META.spine`, a section joined by "and also", and beats whose chapters stray from the spine, skip a section or come back to one (`spine`).
   - **Layout:** the card shell, nested cards, text collisions, repeated layouts, screenshots shrunk too small to read, and leftover skeleton scenes.
   - **AI-tell visuals:** AI gradients, gradient text, frosted glass, text density, bullet stacks, and label headlines.
   - **Motion:** accents on too many beats (`motion-accent-overuse`), several effects competing in one beat (`motion-busy`), bounce everywhere (`motion-bounce`), elements flying in from far away (`motion-travel`), too many showy beat changes (`transition-variety`), every visible beat change being a fade (`transition-monotone`), one designed change repeated into a pattern (`transition-repeat`), something drawn across a phone's or page's frame mid-motion (`frame-crossing`), a protagonist that is missing, late or rare (`protagonist`), and a long deck with no signature moment (`motion-no-signature`).
   - **AI-tell wording,** checked on stage *and* in `say`: stock phrases, contrast frames, metaphor equations (「X 是一場 Y」), slogan-cadence headlines (「短句，短句。」), em dashes, exclamation marks, placeholders, internal process details, narration that repeats the slide, and 簡體字, 大陸用語 and half-width punctuation in Chinese.

   Fix them by rewriting, not by synonym-swapping. Mark a genuinely intentional case with `data-lint-allow="<type>"` on stage or `META.lintAllow` for narration.
8. **Three-lens review.** Run `snapshot.mjs <deck.html>` and open `contact-sheet.png` and any doubtful `beat-NN.png`.
   - **Audience:** a cold read that also checks archetype variety. Then the spine test: read only the section claims and the headlines in order; they must still make the agreed argument. Then the cover test: hide the protagonist in every beat; if the deck still makes sense, it is a feature tour.
   - **Motion:** run `filmstrip.mjs <deck.html>` and open `filmstrip.png`: each row is one beat over its first ~2.6s. Check that beats move differently, the first frame is never empty, the signature move lands, and nothing passes through a frame or another object. Step through the deck live once, forward and back, to see every beat change.
   - **Speaker:** read the `say` lines aloud at 3.6 CJK chars/s or 2.5 Latin words/s, and toggle `C` to confirm the PiP corner stays clear.
   - **Fact & layout:** every number is sourced, and lint is clean. A `[missing: …]` mark on stage fails `--strict`, so nothing ships with a gap unnoticed.
   - Then run the human checklist in [references/ai-tells.md](references/ai-tells.md) §6 (swap, source, speaker, glance, claim, motion, need-to-know). Lint cannot judge whether a deck says something specific.
9. **Export** what was asked for (table below). See [references/export-and-recording.md](references/export-and-recording.md).
10. **Revise.** When the user asks for changes after delivery, edit the deck file, never an export. Then re-run only what the change touches: `fonts.mjs` if copy changed; `lint.mjs --strict` always; `snapshot.mjs --beats <changed>` and `filmstrip.mjs --beats <changed>` for the beats you touched; and every export you delivered before, so no PDF, script or share file goes stale. Say which beats changed when you hand it back.

## Beat Data (single source of truth)

```js
{ id: "opening", chapter: "01 · Friction", speaker: "Host",
  say: "Natural spoken line (~15–30 English words or ~30–60 CJK chars).",
  duration: 5.5,          // optional seconds override
  note: "Presenter-only cue.",
  pdfSkip: false,         // true = skip in PDF exports
  transition: "wipe-left", // skeleton-only: change into this beat (cut, fade, dip, push-*, cover-*, reveal-*, wipe-*, iris, zoom, blur, match, camera, or a MOTION.bridges name)
  cam: { x: 0, y: 0, scale: 1 } }   // skeleton-only: #world camera target
```

The confirmed structure sits beside the beats in `META.spine` (craft-and-direction §0.3, §6):

```js
spine: { promise: "…", protagonist: "…", shape: "situation → complication → resolution",
  from: "what the audience believes walking in", to: "what they should think or do walking out",
  sections: [ { chapter: "01 · Friction", claim: "One full sentence.", why: "starts where they are" },
              { chapter: "02 · The clash", claim: "…", why: "but" } ] }
```

Speaker notes (`N`), script Markdown, PDFs, and video timing all read from `BEATS`; the script also prints the spine with each section's time.

## Runtime Contract (summary)

- `#stage` is `1920×1080`, aspect-fit and centred with an explicit `translate + scale` from `transform-origin: 0 0` (never grid-centre + `scale()` around the centre: it opens skewed in Claude and other host panes). Inactive beats are hidden with `display:none`, `visibility:hidden`, or `opacity:0`.
- `?p=N` (1-based) · `?still` (no motion, `at()` settled, chrome and subtitle hidden) · `?video` (chrome hidden, subtitle kept) · `?bare` (stage only).
- `document.body.dataset.ready = "1"` after `document.fonts.ready` (raced with a timeout) and the first render.
- `window.__beatdeck = { version: "1.0", meta, list(), current(), goTo(i), setSubtitle(text) }`.
- Live keys:
  - Next: `→` / `Space` / `PageDown` / clicking the right 75%.
  - Previous: `←` / `PageUp` / `Backspace` / clicking the left 25%.
  - `Home` / `End` jump to the ends; `F` fullscreen; `N` notes; `C` toggles the `400×300` bottom-right PiP safe zone.

`templates/skeleton.html` implements all of this, plus beat changes (`MOTION.transition` / `beat.transition`), `data-match` shared elements, `data-depth` parallax, and the motion helpers. The full spec is in [references/stage-contract.md](references/stage-contract.md), and a complete crafted example is [examples/beatdeck-intro/deck.html](examples/beatdeck-intro/deck.html).

## CLI Tooling

| Purpose | Command |
| :--- | :--- |
| Scaffold contract skeleton | `new-deck.mjs <deck.html> [--title T] [--lang en] [--beats 6 \| --ids a,b,c] [--force]` |
| Embed subset web fonts | `fonts.mjs <deck.html> --font "Family:weight=path" [--font …] [--out dir] [--extra chars] [--link=false]` |
| Layout, contract, craft & motion lint | `lint.mjs <deck.html> [--strict] [--json] [--motion=false]` |
| Beat PNGs + contact sheet / hero check | `snapshot.mjs <deck.html> [--beats 1,3-5] [--cols 4] [--bare] [--out dir]` · `snapshot.mjs <hero.html> --raw` |
| Motion filmstrip (frames over time per beat) | `filmstrip.mjs <deck.html> [--beats 2-4] [--times 0,120,280,500,900,1500,2600] [--slow 4] [--frames] [--out dir]` |
| Timestamped speaker script (`講稿`) | `script-export.mjs <deck.html> [--out script.md] [--rate 3.6]` |
| Slides or storyboard PDF | `pdf-export.mjs <deck.html> [--mode slides\|storyboard] [--cols 2] [--out deck.pdf]` |
| Offline single-file share HTML | `bundle-share.mjs <deck.html> [--out deck-share.html]` |
| Deterministic 60fps MP4 | `record-video.mjs <deck.html> [--plan plan.json] [--fps 60] [--slow 3] [--audio a.wav] [--frames-only] [--out deck.mp4]` |

Requires Node ≥ 20 and Playwright Chromium. `ffmpeg` is needed for MP4 output. If Chromium can't be found, set `BEATDECK_CHROMIUM=/path/to/chrome`.
