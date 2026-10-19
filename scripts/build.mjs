#!/usr/bin/env node
// npm run build — produce dist/ for GitHub Pages, with the version derived from Git tags.
import { fileURLToPath } from 'node:url';
import { buildSite } from './lib/build.mjs';
import { ROOT } from './lib/content.mjs';
import { createGitRunner } from './lib/git.mjs';
import { resolveAppVersion } from './lib/version.mjs';

const root = fileURLToPath(ROOT);
const version = resolveAppVersion(createGitRunner(root));
const { pages, warnings } = buildSite(root, `${root}dist`, version);

for (const w of warnings) console.warn(`Warning: ${w}`);
console.log(`Built ${pages.length} pages into dist/ — version: ${version.label} (${version.kind})`);
