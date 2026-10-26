---
target: layout page
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/jaspergabriel/Workspace/personal/homerow-trainer/src/ui.js#layoutView"
timestamp: 2026-10-26T12-22-41Z
slug: src-ui-js-layoutview
---
# Critique: Layout page (src/ui.js layoutView)

Method: dual-agent (A: design review subagent · B: detector + CDP live scan subagent)

## Design Health Score: 21/40 (Acceptable, low)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 2 | Starter "added" message appears in the Load card; the new board is ~600px above the viewport |
| 2 | Match real world | 3 | "Like a save file" is good; "Update" vs "Load" distinction isn't guessable |
| 3 | User control | 2 | Remove deletes progress with no undo and no Cancel; failed paste wipes the textarea |
| 4 | Consistency | 2 | "In use" badge looks like a disabled button; Layout's message lacks role=status unlike Lessons |
| 5 | Error prevention | 1 | 0-key stub paste accepted and made active; loading a newer export makes a new slot at zero progress |
| 6 | Recognition | 3 | ✓ on added presets; the diagram doesn't show the key that reaches the viewed layer |
| 7 | Flexibility | 2 | No drag-drop, no layer shortcuts, no export/backup |
| 8 | Minimalist | 3 | Calm and on-token, but a 94-chip charmap (A–Z twice) sits above every action |
| 9 | Error recovery | 2 | "Unrecognised file…" doesn't say what was wrong; input is cleared |
| 10 | Help | 2 | Nothing says where MoErgo's export button is or where a ZMK .keymap lives |

## Specificity
The split-board diagram (finger colours, hold sub-legends, rotated thumbs, real layer names) is unmistakably this product. Everything below it is a generic settings stack: character dump, select + button, native file input, textarea, rows of four buttons. Missed chance: viewing a layer doesn't light the thumb key you hold to reach it, though kbSVG supports holds.
Detector: CLI 0. Live (9 states): placeholder `#layoutPaste` 4.2:1 light / 3.4:1 dark; nested-cards on `.saved .row` (false positive: list rows in a card). Measured: text all passes (err msg 4.52:1 light, close to floor); SVG legends render 7.2–14.3px at 800px (22 under 10px); key outlines 1.81:1 / 1.70:1 and finger fills 1.2–1.5:1 vs surface (non-text; legends carry identity, finger meaning is colour-only); field boundaries 1.33–1.42:1; file input named "Choose File"; row buttons "Use/Rename/Update/Remove" with no layout name; layer tabs expose no selected state; no live region; focus falls to body after add, paste and layer switch. No overflow at 1280/800; at 390 the diagram scrolls inside its card as designed.

## Priority issues
- [P1] Getting your layout in is below the fold (ui.js:382–388): tabs → diagram → Characters → Starter → Load/Saved. "Choose a layout" from the welcome card lands on a viewport with nothing to choose. Characters lists A–Z twice (charName upper-cases). Fix: "Your layouts" + "Add a layout" (Starter / File / Paste) at the top; Characters collapsed and de-duplicated; focus the add area when arriving from the welcome card. → layout, onboard
- [P1] Progress safety isn't shown where it's at risk: Load always makes a new slot (ui.js:53) even for a newer export of a saved layout; "Update" is a ghost button opening a hidden picker; "Confirm remove" deletes stats (ui.js:1015) without saying so and has no Cancel. Fix: recognise the file (uuid or title + keyboard) and offer "Update X and keep progress" vs "Add as new"; inline confirm naming what's lost, with Cancel. → harden, clarify
- [P1] Screen-reader and keyboard users lose their place: render() drops focus to body after every action; message has no role=status; layer tabs have no aria-pressed/selected; file input unlabeled; row buttons don't name their layout; disabled Remove explains itself only in title. → harden
- [P2] Paste accepts junk and throws away input: `{"keyboard":"go60","layers":[[]]}` becomes an active 0-key "Untitled layout" with "Lessons rebuilt"; errors are generic and clear the textarea. Fix: reject 0-key / no-typable layouts with a specific message; keep pasted text in state; say what was found. → harden
- [P2] No help getting the file, and the Starter list isn't curated: one line on MoErgo's export button and `config/<board>.keymap`; recommend the factory default for your board; demote example/debug presets among the 21. → clarify, onboard

## Personas
Alex: no drag-drop, no ←/→ on layer pills, update needs ghost button + file dialog, no export/backup, 94 chips to scroll past. Sam: diagram name is only "Base layer of Glove80", focus resets, nothing announced, active pill by fill only, 10px sub-legends (⌃ reads as ^). Owner in pain: lands on the wrong board with nothing to choose, 21 unfamiliar names, doesn't know how to export, later reloads a newer export and finds lessons at zero.

## Minor
Header chip and H2 repeat the same name; native file button unstyled in dark; two blue primaries compete; S.confirmDel lingers across actions; "updated" date for never-updated starters; saved rows wrap Remove at 800px.

## Questions
1. Should the diagram teach layers like drills do (light the held thumb key, "Hold Tab (right thumb)")?
2. Should Load and Update be one recognising action, so losing progress is impossible rather than documented?
3. Does trust through locality need a visible "Download my progress"?
