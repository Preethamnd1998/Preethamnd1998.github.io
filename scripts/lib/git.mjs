// Thin, injectable wrapper around the git CLI so release logic can be tested without a repo.
import { spawnSync } from 'node:child_process';

/** @typedef {{ ok: boolean, stdout: string, stderr: string }} GitResult */
/** @typedef {(args: string[]) => GitResult} GitRunner */

/**
 * @param {string} [cwd]
 * @returns {GitRunner}
 */
export function createGitRunner(cwd = process.cwd()) {
  return (args) => {
    const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
    if (res.error) return { ok: false, stdout: '', stderr: String(res.error.message) };
    return { ok: res.status === 0, stdout: (res.stdout || '').trim(), stderr: (res.stderr || '').trim() };
  };
}

const FIELD = '\x1f';
const RECORD = '\x1e';

/**
 * Read-only queries used by version resolution and release planning.
 * @param {GitRunner} git
 */
export function gitQueries(git) {
  return {
    isRepo() {
      const r = git(['rev-parse', '--is-inside-work-tree']);
      return r.ok && r.stdout === 'true';
    },
    isShallow() {
      const r = git(['rev-parse', '--is-shallow-repository']);
      return r.ok && r.stdout === 'true';
    },
    head() {
      const r = git(['rev-parse', 'HEAD']);
      return r.ok ? r.stdout : null;
    },
    shortHead() {
      const r = git(['rev-parse', '--short', 'HEAD']);
      return r.ok ? r.stdout : null;
    },
    currentBranch() {
      const r = git(['symbolic-ref', '--quiet', '--short', 'HEAD']);
      return r.ok && r.stdout ? r.stdout : null;
    },
    /** @returns {string[]} */
    tags() {
      const r = git(['tag', '--list']);
      return r.ok ? r.stdout.split('\n').map((t) => t.trim()).filter(Boolean) : [];
    },
    /** @param {string} ref */
    tagsAt(ref) {
      const r = git(['tag', '--points-at', ref]);
      return r.ok ? r.stdout.split('\n').map((t) => t.trim()).filter(Boolean) : [];
    },
    /** @param {string} tag */
    commitOf(tag) {
      const r = git(['rev-list', '-n', '1', tag]);
      return r.ok ? r.stdout : null;
    },
    /** @param {string} from @param {string} to */
    countBetween(from, to) {
      const r = git(['rev-list', '--count', `${from}..${to}`]);
      return r.ok ? Number(r.stdout) : null;
    },
    /**
     * Commits reachable from HEAD but not from `since` (all of HEAD when since is null).
     * @param {string | null} since
     */
    commitsSince(since) {
      const range = since ? `${since}..HEAD` : 'HEAD';
      const r = git(['log', range, `--format=%H${FIELD}%s${FIELD}%b${RECORD}`]);
      if (!r.ok) return null;
      return r.stdout
        .split(RECORD)
        .map((rec) => rec.replace(/^\n+/, ''))
        .filter((rec) => rec.trim())
        .map((rec) => {
          const [hash, subject, body = ''] = rec.split(FIELD);
          return { hash: hash.trim(), subject: (subject || '').trim(), body: body.trim() };
        });
    },
    isClean() {
      const r = git(['status', '--porcelain']);
      return r.ok && r.stdout === '';
    },
    /**
     * @param {string} tag
     * @param {string} [remote]
     * @returns {boolean | null} null when the remote could not be reached
     */
    remoteHasTag(tag, remote = 'origin') {
      const r = git(['ls-remote', '--tags', remote, `refs/tags/${tag}`]);
      if (!r.ok) return null;
      return r.stdout.length > 0;
    },
  };
}
