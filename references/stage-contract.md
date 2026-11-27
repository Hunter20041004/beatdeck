# Stage Runtime Contract (`window.__beatdeck` v1.0)

Every Beatdeck presentation implements a lightweight contract so headless linting, script export, PDF generation, single-file bundling, and deterministic video recording work across any visual design.

---

## 1. Logical Stage (`#stage`)

- Place all presentation visuals inside an element with `id="stage"` sized to **`1920px × 1080px`** logical coordinates.
- Fit and centre `#stage` explicitly: `#viewport` is `position: fixed; inset: 0`, `#stage` is `position: absolute; left: 0; top: 0; transform-origin: 0 0`, and `fitStage()` sets `translate(offsetX, offsetY) scale(s)` from the viewport's own `clientWidth`/`clientHeight`, on load, on `resize`, and from a `ResizeObserver` on `#viewport`. This keeps the `1920×1080` geometry identical at any size.
- Do **not** centre with grid/flex plus `transform-origin: center` and a bare `scale()`. That only lines up at exactly 1920×1080; in any other window, and inside host panes such as the Claude artifact viewer or an iframe, the stage drifts right and down out of view, so the deck opens skewed and its content can't be reached. `lint.mjs` checks the fit at 1000×515, 1280×1000 and 420×800 (`stage-fit`) and that ArrowRight and a click still advance beats (`controls`).
- Elements from inactive beats must be hidden cleanly (`display: none`, `visibility: hidden`, or `opacity: 0`) so automated geometry checks only inspect the active beat.

---

## 2. Query Parameters

Parse `new URLSearchParams(location.search)` on startup:

| Parameter | Effect |
| :--- | :--- |
| `?p=N` | Start at 1-based beat `N` (clamped to `1..beats.length`). |
| `?still` | Add class `still` on `document.body`. Disable all CSS transitions and animations (`transition: none !important; animation: none !important;`) so any beat renders immediately in its settled final state. Hide interactive controls, speaker notes, camera safe-zone, and `#subtitle`. |
| `?video` | Add class `video` on `document.body`. Hide interactive controls, speaker notes, and camera safe-zone while keeping `#stage` and optional `#subtitle` visible. |
| `?bare` | Add class `bare` on `document.body`. Hide interactive controls, speaker notes, camera safe-zone, **and** `#subtitle` (stage-only capture, e.g., `?still&bare` for storyboard cards). |

---

## 3. Ready Signal

1. Await `document.fonts.ready` raced against a bounded timeout (for example, `1500ms`) so offline or sandboxed browsers never hang indefinitely.
2. Render the initial beat (from `?p=N` or beat `0`).
3. Set `document.body.dataset.ready = "1"`.

All Beatdeck CLI scripts wait for `document.body.dataset.ready === "1"` before reading `window.__beatdeck` or capturing frames.

---

## 4. Global API (`window.__beatdeck`)

Expose `window.__beatdeck` before setting `dataset.ready = "1"`:

```ts
interface BeatdeckAPI {
  version: "1.0";
  meta: {
    title: string;
    subtitle?: string;
    lang?: string;
    width: 1920;
    height: 1080;
    speechRate?: number; // default: 3.6 chars/s (CJK), 2.5 words/s (Latin)
  };
  list(): Array<{
    index: number;      // 0-based
    id?: string;
    chapter?: string;
    speaker?: string;
    say: string;
    duration?: number;  // explicit seconds override
    note?: string;
    pdfSkip?: boolean;
  }>;
  current(): number;                // active 0-based beat index
  goTo(index: number): void;        // jump to 0-based beat (clamped; instant in ?still)
  setSubtitle(text: string): void;  // set or clear #subtitle text
}
```

### Subtitle Behavior (`#subtitle`)

- `setSubtitle(text)` sets the `#subtitle` overlay text and reveals it when `text` is non-empty.
- When `text` is empty/falsy, or when `?still` or `?bare` is active, `#subtitle` remains hidden.

---

## 5. Interactive Controls (Live Mode)

Enabled when neither `?still`, `?video`, nor `?bare` is active (always ignore keystrokes inside inputs if any exist):

- **Next beat**: `ArrowRight`, `Space`, `PageDown`, or clicking the right `75%` of the viewport (outside HUD buttons/drawer).
- **Previous beat**: `ArrowLeft`, `PageUp`, `Backspace`, or clicking the left `25%` of the viewport.
- **Jump**: `Home` (first beat), `End` (last beat).
- **`F`**: Toggle browser fullscreen.
- **`N`**: Toggle the speaker-notes drawer/overlay displaying current beat progress (`i / total`), chapter, `say`, `note`, and estimated duration.
- **`C`**: Toggle the **`400×300` bottom-right camera safe-zone overlay** in stage coordinates so a presenter recording webcam picture-in-picture can verify no visual content sits under their camera box.

---

## 6. Linting Hooks (`scripts/lint.mjs`)

To let headless Chromium verify layout integrity on every beat:

