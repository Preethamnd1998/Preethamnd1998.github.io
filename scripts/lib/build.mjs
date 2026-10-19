// Build step: copy the static site into dist/ and stamp the version from Git tags.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { esc, VERSION_PLACEHOLDER } from './render.mjs';

/** Top-level files and folders that make up the published site. */
export const PUBLISHED = ['index.html', 'work.html', 'skills.html', 'toolkit.html', 'experience.html', 'contact.html', '404.html', 'favicon.svg', 'robots.txt', 'sitemap.xml', 'assets'];

const SLOT = /(<span class="app-version" data-app-version>)([^<]*)(<\/span>)/g;

/**
 * Replace the footer version text. Throws if a page has no slot, so a template change can't silently drop it.
 * @param {string} html
 * @param {string} label
 */
export function stampVersion(html, label) {
  let found = false;
  const out = html.replace(SLOT, (_, open, current, close) => {
    found = true;
    if (current !== VERSION_PLACEHOLDER) throw new Error(`Unexpected version slot contents: "${current}"`);
    return `${open}${esc(label)}${close}`;
  });
  if (!found) throw new Error('Page has no version slot.');
  return out;
}

/**
 * @param {string} root      Repository root.
 * @param {string} outDir    Output folder (wiped first).
 * @param {import('./version.mjs').AppVersion} version
 */
export function buildSite(root, outDir, version) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const entry of PUBLISHED) {
    const from = join(root, entry);
    if (!existsSync(from)) throw new Error(`Missing published file: ${entry}`);
    cpSync(from, join(outDir, entry), { recursive: true });
  }
  const pages = readdirSync(outDir).filter((f) => f.endsWith('.html'));
  for (const page of pages) {
    const file = join(outDir, page);
    writeFileSync(file, stampVersion(readFileSync(file, 'utf8'), version.label));
  }
  const { warnings, ...publicVersion } = version;
  writeFileSync(join(outDir, 'version.json'), `${JSON.stringify(publicVersion, null, 2)}\n`);
  writeFileSync(join(outDir, '.nojekyll'), '');
  return { pages, warnings };
}
