# AI Tells: What Makes a Deck Look and Sound Machine-Made

Audiences now pattern-match polish to "an AI made this", and once they do, they stop trusting the content. The tells are not AI-specific sins. They are **unexamined defaults**: the choice a model makes when nobody made a choice. The cure is the same every time: every visual and verbal decision must trace back to *this* subject, *this* audience, and *this* speaker. That includes leaving out what only the makers care about (§2, *Internal process leakage*).

Use this file at three moments:

1. **Direction (workflow step 3):** decide the copy voice alongside the visual world. Who is speaking, in what register, and which words this speaker would never say.
2. **Authoring (step 6):** write against the lists below from the first draft. Rewriting AI tone afterwards is slower than not writing it.
3. **Verification (steps 7–8):** `lint.mjs --strict` catches the mechanical tells (the **Lint** column). The rest need the human checklist in §6, which is why the contact-sheet review is mandatory.

A lint pass is necessary, not sufficient. No rule list can guarantee a deck "doesn't feel AI". A deck can avoid every listed phrase and still say nothing. Treat §6 as the real gate.

---

## 1. Visual Tells

| Tell | Why it reads as AI | Do instead | Lint |
| :--- | :--- | :--- | :--- |
| Purple → blue / violet → pink gradients on backgrounds, buttons, or text | The single most recognized "AI default" palette | Derive palette from the subject's real artifacts; solid grounds, one accent | `ai-gradient`, `gradient-text` |
| Frosted-glass panels floating on blurred blobs | Applied everywhere by default; signals no layout idea | One material that belongs to the world (paper, film, steel, signage) | `glassmorphism` |
| Bordered or shadowed card grids; card inside card; same layout on consecutive beats | The default "slide shell"; every beat looks the same | Rotate the five card-free archetypes (see craft-and-direction.md §3) | `card-shell`, `nested-card`, `layout-repeat` |
| Emoji as icons or bullets (🚀 ✅ 💡 📈) | The cheapest possible icon; renders differently on every platform | Crisp inline SVG from one consistent drawing system, or typographic marks | `emoji` |
| Walls of text, 6+ bullets, every slide a checklist | Models default to completeness and cover everything | One idea per beat; move detail into `say` | `text-density`, `bullet-stack` |
| Headline is a topic label: "Agenda", "Overview", "Thank you", "Q&A", 「議程」「謝謝聆聽」 | Template filler; it states no claim | Assertion headlines: the sentence you want remembered | `label-headline` |
| Text colliding, orphaned CJK characters, overflow | Generated in one pass without looking | Lock breaks with `<br>` + `data-expected-lines`; snapshot and look | `text-collision`, `line-wrap`, `overflow` |
| Cream background + italic serif flourish + colored bar beside every text box | The current "tasteful" AI slide default | Make the accent mean something (one highlight per beat, tied to the claim) | review |
| Generic 3D blobs, isometric people, glossy stock illustrations | Interchangeable across any topic | Real captures (Route A) or a crafted hero asset that clears the 3-layer fidelity bar (Route B) | review (hero gate) |
| Icon style or background treatment drifting from beat to beat | Each slide generated in isolation | One visual system, decided in step 3, applied everywhere | review (contact sheet) |
| Decorative fake dashboards: meaningless progress bars, KPIs, sparklines | Looks "data-driven" without data | Show real numbers or nothing | review (fact lens) |
| Everything centered and symmetric, identical rhythm on every beat | No hierarchy decision was made | Asymmetry, scale contrast, intentional empty space | review (contact sheet) |

---

### Motion tells

Motion gives a deck away faster than any colour. Today the usual failure is not too little motion but too much: effects used as decoration read as cheap and pull eyes off the speaker. Watch the deck with `filmstrip.mjs`; `snapshot.mjs` only shows the last frame.

