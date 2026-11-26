import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { parseCliArgs } from './lib/browser.mjs';

function printUsage() {
  console.error('Usage: node scripts/bundle-share.mjs <deck.html> [--out deck-share.html]');
}

const MIME_MAP = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.json': 'application/json',
};

function isExternalOrSpecial(ref) {
  const trimmed = ref.trim();
  return (
    !trimmed ||
    trimmed.startsWith('#') ||
    /^(https?:|data:|blob:|mailto:|tel:|javascript:)/i.test(trimmed)
  );
}

function resolveLocalRef(ref, baseDir, contextLabel) {
  const cleanRef = ref.split('#')[0].split('?')[0].trim();
  let decodedRef = cleanRef;
  try {
    decodedRef = decodeURIComponent(cleanRef);
  } catch {
    decodedRef = cleanRef;
  }

  const decodedPath = path.resolve(baseDir, decodedRef);
  if (fs.existsSync(decodedPath)) {
    return decodedPath;
  }

  const rawPath = path.resolve(baseDir, cleanRef);
  if (fs.existsSync(rawPath)) {
    return rawPath;
  }

  throw new Error(`Missing local asset "${ref}" referenced in ${contextLabel} (${decodedPath})`);
}

function fileToDataUri(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_MAP[ext] || 'application/octet-stream';
  const base64 = fs.readFileSync(filePath).toString('base64');
  return `data:${mime};base64,${base64}`;
}

function inlineCssUrls(cssText, cssDir, contextLabel, visited = new Set()) {
  let out = cssText.replace(
    /@import\s+(?:url\(\s*(['"]?)([^'")\s]+)\1\s*\)|(['"])([^'"]+)\3)([^;]*);/gi,
    (match, _q1, uRef, _q2, sRef, mediaRaw) => {
      const ref = (uRef || sRef || '').trim();
      if (!ref || isExternalOrSpecial(ref)) return match;
      const importedPath = resolveLocalRef(ref, cssDir, contextLabel);
      if (visited.has(importedPath)) {
        return `/* skipped cyclic @import: ${path.basename(importedPath)} */`;
      }
      const nextVisited = new Set(visited);
      nextVisited.add(importedPath);
      const importedCss = fs.readFileSync(importedPath, 'utf8');
      const inlined = inlineCssUrls(importedCss, path.dirname(importedPath), importedPath, nextVisited);
      const media = (mediaRaw || '').trim();
      return media ? `@media ${media} {\n${inlined}\n}` : inlined;
    }
  );

  out = out.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (match, _quote, rawRef) => {
    const ref = rawRef.trim();
    if (isExternalOrSpecial(ref)) return match;
    const assetPath = resolveLocalRef(ref, cssDir, contextLabel);
    const dataUri = fileToDataUri(assetPath);
    return `url("${dataUri}")`;
  });

  return out;
}

function parseAttributes(attrText) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(attrText))) {
    const name = m[1].toLowerCase();
    const val = m[2] ?? m[3] ?? m[4] ?? '';
    attrs[name] = val;
  }
  return attrs;
}

