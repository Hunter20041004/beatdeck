/**
 * Copy (wording) rules for spotting machine-default "AI tells" in deck text.
 * Shared by scripts/lint.mjs and documented in references/ai-tells.md.
 *
 * Every rule is a heuristic that produces a WARNING, never an error: a phrase can be
 * legitimate in context. Exempt stage text with data-lint-allow="<type>" on an element,
 * or narration deck-wide with meta.lintAllow: ["<type>"].
 */

/** Hollow, high-frequency LLM phrases (English). */
export const EN_PHRASES = [
  [/\bin today'?s (fast[- ]paced|digital|ever[- ]changing|rapidly[- ]evolving|modern|competitive)\b/i, "in today's fast-paced…"],
  [/\b(it'?s|it is) (important|worth|crucial|essential) (to note|noting|to remember|to recognize)\b/i, "it's important to note"],
  [/\bin conclusion\b/i, 'in conclusion'],
  [/\bdelv(e|es|ing)\b/i, 'delve'],
  [/\btapestry\b/i, 'tapestry'],
  [/\btestament to\b/i, 'a testament to'],
  [/\bunlock(s|ing)? (the |your )?(full |true )?(power|potential)\b/i, 'unlock the potential'],
  [/\bharness(es|ing)? the (full )?power\b/i, 'harness the power'],
  [/\bgame[- ]chang(er|ers|ing)\b/i, 'game-changer'],
  [/\brevolutioni[sz](e|es|ing)\b/i, 'revolutionize'],
  [/\bseamless(ly)?\b/i, 'seamless'],
  [/\bcutting[- ]edge\b/i, 'cutting-edge'],
  [/\bever[- ]evolving\b/i, 'ever-evolving'],
  [/\bnavigat(e|es|ing) the (complexities|complex|landscape|world)\b/i, 'navigate the complexities'],
  [/\bembark(s|ing)? on (a|an|this|our|your)\b/i, 'embark on a journey'],
  [/\bsupercharg(e|es|ed|ing)\b/i, 'supercharge'],
  [/\bunleash(es|ed|ing)?\b/i, 'unleash'],
  [/\bsynerg(y|ies|istic)\b/i, 'synergy'],
  [/\bparadigm shift\b/i, 'paradigm shift'],
  [/\bnext[- ]level\b/i, 'next-level'],
  [/\bin the (realm|world) of\b/i, 'in the realm of'],
  [/\blet'?s (dive|deep[- ]dive) in(to)?\b/i, "let's dive in"],
  [/\b(imagine|picture) a world\b/i, 'imagine a world'],
  [/\belevat(e|es|ing) (your|the)\b/i, 'elevate your'],
  [/\bempower(s|ing)?\b/i, 'empower'],
  [/\bholistic\b/i, 'holistic'],
  [/\bat the intersection of\b/i, 'at the intersection of'],
  [/\bthe future of [\w-]+ is (here|now)\b/i, 'the future of X is here'],
  [/\bstands? as a\b/i, 'stands as a'],
  [/\bplays? a (crucial|pivotal|vital|key) role\b/i, 'plays a pivotal role'],
];

/** Hollow, high-frequency LLM phrases (Chinese; traditional and simplified forms). */
export const ZH_PHRASES = [
  [/[賦赋]能/, '賦能'],
  [/助力/, '助力'],
  [/[閉闭][環环]/, '閉環'],
  [/抓手/, '抓手'],
  [/[顆颗]粒度/, '顆粒度'],
  [/底[層层][邏逻][輯辑]/, '底層邏輯'],
  [/全方位/, '全方位'],
  [/全[鏈链]路/, '全鏈路'],
  [/一站式/, '一站式'],
  [/深度融合/, '深度融合'],
  [/[無无]縫|[無无]缝/, '無縫'],
  [/極致|极致/, '極致'],
  [/新篇章|新紀元|新纪元/, '開啟新篇章／新紀元'],
  [/引[領领]未來|引[領领]未来/, '引領未來'],
  [/值得(注意|一提)的是/, '值得注意的是'],
  [/總而言之|总而言之|綜上所述|综上所述|總的來說|总的来说/, '總而言之／綜上所述'],
  [/不言而喻/, '不言而喻'],
  [/革命性|[顛颠]覆性/, '革命性／顛覆性'],
  [/降本增效/, '降本增效'],
  [/[賽赛]道/, '賽道'],
  [/[讓让]我[們们]一起/, '讓我們一起'],
  [/揭[開开].{0,8}面[紗纱]/, '揭開…面紗'],
  [/在(當今|当今|這個|这个|如今).{0,12}(時代|时代|世界|浪潮)/, '在當今…時代'],
  [/打造.{0,6}(生態|生态|閉環|闭环|極致|极致)/, '打造…生態／極致體驗'],
  [/數位轉型浪潮|数字化转型浪潮/, '數位轉型浪潮'],
];

/** Rhetorical "not X but Y" contrast frames, a dominant tell in current models. */
export const CONTRAST_FRAMES = [
  /\b(not|isn'?t|aren'?t|wasn'?t) (just|only|merely|simply)\b[^.!?]{0,80}?\b(but|it'?s|they'?re)\b/i,
  /\b(it|this|that)'?s not\b[^.!?]{1,60}[,;—–-]\s*(it|this|that)'?s\b/i,
  /\bit'?s not about\b[^.!?]{1,60}\bit'?s about\b/i,
  /[,—–]\s*(not|never) (a|an|the|just|another|merely)\b/i,
  /不是[^，。！？；]{1,24}[，,]?\s*而是/,
  /不[僅仅]([僅仅])?(是)?[^。！？]{1,24}更(是)?/,
  /與其說[^。！？]{1,24}不如說|与其说[^。！？]{1,24}不如说/,
];

/**
 * Internal process bookkeeping that belongs in commit logs or presenter notes, not on stage:
 * revision/iteration counts, review rounds, resubmission notes, who/which agents built it,
 * bug-fix tallies, commit hashes, source file paths.
 */
export const INTERNAL_PROCESS = [
  [/\b(after|through|over|across|took|in) \d+ (rounds?|iterations?|revisions?|rewrites?|tweaks?|adjustments?|versions?|drafts?|passes)\b/i, 'N rounds/iterations'],
  [/\b(round|iteration|revision|draft|pass) (\d+|one|two|three|four|five)\b/i, 'round N'],
  [/\b(re-?submitted|resubmission|re-?submit)\b/i, 'resubmission'],
  [/\bsub-?agents?\b/i, 'sub-agents'],
  [/\b(fixed|resolved|closed) \d+ (bugs?|issues?|tickets?|places?)\b/i, 'fixed N bugs'],
  [/\b(commit|PR|pull request|branch)\s*#?[0-9a-f]{3,}\b/i, 'commit/PR reference'],
  [/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}\b/, 'commit hash'],
  [/(^|[\s(（])[\w.-]+\/[\w./-]+\.(m?js|ts|py|md|json|ya?ml|sh|css)\b|\b[\w-]+\.(m?js|ts|py|sh)\b/, 'source file path'],
  [/(第\s*[一二三四五六七八九十\d]+\s*(輪|版|次|轮)|[一二三四五六七八九十兩两\d]+\s*(輪|轮|版|次))\s*(的)?\s*(調整|调整|修改|修正|優化|优化|迭代|審查|审查|改版|重做|試做|试做)/, '第 N 輪／N 次調整'],
  [/(調整|调整|修改|修正|優化|优化|迭代|改版|重做|審查|审查)(了|過|过)?\s*[一二三四五六七八九十兩两\d]+\s*(次|輪|轮|版)/, '調整了 N 次'],
  [/補交|补交|重新繳交|重新缴交/, '補交'],
  [/子代理|AI\s*分身/, '子代理／AI 分身'],
  [/依(照)?(老師|老师|助教|主管|評審|评审)(的)?(意見|意见|回饋|回馈|要求)/, '依老師意見修改'],
  [/(修正|修好|修了|清掉|改掉)[^。！？\n]{0,8}\d+\s*(處|处|個|个|條|条)/, '修了 N 處'],
];

/**
 * Metaphor equations that sound profound but carry no information:
 * 「躲起來，是一場賭」「設計是一門藝術」 / "Hiding is a gamble", "Growth is a journey".
 */
export const METAPHOR_FRAMES = [
  [/是一(場|场|種|种|門|门|段|趟|首|次)[一-鿿]{1,6}/, '「X 是一場／一種 Y」'],
  [/(就像|宛如|彷彿|仿佛|如同|好比)(是)?一(場|场|種|种|首|段|趟)/, '「就像一場 Y」'],
  [/\b(is|was|becomes|feels like|turns into) (a|an) (\w+ )?(gamble|journey|dance|art|bet|balancing act|marathon|puzzle|symphony|labyrinth|rollercoaster|love letter|game of)\b/i, '"X is a gamble/journey"'],
];

/** Placeholder text that should never reach an audience. */
export const PLACEHOLDERS = [
  [/\blorem ipsum\b/i, 'lorem ipsum'],
  [/\bTODO\b/, 'TODO'],
  [/\bTBD\b/, 'TBD'],
  [/\bX{2,}(\.X+)?\s?%/, 'XX%'],
  [/\[(company|company name|your name|name|product|client|insert[^\]]*|placeholder)\]/i, '[Company]'],
  [/\b(John|Jane) Doe\b/, 'John Doe'],
  [/\bAcme\b/, 'Acme'],
  [/某某|〇〇|○○|XXX/, '某某／〇〇／XXX'],
  [/\[\s*missing\s*[:：]/i, '[missing: …] (a fact still to fill in)'],
];

/** Topic labels used as headlines instead of a claim (agenda / thank-you slides). */
export const LABEL_HEADLINES = new Set([
  'agenda', 'overview', 'introduction', 'intro', 'background', 'summary', 'conclusion', 'conclusions',
  'key takeaways', 'takeaways', 'thank you', 'thanks', 'thank you for listening', 'questions',
  'any questions', 'q&a', 'qa', 'next steps', 'table of contents', 'contents', 'about us', 'our team',
  'the problem', 'the solution', 'problem', 'solution', 'outline',
  '議程', '目錄', '大綱', '前言', '背景', '簡介', '介紹', '總結', '結論', '結語', '謝謝', '謝謝聆聽',
  '感謝聆聽', '謝謝大家', '感謝大家', '問答', '問題與討論', 'q＆a', '下一步', '團隊介紹', '關於我們',
  '议程', '目录', '大纲', '简介', '介绍', '总结', '结论', '结语', '谢谢', '谢谢聆听', '感谢聆听', '问答',
]);

/**
 * Characters that exist only in Simplified Chinese (each maps to a different Traditional form),
 * restricted to common ones that never appear in correct Traditional text.
 */
export const SIMPLIFIED_ONLY = new Set(
  Array.from(
    '这们为发个说时对会来过还没进动现实开关题与业经产样头买卖见长门问间听书车东边从网络数应该让认识议设计质历员单联务处带热选择专转级区线约组织资讯报场标视频图习节软优显览简众传统观维护负责项预览页错误点击键盘电脑帮钟样汇总' +
      '计务师兴乐华请谢话语读写学记录论证创韩车轮级达运选适遗邮释销链锁问闭闻阅队阶际陆难雾韦顺须领频题风飞饭馆马驾验鱼鸟龙'
  )
);

/** Mainland-Chinese vocabulary that reads as foreign/AI-default in Taiwan Traditional Chinese. */
export const MAINLAND_TERMS = [
  ['視頻', '影片'], ['信息', '資訊'], ['默認', '預設'], ['軟件', '軟體'], ['硬件', '硬體'],
  ['屏幕', '螢幕'], ['網絡', '網路'], ['鼠標', '滑鼠'], ['文檔', '文件'], ['博客', '部落格'],
  ['數據庫', '資料庫'], ['服務器', '伺服器'], ['互聯網', '網際網路'], ['營銷', '行銷'], ['渠道', '通路'],
  ['激活', '啟用'], ['智能', '智慧'], ['打印', '列印'], ['菜單', '選單'], ['登錄', '登入'],
  ['算法', '演算法'], ['芯片', '晶片'], ['短信', '簡訊'], ['高清', '高畫質'], ['實時', '即時'],
  ['運營', '營運'], ['質量', '品質'], ['程序員', '工程師'], ['優質內容', '好內容'], ['點贊', '按讚'],
  ['二維碼', 'QR Code'], ['U盤', '隨身碟'], ['移動端', '行動裝置'], ['用戶體驗', '使用者體驗'],
];

/** @param {string} lang */
export function isTraditionalChinese(lang) {
  return /^zh-(hant|tw|hk|mo)\b/i.test(String(lang || ''));
}

function countMatches(re, text) {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  return (text.match(g) || []).length;
}

/**
 * Per-text checks (phrases, placeholders, script variant, mainland terms).
 * @param {string} text
 * @param {{ lang?: string }} opts
 * @returns {Array<{ type: string, message: string }>}
 */
export function checkText(text, { lang = '' } = {}) {
  const out = [];
  if (!text || !text.trim()) return out;

  const hits = [];
  for (const [re, label] of [...EN_PHRASES, ...ZH_PHRASES]) {
    if (re.test(text)) hits.push(label);
  }
  if (hits.length) out.push({ type: 'ai-phrase', message: `Stock AI phrasing: ${hits.map((h) => `"${h}"`).join(', ')}` });

  const metaphors = METAPHOR_FRAMES.filter(([re]) => re.test(text)).map(([, l]) => l);
  if (metaphors.length) {
    out.push({
      type: 'metaphor-frame',
      message: `Metaphor equation instead of information: ${metaphors.join(', ')}; say what actually happens`,
    });
  }

  const internal = INTERNAL_PROCESS.filter(([re]) => re.test(text)).map(([, l]) => l);
  if (internal.length) {
    out.push({
      type: 'internal-process',
      message: `Internal process detail the audience does not need: ${internal.join(', ')}; keep it in the beat's note or the changelog`,
    });
  }

  const ph = PLACEHOLDERS.filter(([re]) => re.test(text)).map(([, l]) => l);
  if (ph.length) out.push({ type: 'placeholder', message: `Placeholder text: ${ph.join(', ')}` });

  if (/^zh\b/i.test(String(lang || ''))) {
    const m = text.match(/[㐀-鿿][,;:!?]\s*[㐀-鿿]|[㐀-鿿]\.(?=[㐀-鿿])/);
    if (m) out.push({ type: 'zh-punct', message: `Half-width punctuation between CJK characters ("${m[0]}"); use full-width ，。：；！？` });
  }

  if (isTraditionalChinese(lang)) {
    const simp = Array.from(new Set(Array.from(text).filter((c) => SIMPLIFIED_ONLY.has(c))));
    if (simp.length) {
      out.push({ type: 'zh-variant', message: `Simplified characters in a Traditional Chinese deck: ${simp.slice(0, 12).join('')}` });
    }
    const terms = MAINLAND_TERMS.filter(([m]) => text.includes(m));
    if (terms.length) {
      out.push({
        type: 'zh-term',
        message: `Mainland vocabulary for a Taiwan audience: ${terms.map(([m, t]) => `${m}→${t}`).join(', ')}`,
      });
    }
  }
  return out;
}

/** @param {string} text */
export function countContrastFrames(text) {
  return CONTRAST_FRAMES.reduce((n, re) => n + countMatches(re, text || ''), 0);
}

/** Em dashes, counting a CJK "——" pair as one. @param {string} text */
export function countEmDashes(text) {
  return ((text || '').match(/—+/g) || []).length;
}

/** @param {string} text */
export function countExclamations(text) {
  return ((text || '').match(/[!！]+/g) || []).length;
}

/** @param {string} headline */
export function isLabelHeadline(headline) {
  const norm = String(headline || '')
    .toLowerCase()
    .replace(/[\s　]+/g, ' ')
    .replace(/^[\s\d.·:：、\-–—#]+/, '')
    .replace(/[\s.!?！？。:：]+$/, '')
    .trim();
  return norm.length > 0 && LABEL_HEADLINES.has(norm);
}

function normalizeForOverlap(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * Share of the narration's 4-grams that also appear in the on-stage text.
 * High overlap means the speaker would be reading the slide aloud.
 * @param {string} say
 * @param {string} stageText
 */
export function narrationOverlap(say, stageText) {
  const a = normalizeForOverlap(say);
  const b = normalizeForOverlap(stageText);
  if (a.length < 16 || !b) return 0;
  let total = 0;
  let hit = 0;
  for (let i = 0; i + 4 <= a.length; i += 1) {
    total += 1;
    if (b.includes(a.slice(i, i + 4))) hit += 1;
  }
  return total ? hit / total : 0;
}

/**
 * Two- or three-beat slogan headline: 「死一次，只賠一夜。」「每條規矩，都驗過。」 /
 * "Three lenses. Zero broken frames." One is fine; a deck full of them is the AI cadence.
 * @param {string} headline
 */
export function isSloganHeadline(headline) {
  const h = String(headline || '').replace(/\s+/g, ' ').trim();
  if (!h) return false;
  const cjk = (h.match(/[㐀-鿿]/g) || []).length;
  if (cjk >= h.replace(/\s/g, '').length * 0.5) {
    const parts = h.replace(/[。！!？?]+$/, '').split(/[，,、；;：:。！？]/).map((p) => p.trim()).filter(Boolean);
    return parts.length >= 2 && parts.length <= 3 && parts.every((p) => Array.from(p).length <= 8);
  }
  const sentences = h.split(/(?<=[^\d\s][.!?])\s*(?=[A-Z"“‘'])/).map((p) => p.trim()).filter(Boolean);
  return (
    sentences.length >= 2 &&
    sentences.length <= 3 &&
    sentences.every((p) => /[.!?]$/.test(p) && p.split(/\s+/).length <= 5)
  );
}