| Tell | Why it reads as AI | Do instead | Lint |
| :--- | :--- | :--- | :--- |
| An effect on every beat: stamps, shakes, typed text, split letters | Effects applied because they exist | Pick the register first; most beats `rise`/`unveil`/`fade`, two or three signature moments (craft-and-direction §2.5) | `motion-accent-overuse` |
| Three effects fighting inside one beat | Each helper added to make the beat "interesting" | One gesture per beat; fix the composition instead | `motion-busy` |
| A different flashy transition at every click (iris, zoom, blur, cover…) | The transition menu used as a tour | `fade`, `cut`, `match`, `camera` for most changes; at most two showy types, each on a story turn | `transition-variety` |
| Everything bounces | Springs and `snap` used as decoration | Critically damped springs and `ease.out`; overshoot only in a play register | `motion-bounce` |
| Things fly in from off-stage | Large travel instead of a mask or camera | 8–40 px lift, `unveil` masks, `camera` for big moves | `motion-travel` |
| Short, snappy 250 ms pops | Library defaults | 700–1100 ms entrances on a long deceleration, then hold | review (filmstrip) |
| Every number counts up, every line types itself | Effects applied because they exist | `countUp` for the one number that matters; `typewriter` only for things that are actually typed | `motion-accent-overuse` |
| Endless decorative loops (pulsing dots, floating blobs) | "Make it feel alive" filler | At most one `ambient` loop that means something (a caret, a live indicator) | review |
| Motion that starts after a blank pause on every beat | Long uniform delays | The first frame of each beat should already show something | review (filmstrip) |
| A long deck where nothing ever stands out | Restraint mistaken for absence | Give the turn of the story one gesture of its own | `motion-no-signature` |

---

## 2. Structure & Content Tells

| Tell | Do instead | Lint |
| :--- | :--- | :--- |
| Agenda slide at the start, "Thank you / Questions?" at the end | Open on a human scene; close on the one action or sentence you want remembered | `label-headline` |
| Sections that follow only because they come next: feature 1, feature 2, feature 3; "another thing" / 「另外」「接著」 | A spine where each section says why it follows the last (*but*, *so*, *because*, *for example*), confirmed with the deck maker (craft-and-direction §0.3) | `spine` |
| Narration that reads the slide aloud | Stage shows the evidence; `say` carries the argument | `read-aloud` |
| Everything in threes: three pillars, three benefits, three adjectives | Use the real count. Two is fine, five is fine | review |
| Generic persona ("Meet Sarah, a busy marketing manager…") | A real user, a real quote, or a specific, verifiable situation | `placeholder` (John Doe, Acme) / review |
| Unsourced or suspiciously round statistics ("90% of teams…", "10× faster"), "studies show…" | Only numbers traceable to a named source; otherwise mark `[missing: …]` and ask | review (fact lens) |
| Hedged, point-of-view-free claims ("can help", "may enable", "various benefits") | Commit to a claim the speaker can defend | review |
| Summary slide that restates every previous beat | One synthesis beat that changes how the audience sees the opening scene | review |
| Placeholder leftovers: TODO, TBD, XX%, [Company], lorem ipsum, 某某, 〇〇, an unfilled `[missing: …]` on stage | Real content, or a question to the user with the candidates found in the material and their sources (SKILL.md, *Asking the Deck Maker*) | `placeholder` |

### Internal process leakage

AI drafting works from the project's logs, commit history, and decision records, so it narrates *how the work was made* instead of *what the audience gets*. Insiders care about process; the audience does not.

| Leaks onto the stage | Keep it in |
| :--- | :--- |
| Revision and iteration counts: "after 4 iterations", 「調整了 5 次」「第二版」「經過三輪審查」 | changelog, beat `note` |
| Who or what built it: "three sub-agents", 「子代理分工」「AI 分身」, internal role names | README / credits |
| Bug-fix tallies: "fixed 95 issues", 「修了 95 處」 | changelog |
| Submission bookkeeping: "resubmitted", 「補交」「第十一週補交版」「依老師意見修改」 | the submission form |
| Repository internals: commit hashes, branch names, file paths (`src/game.js`), test file names, ticket/decision IDs | README |
| Dates of internal fixes and who approved them | decision log |

