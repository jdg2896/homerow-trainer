# Homerow Trainer

A typing trainer for ergonomic split keyboards that builds typing.com-style progressive lessons from your own layout. Load a MoErgo Layout Editor export (Go60, Glove80) or a ZMK `.keymap`, and it works out which finger, layer and modifier produces every character — thumb layers and home-row mods included — then teaches them in order.

Inspired by [moosytype](https://github.com/moosylog/moosytype), [typing.com](https://www.typing.com) and [keybr.com](https://www.keybr.com). See [CREDITS.md](CREDITS.md).

## Motivation

I bought a MoErgo Go60 (September 2026) due to arm pain. As a first-time ergonomic split keyboard user figuring out the next steps, I found the [MoErgo Discord community](https://discord.com/invite/cdywSRX9qF) and [Moosy's personal research notes](https://sites.google.com/view/keyboards/about) helpful for onboarding. I was originally going to keep QWERTY, but realized my touch typing skills from a regular keyboard don't carry over to columnar layouts, and I'd have to relearn regardless. So that realization, along with reading [Moosy's "Learn" section](https://sites.google.com/view/keyboards/learn), made me decide to learn a new [keyboard layout (Miryoku layout adaptation for macOS)](https://my.moergo.com/go60/#/layout/miryoku-macos).

I only learned to touch type QWERTY around 2019, and [typing.com](https://www.typing.com/) helped a lot, since the lessons were progressive and interactive. Fast forward to today, I'm learning a new keyboard layout. While there are open-source practice tools like [moosytype (inspired by monkeytype)](https://moosylog.github.io/moosytype/), I was looking for a similar learning experience to typing.com, but adapted to MoErgo keyboards, and ergonomic keyboards in general. So I decided to build my own app with the help of Claude.

## What it does

- **Layout-driven curriculum.** Home row → top row → bottom row → reach keys → capitals → shifted symbols → each thumb layer → navigation keys → ⌘/⌃ shortcuts. Two new keys per lesson, with review lessons along the way.
- **Staged drills.** Meet the keys → mixed drill → words → sentences (code-style snippets for symbol layers). Words only use keys you've already unlocked, and real sentences from Tatoeba take over once you know every letter in them.
- **Hints from the keymap.** "Hold Enter for Symbols (right thumb), then press `(` (left thumb)", with the target and held keys lit on an on-screen keyboard.
- **Home-row mod aware.** Capitals use the opposite-hand shift. Accidental ⌘/⌃/⌥/Shift firing while typing letters is counted as a misfire.
- **Adaptive practice.** Per-key miss rate and latency drive a "problem keys" drill, and letter pairs you fumble get drilled more in common combos. Also free practice and custom text.
- **Grounded in how people learn to type.** Accuracy before speed, short daily sessions, real words early and common letter combinations. See [docs/learning-principles.md](docs/learning-principles.md).
- **Local only.** Layouts, progress and stats live in `localStorage`, kept separately per layout. The page makes no network requests, fonts included.

## Supported layouts

| Input                          | Notes                                                                  |
| ------------------------------ | ---------------------------------------------------------------------- |
| MoErgo `.json` (Go60, Glove80) | Custom hold-taps (`holdTaps`) are resolved to mod-tap or layer-tap     |
| ZMK `.keymap`                  | `&kp`, `&mt`, `&lt`, `&mo`, `&sk`, `&trans`, custom hold-tap behaviors |
| Other key counts               | Lessons still work; the keyboard is drawn as a plain grid              |

Key codes are mapped assuming a US ANSI host layout. Go60/Glove80 key geometry is approximate.

## Develop

No dependencies for the app itself, and Node is the only runtime. The `npm` scripts are thin wrappers (no packages to install).

```sh
npm run build      # node build.mjs — writes dist/index.html
npm test           # node test/curriculum.js — builds every bundled layout and checks each drill item routes
npm run presets    # node tools/fetch_presets.mjs — refresh data/presets/ from MoErgo's live editors
npm run sentences  # node tools/fetch_sentences.mjs — refresh data/sentences.json from Tatoeba
npm run fonts      # node tools/fetch_fonts.mjs — refresh data/fonts/ from Google Fonts
open dist/index.html
```

`npm test` and `npm run build` run in CI on every pull request (`.github/workflows/ci.yml`), and
the deploy workflow runs the test before publishing to GitHub Pages.

The **Starter layouts** dropdown (Layout view) is populated from `data/presets/`,
which `tools/fetch_presets.mjs` downloads from the live Go60 and Glove80 editors.
Re-run it, then `node build.mjs`, to refresh the catalog.

```
docs/           learning-principles.md — what drills and the curriculum are based on
src/engine.js   layout parsing, routing, curriculum, drill generation (pure, runs in node)
src/ui.js       views, typing engine, stats, storage
src/style.css   styles and theme tokens (light/dark)
data/           word list, sentences, fonts/ and presets/ (Starter layouts; first-run default is seeded from here)
CHANGELOG.md    release notes; build.mjs shows this version's section in the app as "What's new"
```

## Contributing

This is a personal project, and I'm open to feedback. Also feel free to [file an issue](https://github.com/jdg2896/homerow-trainer/issues/new/choose) or make a pull request if you have interesting ideas, improvements, or bug fixes. Otherwise, you can fork this repository and adapt it to your liking.

## Security

Homerow Trainer is a static page with no backend, and your layouts and progress never leave your browser. Layout and backup files are treated as untrusted, since they're often shared. If you find a way for a file, a backup or pasted text to run code in the page, please report it privately as described in [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Credits

- [moosytype](https://github.com/moosylog/moosytype): layout-adaptive training, layout loading, on-screen keyboard and the typing interface
- [typing.com](https://www.typing.com): progressive lessons, reviews, stars and daily goal
- [keybr.com](https://www.keybr.com): words built only from unlocked letters
- [Miryoku](https://github.com/manna-harbour/miryoku), [MoErgo](https://www.moergo.com) and [ZMK](https://zmk.dev): the layout, keyboards and keymap formats
- [wordfreq](https://github.com/rspeer/wordfreq): the practice word list (CC BY-SA 4.0)
- [Tatoeba](https://tatoeba.org): the practice sentences (CC BY 2.0 FR)

Full list, including fonts, in [CREDITS.md](CREDITS.md).

## License

Code is [MIT](LICENSE). `data/words.json` is CC BY-SA 4.0, `data/sentences.json` is CC BY 2.0 FR (Tatoeba) and the bundled layouts in `data/presets/` belong to their authors; see [data/README.md](data/README.md).
