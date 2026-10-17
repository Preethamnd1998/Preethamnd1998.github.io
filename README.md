# preethamnd1998.github.io

Personal portfolio of Preetham ND, served by GitHub Pages at <https://preethamnd1998.github.io/>.

It is a plain static site with no build step and no third-party scripts or fonts.

```
index.html        About and selected work
skills.html       Skills
experience.html   Work history
contact.html      Contact details
404.html          Not-found page (GitHub Pages serves it automatically)
assets/css/site.css   All styles, including dark mode
assets/js/site.js     Mobile menu and scroll reveal
assets/icons.svg      SVG icon sprite
assets/img/           Social preview image and touch icon
sitemap.xml, robots.txt
```

To preview locally, run `python3 -m http.server` in this folder and open <http://localhost:8000>. A local server is needed (rather than opening the file directly) so the icon sprite loads.

When you add or rename a page, update the navigation in every page and add it to `sitemap.xml`.
