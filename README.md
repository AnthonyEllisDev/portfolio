# anthonyellis.dev

Personal portfolio, served straight from this repository by GitHub Pages at
[anthonyellis.dev](https://anthonyellis.dev). No build step, no dependencies,
no framework — every page is hand-written HTML against one shared stylesheet.

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

Folders with an `index.html` give clean URLs (`/projects/galaxy/`), so nothing
ends in `.html` except the demos themselves.

## Adding a fourth project

1. Drop the self-contained demo at `demos/<name>.html`.
2. Copy the closest `projects/<name>/index.html` and rewrite the prose. Keep the
   `<title>`, `<meta name="description">`, canonical URL and the `og:` tags in sync —
   they are what Slack, LinkedIn and iMessage read when the link is shared.
3. Screenshot the demo at 1600×1000, crop to 16:10, resize to 1200px wide, save as
   `assets/img/<name>.jpg` at quality ~82.
4. Add a `<article class="card">` block to `index.html` and a `<url>` to `sitemap.xml`.

## Working on it locally

GitHub Pages resolves root-relative paths like `/assets/css/site.css` from the domain
root, so opening the files with `file://` will show unstyled pages. Serve the folder
instead:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploying

Pushing to `main` is the deploy. GitHub Pages rebuilds within a minute or two;
a hard refresh (Cmd/Ctrl + Shift + R) clears the CDN cache locally if the old
page seems sticky.

## Email

The site advertises `anthony@anthonyellis.dev`. That address only works once
Cloudflare Email Routing is configured — see `EMAIL-SETUP.md`. Until then, mail sent
to it bounces.

## Résumé

`resume.pdf` at the repo root is what the Contact section links to. It is generated from
`resume-source.html`: open that file in Chrome, Cmd/Ctrl + P, "Save as PDF", Letter,
margins set to None (the page sets its own), background graphics on. `resume.docx` is
the editable version for recruiters and job portals that demand Word.


## The timeline

The "How I got here" section on the landing page is a two-track rail: work above the
spine, self-taught below it. Each entry is one `.moment` block containing an optional
`.card-t` (work), a `.node` (dot plus year) and an optional `.card-b` (personal). Add
`is-work`, `is-self` or `is-both` to the moment to color the dot.

It scrolls horizontally on desktop and collapses to a vertical timeline under 760px, both
from the same markup. To add an entry, copy a `.moment` block and drop it in chronological
order; nothing is positioned by date, only by document order.
