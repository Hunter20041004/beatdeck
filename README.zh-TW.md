# Beatdeck

**像拍片一樣做簡報，一份 HTML 直接打通現場演講、講稿、分鏡 PDF 與 60fps 影片。**  
這是一套開源的 Agent Skill 與無頭瀏覽器（Headless Chromium）工具組，教 AI 用「單一視覺世界＋無框卡片構圖＋高完成度主視覺製作＋節拍（Beat）敘事」打造電影感 HTML 簡報，徹底告別千篇一律的投影片卡片套版。

---

## 跟傳統簡報、影片工具有什麼不同？

| | 傳統投影片（PPT / 簡報生成器） | 程式化影片框架（Remotion） | Beatdeck |
| :--- | :--- | :--- | :--- |
| **視覺結構** | 一頁頁割裂的方框與條列式清單 | React 時間軸元件與建置流程 | 每個主題自創一個 `1920×1080` 連續視覺舞台與無卡片構圖 |
| **製作單位** | 靜態頁面排版 | 逐幀撰寫 JSX 動畫 | 敘事節拍（`BEATS`）搭配 `at()` 節拍內動態編排 |
| **風格與主視覺** | 制式套版主題與預設轉場 | 手動刻寫元件動畫 | 先對齊 **2–3 種視覺世界提案** ＋ **主視覺精雕關卡** ＋ 3 階動態強度 |
| **單一資料來源** | 投影片與講稿分開寫，改完就不同步 | 只能輸出影片，無法直接上台簡報 | 同一份 HTML 同時產出現場簡報、備忘錄、講稿、PDF、分享檔與 MP4 |
| **執行環境** | 辦公軟體或雲端簡報服務 | Node + 打包器 + React 生態系 | 純原生 HTML/CSS/JS ＋ Playwright Chromium（輸出 MP4 時另需 `ffmpeg`） |

### v1.6 新增亮點：適合內容的動態

- **預設克制**：v1.5 加了很多特效，結果簡報把每一種都用上，看起來很廉價。現在先依簡報的**用途**決定動態基調（提案、研究報告、產品展示、故事、教學、遊戲發表），大部分頁面保持安靜，特效只留給一兩個「招牌時刻」。見 [`references/craft-and-direction.md`](references/craft-and-direction.md) §2。
- **安靜的新動作**：`rise`（小幅上移加淡入，長而柔的減速）、`unveil`（文字從自己的遮罩裡升起）、`focus`（其他內容淡下去，只留重點）。大部分頁面應該用這些。
- **新換頁 `dip`**：先淡出再淡入，中間經過背景色，兩頁內容不會疊在一起。
- **高級感的預設值**：換頁預設為 720 毫秒的 `dip`、柔和的減速曲線、不會彈跳的預設彈簧，`stamp` 與 `shake` 也變得更收斂。
- **檢查工具改抓「用太多」**：`motion-accent-overuse`（太多頁用重點特效）、`motion-busy`（一頁裡特效互相打架）、`motion-bounce`（到處彈跳）、`motion-travel`（元素從很遠飛進來）、`transition-variety`（花俏換頁太多種），另外 `motion-no-signature` 提醒長簡報至少要有一個亮點。v1.5 那四個鼓勵「更多變化」的警告已移除。
- **`upgrade-runtime.mjs`**：把舊簡報升級到新版執行環境，不動到設計。

### v1.5 新增亮點：動態設計更多元

- **換頁不再只有淡入淡出**：骨架內建 11 種換頁方式（硬切、淡入、推移、覆蓋、揭開、擦除、光圈、穿越放大、模糊對焦、共用元素接續、鏡頭平移），每一拍可用 `transition` 指定，倒退時自動反向播放，舊頁會帶著最後畫面離場。
- **新增動畫工具**：彈簧回彈 `spring`、多種錯開順序 `stagger`（由中心、兩端、可重現的隨機）、逐字拆分 `splitText`、遮罩擦除 `wipe`、光圈 `iris`、蓋章 `stamp`＋震動 `shake`、劃線 `strike`、沿路徑移動 `followPath`、路徑變形 `morph`、游標點擊 `cursor`、待機循環 `ambient`，以及 `data-depth` 景深視差與 `data-match` 共用元素。全部在 `?still` 下直接定格，PDF 與錄影照常運作。
- **「動態性格」納入視覺方向提案**：依主題材質決定怎麼動（紙本用擦除與蓋章、機械用硬彈簧、電影用對焦與硬切），每份簡報挑 2–3 種換頁加一個招牌動作。見 [`references/craft-and-direction.md`](references/craft-and-direction.md) §2。
- **看得到動態**：新增 `filmstrip.mjs`，把每一拍在不同時間點的畫面排成膠捲，審查時第一次能真的看到動畫本身，不只是最後定格。
- **lint 抓動態單調**：新增 `motion-flat`（幾乎每拍都只是淡入上浮）、`motion-repeat`（連續多拍同一種動作）、`motion-one-ease`（全部同一條緩動曲線）、`transition-monotony`（換頁方式幾乎都一樣）四種警告；`ai-tells.md` 也補上動態版的 AI 通病清單。
- **新示範簡報**：[`examples/motion-gallery/deck.html`](examples/motion-gallery/deck.html) 用 12 拍各示範一種換頁和一個動作，以及適合的時機。
- **修正錄影中 `draw`、`countUp`、`typewriter` 等逐幀動畫變得極慢的問題**（慢動作時鐘把時間縮放算了兩次）。

