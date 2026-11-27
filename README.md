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

### What's New in v1.2

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

> **Note:** Always run `npm install && npx playwright install chromium` in the installed skill directory on each machine—do not copy `node_modules/` across machines or skip `npm install`, or CLI scripts will fail to launch Chromium.

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
# 1. Verify runtime contract, console errors, broken images, overflow, and line wraps
node <skill-dir>/scripts/lint.mjs <path/to/deck.html>

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
node ./scripts/lint.mjs examples/beatdeck-intro/deck.html
node ./scripts/script-export.mjs examples/beatdeck-intro/deck.html --out /tmp/beatdeck-script.md
node ./scripts/pdf-export.mjs examples/beatdeck-intro/deck.html --mode storyboard --cols 2 --out /tmp/beatdeck-storyboard.pdf
node ./scripts/bundle-share.mjs examples/beatdeck-intro/deck.html --out /tmp/beatdeck-share.html
```

---

## Repository Layout

- `SKILL.md` — Core Agent Skill instructions and ordered workflow
- `references/craft-and-direction.md` — Card-free composition archetypes, hero asset craft pass, beat storytelling, typography & review gate
- `references/stage-contract.md` — Exact `window.__beatdeck` v1.0 runtime specification
- `references/export-and-recording.md` — CLI documentation and custom `--plan` schema
- `scripts/` — Headless Chromium linter, script exporter, PDF exporter, share bundler, and 60fps recorder
- `examples/beatdeck-intro/deck.html` — Showcase presentation implementing `window.__beatdeck` v1.0
- `tests/e2e.test.mjs` — End-to-end verification suite (`npm test`)

---

## License

[MIT](LICENSE) — Copyright (c) 2026 Hunter Tseng
