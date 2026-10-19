import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, describe, it } from 'node:test';
import { planRelease, tagRelease } from '../scripts/lib/release.mjs';
import { makePlainDir, makeRepo, passingValidation } from './helpers.mjs';

const repos = /** @type {{ cleanup: () => void }[]} */ ([]);
after(() => repos.forEach((r) => r.cleanup()));

function repo() {
  const r = makeRepo();
  repos.push(r);
  return r;
}

/** A released repo: v1.2.3 on master, then the given commits. */
function released(...subjects) {
  const r = repo();
  r.commit('feat: initial');
  r.tag('v1.2.3');
  r.pushTag('v1.2.3');
  for (const s of subjects) r.commit(s);
  return r;
}

const opts = (approve, extra = {}) => ({ approve, allowedBranches: ['master'], validate: passingValidation, ...extra });

describe('release:plan', () => {
  it('proposes a patch for fix and perf', () => {
    const plan = planRelease(released('fix: link', 'perf: image').git);
    assert.equal(plan.ok, true);
    assert.equal(plan.bump, 'patch');
    assert.equal(plan.nextTag, 'v1.2.4');
    assert.equal(plan.releasing.length, 2);
  });

  it('proposes a minor for feat', () => {
    const plan = planRelease(released('fix: a', 'feat: b').git);
    assert.equal(plan.nextTag, 'v1.3.0');
  });

  it('proposes a major when any commit is breaking', () => {
    assert.equal(planRelease(released('feat: a', 'fix!: b').git).nextTag, 'v2.0.0');
    assert.equal(planRelease(released('fix: a', 'chore: b\n\nBREAKING CHANGE: removed page').git).nextTag, 'v2.0.0');
  });

  it('reports no release when only docs/chore/refactor/style/test changed', () => {
    const plan = planRelease(released('docs: a', 'chore: b', 'refactor: c', 'style: d', 'test: e').git);
    assert.equal(plan.ok, true);
    assert.equal(plan.bump, 'none');
    assert.equal(plan.nextTag, null);
    assert.equal(plan.noBump.length, 5);
  });

  it('uses the highest valid tag and warns about invalid lookalikes', () => {
    const r = released('fix: a');
    r.tag('V2');
    r.tag('v1.3');
    r.tag('v9.0.0-beta');
    const plan = planRelease(r.git);
    assert.equal(plan.latestTag, 'v1.2.3');
    assert.equal(plan.nextTag, 'v1.2.4');
    assert.match(plan.warnings.join('\n'), /V2, v1\.3, v9\.0\.0-beta/);
  });

  it('orders tags numerically, so v1.10.0 beats v1.9.0', () => {
    const r = repo();
    r.commit('feat: a');
    r.tag('v1.9.0');
    r.commit('feat: b');
    r.tag('v1.10.0');
    r.commit('fix: c');
    assert.equal(planRelease(r.git).nextTag, 'v1.10.1');
  });

  it('lists non-conventional commits as ignored, and skips merge commits', () => {
    const plan = planRelease(released('Update readme', 'Merge pull request #4 from someone/branch', 'fix: x').git);
    assert.equal(plan.unsupported.length, 1);
    assert.equal(plan.merges.length, 1);
    assert.equal(plan.nextTag, 'v1.2.4');
  });

  it('flags duplicate release tags on one commit', () => {
    const r = released('fix: a');
    r.tag('v1.2.4');
    r.tag('v1.2.5');
    const plan = planRelease(r.git);
    assert.equal(plan.ok, false);
    assert.match(plan.errors.join('\n'), /Duplicate release tags/);
  });

  it('asks for a bootstrap when there are no release tags', () => {
    const r = repo();
    r.commit('feat: first');
    const plan = planRelease(r.git);
    assert.equal(plan.ok, true);
    assert.equal(plan.bootstrap, true);
    assert.equal(plan.nextTag, null);
  });

  it('fails clearly without Git metadata', () => {
    const d = makePlainDir();
    repos.push(d);
    const plan = planRelease(d.git);
    assert.equal(plan.ok, false);
    assert.match(plan.errors[0], /Not inside a Git repository/);
  });

  it('refuses to plan from a shallow clone', () => {
    const plan = planRelease((args) =>
      args.join(' ') === 'rev-parse --is-inside-work-tree'
        ? { ok: true, stdout: 'true', stderr: '' }
        : args.join(' ') === 'rev-parse HEAD'
          ? { ok: true, stdout: 'abc', stderr: '' }
          : args.join(' ') === 'rev-parse --is-shallow-repository'
            ? { ok: true, stdout: 'true', stderr: '' }
            : { ok: false, stdout: '', stderr: 'unexpected' },
    );
    assert.equal(plan.ok, false);
    assert.match(plan.errors[0], /shallow clone/);
  });

  it('never changes Git state', () => {
    const r = released('feat: a');
    planRelease(r.git);
    const reads = ['rev-parse', 'symbolic-ref', 'log', 'rev-list', 'status', 'ls-remote'];
    const writes = r.calls.filter(([cmd, flag]) => !reads.includes(cmd) && !(cmd === 'tag' && ['--list', '--points-at'].includes(flag)));
    assert.deepEqual(writes, []);
  });
});

