# AGENTS.md

## Blog posts

- Posts live in a separate repo: `~/Documents/blog-posts/zh-tw/<title as URL>.md`
  (images in `blog-posts/zh-tw/images/`, linked as `./images/x.png`).
- `src/content/blog` is a git-ignored symlink to it: `ln -s ../../../blog-posts src/content/blog`.

## Agent skills (`.claude/skills/`)

- `project-commit`: commit the current changes in this repo's style; never pushes.
- `amend-changes`: fold changes into an earlier commit (`/amend-changes <commit>`).

## Project structure

```
src/data/profile.yaml          card + site text (edit this)
src/content/blog/              posts (symlink to ../blog-posts)
src/content.config.ts          blog collection + title => URL rule
src/lib/posts.ts               post queries, CONTENT_LANG, paging
src/lib/github-status.ts       build-time GitHub status emoji
src/i18n/ui.ts                 UI strings (zh-tw, en) + locale helpers
src/layouts/BaseLayout.astro   header, nav, canonical
src/components/Card.astro      card markup + styles
src/components/ChipList.astro  year/tag chips with "load more..."
src/components/LangMenu.astro  language dropdown
src/scripts/card.ts            card sizing, tilt, flip, drag
src/scripts/holo.ts            dithered holo shine on the card
src/styles/global.css          design tokens, themes, prose styles
scripts/build-sprites.mjs      GIF => sprite strips
assets/                        source GIFs (card, 404, header icon)
public/sprites/generated/      built sprite strips (git-ignored)
public/fonts/                  Cubic 11 pixel font
.github/workflows/deploy.yml   deploy to GitHub Pages
```
