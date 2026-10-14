# Data files

| File | Source | License |
|---|---|---|
| `words.json` | Top English words from [wordfreq](https://github.com/rspeer/wordfreq), filtered to lowercase dictionary words (names and profanity removed) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), same as wordfreq's data |
| `presets/*.json` | Official Go60 and Glove80 layouts published by [MoErgo](https://www.moergo.com) (including the "Miryoku (macOS)" layout based on [Miryoku](https://github.com/manna-harbour/miryoku)), downloaded by `tools/fetch_presets.mjs` | Belong to their authors; bundled as the Starter layouts catalog. The app seeds its first-run default layout from this set (Miryoku macOS on Go60), so it works out of the box |

Changes to `words.json`: selected the most frequent alphabetic words of 2–9 letters, then removed proper nouns, abbreviations and offensive words.