describe('release:tag', () => {
  it('creates exactly the approved local tag', () => {
    const r = released('feat: a');
    const res = tagRelease(r.git, opts('v1.3.0'));
    assert.deepEqual(res.errors, []);
    assert.equal(res.created, 'v1.3.0');
    assert.match(r.raw(['tag', '--list']), /v1\.3\.0/);
  });

  it('never pushes the tag', () => {
    const r = released('feat: a');
    tagRelease(r.git, opts('v1.3.0'));
    assert.equal(r.calls.some((args) => args.includes('push')), false);
    assert.doesNotMatch(r.remoteTags(), /v1\.3\.0/);
  });

  it('contains no push command in the release scripts', () => {
    for (const file of ['../scripts/lib/release.mjs', '../scripts/release-tag.mjs', '../scripts/release-plan.mjs']) {
      const src = readFileSync(new URL(file, import.meta.url), 'utf8');
      assert.doesNotMatch(src, /\[\s*['"]push['"]/, file);
    }
  });

  it('requires explicit approval of the planned version', () => {
    const r = released('feat: a');
    assert.match(tagRelease(r.git, opts(undefined)).errors.join('\n'), /needs explicit approval/);
    assert.match(tagRelease(r.git, opts('v1.2.4')).errors.join('\n'), /planned release is v1\.3\.0/);
    assert.doesNotMatch(r.raw(['tag', '--list']), /v1\.3\.0/);
  });

  it('refuses on a dirty working tree', () => {
    const r = released('feat: a');
    r.dirty();
    const res = tagRelease(r.git, opts('v1.3.0'));
    assert.equal(res.ok, false);
    assert.match(res.errors.join('\n'), /uncommitted changes/);
  });

  it('refuses on the wrong branch, whatever its name', () => {
    const r = released('feat: a');
    r.checkout('some-feature-branch');
    const res = tagRelease(r.git, opts('v1.3.0'));
    assert.match(res.errors.join('\n'), /only tagged from master; the current branch is some-feature-branch/);
  });

  it('refuses when the tag already exists on the remote', () => {
    const r = released('feat: a');
    // Simulate someone else having published v1.3.0 from another clone.
    r.raw(['tag', 'v1.3.0']);
    r.pushTag('v1.3.0');
    r.raw(['tag', '-d', 'v1.3.0']);
    const res = tagRelease(r.git, opts('v1.3.0'));
    assert.match(res.errors.join('\n'), /already exists on origin/);
  });

  it('refuses when the remote cannot be checked', () => {
    const r = released('feat: a');
    r.raw(['remote', 'set-url', 'origin', '/nonexistent/repo.git']);
    const res = tagRelease(r.git, opts('v1.3.0'));
    assert.match(res.errors.join('\n'), /Could not check origin/);
  });

  it('refuses when validation fails, and creates nothing', () => {
    const r = released('feat: a');
    const res = tagRelease(r.git, opts('v1.3.0', { validate: () => ({ ok: false, failures: ['npm test'] }) }));
    assert.match(res.errors.join('\n'), /Validation failed: npm test/);
    assert.doesNotMatch(r.raw(['tag', '--list']), /v1\.3\.0/);
  });

  it('refuses when there is nothing to release', () => {
    const r = released('docs: a');
    assert.match(tagRelease(r.git, opts('v1.2.4')).errors.join('\n'), /No release-worthy commits/);
  });

  it('refuses on duplicate tags', () => {
    const r = released('fix: a');
    r.tag('v1.2.4');
    r.tag('v1.2.5');
    r.commit('fix: b');
    assert.match(tagRelease(r.git, opts('v1.2.6')).errors.join('\n'), /Duplicate release tags/);
  });

  it('never creates a first tag without --bootstrap', () => {
    const r = repo();
    r.commit('feat: first');
    const res = tagRelease(r.git, opts('v1.0.0'));
    assert.match(res.errors.join('\n'), /No release tag exists yet/);
    assert.equal(r.raw(['tag', '--list']), '');
  });

  it('creates an approved bootstrap tag', () => {
    const r = repo();
    r.commit('chore: first');
    const res = tagRelease(r.git, opts('v1.0.0', { bootstrap: 'v1.0.0' }));
    assert.deepEqual(res.errors, []);
    assert.equal(res.created, 'v1.0.0');
  });

  it('rejects a non-strict bootstrap tag', () => {
    const r = repo();
    r.commit('chore: first');
    assert.match(tagRelease(r.git, opts('v1.0', { bootstrap: 'v1.0' })).errors.join('\n'), /not a strict/);
  });

  it('fails clearly without Git metadata', () => {
    const d = makePlainDir();
    repos.push(d);
    assert.match(tagRelease(d.git, opts('v1.0.0')).errors.join('\n'), /Not inside a Git repository/);
  });
});
