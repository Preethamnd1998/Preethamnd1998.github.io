#!/usr/bin/env node
// npm run check:articles — verifies each article's fixture (test/fixtures/<slug>.article.md) still hashes to the
// `sourceHash` recorded in data/articles.json. This is a pure, offline, reproducible check: no network access, no
// assumption about where the canonical article repository lives, so it runs the same in CI as on a laptop.
//
// IMPORTANT — what this does NOT do: it cannot tell you whether the fixture itself still matches the canonical
// article.md in the article repository. A sourceHash match only proves "the fixture hasn't silently changed since
// the hash was recorded" — if both the fixture and the hash were updated together (correctly or not), this check
// passes either way. To compare the fixture against the live canonical file, run:
//   npm run sync:articles -- --dir <path-to-Ai-Driven-Software-Development-checkout>
// or set ARTICLES_REPO_DIR. See scripts/sync-articles.mjs.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, loadContent } from './lib/content.mjs';
import { articleDrift, markdownTitle, plain, sourceHash } from './lib/article-sync.mjs';

const root = fileURLToPath(ROOT);
const { articles } = loadContent();
let problems = 0;
let checked = 0;

for (const series of articles.series) {
  for (const a of series.articles) {
    if (!a.source) continue;
    const fixture = resolve(root, 'test/fixtures', `${a.slug}.article.md`);
    checked++;
    if (!existsSync(fixture)) {
      console.error(`✗ ${a.slug}: no fixture at test/fixtures/${a.slug}.article.md`);
      problems++;
      continue;
    }
    const md = readFileSync(fixture, 'utf8');
    const liveHash = sourceHash(md);
    if (!a.sourceHash) {
      console.error(`✗ ${a.slug}: data/articles.json has a "source" but no "sourceHash" to verify the fixture against. Add "sourceHash": "${liveHash}".`);
      problems++;
      continue;
    }
    if (a.sourceHash !== liveHash) {
      console.error(`✗ ${a.slug}: fixture hash does not match data/articles.json.\n  recorded:  ${a.sourceHash}\n  fixture:   ${liveHash}\nThe fixture or the recorded hash changed without the other. Run \`npm run sync:articles\` against the article repository, resolve any drift, then update both together.`);
      problems++;
      continue;
    }
    const problemsInContent = articleDrift(md, a);
    if (markdownTitle(md) !== plain(a.title)) problemsInContent.unshift(`title:\n  fixture: ${markdownTitle(md)}\n  json:    ${a.title}`);
    if (problemsInContent.length) {
      // Should be unreachable if the hash matches and the JSON was in sync when the hash was recorded, but checked
      // defensively in case sourceHash was computed from different content than what's in data/articles.json.
      console.error(`✗ ${a.slug}: fixture hash matches, but structured content still differs from the fixture:\n${problemsInContent.join('\n')}`);
      problems++;
      continue;
    }
    console.log(`✓ ${a.slug}: fixture hash matches data/articles.json, and content matches the fixture.`);
  }
}

if (problems) process.exit(1);
console.log(checked ? `✓ ${checked} article(s) checked.` : 'Nothing to check.');
console.log('\nNote: this only checks the committed fixture against data/articles.json. It cannot detect drift from');
console.log('the canonical article.md in the article repository — run `npm run sync:articles` for that.');
