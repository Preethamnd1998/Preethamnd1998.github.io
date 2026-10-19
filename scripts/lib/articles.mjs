// Renders the articles index and one page per article from data/articles.json. Pure: no file I/O.
import { esc, ext, heroSmall, icon, layout, sectionHeader } from './render.mjs';

const STATUS_LABEL = { draft: 'Draft — pending review', published: 'Published' };

/** @param {{ slug: string }} article */
export const articlePageFile = (article) => `article-${article.slug}.html`;

/**
 * Flat list of articles in series order, each carrying its series and its neighbours in that series.
 * @param {any} articles
 */
export function flattenArticles(articles) {
  return articles.series.flatMap((/** @type {any} */ series) => {
    const sorted = [...series.articles].sort((a, b) => a.number - b.number);
    return sorted.map((/** @type {any} */ article, /** @type {number} */ i) => ({ series, article, prev: sorted[i - 1], next: sorted[i + 1] }));
  });
}

/** Only published articles are indexable and listed in the sitemap. @param {any} articles */
export const publishedArticles = (articles) => flattenArticles(articles).filter((e) => e.article.status === 'published').map((e) => e.article);

/** @param {string[]} items */
const list = (items) => `<ul class="checklist">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;

/** @param {any} article */
const statusBadge = (article) => `<span class="status status-${esc(article.status)}">${esc(STATUS_LABEL[/** @type {'draft'|'published'} */ (article.status)])}</span>`;

/** @param {any} article */
function dateText(article) {
  return article.status === 'published' ? `<time datetime="${esc(article.publishedOn)}">${esc(article.publishedOn)}</time>` : 'Not yet published';
}

/** @param {any} data @param {any} articles */
function indexPage(data, articles) {
  const sections = articles.series
    .map(
      (/** @type {any} */ series) => `      <section class="section section-alt" id="${esc(series.id)}">
        <div class="container">
${sectionHeader('Series', series.title, series.description)}
          <ol class="article-list">
${[...series.articles]
  .sort((/** @type {any} */ a, /** @type {any} */ b) => a.number - b.number)
  .map(
    (/** @type {any} */ a) => `            <li class="card article-card reveal">
              <div class="article-card-meta"><span class="card-index case-num">${String(a.number).padStart(3, '0')}</span>${statusBadge(a)}</div>
              <h3><a href="${articlePageFile(a)}">${esc(a.title)}</a></h3>
              <p>${esc(a.summary)}</p>
              <a class="card-link" href="${articlePageFile(a)}">Read${a.status === 'draft' ? ' the draft' : ''} ${icon('arrow-right', 'icon icon-sm')}</a>
            </li>`,
  )
  .join('\n')}
          </ol>
          <p class="fine-print">Source and evidence: <a href="${series.repo}" ${ext}>${esc(series.title)} repository ${icon('arrow-up-right', 'icon icon-xs')}</a></p>
        </div>
      </section>`,
    )
    .join('\n');
  const body = `${heroSmall(articles.eyebrow, articles.heading, articles.intro)}

${sections}`;
  return layout(data, { file: 'articles.html', title: articles.title, description: articles.description, body });
}

/** @param {any} data @param {{ series: any, article: any, prev: any, next: any }} entry */
function articlePage(data, { series, article, prev, next }) {
  const file = articlePageFile(article);
  const isDraft = article.status !== 'published';
  const sections = article.sections
    .map(
      (/** @type {any} */ s) => `          <section class="article-section">
            <h2>${esc(s.heading)}</h2>
${(s.paragraphs ?? []).map((/** @type {string} */ p) => `            <p>${esc(p)}</p>`).join('\n')}${s.list ? `\n            ${list(s.list)}` : ''}${(s.subsections ?? [])
              .map(
                (/** @type {any} */ sub) => `
            <h3>${esc(sub.heading)}</h3>
${(sub.paragraphs ?? []).map((/** @type {string} */ p) => `            <p>${esc(p)}</p>`).join('\n')}${sub.list ? `\n            ${list(sub.list)}` : ''}`,
              )
              .join('')}
          </section>`,
    )
    .join('\n');
  const refs = (article.references ?? []).length
    ? `          <section class="article-section" id="references">
            <h2>References</h2>
            <ul class="checklist">${article.references
              .map((/** @type {any} */ r) => `<li>${r.href ? `<a href="${r.href}" ${ext}>${esc(r.label)}</a>` : esc(r.label)}</li>`)
              .join('')}</ul>
          </section>`
    : '';
  /** @param {any} a @param {'prev' | 'next'} dir */
  const pager = (a, dir) =>
    a
      ? `<a class="pager-link pager-${dir}" href="${articlePageFile(a)}" rel="${dir}"><span>${dir === 'prev' ? 'Previous' : 'Next'}</span><strong>${esc(a.title)}</strong></a>`
      : `<span class="pager-link pager-${dir} pager-empty" aria-hidden="true"></span>`;
  const draftNotice = isDraft
    ? `\n          <p class="draft-notice" role="note"><strong>Draft.</strong> This article has not been reviewed or published. It reports no experiment results.</p>`
    : '';
  const body = `      <section class="hero hero-sm">
        <div class="container hero-content">
          <span class="eyebrow">${esc(series.title)} · Article ${String(article.number).padStart(3, '0')}</span>
          <h1 class="article-title">${esc(article.title)}</h1>
          <p class="hero-lead">${esc(article.summary)}</p>
          <p class="article-meta">${statusBadge(article)} <span>${dateText(article)}</span></p>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <nav class="breadcrumb" aria-label="Breadcrumb"><a href="articles.html">Articles</a> <span aria-hidden="true">/</span> <span aria-current="page">${esc(article.title)}</span></nav>${draftNotice}
          <article class="article">
${sections}
${refs}
          </article>
          <nav class="pager" aria-label="More in ${esc(series.title)}">
            ${pager(prev, 'prev')}
            ${pager(next, 'next')}
          </nav>
        </div>
      </section>`;
  return layout(data, {
    file,
    title: `${article.title} · ${data.site.name}`,
    description: article.summary,
    body,
    current: 'articles.html',
    indexable: !isDraft,
    ogType: 'article',
    jsonLd: isDraft
      ? undefined
      : { '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.summary, datePublished: article.publishedOn, author: { '@type': 'Person', name: data.site.name } },
  });
}

/**
 * @param {any} data
 * @param {any} articles
 * @returns {Record<string, string>}
 */
export function renderArticlePages(data, articles) {
  /** @type {Record<string, string>} */
  const pages = { 'articles.html': indexPage(data, articles) };
  for (const entry of flattenArticles(articles)) pages[articlePageFile(entry.article)] = articlePage(data, entry);
  return pages;
}
