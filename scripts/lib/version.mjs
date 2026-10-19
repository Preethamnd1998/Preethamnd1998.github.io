// Single source of truth for the version shown on the site: the latest strict release tag.
import { gitQueries } from './git.mjs';
import { latestReleaseTag, sortReleaseTags } from './semver.mjs';

/**
 * @typedef {object} AppVersion
 * @property {'release' | 'development' | 'unknown'} kind
 * @property {string | null} version  The release tag, only when HEAD is exactly that tag.
 * @property {string | null} baseTag  Latest release tag reachable in the repo, if any.
 * @property {number | null} commitsSinceTag
 * @property {string | null} commit   Short commit hash.
 * @property {string} label           Human-readable text for the footer.
 * @property {string[]} warnings
 */

/**
 * @param {import('./git.mjs').GitRunner} git
 * @returns {AppVersion}
 */
export function resolveAppVersion(git) {
  const q = gitQueries(git);
  /** @type {string[]} */
  const warnings = [];

  if (!q.isRepo()) {
    return {
      kind: 'unknown',
      version: null,
      baseTag: null,
      commitsSinceTag: null,
      commit: null,
      label: 'Version unknown',
      warnings: ['Git metadata is not available, so no version can be derived.'],
    };
  }

  const commit = q.shortHead();
  if (q.isShallow()) warnings.push('Shallow clone: tags or history may be missing. Fetch with full history and tags for release builds.');

  const releaseTagsAtHead = sortReleaseTags(q.tagsAt('HEAD')).valid;
  if (releaseTagsAtHead.length > 1) {
    warnings.push(`Several release tags point at HEAD (${releaseTagsAtHead.map((t) => t.tag).join(', ')}); using the highest.`);
  }
  if (releaseTagsAtHead.length > 0) {
    const tag = releaseTagsAtHead[0].tag;
    return { kind: 'release', version: tag, baseTag: tag, commitsSinceTag: 0, commit, label: tag, warnings };
  }

  const latest = latestReleaseTag(q.tags());
  if (!latest) {
    return {
      kind: 'development',
      version: null,
      baseTag: null,
      commitsSinceTag: null,
      commit,
      label: commit ? `Development build · ${commit}` : 'Development build',
      warnings,
    };
  }

  const ahead = q.countBetween(latest.tag, 'HEAD');
  return {
    kind: 'development',
    version: null,
    baseTag: latest.tag,
    commitsSinceTag: ahead,
    commit,
    label: `Development build · after ${latest.tag}${commit ? ` · ${commit}` : ''}`,
    warnings,
  };
}