function inlineAttrValue(tagText, attrNameRegex, baseDir, contextLabel) {
  return tagText.replace(
    new RegExp(`(^|\\s)(${attrNameRegex})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'gi'),
    (match, lead, attrName, q1, q2, q3) => {
      const val = q1 ?? q2 ?? q3 ?? '';
      if (!val || isExternalOrSpecial(val)) return match;
      const assetPath = resolveLocalRef(val, baseDir, contextLabel);
      const dataUri = fileToDataUri(assetPath);
      return `${lead}${attrName}="${dataUri}"`;
    }
  );
}

function inlineSrcsetValue(tagText, baseDir, contextLabel) {
  return tagText.replace(
    /(^|\s)(srcset)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
    (match, lead, attrName, q1, q2) => {
      const rawVal = q1 ?? q2 ?? '';
      if (!rawVal.trim()) return match;
      const entries = rawVal
        .split(',')
        .map((entry) => {
          const trimmed = entry.trim();
          if (!trimmed) return '';
          const parts = trimmed.split(/\s+/);
          const urlPart = parts[0];
          if (!urlPart || isExternalOrSpecial(urlPart)) return trimmed;
          const assetPath = resolveLocalRef(urlPart, baseDir, contextLabel);
          const dataUri = fileToDataUri(assetPath);
          return [dataUri, ...parts.slice(1)].join(' ');
        })
        .filter(Boolean);
      return `${lead}${attrName}="${entries.join(', ')}"`;
    }
  );
}

function checkNoUnresolvedRefs(maskedHtml, inlinedStyles) {
  const unresolved = [];

  const attrRe = /<(link|script|img|source|audio|video|image)\b([^>]*)>/gi;
  let m;
  while ((m = attrRe.exec(maskedHtml))) {
    const tag = m[1].toLowerCase();
    const attrs = parseAttributes(m[2]);
    const candidates = [attrs.src, attrs.href, attrs['xlink:href'], attrs.poster].filter(Boolean);
    for (const ref of candidates) {
      if (!isExternalOrSpecial(ref)) {
        unresolved.push(`<${tag}> -> ${ref}`);
      }
    }
    if (attrs.srcset) {
      for (const entry of attrs.srcset.split(',')) {
        const urlPart = entry.trim().split(/\s+/)[0];
        if (urlPart && !isExternalOrSpecial(urlPart)) {
          unresolved.push(`<${tag} srcset> -> ${urlPart}`);
        }
      }
    }
  }

  for (const css of inlinedStyles) {
    const urlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
    let um;
    while ((um = urlRe.exec(css))) {
      const ref = um[2].trim();
      if (!isExternalOrSpecial(ref)) {
        unresolved.push(`CSS url() -> ${ref}`);
      }
    }
  }

  return unresolved;
}

function bundleDeck(inputPath) {
  const absInput = path.resolve(inputPath);
  if (!fs.existsSync(absInput)) {
    throw new Error(`Deck file not found: ${absInput}`);
  }
  const deckDir = path.dirname(absInput);
  let html = fs.readFileSync(absInput, 'utf8');

  const nonce = crypto.randomBytes(6).toString('hex');
  const tokens = [];
  const maskToken = (content) => {
    const id = tokens.length;
    tokens.push(content);
    return `__BD_MASK_${nonce}_${id}__`;
  };

  // 1. Mask HTML comments first so commented-out tags are never touched or checked
  html = html.replace(/<!--[\s\S]*?-->/g, (comment) => maskToken(comment));

  // 2. Inline external <script src="..."> and mask all <script> blocks
  html = html.replace(/<script\b([^>]*?)>([\s\S]*?)<\/script>/gi, (fullMatch, attrText, body) => {
    const attrs = parseAttributes(attrText);
    if (attrs.src && !isExternalOrSpecial(attrs.src)) {
      const scriptPath = resolveLocalRef(attrs.src, deckDir, absInput);
      const jsText = fs.readFileSync(scriptPath, 'utf8').replace(/<\/script/gi, '<\\/script');
      const cleanedAttrs = attrText.replace(/(^|\s)src\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, '');
      return maskToken(`<script${cleanedAttrs}>\n${jsText}\n</script>`);
    }
    return maskToken(fullMatch);
  });

  // 3. Inline CSS url(...) inside <style> blocks and mask them
  const inlinedStyles = [];
  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_fullMatch, attrText, cssText) => {
    const inlined = inlineCssUrls(cssText, deckDir, absInput);
    inlinedStyles.push(inlined);
    return maskToken(`<style${attrText}>${inlined}</style>`);
  });

  // 4. Inline <link rel="stylesheet" href="..."> and icon/asset <link>
  html = html.replace(/<link\b([^>]*)>/gi, (fullMatch, attrText) => {
    const attrs = parseAttributes(attrText);
    const href = attrs.href;
    if (!href || isExternalOrSpecial(href)) return fullMatch;

    const rel = (attrs.rel || '').toLowerCase();
    const assetPath = resolveLocalRef(href, deckDir, absInput);
    if (rel.split(/\s+/).includes('stylesheet')) {
      const rawCss = fs.readFileSync(assetPath, 'utf8');
      const inlinedCss = inlineCssUrls(rawCss, path.dirname(assetPath), assetPath, new Set([assetPath]));
      inlinedStyles.push(inlinedCss);
      const mediaAttr = attrs.media ? ` media="${attrs.media}"` : '';
      return maskToken(`<style${mediaAttr}>\n${inlinedCss}\n</style>`);
    }

    return inlineAttrValue(fullMatch, 'href', deckDir, absInput);
  });

  // 5. Base64-encode local <img/source/audio/video> src, srcset, and poster attributes
  html = html.replace(/<(img|source|audio|video)\b([^>]*)>/gi, (fullMatch) => {
    let updated = inlineAttrValue(fullMatch, 'src', deckDir, absInput);
    updated = inlineAttrValue(updated, 'poster', deckDir, absInput);
    updated = inlineSrcsetValue(updated, deckDir, absInput);
    return updated;
  });

  // 6. Base64-encode local SVG <image href="..." / xlink:href="...">
  html = html.replace(/<image\b([^>]*)>/gi, (fullMatch) => {
    return inlineAttrValue(fullMatch, '(?:xlink:)?href', deckDir, absInput);
  });

  // 7. Inline CSS url(...) inside style="..." attributes
  html = html.replace(/(^|\s)style\s*=\s*("([^"]*)"|'([^']*)')/gi, (fullMatch, lead, _q, dVal, sVal) => {
    const val = dVal ?? sVal ?? '';
    if (!/url\(/i.test(val)) return fullMatch;
    const inlined = inlineCssUrls(val, deckDir, absInput);
    inlinedStyles.push(inlined);
    const quote = dVal !== undefined ? '"' : "'";
    const escaped = quote === '"' ? inlined.replace(/"/g, '&quot;') : inlined.replace(/'/g, '&#39;');
    return `${lead}style=${quote}${escaped}${quote}`;
  });

  const unresolved = checkNoUnresolvedRefs(html, inlinedStyles);
  if (unresolved.length > 0) {
    throw new Error(`Unresolved local references remain:\n  - ${unresolved.join('\n  - ')}`);
  }

  // Restore masked comments, <script>, and <style> blocks
  const restoreRe = new RegExp(`__BD_MASK_${nonce}_(\\d+)__`, 'g');
  html = html.replace(restoreRe, (_m, id) => tokens[Number(id)]);

  return html;
}

function main() {
  const { positional, flags } = parseCliArgs(process.argv.slice(2));
  if (positional.length === 0) {
    printUsage();
    process.exit(1);
  }

  const inputPath = path.resolve(positional[0]);
  const parsed = path.parse(inputPath);
  const defaultOut = path.join(parsed.dir, `${parsed.name}-share.html`);
  const outPath = path.resolve(String(flags.out || defaultOut));

  const bundled = bundleDeck(inputPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, bundled, 'utf8');

  const sizeKB = (Buffer.byteLength(bundled, 'utf8') / 1024).toFixed(1);
  console.log(`BUNDLE PASS (${sizeKB} KB self-contained HTML) -> ${outPath}`);
}

main();
