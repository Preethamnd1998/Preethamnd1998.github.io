// Detects drift between an article's Markdown source (in the article repository) and its copy in data/articles.json.
// Pure: no file I/O. The Markdown lives in another repository, so the site cannot render from it in its own checkout.
import { createHash } from 'node:crypto';

/** @param {string} markdown @returns {string} `sha256:<hex>`, matching an article's `sourceHash` in data/articles.json. */
export function sourceHash(markdown) {
  return `sha256:${createHash('sha256').update(markdown).digest('hex')}`;
}

/** Strip inline Markdown down to the visible text. @param {string} s */
export function plain(s) {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reduce article Markdown to the ordered text units the site renders: for each `##` section its heading, then each
 * paragraph and list item. Ignores the `#` title, the leading draft blockquote, `###` headings, and the
 * `Artifacts`/`References` sections (the site keeps references as structured data).
 * @param {string} markdown
 * @returns {string[]}
 */
export function markdownUnits(markdown) {
  /** @type {string[]} */
  const units = [];
  /** @type {string[]} */
  let para = [];
  let skip = true;
  const flush = () => {
    if (para.length && !skip) units.push(plain(para.join(' ')));
    para = [];
  };
  for (const line of markdown.split('\n')) {
    if (/^#{1}\s/.test(line) || /^>/.test(line)) { flush(); continue; }
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      flush();
      skip = /^(artifacts|references)$/i.test(plain(h2[1]));
      if (!skip) units.push(plain(h2[1]));
      continue;
    }
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) { flush(); if (!skip) units.push(plain(h3[1])); continue; }
    if (/^#{4,}\s/.test(line)) { flush(); continue; }
    const item = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    if (item) { flush(); para = [item[1]]; flush(); continue; }
    if (!line.trim()) { flush(); continue; }
    para.push(line.trim());
  }
  flush();
  return units;
}

/** The same units from a data/articles.json article. @param {any} article @returns {string[]} */
export function dataUnits(article) {
  return article.sections
    .flatMap((/** @type {any} */ s) => [
      s.heading,
      ...(s.paragraphs ?? []),
      ...(s.list ?? []),
      ...(s.subsections ?? []).flatMap((/** @type {any} */ sub) => [sub.heading, ...(sub.paragraphs ?? []), ...(sub.list ?? [])]),
    ])
    .map(plain);
}

/**
 * @param {string} markdown @param {any} article
 * @returns {string[]} Human-readable differences; empty when the two agree.
 */
export function articleDrift(markdown, article) {
  const md = markdownUnits(markdown);
  const js = dataUnits(article);
  /** @type {string[]} */
  const out = [];
  for (let i = 0; i < Math.max(md.length, js.length); i++) {
    if (md[i] !== js[i]) out.push(`unit ${i + 1}:\n  markdown: ${md[i] ?? '(missing)'}\n  json:     ${js[i] ?? '(missing)'}`);
  }
  return out;
}

/** @param {string} markdown @returns {string | undefined} The `#` title. */
export function markdownTitle(markdown) {
  const m = markdown.match(/^#\s+(.*)$/m);
  return m ? plain(m[1]) : undefined;
}
