# Releasing

## Where the version comes from

The site's version is the latest Git tag that matches `vMAJOR.MINOR.PATCH` exactly (for example `v1.4.0`). Tags such as `V2`, `v1.2`, `v1.2.3-beta` or `release-1` are ignored. Tags are compared numerically, so `v1.10.0` is newer than `v1.9.0`.

`scripts/lib/version.mjs` is the only place that works this out. `npm run build` stamps the result into every page's footer and writes `dist/version.json`. No version number is written in the source; `npm run lint` fails if one appears.

| Build | Footer shows |
|---|---|
| HEAD is exactly a release tag | `v1.4.0` |
| Commits after a release tag | `Development build · after v1.4.0 · abc1234` |
| No release tag yet | `Development build · abc1234` |
| No Git metadata (e.g. a source archive) | `Version unknown` |
| Shallow clone | as above, with a build warning; CI fetches full history and tags |

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Commit | Release |
|---|---|
| `fix:` or `perf:` | patch |
| `feat:` | minor |
| `feat!:`, `fix!:`, any `type!:`, or a `BREAKING CHANGE:` footer | major |
| `docs:`, `chore:`, `refactor:`, `style:`, `test:` (and `build:`, `ci:`, `revert:`) | none |

A breaking change always wins over minor and patch. Merge commits are skipped. Other commit messages are listed as "ignored" and do not affect the version. Ordinary commits never create tags.

## Planning a release

```bash
npm run release:plan
```

Read-only. It shows the latest release tag, each commit since then and its effect, and the proposed next version. It stops with an error for a shallow clone, missing Git metadata, two release tags on the same commit, or a proposed tag that already exists.

## Tagging a release

Releases are tagged from the branch listed in `package.json` → `release.branches` (currently `master`), after the change has been merged there.

```bash
npm run release:tag -- --approve v1.4.0
```

The command creates the tag only when every check passes:

1. The plan is valid and has a release-worthy change.
2. The working tree is clean.
3. The current branch is an allowed release branch.
4. The tag does not exist locally or on `origin` (if `origin` can't be reached, it stops).
5. `--approve` names exactly the planned version. The approval is the human sign-off; without it nothing happens.
6. `npm run lint`, `npm test` and `npm run build` all pass.

It then creates one annotated local tag. It never pushes, moves or replaces a tag.

## Publishing the tag

Pushing is a separate step that needs its own approval:

```bash
git push origin v1.4.0
```

The tag push triggers the deploy workflow, which builds that exact commit, so the live footer shows `v1.4.0`.

## The first release

The repository has no release tag yet, and the first one is never created automatically. Once the first version is agreed (typically `v1.0.0`):

```bash
npm run release:tag -- --bootstrap v1.0.0 --approve v1.0.0
```
