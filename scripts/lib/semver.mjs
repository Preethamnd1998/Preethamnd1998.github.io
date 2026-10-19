// Strict semantic-version tags (vMAJOR.MINOR.PATCH) and Conventional Commits.

/** @typedef {{ major: number, minor: number, patch: number }} SemVer */
/** @typedef {'major' | 'minor' | 'patch' | 'none'} Bump */
/** @typedef {{ hash: string, subject: string, body: string }} Commit */
/** @typedef {{ commit: Commit, bump: Bump, type: string | null, breaking: boolean, conventional: boolean }} ClassifiedCommit */

// No leading zeros, no pre-release or build suffix, lowercase "v" only.
const STRICT_TAG = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

// type(scope)!: description
const CONVENTIONAL = /^(?<type>[a-z]+)(?:\((?<scope>[^()\r\n]+)\))?(?<bang>!)?: \S/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE: \S/m;

const PATCH_TYPES = new Set(['fix', 'perf']);
const MINOR_TYPES = new Set(['feat']);
const NO_BUMP_TYPES = new Set(['docs', 'chore', 'refactor', 'style', 'test', 'build', 'ci', 'revert']);

const BUMP_RANK = { none: 0, patch: 1, minor: 2, major: 3 };

/**
 * Parse a strict release tag. Returns null for anything else.
 * @param {string} tag
 * @returns {SemVer | null}
 */
export function parseTag(tag) {
  const match = STRICT_TAG.exec(String(tag).trim());
  if (!match) return null;
  const [major, minor, patch] = match.slice(1).map(Number);
  if (![major, minor, patch].every(Number.isSafeInteger)) return null;
  return { major, minor, patch };
}

/** @param {SemVer} v */
export function formatTag(v) {
  return `v${v.major}.${v.minor}.${v.patch}`;
}

/**
 * Numeric comparison, never alphabetical.
 * @param {SemVer} a
 * @param {SemVer} b
 */
export function compare(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/**
 * Split a tag list into valid release tags (sorted newest first) and ignored ones.
 * @param {string[]} tags
 */
export function sortReleaseTags(tags) {
  /** @type {{ tag: string, version: SemVer }[]} */
  const valid = [];
  /** @type {string[]} */
  const ignored = [];
  for (const tag of tags.map((t) => t.trim()).filter(Boolean)) {
    const version = parseTag(tag);
    if (version) valid.push({ tag, version });
    else ignored.push(tag);
  }
  valid.sort((a, b) => compare(b.version, a.version));
  return { valid, ignored };
}

/**
 * @param {string[]} tags
 * @returns {{ tag: string, version: SemVer } | null}
 */
export function latestReleaseTag(tags) {
  return sortReleaseTags(tags).valid[0] ?? null;
}

/**
 * @param {Commit} commit
 * @returns {ClassifiedCommit}
 */
export function classifyCommit(commit) {
  const match = CONVENTIONAL.exec(commit.subject);
  if (!match || !match.groups) {
    return { commit, bump: 'none', type: null, breaking: false, conventional: false };
  }
  const type = match.groups.type;
  const breaking = Boolean(match.groups.bang) || BREAKING_FOOTER.test(commit.body || '');
  /** @type {Bump} */
  let bump = 'none';
  if (breaking) bump = 'major';
  else if (MINOR_TYPES.has(type)) bump = 'minor';
  else if (PATCH_TYPES.has(type)) bump = 'patch';
  const known = breaking || MINOR_TYPES.has(type) || PATCH_TYPES.has(type) || NO_BUMP_TYPES.has(type);
  return { commit, bump, type, breaking, conventional: known };
}

/**
 * The highest bump across commits; a breaking change always wins.
 * @param {ClassifiedCommit[]} classified
 * @returns {Bump}
 */
export function highestBump(classified) {
  /** @type {Bump} */
  let best = 'none';
  for (const c of classified) if (BUMP_RANK[c.bump] > BUMP_RANK[best]) best = c.bump;
  return best;
}

/**
 * @param {SemVer} v
 * @param {Bump} bump
 * @returns {SemVer}
 */
export function bumpVersion(v, bump) {
  switch (bump) {
    case 'major':
      return { major: v.major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major: v.major, minor: v.minor + 1, patch: 0 };
    case 'patch':
      return { major: v.major, minor: v.minor, patch: v.patch + 1 };
    default:
      return { ...v };
  }
}

/** Merge commits made by Git hosting are expected and not release-relevant. */
export function isMergeCommit(/** @type {Commit} */ commit) {
  return /^Merge (pull request|branch|remote-tracking branch) /.test(commit.subject);
}
