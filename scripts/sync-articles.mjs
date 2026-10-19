#!/usr/bin/env node
// npm run sync:articles -- --dir <path> — local-only comparison of each article's canonical article.md (in the
// article repository) against this repo's fixture and data/articles.json. Not run in CI: it needs the article
// repository checked out somewhere, and makes no attempt to fetch it over the network.
//
// Usage:
//   npm run sync:articles -- --dir ../Ai-Driven-Software-Development
//   ARTICLES_REPO_DIR=/path/to/Ai-Driven-Software-Development npm run sync:articles
//
// A --dir flag takes precedence over ARTICLES_REPO_DIR. Neither is assumed — if both are missing, this script
// reports that explicitly and exits non-zero rather than guessing a sibling path.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, loadContent } from './lib/content.mjs';
import { articleDrift, markdownTitle, plain, sourceHash } from './lib/article-sync.mjs';

const root = fileURLToPath(ROOT);
const dirFlagIndex = process.argv.indexOf('--dir');
const dirFlag = dirFlagIndex !== -1 ? process.argv[dirFlagIndex + 1] : undefined;
const writeFixtures = process.argv.includes('--write');
const articlesRepoDir = dirFlag ?? process.env.ARTICLES_REPO_DIR;

if (!articlesRepoDir) {
  console.error('✗ No article repository location given.');
  console.error('  Pass one explicitly: npm run sync:articles -- --dir <path-to-article-repo>');
  console.error('  or set ARTICLES_REPO_DIR=<path-to-article-repo>.');
  console.error('  This script never guesses a sibling directory.');
  process.exit(1);
}

const dir = resolve(process.cwd(), articlesRepoDir);
if (!existsSync(dir)) {
  console.error(`✗ Article repository not found at ${dir}`);
  process.exit(1);
}

const { articles } = loadContent();
let drift = 0;
let checked = 0;

for (const series of articles.series) {
  for (const a of series.articles) {
    if (!a.source) continue;
    const file = resolve(dir, a.source);
    if (!existsSync(file)) {
      console.error(`✗ ${a.slug}: source "${a.source}" not found under ${dir}`);
      drift++;
      continue;
    }
    const canonical = readFileSync(file, 'utf8');
    checked++;

    const problems = articleDrift(canonical, a);
    if (markdownTitle(canonical) !== plain(a.title)) problems.unshift(`title:\n  canonical: ${markdownTitle(canonical)}\n  json:      ${a.title}`);
    if (problems.length) {
      console.error(`✗ ${a.slug}: data/articles.json differs from the canonical ${a.source}:\n${problems.join('\n')}`);
      drift++;
      continue;
    }

    const fixture = resolve(root, 'test/fixtures', `${a.slug}.article.md`);
    const liveHash = sourceHash(canonical);
    const fixtureStale = !existsSync(fixture) || readFileSync(fixture, 'utf8') !== canonical;
    const recordedHashStale = a.sourceHash !== liveHash;

    if (!fixtureStale && !recordedHashStale) {
      console.log(`✓ ${a.slug}: canonical file, fixture and recorded sourceHash all agree.`);
      continue;
    }

    if (writeFixtures) {
      writeFileSync(fixture, canonical);
      console.log(`  wrote test/fixtures/${a.slug}.article.md from canonical`);
      console.log(`  update data/articles.json "sourceHash" for ${a.slug} to: ${liveHash}`);
      drift++; // still non-zero: data/articles.json's sourceHash needs a manual edit before this is clean.
      continue;
    }

    if (fixtureStale) console.error(`✗ ${a.slug}: test/fixtures/${a.slug}.article.md does not match the canonical ${a.source}.`);
    if (recordedHashStale) console.error(`✗ ${a.slug}: data/articles.json "sourceHash" (${a.sourceHash ?? '(none)'}) does not match the canonical file's hash (${liveHash}).`);
    console.error(`  Re-run with --write to refresh the fixture from canonical, then set "sourceHash": "${liveHash}" in data/articles.json.`);
    drift++;
  }
}

if (drift) process.exit(1);
console.log(checked ? `✓ ${checked} article(s) in sync with the canonical repository.` : 'Nothing to check (no article has a "source").');
