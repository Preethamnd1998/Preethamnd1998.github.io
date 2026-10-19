import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bumpVersion,
  classifyCommit,
  compare,
  formatTag,
  highestBump,
  latestReleaseTag,
  parseTag,
  sortReleaseTags,
} from '../scripts/lib/semver.mjs';

const commit = (subject, body = '') => ({ hash: 'abc1234', subject, body });

describe('strict tag parsing', () => {
  it('accepts vMAJOR.MINOR.PATCH', () => {
    assert.deepEqual(parseTag('v1.0.0'), { major: 1, minor: 0, patch: 0 });
    assert.deepEqual(parseTag('v1.2.3'), { major: 1, minor: 2, patch: 3 });
    assert.deepEqual(parseTag('v10.20.30'), { major: 10, minor: 20, patch: 30 });
    assert.deepEqual(parseTag('v0.0.0'), { major: 0, minor: 0, patch: 0 });
  });

  it('rejects anything that is not strict', () => {
    for (const tag of ['V2', 'v1.2', 'v1', '1.2.3', 'V1.2.3', 'v1.2.3-beta', 'v1.2.3+build', 'v01.2.3', 'v1.02.3', 'v1.2.03', 'release-1', 'v1.2.3.4', '', 'latest', 'v-1.2.3']) {
      assert.equal(parseTag(tag), null, tag);
    }
  });

  it('round-trips through formatTag', () => {
    assert.equal(formatTag(/** @type {any} */ (parseTag('v4.12.0'))), 'v4.12.0');
  });
});

describe('semantic version ordering', () => {
  it('compares numerically, not alphabetically', () => {
    assert.ok(compare(/** @type {any} */ (parseTag('v1.10.0')), /** @type {any} */ (parseTag('v1.9.0'))) > 0);
    assert.ok(compare(/** @type {any} */ (parseTag('v2.0.0')), /** @type {any} */ (parseTag('v1.99.99'))) > 0);
    assert.equal(compare(/** @type {any} */ (parseTag('v1.2.3')), /** @type {any} */ (parseTag('v1.2.3'))), 0);
  });

  it('picks the highest valid tag and ignores invalid ones', () => {
    const tags = ['v1.9.0', 'v1.10.0', 'v1.2.0', 'V2', 'v3.0', 'v9.9.9-beta', 'nightly'];
    assert.equal(latestReleaseTag(tags)?.tag, 'v1.10.0');
    assert.deepEqual(sortReleaseTags(tags).ignored, ['V2', 'v3.0', 'v9.9.9-beta', 'nightly']);
  });

  it('returns null when there are no valid tags', () => {
    assert.equal(latestReleaseTag(['V2', 'v1.2']), null);
    assert.equal(latestReleaseTag([]), null);
  });
});

describe('Conventional Commits classification', () => {
  it('maps fix and perf to patch', () => {
    assert.equal(classifyCommit(commit('fix: broken link')).bump, 'patch');
    assert.equal(classifyCommit(commit('perf(images): smaller hero')).bump, 'patch');
  });

  it('maps feat to minor', () => {
    assert.equal(classifyCommit(commit('feat: add case studies')).bump, 'minor');
    assert.equal(classifyCommit(commit('feat(skills): regroup')).bump, 'minor');
  });

  it('maps breaking changes to major', () => {
    assert.equal(classifyCommit(commit('feat!: new layout')).bump, 'major');
    assert.equal(classifyCommit(commit('fix!: drop old URLs')).bump, 'major');
    assert.equal(classifyCommit(commit('refactor(nav)!: rename pages')).bump, 'major');
    assert.equal(classifyCommit(commit('fix: urls', 'Some detail.\n\nBREAKING CHANGE: old links stop working')).bump, 'major');
  });

  it('gives no bump to docs, chore, refactor, style and test', () => {
    for (const type of ['docs', 'chore', 'refactor', 'style', 'test']) {
      const c = classifyCommit(commit(`${type}: tidy`));
      assert.equal(c.bump, 'none', type);
      assert.equal(c.conventional, true, type);
    }
  });

  it('flags unsupported formats as non-conventional', () => {
    for (const subject of ['Update index.html', 'feat:no space', 'Feat: capitalised', 'wip: something', 'fix : spaced']) {
      const c = classifyCommit(commit(subject));
      assert.equal(c.conventional, false, subject);
      assert.equal(c.bump, 'none', subject);
    }
  });
});

describe('increments', () => {
  const base = /** @type {any} */ (parseTag('v1.4.2'));
  it('bumps patch, minor and major correctly', () => {
    assert.equal(formatTag(bumpVersion(base, 'patch')), 'v1.4.3');
    assert.equal(formatTag(bumpVersion(base, 'minor')), 'v1.5.0');
    assert.equal(formatTag(bumpVersion(base, 'major')), 'v2.0.0');
    assert.equal(formatTag(bumpVersion(base, 'none')), 'v1.4.2');
  });

  it('lets a breaking change take precedence over minor and patch', () => {
    const list = ['fix: a', 'feat: b', 'chore: c', 'feat!: d', 'perf: e'].map((s) => classifyCommit(commit(s)));
    assert.equal(highestBump(list), 'major');
  });

  it('lets minor win over patch', () => {
    const list = ['fix: a', 'feat: b', 'perf: c'].map((s) => classifyCommit(commit(s)));
    assert.equal(highestBump(list), 'minor');
  });

  it('returns none when nothing is release-worthy', () => {
    const list = ['docs: a', 'chore: b', 'test: c'].map((s) => classifyCommit(commit(s)));
    assert.equal(highestBump(list), 'none');
  });
});
