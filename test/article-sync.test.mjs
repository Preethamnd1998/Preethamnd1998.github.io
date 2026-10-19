// Guards against the article content in data/articles.json drifting from its Markdown source, using a committed
// fixture copy of the canonical article.md (the article repository isn't available in this checkout or in CI).
//
// This only proves the fixture and data/articles.json still agree, and that the fixture's hash still matches the
// one recorded in data/articles.json. It CANNOT prove the fixture itself still matches the canonical article.md in
// the article repository — a human (or `npm run sync:articles`, run locally against that repository) has to update
// both the fixture and the recorded sourceHash together whenever the canonical article changes.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { articleDrift, markdownTitle, plain, sourceHash } from '../scripts/lib/article-sync.mjs';
import { ROOT, loadContent } from '../scripts/lib/content.mjs';

const root = fileURLToPath(ROOT);
const { articles } = loadContent();
const articlesWithSource = articles.series.flatMap((/** @type {any} */ s) => s.articles).filter((/** @type {any} */ a) => a.source);

describe('article content sync (fixture vs. data/articles.json)', () => {
  assert.ok(articlesWithSource.length > 0, 'expected at least one article with a "source" to guard against drift');

  for (const a of articlesWithSource) {
    describe(a.slug, () => {
      const fixturePath = resolve(root, 'test/fixtures', `${a.slug}.article.md`);

      it('has a committed fixture', () => {
        assert.ok(existsSync(fixturePath), `missing test/fixtures/${a.slug}.article.md — see README "Articles" section`);
      });

      it('has a sourceHash recorded in data/articles.json', () => {
        assert.ok(a.sourceHash, `data/articles.json article "${a.slug}" has a "source" but no "sourceHash"`);
      });

      it('fixture hash matches the recorded sourceHash (fixture has not silently changed)', () => {
        const fixture = readFileSync(fixturePath, 'utf8');
        assert.equal(
          sourceHash(fixture),
          a.sourceHash,
          `test/fixtures/${a.slug}.article.md no longer hashes to the sourceHash in data/articles.json.\n` +
            'Either the fixture or data/articles.json changed without the other — run `npm run sync:articles` ' +
            'against the canonical article repository and update both together.',
        );
      });

      it('title and section content match the fixture', () => {
        const fixture = readFileSync(fixturePath, 'utf8');
        assert.equal(markdownTitle(fixture), plain(a.title), 'article title differs from the fixture\'s "# " heading');
        const problems = articleDrift(fixture, a);
        assert.deepEqual(problems, [], `data/articles.json differs from the fixture:\n${problems.join('\n')}`);
      });
    });
  }
});
