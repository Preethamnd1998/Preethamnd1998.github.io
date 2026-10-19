#!/usr/bin/env node
// npm run repos:refresh — update data/repos.json from the public GitHub API.
// Only metadata GitHub reports is overwritten; curated "note" fields and the list of repos are kept.
// Set GITHUB_TOKEN in your shell to raise the rate limit. It is never written to disk.
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../data/repos.json', import.meta.url);
const site = JSON.parse(readFileSync(new URL('../data/site.json', import.meta.url), 'utf8')).site;
const manifest = JSON.parse(readFileSync(file, 'utf8'));

/** @type {Record<string, string>} */
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-repos-refresh' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

let failures = 0;
for (const repo of manifest.repos) {
  const res = await fetch(`https://api.github.com/repos/${site.githubUser}/${repo.name}`, { headers });
  if (!res.ok) {
    failures += 1;
    console.warn(`Skipped ${repo.name}: HTTP ${res.status}${res.status === 403 ? ' (rate limited? set GITHUB_TOKEN)' : ''}`);
    continue;
  }
  const data = await res.json();
  if (data.private) {
    failures += 1;
    console.warn(`Skipped ${repo.name}: repository is private and must not be listed.`);
    continue;
  }
  Object.assign(repo, {
    url: data.html_url,
    description: data.description,
    language: data.language,
    stars: data.stargazers_count,
    pushedAt: data.pushed_at,
  });
  console.log(`Updated ${repo.name}`);
}

if (failures === manifest.repos.length) {
  console.error('No repositories could be refreshed; data/repos.json was left unchanged.');
  process.exit(1);
}
manifest.fetchedAt = new Date().toISOString().slice(0, 10);
writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Wrote data/repos.json. Run `npm run generate` to update the pages.');