**What to show instead:** the result in the audience's terms. Not "after three rounds of tuning, chase speed went from 69 to 119", but "monsters now run faster than you walk, so you have to break line of sight". A process fact belongs on stage only when the process *is* the subject (a talk about how you work) or when the audience must act on it (e.g. CLI commands in a developer-tool deck). Then mark it with `data-lint-allow="internal-process"`.

Lint type: `internal-process` (stage text and `say`; the presenter-only `note` field is exempt and is the right home for these facts).

---

## 3. English Wording Tells

**Stock phrases** (`ai-phrase`; full list in `scripts/lib/copy-rules.mjs`): *in today's fast-paced world*, *it's important to note*, *in conclusion*, *delve*, *tapestry*, *a testament to*, *unlock the potential*, *harness the power*, *game-changer*, *revolutionize*, *seamless*, *cutting-edge*, *ever-evolving*, *navigate the complexities*, *embark on*, *supercharge*, *unleash*, *synergy*, *paradigm shift*, *next-level*, *in the realm of*, *let's dive in*, *imagine a world*, *elevate your*, *empower*, *holistic*, *at the intersection of*, *the future of X is here*, *stands as a*, *plays a pivotal role*.

**Patterns:**

- **"Not X, but Y" framing** (`contrast-frame`, flagged on 2+ beats): *it's not just a tool, it's a partner*; *this isn't about X, it's about Y*; *…, not a Y*. The most persistent tell in current models. State the point directly.
- **Metaphor equations** (`metaphor-frame`): *hiding is a gamble*, *growth is a journey*, *design is a dance*. They sound profound and carry no information. Say what actually happens: *if a monster sees you hide, it waits outside the door*.
- **Slogan cadence** (`slogan-cadence`, deck-level: 4+ headlines and at least 40% of them): headlines built as two or three clipped sentences, e.g. *Three lenses. Zero broken frames.*, *Stop formatting slides. Start directing beats.* One can land; a deck full of them reads like ad copy. Write plain headlines of varied length that state what happens.
- **Em dashes** (`em-dash`, more than one per four beats): the em dash is a legitimate mark and its presence proves nothing, but density is a tell. Prefer periods, commas, colons.
- **Exclamation marks** (`exclamation`): hype by punctuation. Let the content carry the energy.
- **Review only:** "Here's the thing:" and other rhetorical-question openers; "X: The Y of Z" colon titles; Title Case On Every Line; parenthetical asides in every sentence; every sentence the same length.

---

## 4. 繁體中文用字 Tells (Traditional Chinese)

**套話詞** (`ai-phrase`)：賦能、助力、閉環、抓手、顆粒度、底層邏輯、全方位、全鏈路、一站式、深度融合、無縫、極致、開啟新篇章／新紀元、引領未來、值得注意的是、值得一提的是、總而言之、綜上所述、總的來說、不言而喻、革命性、顛覆性、降本增效、賽道、讓我們一起、揭開…面紗、在當今…時代、打造…生態／極致體驗、數位轉型浪潮。

**句型：**

- **比喻等式** (`metaphor-frame`)：「躲起來，是一場賭」「設計是一門藝術」「成長是一段旅程」「就像一場冒險」。聽起來有深度，其實沒有資訊。改成講實際會發生什麼：「被怪看見躲進衣櫃，牠會守在門口等你出來」。
- **標語節奏** (`slogan-cadence`，整份簡報層級：4 個以上、且占標題 40% 以上)：「死一次，只賠一夜。」「每條規矩，都驗過。」「今晚，換你上山。」這種「短句，短句。」的兩拍標題，加上句號製造戲劇停頓。偶爾一個無妨，整份都是就像廣告文案。標題寫成平實、長短不一的陳述，標題結尾不加句號。
- **對比腔** (`contrast-frame`)：「不是…，而是…」「不僅…更…」「與其說…不如說…」。偶爾一次無妨，整份簡報反覆出現就是 AI 腔。直接講結論。
- **制式轉折**（人工審查）：「首先、其次、最後」「從另一個角度來看」「更有意思的是」「老實說」。
- **翻譯腔**（人工審查）：「進行…的動作」「做出…的決定」「對於…來說」「透過…的方式」「基於…」。改成直接的動詞。
- **破折號「——」過多** (`em-dash`)。

