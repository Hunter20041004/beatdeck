# Beatdeck

**像拍片一樣做簡報，一份 HTML 直接打通現場演講、講稿、分鏡 PDF 與 60fps 影片。**  
這是一套開源的 Agent Skill 與無頭瀏覽器（Headless Chromium）工具組，教 AI 用「單一視覺世界＋節拍（Beat）敘事」製作電影感 HTML 簡報，而不是套用千篇一律的投影片模板。

---

## 跟傳統簡報、影片工具有什麼不同？

| | 傳統投影片（PPT / 簡報生成器） | 程式化影片框架（Remotion） | Beatdeck |
| :--- | :--- | :--- | :--- |
| **視覺結構** | 一頁頁割裂的方框與條列式清單 | React 時間軸元件與建置流程 | 每個主題自創一個 `1920×1080` 連續視覺舞台 |
| **製作單位** | 靜態頁面排版 | 逐幀撰寫 JSX 動畫 | 敘事節拍（`BEATS`）搭配 `at()` 節拍內動態編排 |
| **風格與動態** | 制式套版主題與預設轉場 | 手動刻寫元件動畫 | 製作前先提出 **2–3 種專屬視覺世界提案** ＋ 3 階動態強度（`Measured` / `Choreographed` / `Kinetic`） |
| **單一資料來源** | 投影片與講稿分開寫，改完就不同步 | 只能輸出影片，無法直接上台簡報 | 同一份 HTML 同時產出現場簡報、備忘錄、講稿、PDF、分享檔與 MP4 |
| **執行環境** | 辦公軟體或雲端簡報服務 | Node + 打包器 + React 生態系 | 純原生 HTML/CSS/JS ＋ Playwright Chromium（輸出 MP4 時另需 `ffmpeg`） |

### v1.1 新增亮點

- **動手前先對齊視覺提案**：寫 `BEATS` 或 CSS 之前，先針對主題提出 **2–3 個截然不同的視覺世界方向**（空間隱喻、色彩、字體與視覺標誌），確認方向再動工。
- **3 階動態強度分級**：依主題與場合選用 `Measured`（沉穩建築／編輯感）、`Choreographed`（多步驟接力揭示與 SVG 描線），或 `Kinetic`（模擬游標互動、機械翻牌／蓋章與微動態）。
- **節拍內微導演時間軸（`at(ms, fn, { liveOnly })`）**：在同一拍內編排分段進場、跨拍延續的舞台主角、數字滾動與打字機效果；`?still` 截圖時自動定格於完成態，`record-video.mjs` 錄影時亦可隨虛擬時鐘精準縮放。

---

## 快速安裝

下載 `beatdeck`、在本機安裝 Playwright Chromium，再建立符號連結到你的 AI Coding Agent 技能目錄：

```bash
git clone https://github.com/Hunter20041004/beatdeck.git
cd beatdeck
npm install
npx playwright install chromium
```

> **提醒：** 請務必在每台要執行工具的電腦上於技能目錄內執行 `npm install && npx playwright install chromium`；切勿直接跨機複製 `node_modules/` 或漏裝套件，否則 CLI 工具將無法啟動 Chromium。

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

> 裝好後，只要請 AI 幫你做簡報、Demo 導覽、產品介紹或技術分享，它就會依照 `SKILL.md` 先釐清受眾與真實素材、設計專屬視覺舞台、撰寫 `BEATS`，並用無頭瀏覽器 Chromium 檢查排版後才交件。

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
# 1. 版面與介面規範檢查（零 console error、零破圖、零超框、零中英文意外斷行）
node <skill-dir>/scripts/lint.mjs <path/to/deck.html>

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
node ./scripts/lint.mjs examples/beatdeck-intro/deck.html
node ./scripts/script-export.mjs examples/beatdeck-intro/deck.html --out /tmp/beatdeck-script.md
node ./scripts/pdf-export.mjs examples/beatdeck-intro/deck.html --mode storyboard --cols 2 --out /tmp/beatdeck-storyboard.pdf
node ./scripts/bundle-share.mjs examples/beatdeck-intro/deck.html --out /tmp/beatdeck-share.html
```

---

## 專案結構

- `SKILL.md` — AI Agent Skill 核心指引與工作流程
- `references/craft-and-direction.md` — 單一視覺世界設計、節拍敘事、字體斷行控制與三視角審查規範
- `references/stage-contract.md` — `window.__beatdeck` v1.0 執行期介面規範
- `references/export-and-recording.md` — CLI 參數細節與自訂 `--plan` 時間表格式
- `scripts/` — Chromium 檢查器、講稿匯出、PDF 匯出、單檔打包與 60fps 錄影工具
- `examples/beatdeck-intro/deck.html` — 符合 `window.__beatdeck` v1.0 介面規範的 12 拍示範簡報
- `tests/e2e.test.mjs` — 端對端測試套件（`npm test`）

---

## 授權條款

[MIT](LICENSE) — Copyright (c) 2026 Hunter Tseng
