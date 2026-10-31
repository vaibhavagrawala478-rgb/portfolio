<img src="assets/icon.svg" width="64" height="64" alt="">

# Vaibhav — portfolio

A hand-built, dependency-free portfolio: plain HTML, CSS and JavaScript with self-hosted fonts.

## Run it

Any static server works, for example:

```sh
python -m http.server 5173
```

then open <http://localhost:5173>. (Opening `index.html` directly also works.)

## Structure

| Path | What it is |
| --- | --- |
| `index.html` | Hero, Achievements, Projects, Games, Scratch, Toolkit, About, Contact — semantic markup |
| `css/styles.css` | Design tokens, layout, motion, responsive rules (the last two blocks are the "elevation" and "story" layers) |
| `js/main.js` | Intro, master animation loop (cursor, weight-reactive type, ticker, parallax, scroll storytelling), bubbles canvas, game select screen, Scratch demo, copy-email |
| `assets/fonts/` | Fraunces, Instrument Sans, DM Mono (latin subsets, WOFF2) |
| `assets/img/` | FitCheck screenshot and the Spawn game cover art (WebP, 640w and 1200w) |

## Editing content

- **Projects** — the `#projects` section. Add a normal `<a href target="_blank" rel="noopener">`; only link things that are public.
- **Games** — the `#games` section is a tab list (`.arcade-tab`) plus one `.game` panel per tab. To add a game, add a tab and a panel and give the panel a colour with `.game--yourkey { --g: … }`. Cover art for the Spawn games comes from each game's own Spawn page image.
- **Scratch** — username, status and the join date live in `#scratch`. The "Joined … ago" text is calculated in `main.js` from `data-joined` on `#scratch-joined`.
- **Toolkit** — each tool is a `<span class="tool tw-…">`; the `tw-*` class picks its type style. Official logos are intentionally not used — they're wordmarks.

- **Languages** — the `#languages` section. The Hindi text uses `assets/fonts/tiro-devanagari-subset.woff`, a subset of Tiro Devanagari Hindi (OFL) that only contains the glyphs currently on the page. If you add new Devanagari text, re-subset the font (e.g. with `pyftsubset`) so the new letters are included.
- **Toolkit** — four groups (`AI & Research`, `Development & Coding`, `Design & Creation`, `Technology & Infrastructure`). Logos come from Simple Icons and are only used where the brand mark exists; they stay the property of their owners and don't imply any partnership.

## Notes

- Zombie Killer has no public preview, so its panel is typography and abstract graphics rather than a screenshot. Its GitHub repository must be public for the link to work for visitors.
- The intro plays once per browser session (skipped for reduced-motion users and when the URL has a `#hash`). Clear the `vaibhav-intro` sessionStorage key to replay it.
- Fine-pointer-only effects (custom cursor, magnetic buttons, hero bubble-popping, weight-reactive letters) are disabled on touch devices.
- Everything respects `prefers-reduced-motion`: reveals become instant, the ticker and wordmark fill stay static, the game transitions and tool float are neutralised, and the intro is skipped.