**台灣讀者的在地化**（`lang` 設為 `zh-Hant` / `zh-TW` 時檢查）：

- **簡體字混入** (`zh-variant`)：這／这、們／们、視頻／视频…，模型在繁中輸出時常夾雜簡體字。
- **大陸用語** (`zh-term`)：

| 大陸用語 | 台灣用語 | 大陸用語 | 台灣用語 |
| :--- | :--- | :--- | :--- |
| 視頻 | 影片 | 數據庫 | 資料庫 |
| 信息 | 資訊 | 服務器 | 伺服器 |
| 默認 | 預設 | 互聯網 | 網際網路／網路 |
| 軟件／硬件 | 軟體／硬體 | 營銷 | 行銷 |
| 屏幕 | 螢幕 | 渠道 | 通路 |
| 網絡 | 網路 | 激活 | 啟用 |
| 鼠標 | 滑鼠 | 智能 | 智慧 |
| 文檔 | 文件 | 打印 | 列印 |
| 博客 | 部落格 | 菜單 | 選單 |
| 登錄 | 登入 | 算法 | 演算法 |
| 芯片 | 晶片 | 短信 | 簡訊 |
| 高清 | 高畫質 | 實時 | 即時 |
| 運營 | 營運 | 質量 | 品質 |
| 點贊 | 按讚 | 二維碼 | QR Code |
| U盤 | 隨身碟 | 移動端 | 行動裝置 |

- **全形／半形標點** (`zh-punct`)：中文句子內用全形「，。：；！？」，不要夾半形 `,` `.`。
- **中英文間距**（人工審查）：中文與英文、數字之間是否加空格，整份簡報擇一並保持一致。

---

## 5. Rewrite Recipes

| AI default | Rewritten |
| :--- | :--- |
| In today's fast-paced digital landscape, teams struggle to communicate effectively. | Tuesday, 11:40 PM: forty slides, and nobody will read past slide three. |
| Our platform seamlessly empowers teams to unlock their full potential. | Support tickets dropped from 140 to 52 a week after the March rollout. |
| It's not just a tool, it's a complete paradigm shift. | It replaces three tools your team already pays for. |
| Agenda / Overview | Why the 3 a.m. pager keeps ringing |
| Hiding is a gamble. | If a monster sees you hide, it waits outside the door. |
| 躲起來，是一場賭。 | 被怪看見躲進衣櫃，牠會守在門口等你出來 |
| 死一次，只賠一夜。 | 被抓到時，紙紮替身讓你重來那一夜 |
| Thank you! Questions? | Ship the fix this sprint: two engineers, nine days. |
| 在當今數位轉型的浪潮下，我們以 AI 賦能企業，打造一站式的極致體驗。 | 去年十一月，客服平均要 14 分鐘才回第一封信；導入後縮短到 3 分鐘。 |
| 這不僅僅是一個產品，更是一種全新的生活方式。 | 每天早上省下通勤前找資料的 20 分鐘。 |
| 總而言之，本方案具有革命性的意義。 | 只要做一件事：下週一前決定要不要試辦。 |

The pattern behind every rewrite: **a concrete scene, a real number, or a decision**, never an adjective about how good something is.

---

## 6. Human Checklist (what lint cannot catch)

Run this on the contact sheet (`snapshot.mjs`), the motion filmstrip (`filmstrip.mjs`) and the exported script (`script-export.mjs`):

