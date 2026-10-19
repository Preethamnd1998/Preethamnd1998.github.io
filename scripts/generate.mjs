#!/usr/bin/env node
// npm run generate — write the HTML pages and sitemap from data/*.json.
import { writeFileSync } from 'node:fs';
import { ROOT, generatedFiles } from './lib/content.mjs';

for (const [file, contents] of Object.entries(generatedFiles())) {
  writeFileSync(new URL(file, ROOT), contents);
  console.log(`wrote ${file}`);
}
