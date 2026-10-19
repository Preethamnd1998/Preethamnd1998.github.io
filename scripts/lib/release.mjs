// Release planning (read-only) and guarded local tag creation. Nothing here ever pushes.
import { gitQueries } from './git.mjs';
import {
  bumpVersion,
  classifyCommit,
  formatTag,
  highestBump,
  isMergeCommit,
  parseTag,
  sortReleaseTags,
} from './semver.mjs';

/**
 * @typedef {object} ReleasePlan
 * @property {boolean} ok
 * @property {string[]} errors
 * @property {string[]} warnings
 * @property {boolean} bootstrap        True when the repo has no valid release tag yet.
 * @property {string | null} latestTag
 * @property {import('./semver.mjs').Bump} bump
 * @property {string | null} nextTag
 * @property {import('./semver.mjs').ClassifiedCommit[]} releasing  Commits that cause the bump.
 * @property {import('./semver.mjs').ClassifiedCommit[]} noBump     Conventional commits with no bump.
 * @property {import('./semver.mjs').Commit[]} unsupported          Non-conventional commits (ignored).
 * @property {import('./semver.mjs').Commit[]} merges
 */

/**
 * Work out the next release from commits since the latest strict tag. Never modifies Git state.
 * @param {import('./git.mjs').GitRunner} git
 * @returns {ReleasePlan}
 */
export function planRelease(git) {
  const q = gitQueries(git);
  /** @type {ReleasePlan} */
  const plan = {
    ok: false,
    errors: [],
    warnings: [],
    bootstrap: false,
    latestTag: null,
    bump: 'none',
    nextTag: null,
    releasing: [],
    noBump: [],
    unsupported: [],
    merges: [],
  };

  if (!q.isRepo()) {
    plan.errors.push('Not inside a Git repository, so there is no history to plan from.');
    return plan;
  }
  if (!q.head()) {
    plan.errors.push('The repository has no commits yet.');
    return plan;
  }
  if (q.isShallow()) {
    plan.errors.push('This is a shallow clone, so commits or tags may be missing. Run `git fetch --unshallow --tags` and try again.');
    return plan;
  }

  const { valid, ignored } = sortReleaseTags(q.tags());
  const lookalikes = ignored.filter((t) => /^v?\d/i.test(t));
  if (lookalikes.length) {
    plan.warnings.push(`Ignoring tags that are not strict vMAJOR.MINOR.PATCH: ${lookalikes.join(', ')}`);
  }

  // Two release tags on one commit means the history is ambiguous.
  /** @type {Map<string, string[]>} */
  const byCommit = new Map();
  for (const { tag } of valid) {
    const sha = q.commitOf(tag);
    if (!sha) continue;
    byCommit.set(sha, [...(byCommit.get(sha) || []), tag]);
  }
  for (const tags of byCommit.values()) {
    if (tags.length > 1) plan.errors.push(`Duplicate release tags on the same commit: ${tags.join(', ')}. Resolve this by hand before releasing.`);
  }

  const latest = valid[0] ?? null;
  plan.latestTag = latest ? latest.tag : null;
  plan.bootstrap = !latest;

  const commits = q.commitsSince(plan.latestTag);
  if (commits === null) {
    plan.errors.push(`Could not read commits since ${plan.latestTag ?? 'the start of history'}.`);
    return plan;
  }

  for (const commit of commits) {
    if (isMergeCommit(commit)) {
      plan.merges.push(commit);
      continue;
    }
    const c = classifyCommit(commit);
    if (!c.conventional) plan.unsupported.push(commit);
    else if (c.bump === 'none') plan.noBump.push(c);
    else plan.releasing.push(c);
  }
  if (plan.unsupported.length) {
    plan.warnings.push(`${plan.unsupported.length} commit(s) do not follow Conventional Commits and were ignored for versioning.`);
  }

  plan.bump = highestBump(plan.releasing);
  if (latest && plan.bump !== 'none') {
    const next = formatTag(bumpVersion(latest.version, plan.bump));
    plan.nextTag = next;
    if (valid.some((t) => t.tag === next)) {
      plan.errors.push(`The next version ${next} already exists as a tag.`);
    }
  }

  plan.ok = plan.errors.length === 0;
  return plan;
}

/**
 * @typedef {object} TagOptions
 * @property {string | undefined} approve      The exact tag the person approved, e.g. "v1.3.0".
 * @property {string | undefined} [bootstrap]  First tag to create when the repo has none.
 * @property {string[]} allowedBranches
 * @property {() => { ok: boolean, failures: string[] }} validate  Runs lint, tests and build.
 * @property {string} [remote]
 */

/**
 * Create one approved, annotated local tag after every safeguard passes. Never pushes.
 * @param {import('./git.mjs').GitRunner} git
 * @param {TagOptions} opts
 */
export function tagRelease(git, opts) {
  const q = gitQueries(git);
  const plan = planRelease(git);
  /** @type {string[]} */
  const errors = [...plan.errors];
  const result = { ok: false, created: /** @type {string | null} */ (null), errors, plan };
  if (errors.length) return result;

  /** @type {string | null} */
  let target = plan.nextTag;
  if (plan.bootstrap) {
    if (!opts.bootstrap) {
      errors.push('No release tag exists yet. Choose the first version and pass it with --bootstrap, for example --bootstrap v1.0.0 --approve v1.0.0.');
      return result;
    }
    if (!parseTag(opts.bootstrap)) {
      errors.push(`--bootstrap ${opts.bootstrap} is not a strict vMAJOR.MINOR.PATCH tag.`);
      return result;
    }
    target = opts.bootstrap;
  } else if (opts.bootstrap) {
    errors.push('--bootstrap is only allowed when the repository has no release tag.');
    return result;
  }

  if (!target) {
    errors.push(`No release-worthy commits since ${plan.latestTag}. Nothing to tag.`);
    return result;
  }

  if (!q.isClean()) errors.push('The working tree has uncommitted changes. Commit or stash them first.');

  const branch = q.currentBranch();
  if (!branch) errors.push('HEAD is detached. Check out the release branch first.');
  else if (!opts.allowedBranches.includes(branch)) {
    errors.push(`Releases are only tagged from ${opts.allowedBranches.join(' or ')}; the current branch is ${branch}.`);
  }

  if (q.tags().includes(target)) errors.push(`Tag ${target} already exists locally.`);
  const remote = q.remoteHasTag(target, opts.remote);
  if (remote === null) errors.push(`Could not check ${opts.remote || 'origin'} for ${target}. Re-run when the remote is reachable.`);
  else if (remote) errors.push(`Tag ${target} already exists on ${opts.remote || 'origin'}.`);

  if (opts.approve !== target) {
    errors.push(
      opts.approve
        ? `Approval was given for ${opts.approve}, but the planned release is ${target}.`
        : `Release ${target} needs explicit approval. Re-run with --approve ${target}.`,
    );
  }

  if (errors.length) return result;

  const validation = opts.validate();
  if (!validation.ok) {
    errors.push(`Validation failed: ${validation.failures.join(', ')}.`);
    return result;
  }

  const tagged = git(['tag', '-a', target, '-m', `Release ${target}`]);
  if (!tagged.ok) {
    errors.push(`git tag failed: ${tagged.stderr}`);
    return result;
  }
  result.ok = true;
  result.created = target;
  return result;
}
