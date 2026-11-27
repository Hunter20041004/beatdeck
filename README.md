# Beatdeck

**Presentations that direct themselves.**  
An open-source Agent Skill and headless Chromium toolkit for crafting film-like, beat-driven HTML presentations—with card-free visual worlds, bespoke hero craft, and a single source of truth from live talk to 60fps MP4.

---

## Why Beatdeck Is Different

| | Traditional Slides (PPT / Deck Builders) | Video Frameworks (Remotion) | Beatdeck |
| :--- | :--- | :--- | :--- |
| **Visual Model** | Disconnected card rectangles & bullet templates | React timeline components & build steps | One continuous `1920×1080` visual world with card-free compositions |
| **Authoring Unit** | Static pages | Frame-accurate JSX animations | Narrative **beats** (`BEATS` array) with `at()` intra-beat choreography |
| **Direction & Craft** | Fixed themes & canned transitions | Manual component wiring | **2–3 bespoke world proposals** + **Hero Asset Craft Pass** + 3 Motion Tiers |
| **Single Source of Truth** | Separate speaker doc & slides drift quickly | Video-only output; no live talk mode | One HTML drives Live Talk, Notes, Script, PDF, Share HTML & MP4 |
| **Dependencies** | Office / browser SaaS | Node + bundler + React ecosystem | Plain HTML/CSS/JS + Playwright Chromium (`ffmpeg` optional for MP4) |

### What's New in v1.5: Motion With a Point of View

- **Beat changes beyond the cross-fade**: the skeleton ships 11 changes (`cut`, `fade`, `push-*`, `cover-*`, `reveal-*`, `wipe-*`, `iris`, `zoom`, `blur`, `match`, `camera`), set per beat with `transition`, reversed automatically when going back, with the leaving beat holding its final frame.
- **New helpers**: `spring` (real damped springs), `stagger` (from start, end, center, edges, seeded random), `splitText`, `wipe`, `iris`, `stamp` + `shake`, `strike`, `followPath`, `morph`, `cursor`, `ambient`, plus `data-depth` parallax and `data-match` shared elements. All settle instantly under `?still`.
- **Motion personality in every direction proposal**: how this world moves, from its material (paper wipes and stamps, machines snap on stiff springs, film racks focus and cuts), 2–3 change types and one signature move per deck. See [`references/craft-and-direction.md`](references/craft-and-direction.md) §2.
- **See the motion**: `filmstrip.mjs` lays out each beat as frames over time, so review finally looks at the animation and not only the last frame.
- **Motion lint**: `motion-flat`, `motion-repeat`, `motion-one-ease`, `transition-monotony`, plus a motion section in `ai-tells.md`.
- **New example**: [`examples/motion-gallery/deck.html`](examples/motion-gallery/deck.html), 12 beats, one change and one helper each, with when to use it.
- **Fix**: rAF-driven helpers (`draw`, `countUp`, `typewriter`) ran far too slowly in `record-video.mjs` output because the slow-motion clock was applied twice.

### What's New in v1.4: AI-Tell Guard

- **A researched catalog of what makes decks look and sound machine-made**: [`references/ai-tells.md`](references/ai-tells.md) covers visual defaults (purple-blue gradients, frosted glass, emoji icons, text walls, Agenda/Thank-you slides), structure (unsourced stats, generic personas, narration that reads the slide), English stock phrasing and "not X, but Y" framing, and Traditional Chinese 套話 (賦能、助力、打造極致體驗…), 「不是…而是…」, plus Taiwan localization (簡體字, 大陸用語, 全形標點). Every entry pairs the tell with what to do instead.
- **Lint enforces it**: 15 new warning types check visible stage text *and* every `say` line. The demo deck itself was cleaned up to pass `--strict`.
- **Copy voice is part of the direction**: proposals now name who is speaking and which words they would never use, and review ends with a five-question human checklist (swap, source, speaker, glance, claim) for what no lint can judge.

### What's New in v1.3

- **See what you ship**: `snapshot.mjs` renders every beat to PNG plus a labelled `contact-sheet.png`, and `--raw` renders a standalone hero-asset page, so the Hero Gate and the Audience review are real visual checks instead of assumptions.
- **Craft-aware lint**: `lint.mjs` now warns on the card shell (bordered-box density), card-inside-card, emoji icons, **overlapping text**, repeated layouts across consecutive beats, and leftover skeleton scenes. `--strict` makes warnings fatal, `--json` gives agents machine-readable results, and `data-lint-allow="<type>"` marks deliberate exceptions.
- **Contract-only skeleton**: `new-deck.mjs` scaffolds a style-free deck with the full `window.__beatdeck` v1.0 runtime wired (camera, notes, PiP, keys, and `?still`-safe `at`/`animate`/`draw`/`countUp`/`typewriter` helpers), so the effort goes into the visual world rather than re-implementing the contract.
- **Sturdier CLI**: Chromium resolves via `BEATDECK_CHROMIUM`, then Playwright's bundled browser, then another revision in the same Playwright cache, with clear errors instead of a hard failure on version drift.
- **Leaner `SKILL.md`**: Principles + gated workflow up front, details in `references/`, and broader trigger phrases (incl. 簡報 / 投影片).

