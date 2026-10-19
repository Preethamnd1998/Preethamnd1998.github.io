// Loads and sanity-checks the structured content.
import { readFileSync } from 'node:fs';
import { renderPages, renderSitemap } from './render.mjs';

export const ROOT = new URL('../../', import.meta.url);

export function loadContent() {
  const data = JSON.parse(readFileSync(new URL('data/site.json', ROOT), 'utf8'));
  const repos = JSON.parse(readFileSync(new URL('data/repos.json', ROOT), 'utf8'));
  return { data, repos };
}

/**
 * Every generated file, keyed by path relative to the repo root.
 * @returns {Record<string, string>}
 */
export function generatedFiles() {
  const { data, repos } = loadContent();
  return { ...renderPages(data, repos), 'sitemap.xml': renderSitemap(data, data.site.updated) };
}