- **Line-wrap assertions**: Add `data-expected-lines="K"` on elements whose visual line count must not exceed `K`. Elements inside `#stage` containing `<br>` are also automatically checked (`expected = brCount + 1` unless `data-expected-lines` overrides it), and `data-lint-lines="K"` may also be used.
- **Text containment**: Visible text nodes inside `#stage` must remain inside the `1920×1080` stage bounds (within `±1px` normalized tolerance).
- **Image integrity**: Every visible `<img>` inside `#stage` must satisfy `img.complete && img.naturalWidth > 0`.
- **Craft warnings**: `lint.mjs` also warns (and fails under `--strict`) on bordered/shadowed card density, card-inside-card nesting, emoji in visible text, overlapping text from different nodes, the same boxed layout on consecutive beats, and visible `[data-beatdeck-skeleton]` placeholders.
- **Intentional exceptions**: `data-lint-allow="card-shell emoji text-collision"` (space- or comma-separated warning types) on an element exempts its subtree, e.g. a deliberate storyboard strip or an ink stamp layered over artwork.

---

## 7. Minimal Reference Skeleton (with `at()` Intra-Beat Choreography)

> **Prefer the generated skeleton.** `node <skill-dir>/scripts/new-deck.mjs <deck.html> --title "…" --ids a,b,c` writes [`templates/skeleton.html`](../templates/skeleton.html) with the whole contract wired: scaling, query modes, ready signal, `#world` camera (`beat.cam`), notes drawer, PiP zone, HUD, keys/clicks, and `?still`-safe helpers `at`, `animate`, `draw`, `countUp`, `typewriter` passed to `CHOREO[beatId](sceneEl, helpers)`. It carries no visual style: replace every `DESIGN` block and `data-beatdeck-skeleton` scene. The fragments below explain the moving parts.

```html
<style>
  html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
  #viewport { position: fixed; inset: 0; overflow: hidden; }
  #stage {
    position: absolute; left: 0; top: 0; width: 1920px; height: 1080px;
    transform-origin: 0 0; overflow: hidden;
  }
  body.still *, body.still *::before, body.still *::after {
    transition: none !important;
    animation: none !important;
  }
  body.still #hud, body.still #notes, body.still #cam-safe, body.still #subtitle,
  body.video #hud, body.video #notes, body.video #cam-safe,
  body.bare #hud, body.bare #notes, body.bare #cam-safe, body.bare #subtitle {
    display: none !important;
  }
</style>
```

```js
const params = new URLSearchParams(location.search);
const isStill = params.has("still");
const isVideo = params.has("video");
const isBare = params.has("bare");
if (isStill) document.body.classList.add("still");
if (isVideo) document.body.classList.add("video");
if (isBare) document.body.classList.add("bare");

// Centre explicitly from the top-left; never rely on transform-origin: center (see §1).
function fitStage() {
  const vp = document.getElementById("viewport");
  const vw = vp.clientWidth || window.innerWidth || 1920;
  const vh = vp.clientHeight || window.innerHeight || 1080;
  const s = Math.min(vw / 1920, vh / 1080);
  stageEl.style.transform = `translate(${(vw - 1920 * s) / 2}px, ${(vh - 1080 * s) / 2}px) scale(${s})`;
}
window.addEventListener("resize", fitStage);
if (window.ResizeObserver) new ResizeObserver(fitStage).observe(document.getElementById("viewport"));
fitStage();

// Intra-beat timer scheduler: compatible with ?still and record-video.mjs virtual clock.
// record-video.mjs scales setTimeout, setInterval, requestAnimationFrame, Date.now(), and performance.now().
let beatTimers = [];
let beatRafIds = [];

function clearBeatTimeline() {
  beatTimers.forEach((id) => clearTimeout(id));
  beatRafIds.forEach((id) => cancelAnimationFrame(id));
  beatTimers = [];
  beatRafIds = [];
}

function at(ms, fn, { liveOnly = false } = {}) {
  if (isStill) {
    if (!liveOnly) fn(); // Settle final frame synchronously for ?still / lint / PDF
    return;
  }
  if (ms <= 0) {
    fn();
    return;
  }
  beatTimers.push(setTimeout(fn, ms));
}

function animateValue(durationMs, onFrame, { liveOnly = false } = {}) {
  if (isStill) {
    if (!liveOnly) onFrame(1);
    return;
  }
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / durationMs);
    onFrame(1 - Math.pow(1 - t, 3));
    if (t < 1) beatRafIds.push(requestAnimationFrame(tick));
  }
  beatRafIds.push(requestAnimationFrame(tick));
}

function renderBeat(index) {
  clearBeatTimeline();
  activeIndex = Math.max(0, Math.min(BEATS.length - 1, index));
  const beat = BEATS[activeIndex];
  // 1. Reset transient states & update persistent protagonist / #world camera transform
  // 2. Schedule intra-beat choreography with at(ms, fn, { liveOnly }) and animateValue(...)
  beat.enter?.({ at, animateValue, isStill });
}

window.__beatdeck = {
  version: "1.0",
  meta: { title: "Deck Title", width: 1920, height: 1080, speechRate: 3.6 },
  list: () => BEATS.map((b, index) => ({
    index, id: b.id, chapter: b.chapter, speaker: b.speaker,
    say: b.say, duration: b.duration, note: b.note, pdfSkip: Boolean(b.pdfSkip)
  })),
  current: () => activeIndex,
  goTo: (index) => renderBeat(index),
  setSubtitle: (text) => { /* update #subtitle text & visibility */ }
};

const initial = Math.max(1, Math.min(BEATS.length, parseInt(params.get("p") || "1", 10) || 1)) - 1;
await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
window.__beatdeck.goTo(initial);
document.body.dataset.ready = "1";
```
