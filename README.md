# anthonyellis.dev

Personal portfolio, served straight from this repository by GitHub Pages at
[anthonyellis.dev](https://anthonyellis.dev).
## Layout

```
index.html              landing page — hero, projects, about, contact
404.html                custom not-found page (GitHub Pages serves this automatically)
CNAME                   custom domain binding — do not delete
robots.txt              crawler hints
sitemap.xml             URL list for search engines
assets/
  css/site.css          the entire design system: colours, cards, case-study layout
  favicon.svg
  img/*.jpg             screenshots of each demo (also used for link previews)
projects/
  solvane/index.html    case study  →  /projects/solvane/      (GameMaker, no demo)
  galaxy/index.html     case study  →  /projects/galaxy/
  arterial/index.html   case study  →  /projects/arterial/
  aquarium/index.html   case study  →  /projects/aquarium/
test/verify.mjs         17 automated checks against demos/galaxy.html (npm run verify)
demos/
  galaxy.html           the live simulations, each a single self-contained file
  arterial.html
  aquarium.html
```
