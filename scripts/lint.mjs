#!/usr/bin/env node
// npm run lint — checks the site without third-party tools.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, generatedFiles, loadContent } from './lib/content.mjs';
import { publishedEntries } from './lib/build.mjs';

const root = fileURLToPath(ROOT);
/** @type {string[]} */
const problems = [];
const report = (/** @type {string} */ file, /** @type {string} */ msg) => problems.push(`${file}: ${msg}`);

// 1. Generated pages match the data.
for (const [file, expected] of Object.entries(generatedFiles())) {
  const path = join(root, file);
  if (!existsSync(path) || readFileSync(path, 'utf8') !== expected) {
    report(file, 'out of date with data/*.json. Run `npm run generate`.');
  }
}

// 1b. The sitemap lists each URL once.
{
  const sitemap = generatedFiles()['sitemap.xml'];
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const seen = new Set();
  for (const loc of locs) {
    if (seen.has(loc)) report('sitemap.xml', `duplicate <loc> entry: ${loc}`);
    seen.add(loc);
  }
}

// 2. Structured content has the fields the templates rely on.
const { data, repos, articles } = loadContent();
for (const c of data.work.caseStudies) {
  for (const key of ['id', 'title', 'summary', 'challenge', 'contribution', 'highlights', 'tech']) {
    if (!c[key] || (Array.isArray(c[key]) && !c[key].length)) report('data/site.json', `case study "${c.id ?? '?'}" is missing ${key}`);
  }
}
const ids = data.work.caseStudies.map((/** @type {any} */ c) => c.id);
if (new Set(ids).size !== ids.length) report('data/site.json', 'case study ids must be unique');
const slugs = new Set();
for (const series of articles.series) {
  const numbers = new Set();
  for (const a of series.articles) {
    for (const key of ['slug', 'number', 'title', 'summary', 'status', 'sections']) {
      if (!a[key] || (Array.isArray(a[key]) && !a[key].length)) report('data/articles.json', `article "${a.slug ?? '?'}" is missing ${key}`);
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug ?? '')) report('data/articles.json', `article slug "${a.slug}" must be lowercase kebab-case`);
    if (slugs.has(a.slug)) report('data/articles.json', `duplicate article slug "${a.slug}"`);
    slugs.add(a.slug);
    if (numbers.has(a.number)) report('data/articles.json', `duplicate article number ${a.number} in series "${series.id}"`);
    numbers.add(a.number);
    if (!['draft', 'published'].includes(a.status)) report('data/articles.json', `article "${a.slug}" has invalid status "${a.status}"`);
    if (a.status === 'published' && !/^\d{4}-\d{2}-\d{2}$/.test(a.publishedOn ?? '')) report('data/articles.json', `published article "${a.slug}" needs publishedOn (YYYY-MM-DD)`);
    if (a.status === 'draft' && a.publishedOn) report('data/articles.json', `draft article "${a.slug}" must not have publishedOn`);
  }
}
for (const r of repos.repos) {
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(r.url)) report('data/repos.json', `"${r.name}" has an invalid GitHub URL`);
}

// 3. HTML checks on every page.
const pages = readdirSync(root).filter((f) => f.endsWith('.html'));
const idsByPage = Object.fromEntries(pages.map((p) => [p, new Set([...readFileSync(join(root, p), 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));

for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  if (!/<html lang="[a-z-]+">/.test(html)) report(page, 'missing <html lang>');
  if (!/<title>[^<]+<\/title>/.test(html)) report(page, 'missing <title>');
  if (!/<meta name="description" content="[^"]+"/.test(html)) report(page, 'missing meta description');
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) report(page, `expected one <h1>, found ${h1s.length}`);
  if (!/data-app-version>/.test(html)) report(page, 'missing the footer version slot');

  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="/.test(m[0])) report(page, `<img> without alt: ${m[0]}`);
  for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="noopener noreferrer"/.test(m[0])) report(page, `target=_blank without rel="noopener noreferrer": ${m[0]}`);
  }
  for (const m of html.matchAll(/<a\b(?![^>]*\bhref=)[^>]*>/g)) report(page, `<a> without href: ${m[0]}`);

  // Internal links and assets must resolve; root-relative paths are only allowed on 404.html.
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|data:)/.test(ref)) continue;
    const [pathPart, hash] = ref.split('#');
    if (ref.startsWith('/') && page !== '404.html') report(page, `root-relative link "${ref}" breaks under a sub-path`);
    const target = pathPart ? pathPart.replace(/^\//, '') : page;
    if (!existsSync(join(root, target))) report(page, `broken link "${ref}"`);
    else if (hash && target.endsWith('.html') && !idsByPage[target]?.has(hash)) report(page, `missing anchor "${ref}"`);
    else if (hash && target.endsWith('.svg') && !readFileSync(join(root, target), 'utf8').includes(`id="${hash}"`)) report(page, `missing icon "${ref}"`);
  }
}

// 4. No hard-coded release versions or secrets in published source.
/** @param {string} dir @returns {string[]} */
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const textFiles = publishedEntries(root).flatMap((p) => (statSync(join(root, p)).isDirectory() ? walk(join(root, p)) : [join(root, p)])).filter((f) => /\.(html|css|js|svg|txt|xml)$/.test(f));
for (const file of textFiles) {
  const src = readFileSync(file, 'utf8');
  const rel = relative(root, file);
  if (/\bv\d+\.\d+\.\d+\b/.test(src)) report(rel, 'contains a hard-coded version; the version must come from Git tags at build time');
  if (/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(src)) report(rel, 'looks like it contains a secret');
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  console.error(`\n${problems.length} problem(s) found.`);
  process.exit(1);
}
console.log(`✓ Lint passed: ${pages.length} pages, ${textFiles.length} published files checked.`);
