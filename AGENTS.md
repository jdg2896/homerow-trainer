# AGENTS.md

Notes for coding agents. The README has the user-facing overview, the commands and the file map.

## Ground rules

- **No dependencies, no bundler, no modules.** `build.mjs` inlines `src/errors.js`, `src/engine.js` and `src/ui.js` as plain `<script>` blocks in one `dist/index.html`. They share globals (`HomerowTrainerEngine`, `window.HOMEROW_TRAINER_*`), so don't add `import`/`export` or npm packages.
- **`src/engine.js` stays pure.** No DOM. It also runs in Node via `module.exports` for the test.
- **`dist/` is generated and gitignored.** Edit `src/`, then run `npm run build`.
- **Don't hand-edit `data/sentences.json`.** `npm run sentences` rebuilds it from Tatoeba's English export (needs `bunzip2`).
- **Don't hand-edit `data/presets/`.** `npm run presets` downloads it from MoErgo's editors. The build fails if it's empty, and the app seeds its first-run layout from it (`DEFAULT_LAYOUT_ID` in `ui.js`).
- **Storage keys are prefixed `homerow-trainer.`** and stats are kept per layout (`stats.<layoutId>`). Don't rename them without a migration, or users lose their progress.

## Drills and curriculum

- Changes to lessons, drill text or practice should follow [docs/learning-principles.md](docs/learning-principles.md). If one departs from a principle, say why in the PR, and update the doc when a gap it lists is closed.

## Before you finish

- Run `npm test` (CI runs it on every PR, and deploy runs it before publishing to GitHub Pages) and `npm run build`.
- For UI changes, open `dist/index.html` and check light and dark themes and a narrow (≤860px) window.
- Bump `version` in `package.json` when you ship user-facing changes, in the same commit as the last of those changes rather than a separate "Bump version" commit. The footer and bug reports show the version next to the commit that `build.mjs` stamps in, so that commit should show what changed.
- Add a `## <version> — <date>` section to `CHANGELOG.md` in that same commit, with short user-facing bullets. The build fails without one, and returning users see those bullets as "What's new" on the Lessons page.

## Style

- Match the surrounding code. It's dense vanilla JS: views are template-string functions that re-render `#app`, and clicks are routed through `data-act` and other `data-*` attributes in one delegated handler.
- Comments are sparse and explain *why*.
- CSS colors go through the tokens in `src/style.css`. Any new token needs both the light and the dark value.
- Commit subjects are short, imperative and in sentence case ("Add …", "Fix …"), with no prefixes.