### v1.4 新增亮點：AI 痕跡防護

- **整理成冊的「AI 簡報通病」清單**：[`references/ai-tells.md`](references/ai-tells.md) 涵蓋：
  - **視覺**：紫藍漸層、毛玻璃、emoji 圖示、文字牆、「議程／謝謝聆聽」頁
  - **內容結構**：查無出處的數字、虛構人物、講稿照念投影片
  - **英文用字**：套話與「not X, but Y」句型
  - **中文用字**：賦能、助力、打造極致體驗等套話，以及「不是…而是…」對比腔
  - **台灣在地化**：簡體字混入、大陸用語、全形標點

  每一條都附上「改成怎麼做」。
- **lint 直接把關**：新增 15 種警告，同時檢查畫面文字與每一拍的 `say` 講稿；示範簡報本身也已修到能通過 `--strict`。
- **「文字口吻」納入視覺方向提案**：提案時要說明由誰來講、用什麼語氣、哪些詞絕對不說；審查最後還有 5 題人工檢查（替換、出處、講者、一眼、主張），補上 lint 判斷不了的部分。

### v1.3 新增亮點

- **做完要「看得到」**：新增 `snapshot.mjs`，把每一拍輸出成 PNG 並拼成附標籤的 `contact-sheet.png` 總覽圖；`--raw` 可單獨渲染主視覺頁面，讓「主視覺獨立檢查」與「觀眾視角審查」真的有圖可看，不再靠想像。
- **懂設計的 lint**：`lint.mjs` 新增設計警告：卡片外殼（邊框盒過密）、卡片套卡片、emoji 當圖示、**文字互相重疊**、連續兩拍版型重複，以及骨架佔位場景未替換。`--strict` 讓警告直接判定失敗，`--json` 輸出給 agent 解析，刻意的例外可用 `data-lint-allow="<type>"` 標記。
- **只含介面規範的骨架**：`new-deck.mjs` 產生不帶任何視覺風格、但已完整串好 `window.__beatdeck` v1.0（鏡頭、講者備忘、PiP 安全區、快捷鍵，以及會在 `?still` 自動定格的 `at`/`animate`/`draw`/`countUp`/`typewriter` 輔助函式）的簡報檔，力氣留給視覺世界，不必每次重寫介面規範。
- **更穩健的 CLI**：Chromium 依序使用 `BEATDECK_CHROMIUM` → Playwright 內建版本 → 同一 Playwright 快取中的其他版本，版本不符時給清楚提示，不再直接失敗。
- **更精簡的 `SKILL.md`**：主檔只留原則與分關卡的工作流程，細節移到 `references/`，並擴充觸發詞（含「簡報」「投影片」）。

### v1.2 新增亮點

- **徹底禁用「預設 AI 卡片簡報外殼」與 5 種無卡片構圖原型**：明確禁止每頁都套用「頂部圓點小標＋全寬橫線＋四角裁切線＋邊框卡片網格」的套版外殼，改以 **5 種無卡片結構構圖**靈活切換——留白畫布＋單一主角、滿版場景／建築剖面、真實產品視窗＋細線標註、實體印刷跨頁／底片接觸表，以及無框大字非對稱排版。
- **強制新增「主視覺精雕關卡（Hero Asset Craft Pass）」**：在視覺提案確認後、組裝整份簡報前，先獨立完成並於 `1920×1080` 檢視主視覺，杜絕一邊寫兩千行程式一邊草率畫方塊充數：
  - **Route A（真實產品、遊戲與硬體）**：先收集或擷取真實高畫質畫面／渲染圖／照片，放大佔滿舞台 `65–85%` 並搭配極細 SVG 引線標註，絕不用簡陋 CSS/SVG 線框圖取代真實畫面。
  - **Route B（無截圖的概念提案、課堂報告與研究簡報）**：從 4 種高工藝無截圖路線擇一製作——建築／實體剖面插畫、多漸層動態角色、擬真實體印刷檔案（公文／帳冊／票券），或滿版編輯型資料視覺化，並須通過 **3 層質感門檻**（準確輪廓結構、網點／斜線／漸層／紙張肌理著色、環境與刻度微細節）。
