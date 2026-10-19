// Throwaway Git repositories for release and version tests.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGitRunner } from '../scripts/lib/git.mjs';

/** @param {string} cwd @param {string[]} args */
function run(cwd, args) {
  const res = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
    },
  });
  if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

/**
 * A temp repo on branch "master" with an "origin" bare remote.
 * Call `cleanup()` when done.
 */
export function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'release-test-'));
  const dir = join(root, 'work');
  const remote = join(root, 'origin.git');
  run(root, ['init', '--quiet', '--bare', remote]);
  run(root, ['init', '--quiet', '-b', 'master', dir]);
  run(dir, ['remote', 'add', 'origin', remote]);
  // The code under test runs plain git, so the repo needs its own identity for annotated tags.
  run(dir, ['config', 'user.name', 'Test']);
  run(dir, ['config', 'user.email', 'test@example.com']);
  let n = 0;
  const calls = /** @type {string[][]} */ ([]);
  const real = createGitRunner(dir);
  return {
    dir,
    /** Records every git call the code under test makes. */
    calls,
    /** @type {import('../scripts/lib/git.mjs').GitRunner} */
    git: (args) => {
      calls.push(args);
      return real(args);
    },
    /** @param {string} message */
    commit(message) {
      n += 1;
      writeFileSync(join(dir, `file${n}.txt`), String(n));
      run(dir, ['add', '.']);
      run(dir, ['commit', '--quiet', '-m', message]);
      return run(dir, ['rev-parse', 'HEAD']);
    },
    /** @param {string} name */
    tag(name) {
      run(dir, ['tag', '-a', name, '-m', name]);
    },
    /** @param {string} name */
    pushTag(name) {
      run(dir, ['push', '--quiet', 'origin', `refs/tags/${name}`]);
    },
    /** @param {string} name */
    checkout(name) {
      run(dir, ['checkout', '--quiet', '-b', name]);
    },
    dirty() {
      writeFileSync(join(dir, 'uncommitted.txt'), 'x');
    },
    /** @param {string[]} args */
    raw: (args) => run(dir, args),
    remoteTags: () => run(remote, ['tag', '--list']),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

/** A directory that is not inside any Git repository. */
export function makePlainDir() {
  const dir = mkdtempSync(join(tmpdir(), 'no-git-'));
  return { dir, git: createGitRunner(dir), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

export const passingValidation = () => ({ ok: true, failures: [] });
