#!/usr/bin/env node
// npm run release:tag -- --approve vX.Y.Z — create one approved local tag. Never pushes.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createGitRunner } from './lib/git.mjs';
import { tagRelease } from './lib/release.mjs';

const { values } = parseArgs({
  options: { approve: { type: 'string' }, bootstrap: { type: 'string' } },
  strict: true,
});

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const allowedBranches = pkg.release?.branches ?? [];
if (!allowedBranches.length) {
  console.error('package.json has no "release.branches" list, so no branch is allowed to release.');
  process.exit(1);
}

function validate() {
  /** @type {string[]} */
  const failures = [];
  for (const script of ['lint', 'test', 'build']) {
    console.log(`\n> npm run ${script}`);
    const res = spawnSync('npm', ['run', script], { stdio: 'inherit' });
    if (res.status !== 0) failures.push(`npm run ${script}`);
  }
  return { ok: failures.length === 0, failures };
}

const result = tagRelease(createGitRunner(), {
  approve: values.approve,
  bootstrap: values.bootstrap,
  allowedBranches,
  validate,
});

if (!result.ok) {
  console.error('\nNo tag was created:');
  for (const e of result.errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`\nCreated local tag ${result.created}. It has NOT been pushed.`);
console.log(`Publishing it is a separate, approved step: git push origin ${result.created}`);