- **承襲 v1.1 核心工作流與時間軸編排**：製作前提出 **2–3 個專屬視覺世界方向**、3 階動態強度（`Measured` / `Choreographed` / `Kinetic`），以及支援 `?still` 即時定格與 `record-video.mjs` 虛擬時鐘縮放的 `at(ms, fn, { liveOnly })` 節拍內動態編排。

---

## 快速安裝

下載 `beatdeck`、在本機安裝 Playwright Chromium，再建立符號連結到你的 AI Coding Agent 技能目錄：

```bash
git clone https://github.com/Hunter20041004/beatdeck.git
cd beatdeck
npm install
npx playwright install chromium
```

> **提醒：** 請務必在每台要執行工具的電腦上於技能目錄內執行 `npm install && npx playwright install chromium`；切勿直接跨機複製 `node_modules/` 或漏裝套件，否則 CLI 工具將無法啟動 Chromium。若環境已內建 Chromium，可用 `BEATDECK_CHROMIUM=/path/to/chrome` 指定。

### 各工具安裝路徑

- **Antigravity**：
  ```bash
  mkdir -p ~/.gemini/config/skills
  ln -s "$(pwd)" ~/.gemini/config/skills/beatdeck
  ```
- **Claude Code**：
  ```bash
  mkdir -p ~/.claude/skills
  ln -s "$(pwd)" ~/.claude/skills/beatdeck
  ```
- **Codex / 共用 Agent Skills 目錄**：
  ```bash
  mkdir -p ~/.agents/skills ~/.codex/skills
  ln -s "$(pwd)" ~/.agents/skills/beatdeck
  ln -s "$(pwd)" ~/.codex/skills/beatdeck
  ```
- **Cursor**：
  ```bash
  # 全域安裝
  mkdir -p ~/.cursor/skills
  ln -s "$(pwd)" ~/.cursor/skills/beatdeck

  # 或單一專案安裝（在專案根目錄執行）
  mkdir -p .cursor/skills
  ln -s /path/to/beatdeck .cursor/skills/beatdeck
  ```

> 裝好後，只要請 AI 幫你做簡報、Demo 導覽、產品介紹或技術分享，它就會依照 `SKILL.md` 先釐清受眾與真實素材、對齊無卡片視覺方向、先過關主視覺精雕再撰寫 `BEATS`，並用無頭瀏覽器 Chromium 檢查排版後才交件。

---

## 預覽示範簡報

直接用瀏覽器打開內附的 12 拍示範簡報 `examples/beatdeck-intro/deck.html`，或執行 CLI 工具實測：

```bash
# macOS 直接開啟
open examples/beatdeck-intro/deck.html

# 或啟動本地靜態伺服器
npx serve .
# 開啟 http://localhost:3000/examples/beatdeck-intro/deck.html
```

### 現場簡報快捷鍵

- `ArrowRight` / `Space` / `PageDown` / 點擊畫面右側 75%：下一拍
- `ArrowLeft` / `PageUp` / `Backspace` / 點擊畫面左側 25%：上一拍
- `Home` / `End`：跳至第一拍 / 最後一拍
- `N`：開關講者備忘錄（顯示章節、`say` 講稿、預估秒數）
- `C`：開關右下角 `400×300` 講者視訊子母畫面安全區（PiP Safe Zone）
- `F`：切換全螢幕

### 網址模式參數

- `?p=N`：直接跳至第 `N` 拍（從 1 開始）
- `?still`：關閉所有過場動畫並隱藏操作介面與字幕，直接定格截圖
- `?video`：錄影模式，隱藏操作介面但保留 `#stage` 與 `#subtitle` 字幕層
- `?bare`：純舞台模式（連 `#subtitle` 一併隱藏；搭配 `?still&bare` 可產出乾淨分鏡縮圖）

---

## CLI 工具指令總覽

從任意專案工作目錄執行時，請將 `<skill-dir>` 換成放置 `SKILL.md` 的資料夾路徑（需 Node.js >= 20）：

