import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { resolveAppVersion } from '../scripts/lib/version.mjs';
import { makePlainDir, makeRepo } from './helpers.mjs';

const cleanups = /** @type {(() => void)[]} */ ([]);
after(() => cleanups.forEach((c) => c()));

function repo() {
  const r = makeRepo();
  cleanups.push(r.cleanup);
  return r;
}

describe('app version from Git tags', () => {
  it('shows the exact release tag when HEAD is tagged', () => {
    const r = repo();
    r.commit('feat: a');
    r.tag('v1.2.0');
    const v = resolveAppVersion(r.git);
    assert.equal(v.kind, 'release');
    assert.equal(v.version, 'v1.2.0');
    assert.equal(v.label, 'v1.2.0');
  });

  it('picks the highest release tag when HEAD has several', () => {
    const r = repo();
    r.commit('feat: a');
    r.tag('v1.9.0');
    r.tag('v1.10.0');
    const v = resolveAppVersion(r.git);
    assert.equal(v.version, 'v1.10.0');
    assert.match(v.warnings.join('\n'), /Several release tags/);
  });

  it('ignores non-strict tags at HEAD', () => {
    const r = repo();
    r.commit('feat: a');
    r.tag('v1.0.0');
    r.commit('fix: b');
    r.tag('V2');
    r.tag('v1.1.0-beta');
    const v = resolveAppVersion(r.git);
    assert.equal(v.kind, 'development');
    assert.equal(v.version, null);
    assert.equal(v.baseTag, 'v1.0.0');
  });

  it('marks untagged builds as development, never inventing a version', () => {
    const r = repo();
    r.commit('feat: a');
    r.tag('v1.0.0');
    r.commit('fix: b');
    r.commit('fix: c');
    const v = resolveAppVersion(r.git);
    assert.equal(v.kind, 'development');
    assert.equal(v.version, null);
    assert.equal(v.commitsSinceTag, 2);
    assert.match(v.label, /^Development build · after v1\.0\.0 · [0-9a-f]{7,}$/);
  });

  it('marks repos with no release tags as development', () => {
    const r = repo();
    r.commit('chore: a');
    const v = resolveAppVersion(r.git);
    assert.equal(v.kind, 'development');
    assert.equal(v.baseTag, null);
    assert.match(v.label, /^Development build · [0-9a-f]{7,}$/);
  });

  it('reports an unknown version when Git metadata is missing', () => {
    const d = makePlainDir();
    cleanups.push(d.cleanup);
    const v = resolveAppVersion(d.git);
    assert.equal(v.kind, 'unknown');
    assert.equal(v.version, null);
    assert.equal(v.label, 'Version unknown');
  });
});
