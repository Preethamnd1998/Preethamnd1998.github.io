// Loads and sanity-checks the structured content.
import { readFileSync } from 'node:fs';
import { renderPages, renderSitemap } from './render.mjs';
import { articlePageFile, publishedArticles, renderArticlePages } from './articles.mjs';

export const ROOT = new URL('../../', import.meta.url);

export function loadContent() {
  const data = JSON.parse(readFileSync(new URL('data/site.json', ROOT), 'utf8'));
  const repos = JSON.parse(readFileSync(new URL('data/repos.json', ROOT), 'utf8'));
  const articles = JSON.parse(readFileSync(new URL('data/articles.json', ROOT), 'utf8'));
  return { data, repos, articles };
}

/**
 * Every generated file, keyed by path relative to the repo root.
 * @returns {Record<string, string>}
 */
export function generatedFiles() {
  const { data, repos, articles } = loadContent();
  // 'articles.html' is already in data.nav and so already in the sitemap via renderSitemap's own loop;
  // only the per-article pages need to be added here, and only the published ones.
  const indexable = publishedArticles(articles).map(articlePageFile);
  return {
    ...renderPages(data, repos),
    ...renderArticlePages(data, articles),
    'sitemap.xml': renderSitemap(data, data.site.updated, indexable),
  };
}