```bash
# 0. 產生已串好完整介面規範、不含視覺風格的簡報骨架
node <skill-dir>/scripts/new-deck.mjs <path/to/deck.html> [--title "簡報標題"] [--lang zh-Hant] [--beats 6 | --ids a,b,c] [--force]

# 1. 版面與介面規範檢查（零 console error、零破圖、零超框、零中英文意外斷行）＋設計警告
node <skill-dir>/scripts/lint.mjs <path/to/deck.html> [--strict] [--json] [--motion=false]

# 1b. 輸出每拍 PNG 與總覽圖（加 --raw 則單獨渲染主視覺頁面）
node <skill-dir>/scripts/snapshot.mjs <path/to/deck.html> [--beats 1,3-5] [--cols 4] [--bare] [--out dir]
node <skill-dir>/scripts/snapshot.mjs <path/to/hero.html> --raw [--out dir]

# 1c. 動態膠捲：每一拍在 0～2.6 秒間的多個時間點各截一張，檢查動畫本身
node <skill-dir>/scripts/filmstrip.mjs <path/to/deck.html> [--beats 2-4] [--times 0,120,280,500,900,1500,2600] [--slow 4] [--out dir]

# 1d. 把舊簡報升級到新版執行環境（不動設計）
node <skill-dir>/scripts/upgrade-runtime.mjs <path/to/deck.html> [--out new.html]

# 2. 從 BEATS 匯出含時間軸與講者統計的 Markdown 講稿（未指定 --out 時直接輸出至 stdout）
node <skill-dir>/scripts/script-export.mjs <path/to/deck.html> [--out script.md] [--rate 3.6]

# 3. 匯出 1920x1080 簡報 PDF 或多欄分鏡表（Storyboard）PDF（預設輸出 ./deck.pdf 或 ./storyboard.pdf）
node <skill-dir>/scripts/pdf-export.mjs <path/to/deck.html> [--mode slides|storyboard] [--out deck.pdf] [--cols 2]

# 4. 將本機 CSS、JS、字型與圖片內嵌為單一可離線分享的 HTML 檔（預設輸出 <deckDir>/<name>-share.html）
node <skill-dir>/scripts/bundle-share.mjs <path/to/deck.html> [--out deck-share.html]

# 5. 以虛擬慢動作時鐘錄製不掉幀的 60fps H.264 MP4（未加 --frames-only 時需安裝 ffmpeg）
node <skill-dir>/scripts/record-video.mjs <path/to/deck.html> [--out deck.mp4] [--plan plan.json] [--fps 60] [--slow 3] [--audio track.wav] [--frames-only]
```

在 `beatdeck` 目錄內直接用示範檔試跑：

```bash
node ./scripts/lint.mjs examples/beatdeck-intro/deck.html --strict
node ./scripts/snapshot.mjs examples/beatdeck-intro/deck.html --out /tmp/beatdeck-snaps
node ./scripts/filmstrip.mjs examples/motion-gallery/deck.html --beats 2-5 --out /tmp/beatdeck-motion
node ./scripts/new-deck.mjs /tmp/my-talk/deck.html --title "我的簡報" --lang zh-Hant --ids opening,shift,proof
node ./scripts/script-export.mjs examples/beatdeck-intro/deck.html --out /tmp/beatdeck-script.md
node ./scripts/pdf-export.mjs examples/beatdeck-intro/deck.html --mode storyboard --cols 2 --out /tmp/beatdeck-storyboard.pdf
node ./scripts/bundle-share.mjs examples/beatdeck-intro/deck.html --out /tmp/beatdeck-share.html
```

---

## 專案結構

- `SKILL.md` — AI Agent Skill 核心指引與工作流程
- `references/craft-and-direction.md` — 無卡片視覺構圖、主視覺精雕關卡、節拍敘事、字體斷行控制與三視角審查規範
- `references/ai-tells.md` — 視覺與用字的 AI 痕跡清單（英文＋繁體中文）、改寫範例與人工檢查清單
- `references/stage-contract.md` — `window.__beatdeck` v1.0 執行期介面規範
- `references/export-and-recording.md` — CLI 參數細節與自訂 `--plan` 時間表格式
- `scripts/` — 骨架產生器、Chromium 檢查器、快照與總覽圖、講稿匯出、PDF 匯出、單檔打包與 60fps 錄影工具
- `templates/skeleton.html` — `new-deck.mjs` 使用的無風格執行期骨架
- `examples/beatdeck-intro/deck.html` — 符合 `window.__beatdeck` v1.0 介面規範的 12 拍示範簡報
- `examples/motion-gallery/deck.html` — 動態目錄：每拍示範一種換頁和一個動作，以骨架製作
- `tests/e2e.test.mjs` — 端對端測試套件（`npm test`）

---

## 授權條款

[MIT](LICENSE) — Copyright (c) 2026 Hunter Tseng