0. **Cover test:** hide the protagonist (craft-and-direction §0) in every beat. If the deck still makes sense, it is a feature tour around the subject, not a story about it.
1. **Swap test:** replace the product or topic name with a competitor's. If the deck still works, it says nothing specific. Rewrite until it breaks.
2. **Source test:** point at every number. Can you name where it came from? If not, remove it or mark it `[missing]` and ask.
3. **Speaker test:** read every `say` aloud. Would *this* speaker say it, in this room? Cut any sentence that sounds like a press release.
4. **Glance test:** look at the contact sheet for five seconds. Do beats share one visual system *and* differ in composition? Any beat that looks like a template default?
5. **Claim test:** read only the `META.spine` claims in order, then only the headlines. Each reading must make the argument the deck maker agreed to as claims, without the body text, start where the audience is and end on the promise kept or the ask. A section that joins with "and also" is a list item (craft-and-direction §0.3).
6. **Motion test:** read `filmstrip.png` row by row. Does each motion help the audience read the beat in the right order, and would the beat be worse without it? Are there two or three moments where the content itself moves, and are they where the story turns? Does each beat change say how the two beats relate, without one effect repeating into a pattern? Does anything pass through a phone's bezel, a page's edge or another object mid-motion?
7. **Need-to-know test:** for every fact on stage, ask whether this audience would understand or act differently without it. Revision history, review rounds, tooling, and submission notes almost never pass.

---

## 7. Exceptions

Every lint rule here is a heuristic warning. When a hit is genuinely intentional (quoting a competitor's slogan, a deliberate storyboard prop, a Mainland-audience deck):

- On stage: `data-lint-allow="ai-phrase zh-term"` on the smallest enclosing element.
- In narration: `meta.lintAllow: ["contrast-frame"]` in the deck's `META` (applies deck-wide to `say`).
- For a Simplified Chinese or Mainland audience, set `lang` to `zh-Hans` / `zh-CN`; the Taiwan-specific checks (`zh-variant`, `zh-term`) then do not run.

---

## Sources

Research behind this list (November 2026). Treat model-specific tells as moving targets; they change with each model generation.

- [How to Make AI-Generated Slides That Don't Look Like AI Slop (Plus AI)](https://plusai.com/blog/how-to-make-ai-slides-that-dont-look-like-ai-slop)
- [Common AI presentation mistakes (Presentations.ai)](https://www.presentations.ai/blog/common-ai-presentation-mistakes)
- [SlideAudit: slide design flaw taxonomy (University of Washington, UIST)](https://faculty.washington.edu/wobbrock/pubs/uist-25.01.pdf)
- [9 Signs of AI Writing, Backed by Data (Pangram)](https://www.pangram.com/signs-of-ai-writing)
- [Which Signs of AI Writing Disengage People Most? (PRSA)](https://www.prsa.org/article/which-signs-of-ai-writing-disengage-people-most-APRIL26)
- [Researchers identify thousands of new tells in AI writing (Gizmodo)](https://gizmodo.com/this-matters-researchers-identify-thousands-of-new-tells-in-ai-writing-2000820447)
- [In defense of the em dash (Optimizely)](https://www.optimizely.com/field-notes/articles/in-defense-of-the-em-dash-and-everything-else-on-this-ai-tell-trial)
- [Anti AI slop ban list](https://github.com/Laith0003/ux-skill/wiki/Anti-AI-slop-ban-list.md)
- [AI slop in design (Venngage)](https://venngage.com/blog/ai-slop-in-design/)
- [簡報如何去除 AI 味（TechNews 科技新報）](https://technews.tw/2026/08/09/how-to-make-presentations-less-ai-like/)
- [別再讓 AI 寫出「機器感」（TechNews 科技新報）](https://technews.tw/2026/04/07/five-prompt-tips-to-eliminate-standard-syntax/)
- [AI 寫作風格特徵與避免方式（數位時代）](https://www.bnext.com.tw/article/89827/ai-writing-style-unique-features-avoiding-tips)
