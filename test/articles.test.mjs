import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { articlePageFile, flattenArticles, publishedArticles, renderArticlePages } from '../scripts/lib/articles.mjs';
import { generatedFiles, loadContent } from '../scripts/lib/content.mjs';

const { data } = loadContent();
const article = (/** @type {number} */ number, /** @type {string} */ status) => ({
  slug: `00${number}-x`,
  number,
  title: `Title ${number}`,
  summary: 'Summary',
  status,
  ...(status === 'published' ? { publishedOn: '2026-01-02' } : {}),
  sections: [{ heading: 'H', paragraphs: ['P <b>'] }],
});
const fixture = { title: 'T', description: 'D', eyebrow: 'E', heading: 'H', intro: 'I', series: [{ id: 's', title: 'S', description: 'd', repo: 'https://github.com/a/b', articles: [article(2, 'published'), article(1, 'draft'), article(3, 'draft')] }] };

describe('articles', () => {
  it('links previous and next articles in number order', () => {
    const [a, b, c] = flattenArticles(fixture);
    assert.equal(a.prev, undefined);
    assert.equal(a.next.number, 2);
    assert.equal(b.prev.number, 1);
    assert.equal(b.next.number, 3);
    assert.equal(c.next, undefined);
  });

  it('marks drafts noindex, labels them, and escapes content', () => {
    const pages = renderArticlePages(data, fixture);
    const draft = pages[articlePageFile(fixture.series[0].articles[2])];
    assert.match(draft, /name="robots" content="noindex"/);
    assert.match(draft, /Draft — pending review/);
    assert.match(draft, /P &lt;b&gt;/);
    assert.match(draft, /rel="prev"/);
  });

  it('indexes published articles with a date and canonical URL', () => {
    const pages = renderArticlePages(data, fixture);
    const pub = pages['article-002-x.html'];
    assert.doesNotMatch(pub, /noindex/);
    assert.match(pub, /rel="canonical"/);
    assert.match(pub, /<time datetime="2026-01-02">/);
    assert.match(pub, /"@type":"Article"/);
  });

  it('keeps Articles current in the nav on article pages', () => {
    const pages = renderArticlePages(data, fixture);
    assert.match(pages['article-001-x.html'], /href="articles\.html" aria-current="page"/);
  });

  it('only lists published articles in the sitemap', () => {
    assert.deepEqual(publishedArticles(fixture).map((a) => a.number), [2]);
    const sitemap = generatedFiles()['sitemap.xml'];
    assert.match(sitemap, /articles\.html/);
    const { articles } = loadContent();
    for (const a of articles.series.flatMap((/** @type {any} */ s) => s.articles)) {
      assert.equal(sitemap.includes(articlePageFile(a)), a.status === 'published', a.slug);
    }
  });

  it('lists articles.html in the sitemap exactly once (it is in data.nav already)', () => {
    const sitemap = generatedFiles()['sitemap.xml'];
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.equal(locs.length, new Set(locs).size, 'sitemap has duplicate <loc> entries');
    assert.equal(locs.filter((l) => l.endsWith('articles.html')).length, 1);
  });
});
