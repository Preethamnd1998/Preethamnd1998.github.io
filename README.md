# preethamnd1998.github.io

Portfolio of Preetham ND, published with GitHub Pages at <https://preethamnd1998.github.io/>.

A static site with no runtime dependencies: no framework, no third-party scripts, fonts or stylesheets. Node.js is only used for the tooling below.

## Editing content

All copy lives in structured data, and the HTML pages are generated from it.

| What | Where |
|---|---|
| Pages, case studies, skills, toolkit, experience | `data/site.json` |
| GitHub repository cards | `data/repos.json` |
| Page templates | `scripts/lib/render.mjs` |
| Styles (light and dark) | `assets/css/site.css` |
| Menu and scroll reveal | `assets/js/site.js` |
| Icons | `assets/icons.svg` |

After changing data or templates, run `npm run generate` and commit the regenerated `*.html` and `sitemap.xml`. `npm run lint` fails if they are out of date.

To refresh repository names, descriptions, languages and stars from the public GitHub API, run `npm run repos:refresh`, then `npm run generate`. Set `GITHUB_TOKEN` in your shell only if you hit the API rate limit; it is never written to disk. Private repositories are skipped.

## Commands

```bash
npm ci               # install dev tools (TypeScript for type checks)
npm run generate     # rebuild pages from data/
npm run lint         # links, anchors, accessibility basics, stale pages, hard-coded versions, secrets
npm run typecheck    # tsc -b over the scripts, tests and site JS (also: npx tsc -b)
npm test             # node:test suite
npm run build        # dist/ with the version stamped from Git tags
npm run release:plan # what the next release would be (read-only)
npm run release:tag  # create an approved local release tag (never pushes)
```

To preview, run `npm run build` and serve `dist/`, for example `python3 -m http.server -d dist`.

## Version and releases

The footer shows the version from the latest strict `vMAJOR.MINOR.PATCH` Git tag, stamped in at build time. See [RELEASING.md](RELEASING.md).

## Deployment

`.github/workflows/site.yml` runs lint, type checks, tests and the build on every pull request. On pushes to `master` and on release tags it deploys `dist/` to GitHub Pages.

This needs one setting: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Until that is switched, GitHub keeps serving the committed files from `master` directly, and the footer reads "Development build".

## Articles

Articles are data, not hand-written HTML. `data/articles.json` holds a list of **series**, each with an ordered list of **articles**; `scripts/lib/articles.mjs` renders `articles.html` (index) and one `article-<slug>.html` per article, with previous/next links inside a series.

Article fields: `slug` (lowercase kebab-case, unique), `number` (unique in its series, sets order), `title`, `summary`, `status` (`draft` or `published`), `sections` (`heading` plus `paragraphs` and/or `list`, or `subsections` for `###`-level groupings — see Method in article 001 for an example), optional `references` (`label`, optional `href`), and `publishedOn` (`YYYY-MM-DD`) which is **required when published and forbidden on drafts**.

Drafts are labelled on the page, marked `noindex`, and left out of `sitemap.xml`. Publishing is a data change: set `status` to `published` and add the real `publishedOn` date after review.

To add an article, append to a series' `articles`. To add a new series, append an object to `series` with `id`, `title`, `description`, `repo` and `articles`. Then run `npm run generate && npm run lint && npm run typecheck && npm test && npm run build`.

### Keeping article content in sync with its canonical Markdown

Article text in `data/articles.json` is a structured copy of the Markdown in the [article repository](https://github.com/Preethamnd1998/Ai-Driven-Software-Development) (e.g. `articles/001-ai-integrated-sdlc/article.md`). That repository is **not** available at build time here (no network access, no assumed sibling checkout), so the portfolio can't render straight from it — the copy in `data/articles.json` is what actually ships. Two mechanisms guard against that copy silently drifting from the canonical source, and it's important to understand what each one does and does not prove:

- **`npm run check:articles`** (offline, runs as part of `npm test` via `test/article-sync.test.mjs`, safe in CI): compares `data/articles.json` against a committed fixture in `test/fixtures/<slug>.article.md`, and checks that the fixture's SHA-256 hash still matches the `sourceHash` recorded on the article in `data/articles.json`. This catches the fixture or the JSON being edited without the other — **but it cannot detect drift from the canonical article.md in the article repository**, because that file isn't read. If someone edits the canonical article and forgets to update the fixture and `sourceHash` together, this check still passes.
- **`npm run sync:articles -- --dir <path-to-article-repo>`** (or `ARTICLES_REPO_DIR=<path>`, local-only, not run in CI): reads the real canonical `article.md` from the given path, diffs it against `data/articles.json`, and reports whether the committed fixture and recorded `sourceHash` still match that canonical file. This is the only check that actually verifies against the canonical source, and it has to be run by hand (or wired into a local pre-publish step) because the article repository's location isn't fixed and this repo shouldn't assume or fetch it.

Workflow when the canonical article changes: edit `article.md` in the article repository, update the matching `sections`/`subsections` in `data/articles.json` to match, then run `npm run sync:articles -- --dir <path> --write` to refresh the fixture, copy the printed `sourceHash` into `data/articles.json`, and re-run `npm test`.
