# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who have just switched to an ergonomic split or columnar keyboard (MoErgo Go60 or Glove80, or another ZMK board) and have to relearn touch typing. Their QWERTY habits from a row-staggered keyboard don't carry over, and many are learning a new layout at the same time, often Miryoku-style with home-row mods and thumb-held layers for symbols, numbers and navigation. Many arrive because of arm or wrist pain. They practice in short sessions at their desk, on the new keyboard, while still relying on their old one for real work.

## Product Purpose

Homerow Trainer turns the user's own keymap into a typing.com-style progressive course. It reads a MoErgo Layout Editor export or a ZMK `.keymap`, works out which finger, layer and modifier produces every character, and teaches them in order: home row, top and bottom rows, reach keys, capitals, shifted symbols, each thumb layer, navigation, then ⌘/⌃ shortcuts.

Success is daily-driver confidence: the user finishes the curriculum and can use the new layout for real work, layers and shortcuts included, without looking down.

## Positioning

Other split-keyboard trainers (moosytype, monkeytype-style tools) offer free practice on your layout; typing.com offers a structured course but only for a standard keyboard. Homerow Trainer is the structured course built from your actual keymap: lessons, hints and drills come from your layers, hold-taps and home-row mods rather than a fixed QWERTY curriculum, and they follow documented learning principles ([docs/learning-principles.md](docs/learning-principles.md)).

## Operating Context

- It is deployed to GitHub Pages and can also be opened as a local file. How users find it hasn't been established; the author found their own way in through the MoErgo Discord.
- First run seeds a default layout (Miryoku macOS for Go60) from the bundled Starter layouts. Users then load their own export from MoErgo's Layout Editor or their ZMK config.
- The flow is: Lessons (units → lessons → stages: meet the keys → mixed drill → words → sentences or code snippets), Practice (problem keys, free practice, custom text), Layout and Settings. The nav has number-key shortcuts.
- During a drill, an on-screen keyboard shows the target key, its finger and the layer and held keys needed ("Hold Enter for Symbols (right thumb), then press `(`").
- Feedback and bug reports go to GitHub issues from an in-app dialog that attaches version and diagnostics.

## Capabilities and Constraints

- Parses MoErgo `.json` (custom `holdTaps` resolved to mod-tap or layer-tap) and ZMK `.keymap` (`&kp`, `&mt`, `&lt`, `&mo`, `&sk`, `&trans`, custom hold-tap behaviors). Other key counts work, drawn as a plain grid. Go60/Glove80 key geometry is approximate. Key codes assume a US ANSI host layout.
- Home-row-mod aware: capitals use the opposite-hand shift, and accidental ⌘/⌃/⌥/Shift firing is counted as a misfire.
- Progress gates on accuracy (95% pass by default). WPM only earns extra stars. Settings include stop on error, hint after a miss, daily goal minutes, stage length, and showing or hiding the keyboard and finger colors.
- Per-key miss rate and latency, stored per layout, drive the Problem keys drill.
- Light and dark themes, and a narrow (≤860px) layout.
- Technical: zero dependencies, no bundler, no modules. `build.mjs` inlines everything into one `dist/index.html`. `src/engine.js` stays pure and DOM-free. Storage keys are prefixed `homerow-trainer.` and must not be renamed without a migration.
- Known open gaps (from the learning principles): no nudge to stop once the daily goal is met or to come back the next day; no letter-pair weakness tracking yet; no tracking of keys not practiced recently.

## Brand Commitments

- Name: Homerow Trainer. Version and build commit are shown in the footer; every user-facing release gets a CHANGELOG.md entry shown in the app as "What's new".
- Free, non-commercial, open source (MIT). No pricing, upsells or ads.
- Local only: no backend, accounts, tracking or analytics. Layouts, progress and stats stay in `localStorage`.
- Ships as a single self-contained HTML file with no dependencies. The only network fetch is Google Fonts, and system fallbacks cover it when that fails.
- Credits are generous and visible: moosytype, typing.com, keybr, Miryoku, MoErgo, ZMK, wordfreq, Tatoeba and the fonts (see CREDITS.md).
- Voice: a personal project, plain-spoken and concrete. Instructions name the actual key, finger and layer, and avoid hype.

## Evidence on Hand

- The author's own story (README "Motivation"): switched to a Go60 in September 2026 because of arm pain and is learning Miryoku for macOS.
- The learning principles doc, with cited research (Baddeley & Longman 1978, Salthouse, Crump et al.).
- Bundled Starter layouts in `data/presets/` (MoErgo's official Go60 and Glove80 layouts), a word list (`data/words.json`) and Tatoeba sentences (`data/sentences.json`).
- There are no user counts, testimonials, reviews or benchmarks. Don't invent any.

## Product Principles

1. **Your keymap is the curriculum.** Lessons, hints and drills come from the loaded layout, and every drill uses only keys already unlocked.
2. **Accuracy before speed.** Progress depends on getting the movement right. Speed is a bonus and never a gate.
3. **Care for the body.** Many users are here because of pain. Prefer short, regular sessions and calm feedback, and never push the user to grind, rush or chase streaks.
4. **Explain the keyboard, then fade.** Show exactly which finger, layer and held key produce a character, then step back so positions come from memory.
5. **Trust through locality and openness.** Nothing leaves the browser, nothing costs money, and the sources are credited.

## Accessibility & Inclusion

- Users may be typing in discomfort or pain: avoid time pressure, keep sessions short, and keep error feedback calm.
- The interface should work with the keyboard alone (it's a typing app), respect `prefers-reduced-motion`, and keep the on-screen keyboard labeled for assistive tech.
- No formal conformance target has been set.
