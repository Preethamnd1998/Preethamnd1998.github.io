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
