#!/usr/bin/env node
// npm run release:plan — explain the next version. Read-only.
import { createGitRunner } from './lib/git.mjs';
import { planRelease } from './lib/release.mjs';

const plan = planRelease(createGitRunner());

const line = (/** @type {import('./lib/semver.mjs').Commit} */ c) => `  ${c.hash.slice(0, 7)} ${c.subject}`;

console.log(`Latest release tag: ${plan.latestTag ?? 'none'}`);
for (const w of plan.warnings) console.log(`Warning: ${w}`);

if (plan.releasing.length) {
  console.log('\nCommits that trigger a release:');
  for (const c of plan.releasing) console.log(`${line(c.commit)}  [${c.bump}${c.breaking ? ', breaking' : ''}]`);
}
if (plan.noBump.length) {
  console.log('\nCommits with no version impact:');
  for (const c of plan.noBump) console.log(line(c.commit));
}
if (plan.unsupported.length) {
  console.log('\nIgnored (not Conventional Commits):');
  for (const c of plan.unsupported) console.log(line(c));
}

if (!plan.ok) {
  console.error('\nCannot plan a release:');
  for (const e of plan.errors) console.error(`  - ${e}`);
  process.exit(1);
}

if (plan.bootstrap) {
  console.log('\nNo release tag exists yet. The first tag is a deliberate choice, so it is never created automatically.');
  console.log('Pick a version (v1.0.0 is typical) and, once approved, run:');
  console.log('  npm run release:tag -- --bootstrap v1.0.0 --approve v1.0.0');
} else if (plan.nextTag) {
  console.log(`\nProposed release: ${plan.latestTag} -> ${plan.nextTag} (${plan.bump})`);
  console.log(`To create the local tag after approval: npm run release:tag -- --approve ${plan.nextTag}`);
} else {
  console.log(`\nNo release-worthy changes since ${plan.latestTag}.`);
}