### v1.2

- **Card-Free Structural Archetypes**: Explicitly bans the repetitive "AI slide-card shell" (dot-kicker + header rule + corner crop marks + bordered grid boxes) in favor of **5 card-free composition archetypes**—clean hero canvases, full-bleed cross-sections, real product windows with hairline callouts, raw print spreads, and asymmetric typographic stages.
- **Mandatory Hero Asset Craft Pass (Before Assembly)**: Separates asset craft from deck coding so visuals never degrade into crude boxes. Includes two explicit paths:
  - **Route A (Real Products, Games & Hardware)**: Gather genuine high-res captures/renders first and stage them at `65–85%` of `#stage` with hairline leader lines.
  - **Route B (Zero-Screenshot Proposals & Concept Talks)**: Choose from 4 high-craft visual routes (architectural cross-sections, multi-gradient characters, tactile printed artifacts, or stage-wide editorial data visuals) verified against a **3-Layer Fidelity Bar** at `1920×1080` before assembling `BEATS`.
- **Includes v1.1 Choreography & Alignment**: Pre-build **2–3 distinct visual world proposals**, **3 Motion Intensity Tiers** (`Measured` / `Choreographed` / `Kinetic`), and deterministic `at(ms, fn, { liveOnly })` timelines that settle cleanly for `?still` snapshots and scale smoothly under `record-video.mjs`.

---

## Quick Install

Clone `beatdeck`, install Playwright Chromium for the CLI tools on the target machine, and symlink the skill folder into your coding agent:

```bash
git clone https://github.com/Hunter20041004/beatdeck.git
cd beatdeck
npm install
npx playwright install chromium
```

> **Note:** Always run `npm install && npx playwright install chromium` in the installed skill directory on each machine—do not copy `node_modules/` across machines or skip `npm install`, or CLI scripts will fail to launch Chromium. If a sandbox ships its own Chromium, point the tools at it with `BEATDECK_CHROMIUM=/path/to/chrome`.

### Agent Skill Paths

- **Antigravity**:
  ```bash
  mkdir -p ~/.gemini/config/skills
  ln -s "$(pwd)" ~/.gemini/config/skills/beatdeck
  ```
- **Claude Code**:
  ```bash
  mkdir -p ~/.claude/skills
  ln -s "$(pwd)" ~/.claude/skills/beatdeck
  ```
- **Codex / Shared Agent Skills**:
  ```bash
  mkdir -p ~/.agents/skills ~/.codex/skills
  ln -s "$(pwd)" ~/.agents/skills/beatdeck
  ln -s "$(pwd)" ~/.codex/skills/beatdeck
  ```
- **Cursor**:
  ```bash
  # Global
  mkdir -p ~/.cursor/skills
  ln -s "$(pwd)" ~/.cursor/skills/beatdeck

  # Or per-workspace (run inside your project root)
  mkdir -p .cursor/skills
  ln -s /path/to/beatdeck .cursor/skills/beatdeck
  ```

> Once installed, ask your agent to build a presentation, pitch deck, talk, or walkthrough—it will follow `SKILL.md` to align on a card-free visual world, craft and inspect hero assets first, author `BEATS`, verify layout in headless Chromium, and export your deliverables.

---

## Preview the Demo

Open the included 12-beat showcase directly in any modern browser, or run the CLI pipeline against it:

```bash
# Open in your default browser (macOS)
open examples/beatdeck-intro/deck.html

# Or serve locally
npx serve .
# then open http://localhost:3000/examples/beatdeck-intro/deck.html
```

### Live Presenter Controls

- `ArrowRight` / `Space` / `PageDown` / click right 75%: Next beat
- `ArrowLeft` / `PageUp` / `Backspace` / click left 25%: Previous beat
- `Home` / `End`: First / last beat
- `N`: Toggle speaker-notes drawer (`chapter`, `say`, estimated duration)
- `C`: Toggle `400×300` bottom-right presenter webcam PiP safe-zone guide
- `F`: Toggle fullscreen

### URL Modes

