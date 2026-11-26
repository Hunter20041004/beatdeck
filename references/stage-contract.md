# Stage Runtime Contract (`window.__beatdeck` v1.0)

Every Beatdeck presentation implements a lightweight contract so headless linting, script export, PDF generation, single-file bundling, and deterministic video recording work across any visual design.

---

## 1. Logical Stage (`#stage`)

- Place all presentation visuals inside an element with `id="stage"` sized to **`1920px × 1080px`** logical coordinates.
- Center `#stage` inside the viewport and aspect-fit scale it (`transform: scale(...)`) so the layout stays identical on any screen size while preserving `1920×1080` internal geometry.
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

---

## 7. Minimal Reference Skeleton

```html
<style>
  html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
  #viewport { position: relative; width: 100%; height: 100%; display: grid; place-items: center; }
  #stage {
    position: relative; width: 1920px; height: 1080px;
    transform-origin: center center; overflow: hidden;
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

function fitStage() {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  stageEl.style.transform = `scale(${scale})`;
}
window.addEventListener("resize", fitStage);
fitStage();

window.__beatdeck = {
  version: "1.0",
  meta: { title: "Deck Title", width: 1920, height: 1080, speechRate: 3.6 },
  list: () => BEATS.map((b, index) => ({
    index, id: b.id, chapter: b.chapter, speaker: b.speaker,
    say: b.say, duration: b.duration, note: b.note, pdfSkip: Boolean(b.pdfSkip)
  })),
  current: () => activeIndex,
  goTo: (index) => renderBeat(Math.max(0, Math.min(BEATS.length - 1, index))),
  setSubtitle: (text) => { /* update #subtitle text & visibility */ }
};

const initial = Math.max(1, Math.min(BEATS.length, parseInt(params.get("p") || "1", 10) || 1)) - 1;
await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
window.__beatdeck.goTo(initial);
document.body.dataset.ready = "1";
```
