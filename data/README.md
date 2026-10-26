# Data files

| File | Source | License |
|---|---|---|
| `words.json` | Top English words from [wordfreq](https://github.com/rspeer/wordfreq), filtered to lowercase dictionary words (names and profanity removed) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), same as wordfreq's data |
| `sentences.json` | 4,000 short English sentences from [Tatoeba](https://tatoeba.org), downloaded by `tools/fetch_sentences.mjs` | [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/), Tatoeba's license for its sentence exports |
| `presets/*.json` | Official Go60 and Glove80 layouts published by [MoErgo](https://www.moergo.com) (including the "Miryoku (macOS)" layout based on [Miryoku](https://github.com/manna-harbour/miryoku)), downloaded by `tools/fetch_presets.mjs` | Belong to their authors; bundled as the Starter layouts catalog. The app seeds its first-run default layout from this set (QWERTY on Glove80), so it works out of the box |

Changes to `words.json`: selected the most frequent alphabetic words of 2–9 letters, then removed proper nouns, abbreviations and offensive words.

Changes to `sentences.json`: kept sentences of 4–12 words with no digits and no capitalized words after the first, whose words are all in `words.json` (or common contractions and possessives), then picked a fixed sample.