- `?p=N` — Jump directly to 1-based beat `N`
- `?still` — Disable transitions/animations and hide chrome for instant settled snapshots
- `?video` — Hide presenter chrome while keeping `#stage` and `#subtitle` visible
- `?bare` — Stage-only mode (also hides `#subtitle`; combine as `?still&bare` for clean storyboard frames)

---

## CLI Command Reference

Invoke tools from any workspace using `<skill-dir>` (the directory containing `SKILL.md`, with Node.js >= 20):

```bash
# 0. Scaffold a style-free deck with the full runtime contract wired
node <skill-dir>/scripts/new-deck.mjs <path/to/deck.html> [--title "Deck Title"] [--lang en] [--beats 6 | --ids a,b,c] [--force]

# 1. Verify runtime contract, console errors, broken images, overflow, line wraps + craft warnings
node <skill-dir>/scripts/lint.mjs <path/to/deck.html> [--strict] [--json] [--motion=false]

# 1b. Render beat PNGs + contact sheet (or a standalone hero asset page with --raw)
node <skill-dir>/scripts/snapshot.mjs <path/to/deck.html> [--beats 1,3-5] [--cols 4] [--bare] [--out dir]
node <skill-dir>/scripts/snapshot.mjs <path/to/hero.html> --raw [--out dir]

# 1c. Motion filmstrip: frames over time for each beat
node <skill-dir>/scripts/filmstrip.mjs <path/to/deck.html> [--beats 2-4] [--times 0,120,280,500,900,1500,2600] [--slow 4] [--out dir]

# 2. Export timestamped speaker script Markdown from BEATS (prints to stdout if --out omitted)
node <skill-dir>/scripts/script-export.mjs <path/to/deck.html> [--out script.md] [--rate 3.6]

# 3. Export 1920x1080 slides or multi-column storyboard PDF (defaults: ./deck.pdf or ./storyboard.pdf)
node <skill-dir>/scripts/pdf-export.mjs <path/to/deck.html> [--mode slides|storyboard] [--out deck.pdf] [--cols 2]

# 4. Bundle CSS, JS, fonts, and images into one offline-ready HTML file (default: <deckDir>/<name>-share.html)
node <skill-dir>/scripts/bundle-share.mjs <path/to/deck.html> [--out deck-share.html]

# 5. Record deterministic 60fps MP4 via virtual-clock slow-motion capture (requires ffmpeg unless --frames-only)
node <skill-dir>/scripts/record-video.mjs <path/to/deck.html> [--out deck.mp4] [--plan plan.json] [--fps 60] [--slow 3] [--audio track.wav] [--frames-only]
```

Try them from the cloned `beatdeck` directory on the demo deck:

```bash
node ./scripts/lint.mjs examples/beatdeck-intro/deck.html --strict
node ./scripts/snapshot.mjs examples/beatdeck-intro/deck.html --out /tmp/beatdeck-snaps
node ./scripts/filmstrip.mjs examples/motion-gallery/deck.html --beats 2-5 --out /tmp/beatdeck-motion
node ./scripts/new-deck.mjs /tmp/my-talk/deck.html --title "My Talk" --ids opening,shift,proof
node ./scripts/script-export.mjs examples/beatdeck-intro/deck.html --out /tmp/beatdeck-script.md
node ./scripts/pdf-export.mjs examples/beatdeck-intro/deck.html --mode storyboard --cols 2 --out /tmp/beatdeck-storyboard.pdf
node ./scripts/bundle-share.mjs examples/beatdeck-intro/deck.html --out /tmp/beatdeck-share.html
```

---

## Repository Layout

- `SKILL.md` — Core Agent Skill instructions and ordered workflow
- `references/craft-and-direction.md` — Card-free composition archetypes, hero asset craft pass, beat storytelling, typography & review gate
- `references/ai-tells.md` — Visual and wording AI tells (English + 繁體中文), rewrite recipes, human checklist
- `references/stage-contract.md` — Exact `window.__beatdeck` v1.0 runtime specification
- `references/export-and-recording.md` — CLI documentation and custom `--plan` schema
- `scripts/` — Skeleton scaffolder, headless Chromium linter, snapshot/contact-sheet renderer, motion filmstrip, script exporter, PDF exporter, share bundler, and 60fps recorder
- `templates/skeleton.html` — Style-free runtime skeleton used by `new-deck.mjs`
- `examples/beatdeck-intro/deck.html` — Showcase presentation implementing `window.__beatdeck` v1.0
- `examples/motion-gallery/deck.html` — Motion catalog: one beat change and one helper per beat, built on the skeleton
- `tests/e2e.test.mjs` — End-to-end verification suite (`npm test`)

---

## License

[MIT](LICENSE) — Copyright (c) 2026 Hunter Tseng
