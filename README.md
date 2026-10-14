# Homerow

A typing trainer that builds typing.com-style progressive lessons from your own keyboard layout. Load a MoErgo Layout Editor export (Go60, Glove80) or a ZMK `.keymap`, and it works out which finger, layer and modifier produces every character, then teaches them in order.

Inspired by [moosytype](https://github.com/moosylog/moosytype), [typing.com](https://www.typing.com) and [keybr.com](https://www.keybr.com). See [CREDITS.md](CREDITS.md).

## What it does

- **Layout-driven curriculum.** Home row → top row → bottom row → reach keys → capitals → shifted symbols → each thumb layer → navigation keys → ⌘/⌃ shortcuts. Two new keys per lesson, with review lessons along the way.
- **Staged drills.** Meet the keys → mixed drill → words → sentences (code-style snippets for symbol layers). Words only use keys you've already unlocked.
- **Hints from the keymap.** "Hold Enter for Symbols (right thumb), then press `(` (left thumb)", with the target and held keys lit on an on-screen keyboard.
- **Home-row mod aware.** Capitals use the opposite-hand shift. Accidental ⌘/⌃/⌥/Shift firing while typing letters is counted as a misfire.
- **Adaptive practice.** Per-key miss rate and latency drive a "problem keys" drill. Also free practice and custom text.
- **Local only.** Layouts, progress and stats live in `localStorage`, kept separately per layout.

## Supported layouts

| Input | Notes |
|---|---|
| MoErgo `.json` (Go60, Glove80) | Custom hold-taps (`holdTaps`) are resolved to mod-tap or layer-tap |
| ZMK `.keymap` | `&kp`, `&mt`, `&lt`, `&mo`, `&sk`, `&trans`, custom hold-tap behaviors |
| Other key counts | Lessons still work; the keyboard is drawn as a plain grid |

Key codes are mapped assuming a US ANSI host layout. Go60/Glove80 key geometry is approximate.

## Develop

No dependencies for the app itself.

```sh
python3 build.py              # writes dist/index.html
node test/curriculum.js       # prints the generated curriculum and sample drills for the bundled layout
node tools/fetch_presets.mjs  # refresh data/presets/ from the layouts MoErgo's editors currently ship
open dist/index.html
```

The **Starter layouts** dropdown (Layout view) is populated from `data/presets/`,
which `tools/fetch_presets.mjs` downloads from the live Go60 and Glove80 editors.
Re-run it, then `python3 build.py`, to refresh the catalog.

```
src/engine.js   layout parsing, routing, curriculum, drill generation (pure, runs in node)
src/ui.js       views, typing engine, stats, storage
src/style.css   styles and theme tokens (light/dark)
data/           bundled default layout (Miryoku macOS on Go60) and word list
```

## Credits

- [moosytype](https://github.com/moosylog/moosytype): layout-adaptive training, layout loading, on-screen keyboard and the typing interface
- [typing.com](https://www.typing.com): progressive lessons, reviews, stars and daily goal
- [keybr.com](https://www.keybr.com): words built only from unlocked letters
- [Miryoku](https://github.com/manna-harbour/miryoku), [MoErgo](https://www.moergo.com) and [ZMK](https://zmk.dev): the layout, keyboards and keymap formats
- [wordfreq](https://github.com/rspeer/wordfreq): the practice word list (CC BY-SA 4.0)

Full list, including fonts, in [CREDITS.md](CREDITS.md).

## License

Code is [MIT](LICENSE). `data/words.json` is CC BY-SA 4.0 and `data/default-layout.json` belongs to its authors; see [data/README.md](data/README.md).
