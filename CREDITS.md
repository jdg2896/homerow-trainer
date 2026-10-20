# Credits

Homerow Trainer is an independent, non-commercial project. It shares no code with the projects below, but it would not exist without them. Thank you to everyone listed here.

## License

Homerow Trainer is © 2026 Jasper Gabriel and released under the [MIT License](LICENSE). The word list, sentences and fonts below keep their own licenses.

## Inspiration

- **[moosytype](https://github.com/moosylog/moosytype)** by moosylog: a typing trainer for split and ergonomic keyboards. Homerow Trainer's core ideas come from it: loading your own ZMK / MoErgo layout and adapting the trainer to it, an on-screen keyboard that shows the key you need on the right layer, practice that targets the keys you miss, and the overall feel of the typing interface.
- **[typing.com](https://www.typing.com)**: the progressive lesson structure (two new keys at a time, review lessons, units from the home row outward), the stage-by-stage lesson progress, star ratings, problem keys and the daily goal.
- **[keybr.com](https://www.keybr.com)**: the idea of generating practice words using only the letters you have unlocked so far.

## Keyboards, layouts and firmware

- **[Miryoku](https://github.com/manna-harbour/miryoku)** by Manna Harbour: the layout the bundled keymap is based on (home-row mods and thumb-held layers), and the reason the curriculum teaches symbols and numbers on thumb layers by default.
- **[MoErgo](https://www.moergo.com)**: the Go60 and Glove80 keyboards and the Layout Editor JSON format Homerow Trainer reads. The Starter layouts in `data/presets/` are MoErgo's official Go60 and Glove80 layouts, downloaded from its editors, and belong to their authors. The first-run default, "Miryoku (macOS)" for Go60, uses the TailorKey hold-tap definitions.
- **[ZMK Firmware](https://zmk.dev)**: the keymap format and behavior names (`&kp`, `&mt`, `&lt`, `&mo`, `&sk`, `&trans`) that the layout parser understands.

## Data

- **[wordfreq](https://github.com/rspeer/wordfreq)** by Robyn Speer: the practice word list in `data/words.json` is derived from wordfreq's English word frequencies. wordfreq's data is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), so `data/words.json` is shared under the same license. See `data/README.md`.
- **[Tatoeba](https://tatoeba.org)**: the practice sentences in `data/sentences.json` are a sample of short English sentences from Tatoeba's export, licensed under [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/). Sentences were filtered and some are reformatted as dialogue in practice. See `data/README.md`.
- **[english-words](https://github.com/dwyl/english-words)** (via the [english-words](https://pypi.org/project/english-words/) Python package): its `web2` dictionary was used at build time to filter names out of the word list. None of it is redistributed.

## Fonts

Loaded from Google Fonts, all under the [SIL Open Font License](https://openfontlicense.org):

- [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/) by the Braille Institute
- [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) by Mathieu Triay
- [IBM Plex Mono](https://github.com/IBM/plex) by IBM

## Tools

- Built with help from [Claude](https://claude.ai) by Anthropic.
