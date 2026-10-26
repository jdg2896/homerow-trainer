---
target: practice page
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/jaspergabriel/Workspace/personal/homerow-trainer/src/ui.js#practiceView"
timestamp: 2026-10-26T12-22-41Z
slug: src-ui-js-practiceview
---
# Critique: Practice page (src/ui.js practiceView)

Method: dual-agent (A: design review subagent · B: detector + CDP live scan subagent)

## Design Health Score: 25/40 (Acceptable)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 3 | Ignores the daily goal; "Practice problem keys" drills the top 4 of 20 listed without saying which |
| 2 | Match real world | 3 | ZMK vocabulary fits; "Letter alone", "230 ms" don't say what's good |
| 3 | User control | 3 | Practice runs say "← Lessons" / "Back to lessons" but exit to Practice (ui.js:509, 641, 705) |
| 4 | Consistency | 2 | Three amber Go buttons; subtitle "Uses only the keys you have unlocked" false for Your own text; inline 19px headings |
| 5 | Error prevention | 2 | Custom text with locked or unmapped characters starts without warning |
| 6 | Recognition | 3 | Keycap chips; misfires don't name the finger or key |
| 7 | Flexibility | 2 | No arrow/Enter nav off Lessons; can't pick which keys or pairs to drill |
| 8 | Minimalist | 2 | 20-row problem table incl. A S D at 3%; misfires card (often zeros) leads the right column |
| 9 | Error recovery | 2 | "Type this text" with an empty box does nothing (ui.js:844) |
| 10 | Help | 3 | Good per-card explanations; nothing says what to do with a high number |

## Specificity
Content is product-specific (misfires + tapping-term advice, "not typed in a week" chips, the "Letter alone" column). The frame is generic: launchers left, stats tables right, every launcher amber, no recommendation. Practice reads as a menu plus a report card, not a coach.
Detector: CLI 0 findings (build and src/ui.js). Live, all 5 states: 1 advisory, `#customText` placeholder is browser-default #757575, 4.2:1 light / 3.4:1 dark (no ::placeholder rule). Measured: all 130 text nodes pass (lowest 5.16:1); textarea boundary 1.30–1.42:1 (only cue it's an input); tables have no accessible name, misfires table no th; headers named in caps ("MISS RATE"); heading counts not tabular; no overflow at 800px. False positive: side-tab on `.chev` (style.css:126).

## Priority issues
- [P1] Three amber launchers, and Practice ignores "Done for today" (ui.js:312,316,319; no goalMet() in practiceView). Breaks Two Signals and makes Practice the way around the rest prompt. Fix: one amber recommended launcher, others default; when goal met, mirror the Lessons hero with no amber. → quieter, clarify
- [P1] Problem keys over-flags and hides what it drills: a 1.5% miss rate qualifies (ui.js:134), list shows 20 (ui.js:304) but practice drills 4 (ui.js:833); ranking mixes latency so Z 12% sits above Q 16%. Fix: threshold at the pass gate (miss rate > 100 − passAcc) or a clear latency outlier; show the 4 drilled keys next to the button; sort or explain. → distill, clarify
- [P2] No "what to practise today": three equal starts plus three tables (~30 numbers), misfires card on top. Fix: one suggested, short session with why; misfires lower (or to Layout); collapse all-zero misfires to one line. → layout, onboard
- [P2] Your own text fails silently and breaks the subtitle's promise; mono placeholder reads as content. Fix: disable or message on empty; list locked/unmapped characters before starting; scope the subtitle; "e.g." placeholder with a token colour. → harden
- [P3] Accessibility and labels: tables unnamed (add caption or aria-labelledby), misfires rows as th scope=row, header names in caps, heading counts need context + tabular-nums, focus drops to body on view switch, textarea boundary under 3:1, exit label should say Practice. → harden, polish

## Personas
Alex: can't choose drill keys or pairs, no keyboard path to start beyond Tab, tables unsortable. Sam: unnamed tables, header-less misfires table, counts read into headings, focus lost on click nav, 3.4:1 placeholder in dark. Owner in pain: no duration, no "enough for today", three amber starts, problem-key drill hammers 4 hard keys (seed: Z Q B Y, pinky-heavy) in letter salad, "Problem keys 20" incl. home row is discouraging.

## Minor
Weak pair rendered as one keycap ("ck"); empty-state "a few times" vs the real rule (6); misfire table rows of 0 for new users; dark amber is louder, so three of them hurt more there.

## Questions
1. Should Practice offer one recommendation instead of a menu, or fold into Lessons as "Suggested practice"?
2. Is a 4-key letter-salad drill compatible with "care for the body" and "real words early"?
3. Do misfires belong on Layout, next to the hold-tap that misfires?
