import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { buildSite, stampVersion } from '../scripts/lib/build.mjs';
import { generatedFiles } from '../scripts/lib/content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'site-build-'));
after(() => rmSync(out, { recursive: true, force: true }));

const release = { kind: /** @type {const} */ ('release'), version: 'v2.1.0', baseTag: 'v2.1.0', commitsSinceTag: 0, commit: 'abc1234', label: 'v2.1.0', warnings: [] };

describe('build', () => {
  it('stamps the version into the footer slot', () => {
    const html = '<p><span class="app-version" data-app-version>Development build</span></p>';
    assert.equal(stampVersion(html, 'v2.1.0'), '<p><span class="app-version" data-app-version>v2.1.0</span></p>');
  });

  it('escapes the label', () => {
    const html = '<span class="app-version" data-app-version>Development build</span>';
    assert.match(stampVersion(html, '<x>'), /&lt;x&gt;/);
  });

  it('fails loudly when a page has no version slot', () => {
    assert.throws(() => stampVersion('<p>no slot</p>', 'v1.0.0'), /no version slot/);
  });

  it('builds every page with the release version and writes version.json', () => {
    const { pages } = buildSite(root, out, release);
    assert.ok(pages.length >= 7);
    for (const page of pages) {
      assert.match(readFileSync(join(out, page), 'utf8'), /data-app-version>v2\.1\.0</, page);
    }
    const meta = JSON.parse(readFileSync(join(out, 'version.json'), 'utf8'));
    assert.equal(meta.version, 'v2.1.0');
    assert.equal(meta.warnings, undefined);
    assert.ok(existsSync(join(out, 'assets/icons.svg')));
    assert.ok(!existsSync(join(out, 'data')), 'source data must not be published');
    assert.ok(!existsSync(join(out, 'scripts')), 'scripts must not be published');
  });
});

describe('generated content', () => {
  it('keeps every source page in sync with the data', () => {
    for (const [file, html] of Object.entries(generatedFiles())) {
      assert.equal(readFileSync(join(root, file), 'utf8'), html, `${file} is stale; run npm run generate`);
    }
  });

  it('never ships a hard-coded release version in source pages', () => {
    for (const [file, html] of Object.entries(generatedFiles())) {
      assert.doesNotMatch(html, /\bv\d+\.\d+\.\d+\b/, file);
    }
  });
});
